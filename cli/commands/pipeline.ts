/**
 * `forge pipeline "<initial spec>"` — autonomous multi-mode chain.
 *
 * A product lifecycle usually isn't one deliberation · it's a
 * sequence: ideate → validate → plan → GTM → raise → ship.
 * This command runs a predefined chain (or a user-provided one) where
 * each phase's consensus artifact is woven into the next phase's goal,
 * so the output compounds instead of starting over every mode.
 *
 * Mirrors Octopus's "Dark Factory" autonomous pipeline idea, scoped
 * to our deliberation vocabulary.
 *
 * Default chains:
 *   startup  · ideation → idea-validation → business-plan → gtm-strategy → vc-pitch
 *   launch   · red-team → tech-review → copywrite
 *   decide   · idea-validation → will-it-work
 *
 * Custom:
 *   forge pipeline "…" -c ideation,idea-validation,business-plan
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { launchSession } from '../lib/session-launcher';
import { getAllModes, getModeById } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';

const DEFAULT_CHAINS: Record<string, string[]> = {
  startup: ['ideation', 'idea-validation', 'business-plan', 'gtm-strategy', 'vc-pitch'],
  launch:  ['red-team', 'tech-review', 'copywrite'],
  decide:  ['idea-validation', 'will-it-work'],
};

// Mode → recommended agents (same mapping menu.ts uses)
const DEFAULT_AGENTS: Record<string, string[]> = {
  'vc-pitch':     ['vc-partner', 'vc-associate', 'lp-skeptic', 'founder-voice'],
  'tech-review':  ['architect', 'perf-engineer', 'security-reviewer', 'test-engineer'],
  'red-team':     ['attack-planner', 'social-engineer', 'blue-team-lead'],
};
const GENERIC = ['skeptic', 'pragmatist', 'analyst'];

function agentsFor(mode: string): string[] {
  const preferred = DEFAULT_AGENTS[mode] ?? GENERIC;
  return preferred.filter((id) => AGENT_PERSONAS.some((a) => a.id === id));
}

async function readConsensusBundle(sessionDir: string): Promise<string> {
  const dir = path.join(sessionDir, 'consensus');
  try {
    const files = await fs.readdir(dir);
    const mds = files.filter((f) => f.endsWith('.md')).sort();
    if (mds.length === 0) return '';
    const parts: string[] = [];
    for (const f of mds.slice(0, 6)) {
      const body = await fs.readFile(path.join(dir, f), 'utf-8');
      parts.push(body.trim());
    }
    return parts.join('\n\n---\n\n');
  } catch {
    return '';
  }
}

function buildNextGoal(
  originalSpec: string,
  priorModeId: string,
  priorConsensus: string,
  nextModeId: string
): string {
  const nextMode = getModeById(nextModeId);
  if (!priorConsensus) {
    return `${originalSpec}\n\n(Previous phase \`${priorModeId}\` ran but captured no consensus artifact.)`;
  }
  return [
    originalSpec,
    '',
    `## Upstream · \`${priorModeId}\` output`,
    '',
    priorConsensus.slice(0, 2400),
    '',
    `## This phase · \`${nextModeId}\` (${nextMode?.name ?? nextModeId})`,
    '',
    nextMode?.description ?? 'Continue the deliberation using this phase\'s framework.',
  ].join('\n');
}

async function run(
  spec: string,
  opts: { chain?: string; custom?: string; output?: string; yes?: boolean }
): Promise<void> {
  // Resolve the mode chain
  let chain: string[];
  if (opts.custom) {
    chain = opts.custom.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    const preset = opts.chain ?? 'startup';
    if (!(preset in DEFAULT_CHAINS)) {
      console.error(chalk.red(`Unknown chain preset: ${preset}. Use one of: ${Object.keys(DEFAULT_CHAINS).join(', ')} or --custom.`));
      process.exit(1);
    }
    chain = DEFAULT_CHAINS[preset];
  }

  // Validate every mode id
  const known = new Set(getAllModes().map((m) => m.id));
  for (const m of chain) {
    if (!known.has(m)) {
      console.error(chalk.red(`Unknown mode in chain: ${m}`));
      process.exit(1);
    }
  }

  p.intro(chalk.bold(`⚒  forge pipeline · ${chain.length} phases`));
  p.note(
    chain
      .map((m, i) => `${String(i + 1).padStart(2, ' ')}. ${chalk.bold(m)}  ${chalk.dim(getModeById(m)?.description ?? '')}`)
      .join('\n'),
    'Chain'
  );

  if (!opts.yes) {
    const ok = await p.confirm({
      message: `Run all ${chain.length} phases sequentially? Each ~2-4 minutes, each costs LLM inference.`,
      initialValue: true,
    });
    if (p.isCancel(ok) || !ok) {
      p.cancel('Cancelled.');
      return;
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const pipelineDir = path.join(opts.output ?? 'output/sessions', `pipeline-${ts}`);
  await fs.mkdir(pipelineDir, { recursive: true });

  let priorMode = '';
  let priorConsensus = '';
  const phaseResults: Array<{ mode: string; dir?: string; consensus: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const modeId = chain[i];
    const goal = i === 0 ? spec : buildNextGoal(spec, priorMode, priorConsensus, modeId);

    p.note(
      `[${i + 1}/${chain.length}] ${chalk.bold(modeId)} · ${getModeById(modeId)?.name}\n\n${goal.slice(0, 200)}${goal.length > 200 ? '…' : ''}`,
      `Phase ${i + 1}`
    );

    const phaseDir = path.join(pipelineDir, `${String(i + 1).padStart(2, '0')}-${modeId}`);
    const result = await launchSession({
      projectName: `Pipeline-${modeId}`,
      goal,
      mode: modeId,
      agents: agentsFor(modeId),
      language: 'english',
      humanParticipation: false,
      outputDir: phaseDir,
    });

    const captured = result.sessionDir
      ? await readConsensusBundle(result.sessionDir)
      : '';
    phaseResults.push({ mode: modeId, dir: result.sessionDir, consensus: captured });

    priorMode = modeId;
    priorConsensus = captured;
  }

  // Aggregate
  const aggregate: string[] = [
    `# Forge pipeline report`,
    ``,
    `**Original spec:** ${spec}`,
    `**Chain:** ${chain.join(' → ')}`,
    `**Started:** ${ts}`,
    ``,
  ];
  for (const r of phaseResults) {
    aggregate.push(`## ${r.mode}`);
    aggregate.push('');
    if (r.dir) aggregate.push(`- Session: \`${r.dir}\``);
    if (r.consensus) {
      aggregate.push('');
      aggregate.push(r.consensus);
    } else {
      aggregate.push('_No consensus artifact captured._');
    }
    aggregate.push('');
    aggregate.push('---');
    aggregate.push('');
  }
  const aggPath = path.join(pipelineDir, 'AGGREGATE.md');
  await fs.writeFile(aggPath, aggregate.join('\n'));

  p.outro(chalk.green(`Pipeline complete · ${aggPath}`));
}

export function createPipelineCommand(): Command {
  return new Command('pipeline')
    .description('Chain multiple modes so each phase\'s consensus feeds the next (startup / launch / decide presets, or --custom list)')
    .argument('<spec...>', 'The initial spec for phase 1')
    .option('-c, --chain <preset>', 'Preset chain · startup | launch | decide', 'startup')
    .option('--custom <modes>', 'Comma-separated list of modes to chain (overrides --chain)')
    .option('-o, --output <dir>', 'Output directory root', 'output/sessions')
    .option('-y, --yes', 'Skip confirmation')
    .action(async (spec: string[], opts: { chain?: string; custom?: string; output?: string; yes?: boolean }) => {
      try {
        await run(spec.join(' '), opts);
      } catch (err) {
        if (err instanceof Error && /force closed/i.test(err.message)) return;
        console.error(chalk.red('forge pipeline failed:'), err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}
