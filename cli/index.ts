#!/usr/bin/env bun
/**
 * Forge CLI - Multi-agent deliberation engine
 * Reach consensus through structured debate
 */

import { Command } from 'commander';
// ink is imported lazily (only for the bare `forge` no-args HomeScreen
// path). Importing it eagerly loads react-reconciler 0.29 which uses
// React 18 internals and crashes under React 19 (required by OpenTUI).
import React from 'react';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as readline from 'readline';
import { App } from './app/App';
import { CLIAgentRunner } from './adapters/CLIAgentRunner';
import { ClaudeCodeCLIRunner } from './adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { SessionPersistence } from './adapters/SessionPersistence';
import { EDAOrchestrator } from '../src/lib/eda/EDAOrchestrator';
import { messageBus } from '../src/lib/eda/MessageBus';
import { getDefaultMethodology } from '../src/methodologies';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas, getActivePersonas, generatePersonas } from '../src/agents/personas';
import { createPersonasCommand } from './commands/personas';
import { createExportCommand } from './commands/export';
import { createBatchCommand } from './commands/batch';
import { createSessionsCommand } from './commands/sessions';
import { createWatchCommand } from './commands/watch';
import { createCompletionsCommand } from './commands/completions';
import { createConfigCommand } from './commands/config';
import { createSkillsCommand } from './commands/skills';
import { createInitCommand } from './commands/init';
import { createMenuCommand } from './commands/menu';
import { createAutoCommand } from './commands/auto';
import { createCompressCommand } from './commands/compress';
import { createMcpCommand } from './commands/mcp';
import { createParallelCommand } from './commands/parallel';
import { createPipelineCommand } from './commands/pipeline';
import { launchSession } from './lib/session-launcher';
import { createLoginCommand } from './commands/login';
import { createCommunityCommand } from './commands/community';
import { createFileAuthBridge } from './adapters/auth-bridge';
import { shutdownServices } from './adapters/services';
import { createSessionRepository } from '../src/lib/auth/session';
import { ResultAsync } from '../src/lib/core';
import type { Session, SessionConfig, AgentPersona, Message } from '../src/types';
import { getRandomQuote, formatQuote } from '../src/lib/quotes';
import { forgeTheme } from '../src/lib/render/theme';

// Semantic theme tokens (replaces hardcoded ANSI codes).
const RESET = forgeTheme.reset;
const BOLD = forgeTheme.bold;
const DIM = forgeTheme.dim;
const GREEN = forgeTheme.status.success;
const YELLOW = forgeTheme.status.warning;
const CYAN = forgeTheme.status.info;
const RED = forgeTheme.status.error;
const MAGENTA = forgeTheme.text.emphasis;

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

// Start command - power-user path (flags only). Intended for scripts
// and CI; interactive humans should run bare `forge` for the wizard.
program
  .command('start', { hidden: true })
  .description('[power-user] Launch a session directly from flags (regular use: run `forge` for the menu)')
  .option('-b, --brief <name>', 'Brief name to load (from briefs/ directory)')
  .option('-p, --project <name>', 'Project name', 'New Project')
  .option('-g, --goal <goal>', 'Project goal')
  .option('-a, --agents <ids>', 'Comma-separated agent IDs (from default or custom personas)')
  .option('-m, --mode <mode>', 'Deliberation mode (see `forge --help`)', 'will-it-work')
  .option('--personas <name>', 'Use custom persona set (from personas/ directory)')
  .option('-l, --language <lang>', 'Language: hebrew, english, mixed', 'english')
  .option('--human', 'Enable human participation', true)
  .option('--no-human', 'Disable human participation')
  .option('-o, --output <dir>', 'Output directory for sessions', 'output/sessions')
  .action(async (options) => {
    // Parse --mode and --agents (comma list) into the SessionLaunchRequest
    // shape. Everything else goes through launchSession() — the same
    // runway the interactive menu uses.
    const agents = options.agents
      ? String(options.agents).split(",").map((s) => s.trim()).filter(Boolean)
      : ["skeptic","pragmatist","analyst"];
    const result = await launchSession({
      projectName: options.project ?? "New Project",
      goal: options.goal ?? `Debate and reach consensus on: ${options.project ?? "New Project"}`,
      mode: options.mode ?? "will-it-work",
      agents,
      language: (options.language as "english" | "hebrew" | "mixed") ?? "english",
      humanParticipation: options.human !== false,
      outputDir: options.output ?? "output/sessions",
      personaSet: options.personas ?? null,
      brief: options.brief,
    });
    if (!result.success) {
      console.error(`${RED}${result.error ?? "Session did not start"}${RESET}`);
      process.exit(1);
    }
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

// Add batch processing command
program.addCommand(createBatchCommand());

// Add sessions management command
program.addCommand(createSessionsCommand());

// Add watch mode command
program.addCommand(createWatchCommand());

// Add shell completions command
program.addCommand(createCompletionsCommand());

// Add config command
program.addCommand(createConfigCommand());

// Browse and apply per-agent skills from the CLI (mirrors the TUI picker).
program.addCommand(createSkillsCommand());

// Interactive first-run setup — writes to ~/.config/forge/config.json.
program.addCommand(createInitCommand());

// Smart router — natural-language request → mode + agents + goal → run.
program.addCommand(createAutoCommand());

// Token compression pipe — transcript in, handoff brief out.
program.addCommand(createCompressCommand());

// MCP server — exposes list_modes / list_sessions / get_consensus / route
// to any MCP host (Cursor, Claude Code, etc.) over stdio.
program.addCommand(createMcpCommand());

// Parallel runner — split a spec into N sub-deliberations, aggregate.
program.addCommand(createParallelCommand());

// Pipeline — chain modes so each phase's consensus feeds the next.
program.addCommand(createPipelineCommand());

// Decentralized identity + community (Phases 1-4)
program.addCommand(createLoginCommand());
program.addCommand(createCommunityCommand());


// Bare `forge` → interactive menu. This IS the primary entry point.
// Shows the Last Supper banner + a @clack/prompts menu that walks the
// user through mode + project + goal + agents + language before
// handing off to the OpenTUI deliberation view.
//
// The old direct `forge start -m -g -a ...` form is still available
// (marked hidden in the command declaration above) for scripts and CI;
// interactive humans should just run `forge`.
program.action(createMenuCommand());

// ---- graceful shutdown ----

const shutdown = async () => {
  await shutdownServices();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('beforeExit', () => { shutdownServices(); });

program.parse();
