/**
 * SkillsLoader — resolves per-agent skills from multiple sources.
 *
 * Loading order (first match wins for each agent; shared+mode layers are
 * always concatenated if present):
 *   1. Optional `<cwd>/skills.sh` hook. If executable, we run it first
 *      with the session context as env vars so the user can generate or
 *      fetch skill files into `<cwd>/skills/` dynamically (e.g. pulling
 *      from their company's wiki or a private skills repo).
 *   2. `<cwd>/skills/<agentId>.md`            — per-agent
 *   3. `<cwd>/skills/<modeId>.md`             — mode-level shared
 *   4. `<cwd>/skills/shared.md`               — project-wide shared
 *   5. `~/.claude/skills/forge/<agentId>.md`  — user-level fallback
 *
 * Returns a ResolvedSkills bundle the orchestrator threads into
 * ClaudeCodeAgent so each agent sees only what's relevant to them.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { spawnSync } from 'child_process';

export interface SkillSources {
  cwd: string;
  modeId: string;
  enabledAgents: ReadonlyArray<string>;
  /** Optional override for the session workdir — used to pass context to skills.sh. */
  sessionWorkdir?: string;
  /** Optional goal text — passed to skills.sh as FORGE_GOAL. */
  goal?: string;
}

export type SkillSource = 'project' | 'user' | 'plugin' | 'hook';

/**
 * One entry in the skill catalog the TUI picker browses. Content is
 * eagerly loaded so the picker can preview it without a round-trip.
 * For large skill libraries we may switch to lazy loading, but the
 * expected size (<50 skills) makes eager the obvious choice.
 */
export interface SkillCatalogEntry {
  id: string;
  label: string;
  summary: string;
  path: string;
  source: SkillSource;
  content: string;
  /** Optional tags like `mode:tech-review`, `agent:architect`. */
  tags?: string[];
}

export interface SkillCatalog {
  readonly entries: ReadonlyArray<SkillCatalogEntry>;
  get(id: string): SkillCatalogEntry | undefined;
}

export interface ResolvedSkills {
  /** Combined (shared + mode) skills applied to every agent by default. */
  shared: string;
  /** Per-agent skills, keyed by agentId. Already includes `shared`. */
  perAgent: Map<string, string>;
  /** Which sources contributed for each agent — surfaced in the TUI. */
  sources: Map<string, string[]>;
}

const SKILLS_HOOK = 'skills.sh';

async function readIfExists(p: string): Promise<string | null> {
  try {
    const content = await fs.readFile(p, 'utf-8');
    return content.trim() ? content : null;
  } catch {
    return null;
  }
}

async function isExecutable(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    // fs.constants.X_OK would be preferred, but `stat.mode` is plenty.
    return stat.isFile() && (stat.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

/**
 * Run `<cwd>/skills.sh` if it exists and is executable. The hook can
 * populate `<cwd>/skills/` with freshly generated files before we read
 * them. Non-zero exit is logged but never fatal — a broken hook must
 * not block a deliberation.
 */
async function runHook(src: SkillSources): Promise<{ ran: boolean; exitCode: number | null }> {
  const hookPath = path.join(src.cwd, SKILLS_HOOK);
  if (!(await isExecutable(hookPath))) return { ran: false, exitCode: null };

  const result = spawnSync(hookPath, [], {
    cwd: src.cwd,
    env: {
      ...process.env,
      FORGE_MODE: src.modeId,
      FORGE_AGENTS: src.enabledAgents.join(','),
      FORGE_WORKDIR: src.sessionWorkdir ?? '',
      FORGE_GOAL: src.goal ?? '',
    },
    encoding: 'utf-8',
    timeout: 15_000,
  });

  if (result.status !== 0) {
    console.error(
      `[SkillsLoader] skills.sh exited ${result.status}: ${result.stderr?.trim() ?? '(no stderr)'}`
    );
  }
  return { ran: true, exitCode: result.status };
}

export async function loadSkills(src: SkillSources): Promise<ResolvedSkills> {
  await runHook(src);

  const projectSkillsDir = path.join(src.cwd, 'skills');
  const userSkillsDir = path.join(os.homedir(), '.claude', 'skills', 'forge');

  // Shared layers — concatenated for every agent.
  const shared = (await readIfExists(path.join(projectSkillsDir, 'shared.md'))) ?? '';
  const modeLayer = (await readIfExists(path.join(projectSkillsDir, `${src.modeId}.md`))) ?? '';
  const sharedCombined = [shared, modeLayer].filter(Boolean).join('\n\n---\n\n');

  const perAgent = new Map<string, string>();
  const sources = new Map<string, string[]>();

  for (const agentId of src.enabledAgents) {
    const used: string[] = [];
    let agentLayer: string | null = null;

    const projectAgentPath = path.join(projectSkillsDir, `${agentId}.md`);
    const userAgentPath = path.join(userSkillsDir, `${agentId}.md`);

    agentLayer = await readIfExists(projectAgentPath);
    if (agentLayer) used.push(`skills/${agentId}.md`);
    if (!agentLayer) {
      agentLayer = await readIfExists(userAgentPath);
      if (agentLayer) used.push(`~/.claude/skills/forge/${agentId}.md`);
    }

    const pieces: string[] = [];
    if (sharedCombined) {
      pieces.push(sharedCombined);
      if (shared) used.push('skills/shared.md');
      if (modeLayer) used.push(`skills/${src.modeId}.md`);
    }
    if (agentLayer) pieces.push(agentLayer);

    perAgent.set(agentId, pieces.join('\n\n---\n\n'));
    sources.set(agentId, used);
  }

  return { shared: sharedCombined, perAgent, sources };
}

// ─── Catalog discovery ───────────────────────────────────────────────

function deriveLabelAndSummary(content: string, fallbackId: string): {
  label: string;
  summary: string;
} {
  const lines = content.split(/\r?\n/);
  const h1 = lines.find((l) => /^#\s+/.test(l));
  const label = h1 ? h1.replace(/^#\s+/, '').trim() : fallbackId;
  // Summary: first non-empty, non-heading paragraph after the H1.
  const afterH1 = h1 ? lines.slice(lines.indexOf(h1) + 1) : lines;
  const summaryLine = afterH1.find(
    (l) => l.trim() && !l.startsWith('#') && !l.startsWith('---')
  );
  return { label, summary: (summaryLine ?? '').trim().slice(0, 160) };
}

async function readSkillFile(
  filePath: string,
  id: string,
  source: SkillSource
): Promise<SkillCatalogEntry | null> {
  const content = await readIfExists(filePath);
  if (!content) return null;
  const { label, summary } = deriveLabelAndSummary(content, id);
  return { id, label, summary, path: filePath, source, content };
}

async function listDirMd(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Run `<cwd>/skills.sh list` and try to parse the stdout as a JSON
 * array of skill entries. Non-fatal on any failure — we just skip
 * hook-supplied entries if the output isn't valid.
 *
 * Expected JSON shape (loose):
 *   [{id, label?, summary?, path, tags?}, ...]
 *
 * The `path` must point to a markdown file on disk; we read its
 * content and apply the hook label/summary on top if provided.
 */
async function runHookList(cwd: string): Promise<SkillCatalogEntry[]> {
  const hookPath = path.join(cwd, SKILLS_HOOK);
  if (!(await isExecutable(hookPath))) return [];

  const result = spawnSync(hookPath, ['list'], {
    cwd,
    encoding: 'utf-8',
    timeout: 10_000,
  });
  if (result.status !== 0 || !result.stdout?.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: SkillCatalogEntry[] = [];
  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    const id = typeof obj.id === 'string' ? obj.id : null;
    const skillPath = typeof obj.path === 'string' ? obj.path : null;
    if (!id || !skillPath) continue;
    const content = await readIfExists(skillPath);
    if (!content) continue;
    const derived = deriveLabelAndSummary(content, id);
    out.push({
      id: `hook:${id}`,
      label: typeof obj.label === 'string' ? obj.label : derived.label,
      summary: typeof obj.summary === 'string' ? obj.summary : derived.summary,
      path: skillPath,
      source: 'hook',
      content,
      tags: Array.isArray(obj.tags) ? (obj.tags as string[]) : undefined,
    });
  }
  return out;
}

/**
 * Build the skill catalog the TUI picker browses. Merges:
 *   - project:  <cwd>/skills/*.md
 *   - user:     ~/.claude/skills/forge/*.md
 *   - plugin:   ~/.claude/plugins/<plugin>/skills/*.md (best-effort)
 *   - hook:     whatever `skills.sh list` emits as JSON (if exists)
 *
 * Entries are de-duplicated by id — later sources lose, so a project
 * skill overrides a user skill with the same id.
 */
export async function discoverSkills({ cwd }: { cwd: string }): Promise<SkillCatalog> {
  const catalog = new Map<string, SkillCatalogEntry>();

  const addEntry = (entry: SkillCatalogEntry | null): void => {
    if (!entry) return;
    if (catalog.has(entry.id)) return;
    catalog.set(entry.id, entry);
  };

  // Project-level: <cwd>/skills/*.md
  const projectDir = path.join(cwd, 'skills');
  for (const name of await listDirMd(projectDir)) {
    const id = name.replace(/\.md$/, '');
    addEntry(await readSkillFile(path.join(projectDir, name), id, 'project'));
  }

  // User-level: ~/.claude/skills/forge/*.md
  const userDir = path.join(os.homedir(), '.claude', 'skills', 'forge');
  for (const name of await listDirMd(userDir)) {
    const id = `user:${name.replace(/\.md$/, '')}`;
    addEntry(await readSkillFile(path.join(userDir, name), id, 'user'));
  }

  // Plugin-level: ~/.claude/plugins/*/skills/*.md (best-effort, optional)
  try {
    const pluginsDir = path.join(os.homedir(), '.claude', 'plugins');
    const plugins = await fs.readdir(pluginsDir, { withFileTypes: true });
    for (const plugin of plugins) {
      if (!plugin.isDirectory()) continue;
      const skillsDir = path.join(pluginsDir, plugin.name, 'skills');
      for (const name of await listDirMd(skillsDir)) {
        const id = `plugin:${plugin.name}/${name.replace(/\.md$/, '')}`;
        addEntry(await readSkillFile(path.join(skillsDir, name), id, 'plugin'));
      }
    }
  } catch {
    // No plugins dir or not readable — fine, plugin skills are optional.
  }

  // Hook-supplied entries
  for (const entry of await runHookList(cwd)) {
    addEntry(entry);
  }

  const entries = Array.from(catalog.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
  return {
    entries,
    get: (id) => catalog.get(id),
  };
}

