/**
 * Semantic terminal color theme.
 *
 * Named color tokens replace hardcoded ANSI escapes scattered across the
 * codebase. Every shell component imports from here — to change the look of
 * the entire app, edit one file.
 *
 * Tokens follow the Terminal Renaissance three-tier model:
 *   Layer 0  →  monochrome (usable with no color)
 *   Layer 1  →  16 ANSI colors for hierarchy
 *   Layer 2  →  true-color (24-bit) for beauty
 *
 * We default to Layer 1 (broad terminal compat) with Layer 2 opt-in via
 * the `trueColor` variants.
 */

const ESC = '\x1b[';
const RESET = `${ESC}0m`;

// ---- ANSI builders (pure) ----

const fg = (code: number): string => `${ESC}${code}m`;
const bgRgb = (r: number, g: number, b: number): string => `${ESC}48;2;${r};${g};${b}m`;
const bold = `${ESC}1m`;
const dim = `${ESC}2m`;
const italic = `${ESC}3m`;
const underline = `${ESC}4m`;
const strikethrough = `${ESC}9m`;

// ---- semantic token interface ----

export interface SemanticTheme {
  readonly reset: string;
  readonly bold: string;
  readonly dim: string;
  readonly italic: string;
  readonly underline: string;
  readonly strikethrough: string;

  // Text
  readonly text: {
    readonly primary: string;
    readonly muted: string;
    readonly emphasis: string;
    readonly strong: string;
    readonly link: string;
    readonly inlineCode: string;
  };

  // Headings
  readonly heading: {
    readonly h1: string;
    readonly h2: string;
    readonly h3: string;
  };

  // Status
  readonly status: {
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly info: string;
    readonly running: string;
    readonly idle: string;
  };

  // Agents (debate participants)
  readonly agent: Readonly<Record<string, string>>;

  // Backgrounds
  readonly bg: {
    readonly surface: string;
    readonly codeBlock: string;
    readonly overlay: string;
  };

  // Borders / decorative
  readonly border: {
    readonly normal: string;
    readonly accent: string;
    readonly muted: string;
  };

  // Consensus / deliberation
  readonly consensus: {
    readonly agree: string;
    readonly disagree: string;
    readonly neutral: string;
    readonly proposal: string;
  };

  // Phase labels
  readonly phase: {
    readonly label: string;
    readonly separator: string;
    readonly active: string;
    readonly done: string;
  };

  // Spinner
  readonly spinner: {
    readonly active: string;
    readonly done: string;
    readonly failed: string;
  };

  // Quote
  readonly quote: string;

  // Diff
  readonly diff: {
    readonly added: string;
    readonly removed: string;
    readonly context: string;
  };
}

// ---- default Forge theme ("Deep Ocean") ----

export const forgeTheme: SemanticTheme = {
  reset: RESET,
  bold,
  dim,
  italic,
  underline,
  strikethrough,

  text: {
    primary: fg(37),        // white
    muted: fg(90),          // bright black (grey)
    emphasis: fg(35),       // magenta
    strong: fg(33),         // yellow
    link: `${underline}${fg(34)}`, // blue underlined
    inlineCode: fg(32),     // green
  },

  heading: {
    h1: `${bold}${fg(36)}`,  // bold cyan
    h2: `${bold}${fg(37)}`,  // bold white
    h3: `${bold}${fg(34)}`,  // bold blue
  },

  status: {
    success: fg(32),   // green
    warning: fg(33),   // yellow
    error: fg(31),     // red
    info: fg(36),      // cyan
    running: fg(32),   // green
    idle: fg(90),      // grey
  },

  agent: {
    ronit: fg(35),     // magenta/pink
    yossi: fg(32),     // green
    noa: fg(34),       // blue
    avi: fg(33),       // yellow/orange
    michal: fg(36),    // cyan
    dana: fg(31),      // red
    system: fg(90),    // grey
    human: fg(37),     // white
  },

  bg: {
    surface: bgRgb(22, 27, 34),    // #161b22
    codeBlock: bgRgb(30, 30, 46),  // dark grey-blue
    overlay: bgRgb(13, 17, 23),    // #0d1117
  },

  border: {
    normal: fg(90),     // grey
    accent: fg(36),     // cyan
    muted: `${dim}${fg(90)}`,
  },

  consensus: {
    agree: fg(32),      // green
    disagree: fg(31),   // red
    neutral: fg(33),    // yellow
    proposal: fg(36),   // cyan
  },

  phase: {
    label: `${bold}${fg(36)}`,    // bold cyan
    separator: fg(90),             // grey
    active: `${bold}${fg(33)}`,   // bold yellow
    done: fg(32),                  // green
  },

  spinner: {
    active: fg(36),    // cyan
    done: fg(32),      // green
    failed: fg(31),    // red
  },

  quote: fg(90),       // grey

  diff: {
    added: fg(32),     // green
    removed: fg(31),   // red
    context: fg(90),   // grey
  },
};

// ---- helper: wrap text in a style, auto-reset ----

export const style = (theme: string, text: string): string =>
  `${theme}${text}${RESET}`;

// ---- helper: get agent color with fallback ----

export const agentColor = (agentId: string): string =>
  forgeTheme.agent[agentId] ?? forgeTheme.text.primary;
