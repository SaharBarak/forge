#!/usr/bin/env node
/**
 * Kernel-based CLI - Uses SessionKernel for unified logic
 * This is the thin UI layer that delegates all operations to the kernel
 */

import * as readline from 'readline';
import { SessionKernel } from '../src/lib/kernel';
import type { KernelResponse, KernelEvent, KernelCommand } from '../src/lib/kernel/types';
import { CLIAgentRunner } from './adapters/CLIAgentRunner';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';
import { getAgentById } from '../src/agents/personas';

// ANSI colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

// Agent colors
const AGENT_COLORS: Record<string, string> = {
  pink: '\x1b[35m',
  green: '\x1b[32m',
  purple: '\x1b[35m',
  orange: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/**
 * Render a kernel response to the terminal
 */
function renderResponse(response: KernelResponse): void {
  switch (response.type) {
    case 'info':
      console.log(`${DIM}${response.content}${RESET}`);
      break;

    case 'success':
      console.log(`${GREEN}${response.content}${RESET}`);
      break;

    case 'warning':
      console.log(`${YELLOW}${response.content}${RESET}`);
      break;

    case 'error':
      console.log(`${RED}${response.content}${RESET}`);
      break;

    case 'prompt':
      console.log(`${CYAN}${response.content}${RESET}`);
      break;

    case 'config_step': {
      const step = response.data as any;
      console.log(`${CYAN}${step.prompt}${RESET}`);
      if (step.options) {
        step.options.forEach((opt: any, i: number) => {
          const marker = opt.selected ? `${GREEN}[✓]${RESET}` : `${DIM}[ ]${RESET}`;
          const label = opt.default ? `${opt.label} (default)` : opt.label;
          console.log(`  ${marker} ${BOLD}${i + 1}${RESET}. ${label}`);
          if (opt.description) {
            console.log(`      ${DIM}${opt.description}${RESET}`);
          }
        });
      }
      if (step.allowGenerate) {
        console.log('');
        console.log(`  ${YELLOW}g${RESET} - Generate new personas`);
        console.log(`  ${YELLOW}d${RESET} - Use default personas`);
        console.log(`  ${DIM}Type number to toggle, 'done' to continue${RESET}`);
      }
      break;
    }

    case 'list': {
      const data = response.data as any;
      console.log(`${CYAN}${BOLD}${data.title}${RESET}`);
      console.log(`${DIM}─────────────────────${RESET}`);
      data.items.forEach((item: any) => {
        const marker = item.selected ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
        console.log(`${marker} ${BOLD}${item.label}${RESET}`);
        if (item.description) {
          console.log(`  ${DIM}${item.description}${RESET}`);
        }
      });
      if (data.hint) {
        console.log('');
        console.log(`${DIM}${data.hint}${RESET}`);
      }
      break;
    }

    case 'status': {
      const data = response.data as any;
      console.log('');
      console.log(`${CYAN}${BOLD}SESSION STATUS${RESET}`);
      console.log(`${DIM}─────────────────────${RESET}`);
      console.log(`State: ${data.state}`);
      if (data.project) console.log(`Project: ${data.project}`);
      if (data.goal) console.log(`Goal: ${data.goal}`);
      if (data.phase) console.log(`Phase: ${data.phase}`);
      if (data.mode) console.log(`Mode: ${data.mode}`);
      if (data.messages !== undefined) console.log(`Messages: ${data.messages}`);
      if (data.agents) console.log(`Agents: ${data.agents.join(', ')}`);
      if (data.consensus) {
        console.log('');
        console.log(`${CYAN}${BOLD}CONSENSUS${RESET}`);
        console.log(`Ready: ${data.consensus.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
        console.log(`Points: ${data.consensus.points} consensus, ${data.consensus.conflicts} conflicts`);
      }
      if (data.memory) {
        console.log('');
        console.log(`${CYAN}${BOLD}MEMORY${RESET}`);
        console.log(`Summaries: ${data.memory.summaries}, Decisions: ${data.memory.decisions}`);
      }
      break;
    }

    case 'message': {
      const data = response.data as any;
      const agent = getAgentById(data.agentId);
      const color = AGENT_COLORS[agent?.color || 'cyan'] || CYAN;
      const name = data.agentName || data.agentId;
      console.log('');
      console.log(`${color}${BOLD}[${name}]${RESET}`);
      console.log(data.content);
      break;
    }

    case 'help': {
      const data = response.data as any;
      console.log('');
      for (const section of data.sections) {
        console.log(`${YELLOW}${BOLD}${section.title}${RESET}`);
        console.log(`${DIM}─────────────────────${RESET}`);
        for (const cmd of section.commands) {
          console.log(`  ${GREEN}${cmd.command}${RESET}  ${DIM}${cmd.description}${RESET}`);
        }
        console.log('');
      }
      break;
    }

    default:
      console.log(response.content);
  }
}

/**
 * Handle kernel events (agent messages, state changes)
 */
function handleEvent(event: KernelEvent): void {
  switch (event.type) {
    case 'agent_message': {
      const data = event.data as any;
      const agent = getAgentById(data.agentId);
      const color = AGENT_COLORS[agent?.color || 'cyan'] || CYAN;
      console.log('');
      console.log(`${color}${BOLD}[${data.agentName || data.agentId}]${RESET}`);
      console.log(data.message?.content || '');
      break;
    }
    case 'state_change':
      // Optionally update prompt
      break;
    case 'session_saved':
      console.log(`${GREEN}Session saved.${RESET}`);
      break;
    case 'session_loaded':
      console.log(`${GREEN}Session loaded.${RESET}`);
      break;
  }
}

/**
 * Parse input into a kernel command
 */
function parseCommand(input: string): KernelCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const [cmd, ...args] = trimmed.split(' ');
  const cmdLower = cmd.toLowerCase();

  switch (cmdLower) {
    case 'new':
    case 'init':
      return { type: 'new' };

    case 'start':
      return { type: 'start' };

    case 'stop':
    case 'exit':
      return { type: 'stop' };

    case 'pause':
      return { type: 'pause' };

    case 'resume':
      return { type: 'resume' };

    case 'save':
      return { type: 'save' };

    case 'export':
      return { type: 'export', format: args[0] || 'md' };

    case 'load':
      return { type: 'load', nameOrIndex: args.join(' ') || '1' };

    case 'sessions':
    case 'ls':
      return { type: 'sessions' };

    case 'status':
      return { type: 'status' };

    case 'memory':
    case 'context':
      return { type: 'memory' };

    case 'recall':
      return { type: 'recall', agentId: args[0] };

    case 'agents':
      return { type: 'agents' };

    case 'synthesize':
    case 'syn':
      return { type: 'synthesize', force: args[0]?.toLowerCase() === 'force' };

    case 'consensus':
    case 'ready':
      return { type: 'consensus' };

    case 'draft':
    case 'write':
      return { type: 'draft' };

    case 'token':
    case 'apikey':
      return { type: 'token', key: args[0] };

    case 'test':
      return { type: 'test' };

    case 'help':
    case '?':
      return { type: 'help' };

    case 'mode':
      return { type: 'mode_info' };

    default:
      // Not a command - treat as message or config input
      return null;
  }
}

/**
 * Main entry point
 */
async function main() {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();

  // Create kernel with adapters
  const kernel = new SessionKernel({
    agentRunner,
    fileSystem: fsAdapter,
    sessionsDir: 'output/sessions',
    outputDir: 'output/sessions',
    onEvent: handleEvent,
  });

  // Load API key from Claude Code setup token
  let apiKey: string | undefined;
  try {
    const os = await import('os');
    const fs = await import('fs');
    const credPath = `${os.default.homedir()}/.claude/credentials.json`;
    const credData = JSON.parse(fs.default.readFileSync(credPath, 'utf-8'));
    apiKey = credData?.claudeAiOauth?.accessToken;
    if (apiKey) process.env.ANTHROPIC_API_KEY = apiKey;
  } catch { /* no credentials */ }
  if (apiKey) {
    kernel.setApiKey(apiKey);
  }

  // Show banner
  console.log('');
  console.log(`${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}${BOLD}║${RESET}  ${MAGENTA}${BOLD}🔥 FORGE${RESET}                                            ${CYAN}${BOLD}║${RESET}`);
  console.log(`${CYAN}${BOLD}║${RESET}  ${DIM}Multi-Agent Deliberation Engine${RESET}                      ${CYAN}${BOLD}║${RESET}`);
  console.log(`${CYAN}${BOLD}║${RESET}  ${DIM}Powered by SessionKernel${RESET}                             ${CYAN}${BOLD}║${RESET}`);
  console.log(`${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${RESET}`);
  console.log('');

  // Show initial help
  const helpResponses = await kernel.execute({ type: 'help' });
  helpResponses.forEach(renderResponse);

  // REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let isClosing = false;

  rl.on('close', () => {
    if (!isClosing) {
      isClosing = true;
      console.log(`\n${DIM}Goodbye.${RESET}`);
      process.exit(0);
    }
  });

  const prompt = () => {
    if (isClosing) return;
    const state = kernel.getState();
    const prefix = state === 'running' ? `${GREEN}●${RESET}` :
                   state === 'configuring' ? `${YELLOW}◆${RESET}` :
                   state === 'ready' ? `${CYAN}◉${RESET}` : `${DIM}○${RESET}`;
    rl.question(`${prefix} forge> `, async (input) => {
      await handleInput(input);
    });
  };

  const handleInput = async (input: string) => {
    const state = kernel.getState();

    // Handle exit
    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
      if (state === 'running') {
        const responses = await kernel.execute({ type: 'stop' });
        responses.forEach(renderResponse);
      }
      console.log(`${DIM}Goodbye.${RESET}`);
      isClosing = true;
      rl.close();
      process.exit(0);
    }

    // Handle clear
    if (input.toLowerCase() === 'clear' || input.toLowerCase() === 'cls') {
      console.clear();
      prompt();
      return;
    }

    // Parse as command
    const command = parseCommand(input);

    if (command) {
      // Execute kernel command
      const responses = await kernel.execute(command);
      responses.forEach(renderResponse);
    } else if (input.trim()) {
      // Not a recognized command
      if (state === 'configuring') {
        // Pass as config input
        const responses = await kernel.execute({ type: 'config_input', value: input });
        responses.forEach(renderResponse);
      } else if (state === 'running') {
        // Pass as message
        const responses = await kernel.execute({ type: 'say', content: input });
        responses.forEach(renderResponse);
      } else {
        console.log(`${RED}Unknown command: ${input}${RESET}`);
        console.log(`${DIM}Type 'help' for available commands.${RESET}`);
      }
    }

    if (!isClosing) {
      prompt();
    }
  };

  // Start REPL
  prompt();
}

main().catch(console.error);
