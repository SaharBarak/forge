/**
 * Color utilities for CLI output
 * Maps agent IDs to terminal colors
 */

import chalk from 'chalk';

// Agent color mapping based on personas
export const AGENT_COLORS: Record<string, (text: string) => string> = {
  ronit: chalk.hex('#9B59B6'),     // Purple - Strategist
  avi: chalk.hex('#3498DB'),       // Blue - Skeptic
  dana: chalk.hex('#E74C3C'),      // Red - Creative
  yossi: chalk.hex('#2ECC71'),     // Green - Pragmatist
  michal: chalk.hex('#F39C12'),    // Orange - Analyst
  system: chalk.hex('#95A5A6'),    // Gray
  human: chalk.hex('#FFFFFF'),     // White
};

export function getAgentColor(agentId: string): (text: string) => string {
  return AGENT_COLORS[agentId] || chalk.white;
}

// Message type colors
export const TYPE_COLORS: Record<string, (text: string) => string> = {
  argument: chalk.cyan,
  question: chalk.yellow,
  proposal: chalk.green,
  agreement: chalk.greenBright,
  disagreement: chalk.redBright,
  synthesis: chalk.magenta,
  system: chalk.gray,
  human_input: chalk.white,
  research_request: chalk.blue,
  research_result: chalk.blueBright,
};

export function getTypeColor(type: string): (text: string) => string {
  return TYPE_COLORS[type] || chalk.white;
}

// Phase colors
export const PHASE_COLORS: Record<string, (text: string) => string> = {
  initialization: chalk.gray,
  brainstorming: chalk.cyan,
  synthesis: chalk.magenta,
  drafting: chalk.green,
  finalization: chalk.yellow,
};

export function getPhaseColor(phase: string): (text: string) => string {
  return PHASE_COLORS[phase] || chalk.white;
}

// Status colors
export const STATUS_COLORS = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  dim: chalk.dim,
};

// UI element colors
export const UI = {
  border: chalk.gray,
  header: chalk.bold.white,
  label: chalk.dim,
  value: chalk.white,
  highlight: chalk.cyan.bold,
  muted: chalk.dim.gray,
};

// Formatted agent name with color
export function formatAgentName(agentId: string, name?: string): string {
  const color = getAgentColor(agentId);
  return color(name || agentId);
}

// Formatted message type badge
export function formatTypeBadge(type: string): string {
  const color = getTypeColor(type);
  return color(`[${type.toUpperCase()}]`);
}

// Progress bar
export function progressBar(current: number, total: number, width = 20): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

// Spinner frames
export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function getSpinnerFrame(index: number): string {
  return chalk.cyan(SPINNER_FRAMES[index % SPINNER_FRAMES.length]);
}
