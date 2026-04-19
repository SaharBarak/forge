/** @jsxImportSource @opentui/react */
/**
 * OpenTUI port of the main deliberation TUI.
 *
 * Why OpenTUI instead of Ink: Ink does full-viewport redraws on every
 * state change, which causes visible flicker on any long-running
 * interactive UI. OpenTUI (@opentui/core + @opentui/react) uses dirty
 * rectangle optimization at 60 FPS — the same renderer OpenCode uses in
 * production. Anthropic hit the same flicker problem with Claude Code
 * and rewrote their renderer for the same reason.
 *
 * Ports: HeaderBar, CouncilPanel, DiscussionPane, OrchestratorPanel,
 * all inline in this file to keep the OpenTUI surface contained.
 *
 * Keeps the same props shapes as the Ink components so the orchestrator
 * event plumbing from the old App.tsx ports 1:1.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useKeyboard } from '@opentui/react';
import type { Message, Session, SessionPhase } from '../../src/types';
import type { EDAOrchestrator, EDAEvent } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import type { SessionMode } from '../../src/lib/modes';
import type { ModeProgress } from '../../src/lib/modes/ModeController';
import { getAgentById } from '../../src/agents/personas';
import { AgentControlPanel } from './AgentControlPanel';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AppProps {
  orchestrator: EDAOrchestrator;
  persistence: SessionPersistence;
  session: Session;
  onExit: () => void;
}

interface CouncilAgent {
  id: string;
  name: string;
  role?: string;
  state: string;
  contributions: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  argument: '#ff5454',
  question: '#00e5ff',
  proposal: '#e879f9',
  agreement: '#4ade80',
  disagreement: '#ff5454',
  synthesis: '#e879f9',
  research_result: '#facc15',
  human_input: '#00e5ff',
};

const AGENT_COLOR: Record<string, string> = {
  skeptic: '#ff5454',
  pragmatist: '#4ade80',
  analyst: '#00e5ff',
  advocate: '#e879f9',
  contrarian: '#fb923c',
  // VC roles
  'vc-partner': '#e879f9',
  'vc-associate': '#00e5ff',
  'lp-skeptic': '#facc15',
  'founder-voice': '#ff5454',
  // Tech-review roles
  architect: '#60a5fa',
  'perf-engineer': '#00e5ff',
  'security-reviewer': '#ff5454',
  'test-engineer': '#facc15',
  // Red-team roles
  'attack-planner': '#ff5454',
  'social-engineer': '#e879f9',
  'blue-team-lead': '#60a5fa',
};

const agentColor = (id: string): string => AGENT_COLOR[id] || '#f5e6ff';

const STATE_ICON: Record<string, string> = {
  listening: '·',
  thinking: '~',
  speaking: '>',
  waiting: '.',
  paused: '#',
};

/**
 * Strip the markdown noise that agents emit so the TUI renders clean
 * prose instead of `**bold**`, backticks, numbered-header artifacts.
 * Keeps semantic text; drops delimiters + emojis the terminal can't
 * render cleanly. Leaves ` · ` separators alone.
 *
 * Key rule: every delimiter-pair strip replaces with ` $1 ` (space-
 * padded) so patterns like `*word*nextword` don't collapse to
 * `wordnextword`. The final `\s+ → ' '` pass folds the duplicates.
 */
function cleanMessageBody(raw: string): string {
  return raw
    // ANSI colour codes first — if any slipped through from a tool
    // that shelled out to colour-capable output
    .replace(/\x1b\[[0-9;]*m/g, '')
    // Kill type tags like [ARGUMENT], [SYNTHESIS]
    .replace(/^\[[A-Z_ ]+\]\s*/, '')
    // HTML entities
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    // Headers: drop leading # marks but keep a space so the title
    // word doesn't crash into the body ("## HERO" → "HERO ")
    .replace(/(^|\n)\s{0,3}#{1,6}\s*/g, '$1')
    // Bold / italic: replace delimiters with space-padded text so
    // adjacent words can't collide — e.g. `**Skeptic's**right**G-E**`
    // must NOT collapse to `Skeptic'srightG-E`.
    .replace(/\*\*([\s\S]+?)\*\*/g, ' $1 ')
    .replace(/__([\s\S]+?)__/g, ' $1 ')
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, ' $1 ')
    .replace(/(?<!_)_([^_\n]+?)_(?!_)/g, ' $1 ')
    // Inline code fences and blocks — same space-pad treatment for
    // backtick inline code
    .replace(/```[a-z]*\n?/gi, ' ')
    .replace(/`([^`\n]+?)`/g, ' $1 ')
    // Bullet/list markers at line start
    .replace(/(^|\n)[-*]\s+/g, '$1')
    // Numbered list markers at line start ("1. foo" → "foo")
    .replace(/(^|\n)\s{0,3}\d+\.\s+/g, '$1')
    // Blockquote markers
    .replace(/(^|\n)\s{0,3}>\s?/g, '$1')
    // Strikethrough ~~text~~ → text (space-padded)
    .replace(/~~([\s\S]+?)~~/g, ' $1 ')
    // Markdown links [text](url) → text  (drop the URL target)
    .replace(/\[([^\]\n]+)\]\([^)\n]*\)/g, ' $1 ')
    // HTML tags — keep content, drop the tag
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    // Strip the noisy TUI emojis agents inherit from system-prompt examples
    .replace(/[🎙️📢📍🎯✍️🔎🧭🔍💡⚠️📋📊🔥⚒]/gu, '')
    // Non-standard whitespace that the \s class sometimes misses on
    // older JS engines: NBSP, zero-width-space, zero-width-joiner.
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    // Final collapse — multiple spaces introduced by the above strips
    // get folded back into single spaces.
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── HeaderBar ─────────────────────────────────────────────────────────────

interface HeaderBarProps {
  projectName: string;
  goal: string;
  modeLabel: string;
  phases: ReadonlyArray<{ id: string; name: string }>;
  currentPhaseId: string;
  elapsedSeconds: number;
}

const fmtElapsed = (s: number): string => {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
};

function HeaderBar({
  projectName,
  goal,
  modeLabel,
  phases,
  currentPhaseId,
  elapsedSeconds,
}: HeaderBarProps): React.ReactElement {
  const currentIdx = Math.max(0, phases.findIndex((p) => p.id === currentPhaseId));

  return (
    <box
      border
      borderColor="#ffbf00"
      padding={1}
      flexDirection="column"
      flexShrink={0}
    >
      {/* Row 1: brand + mode + timer */}
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg="#ffbf00">⚒ FORGE</text>
          <text fg="#6b6b76"> · </text>
          <text fg="#f5e6ff">{projectName}</text>
        </box>
        <box flexDirection="row">
          <text fg="#6b6b76">mode </text>
          <text fg="#e879f9">{modeLabel}</text>
          <text fg="#6b6b76"> · </text>
          <text fg="#00e5ff">{fmtElapsed(elapsedSeconds)}</text>
        </box>
      </box>

      {/* Row 2: goal */}
      <box flexDirection="row">
        <text fg="#6b6b76">🎯 </text>
        <text fg="#f5e6ff">{goal}</text>
      </box>

      {/* Row 3: phase timeline */}
      <box flexDirection="row" marginTop={1}>
        {phases.map((phase, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const nodeColor = isPast ? '#4ade80' : isCurrent ? '#ffbf00' : '#6b6b76';
          const node = isCurrent ? '◆' : isPast ? '◆' : '◇';
          const connector = i < phases.length - 1 ? (isPast ? ' ── ' : ' ┈┈ ') : '';
          return (
            <React.Fragment key={phase.id}>
              <text fg={nodeColor}>
                {node} {phase.name}
              </text>
              {connector ? (
                <text fg={isPast ? '#4ade80' : '#6b6b76'}>{connector}</text>
              ) : null}
            </React.Fragment>
          );
        })}
      </box>
    </box>
  );
}

// ─── CouncilPanel ──────────────────────────────────────────────────────────

interface CouncilPanelProps {
  agents: ReadonlyArray<CouncilAgent>;
  currentSpeaker: string | null;
}

const BAR_W = 8;
const buildBar = (count: number, max: number): string => {
  if (max === 0) return '░'.repeat(BAR_W);
  const f = Math.max(0, Math.min(BAR_W, Math.round((count / max) * BAR_W)));
  return '▓'.repeat(f) + '░'.repeat(BAR_W - f);
};

function CouncilPanel({ agents, currentSpeaker }: CouncilPanelProps): React.ReactElement {
  const maxContribs = Math.max(1, ...agents.map((a) => a.contributions));

  return (
    <box flexDirection="column" width={30} flexShrink={0}>
      <box border borderColor="#ffbf00" padding={1} flexDirection="column">
        <text fg="#ffbf00">COUNCIL</text>
        <text fg="#6b6b76">{agents.length} in the room</text>
      </box>

      {agents.map((agent) => {
        const isSpeaking = agent.id === currentSpeaker;
        const color = agentColor(agent.id);
        const icon = isSpeaking ? '▸' : STATE_ICON[agent.state] || '·';
        const bar = buildBar(agent.contributions, maxContribs);

        return (
          <box
            key={agent.id}
            border
            borderColor={isSpeaking ? '#00e5ff' : '#2a2a32'}
            padding={1}
            marginTop={1}
            flexDirection="column"
          >
            <box flexDirection="row">
              <text fg={isSpeaking ? '#00e5ff' : '#f5e6ff'}>{icon} </text>
              <text fg={color}>{agent.name}</text>
            </box>
            {agent.role ? <text fg="#6b6b76">{agent.role.slice(0, 26)}</text> : null}
            <box flexDirection="row">
              <text fg={isSpeaking ? '#00e5ff' : '#6b6b76'}>{bar}</text>
              <text fg="#6b6b76"> {agent.contributions}</text>
            </box>
          </box>
        );
      })}
    </box>
  );
}

// ─── DiscussionPane ────────────────────────────────────────────────────────

interface DiscussionPaneProps {
  messages: ReadonlyArray<Message>;
  maxRows?: number;
}

function DiscussionPane({ messages, maxRows = 20 }: DiscussionPaneProps): React.ReactElement {
  // Take the last N messages — OpenTUI's scrollbox could do scrolling but
  // we want a fixed window showing the current activity.
  const visible = messages.slice(-maxRows);
  const lastAgentIdx = (() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].agentId !== 'system') return i;
    }
    return -1;
  })();

  return (
    <box border borderColor="#2a2a32" padding={1} flexGrow={1} flexDirection="column">
      <box flexDirection="row">
        <text fg="#00e5ff">DISCUSSION</text>
        <text fg="#6b6b76"> · {messages.length} messages</text>
      </box>

      <box marginTop={1} flexDirection="column">
        {visible.length === 0 ? (
          <text fg="#6b6b76">Waiting for the orchestrator to open the floor…</text>
        ) : (
          visible.map((msg, i) => {
            if (msg.agentId === 'system') {
              // Grab the first non-empty line, then clean markdown/emoji
              // artifacts the orchestrator emits (**PHASE 1/4**, 🎙️, etc.).
              const firstLine = msg.content.split('\n').find((l) => l.trim()) || '';
              const line = cleanMessageBody(firstLine).slice(0, 140);
              return (
                <text key={msg.id} fg="#6b6b76">
                  ◎ {line}
                </text>
              );
            }
            const isCurrent = i === lastAgentIdx;
            const color = agentColor(msg.agentId);
            const badge = TYPE_COLOR[msg.type];
            const body = cleanMessageBody(msg.content).slice(0, 420);

            return (
              <box
                key={msg.id}
                flexDirection="column"
                marginTop={1}
                border={isCurrent}
                borderColor={isCurrent ? '#00e5ff' : undefined}
                padding={isCurrent ? 1 : 0}
              >
                <box flexDirection="row">
                  {isCurrent ? <text fg="#00e5ff">● NOW </text> : null}
                  <text fg={color}>{msg.agentId}</text>
                  {badge ? (
                    <>
                      <text fg="#6b6b76"> · </text>
                      <text fg={badge}>[{msg.type.toUpperCase()}]</text>
                    </>
                  ) : null}
                </box>
                <text fg="#f5e6ff">{body}</text>
              </box>
            );
          })
        )}
      </box>
    </box>
  );
}

// ─── OrchestratorPanel ─────────────────────────────────────────────────────

interface OrchestratorPanelProps {
  phaseName: string;
  phaseIdx: number;
  phaseCount: number;
  messagesInPhase: number;
  phaseMaxMessages: number;
  currentSpeaker: string | null;
  floorQueue: ReadonlyArray<string>;
  consensusPoints: number;
  conflictPoints: number;
  requiredOutputs: ReadonlyArray<string>;
  producedOutputs: ReadonlySet<string>;
  totalMessages: number;
}

const PBAR_W = 14;
const bar = (ratio: number): string => {
  const r = Math.max(0, Math.min(1, ratio));
  const f = Math.round(r * PBAR_W);
  return '▓'.repeat(f) + '░'.repeat(PBAR_W - f);
};

function OrchestratorPanel(props: OrchestratorPanelProps): React.ReactElement {
  const phaseRatio = props.phaseCount > 0 ? (props.phaseIdx + 1) / props.phaseCount : 0;
  const consensusTotal = props.consensusPoints + props.conflictPoints;
  const consensusRatio = consensusTotal > 0 ? props.consensusPoints / consensusTotal : 0.5;

  return (
    <box flexDirection="column" width={28} flexShrink={0}>
      <box border borderColor="#e879f9" padding={1} flexDirection="column">
        <text fg="#e879f9">ORCHESTRATOR</text>
        <text fg="#6b6b76">phase machine</text>
      </box>

      {/* Phase */}
      <box border borderColor="#2a2a32" padding={1} marginTop={1} flexDirection="column">
        <text fg="#6b6b76">PHASE</text>
        <text fg="#ffbf00">{props.phaseName}</text>
        <box flexDirection="row">
          <text fg="#ffbf00">{bar(phaseRatio)}</text>
          <text fg="#6b6b76">
            {' '}
            {props.phaseIdx + 1}/{props.phaseCount}
          </text>
        </box>
        <box flexDirection="row" marginTop={1}>
          <text fg="#6b6b76">msgs </text>
          <text fg={props.messagesInPhase > props.phaseMaxMessages * 0.8 ? '#ff5454' : '#00e5ff'}>
            {props.messagesInPhase}
          </text>
          <text fg="#6b6b76">/{props.phaseMaxMessages || '—'}</text>
        </box>
      </box>

      {/* Floor */}
      <box border borderColor="#2a2a32" padding={1} marginTop={1} flexDirection="column">
        <text fg="#6b6b76">FLOOR</text>
        {props.currentSpeaker ? (
          <text fg="#00e5ff">▸ {props.currentSpeaker}</text>
        ) : (
          <text fg="#6b6b76">open</text>
        )}
        {props.floorQueue.length > 0 ? (
          <>
            <text fg="#6b6b76">queue</text>
            {props.floorQueue.slice(0, 3).map((q, i) => (
              <text key={q + i} fg="#6b6b76">
                {i + 1}. {q}
              </text>
            ))}
          </>
        ) : null}
      </box>

      {/* Consensus */}
      <box border borderColor="#2a2a32" padding={1} marginTop={1} flexDirection="column">
        <text fg="#6b6b76">CONSENSUS</text>
        <box flexDirection="row">
          <text fg="#4ade80">✓{props.consensusPoints}</text>
          <text fg="#6b6b76"> / </text>
          <text fg="#ff5454">✗{props.conflictPoints}</text>
        </box>
        <text fg="#4ade80">{bar(consensusRatio)}</text>
        <text fg="#6b6b76">total {props.totalMessages}</text>
      </box>

      {/* Required outputs */}
      {props.requiredOutputs.length > 0 ? (
        <box border borderColor="#2a2a32" padding={1} marginTop={1} flexDirection="column">
          <text fg="#6b6b76">
            REQUIRED ({props.producedOutputs.size}/{props.requiredOutputs.length})
          </text>
          {props.requiredOutputs.map((out) => {
            const done = props.producedOutputs.has(out);
            return (
              <text key={out} fg={done ? '#4ade80' : '#6b6b76'}>
                {done ? '✓' : '○'} {out.replace(/_/g, ' ')}
              </text>
            );
          })}
        </box>
      ) : null}
    </box>
  );
}

// ─── Root App ──────────────────────────────────────────────────────────────

export function OpenTuiApp({
  orchestrator,
  persistence,
  session,
  onExit,
}: AppProps): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<SessionPhase>('initialization');
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [queued, setQueued] = useState<string[]>([]);
  const [agentStates, setAgentStates] = useState<Map<string, string>>(new Map());
  const [contributions, setContributions] = useState<Map<string, number>>(new Map());
  const [consensusPoints, setConsensusPoints] = useState(0);
  const [conflictPoints, setConflictPoints] = useState(0);
  const [modeProgress, setModeProgress] = useState<ModeProgress>(() =>
    orchestrator.getModeController().getProgress()
  );
  const [showControl, setShowControl] = useState(false);

  // Global keybind: `a` opens the Agent Control panel. The panel owns
  // keyboard input while mounted, so this handler only fires when closed.
  useKeyboard((event) => {
    if (showControl) return;
    const key = (event.name ?? '').toLowerCase();
    if (key === 'a') setShowControl(true);
  });

  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, []);

  // Orchestrator event handler — coalesced via queueMicrotask so multiple
  // rapid events land in a single re-render.
  useEffect(() => {
    let pending = false;
    const flush = (): void => {
      pending = false;
      const status = orchestrator.getConsensusStatus();
      const floor = orchestrator.getFloorStatus();
      setMessages(orchestrator.getMessages());
      setContributions(status.agentParticipation);
      setConsensusPoints(status.consensusPoints);
      setConflictPoints(status.conflictPoints);
      setQueued(floor.queued);
      setAgentStates(new Map(orchestrator.getAgentStates()));
      setModeProgress(orchestrator.getModeController().getProgress());
    };
    const schedule = (): void => {
      if (pending) return;
      pending = true;
      queueMicrotask(flush);
    };

    const unsubscribe = orchestrator.on((event: EDAEvent) => {
      switch (event.type) {
        case 'phase_change':
          setPhase((event.data as { phase: SessionPhase }).phase);
          schedule();
          break;
        case 'agent_message':
          schedule();
          break;
        case 'agent_typing': {
          const t = event.data as { agentId: string; typing: boolean };
          if (t.typing) setCurrentSpeaker(t.agentId);
          break;
        }
        case 'floor_status': {
          const f = event.data as { current: string | null };
          setCurrentSpeaker(f.current);
          schedule();
          break;
        }
      }
    });

    orchestrator.start();
    return () => {
      unsubscribe();
    };
  }, [orchestrator]);

  // Derived: mode info + required outputs
  const mode: SessionMode = orchestrator.getModeController().getMode();
  const modePhases = useMemo(
    () => mode.phases.map((p) => ({ id: p.id, name: p.name || p.id })),
    [mode]
  );
  const currentModePhase = modeProgress.currentPhase;
  const currentPhaseIdx = Math.max(
    0,
    modePhases.findIndex((p) => p.id === currentModePhase)
  );
  const currentPhaseConfig = mode.phases[currentPhaseIdx];
  const phaseMaxMessages = currentPhaseConfig?.maxMessages ?? 0;
  const requiredOutputs = mode.successCriteria?.requiredOutputs ?? [];

  // Build agent list
  const agents: CouncilAgent[] = session.config.enabledAgents.map((id) => {
    const agent = getAgentById(id);
    return {
      id,
      name: agent?.name || id,
      role: agent?.role,
      state: agentStates.get(id) || 'listening',
      contributions: contributions.get(id) || 0,
    };
  });

  void phase; // reserved for future Ink-only use
  void persistence;
  void onExit;

  if (showControl) {
    return (
      <AgentControlPanel
        orchestrator={orchestrator}
        agentIds={session.config.enabledAgents}
        currentSpeaker={currentSpeaker}
        agentStates={agentStates}
        onClose={() => setShowControl(false)}
      />
    );
  }

  return (
    <box flexDirection="column" height="100%">
      <HeaderBar
        projectName={session.config.projectName}
        goal={session.config.goal}
        modeLabel={mode.name}
        phases={modePhases}
        currentPhaseId={currentModePhase}
        elapsedSeconds={elapsed}
      />

      <box flexDirection="row" flexGrow={1} marginTop={1}>
        <CouncilPanel agents={agents} currentSpeaker={currentSpeaker} />
        <box flexGrow={1} marginLeft={1} marginRight={1}>
          <DiscussionPane messages={messages} />
        </box>
        <OrchestratorPanel
          phaseName={currentPhaseConfig?.name || currentModePhase}
          phaseIdx={currentPhaseIdx}
          phaseCount={modePhases.length}
          messagesInPhase={modeProgress.messagesInPhase}
          phaseMaxMessages={phaseMaxMessages}
          currentSpeaker={currentSpeaker}
          floorQueue={queued}
          consensusPoints={consensusPoints}
          conflictPoints={conflictPoints}
          requiredOutputs={requiredOutputs}
          producedOutputs={modeProgress.outputsProduced}
          totalMessages={modeProgress.totalMessages}
        />
      </box>

      <box flexDirection="row" justifyContent="flex-end" marginTop={1}>
        <text fg="#6b6b76">press </text>
        <text fg="#e879f9">a</text>
        <text fg="#6b6b76"> for agent control</text>
      </box>
    </box>
  );
}
