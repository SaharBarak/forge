/**
 * `forge parallel "<spec>"` — split a decomposable request into N
 * sub-questions, run a deliberation on each, aggregate the results.
 *
 * Not literally parallel within one process — OpenTUI binds the
 * terminal renderer and we don't want flickery split-screens. Instead
 * we run the sub-sessions *sequentially* but each in its own workdir
 * under `output/sessions/parallel-<ts>/<slug>/`, and produce a single
 * aggregate report at the end. Operators who need wall-clock
 * parallelism can open multiple shells and run sub-sessions directly.
 *
 * The split uses the same router pattern as `forge auto` — one
 * classifier call returns N mini-plans; we then drive them through
 * launchSession() one after another.
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { launchSession } from '../lib/session-launcher';
import { getAllModes } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { ClaudeCodeCLIRunner } from '../adapters/ClaudeCodeCLIRunner';

interface SubPlan {
  projectName: string;
  goal: string;
  mode: string;
  agents: string[];
  rationale: string;
}

async function splitSpec(spec: string, n: number): Promise<SubPlan[]> {
  const runner = process.env.ANTHROPIC_API_KEY
    ? new CLIAgentRunner()
    : new ClaudeCodeCLIRunner();
  const modes = getAllModes();
  const system = `You split a large request into ${n} independent sub-deliberations.
Each sub-deliberation has a distinct angle · they should NOT be the
same question rephrased. Pick the right Forge mode + 3-4 agents for
each sub-question.

## Modes
${modes.map((m) => `- ${m.id}: ${m.description}`).join('\n')}

## Personas
${AGENT_PERSONAS.map((a) => `- ${a.id}: ${a.role}`).join('\n')}

## Output (JSON array of length ${n})
[
  {
    "projectName": "<3-5 word pascal/kebab>",
    "goal": "<one sentence, distinct from the others>",
    "mode": "<mode id>",
    "agents": ["<persona id>", ...],
    "rationale": "<one sentence>"
  },
  ...
]`;

  const r = await runner.query({
    prompt: `Request: ${spec}\nReturn the JSON array only.`,
    systemPrompt: system,
    model: 'claude-sonnet-4-20250514',
  });
  if (!r.success || !r.content) return [];
  const m = r.content.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[0]) as Partial<SubPlan>[];
    return parsed
      .filter((x): x is SubPlan =>
        typeof x?.projectName === 'string' &&
        typeof x?.goal === 'string' &&
        typeof x?.mode === 'string' &&
        Array.isArray(x.agents)
      )
      .slice(0, n);
  } catch {
    return [];
  }
}

async function aggregate(
  parallelDir: string,
  runs: Array<{ plan: SubPlan; sessionDir?: string }>
): Promise<string> {
  const lines: string[] = [
    `# Forge parallel run`,
    ``,
    `${runs.length} sub-deliberation${runs.length === 1 ? '' : 's'}.`,
    ``,
  ];
  for (const { plan, sessionDir } of runs) {
    lines.push(`## ${plan.projectName} · ${plan.mode}`);
    lines.push(``);
    lines.push(`**Goal:** ${plan.goal}`);
    lines.push(`**Agents:** ${plan.agents.join(', ')}`);
    if (plan.rationale) lines.push(`**Why this split:** ${plan.rationale}`);
    lines.push(``);

    if (sessionDir) {
      lines.push(`**Session:** \`${sessionDir}\``);
      lines.push(``);
      // Inline the consensus artifacts if present.
      try {
        const consensusDir = path.join(sessionDir, 'consensus');
        const files = await fs.readdir(consensusDir);
        for (const f of files.sort()) {
          if (!f.endsWith('.md')) continue;
          const body = await fs.readFile(path.join(consensusDir, f), 'utf-8');
          lines.push(`### ${f}`);
          lines.push('');
          lines.push(body.trim());
          lines.push('');
        }
      } catch {
        lines.push(`_No consensus artifacts captured._`);
        lines.push('');
      }
    } else {
      lines.push(`_Run did not complete successfully._`);
      lines.push('');
    }
    lines.push(`---`);
    lines.push(``);
  }

  const out = path.join(parallelDir, 'AGGREGATE.md');
  await fs.writeFile(out, lines.join('\n'));
  return out;
}

async function run(spec: string, opts: { count?: string; output?: string }): Promise<void> {
  const n = Math.max(2, Math.min(8, parseInt(opts.count ?? '3', 10) || 3));
  p.intro(chalk.bold(`⚒  forge parallel · ${n} sub-deliberations`));

  const spin = p.spinner();
  spin.start('Splitting the spec into sub-questions');
  const plans = await splitSpec(spec, n);
  spin.stop(plans.length > 0 ? `Split into ${plans.length} plans` : 'Router failed to produce a valid split');

  if (plans.length === 0) {
    p.cancel('Nothing to run.');
    return;
  }

  p.note(
    plans
      .map(
        (pl, i) =>
          `${chalk.bold(`[${i + 1}] ${pl.projectName}`)} · ${pl.mode}\n    ${pl.goal}\n    ${chalk.dim(pl.agents.join(', '))}`
      )
      .join('\n\n'),
    'Proposed splits'
  );

  const ok = await p.confirm({
    message: `Run all ${plans.length} sessions now? (sequential · each ~2-4 minutes)`,
    initialValue: true,
  });
  if (p.isCancel(ok) || !ok) {
    p.cancel('Cancelled.');
    return;
  }

  // One parent workdir for the whole parallel run.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const parallelDir = path.join(opts.output ?? 'output/sessions', `parallel-${ts}`);
  await fs.mkdir(parallelDir, { recursive: true });

  const runs: Array<{ plan: SubPlan; sessionDir?: string }> = [];
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const subDir = path.join(parallelDir, `${String(i + 1).padStart(2, '0')}-${plan.projectName.replace(/[^a-z0-9]+/gi, '-')}`);

    p.note(`Starting ${i + 1}/${plans.length}: ${plan.projectName}`, 'Running');

    const result = await launchSession({
      projectName: plan.projectName,
      goal: plan.goal,
      mode: plan.mode,
      agents: plan.agents,
      language: 'english',
      humanParticipation: false,
      outputDir: subDir,
    });

    runs.push({ plan, sessionDir: result.sessionDir });
  }

  const aggPath = await aggregate(parallelDir, runs);
  p.outro(chalk.green(`Aggregate report: ${aggPath}`));
}

export function createParallelCommand(): Command {
  return new Command('parallel')
    .description('Split one spec into N parallel sub-deliberations, run them, aggregate results')
    .argument('<spec...>', 'The overall request')
    .option('-n, --count <n>', 'Number of sub-sessions (2-8)', '3')
    .option('-o, --output <dir>', 'Output directory root', 'output/sessions')
    .action(async (spec: string[], opts: { count?: string; output?: string }) => {
      try {
        await run(spec.join(' '), opts);
      } catch (err) {
        if (err instanceof Error && /force closed/i.test(err.message)) return;
        console.error(chalk.red('forge parallel failed:'), err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}
