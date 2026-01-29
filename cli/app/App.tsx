/**
 * Main CLI App component using Ink
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StatusBar } from './StatusBar';
import { AgentList } from './AgentList';
import { ChatPane } from './ChatPane';
import { InputPane, CommandHelp } from './InputPane';
import type { Message, Session } from '../../src/types';
import type { EDAOrchestrator, SessionPhase, EDAEvent } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import { getAgentById } from '../../src/agents/personas';

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
}

export function App({ orchestrator, persistence, session, onExit }: AppProps): React.ReactElement {
  const { exit } = useApp();

  // State
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
          // Update contributions
          const status = orchestrator.getConsensusStatus();
          setContributions(status.agentParticipation);
          setConsensusPoints(status.consensusPoints);
          setConflictPoints(status.conflictPoints);
          break;

        case 'agent_typing':
          const typingData = event.data as { agentId: string; typing: boolean };
          if (typingData.typing) {
            setCurrentSpeaker(typingData.agentId);
          }
          break;

        case 'floor_status':
          const floorData = event.data as { current: string | null; status: string };
          setCurrentSpeaker(floorData.current);
          const floorStatus = orchestrator.getFloorStatus();
          setQueued(floorStatus.queued);
          break;

        case 'synthesis':
          setStatusMessage('Synthesis complete');
          setTimeout(() => setStatusMessage(null), 3000);
          break;

        case 'error':
          setStatusMessage(`Error: ${(event.data as { message: string }).message}`);
          break;
      }

      // Update agent states periodically
      setAgentStates(new Map(orchestrator.getAgentStates()));
    });

    // Start orchestration
    orchestrator.start();

    return () => {
      unsubscribe();
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
        const status = orchestrator.getConsensusStatus();
        setStatusMessage(status.recommendation);
        break;

      case 'synthesize':
        const force = args.includes('force');
        const result = await orchestrator.transitionToSynthesis(force);
        setStatusMessage(result.message);
        break;

      case 'export':
        await persistence.saveFull();
        const dir = persistence.getSessionDir();
        setStatusMessage(`Exported to ${dir}`);
        break;

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

    setTimeout(() => setStatusMessage(null), 5000);
  }, [orchestrator, persistence, onExit, exit, showHelp]);

  // Handle Ctrl+C
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
      {/* Header */}
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="cyan">
          🔥 Forge: {session.config.projectName}
        </Text>
      </Box>

      {/* Status Bar */}
      <StatusBar
        phase={phase}
        currentSpeaker={currentSpeaker}
        queued={queued}
        messageCount={messages.length}
        consensusPoints={consensusPoints}
        conflictPoints={conflictPoints}
      />

      {/* Main Content */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Chat Pane */}
        <ChatPane messages={messages} />

        {/* Agent Sidebar */}
        <AgentList agents={agents} currentSpeaker={currentSpeaker} />
      </Box>

      {/* Status Message */}
      {statusMessage && (
        <Box paddingX={1}>
          <Text color="yellow">{statusMessage}</Text>
        </Box>
      )}

      {/* Help */}
      {showHelp && <CommandHelp />}

      {/* Input */}
      <InputPane
        onSubmit={handleSubmit}
        onCommand={handleCommand}
        placeholder="Type message or /help for commands..."
      />

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>
          Press ? for help | Ctrl+C to quit
        </Text>
      </Box>
    </Box>
  );
}
