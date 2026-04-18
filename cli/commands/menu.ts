/**
 * `forge` (no args) — interactive main menu.
 *
 * Shows the Last Supper banner, then offers a menu loop:
 *   · New deliberation    → wizard → launchSession()
 *   · Resume session       → picker → reopens the saved session workdir
 *   · View past session    → picker → prints transcript
 *   · Configure providers  → inline re-run of `forge init`
 *   · Exit
 *
 * Every menu option returns to the menu when done (except "New
 * deliberation" which lives inside the OpenTUI view until the session
 * ends, then returns). Ctrl+C from any prompt exits cleanly.
 *
 * All interactive prompts use @clack/prompts — same UX language as
 * `forge init`, no React/Ink, no OpenTUI. The OpenTUI mounts only for
 * the actual deliberation screen.
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import { showBanner } from '../prompts/banner';
import { launchSession } from '../lib/session-launcher';
import { getAllModes, getModeById } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';
import { loadConfig } from '../../src/lib/config/ForgeConfig';

// ─── Mode → recommended agents (shown as default in the multiselect) ────

const DEFAULT_AGENTS_FOR_MODE: Record<string, string[]> = {
  'vc-pitch':     ['vc-partner', 'vc-associate', 'lp-skeptic', 'founder-voice'],
  'tech-review':  ['architect', 'perf-engineer', 'security-reviewer', 'test-engineer'],
  'red-team':     ['attack-planner', 'social-engineer', 'blue-team-lead'],
};
const GENERIC = ['skeptic', 'pragmatist', 'analyst', 'advocate', 'contrarian'];

function defaultAgents(mode: string): string[] {
  return DEFAULT_AGENTS_FOR_MODE[mode] ?? GENERIC;
}

// ─── Session discovery ──────────────────────────────────────────────────

interface SessionMeta {
  dir: string;
  name: string;
  project: string;
  goal?: string;
  startedAt?: string;
  messageCount?: number;
}

async function listSessions(outputDir: string): Promise<SessionMeta[]> {
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    const metas: SessionMeta[] = [];
    for (const name of dirs) {
      const dir = path.join(outputDir, name);
      const metaPath = path.join(dir, 'session.json');
      try {
        const raw = await fs.readFile(metaPath, 'utf-8');
        const parsed = JSON.parse(raw) as {
          projectName?: string; goal?: string; startedAt?: string; messageCount?: number;
        };
        metas.push({
          dir,
          name,
          project: parsed.projectName ?? name,
          goal: parsed.goal,
          startedAt: parsed.startedAt,
          messageCount: parsed.messageCount,
        });
      } catch {
        metas.push({ dir, name, project: name });
      }
    }
    // Newest first (directory names end with an ISO timestamp).
    metas.sort((a, b) => b.name.localeCompare(a.name));
    return metas;
  } catch {
    return [];
  }
}

function formatSessionChoice(s: SessionMeta): string {
  const bits: string[] = [s.project];
  if (s.goal) bits.push(chalk.dim(`· ${s.goal.slice(0, 60)}`));
  if (typeof s.messageCount === 'number') bits.push(chalk.dim(`· ${s.messageCount} msgs`));
  return bits.join(' ');
}

// ─── Wizard ─────────────────────────────────────────────────────────────

type WizardResult = Parameters<typeof launchSession>[0];

async function newSessionWizard(defaults: {
  outputDir: string;
  defaultMode?: string;
}): Promise<WizardResult | null> {
  const modes = getAllModes();

  const modeChoice = await p.select({
    message: 'Pick a deliberation mode:',
    options: modes.map((m) => ({
      value: m.id,
      label: `${m.name}`,
      hint: m.description,
    })),
    initialValue: defaults.defaultMode ?? 'will-it-work',
  });
  if (p.isCancel(modeChoice)) return null;
  const modeId = String(modeChoice);
  const mode = getModeById(modeId);

  const projectName = await p.text({
    message: 'Project name:',
    placeholder: 'e.g. Q2 Migration, CivicVote pilot, Checkout v2',
    validate: (v) => (v && v.trim().length > 0 ? undefined : 'Required'),
  });
  if (p.isCancel(projectName)) return null;

  const goalHint =
    mode?.id === 'will-it-work' ? 'The yes/no/maybe-if question to decide' :
    mode?.id === 'vc-pitch' ? 'The pitch: company, stage, traction, ask' :
    mode?.id === 'tech-review' ? 'The repo + what to focus on (arch / perf / security / tests)' :
    mode?.id === 'red-team' ? 'The target and the adversary set you want modeled' :
    'What you want the team to decide or produce';

  const goal = await p.text({
    message: 'Goal:',
    placeholder: goalHint,
    validate: (v) => (v && v.trim().length > 4 ? undefined : 'Give at least a sentence'),
  });
  if (p.isCancel(goal)) return null;

  // Agents — multiselect, pre-checked with the mode's recommended set.
  const recommended = defaultAgents(modeId);
  const agentChoice = await p.multiselect({
    message: 'Which agents join the room? (space to toggle)',
    options: AGENT_PERSONAS.map((a) => ({
      value: a.id,
      label: `${a.name}`,
      hint: a.role,
    })),
    initialValues: recommended.filter((id) => AGENT_PERSONAS.some((a) => a.id === id)),
    required: true,
  });
  if (p.isCancel(agentChoice)) return null;

  const language = await p.select({
    message: 'Language:',
    options: [
      { value: 'english', label: 'English' },
      { value: 'hebrew', label: 'Hebrew (עברית)' },
      { value: 'mixed', label: 'Mixed (primarily Hebrew with English terms)' },
    ],
    initialValue: 'english',
  });
  if (p.isCancel(language)) return null;

  const human = await p.confirm({
    message: 'Human participation? (you can interject between turns)',
    initialValue: false,
  });
  if (p.isCancel(human)) return null;

  // Summary + confirm
  p.note(
    [
      `${chalk.bold('Mode:')}     ${mode?.name} (${modeId})`,
      `${chalk.bold('Project:')}  ${String(projectName)}`,
      `${chalk.bold('Goal:')}     ${String(goal).slice(0, 80)}${String(goal).length > 80 ? '…' : ''}`,
      `${chalk.bold('Agents:')}   ${(agentChoice as string[]).join(', ')}`,
      `${chalk.bold('Language:')} ${String(language)}`,
      `${chalk.bold('Human:')}    ${human ? 'yes' : 'no (autonomous)'}`,
    ].join('\n'),
    'Ready to run'
  );

  const confirm = await p.confirm({
    message: 'Start the deliberation?',
    initialValue: true,
  });
  if (p.isCancel(confirm) || !confirm) return null;

  return {
    projectName: String(projectName).trim(),
    goal: String(goal).trim(),
    mode: modeId,
    agents: agentChoice as string[],
    language: language as 'english' | 'hebrew' | 'mixed',
    humanParticipation: !!human,
    outputDir: defaults.outputDir,
  };
}

// ─── View a past session read-only ──────────────────────────────────────

async function viewSession(meta: SessionMeta): Promise<void> {
  const transcriptPath = path.join(meta.dir, 'transcript.md');
  try {
    const text = await fs.readFile(transcriptPath, 'utf-8');
    console.log('');
    console.log(chalk.bold(`─── ${meta.project} ───────────────────────────`));
    console.log(chalk.dim(meta.dir));
    console.log('');
    console.log(text);
    console.log('');
    await p.text({
      message: 'Press enter to return to the menu',
      placeholder: '',
    });
  } catch (err) {
    p.note(`Couldn't read transcript: ${err instanceof Error ? err.message : err}`, 'Error');
  }
}

// ─── The loop ───────────────────────────────────────────────────────────

async function runMenu(): Promise<void> {
  const outputDir = 'output/sessions';

  // Banner on first render. Re-render after each action (above the menu).
  const settings = await loadConfig();
  const defaultMode = settings.defaults?.mode;
  const providersConfigured = Object.values(settings.providers ?? {}).some(
    (p) => p?.enabled
  );

  let keepGoing = true;
  let firstRender = true;

  while (keepGoing) {
    if (firstRender) {
      const sessions = await listSessions(outputDir);
      showBanner(sessions.length);
      if (!providersConfigured) {
        p.note(
          `No providers configured yet. Run ${chalk.bold('Configure providers')} from the menu below\nor press Ctrl+C and run ${chalk.bold('forge init')} directly.`,
          'First run'
        );
      }
      firstRender = false;
    }

    const sessions = await listSessions(outputDir);

    const action = await p.select({
      message: 'What now?',
      options: [
        { value: 'new',       label: 'New deliberation',         hint: 'wizard → configure → run' },
        { value: 'resume',    label: `View past sessions`,       hint: `${sessions.length} saved` },
        { value: 'configure', label: 'Configure providers',      hint: 'API keys, default mode, Ollama' },
        { value: 'help',      label: 'What does forge do?',      hint: 'One-paragraph summary' },
        { value: 'exit',      label: 'Exit',                     hint: '' },
      ],
      initialValue: 'new',
    });
    if (p.isCancel(action) || action === 'exit') {
      keepGoing = false;
      break;
    }

    if (action === 'new') {
      const req = await newSessionWizard({ outputDir, defaultMode });
      if (!req) {
        p.cancel('Cancelled · no session created.');
        continue;
      }
      const result = await launchSession(req);
      if (!result.success) {
        p.note(result.error || 'Unknown error', 'Session did not start');
      }
      // After the OpenTUI exits we're back here — loop continues.
      continue;
    }

    if (action === 'resume') {
      if (sessions.length === 0) {
        p.note('No saved sessions yet. Try a new deliberation first.', 'Empty');
        continue;
      }
      const pick = await p.select({
        message: 'Pick a session:',
        options: sessions.slice(0, 20).map((s) => ({
          value: s.name,
          label: formatSessionChoice(s),
        })),
      });
      if (p.isCancel(pick)) continue;
      const chosen = sessions.find((s) => s.name === pick);
      if (chosen) await viewSession(chosen);
      continue;
    }

    if (action === 'configure') {
      // Invoke the init wizard inline.
      const { createInitCommand } = await import('./init');
      const init = createInitCommand();
      await init.parseAsync(['node', 'forge', '--force']);
      continue;
    }

    if (action === 'help') {
      p.note(
        [
          'Forge is a multi-agent deliberation engine.',
          '',
          'You pick a mode (will-it-work, vc-pitch, tech-review, red-team, …),',
          'define a goal, and a panel of agents debate the question through a',
          'deterministic phase machine until they produce the concrete artifact',
          'the mode asks for — a verdict, a memo, a review report.',
          '',
          'Each agent can run on a different model (Claude, Gemini, OpenAI, Ollama).',
          'You can swap models, toggle skills, pause, or force-speak any agent',
          'live from the Agent Control panel (press `a` inside the session).',
        ].join('\n'),
        'About Forge'
      );
      continue;
    }
  }

  p.outro(chalk.green('See you next deliberation.'));
}

export function createMenuCommand(): () => Promise<void> {
  return async () => {
    try {
      await runMenu();
    } catch (err) {
      if (err instanceof Error && /force closed/i.test(err.message)) {
        // Clack's cancel path — quiet exit.
        return;
      }
      console.error(chalk.red('Menu error:'), err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  };
}
