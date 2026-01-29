/**
 * useOrchestrator Hook - Connects the EDA Orchestrator to React components
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { EDAOrchestrator, EDAEvent } from '../lib/eda';
import { initializeClient, setLoadedSkills } from '../lib/claude';
import type { ContextData, LoadedContext } from '../types';

interface UseOrchestratorReturn {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  sendHumanMessage: (content: string) => Promise<void>;
  isRunning: boolean;
  waitingForHuman: boolean;
  error: string | null;
  floorStatus: { current: string | null; queued: string[] };
}

/**
 * Parse loaded context from filesystem into ContextData format
 */
function parseLoadedContext(loaded: LoadedContext): ContextData | undefined {
  if (!loaded.brand && !loaded.audience && loaded.research.length === 0) {
    return undefined;
  }

  const context: ContextData = {};

  // Parse brand context from markdown
  if (loaded.brand) {
    try {
      const nameMatch = loaded.brand.match(/^#\s*(.+)/m);
      const valuesMatch = loaded.brand.match(/##\s*Core Values[\s\S]*?([-*]\s*.+)/gm);
      const toneMatch = loaded.brand.match(/##\s*Tone[\s\S]*?([-*]\s*.+)/gm);
      const avoidMatch = loaded.brand.match(/##\s*Avoid[\s\S]*?([-*]\s*.+)/gm);

      context.brand = {
        name: nameMatch ? nameMatch[1].trim() : 'Brand',
        values: valuesMatch
          ? valuesMatch.map((v) => v.replace(/^[-*]\s*/, '').trim())
          : [],
        tone: toneMatch
          ? toneMatch.map((t) => t.replace(/^[-*]\s*/, '').trim())
          : [],
        avoid: avoidMatch
          ? avoidMatch.map((a) => a.replace(/^[-*]\s*/, '').trim())
          : [],
        keyMessages: [],
      };
    } catch {
      // If parsing fails, use raw content
    }
  }

  // Parse audience context
  if (loaded.audience) {
    try {
      const painPointsMatch = loaded.audience.match(
        /##\s*Pain Points[\s\S]*?((?:[-*]\s*.+\n?)+)/m
      );
      const desiresMatch = loaded.audience.match(
        /##\s*Desires[\s\S]*?((?:[-*]\s*.+\n?)+)/m
      );
      const objectionsMatch = loaded.audience.match(
        /##\s*Objections[\s\S]*?((?:[-*]\s*.+\n?)+)/m
      );

      const extractItems = (match: RegExpMatchArray | null): string[] => {
        if (!match) return [];
        return match[1]
          .split('\n')
          .filter((l) => l.trim().startsWith('-') || l.trim().startsWith('*'))
          .map((l) => l.replace(/^[-*]\s*/, '').trim());
      };

      context.audience = {
        primary: {
          name: 'Primary Audience',
          ageRange: [25, 55],
          description: 'Target audience',
          characteristics: [],
        },
        painPoints: extractItems(painPointsMatch),
        desires: extractItems(desiresMatch),
        objections: extractItems(objectionsMatch),
      };
    } catch {
      // If parsing fails, skip
    }
  }

  // Add research
  if (loaded.research.length > 0) {
    context.research = loaded.research.map((r) => ({
      source: r.file,
      date: new Date().toISOString().split('T')[0],
      findings: r.content.split('\n').filter((l) => l.trim()),
      relevance: 'Project research',
    }));
  }

  // Add examples
  if (loaded.examples.length > 0) {
    context.examples = loaded.examples.map((e) => ({
      name: e.file.replace('.md', ''),
      type: 'reference',
      content: e.content,
      notes: '',
    }));
  }

  return context;
}

export function useOrchestrator(): UseOrchestratorReturn {
  const orchestratorRef = useRef<EDAOrchestrator | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [waitingForHuman, setWaitingForHuman] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorStatus, setFloorStatus] = useState<{ current: string | null; queued: string[] }>({
    current: null,
    queued: [],
  });

  const {
    session,
    addMessage,
    setTypingAgents,
    setPhase,
    setHumanInputEnabled,
  } = useSessionStore();

  // Handle EDA orchestrator events
  const handleEvent = useCallback(
    (event: EDAEvent) => {
      switch (event.type) {
        case 'phase_change': {
          const data = event.data as { phase: string };
          setPhase(data.phase as any);
          break;
        }
        case 'agent_typing': {
          const data = event.data as { agentId: string; typing: boolean };
          if (data.typing) {
            setTypingAgents((prev: string[]) => [...new Set([...prev, data.agentId])]);
          } else {
            setTypingAgents((prev: string[]) =>
              prev.filter((id: string) => id !== data.agentId)
            );
          }
          break;
        }
        case 'agent_message': {
          const data = event.data as { agentId: string; message: any };
          addMessage(
            data.message.agentId,
            data.message.type,
            data.message.content
          );
          break;
        }
        case 'human_turn': {
          setWaitingForHuman(true);
          setHumanInputEnabled(true);
          break;
        }
        case 'floor_status': {
          if (orchestratorRef.current) {
            setFloorStatus(orchestratorRef.current.getFloorStatus());
          }
          break;
        }
        case 'synthesis': {
          console.log('Synthesis checkpoint');
          break;
        }
        case 'research_halt': {
          const data = event.data as { researcherId: string; query: string };
          console.log('Research requested:', data.researcherId, data.query);
          break;
        }
        case 'research_result': {
          console.log('Research result received');
          break;
        }
        case 'error': {
          const err = event.data as Error;
          setError(err.message || 'An error occurred');
          setIsRunning(false);
          break;
        }
      }
    },
    [addMessage, setTypingAgents, setPhase, setHumanInputEnabled]
  );

  // Cleanup on session change
  useEffect(() => {
    if (!session) {
      orchestratorRef.current = null;
      return;
    }

    return () => {
      if (orchestratorRef.current) {
        orchestratorRef.current.stop();
      }
    };
  }, [session?.id]);

  const start = useCallback(async () => {
    if (!session) {
      setError('No session available');
      return;
    }

    setError(null);
    setIsRunning(true);

    try {
      // Initialize Claude client with API key from session config
      const apiKey = session.config.apiKey;
      if (!apiKey) {
        setError('No API key provided. Please enter your Claude API key.');
        setIsRunning(false);
        return;
      }

      initializeClient(apiKey);

      // Load skills from .agents/skills/ (installed via npx skills add)
      try {
        const skills = await window.electronAPI.getCombinedSkills();
        if (skills) {
          setLoadedSkills(skills);
          console.log('Loaded skills:', skills.slice(0, 100) + '...');
        }
      } catch {
        console.warn('Could not load skills, using defaults');
      }

      // Load context from filesystem
      let context: ContextData | undefined;
      try {
        const cwd = await window.electronAPI.getCwd();
        const contextDir = session.config.contextDir.startsWith('/')
          ? session.config.contextDir
          : `${cwd}/${session.config.contextDir}`;

        const loadedContext = await window.electronAPI.loadContext(contextDir);
        context = parseLoadedContext(loadedContext);
      } catch {
        console.warn('Could not load context, proceeding without it');
      }

      // Load skills for agents
      let skills: string | undefined;
      try {
        skills = await window.electronAPI.getCombinedSkills();
      } catch {
        console.warn('Could not load skills');
      }

      // Create EDA orchestrator with skills
      const orchestrator = new EDAOrchestrator(session, context, skills);
      orchestratorRef.current = orchestrator;

      // Subscribe to events
      orchestrator.on(handleEvent);

      // Start the EDA orchestration
      await orchestrator.start();

      console.log('EDA Orchestrator started - agents are now listening');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start orchestrator';
      setError(message);
      setIsRunning(false);
    }
  }, [session, handleEvent]);

  const pause = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.pause();
      setIsRunning(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.resume();
      setIsRunning(true);
    }
  }, []);

  const stop = useCallback(() => {
    if (orchestratorRef.current) {
      orchestratorRef.current.stop();
      orchestratorRef.current = null;
      setIsRunning(false);
      setWaitingForHuman(false);
      setFloorStatus({ current: null, queued: [] });
    }
  }, []);

  const sendHumanMessage = useCallback(
    async (content: string) => {
      if (!orchestratorRef.current) {
        // No orchestrator running, just add the message to the store
        addMessage('human', 'human_input', content);
        return;
      }

      setWaitingForHuman(false);
      await orchestratorRef.current.addHumanMessage(content);
    },
    [addMessage]
  );

  return {
    start,
    pause,
    resume,
    stop,
    sendHumanMessage,
    isRunning,
    waitingForHuman,
    error,
    floorStatus,
  };
}
