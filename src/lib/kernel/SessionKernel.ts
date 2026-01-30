/**
 * SessionKernel - The unified core engine for both Electron and CLI UIs
 *
 * This is the single source of truth for:
 * - Session lifecycle (create, start, stop, save, load)
 * - Configuration wizard
 * - Command processing
 * - Mode management
 * - Agent orchestration
 *
 * UIs are thin adapters that:
 * - Take input → pass to kernel.execute()
 * - Get responses → render to screen
 */

import { v4 as uuid } from 'uuid';
import type { AgentPersona, Message, Session, SessionConfig } from '../../types';
import type { IAgentRunner, IFileSystem } from '../interfaces';
import type {
  KernelState,
  KernelConfig,
  KernelCommand,
  KernelResponse,
  KernelEvent,
  KernelEventCallback,
  KernelOptions,
  SavedSessionInfo,
  ConfigStep,
} from './types';

import { messageBus } from '../eda/MessageBus';
import { EDAOrchestrator } from '../eda/EDAOrchestrator';
// ModeController is created and managed by EDAOrchestrator
import { getModeById, getAllModes } from '../modes';
import { getDefaultMethodology } from '../../methodologies';
import {
  AGENT_PERSONAS,
  registerCustomPersonas,
  clearCustomPersonas,
  getActivePersonas,
  getAgentById,
} from '../../agents/personas';

// Configuration wizard steps are built dynamically via getConfigSteps()

export class SessionKernel {
  // State
  private state: KernelState = 'idle';
  private config: KernelConfig = {};
  private configStep = 0;
  private selectedAgentIds: Set<string> = new Set();
  private currentPersonas: AgentPersona[] = AGENT_PERSONAS;
  private domainSkills?: string;

  // Session
  private session: Session | null = null;
  private orchestrator: EDAOrchestrator | null = null;
  // ModeController is managed by the orchestrator

  // Adapters
  private agentRunner?: IAgentRunner;
  private fileSystem?: IFileSystem;

  // Paths
  private sessionsDir: string;
  private outputDir: string;

  // Callbacks
  private eventCallbacks: KernelEventCallback[] = [];

  constructor(options: KernelOptions = {}) {
    this.agentRunner = options.agentRunner;
    this.fileSystem = options.fileSystem;
    this.sessionsDir = options.sessionsDir || 'output/sessions';
    this.outputDir = options.outputDir || 'output/sessions';

    if (options.onEvent) {
      this.eventCallbacks.push(options.onEvent);
    }

    // Subscribe to message bus events
    this.setupBusSubscriptions();
  }

  // ===========================================================================
  // PUBLIC API
  // ===========================================================================

  /**
   * Execute a command and return responses
   */
  async execute(command: KernelCommand): Promise<KernelResponse[]> {
    switch (command.type) {
      case 'new':
        return this.startConfiguration();

      case 'config_input':
        return this.handleConfigInput(command.value);

      case 'start':
        return this.startSession();

      case 'stop':
        return this.stopSession();

      case 'pause':
        return this.pauseSession();

      case 'resume':
        return this.resumeSession();

      case 'save':
        return this.saveSession();

      case 'export':
        return this.exportSession(command.format || 'md');

      case 'load':
        return this.loadSession(command.nameOrIndex);

      case 'sessions':
        return this.listSessions();

      case 'status':
        return this.getStatus();

      case 'memory':
        return this.getMemoryStats();

      case 'recall':
        return this.getRecall(command.agentId);

      case 'agents':
        return this.listAgents();

      case 'synthesize':
        return this.transitionToSynthesis(command.force);

      case 'consensus':
        return this.getConsensusStatus();

      case 'draft':
        return this.transitionToDraft();

      case 'say':
        return this.sendMessage(command.content);

      case 'token':
        return this.handleToken(command.key);

      case 'test':
        return this.testApiConnection();

      case 'help':
        return this.getHelp();

      case 'mode_info':
        return this.getModeInfo();

      default:
        return [{ type: 'error', content: `Unknown command: ${(command as any).type}` }];
    }
  }

  /**
   * Subscribe to kernel events
   */
  on(callback: KernelEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current state
   */
  getState(): KernelState {
    return this.state;
  }

  /**
   * Get current config
   */
  getConfig(): KernelConfig {
    return { ...this.config };
  }

  /**
   * Get current session
   */
  getSession(): Session | null {
    return this.session;
  }

  /**
   * Get orchestrator (for direct access if needed)
   */
  getOrchestrator(): EDAOrchestrator | null {
    return this.orchestrator;
  }

  /**
   * Set API key
   */
  setApiKey(key: string): void {
    this.config.apiKey = key;
  }

  /**
   * Set file system adapter
   */
  setFileSystem(fs: IFileSystem): void {
    this.fileSystem = fs;
  }

  /**
   * Set agent runner adapter
   */
  setAgentRunner(runner: IAgentRunner): void {
    this.agentRunner = runner;
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  private startConfiguration(): KernelResponse[] {
    this.state = 'configuring';
    this.config = { language: 'hebrew', mode: 'copywrite' };
    this.configStep = 0;
    this.selectedAgentIds.clear();
    this.currentPersonas = AGENT_PERSONAS;
    this.domainSkills = undefined;

    return [
      { type: 'info', content: '═══════════════════════════════════════' },
      { type: 'info', content: '  NEW SESSION CONFIGURATION' },
      { type: 'info', content: '═══════════════════════════════════════' },
      this.getCurrentConfigStep(),
    ];
  }

  private getCurrentConfigStep(): KernelResponse {
    const stepDefs = this.getConfigSteps();
    const step = stepDefs[this.configStep];

    if (!step) {
      return this.finishConfiguration()[0];
    }

    return {
      type: 'config_step',
      content: step.prompt,
      data: step,
    };
  }

  private getConfigSteps(): ConfigStep[] {
    const modes = getAllModes();
    const modeOptions = modes.map(m => ({
      value: m.id,
      label: `${m.icon} ${m.name}`,
      default: m.id === 'copywrite',
    }));

    const agentOptions = this.currentPersonas.map(a => ({
      value: a.id,
      label: `${a.name} (${a.nameHe})`,
      description: a.role,
      selected: this.selectedAgentIds.has(a.id),
    }));

    return [
      { id: 'projectName', prompt: 'Enter project name:' },
      { id: 'goal', prompt: 'Enter project goal:' },
      {
        id: 'agents',
        prompt: 'Select agents:',
        options: agentOptions,
        multiSelect: true,
        allowGenerate: true,
      },
      {
        id: 'language',
        prompt: 'Select language:',
        options: [
          { value: 'hebrew', label: 'Hebrew (עברית)', default: true },
          { value: 'english', label: 'English' },
          { value: 'mixed', label: 'Mixed' },
        ],
      },
      {
        id: 'mode',
        prompt: 'Select session mode:',
        options: modeOptions,
      },
    ];
  }

  private async handleConfigInput(input: string): Promise<KernelResponse[]> {
    if (this.state !== 'configuring') {
      return [{ type: 'error', content: 'Not in configuration mode' }];
    }

    const responses: KernelResponse[] = [];
    const steps = this.getConfigSteps();
    const step = steps[this.configStep];
    const value = input.trim();

    switch (step.id) {
      case 'projectName':
        this.config.projectName = value || 'Untitled Project';
        responses.push({ type: 'success', content: `Project: ${this.config.projectName}` });
        this.configStep++;
        break;

      case 'goal':
        this.config.goal = value || 'Create effective content';
        responses.push({ type: 'success', content: `Goal: ${this.config.goal}` });
        this.configStep++;
        break;

      case 'agents':
        const agentResult = await this.handleAgentSelection(value);
        responses.push(...agentResult);
        if (agentResult.some(r => r.type === 'success')) {
          this.configStep++;
        }
        break;

      case 'language':
        this.config.language = this.parseLanguage(value);
        responses.push({ type: 'success', content: `Language: ${this.config.language}` });
        this.configStep++;
        break;

      case 'mode':
        this.config.mode = this.parseMode(value);
        const mode = getModeById(this.config.mode);
        responses.push({ type: 'success', content: `Mode: ${mode?.icon || ''} ${mode?.name || this.config.mode}` });
        this.configStep++;
        break;
    }

    // Check if configuration is complete
    if (this.configStep >= steps.length) {
      responses.push(...this.finishConfiguration());
    } else {
      responses.push(this.getCurrentConfigStep());
    }

    return responses;
  }

  private async handleAgentSelection(input: string): Promise<KernelResponse[]> {
    const lower = input.toLowerCase();

    // Generate new personas
    if (lower === 'g' || lower === 'generate') {
      this.state = 'generating';
      const result = await this.generatePersonas();
      this.state = 'configuring';

      if (result.success && result.personas) {
        this.currentPersonas = result.personas;
        this.domainSkills = result.skills;
        registerCustomPersonas(result.personas);
        this.selectedAgentIds = new Set(result.personas.map(p => p.id));

        return [
          { type: 'success', content: `Generated ${result.personas.length} personas` },
          {
            type: 'list',
            content: 'New personas:',
            data: {
              title: 'Generated Personas',
              items: result.personas.map(p => ({ label: p.name, description: p.role })),
            },
          },
        ];
      } else {
        return [{ type: 'error', content: result.error || 'Failed to generate personas' }];
      }
    }

    // Use defaults
    if (lower === 'd' || lower === 'defaults') {
      this.currentPersonas = AGENT_PERSONAS;
      clearCustomPersonas();
      this.selectedAgentIds = new Set(AGENT_PERSONAS.map(p => p.id));
      return [{ type: 'success', content: 'Using default personas' }];
    }

    // Done selecting
    if (lower === 'done' || lower === 'ok' || lower === 'y' || lower === '') {
      if (this.selectedAgentIds.size === 0) {
        this.currentPersonas.forEach(p => this.selectedAgentIds.add(p.id));
      }
      this.config.agents = Array.from(this.selectedAgentIds);
      return [{ type: 'success', content: `Agents: ${this.config.agents.join(', ')}` }];
    }

    // Select all
    if (lower === 'a' || lower === 'all') {
      this.currentPersonas.forEach(p => this.selectedAgentIds.add(p.id));
      return [{ type: 'info', content: 'Selected all agents' }, this.getCurrentConfigStep()];
    }

    // Select none
    if (lower === 'n' || lower === 'none') {
      this.selectedAgentIds.clear();
      return [{ type: 'info', content: 'Cleared selection' }, this.getCurrentConfigStep()];
    }

    // Toggle by number
    const num = parseInt(lower, 10);
    if (!isNaN(num) && num >= 1 && num <= this.currentPersonas.length) {
      const agent = this.currentPersonas[num - 1];
      if (this.selectedAgentIds.has(agent.id)) {
        this.selectedAgentIds.delete(agent.id);
        return [{ type: 'info', content: `Removed: ${agent.name}` }, this.getCurrentConfigStep()];
      } else {
        this.selectedAgentIds.add(agent.id);
        return [{ type: 'info', content: `Added: ${agent.name}` }, this.getCurrentConfigStep()];
      }
    }

    // Toggle by id
    const agent = this.currentPersonas.find(a => a.id === lower || a.name.toLowerCase() === lower);
    if (agent) {
      if (this.selectedAgentIds.has(agent.id)) {
        this.selectedAgentIds.delete(agent.id);
        return [{ type: 'info', content: `Removed: ${agent.name}` }, this.getCurrentConfigStep()];
      } else {
        this.selectedAgentIds.add(agent.id);
        return [{ type: 'info', content: `Added: ${agent.name}` }, this.getCurrentConfigStep()];
      }
    }

    return [
      { type: 'warning', content: 'Unknown input. Use number, g/d/done' },
      this.getCurrentConfigStep(),
    ];
  }

  private parseLanguage(input: string): string {
    const lower = input.toLowerCase();
    if (lower === '1' || lower === 'hebrew' || lower === 'he' || !lower) return 'hebrew';
    if (lower === '2' || lower === 'english' || lower === 'en') return 'english';
    if (lower === '3' || lower === 'mixed') return 'mixed';
    return 'hebrew';
  }

  private parseMode(input: string): string {
    const lower = input.toLowerCase();
    const modes = getAllModes();

    // Check by number
    const num = parseInt(lower, 10);
    if (!isNaN(num) && num >= 1 && num <= modes.length) {
      return modes[num - 1].id;
    }

    // Check by id or name
    const mode = modes.find(m =>
      m.id === lower ||
      m.name.toLowerCase().includes(lower) ||
      lower.includes(m.id.split('-')[0])
    );

    return mode?.id || 'copywrite';
  }

  private finishConfiguration(): KernelResponse[] {
    this.state = 'ready';
    this.configStep = 0;

    const mode = getModeById(this.config.mode || 'copywrite');

    return [
      { type: 'success', content: 'Configuration complete!' },
      {
        type: 'status',
        content: 'Session ready',
        data: {
          state: 'ready',
          project: this.config.projectName,
          goal: this.config.goal,
          agents: this.config.agents,
          mode: `${mode?.icon || ''} ${mode?.name || this.config.mode}`,
        },
      },
      { type: 'info', content: "Type 'start' to begin the session" },
    ];
  }

  // ===========================================================================
  // SESSION LIFECYCLE
  // ===========================================================================

  private async startSession(): Promise<KernelResponse[]> {
    if (!this.config.projectName || !this.config.agents?.length) {
      return [{ type: 'error', content: "Not configured. Run 'new' first." }];
    }

    // Register personas
    if (this.currentPersonas !== AGENT_PERSONAS) {
      registerCustomPersonas(this.currentPersonas);
    }

    // Create session config
    const sessionConfig: SessionConfig = {
      id: uuid(),
      projectName: this.config.projectName!,
      goal: this.config.goal || 'Reach consensus',
      enabledAgents: this.config.agents!,
      humanParticipation: true,
      maxRounds: 10,
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: this.config.contextDir || 'context',
      outputDir: this.outputDir,
      language: this.config.language,
      mode: this.config.mode,
      apiKey: this.config.apiKey,
    };

    // Create session
    this.session = {
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

    // Set runner on message bus
    if (this.agentRunner) {
      messageBus.setAgentRunner(this.agentRunner);
    }

    // Create orchestrator
    this.orchestrator = new EDAOrchestrator(
      this.session,
      undefined,
      this.domainSkills,
      {
        agentRunner: this.agentRunner,
        fileSystem: this.fileSystem,
      }
    );

    // Subscribe to orchestrator events
    this.orchestrator.on((event) => {
      this.emitEvent({ type: event.type as any, data: event.data });
    });

    // Start
    this.state = 'running';
    this.orchestrator.start();

    const mode = getModeById(this.config.mode || 'copywrite');

    return [
      { type: 'success', content: `Session started: ${this.config.projectName}` },
      { type: 'info', content: `Mode: ${mode?.icon || ''} ${mode?.name || 'Custom'}` },
      { type: 'info', content: `Goal: ${this.config.goal}` },
      { type: 'info', content: `Agents: ${this.config.agents?.join(', ')}` },
      { type: 'info', content: "Type your message to join. Type 'help' for commands." },
    ];
  }

  private async stopSession(): Promise<KernelResponse[]> {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    // Save before stopping
    await this.saveSession();

    this.orchestrator.stop();
    this.orchestrator = null;
    this.session = null;
    this.state = 'idle';

    return [{ type: 'success', content: 'Session ended and saved' }];
  }

  private pauseSession(): KernelResponse[] {
    if (this.state !== 'running') {
      return [{ type: 'warning', content: 'No running session to pause' }];
    }

    messageBus.pause('user requested');
    this.state = 'paused';

    return [{ type: 'success', content: "Session paused. Type 'resume' to continue." }];
  }

  private resumeSession(): KernelResponse[] {
    if (this.state !== 'paused') {
      return [{ type: 'warning', content: 'Session not paused' }];
    }

    messageBus.resume();
    this.state = 'running';

    return [{ type: 'success', content: 'Session resumed' }];
  }

  // ===========================================================================
  // SESSION PERSISTENCE
  // ===========================================================================

  private async saveSession(): Promise<KernelResponse[]> {
    if (!this.session || !this.fileSystem) {
      return [{ type: 'error', content: 'No session to save or no file system' }];
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const safeName = (this.session.config.projectName || 'session')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 30);
      const sessionDir = `${this.outputDir}/${timestamp}-${safeName}`;

      await this.fileSystem.ensureDir(sessionDir);

      // Save metadata
      const metadata = {
        id: this.session.id,
        projectName: this.session.config.projectName,
        goal: this.session.config.goal,
        enabledAgents: this.session.config.enabledAgents,
        mode: this.session.config.mode,
        startedAt: this.session.startedAt.toISOString(),
        endedAt: new Date().toISOString(),
        messageCount: this.session.messages.length,
        currentPhase: this.session.currentPhase,
      };
      await this.fileSystem.writeFile(`${sessionDir}/session.json`, JSON.stringify(metadata, null, 2));

      // Save messages
      const messagesLines = this.session.messages.map(m => JSON.stringify(m)).join('\n');
      await this.fileSystem.writeFile(`${sessionDir}/messages.jsonl`, messagesLines);

      // Save memory
      const memoryState = messageBus.getMemoryState();
      await this.fileSystem.writeFile(`${sessionDir}/memory.json`, JSON.stringify(memoryState, null, 2));

      // Save transcript
      const transcript = this.generateTranscript();
      await this.fileSystem.writeFile(`${sessionDir}/transcript.md`, transcript);

      this.emitEvent({ type: 'session_saved', data: { path: sessionDir } });

      return [{ type: 'success', content: `Session saved to ${sessionDir}` }];
    } catch (error) {
      return [{ type: 'error', content: `Save failed: ${error}` }];
    }
  }

  private async loadSession(nameOrIndex: string): Promise<KernelResponse[]> {
    if (!this.fileSystem) {
      return [{ type: 'error', content: 'No file system configured' }];
    }

    try {
      // List sessions
      const sessions = await this.listSessionsRaw();
      if (sessions.length === 0) {
        return [{ type: 'error', content: 'No saved sessions found' }];
      }

      // Resolve name
      let sessionName = nameOrIndex;
      const index = parseInt(nameOrIndex, 10);
      if (!isNaN(index) && index >= 1 && index <= sessions.length) {
        sessionName = sessions[index - 1].name;
      }

      const session = sessions.find(s => s.name === sessionName || s.name.includes(sessionName));
      if (!session) {
        return [{ type: 'error', content: `Session not found: ${nameOrIndex}` }];
      }

      const sessionDir = `${this.sessionsDir}/${session.name}`;

      // Load metadata
      const metaContent = await this.fileSystem.readFile(`${sessionDir}/session.json`);
      const metadata = JSON.parse(metaContent || '{}');

      // Load messages
      let messages: Message[] = [];
      try {
        const messagesContent = await this.fileSystem.readFile(`${sessionDir}/messages.jsonl`);
        if (messagesContent) {
          messages = messagesContent
            .trim()
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
        }
      } catch {
        // No messages
      }

      // Load memory
      try {
        const memoryContent = await this.fileSystem.readFile(`${sessionDir}/memory.json`);
        if (memoryContent) {
          messageBus.restoreMemory(JSON.parse(memoryContent));
        }
      } catch {
        // No memory
      }

      // Update config
      this.config.projectName = metadata.projectName;
      this.config.goal = metadata.goal;
      this.config.agents = metadata.enabledAgents;
      this.config.mode = metadata.mode;
      this.selectedAgentIds = new Set(metadata.enabledAgents || []);
      this.state = 'ready';

      this.emitEvent({ type: 'session_loaded', data: { metadata, messages } });

      return [
        { type: 'success', content: 'Session loaded!' },
        { type: 'info', content: `Project: ${metadata.projectName}` },
        { type: 'info', content: `Goal: ${metadata.goal}` },
        { type: 'info', content: `Agents: ${(metadata.enabledAgents || []).join(', ')}` },
        { type: 'info', content: `Messages: ${messages.length}` },
        { type: 'info', content: "Type 'start' to continue this session" },
      ];
    } catch (error) {
      return [{ type: 'error', content: `Load failed: ${error}` }];
    }
  }

  private async listSessions(): Promise<KernelResponse[]> {
    const sessions = await this.listSessionsRaw();

    if (sessions.length === 0) {
      return [{ type: 'info', content: 'No saved sessions found' }];
    }

    return [{
      type: 'list',
      content: 'Saved sessions:',
      data: {
        title: 'Saved Sessions',
        items: sessions.map((s, i) => ({
          label: `${i + 1}. ${s.projectName}`,
          description: `${new Date(s.startedAt).toLocaleDateString()} • ${s.goal?.slice(0, 40) || ''}`,
        })),
        hint: "Use 'load <number>' to restore",
      },
    }];
  }

  private async listSessionsRaw(): Promise<SavedSessionInfo[]> {
    if (!this.fileSystem) return [];

    try {
      const dirs = await this.fileSystem.listDir(this.sessionsDir);
      const sessions: SavedSessionInfo[] = [];

      for (const dir of dirs.filter((d: string) => !d.startsWith('.'))) {
        try {
          const metaContent = await this.fileSystem.readFile(`${this.sessionsDir}/${dir}/session.json`);
          const meta = JSON.parse(metaContent || '{}');
          sessions.push({
            id: meta.id,
            name: dir,
            projectName: meta.projectName || dir,
            goal: meta.goal,
            startedAt: meta.startedAt,
            endedAt: meta.endedAt,
            messageCount: meta.messageCount || 0,
            mode: meta.mode,
          });
        } catch {
          sessions.push({
            id: dir,
            name: dir,
            projectName: dir,
            startedAt: '',
            messageCount: 0,
          });
        }
      }

      return sessions.sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''));
    } catch {
      return [];
    }
  }

  private async exportSession(format: string): Promise<KernelResponse[]> {
    if (!this.session) {
      return [{ type: 'error', content: 'No session to export' }];
    }

    const content = format === 'json'
      ? JSON.stringify(this.session, null, 2)
      : this.generateTranscript();

    return [
      { type: 'success', content: `Exported as ${format}` },
      { type: 'info', content: content.slice(0, 500) + '...' },
    ];
  }

  private generateTranscript(): string {
    if (!this.session) return '';

    const lines: string[] = [
      `# ${this.session.config.projectName} - Transcript`,
      '',
      `**Goal:** ${this.session.config.goal}`,
      `**Date:** ${this.session.startedAt}`,
      '',
      '---',
      '',
    ];

    for (const msg of this.session.messages) {
      const sender = msg.agentId === 'human' ? 'Human' :
                     msg.agentId === 'system' ? 'System' :
                     getAgentById(msg.agentId)?.name || msg.agentId;
      lines.push(`### ${sender}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }

  // ===========================================================================
  // STATUS & INFO
  // ===========================================================================

  private getStatus(): KernelResponse[] {
    const mode = getModeById(this.config.mode || 'copywrite');
    const memStats = messageBus.getMemoryStats();

    let consensus = undefined;
    if (this.orchestrator) {
      const cs = this.orchestrator.getConsensusStatus();
      consensus = { ready: cs.ready, points: cs.consensusPoints, conflicts: cs.conflictPoints };
    }

    return [{
      type: 'status',
      content: 'Session status',
      data: {
        state: this.state,
        project: this.config.projectName,
        goal: this.config.goal,
        phase: this.session?.currentPhase,
        mode: `${mode?.icon || ''} ${mode?.name || 'Custom'}`,
        messages: this.session?.messages.length,
        agents: this.config.agents,
        consensus,
        memory: {
          summaries: memStats.summaryCount,
          decisions: memStats.decisionCount,
          proposals: memStats.proposalCount,
        },
      },
    }];
  }

  private getMemoryStats(): KernelResponse[] {
    const stats = messageBus.getMemoryStats();

    return [
      { type: 'info', content: 'CONVERSATION MEMORY' },
      { type: 'info', content: `Summaries: ${stats.summaryCount}` },
      { type: 'info', content: `Key Decisions: ${stats.decisionCount}` },
      { type: 'info', content: `Active Proposals: ${stats.proposalCount}` },
      { type: 'info', content: `Tracked Agents: ${stats.agentCount}` },
      stats.summaryCount > 0
        ? { type: 'info', content: "Memory active. Use 'recall [agent]' to test." }
        : { type: 'info', content: 'Memory builds after ~12 messages.' },
    ];
  }

  private getRecall(agentId?: string): KernelResponse[] {
    const context = messageBus.getMemoryContext(agentId);
    const stats = messageBus.getMemoryStats();

    if (stats.summaryCount === 0) {
      const messages = messageBus.getAllMessages();
      return [
        { type: 'warning', content: 'No memory built yet' },
        { type: 'info', content: `Messages so far: ${messages.length}` },
      ];
    }

    return [
      { type: 'info', content: `Memory context${agentId ? ` for ${agentId}` : ''}:` },
      { type: 'info', content: context },
    ];
  }

  private listAgents(): KernelResponse[] {
    const personas = getActivePersonas();
    const isCustom = personas !== AGENT_PERSONAS;

    return [{
      type: 'list',
      content: isCustom ? 'Active Agents (Custom)' : 'Available Agents',
      data: {
        title: isCustom ? 'Custom Personas' : 'Default Personas',
        items: personas.map(a => ({
          label: `${a.name} (${a.nameHe})`,
          description: a.role,
          selected: this.config.agents?.includes(a.id),
        })),
      },
    }];
  }

  private getConsensusStatus(): KernelResponse[] {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    const status = this.orchestrator.getConsensusStatus();

    return [
      { type: 'info', content: 'CONSENSUS STATUS' },
      { type: 'info', content: `Ready: ${status.ready ? 'YES' : 'NO'}` },
      { type: 'info', content: `Consensus points: ${status.consensusPoints}` },
      { type: 'info', content: `Conflict points: ${status.conflictPoints}` },
      { type: 'info', content: `Recommendation: ${status.recommendation}` },
    ];
  }

  private getModeInfo(): KernelResponse[] {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    const info = this.orchestrator.getModeInfo();

    return [
      { type: 'info', content: `Mode: ${info.name}` },
      { type: 'info', content: `Phase: ${info.phase}` },
      { type: 'info', content: `Progress: ${JSON.stringify(info.progress)}` },
    ];
  }

  // ===========================================================================
  // PHASE TRANSITIONS
  // ===========================================================================

  private async transitionToSynthesis(force?: boolean): Promise<KernelResponse[]> {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    try {
      const result = await this.orchestrator.transitionToSynthesis(force || false);
      return [{ type: result.success ? 'success' : 'warning', content: result.message }];
    } catch (error) {
      return [{ type: 'error', content: `Transition failed: ${error}` }];
    }
  }

  private async transitionToDraft(): Promise<KernelResponse[]> {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    try {
      await this.orchestrator.transitionToDrafting();
      return [{ type: 'success', content: 'Transitioned to drafting phase' }];
    } catch (error) {
      return [{ type: 'error', content: `Transition failed: ${error}` }];
    }
  }

  // ===========================================================================
  // MESSAGING
  // ===========================================================================

  private async sendMessage(content: string): Promise<KernelResponse[]> {
    if (!this.orchestrator) {
      return [{ type: 'error', content: 'No session running' }];
    }

    if (this.state === 'paused') {
      return [{ type: 'warning', content: "Session paused. Type 'resume' first." }];
    }

    await this.orchestrator.addHumanMessage(content);
    return []; // Message will be emitted via event
  }

  // ===========================================================================
  // API & TOKENS
  // ===========================================================================

  private handleToken(key?: string): KernelResponse[] {
    if (key) {
      this.config.apiKey = key;
      return [{ type: 'success', content: 'API key set' }];
    }

    if (this.config.apiKey) {
      return [{ type: 'info', content: `API key set (${this.config.apiKey.slice(0, 10)}...)` }];
    }

    return [{ type: 'warning', content: "No API key. Use: token <key>" }];
  }

  private async testApiConnection(): Promise<KernelResponse[]> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "OK"' }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return [{ type: 'success', content: `API connected: ${text}` }];
    } catch (error: any) {
      return [{ type: 'error', content: `API failed: ${error.message}` }];
    }
  }

  // ===========================================================================
  // HELP
  // ===========================================================================

  private getHelp(): KernelResponse[] {
    return [{
      type: 'help',
      content: 'Available commands',
      data: {
        sections: [
          {
            title: 'Setup',
            commands: [
              { command: 'new', description: 'Start new session configuration' },
              { command: 'start', description: 'Start configured session' },
              { command: 'token [key]', description: 'Set/show API key' },
              { command: 'test', description: 'Test API connection' },
            ],
          },
          {
            title: 'Session Management',
            commands: [
              { command: 'sessions', description: 'List saved sessions' },
              { command: 'load <name>', description: 'Load a saved session' },
              { command: 'save', description: 'Save current session' },
              { command: 'export [format]', description: 'Export (md, json)' },
              { command: 'stop', description: 'End session' },
            ],
          },
          {
            title: 'During Session',
            commands: [
              { command: '<text>', description: 'Send message to debate' },
              { command: 'status', description: 'Show session status' },
              { command: 'memory', description: 'Show conversation memory' },
              { command: 'recall [agent]', description: 'Test agent memory' },
              { command: 'agents', description: 'List active agents' },
              { command: 'pause / resume', description: 'Pause/resume session' },
            ],
          },
          {
            title: 'Phase Control',
            commands: [
              { command: 'consensus', description: 'Check consensus status' },
              { command: 'synthesize', description: 'Move to synthesis phase' },
              { command: 'draft', description: 'Move to drafting phase' },
            ],
          },
        ],
      },
    }];
  }

  // ===========================================================================
  // PERSONA GENERATION
  // ===========================================================================

  private async generatePersonas(): Promise<{ success: boolean; personas?: AgentPersona[]; skills?: string; error?: string }> {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: this.config.apiKey });

      const prompt = `Generate debate personas for this project:

**Project:** ${this.config.projectName}
**Goal:** ${this.config.goal}

Create 4-5 personas that would be valuable stakeholders in debating and making decisions for this project.`;

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: `You generate debate personas. Return JSON with "personas" array and optional "expertise" string.`,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return { success: false, error: 'Failed to parse response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        personas: parsed.personas || parsed,
        skills: parsed.expertise,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  private setupBusSubscriptions(): void {
    messageBus.subscribe('message:new', (payload) => {
      if (this.session) {
        const agent = getAgentById(payload.fromAgent);
        this.emitEvent({
          type: 'agent_message',
          data: {
            agentId: payload.fromAgent,
            agentName: agent?.name || payload.fromAgent,
            message: payload.message,
          },
        });
      }
    }, 'kernel');
  }

  private emitEvent(event: KernelEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[SessionKernel] Event callback error:', error);
      }
    }
  }
}
