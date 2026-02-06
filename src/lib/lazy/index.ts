/**
 * Lazy Loading Utilities
 *
 * This module provides dynamic imports for heavy dependencies:
 * - xterm.js (~200kB) - Terminal emulator
 * - Methodology guides - Argumentation and consensus frameworks
 *
 * Usage:
 *   // Instead of: import { Terminal } from '@xterm/xterm'
 *   const { Terminal, FitAddon } = await loadXterm();
 *
 *   // Instead of: import { ARGUMENTATION_GUIDES } from '../methodologies'
 *   const guide = await getArgumentationGuide('dialectic');
 */

export {
  loadXterm,
  createTerminal,
  type ITerminalOptions,
  type Terminal,
  type FitAddon,
} from './xterm-loader';

export {
  loadMethodologies,
  getArgumentationGuide,
  getConsensusGuide,
  getVisualDecisionRules,
  getStructureDecisionRules,
  getPhaseMethodology,
  getMethodologyPrompt,
  getDefaultMethodology,
  getDefaultPhases,
} from './methodology-loader';
