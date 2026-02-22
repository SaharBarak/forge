/**
 * Idle mode: main menu loop using @clack/prompts
 * Replaces the readline REPL from index.ts
 */

import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import chalk from 'chalk';
import { v4 as uuid } from 'uuid';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { SessionPersistence } from '../adapters/SessionPersistence';
import { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../../src/lib/eda/MessageBus';
import { getDefaultMethodology } from '../../src/methodologies';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas, getActivePersonas } from '../../src/agents/personas';
import { runConfigWizard, generatePersonasForGoal, type WizardResult } from './wizards';
import { showBanner } from './banner';
import { loadPreferences, savePreferences } from '../preferences';
import { menuBreadcrumbs } from '../lib/menuBreadcrumbs';
import { multilineText } from '../lib/multilineText';
import { ToolRunner } from '../tools/ToolRunner';
import type { Session, SessionConfig, AgentPersona, Message } from '../../src/types';

/** Shared state passed between menu handlers */
interface IdleState {
  cwd: string;
  fsAdapter: FileSystemAdapter;
  agentRunner: CLIAgentRunner;
  sessionsDir: string;
  apiKey?: string;
  geminiApiKey?: string;
  // Current config (set by wizard or load)
  config: WizardResult | null;
}

/**
 * Quick start — jump straight into a session with default agents
 */
async function handleQuickStart(state: IdleState) {
  menuBreadcrumbs.push('Goal');
  const goal = await multilineText({
    message: `${menuBreadcrumbs.toString()}\nWhat should we debate?`,
    placeholder: 'e.g. Design a new landing page for our product',
    validate: (val) => {
      if (!val || val.trim().length === 0) return 'Please enter a goal';
    },
  });
  menuBreadcrumbs.pop();

  if (typeof goal === 'symbol') return;

  const goalStr = (goal as string).trim();
  const projectName = goalStr.slice(0, 40).replace(/[^a-zA-Z0-9\u0590-\u05FF\s-]/g, '').trim() || 'Quick Session';

  // Language: use preference if set, otherwise prompt
  const prefs = await loadPreferences();
  let language = prefs.language;
  if (!language) {
    menuBreadcrumbs.push('Language');
    const langChoice = await p.select({
      message: `${menuBreadcrumbs.toString()}\nDebate language`,
      options: [
        { value: 'english', label: 'English' },
        { value: 'hebrew', label: 'Hebrew (עברית)' },
        { value: 'mixed', label: 'Mixed' },
      ],
    });
    menuBreadcrumbs.pop();
    if (p.isCancel(langChoice)) return;
    language = langChoice as string;
  }

  // Persona source: generate or use current
  menuBreadcrumbs.push('Personas');
  const personaChoice = await p.select({
    message: `${menuBreadcrumbs.toString()}\nWhich personas should debate?`,
    options: [
      { value: 'generate', label: 'Generate for this topic', hint: 'AI-powered' },
      { value: 'current', label: 'Use current personas', hint: `${getActivePersonas().length} available` },
    ],
  });
  menuBreadcrumbs.pop();
  if (p.isCancel(personaChoice)) return;

  let personas = getActivePersonas();
  let personaSetName: string | null = null;
  let domainSkills: string | undefined;

  if (personaChoice === 'generate') {
    const result = await generatePersonasForGoal(state.cwd, goalStr, projectName);
    if (result) {
      personas = result.personas;
      personaSetName = result.name;
      domainSkills = result.skills;
      registerCustomPersonas(personas);
    } else {
      p.log.warn('Generation failed, using current personas');
    }
  }

  // Tools selection
  menuBreadcrumbs.push('Tools');
  const tools = await p.multiselect({
    message: `${menuBreadcrumbs.toString()}\nEnable tools for this session?`,
    options: [
      { value: 'gemini-image', label: 'Image Generation (Gemini)', hint: 'agents can create images' },
      { value: 'gemini-graph', label: 'Graph Generation (Gemini)', hint: 'agents can create charts' },
    ],
    required: false,
  });
  menuBreadcrumbs.pop();

  const enabledTools = p.isCancel(tools) ? undefined : (tools as string[]);

  state.config = {
    projectName,
    goal: goalStr,
    agents: personas.map(a => a.id),
    language,
    personas,
    domainSkills,
    personaSetName,
    enabledTools,
  };

  await startSessionFromConfig(state);
}

/**
 * Main idle loop — displays a select menu, dispatches to handlers
 */
export async function runIdleMode() {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();
  const sessionsDir = path.join(cwd, 'output', 'sessions');

  // Load Gemini key from preferences or env
  const initPrefs = await loadPreferences();

  let apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  // Load setup token from ~/.claude/credentials.json and set env var
  // The Agent SDK passes process.env to child Claude Code processes
  // CLAUDE_CODE_OAUTH_TOKEN is how the child process authenticates
  let hasSetupToken = false;
  try {
    const credPath = path.join(os.homedir(), '.claude', 'credentials.json');
    const credData = JSON.parse(await fs.readFile(credPath, 'utf-8'));
    const token = credData?.claudeAiOauth?.accessToken;
    if (token) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = token;
      hasSetupToken = true;
    }
  } catch { /* no credentials */ }

  const state: IdleState = {
    cwd,
    fsAdapter,
    agentRunner,
    sessionsDir,
    apiKey,
    geminiApiKey: initPrefs.geminiApiKey || process.env.GEMINI_API_KEY,
    config: null,
  };

  // Count saved sessions for banner
  let savedCount = 0;
  try {
    const dirs = await fs.readdir(sessionsDir);
    savedCount = dirs.filter(d => !d.startsWith('.')).length;
  } catch { /* no sessions dir */ }

  showBanner(savedCount);

  // Main loop
  while (true) {
    const configLabel = state.config
      ? chalk.dim(` (${state.config.projectName})`)
      : '';

    menuBreadcrumbs.reset();
    const action = await p.select({
      message: `${menuBreadcrumbs.toString()}\nWhat would you like to do?${configLabel}`,
      options: [
        { value: 'quick', label: 'Quick start', hint: 'jump straight into a session' },
        { value: 'new', label: 'New session', hint: 'configure project, personas, agents' },
        ...(state.config ? [{ value: 'start', label: 'Start session', hint: state.config.projectName }] : []),
        { value: 'sessions', label: 'Saved sessions', hint: `${savedCount} available` },
        { value: 'agents', label: 'List agents' },
        { value: 'test', label: 'Test Claude connection' },
        { value: 'setup-token', label: 'Set setup token', hint: hasSetupToken ? 'configured' : 'not set' },
        { value: 'gemini-key', label: 'Set Gemini API key', hint: state.geminiApiKey ? 'configured' : 'not set' },
        { value: 'prefs', label: 'Preferences', hint: 'set default language' },
        { value: 'help', label: 'Help' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (p.isCancel(action) || action === 'exit') {
      p.outro(chalk.dim('Goodbye.'));
      process.exit(0);
    }

    switch (action) {
      case 'quick':
        menuBreadcrumbs.push('Quick Start');
        try { await handleQuickStart(state); } finally { menuBreadcrumbs.pop(); }
        break;

      case 'new':
        menuBreadcrumbs.push('New Session');
        try { state.config = await runConfigWizard(cwd); } finally { menuBreadcrumbs.pop(); }
        break;

      case 'start':
        if (state.config) {
          menuBreadcrumbs.push('Session');
          try { await startSessionFromConfig(state); } finally { menuBreadcrumbs.pop(); }
        } else {
          p.log.warn('No session configured. Choose "New session" first.');
        }
        break;

      case 'sessions':
        menuBreadcrumbs.push('Saved Sessions');
        try { await handleSessionsMenu(state); } finally { menuBreadcrumbs.pop(); }
        break;

      case 'agents':
        showAgentsNote();
        break;

      case 'test':
        await handleApiTest();
        break;

      case 'setup-token':
        hasSetupToken = await handleSetupToken();
        break;

      case 'gemini-key':
        menuBreadcrumbs.push('Gemini Key');
        try { await handleGeminiKeyFlow(state); } finally { menuBreadcrumbs.pop(); }
        break;

      case 'prefs':
        menuBreadcrumbs.push('Preferences');
        try { await handlePreferences(); } finally { menuBreadcrumbs.pop(); }
        break;

      case 'help':
        showHelpNote();
        break;
    }
  }
}

/**
 * List saved sessions and optionally load one
 */
async function handleSessionsMenu(state: IdleState) {
  try {
    const dirs = await fs.readdir(state.sessionsDir);
    const sessions = dirs.filter(d => !d.startsWith('.')).sort().reverse();

    if (sessions.length === 0) {
      p.log.info('No saved sessions found.');
      return;
    }

    // Build options from session metadata
    const options: { value: string; label: string; hint?: string }[] = [];
    for (const sessionName of sessions) {
      const sessionDir = path.join(state.sessionsDir, sessionName);
      let meta: any = null;
      try {
        meta = JSON.parse(await fs.readFile(path.join(sessionDir, 'session.json'), 'utf-8'));
      } catch {
        try {
          meta = JSON.parse(await fs.readFile(path.join(sessionDir, 'metadata.json'), 'utf-8'));
        } catch { /* no metadata */ }
      }

      if (meta) {
        const date = new Date(meta.startedAt).toLocaleDateString();
        options.push({
          value: sessionName,
          label: meta.projectName || sessionName,
          hint: `${date} - ${(meta.goal || '').slice(0, 40)}`,
        });
      } else {
        options.push({ value: sessionName, label: sessionName });
      }
    }

    options.push({ value: '__delete', label: 'Delete a session', hint: 'remove saved sessions' });
    options.push({ value: '__back', label: 'Back to menu' });

    const choice = await p.select({
      message: 'Select a session to load',
      options,
    });

    if (p.isCancel(choice) || choice === '__back') return;

    if (choice === '__delete') {
      await handleDeleteSession(state, sessions);
      return;
    }

    await loadSession(state, choice as string);
  } catch {
    p.log.info('No sessions directory found.');
  }
}

/**
 * Delete saved sessions
 */
async function handleDeleteSession(state: IdleState, sessions: string[]) {
  const options = sessions.map(name => ({ value: name, label: name }));
  options.push({ value: '__back', label: 'Cancel' });

  const toDelete = await p.select({
    message: 'Which session do you want to delete?',
    options,
  });

  if (p.isCancel(toDelete) || toDelete === '__back') return;

  const confirm = await p.confirm({
    message: `Delete session "${toDelete}"? This cannot be undone.`,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.log.info('Cancelled.');
    return;
  }

  const sessionDir = path.join(state.sessionsDir, toDelete as string);
  await fs.rm(sessionDir, { recursive: true, force: true });
  p.log.success(`Deleted session: ${toDelete}`);
}

/**
 * Load a saved session into state.config
 */
async function loadSession(state: IdleState, sessionName: string) {
  const s = p.spinner();
  s.start('Loading session...');

  try {
    const sessionDir = path.join(state.sessionsDir, sessionName);

    // Load metadata
    let metadata: any = {};
    try {
      metadata = JSON.parse(await fs.readFile(path.join(sessionDir, 'session.json'), 'utf-8'));
    } catch {
      try {
        metadata = JSON.parse(await fs.readFile(path.join(sessionDir, 'metadata.json'), 'utf-8'));
      } catch { /* no metadata */ }
    }

    // Load messages count
    let messageCount = 0;
    try {
      const content = await fs.readFile(path.join(sessionDir, 'messages.jsonl'), 'utf-8');
      messageCount = content.trim().split('\n').filter(l => l.trim()).length;
    } catch { /* no messages */ }

    // Load memory
    let hasMemory = false;
    try {
      const memoryState = JSON.parse(await fs.readFile(path.join(sessionDir, 'memory.json'), 'utf-8'));
      messageBus.restoreMemory(memoryState);
      hasMemory = true;
    } catch { /* no memory file */ }

    // Try to load custom personas from multiple locations
    let personas = AGENT_PERSONAS;
    let domainSkills: string | undefined;
    let personaSetName: string | null = null;

    if (metadata.enabledAgents) {
      // Check if agents are custom (not in default set)
      const defaultIds = AGENT_PERSONAS.map(a => a.id);
      const isCustom = metadata.enabledAgents.some((id: string) => !defaultIds.includes(id));

      if (isCustom) {
        // Try loading personas from multiple locations:
        // 1. Session directory (self-contained, most reliable)
        // 2. personas/${sessionName}.json
        // 3. personas/${projectName}.json (how they were originally saved)
        const projectSlug = (metadata.projectName || '').replace(/\s+/g, '-').toLowerCase();
        const candidatePaths = [
          path.join(sessionDir, 'personas.json'),
          path.join(state.cwd, 'personas', `${sessionName}.json`),
          path.join(state.cwd, 'personas', `${projectSlug}.json`),
          path.join(state.cwd, 'personas', `${metadata.projectName || ''}.json`),
        ];

        for (const candidatePath of candidatePaths) {
          try {
            const personasContent = await fs.readFile(candidatePath, 'utf-8');
            personas = JSON.parse(personasContent);
            personaSetName = sessionName;
            registerCustomPersonas(personas);
            // Try loading skills from same directory
            const skillsPath = candidatePath.replace(/\.json$/, '.skills.md')
              .replace('personas.skills.md', 'skills.md');
            try {
              domainSkills = await fs.readFile(skillsPath, 'utf-8');
            } catch { /* no skills */ }
            break;
          } catch { /* try next location */ }
        }

        if (!personaSetName) {
          p.log.warn('Custom personas not found for this session. Agents may not load correctly.');
        }
      }
    }

    s.stop('Session loaded');

    const info = [
      `Project: ${metadata.projectName || sessionName}`,
      `Goal: ${metadata.goal || ''}`,
      `Agents: ${(metadata.enabledAgents || []).join(', ')}`,
      `Messages: ${messageCount}`,
      ...(hasMemory ? ['Memory: restored'] : []),
    ].join('\n');
    p.note(info, 'Loaded Session');

    // Load previous messages
    let resumeMessages: any[] = [];
    try {
      const content = await fs.readFile(path.join(sessionDir, 'messages.jsonl'), 'utf-8');
      resumeMessages = content.trim().split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    } catch { /* no messages to resume */ }

    // Set state config
    state.config = {
      projectName: metadata.projectName || sessionName,
      goal: metadata.goal || '',
      agents: metadata.enabledAgents || [],
      language: metadata.language || 'english',
      personas,
      domainSkills,
      personaSetName,
      resumeSessionDir: sessionDir,
      resumeMessages,
      resumePhase: metadata.currentPhase,
    };

    p.log.success(`Loaded ${resumeMessages.length} messages. Type "Start session" to continue.`);
  } catch (error) {
    s.stop('Failed to load session');
    p.log.error(`${error}`);
  }
}

/**
 * Set or update Claude setup token.
 * Writes to ~/.claude/credentials.json and sets CLAUDE_CODE_OAUTH_TOKEN env var
 * so child Claude Code processes (via Agent SDK) authenticate properly.
 */
async function handleSetupToken(): Promise<boolean> {
  const credPath = path.join(os.homedir(), '.claude', 'credentials.json');

  // Show current status
  let current: string | null = null;
  try {
    const credData = JSON.parse(await fs.readFile(credPath, 'utf-8'));
    current = credData?.claudeAiOauth?.accessToken;
  } catch { /* no credentials */ }

  if (current) {
    p.log.info(`Current token: ${current.slice(0, 20)}...`);
  }

  const token = await p.text({
    message: 'Paste your Claude setup token (from claude.ai/settings)',
    placeholder: 'sk-ant-oat01-...',
    validate: (val) => {
      if (!val || !val.trim()) return 'Token is required';
    },
  });

  if (p.isCancel(token)) return !!current;

  const tokenStr = (token as string).trim();

  try {
    // Ensure ~/.claude directory exists
    const claudeDir = path.join(os.homedir(), '.claude');
    await fs.mkdir(claudeDir, { recursive: true });

    // Read existing credentials or create new
    let credData: any = {};
    try {
      credData = JSON.parse(await fs.readFile(credPath, 'utf-8'));
    } catch { /* new file */ }

    // Update the token in credentials.json
    credData.claudeAiOauth = { accessToken: tokenStr };
    await fs.writeFile(credPath, JSON.stringify(credData, null, 2));

    // Set env var so Agent SDK child processes pick it up
    process.env.CLAUDE_CODE_OAUTH_TOKEN = tokenStr;

    p.log.success('Setup token saved and activated.');
    return true;
  } catch (error: any) {
    p.log.error(`Failed to save token: ${error.message}`);
    return !!current;
  }
}

/**
 * Test the Claude connection via Claude Agent SDK (uses setup token)
 */
async function handleApiTest() {
  const s = p.spinner();
  s.start('Testing Claude connection...');

  let content = '';
  try {
    const { query: claudeQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const CLAUDE_CODE_PATH = path.join(os.homedir(), '.local', 'bin', 'claude');

    const q = claudeQuery({
      prompt: 'Say "OK"',
      options: {
        model: 'claude-3-5-haiku-20241022',
        tools: [],
        permissionMode: 'dontAsk',
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
        stderr: () => {},
      },
    });

    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            content += block.text;
          }
        }
      }
    }

    s.stop(chalk.green(`Claude connection successful: ${content.trim()}`));
  } catch (error: any) {
    // SDK may throw on cleanup even if query succeeded - check for content
    if (content) {
      s.stop(chalk.green(`Claude connection successful: ${content.trim()}`));
    } else {
      s.stop(chalk.red(`Claude connection failed: ${error.message}`));
      p.log.info('Make sure Claude Code is set up: run "claude" and complete setup.');
    }
  }
}

/**
 * Set or display Gemini API key
 */
async function handleGeminiKeyFlow(state: IdleState) {
  if (state.geminiApiKey) {
    p.log.info(`Current Gemini key: ${state.geminiApiKey.slice(0, 10)}...`);
  }

  const key = await p.text({
    message: 'Enter your Gemini API key',
    placeholder: 'AIza...',
    validate: (val) => {
      if (!val) return 'API key is required';
    },
  });

  if (p.isCancel(key)) return;

  state.geminiApiKey = key as string;
  process.env.GEMINI_API_KEY = key as string;
  await savePreferences({ geminiApiKey: key as string });
  p.log.success('Gemini API key set and saved.');
}

/**
 * Preferences — set default language
 */
async function handlePreferences() {
  const prefs = await loadPreferences();

  const language = await p.select({
    message: `Default language${prefs.language ? ` (current: ${prefs.language})` : ''}`,
    options: [
      { value: 'english', label: 'English' },
      { value: 'hebrew', label: 'Hebrew (עברית)' },
      { value: 'mixed', label: 'Mixed' },
    ],
  });

  if (p.isCancel(language)) return;

  await savePreferences({ language: language as string });
  p.log.success(`Default language set to: ${language}`);
}

/**
 * Show help info
 */
function showHelpNote() {
  const help = [
    `${chalk.green('New session')}     - Configure project, personas, agents`,
    `${chalk.green('Start session')}   - Launch the configured debate`,
    `${chalk.green('Saved sessions')}  - Browse and load previous sessions`,
    `${chalk.green('List agents')}     - Show available agent personas`,
    `${chalk.green('Test connection')}  - Verify Claude setup token works`,
    `${chalk.green('Set setup token')} - Update your Claude setup token`,
    '',
    `${chalk.yellow('During a session:')}`,
    `  Type messages to join the debate`,
    `  Use /help, /status, /pause, /resume, /synthesize, /draft`,
    `  Press Ctrl+C to end the session`,
  ].join('\n');

  p.note(help, 'Forge Commands');
}

/**
 * Show agent list
 */
function showAgentsNote() {
  const personas = getActivePersonas();
  const lines = personas.map(a =>
    `${chalk.bold(a.name)} (${a.nameHe})\n  ${chalk.dim(a.role)}\n  ${chalk.dim(a.strengths.slice(0, 2).join(', '))}`
  ).join('\n\n');

  p.note(lines, 'Available Agents');
  p.log.info('Generate custom personas with: forge personas generate --domain "your domain"');
}

/**
 * Start a session from current config, render Ink UI, then return to menu
 */
async function startSessionFromConfig(state: IdleState) {
  const cfg = state.config!;

  if (!cfg.agents || cfg.agents.length === 0) {
    p.log.warn('No agents selected. Run "New session" first.');
    return;
  }

  // Register personas if custom
  if (cfg.personaSetName) {
    registerCustomPersonas(cfg.personas);
  } else {
    clearCustomPersonas();
  }

  // Create session config
  const geminiKey = state.geminiApiKey || process.env.GEMINI_API_KEY;
  const isResume = !!(cfg.resumeSessionDir && cfg.resumeMessages?.length);

  const config: SessionConfig = {
    id: isResume ? path.basename(cfg.resumeSessionDir!) : uuid(),
    projectName: cfg.projectName,
    goal: cfg.goal || 'Reach consensus',
    enabledAgents: cfg.agents,
    humanParticipation: true,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path.join(state.cwd, 'context'),
    outputDir: path.join(state.cwd, 'output', 'sessions'),
    language: cfg.language,
    apiKey: state.apiKey,
    enabledTools: cfg.enabledTools,
    geminiApiKey: geminiKey,
  };

  // Set up tool runner if tools are enabled
  const toolRunner = new ToolRunner();
  if (cfg.enabledTools?.some(t => t.startsWith('gemini')) && geminiKey) {
    toolRunner.enableGemini(geminiKey);
  }

  // Restore messages with Date objects (JSON parse gives strings)
  const resumedMessages: Message[] = isResume
    ? cfg.resumeMessages!.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    : [];

  // Create session (reuse data if resuming)
  const session: Session = {
    id: config.id,
    config,
    messages: resumedMessages,
    currentPhase: (isResume && cfg.resumePhase as any) || 'initialization',
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: isResume ? new Date(resumedMessages[0]?.timestamp || new Date()) : new Date(),
    status: 'running',
  };

  // Create persistence — resume into existing dir or init new
  const persistence = new SessionPersistence(state.fsAdapter, {
    outputDir: config.outputDir,
  });

  if (isResume) {
    await persistence.resumeSession(session, cfg.resumeSessionDir!);
    p.log.info(chalk.dim(`Resuming session with ${resumedMessages.length} messages`));
  } else {
    await persistence.initSession(session);

    // Save custom personas to session directory so saved sessions are self-contained
    if (cfg.personaSetName && cfg.personas) {
      const sessionDir = persistence.getSessionDir();
      if (sessionDir) {
        await state.fsAdapter.writeFile(
          path.join(sessionDir, 'personas.json'),
          JSON.stringify(cfg.personas, null, 2)
        );
        if (cfg.domainSkills) {
          await state.fsAdapter.writeFile(
            path.join(sessionDir, 'skills.md'),
            cfg.domainSkills
          );
        }
      }
    }
  }

  // Set runner on message bus for memory summarization
  messageBus.setAgentRunner(state.agentRunner);

  // Create orchestrator
  const orchestrator = new EDAOrchestrator(
    session,
    undefined,
    cfg.domainSkills,
    {
      agentRunner: state.agentRunner,
      fileSystem: state.fsAdapter,
    }
  );

  // Preload resumed messages into the bus after orchestrator starts
  // (bus.start() clears history, so we feed messages back in silently)
  if (isResume && resumedMessages.length > 0) {
    const origStart = orchestrator.start.bind(orchestrator);
    orchestrator.start = async () => {
      await origStart();
      messageBus.preloadMessages(resumedMessages);
    };
  }

  // Update persistence on events
  orchestrator.on((event) => {
    if (event.type === 'agent_message') {
      persistence.updateSession(orchestrator.getSession());
    }
  });

  p.log.step(`Starting: ${chalk.bold(cfg.projectName)}`);
  p.log.info(chalk.dim(`Goal: ${cfg.goal}`));
  p.log.info(chalk.dim(`Agents: ${cfg.agents.join(', ')}`));
  p.log.info(chalk.dim(`Output: ${persistence.getSessionDir()}`));

  // Hand off to blessed dashboard — clack prompts are done, blessed takes the terminal
  const { createDashboard } = await import('../dashboard/index');
  await createDashboard({
    orchestrator,
    persistence,
    session,
    toolRunner,
    onExit: async () => {
      await persistence.saveFull();
      clearCustomPersonas();
    },
  });

  // Back to idle — show banner again
  p.log.success('Session ended. Returning to menu.');
}
