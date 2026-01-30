/**
 * MainShell - Main control terminal for session management
 * Handles commands, session initialization, and orchestrator control
 */

import { messageBus } from '../../lib/eda/MessageBus';
import { AGENT_PERSONAS, getActivePersonas, registerCustomPersonas, clearCustomPersonas } from '../../agents/personas';
import type { AgentPersona } from '../../types';

type WriteFunction = (text: string) => void;
type WriteLineFunction = (text: string) => void;

interface SessionConfig {
  projectName: string;
  goal: string;
  apiKey: string;
  agents: string[];
  contextDir: string;
  language: string;
  mode: string;
}

type PhaseCallback = (force?: boolean) => Promise<{ success: boolean; message: string } | void>;
type ConsensusCallback = () => { ready: boolean; recommendation: string; consensusPoints: number; conflictPoints: number } | null;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

export class MainShell {
  private write: WriteFunction;
  private writeLine: WriteLineFunction;
  private inputBuffer = '';
  private config: Partial<SessionConfig> = {};
  private state: 'idle' | 'configuring' | 'running' | 'paused' | 'setting_token' | 'generating_personas' | 'selecting_agents' = 'idle' as const;
  private configStep = 0;
  private currentPersonas: AgentPersona[] = AGENT_PERSONAS; // Can be replaced with generated personas
  private selectedAgentIds: Set<string> = new Set(); // For interactive agent selection
  private onStartSession?: (config: SessionConfig) => Promise<void>;
  private onStopSession?: () => void;
  private onSendMessage?: (content: string) => Promise<void>;
  private onSynthesis?: PhaseCallback;
  private onDraft?: PhaseCallback;
  private onGetConsensus?: ConsensusCallback;
  private unsubscribers: (() => void)[] = [];

  constructor(
    write: WriteFunction,
    writeLine: WriteLineFunction,
    callbacks: {
      onStartSession?: (config: SessionConfig) => Promise<void>;
      onStopSession?: () => void;
      onSendMessage?: (content: string) => Promise<void>;
      onSynthesis?: PhaseCallback;
      onDraft?: PhaseCallback;
      onGetConsensus?: ConsensusCallback;
    }
  ) {
    this.write = write;
    this.writeLine = writeLine;
    this.onStartSession = callbacks.onStartSession;
    this.onStopSession = callbacks.onStopSession;
    this.onSendMessage = callbacks.onSendMessage;
    this.onSynthesis = callbacks.onSynthesis;
    this.onDraft = callbacks.onDraft;
    this.onGetConsensus = callbacks.onGetConsensus;
  }

  /**
   * Initialize the shell
   */
  init(): void {
    this.showBanner();

    // Load credentials only (not session config)
    this.loadCredentials().then(async () => {
      // Check for saved sessions
      const sessions = await window.electronAPI?.listSessions?.();

      if (sessions && sessions.length > 0) {
        this.writeLine(`${DIM}${sessions.length} saved session(s) available. Type 'sessions' to view.${RESET}`);
        this.writeLine('');
      }

      this.showHelp();
      this.writeLine('');
      this.prompt();
    });

    // Subscribe to bus events
    this.unsubscribers.push(
      messageBus.subscribe('message:new', (payload) => {
        if (this.state === 'running' && payload.fromAgent === 'system') {
          this.writeLine(`${DIM}[SYSTEM]${RESET} ${payload.message.content}`);
        }
      }, 'main-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:end', () => {
        this.state = 'idle';
        this.writeLine(`${YELLOW}Session ended.${RESET}`);
        this.prompt();
      }, 'main-shell')
    );
  }

  /**
   * Load credentials only (API key from Claude Code or settings)
   */
  private async loadCredentials(): Promise<void> {
    try {
      // First try to load from Claude Code credentials (~/.claude/credentials.json)
      const claudeToken = await window.electronAPI?.getClaudeToken?.();
      if (claudeToken) {
        this.config.apiKey = claudeToken;
        this.writeLine(`${GREEN}✓ Claude Code credentials loaded${RESET}`);
      } else {
        // Fallback to manually saved API key
        const apiKey = await window.electronAPI?.getSetting?.('apiKey') as string | null;
        if (apiKey) {
          this.config.apiKey = apiKey;
        }
      }

      // Load language preference only
      const language = await window.electronAPI?.getSetting?.('language') as string | null;
      if (language) {
        this.config.language = language;
      } else {
        this.config.language = 'hebrew'; // Default to Hebrew
      }
    } catch {
      // Settings not available
    }
  }

  /**
   * Save current session config
   */
  private async saveSessionConfig(): Promise<void> {
    try {
      const sessionToSave = {
        projectName: this.config.projectName,
        goal: this.config.goal,
        agents: this.config.agents,
        language: this.config.language,
        contextDir: this.config.contextDir,
      };
      await window.electronAPI?.setSetting?.('lastSession', sessionToSave);
    } catch {
      // Failed to save
    }
  }

  /**
   * Handle keyboard input
   */
  handleInput(data: string): void {
    // Handle special characters
    if (data === '\r' || data === '\n') {
      // Enter pressed
      this.writeLine('');
      this.processCommand(this.inputBuffer.trim());
      this.inputBuffer = '';
      return;
    }

    if (data === '\x7f' || data === '\b') {
      // Backspace
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.write('\b \b');
      }
      return;
    }

    if (data === '\x03') {
      // Ctrl+C
      this.writeLine('^C');
      this.inputBuffer = '';
      if (this.state === 'configuring') {
        this.state = 'idle';
        this.config = {};
        this.configStep = 0;
        this.writeLine(`${RED}Configuration cancelled.${RESET}`);
      }
      this.prompt();
      return;
    }

    // Regular character
    this.inputBuffer += data;
    this.write(data);
  }

  /**
   * Process entered command
   */
  private processCommand(input: string): void {
    if (this.state === 'configuring') {
      this.handleConfigInput(input);
      return;
    }

    if (this.state === 'setting_token') {
      this.handleTokenInput(input);
      return;
    }

    const [cmd, ...args] = input.split(' ');

    switch (cmd.toLowerCase()) {
      case 'help':
      case '?':
        this.showHelp();
        break;

      case 'new':
      case 'init':
        this.startConfiguration();
        break;

      case 'start':
        if (this.validateConfig()) {
          this.startSession();
        } else {
          this.writeLine(`${RED}No session configured. Run 'new' first.${RESET}`);
        }
        break;

      case 'stop':
        if (this.state === 'running') {
          this.stopSession();
        } else {
          this.writeLine(`${YELLOW}No session running.${RESET}`);
        }
        break;

      case 'pause':
        if (this.state === 'running') {
          this.state = 'paused';
          this.writeLine(`${YELLOW}Session paused.${RESET}`);
        }
        break;

      case 'resume':
        if (this.state === 'paused') {
          this.state = 'running';
          this.writeLine(`${GREEN}Session resumed.${RESET}`);
        }
        break;

      case 'say':
      case 's':
        if (this.state === 'running' && args.length > 0) {
          this.sendMessage(args.join(' '));
        } else if (this.state !== 'running') {
          this.writeLine(`${RED}No session running.${RESET}`);
        } else {
          this.writeLine(`${YELLOW}Usage: say <message>${RESET}`);
        }
        break;

      case 'status':
        this.showStatus();
        break;

      case 'memory':
      case 'context':
        this.showMemoryStats();
        break;

      case 'agents':
        this.showAgents();
        break;

      case 'token':
      case 'setkey':
      case 'apikey':
        if (args.length > 0) {
          this.setApiKey(args[0]);
        } else {
          this.promptForApiKey();
        }
        break;

      case 'test':
        this.testApiConnection();
        break;

      case 'synthesize':
      case 'syn':
        if (this.state === 'running') {
          const forceSync = args[0]?.toLowerCase() === 'force';
          this.transitionToSynthesis(forceSync);
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'consensus':
      case 'ready':
        if (this.state === 'running') {
          this.showConsensusStatus();
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'recall':
        // Test agent memory by asking what they remember
        if (this.state === 'running') {
          this.testAgentMemory(args[0]);
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'draft':
      case 'write':
        if (this.state === 'running') {
          this.transitionToDrafting();
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'clear':
      case 'cls':
        this.write('\x1b[2J\x1b[H');
        break;

      case 'sessions':
      case 'ls':
        this.listSessions();
        break;

      case 'load':
        if (args.length > 0) {
          this.loadSession(args.join(' '));
        } else {
          this.writeLine(`${YELLOW}Usage: load <session-name>${RESET}`);
          this.writeLine(`${DIM}Use 'sessions' to see available sessions.${RESET}`);
        }
        break;

      case 'export':
        if (this.state === 'running') {
          this.exportCurrentSession(args[0] || 'md');
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'save':
        if (this.state === 'running') {
          this.saveCurrentSession();
        } else {
          this.writeLine(`${RED}No session running. Start a session first.${RESET}`);
        }
        break;

      case 'exit':
      case 'quit':
        this.writeLine(`${DIM}Goodbye.${RESET}`);
        break;

      case '':
        // Empty command
        break;

      default:
        if (this.state === 'running') {
          // In running state, treat unknown input as a message
          this.sendMessage(input);
        } else {
          this.writeLine(`${RED}Unknown command: ${cmd}${RESET}`);
          this.writeLine(`${DIM}Type 'help' for available commands.${RESET}`);
        }
    }

    if ((this.state as string) !== 'configuring' && (this.state as string) !== 'setting_token') {
      this.prompt();
    }
  }

  /**
   * Handle configuration input
   * Steps: 0=Project name, 1=Goal, 2=Agents, 3=Language, 4=Context dir
   * Note: API key is set separately via 'token' command and persisted
   */
  private handleConfigInput(input: string): void {
    switch (this.configStep) {
      case 0: // Project name
        this.config.projectName = input || 'Untitled Project';
        this.writeLine(`${GREEN}Project: ${this.config.projectName}${RESET}`);
        this.configStep++;
        this.writeLine(`${CYAN}Enter project goal:${RESET}`);
        this.write('> ');
        break;

      case 1: // Goal
        this.config.goal = input || 'Create effective website copy';
        this.writeLine(`${GREEN}Goal: ${this.config.goal}${RESET}`);
        this.configStep++;
        this.showAgentSelection();
        break;

      case 2: // Agent selection (interactive)
        const inputLower = input.toLowerCase().trim();

        // Check for special commands
        if (inputLower === 'g' || inputLower === 'generate') {
          // Generate new personas
          this.selectedAgentIds.clear(); // Reset selection for new personas
          this.generatePersonasForProject();
          return; // Will continue after generation
        }

        if (inputLower === 'd' || inputLower === 'default') {
          // Reset to default personas
          this.currentPersonas = AGENT_PERSONAS;
          this.selectedAgentIds.clear();
          this.currentPersonas.forEach(a => this.selectedAgentIds.add(a.id));
          clearCustomPersonas();
          this.writeLine(`${GREEN}Using default personas${RESET}`);
          this.showAgentSelection(); // Show again with defaults
          return;
        }

        if (inputLower === 'a' || inputLower === 'all') {
          // Select all
          this.currentPersonas.forEach(a => this.selectedAgentIds.add(a.id));
          this.showAgentSelection();
          return;
        }

        if (inputLower === 'n' || inputLower === 'none') {
          // Select none
          this.selectedAgentIds.clear();
          this.showAgentSelection();
          return;
        }

        if (inputLower === '') {
          // Empty input - just show menu again
          this.write('> ');
          return;
        }

        if (inputLower === 'done' || inputLower === 'ok' || inputLower === 'continue' || inputLower === 'y' || inputLower === 'yes') {
          // Finalize selection
          if (this.selectedAgentIds.size === 0) {
            this.writeLine(`${RED}Please select at least one agent.${RESET}`);
            this.showAgentSelection();
            return;
          }

          this.config.agents = Array.from(this.selectedAgentIds);

          // Register custom personas if not using defaults
          if (this.currentPersonas !== AGENT_PERSONAS) {
            registerCustomPersonas(this.currentPersonas);
          }

          this.writeLine(`${GREEN}Agents: ${this.config.agents.join(', ')}${RESET}`);
          this.configStep++;
          this.showLanguageSelection();
          return;
        }

        // Check if it's a number (toggle by index)
        const num = parseInt(inputLower, 10);
        if (!isNaN(num) && num >= 1 && num <= this.currentPersonas.length) {
          const agent = this.currentPersonas[num - 1];
          if (this.selectedAgentIds.has(agent.id)) {
            this.selectedAgentIds.delete(agent.id);
            this.writeLine(`${RED}✗ Removed: ${agent.name}${RESET}`);
          } else {
            this.selectedAgentIds.add(agent.id);
            this.writeLine(`${GREEN}✓ Added: ${agent.name}${RESET}`);
          }
          this.showAgentSelection();
          return;
        }

        // Check if it's an agent ID (toggle by id)
        const agentById = this.currentPersonas.find(a => a.id === inputLower || a.name.toLowerCase() === inputLower);
        if (agentById) {
          if (this.selectedAgentIds.has(agentById.id)) {
            this.selectedAgentIds.delete(agentById.id);
            this.writeLine(`${RED}✗ Removed: ${agentById.name}${RESET}`);
          } else {
            this.selectedAgentIds.add(agentById.id);
            this.writeLine(`${GREEN}✓ Added: ${agentById.name}${RESET}`);
          }
          this.showAgentSelection();
          return;
        }

        // Unknown input
        this.writeLine(`${YELLOW}Unknown command. Use number to toggle, 'g' to generate, 'a' for all, 'n' for none, 'done' to continue.${RESET}`);
        this.write('> ');
        break;

      case 3: // Language selection
        const lang = input.toLowerCase().trim();
        if (lang === '1' || lang === 'hebrew' || lang === 'he' || !lang) {
          this.config.language = 'hebrew';
        } else if (lang === '2' || lang === 'english' || lang === 'en') {
          this.config.language = 'english';
        } else if (lang === '3' || lang === 'mixed') {
          this.config.language = 'mixed';
        } else {
          this.config.language = lang; // Custom language
        }
        this.writeLine(`${GREEN}Language: ${this.config.language}${RESET}`);
        this.configStep++;
        this.showModeSelection();
        break;

      case 4: // Mode selection
        const mode = input.toLowerCase().trim();
        if (mode === '1' || mode === 'copywrite' || mode === 'copy' || !mode) {
          this.config.mode = 'copywrite';
          this.writeLine(`${GREEN}Mode: Copywriting ✍️${RESET}`);
        } else if (mode === '2' || mode === 'survey' || mode === 'site') {
          this.config.mode = 'site-survey';
          this.writeLine(`${GREEN}Mode: Site Survey 🔎${RESET}`);
        } else if (mode === '3' || mode === 'validate' || mode === 'validation') {
          this.config.mode = 'idea-validation';
          this.writeLine(`${GREEN}Mode: Idea Validation 🔍${RESET}`);
        } else if (mode === '4' || mode === 'ideation' || mode === 'ideas') {
          this.config.mode = 'ideation';
          this.writeLine(`${GREEN}Mode: Ideation 💡${RESET}`);
        } else if (mode === '5' || mode === 'work' || mode === 'feasibility') {
          this.config.mode = 'will-it-work';
          this.writeLine(`${GREEN}Mode: Will It Work? ⚖️${RESET}`);
        } else if (mode === '6' || mode === 'business' || mode === 'plan') {
          this.config.mode = 'business-plan';
          this.writeLine(`${GREEN}Mode: Business Plan 📊${RESET}`);
        } else if (mode === '7' || mode === 'gtm' || mode === 'launch') {
          this.config.mode = 'gtm-strategy';
          this.writeLine(`${GREEN}Mode: Go-to-Market 🚀${RESET}`);
        } else if (mode === '8' || mode === 'custom') {
          this.config.mode = 'custom';
          this.writeLine(`${GREEN}Mode: Custom ⚙️${RESET}`);
        } else {
          this.config.mode = 'copywrite';
          this.writeLine(`${GREEN}Mode: Copywriting ✍️ (default)${RESET}`);
        }
        this.configStep++;
        this.writeLine(`${CYAN}Enter context directory (or press Enter for default):${RESET}`);
        this.write('> ');
        break;

      case 5: // Context directory
        this.config.contextDir = input || 'context';
        this.writeLine(`${GREEN}Context: ${this.config.contextDir}${RESET}`);
        this.finishConfiguration();
        break;
    }
  }

  /**
   * Show language selection options
   */
  private showLanguageSelection(): void {
    this.writeLine('');
    this.writeLine(`${CYAN}Select discussion language:${RESET}`);
    this.writeLine(`  ${BOLD}1${RESET} - Hebrew (עברית) - default`);
    this.writeLine(`  ${BOLD}2${RESET} - English`);
    this.writeLine(`  ${BOLD}3${RESET} - Mixed (Hebrew + English)`);
    this.writeLine('');
    this.writeLine(`${DIM}Enter number or language name:${RESET}`);
    this.write('> ');
  }

  /**
   * Show mode selection options
   */
  private showModeSelection(): void {
    this.writeLine('');
    this.writeLine(`${CYAN}Select session mode:${RESET}`);
    this.writeLine(`  ${BOLD}1${RESET} - ✍️  Copywriting - Create compelling website copy (default)`);
    this.writeLine(`  ${BOLD}2${RESET} - 🔎 Site Survey - Analyze existing site & rewrite copy`);
    this.writeLine(`  ${BOLD}3${RESET} - 🔍 Idea Validation - Test if an idea is viable`);
    this.writeLine(`  ${BOLD}4${RESET} - 💡 Ideation - Generate ideas through research`);
    this.writeLine(`  ${BOLD}5${RESET} - ⚖️  Will It Work? - Reach a definitive conclusion`);
    this.writeLine(`  ${BOLD}6${RESET} - 📊 Business Plan - Create a structured business plan`);
    this.writeLine(`  ${BOLD}7${RESET} - 🚀 Go-to-Market - Launch strategy & GTM plan`);
    this.writeLine(`  ${BOLD}8${RESET} - ⚙️  Custom - Open-ended discussion`);
    this.writeLine('');
    this.writeLine(`${DIM}Each mode has specific goals, phases, and keeps agents focused.${RESET}`);
    this.writeLine(`${DIM}Enter number or mode name:${RESET}`);
    this.write('> ');
  }

  /**
   * Start configuration wizard
   */
  private startConfiguration(): void {
    this.state = 'configuring';
    this.config = {};
    this.configStep = 0;
    this.selectedAgentIds.clear(); // Reset agent selection
    this.currentPersonas = AGENT_PERSONAS; // Reset to default personas

    this.writeLine('');
    this.writeLine(`${MAGENTA}${BOLD}═══════════════════════════════════════${RESET}`);
    this.writeLine(`${MAGENTA}${BOLD}  NEW SESSION CONFIGURATION${RESET}`);
    this.writeLine(`${MAGENTA}${BOLD}═══════════════════════════════════════${RESET}`);
    this.writeLine('');
    this.writeLine(`${CYAN}Enter project name:${RESET}`);
    this.write('> ');
  }

  /**
   * Show agent selection options
   */
  private showAgentSelection(): void {
    // Initialize all agents as selected by default
    if (this.selectedAgentIds.size === 0) {
      this.currentPersonas.forEach(a => this.selectedAgentIds.add(a.id));
    }

    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}PERSONA OPTIONS:${RESET}`);
    this.writeLine(`  ${YELLOW}g${RESET} - 🔥 Generate new personas for this project`);
    this.writeLine(`  ${YELLOW}d${RESET} - Use default personas (copywriting experts)`);
    this.writeLine('');
    this.writeLine(`${CYAN}Select agents (toggle with number):${RESET}`);
    this.currentPersonas.forEach((agent, index) => {
      const isSelected = this.selectedAgentIds.has(agent.id);
      const checkbox = isSelected ? `${GREEN}[✓]${RESET}` : `${DIM}[ ]${RESET}`;
      const num = `${BOLD}${index + 1}${RESET}`;
      const name = isSelected ? `${BOLD}${agent.name}${RESET}` : `${DIM}${agent.name}${RESET}`;
      this.writeLine(`  ${checkbox} ${num}. ${name} (${agent.nameHe}) - ${agent.role}`);
    });
    this.writeLine('');
    const selectedCount = this.selectedAgentIds.size;
    this.writeLine(`${DIM}Selected: ${selectedCount}/${this.currentPersonas.length} agents${RESET}`);
    this.writeLine('');
    this.writeLine(`${DIM}Type number to toggle, 'g' generate, 'd' defaults, 'a' all, 'n' none${RESET}`);
    this.writeLine(`${DIM}Type 'done' when ready to continue${RESET}`);
    this.write('> ');
  }

  /**
   * Generate personas for the current project
   */
  private async generatePersonasForProject(): Promise<void> {
    if (!window.electronAPI?.generatePersonas) {
      this.writeLine(`${RED}Persona generation not available.${RESET}`);
      this.showAgentSelection();
      return;
    }

    this.state = 'generating_personas';
    this.writeLine('');
    this.writeLine(`${MAGENTA}${BOLD}🔥 Generating personas for "${this.config.projectName}"...${RESET}`);
    this.writeLine(`${DIM}This may take a moment...${RESET}`);

    try {
      const result = await window.electronAPI.generatePersonas({
        projectName: this.config.projectName || 'New Project',
        goal: this.config.goal || 'General discussion',
        count: 5,
      });

      if (result.success && result.personas) {
        this.currentPersonas = result.personas;
        registerCustomPersonas(result.personas);

        // Notify UI that personas changed
        messageBus.emit('personas:changed', { count: result.personas.length });

        this.writeLine('');
        this.writeLine(`${GREEN}${BOLD}✓ Generated ${result.personas.length} personas:${RESET}`);
        for (const p of result.personas) {
          this.writeLine(`  ${BOLD}${p.name}${RESET} (${p.nameHe}) - ${p.role}`);
        }
        if (result.savedAs) {
          this.writeLine(`${DIM}Saved to: personas/${result.savedAs}.json${RESET}`);
        }
        this.writeLine('');
      } else {
        this.writeLine(`${RED}Failed to generate personas: ${result.error}${RESET}`);
      }
    } catch (error) {
      this.writeLine(`${RED}Error generating personas: ${error}${RESET}`);
    }

    this.state = 'configuring';
    this.showAgentSelection();
  }

  /**
   * Finish configuration
   */
  private finishConfiguration(): void {
    this.state = 'idle';
    this.configStep = 0;

    // Save session config for next time
    this.saveSessionConfig();

    const modeNames: Record<string, string> = {
      'copywrite': '✍️ Copywriting',
      'site-survey': '🔎 Site Survey',
      'idea-validation': '🔍 Idea Validation',
      'ideation': '💡 Ideation',
      'will-it-work': '⚖️ Will It Work?',
      'business-plan': '📊 Business Plan',
      'gtm-strategy': '🚀 Go-to-Market',
      'custom': '⚙️ Custom',
    };

    this.writeLine('');
    this.writeLine(`${GREEN}${BOLD}Configuration complete!${RESET}`);
    this.writeLine('');
    this.writeLine(`${DIM}Project: ${this.config.projectName}${RESET}`);
    this.writeLine(`${DIM}Goal: ${this.config.goal}${RESET}`);
    this.writeLine(`${DIM}Agents: ${this.config.agents?.join(', ')}${RESET}`);
    this.writeLine(`${DIM}Mode: ${modeNames[this.config.mode || 'copywrite'] || this.config.mode}${RESET}`);
    this.writeLine(`${DIM}Language: ${this.config.language}${RESET}`);
    this.writeLine('');
    this.writeLine(`${YELLOW}Type 'start' to begin the session, or 'new' for new project.${RESET}`);
    this.prompt();
  }

  /**
   * Prompt for API key
   */
  private promptForApiKey(): void {
    this.state = 'setting_token';
    this.writeLine('');
    this.writeLine(`${CYAN}Enter your Claude API key:${RESET}`);
    this.writeLine(`${DIM}(Input will be hidden for security)${RESET}`);
    this.write('> ');
  }

  /**
   * Handle token input
   */
  private async handleTokenInput(input: string): Promise<void> {
    if (!input) {
      this.writeLine(`${RED}API key cannot be empty.${RESET}`);
      this.write('> ');
      return;
    }

    await this.setApiKey(input);
    this.state = 'idle';
    this.prompt();
  }

  /**
   * Set API key (and persist it)
   */
  private async setApiKey(key: string): Promise<void> {
    this.config.apiKey = key;

    // Persist to settings
    try {
      await window.electronAPI?.setSetting?.('apiKey', key);
      this.writeLine(`${GREEN}${BOLD}API key set and saved!${RESET}`);
    } catch {
      this.writeLine(`${GREEN}${BOLD}API key set!${RESET} ${DIM}(not persisted)${RESET}`);
    }

    // Show masked key
    const masked = key.slice(0, 8) + '...' + key.slice(-4);
    this.writeLine(`${DIM}Key: ${masked}${RESET}`);
  }

  /**
   * Test API connection using Claude Agent SDK
   */
  private async testApiConnection(): Promise<void> {
    this.writeLine(`${CYAN}Testing Claude Agent SDK connection...${RESET}`);

    try {
      const result = await window.electronAPI?.claudeAgentQuery?.({
        prompt: 'Say "Hello! API connection successful." in exactly those words.',
        systemPrompt: 'You are a helpful assistant. Respond concisely.',
        model: 'claude-sonnet-4-20250514',
      });

      if (!result) {
        this.writeLine(`${RED}${BOLD}✗ Error:${RESET} No response from SDK`);
        return;
      }

      if (!result.success) {
        this.writeLine(`${RED}${BOLD}✗ SDK Error:${RESET} ${result.error}`);
        return;
      }

      this.writeLine(`${GREEN}${BOLD}✓ Claude says:${RESET} ${result.content}`);
      if (result.usage) {
        this.writeLine(`${DIM}  (${result.usage.inputTokens} in, ${result.usage.outputTokens} out, $${result.usage.costUsd.toFixed(4)})${RESET}`);
      }
    } catch (error) {
      this.writeLine(`${RED}${BOLD}✗ API Error:${RESET} ${error}`);
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(): boolean {
    // Note: API key not required - Claude Agent SDK uses Claude Code credentials
    return !!(
      this.config.projectName &&
      this.config.goal &&
      this.config.agents?.length
    );
  }

  /**
   * Start session
   */
  private async startSession(): Promise<void> {
    this.writeLine(`${GREEN}Starting session...${RESET}`);
    this.state = 'running';

    if (this.onStartSession) {
      try {
        await this.onStartSession(this.config as SessionConfig);
        this.writeLine(`${GREEN}${BOLD}Session started!${RESET}`);
        this.writeLine(`${DIM}Agents are now listening. Type to contribute or use commands.${RESET}`);
      } catch (error) {
        this.state = 'idle';
        this.writeLine(`${RED}Failed to start session: ${error}${RESET}`);
      }
    }
  }

  /**
   * Stop session
   */
  private stopSession(): void {
    this.state = 'idle';
    if (this.onStopSession) {
      this.onStopSession();
    }
    this.writeLine(`${YELLOW}Session stopped.${RESET}`);
  }

  /**
   * Send human message
   */
  private async sendMessage(content: string): Promise<void> {
    if (this.onSendMessage) {
      this.writeLine(`${DIM}[YOU] ${content}${RESET}`);
      await this.onSendMessage(content);
    }
  }

  /**
   * Transition to synthesis phase
   */
  private async transitionToSynthesis(force = false): Promise<void> {
    this.writeLine(`${MAGENTA}${BOLD}Checking consensus status...${RESET}`);

    if (this.onSynthesis) {
      const result = await this.onSynthesis(force);
      if (result && !result.success) {
        this.writeLine(`${YELLOW}${result.message}${RESET}`);
      } else {
        this.writeLine(`${GREEN}Transitioning to SYNTHESIS phase...${RESET}`);
      }
    }
  }

  /**
   * Show consensus status
   */
  private showConsensusStatus(): void {
    if (!this.onGetConsensus) {
      this.writeLine(`${RED}Consensus tracking not available.${RESET}`);
      return;
    }

    const status = this.onGetConsensus();
    if (!status) {
      this.writeLine(`${RED}No session data available.${RESET}`);
      return;
    }

    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}CONSENSUS STATUS${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`Ready for synthesis: ${status.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
    this.writeLine(`Consensus points: ${GREEN}${status.consensusPoints}${RESET}`);
    this.writeLine(`Open conflicts: ${RED}${status.conflictPoints}${RESET}`);
    this.writeLine('');
    this.writeLine(`${DIM}${status.recommendation}${RESET}`);
    this.writeLine('');
  }

  /**
   * Transition to drafting phase
   */
  private async transitionToDrafting(): Promise<void> {
    this.writeLine(`${MAGENTA}${BOLD}Transitioning to DRAFTING phase...${RESET}`);
    this.writeLine(`${DIM}Agents will write actual copy sections.${RESET}`);
    if (this.onDraft) {
      await this.onDraft();
    }
  }

  /**
   * Show current status
   */
  private showStatus(): void {
    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}STATUS${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`State: ${this.state}`);
    if (this.config.projectName) {
      this.writeLine(`Project: ${this.config.projectName}`);
      this.writeLine(`Agents: ${this.config.agents?.length || 0}`);
    }
    this.writeLine('');
  }

  /**
   * Show memory/context stats
   */
  private showMemoryStats(): void {
    const stats = messageBus.getMemoryStats();
    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}CONVERSATION MEMORY${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`Summaries: ${stats.summaryCount}`);
    this.writeLine(`Key Decisions: ${stats.decisionCount}`);
    this.writeLine(`Active Proposals: ${stats.proposalCount}`);
    this.writeLine(`Tracked Agents: ${stats.agentCount}`);
    this.writeLine('');
    if (stats.summaryCount > 0) {
      this.writeLine(`${DIM}Memory is active - agents can recall earlier conversation.${RESET}`);
      this.writeLine(`${DIM}Use 'recall [agent-id]' to test what an agent remembers.${RESET}`);
    } else {
      this.writeLine(`${DIM}Memory will build as conversation progresses (~12 messages per summary).${RESET}`);
    }
    this.writeLine('');
  }

  /**
   * Test agent memory by showing what context they would have
   */
  private async testAgentMemory(agentId?: string): Promise<void> {
    const memoryContext = messageBus.getMemoryContext(agentId);
    const stats = messageBus.getMemoryStats();

    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}AGENT MEMORY TEST${agentId ? ` (${agentId})` : ''}${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);

    if (stats.summaryCount === 0) {
      this.writeLine(`${YELLOW}No memory built yet.${RESET}`);
      this.writeLine(`${DIM}Memory builds after ~12 messages. Current messages in session.${RESET}`);
      const allMessages = messageBus.getAllMessages();
      this.writeLine(`${DIM}Messages so far: ${allMessages.length}${RESET}`);
      if (allMessages.length > 0) {
        this.writeLine('');
        this.writeLine(`${DIM}Recent topics:${RESET}`);
        allMessages.slice(-5).forEach(m => {
          const preview = m.content.slice(0, 80).replace(/\n/g, ' ');
          this.writeLine(`${DIM}  [${m.agentId}]: ${preview}...${RESET}`);
        });
      }
    } else {
      this.writeLine(`${GREEN}Memory context an agent would receive:${RESET}`);
      this.writeLine('');
      // Display the memory context
      memoryContext.split('\n').forEach(line => {
        this.writeLine(`${DIM}  ${line}${RESET}`);
      });
    }

    this.writeLine('');
    this.writeLine(`${DIM}This is the context agents use to remember earlier conversation.${RESET}`);
    this.writeLine('');
  }

  /**
   * Show available agents
   */
  private showAgents(): void {
    const personas = getActivePersonas();
    const isCustom = personas !== AGENT_PERSONAS;

    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}AVAILABLE AGENTS${isCustom ? ' (Custom)' : ''}${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    for (const agent of personas) {
      this.writeLine(`${BOLD}${agent.name}${RESET} (${agent.nameHe})`);
      this.writeLine(`  ${DIM}${agent.role}${RESET}`);
    }
    this.writeLine('');
    if (!isCustom) {
      this.writeLine(`${DIM}💡 Run 'new' to generate custom personas for your project${RESET}`);
      this.writeLine('');
    }
  }

  /**
   * List saved sessions
   */
  private async listSessions(): Promise<void> {
    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}SAVED SESSIONS${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);

    try {
      const sessions = await window.electronAPI?.listSessions?.();

      if (!sessions || sessions.length === 0) {
        this.writeLine(`${DIM}No saved sessions found.${RESET}`);
        this.writeLine(`${DIM}Use 'save' during a session to save it.${RESET}`);
        this.writeLine('');
        return;
      }

      for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const date = new Date(s.startedAt).toLocaleDateString();
        const msgs = s.messageCount;
        this.writeLine(`  ${BOLD}${i + 1}${RESET}. ${GREEN}${s.projectName}${RESET}`);
        this.writeLine(`     ${DIM}${date} • ${msgs} messages • ${s.currentPhase || 'unknown'}${RESET}`);
        this.writeLine(`     ${DIM}ID: ${s.name}${RESET}`);
      }
      this.writeLine('');
      this.writeLine(`${DIM}Use 'load <name>' or 'load <number>' to restore a session.${RESET}`);
      this.writeLine('');
    } catch (error) {
      this.writeLine(`${RED}Failed to list sessions: ${error}${RESET}`);
      this.writeLine('');
    }
  }

  /**
   * Load a saved session
   */
  private async loadSession(nameOrIndex: string): Promise<void> {
    this.writeLine(`${CYAN}Loading session...${RESET}`);

    try {
      // First get list of sessions to resolve index to name
      const sessions = await window.electronAPI?.listSessions?.();
      if (!sessions || sessions.length === 0) {
        this.writeLine(`${RED}No saved sessions found.${RESET}`);
        return;
      }

      // Check if input is a number (index)
      let sessionName = nameOrIndex;
      const index = parseInt(nameOrIndex, 10);
      if (!isNaN(index) && index >= 1 && index <= sessions.length) {
        sessionName = sessions[index - 1].name;
      }

      // Load the session
      const result = await window.electronAPI?.loadSession?.(sessionName);

      if (!result || !result.success) {
        this.writeLine(`${RED}Failed to load session: ${result?.error || 'Unknown error'}${RESET}`);
        return;
      }

      if (!result.metadata) {
        this.writeLine(`${RED}Session metadata not found.${RESET}`);
        return;
      }

      // Update config from loaded session
      this.config.projectName = result.metadata.projectName;
      this.config.goal = result.metadata.goal;
      this.config.agents = result.metadata.enabledAgents;

      // Check if there are custom personas for this session
      // Try to load personas with the same name as the session
      try {
        const personasResult = await window.electronAPI?.loadPersonas?.(sessionName);
        if (personasResult?.success && personasResult.personas) {
          this.currentPersonas = personasResult.personas;
          registerCustomPersonas(personasResult.personas);
          this.writeLine(`${DIM}Loaded custom personas for this session.${RESET}`);
        }
      } catch {
        // No matching personas, use defaults
      }

      // Set selected agents
      this.selectedAgentIds = new Set(result.metadata.enabledAgents);

      this.writeLine('');
      this.writeLine(`${GREEN}${BOLD}✓ Session loaded!${RESET}`);
      this.writeLine(`${DIM}Project: ${result.metadata.projectName}${RESET}`);
      this.writeLine(`${DIM}Goal: ${result.metadata.goal}${RESET}`);
      this.writeLine(`${DIM}Agents: ${result.metadata.enabledAgents.join(', ')}${RESET}`);
      this.writeLine(`${DIM}Messages: ${result.messages?.length || 0}${RESET}`);
      this.writeLine('');
      this.writeLine(`${YELLOW}Type 'start' to continue this session.${RESET}`);
      this.writeLine('');

      // Restore memory state if present
      if (result.memoryState) {
        messageBus.restoreMemory(result.memoryState);
        this.writeLine(`${DIM}Conversation memory restored.${RESET}`);
      }

      // Notify the UI that we have loaded session data
      // The messages can be restored by the orchestrator
      messageBus.emit('session:loaded', {
        metadata: result.metadata,
        messages: result.messages || [],
      });

    } catch (error) {
      this.writeLine(`${RED}Error loading session: ${error}${RESET}`);
    }
  }

  /**
   * Export current session
   */
  private async exportCurrentSession(format: string): Promise<void> {
    this.writeLine(`${CYAN}Exporting session as ${format}...${RESET}`);

    // Notify UI to trigger export
    messageBus.emit('session:export-requested', { format });
    this.writeLine(`${GREEN}Export dialog opened.${RESET}`);
  }

  /**
   * Save current session
   */
  private async saveCurrentSession(): Promise<void> {
    this.writeLine(`${CYAN}Saving session...${RESET}`);

    // Notify UI to trigger save
    messageBus.emit('session:save-requested', {});
    this.writeLine(`${GREEN}Session save initiated.${RESET}`);
  }

  /**
   * Show banner
   */
  private showBanner(): void {
    this.writeLine('');
    this.writeLine(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}`);
    this.writeLine(`${CYAN}${BOLD}║${RESET}  ${MAGENTA}${BOLD}🔥 FORGE${RESET}                                            ${CYAN}${BOLD}║${RESET}`);
    this.writeLine(`${CYAN}${BOLD}║${RESET}  ${DIM}Multi-Agent Deliberation Engine${RESET}                      ${CYAN}${BOLD}║${RESET}`);
    this.writeLine(`${CYAN}${BOLD}║${RESET}  ${DIM}Reach consensus through structured debate${RESET}            ${CYAN}${BOLD}║${RESET}`);
    this.writeLine(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}`);
    this.writeLine('');
  }

  /**
   * Show help
   */
  private showHelp(): void {
    this.writeLine(`${YELLOW}${BOLD}COMMANDS${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`  ${GREEN}new, init${RESET}     - Start new session configuration`);
    this.writeLine(`  ${GREEN}token [key]${RESET}   - Set Claude API key`);
    this.writeLine(`  ${GREEN}test${RESET}          - Test Claude API connection`);
    this.writeLine(`  ${GREEN}start${RESET}         - Start configured session`);
    this.writeLine(`  ${GREEN}stop${RESET}          - Stop current session`);
    this.writeLine(`  ${GREEN}pause${RESET}         - Pause session`);
    this.writeLine(`  ${GREEN}resume${RESET}        - Resume paused session`);
    this.writeLine(`  ${GREEN}say <msg>${RESET}     - Send message to discussion`);
    this.writeLine(`  ${GREEN}status${RESET}        - Show current status`);
    this.writeLine(`  ${GREEN}memory${RESET}        - Show conversation memory stats`);
    this.writeLine(`  ${GREEN}recall [id]${RESET}   - Test what agent remembers`);
    this.writeLine(`  ${GREEN}agents${RESET}        - List available agents`);
    this.writeLine(`  ${GREEN}clear${RESET}         - Clear screen`);
    this.writeLine(`  ${GREEN}help${RESET}          - Show this help`);
    this.writeLine('');
    this.writeLine(`${YELLOW}${BOLD}SESSION MANAGEMENT${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`  ${GREEN}sessions, ls${RESET}  - List saved sessions`);
    this.writeLine(`  ${GREEN}load <name>${RESET}   - Load a saved session`);
    this.writeLine(`  ${GREEN}save${RESET}          - Save current session`);
    this.writeLine(`  ${GREEN}export [fmt]${RESET}  - Export session (md, json, html)`);
    this.writeLine('');
    this.writeLine(`${YELLOW}${BOLD}PERSONA OPTIONS (during setup)${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`  ${CYAN}g${RESET}             - 🔥 Generate personas based on project`);
    this.writeLine(`  ${CYAN}d${RESET}             - Use default copywriting personas`);
    this.writeLine('');
    this.writeLine(`${YELLOW}${BOLD}PHASE TRANSITIONS${RESET}`);
    this.writeLine(`${DIM}─────────────────────${RESET}`);
    this.writeLine(`  ${MAGENTA}consensus${RESET}     - Check if ready for synthesis`);
    this.writeLine(`  ${MAGENTA}synthesize${RESET}    - Move to synthesis (checks consensus first)`);
    this.writeLine(`  ${MAGENTA}syn force${RESET}     - Force synthesis (skip consensus check)`);
    this.writeLine(`  ${MAGENTA}draft${RESET}         - Move to drafting (write copy sections)`);
    this.writeLine('');
  }

  /**
   * Show prompt
   */
  private prompt(): void {
    const stateIndicator = this.state === 'running' ? `${GREEN}●${RESET}` :
                          this.state === 'paused' ? `${YELLOW}◐${RESET}` :
                          `${DIM}○${RESET}`;
    this.write(`${stateIndicator} forge> `);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
