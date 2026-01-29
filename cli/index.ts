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
import { getDefaultMethodology } from '../src/methodologies';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas } from '../src/agents/personas';
import { createPersonasCommand } from './commands/personas';
import { createExportCommand } from './commands/export';
import type { Session, SessionConfig, AgentPersona } from '../src/types';

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
 */
async function generatePersonasForGoal(cwd: string, goal: string, projectName: string): Promise<{ name: string; personas: AgentPersona[]; skills?: string } | null> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;

  console.log('\n🔥 Generating personas for your project...\n');

  const prompt = `Generate debate personas for this project:

**Project:** ${projectName}
**Goal:** ${goal}

Create 4-5 personas that would be valuable stakeholders in debating and making decisions for this project. Include diverse perspectives that will create productive tension.`;

  try {
    const client = new Anthropic();

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project.

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have.

### 2. "personas" field
An array of personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name
- role: Short role description
- age: Realistic age
- background: 2-3 sentence background
- personality: Array of 4-5 traits
- biases: Array of 3-4 biases
- strengths: Array of 3-4 strengths
- weaknesses: Array of 2 weaknesses
- speakingStyle: How they communicate
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red`,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('Failed to generate personas');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const personas = parsed.personas || parsed;
    const skills = parsed.expertise;

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
    let validAgents: string[];

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

program.parse();
