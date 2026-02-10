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
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { App } from './app/App';
import { CLIAgentRunner } from './adapters/CLIAgentRunner';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { SessionPersistence } from './adapters/SessionPersistence';
import { EDAOrchestrator } from '../src/lib/eda/EDAOrchestrator';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas, getActivePersonas } from '../src/agents/personas';
import { createPersonasCommand } from './commands/personas';
import { createExportCommand } from './commands/export';
import { createBatchCommand } from './commands/batch';
import { createSessionsCommand } from './commands/sessions';
import { createWatchCommand } from './commands/watch';
import { createCompletionsCommand } from './commands/completions';
import { createConfigCommand } from './commands/config';
import { selectPersonasFlow, selectAgentsFlow } from './prompts/wizards';
import { runIdleMode } from './prompts/idle';
import { loadPreferences } from './preferences';
import type { Session, SessionConfig, AgentPersona } from '../src/types';
import { getDefaultMethodology } from '../src/methodologies';

const program = new Command();

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
  .option('-l, --language <lang>', 'Language: english, hebrew, mixed')
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
        const titleMatch = brief.match(/^#\s+(.+)$/m);
        if (titleMatch && projectName === 'New Project') {
          projectName = titleMatch[1];
        }
        if (!goal) {
          goal = `Create website copy for ${projectName}`;
        }
      } else {
        p.log.error(`Brief "${options.brief}" not found in briefs/ directory`);
        process.exit(1);
      }
    }

    if (!goal) {
      goal = `Debate and reach consensus on: ${projectName}`;
    }

    // Resolve language: CLI flag → preferences → interactive prompt
    if (!options.language) {
      const prefs = await loadPreferences();
      if (prefs.language) {
        options.language = prefs.language;
      } else {
        const langChoice = await p.select({
          message: 'Debate language',
          options: [
            { value: 'english', label: 'English' },
            { value: 'hebrew', label: 'Hebrew (עברית)' },
            { value: 'mixed', label: 'Mixed' },
          ],
        });
        if (p.isCancel(langChoice)) process.exit(0);
        options.language = langChoice as string;
      }
    }

    // Load personas (custom or default)
    let availablePersonas: AgentPersona[] = AGENT_PERSONAS;
    let domainSkills: string | undefined;
    let personaSetName: string | null = options.personas || null;

    // If no personas specified and no agents specified, offer interactive selection
    if (!personaSetName && !options.agents) {
      const selection = await selectPersonasFlow(cwd, goal, projectName);
      availablePersonas = selection.personas;
      personaSetName = selection.personaSetName;
      domainSkills = selection.domainSkills;
      if (personaSetName) {
        p.log.info(`Using persona set: ${personaSetName}`);
      } else {
        p.log.info('Using built-in personas');
      }
    }

    // Load personas from file if specified by name
    if (personaSetName && availablePersonas === AGENT_PERSONAS) {
      const personasPath = path.join(cwd, 'personas', `${personaSetName}.json`);
      try {
        const content = await fs.readFile(personasPath, 'utf-8');
        availablePersonas = JSON.parse(content);
      } catch {
        p.log.error(`Persona set "${personaSetName}" not found in personas/ directory`);
        process.exit(1);
      }
    }

    // Load domain skills if custom personas
    if (personaSetName && !domainSkills) {
      const skillsPath = path.join(cwd, 'personas', `${personaSetName}.skills.md`);
      try {
        domainSkills = await fs.readFile(skillsPath, 'utf-8');
        p.log.info(`Loaded domain expertise: ${personaSetName}.skills.md`);
      } catch { /* no skills file */ }
    }

    // Parse agent IDs or use interactive selection
    let validAgents: string[] = [];

    if (options.agents) {
      // Non-interactive: command-line specified agents
      const enabledAgents = options.agents.split(',').map((id: string) => id.trim());
      validAgents = enabledAgents.filter((id: string) =>
        availablePersonas.some(a => a.id === id)
      );
      if (validAgents.length === 0) {
        p.log.error('No valid agents specified. Available agents:');
        availablePersonas.forEach(a => p.log.info(`  - ${a.id}: ${a.name} (${a.role})`));
        process.exit(1);
      }
    } else {
      // Interactive agent selection with loop for generate/defaults
      let selecting = true;
      while (selecting) {
        const result = await selectAgentsFlow(availablePersonas);
        if (result === 'generate') {
          // Re-run persona selection
          const selection = await selectPersonasFlow(cwd, goal, projectName);
          availablePersonas = selection.personas;
          domainSkills = selection.domainSkills;
          personaSetName = selection.personaSetName;
        } else if (result === 'defaults') {
          availablePersonas = AGENT_PERSONAS;
          domainSkills = undefined;
          personaSetName = null;
          clearCustomPersonas();
          p.log.info('Using built-in personas');
        } else {
          validAgents = result;
          selecting = false;
        }
      }
    }

    // Register custom personas if using a custom set
    if (personaSetName) {
      registerCustomPersonas(availablePersonas);
    } else {
      clearCustomPersonas();
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
      undefined,
      domainSkills,
      {
        agentRunner,
        fileSystem: fsAdapter,
      }
    );

    orchestrator.on((event) => {
      if (event.type === 'agent_message') {
        persistence.updateSession(orchestrator.getSession());
      }
    });

    p.log.step(`Starting Forge: ${chalk.bold(projectName)}`);
    p.log.info(chalk.dim(`Goal: ${goal}`));
    p.log.info(chalk.dim(`Agents: ${validAgents.join(', ')}`));
    if (personaSetName) {
      p.log.info(chalk.dim(`Persona set: ${personaSetName}`));
    }
    p.log.info(chalk.dim(`Output: ${persistence.getSessionDir()}`));

    // Render Ink app
    const { waitUntilExit } = render(
      React.createElement(App, {
        orchestrator,
        persistence,
        session,
        onExit: async () => {
          await persistence.saveFull();
          clearCustomPersonas();
          console.log(`\nSession saved to ${persistence.getSessionDir()}`);
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
      p.log.info('No briefs found in briefs/ directory');
      p.log.info('Create a .md file in the briefs/ directory to get started.');
      return;
    }

    const lines = [];
    for (const brief of briefs) {
      const content = await fsAdapter.readBrief(brief);
      const firstLine = content?.split('\n')[0] || '';
      const title = firstLine.replace(/^#+\s*/, '');
      lines.push(`${chalk.bold(brief)}: ${title}`);
    }
    p.note(lines.join('\n'), 'Available Briefs');
  });

// Agents command - list available agents
program
  .command('agents')
  .description('List available agents (default personas)')
  .action(() => {
    const personas = getActivePersonas();
    const lines = personas.map(a =>
      `${chalk.bold(a.id)}\n  Name: ${a.name} (${a.nameHe})\n  Role: ${a.role}\n  Strengths: ${a.strengths.slice(0, 2).join(', ')}`
    ).join('\n\n');
    p.note(lines, 'Default Agents');
    p.log.info('Generate custom personas with: forge personas generate --domain "your domain"');
  });

// Add personas subcommand
program.addCommand(createPersonasCommand());

// Add enhanced export command
program.addCommand(createExportCommand());

// Add batch, sessions, watch, completions, config commands
program.addCommand(createBatchCommand());
program.addCommand(createSessionsCommand());
program.addCommand(createWatchCommand());
program.addCommand(createCompletionsCommand());
program.addCommand(createConfigCommand());

// Default action - interactive mode when no command given
program.action(async () => {
  await runIdleMode();
});

program.parse();
