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
import { parseGoalSections, extractSection, type RequiredSection } from './GoalParser';
import { introspectProject } from '../research/ProjectIntrospector';
import type { ProviderRegistry, AgentRuntimeConfig } from '../providers';
import type { SkillCatalog } from '../skills';
import { WorkdirManager } from './WorkdirManager';

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
  | 'intervention' // ModeController interventions (goal_reminder, loop_detected, etc.)
  | 'agent_config_change'
  | 'agent_skills_change';

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
  /**
   * Optional provider registry. When supplied, per-agent runtime configs
   * (see `getAgentConfig` / `updateAgentConfig`) route queries through
   * the chosen provider+model. Absent in Electron/legacy paths which
   * still use a single injected `agentRunner`.
   */
  providers?: ProviderRegistry;
  /**
   * Seed per-agent runtime configs. The orchestrator defaults any missing
   * agent to the registry's default provider+model on `start()`.
   */
  initialAgentConfigs?: Record<string, AgentRuntimeConfig>;
  /**
   * Absolute path to the session's on-disk workdir. When supplied,
   * the orchestrator creates per-agent folders, a consensus dir, and
   * persists each agent's resolved skills for self-describing sessions.
   */
  sessionWorkdir?: string;
  /**
   * Per-agent skill bundle (already includes shared + mode layers).
   * Overrides the single shared `skills` positional arg for agents
   * present in the map.
   */
  perAgentSkills?: Map<string, string>;
  /**
   * Catalog of all discoverable skills. Enables the TUI skill picker
   * to browse and toggle skills per-agent at runtime.
   */
  skillCatalog?: SkillCatalog;
  /**
   * When true, `start()` also kicks off a deterministic phase executor
   * (Discovery → Synthesis → Drafting → Finalization) that drives agents
   * turn-by-turn and produces one section per drafting turn. Default false
   * because unit tests use mocked runners and don't want the machine to
   * advance phases behind their backs.
   */
  autoRunPhaseMachine?: boolean;
  /**
   * Optional override for the minimum interval between phase transitions.
   * Primarily used by tests to speed up timing assertions.
   */
  phaseMachineOptions?: {
    /** Per-agent speak timeout in ms (default 120_000). */
    speakTimeoutMs?: number;
  };
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
  private isStopped = false;
  private messageCount = 0;
  private synthesisInterval: ReturnType<typeof setInterval> | null = null;
  private phaseMachineStarted = false;
  private autoRunPhaseMachine = false;
  // 180s per turn — drafting with heavy research context can push Sonnet
  // past the default 90s, especially for the first section after Research.
  private speakTimeoutMs = 180_000;
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

  // Per-agent runtime config — provider, model, paused, system suffix.
  // The agent listeners resolve this map on every query, so mutations
  // via `updateAgentConfig` take effect immediately.
  private providers: ProviderRegistry | undefined;
  private agentConfigs: Map<string, AgentRuntimeConfig> = new Map();

  // Per-agent skills (combined shared + mode + agent-specific) and
  // on-disk workdir layout. Both are optional — when absent the
  // orchestrator falls back to the legacy single-skills-string path.
  private perAgentSkills: Map<string, string> | undefined;
  private workdir: WorkdirManager | undefined;

  // Skill catalog + per-agent overrides. When an agent has overrides
  // set (via the TUI Skill picker), the orchestrator assembles their
  // bundle from the catalog instead of the init-time perAgentSkills.
  private skillCatalog: SkillCatalog | undefined;
  private agentSkillOverrides: Map<string, string[]> = new Map();

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
    this.providers = options?.providers;
    this.perAgentSkills = options?.perAgentSkills;
    this.skillCatalog = options?.skillCatalog;
    this.autoRunPhaseMachine = options?.autoRunPhaseMachine ?? false;
    if (options?.sessionWorkdir && options?.fileSystem) {
      this.workdir = new WorkdirManager(options.fileSystem, {
        sessionDir: options.sessionWorkdir,
        agentIds: session.config.enabledAgents,
      });
    }

    // Seed per-agent configs: initial overrides → registry default.
    if (this.providers) {
      const def = this.providers.getDefault();
      const seed = options?.initialAgentConfigs ?? {};
      for (const agentId of session.config.enabledAgents) {
        this.agentConfigs.set(agentId, seed[agentId] ?? {
          providerId: def.id,
          modelId: def.defaultModelId(),
        });
      }
    }
    if (options?.phaseMachineOptions?.speakTimeoutMs !== undefined) {
      this.speakTimeoutMs = options.phaseMachineOptions.speakTimeoutMs;
    }

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
    const fallbackSkills = this.skills
      ? `${this.skills}\n\n## Mode Instructions\n${modeInstructions}`
      : `## Mode Instructions\n${modeInstructions}`;

    // Initialize the per-session workdir and persist each agent's
    // resolved skill bundle. Non-fatal on failure so a broken FS
    // never blocks a deliberation.
    if (this.workdir) {
      try {
        await this.workdir.init();
        if (this.perAgentSkills) {
          await this.workdir.writeSkills(this.perAgentSkills);
        }
      } catch (err) {
        console.error('[EDAOrchestrator] workdir init failed:', err);
      }
    }

    // Start each listener with its own composed skill+workspace bundle.
    // Per-agent skills override the shared fallback; workspace info tells
    // the agent where it can scratch files and where consensus artifacts
    // live, which matters when the provider routes to Claude Code (tools
    // enabled) vs. a pure-chat provider (prompt-only).
    for (const [agentId, listener] of this.agentListeners) {
      const agentSkillLayer = this.perAgentSkills?.get(agentId);
      const composedSkills = this.composeAgentSkills(
        agentId,
        agentSkillLayer,
        modeInstructions,
        fallbackSkills
      );
      listener.start(this.session.config, this.context, composedSkills);
    }

    // Load optional brief and inject the kickoff system message. Then,
    // when `autoRunPhaseMachine` is enabled, hand off to the deterministic
    // phase executor (Discovery → Synthesis → Drafting → Finalization).
    setTimeout(async () => {
      if (this.isStopped) return;

      let briefContent = '';
      const briefName = (this.session.config as { briefName?: string }).briefName
        ?? this.session.config.projectName
          ?.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      if (briefName) {
        try {
          const brief = await this.readBrief(briefName);
          if (brief) {
            briefContent = `\n\n**📋 Project Brief:**\n${brief.slice(0, 1500)}...`;
          }
        } catch {
          // No brief available for this project — continue without one
        }
      }

      const promptMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `📢 **SESSION STARTED**

Goal: ${this.session.config.goal}
${briefContent}

We will work through three phases: Discovery (share perspectives), Synthesis (agree on structure), Drafting (produce the final deliverable, one section at a time).`,
      };
      this.bus.addMessage(promptMessage, 'system');

      if (this.autoRunPhaseMachine && !this.phaseMachineStarted) {
        this.phaseMachineStarted = true;
        this.runPhaseMachine().catch((err) => {
          console.error('[EDAOrchestrator] Phase machine error:', err);
        });
      }
    }, 1000);

    // Periodic synthesis is only used by the legacy (Electron, API-key)
    // code path. The phase machine owns synthesis when enabled, so skip
    // the interval to avoid noisy auth errors from generateRoundSynthesis
    // when no API key is configured.
    if (!this.autoRunPhaseMachine) {
      this.synthesisInterval = setInterval(() => {
        this.checkForSynthesis();
      }, 30000);
    }

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

        // Persist per-agent message log + consensus artifacts. Both are
        // best-effort — FS failures get logged but must never crash the
        // deliberation loop.
        if (this.workdir && payload.fromAgent !== 'system') {
          void this.workdir
            .appendAgentMessage(payload.message)
            .catch((err) => console.error('[workdir] appendAgentMessage failed:', err));
          this.maybeCaptureConsensus(payload.message).catch((err) =>
            console.error('[workdir] recordConsensus failed:', err)
          );
        }

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
          evaluationDebounce: 800 + Math.random() * 400,
          // Orchestrator drives turn-taking via rolling round-robin —
          // disable autonomous per-message evaluation to prevent N*Opus
          // calls per incoming message and unbounded memory growth.
          skipAutonomousEval: true,
        },
        this.agentRunner,
        this.providers,
        (id) => this.getAgentConfig(id),
        (id) => this.resolveAgentSkills(id)
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
   * Process mode interventions (goal reminders, loop detection, phase transitions).
   *
   * Two guards prevent the ModeController from feedback-looping on its own
   * output:
   *
   * 1. System messages are NOT fed back into processMessage — otherwise the
   *    controller sees its own injected system messages, counts them toward
   *    thresholds, and fires more interventions.
   *
   * 2. When `autoRunPhaseMachine` is true, the phase machine owns flow
   *    control (phase transitions, drafting, termination). ModeController
   *    interventions are STILL tracked for stats but NOT injected into the
   *    bus as system messages — that would confuse agents and the phase
   *    machine, and cause exactly the "LOOP DETECTED" / "SYNTHESIS REQUIRED"
   *    spam that tanked the last run. External observers (UI, tests) still
   *    get the `intervention` event for visibility.
   */
  private processModeInterventions(message: Message): void {
    if (message.agentId === 'system') return;

    const interventions = this.modeController.processMessage(message, this.session.messages);

    for (const intervention of interventions) {
      let content = intervention.message;
      if (content.includes('{goal}')) {
        content = content.replace('{goal}', this.session.config.goal);
      }

      // Always emit the event for external observers
      this.emit('intervention', {
        type: intervention.type,
        message: content,
        priority: intervention.priority,
        action: intervention.action,
      });

      // When the phase machine is driving, don't inject interventions as
      // system messages — they feedback-loop and confuse the executor.
      if (this.autoRunPhaseMachine) {
        continue;
      }

      // Legacy / manual-flow path: inject the intervention into the bus
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
      setTimeout(() => {
        this.bus.addMessage(interventionMessage, 'system');
      }, 500);
      console.log(
        `[EDAOrchestrator] Mode intervention: ${intervention.type} (${intervention.priority})`,
      );
    }
  }

  /**
   * Check for research requests in message
   */
  private checkForResearchRequests(message: Message): void {
    const content = message.content;

    // Pattern: @researcher-id: query
    // context-finder is the local-project introspection researcher;
    // local-context is kept as a legacy alias for backwards compatibility.
    const mentionPattern = /@(stats-finder|competitor-analyst|audience-insight|copy-explorer|context-finder|local-context)[:\s]+["']?([^"'\n]+?)["']?(?:\n|$)/gi;
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      let researcherId = match[1].toLowerCase();
      // Legacy alias: local-context was renamed to context-finder when we
      // dropped locale-specific researchers.
      if (researcherId === 'local-context') researcherId = 'context-finder';
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
   * Process a research request - HALTS discussion until complete.
   * Serialized: if a research request is already in-flight, subsequent
   * requests are silently dropped for this message — they'd compound into
   * parallel filesystem walks and crash the process.
   */
  private async processResearchRequest(
    researcherId: string,
    query: string,
    requestedBy: string
  ): Promise<void> {
    const researcher = getResearcherById(researcherId);
    if (!researcher) return;
    if (this.researchPending) {
      console.log(
        `[EDAOrchestrator] Research already pending, dropping new request from ${requestedBy}`,
      );
      return;
    }

    // HALT the discussion
    this.researchPending = true;
    this.bus.pause('Research in progress');
    this.emit('research_halt', { researcherId, query, requestedBy });

    // Emit message:research event to MessageBus subscribers (per MessageBus.ts event spec)
    this.bus.emit('message:research', { request: { researcherId, query }, fromAgent: requestedBy });

    // Announce research halt
    const lang = this.session.config.language;
    const isHebrew = lang === 'hebrew';
    const announceMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: isHebrew
        ? `🔍 **הדיון נעצר לצורך מחקר**

**חוקר:** ${researcher.name}
**בקשה:** "${query}"
**מבקש:** ${this.getAgentName(requestedBy)}

⏳ מחפש מידע... הסוכנים ממתינים.`
        : `🔍 **Research in progress — discussion paused**

**Researcher:** ${researcher.name}
**Query:** "${query}"
**Requested by:** ${this.getAgentName(requestedBy)}

⏳ Looking up information... agents waiting.`,
    };
    this.bus.addMessage(announceMessage, 'system');

    try {
      // Route: context-finder reads the local project via ProjectIntrospector,
      // everything else goes through Claude's web search.
      const result =
        researcher.id === 'context-finder'
          ? await this.runLocalContextResearch(researcher, query)
          : await this.runResearchWithWebSearch(researcher, query);

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
        content: isHebrew
          ? `✅ **מחקר הושלם - הדיון ממשיך**\n\nהסוכנים יכולים כעת להתייחס לממצאים.`
          : `✅ **Research complete — resuming discussion**\n\nAgents can now respond to the findings.`,
      };
      this.bus.addMessage(resumeMessage, 'system');

    } catch (error) {
      console.error('[EDAOrchestrator] Research error:', error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: isHebrew
          ? `❌ **שגיאה במחקר:** ${error}\n\nהדיון ממשיך ללא תוצאות המחקר.`
          : `❌ **Research error:** ${error}\n\nDiscussion continues without research results.`,
      };
      this.bus.addMessage(errorMessage, 'system');
    }

    // RESUME the discussion
    this.researchPending = false;
    this.bus.resume();
  }

  /**
   * Run research by introspecting the local project directory. Powered by
   * `ProjectIntrospector` — walks `session.config.contextDir`, finds files
   * matching the query, and asks the agent runner to answer from the code
   * itself. Result is returned as plain markdown so it drops into the
   * research_result message exactly like web-search results do.
   */
  private async runLocalContextResearch(
    researcher: { id: string; name: string },
    query: string,
  ): Promise<string> {
    if (!this.agentRunner) {
      return `**${researcher.name}:** Cannot introspect project — no agent runner configured.`;
    }
    const projectDir = this.session.config.contextDir;
    if (!projectDir) {
      return `**${researcher.name}:** No contextDir configured on the session — cannot read project.`;
    }

    const result = await introspectProject({
      projectDir,
      query,
      runner: this.agentRunner,
    });

    const fileList =
      result.filesRead.length > 0
        ? `\n\n**📁 Files read (${result.filesRead.length}):**\n${result.filesRead
            .slice(0, 12)
            .map((p) => `- \`${p}\``)
            .join('\n')}${result.filesRead.length > 12 ? `\n- …and ${result.filesRead.length - 12} more` : ''}`
        : '';

    return [
      `**🔍 Local project introspection**`,
      ``,
      `**Query:** "${query}"`,
      ``,
      result.summary,
      fileList,
    ].join('\n');
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
    this.isStopped = true;

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
    if (!agent) return agentId;
    // Only append the Hebrew name when the session language is Hebrew.
    return this.session.config.language === 'hebrew'
      ? `${agent.name} (${agent.nameHe})`
      : agent.name;
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

  // ===========================================================================
  // PHASE EXECUTOR — deterministic Discovery → Synthesis → Drafting → Final
  // ===========================================================================

  /**
   * Run the deterministic phase machine that produces a complete deliverable.
   * Discovery and Synthesis each do one round-robin pass; Drafting does one
   * agent per required section (parsed from the goal). Each turn uses
   * `AgentListener.speakNow()` which bypasses FloorManager queueing and
   * resolves with the produced Message — so the loop is fully awaitable.
   */
  private async runPhaseMachine(): Promise<void> {
    if (this.isStopped) return;

    const sections = parseGoalSections(this.session.config.goal);
    const agentIds = Array.from(this.agentListeners.keys());

    if (agentIds.length === 0) {
      console.warn('[EDAOrchestrator] PhaseMachine: no agents available');
      return;
    }

    console.log(
      `[EDAOrchestrator] PhaseMachine starting — ${agentIds.length} agents, ${sections.length} sections`,
    );

    await this.runDiscoveryPhase(agentIds);
    if (this.isStopped) return;

    await this.runResearchPhase(agentIds);
    if (this.isStopped) return;

    const synthesisSummary = await this.runSynthesisPhase(agentIds);
    if (this.isStopped) return;

    await this.runDraftingPhase(agentIds, sections, synthesisSummary);
    if (this.isStopped) return;

    await this.finalizeByMachine(sections);
  }

  /**
   * Discovery: each enabled agent shares their initial perspective once.
   */
  private async runDiscoveryPhase(agentIds: string[]): Promise<void> {
    this.currentPhase = 'brainstorming';
    this.emit('phase_change', { phase: 'brainstorming' });
    this.modeController.transitionToPhase('discovery');

    this.pushSystemMessage(
      `🔎 **PHASE 1/4: DISCOVERY**\n\n` +
        `Each agent: share your initial perspective on the goal in 2–3 short paragraphs. ` +
        `What's your first instinct? What concerns you? What opportunity do you see? ` +
        `Do NOT draft the final deliverable yet — we'll do that in Phase 4.`,
    );

    for (const agentId of agentIds) {
      if (this.isStopped) return;
      await this.forceSpeakAndWait(agentId, 'Discovery: initial perspective');
    }
  }

  /**
   * Research: each agent gets one chance to invoke @context-finder (or
   * another researcher) to ground themselves in the project. Unlike
   * Discovery, only ONE round-robin happens — if an agent doesn't need
   * research, they're told to say "[PASS] no research needed" and the
   * next agent goes. Research requests halt deliberation via the existing
   * `processResearchRequest` pause/resume path.
   */
  private async runResearchPhase(agentIds: string[]): Promise<void> {
    if (this.isStopped) return;
    this.currentPhase = 'research';
    this.emit('phase_change', { phase: 'research' });
    this.modeController.transitionToPhase('research');

    const hasContextDir = !!this.session.config.contextDir;
    const contextDirHint = hasContextDir
      ? `The session has a local project at \`${this.session.config.contextDir}\` that you can introspect.`
      : `No local project is attached to this session — skip project introspection and pass.`;

    this.pushSystemMessage(
      `🔍 **PHASE 2/4: RESEARCH**\n\n` +
        `${contextDirHint}\n\n` +
        `To invoke a researcher, emit a research block (this is the ONLY trigger — bare mentions of researcher names in prose are ignored):\n\n` +
        `\`\`\`\n[RESEARCH: context-finder]\nWhat deliberation modes are defined in src/lib/modes/? List each mode's id, name, and phase structure.\n[/RESEARCH]\n\`\`\`\n\n` +
        `**Available researchers:**\n` +
        `- \`context-finder\` — reads files in the local project directory and answers grounded in the source code. Use this to discover what the project actually does.\n` +
        `- \`stats-finder\` — web search for statistics.\n` +
        `- \`competitor-analyst\` — web search for competitor analysis.\n` +
        `- \`audience-insight\` — web search for audience/user pain points.\n` +
        `- \`copy-explorer\` — web search for exemplary copy patterns.\n\n` +
        `**Rules:**\n` +
        `- Each agent emits ONE research block and waits for the answer. No more than one per turn.\n` +
        `- If you don't need research, reply with \`[PASS] no research needed\` and the next agent goes.\n` +
        `- Keep your query specific and answerable from code/data (not "is Forge good?" but "what modes exist in src/lib/modes/?").`,
    );

    for (const agentId of agentIds) {
      if (this.isStopped) return;
      await this.forceSpeakAndWait(agentId, 'Research: ask one grounded question');
      // Research requests are fire-and-forget from the message:new handler
      // — wait for any pending introspection to complete before moving on,
      // so the next agent sees the answer in the shared bus context.
      await this.waitForResearchComplete();
    }
  }

  /**
   * Poll until `researchPending` clears or the timeout hits. Used by the
   * research phase to serialize research turns (the processResearchRequest
   * path is fire-and-forget from the message bus subscriber).
   */
  private async waitForResearchComplete(timeoutMs = 180_000): Promise<void> {
    const start = Date.now();
    while (this.researchPending && Date.now() - start < timeoutMs) {
      if (this.isStopped) return;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  /**
   * Synthesis: each agent proposes structure and key messages. Returns a
   * concise summary string (used as context in the drafting phase).
   */
  private async runSynthesisPhase(agentIds: string[]): Promise<string> {
    if (this.isStopped) return '';
    this.currentPhase = 'synthesis';
    this.emit('phase_change', { phase: 'synthesis' });
    this.modeController.transitionToPhase('synthesis');

    this.pushSystemMessage(
      `🧭 **PHASE 3/4: SYNTHESIS**\n\n` +
        `Each agent: propose the structure, tone, and key messages for the final deliverable. ` +
        `Reference what the others said in Discovery AND what was found in Research. ` +
        `Still no drafting — just align on what we're going to write.`,
    );

    const synthesisMessages: Message[] = [];
    for (const agentId of agentIds) {
      if (this.isStopped) return '';
      const msg = await this.forceSpeakAndWait(agentId, 'Synthesis: propose structure');
      if (msg) synthesisMessages.push(msg);
    }

    return synthesisMessages
      .map((m) => `[${m.agentId}]: ${m.content.slice(0, 800)}`)
      .join('\n\n');
  }

  /**
   * Drafting: one agent per required section. Each turn gets a bounded,
   * focused context (goal + synthesis summary + already-drafted sections)
   * and an instruction to emit ONLY the `## <SECTION_NAME>` block.
   */
  private async runDraftingPhase(
    agentIds: string[],
    sections: RequiredSection[],
    synthesisSummary: string,
  ): Promise<void> {
    if (this.isStopped) return;
    this.currentPhase = 'drafting';
    this.emit('phase_change', { phase: 'drafting' });
    this.modeController.transitionToPhase('drafting');

    this.pushSystemMessage(
      `✍️ **PHASE 4/4: DRAFTING** — ${sections.length} sections\n\n` +
        `We will now draft the final deliverable one section at a time. ` +
        `For each section, the assigned agent writes ONLY that section. ` +
        `Output MUST start with \`## <SECTION_NAME>\` on its own line and contain the full, finished copy — no meta-commentary, no evidence notes, no questions to the team.\n\n` +
        `**GROUNDING RULE (strict):** You may ONLY name features, modes, commands, files, or technical claims that were explicitly verified during the Research phase. If Research found the mode is called \`copywrite\`, you write "Copywrite" — NOT "Architecture Review" or "Copywriting Assistant" or any other plausible-sounding name you might prefer. If Research did not cover a feature, omit it entirely rather than inventing it. Plausible-sounding fabrications (made-up commands, made-up modes, made-up flag names) are the single biggest failure mode — do not commit them.\n\n` +
        `**Concreteness rule:** every section that describes capability or value must include at least one named, specific example drawn from what Research actually found. Abstract phrasing like "complex decisions" is not acceptable — name the feature, mode, file, or scenario that Research returned. Hero and Footer are exempt from the concreteness rule but NOT from the grounding rule.`,
    );

    // Build drafting state with per-section agent assignment
    this.copySections = sections.map((s, i) => ({
      id: s.id,
      name: s.name,
      nameHe: s.name,
      status: 'pending' as const,
      assignedAgent: agentIds[i % agentIds.length],
    }));

    for (let i = 0; i < this.copySections.length; i++) {
      if (this.isStopped) return;
      const section = this.copySections[i];
      section.status = 'in_progress';
      this.emit('draft_section', { section, sectionIndex: i });

      const alreadyDrafted = this.copySections
        .filter((s) => s.content && s.content.length > 0)
        .map((s) => `## ${s.name}\n${s.content}`)
        .join('\n\n');

      const exemptFromExamples =
        section.id === 'hero' || section.id === 'footer' || section.id === 'final_cta';

      // Pull every research_result message from the bus — this is the
      // authoritative "ground truth" the agents discovered about the subject.
      // It's the ONLY material the drafting agent is allowed to cite for
      // technical/feature claims.
      const researchFindings = this.bus
        .getAllMessages()
        .filter((m) => m.type === 'research_result')
        .map((m) => m.content)
        .join('\n\n---\n\n')
        .slice(0, 6000);

      const draftContext = [
        `## GOAL`,
        this.session.config.goal.slice(0, 2000),
        ``,
        researchFindings
          ? `## RESEARCH FINDINGS (authoritative — cite ONLY from here for technical facts)\n\n${researchFindings}`
          : `## RESEARCH FINDINGS\n\n_(no research was conducted — do not make specific technical claims)_`,
        ``,
        `## SYNTHESIS (what the team agreed on)`,
        synthesisSummary.slice(0, 2000),
        alreadyDrafted
          ? `\n## ALREADY DRAFTED (for reference — do NOT rewrite these)\n\n${alreadyDrafted.slice(0, 2500)}`
          : '',
        ``,
        `## YOUR TASK`,
        `Draft ONLY the **${section.name}** section (section ${i + 1} of ${this.copySections.length}).`,
        ``,
        `Requirements:`,
        `- Start your response with: \`## ${section.name}\``,
        `- Follow with the FULL, finished copy for this section — ready to ship.`,
        `- No meta-commentary, no outlines, no evidence notes, no "here is my draft" preambles, no questions to the team.`,
        `- **GROUNDING RULE (strict):** every feature, mode name, command, file, or technical claim in this section MUST appear verbatim (or as a direct paraphrase) in the RESEARCH FINDINGS above. If Research says the mode is \`copywrite\`, write "Copywrite" — NOT "Copywriting Assistant". If Research didn't cover something, do not mention it. Plausible-sounding fabrications are forbidden.`,
        exemptFromExamples
          ? `- This section is short-form — no example needed, just punchy copy grounded in Research.`
          : `- **Concreteness rule:** include at least one named, specific example drawn from Research. Name the user ("a 20-person eng team choosing between monolith and microservices"), the decision, or the workflow. The example must be consistent with what Research actually returned — don't invent scenarios.`,
        `- Keep it concise but complete — the reader should not need a second pass.`,
      ]
        .filter(Boolean)
        .join('\n');

      const msg = await this.forceSpeakAndWait(
        section.assignedAgent!,
        `Drafting: ${section.name}`,
        draftContext,
      );

      if (msg) {
        const extracted = extractSection(msg.content, section.name);
        section.content = (extracted || msg.content).trim();
      } else {
        section.content = `## ${section.name}\n\n_(agent did not respond in time)_`;
      }
      section.status = 'complete';
    }
  }

  /**
   * Finalize: emit consolidated draft, push completion system message, and
   * signal `session:end` so the CLI / test harness exits cleanly.
   */
  private async finalizeByMachine(sections: RequiredSection[]): Promise<void> {
    if (this.isStopped) return;
    this.currentPhase = 'finalization';
    this.emit('phase_change', { phase: 'finalization' });

    const draft = await this.getConsolidatedDraft();
    const completed = this.copySections.filter(
      (s) => s.content && !s.content.includes('_(agent did not respond in time)_'),
    ).length;

    this.pushSystemMessage(
      `🎉 **DRAFTING COMPLETE** — ${completed}/${sections.length} sections\n\n${draft}`,
    );

    this.bus.emit('session:end', {
      reason: `completed:${completed}/${sections.length}`,
    });
  }

  /**
   * Drive one agent to speak with an optional focused context, waiting up to
   * `speakTimeoutMs` for the message. Returns the produced Message or null.
   */
  private async forceSpeakAndWait(
    agentId: string,
    reason: string,
    contextOverride?: string,
  ): Promise<Message | null> {
    const listener = this.agentListeners.get(agentId);
    if (!listener) {
      console.warn(`[EDAOrchestrator] forceSpeakAndWait: ${agentId} not found`);
      return null;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), this.speakTimeoutMs);
    });

    try {
      const result = await Promise.race([
        listener.speakNow(reason, contextOverride),
        timeout,
      ]);
      return result;
    } catch (err) {
      console.error(`[EDAOrchestrator] forceSpeakAndWait error for ${agentId}:`, err);
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * Inject a system message into the bus (helper for phase headers).
   */
  private pushSystemMessage(content: string): void {
    const msg: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content,
    };
    this.bus.addMessage(msg, 'system');
  }

  /**
   * Force an agent to speak (bypass normal floor request) — legacy API used
   * by manual transition methods (transitionToArgumentation/Synthesis/Drafting).
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

  // ─── Per-agent runtime control ───────────────────────────────────────

  /**
   * Read the current runtime config for an agent. When no provider
   * registry is configured (legacy path) returns a harmless default so
   * the UI can still render a row.
   */
  getAgentConfig(agentId: string): AgentRuntimeConfig {
    const existing = this.agentConfigs.get(agentId);
    if (existing) return existing;
    const fallback: AgentRuntimeConfig = this.providers
      ? {
          providerId: this.providers.getDefault().id,
          modelId: this.providers.getDefault().defaultModelId(),
        }
      : { providerId: 'anthropic', modelId: 'claude-sonnet-4-20250514' };
    this.agentConfigs.set(agentId, fallback);
    return fallback;
  }

  /** Snapshot of all agent configs — used by the control panel. */
  getAllAgentConfigs(): ReadonlyMap<string, AgentRuntimeConfig> {
    for (const id of this.session.config.enabledAgents) this.getAgentConfig(id);
    return this.agentConfigs;
  }

  /**
   * Mutate an agent's runtime config. Emits `agent_config_change` so the
   * UI can re-render. The next `query`/`evaluate` call will pick up the
   * change since listeners resolve config on each call.
   */
  updateAgentConfig(agentId: string, patch: Partial<AgentRuntimeConfig>): AgentRuntimeConfig {
    const current = this.getAgentConfig(agentId);
    const next: AgentRuntimeConfig = { ...current, ...patch };
    this.agentConfigs.set(agentId, next);
    this.emit('agent_config_change', { agentId, config: next });
    return next;
  }

  /** Provider registry accessor for the UI. */
  getProviders(): ProviderRegistry | undefined {
    return this.providers;
  }

  /**
   * Force an agent to take the floor and speak on the current context.
   * Returns null if the agent isn't registered or is mid-flight.
   */
  async forceSpeak(agentId: string, reason = 'operator prompt'): Promise<Message | null> {
    const listener = this.agentListeners.get(agentId);
    if (!listener) return null;
    return listener.speakNow(reason);
  }

  /**
   * Inject an ad-hoc system prompt into an agent's next response. Stored
   * on the runtime config and cleared after one use by the UI.
   */
  injectSystemSuffix(agentId: string, suffix: string): void {
    this.updateAgentConfig(agentId, { systemSuffix: suffix });
  }

  // ─── Hard consensus gate ─────────────────────────────────────────────
  //
  // Opt-in check an external caller can use to decide whether the
  // session is allowed to move into Finalization / Drafting / shipping.
  // Mirrors Octopus's 75% consensus gate. Returns the actual consensus
  // ratio (supportRatio averaged across tracked insights) plus a pass/
  // fail verdict at the supplied threshold.

  /**
   * Ratio of tracked insights whose support meets or exceeds
   * consensusThreshold · a lightweight proxy for "how much does the
   * room agree". Returns 0 when no insights are tracked yet.
   */
  getConsensusRatio(): number {
    const insights = Array.from(this.keyInsights.values());
    if (insights.length === 0) return 0;
    const enabledAgents = this.session.config.enabledAgents;
    const humanWeight = 2;
    const totalWeight =
      enabledAgents.length +
      (this.agentContributions.has('human') ? humanWeight : 0);
    let agreed = 0;
    for (const insight of insights) {
      let sup = insight.supporters.size;
      if (insight.supporters.has('human')) sup += humanWeight - 1;
      if (sup / totalWeight >= this.consensusThreshold) agreed++;
    }
    return agreed / insights.length;
  }

  /**
   * Hard gate · true when the deliberation has reached the supplied
   * consensus ratio (default 0.75 to match Octopus). Callers can use
   * this to block shipping, advance a phase, or prompt the operator.
   */
  isConsensusReached(threshold = 0.75): boolean {
    return this.getConsensusRatio() >= threshold;
  }

  // ─── Skills + workdir helpers ────────────────────────────────────────

  /**
   * Build the full skill+workspace bundle for a single agent. Shape:
   *
   *   <agent-specific skills or fallback>
   *   ---
   *   ## Mode Instructions
   *   <mode instructions>
   *   ---
   *   ## Session Workspace
   *   - Agent workdir: <path>
   *   - Consensus dir: <path>
   *   - Tag synthesized/agreed content with [CONSENSUS] or [SYNTHESIS]
   *     so the orchestrator captures it into the consensus dir.
   */
  private composeAgentSkills(
    agentId: string,
    agentSkillLayer: string | undefined,
    modeInstructions: string,
    fallbackSkills: string
  ): string {
    const parts: string[] = [];
    if (agentSkillLayer && agentSkillLayer.trim()) {
      parts.push(agentSkillLayer.trim());
      parts.push(`## Mode Instructions\n${modeInstructions}`);
    } else {
      parts.push(fallbackSkills);
    }

    if (this.workdir) {
      const paths = this.workdir.getAgentPaths(agentId);
      const consensusDir = this.workdir.getConsensusDir();
      parts.push(
        [
          '## Session Workspace',
          paths ? `- Your workdir: ${paths.dir}` : null,
          paths ? `- Scratch notes dir: ${paths.notesDir}` : null,
          `- Consensus dir: ${consensusDir}`,
          '- When the group agrees on a concrete deliverable, tag your',
          '  message with [CONSENSUS] or [SYNTHESIS] and the orchestrator',
          '  will save it as a consensus artifact automatically.',
        ]
          .filter(Boolean)
          .join('\n')
      );
    }

    return parts.join('\n\n---\n\n');
  }

  /**
   * If a message looks like consensus material, record it. The signal
   * is either the `[CONSENSUS]` / `[SYNTHESIS]` type-tag convention
   * the agents use, or a Message with `type === 'synthesis'` which is
   * the canonical consensus type in the bus.
   */
  private async maybeCaptureConsensus(message: Message): Promise<void> {
    if (!this.workdir) return;
    const tagMatch = /\[(CONSENSUS|SYNTHESIS)\]/i.exec(message.content);
    const isConsensus =
      message.type === 'synthesis' || message.type === 'consensus' || tagMatch !== null;
    if (!isConsensus) return;

    const reason = tagMatch ? `tag ${tagMatch[0]}` : `message.type=${message.type}`;
    await this.workdir.recordConsensus(message, {
      phaseId: this.modeController.getProgress().currentPhase,
      reason,
    });
  }

  /**
   * Exposes the workdir manager so the UI can show the consensus dir
   * path in the header or an "Artifacts" pane.
   */
  getWorkdir(): WorkdirManager | undefined {
    return this.workdir;
  }

  // ─── Live skill control ──────────────────────────────────────────────

  /** Skill catalog exposed to the UI skill picker. */
  getSkillCatalog(): SkillCatalog | undefined {
    return this.skillCatalog;
  }

  /**
   * IDs currently applied to an agent. If the operator has set
   * overrides, those win; otherwise we infer from which catalog
   * entries appear in the agent's init-time bundle.
   */
  getAgentSkillIds(agentId: string): string[] {
    const override = this.agentSkillOverrides.get(agentId);
    if (override) return [...override];
    if (!this.skillCatalog) return [];
    const bundle = this.perAgentSkills?.get(agentId) ?? '';
    if (!bundle.trim()) return [];
    // Best-effort: match any catalog entry whose content appears in
    // the init bundle. Matches are substring so ordering doesn't matter.
    return this.skillCatalog.entries
      .filter((e) => e.content.trim() && bundle.includes(e.content.trim()))
      .map((e) => e.id);
  }

  /**
   * Replace an agent's applied skill IDs. Emits `agent_skills_change`
   * so the TUI can re-render; the next query picks up the new bundle
   * via the resolver wired into AgentListener.
   */
  setAgentSkillIds(agentId: string, skillIds: ReadonlyArray<string>): void {
    this.agentSkillOverrides.set(agentId, [...skillIds]);
    this.emit('agent_skills_change', { agentId, skillIds: [...skillIds] });
  }

  /** Toggle a single skill on/off for an agent. */
  toggleAgentSkill(agentId: string, skillId: string): void {
    const current = this.getAgentSkillIds(agentId);
    const next = current.includes(skillId)
      ? current.filter((id) => id !== skillId)
      : [...current, skillId];
    this.setAgentSkillIds(agentId, next);
  }

  /**
   * Compose the active skill bundle for an agent. Invoked by the
   * listener resolver on every query — cheap by design since it just
   * looks up strings the catalog already cached in memory.
   */
  resolveAgentSkills(agentId: string): string | undefined {
    const override = this.agentSkillOverrides.get(agentId);
    if (override && this.skillCatalog) {
      const pieces = override
        .map((id) => this.skillCatalog!.get(id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map((e) => e.content.trim())
        .filter(Boolean);
      return pieces.join('\n\n---\n\n');
    }
    return this.perAgentSkills?.get(agentId);
  }
}
