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
import { extractWireframe, getLeafSections } from '../../../cli/lib/wireframe';
import type { WireframeNode } from '../../../cli/lib/wireframe';
import type { CanvasConsensusPhase } from '../../../cli/lib/wireframe-store';
import { ResonanceMonitor } from './ResonanceMonitor';
import type { ResonanceState } from './ResonanceMonitor';

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
  | 'canvas_update'
  | 'resonance_update';

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
  private phaseStartMessageIndex = 0; // Track when current phase started
  private copySections: CopySection[] = [];

  // Consensus tracking
  private agentContributions: Map<string, number> = new Map();
  private keyInsights: Map<string, { content: string; supporters: Set<string>; opposers: Set<string> }> = new Map();
  private consensusThreshold = 0.6; // 60% agreement needed

  // Auto-moderator: message count thresholds per phase
  private autoModeratorEnabled = true;
  private moderatorNudgeSent = false; // Track if we already nudged in this phase
  private static readonly BRAINSTORMING_MAX = 36;      // Max messages before auto-transition to argumentation
  private static readonly ARGUMENTATION_NUDGE = 15;    // Nudge toward synthesis after this many messages
  private static readonly ARGUMENTATION_FORCE = 25;    // Force synthesis after this many messages
  private static readonly SYNTHESIS_MAX = 15;           // Max messages before auto-transition to drafting
  private static readonly DRAFTING_MAX = 20;            // Max messages before auto-finalization

  // Research state (used for tracking pending research)
  private researchPending = false;

  // Canvas consensus state (per-agent wireframe tracking)
  private wireframeProposals: Map<string, { agentId: string; agentName: string; wireframe: WireframeNode; timestamp: number; messageIndex: number }> = new Map();
  private canvasConsensusPhase: CanvasConsensusPhase = 'idle';
  private wireframeProposalPromptSent = false;
  private critiqueStartIndex = 0;
  private canvasCritiques: Map<string, Array<{ action: string; section: string; reason: string }>> = new Map();

  // Dependency injection
  private agentRunner: IAgentRunner | undefined;
  private fileSystem: IFileSystem | undefined;

  // Mode controller for goal anchoring and loop detection
  private modeController: ModeController;
  private resonanceMonitor: ResonanceMonitor;

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

    // Initialize resonance monitor
    this.resonanceMonitor = new ResonanceMonitor(session.config.enabledAgents);
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
          briefContent = `\n\n**Project Brief:**\n${brief.slice(0, 1500)}...`;
        }
      } catch {
        // No brief available
      }

      // Load cross-session memory (relevant past insights)
      if (this.fileSystem) {
        try {
          // Dynamic import — cli adapters may not be available in browser/Electron
          // Use variable to prevent Vite/Rollup from resolving the dynamic import
          const crossSessionPath = '../../cli/adapters/CrossSessionMemory';
          const mod = await import(/* @vite-ignore */ crossSessionPath) as any;
          const crossMemory = new mod.CrossSessionMemory(this.fileSystem);
          const pastContext = await crossMemory.getRelevantPastContext(
            this.session.config.projectName,
            this.session.config.goal
          );
          if (pastContext) {
            // Inject past context as a separate system message
            const pastContextMsg: Message = {
              id: crypto.randomUUID(),
              timestamp: new Date(),
              agentId: 'system',
              type: 'system',
              content: pastContext.summary,
              metadata: { source: 'cross-session-memory' },
            };
            this.bus.addMessage(pastContextMsg, 'system');
          }
        } catch {
          // Cross-session memory not available (browser/Electron or first session)
        }
      }

      const promptMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `**DISCUSSION STARTS NOW**

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

    this.currentPhase = 'brainstorming';
    this.session.currentPhase = 'brainstorming';
    this.phaseStartMessageIndex = this.session.messages.length;
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
          this.trackWireframeFromMessage(payload.fromAgent, payload.message);
        }

        // Check for typing indicator
        const agent = getAgentById(payload.fromAgent);
        if (agent) {
          this.emit('agent_typing', { agentId: payload.fromAgent, typing: false });
        }

        this.emit('agent_message', { agentId: payload.fromAgent, message: payload.message });

        // Only process agent/human messages for research, interventions, and phase transitions
        if (payload.fromAgent !== 'system') {
          this.checkForResearchRequests(payload.message);
          this.processModeInterventions(payload.message);

          // Process resonance and emit update
          this.processResonance(payload.message);

          // Auto-complete draft sections when assigned agent sends a message during drafting
          if (this.currentPhase === 'drafting') {
            this.autoCompleteDraftSection(payload.fromAgent, payload.message);
          }
          // Check phase transitions on every agent message (don't wait for 30s timer)
          this.checkAutoTransition();
        }
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
      this.bus.subscribe('floor:request', (_payload) => {
      }, 'orchestrator')
    );
  }

  /**
   * Create agent listeners for all enabled agents
   */
  private createAgentListeners(): void {
    for (const agentId of this.session.config.enabledAgents) {
      const agent = getAgentById(agentId);
      if (!agent) {
        continue;
      }

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
    let responseType = typeMatch ? typeMatch[1].toUpperCase() : null;

    // Detect implicit agreement/disagreement from natural language when no tag present
    if (!responseType) {
      const lower = content.toLowerCase();
      const agreeSignals = ['i agree', 'great point', 'exactly', 'well said', 'support this', 'builds on', '+1', 'absolutely', 'i second'];
      const disagreeSignals = ['i disagree', 'however', 'but i think', 'on the contrary', 'i challenge', 'pushback', 'not sure about', 'counterpoint'];
      const proposalSignals = ['i propose', 'i suggest', 'how about', 'what if we', 'my recommendation', 'let\'s consider'];
      if (agreeSignals.some(s => lower.includes(s))) responseType = 'AGREEMENT';
      else if (disagreeSignals.some(s => lower.includes(s))) responseType = 'DISAGREEMENT';
      else if (proposalSignals.some(s => lower.includes(s))) responseType = 'PROPOSAL';
    }

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
   * Track wireframe proposals per agent and parse canvas critique tags
   */
  private trackWireframeFromMessage(agentId: string, message: Message): void {
    const content = message.content;

    // Extract [WIREFRAME] block
    const proposed = extractWireframe(content);
    if (proposed) {
      const agent = getAgentById(agentId);
      this.wireframeProposals.set(agentId, {
        agentId,
        agentName: agent?.name || agentId,
        wireframe: proposed,
        timestamp: Date.now(),
        messageIndex: this.session.messages.length - 1,
      });
      this.emit('canvas_update', {
        agentId,
        phase: this.canvasConsensusPhase,
        proposalCount: this.wireframeProposals.size,
      });
    }

    // Parse [CANVAS_CRITIQUE] tags
    const critiquePattern = /\[CANVAS_CRITIQUE:(KEEP|REMOVE|MODIFY)\]\s*(\S+(?:\s+\S+)*?)\s*[-—]\s*(.+)/gi;
    let match: RegExpExecArray | null;
    const critiques: Array<{ action: string; section: string; reason: string }> = [];
    while ((match = critiquePattern.exec(content)) !== null) {
      critiques.push({
        action: match[1].toUpperCase(),
        section: match[2].trim(),
        reason: match[3].trim(),
      });
    }
    if (critiques.length > 0) {
      this.canvasCritiques.set(agentId, critiques);
    }
  }

  /**
   * Step 1: Ask all agents to propose wireframes
   */
  private triggerWireframeProposals(): void {
    this.canvasConsensusPhase = 'proposing';
    this.wireframeProposalPromptSent = true;

    const proposalMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🎨 **CANVAS ROUND: Wireframe Proposals**

Each agent should now propose a page structure using a [WIREFRAME] block.

**Guidelines:**
- Include all sections you think the page needs
- Use the standard wireframe syntax (navbar, sections, footer, etc.)
- Think about user journey from top to bottom
- Consider mobile stacking order

**Every agent must include a [WIREFRAME] block in their next response.**`,
    };
    this.bus.addMessage(proposalMessage, 'system');

    this.emit('canvas_update', { phase: 'proposing', proposalCount: 0 });

    // Force each agent to speak with staggered timing
    const enabledAgents = this.session.config.enabledAgents;
    enabledAgents.forEach((agentId, index) => {
      setTimeout(() => {
        this.forceAgentToSpeak(agentId, 'Canvas Round: propose your wireframe layout');
      }, 2000 + index * 1500);
    });
  }

  /**
   * Step 2: Show all proposals and ask for critique
   */
  private triggerWireframeCritique(): void {
    this.canvasConsensusPhase = 'critiquing';
    this.critiqueStartIndex = this.session.messages.length;

    // Build summary of all proposals
    const proposalSummary = Array.from(this.wireframeProposals.entries()).map(([_agentId, proposal]) => {
      const sections = getLeafSections(proposal.wireframe).map(s => s.label).join(', ');
      return `**${proposal.agentName}**: ${sections}`;
    }).join('\n');

    const critiqueMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `🔍 **CANVAS ROUND: Critique Phase**

All agents have proposed wireframes. Here are the structures:

${proposalSummary}

**Now review each other's layouts.** Use these tags:
- \`[CANVAS_CRITIQUE:KEEP] SectionName - reason\`
- \`[CANVAS_CRITIQUE:REMOVE] SectionName - reason\`
- \`[CANVAS_CRITIQUE:MODIFY] SectionName - suggestion\`

Focus on what should stay, what's redundant, and what needs changing.`,
    };
    this.bus.addMessage(critiqueMessage, 'system');

    this.emit('canvas_update', { phase: 'critiquing', proposalCount: this.wireframeProposals.size });

    // Force each agent to critique sequentially
    const enabledAgents = this.session.config.enabledAgents;
    enabledAgents.forEach((agentId, index) => {
      setTimeout(() => {
        this.forceAgentToSpeak(agentId, 'Canvas Round: critique the proposed wireframes');
      }, 2000 + index * 2000);
    });
  }

  /**
   * Step 3: Compute consensus wireframe from proposals + critiques
   * Uses section-level majority voting: sections in >50% of proposals are included
   */
  private computeCanvasConsensus(): void {
    this.canvasConsensusPhase = 'converged';

    // Collect all sections across all proposals
    const sectionVotes: Map<string, { count: number; label: string; node: WireframeNode }> = new Map();
    const totalProposals = this.wireframeProposals.size;

    for (const proposal of this.wireframeProposals.values()) {
      const leaves = getLeafSections(proposal.wireframe);
      for (const leaf of leaves) {
        const key = leaf.label.toLowerCase().replace(/\s+/g, '-');
        const existing = sectionVotes.get(key);
        if (existing) {
          existing.count++;
        } else {
          sectionVotes.set(key, { count: 1, label: leaf.label, node: leaf });
        }
      }
    }

    // Apply critique adjustments
    for (const critiques of this.canvasCritiques.values()) {
      for (const critique of critiques) {
        const key = critique.section.toLowerCase().replace(/\s+/g, '-');
        const existing = sectionVotes.get(key);
        if (existing) {
          if (critique.action === 'REMOVE') {
            existing.count = Math.max(0, existing.count - 1);
          } else if (critique.action === 'KEEP') {
            existing.count++;
          }
        }
      }
    }

    // Build consensus sections (>50% vote threshold)
    const threshold = totalProposals * 0.5;
    const consensusSections = Array.from(sectionVotes.values())
      .filter(v => v.count > threshold)
      .map(v => v.label);

    // TODO: Use consensus wireframe for canvas rendering
    // const templateProposal = this.wireframeProposals.values().next().value;
    // const consensusWireframeText = consensusSections.length > 0
    //   ? `[WIREFRAME]\n${consensusSections.map(s => `${s.toLowerCase().replace(/\s+/g, '-')}: ${s}`).join('\n')}\n[/WIREFRAME]`
    //   : null;
    // const consensusWireframe = consensusWireframeText ? extractWireframe(consensusWireframeText) : templateProposal?.wireframe;

    const consensusMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `✅ **CANVAS ROUND: Consensus Reached**

The group has converged on a wireframe structure with **${consensusSections.length} sections**:
${consensusSections.map(s => `- ${s}`).join('\n')}

${consensusSections.length > 0 ? `[WIREFRAME]\n${consensusSections.map(s => `${s.toLowerCase().replace(/\\s+/g, '-')}: ${s}`).join('\n')}\n[/WIREFRAME]` : 'Using first proposal as baseline.'}

The discussion will now continue toward argumentation.`,
    };
    this.bus.addMessage(consensusMessage, 'system');

    this.emit('canvas_update', {
      phase: 'converged',
      proposalCount: this.wireframeProposals.size,
      consensusSections,
    });
  }

  /**
   * Get all wireframe proposals (for dashboard)
   */
  getWireframeProposals(): Map<string, { agentId: string; agentName: string; wireframe: WireframeNode; timestamp: number; messageIndex: number }> {
    return new Map(this.wireframeProposals);
  }

  /**
   * Get current canvas consensus phase (for dashboard)
   */
  getCanvasConsensusPhase(): CanvasConsensusPhase {
    return this.canvasConsensusPhase;
  }

  /**
   * Get agent memory states (for dashboard — exposes positions, stances)
   */
  getAgentMemoryStates(): Map<string, import('./ConversationMemory').AgentMemoryState> {
    return this.bus.getAllAgentStates();
  }

  /**
   * Get single agent's memory state
   */
  getAgentMemoryState(agentId: string): import('./ConversationMemory').AgentMemoryState | undefined {
    return this.bus.getAgentMemoryState(agentId);
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
      recommendation = 'Waiting for research results...';
    } else if (!allAgentsSpoke) {
      const silent = enabledAgents.filter(id => !agentsWhoSpoke.has(id));
      recommendation = `Not all agents have spoken yet. Missing: ${silent.join(', ')}`;
    } else if (totalContributions < minContributions) {
      recommendation = `Discussion still too short (${totalContributions}/${minContributions} contributions)`;
    } else if (conflictPoints > consensusPoints) {
      recommendation = `More conflicts than agreements (${conflictPoints} conflicts, ${consensusPoints} agreements). Keep discussing.`;
    } else if (consensusPoints === 0 && totalContributions < minContributions * 2) {
      recommendation = 'No consensus points yet. Agents need to respond to each other.';
    } else if (consensusPoints === 0 && totalContributions >= minContributions * 2) {
      // Fallback: enough discussion happened even without explicit consensus tags
      ready = true;
      recommendation = `Discussion mature (${totalContributions} contributions). Ready for synthesis.`;
    } else {
      ready = true;
      recommendation = `Ready for synthesis! ${consensusPoints} consensus points, ${conflictPoints} open conflicts.`;
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

    }
  }

  /**
   * Process resonance metrics for the current message and emit update events.
   * If an intervention is triggered, inject a system message.
   */
  private processResonance(message: Message): void {
    // Sync phase
    this.resonanceMonitor.setPhase(this.currentPhase);

    // Gather memory states for all agents
    const agentMemoryStates = this.bus.getAllAgentStates();

    // Get consensus data
    const status = this.getConsensusStatus();

    // Process message through resonance monitor
    const intervention = this.resonanceMonitor.processMessage(
      message,
      this.session.messages,
      agentMemoryStates,
      status.consensusPoints,
      status.conflictPoints,
    );

    // Emit resonance update event for dashboard
    this.emit('resonance_update', {
      globalScore: this.resonanceMonitor.getGlobalResonance(),
      globalHistory: this.resonanceMonitor.getGlobalHistory(),
      agents: Object.fromEntries(
        Array.from(this.resonanceMonitor.getAllAgentResonances()).map(([id, r]) => [id, {
          score: r.score,
          trend: r.trend,
        }]),
      ),
      phaseTarget: this.resonanceMonitor.getPhaseTarget(),
    });

    // Inject intervention as system message if needed
    if (intervention) {
      const interventionMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: intervention.message,
        metadata: {
          interventionType: intervention.type,
          priority: intervention.priority,
          resonanceIntervention: true,
        },
      };

      setTimeout(() => {
        this.bus.addMessage(interventionMessage, 'system');
      }, 500);
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
      content: `🔍 **Discussion paused for research**

**Researcher:** ${researcher.name}
**Query:** "${query}"
**Requested by:** ${this.getAgentName(requestedBy)}

⏳ Searching... Agents are waiting.`,
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
        content: `✅ **Research complete — discussion resumes**

Agents can now reference the findings.`,
      };
      this.bus.addMessage(resumeMessage, 'system');

    } catch (error) {

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: 'system',
        type: 'system',
        content: `❌ **Research error:** ${error}\n\nDiscussion continues without research results.`,
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
2. Find specific numbers, statistics, and facts
3. Verify information from multiple sources when possible

## OUTPUT FORMAT

**🔍 Key Findings:**
- [bullet points of main discoveries]

**📊 Specific Data:**
- [specific numbers, stats that can be used in copy]

**💡 Implications for Copy:**
- [how this should influence the website copy]

**📚 Sources:**
- [note sources and reliability]`;

    // Use injected runner or fall back to Electron API
    if (this.agentRunner) {
      const result = await this.agentRunner.query({
        prompt: `Research request: ${query}\n\nSearch the web for current, accurate information.`,
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
      });

      if (!result.success) {
        throw new Error(result.error || 'Research query failed');
      }
      return result.content || 'No results found';
    }

    // Fallback to Electron API
    if (typeof window !== 'undefined' && window.electronAPI?.claudeAgentQuery) {
      const result = await window.electronAPI.claudeAgentQuery({
        prompt: `Research request: ${query}\n\nSearch the web for current, accurate information.`,
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
      });

      if (!result || !result.success) {
        throw new Error(result?.error || 'Research query failed');
      }
      return result.content || 'No results found';
    }

    throw new Error('No agent runner available');
  }

  /**
   * Check if synthesis is needed and auto-transition phases
   */
  private async checkForSynthesis(): Promise<void> {
    if (!this.isRunning) return;

    // Auto-transition phases based on consensus status
    await this.checkAutoTransition();

    // Synthesize every 10 messages or so
    if (this.messageCount > 0 && this.messageCount % 10 === 0) {
      await this.runSynthesis();
    }
  }

  /**
   * Auto-transition between phases when conditions are met.
   * Uses both consensus tracking AND message count fallbacks.
   */
  private async checkAutoTransition(): Promise<void> {
    const status = this.getConsensusStatus();
    const phaseMessages = this.session.messages.slice(this.phaseStartMessageIndex)
      .filter(m => m.agentId !== 'system');
    const phaseMessageCount = phaseMessages.length;

    switch (this.currentPhase) {
      case 'brainstorming': {
        // Move to argumentation: consensus-based OR message count fallback
        const minContributions = this.session.config.enabledAgents.length * 2;
        const totalContributions = Array.from(this.agentContributions.values()).reduce((a, b) => a + b, 0);
        const enabledAgents = this.session.config.enabledAgents;

        // Canvas consensus sub-cycle (embedded within brainstorming)
        if (this.canvasConsensusPhase === 'idle' && status.allAgentsSpoke && !this.wireframeProposalPromptSent) {
          // Step 1: Trigger wireframe proposals after all agents have spoken once
          this.triggerWireframeProposals();
        } else if (this.canvasConsensusPhase === 'proposing') {
          // Step 2: Check if all agents have submitted wireframes
          const allProposed = enabledAgents.every(id => this.wireframeProposals.has(id));
          if (allProposed) {
            this.triggerWireframeCritique();
          }
          // Timeout: if agents spoke but didn't include wireframes, skip canvas cycle
          const messagesSinceProposalPrompt = this.session.messages.slice(this.phaseStartMessageIndex)
            .filter(m => m.agentId !== 'system' && m.agentId !== 'human').length;
          if (messagesSinceProposalPrompt >= enabledAgents.length * 3 && this.wireframeProposals.size === 0) {
            // No wireframes after 3x rounds — skip canvas cycle entirely
            this.canvasConsensusPhase = 'idle';
          } else if (messagesSinceProposalPrompt >= enabledAgents.length * 4) {
            // Some wireframes but not all — compute with what we have
            if (this.wireframeProposals.size > 0) {
              this.computeCanvasConsensus();
            } else {
              this.canvasConsensusPhase = 'idle';
            }
          }
        } else if (this.canvasConsensusPhase === 'critiquing') {
          // Step 3: Check if all agents have spoken since critique started
          const critiqueMessages = this.session.messages.slice(this.critiqueStartIndex)
            .filter(m => m.agentId !== 'system' && m.agentId !== 'human');
          const critiqueAgents = new Set(critiqueMessages.map(m => m.agentId));
          const allCritiqued = enabledAgents.every(id => critiqueAgents.has(id));
          if (allCritiqued) {
            this.computeCanvasConsensus();
          }
          // Timeout: if stuck in critiquing for too many messages, force convergence
          if (critiqueMessages.length >= enabledAgents.length * 2) {
            this.computeCanvasConsensus();
          }
        }

        // Transition guard: require canvas convergence OR 36-message ceiling
        // Also allow transition if canvas is stuck in sub-cycle but discussion is mature
        const canvasReady = this.canvasConsensusPhase === 'converged' || this.canvasConsensusPhase === 'idle';
        const canvasStuck = (this.canvasConsensusPhase === 'proposing' || this.canvasConsensusPhase === 'critiquing')
          && totalContributions >= minContributions * 2;
        if (
          (status.allAgentsSpoke && totalContributions >= minContributions && (canvasReady || canvasStuck)) ||
          (this.autoModeratorEnabled && phaseMessageCount >= EDAOrchestrator.BRAINSTORMING_MAX)
        ) {
          await this.transitionToArgumentation();
        }
        break;
      }

      case 'argumentation': {
        // Move to synthesis: consensus-based OR message count fallback
        if (status.ready) {
          await this.transitionToSynthesis(false);
        } else if (this.autoModeratorEnabled) {
          // Nudge agents toward synthesis after threshold
          if (phaseMessageCount >= EDAOrchestrator.ARGUMENTATION_NUDGE && !this.moderatorNudgeSent) {
            this.moderatorNudgeSent = true;
            const nudgeMessage: Message = {
              id: crypto.randomUUID(),
              timestamp: new Date(),
              agentId: 'system',
              type: 'system',
              content: `🤖 **Moderator:** The discussion has been going for ${phaseMessageCount} messages.

**Current status:** ${status.consensusPoints} agreements, ${status.conflictPoints} conflicts.

Let's start wrapping up. Agents — please:
1. State your final position clearly
2. Use [AGREEMENT] or [DISAGREEMENT] tags to signal your stance
3. Propose any final compromises

The discussion will move to synthesis shortly.`,
            };
            this.bus.addMessage(nudgeMessage, 'system');
          }
          // Force transition after hard limit
          if (phaseMessageCount >= EDAOrchestrator.ARGUMENTATION_FORCE) {
            await this.transitionToSynthesis(true);
          }
        }
        break;
      }

      case 'synthesis': {
        // Move to drafting: agent coverage OR message count fallback
        const synthMessages = this.session.messages
          .slice(this.phaseStartMessageIndex)
          .filter(m => m.agentId !== 'system' && m.agentId !== 'human');
        const synthAgents = new Set(synthMessages.map(m => m.agentId));
        const threshold = Math.max(2, Math.floor(this.session.config.enabledAgents.length * 0.6));
        if (
          synthAgents.size >= threshold ||
          (this.autoModeratorEnabled && phaseMessageCount >= EDAOrchestrator.SYNTHESIS_MAX)
        ) {
          await this.transitionToDrafting();
        }
        break;
      }

      case 'drafting': {
        // Auto-finalize drafting after enough messages or when all sections are complete
        const allSectionsComplete = this.copySections.length > 0 &&
          this.copySections.every(s => s.status === 'complete');
        if (
          allSectionsComplete ||
          (this.autoModeratorEnabled && phaseMessageCount >= EDAOrchestrator.DRAFTING_MAX)
        ) {
          await this.finalizeDrafting();
        }
        break;
      }
    }
  }

  /**
   * Run synthesis checkpoint
   */
  private async runSynthesis(): Promise<void> {
    const recentMessages = this.bus.getRecentMessages(10);
    if (recentMessages.length < 5) return;

    try {
      let synthesis: string;

      if (this.agentRunner) {
        // CLI path: use injected runner (claude-agent-sdk)
        const conversationHistory = recentMessages.map((msg) => {
          const sender = msg.agentId === 'human' ? 'Human' :
                         msg.agentId === 'system' ? 'System' :
                         msg.agentId;
          return `[${sender}]: ${msg.content}`;
        }).join('\n\n');

        const roundNumber = Math.floor(this.messageCount / 10);
        const result = await this.agentRunner.query({
          prompt: `Round ${roundNumber} complete. Project: ${this.session.config.projectName}\n\nHere's what was said:\n\n${conversationHistory}\n\nProvide a Devil's Kitchen synthesis for this round.`,
          systemPrompt: `You are the Devil's Kitchen - the synthesis voice of the Recursive Thought Committee (RTC).\n\nYour role after each round:\n1. **Surface Agreements** - What points are multiple agents aligning on?\n2. **Name Tensions** - What unresolved disagreements need addressing?\n3. **Track Progress** - Are we moving toward consensus or diverging?\n4. **Prompt Next Round** - What question should the next round address?\n\nBe BRIEF and STRUCTURED. This is a quick checkpoint, not a full synthesis.\n\nWrite in Hebrew with English terms where appropriate.\nUse emojis sparingly for visual scanning: ✅ agreements, ⚡ tensions, 🎯 focus`,
          model: 'claude-sonnet-4-20250514',
        });
        synthesis = result.content || '';
      } else {
        // Electron path: use direct Anthropic SDK
        synthesis = await generateRoundSynthesis(
          this.session.config,
          recentMessages,
          Math.floor(this.messageCount / 10),
          this.context
        );
      }

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
      return { success: false, message: `Cannot transition to argumentation from ${this.currentPhase}` };
    }

    // Check if minimum discussion occurred
    const status = this.getConsensusStatus();
    if (!status.allAgentsSpoke) {
      return {
        success: false,
        message: `Not all agents have spoken yet. Waiting for: ${this.session.config.enabledAgents.filter(id => !status.agentParticipation.has(id)).join(', ')}`
      };
    }

    // Generate handoff brief from brainstorming before changing phase
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);

    this.currentPhase = 'argumentation';
    this.session.currentPhase = 'argumentation';
    this.phaseStartMessageIndex = this.session.messages.length;
    this.moderatorNudgeSent = false;
    this.emit('phase_change', { phase: 'argumentation', brief });

    // Announce phase transition with handoff brief
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `${brief}
---

⚔️ **PHASE: ARGUMENTATION**

Time to critically examine the ideas.

**Phase goal:**
- Raise counter-arguments to proposed ideas
- Challenge core assumptions
- Identify weaknesses and risks
- Defend good ideas with evidence

**Discussion rules:**
- Each agent must raise at least one argument against a proposed idea
- Use tags: [ARGUMENT], [COUNTER], [DEFENSE]
- Don't agree too quickly — examine ideas in depth

**Let's go!** ${this.getNextSpeakerForArgumentation()} — open with a critical argument about one of the ideas.`,
    };
    this.bus.addMessage(transitionMessage, 'system');

    // Force first agent to speak
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForArgumentation();
      this.forceAgentToSpeak(firstAgent, 'Opening argumentation with critical analysis');
    }, 2000);

    return { success: true, message: 'Transitioning to argumentation phase' };
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
      return { success: false, message: `Cannot transition to synthesis from ${this.currentPhase}` };
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
        content: `⚠️ **Warning: Discussion not yet ready for synthesis**

${status.recommendation}

**Current status:**
- Agents who spoke: ${status.agentParticipation.size}/${this.session.config.enabledAgents.length}
- Consensus points: ${status.consensusPoints}
- Open conflicts: ${status.conflictPoints}

To proceed anyway, type \`synthesize force\``,
      };
      this.bus.addMessage(warningMessage, 'system');
      return { success: false, message: status.recommendation };
    }

    // Generate handoff brief before changing phase
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);

    this.currentPhase = 'synthesis';
    this.session.currentPhase = 'synthesis';
    this.phaseStartMessageIndex = this.session.messages.length;
    this.moderatorNudgeSent = false;
    this.emit('phase_change', { phase: 'synthesis', brief });

    // Build status summary
    const participationList = Array.from(status.agentParticipation.entries())
      .map(([id, count]) => `  - ${this.getAgentName(id)}: ${count} contributions`)
      .join('\n');

    // Announce phase transition with handoff brief
    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `${brief}
---

📊 **PHASE: SYNTHESIS**

Moving to synthesis phase.

**Discussion summary:**
- Consensus points: ${status.consensusPoints}
- Remaining conflicts: ${status.conflictPoints}

**Participation:**
${participationList}

**Task for all agents:**
1. Summarize the key insights from the discussion
2. Identify consensus points and disagreements
3. Define the core messages that must appear in the copy

**Next up:** ${this.getNextSpeakerForSynthesis()} — summarize the discussion from your perspective.`,
    };
    this.bus.addMessage(transitionMessage, 'system');

    // Force first agent to synthesize
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForSynthesis();
      this.forceAgentToSpeak(firstAgent, 'Synthesizing discussion insights');
    }, 2000);

    return { success: true, message: 'Transitioning to synthesis phase' };
  }

  /**
   * Transition to drafting phase - agents write actual copy sections
   */
  async transitionToDrafting(): Promise<void> {
    if (this.currentPhase !== 'synthesis' && this.currentPhase !== 'brainstorming') {
      return;
    }

    // Generate handoff brief before changing phase
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);

    this.currentPhase = 'drafting';
    this.session.currentPhase = 'drafting';
    this.phaseStartMessageIndex = this.session.messages.length;
    this.emit('phase_change', { phase: 'drafting', brief });

    // Initialize copy sections with assignments
    this.copySections = COPY_SECTIONS.map((section, index) => ({
      ...section,
      status: 'pending' as const,
      assignedAgent: this.assignAgentToSection(index),
    }));

    // Announce phase transition with handoff brief
    const assignments = this.copySections
      .map(s => `- **${s.name}**: ${this.getAgentName(s.assignedAgent!)}`)
      .join('\n');

    const transitionMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `${brief}
---

✍️ **PHASE: DRAFTING**

Time to write the actual copy!

**Task assignments:**
${assignments}

**Guidelines:**
- Write a first draft for your assigned section
- Build on insights from the discussion
- Maintain consistency in tone and voice
- After each draft, other agents can respond and improve

**Let's go!** ${this.getAgentName(this.copySections[0].assignedAgent!)} — write the ${this.copySections[0].name}.`,
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
      .map(s => `## ${s.name}\n\n${s.content}`)
      .join('\n\n---\n\n');

    return `# ${this.session.config.projectName} - Draft Copy\n\n${sections}`;
  }

  /**
   * Public accessor for draft copy — used by BuildOrchestrator
   */
  async getCopySectionsDraft(): Promise<string> {
    return this.getConsolidatedDraft();
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
    return agent ? agent.name : agentId;
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
    this.forceAgentToSpeak(section.assignedAgent!, `Writing ${section.name}`);
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
      content: `✅ **${section.name}** complete!\n\n---\n\n${content.slice(0, 500)}${content.length > 500 ? '...' : ''}`,
    };
    this.bus.addMessage(completeMessage, 'system');

    // Move to next section
    setTimeout(() => {
      this.startDraftingSection(sectionIndex + 1);
    }, 3000);
  }

  /**
   * Auto-complete a draft section when the assigned agent sends a message.
   * During drafting, any substantive message from an assigned agent counts as their draft.
   */
  private autoCompleteDraftSection(agentId: string, message: Message): void {
    // Find in-progress section assigned to this agent
    const sectionIndex = this.copySections.findIndex(
      s => s.assignedAgent === agentId && s.status === 'in_progress'
    );
    if (sectionIndex !== -1 && message.content.length > 50) {
      // Agent wrote something substantial — mark section complete
      this.copySections[sectionIndex].content = message.content;
      this.copySections[sectionIndex].status = 'complete';
      // Move to next pending section
      const nextPending = this.copySections.findIndex(s => s.status === 'pending');
      if (nextPending !== -1) {
        setTimeout(() => this.startDraftingSection(nextPending), 2000);
      }
      return;
    }
    // Also: any agent message during drafting that isn't for a specific section
    // still counts toward drafting progress (handled by checkAutoTransition DRAFTING_MAX)
  }

  /**
   * Finalize drafting phase
   */
  private async finalizeDrafting(): Promise<void> {
    // Generate handoff brief from drafting phase
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);

    this.currentPhase = 'finalization';
    this.session.currentPhase = 'finalization';

    const draft = await this.getConsolidatedDraft();

    this.emit('phase_change', { phase: 'finalization', brief, buildReady: true, draftMarkdown: draft });

    const finalMessage: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content: `${brief}\n---\n\n🎉 **DRAFTING COMPLETE!**\n\nAll sections written. Full copy:\n\n${draft}\n\n**What's next?**\n- Type \`/build\` to generate 3 website variants from this copy\n- Agents can provide final feedback\n- Copy is ready for export`,
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

    this.bus.emit('floor:request', request);
  }

  /**
   * Generate a structured brief summarizing what happened in the current phase
   * Used at phase transitions so agents don't lose context
   */
  private generatePhaseHandoffBrief(fromPhase: SessionPhase): string {
    const parts: string[] = [];
    parts.push(`## Handoff from ${fromPhase.toUpperCase()} Phase\n`);

    // 1. Summaries from this phase
    const summaries = this.bus.getSummariesSince(this.phaseStartMessageIndex);
    if (summaries.length > 0) {
      parts.push('### Key Discussion Points');
      for (const s of summaries.slice(-3)) {
        parts.push(`- ${s.content.slice(0, 200)}`);
      }
      parts.push('');
    }

    // 2. Decisions made in this phase
    const decisions = this.bus.getDecisionsSince(this.phaseStartMessageIndex);
    if (decisions.length > 0) {
      parts.push('### Decisions Made');
      for (const d of decisions.slice(-5)) {
        parts.push(`- ${d.content}`);
      }
      parts.push('');
    }

    // 3. Active proposals with support/oppose counts
    const activeProposals = this.bus.getActiveProposals();
    if (activeProposals.length > 0) {
      parts.push('### Active Proposals');
      for (const p of activeProposals.slice(-5)) {
        const reactions = p.reactions || [];
        const supports = reactions.filter(r => r.reaction === 'support').length;
        const opposes = reactions.filter(r => r.reaction === 'oppose').length;
        const agentName = p.agentId ? this.getAgentName(p.agentId) : 'Unknown';
        parts.push(`- [${agentName}] ${p.content.slice(0, 150)} (${supports} support, ${opposes} oppose)`);
      }
      parts.push('');
    }

    // 4. Agent positions summary
    const agentStates = this.bus.getAllAgentStates();
    if (agentStates.size > 0) {
      parts.push('### Agent Positions');
      for (const [agentId, state] of agentStates) {
        if (state.messageCount === 0) continue;
        const name = this.getAgentName(agentId);
        const lastPosition = state.positions.length > 0 ? state.positions[state.positions.length - 1] : null;
        const agreements = state.agreements.length;
        const disagreements = state.disagreements.length;
        let line = `- **${name}**: ${state.messageCount} msgs`;
        if (agreements > 0 || disagreements > 0) line += ` (${agreements} agreements, ${disagreements} disagreements)`;
        if (lastPosition) line += ` — last stance: "${lastPosition.slice(0, 80)}"`;
        parts.push(line);
      }
      parts.push('');
    }

    // 5. Consensus status
    const status = this.getConsensusStatus();
    if (status.consensusPoints > 0 || status.conflictPoints > 0) {
      parts.push(`### Status: ${status.consensusPoints} consensus points, ${status.conflictPoints} open conflicts`);
      parts.push('');
    }

    // If brief is empty (no data yet), provide a minimal note
    if (parts.length <= 1) {
      parts.push('_No structured data captured yet from this phase._\n');
    }

    return parts.join('\n');
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

  getResonanceState(): ResonanceState {
    return this.resonanceMonitor.toJSON();
  }

  getResonanceMonitor(): ResonanceMonitor {
    return this.resonanceMonitor;
  }

  /**
   * Get messages from the bus
   */
  getMessages(): Message[] {
    return this.bus.getAllMessages();
  }
}
