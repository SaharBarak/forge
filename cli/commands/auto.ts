/**
 * `forge auto "<text>"` — Smart Router.
 *
 * Takes a natural-language request and infers the right combination of
 * {mode, suggested agents, goal} for a deliberation. Prints the plan,
 * asks for confirmation, then hands off to the standard session runway.
 *
 * One classifier call to the default provider using a short rubric.
 * Falls back to the `custom` mode with the generic council if the
 * classifier fails to parse.
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getAllModes, getModeById } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';
import { launchSession } from '../lib/session-launcher';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { ClaudeCodeCLIRunner } from '../adapters/ClaudeCodeCLIRunner';

interface RouteDecision {
  mode: string;
  agents: string[];
  goal: string;
  projectName: string;
  rationale: string;
}

async function classify(raw: string): Promise<RouteDecision | null> {
  const runner = process.env.ANTHROPIC_API_KEY
    ? new CLIAgentRunner()
    : new ClaudeCodeCLIRunner();

  const modes = getAllModes();
  const modeList = modes
    .map((m) => `  ${m.id.padEnd(18)} ${m.description}`)
    .join('\n');
  const personaList = AGENT_PERSONAS
    .map((a) => `  ${a.id.padEnd(22)} ${a.role}`)
    .join('\n');

  const systemPrompt = `You are a router. Given a user's request, pick the right deliberation mode and 3–4 agents from the catalog below. Output JSON only.

## Modes
${modeList}

## Personas
${personaList}

## Output shape (JSON only, no commentary)
{
  "mode": "<one of the mode ids above>",
  "agents": ["<persona id>", "<persona id>", "<persona id>"],
  "goal": "<reframed goal, one sentence>",
  "projectName": "<short, 3–5 words, PascalCase or kebab-case>",
  "rationale": "<one sentence why this mode + these agents fit>"
}`;

  const result = await runner.query({
    prompt: `User request: ${raw}\n\nReturn the JSON only.`,
    systemPrompt,
    model: 'claude-sonnet-4-20250514',
  });

  if (!result.success || !result.content) return null;
  const match = result.content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[0]) as Partial<RouteDecision>;
    if (
      typeof parsed.mode === 'string' &&
      Array.isArray(parsed.agents) &&
      typeof parsed.goal === 'string' &&
      typeof parsed.projectName === 'string'
    ) {
      return {
        mode: parsed.mode,
        agents: parsed.agents,
        goal: parsed.goal,
        projectName: parsed.projectName,
        rationale: parsed.rationale ?? '',
      };
    }
  } catch {
    // fall through
  }
  return null;
}

async function run(text: string, opts: { yes?: boolean; output?: string }): Promise<void> {
  p.intro(chalk.bold('⚒  forge auto'));

  const spin = p.spinner();
  spin.start('Classifying your request');
  const decision = await classify(text);
  spin.stop(decision ? 'Router picked a plan' : 'Router fell back to custom mode');

  const mode = decision?.mode ?? 'custom';
  const modeMeta = getModeById(mode);
  const validAgents = (decision?.agents ?? [])
    .filter((id) => AGENT_PERSONAS.some((a) => a.id === id));
  const agents = validAgents.length >= 2 ? validAgents : ['skeptic', 'pragmatist', 'analyst'];

  p.note(
    [
      `${chalk.bold('Mode:')}      ${modeMeta?.name ?? mode} (${mode})`,
      `${chalk.bold('Project:')}   ${decision?.projectName ?? 'AutoRouted'}`,
      `${chalk.bold('Goal:')}      ${decision?.goal ?? text}`,
      `${chalk.bold('Agents:')}    ${agents.join(', ')}`,
      decision?.rationale ? `${chalk.bold('Rationale:')} ${decision.rationale}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    'Proposed plan'
  );

  if (!opts.yes) {
    const confirm = await p.confirm({
      message: 'Start this deliberation?',
      initialValue: true,
    });
    if (p.isCancel(confirm) || !confirm) {
      p.cancel('Cancelled. Re-run with different wording to try again.');
      return;
    }
  }

  const result = await launchSession({
    projectName: decision?.projectName ?? 'AutoRouted',
    goal: decision?.goal ?? text,
    mode,
    agents,
    language: 'english',
    humanParticipation: false,
    outputDir: opts.output ?? 'output/sessions',
  });

  if (!result.success) {
    console.error(chalk.red(result.error ?? 'Session did not start'));
    process.exitCode = 1;
  }
}

export function createAutoCommand(): Command {
  return new Command('auto')
    .description('Smart router: natural-language request → mode + agents + goal')
    .argument('<text...>', 'Free-form request, any length')
    .option('-y, --yes', 'Skip the confirmation prompt and launch immediately')
    .option('-o, --output <dir>', 'Output directory', 'output/sessions')
    .action(async (text: string[], opts: { yes?: boolean; output?: string }) => {
      try {
        await run(text.join(' '), opts);
      } catch (err) {
        if (err instanceof Error && /force closed/i.test(err.message)) return;
        console.error(chalk.red('forge auto failed:'), err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}
