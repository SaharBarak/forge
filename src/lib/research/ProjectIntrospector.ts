/**
 * ProjectIntrospector — let agents discover what a local project actually
 * does by reading its own code.
 *
 * Given a project directory and a natural-language query, this module:
 *   1. Walks the directory (respecting a skip list + max depth)
 *   2. Scores files by keyword match on both path and content
 *   3. Reads the top-N candidates (size-capped) as snippets
 *   4. Hands the snippets to an IAgentRunner with a grounded-answer prompt
 *
 * The result feeds back into the deliberation as a `research_result` message
 * — the same shape as web-search research — so the phase executor doesn't
 * need to know whether the research came from the web or the filesystem.
 *
 * No semantic search yet: plain lexical scoring over keywords. Good enough
 * to discover modes, features, and file structure. Wire USearch later when
 * the indexing pipeline is session-lifecycle aware.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { IAgentRunner } from '../interfaces';

export interface IntrospectionSnippet {
  readonly path: string;
  readonly content: string;
}

export interface IntrospectionResult {
  readonly summary: string;
  readonly filesRead: readonly string[];
  readonly snippets: readonly IntrospectionSnippet[];
  readonly error?: string;
}

export interface IntrospectOptions {
  readonly projectDir: string;
  readonly query: string;
  readonly runner: IAgentRunner;
  readonly maxFiles?: number;
  readonly maxFileSize?: number;
  readonly maxDepth?: number;
  readonly skipDirs?: ReadonlySet<string>;
}

const DEFAULT_SKIP_DIRS: ReadonlySet<string> = new Set([
  // Build / dep output
  'node_modules',
  'dist',
  'build',
  '.git',
  '.turbo',
  '.next',
  'coverage',
  '.cache',
  'tmp',
  '.tmp',
  '.venv',
  'venv',
  '__pycache__',
  'target',
  '.pytest_cache',
  '.swarm',
  'output',
  // Developer-internal docs (planning, ADRs, notes) — these describe the
  // code's EVOLUTION, not its current shipped state. An introspector asked
  // "what does this project do" should read source code, not the backlog.
  // Including them caused skeptic agents to read old "the engine is broken"
  // context docs and refuse to draft copy.
  '.planning',
  'research',
  'notes',
  'docs-internal',
]);

const TEXT_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.py',
  '.rs',
  '.go',
  '.java',
  '.html',
  '.css',
  '.scss',
  '.sh',
]);

const DEFAULT_MAX_FILES = 15;
const DEFAULT_MAX_FILE_SIZE = 16_000; // 16 KB per file
const DEFAULT_MAX_DEPTH = 4;
const MAX_CONTENT_SCAN_CANDIDATES = 300;
/** Hard cap on the total number of files the walker will enumerate. */
const MAX_WALK_FILES = 2500;

const STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'are', 'what', 'how', 'why', 'for', 'with', 'this', 'that',
  'from', 'has', 'have', 'does', 'can', 'you', 'your', 'our', 'tell', 'find',
  'list', 'show', 'project', 'about', 'code', 'all', 'any', 'which', 'who',
  'where', 'when', 'does', 'exist', 'existing', 'available', 'support',
]);

/**
 * Main entry point. Returns a structured introspection result.
 */
export async function introspectProject(opts: IntrospectOptions): Promise<IntrospectionResult> {
  const {
    projectDir,
    query,
    runner,
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxDepth = DEFAULT_MAX_DEPTH,
    skipDirs = DEFAULT_SKIP_DIRS,
  } = opts;

  // Validate project dir
  try {
    const stat = await fs.stat(projectDir);
    if (!stat.isDirectory()) {
      return {
        summary: `Project directory does not exist or is not a directory: ${projectDir}`,
        filesRead: [],
        snippets: [],
        error: 'invalid-project-dir',
      };
    }
  } catch {
    return {
      summary: `Cannot access project directory: ${projectDir}`,
      filesRead: [],
      snippets: [],
      error: 'project-dir-not-found',
    };
  }

  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    return {
      summary: 'Query did not contain any searchable keywords.',
      filesRead: [],
      snippets: [],
      error: 'no-keywords',
    };
  }

  const allFiles = await walkFiles(projectDir, skipDirs, maxDepth);
  if (allFiles.length === 0) {
    return {
      summary: `No text files found under ${projectDir}.`,
      filesRead: [],
      snippets: [],
      error: 'no-files',
    };
  }

  // Score by path match first (fast, deterministic)
  const scored: { path: string; score: number }[] = [];
  for (const file of allFiles) {
    const rel = path.relative(projectDir, file).toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (rel.includes(kw)) score += 10;
    }
    if (score > 0) scored.push({ path: file, score });
  }

  // If path-scan is thin, scan content of remaining files for keyword hits
  if (scored.length < maxFiles) {
    const already = new Set(scored.map((s) => s.path));
    const rest = allFiles.filter((f) => !already.has(f)).slice(0, MAX_CONTENT_SCAN_CANDIDATES);
    for (const file of rest) {
      try {
        const stat = await fs.stat(file);
        if (stat.size > maxFileSize * 3) continue;
        const content = (await fs.readFile(file, 'utf-8')).toLowerCase();
        let contentScore = 0;
        for (const kw of keywords) {
          let idx = 0;
          let hits = 0;
          while (hits < 5) {
            const next = content.indexOf(kw, idx);
            if (next < 0) break;
            hits += 1;
            idx = next + kw.length;
          }
          contentScore += hits;
        }
        if (contentScore > 0) scored.push({ path: file, score: contentScore });
      } catch {
        // skip unreadable files
      }
    }
  }

  if (scored.length === 0) {
    return {
      summary: `No files matched keywords [${keywords.join(', ')}] under ${projectDir}.`,
      filesRead: [],
      snippets: [],
      error: 'no-matches',
    };
  }

  // Take the highest-scoring files, read their content
  scored.sort((a, b) => b.score - a.score);
  const topFiles = scored.slice(0, maxFiles);

  const snippets: IntrospectionSnippet[] = [];
  for (const { path: filePath } of topFiles) {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const content = raw.length > maxFileSize ? raw.slice(0, maxFileSize) + '\n// …truncated' : raw;
      snippets.push({
        path: path.relative(projectDir, filePath),
        content,
      });
    } catch {
      // skip
    }
  }

  if (snippets.length === 0) {
    return {
      summary: 'Files matched but none could be read.',
      filesRead: [],
      snippets: [],
      error: 'read-failure',
    };
  }

  // Build the source-grounded prompt
  const contextBlob = snippets
    .map((s) => `### ${s.path}\n\`\`\`\n${s.content}\n\`\`\``)
    .join('\n\n');

  const prompt = [
    `You are a project introspection agent. Answer the question by analyzing the provided source files from a local project.`,
    ``,
    `## QUESTION`,
    query,
    ``,
    `## PROJECT FILES (${snippets.length} files, top matches)`,
    contextBlob,
    ``,
    `## INSTRUCTIONS`,
    `- Answer the question directly and concisely, grounded in the source you just read.`,
    `- Cite specific files (by relative path) and code symbols when relevant.`,
    `- If the question asks "what modes / features / capabilities exist", list them explicitly with file references.`,
    `- Prefer facts you can verify from the code over general claims.`,
    `- If the code doesn't answer the question, say so plainly — do NOT invent features.`,
    ``,
    `## ANSWER`,
  ].join('\n');

  const result = await runner.query({
    prompt,
    systemPrompt:
      'You are a precise code reader. You answer ONLY what the source code you were given supports. If the code is ambiguous or silent, say so.',
    model: 'claude-sonnet-4-20250514',
  });

  if (!result.success || !result.content) {
    return {
      summary: `Introspection failed: ${result.error || 'no content returned'}`,
      filesRead: snippets.map((s) => s.path),
      snippets,
      error: 'runner-failure',
    };
  }

  return {
    summary: result.content,
    filesRead: snippets.map((s) => s.path),
    snippets,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function extractKeywords(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  // Deduplicate, preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.slice(0, 12);
}

async function walkFiles(
  root: string,
  skipDirs: ReadonlySet<string>,
  maxDepth: number,
): Promise<string[]> {
  const results: string[] = [];
  // Safety: track visited real paths so symlink loops can't recurse forever.
  const visited = new Set<string>();

  async function visit(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;
    if (results.length >= MAX_WALK_FILES) return;

    // Resolve to real path; skip if we've already visited (symlink loops).
    let real: string;
    try {
      real = await fs.realpath(dir);
    } catch {
      return;
    }
    if (visited.has(real)) return;
    visited.add(real);

    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_WALK_FILES) return;
      if (skipDirs.has(entry.name)) continue;
      // Skip ALL hidden files — introspector reads shipped code, not
      // internal dotfiles (.planning, .github, .vscode, etc.).
      if (entry.name.startsWith('.')) continue;
      // Skip symlinks entirely — don't follow them, don't include them.
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext)) results.push(full);
      }
    }
  }

  await visit(root, 0);
  return results;
}
