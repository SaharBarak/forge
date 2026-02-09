/**
 * ShellLayout - Terminal multiplexer-style layout
 * Arranges main shell and agent panes like tmux
 */

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { MainShell } from './MainShell';
import { AgentShell } from './AgentShell';
import { FloorManagerShell } from './FloorManagerShell';
import { EventBusShell } from './EventBusShell';
import { AGENT_PERSONAS, getActivePersonas } from '../../agents/personas';
import { useUIStore } from '../../stores/uiStore';
import { Suspense, lazy } from 'react';

const LazyPersonaMarketplace = lazy(() =>
  import('../personas/PersonaMarketplace').then(module => ({
    default: module.PersonaMarketplace,
  }))
);
import { EDAOrchestrator } from '../../lib/eda';
import { messageBus } from '../../lib/eda/MessageBus';
import { initializeClient, setLoadedSkills } from '../../lib/claude';
import type { Session, SessionConfig, Message } from '../../types';
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
  const { currentView, setView } = useUIStore();
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [sessionRunning, setSessionRunning] = useState(false);
  const [currentPersonas, setCurrentPersonas] = useState<typeof AGENT_PERSONAS>([]); // Empty until session configured
  const [, setLoadedMessages] = useState<Message[]>([]); // Stored for potential replay

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

    const personas = getActivePersonas();
    const agent = personas.find(a => a.id === agentId);
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
      scrollback: 2000,
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

    // Set active agents and personas
    setActiveAgents(config.agents);
    setSessionRunning(true);

    // Update personas from active personas registry (may be custom generated)
    const personas = getActivePersonas();
    setCurrentPersonas(personas);

    // Start agent shells (after personas are set, terminals will be created reactively)
    // Give time for terminals to be created
    await new Promise(resolve => setTimeout(resolve, 200));

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

  // Initialize terminals on mount - only main and system terminals
  // Agent terminals are created reactively when personas are selected
  useEffect(() => {
    createMainTerminal();

    // Create system terminals (Floor Manager and Event Bus)
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
  }, [createMainTerminal, createFloorManagerTerminal, createEventBusTerminal]);

  // React to persona changes - recreate agent terminals
  // Using useLayoutEffect to run synchronously after DOM updates
  useLayoutEffect(() => {
    // Get current agent IDs from personas
    const currentAgentIds = new Set(currentPersonas.map(p => p.id));

    // Remove terminals for agents no longer in the list
    for (const [agentId, instance] of terminalsRef.current.entries()) {
      if (!currentAgentIds.has(agentId) && agentId !== 'main' && agentId !== 'floor-manager' && agentId !== 'event-bus') {
        console.log('Disposing terminal for:', agentId);
        instance.terminal.dispose();
        terminalsRef.current.delete(agentId);
      }
    }

    // Create terminals for new agents with retry logic
    let retryCount = 0;
    const maxRetries = 10;

    const tryCreateTerminals = () => {
      let allCreated = true;

      for (const agent of currentPersonas) {
        if (!terminalsRef.current.has(agent.id)) {
          const container = agentContainersRef.current.get(agent.id);
          if (container) {
            console.log('Creating terminal for:', agent.id);
            createAgentTerminal(agent.id);
          } else {
            allCreated = false;
            console.log('Waiting for container ref:', agent.id, 'retry:', retryCount);
          }
        }
      }

      // Retry if not all containers are ready
      if (!allCreated && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryCreateTerminals, 100);
      }
    };

    // Start creating after a short delay
    const timer = setTimeout(tryCreateTerminals, 50);

    return () => clearTimeout(timer);
  }, [currentPersonas, createAgentTerminal]);

  // Subscribe to message bus events for session management
  // Listen for marketplace open command from terminal
  useEffect(() => {
    const handler = () => setView('marketplace');
    window.addEventListener('forge:open-marketplace', handler);
    return () => window.removeEventListener('forge:open-marketplace', handler);
  }, [setView]);

  // Keyboard shortcut: Ctrl+Shift+P to toggle marketplace
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setView(currentView === 'marketplace' ? 'chat' : 'marketplace');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentView, setView]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Handle session loaded from terminal
    unsubscribers.push(
      messageBus.subscribe('session:loaded', (payload: { metadata: { id: string; projectName: string; goal: string; enabledAgents: string[]; startedAt: string }; messages: Message[] }) => {
        console.log('Session loaded:', payload.metadata.projectName);
        setLoadedMessages(payload.messages);

        // Update active personas from getActivePersonas (may have custom personas loaded)
        const personas = getActivePersonas();
        setCurrentPersonas(personas);
      }, 'shell-layout')
    );

    // Handle personas changed (generated or loaded)
    unsubscribers.push(
      messageBus.subscribe('personas:changed', () => {
        console.log('Personas changed, updating terminals');
        const personas = getActivePersonas();
        setCurrentPersonas(personas);
      }, 'shell-layout')
    );

    // Handle save request from terminal
    unsubscribers.push(
      messageBus.subscribe('session:save-requested', async () => {
        if (orchestratorRef.current) {
          const session = orchestratorRef.current.getSession();
          // Include memory state for context persistence
          const sessionWithMemory = {
            ...session,
            memoryState: messageBus.getMemoryState(),
          };
          try {
            const result = await window.electronAPI?.saveSession?.({ session: sessionWithMemory });
            if (result?.success) {
              console.log('Session saved to:', result.path);
            }
          } catch (error) {
            console.error('Failed to save session:', error);
          }
        }
      }, 'shell-layout')
    );

    // Handle export request from terminal
    unsubscribers.push(
      messageBus.subscribe('session:export-requested', async (payload: { format: string }) => {
        if (orchestratorRef.current) {
          const session = orchestratorRef.current.getSession();
          try {
            const result = await window.electronAPI?.exportSession?.({
              session,
              format: (payload.format || 'md') as 'md' | 'json' | 'html',
              type: 'transcript',
            });
            if (result?.success && result.content) {
              console.log('Session exported');
              // Could copy to clipboard or show in terminal
            }
          } catch (error) {
            console.error('Failed to export session:', error);
          }
        }
      }, 'shell-layout')
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [createAgentTerminal]);

  // Set ref for agent containers - use useCallback to stabilize
  const setAgentContainerRef = useCallback((agentId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      agentContainersRef.current.set(agentId, el);
    } else {
      // Element unmounted - clean up
      agentContainersRef.current.delete(agentId);
    }
  }, []);

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
        <span>Agents: {activeAgents.length || currentPersonas.length}</span>
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
            {currentPersonas.length === 0 ? (
              <>
                {/* Empty state - show placeholder */}
                <div style={{
                  backgroundColor: '#0a0a0a',
                  gridColumn: 'span 2',
                  gridRow: 'span 2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#6e7681',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  padding: '20px',
                  textAlign: 'center',
                }}>
                  <div style={{ marginBottom: '8px', fontSize: '24px' }}>👥</div>
                  <div>No agents loaded</div>
                  <div style={{ fontSize: '10px', marginTop: '4px', color: '#484f58' }}>
                    Type 'new' in the console to configure a session
                  </div>
                </div>
              </>
            ) : (
              currentPersonas.map((agent) => (
                <div
                  key={agent.id}
                  ref={setAgentContainerRef(agent.id)}
                  style={{
                    backgroundColor: '#0a0a0a',
                    overflow: 'hidden',
                    opacity: activeAgents.length === 0 || activeAgents.includes(agent.id) ? 1 : 0.3,
                  }}
                />
              ))
            )}
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
        <button
          onClick={() => setView(currentView === 'marketplace' ? 'chat' : 'marketplace')}
          style={{
            background: currentView === 'marketplace' ? '#238636' : 'transparent',
            border: 'none',
            color: currentView === 'marketplace' ? '#fff' : '#8b949e',
            cursor: 'pointer',
            fontSize: '11px',
            fontFamily: 'monospace',
            padding: '0 8px',
            marginRight: '8px',
          }}
          title="Persona Marketplace (Ctrl+Shift+P)"
        >
          🎭 Personas
        </button>
        <span>Ctrl+C: Cancel │ Enter: Execute</span>
      </div>

      {/* Persona Marketplace Overlay */}
      {currentView === 'marketplace' && (
        <Suspense fallback={<div style={{ position: 'fixed', inset: 0, background: '#0d1117', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>Loading Marketplace...</div>}>
          <LazyPersonaMarketplace onClose={() => setView('chat')} />
        </Suspense>
      )}
    </div>
  );
}
