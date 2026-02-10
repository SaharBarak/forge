/**
 * Idle mode: main menu loop using @clack/prompts
 * Replaces the readline REPL from index.ts
 */

import * as p from '@clack/prompts';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import React from 'react';
import { render } from 'ink';
import { v4 as uuid } from 'uuid';
import { App } from '../app/App';
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
  const goal = await p.text({
    message: `${menuBreadcrumbs.toString()}\nWhat should we debate?`,
    placeholder: 'e.g. Design a new landing page for our product',
    validate: (val) => {
      if (!val || val.trim().length === 0) return 'Please enter a goal';
    },
  });
  menuBreadcrumbs.pop();

  if (p.isCancel(goal)) return;

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

  const state: IdleState = {
    cwd,
    fsAdapter,
    agentRunner,
    sessionsDir,
    apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
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
        { value: 'test', label: 'Test API connection' },
        { value: 'token', label: 'Set Claude API key', hint: 'Anthropic key for agents' },
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

      case 'token':
        menuBreadcrumbs.push('Claude API Key');
        try { await handleTokenFlow(state); } finally { menuBreadcrumbs.pop(); }
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

    options.push({ value: '__back', label: 'Back to menu' });

    const choice = await p.select({
      message: 'Select a session to load',
      options,
    });

    if (p.isCancel(choice) || choice === '__back') return;

    await loadSession(state, choice as string);
  } catch {
    p.log.info('No sessions directory found.');
  }
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

    // Try to load custom personas
    let personas = AGENT_PERSONAS;
    let domainSkills: string | undefined;
    let personaSetName: string | null = null;

    if (metadata.enabledAgents) {
      try {
        const personasContent = await fs.readFile(path.join(state.cwd, 'personas', `${sessionName}.json`), 'utf-8');
        personas = JSON.parse(personasContent);
        personaSetName = sessionName;
        registerCustomPersonas(personas);
        try {
          domainSkills = await fs.readFile(path.join(state.cwd, 'personas', `${sessionName}.skills.md`), 'utf-8');
        } catch { /* no skills */ }
      } catch {
        personas = AGENT_PERSONAS;
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

    // Set state config
    state.config = {
      projectName: metadata.projectName || sessionName,
      goal: metadata.goal || '',
      agents: metadata.enabledAgents || [],
      language: metadata.language || 'english',
      personas,
      domainSkills,
      personaSetName,
    };

    p.log.success('Type "Start session" from the menu to continue this session.');
  } catch (error) {
    s.stop('Failed to load session');
    p.log.error(`${error}`);
  }
}

/**
 * Test the Anthropic API connection
 */
async function handleApiTest() {
  const s = p.spinner();
  s.start('Testing API connection...');

  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "OK"' }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    s.stop(chalk.green(`API connection successful: ${text}`));
  } catch (error: any) {
    s.stop(chalk.red(`API connection failed: ${error.message}`));
    p.log.info('Make sure ANTHROPIC_API_KEY is set or use "Set Claude API key".');
  }
}

/**
 * Set or display API key
 */
async function handleTokenFlow(state: IdleState) {
  if (state.apiKey) {
    p.log.info(`Current Claude API key: ${state.apiKey.slice(0, 10)}...`);
  }

  const key = await p.text({
    message: 'Enter your Claude API key (Anthropic)',
    placeholder: 'sk-ant-...',
    validate: (val) => {
      if (!val) return 'Claude API key is required';
    },
  });

  if (p.isCancel(key)) return;

  state.apiKey = key as string;
  process.env.ANTHROPIC_API_KEY = key as string;
  p.log.success('Claude API key set.');
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
    `${chalk.green('Test API')}        - Verify Claude API connection`,
    `${chalk.green('Set Claude API key')} - Configure your Anthropic API key`,
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
  const config: SessionConfig = {
    id: uuid(),
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

  // Create session
  const session: Session = {
    id: config.id,
    config,
    messages: [],
    currentPhase: 'initialization',
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: new Date(),
    status: 'running',
  };

  // Create persistence
  const persistence = new SessionPersistence(state.fsAdapter, {
    outputDir: config.outputDir,
  });
  await persistence.initSession(session);

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

  // Hand off to Ink — clack prompts are done, Ink takes the terminal
  const { waitUntilExit } = render(
    React.createElement(App, {
      orchestrator,
      persistence,
      session,
      toolRunner,
      onExit: async () => {
        await persistence.saveFull();
        clearCustomPersonas();
        console.log(`\nSession saved to ${persistence.getSessionDir()}`);
      },
    })
  );

  // Block until Ink exits (user pressed Ctrl+C or typed quit)
  await waitUntilExit();

  // Back to idle — show banner again
  p.log.success('Session ended. Returning to menu.');
}
