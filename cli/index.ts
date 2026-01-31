#!/usr/bin/env node
/**
 * Forge CLI - Multi-agent deliberation engine
 * Reach consensus through structured debate
 */

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import { App } from './app/App';
import { CLIAgentRunner } from './adapters/CLIAgentRunner';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { SessionPersistence } from './adapters/SessionPersistence';
import { EDAOrchestrator } from '../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../src/lib/eda/MessageBus';
import { getDefaultMethodology } from '../src/methodologies';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas, getActivePersonas, generatePersonas } from '../src/agents/personas';
import { createPersonasCommand } from './commands/personas';
import { createExportCommand } from './commands/export';
import type { Session, SessionConfig, AgentPersona, Message } from '../src/types';

// ANSI color codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

const program = new Command();

/**
 * Prompt user for yes/no
 */
async function promptYesNo(question: string, defaultYes = true): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    rl.question(`${question} ${hint}: `, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === '') resolve(defaultYes);
      else resolve(a === 'y' || a === 'yes');
    });
  });
}

/**
 * Generate personas on-the-fly based on goal
 * Uses the shared generatePersonas function from personas.ts
 */
async function generatePersonasForGoal(cwd: string, goal: string, projectName: string): Promise<{ name: string; personas: AgentPersona[]; skills?: string } | null> {
  console.log('\n🔥 Generating personas for your project...\n');

  try {
    // Use the shared generatePersonas function from personas.ts
    const result = await generatePersonas(projectName, goal, 5);

    if (!result) {
      console.error('Failed to generate personas');
      return null;
    }

    const { personas, expertise: skills } = result;

    // Save for future use
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const personasDir = path.join(cwd, 'personas');
    await fs.mkdir(personasDir, { recursive: true });

    await fs.writeFile(
      path.join(personasDir, `${safeName}.json`),
      JSON.stringify(personas, null, 2)
    );

    if (skills) {
      await fs.writeFile(
        path.join(personasDir, `${safeName}.skills.md`),
        skills
      );
    }

    console.log(`✅ Generated ${personas.length} personas:\n`);
    for (const p of personas) {
      console.log(`  • ${p.name} - ${p.role}`);
    }
    console.log(`\n📁 Saved to: personas/${safeName}.json`);

    return { name: safeName, personas, skills };
  } catch (error) {
    console.error('Error generating personas:', error);
    return null;
  }
}

/**
 * Interactive agent selection from a list
 * Returns either an array of agent IDs, or a special command string ('generate' or 'defaults')
 */
async function selectAgentsInteractively(personas: AgentPersona[]): Promise<string[] | 'generate' | 'defaults'> {
  const selectedIds = new Set(personas.map(p => p.id)); // All selected by default

  const showMenu = () => {
    console.log('\n📋 Select agents (toggle with number):\n');
    console.log('  \x1b[33m[g]\x1b[0m 🔥 Generate new personas');
    console.log('  \x1b[33m[d]\x1b[0m Use default personas');
    console.log('');
    personas.forEach((agent, index) => {
      const isSelected = selectedIds.has(agent.id);
      const checkbox = isSelected ? '\x1b[32m[✓]\x1b[0m' : '\x1b[2m[ ]\x1b[0m';
      const name = isSelected ? `\x1b[1m${agent.name}\x1b[0m` : `\x1b[2m${agent.name}\x1b[0m`;
      console.log(`  ${checkbox} ${index + 1}. ${name} (${agent.nameHe}) - ${agent.role}`);
    });
    console.log('');
    console.log(`\x1b[2mSelected: ${selectedIds.size}/${personas.length} agents\x1b[0m`);
    console.log('\x1b[2mType number to toggle, "g" generate, "d" defaults, "a" all, "n" none\x1b[0m');
    console.log('\x1b[2mType "done" when ready to continue\x1b[0m\n');
  };

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = () => {
      showMenu();
      rl.question('> ', (answer) => {
        const input = answer.trim().toLowerCase();

        if (input === '') {
          // Empty input - just re-prompt
          prompt();
          return;
        }

        if (input === 'done' || input === 'ok' || input === 'y' || input === 'yes') {
          rl.close();
          if (selectedIds.size === 0) {
            console.log('\x1b[33mNo agents selected, using all.\x1b[0m');
            resolve(personas.map(p => p.id));
          } else {
            resolve(Array.from(selectedIds));
          }
          return;
        }

        if (input === 'g' || input === 'generate') {
          rl.close();
          resolve('generate');
          return;
        }

        if (input === 'd' || input === 'defaults') {
          rl.close();
          resolve('defaults');
          return;
        }

        if (input === 'a' || input === 'all') {
          personas.forEach(p => selectedIds.add(p.id));
          prompt();
          return;
        }

        if (input === 'n' || input === 'none') {
          selectedIds.clear();
          prompt();
          return;
        }

        // Check if number
        const num = parseInt(input, 10);
        if (!isNaN(num) && num >= 1 && num <= personas.length) {
          const agent = personas[num - 1];
          if (selectedIds.has(agent.id)) {
            selectedIds.delete(agent.id);
            console.log(`\x1b[31m✗ Removed: ${agent.name}\x1b[0m`);
          } else {
            selectedIds.add(agent.id);
            console.log(`\x1b[32m✓ Added: ${agent.name}\x1b[0m`);
          }
          prompt();
          return;
        }

        // Check if agent ID
        const agentById = personas.find(a => a.id === input || a.name.toLowerCase() === input);
        if (agentById) {
          if (selectedIds.has(agentById.id)) {
            selectedIds.delete(agentById.id);
            console.log(`\x1b[31m✗ Removed: ${agentById.name}\x1b[0m`);
          } else {
            selectedIds.add(agentById.id);
            console.log(`\x1b[32m✓ Added: ${agentById.name}\x1b[0m`);
          }
          prompt();
          return;
        }

        console.log('\x1b[33mUnknown command. Use number, "g" generate, "d" defaults, "a" all, "n" none, Enter to continue.\x1b[0m');
        prompt();
      });
    };

    prompt();
  });
}

/**
 * Interactive persona selection with generate option
 */
async function selectPersonas(cwd: string, goal?: string, projectName?: string): Promise<{ name: string; personas: AgentPersona[]; skills?: string } | null> {
  const personasDir = path.join(cwd, 'personas');

  // Get available persona sets
  let files: string[] = [];
  try {
    const allFiles = await fs.readdir(personasDir);
    files = allFiles.filter(f => f.endsWith('.json') && !f.includes('.skills'));
  } catch {
    // No personas directory - that's fine
  }

  // Build options list
  const options: { name: string; file: string; personas: AgentPersona[]; description: string }[] = [];

  for (const file of files) {
    const name = path.basename(file, '.json');
    try {
      const content = await fs.readFile(path.join(personasDir, file), 'utf-8');
      const personas = JSON.parse(content) as AgentPersona[];
      const description = personas.map(p => p.name).join(', ');
      options.push({ name, file, personas, description });
    } catch {
      // Skip invalid files
    }
  }

  // Display menu
  console.log('\n📋 Persona options:\n');
  console.log('  0. Use default personas (copywriting experts)');
  console.log('  G. Generate new personas for this project');
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.name}`);
    console.log(`     Agents: ${opt.description}`);
  });
  console.log('');

  // Prompt for selection
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Select option [G]: ', async (answer) => {
      rl.close();

      const a = answer.trim().toLowerCase();

      if (a === 'g' || a === '') {
        // Generate new personas
        const result = await generatePersonasForGoal(cwd, goal || 'General debate', projectName || 'New Project');
        resolve(result);
      } else if (a === '0') {
        resolve(null); // Use defaults
      } else {
        const selection = parseInt(a, 10);
        if (selection > 0 && selection <= options.length) {
          const selected = options[selection - 1];
          // Load skills if they exist
          let skills: string | undefined;
          try {
            skills = await fs.readFile(
              path.join(personasDir, `${selected.name}.skills.md`),
              'utf-8'
            );
          } catch {
            // No skills file
          }
          resolve({ name: selected.name, personas: selected.personas, skills });
        } else {
          console.log('Invalid selection, generating new personas...');
          const result = await generatePersonasForGoal(cwd, goal || 'General debate', projectName || 'New Project');
          resolve(result);
        }
      }
    });
  });
}

program
  .name('forge')
  .description('Multi-agent deliberation engine - reach consensus through structured debate')
  .version('1.0.0');

// Start command - main debate entry point
program
  .command('start')
  .description('Start a new debate session')
  .option('-b, --brief <name>', 'Brief name to load (from briefs/ directory)')
  .option('-p, --project <name>', 'Project name', 'New Project')
  .option('-g, --goal <goal>', 'Project goal')
  .option('-a, --agents <ids>', 'Comma-separated agent IDs (from default or custom personas)')
  .option('--personas <name>', 'Use custom persona set (from personas/ directory)')
  .option('-l, --language <lang>', 'Language: hebrew, english, mixed', 'hebrew')
  .option('--human', 'Enable human participation', true)
  .option('--no-human', 'Disable human participation')
  .option('-o, --output <dir>', 'Output directory for sessions', 'output/sessions')
  .action(async (options) => {
    const cwd = process.cwd();
    const fsAdapter = new FileSystemAdapter(cwd);
    const agentRunner = new CLIAgentRunner();

    // Load brief if specified
    let briefContent = '';
    let projectName = options.project;
    let goal = options.goal || '';

    if (options.brief) {
      const brief = await fsAdapter.readBrief(options.brief);
      if (brief) {
        briefContent = brief;
        // Try to extract project name and goal from brief
        const titleMatch = brief.match(/^#\s+(.+)$/m);
        if (titleMatch && projectName === 'New Project') {
          projectName = titleMatch[1];
        }
        if (!goal) {
          goal = `Create website copy for ${projectName}`;
        }
      } else {
        console.error(`Brief "${options.brief}" not found in briefs/ directory`);
        process.exit(1);
      }
    }

    if (!goal) {
      goal = `Debate and reach consensus on: ${projectName}`;
    }

    // Load personas (custom or default)
    let availablePersonas: AgentPersona[] = AGENT_PERSONAS;
    let domainSkills: string | undefined;
    let personaSetName: string | null = options.personas || null;

    // If no personas specified, offer interactive selection with generate option
    if (!personaSetName) {
      const selection = await selectPersonas(cwd, goal, projectName);
      if (selection) {
        personaSetName = selection.name;
        availablePersonas = selection.personas;
        if (selection.skills) {
          domainSkills = selection.skills;
        }
        console.log(`\n📋 Using persona set: ${personaSetName}`);
      } else {
        console.log('\n📋 Using default personas (copywriting experts)');
      }
    }

    // Load personas from file if specified
    if (personaSetName && availablePersonas === AGENT_PERSONAS) {
      const personasPath = path.join(cwd, 'personas', `${personaSetName}.json`);
      try {
        const content = await fs.readFile(personasPath, 'utf-8');
        availablePersonas = JSON.parse(content);
      } catch {
        console.error(`Persona set "${personaSetName}" not found in personas/ directory`);
        process.exit(1);
      }
    }

    // Load domain skills if custom personas
    if (personaSetName) {
      const skillsPath = path.join(cwd, 'personas', `${personaSetName}.skills.md`);
      try {
        domainSkills = await fs.readFile(skillsPath, 'utf-8');
        console.log(`📚 Loaded domain expertise: ${personaSetName}.skills.md`);
      } catch {
        // No skills file - that's OK
      }
    }

    // Parse agent IDs or use interactive selection
    let validAgents: string[] = [];

    if (options.agents) {
      // Use command-line specified agents
      const enabledAgents = options.agents.split(',').map((id: string) => id.trim());
      validAgents = enabledAgents.filter((id: string) =>
        availablePersonas.some(a => a.id === id)
      );

      if (validAgents.length === 0) {
        console.error('No valid agents specified. Available agents:');
        availablePersonas.forEach(a => console.error(`  - ${a.id}: ${a.name} (${a.role})`));
        process.exit(1);
      }
    } else {
      // Interactive agent selection with loop for generate/defaults
      let selecting = true;
      while (selecting) {
        const result = await selectAgentsInteractively(availablePersonas);

        if (result === 'generate') {
          // Generate new personas
          const generated = await generatePersonasForGoal(cwd, goal, projectName);
          if (generated) {
            availablePersonas = generated.personas;
            domainSkills = generated.skills;
            personaSetName = generated.name;
          }
          // Continue selection with new personas
        } else if (result === 'defaults') {
          // Reset to default personas
          availablePersonas = AGENT_PERSONAS;
          domainSkills = undefined;
          personaSetName = null;
          clearCustomPersonas();
          console.log('\n📋 Using default personas (copywriting experts)');
          // Continue selection with defaults
        } else {
          // Got array of agent IDs
          validAgents = result;
          selecting = false;
        }
      }
    }

    // Register custom personas if using a custom set
    if (personaSetName) {
      registerCustomPersonas(availablePersonas);
    } else {
      clearCustomPersonas(); // Ensure we use defaults
    }

    // Create session config
    const config: SessionConfig = {
      id: uuid(),
      projectName,
      goal,
      enabledAgents: validAgents,
      humanParticipation: options.human,
      maxRounds: 10,
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path.join(cwd, 'context'),
      outputDir: options.output,
      language: options.language,
    };

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
    const persistence = new SessionPersistence(fsAdapter, {
      outputDir: options.output,
    });
    await persistence.initSession(session);

    // Create orchestrator with CLI adapters
    const orchestrator = new EDAOrchestrator(
      session,
      undefined, // context
      domainSkills, // domain-specific skills (or undefined for default copywriting)
      {
        agentRunner,
        fileSystem: fsAdapter,
      }
    );

    // Update persistence with session reference
    orchestrator.on((event) => {
      if (event.type === 'agent_message') {
        persistence.updateSession(orchestrator.getSession());
      }
    });

    console.log(`\n🔥 Starting Forge: ${projectName}`);
    console.log(`📋 Goal: ${goal}`);
    console.log(`👥 Agents: ${validAgents.join(', ')}`);
    if (personaSetName) {
      console.log(`📂 Persona set: ${personaSetName}`);
    }
    console.log(`📁 Output: ${persistence.getSessionDir()}\n`);

    // Render Ink app
    const { waitUntilExit } = render(
      React.createElement(App, {
        orchestrator,
        persistence,
        session,
        onExit: async () => {
          await persistence.saveFull();
          clearCustomPersonas(); // Clean up
          console.log(`\n✅ Session saved to ${persistence.getSessionDir()}`);
        },
      })
    );

    await waitUntilExit();
  });

// Briefs command - list available briefs
program
  .command('briefs')
  .description('List available briefs')
  .action(async () => {
    const cwd = process.cwd();
    const fsAdapter = new FileSystemAdapter(cwd);

    const briefs = await fsAdapter.listBriefs();

    if (briefs.length === 0) {
      console.log('No briefs found in briefs/ directory');
      console.log('Create a .md file in the briefs/ directory to get started.');
      return;
    }

    console.log('Available briefs:\n');
    for (const brief of briefs) {
      const content = await fsAdapter.readBrief(brief);
      const firstLine = content?.split('\n')[0] || '';
      const title = firstLine.replace(/^#+\s*/, '');
      console.log(`  • ${brief}: ${title}`);
    }
  });

// Agents command - list available agents
program
  .command('agents')
  .description('List available agents (default personas)')
  .action(() => {
    console.log('Default agents:\n');
    for (const agent of AGENT_PERSONAS) {
      console.log(`  ${agent.id}`);
      console.log(`    Name: ${agent.name} (${agent.nameHe})`);
      console.log(`    Role: ${agent.role}`);
      console.log(`    Strengths: ${agent.strengths.slice(0, 2).join(', ')}`);
      console.log('');
    }
    console.log('💡 Generate custom personas with: forge personas generate --domain "your domain"');
  });

// Add personas subcommand
program.addCommand(createPersonasCommand());

// Add enhanced export command
program.addCommand(createExportCommand());

// Default action - interactive mode when no command given
program.action(async () => {
  // Launch interactive REPL mode
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();

  // Show banner
  console.log('');
  console.log('\x1b[36m\x1b[1m╔══════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[36m\x1b[1m║\x1b[0m  \x1b[35m\x1b[1m🔥 FORGE\x1b[0m                                            \x1b[36m\x1b[1m║\x1b[0m');
  console.log('\x1b[36m\x1b[1m║\x1b[0m  \x1b[2mMulti-Agent Deliberation Engine\x1b[0m                      \x1b[36m\x1b[1m║\x1b[0m');
  console.log('\x1b[36m\x1b[1m║\x1b[0m  \x1b[2mReach consensus through structured debate\x1b[0m            \x1b[36m\x1b[1m║\x1b[0m');
  console.log('\x1b[36m\x1b[1m╚══════════════════════════════════════════════════════╝\x1b[0m');
  console.log('');

  // Check for saved sessions
  const sessionsDir = path.join(cwd, 'output', 'sessions');
  let savedSessions: string[] = [];
  try {
    const dirs = await fs.readdir(sessionsDir);
    savedSessions = dirs.filter(d => !d.startsWith('.'));
  } catch {
    // No sessions directory
  }

  if (savedSessions.length > 0) {
    console.log(`\x1b[2m${savedSessions.length} saved session(s) available. Type 'sessions' to view.\x1b[0m`);
    console.log('');
  }

  // Show help
  console.log(`${YELLOW}${BOLD}COMMANDS${RESET}`);
  console.log(`${DIM}─────────────────────${RESET}`);
  console.log(`  ${GREEN}new${RESET}           - Start new session configuration`);
  console.log(`  ${GREEN}start${RESET}         - Start configured session`);
  console.log(`  ${GREEN}sessions${RESET}      - List saved sessions`);
  console.log(`  ${GREEN}load <name>${RESET}   - Load a saved session`);
  console.log(`  ${GREEN}token [key]${RESET}   - Set/show API key`);
  console.log(`  ${GREEN}test${RESET}          - Test API connection`);
  console.log(`  ${GREEN}agents${RESET}        - List available agents`);
  console.log(`  ${GREEN}help${RESET}          - Show all commands`);
  console.log(`  ${GREEN}exit${RESET}          - Exit`);
  console.log('');

  // State
  let currentPersonas = AGENT_PERSONAS;
  let selectedAgentIds = new Set<string>();
  let sessionConfig: {
    projectName?: string;
    goal?: string;
    agents?: string[];
    language?: string;
    apiKey?: string;
  } = { language: 'hebrew' };
  let configStep = -1; // -1 = not configuring
  let currentSession: Session | null = null;
  let orchestrator: EDAOrchestrator | null = null;
  let persistence: SessionPersistence | null = null;
  let domainSkills: string | undefined;
  let isPaused = false;

  // Load API key from environment
  sessionConfig.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

  // Interactive REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    const prefix = currentSession ? '\x1b[32m●\x1b[0m' : '\x1b[2m○\x1b[0m';
    rl.question(`${prefix} forge> `, async (input) => {
      await handleCommand(input.trim());
    });
  };

  const showAgentSelection = () => {
    if (selectedAgentIds.size === 0) {
      currentPersonas.forEach(a => selectedAgentIds.add(a.id));
    }
    console.log('');
    console.log('\x1b[36m\x1b[1mPERSONA OPTIONS:\x1b[0m');
    console.log('  \x1b[33mg\x1b[0m - 🔥 Generate new personas for this project');
    console.log('  \x1b[33md\x1b[0m - Use default personas (copywriting experts)');
    console.log('');
    console.log('\x1b[36mSelect agents (toggle with number):\x1b[0m');
    currentPersonas.forEach((agent, index) => {
      const isSelected = selectedAgentIds.has(agent.id);
      const checkbox = isSelected ? '\x1b[32m[✓]\x1b[0m' : '\x1b[2m[ ]\x1b[0m';
      const num = `\x1b[1m${index + 1}\x1b[0m`;
      const name = isSelected ? `\x1b[1m${agent.name}\x1b[0m` : `\x1b[2m${agent.name}\x1b[0m`;
      console.log(`  ${checkbox} ${num}. ${name} (${agent.nameHe}) - ${agent.role}`);
    });
    console.log('');
    console.log(`\x1b[2mSelected: ${selectedAgentIds.size}/${currentPersonas.length} agents\x1b[0m`);
    console.log(`\x1b[2mType number to toggle, 'g' generate, 'd' defaults, 'done' to continue\x1b[0m`);
  };

  const handleCommand = async (input: string) => {
    const [cmd, ...args] = input.split(' ');
    const cmdLower = cmd.toLowerCase();

    // Handle configuration mode
    if (configStep >= 0) {
      await handleConfigInput(input);
      return;
    }

    // Handle running session mode
    if (currentSession && orchestrator) {
      switch (cmdLower) {
        case 'stop':
        case 'exit':
          if (persistence) {
            // Save with memory state
            const sessionWithMemory = {
              ...orchestrator.getSession(),
              memoryState: messageBus.getMemoryState(),
            };
            await persistence.saveSessionWithMemory(sessionWithMemory);
            console.log(`${GREEN}Session saved.${RESET}`);
          }
          orchestrator.stop();
          currentSession = null;
          orchestrator = null;
          persistence = null;
          isPaused = false;
          console.log(`${YELLOW}Session ended.${RESET}`);
          prompt();
          return;

        case 'status':
          showSessionStatus();
          prompt();
          return;

        case 'memory':
        case 'context':
          showMemoryStats();
          prompt();
          return;

        case 'recall':
          showRecall(args[0]);
          prompt();
          return;

        case 'pause':
          if (!isPaused) {
            messageBus.pause('user requested');
            isPaused = true;
            console.log(`${YELLOW}Session paused. Type 'resume' to continue.${RESET}`);
          } else {
            console.log(`${DIM}Already paused.${RESET}`);
          }
          prompt();
          return;

        case 'resume':
          if (isPaused) {
            messageBus.resume();
            isPaused = false;
            console.log(`${GREEN}Session resumed.${RESET}`);
          } else {
            console.log(`${DIM}Not paused.${RESET}`);
          }
          prompt();
          return;

        case 'synthesize':
        case 'syn':
          await transitionToSynthesis(orchestrator, args[0]?.toLowerCase() === 'force');
          prompt();
          return;

        case 'consensus':
        case 'ready':
          showConsensusStatus(orchestrator);
          prompt();
          return;

        case 'draft':
        case 'write':
          await transitionToDraft(orchestrator);
          prompt();
          return;

        case 'save':
          if (persistence) {
            const sessionWithMemory = {
              ...orchestrator.getSession(),
              memoryState: messageBus.getMemoryState(),
            };
            await persistence.saveSessionWithMemory(sessionWithMemory);
            console.log(`${GREEN}Session saved to ${persistence.getSessionDir()}${RESET}`);
          }
          prompt();
          return;

        case 'export':
          await exportSession(orchestrator, args[0] || 'md');
          prompt();
          return;

        case 'agents':
          showActiveAgents();
          prompt();
          return;

        case 'help':
        case '?':
          showSessionHelp();
          prompt();
          return;

        case 'clear':
        case 'cls':
          console.clear();
          prompt();
          return;

        default:
          // Send as message if not a command
          if (input && !input.startsWith('/')) {
            if (isPaused) {
              console.log(`${YELLOW}Session is paused. Type 'resume' first.${RESET}`);
            } else {
              await orchestrator.addHumanMessage(input);
            }
          } else if (input) {
            console.log(`${RED}Unknown command: ${cmd}${RESET}`);
            console.log(`${DIM}Type 'help' for available commands.${RESET}`);
          }
          prompt();
          return;
      }
    }

    // Normal command mode
    switch (cmdLower) {
      case 'new':
      case 'init':
        configStep = 0;
        sessionConfig = { language: 'hebrew', apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY };
        selectedAgentIds.clear();
        currentPersonas = AGENT_PERSONAS;
        domainSkills = undefined;
        console.log('');
        console.log(`${MAGENTA}${BOLD}═══════════════════════════════════════${RESET}`);
        console.log(`${MAGENTA}${BOLD}  NEW SESSION CONFIGURATION${RESET}`);
        console.log(`${MAGENTA}${BOLD}═══════════════════════════════════════${RESET}`);
        console.log('');
        console.log(`${CYAN}Enter project name:${RESET}`);
        break;

      case 'start':
        // Start session with current config
        if (sessionConfig.projectName && sessionConfig.agents && sessionConfig.agents.length > 0) {
          await startSession();
        } else {
          console.log(`${YELLOW}No session configured. Run 'new' first.${RESET}`);
        }
        break;

      case 'sessions':
      case 'ls':
        await listSessions();
        break;

      case 'load':
        if (args.length > 0) {
          await loadSession(args.join(' '));
        } else {
          console.log(`${YELLOW}Usage: load <session-name or number>${RESET}`);
          console.log(`${DIM}Use 'sessions' to see available sessions.${RESET}`);
        }
        break;

      case 'token':
      case 'apikey':
      case 'setkey':
        if (args.length > 0) {
          sessionConfig.apiKey = args[0];
          process.env.ANTHROPIC_API_KEY = args[0];
          console.log(`${GREEN}API key set.${RESET}`);
        } else {
          if (sessionConfig.apiKey) {
            console.log(`${GREEN}API key is set (${sessionConfig.apiKey.slice(0, 10)}...)${RESET}`);
          } else {
            console.log(`${YELLOW}No API key set. Use: token <your-key>${RESET}`);
            console.log(`${DIM}Or set ANTHROPIC_API_KEY environment variable.${RESET}`);
          }
        }
        break;

      case 'test':
        await testApiConnection();
        break;

      case 'agents':
        console.log('');
        console.log(`${CYAN}${BOLD}AVAILABLE AGENTS${RESET}`);
        console.log(`${DIM}─────────────────────${RESET}`);
        for (const agent of AGENT_PERSONAS) {
          console.log(`${BOLD}${agent.name}${RESET} (${agent.nameHe})`);
          console.log(`  ${DIM}${agent.role}${RESET}`);
        }
        console.log('');
        break;

      case 'help':
      case '?':
        showFullHelp();
        break;

      case 'clear':
      case 'cls':
        console.clear();
        break;

      case 'exit':
      case 'quit':
        console.log(`${DIM}Goodbye.${RESET}`);
        rl.close();
        process.exit(0);

      case '':
        break;

      default:
        console.log(`${RED}Unknown command: ${cmd}${RESET}`);
        console.log(`${DIM}Type 'help' for available commands.${RESET}`);
    }

    prompt();
  };

  const handleConfigInput = async (input: string) => {
    const inputLower = input.toLowerCase().trim();

    switch (configStep) {
      case 0: // Project name
        sessionConfig.projectName = input || 'Untitled Project';
        console.log(`\x1b[32mProject: ${sessionConfig.projectName}\x1b[0m`);
        configStep = 1;
        console.log('\x1b[36mEnter project goal:\x1b[0m');
        break;

      case 1: // Goal
        sessionConfig.goal = input || 'Create effective content';
        console.log(`\x1b[32mGoal: ${sessionConfig.goal}\x1b[0m`);
        configStep = 2;
        showAgentSelection();
        break;

      case 2: // Agent selection
        if (inputLower === 'g' || inputLower === 'generate') {
          console.log('');
          console.log('\x1b[35m\x1b[1m🔥 Generating personas...\x1b[0m');
          const result = await generatePersonasForGoal(cwd, sessionConfig.goal || '', sessionConfig.projectName || '');
          if (result) {
            currentPersonas = result.personas;
            registerCustomPersonas(result.personas);
            selectedAgentIds.clear();
          }
          showAgentSelection();
          break;
        }
        if (inputLower === 'd' || inputLower === 'defaults') {
          currentPersonas = AGENT_PERSONAS;
          clearCustomPersonas();
          selectedAgentIds.clear();
          console.log('\x1b[32mUsing default personas\x1b[0m');
          showAgentSelection();
          break;
        }
        if (inputLower === 'done' || inputLower === 'ok' || inputLower === 'y') {
          if (selectedAgentIds.size === 0) {
            currentPersonas.forEach(a => selectedAgentIds.add(a.id));
          }
          sessionConfig.agents = Array.from(selectedAgentIds);
          console.log(`\x1b[32mAgents: ${sessionConfig.agents.join(', ')}\x1b[0m`);
          configStep = 3;
          console.log('');
          console.log('\x1b[36mSelect language:\x1b[0m');
          console.log('  \x1b[1m1\x1b[0m - Hebrew (עברית) - default');
          console.log('  \x1b[1m2\x1b[0m - English');
          console.log('  \x1b[1m3\x1b[0m - Mixed');
          break;
        }
        if (inputLower === 'a' || inputLower === 'all') {
          currentPersonas.forEach(a => selectedAgentIds.add(a.id));
          showAgentSelection();
          break;
        }
        if (inputLower === 'n' || inputLower === 'none') {
          selectedAgentIds.clear();
          showAgentSelection();
          break;
        }
        // Toggle by number
        const num = parseInt(inputLower, 10);
        if (!isNaN(num) && num >= 1 && num <= currentPersonas.length) {
          const agent = currentPersonas[num - 1];
          if (selectedAgentIds.has(agent.id)) {
            selectedAgentIds.delete(agent.id);
            console.log(`\x1b[31m✗ Removed: ${agent.name}\x1b[0m`);
          } else {
            selectedAgentIds.add(agent.id);
            console.log(`\x1b[32m✓ Added: ${agent.name}\x1b[0m`);
          }
          showAgentSelection();
          break;
        }
        if (inputLower === '') {
          break;
        }
        console.log('\x1b[33mType number to toggle, g/d/done\x1b[0m');
        break;

      case 3: // Language
        if (inputLower === '1' || inputLower === 'hebrew' || inputLower === '') {
          sessionConfig.language = 'hebrew';
        } else if (inputLower === '2' || inputLower === 'english') {
          sessionConfig.language = 'english';
        } else if (inputLower === '3' || inputLower === 'mixed') {
          sessionConfig.language = 'mixed';
        }
        console.log(`\x1b[32mLanguage: ${sessionConfig.language}\x1b[0m`);
        configStep = -1;

        // Configuration complete - start session
        console.log('');
        console.log('\x1b[32m\x1b[1mConfiguration complete!\x1b[0m');
        console.log(`\x1b[2mType 'start' to begin the session.\x1b[0m`);
        break;
    }

    prompt();
  };

  const listSessions = async () => {
    console.log('');
    console.log('\x1b[36m\x1b[1mSAVED SESSIONS\x1b[0m');
    console.log('\x1b[2m─────────────────────\x1b[0m');

    try {
      const dirs = await fs.readdir(sessionsDir);
      const sessions = dirs.filter(d => !d.startsWith('.'));

      if (sessions.length === 0) {
        console.log('\x1b[2mNo saved sessions found.\x1b[0m');
        console.log('');
        return;
      }

      for (let i = 0; i < sessions.length; i++) {
        const sessionDir = path.join(sessionsDir, sessions[i]);
        let meta: any = null;
        try {
          const metaPath = path.join(sessionDir, 'session.json');
          meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        } catch {
          try {
            const metaPath = path.join(sessionDir, 'metadata.json');
            meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
          } catch {
            // No metadata
          }
        }
        if (meta) {
          console.log(`  ${BOLD}${i + 1}${RESET}. ${GREEN}${meta.projectName || sessions[i]}${RESET}`);
          console.log(`     ${DIM}${new Date(meta.startedAt).toLocaleDateString()} • ${meta.goal?.slice(0, 40) || ''}${RESET}`);
        } else {
          console.log(`  ${BOLD}${i + 1}${RESET}. ${sessions[i]}`);
        }
      }
      console.log('');
      console.log(`\x1b[2mUse 'load <number>' to restore a session.\x1b[0m`);
      console.log('');
    } catch {
      console.log('\x1b[2mNo sessions directory found.\x1b[0m');
      console.log('');
    }
  };

  const loadSession = async (nameOrIndex: string) => {
    console.log(`${CYAN}Loading session...${RESET}`);

    try {
      const dirs = await fs.readdir(sessionsDir);
      const sessions = dirs.filter(d => !d.startsWith('.')).sort().reverse();

      if (sessions.length === 0) {
        console.log(`${RED}No saved sessions found.${RESET}`);
        return;
      }

      // Resolve index to name
      let sessionName = nameOrIndex;
      const index = parseInt(nameOrIndex, 10);
      if (!isNaN(index) && index >= 1 && index <= sessions.length) {
        sessionName = sessions[index - 1];
      }

      // Find matching session
      const matchingSession = sessions.find(s => s === sessionName || s.includes(sessionName));
      if (!matchingSession) {
        console.log(`${RED}Session not found: ${nameOrIndex}${RESET}`);
        return;
      }

      const sessionDir = path.join(sessionsDir, matchingSession);

      // Load metadata
      let metadata: any = {};
      try {
        const metaPath = path.join(sessionDir, 'session.json');
        metadata = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
      } catch {
        try {
          const metaPath = path.join(sessionDir, 'metadata.json');
          metadata = JSON.parse(await fs.readFile(metaPath, 'utf-8'));
        } catch {
          console.log(`${YELLOW}Warning: Could not load session metadata.${RESET}`);
        }
      }

      // Load messages
      let messages: Message[] = [];
      try {
        const messagesPath = path.join(sessionDir, 'messages.jsonl');
        const content = await fs.readFile(messagesPath, 'utf-8');
        messages = content
          .trim()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch {
        console.log(`${DIM}No messages file found.${RESET}`);
      }

      // Load memory state
      let memoryState: any = null;
      try {
        const memoryPath = path.join(sessionDir, 'memory.json');
        memoryState = JSON.parse(await fs.readFile(memoryPath, 'utf-8'));
      } catch {
        // No memory file (older session)
      }

      // Try to load personas
      if (metadata.enabledAgents) {
        try {
          const personasPath = path.join(cwd, 'personas', `${matchingSession}.json`);
          const personasContent = await fs.readFile(personasPath, 'utf-8');
          currentPersonas = JSON.parse(personasContent);
          registerCustomPersonas(currentPersonas);

          // Load skills if exists
          try {
            const skillsPath = path.join(cwd, 'personas', `${matchingSession}.skills.md`);
            domainSkills = await fs.readFile(skillsPath, 'utf-8');
          } catch {
            // No skills file
          }
        } catch {
          // Use default personas
          currentPersonas = AGENT_PERSONAS;
        }
      }

      // Update config
      sessionConfig.projectName = metadata.projectName;
      sessionConfig.goal = metadata.goal;
      sessionConfig.agents = metadata.enabledAgents || [];
      selectedAgentIds = new Set(sessionConfig.agents);

      // Restore memory if present
      if (memoryState) {
        messageBus.restoreMemory(memoryState);
        console.log(`${DIM}Conversation memory restored.${RESET}`);
      }

      console.log('');
      console.log(`${GREEN}${BOLD}✓ Session loaded!${RESET}`);
      console.log(`${DIM}Project: ${metadata.projectName}${RESET}`);
      console.log(`${DIM}Goal: ${metadata.goal}${RESET}`);
      console.log(`${DIM}Agents: ${(metadata.enabledAgents || []).join(', ')}${RESET}`);
      console.log(`${DIM}Messages: ${messages.length}${RESET}`);
      console.log('');
      console.log(`${YELLOW}Type 'start' to continue this session.${RESET}`);
      console.log('');

    } catch (error) {
      console.log(`${RED}Error loading session: ${error}${RESET}`);
    }
  };

  const startSession = async () => {
    if (!sessionConfig.projectName || !sessionConfig.agents || sessionConfig.agents.length === 0) {
      console.log(`${YELLOW}Session not configured. Run 'new' first.${RESET}`);
      return;
    }

    // Register personas if custom
    if (currentPersonas !== AGENT_PERSONAS) {
      registerCustomPersonas(currentPersonas);
    }

    // Create session config
    const config: SessionConfig = {
      id: uuid(),
      projectName: sessionConfig.projectName,
      goal: sessionConfig.goal || 'Reach consensus',
      enabledAgents: sessionConfig.agents,
      humanParticipation: true,
      maxRounds: 10,
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path.join(cwd, 'context'),
      outputDir: path.join(cwd, 'output', 'sessions'),
      language: sessionConfig.language,
      apiKey: sessionConfig.apiKey,
    };

    // Create session
    currentSession = {
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
    persistence = new SessionPersistence(fsAdapter, {
      outputDir: config.outputDir,
    });
    await persistence.initSession(currentSession);

    // Set runner on message bus for memory summarization
    messageBus.setAgentRunner(agentRunner);

    // Create orchestrator
    orchestrator = new EDAOrchestrator(
      currentSession,
      undefined,
      domainSkills,
      {
        agentRunner,
        fileSystem: fsAdapter,
      }
    );

    // Update persistence on events
    orchestrator.on((event) => {
      if (event.type === 'agent_message' && persistence && orchestrator) {
        persistence.updateSession(orchestrator.getSession());
      }
    });

    console.log('');
    console.log(`${GREEN}${BOLD}🔥 Session started: ${sessionConfig.projectName}${RESET}`);
    console.log(`${DIM}Goal: ${sessionConfig.goal}${RESET}`);
    console.log(`${DIM}Agents: ${sessionConfig.agents.join(', ')}${RESET}`);
    console.log(`${DIM}Output: ${persistence.getSessionDir()}${RESET}`);
    console.log('');
    console.log(`${DIM}Type your message to join the debate. Type 'help' for commands.${RESET}`);
    console.log('');

    // Start the orchestrator
    orchestrator.start();
    isPaused = false;
  };

  const showSessionStatus = () => {
    if (!orchestrator || !currentSession) return;

    const status = orchestrator.getConsensusStatus();
    const memStats = messageBus.getMemoryStats();

    console.log('');
    console.log(`${CYAN}${BOLD}SESSION STATUS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`Project: ${currentSession.config.projectName}`);
    console.log(`Phase: ${currentSession.currentPhase}${isPaused ? ` ${YELLOW}(PAUSED)${RESET}` : ''}`);
    console.log(`Messages: ${currentSession.messages.length}`);
    console.log('');
    console.log(`${CYAN}${BOLD}CONSENSUS${RESET}`);
    console.log(`Ready: ${status.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
    console.log(`Points: ${status.consensusPoints} consensus, ${status.conflictPoints} conflicts`);
    if (status.recommendation) {
      console.log(`Recommendation: ${status.recommendation}`);
    }
    console.log('');
    console.log(`${CYAN}${BOLD}MEMORY${RESET}`);
    console.log(`Summaries: ${memStats.summaryCount}, Decisions: ${memStats.decisionCount}`);
    console.log('');
  };

  const showMemoryStats = () => {
    const stats = messageBus.getMemoryStats();
    console.log('');
    console.log(`${CYAN}${BOLD}CONVERSATION MEMORY${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`Summaries: ${stats.summaryCount}`);
    console.log(`Key Decisions: ${stats.decisionCount}`);
    console.log(`Active Proposals: ${stats.proposalCount}`);
    console.log(`Tracked Agents: ${stats.agentCount}`);
    console.log('');
    if (stats.summaryCount > 0) {
      console.log(`${DIM}Memory is active - agents can recall earlier conversation.${RESET}`);
      console.log(`${DIM}Use 'recall [agent-id]' to test what an agent remembers.${RESET}`);
    } else {
      console.log(`${DIM}Memory will build as conversation progresses (~12 messages per summary).${RESET}`);
    }
    console.log('');
  };

  const showRecall = (agentId?: string) => {
    const memoryContext = messageBus.getMemoryContext(agentId);
    const stats = messageBus.getMemoryStats();

    console.log('');
    console.log(`${CYAN}${BOLD}AGENT MEMORY TEST${agentId ? ` (${agentId})` : ''}${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);

    if (stats.summaryCount === 0) {
      console.log(`${YELLOW}No memory built yet.${RESET}`);
      console.log(`${DIM}Memory builds after ~12 messages.${RESET}`);
      const allMessages = messageBus.getAllMessages();
      console.log(`${DIM}Messages so far: ${allMessages.length}${RESET}`);
      if (allMessages.length > 0) {
        console.log('');
        console.log(`${DIM}Recent topics:${RESET}`);
        allMessages.slice(-5).forEach(m => {
          const preview = m.content.slice(0, 80).replace(/\n/g, ' ');
          console.log(`${DIM}  [${m.agentId}]: ${preview}...${RESET}`);
        });
      }
    } else {
      console.log(`${GREEN}Memory context an agent would receive:${RESET}`);
      console.log('');
      memoryContext.split('\n').forEach(line => {
        console.log(`${DIM}  ${line}${RESET}`);
      });
    }
    console.log('');
  };

  const showConsensusStatus = (orch: EDAOrchestrator) => {
    const status = orch.getConsensusStatus();
    console.log('');
    console.log(`${CYAN}${BOLD}CONSENSUS STATUS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`Ready for synthesis: ${status.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
    console.log(`Consensus points: ${status.consensusPoints}`);
    console.log(`Conflict points: ${status.conflictPoints}`);
    if (status.recommendation) {
      console.log('');
      console.log(`${BOLD}Recommendation:${RESET} ${status.recommendation}`);
    }
    console.log('');
    if (!status.ready) {
      console.log(`${DIM}Use 'synthesize force' to force synthesis anyway.${RESET}`);
    }
    console.log('');
  };

  const transitionToSynthesis = async (orch: EDAOrchestrator, force: boolean) => {
    console.log(`${CYAN}Transitioning to synthesis phase...${RESET}`);
    try {
      const result = await orch.transitionToSynthesis(force);
      if (result && result.success) {
        console.log(`${GREEN}${result.message}${RESET}`);
      } else if (result) {
        console.log(`${YELLOW}${result.message}${RESET}`);
      }
    } catch (error) {
      console.log(`${RED}Error: ${error}${RESET}`);
    }
  };

  const transitionToDraft = async (orch: EDAOrchestrator) => {
    console.log(`${CYAN}Transitioning to drafting phase...${RESET}`);
    try {
      const result = await orch.transitionToDrafting();
      if (result && result.success) {
        console.log(`${GREEN}${result.message}${RESET}`);
      } else if (result) {
        console.log(`${YELLOW}${result.message}${RESET}`);
      }
    } catch (error) {
      console.log(`${RED}Error: ${error}${RESET}`);
    }
  };

  const exportSession = async (orch: EDAOrchestrator, format: string) => {
    if (!persistence) {
      console.log(`${RED}No session to export.${RESET}`);
      return;
    }

    try {
      const session = orch.getSession();
      const filename = `export-${Date.now()}.${format}`;
      const filepath = path.join(persistence.getSessionDir(), filename);

      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(session, null, 2));
      } else if (format === 'md') {
        const lines: string[] = [];
        lines.push(`# ${session.config.projectName} - Transcript`);
        lines.push('');
        lines.push(`**Goal:** ${session.config.goal}`);
        lines.push(`**Date:** ${session.startedAt}`);
        lines.push('');
        lines.push('---');
        lines.push('');
        for (const msg of session.messages) {
          const sender = msg.agentId === 'human' ? 'Human' : msg.agentId;
          lines.push(`### ${sender}`);
          lines.push('');
          lines.push(msg.content);
          lines.push('');
          lines.push('---');
          lines.push('');
        }
        await fs.writeFile(filepath, lines.join('\n'));
      }

      console.log(`${GREEN}Exported to: ${filepath}${RESET}`);
    } catch (error) {
      console.log(`${RED}Export failed: ${error}${RESET}`);
    }
  };

  const showActiveAgents = () => {
    const personas = getActivePersonas();
    console.log('');
    console.log(`${CYAN}${BOLD}ACTIVE AGENTS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    for (const agent of personas) {
      const isEnabled = sessionConfig.agents?.includes(agent.id);
      const marker = isEnabled ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
      console.log(`${marker} ${BOLD}${agent.name}${RESET} (${agent.nameHe})`);
      console.log(`  ${DIM}${agent.role}${RESET}`);
    }
    console.log('');
  };

  const testApiConnection = async () => {
    console.log(`${CYAN}Testing API connection...${RESET}`);
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic();
      // Use haiku for API connection test - fast and cost-effective
      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "OK"' }],
      });
      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      console.log(`${GREEN}✓ API connection successful: ${text}${RESET}`);
    } catch (error: any) {
      console.log(`${RED}✗ API connection failed: ${error.message}${RESET}`);
      console.log(`${DIM}Make sure ANTHROPIC_API_KEY is set or use 'token <key>'.${RESET}`);
    }
  };

  const showSessionHelp = () => {
    console.log('');
    console.log(`${YELLOW}${BOLD}SESSION COMMANDS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}<text>${RESET}        - Send message to debate`);
    console.log(`  ${GREEN}status${RESET}        - Show session status`);
    console.log(`  ${GREEN}memory${RESET}        - Show conversation memory stats`);
    console.log(`  ${GREEN}recall [id]${RESET}   - Test what agent remembers`);
    console.log(`  ${GREEN}agents${RESET}        - List active agents`);
    console.log(`  ${GREEN}pause${RESET}         - Pause session`);
    console.log(`  ${GREEN}resume${RESET}        - Resume paused session`);
    console.log('');
    console.log(`${YELLOW}${BOLD}PHASE CONTROLS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}consensus${RESET}     - Check consensus status`);
    console.log(`  ${GREEN}synthesize${RESET}    - Move to synthesis phase`);
    console.log(`  ${GREEN}draft${RESET}         - Move to drafting phase`);
    console.log('');
    console.log(`${YELLOW}${BOLD}SESSION MANAGEMENT${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}save${RESET}          - Save session`);
    console.log(`  ${GREEN}export [fmt]${RESET}  - Export session (md, json)`);
    console.log(`  ${GREEN}stop${RESET}          - End session`);
    console.log(`  ${GREEN}clear${RESET}         - Clear screen`);
    console.log(`  ${GREEN}help${RESET}          - Show this help`);
    console.log('');
  };

  const showFullHelp = () => {
    console.log('');
    console.log(`${YELLOW}${BOLD}COMMANDS${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}new, init${RESET}     - Start new session configuration`);
    console.log(`  ${GREEN}start${RESET}         - Start configured session`);
    console.log(`  ${GREEN}token [key]${RESET}   - Set/show Claude API key`);
    console.log(`  ${GREEN}test${RESET}          - Test Claude API connection`);
    console.log('');
    console.log(`${YELLOW}${BOLD}SESSION MANAGEMENT${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}sessions, ls${RESET}  - List saved sessions`);
    console.log(`  ${GREEN}load <name>${RESET}   - Load a saved session`);
    console.log(`  ${GREEN}agents${RESET}        - List available agents`);
    console.log('');
    console.log(`${YELLOW}${BOLD}DURING SESSION${RESET}`);
    console.log(`${DIM}─────────────────────${RESET}`);
    console.log(`  ${GREEN}<text>${RESET}        - Send message to debate`);
    console.log(`  ${GREEN}status${RESET}        - Show session status`);
    console.log(`  ${GREEN}memory${RESET}        - Show conversation memory`);
    console.log(`  ${GREEN}recall [id]${RESET}   - Test agent memory`);
    console.log(`  ${GREEN}pause/resume${RESET}  - Pause/resume session`);
    console.log(`  ${GREEN}synthesize${RESET}    - Move to synthesis phase`);
    console.log(`  ${GREEN}consensus${RESET}     - Check consensus status`);
    console.log(`  ${GREEN}draft${RESET}         - Move to drafting phase`);
    console.log(`  ${GREEN}save${RESET}          - Save session`);
    console.log(`  ${GREEN}export [fmt]${RESET}  - Export (md, json)`);
    console.log(`  ${GREEN}stop${RESET}          - End session`);
    console.log('');
    console.log(`  ${GREEN}clear${RESET}         - Clear screen`);
    console.log(`  ${GREEN}help${RESET}          - Show this help`);
    console.log(`  ${GREEN}exit${RESET}          - Exit`);
    console.log('');
  };

  // Start REPL
  prompt();
});

program.parse();
