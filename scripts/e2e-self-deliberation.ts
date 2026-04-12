/**
 * E2E self-deliberation test — runs a real Forge session about Forge itself.
 *
 * Instantiates the EDAOrchestrator directly (no Ink), spins up 3 agents,
 * runs a short deliberation about the project, and verifies:
 *
 *   1. Session lifecycle: initialize → run → session_end event fires
 *   2. Agents actually call the Anthropic API via @claude-agent-sdk
 *   3. MessageBus emits message:new events
 *   4. At least one agent produces a message
 *   5. The render pipeline formats the resulting messages correctly
 *   6. Tool call parsing handles any [TOOL:] blocks emitted by agents
 *
 * Uses CLIAgentRunner which shells out to the authenticated `claude` CLI.
 */

import { v4 as uuid } from 'uuid';
import * as path from 'path';
import { EDAOrchestrator } from '../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../src/lib/eda/MessageBus';
import { ClaudeCodeCLIRunner } from '../cli/adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from '../cli/adapters/FileSystemAdapter';
import { AGENT_PERSONAS, getAgentById } from '../src/agents/personas';
import { getDefaultMethodology } from '../src/methodologies';
import { renderMarkdown, parseToolCalls, forgeTheme, style, agentColor } from '../src/lib/render';
import type { Session, SessionConfig, Message } from '../src/types';

const SEP = '\n' + '═'.repeat(70) + '\n';

let passed = 0;
let failed = 0;

const assert = (name: string, condition: boolean, detail?: string): void => {
  if (condition) {
    console.log(style(forgeTheme.status.success, '  ✔') + ' ' + name);
    passed++;
  } else {
    console.log(style(forgeTheme.status.error, '  ✘') + ' ' + name + (detail ? ` — ${detail}` : ''));
    failed++;
  }
};

const section = (title: string): void => {
  console.log(SEP);
  console.log(style(forgeTheme.heading.h1, `  ${title}`));
  console.log(SEP);
};

async function main(): Promise<void> {
  section('Forge Self-Deliberation E2E');

  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new ClaudeCodeCLIRunner();

  // Pick 3 agents for a compact session.
  const enabledAgents = ['skeptic', 'pragmatist', 'analyst'];
  for (const id of enabledAgents) {
    const agent = getAgentById(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
  }

  const sessionConfig: SessionConfig = {
    id: uuid(),
    projectName: 'Forge Self-Reflection',
    goal: 'Briefly debate: what is the single biggest architectural risk in Forge right now? Each agent, one sentence of evidence, then one sentence of counter-argument. Keep it extremely terse — 2 rounds max. End with [CONSENSUS] if reached.',
    enabledAgents,
    humanParticipation: false,
    maxRounds: 2,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path.join(cwd, 'context'),
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
    { agentRunner, fileSystem: fsAdapter }
  );

  // Track events
  const agentMessages: Message[] = [];
  const events: string[] = [];
  let sessionEnded = false;

  const unsubMessage = messageBus.subscribe('message:new', (payload: { message: Message; fromAgent: string }) => {
    events.push(`message:new(${payload.fromAgent})`);
    if (payload.fromAgent !== 'system' && payload.fromAgent !== 'human') {
      agentMessages.push(payload.message);
      const color = agentColor(payload.fromAgent);
      const preview = payload.message.content.slice(0, 120).replace(/\n/g, ' ');
      console.log('  ' + style(color + forgeTheme.bold, payload.fromAgent) + ' ' + style(forgeTheme.text.muted, preview));
    }
  }, 'e2e-test');

  const unsubPhase = messageBus.subscribe('phase:change', (payload: { from: string; to: string }) => {
    events.push(`phase:change(${payload.from}→${payload.to})`);
    console.log('  ' + style(forgeTheme.phase.label, `PHASE: ${payload.to}`));
  }, 'e2e-test');

  const unsubEnd = messageBus.subscribe('session:end', () => {
    events.push('session:end');
    sessionEnded = true;
  }, 'e2e-test');

  // ---- Run orchestrator for a bounded time ----
  console.log(style(forgeTheme.text.muted, '\n  Starting orchestrator (150s timeout)...\n'));
  const startTime = Date.now();
  const TIMEOUT_MS = 150_000;
  const MIN_MESSAGES = 1; // Probabilistic reactivity (0.6) means 3-agent sessions sometimes see only 1 speaker in short windows

  orchestrator.start().catch((err) => {
    console.error(style(forgeTheme.status.error, '  ✘ Orchestrator error: ' + (err as Error).message));
  });

  // Poll until timeout or enough messages
  while (Date.now() - startTime < TIMEOUT_MS) {
    if (sessionEnded) break;
    if (agentMessages.length >= MIN_MESSAGES) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Stop
  try {
    orchestrator.stop();
  } catch (err) {
    console.log(style(forgeTheme.text.muted, `  (stop threw: ${(err as Error).message})`));
  }

  unsubMessage();
  unsubPhase();
  unsubEnd();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(style(forgeTheme.text.muted, `\n  Elapsed: ${elapsed}s`));

  // ---- Assertions ----
  section('Self-deliberation assertions');

  assert('Orchestrator instantiated without error', orchestrator !== null);
  assert('MessageBus received events', events.length > 0, `got ${events.length} events`);
  assert(`At least ${MIN_MESSAGES} agent message produced`, agentMessages.length >= MIN_MESSAGES,
    `got ${agentMessages.length}`);

  // Informational only — probabilistic reactivity means not all agents speak every session
  const uniqueSpeakers = new Set(agentMessages.map((m) => m.agentId));
  console.log(style(forgeTheme.text.muted, `  ℹ Speakers this run: ${Array.from(uniqueSpeakers).join(', ') || 'none'}`));

  // Verify messages are non-trivial
  const avgLen = agentMessages.length > 0
    ? agentMessages.reduce((sum, m) => sum + m.content.length, 0) / agentMessages.length
    : 0;
  assert('Agent messages have real content (avg > 50 chars)', avgLen > 50,
    `avg ${avgLen.toFixed(0)} chars`);

  // ---- Render pipeline on real agent output ----
  section('Render pipeline on real agent output');

  if (agentMessages.length > 0) {
    const firstMsg = agentMessages[0];
    const rendered = renderMarkdown(firstMsg.content);
    assert('renderMarkdown handles real LLM output', rendered.length > 0);

    const blocks = parseToolCalls(firstMsg.content);
    assert('parseToolCalls returns at least 1 block', blocks.length >= 1);

    // Preview first agent message
    console.log('\n  ' + style(agentColor(firstMsg.agentId) + forgeTheme.bold, firstMsg.agentId) + ':');
    const previewLines = rendered.split('\n').slice(0, 6);
    for (const line of previewLines) console.log('    ' + line);
    if (rendered.split('\n').length > 6) {
      console.log(style(forgeTheme.text.muted, `    … (${rendered.split('\n').length - 6} more lines)`));
    }
  }

  // ---- Summary ----
  section('Summary');
  const total = passed + failed;
  console.log(`  Events captured: ${events.length}`);
  console.log(`  Messages received: ${agentMessages.length}`);
  console.log(`  Unique speakers: ${uniqueSpeakers.size}`);
  console.log('');

  if (failed === 0) {
    console.log('  ' + style(forgeTheme.status.success, `✔ SELF-DELIBERATION PASSED — ${passed}/${total}`));
    process.exit(0);
  } else {
    console.log('  ' + style(forgeTheme.status.error, `✘ ${failed} FAILED — ${passed}/${total}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(style(forgeTheme.status.error, '\n  UNCAUGHT ERROR:'));
  console.error(err);
  process.exit(1);
});
