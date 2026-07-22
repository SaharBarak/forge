/**
 * Headless Forge session runner used by MCP and automation surfaces.
 *
 * It runs the same EDAOrchestrator phase machine as the TUI, waits for the
 * public session_end event, persists all normal artifacts, and returns the
 * consolidated final draft to the caller.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { SessionPersistence } from '../adapters/SessionPersistence';
import { captureConsoleToFile } from '../adapters/console-capture';
import { createHostAgentRunner } from '../adapters/HostAgentRunner';
import {
  EDAOrchestrator,
  type CriticalConsensusStatus,
} from '../../src/lib/eda/EDAOrchestrator';
import { ReactionEngine, DEFAULT_RULES } from '../../src/lib/eda/ReactionEngine';
import { getDefaultMethodology } from '../../src/methodologies';
import { AGENT_PERSONAS, COPYWRITING_EXPERTISE } from '../../src/agents/personas';
import { loadSkills } from '../../src/lib/skills';
import type { IAgentRunner } from '../../src/lib/interfaces';
import type { Session, SessionConfig } from '../../src/types';

export const DEFAULT_COPYWRITE_AGENTS = ['skeptic', 'pragmatist', 'analyst'] as const;
export const DEFAULT_COPYWRITE_SECTIONS = [
  'Hero',
  'Problem',
  'Solution',
  'Benefits',
  'How It Works',
  'FAQ',
  'Final CTA',
] as const;

export interface HeadlessCopywriteRequest {
  brief: string;
  projectName?: string;
  sections?: string[];
  agents?: string[];
  language?: 'english' | 'hebrew' | 'mixed';
  contextPath?: string;
  /** MCP workspace root. Defaults to process.cwd() for direct CLI callers. */
  workspacePath?: string;
  outputDir?: string;
  timeoutMs?: number;
  /** Test/embedding override. Normal plugin calls use the authenticated host CLI. */
  agentRunner?: IAgentRunner;
  /** Per-agent turn timeout override for tests and embedded callers. */
  speakTimeoutMs?: number;
  /** Maximum critical review/revision rounds. Defaults to 3. */
  criticalReviewRounds?: number;
}

export interface HeadlessCopywriteResult {
  sessionId: string;
  sessionDir: string;
  output: string;
  completedSections: number;
  totalSections: number;
  durationMs: number;
  criticalConsensus: CriticalConsensusStatus;
}

function renderCriticalConsensusReport(status: CriticalConsensusStatus): string {
  const lines = [
    '# Critical Copy Consensus',
    '',
    `**Status:** ${status.approved ? 'UNANIMOUSLY APPROVED' : 'NOT APPROVED'}`,
    `**Reviewers:** ${status.reviewerCount}`,
    `**Rounds:** ${status.roundsCompleted}`,
    '',
  ];
  for (let round = 1; round <= status.roundsCompleted; round++) {
    lines.push(`## Round ${round}`, '');
    for (const review of status.reviews.filter((entry) => entry.round === round)) {
      lines.push(
        `### ${review.agentId} — ${review.verdict.toUpperCase()} (${review.alignmentScore}/100)`,
        '',
        '**Critical issues**',
        ...(review.criticalIssues.length
          ? review.criticalIssues.map((issue) => `- ${issue}`)
          : ['- None']),
        '',
        '**Required changes**',
        ...(review.requiredChanges.length
          ? review.requiredChanges.map((change) => `- ${change}`)
          : ['- None']),
        '',
      );
    }
  }
  return lines.join('\n').trim() + '\n';
}

export function sanitizeProjectName(raw?: string): string {
  const cleaned = (raw || 'Forge Copywrite')
    .replace(/[\\/\0<>:"|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80);
  return cleaned || 'Forge Copywrite';
}

export function buildCopywriteGoal(brief: string, sections: readonly string[]): string {
  const sectionList = sections
    .map((section, index) => `${index + 1}. **${section.trim().toUpperCase()}**`)
    .join('\n');

  return `Create complete, production-ready copy from the brief below using the Forge copywrite consensus method.

The final response must be usable as-is. Resolve disagreements during synthesis, then draft every required section. Do not return an outline, commentary, or placeholders. Never invent testimonials, metrics, customers, guarantees, or product capabilities that are not supported by the brief or grounded research.

## Copywriting brief

${brief.trim()}

## Required sections

${sectionList}`;
}

function validateSections(sections: readonly string[]): string[] {
  const cleaned = sections
    .map((section) => section.replace(/[#*\r\n]+/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((section) => section.length >= 3 && section.length <= 40);
  if (cleaned.length < 2) {
    throw new Error('At least two valid output sections are required.');
  }
  return Array.from(new Set(cleaned)).slice(0, 12);
}

function validateAgents(agents: readonly string[]): string[] {
  const known = new Set(AGENT_PERSONAS.map((agent) => agent.id));
  const valid = Array.from(new Set(agents.filter((agent) => known.has(agent))));
  if (valid.length < 2) {
    throw new Error('A consensus run requires at least two valid Forge agent IDs.');
  }
  return valid.slice(0, 5);
}

export async function runHeadlessCopywriteSession(
  request: HeadlessCopywriteRequest,
): Promise<HeadlessCopywriteResult> {
  if (!request.brief || request.brief.trim().length < 20) {
    throw new Error('The copywriting brief must contain at least 20 characters.');
  }

  const startedAt = Date.now();
  const cwd = path.resolve(request.workspacePath ?? process.cwd());
  const projectName = sanitizeProjectName(request.projectName);
  const sections = validateSections(request.sections ?? DEFAULT_COPYWRITE_SECTIONS);
  const agents = validateAgents(request.agents ?? DEFAULT_COPYWRITE_AGENTS);
  const outputDir = request.outputDir
    ? path.resolve(cwd, request.outputDir)
    : path.join(cwd, 'output', 'sessions');
  const contextPath = request.contextPath
    ? path.resolve(cwd, request.contextPath)
    : cwd;
  const goal = buildCopywriteGoal(request.brief, sections);

  const config: SessionConfig = {
    id: crypto.randomUUID(),
    projectName,
    goal,
    enabledAgents: agents,
    humanParticipation: false,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: contextPath,
    outputDir,
    language: request.language ?? 'english',
    mode: 'copywrite',
  };

  const session: Session = {
    id: config.id,
    config,
    messages: [],
    currentPhase: 'initialization',
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: new Date(),
    status: 'running',
  };

  const fsAdapter = new FileSystemAdapter(cwd);
  const persistence = new SessionPersistence(fsAdapter, { outputDir });
  await persistence.initSession(session);
  const sessionDir = persistence.getSessionDir();
  if (!sessionDir) throw new Error('Forge could not initialize the session directory.');

  const resolvedSkills = await loadSkills({
    cwd,
    modeId: 'copywrite',
    enabledAgents: agents,
    sessionWorkdir: sessionDir,
    goal,
  });
  for (const agentId of agents) {
    const projectSkills = resolvedSkills.perAgent.get(agentId)?.trim();
    resolvedSkills.perAgent.set(
      agentId,
      [COPYWRITING_EXPERTISE.trim(), projectSkills].filter(Boolean).join('\n\n---\n\n'),
    );
  }

  const orchestrator = new EDAOrchestrator(session, undefined, COPYWRITING_EXPERTISE, {
    agentRunner: request.agentRunner ?? createHostAgentRunner(),
    fileSystem: fsAdapter,
    autoRunPhaseMachine: true,
    sessionWorkdir: sessionDir,
    perAgentSkills: resolvedSkills.perAgent,
    phaseMachineOptions:
      request.speakTimeoutMs === undefined && request.criticalReviewRounds === undefined
        ? undefined
        : {
            speakTimeoutMs: request.speakTimeoutMs,
            criticalReviewRounds: request.criticalReviewRounds,
          },
  });
  const reactions = new ReactionEngine(orchestrator, DEFAULT_RULES);

  orchestrator.on((event) => {
    if (event.type === 'agent_message') {
      persistence.updateSession(orchestrator.getSession());
    }
  });

  const captured = captureConsoleToFile(sessionDir);
  let unsubscribe: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    const completed = new Promise<void>((resolve, reject) => {
      unsubscribe = orchestrator.on((event) => {
        if (event.type === 'session_end') resolve();
        if (event.type === 'session_error') {
          const detail = event.data as { error?: unknown } | undefined;
          reject(
            new Error(
              `The Forge phase machine failed: ${String(detail?.error ?? 'unknown error')}`,
            ),
          );
        }
      });
    });
    const timedOut = new Promise<void>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error('The Forge consensus run timed out before finalization.')),
        request.timeoutMs ?? 45 * 60_000,
      );
    });

    reactions.start();
    await orchestrator.start();
    await Promise.race([completed, timedOut]);

    const output = await orchestrator.getConsolidatedDraft();
    const draftedSections = orchestrator.getCopySections();
    const criticalConsensus = orchestrator.getCriticalConsensusStatus();
    const completedSections = draftedSections.filter(
      (section) => section.content && !section.content.includes('_(agent did not respond in time)_'),
    ).length;

    await fs.mkdir(path.join(sessionDir, 'consensus'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(sessionDir, 'final.md'), output, 'utf8'),
      fs.writeFile(path.join(sessionDir, 'consensus', 'final-copy.md'), output, 'utf8'),
      fs.writeFile(
        path.join(sessionDir, 'consensus', 'critical-review.md'),
        renderCriticalConsensusReport(criticalConsensus),
        'utf8',
      ),
    ]);
    await persistence.saveFull();

    return {
      sessionId: session.id,
      sessionDir,
      output,
      completedSections,
      totalSections: draftedSections.length,
      durationMs: Date.now() - startedAt,
      criticalConsensus,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    unsubscribe?.();
    reactions.stop();
    orchestrator.stop();
    await persistence.saveFull().catch(() => undefined);
    captured.restore();
  }
}
