/**
 * Canvas ASCII Wireframe Renderer (TypeScript)
 * Issue #58 / #59 — Renders canvas JSONL into ASCII box-drawing wireframes.
 *
 * Re-implements the shared/src/canvas/renderer.js logic as a typed module
 * for use in the Electron/React frontend.
 */

import type { CanvasStatus } from './types';

// ─── Status indicators ───────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
  agreed: '[✓]',
  discussed: '[~]',
  proposed: '[?]',
};

function statusBadge(status?: CanvasStatus | string): string {
  return STATUS_ICONS[status || ''] || `[${status || '?'}]`;
}

// ─── Box-drawing helpers ─────────────────────────────────────

function hLine(w: number, left: string, fill: string, right: string): string {
  return left + fill.repeat(Math.max(0, w - 2)) + right;
}

function padLine(text: string, w: number): string {
  const visible = text.length;
  const pad = w - 2 - visible;
  if (pad <= 0) return '│' + text.slice(0, w - 2) + '│';
  return '│' + ' ' + text + ' '.repeat(Math.max(0, pad - 1)) + '│';
}

function padCenter(text: string, width: number): string {
  const vis = text.length;
  const total = width - 2;
  const left = Math.floor((total - vis) / 2);
  const right = total - vis - left;
  return '│' + ' '.repeat(Math.max(0, left)) + text + ' '.repeat(Math.max(0, right)) + '│';
}

// ─── Element renderers ──────────────────────────────────────

interface TreeElement extends Record<string, unknown> {
  type: string;
  id?: string;
  label?: string;
  status?: string;
  content?: string;
  text?: string;
  role?: string;
  author?: string;
  width?: string | number;
  parent?: string;
  columns?: TreeElement[];
  children?: TreeElement[];
  layout?: string;
  elements?: string[];
  order?: number;
}

function renderSection(el: TreeElement, width: number, depth: number): string[] {
  const inner = width - 2;
  const label = (el.label || 'SECTION').toUpperCase();
  const badge = statusBadge(el.status);
  const header = `${label} ${badge}`;
  const lines: string[] = [];

  lines.push(hLine(width, '┌', '─', '┐'));
  lines.push(padLine(header, width));

  if (el.children && el.children.length) {
    const childLines = renderElementList(el.children, inner - 2, depth + 1);
    for (const cl of childLines) {
      lines.push('│' + ' ' + cl.padEnd(inner - 1) + '│');
    }
  }

  lines.push(hLine(width, '└', '─', '┘'));
  return lines;
}

function renderText(el: TreeElement, width: number): string[] {
  const role = el.role || 'body';
  const text = el.content || el.text || '';
  const lines: string[] = [];

  if (role === 'headline') {
    lines.push(hLine(width, '┌', '─', '┐'));
    lines.push(padLine(` ${text} `, width));
    lines.push(hLine(width, '└', '─', '┘'));
  } else if (role === 'subtext') {
    lines.push(padCenter(`  ${text}  `, width));
  } else {
    lines.push(padLine(` ${text}`, width));
  }
  return lines;
}

function renderWireframe(el: TreeElement, width: number): string[] {
  const cols = el.columns || el.children || [];
  if (!cols.length) return [padLine('[ wireframe ]', width)];

  const count = cols.length;
  const inner = width - 2;
  const colW = Math.floor(inner / count);
  const remainder = inner - colW * count;

  const blocks = cols.map((c: TreeElement, i: number) => {
    const w = colW + (i < remainder ? 1 : 0);
    const label = c.label || c.text || `${i + 1}`;
    const txt = `[${label}]`;
    const pad = w - txt.length;
    const l = Math.floor(pad / 2);
    return ' '.repeat(Math.max(0, l)) + txt + ' '.repeat(Math.max(0, pad - l));
  });

  return [padLine(blocks.join(''), width)];
}

function renderDivider(width: number): string[] {
  return [hLine(width, '├', '─', '┤')];
}

function renderNote(el: TreeElement, width: number): string[] {
  const text = el.content || el.text || '';
  return [padLine(`📝 ${text}`, width)];
}

function renderElement(el: TreeElement, width: number, depth: number = 0): string[] {
  switch (el.type) {
    case 'section':   return renderSection(el, width, depth);
    case 'text':      return renderText(el, width);
    case 'wireframe': return renderWireframe(el, width);
    case 'divider':   return renderDivider(width);
    case 'note':      return renderNote(el, width);
    default:          return [padLine(`[unknown: ${el.type}]`, width)];
  }
}

function renderElementList(elements: TreeElement[], width: number, depth: number = 0): string[] {
  const lines: string[] = [];
  for (const el of elements) {
    lines.push(...renderElement(el, width, depth));
  }
  return lines;
}

function resolveWidth(el: TreeElement, parentWidth: number): number {
  const w = el.width || 'full';
  if (w === 'full')  return parentWidth;
  if (w === 'half')  return Math.floor(parentWidth / 2);
  if (w === 'third') return Math.floor(parentWidth / 3);
  if (typeof w === 'number') return w;
  return parentWidth;
}

// ─── JSONL parser (last-write-wins by id) ────────────────────

export function parseCanvasJSONL(content: string): Map<string, TreeElement> {
  const map = new Map<string, TreeElement>();
  const lines = content.trim().split('\n');
  let autoId = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as TreeElement;
      const key = obj.id || `__auto_${autoId++}`;
      map.set(key, { ...obj, id: key });
    } catch {
      // Skip malformed lines
    }
  }
  return map;
}

export function buildTree(elementMap: Map<string, TreeElement>): TreeElement[] {
  const roots: TreeElement[] = [];
  const childrenMap = new Map<string, TreeElement[]>();

  for (const el of elementMap.values()) {
    if (el.parent) {
      if (!childrenMap.has(el.parent)) childrenMap.set(el.parent, []);
      childrenMap.get(el.parent)!.push(el);
    } else {
      roots.push(el);
    }
  }

  function attach(node: TreeElement): TreeElement {
    const kids = childrenMap.get(node.id!) || [];
    kids.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    node.children = kids;
    for (const k of kids) attach(k);
    return node;
  }

  roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return roots.map(attach);
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Render canvas JSONL content string to ASCII wireframe.
 */
export function renderFromString(content: string, width: number = 40): string {
  const map = parseCanvasJSONL(content);
  if (map.size === 0) return '(empty canvas)';
  const tree = buildTree(map);
  return renderElements(tree, width);
}

/**
 * Render a pre-built element tree to ASCII wireframe.
 */
export function renderElements(elements: TreeElement[], width: number = 40): string {
  const lines: string[] = [];
  for (const el of elements) {
    const w = resolveWidth(el, width);
    lines.push(...renderElement(el, w, 0));
  }
  return lines.join('\n');
}
