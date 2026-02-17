/**
 * Dashboard Theme — colors, borders, style constants for blessed widgets
 */

import type { SessionPhase } from '../../src/types';

// Blessed color names (subset that works across terminals)
export const COLORS = {
  bg: 'black',
  fg: 'white',
  border: 'gray',
  borderFocus: 'cyan',
  accent: 'cyan',
  dim: 'gray',
  success: 'green',
  warning: 'yellow',
  error: 'red',
  human: 'green',
  system: 'gray',
} as const;

export const PHASE_COLORS: Record<SessionPhase, string> = {
  initialization: 'gray',
  context_loading: 'blue',
  research: 'cyan',
  brainstorming: 'cyan',
  argumentation: 'yellow',
  synthesis: 'magenta',
  drafting: 'green',
  review: 'blue',
  consensus: 'green',
  finalization: 'yellow',
  building: 'cyan',
  picking: 'green',
};

export const PHASE_EMOJI: Record<SessionPhase, string> = {
  initialization: '\u{1F680}',  // 🚀
  context_loading: '\u{1F4C2}', // 📂
  research: '\u{1F50D}',        // 🔍
  brainstorming: '\u{1F4AD}',   // 💭
  argumentation: '\u{2696}\u{FE0F}', // ⚖️
  synthesis: '\u{1F4CA}',       // 📊
  drafting: '\u{270D}\u{FE0F}', // ✍️
  review: '\u{1F441}\u{FE0F}',  // 👁️
  consensus: '\u{1F91D}',       // 🤝
  finalization: '\u{1F389}',    // 🎉
  building: '\u{1F528}',       // 🔨
  picking: '\u{1F3C6}',        // 🏆
};

export const PHASE_LABELS: Record<SessionPhase, string> = {
  initialization: 'IN',
  context_loading: 'CX',
  research: 'RS',
  brainstorming: 'BR',
  argumentation: 'AR',
  synthesis: 'SY',
  drafting: 'DR',
  review: 'RV',
  consensus: 'CN',
  finalization: 'FN',
  building: 'BU',
  picking: 'PK',
};

// Only phases the orchestrator actually transitions through
export const ALL_PHASES: SessionPhase[] = [
  'initialization',
  'brainstorming',
  'argumentation',
  'synthesis',
  'drafting',
  'finalization',
];

export const STATE_ICONS: Record<string, string> = {
  listening: '\u{1F442}', // 👂
  thinking: '\u{1F914}',  // 🤔
  speaking: '\u{1F4AC}',  // 💬
  waiting: '\u{23F3}',    // ⏳
};

export const TYPE_BADGES: Record<string, string> = {
  argument: '[ARG]',
  question: '[Q]',
  proposal: '[PROP]',
  agreement: '[+1]',
  disagreement: '[-1]',
  synthesis: '[SYN]',
  system: '',
  human_input: '[YOU]',
  research_result: '[RES]',
  tool_result: '[TOOL]',
};

// Spinner frames for typing indicator
export const SPINNER_FRAMES = ['\u280B', '\u2819', '\u2839', '\u2838', '\u283C', '\u2834', '\u2826', '\u2827', '\u2807', '\u280F'];

// Block characters for contribution bars
export const BAR_CHAR = '\u2588'; // █
export const BAR_EMPTY = '\u2591'; // ░

// Phase timeline dot characters
export const DOT_DONE = '\u25CF';    // ●
export const DOT_CURRENT = '\u25C9'; // ◉
export const DOT_FUTURE = '\u25CB';  // ○
export const DOT_LINE = '\u2500\u2500'; // ──

// Resonance display constants
export const RESONANCE_COLORS = { high: 'green', medium: 'yellow', low: 'red' } as const;
export const RESONANCE_TREND_ICONS = { rising: '^', stable: '-', falling: 'v' } as const;

// Default blessed box style
export const BOX_STYLE = {
  border: { fg: 'gray' as const },
  focus: { border: { fg: 'cyan' as const } },
};

// Gradient colors for the FORGE logo (RGB values for chalk)
export const LOGO_GRADIENT: [number, number, number][] = [
  [255, 100, 50],   // F - orange-red
  [255, 140, 30],   // O - orange
  [200, 200, 50],   // R - yellow-green
  [50, 200, 100],   // G - green
  [50, 200, 200],   // E - cyan
];
