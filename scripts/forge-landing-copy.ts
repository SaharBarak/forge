/**
 * Live CLI test — generate landing page copy for Forge itself.
 *
 * Runs a real deliberation session where 3 Forge agents debate and write
 * the landing page copy for Forge. Uses the Claude Code CLI runner
 * (no API key required). Captures the transcript and final copy to
 * output/forge-landing-copy/.
 */

import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EDAOrchestrator } from '../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../src/lib/eda/MessageBus';
import { ClaudeCodeCLIRunner } from '../cli/adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from '../cli/adapters/FileSystemAdapter';
import { getAgentById } from '../src/agents/personas';
import { getDefaultMethodology } from '../src/methodologies';
import {
  renderMarkdown,
  forgeTheme,
  style,
  agentColor,
} from '../src/lib/render';
import type { Session, SessionConfig, Message } from '../src/types';

const GOAL = `Write a COMPLETE landing page for Forge — every section, full copy, ready to ship to a marketing team.

## About Forge
Forge is an open-source multi-agent deliberation engine written in TypeScript. You have access to the Forge source code via \`@context-finder\` during the Research phase — USE IT to discover what Forge actually does: which deliberation modes ship with the product, which researcher agents exist, which phases the executor runs, what tooling and identity/community features are wired up. Do not speculate. Do not abstract up to "multi-agent debate" — name specific modes, features, files, and code paths you verified yourself.

## Target audience
Developers, product managers, AI researchers, and teams who want structured multi-perspective reasoning on concrete work tasks (writing copy, validating ideas, generating business plans, evaluating feasibility, etc.) — not just generic single-agent suggestions.

## Tone
Confident, technical, slightly provocative. Think Warp, Linear, Ghostty — not corporate SaaS.

## DELIVERABLE — write EVERY section below, with actual copy (not outlines):

1. **HERO**
   - Headline (max 10 words, provocative)
   - Subheadline (1-2 sentences)
   - Primary CTA button text
   - Secondary CTA button text (e.g. "View on GitHub")

2. **PROBLEM STATEMENT**
   - 2-3 sentence opener describing the pain of single-agent or ad-hoc decision tools
   - 3 concrete pain points as bullets

3. **SOLUTION OVERVIEW**
   - One paragraph explaining how Forge solves the problem
   - Lead with the key mechanism: multi-agent deliberation with consensus tracking

4. **HOW IT WORKS**
   - 4-5 steps, each with a short title + 1 sentence explanation
   - Examples: "1. Define a goal", "2. Pick your archetypes", "3. Watch the debate", etc.

5. **FEATURES** (6 features)
   - Each: short title + 2-sentence explanation
   - Include: multi-agent deliberation, consensus tracking, CLI-first TUI, decentralized identity, P2P community, semantic search

6. **FOR WHOM** (3 audience segments)
   - Developers: what they get
   - Product managers: what they get
   - Researchers: what they get

7. **SOCIAL PROOF / OPEN SOURCE**
   - One paragraph positioning Forge in the open-source landscape
   - Mention: MIT license, did:key identity, no API key lock-in

8. **FAQ** (5 questions)
   - Actual questions a skeptical reader would ask, with real answers
   - Include: "How is this different from using Claude/GPT directly?", "Do I need an API key?", "Is the debate deterministic?", "Can I use my own models?", "How do I extend it?"

9. **FINAL CTA**
   - 1 headline, 1 subheadline, primary CTA button

10. **FOOTER**
    - 1-line tagline
    - Links: Docs, GitHub, Community, License

## Process
- Each agent contributes their perspective in Discovery (1 round)
- Move fast to Synthesis — don't linger on research
- Draft ALL sections in Drafting phase
- Final output must be in markdown, copy-pasteable, no placeholders

End with [CONSENSUS] when the full page is drafted.`;

async function main(): Promise<void> {
  const cwd = process.cwd();
  const baseDir = path.join(cwd, 'output', 'forge-landing-copy');
  const runStamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(baseDir, 'runs', runStamp);
  const latestLink = path.join(baseDir, 'latest');
  await fs.mkdir(outputDir, { recursive: true });
  // Update 'latest' symlink so you can always find the most recent run
  try {
    await fs.rm(latestLink, { force: true });
    await fs.symlink(path.relative(baseDir, outputDir), latestLink);
  } catch {
    // symlink failure is non-fatal
  }

  console.log(style(forgeTheme.heading.h1, '\n  FORGE — Live Self-Copywrite Test'));
  console.log(style(forgeTheme.text.muted, '  Goal: generate landing page copy for Forge itself\n'));

  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new ClaudeCodeCLIRunner();

  const enabledAgents = ['skeptic', 'pragmatist', 'analyst'];
  for (const id of enabledAgents) {
    const agent = getAgentById(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
  }

  const sessionConfig: SessionConfig = {
    id: uuid(),
    projectName: 'Forge Landing Page',
    goal: GOAL,
    enabledAgents,
    humanParticipation: false,
    maxRounds: 4,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    // Point context-finder at the forge repo itself — agents will
    // introspect the code during the Research phase to discover what
    // Forge actually does (modes, researchers, tools, phases) rather
    // than relying on us to pre-digest it into the goal.
    contextDir: cwd,
    outputDir,
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
    {
      agentRunner,
      fileSystem: fsAdapter,
      // Phase 1 fix: drive Discovery → Synthesis → Drafting deterministically
      autoRunPhaseMachine: true,
    }
  );

  const allMessages: Message[] = [];
  let sessionEnded = false;
  let phaseCount = 0;

  // Hook all events
  const unsubMsg = messageBus.subscribe('message:new', (payload: { message: Message; fromAgent: string }) => {
    const msg = payload.message;
    if (payload.fromAgent === 'human') return;
    allMessages.push(msg);

    if (payload.fromAgent === 'system') {
      // Short preview for system
      const preview = msg.content.split('\n').slice(0, 2).join(' | ').slice(0, 100);
      console.log('  ' + style(forgeTheme.text.muted, '◎ SYSTEM: ' + preview));
      return;
    }

    const color = agentColor(payload.fromAgent);
    console.log('\n  ' + style(color + forgeTheme.bold, '▶ ' + payload.fromAgent.toUpperCase()));
    // Render as markdown, indent
    const rendered = renderMarkdown(msg.content, 70);
    const indented = rendered
      .split('\n')
      .slice(0, 12)
      .map((l) => '    ' + l)
      .join('\n');
    console.log(indented);
    const totalLines = rendered.split('\n').length;
    if (totalLines > 12) {
      console.log(style(forgeTheme.text.muted, `    … (${totalLines - 12} more lines)`));
    }
  }, 'landing-copy-test');

  // Phase transitions are emitted via orchestrator.on(callback), not via
  // the MessageBus — subscribe to the orchestrator directly.
  const unsubPhase = orchestrator.on((event) => {
    if (event.type === 'phase_change') {
      const phase = (event.data as { phase: string }).phase;
      phaseCount++;
      console.log('\n  ' + style(forgeTheme.phase.label + forgeTheme.bold, `◆◆◆ PHASE ${phaseCount}: ${phase.toUpperCase()} ◆◆◆`) + '\n');
    }
  });

  const unsubEnd = messageBus.subscribe('session:end', () => {
    sessionEnded = true;
  }, 'landing-copy-test');

  // ---- Run ----
  console.log(style(forgeTheme.text.muted, '  Starting 3-agent deliberation (phase machine; safety timeout: 12min)\n'));
  const startTime = Date.now();
  const TIMEOUT_MS = 12 * 60_000; // safety net — phase machine emits session:end on completion

  orchestrator.start().catch((err) => {
    console.error(style(forgeTheme.status.error, '\n  ✘ Orchestrator error: ' + (err as Error).message));
  });

  // Wait for session:end (emitted by phase machine) or timeout
  while (Date.now() - startTime < TIMEOUT_MS) {
    if (sessionEnded) break;
    const agentMsgs = allMessages.filter((m) => m.agentId !== 'system');
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed > 0 && elapsed % 30 === 0) {
      const totalChars = agentMsgs.reduce((sum, m) => sum + m.content.length, 0);
      console.log(
        style(
          forgeTheme.text.muted,
          `  [${elapsed}s] ${agentMsgs.length} agent messages, ${totalChars} chars`,
        ),
      );
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  try {
    orchestrator.stop();
  } catch {}

  unsubMsg();
  unsubPhase();
  unsubEnd();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + style(forgeTheme.text.muted, `  Elapsed: ${elapsed}s`));
  console.log(style(forgeTheme.text.muted, `  Total messages: ${allMessages.length}`));

  // ---- Save transcript ----
  const transcriptPath = path.join(outputDir, 'transcript.md');
  const transcript = [
    `# Forge Landing Page — Deliberation Transcript`,
    ``,
    `**Session:** ${session.id}`,
    `**Started:** ${session.startedAt.toISOString()}`,
    `**Duration:** ${elapsed}s`,
    `**Agents:** ${enabledAgents.join(', ')}`,
    ``,
    `## Goal`,
    ``,
    GOAL,
    ``,
    `## Transcript`,
    ``,
    ...allMessages.map((m) => {
      const time = new Date(m.timestamp).toLocaleTimeString();
      return `### ${m.agentId} (${m.type}) — ${time}\n\n${m.content}\n`;
    }),
  ].join('\n');
  await fs.writeFile(transcriptPath, transcript, 'utf-8');

  // ---- Save final consolidated landing copy ----
  // The orchestrator's phase machine stores each drafted section in its
  // internal copySections state and exposes a canonical consolidated draft.
  // That's the source of truth — no brittle substring filters.
  const consolidated = await orchestrator.getConsolidatedDraft();
  const sections = orchestrator.getCopySections();
  const copyPath = path.join(outputDir, 'landing-copy.md');
  const copyDoc = [
    `# Forge — Landing Page Copy`,
    ``,
    `_Generated from live multi-agent deliberation on ${new Date().toISOString()}_  `,
    `_Session: ${session.id}_`,
    ``,
    `## Section Map`,
    ``,
    ...sections.map((s, i) => {
      const status = s.content ? '✓' : '…';
      return `${i + 1}. **${s.name}** — ${s.assignedAgent} ${status}`;
    }),
    ``,
    `---`,
    ``,
    consolidated,
  ].join('\n');
  await fs.writeFile(copyPath, copyDoc, 'utf-8');

  console.log('\n' + style(forgeTheme.status.success, '  ✔ Transcript saved: ') + transcriptPath);
  console.log(style(forgeTheme.status.success, '  ✔ Copy saved:       ') + copyPath);

  // ---- Summary ----
  const uniqueSpeakers = new Set(
    allMessages.filter((m) => m.agentId !== 'system').map((m) => m.agentId)
  );
  const totalChars = allMessages
    .filter((m) => m.agentId !== 'system')
    .reduce((sum, m) => sum + m.content.length, 0);

  console.log('\n  ' + style(forgeTheme.heading.h2, 'RESULT:'));
  console.log(`    Speakers: ${Array.from(uniqueSpeakers).join(', ')}`);
  console.log(`    Agent messages: ${allMessages.filter((m) => m.agentId !== 'system').length}`);
  console.log(`    Total chars: ${totalChars}`);
  console.log(`    Phase transitions: ${phaseCount}`);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(style(forgeTheme.status.error, '\n  UNCAUGHT ERROR:'));
    console.error(err);
    process.exit(1);
  });
