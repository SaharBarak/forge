/**
 * Main CLI App component using Ink.
 *
 * This is the primary Forge interface. Integrates:
 *   - Multi-agent deliberation (EDA orchestrator)
 *   - DID identity display
 *   - P2P community commands (/community list, /community publish)
 *   - Connections search (/connections find <text>)
 *   - Markdown-rendered agent messages
 *   - Consensus tracking with visual indicators
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { HeaderBar } from './HeaderBar';
import { CouncilPanel, type CouncilAgent } from './CouncilPanel';
import { OrchestratorPanel } from './OrchestratorPanel';
import { DiscussionPane } from './DiscussionPane';
import { InputPane, CommandHelp } from './InputPane';
import { PermissionDialog } from './PermissionDialog';
import type { Message, Session, SessionPhase } from '../../src/types';
import type { EDAOrchestrator, EDAEvent } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import { getAgentById } from '../../src/agents/personas';
import { createSessionRepository } from '../../src/lib/auth/session';
import { createFileAuthBridge } from '../adapters/auth-bridge';
import { ResultAsync } from '../../src/lib/core';
import * as p2pDirect from '../adapters/p2p-direct';
import * as connectionsDirect from '../adapters/connections-direct';
import type { Contribution, Reaction } from '../../src/lib/community/types';
import { createPermissionBroker, type PermissionBroker } from '../../src/lib/render/permission';

interface AppProps {
  orchestrator: EDAOrchestrator;
  persistence: SessionPersistence;
  session: Session;
  onExit: () => void;
  permissionBroker?: PermissionBroker;
}

// AgentInfo is owned by CouncilPanel as CouncilAgent; this App file just
// builds that shape from orchestrator state below.

const authRepo = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);

const isContribution = (p: unknown): p is Contribution =>
  !!p && typeof p === 'object' && 'kind' in p && 'title' in p && (p as { kind: string }).kind !== 'reaction';

export function App({ orchestrator, persistence, session, onExit, permissionBroker }: AppProps): React.ReactElement {
  const { exit } = useApp();

  // Create a default permission broker if not injected (standalone session).
  const broker = useMemo(() => permissionBroker ?? createPermissionBroker(), [permissionBroker]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<SessionPhase>('initialization');
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [queued, setQueued] = useState<string[]>([]);
  const [agentStates, setAgentStates] = useState<Map<string, string>>(new Map());
  const [contributions, setContributions] = useState<Map<string, number>>(new Map());
  const [consensusPoints, setConsensusPoints] = useState(0);
  const [conflictPoints, setConflictPoints] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Identity + P2P state
  const [did, setDid] = useState<string | null>(null);
  const [peerCount, setPeerCount] = useState<number | undefined>(undefined);
  const [connectionsIndexSize, setConnectionsIndexSize] = useState<number | undefined>(undefined);

  // Session timer — ticks every second for live M:SS display. This used
  // to cause flicker when combined with 50+ stray console.log calls from
  // the orchestrator; now that console is silenced via captureConsoleToFile,
  // the per-second re-render is clean.
  const startRef = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Mode-aware data pulled from the orchestrator via getModeController().
  // Memoize the derived phases array so HeaderBar.memo can skip re-renders
  // — otherwise a fresh array every render always looks "different".
  const mode = orchestrator.getModeController().getMode();
  const modeLabel = mode.name;
  const modePhases = useMemo(
    () => mode.phases.map((p) => ({ id: p.id, name: p.name || p.id })),
    [mode]
  );
  const [modeProgress, setModeProgress] = useState(() =>
    orchestrator.getModeController().getProgress()
  );

  // Restore identity on mount
  useEffect(() => {
    authRepo.restoreSession().then((result) => {
      result.match(
        (s) => { if (s) setDid(s.did); },
        () => {}
      );
    });
  }, []);

  // Poll P2P + connections status every 10s
  useEffect(() => {
    const tick = async () => {
      const p2pResult = await p2pDirect.getStatus();
      p2pResult.match(
        (s) => { if (s.running) setPeerCount(s.peerCount); },
        () => {}
      );
      const connResult = await connectionsDirect.getStatus();
      connResult.match(
        (s) => setConnectionsIndexSize(s.indexSize),
        () => {}
      );
    };
    tick();
    const timer = setInterval(tick, 10_000);
    return () => clearInterval(timer);
  }, []);

  // Build council agents (consumed by CouncilPanel)
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

  // Subscribe to orchestrator events — coalesced through a microtask so
  // rapid-fire events collapse into ONE re-render instead of five.
  //
  // React 18's auto-batching doesn't apply to EventEmitter callbacks (we're
  // outside any React synthetic event), so without coalescing every message
  // triggered 5+ separate setState calls and 5+ full Ink re-layouts per
  // event = flicker.
  //
  // The pattern: queue a single flush via queueMicrotask; the flush reads
  // all orchestrator state in one pass and calls one setState per field.
  // Multiple events within the same tick only schedule one flush.
  useEffect(() => {
    let pendingFlush = false;
    let statusTimeout: ReturnType<typeof setTimeout> | null = null;

    const flush = (): void => {
      pendingFlush = false;
      const status = orchestrator.getConsensusStatus();
      const floorStatus = orchestrator.getFloorStatus();
      setMessages(orchestrator.getMessages());
      setContributions(status.agentParticipation);
      setConsensusPoints(status.consensusPoints);
      setConflictPoints(status.conflictPoints);
      setQueued(floorStatus.queued);
      setAgentStates(new Map(orchestrator.getAgentStates()));
      setModeProgress(orchestrator.getModeController().getProgress());
    };

    const schedule = (): void => {
      if (pendingFlush) return;
      pendingFlush = true;
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
          const typingData = event.data as { agentId: string; typing: boolean };
          if (typingData.typing) setCurrentSpeaker(typingData.agentId);
          break;
        }
        case 'floor_status': {
          const floorData = event.data as { current: string | null; status: string };
          setCurrentSpeaker(floorData.current);
          schedule();
          break;
        }
        case 'synthesis':
          setStatusMessage('Synthesis complete');
          if (statusTimeout) clearTimeout(statusTimeout);
          statusTimeout = setTimeout(() => setStatusMessage(null), 3000);
          break;
        case 'error':
          setStatusMessage(`Error: ${(event.data as { message: string }).message}`);
          break;
      }
    });

    orchestrator.start();
    return () => {
      unsubscribe();
      if (statusTimeout) clearTimeout(statusTimeout);
    };
  }, [orchestrator]);

  // Handle human input
  const handleSubmit = useCallback(async (text: string) => {
    await orchestrator.addHumanMessage(text);
    setMessages(orchestrator.getMessages());
  }, [orchestrator]);

  // Handle commands
  const handleCommand = useCallback(async (command: string, args: string[]) => {
    switch (command.toLowerCase()) {
      case 'pause':
        orchestrator.pause();
        setStatusMessage('Debate paused');
        break;
      case 'resume':
        orchestrator.resume();
        setStatusMessage('Debate resumed');
        break;
      case 'status':
        setStatusMessage(orchestrator.getConsensusStatus().recommendation);
        break;
      case 'synthesize': {
        const force = args.includes('force');
        const result = await orchestrator.transitionToSynthesis(force);
        setStatusMessage(result.message);
        break;
      }
      case 'export':
        await persistence.saveFull();
        setStatusMessage(`Exported to ${persistence.getSessionDir()}`);
        break;

      // ---- new: identity ----
      case 'login':
      case 'identity':
      case 'did':
        if (did) {
          setStatusMessage(`DID: ${did}`);
        } else {
          setStatusMessage('No identity. Run: forge login');
        }
        break;

      // ---- new: community ----
      case 'community': {
        const sub = args[0]?.toLowerCase();
        if (sub === 'list' || !sub) {
          const result = await p2pDirect.fetchAll<Contribution | Reaction>();
          result.match(
            (docs) => {
              const contribs = docs.filter((d) => isContribution(d.payload));
              if (contribs.length === 0) {
                setStatusMessage('No community contributions yet');
              } else {
                const lines = contribs
                  .slice(0, 5)
                  .map((c) => `  [${(c.payload as Contribution).kind.toUpperCase()}] ${(c.payload as Contribution).title}`)
                  .join('\n');
                setStatusMessage(`Community (${contribs.length}):\n${lines}`);
              }
            },
            (err) => setStatusMessage(`Community error: ${err.message}`)
          );
        } else if (sub === 'publish') {
          setStatusMessage('Use CLI: forge community publish -k insight -t "Title" -d "Desc" -b "Body"');
        }
        break;
      }

      // ---- new: connections ----
      case 'connections':
      case 'similar': {
        const query = args.join(' ');
        if (!query) {
          setStatusMessage('Usage: /connections <search text>');
          break;
        }
        const result = await connectionsDirect.findSimilar(query, 5);
        result.match(
          (matches) => {
            if (matches.length === 0) {
              setStatusMessage('No similar contributions found');
            } else {
              const lines = matches
                .map((m) => `  ${(m.similarity * 100).toFixed(0)}% — ${m.id.slice(0, 12)}…`)
                .join('\n');
              setStatusMessage(`Similar:\n${lines}`);
            }
          },
          (err) => setStatusMessage(`Connections error: ${err.message}`)
        );
        break;
      }

      case 'help':
        setShowHelp(!showHelp);
        break;
      case 'quit':
      case 'exit':
        await persistence.saveFull();
        orchestrator.stop();
        onExit();
        exit();
        break;
      default:
        setStatusMessage(`Unknown command: ${command}`);
    }
    setTimeout(() => setStatusMessage(null), 8000);
  }, [orchestrator, persistence, onExit, exit, showHelp, did]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      handleCommand('quit', []);
    }
    if (input === '?') {
      setShowHelp(!showHelp);
    }
  });

  // Phase machine state for the orchestrator panel.
  const currentModePhase = modeProgress.currentPhase;
  const currentPhaseIdx = Math.max(
    0,
    modePhases.findIndex((p) => p.id === currentModePhase)
  );
  const currentPhaseConfig = mode.phases[currentPhaseIdx];
  const phaseMaxMessages = currentPhaseConfig?.maxMessages ?? 0;
  // Required outputs for this mode's final deliverable (if any).
  const successCriteria = mode.successCriteria;
  const requiredOutputs = successCriteria?.requiredOutputs ?? [];

  return (
    <Box flexDirection="column" height="100%">
      <HeaderBar
        projectName={session.config.projectName}
        goal={session.config.goal}
        modeLabel={modeLabel}
        phases={modePhases}
        currentPhaseId={currentModePhase}
        elapsedSeconds={elapsed}
      />

      <Box flexDirection="row" flexGrow={1} marginTop={1}>
        <CouncilPanel agents={agents} currentSpeaker={currentSpeaker} />
        <Box flexGrow={1} marginX={1}>
          <DiscussionPane messages={messages} />
        </Box>
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
      </Box>

      {statusMessage && (
        <Box paddingX={1} marginTop={1}>
          <Text color="yellow">▸ {statusMessage}</Text>
        </Box>
      )}

      {/* Hidden — left out of render scope but kept for debugging if needed */}
      {false && (
        <Text dimColor>
          phase={phase} did={did} peers={peerCount} vec={connectionsIndexSize}
        </Text>
      )}

      {showHelp && <CommandHelp />}

      {/* Tool permission approval overlay — renders when broker emits request */}
      <PermissionDialog broker={broker} />

      <InputPane
        onSubmit={handleSubmit}
        onCommand={handleCommand}
        placeholder="Type message or /help for commands..."
      />

      <Box paddingX={1}>
        <Text dimColor>
          ? help | /community | /connections {'<query>'} | Ctrl+C quit
        </Text>
      </Box>
    </Box>
  );
}
