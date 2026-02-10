/**
 * Main CLI App component using Ink
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { StatusBar, PHASE_COLORS } from './StatusBar';
import { AgentList } from './AgentList';
import { ChatPane } from './ChatPane';
import { InputPane, CommandHelp } from './InputPane';
import { Breadcrumbs } from './Breadcrumbs';
import { QuickReplies } from './QuickReplies';
import { AgentSuggestion } from './AgentSuggestion';
import { getQuickReplies, getPhaseHint, detectAgentSuggestion } from '../lib/suggestions';
import type { QuickReply, AgentSuggestionData } from '../lib/suggestions';
import type { Message, Session, SessionPhase } from '../../src/types';
import type { EDAOrchestrator, EDAEvent } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import type { ToolRunner } from '../tools/ToolRunner';
import { getAgentById } from '../../src/agents/personas';
import { v4 as uuid } from 'uuid';

interface AppProps {
  orchestrator: EDAOrchestrator;
  persistence: SessionPersistence;
  session: Session;
  toolRunner?: ToolRunner;
  onExit: () => void;
}

interface AgentInfo {
  id: string;
  name: string;
  nameHe: string;
  state: string;
  contributions: number;
}

export function App({ orchestrator, persistence, session, toolRunner, onExit }: AppProps): React.ReactElement {
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
  const [agentSuggestion, setAgentSuggestion] = useState<AgentSuggestionData | null>(null);
  const [inputEmpty, setInputEmpty] = useState(true);
  const prevMessageCount = useRef(0);

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

        case 'agent_message': {
          const allMessages = orchestrator.getMessages();
          setMessages(allMessages);
          // Update contributions
          const status = orchestrator.getConsensusStatus();
          setContributions(status.agentParticipation);
          setConsensusPoints(status.consensusPoints);
          setConflictPoints(status.conflictPoints);
          setAgentStates(new Map(orchestrator.getAgentStates()));

          // Check latest message for tool requests
          if (toolRunner && toolRunner.getAvailableTools().length > 0) {
            const latest = allMessages[allMessages.length - 1];
            if (latest && latest.agentId !== 'system') {
              const toolMatch = latest.content.match(/\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/);
              if (toolMatch) {
                const toolName = toolMatch[1];
                const toolPrompt = toolMatch[2].trim();
                const outputDir = persistence.getSessionDir();
                toolRunner.runTool(toolName, { prompt: toolPrompt, description: toolPrompt }, outputDir).then((result) => {
                  const toolMsg: Message = {
                    id: uuid(),
                    timestamp: new Date(),
                    agentId: 'system',
                    type: 'tool_result',
                    content: result.success
                      ? `Tool "${toolName}" completed: ${result.description || result.outputPath || 'done'}`
                      : `Tool "${toolName}" failed: ${result.error}`,
                    metadata: result.outputPath ? { outputPath: result.outputPath } : undefined,
                  };
                  setMessages((prev) => [...prev, toolMsg]);
                });
              }
            }
          }
          // Detect agent suggestions
          const suggestionData = detectAgentSuggestion(
            allMessages, phase, status.consensusPoints, status.conflictPoints, prevMessageCount.current
          );
          if (suggestionData) {
            const agent = getAgentById(suggestionData.agentId);
            if (agent) {
              suggestionData.agentName = agent.name;
            }
            setAgentSuggestion(suggestionData);
          }
          prevMessageCount.current = allMessages.length;
          break;
        }

        case 'agent_typing': {
          const typingData = event.data as { agentId: string; typing: boolean };
          if (typingData.typing) {
            setCurrentSpeaker(typingData.agentId);
          }
          setAgentStates(new Map(orchestrator.getAgentStates()));
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

  // Quick replies
  const quickReplies = useMemo(
    () => getQuickReplies(phase, messages, consensusPoints, conflictPoints),
    [phase, messages.length, consensusPoints, conflictPoints]
  );

  // Stable callbacks to avoid re-renders in child components
  const dismissSuggestion = useCallback(() => setAgentSuggestion(null), []);
  const handleInputChange = useCallback((val: string) => setInputEmpty(val.length === 0), []);

  // Handle quick reply selection
  const handleQuickReply = useCallback((reply: QuickReply) => {
    if (reply.isCommand) {
      const parts = reply.value.slice(1).split(/\s+/);
      handleCommand(parts[0], parts.slice(1));
    } else {
      handleSubmit(reply.value);
    }
  }, [handleCommand, handleSubmit]);

  // Handle Ctrl+C and number keys
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      handleCommand('quit', []);
    }
    if (input === '?') {
      setShowHelp(!showHelp);
    }
    // Number keys 1-4 for quick replies when input is empty
    if (inputEmpty && !key.ctrl && !key.meta) {
      const num = parseInt(input, 10);
      if (num >= 1 && num <= 4 && num <= quickReplies.length) {
        handleQuickReply(quickReplies[num - 1]);
      }
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header Breadcrumbs */}
      <Breadcrumbs
        segments={['\uD83D\uDD25 Forge', session.config.projectName, phase.toUpperCase()]}
        phaseColor={PHASE_COLORS[phase]}
      />

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
        <ChatPane messages={messages} currentSpeaker={currentSpeaker} />

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

      {/* Agent Suggestion */}
      {agentSuggestion && (
        <AgentSuggestion
          agentName={agentSuggestion.agentName}
          agentColor={PHASE_COLORS[phase] || 'cyan'}
          suggestion={agentSuggestion.suggestion}
          onDismiss={dismissSuggestion}
        />
      )}

      {/* Quick Replies */}
      <QuickReplies replies={quickReplies} onSelect={handleQuickReply} />

      {/* Input */}
      <InputPane
        onSubmit={handleSubmit}
        onCommand={handleCommand}
        placeholder={`${getPhaseHint(phase)} | Type message or /help...`}
        onInputChange={handleInputChange}
      />

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>
          Press ? for help | 1-{quickReplies.length || 4} quick reply | Ctrl+C to quit
        </Text>
      </Box>
    </Box>
  );
}
