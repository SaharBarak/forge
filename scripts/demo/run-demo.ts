/**
 * scripts/demo/run-demo.ts
 *
 * Bounded, low-cost forge deliberation for landing-page recording.
 * Uses autoRunPhaseMachine + tight maxRounds + a focused goal.
 *
 * Pretty-prints colored agent messages and phase transitions so the
 * vhs capture has dense visual content.
 */

import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../../src/lib/eda/MessageBus';
import { ClaudeCodeCLIRunner } from '../../cli/adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from '../../cli/adapters/FileSystemAdapter';
import { getAgentById } from '../../src/agents/personas';
import { getDefaultMethodology } from '../../src/methodologies';
import { renderMarkdown, forgeTheme, style, agentColor } from '../../src/lib/render';
import type { Session, SessionConfig, Message } from '../../src/types';

const DEMO_GOAL =
  'Two-round debate: what is Forge\'s single biggest UX risk? ' +
  'Each agent: ONE sentence of evidence, then ONE sentence of mitigation. ' +
  'No headings, no bullets, no preamble — pure prose, ≤ 60 words per turn. ' +
  'End with the line "[CONSENSUS]" once you agree.';

const HARD_TIMEOUT_MS = 110_000;

async function main(): Promise<void> {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new ClaudeCodeCLIRunner();

  const enabledAgents = ['skeptic', 'pragmatist', 'analyst'];
  for (const id of enabledAgents) {
    if (!getAgentById(id)) throw new Error(`Agent not found: ${id}`);
  }

  console.log(style(forgeTheme.heading.h1, '\n  ▸ FORGE · live deliberation'));
  console.log(style(forgeTheme.text.muted, '  goal: biggest UX risk · agents: 3 · max rounds: 2\n'));

  const sessionConfig: SessionConfig = {
    id: uuid(),
    projectName: 'Forge Demo',
    goal: DEMO_GOAL,
    enabledAgents,
    humanParticipation: false,
    maxRounds: 2,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: cwd,
    outputDir: path.join(cwd, 'output', 'sessions'),
    language: 'english',
  };

  const session: Session = {
    id: sessionConfig.id,
    config: sessionConfig,
    messages: [],
    currentPhase: 'initialization',
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: new Date(),
    status: 'running',
  };

  const orchestrator = new EDAOrchestrator(
    session,
    undefined,
    undefined,
    { agentRunner, fileSystem: fsAdapter, autoRunPhaseMachine: true }
  );

  let messageCount = 0;
  let sessionEnded = false;

  const unsubMsg = messageBus.subscribe('message:new', (payload: { message: Message; fromAgent: string }) => {
    if (payload.fromAgent === 'human') return;

    if (payload.fromAgent === 'system') {
      const preview = payload.message.content.split('\n')[0].slice(0, 80);
      console.log('  ' + style(forgeTheme.text.muted, '◎ ' + preview));
      return;
    }

    messageCount++;
    const color = agentColor(payload.fromAgent);
    const tag = payload.fromAgent.toUpperCase().padEnd(11);
    console.log('\n  ' + style(color + forgeTheme.bold, '▸ ' + tag));
    const rendered = renderMarkdown(payload.message.content, 78);
    const lines = rendered.split('\n').slice(0, 6).map((l) => '    ' + l).join('\n');
    console.log(lines);
  }, 'demo');

  const unsubPhase = messageBus.subscribe('phase:change', (payload: { from: string; to: string }) => {
    console.log('\n  ' + style(forgeTheme.phase.label, `▶ PHASE → ${payload.to.toUpperCase()}`));
  }, 'demo');

  const unsubEnd = messageBus.subscribe('session:end', () => {
    sessionEnded = true;
  }, 'demo');

  const startTime = Date.now();
  orchestrator.start().catch((err) => {
    console.error(style(forgeTheme.status.error, '  ✘ ' + (err as Error).message));
  });

  while (Date.now() - startTime < HARD_TIMEOUT_MS) {
    if (sessionEnded) break;
    await new Promise((r) => setTimeout(r, 800));
  }

  try { orchestrator.stop(); } catch {}
  unsubMsg(); unsubPhase(); unsubEnd();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n  ' + style(forgeTheme.status.success, `✔ done · ${messageCount} agent messages · ${elapsed}s`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
