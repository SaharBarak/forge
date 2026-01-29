/**
 * ShellLayout - Terminal multiplexer-style layout
 * Arranges main shell and agent panes like tmux
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { MainShell } from './MainShell';
import { AgentShell } from './AgentShell';
import { FloorManagerShell } from './FloorManagerShell';
import { EventBusShell } from './EventBusShell';
import { AGENT_PERSONAS } from '../../agents/personas';
import { EDAOrchestrator } from '../../lib/eda';
import { initializeClient, setLoadedSkills } from '../../lib/claude';
import type { Session, SessionConfig } from '../../types';
import { v4 as uuidv4 } from 'uuid';

// Empty - scroll padding handled programmatically
const SCROLL_PADDING_STYLES = ``;

const AGENT_COLORS: Record<string, string> = {
  ronit: '#ff79c6',
  yossi: '#50fa7b',
  noa: '#bd93f9',
  avi: '#ffb86c',
  michal: '#8be9fd',
};

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  shell?: MainShell | AgentShell | FloorManagerShell | EventBusShell;
}

export function ShellLayout() {
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const agentContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const floorManagerContainerRef = useRef<HTMLDivElement>(null);
  const eventBusContainerRef = useRef<HTMLDivElement>(null);
  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const orchestratorRef = useRef<EDAOrchestrator | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [sessionRunning, setSessionRunning] = useState(false);

  // Create terminal for main shell
  const createMainTerminal = useCallback(() => {
    if (!mainContainerRef.current || terminalsRef.current.has('main')) return;

    const terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: '#264f78',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      scrollback: 2000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(mainContainerRef.current);
    fitAddon.fit();

    // Create MainShell instance
    const mainShell = new MainShell(
      (text) => terminal.write(text),
      (text) => {
        terminal.writeln(text);
        terminal.scrollToBottom();
      },
      {
        onStartSession: handleStartSession,
        onStopSession: handleStopSession,
        onSendMessage: handleSendMessage,
        onSynthesis: handleSynthesis,
        onDraft: handleDraft,
        onGetConsensus: handleGetConsensus,
      }
    );

    // Handle input
    terminal.onData((data) => {
      mainShell.handleInput(data);
    });

    mainShell.init();

    terminalsRef.current.set('main', { terminal, fitAddon, shell: mainShell });
  }, []);

  // Create terminal for an agent
  const createAgentTerminal = useCallback((agentId: string) => {
    const container = agentContainersRef.current.get(agentId);
    if (!container || terminalsRef.current.has(agentId)) return;

    const agent = AGENT_PERSONAS.find(a => a.id === agentId);
    if (!agent) return;

    const color = AGENT_COLORS[agentId] || '#ffffff';

    const terminal = new Terminal({
      theme: {
        background: '#0a0a0a',
        foreground: '#b0b0b0',
        cursor: color,
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 11,
      lineHeight: 1.2,
      cursorBlink: false,
      scrollback: 500,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();

    // Write header
    terminal.writeln(`\x1b[1;36m┌${'─'.repeat(30)}┐\x1b[0m`);
    terminal.writeln(`\x1b[1;36m│\x1b[0m \x1b[1m${agent.name}\x1b[0m (${agent.nameHe})${' '.repeat(Math.max(0, 30 - agent.name.length - agent.nameHe.length - 4))}\x1b[1;36m│\x1b[0m`);
    terminal.writeln(`\x1b[1;36m│\x1b[0m \x1b[2m${agent.role.slice(0, 28).padEnd(28)}\x1b[0m \x1b[1;36m│\x1b[0m`);
    terminal.writeln(`\x1b[1;36m└${'─'.repeat(30)}┘\x1b[0m`);
    terminal.writeln('');

    // Create AgentShell
    const agentShell = new AgentShell(
      agentId,
      (text) => terminal.write(text),
      (text) => terminal.writeln(text)
    );

    terminalsRef.current.set(agentId, { terminal, fitAddon, shell: agentShell });
  }, []);

  // Create terminal for Floor Manager
  const createFloorManagerTerminal = useCallback(() => {
    if (!floorManagerContainerRef.current || terminalsRef.current.has('floor-manager')) return;

    const terminal = new Terminal({
      theme: {
        background: '#0f0a1a',
        foreground: '#d0a0ff',
        cursor: '#ff79c6',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 11,
      lineHeight: 1.2,
      cursorBlink: false,
      scrollback: 500,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(floorManagerContainerRef.current);
    fitAddon.fit();

    // Write header
    terminal.writeln('\x1b[1;35m┌────────────────────────────────┐\x1b[0m');
    terminal.writeln('\x1b[1;35m│\x1b[0m \x1b[1m🎙️ FLOOR MANAGER\x1b[0m              \x1b[1;35m│\x1b[0m');
    terminal.writeln('\x1b[1;35m└────────────────────────────────┘\x1b[0m');
    terminal.writeln('');

    // Create FloorManagerShell
    const floorShell = new FloorManagerShell(
      (text) => terminal.writeln(text)
    );

    terminalsRef.current.set('floor-manager', { terminal, fitAddon, shell: floorShell });
  }, []);

  // Create terminal for Event Bus
  const createEventBusTerminal = useCallback(() => {
    if (!eventBusContainerRef.current || terminalsRef.current.has('event-bus')) return;

    const terminal = new Terminal({
      theme: {
        background: '#0a1a0f',
        foreground: '#a0ffd0',
        cursor: '#50fa7b',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 10,
      lineHeight: 1.1,
      cursorBlink: false,
      scrollback: 1000,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(eventBusContainerRef.current);
    fitAddon.fit();

    // Write header
    terminal.writeln('\x1b[1;32m┌────────────────────────────────┐\x1b[0m');
    terminal.writeln('\x1b[1;32m│\x1b[0m \x1b[1m📡 EVENT BUS\x1b[0m                   \x1b[1;32m│\x1b[0m');
    terminal.writeln('\x1b[1;32m└────────────────────────────────┘\x1b[0m');
    terminal.writeln('');

    // Create EventBusShell
    const eventShell = new EventBusShell(
      (text) => terminal.writeln(text)
    );

    terminalsRef.current.set('event-bus', { terminal, fitAddon, shell: eventShell });
  }, []);

  // Start session handler
  const handleStartSession = useCallback(async (config: {
    projectName: string;
    goal: string;
    apiKey: string;
    agents: string[];
    contextDir: string;
    language?: string;
  }) => {
    // Initialize Claude client
    initializeClient(config.apiKey);

    // Load skills
    try {
      const skills = await window.electronAPI.getCombinedSkills();
      if (skills) {
        setLoadedSkills(skills);
      }
    } catch {
      console.warn('Could not load skills');
    }

    // Create session config
    const sessionConfig: SessionConfig = {
      id: uuidv4(),
      projectName: config.projectName,
      goal: config.goal,
      enabledAgents: config.agents,
      humanParticipation: true,
      maxRounds: 10,
      consensusThreshold: 0.7,
      methodology: {
        argumentationStyle: 'collaborative',
        consensusMethod: 'synthesis',
        visualDecisionRules: [],
        structureDecisionRules: [],
        phases: [],
      },
      contextDir: config.contextDir,
      outputDir: 'output',
      apiKey: config.apiKey,
      language: config.language || 'hebrew',
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

    // Load skills for agents
    let skills: string | undefined;
    try {
      skills = await window.electronAPI?.getCombinedSkills?.();
    } catch {
      console.log('No skills loaded');
    }

    // Create orchestrator with skills
    const orchestrator = new EDAOrchestrator(session, undefined, skills);
    orchestratorRef.current = orchestrator;

    // Set active agents
    setActiveAgents(config.agents);
    setSessionRunning(true);

    // Start agent shells
    for (const agentId of config.agents) {
      const instance = terminalsRef.current.get(agentId);
      if (instance?.shell instanceof AgentShell) {
        instance.shell.start();
      }
    }

    // Start floor manager and event bus shells
    const floorInstance = terminalsRef.current.get('floor-manager');
    if (floorInstance?.shell instanceof FloorManagerShell) {
      floorInstance.shell.start();
    }

    const eventInstance = terminalsRef.current.get('event-bus');
    if (eventInstance?.shell instanceof EventBusShell) {
      eventInstance.shell.start();
    }

    // Start orchestrator
    await orchestrator.start();
  }, []);

  // Stop session handler
  const handleStopSession = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.stop();
      orchestratorRef.current = null;
    }

    // Stop agent shells
    for (const agentId of activeAgents) {
      const instance = terminalsRef.current.get(agentId);
      if (instance?.shell instanceof AgentShell) {
        instance.shell.stop();
      }
    }

    // Stop floor manager and event bus shells
    const floorInstance = terminalsRef.current.get('floor-manager');
    if (floorInstance?.shell instanceof FloorManagerShell) {
      floorInstance.shell.stop();
    }

    const eventInstance = terminalsRef.current.get('event-bus');
    if (eventInstance?.shell instanceof EventBusShell) {
      eventInstance.shell.stop();
    }

    setSessionRunning(false);
  }, [activeAgents]);

  // Send message handler
  const handleSendMessage = useCallback(async (content: string) => {
    if (orchestratorRef.current) {
      await orchestratorRef.current.addHumanMessage(content);
    }
  }, []);

  // Synthesis phase handler
  const handleSynthesis = useCallback(async (force = false) => {
    if (orchestratorRef.current) {
      return await orchestratorRef.current.transitionToSynthesis(force);
    }
    return { success: false, message: 'No orchestrator' };
  }, []);

  // Drafting phase handler
  const handleDraft = useCallback(async () => {
    if (orchestratorRef.current) {
      await orchestratorRef.current.transitionToDrafting();
    }
  }, []);

  // Get consensus status
  const handleGetConsensus = useCallback(() => {
    if (orchestratorRef.current) {
      return orchestratorRef.current.getConsensusStatus();
    }
    return null;
  }, []);

  // Initialize terminals on mount
  useEffect(() => {
    createMainTerminal();

    // Create agent terminals
    for (const agent of AGENT_PERSONAS) {
      createAgentTerminal(agent.id);
    }

    // Create system terminals
    createFloorManagerTerminal();
    createEventBusTerminal();

    // Handle resize
    const handleResize = () => {
      for (const instance of terminalsRef.current.values()) {
        instance.fitAddon.fit();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      // Cleanup
      for (const instance of terminalsRef.current.values()) {
        instance.terminal.dispose();
      }
      terminalsRef.current.clear();
    };
  }, [createMainTerminal, createAgentTerminal, createFloorManagerTerminal, createEventBusTerminal]);

  // Set ref for agent containers
  const setAgentContainerRef = (agentId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      agentContainersRef.current.set(agentId, el);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0d1117',
      overflow: 'hidden',
    }}>
      {/* Inject scroll padding styles */}
      <style>{SCROLL_PADDING_STYLES}</style>
      {/* Status Bar */}
      <div style={{
        height: '24px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#8b949e',
      }}>
        <span style={{ color: sessionRunning ? '#3fb950' : '#8b949e' }}>
          {sessionRunning ? '● RUNNING' : '○ IDLE'}
        </span>
        <span style={{ margin: '0 12px' }}>│</span>
        <span>COPYWRITE THINK TANK</span>
        <span style={{ margin: '0 12px' }}>│</span>
        <span>Agents: {activeAgents.length || AGENT_PERSONAS.length}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#58a6ff' }}>EDA v1.0</span>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Main Shell (left side) */}
        <div style={{
          width: '50%',
          borderRight: '1px solid #30363d',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            height: '20px',
            backgroundColor: '#161b22',
            borderBottom: '1px solid #30363d',
            padding: '2px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#58a6ff',
          }}>
            MAIN CONSOLE
          </div>
          <div
            ref={mainContainerRef}
            className="main-terminal-container"
            style={{ flex: 1, padding: '4px' }}
          />
        </div>

        {/* Agent & System Panes (right side) */}
        <div style={{
          width: '50%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '20px',
            backgroundColor: '#161b22',
            borderBottom: '1px solid #30363d',
            padding: '2px 8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#8be9fd',
          }}>
            AGENT TERMINALS
          </div>
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gridTemplateRows: 'repeat(4, 1fr)',
            gap: '1px',
            backgroundColor: '#30363d',
            overflow: 'hidden',
          }}>
            {AGENT_PERSONAS.map((agent) => (
              <div
                key={agent.id}
                ref={setAgentContainerRef(agent.id)}
                style={{
                  backgroundColor: '#0a0a0a',
                  overflow: 'hidden',
                  opacity: activeAgents.length === 0 || activeAgents.includes(agent.id) ? 1 : 0.3,
                }}
              />
            ))}
            {/* Floor Manager */}
            <div
              ref={floorManagerContainerRef}
              style={{
                backgroundColor: '#0f0a1a',
                overflow: 'hidden',
              }}
            />
            {/* Event Bus */}
            <div
              ref={eventBusContainerRef}
              style={{
                backgroundColor: '#0a1a0f',
                overflow: 'hidden',
              }}
            />
            {/* Empty slot for balance */}
            <div style={{ backgroundColor: '#0a0a0a' }} />
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div style={{
        height: '20px',
        backgroundColor: '#161b22',
        borderTop: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#6e7681',
      }}>
        <span>Type 'help' for commands</span>
        <div style={{ flex: 1 }} />
        <span>Ctrl+C: Cancel │ Enter: Execute</span>
      </div>
    </div>
  );
}
