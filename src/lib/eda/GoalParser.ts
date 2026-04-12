/**
 * GoalParser — extract required deliverable sections from a session goal.
 *
 * Sessions take a natural-language goal that usually enumerates the sections
 * the user wants back (e.g. "1. **HERO**", "## PROBLEM STATEMENT", etc.).
 * The phase executor needs a deterministic list of sections to draft one at
 * a time, so this module parses those out with a small set of heuristics
 * and returns a normalized list — or a generic three-section fallback when
 * nothing structured is found.
 */

export interface RequiredSection {
  /** URL-safe slug used as a stable identifier and for success-criteria matching. */
  id: string;
  /** Display name as parsed (trimmed, collapsed whitespace). */
  name: string;
  /** Parse order (1-based). */
  order: number;
}

const GENERIC_FALLBACK: RequiredSection[] = [
  { id: 'overview', name: 'Overview', order: 1 },
  { id: 'body', name: 'Body', order: 2 },
  { id: 'conclusion', name: 'Conclusion', order: 3 },
];

const MIN_SECTION_NAME = 3;
const MAX_SECTION_NAME = 40;

/**
 * Normalize a raw section name into a stable slug ID.
 * e.g. "HOW IT WORKS" → "how_it_works", "Final CTA!" → "final_cta".
 */
export function normalizeSectionId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extract required sections from a goal string.
 * Order of strategies (first match wins, subsequent ones fill gaps):
 *   1. Numbered markdown bold: `1. **HERO**`
 *   2. Markdown headers: `## HERO` / `### HERO`
 *   3. Inline numbered: `1. HERO STATEMENT —`
 */
export function parseGoalSections(goal: string): RequiredSection[] {
  if (!goal || goal.trim().length === 0) return GENERIC_FALLBACK;

  const found = new Map<string, RequiredSection>();
  let order = 0;

  const add = (rawName: string): void => {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (name.length < MIN_SECTION_NAME || name.length > MAX_SECTION_NAME) return;
    const id = normalizeSectionId(name);
    if (!id || found.has(id)) return;
    order += 1;
    found.set(id, { id, name, order });
  };

  // Strategy 1: numbered markdown bold — `1. **HERO**` or `1. **HERO SECTION**`
  const boldList = /^\s*\d+\.\s+\*\*([A-Z][A-Z0-9 /&\-]*?)\*\*/gm;
  let m: RegExpExecArray | null;
  while ((m = boldList.exec(goal)) !== null) {
    add(m[1]);
  }

  // Strategy 2: markdown headers — `## HERO`, `### HERO SECTION`
  const headerList = /^\s{0,3}#{2,4}\s+(?:\d+\.\s+)?([A-Z][A-Z0-9 /&\-]{2,})\s*$/gm;
  while ((m = headerList.exec(goal)) !== null) {
    add(m[1]);
  }

  // Strategy 3: inline numbered caps phrase — `1. HERO STATEMENT` (only if nothing else found)
  if (found.size < 2) {
    const inlineNumbered = /(?:^|\n)\s*(\d+)\.\s+([A-Z][A-Z0-9 /&\-]{2,})(?:\s*[—\-:])/g;
    while ((m = inlineNumbered.exec(goal)) !== null) {
      add(m[2]);
    }
  }

  if (found.size < 2) return GENERIC_FALLBACK;
  return Array.from(found.values()).sort((a, b) => a.order - b.order);
}

interface ParsedBlock {
  header: string;
  body: string;
}

/**
 * Walk a message line-by-line and return every `## HEADER` block with its
 * body. Line-based parsing is simpler and more reliable than multi-line
 * regex for this shape (JS lacks `\Z` so lookahead-based patterns are
 * fragile at end-of-string).
 */
function walkSections(content: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  const lines = content.split(/\r?\n/);
  let header: string | null = null;
  let body: string[] = [];

  const flush = (): void => {
    if (header !== null) {
      blocks.push({ header, body: body.join('\n').trim() });
    }
  };

  const headerRe = /^\s{0,3}#{1,4}\s+(.+?)\s*$/;
  for (const line of lines) {
    const m = headerRe.exec(line);
    if (m) {
      flush();
      header = m[1].trim();
      body = [];
    } else if (header !== null) {
      body.push(line);
    }
  }
  flush();
  return blocks;
}

/**
 * Match a section name tolerant of whitespace/punctuation/case. e.g.
 * "How It Works" matches "HOW IT WORKS", "How-it-Works!", "how_it_works".
 */
function sectionNameMatches(headerText: string, target: string): boolean {
  const canonical = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .join(' ');
  const h = canonical(headerText);
  const t = canonical(target);
  if (!h || !t) return false;
  return h === t || h.startsWith(t) || h.includes(t);
}

/**
 * Extract a specific `## HEADER`-delimited section from an agent's response.
 * Returns the full matched block (header + body), trimmed, or null.
 */
export function extractSection(content: string, sectionName: string): string | null {
  if (!content || !sectionName) return null;
  const blocks = walkSections(content);
  for (const block of blocks) {
    if (sectionNameMatches(block.header, sectionName)) {
      return `## ${block.header}\n${block.body}`.trim();
    }
  }
  return null;
}

/**
 * Find every `## HEADER` block whose body is ≥ minBodyChars — used by
 * ModeController.detectOutputs() to count "real" produced outputs instead
 * of matching stray substrings.
 */
export function findProducedSections(
  content: string,
  minBodyChars = 80,
): { name: string; id: string; bodyLength: number }[] {
  return walkSections(content)
    .filter((b) => b.body.length >= minBodyChars)
    .map((b) => ({
      name: b.header,
      id: normalizeSectionId(b.header),
      bodyLength: b.body.length,
    }));
}
