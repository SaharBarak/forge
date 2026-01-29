/**
 * Orchestrator - Manages the multi-agent discussion
 */

import type { Session, SessionPhase, Message, ContextData } from '../types';
import { getAgentById, getResearcherById } from '../agents/personas';
import {
  generateAgentResponseEDA,
  evaluateAgentReaction,
  generateOpeningStatements,
  generateSynthesis,
  generateRoundSynthesis,
  checkConsensus,
  generateResearcherResponse,
} from './claude';

export type OrchestratorEventType =
  | 'phase_change'
  | 'agent_typing'
  | 'agent_message'
  | 'human_turn'
  | 'consensus_check'
  | 'synthesis'
  | 'research_halt'
  | 'research_request'
  | 'research_result'
  | 'error';

export interface ResearchRequest {
  id: string;
  requestedBy: string;
  researcherId: string;
  query: string;
  context: string;
}

export interface OrchestratorEvent {
  type: OrchestratorEventType;
  data: unknown;
}

export type EventCallback = (event: OrchestratorEvent) => void;

// Agent reaction from EDA evaluation
interface AgentReaction {
  agentId: string;
  urgency: 'high' | 'medium' | 'low' | 'pass';
  reason: string;
  responseType: string;
}

export class Orchestrator {
  private session: Session;
  private context: ContextData | undefined;
  private eventCallbacks: EventCallback[] = [];
  private isRunning = false;
  private isPaused = false;
  private roundsInPhase = 0;
  private waitingForHuman = false;
  private waitingForResearch = false;
  private pendingResearchRequests: ResearchRequest[] = [];

  // EDA: All agents continuously listening
  private agentStates: Map<string, {
    lastSpoke: number;
    consecutivePasses: number;
    isListening: boolean;
  }> = new Map();

  constructor(session: Session, context?: ContextData) {
    this.session = session;
    this.context = context;
  }

  /**
   * Subscribe to orchestrator events
   */
  on(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emit(type: OrchestratorEventType, data: unknown) {
    const event: OrchestratorEvent = { type, data };
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  /**
   * Start the orchestration
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;

    try {
      // Initialize phase
      await this.runPhase('initialization');

      // Main loop
      while (this.isRunning && !this.isPaused) {
        await this.runCurrentPhase();

        // Check if we should move to next phase
        if (this.shouldAdvancePhase()) {
          this.advancePhase();
        }

        // Small delay between iterations
        await this.delay(500);
      }
    } catch (error) {
      this.emit('error', error);
      this.isRunning = false;
    }
  }

  /**
   * Pause the orchestration
   */
  pause(): void {
    this.isPaused = true;
    this.isRunning = false;
  }

  /**
   * Resume the orchestration
   */
  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.start();
  }

  /**
   * Stop the orchestration completely
   */
  stop(): void {
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Add a human message and continue
   */
  async addHumanMessage(content: string): Promise<void> {
    const message: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'human',
      type: 'human_input',
      content,
    };

    this.session.messages.push(message);
    this.emit('agent_message', { agentId: 'human', message });
    this.waitingForHuman = false;
  }

  /**
   * Run a specific phase
   */
  private async runPhase(phase: SessionPhase): Promise<void> {
    this.session.currentPhase = phase;
    this.roundsInPhase = 0;
    this.emit('phase_change', { phase });

    switch (phase) {
      case 'initialization':
        await this.runInitialization();
        break;
      case 'research':
        await this.runResearch();
        break;
      case 'brainstorming':
      case 'argumentation':
        await this.runDiscussion();
        break;
      case 'synthesis':
        await this.runSynthesis();
        break;
      case 'consensus':
        await this.runConsensusCheck();
        break;
      default:
        await this.runDiscussion();
    }
  }

  /**
   * Run the current phase
   */
  private async runCurrentPhase(): Promise<void> {
    await this.runPhase(this.session.currentPhase);
  }

  /**
   * Initialization phase - agents introduce themselves
   */
  private async runInitialization(): Promise<void> {
    // System message
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `Session started: ${this.session.config.projectName}\nGoal: ${this.session.config.goal}`,
    };
    this.session.messages.push(systemMessage);
    this.emit('agent_message', { agentId: 'system', message: systemMessage });

    // Get opening statements from all agents
    const statements = await generateOpeningStatements(
      this.session.config,
      this.context
    );

    for (const statement of statements) {
      // Show typing indicator
      this.emit('agent_typing', { agentId: statement.agentId, typing: true });
      await this.delay(1000 + Math.random() * 2000);

      const message: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: statement.agentId,
        type: 'argument',
        content: statement.content,
      };

      this.session.messages.push(message);
      this.emit('agent_typing', { agentId: statement.agentId, typing: false });
      this.emit('agent_message', { agentId: statement.agentId, message });

      await this.delay(500);
    }

    // If human participation, prompt for input
    if (this.session.config.humanParticipation) {
      this.waitingForHuman = true;
      this.emit('human_turn', { prompt: 'Your turn to respond or guide the discussion' });
    }
  }

  /**
   * EDA: Initialize agent listening states
   */
  private initializeAgentStates(): void {
    for (const agentId of this.session.config.enabledAgents) {
      this.agentStates.set(agentId, {
        lastSpoke: 0,
        consecutivePasses: 0,
        isListening: true,
      });
    }
  }

  /**
   * EDA: Discussion phase - all agents listen continuously
   * Agents evaluate each message and decide if they want to respond
   */
  private async runDiscussion(): Promise<void> {
    if (this.waitingForHuman) return;
    if (this.waitingForResearch) return;

    // Initialize agent states if not done
    if (this.agentStates.size === 0) {
      this.initializeAgentStates();
    }

    const enabledAgents = this.session.config.enabledAgents;

    // EDA: All agents evaluate the current conversation state in parallel
    const reactions = await this.evaluateAllAgents();

    // Filter out passes and sort by urgency
    const wantToSpeak = reactions.filter(r => r.urgency !== 'pass');

    if (wantToSpeak.length === 0) {
      // All agents passed - check if we should prompt or synthesize
      this.roundsInPhase++;

      if (this.roundsInPhase % 2 === 0) {
        // Every 2 rounds of silence, do a synthesis
        await this.runRoundSynthesis();
      }

      // Check for human turn
      if (this.session.config.humanParticipation) {
        this.waitingForHuman = true;
        this.emit('human_turn', { prompt: 'All agents are listening. Your input?' });
      }
      return;
    }

    // Select speaker based on urgency and fairness
    const speaker = this.selectSpeaker(wantToSpeak);
    const agent = getAgentById(speaker.agentId);

    if (!agent) return;

    // Show typing indicator
    this.emit('agent_typing', { agentId: agent.id, typing: true });

    try {
      // Generate response with EDA context
      const response = await generateAgentResponseEDA(
        agent,
        this.session.config,
        this.session.messages,
        speaker.reason,
        this.context
      );

      // Create message
      const message: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: agent.id,
        type: response.type as Message['type'],
        content: response.content,
        metadata: {
          urgency: speaker.urgency,
          triggerReason: speaker.reason,
        },
      };

      this.session.messages.push(message);
      this.emit('agent_typing', { agentId: agent.id, typing: false });
      this.emit('agent_message', { agentId: agent.id, message });

      // Update agent state
      const state = this.agentStates.get(agent.id);
      if (state) {
        state.lastSpoke = this.session.messages.length;
        state.consecutivePasses = 0;
      }

      // Reset pass counters for other agents since new info was shared
      for (const [id, s] of this.agentStates) {
        if (id !== agent.id) {
          s.consecutivePasses = 0;
        }
      }

      // Check for research requests
      const researchRequests = this.parseResearchRequests(response.content, agent.id);
      if (researchRequests.length > 0) {
        this.pendingResearchRequests.push(...researchRequests);
        this.waitingForResearch = true;
        this.emit('research_halt', {
          requests: researchRequests,
          message: `Discussion halted: ${researchRequests.length} research request(s) pending`,
        });
        await this.runResearch();
        return;
      }

      // Increment round counter
      this.session.currentRound++;

      // Synthesis every N messages
      if (this.session.messages.length % (enabledAgents.length * 2) === 0) {
        await this.runRoundSynthesis();

        if (this.session.config.humanParticipation) {
          this.waitingForHuman = true;
          this.emit('human_turn', { prompt: 'Checkpoint. Your thoughts?' });
        }
      }
    } catch (error) {
      this.emit('agent_typing', { agentId: agent.id, typing: false });
      this.emit('error', error);
    }
  }

  /**
   * EDA: All agents evaluate the conversation and decide if they want to speak
   */
  private async evaluateAllAgents(): Promise<AgentReaction[]> {
    const enabledAgents = this.session.config.enabledAgents;
    const recentMessages = this.session.messages.slice(-10);

    // Evaluate all agents in parallel
    const evaluations = await Promise.all(
      enabledAgents.map(async (agentId) => {
        const agent = getAgentById(agentId);
        if (!agent) return { agentId, urgency: 'pass' as const, reason: '', responseType: '' };

        const state = this.agentStates.get(agentId);
        const messagesSinceSpoke = state ? this.session.messages.length - state.lastSpoke : 999;

        return evaluateAgentReaction(
          agent,
          this.session.config,
          recentMessages,
          messagesSinceSpoke,
          this.context
        );
      })
    );

    return evaluations;
  }

  /**
   * EDA: Select which agent should speak based on urgency and fairness
   */
  private selectSpeaker(candidates: AgentReaction[]): AgentReaction {
    // Sort by urgency priority
    const urgencyOrder = { high: 0, medium: 1, low: 2, pass: 3 };
    candidates.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    // Among same urgency, prefer agent who hasn't spoken recently
    const highUrgency = candidates.filter(c => c.urgency === 'high');
    if (highUrgency.length > 0) {
      // Pick the one who spoke longest ago
      return highUrgency.reduce((oldest, current) => {
        const oldestState = this.agentStates.get(oldest.agentId);
        const currentState = this.agentStates.get(current.agentId);
        const oldestLast = oldestState?.lastSpoke ?? 0;
        const currentLast = currentState?.lastSpoke ?? 0;
        return currentLast < oldestLast ? current : oldest;
      });
    }

    // Same logic for medium urgency
    const mediumUrgency = candidates.filter(c => c.urgency === 'medium');
    if (mediumUrgency.length > 0) {
      return mediumUrgency.reduce((oldest, current) => {
        const oldestState = this.agentStates.get(oldest.agentId);
        const currentState = this.agentStates.get(current.agentId);
        const oldestLast = oldestState?.lastSpoke ?? 0;
        const currentLast = currentState?.lastSpoke ?? 0;
        return currentLast < oldestLast ? current : oldest;
      });
    }

    // Default to first low urgency
    return candidates[0];
  }

  /**
   * RTC Protocol: Devil's Kitchen round synthesis
   * Synthesizes the round's discussion, identifies agreements/tensions
   */
  private async runRoundSynthesis(): Promise<void> {
    // Get messages from this round only
    const roundMessages = this.session.messages.slice(-this.session.config.enabledAgents.length);

    if (roundMessages.length === 0) return;

    this.emit('agent_typing', { agentId: 'system', typing: true });

    try {
      const synthesis = await generateRoundSynthesis(
        this.session.config,
        roundMessages,
        this.session.currentRound,
        this.context
      );

      const message: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'synthesis',
        content: synthesis,
        metadata: { round: this.session.currentRound, type: 'rtc_synthesis' },
      };

      this.session.messages.push(message);
      this.emit('agent_typing', { agentId: 'system', typing: false });
      this.emit('synthesis', { message, round: this.session.currentRound });
      this.emit('agent_message', { agentId: 'system', message });

      await this.delay(1000);
    } catch (error) {
      this.emit('agent_typing', { agentId: 'system', typing: false });
      console.error('Round synthesis failed:', error);
    }
  }

  /**
   * Parse research requests from agent message
   * Format: [RESEARCH: researcher-id] query text [/RESEARCH]
   * Or: @stats-finder: "find statistics about..."
   */
  private parseResearchRequests(content: string, requestedBy: string): ResearchRequest[] {
    const requests: ResearchRequest[] = [];

    // Pattern 1: [RESEARCH: researcher-id] query [/RESEARCH]
    const blockPattern = /\[RESEARCH:\s*([a-z-]+)\]([\s\S]*?)\[\/RESEARCH\]/gi;
    let match;
    while ((match = blockPattern.exec(content)) !== null) {
      const researcherId = match[1].toLowerCase();
      const query = match[2].trim();
      if (getResearcherById(researcherId)) {
        requests.push({
          id: crypto.randomUUID(),
          requestedBy,
          researcherId,
          query,
          context: content,
        });
      }
    }

    // Pattern 2: @researcher-id: "query" or @researcher-id query
    const mentionPattern = /@(stats-finder|competitor-analyst|audience-insight|copy-explorer|local-context)[:\s]+["']?([^"'\n]+)["']?/gi;
    while ((match = mentionPattern.exec(content)) !== null) {
      const researcherId = match[1].toLowerCase();
      const query = match[2].trim();
      // Avoid duplicates
      if (!requests.find(r => r.query === query && r.researcherId === researcherId)) {
        requests.push({
          id: crypto.randomUUID(),
          requestedBy,
          researcherId,
          query,
          context: content,
        });
      }
    }

    return requests;
  }

  /**
   * Research phase - process pending research requests
   */
  private async runResearch(): Promise<void> {
    if (this.pendingResearchRequests.length === 0) {
      this.waitingForResearch = false;
      return;
    }

    // System message announcing research phase
    const announceMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🔍 Discussion paused for research. Processing ${this.pendingResearchRequests.length} request(s)...`,
    };
    this.session.messages.push(announceMessage);
    this.emit('agent_message', { agentId: 'system', message: announceMessage });

    // Process each research request
    for (const request of this.pendingResearchRequests) {
      const researcher = getResearcherById(request.researcherId);
      if (!researcher) continue;

      // Emit research request event
      this.emit('research_request', { request, researcher });

      // Show typing for researcher
      this.emit('agent_typing', { agentId: researcher.id, typing: true });

      try {
        // Generate research response
        const result = await generateResearcherResponse(
          researcher,
          request.query,
          this.session.config,
          this.context
        );

        // Create research result message
        const resultMessage: Message = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          agentId: researcher.id,
          type: 'research_result',
          content: result,
          metadata: {
            requestId: request.id,
            requestedBy: request.requestedBy,
            query: request.query,
          },
        };

        this.session.messages.push(resultMessage);
        this.emit('agent_typing', { agentId: researcher.id, typing: false });
        this.emit('research_result', { request, result: resultMessage });
        this.emit('agent_message', { agentId: researcher.id, message: resultMessage });

        await this.delay(500);
      } catch (error) {
        this.emit('agent_typing', { agentId: researcher.id, typing: false });

        // Add error message
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          timestamp: new Date(),
          agentId: researcher.id,
          type: 'research_result',
          content: `❌ Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
        this.session.messages.push(errorMessage);
        this.emit('agent_message', { agentId: researcher.id, message: errorMessage });
      }
    }

    // Clear pending requests
    this.pendingResearchRequests = [];
    this.waitingForResearch = false;

    // Announce resumption
    const resumeMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `✅ Research complete. Resuming discussion...`,
    };
    this.session.messages.push(resumeMessage);
    this.emit('agent_message', { agentId: 'system', message: resumeMessage });
  }

  /**
   * Synthesis phase
   */
  private async runSynthesis(): Promise<void> {
    this.emit('agent_typing', { agentId: 'system', typing: true });

    const synthesis = await generateSynthesis(
      this.session.config,
      this.session.messages,
      this.context
    );

    const message: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'synthesis',
      content: synthesis,
    };

    this.session.messages.push(message);
    this.emit('agent_typing', { agentId: 'system', typing: false });
    this.emit('synthesis', { message });
  }

  /**
   * Consensus check
   */
  private async runConsensusCheck(): Promise<void> {
    const result = await checkConsensus(this.session.config, this.session.messages);

    this.emit('consensus_check', result);

    if (result.reached) {
      const message: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'consensus',
        content: `Consensus reached: ${result.summary}`,
      };
      this.session.messages.push(message);
      this.emit('agent_message', { agentId: 'system', message });
    }
  }

  /**
   * Check if we should advance to next phase
   */
  private shouldAdvancePhase(): boolean {
    const phaseConfig = this.session.config.methodology.phases.find(
      (p) => p.phase === this.session.currentPhase
    );

    if (!phaseConfig) return true;

    // Check max rounds
    if (this.roundsInPhase >= phaseConfig.maxRounds) return true;

    return false;
  }

  /**
   * Advance to the next phase
   */
  private advancePhase(): void {
    const phases: SessionPhase[] = [
      'initialization',
      'brainstorming',
      'argumentation',
      'synthesis',
      'consensus',
      'finalization',
    ];

    const currentIndex = phases.indexOf(this.session.currentPhase);
    const nextPhase = phases[currentIndex + 1] || 'finalization';

    this.session.currentPhase = nextPhase;
    this.roundsInPhase = 0;
    this.emit('phase_change', { phase: nextPhase });

    if (nextPhase === 'finalization') {
      this.isRunning = false;
    }
  }

  /**
   * Helper to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
