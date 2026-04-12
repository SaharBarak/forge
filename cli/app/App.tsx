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

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StatusBar } from './StatusBar';
import { AgentList } from './AgentList';
import { ChatPane } from './ChatPane';
import { InputPane, CommandHelp } from './InputPane';
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

interface AppProps {
  orchestrator: EDAOrchestrator;
  persistence: SessionPersistence;
  session: Session;
  onExit: () => void;
}

interface AgentInfo {
  id: string;
  name: string;
  nameHe: string;
  state: string;
  contributions: number;
  stance?: 'FOR' | 'AGAINST' | 'NEUTRAL';
}

const authRepo = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);

const isContribution = (p: unknown): p is Contribution =>
  !!p && typeof p === 'object' && 'kind' in p && 'title' in p && (p as { kind: string }).kind !== 'reaction';

export function App({ orchestrator, persistence, session, onExit }: AppProps): React.ReactElement {
  const { exit } = useApp();

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

  // Build agent list
  const agents: AgentInfo[] = session.config.enabledAgents.map((id) => {
    const agent = getAgentById(id);
    return {
      id,
      name: agent?.name || id,
      nameHe: agent?.nameHe || '',
      state: agentStates.get(id) || 'listening',
      contributions: contributions.get(id) || 0,
    };
  });

  // Subscribe to orchestrator events
  useEffect(() => {
    const unsubscribe = orchestrator.on((event: EDAEvent) => {
      switch (event.type) {
        case 'phase_change':
          setPhase((event.data as { phase: SessionPhase }).phase);
          break;
        case 'agent_message':
          setMessages(orchestrator.getMessages());
          {
            const status = orchestrator.getConsensusStatus();
            setContributions(status.agentParticipation);
            setConsensusPoints(status.consensusPoints);
            setConflictPoints(status.conflictPoints);
          }
          break;
        case 'agent_typing': {
          const typingData = event.data as { agentId: string; typing: boolean };
          if (typingData.typing) setCurrentSpeaker(typingData.agentId);
          break;
        }
        case 'floor_status': {
          const floorData = event.data as { current: string | null; status: string };
          setCurrentSpeaker(floorData.current);
          const floorStatus = orchestrator.getFloorStatus();
          setQueued(floorStatus.queued);
          break;
        }
        case 'synthesis':
          setStatusMessage('Synthesis complete');
          setTimeout(() => setStatusMessage(null), 3000);
          break;
        case 'error':
          setStatusMessage(`Error: ${(event.data as { message: string }).message}`);
          break;
      }
      setAgentStates(new Map(orchestrator.getAgentStates()));
    });

    orchestrator.start();
    return () => { unsubscribe(); };
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

  return (
    <Box flexDirection="column" height="100%">
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="cyan">
          🔥 Forge: {session.config.projectName}
        </Text>
      </Box>

      <StatusBar
        phase={phase}
        currentSpeaker={currentSpeaker}
        queued={queued}
        messageCount={messages.length}
        consensusPoints={consensusPoints}
        conflictPoints={conflictPoints}
        did={did}
        peerCount={peerCount}
        connectionsIndexSize={connectionsIndexSize}
      />

      <Box flexDirection="row" flexGrow={1}>
        <ChatPane messages={messages} />
        <AgentList agents={agents} currentSpeaker={currentSpeaker} />
      </Box>

      {statusMessage && (
        <Box paddingX={1}>
          <Text color="yellow">{statusMessage}</Text>
        </Box>
      )}

      {showHelp && <CommandHelp />}

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
