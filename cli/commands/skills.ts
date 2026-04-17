/**
 * `forge skills` — browse and apply skills from the CLI.
 *
 * Mirrors the TUI skill picker (`k` in Agent Control) for headless
 * workflows: CI jobs, scripted sessions, anyone who wants to assign a
 * skill without running the interactive panel.
 *
 * Subcommands:
 *   forge skills list                       Print the discovered catalog
 *   forge skills show <id>                  Dump a specific skill's content
 *   forge skills apply <agent> <id>         Override an agent's skills for
 *                                           a session (writes agent-configs.json)
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { discoverSkills } from '../../src/lib/skills';
import { forgeTheme } from '../../src/lib/render/theme';

const RESET = forgeTheme.reset;
const BOLD = forgeTheme.bold;
const DIM = forgeTheme.dim;
const GREEN = forgeTheme.status.success;
const CYAN = forgeTheme.status.info;
const YELLOW = forgeTheme.status.warning;
const RED = forgeTheme.status.error;

interface ListOpts {
  json?: boolean;
  source?: string;
}

interface ApplyOpts {
  session?: string;
  output?: string;
  replace?: boolean;
}

// ─── list ──────────────────────────────────────────────────────────────

async function listCmd(opts: ListOpts): Promise<void> {
  const catalog = await discoverSkills({ cwd: process.cwd() });
  const filtered = opts.source
    ? catalog.entries.filter((e) => e.source === opts.source)
    : catalog.entries;

  if (opts.json) {
    process.stdout.write(
      JSON.stringify(
        filtered.map((e) => ({
          id: e.id,
          label: e.label,
          source: e.source,
          path: e.path,
          summary: e.summary,
          tags: e.tags ?? [],
        })),
        null,
        2
      ) + '\n'
    );
    return;
  }

  if (filtered.length === 0) {
    console.log(`${DIM}No skills discovered.${RESET}`);
    console.log(
      `${DIM}Add markdown files to ./skills/, ~/.claude/skills/forge/, or supply a skills.sh hook.${RESET}`
    );
    return;
  }

  console.log(`${CYAN}${BOLD}SKILL CATALOG${RESET}`);
  console.log(`${DIM}${filtered.length} skill${filtered.length === 1 ? '' : 's'} discovered${RESET}`);
  console.log('');

  for (const entry of filtered) {
    const sourceTag = sourceLabel(entry.source);
    console.log(`  ${GREEN}●${RESET} ${BOLD}${entry.label}${RESET}  ${DIM}${sourceTag}${RESET}`);
    console.log(`    ${DIM}${entry.id}${RESET}`);
    if (entry.summary) {
      console.log(`    ${entry.summary.slice(0, 120)}`);
    }
    if (entry.tags && entry.tags.length > 0) {
      console.log(`    ${DIM}tags: ${entry.tags.join(', ')}${RESET}`);
    }
    console.log('');
  }
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'project':
      return '· project';
    case 'user':
      return '· user';
    case 'plugin':
      return '· plugin';
    case 'hook':
      return '· skills.sh';
    default:
      return `· ${source}`;
  }
}

// ─── show ──────────────────────────────────────────────────────────────

async function showCmd(id: string): Promise<void> {
  const catalog = await discoverSkills({ cwd: process.cwd() });
  const entry = catalog.get(id);
  if (!entry) {
    console.error(`${RED}Skill not found: ${id}${RESET}`);
    console.error(`${DIM}Try: forge skills list${RESET}`);
    process.exit(1);
  }

  console.log(`${CYAN}${BOLD}${entry.label}${RESET}`);
  console.log(`${DIM}${entry.id}  ·  ${sourceLabel(entry.source).slice(2)}  ·  ${entry.path}${RESET}`);
  if (entry.tags && entry.tags.length > 0) {
    console.log(`${DIM}tags: ${entry.tags.join(', ')}${RESET}`);
  }
  console.log('');
  console.log(entry.content);
}

// ─── apply ─────────────────────────────────────────────────────────────

async function findLatestSession(outputDir: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (dirs.length === 0) return null;
    // Names end with an ISO timestamp, lexical sort = chronological.
    dirs.sort();
    return path.join(outputDir, dirs[dirs.length - 1]);
  } catch {
    return null;
  }
}

async function applyCmd(agentId: string, skillId: string, opts: ApplyOpts): Promise<void> {
  const catalog = await discoverSkills({ cwd: process.cwd() });
  const entry = catalog.get(skillId);
  if (!entry) {
    console.error(`${RED}Skill not found: ${skillId}${RESET}`);
    console.error(`${DIM}Try: forge skills list${RESET}`);
    process.exit(1);
  }

  const outputDir = opts.output ?? 'output/sessions';
  const sessionDir = opts.session
    ? path.isAbsolute(opts.session)
      ? opts.session
      : path.join(outputDir, opts.session)
    : await findLatestSession(outputDir);

  if (!sessionDir) {
    console.error(`${RED}No session found in ${outputDir}.${RESET}`);
    console.error(`${DIM}Pass --session <name> or run a session first.${RESET}`);
    process.exit(1);
  }

  const configPath = path.join(sessionDir, 'agent-configs.json');
  let configs: Record<string, {
    providerId: string;
    modelId: string;
    paused?: boolean;
    systemSuffix?: string;
    skillIds?: string[];
  }> = {};

  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    configs = JSON.parse(raw);
  } catch {
    // No existing config file — start empty. The session must still exist
    // (first read on sessionDir proves that downstream), but writing the
    // file from scratch is fine.
  }

  const current = configs[agentId];
  if (!current) {
    console.error(`${RED}Agent '${agentId}' not found in ${configPath}.${RESET}`);
    console.error(`${DIM}Available agents: ${Object.keys(configs).join(', ') || '(none)'}${RESET}`);
    process.exit(1);
  }

  const existing = Array.isArray(current.skillIds) ? current.skillIds : [];
  const next = opts.replace
    ? [skillId]
    : existing.includes(skillId)
    ? existing
    : [...existing, skillId];

  configs[agentId] = { ...current, skillIds: next };

  await fs.writeFile(configPath, JSON.stringify(configs, null, 2));

  console.log(
    `${GREEN}✔${RESET} Applied ${BOLD}${entry.label}${RESET} to ${BOLD}${agentId}${RESET}`
  );
  console.log(`${DIM}  session: ${sessionDir}${RESET}`);
  console.log(`${DIM}  skills applied: ${next.join(', ')}${RESET}`);
  console.log(
    `${YELLOW}Note:${RESET} this updates the saved config file. Running orchestrators pick up overrides live — use the TUI Skill Picker (${CYAN}a → k${RESET}) for mid-session changes.`
  );
}

// ─── command wiring ────────────────────────────────────────────────────

export function createSkillsCommand(): Command {
  const skills = new Command('skills').description(
    'Browse and apply per-agent skills from the CLI'
  );

  skills
    .command('list')
    .alias('ls')
    .description('Print the discovered skill catalog')
    .option('--json', 'Emit JSON instead of the formatted list')
    .option(
      '--source <name>',
      'Filter by source: project | user | plugin | hook'
    )
    .action(async (opts: ListOpts) => {
      await listCmd(opts);
    });

  skills
    .command('show <id>')
    .description('Dump the content of a single skill')
    .action(async (id: string) => {
      await showCmd(id);
    });

  skills
    .command('apply <agent> <skill>')
    .description("Add a skill id to an agent's override list in the session workdir")
    .option(
      '-s, --session <name>',
      'Session directory (name relative to --output, or absolute path). Defaults to the latest session.'
    )
    .option('-o, --output <dir>', 'Output directory for sessions', 'output/sessions')
    .option(
      '--replace',
      'Replace the agent\'s skill list instead of appending'
    )
    .action(async (agent: string, skill: string, opts: ApplyOpts) => {
      await applyCmd(agent, skill, opts);
    });

  return skills;
}
