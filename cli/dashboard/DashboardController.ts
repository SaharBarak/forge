/**
 * DashboardController — orchestrates event subscriptions, state, and widget updates
 *
 * Replaces App.tsx's React state + useEffect with imperative blessed widget calls.
 * Maps 1:1 from App.tsx event handler (lines 83-175).
 */

import type blessed from 'blessed';
import { v4 as uuid } from 'uuid';
import type { Message, SessionPhase, Session } from '../../src/types';
import type { EDAOrchestrator, EDAEvent } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import type { ToolRunner } from '../tools/ToolRunner';
import type { QuickReply, AgentSuggestionData } from '../lib/suggestions';
import type { DashboardWidgets, DashboardState, AgentInfo } from './types';
import { getQuickReplies, getPhaseHint, detectAgentSuggestion } from '../lib/suggestions';
import { getAgentById, getAgentColor } from '../../src/agents/personas';
import { extractWireframe, getDefaultWireframe } from '../lib/wireframe';
import type { WireframeNode } from '../lib/wireframe';
import type { WireframeProposal, CanvasConsensusPhase } from '../lib/wireframe-store';

import { BuildOrchestrator } from '../../src/lib/build/BuildOrchestrator';
import { BUILD_PERSONAS } from '../../src/agents/build-personas';
import type { BuildEvent, BuildResult } from '../../src/types/build';

import { scheduleRender } from './screen';
import { updateHeader } from './widgets/HeaderWidget';
import { updateBreadcrumbs } from './widgets/BreadcrumbWidget';
import { updateCanvas } from './widgets/CanvasWidget';
import { appendMessages, updateTypingIndicator, resetChatLog } from './widgets/ChatLogWidget';
import { updateAgentPanel } from './widgets/AgentPanelWidget';
import { updateConsensusChart } from './widgets/ConsensusChartWidget';
import { updatePhaseTimeline } from './widgets/PhaseTimelineWidget';
import { updateQuickReplies } from './widgets/QuickRepliesWidget';
import { showSuggestion, hideSuggestion } from './widgets/SuggestionWidget';
import { updateStatusBar } from './widgets/StatusBarWidget';
import { setupInput, activateInput } from './widgets/InputWidget';

// Phase message thresholds for timeline gauge (matches EDAOrchestrator auto-moderator)
const PHASE_THRESHOLDS: Partial<Record<SessionPhase, number>> = {
  brainstorming: 36,
  argumentation: 25,
  synthesis: 15,
  drafting: 20,
};

export class DashboardController {
  private screen: blessed.Widgets.Screen;
  private widgets: DashboardWidgets;
  private orchestrator: EDAOrchestrator;
  private persistence: SessionPersistence;
  private session: Session;
  private toolRunner?: ToolRunner;
  private onExit: () => void;

  // Internal state
  private state: DashboardState = {
    messages: [],
    phase: 'initialization',
    currentSpeaker: null,
    queued: [],
    agentStates: new Map(),
    contributions: new Map(),
    consensusPoints: 0,
    conflictPoints: 0,
    consensusHistory: [],
    conflictHistory: [],
    statusMessage: null,
    agentSuggestion: null,
    quickReplies: [],
    canvasMode: 'consensus',
    selectedCanvasAgent: null,
    wireframeProposals: new Map(),
    canvasConsensusPhase: 'idle',
    resonanceGlobal: 50,
    resonancePerAgent: new Map(),
    resonanceHistory: [],
    resonanceTarget: [50, 70],
  };

  private prevMessageCount = 0;
  private phaseStartMessageIndex = 0;
  private wireframe: WireframeNode = getDefaultWireframe();
  private canvasViewOrder: string[] = ['consensus'];
  private canvasViewIndex = 0;
  private unsubscribe: (() => void) | null = null;
  private statusTimer: ReturnType<typeof setTimeout> | null = null;
  private focusableWidgets: blessed.Widgets.BlessedElement[] = [];
  private focusIndex = 0;
  private buildOrchestrator: BuildOrchestrator | null = null;
  private pendingDraft: string | null = null;

  constructor(
    screen: blessed.Widgets.Screen,
    widgets: DashboardWidgets,
    orchestrator: EDAOrchestrator,
    persistence: SessionPersistence,
    session: Session,
    toolRunner: ToolRunner | undefined,
    onExit: () => void,
  ) {
    this.screen = screen;
    this.widgets = widgets;
    this.orchestrator = orchestrator;
    this.persistence = persistence;
    this.session = session;
    this.toolRunner = toolRunner;
    this.onExit = onExit;

    // Set up focusable widget cycle: input → chatLog → quickReplies
    this.focusableWidgets = [widgets.input, widgets.chatLog, widgets.quickReplies];
  }

  /**
   * Initialize: subscribe to events, set up input, render initial state, start orchestrator
   */
  async start(): Promise<void> {
    // Set up input handlers
    setupInput(this.widgets.input as any, this.screen, {
      onSubmit: (text) => this.handleSubmit(text),
      onCommand: (command, args) => this.handleCommand(command, args),
    });

    // Set up keyboard navigation
    this.setupKeys();

    // contrib.log forces interactive=false in its constructor — re-enable it
    // so keyboard scrolling works when the chat log is focused
    (this.widgets.chatLog as any).interactive = true;

    // Subscribe to orchestrator events
    this.unsubscribe = this.orchestrator.on((event: EDAEvent) => {
      this.handleEvent(event);
    });

    // Initial render of all widgets
    this.renderAll();

    // Focus input
    activateInput(this.widgets.input as any, this.screen);
    this.screen.render();

    // Start orchestration
    await this.orchestrator.start();
  }

  /**
   * Clean up subscriptions and timers
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.statusTimer) {
      clearTimeout(this.statusTimer);
      this.statusTimer = null;
    }
    resetChatLog();
  }

  // ─── Event Handling ─────────────────────────────────────────────────

  private handleEvent(event: EDAEvent): void {
    switch (event.type) {
      case 'phase_change':
        this.handlePhaseChange(event);
        break;
      case 'agent_message':
        this.handleAgentMessage(event);
        break;
      case 'agent_typing':
        this.handleAgentTyping(event);
        break;
      case 'floor_status':
        this.handleFloorStatus(event);
        break;
      case 'synthesis':
        this.setStatusMessage('Synthesis complete');
        break;
      case 'error':
        this.setStatusMessage(`Error: ${(event.data as { message: string }).message}`);
        break;
      case 'canvas_update': {
        // Sync canvas consensus state from orchestrator
        this.state.canvasConsensusPhase = this.orchestrator.getCanvasConsensusPhase();
        const proposals = this.orchestrator.getWireframeProposals();
        this.state.wireframeProposals = proposals as Map<string, WireframeProposal>;
        this.canvasViewOrder = ['consensus', ...Array.from(proposals.keys())];
        this.updateCanvas();
        this.updateAgentPanel();
        break;
      }
      case 'resonance_update': {
        const resData = event.data as {
          globalScore: number;
          globalHistory: number[];
          agents: Record<string, { score: number; trend: 'rising' | 'stable' | 'falling' }>;
          phaseTarget: [number, number];
        };
        this.state.resonanceGlobal = resData.globalScore;
        this.state.resonanceTarget = resData.phaseTarget;
        this.state.resonanceHistory.push(resData.globalScore);
        if (this.state.resonanceHistory.length > 20) {
          this.state.resonanceHistory = this.state.resonanceHistory.slice(-20);
        }
        for (const [id, info] of Object.entries(resData.agents)) {
          this.state.resonancePerAgent.set(id, info.score);
        }
        this.updateHeader();
        this.updateAgentPanel();
        this.updateConsensusChart();
        break;
      }
    }

    scheduleRender(this.screen);
  }

  private handlePhaseChange(event: EDAEvent): void {
    const data = event.data as { phase: SessionPhase; buildReady?: boolean; draftMarkdown?: string };
    this.state.phase = data.phase;
    this.phaseStartMessageIndex = this.state.messages.length;

    // Store draft for /build command when finalization is reached
    if (data.phase === 'finalization' && data.buildReady && data.draftMarkdown) {
      this.pendingDraft = data.draftMarkdown;
    }

    this.updateHeader();
    this.updateBreadcrumbs();
    this.updatePhaseTimeline();
    this.updateQuickReplies();
  }

  private handleAgentMessage(_event: EDAEvent): void {
    const allMessages = this.orchestrator.getMessages();
    this.state.messages = allMessages;

    // Update contributions and consensus
    const status = this.orchestrator.getConsensusStatus();
    this.state.contributions = status.agentParticipation;
    this.state.consensusPoints = status.consensusPoints;
    this.state.conflictPoints = status.conflictPoints;
    this.state.agentStates = new Map(this.orchestrator.getAgentStates());

    // Track consensus/conflict history for chart
    this.state.consensusHistory.push(status.consensusPoints);
    this.state.conflictHistory.push(status.conflictPoints);

    // Tool requests
    if (this.toolRunner && this.toolRunner.getAvailableTools().length > 0) {
      const latest = allMessages[allMessages.length - 1];
      if (latest && latest.agentId !== 'system') {
        const toolMatch = latest.content.match(/\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/);
        if (toolMatch) {
          const toolName = toolMatch[1];
          const toolPrompt = toolMatch[2].trim();
          const outputDir = this.persistence.getSessionDir();
          this.toolRunner.runTool(toolName, { prompt: toolPrompt, description: toolPrompt }, outputDir).then((result) => {
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
            this.state.messages.push(toolMsg);
            appendMessages(this.widgets.chatLog as any, this.state.messages);
            scheduleRender(this.screen);
          });
        }
      }
    }

    // Per-agent wireframe extraction
    const lastMsg = allMessages[allMessages.length - 1];
    if (lastMsg && lastMsg.agentId !== 'system' && lastMsg.agentId !== 'human') {
      const proposed = extractWireframe(lastMsg.content);
      if (proposed) {
        const agent = getAgentById(lastMsg.agentId);
        this.state.wireframeProposals.set(lastMsg.agentId, {
          agentId: lastMsg.agentId,
          agentName: agent?.name || lastMsg.agentId,
          wireframe: proposed,
          timestamp: Date.now(),
          messageIndex: allMessages.length - 1,
        });
        // Update main wireframe (consensus view shows latest)
        this.wireframe = proposed;
        // Rebuild canvas view order
        this.canvasViewOrder = ['consensus', ...Array.from(this.state.wireframeProposals.keys())];
        this.updateCanvas();
      }
    }

    // Agent suggestion detection
    const suggestionData = detectAgentSuggestion(
      allMessages, this.state.phase, this.state.consensusPoints, this.state.conflictPoints, this.prevMessageCount
    );
    if (suggestionData) {
      const agent = getAgentById(suggestionData.agentId);
      if (agent) suggestionData.agentName = agent.name;
      this.state.agentSuggestion = suggestionData;
      showSuggestion(this.widgets.suggestion, this.widgets.quickReplies, suggestionData, this.screen);
    }
    this.prevMessageCount = allMessages.length;

    // Update all data widgets
    appendMessages(this.widgets.chatLog as any, allMessages);
    this.updateHeader();
    this.updateAgentPanel();
    this.updateConsensusChart();
    this.updatePhaseTimeline();
    this.updateQuickReplies();
  }

  private handleAgentTyping(event: EDAEvent): void {
    const { agentId, typing } = event.data as { agentId: string; typing: boolean };
    if (typing) {
      this.state.currentSpeaker = agentId;
    }
    this.state.agentStates = new Map(this.orchestrator.getAgentStates());
    updateTypingIndicator(this.widgets.chatLog as any, typing ? agentId : null, this.screen);
    this.updateHeader();
    this.updateAgentPanel();
  }

  private handleFloorStatus(event: EDAEvent): void {
    const { current } = event.data as { current: string | null; status: string };
    this.state.currentSpeaker = current;
    const floorStatus = this.orchestrator.getFloorStatus();
    this.state.queued = floorStatus.queued;
    this.updateHeader();
    this.updateAgentPanel();
  }

  // ─── Human Input ────────────────────────────────────────────────────

  private async handleSubmit(text: string): Promise<void> {
    await this.orchestrator.addHumanMessage(text);
    const allMessages = this.orchestrator.getMessages();
    this.state.messages = allMessages;
    appendMessages(this.widgets.chatLog as any, allMessages);
    scheduleRender(this.screen);
  }

  private async handleCommand(command: string, args: string[]): Promise<void> {
    switch (command.toLowerCase()) {
      case 'pause':
        this.orchestrator.pause();
        this.setStatusMessage('\u23F8 Debate paused');
        break;
      case 'resume':
        this.orchestrator.resume();
        this.setStatusMessage('\u25B6 Debate resumed');
        break;
      case 'status': {
        const status = this.orchestrator.getConsensusStatus();
        this.setStatusMessage(`\u{1F4CA} ${status.recommendation}`);
        break;
      }
      case 'synthesize': {
        const force = args.includes('force');
        this.setStatusMessage('\u23F3 Transitioning to synthesis...');
        const result = await this.orchestrator.transitionToSynthesis(force);
        this.setStatusMessage(result.success ? `\u2705 ${result.message}` : `\u26A0 ${result.message}`);
        break;
      }
      case 'export': {
        this.setStatusMessage('\u23F3 Exporting...');
        await this.persistence.saveFull();
        const dir = this.persistence.getSessionDir();
        this.setStatusMessage(`\u2705 Exported to ${dir}`);
        break;
      }
      case 'build':
        await this.startBuildPhase();
        break;
      case 'pick': {
        if (!this.buildOrchestrator) {
          this.setStatusMessage('\u274C No build in progress. Use /build first.');
          break;
        }
        const pickName = args[0];
        if (!pickName) {
          this.setStatusMessage('\u274C Usage: /pick <name> (mika, dani, or shai)');
          break;
        }
        const pickResult = await this.buildOrchestrator.pickWinner(pickName);
        if (pickResult.success) {
          this.setStatusMessage(`\u{1F3C6} Winner: ${pickName}! Other servers stopped.`);
          this.appendSystemMessage(`\u{1F3C6} **Winner picked: ${pickName}!** Other dev servers have been stopped.`);
        } else {
          this.setStatusMessage(`\u274C ${pickResult.error}`);
        }
        break;
      }
      case 'changes': {
        if (!this.buildOrchestrator) {
          this.setStatusMessage('\u274C No build in progress. Use /build first.');
          break;
        }
        const changeName = args[0];
        const feedback = args.slice(1).join(' ');
        if (!changeName || !feedback) {
          this.setStatusMessage('\u274C Usage: /changes <name> <feedback>');
          break;
        }
        this.setStatusMessage(`\u23F3 Requesting changes from ${changeName}...`);
        this.appendSystemMessage(`\u{1F504} Rebuilding ${changeName}'s site with feedback: "${feedback}"`);
        const changesResult = await this.buildOrchestrator.requestChanges(changeName, feedback);
        if (changesResult.success) {
          this.setStatusMessage(`\u2705 ${changeName}'s site rebuilt successfully`);
        } else {
          this.setStatusMessage(`\u274C Rebuild failed: ${changesResult.error}`);
        }
        break;
      }
      case 'urls': {
        if (!this.buildOrchestrator) {
          this.setStatusMessage('\u274C No build in progress.');
          break;
        }
        const urls = this.buildOrchestrator.getUrls();
        if (urls.length === 0) {
          this.setStatusMessage('\u274C No dev servers running.');
        } else {
          const urlList = urls.map((u) => `  ${u.name}: ${u.url}`).join('\n');
          this.appendSystemMessage(`\u{1F310} **Dev Server URLs:**\n${urlList}`);
        }
        break;
      }
      case 'help':
        this.showHelp();
        break;
      case 'quit':
      case 'exit':
        await this.gracefulExit();
        break;
      default:
        this.setStatusMessage(`\u274C Unknown command: /${command}. Type /help for available commands.`);
    }
  }

  private async gracefulExit(): Promise<void> {
    await this.buildOrchestrator?.stopDevServers();
    await this.persistence.saveFull();
    this.orchestrator.stop();
    this.onExit();
    this.destroy();
    this.screen.destroy();
  }

  /**
   * Start the build phase — stop copy agents, launch 3 parallel website builds
   */
  private async startBuildPhase(): Promise<void> {
    if (!this.pendingDraft) {
      this.setStatusMessage('\u274C No draft ready. Wait for finalization before /build.');
      return;
    }

    if (this.buildOrchestrator) {
      this.setStatusMessage('\u274C Build already in progress.');
      return;
    }

    // Stop the copywriting orchestrator agents (keep dashboard alive)
    this.orchestrator.pause();

    const sessionDir = this.persistence.getSessionDir();
    this.buildOrchestrator = new BuildOrchestrator(
      sessionDir,
      this.pendingDraft,
      this.session.config.projectName,
    );

    // Subscribe to build events
    this.buildOrchestrator.on((event) => this.handleBuildEvent(event));

    // Update phase
    this.state.phase = 'building';
    this.state.buildPhase = 'building';
    this.updateHeader();
    this.updateBreadcrumbs();
    this.updatePhaseTimeline();
    this.updateQuickReplies();

    this.appendSystemMessage('\u{1F528} **BUILD PHASE STARTED** — 3 engineering agents are building SvelteKit websites from your copy...\n\n' +
      BUILD_PERSONAS.map((p) => `  {${p.color}-fg}${p.name}{/${p.color}-fg}: ${p.designPhilosophy.split('—')[0].trim()}`).join('\n'));

    // Kick off parallel builds, then start dev servers
    try {
      await this.buildOrchestrator.startBuilds();
      await this.buildOrchestrator.startDevServers();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.setStatusMessage(`\u274C Build failed: ${msg}`);
    }
  }

  /**
   * Handle events from BuildOrchestrator
   */
  private handleBuildEvent(event: BuildEvent): void {
    const data = event.data as Record<string, unknown>;

    switch (event.type) {
      case 'build_progress': {
        const agentId = data.agentId as string;
        const message = data.message as string;
        const persona = BUILD_PERSONAS.find((p) => p.id === agentId);
        const color = persona?.color || 'gray';
        const name = persona?.name || agentId;
        this.appendSystemMessage(`{${color}-fg}[${name}]{/${color}-fg} ${message}`);
        break;
      }
      case 'build_complete': {
        const agentId = data.agentId as string;
        const persona = BUILD_PERSONAS.find((p) => p.id === agentId);
        this.appendSystemMessage(`\u2705 **${persona?.name || agentId}** build complete!`);
        this.updateAgentPanel();
        break;
      }
      case 'build_error': {
        const agentId = data.agentId as string;
        const error = data.error as string;
        const persona = BUILD_PERSONAS.find((p) => p.id === agentId);
        this.appendSystemMessage(`\u274C **${persona?.name || agentId}** error: ${error}`);
        this.updateAgentPanel();
        break;
      }
      case 'server_started': {
        const agentId = data.agentId as string;
        const url = data.url as string;
        const persona = BUILD_PERSONAS.find((p) => p.id === agentId);
        this.appendSystemMessage(`\u{1F310} **${persona?.name || agentId}** dev server: ${url}`);
        this.updateAgentPanel();
        break;
      }
      case 'all_servers_ready': {
        this.state.phase = 'picking';
        this.state.buildPhase = 'picking';
        const urls = this.buildOrchestrator!.getUrls();
        this.state.buildUrls = urls;
        const urlList = urls.map((u) => `  \u{1F310} **${u.name}**: ${u.url}`).join('\n');
        this.appendSystemMessage(`\n\u{1F3C6} **ALL SITES READY!**\n\n${urlList}\n\nOpen in your browser, then:\n  \`/pick <name>\` — choose winner\n  \`/changes <name> <feedback>\` — request revisions`);
        this.updateHeader();
        this.updateBreadcrumbs();
        this.updatePhaseTimeline();
        this.updateQuickReplies();
        this.updateAgentPanel();
        break;
      }
    }
    scheduleRender(this.screen);
  }

  /**
   * Append a system message to the chat log
   */
  private appendSystemMessage(content: string): void {
    const msg: Message = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: 'system',
      type: 'system',
      content,
    };
    this.state.messages.push(msg);
    appendMessages(this.widgets.chatLog as any, this.state.messages);
    scheduleRender(this.screen);
  }

  // ─── Widget Update Helpers ──────────────────────────────────────────

  private getAgentResonanceTrend(agentId: string): 'rising' | 'stable' | 'falling' | undefined {
    const monitor = this.orchestrator.getResonanceMonitor();
    const resonance = monitor.getAgentResonance(agentId);
    return resonance?.trend;
  }

  private updateHeader(): void {
    updateHeader(
      this.widgets.header,
      this.state.phase,
      this.state.currentSpeaker,
      this.state.messages.length,
      this.state.consensusPoints,
      this.state.conflictPoints,
      this.state.resonanceGlobal,
    );
  }

  private updateBreadcrumbs(): void {
    updateBreadcrumbs(
      this.widgets.breadcrumbs,
      this.session.config.projectName,
      this.state.phase,
    );
  }

  private updateCanvas(): void {
    const view = this.canvasViewOrder[this.canvasViewIndex] || 'consensus';

    if (view === 'consensus') {
      const label = this.state.wireframeProposals.size > 0
        ? ` Wireframe(All) `
        : ` Wireframe `;
      (this.widgets.canvas as any).setLabel(label);
      updateCanvas(this.widgets.canvas, this.wireframe, {
        type: 'consensus',
      }, this.state.wireframeProposals.size, this.state.canvasConsensusPhase);
    } else {
      const proposal = this.state.wireframeProposals.get(view);
      if (proposal) {
        const agent = getAgentById(view);
        (this.widgets.canvas as any).setLabel(` Wireframe(${proposal.agentName}) `);
        updateCanvas(this.widgets.canvas, proposal.wireframe, {
          type: 'agent',
          agentName: proposal.agentName,
          agentColor: agent?.color,
        }, this.state.wireframeProposals.size, this.state.canvasConsensusPhase);
      } else {
        (this.widgets.canvas as any).setLabel(` Wireframe `);
        updateCanvas(this.widgets.canvas, this.wireframe, { type: 'consensus' });
      }
    }
  }

  private applyCanvasView(): void {
    this.updateCanvas();
    scheduleRender(this.screen);
  }

  private updateAgentPanel(): void {
    // During build phase, show build agents instead of copy agents
    if (this.buildOrchestrator && (this.state.phase === 'building' || this.state.phase === 'picking')) {
      const buildResults = this.buildOrchestrator.getResults();
      const agents: AgentInfo[] = BUILD_PERSONAS.map((persona) => {
        const result = buildResults.get(persona.id);
        let state = 'waiting';
        let latestArgument: string | undefined;
        if (result) {
          switch (result.status) {
            case 'building': state = 'thinking'; latestArgument = 'Building...'; break;
            case 'running': state = 'speaking'; latestArgument = `http://localhost:${persona.port}`; break;
            case 'error': state = 'listening'; latestArgument = result.error?.slice(0, 50); break;
            default: state = 'waiting';
          }
        }
        return {
          id: persona.id,
          name: persona.name,
          nameHe: '',
          color: persona.color,
          state,
          contributions: 0,
          role: persona.designPhilosophy.split('—')[0].trim(),
          latestArgument,
        };
      });
      updateAgentPanel(this.widgets.agentPanel, agents, null);
      return;
    }

    const agents: AgentInfo[] = this.session.config.enabledAgents.map((id) => {
      const agent = getAgentById(id);
      const memoryState = this.orchestrator.getAgentMemoryState(id);
      // Get latest argument from this agent's messages
      const agentMessages = this.state.messages.filter(m => m.agentId === id);
      const lastMessage = agentMessages[agentMessages.length - 1];
      const latestArgument = lastMessage
        ? lastMessage.content.replace(/\[.*?\]/g, '').trim().slice(0, 50)
        : undefined;
      return {
        id,
        name: agent?.name || id,
        nameHe: agent?.nameHe || '',
        color: agent?.color || 'gray',
        state: this.state.agentStates.get(id) || 'listening',
        contributions: this.state.contributions.get(id) || 0,
        role: agent?.role,
        currentStance: memoryState?.positions?.[memoryState.positions.length - 1],
        latestArgument,
        hasWireframe: this.state.wireframeProposals.has(id),
        resonance: this.state.resonancePerAgent.get(id),
        resonanceTrend: this.getAgentResonanceTrend(id),
      };
    });
    updateAgentPanel(this.widgets.agentPanel, agents, this.state.currentSpeaker);
  }

  private updateConsensusChart(): void {
    updateConsensusChart(
      this.widgets.consensusChart as any,
      this.state.consensusHistory,
      this.state.conflictHistory,
      this.state.resonanceHistory,
    );
  }

  private updatePhaseTimeline(): void {
    const phaseMessageCount = this.state.messages.length - this.phaseStartMessageIndex;
    const threshold = PHASE_THRESHOLDS[this.state.phase] || 10;
    updatePhaseTimeline(this.widgets.phaseTimeline, this.state.phase, phaseMessageCount, threshold);
  }

  private updateQuickReplies(): void {
    this.state.quickReplies = getQuickReplies(
      this.state.phase,
      this.state.messages,
      this.state.consensusPoints,
      this.state.conflictPoints,
    );
    updateQuickReplies(this.widgets.quickReplies, this.state.quickReplies);
  }

  private setStatusMessage(msg: string): void {
    this.state.statusMessage = msg;
    updateStatusBar(this.widgets.statusBar, msg);
    scheduleRender(this.screen);

    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.state.statusMessage = null;
      updateStatusBar(this.widgets.statusBar, null);
      scheduleRender(this.screen);
    }, 8000);
  }

  private showHelp(): void {
    const helpLines = [
      '{bold}Commands:{/bold}',
      '  /pause      - Pause debate',
      '  /resume     - Resume debate',
      '  /status     - Show consensus status',
      '  /synthesize - Move to synthesis phase',
      '  /export     - Export transcript',
      '  /quit       - Save and exit',
      '',
      '{bold}Shortcuts:{/bold}',
      '  Ctrl+C     - Save and exit',
      '  Ctrl+S     - Quick synthesize',
      '  Ctrl+E     - Quick export',
      '  PgUp/PgDn  - Scroll chat',
      '  F2 / F3    - Cycle wireframe views',
      '  Tab        - Cycle focus',
      '  Esc        - Focus input',
      '  F1         - This help',
    ];
    (this.widgets.chatLog as any).log('{yellow-fg}' + helpLines.join('\n') + '{/yellow-fg}');
    scheduleRender(this.screen);
  }

  /**
   * Render all widgets with current state
   */
  private renderAll(): void {
    this.updateHeader();
    this.updateBreadcrumbs();
    appendMessages(this.widgets.chatLog as any, this.state.messages);
    this.updateCanvas();
    this.updateAgentPanel();
    this.updateConsensusChart();
    this.updatePhaseTimeline();
    this.updateQuickReplies();
    updateStatusBar(this.widgets.statusBar, null);
  }

  // ─── Keyboard Navigation ───────────────────────────────────────────

  private setFocus(index: number): void {
    if (index === 0) {
      // Focus input widget and show cursor
      activateInput(this.widgets.input as any, this.screen);
    } else {
      this.screen.program.hideCursor();
      this.focusableWidgets[index].focus();
    }
    scheduleRender(this.screen);
  }

  private setupKeys(): void {
    // Ctrl+C — quit
    this.screen.key(['C-c'], () => {
      this.handleCommand('quit', []);
    });

    // Tab — cycle focus
    this.screen.key(['tab'], () => {
      this.focusIndex = (this.focusIndex + 1) % this.focusableWidgets.length;
      this.setFocus(this.focusIndex);
    });

    // Shift+Tab — reverse focus
    this.screen.key(['S-tab'], () => {
      this.focusIndex = (this.focusIndex - 1 + this.focusableWidgets.length) % this.focusableWidgets.length;
      this.setFocus(this.focusIndex);
    });

    // Escape — return focus to input
    this.screen.key(['escape'], () => {
      this.focusIndex = 0;
      activateInput(this.widgets.input as any, this.screen);
      scheduleRender(this.screen);
    });

    // F1 — help
    this.screen.key(['f1'], () => {
      this.showHelp();
    });

    // F5 — synthesize
    this.screen.key(['f5'], () => {
      this.handleCommand('synthesize', []);
    });

    // F9 — export
    this.screen.key(['f9'], () => {
      this.handleCommand('export', []);
    });

    // Ctrl+S — synthesize
    this.screen.key(['C-s'], () => {
      this.handleCommand('synthesize', []);
    });

    // Ctrl+E — export
    this.screen.key(['C-e'], () => {
      this.handleCommand('export', []);
    });

    // Number keys 1-4 — quick replies (only when input not focused)
    for (let i = 1; i <= 4; i++) {
      this.screen.key([String(i)], () => {
        // Only trigger if input is not focused
        if (this.focusIndex !== 0) {
          const reply = this.state.quickReplies[i - 1];
          if (reply) {
            if (reply.isCommand) {
              const parts = reply.value.slice(1).split(/\s+/);
              this.handleCommand(parts[0], parts.slice(1));
            } else {
              this.handleSubmit(reply.value);
            }
          }
        }
      });
    }

    // Ctrl+Up / Ctrl+Down — scroll chat (works from any focus)
    this.screen.key(['C-up'], () => {
      (this.widgets.chatLog as any).scroll(-3);
      scheduleRender(this.screen);
    });
    this.screen.key(['C-down'], () => {
      (this.widgets.chatLog as any).scroll(3);
      scheduleRender(this.screen);
    });

    // F2 / F3 — cycle canvas wireframe views (universally supported)
    this.screen.key(['f2'], () => {
      if (this.canvasViewOrder.length > 1) {
        this.canvasViewIndex = (this.canvasViewIndex - 1 + this.canvasViewOrder.length) % this.canvasViewOrder.length;
        this.applyCanvasView();
      }
    });
    this.screen.key(['f3'], () => {
      if (this.canvasViewOrder.length > 1) {
        this.canvasViewIndex = (this.canvasViewIndex + 1) % this.canvasViewOrder.length;
        this.applyCanvasView();
      }
    });

    // Ctrl+Left / Ctrl+Right — cycle canvas wireframe views (secondary, terminal-dependent)
    this.screen.key(['C-left'], () => {
      if (this.canvasViewOrder.length > 1) {
        this.canvasViewIndex = (this.canvasViewIndex - 1 + this.canvasViewOrder.length) % this.canvasViewOrder.length;
        this.applyCanvasView();
      }
    });
    this.screen.key(['C-right'], () => {
      if (this.canvasViewOrder.length > 1) {
        this.canvasViewIndex = (this.canvasViewIndex + 1) % this.canvasViewOrder.length;
        this.applyCanvasView();
      }
    });

    // Page Up/Down — scroll chat (works from any focus)
    this.screen.key(['pageup'], () => {
      (this.widgets.chatLog as any).scroll(-10);
      scheduleRender(this.screen);
    });
    this.screen.key(['pagedown'], () => {
      (this.widgets.chatLog as any).scroll(10);
      scheduleRender(this.screen);
    });
  }
}
