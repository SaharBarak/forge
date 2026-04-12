/**
 * CanvasWidget — renders a WireframeNode tree as box-drawing ASCII wireframe
 *
 * Uses double-line box chars (╔═╗║╚╝) for outer frame and strong dividers,
 * single-line (╟─╢│) for section dividers and column separators.
 * Dynamic width from the blessed widget instance.
 */

import type blessed from 'blessed';
import type { WireframeNode } from '../../lib/wireframe';

// ── Box-drawing characters ──────────────────────────────────────────
const BOX = {
  TL: '╔', TR: '╗', BL: '╚', BR: '╝',
  H: '═', V: '║',
  // Strong horizontal divider (double-line)
  SL: '╠', SR: '╣', SH: '═',
  // Thin horizontal divider (single-line)
  THL: '╟', THR: '╢', THH: '─',
  // Column separator
  COL: '│',
};

// ── Color helpers ───────────────────────────────────────────────────
const FRAME_COLOR = 'cyan';
const THIN_COLOR = 'gray';

function tag(color: string, text: string): string {
  return `{${color}-fg}${text}{/${color}-fg}`;
}

function bold(text: string): string {
  return `{bold}${text}{/bold}`;
}

// ── String helpers ──────────────────────────────────────────────────
function trunc(s: string, max: number): string {
  if (max <= 0) return '';
  const clean = s.split('\n')[0] || s;
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + '\u2026';
}

function centerText(s: string, width: number): string {
  if (s.length >= width) return s.slice(0, width);
  const pad = Math.floor((width - s.length) / 2);
  return ' '.repeat(pad) + s + ' '.repeat(width - s.length - pad);
}

function padRight(s: string, width: number): string {
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

// ── Status indicators ───────────────────────────────────────────────
function statusIcon(status: string): string {
  if (status === 'complete') return '\u25CF';     // ●
  if (status === 'in_progress') return '\u25D0';   // ◐
  return '\u25CB';                                  // ○
}

function statusColor(status: string): string {
  if (status === 'complete') return 'green';
  if (status === 'in_progress') return 'yellow';
  return 'gray';
}

// ── Width distribution ──────────────────────────────────────────────
function distributeColumnWidths(children: WireframeNode[], totalWidth: number): number[] {
  const n = children.length;
  if (n === 0) return [];
  if (n === 1) return [totalWidth];

  // Separators between columns: (n-1) chars for │
  const available = totalWidth - (n - 1);
  if (available < n) {
    // Too narrow — equal minimum 1
    const widths = new Array(n).fill(1);
    widths[n - 1] = Math.max(1, available - (n - 1));
    return widths;
  }

  const totalPercent = children.reduce((sum, c) => sum + (c.widthPercent || 0), 0);

  if (totalPercent > 0) {
    // Proportional from widthPercent
    const widths = children.map(c => {
      const pct = c.widthPercent || (100 / n);
      return Math.max(1, Math.floor((pct / 100) * available));
    });
    // Distribute remainder to last
    const used = widths.reduce((a, b) => a + b, 0);
    widths[n - 1] += available - used;
    return widths;
  }

  // Equal distribution
  const base = Math.floor(available / n);
  const widths = new Array(n).fill(base);
  widths[n - 1] += available - base * n;
  return widths;
}

// ── Color for node type ─────────────────────────────────────────────
function labelColor(type: string): string {
  if (type === 'navbar') return 'blue';
  if (type === 'footer') return 'gray';
  if (type === 'sidebar') return 'magenta';
  return 'white';
}

// ── Rendering functions ─────────────────────────────────────────────

/** Top border: ╔══════════╗ */
function topBorder(W: number): string {
  return tag(FRAME_COLOR, BOX.TL + BOX.H.repeat(W) + BOX.TR);
}

/** Bottom border: ╚══════════╝ */
function bottomBorder(W: number): string {
  return tag(FRAME_COLOR, BOX.BL + BOX.H.repeat(W) + BOX.BR);
}

/** Strong divider: ╠══════════╣ */
function strongDivider(W: number): string {
  return tag(FRAME_COLOR, BOX.SL + BOX.SH.repeat(W) + BOX.SR);
}

/** Thin divider: ╟──────────╢ */
function thinDivider(W: number): string {
  return tag(FRAME_COLOR, BOX.THL) + tag(THIN_COLOR, BOX.THH.repeat(W)) + tag(FRAME_COLOR, BOX.THR);
}

/** Framed content line: ║ <content> ║ */
function framedLine(content: string, W: number): string {
  return tag(FRAME_COLOR, BOX.V) + padRight(content, W) + tag(FRAME_COLOR, BOX.V);
}

/**
 * Render a navbar or footer as a horizontal bar with column-distributed labels.
 * Returns framed lines (no top/bottom borders — caller adds those).
 */
function renderNavbarOrFooter(node: WireframeNode, W: number): string[] {
  const children = node.children;
  if (children.length === 0) {
    const lbl = trunc(node.label, W - 2);
    const color = labelColor(node.type);
    return [framedLine(' ' + tag(color, bold(centerText(lbl, W - 2))) + ' ', W)];
  }

  const widths = distributeColumnWidths(children, W);
  const color = labelColor(node.type);

  // Build single line with │ separators
  let line = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cw = widths[i];
    const lbl = trunc(child.label, cw - 2);
    const centered = centerText(lbl, cw);
    line += tag(color, centered);
    if (i < children.length - 1) {
      line += tag(THIN_COLOR, BOX.COL);
    }
  }

  return [framedLine(line, W)];
}

/**
 * Render a sidebar as an indicator bar: ║  ◄ Filters ►  ║
 */
function renderSidebar(node: WireframeNode, W: number): string[] {
  const lbl = trunc(node.label, W - 8);
  const si = statusIcon(node.status);
  const sc = statusColor(node.status);
  const content = '\u25C4 ' + tag('magenta', lbl) + ' ' + tag(sc, si) + ' \u25BA';
  return [framedLine(centerText(content, W), W)];
}

/**
 * Render a single section — leaf or grid row.
 */
function renderSingleSection(section: WireframeNode, W: number): string[] {
  const si = statusIcon(section.status);
  const sc = statusColor(section.status);

  if (section.children.length === 0 || section.direction !== 'row') {
    // Leaf section — centered label with status
    const lbl = trunc(section.label, W - 6);
    const content = centerText(tag('white', lbl) + ' ' + tag(sc, si), W);
    return [framedLine(content, W)];
  }

  // Grid/row section — columns side by side with │ separators
  const children = section.children;
  const widths = distributeColumnWidths(children, W);

  let line = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cw = widths[i];
    const childSi = statusIcon(child.status);
    const childSc = statusColor(child.status);
    const lbl = trunc(child.label, cw - 4);
    const cell = lbl + ' ' + tag(childSc, childSi);
    line += centerText(cell, cw);
    if (i < children.length - 1) {
      line += tag(THIN_COLOR, BOX.COL);
    }
  }

  return [framedLine(line, W)];
}

/**
 * Render all main sections stacked with thin dividers between them.
 */
function renderMainSections(sections: WireframeNode[], W: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < sections.length; i++) {
    lines.push(...renderSingleSection(sections[i], W));
    if (i < sections.length - 1) {
      lines.push(thinDivider(W));
    }
  }
  return lines;
}

/**
 * Collect structural parts from the page tree.
 */
function decomposePage(page: WireframeNode): {
  navbar: WireframeNode | null;
  footer: WireframeNode | null;
  sidebar: WireframeNode | null;
  sections: WireframeNode[];
} {
  let navbar: WireframeNode | null = null;
  let footer: WireframeNode | null = null;
  let sidebar: WireframeNode | null = null;
  const sections: WireframeNode[] = [];

  function walk(node: WireframeNode): void {
    if (node.type === 'navbar') { navbar = node; return; }
    if (node.type === 'footer') { footer = node; return; }
    if (node.type === 'sidebar') { sidebar = node; return; }
    if (node.type === 'page' || node.type === 'main') {
      for (const child of node.children) walk(child);
      return;
    }
    // section, grid, column, component — these are content
    sections.push(node);
  }

  walk(page);
  return { navbar, footer, sidebar, sections };
}

/**
 * Main entry: render the full ASCII wireframe.
 */
function renderAsciiWireframe(page: WireframeNode, contentWidth: number): string[] {
  const W = Math.max(10, contentWidth);
  const { navbar, footer, sidebar, sections } = decomposePage(page);

  const lines: string[] = [];

  // Top border
  lines.push(topBorder(W));

  // Navbar
  if (navbar) {
    lines.push(...renderNavbarOrFooter(navbar, W));
    lines.push(strongDivider(W));
  }

  // Sidebar indicator (if present)
  if (sidebar) {
    lines.push(...renderSidebar(sidebar, W));
    lines.push(thinDivider(W));
  }

  // Main sections
  if (sections.length > 0) {
    lines.push(...renderMainSections(sections, W));
  } else {
    // Empty state
    lines.push(framedLine(centerText(tag('gray', '(empty)'), W), W));
  }

  // Footer
  if (footer) {
    lines.push(strongDivider(W));
    lines.push(...renderNavbarOrFooter(footer, W));
  }

  // Bottom border
  lines.push(bottomBorder(W));

  return lines;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Update the canvas widget with the current wireframe state
 */
export function updateCanvas(
  widget: blessed.Widgets.BoxElement,
  wireframe: WireframeNode,
  mode?: { type: 'consensus' | 'agent'; agentName?: string; agentColor?: string },
  proposalCount?: number,
  canvasPhase?: string,
): void {
  const lines: string[] = [];

  // Header bar showing current canvas view
  if (mode) {
    if (mode.type === 'consensus') {
      const phaseStr = canvasPhase && canvasPhase !== 'idle' ? ` (${canvasPhase})` : '';
      lines.push(`{cyan-fg}{bold}>>> Wireframe(All)${phaseStr} <<<{/bold}{/cyan-fg}`);
    } else if (mode.type === 'agent' && mode.agentName) {
      const colorMap: Record<string, string> = { pink: 'magenta', orange: 'yellow', purple: 'magenta' };
      const color = colorMap[mode.agentColor || ''] || mode.agentColor || 'white';
      lines.push(`{${color}-fg}{bold}>>> Wireframe(${mode.agentName}) <<<{/bold}{/${color}-fg}`);
    }
    lines.push('');
  }

  // Dynamic width from actual widget size, fall back to 28
  const widgetWidth = (widget as any).width;
  const contentWidth = typeof widgetWidth === 'number' ? widgetWidth - 2 : 28;

  lines.push(...renderAsciiWireframe(wireframe, contentWidth));

  // Navigation hint at bottom
  if (proposalCount && proposalCount > 0) {
    lines.push('');
    lines.push('{gray-fg}F2/F3 cycle views{/gray-fg}');
  }

  widget.setContent(lines.join('\n'));
}
