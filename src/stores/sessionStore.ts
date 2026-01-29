/**
 * Session Store - Zustand state management
 */

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Session, SessionConfig, Message, MessageType, Draft, Decision, SessionPhase } from '../types';
import { DEFAULT_METHODOLOGY } from '../methodologies';
import { AGENT_PERSONAS } from '../agents/personas';

interface SessionStore {
  // State
  session: Session | null;
  isRunning: boolean;
  isSending: boolean;
  typingAgents: string[];
  humanInputEnabled: boolean;

  // Actions
  createSession: (config: Partial<SessionConfig>) => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;

  // Messages
  addMessage: (agentId: string, type: MessageType, content: string, contentHe?: string) => void;
  addHumanMessage: (content: string) => void;
  setTypingAgents: (agents: string[] | ((prev: string[]) => string[])) => void;

  // Phases
  setPhase: (phase: SessionPhase) => void;
  incrementRound: () => void;

  // Drafts & Decisions
  addDraft: (draft: Omit<Draft, 'id' | 'createdAt'>) => void;
  addDecision: (decision: Omit<Decision, 'id' | 'madeAt'>) => void;

  // Sending state
  setIsSending: (isSending: boolean) => void;
  setHumanInputEnabled: (enabled: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  session: null,
  isRunning: false,
  isSending: false,
  typingAgents: [],
  humanInputEnabled: true,

  createSession: (config) => {
    const defaultConfig: SessionConfig = {
      id: uuid(),
      projectName: config.projectName || 'New Project',
      goal: config.goal || '',
      enabledAgents: config.enabledAgents || AGENT_PERSONAS.map((a) => a.id),
      humanParticipation: config.humanParticipation ?? true,
      maxRounds: config.maxRounds || 10,
      consensusThreshold: config.consensusThreshold || 0.67,
      methodology: config.methodology || DEFAULT_METHODOLOGY,
      contextDir: config.contextDir || './context',
      outputDir: config.outputDir || './output',
      apiKey: config.apiKey,
    };

    const session: Session = {
      id: uuid(),
      config: defaultConfig,
      messages: [],
      currentPhase: 'initialization',
      currentRound: 0,
      decisions: [],
      drafts: [],
      startedAt: new Date(),
      status: 'idle',
    };

    set({ session, isRunning: false });
  },

  endSession: () => {
    set((state) => ({
      session: state.session
        ? { ...state.session, endedAt: new Date(), status: 'completed' }
        : null,
      isRunning: false,
    }));
  },

  pauseSession: () => {
    set((state) => ({
      session: state.session ? { ...state.session, status: 'paused' } : null,
      isRunning: false,
    }));
  },

  resumeSession: () => {
    set((state) => ({
      session: state.session ? { ...state.session, status: 'running' } : null,
      isRunning: true,
    }));
  },

  addMessage: (agentId, type, content, contentHe) => {
    const message: Message = {
      id: uuid(),
      timestamp: new Date(),
      agentId,
      type,
      content,
      contentHe,
    };

    set((state) => ({
      session: state.session
        ? { ...state.session, messages: [...state.session.messages, message] }
        : null,
    }));
  },

  addHumanMessage: (content) => {
    get().addMessage('human', 'human_input', content);
  },

  setTypingAgents: (agents) => {
    if (typeof agents === 'function') {
      set((state) => ({ typingAgents: agents(state.typingAgents) }));
    } else {
      set({ typingAgents: agents });
    }
  },

  setPhase: (phase) => {
    set((state) => ({
      session: state.session
        ? { ...state.session, currentPhase: phase, currentRound: 0 }
        : null,
    }));

    // Add system message about phase change
    get().addMessage('system', 'system', `Phase changed to: ${phase}`);
  },

  incrementRound: () => {
    set((state) => ({
      session: state.session
        ? { ...state.session, currentRound: state.session.currentRound + 1 }
        : null,
    }));
  },

  addDraft: (draft) => {
    const newDraft: Draft = {
      ...draft,
      id: uuid(),
      createdAt: new Date(),
    };

    set((state) => ({
      session: state.session
        ? { ...state.session, drafts: [...state.session.drafts, newDraft] }
        : null,
    }));
  },

  addDecision: (decision) => {
    const newDecision: Decision = {
      ...decision,
      id: uuid(),
      madeAt: new Date(),
    };

    set((state) => ({
      session: state.session
        ? { ...state.session, decisions: [...state.session.decisions, newDecision] }
        : null,
    }));
  },

  setIsSending: (isSending) => {
    set({ isSending });
  },

  setHumanInputEnabled: (enabled) => {
    set({ humanInputEnabled: enabled });
  },
}));
