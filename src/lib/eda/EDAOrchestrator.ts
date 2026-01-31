/**
 * EDAOrchestrator - Event-Driven Architecture Orchestrator
 * Coordinates agents via MessageBus and FloorManager
 * Supports dependency injection for Electron and CLI environments
 */

import type { Session, Message, ContextData, SessionPhase } from '../../types';
import type { IAgentRunner, IFileSystem } from '../interfaces';
import { MessageBus, messageBus } from './MessageBus';
import { FloorManager } from './FloorManager';
import { AgentListener } from './AgentListener';
import { getAgentById, getResearcherById } from '../../agents/personas';
import { generateRoundSynthesis } from '../claude';
import { ModeController } from '../modes/ModeController';
import { getModeById, getDefaultMode } from '../modes';

export type EDAEventType =
  | 'phase_change'
  | 'agent_typing'
  | 'agent_message'
  | 'human_turn'
  | 'synthesis'
  | 'research_halt'
  | 'research_result'
  | 'error'
  | 'floor_status'
  | 'draft_section'
  | 'intervention'; // ModeController interventions (goal_reminder, loop_detected, etc.)

// SessionPhase is imported from types/index.ts (10 phases: initialization, context_loading, research, brainstorming, argumentation, synthesis, drafting, review, consensus, finalization)
export type { SessionPhase };

export interface CopySection {
  id: string;
  name: string;
  nameHe: string;
  assignedAgent?: string;
  content?: string;
  status: 'pending' | 'in_progress' | 'complete';
}

const COPY_SECTIONS: Omit<CopySection, 'status'>[] = [
  { id: 'hero', name: 'Hero Section', nameHe: 'כותרת ראשית' },
  { id: 'problem', name: 'Problem Statement', nameHe: 'בעיה' },
  { id: 'solution', name: 'Solution/Benefits', nameHe: 'פתרון ויתרונות' },
  { id: 'social-proof', name: 'Social Proof', nameHe: 'הוכחה חברתית' },
  { id: 'cta', name: 'Call to Action', nameHe: 'קריאה לפעולה' },
];

export interface EDAEvent {
  type: EDAEventType;
  data: unknown;
}

export type EDACallback = (event: EDAEvent) => void;

export interface EDAOrchestratorOptions {
  agentRunner?: IAgentRunner;
  fileSystem?: IFileSystem;
}

export class EDAOrchestrator {
  private session: Session;
  private context: ContextData | undefined;
  private skills: string | undefined;
  private bus: MessageBus;
  private floorManager: FloorManager;
  private agentListeners: Map<string, AgentListener> = new Map();
  private eventCallbacks: EDACallback[] = [];

  private isRunning = false;
  private messageCount = 0;
  private synthesisInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribers: (() => void)[] = [];

  // Phase management
  private currentPhase: SessionPhase = 'initialization';
  private copySections: CopySection[] = [];

  // Consensus tracking
  private agentContributions: Map<string, number> = new Map();
  private keyInsights: Map<string, { content: string; supporters: Set<string>; opposers: Set<string> }> = new Map();
  private consensusThreshold = 0.6; // 60% agreement needed

  // Research state (used for tracking pending research)
  private researchPending = false;

  // Dependency injection
  private agentRunner: IAgentRunner | undefined;
  private fileSystem: IFileSystem | undefined;

  // Mode controller for goal anchoring and loop detection
  private modeController: ModeController;

  constructor(
    session: Session,
    context?: ContextData,
    skills?: string,
    options?: EDAOrchestratorOptions
  ) {
    this.session = session;
    this.context = context;
    this.skills = skills;
    this.bus = messageBus;
    this.floorManager = new FloorManager(this.bus);
    this.agentRunner = options?.agentRunner;
    this.fileSystem = options?.fileSystem;

    // Initialize mode controller
    const mode = getModeById(session.config.mode || 'copywrite') || getDefaultMode();
    this.modeController = new ModeController(mode);
  }

  /**
   * Subscribe to orchestrator events (for UI)
   */
  on(callback: EDACallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
    };
  }

  private emit(type: EDAEventType, data: unknown): void {
    const event: EDAEvent = { type, data };
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  /**
   * Start the EDA orchestration
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[EDAOrchestrator] Starting...');

    // Setup bus subscriptions for UI events
    this.setupBusSubscriptions();

    // Create agent listeners
    this.createAgentListeners();

    // Start the bus
    this.bus.start(this.session.id, this.session.config.goal);

    // Emit phase change
    this.emit('phase_change', { phase: 'initialization' });

    // Get mode info
    const mode = this.modeController.getMode();
    const firstPhase = this.modeController.getCurrentPhase();

    // Add initial system message with mode context
    const systemMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🎙️ Session started: ${this.session.config.projectName}

**Mode:** ${mode.icon} ${mode.name}
**Goal:** ${this.session.config.goal}

**${mode.description}**

📍 **Phase 1: ${firstPhase?.name || 'Discovery'}**
${firstPhase?.agentFocus || 'Begin the discussion'}

*All agents are now listening. Stay focused on the goal.*`,
    };
    this.bus.addMessage(systemMessage, 'system');

    // Combine mode instructions with skills
    const modeInstructions = this.modeController.getAgentInstructions();
    const combinedSkills = this.skills
      ? `${this.skills}\n\n## Mode Instructions\n${modeInstructions}`
      : `## Mode Instructions\n${modeInstructions}`;

    // Start agents listening with skills and mode instructions
    for (const listener of this.agentListeners.values()) {
      listener.start(this.session.config, this.context, combinedSkills);
    }

    // Kick off with a compelling prompt that forces engagement
    setTimeout(async () => {
      // Load brief if available
      let briefContent = '';
      try {
        const brief = await this.readBrief('taru');
        if (brief) {
          briefContent = `\n\n**📋 Project Brief:**\n${brief.slice(0, 1500)}...`;
        }
      } catch {
        // No brief available
      }

      const promptMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `📢 **DISCUSSION STARTS NOW**

Goal: ${this.session.config.goal}
${briefContent}

**Each agent MUST respond with their initial reaction:**
- What's your FIRST instinct about this project?
- What concerns you from YOUR persona's perspective?
- What opportunity do you see?

Ronit - you're up first. Share your initial reaction.`,
      };
      this.bus.addMessage(promptMessage, 'system');

      // Force first agent to speak after a moment
      setTimeout(() => {
        this.forceAgentToSpeak('ronit', 'Opening the discussion as requested');
      }, 2000);
    }, 1000);

    // Setup periodic synthesis
    this.synthesisInterval = setInterval(() => {
      this.checkForSynthesis();
    }, 30000); // Check every 30 seconds

    // If human participation, prompt periodically
    if (this.session.config.humanParticipation) {
      setTimeout(() => {
        this.promptHuman('The floor is open. Add your thoughts anytime.');
      }, 5000);
    }

    this.emit('phase_change', { phase: 'brainstorming' });
  }

  /**
   * Read brief using injected file system or window.electronAPI
   */
  private async readBrief(briefName: string): Promise<string | null> {
    if (this.fileSystem) {
      return this.fileSystem.readBrief(briefName);
    }
    // Fallback to Electron API
    if (typeof window !== 'undefined' && window.electronAPI?.readBrief) {
      return window.electronAPI.readBrief(briefName);
    }
    return null;
  }

  /**
   * Setup MessageBus subscriptions for UI events
   */
  private setupBusSubscriptions(): void {
    // Forward messages to UI
    this.unsubscribers.push(
      this.bus.subscribe('message:new', (payload) => {
        this.messageCount++;
        this.session.messages.push(payload.message);

        // Track agent contributions for consensus (including human input)
        // Per DELIBERATION_WORKFLOW.md: "Human input is weighted in consensus"
        if (payload.fromAgent !== 'system') {
          this.trackAgentContribution(payload.fromAgent, payload.message);
        }

        // Check for typing indicator
        const agent = getAgentById(payload.fromAgent);
        if (agent) {
          this.emit('agent_typing', { agentId: payload.fromAgent, typing: false });
        }

        this.emit('agent_message', { agentId: payload.fromAgent, message: payload.message });

        // Check for research requests
        this.checkForResearchRequests(payload.message);

        // Process message through mode controller for interventions
        this.processModeInterventions(payload.message);
      }, 'orchestrator')
    );

    // Forward floor status
    this.unsubscribers.push(
      this.bus.subscribe('floor:granted', (payload) => {
        this.emit('agent_typing', { agentId: payload.agentId, typing: true });
        this.emit('floor_status', { current: payload.agentId, status: 'speaking' });
      }, 'orchestrator')
    );

    this.unsubscribers.push(
      this.bus.subscribe('floor:released', () => {
        this.emit('floor_status', { current: null, status: 'open' });
      }, 'orchestrator')
    );

    this.unsubscribers.push(
      this.bus.subscribe('floor:request', (payload) => {
        console.log(`[EDAOrchestrator] Floor request from ${payload.agentId}`);
      }, 'orchestrator')
    );
  }

  /**
   * Create agent listeners for all enabled agents
   */
  private createAgentListeners(): void {
    for (const agentId of this.session.config.enabledAgents) {
      const agent = getAgentById(agentId);
      if (!agent) continue;

      const listener = new AgentListener(
        agent,
        this.bus,
        {
          reactivityThreshold: 0.6,
          minSilenceBeforeReact: 1,
          evaluationDebounce: 800 + Math.random() * 400, // Stagger evaluations
        },
        this.agentRunner // Pass injected runner
      );

      this.agentListeners.set(agentId, listener);
    }

    console.log(`[EDAOrchestrator] Created ${this.agentListeners.size} agent listeners`);
  }

  /**
   * Track agent contribution and consensus signals
   */
  private trackAgentContribution(agentId: string, message: Message): void {
    // Count contributions
    const count = this.agentContributions.get(agentId) || 0;
    this.agentContributions.set(agentId, count + 1);

    const content = message.content;

    // Parse response type tags
    const typeMatch = content.match(/\[(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
    const responseType = typeMatch ? typeMatch[1].toUpperCase() : null;

    // Track agreements and disagreements
    if (responseType === 'AGREEMENT' || responseType === 'DISAGREEMENT') {
      // Try to find what they're agreeing/disagreeing with
      const recentMessages = this.bus.getRecentMessages(5);
      const previousMessage = recentMessages.find(m => m.agentId !== agentId && m.agentId !== 'system');

      if (previousMessage) {
        const insightKey = `${previousMessage.agentId}-${previousMessage.id.slice(0, 8)}`;

        if (!this.keyInsights.has(insightKey)) {
          this.keyInsights.set(insightKey, {
            content: previousMessage.content.slice(0, 200),
            supporters: new Set([previousMessage.agentId]),
            opposers: new Set(),
          });
        }

        const insight = this.keyInsights.get(insightKey)!;
        if (responseType === 'AGREEMENT') {
          insight.supporters.add(agentId);
          insight.opposers.delete(agentId);
        } else {
          insight.opposers.add(agentId);
          insight.supporters.delete(agentId);
        }
      }
    }

    // Track proposals as potential consensus points
    if (responseType === 'PROPOSAL' || responseType === 'SYNTHESIS') {
      const insightKey = `${agentId}-${message.id.slice(0, 8)}`;
      this.keyInsights.set(insightKey, {
        content: content.slice(0, 200),
        supporters: new Set([agentId]),
        opposers: new Set(),
      });
    }
  }

  /**
   * Check if discussion is ready for synthesis
   */
  getConsensusStatus(): {
    ready: boolean;
    allAgentsSpoke: boolean;
    agentParticipation: Map<string, number>;
    consensusPoints: number;
    conflictPoints: number;
    recommendation: string;
  } {
    const enabledAgents = this.session.config.enabledAgents;
    const agentsWhoSpoke = new Set(this.agentContributions.keys());
    const allAgentsSpoke = enabledAgents.every(id => agentsWhoSpoke.has(id));

    // Count consensus and conflict points
    // Human input counts with double weight (per DELIBERATION_WORKFLOW.md: human input is weighted in consensus)
    let consensusPoints = 0;
    let conflictPoints = 0;
    const humanWeight = 2; // Human vote counts as 2 agents

    for (const insight of this.keyInsights.values()) {
      // Calculate effective support/oppose counts (human gets double weight)
      let effectiveSupport = insight.supporters.size;
      let effectiveOppose = insight.opposers.size;
      if (insight.supporters.has('human')) {
        effectiveSupport += humanWeight - 1; // Add extra weight (already counted once)
      }
      if (insight.opposers.has('human')) {
        effectiveOppose += humanWeight - 1; // Add extra weight (already counted once)
      }

      // Calculate ratio against total participants (agents + human weight)
      const totalWeight = enabledAgents.length + (this.agentContributions.has('human') ? humanWeight : 0);
      const supportRatio = effectiveSupport / totalWeight;
      const opposeRatio = effectiveOppose / totalWeight;

      if (supportRatio >= this.consensusThreshold) {
        consensusPoints++;
      }
      if (opposeRatio >= 0.4) {
        conflictPoints++;
      }
    }

    // Determine readiness
    const minContributions = enabledAgents.length * 2; // Each agent speaks at least twice on average
    const totalContributions = Array.from(this.agentContributions.values()).reduce((a, b) => a + b, 0);

    let recommendation: string;
    let ready = false;

    if (this.researchPending) {
      recommendation = 'מחכים לתוצאות מחקר...';
    } else if (!allAgentsSpoke) {
      const silent = enabledAgents.filter(id => !agentsWhoSpoke.has(id));
      recommendation = `עדיין לא כל הסוכנים דיברו. חסרים: ${silent.join(', ')}`;
    } else if (totalContributions < minContributions) {
      recommendation = `הדיון עדיין קצר מדי (${totalContributions}/${minContributions} תגובות)`;
    } else if (conflictPoints > consensusPoints) {
      recommendation = `יש יותר מחלוקות מהסכמות (${conflictPoints} מחלוקות, ${consensusPoints} הסכמות). המשיכו לדון.`;
    } else if (consensusPoints === 0) {
      recommendation = 'עדיין לא הושגו נקודות הסכמה. הסוכנים צריכים להגיב אחד לשני.';
    } else {
      ready = true;
      recommendation = `מוכנים לסינתזה! ${consensusPoints} נקודות הסכמה, ${conflictPoints} מחלוקות פתוחות.`;
    }

    return {
      ready,
      allAgentsSpoke,
      agentParticipation: new Map(this.agentContributions),
      consensusPoints,
      conflictPoints,
      recommendation,
    };
  }

  /**
   * Get current mode info
   */
  getModeInfo(): { id: string; name: string; phase: string; progress: object } {
    const mode = this.modeController.getMode();
    const progress = this.modeController.getProgress();
    const phase = this.modeController.getCurrentPhase();

    return {
      id: mode.id,
      name: mode.name,
      phase: phase?.name || 'Unknown',
      progress: {
        messagesInPhase: progress.messagesInPhase,
        totalMessages: progress.totalMessages,
        researchRequests: progress.researchRequests,
        consensusPoints: progress.consensusPoints,
        proposalsCount: progress.proposalsCount,
        loopDetected: progress.loopDetected,
        outputsProduced: Array.from(progress.outputsProduced),
      },
    };
  }

  /**
   * Check if mode success criteria are met
   */
  checkModeSuccess(): { met: boolean; missing: string[] } {
    return this.modeController.checkSuccessCriteria();
  }

  /**
   * Get mode controller (for serialization)
   */
  getModeController(): ModeController {
    return this.modeController;
  }

  /**
   * Process mode interventions (goal reminders, loop detection, phase transitions)
   */
  private processModeInterventions(message: Message): void {
    const interventions = this.modeController.processMessage(message, this.session.messages);

    for (const intervention of interventions) {
      // Replace {goal} placeholder in goal reminders
      let content = intervention.message;
      if (content.includes('{goal}')) {
        content = content.replace('{goal}', this.session.config.goal);
      }

      // Create system message for the intervention
      const interventionMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content,
        metadata: {
          interventionType: intervention.type,
          priority: intervention.priority,
        },
      };

      // Emit intervention event for UI/SessionKernel (per SESSION_KERNEL.md spec)
      this.emit('intervention', {
        type: intervention.type,
        message: content,
        priority: intervention.priority,
        action: intervention.action,
      });

      // Add with a small delay to not interrupt flow
      setTimeout(() => {
        this.bus.addMessage(interventionMessage, 'system');
      }, 500);

      console.log(`[EDAOrchestrator] Mode intervention: ${intervention.type} (${intervention.priority})`);
    }
  }

  /**
   * Check for research requests in message
   */
  private checkForResearchRequests(message: Message): void {
    const content = message.content;

    // Pattern: @researcher-id: query
    const mentionPattern = /@(stats-finder|competitor-analyst|audience-insight|copy-explorer|local-context)[:\s]+["']?([^"'\n]+)["']?/gi;
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const researcherId = match[1].toLowerCase();
      const query = match[2].trim();
      this.processResearchRequest(researcherId, query, message.agentId);
    }

    // Pattern: [RESEARCH: researcher-id] query [/RESEARCH]
    const blockPattern = /\[RESEARCH:\s*([a-z-]+)\]([\s\S]*?)\[\/RESEARCH\]/gi;
    while ((match = blockPattern.exec(content)) !== null) {
      const researcherId = match[1].toLowerCase();
      const query = match[2].trim();
      this.processResearchRequest(researcherId, query, message.agentId);
    }
  }

  /**
   * Process a research request - HALTS discussion until complete
   */
  private async processResearchRequest(
    researcherId: string,
    query: string,
    requestedBy: string
  ): Promise<void> {
    const researcher = getResearcherById(researcherId);
    if (!researcher) return;

    // HALT the discussion
    this.researchPending = true;
    this.bus.pause('Research in progress');
    this.emit('research_halt', { researcherId, query, requestedBy });

    // Emit message:research event to MessageBus subscribers (per MessageBus.ts event spec)
    this.bus.emit('message:research', { request: { researcherId, query }, fromAgent: requestedBy });

    // Announce research halt
    const announceMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🔍 **הדיון נעצר לצורך מחקר**

**חוקר:** ${researcher.name}
**בקשה:** "${query}"
**מבקש:** ${this.getAgentName(requestedBy)}

⏳ מחפש מידע... הסוכנים ממתינים.`,
    };
    this.bus.addMessage(announceMessage, 'system');

    try {
      // Use Claude Agent SDK with web search capability
      const result = await this.runResearchWithWebSearch(researcher, query);

      const resultMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: researcher.id,
        type: 'research_result',
        content: result,
        metadata: { query, requestedBy },
      };

      this.bus.addMessage(resultMessage, researcher.id);
      this.emit('research_result', { researcher: researcher.name, result });

      // Announce resumption
      const resumeMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `✅ **מחקר הושלם - הדיון ממשיך**

הסוכנים יכולים כעת להתייחס לממצאים.`,
      };
      this.bus.addMessage(resumeMessage, 'system');

    } catch (error) {
      console.error('[EDAOrchestrator] Research error:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `❌ **שגיאה במחקר:** ${error}\n\nהדיון ממשיך ללא תוצאות המחקר.`,
      };
      this.bus.addMessage(errorMessage, 'system');
    }

    // RESUME the discussion
    this.researchPending = false;
    this.bus.resume();
  }

  /**
   * Run research using Claude Agent SDK with web search
   */
  private async runResearchWithWebSearch(
    researcher: { id: string; name: string; specialty: string; capabilities: string[]; searchDomains: string[] },
    query: string
  ): Promise<string> {
    const systemPrompt = `You are ${researcher.name}, a specialized research agent.

## YOUR SPECIALTY
${researcher.specialty}

## YOUR CAPABILITIES
${researcher.capabilities.map(c => `- ${c}`).join('\n')}

## SEARCH DOMAINS
${researcher.searchDomains.map(d => `- ${d}`).join('\n')}

## PROJECT CONTEXT
**Project**: ${this.session.config.projectName}
**Goal**: ${this.session.config.goal}

## YOUR MISSION
1. Search the web for relevant, current information
2. Focus on Israeli market data when relevant
3. Find specific numbers, statistics, and facts
4. Verify information from multiple sources when possible

## OUTPUT FORMAT
Provide research findings in Hebrew:

**🔍 ממצאים עיקריים:**
- [bullet points of main discoveries]

**📊 נתונים ספציפיים:**
- [specific numbers, stats that can be used in copy]

**💡 משמעות לקופי:**
- [how this should influence the website copy]

**📚 מקורות:**
- [note sources and reliability]`;

    // Use injected runner or fall back to Electron API
    if (this.agentRunner) {
      const result = await this.agentRunner.query({
        prompt: `Research request: ${query}\n\nSearch the web for current, accurate information. Focus on Israeli market data when relevant.`,
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
      });

      if (!result.success) {
        throw new Error(result.error || 'Research query failed');
      }
      return result.content || 'לא נמצאו תוצאות';
    }

    // Fallback to Electron API
    if (typeof window !== 'undefined' && window.electronAPI?.claudeAgentQuery) {
      const result = await window.electronAPI.claudeAgentQuery({
        prompt: `Research request: ${query}\n\nSearch the web for current, accurate information. Focus on Israeli market data when relevant.`,
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'Research query failed');
      }
      return result.content || 'לא נמצאו תוצאות';
    }

    throw new Error('No agent runner available');
  }

  /**
   * Check if synthesis is needed
   */
  private async checkForSynthesis(): Promise<void> {
    if (!this.isRunning) return;

    // Synthesize every 10 messages or so
    if (this.messageCount > 0 && this.messageCount % 10 === 0) {
      await this.runSynthesis();
    }
  }

  /**
   * Run synthesis checkpoint
   */
  private async runSynthesis(): Promise<void> {
    const recentMessages = this.bus.getRecentMessages(10);
    if (recentMessages.length < 5) return;

    try {
      const synthesis = await generateRoundSynthesis(
        this.session.config,
        recentMessages,
        Math.floor(this.messageCount / 10),
        this.context
      );

      const synthMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'synthesis',
        content: synthesis,
      };

      this.bus.addMessage(synthMessage, 'system');
      this.emit('synthesis', { synthesis, messageCount: this.messageCount });

      // Emit message:synthesis event to MessageBus subscribers (per MessageBus.ts event spec)
      this.bus.emit('message:synthesis', { synthesis, round: Math.floor(this.messageCount / 10) });
    } catch (error) {
      console.error('[EDAOrchestrator] Synthesis error:', error);
    }
  }

  /**
   * Prompt for human input
   */
  private promptHuman(prompt: string): void {
    this.bus.emit('human:requested', { prompt });
    this.emit('human_turn', { prompt });
  }

  /**
   * Add human message
   */
  async addHumanMessage(content: string): Promise<void> {
    const message: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'human',
      type: 'human_input',
      content,
    };

    this.bus.addMessage(message, 'human');
    this.bus.emit('human:received', { content });
  }

  /**
   * Pause orchestration
   */
  pause(): void {
    this.isRunning = false;
    this.bus.pause('User paused');
    if (this.synthesisInterval) {
      clearInterval(this.synthesisInterval);
      this.synthesisInterval = null;
    }
  }

  /**
   * Resume orchestration
   */
  resume(): void {
    this.isRunning = true;
    this.bus.resume();
    this.synthesisInterval = setInterval(() => {
      this.checkForSynthesis();
    }, 30000);
  }

  /**
   * Stop orchestration
   */
  stop(): void {
    this.isRunning = false;

    if (this.synthesisInterval) {
      clearInterval(this.synthesisInterval);
      this.synthesisInterval = null;
    }

    // Stop all listeners
    for (const listener of this.agentListeners.values()) {
      listener.stop();
    }
    this.agentListeners.clear();

    // Unsubscribe from bus
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];

    // Stop bus
    this.bus.stop('Session ended');

    this.emit('phase_change', { phase: 'finalization' });
  }

  /**
   * Transition to argumentation phase - structured debate on brainstorming ideas
   * Per DELIBERATION_WORKFLOW.md: Argumentation follows brainstorming for critical evaluation
   */
  async transitionToArgumentation(): Promise<{ success: boolean; message: string }> {
    if (this.currentPhase !== 'brainstorming') {
      return { success: false, message: `לא ניתן לעבור לדיון משלב ${this.currentPhase}` };
    }

    // Check if minimum discussion occurred
    const status = this.getConsensusStatus();
    if (!status.allAgentsSpoke) {
      return {
        success: false,
        message: `עדיין לא כל הסוכנים דיברו. המתן לתגובות מ: ${this.session.config.enabledAgents.filter(id => !status.agentParticipation.has(id)).join(', ')}`
      };
    }

    this.currentPhase = 'argumentation';
    this.emit('phase_change', { phase: 'argumentation' });

    // Announce phase transition
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `⚔️ **PHASE: ARGUMENTATION**

עכשיו נבחן את הרעיונות בצורה ביקורתית.

**מטרת השלב:**
- העלו טיעוני נגד לרעיונות שהוצעו
- אתגרו הנחות יסוד
- זהו חולשות וסיכונים
- הגנו על רעיונות טובים עם ראיות

**כללי הדיון:**
- כל סוכן חייב להעלות לפחות טיעון אחד נגד רעיון שהוצע
- השתמשו בתגיות: [ARGUMENT], [COUNTER], [DEFENSE]
- אל תסכימו מהר מדי - בדקו את הרעיונות לעומק

**מתחילים!** ${this.getNextSpeakerForArgumentation()} - העלה/י טיעון ביקורתי לגבי אחד הרעיונות.`,
    };
    this.bus.addMessage(transitionMessage, 'system');

    // Force first agent to speak
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForArgumentation();
      this.forceAgentToSpeak(firstAgent, 'Opening argumentation with critical analysis');
    }, 2000);

    return { success: true, message: 'עוברים לשלב הדיון הביקורתי' };
  }

  /**
   * Get next speaker for argumentation phase (prefer devil's advocate persona)
   */
  private getNextSpeakerForArgumentation(): string {
    const agents = Array.from(this.agentListeners.keys());
    // Start with the critic/analyst (yossi) if available - good at challenging ideas
    if (agents.includes('yossi')) return 'yossi';
    // Or michal for balanced perspective
    if (agents.includes('michal')) return 'michal';
    return agents[0] || 'yossi';
  }

  /**
   * Transition to synthesis phase - consolidate insights from brainstorming/argumentation
   * @param force - Skip consensus check and force transition
   */
  async transitionToSynthesis(force = false): Promise<{ success: boolean; message: string }> {
    // Allow transition from both brainstorming AND argumentation phases
    if (this.currentPhase !== 'brainstorming' && this.currentPhase !== 'argumentation') {
      return { success: false, message: `לא ניתן לעבור לסינתזה משלב ${this.currentPhase}` };
    }

    // Check consensus status
    const status = this.getConsensusStatus();

    if (!status.ready && !force) {
      // Warn but allow override
      const warningMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `⚠️ **אזהרה: הדיון עדיין לא בשל לסינתזה**

${status.recommendation}

**סטטוס נוכחי:**
- סוכנים שדיברו: ${status.agentParticipation.size}/${this.session.config.enabledAgents.length}
- נקודות הסכמה: ${status.consensusPoints}
- מחלוקות פתוחות: ${status.conflictPoints}

כדי להמשיך בכל זאת, הקלד \`synthesize force\``,
      };
      this.bus.addMessage(warningMessage, 'system');
      return { success: false, message: status.recommendation };
    }

    this.currentPhase = 'synthesis';
    this.emit('phase_change', { phase: 'synthesis' });

    // Build status summary
    const participationList = Array.from(status.agentParticipation.entries())
      .map(([id, count]) => `  - ${this.getAgentName(id)}: ${count} תגובות`)
      .join('\n');

    // Announce phase transition
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `📊 **PHASE: SYNTHESIS**

הדיון עובר לשלב הסינתזה.

**סיכום הדיון:**
- נקודות הסכמה: ${status.consensusPoints}
- מחלוקות שנותרו: ${status.conflictPoints}

**השתתפות:**
${participationList}

**משימה לכל הסוכנים:**
1. סכמו את התובנות העיקריות שעלו
2. זהו נקודות הסכמה וחילוקי דעות
3. הגדירו את המסרים המרכזיים שחייבים להופיע בקופי

**הסוכן הבא:** ${this.getNextSpeakerForSynthesis()} - סכם/י את הדיון מנקודת המבט שלך.`,
    };
    this.bus.addMessage(transitionMessage, 'system');

    // Force first agent to synthesize
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForSynthesis();
      this.forceAgentToSpeak(firstAgent, 'Synthesizing discussion insights');
    }, 2000);

    return { success: true, message: 'עוברים לשלב הסינתזה' };
  }

  /**
   * Transition to drafting phase - agents write actual copy sections
   */
  async transitionToDrafting(): Promise<void> {
    if (this.currentPhase !== 'synthesis' && this.currentPhase !== 'brainstorming') {
      console.log(`[EDAOrchestrator] Cannot transition to drafting from ${this.currentPhase}`);
      return;
    }

    this.currentPhase = 'drafting';
    this.emit('phase_change', { phase: 'drafting' });

    // Initialize copy sections with assignments
    this.copySections = COPY_SECTIONS.map((section, index) => ({
      ...section,
      status: 'pending' as const,
      assignedAgent: this.assignAgentToSection(index),
    }));

    // Announce phase transition
    const assignments = this.copySections
      .map(s => `- **${s.nameHe}** (${s.name}): ${this.getAgentName(s.assignedAgent!)}`)
      .join('\n');

    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `✍️ **PHASE: DRAFTING**

עכשיו נכתוב את הקופי בפועל!

**חלוקת משימות:**
${assignments}

**הנחיות:**
- כתבו טיוטה ראשונה לחלק שלכם
- התבססו על התובנות מהדיון
- שמרו על עקביות בטון ובשפה
- אחרי כל טיוטה, הסוכנים האחרים יכולים להגיב ולשפר

**מתחילים!** ${this.getAgentName(this.copySections[0].assignedAgent!)} - כתוב/י את ${this.copySections[0].nameHe}.`,
    };
    this.bus.addMessage(transitionMessage, 'system');

    // Start with first section
    setTimeout(() => {
      this.startDraftingSection(0);
    }, 2000);
  }

  /**
   * Get a consolidated draft of all sections
   */
  async getConsolidatedDraft(): Promise<string> {
    const sections = this.copySections
      .filter(s => s.content)
      .map(s => `## ${s.nameHe} (${s.name})\n\n${s.content}`)
      .join('\n\n---\n\n');

    return `# ${this.session.config.projectName} - Draft Copy\n\n${sections}`;
  }

  /**
   * Assign agent to section based on their strengths
   */
  private assignAgentToSection(sectionIndex: number): string {
    const agents = Array.from(this.agentListeners.keys());
    // Rotate through agents, but could be smarter based on agent strengths
    return agents[sectionIndex % agents.length];
  }

  /**
   * Get agent display name
   */
  private getAgentName(agentId: string): string {
    const agent = getAgentById(agentId);
    return agent ? `${agent.name} (${agent.nameHe})` : agentId;
  }

  /**
   * Get next speaker for synthesis phase
   */
  private getNextSpeakerForSynthesis(): string {
    const agents = Array.from(this.agentListeners.keys());
    // Start with the strategist (ronit) if available
    if (agents.includes('ronit')) return 'ronit';
    return agents[0] || 'ronit';
  }

  /**
   * Start drafting a specific section
   */
  private startDraftingSection(sectionIndex: number): void {
    if (sectionIndex >= this.copySections.length) {
      this.finalizeDrafting();
      return;
    }

    const section = this.copySections[sectionIndex];
    section.status = 'in_progress';

    this.emit('draft_section', { section, sectionIndex });
    this.forceAgentToSpeak(section.assignedAgent!, `Writing ${section.name} (${section.nameHe})`);
  }

  /**
   * Mark a section as complete and move to next
   */
  completeDraftSection(sectionId: string, content: string): void {
    const sectionIndex = this.copySections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) return;

    this.copySections[sectionIndex].content = content;
    this.copySections[sectionIndex].status = 'complete';

    // Announce completion
    const section = this.copySections[sectionIndex];
    const completeMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `✅ **${section.nameHe}** complete!\n\n---\n\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}`,
    };
    this.bus.addMessage(completeMessage, 'system');

    // Move to next section
    setTimeout(() => {
      this.startDraftingSection(sectionIndex + 1);
    }, 3000);
  }

  /**
   * Finalize drafting phase
   */
  private async finalizeDrafting(): Promise<void> {
    this.currentPhase = 'finalization';
    this.emit('phase_change', { phase: 'finalization' });

    const draft = await this.getConsolidatedDraft();

    const finalMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🎉 **DRAFTING COMPLETE!**

כל החלקים נכתבו. הקופי המלא:

${draft}

**מה עכשיו?**
- הסוכנים יכולים לתת פידבק סופי
- ניתן לערוך ולשפר
- הקופי מוכן לייצוא`,
    };
    this.bus.addMessage(finalMessage, 'system');
  }

  /**
   * Get current phase
   */
  getCurrentPhase(): SessionPhase {
    return this.currentPhase;
  }

  /**
   * Get copy sections status
   */
  getCopySections(): CopySection[] {
    return [...this.copySections];
  }

  /**
   * Force an agent to speak (bypass normal floor request)
   */
  private forceAgentToSpeak(agentId: string, reason: string): void {
    const listener = this.agentListeners.get(agentId);
    if (!listener) {
      console.log(`[EDAOrchestrator] Agent ${agentId} not found, trying next`);
      // Try another agent
      const firstAgent = this.agentListeners.keys().next().value;
      if (firstAgent) {
        this.forceAgentToSpeak(firstAgent, reason);
      }
      return;
    }

    // Emit floor request with high urgency to bypass queue
    const request: import('./MessageBus').FloorRequest = {
      agentId,
      urgency: 'high',
      reason,
      responseType: 'argument',
      timestamp: Date.now(),
    };

    console.log(`[EDAOrchestrator] Forcing ${agentId} to speak: ${reason}`);
    this.bus.emit('floor:request', request);
  }

  /**
   * Get floor status
   */
  getFloorStatus(): { current: string | null; queued: string[] } {
    return this.floorManager.getQueueStatus();
  }

  /**
   * Get agent states
   */
  getAgentStates(): Map<string, string> {
    const states = new Map<string, string>();
    for (const [id, listener] of this.agentListeners) {
      states.set(id, listener.getState());
    }
    return states;
  }

  /**
   * Get session reference
   */
  getSession(): Session {
    return this.session;
  }

  /**
   * Get messages from the bus
   */
  getMessages(): Message[] {
    return this.bus.getAllMessages();
  }
}
