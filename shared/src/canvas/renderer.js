#!/usr/bin/env node
// ASCII Wireframe Renderer — Issue #58
// Reads canvas JSONL and outputs box-drawing wireframes.
// Usage: node renderer.js [canvas.jsonl] [--width N]
// Or:   import { render, renderElements } from './renderer.js'

import { readFileSync } from 'fs';

// ─── Status indicators ───────────────────────────────────────
const STATUS_ICONS = {
  agreed:      '✅',
  discussed:   '🔄',
  'in progress': '🔄',
  proposed:    '❓',
};

function statusBadge(status) {
  return STATUS_ICONS[status] || `[${status || '?'}]`;
}

// ─── Box-drawing helpers ─────────────────────────────────────
function hLine(w, left, fill, right) {
  return left + fill.repeat(w - 2) + right;
}

function padLine(text, w) {
  const visible = stripAnsi(text);
  const pad = w - 2 - visible.length;
  if (pad <= 0) return '│' + text.slice(0, w - 2) + '│';
  return '│' + ' ' + text + ' '.repeat(Math.max(0, pad - 1)) + '│';
}

// Naive ANSI strip (just in case)
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

// ─── Element renderers ──────────────────────────────────────

function renderSection(el, width, depth) {
  const inner = width - 2;          // inside the box walls
  const label = (el.label || 'SECTION').toUpperCase();
  const badge = statusBadge(el.status);
  const header = ` ${label} ${badge}`;
  const lines = [];

  lines.push(hLine(width, '┌', '─', '┐'));
  lines.push(padLine(header, width));

  // Render children inside the section
  if (el.children && el.children.length) {
    const childLines = renderElementList(el.children, inner - 2, depth + 1);
    for (const cl of childLines) {
      lines.push('│' + ' ' + cl.padEnd(inner - 1) + '│');
    }
  }

  lines.push(hLine(width, '└', '─', '┘'));
  return lines;
}

function renderText(el, width) {
  const role = el.role || 'body';
  const text = el.content || el.text || '';
  const lines = [];

  if (role === 'headline') {
    lines.push(hLine(width, '┌', '─', '┐'));
    lines.push(padLine(` ${text} `, width));
    lines.push(hLine(width, '└', '─', '┘'));
  } else if (role === 'subtext') {
    lines.push(padCenter(`  ${text}  `, width));
  } else {
    // body — just text line
    lines.push(padLine(` ${text}`, width));
  }
  return lines;
}

function padCenter(text, width) {
  const vis = stripAnsi(text).length;
  const total = width - 2;
  const left = Math.floor((total - vis) / 2);
  const right = total - vis - left;
  return '│' + ' '.repeat(left) + text + ' '.repeat(right) + '│';
}

function renderWireframe(el, width) {
  // Layout blocks (columns)
  const cols = el.columns || el.children || [];
  if (!cols.length) return [padLine('[ wireframe ]', width)];

  const count = cols.length;
  const inner = width - 2;
  const colW = Math.floor(inner / count);
  const remainder = inner - colW * count;

  const blocks = cols.map((c, i) => {
    const w = colW + (i < remainder ? 1 : 0);
    const label = c.label || c.text || `${i + 1}`;
    const txt = `[${label}]`;
    const pad = w - txt.length;
    const l = Math.floor(pad / 2);
    return ' '.repeat(l) + txt + ' '.repeat(pad - l);
  });

  return [padLine(blocks.join(''), width)];
}

function renderDivider(width) {
  return [hLine(width, '├', '─', '┤')];
}

function renderNote(el, width) {
  const text = el.content || el.text || '';
  return [padLine(`📝 ${text}`, width)];
}

// ─── Tree builder ────────────────────────────────────────────

function renderElement(el, width, depth = 0) {
  switch (el.type) {
    case 'section':   return renderSection(el, width, depth);
    case 'text':      return renderText(el, width);
    case 'wireframe': return renderWireframe(el, width);
    case 'divider':   return renderDivider(width);
    case 'note':      return renderNote(el, width);
    default:          return [padLine(`[unknown: ${el.type}]`, width)];
  }
}

function renderElementList(elements, width, depth = 0) {
  const lines = [];
  for (const el of elements) {
    lines.push(...renderElement(el, width, depth));
  }
  return lines;
}

// ─── Width helpers ───────────────────────────────────────────

function resolveWidth(el, parentWidth) {
  const w = el.width || 'full';
  if (w === 'full')  return parentWidth;
  if (w === 'half')  return Math.floor(parentWidth / 2);
  if (w === 'third') return Math.floor(parentWidth / 3);
  if (typeof w === 'number') return w;
  return parentWidth;
}

// ─── JSONL parser (last-write-wins by id) ────────────────────

function parseCanvasJSONL(content) {
  const map = new Map();
  const lines = content.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.id) map.set(obj.id, obj);
    } catch {
      process.stderr?.write?.(`⚠ Skipping malformed line: ${trimmed.slice(0, 60)}\n`);
    }
  }
  return map;
}

function buildTree(elementMap) {
  const roots = [];
  const childrenMap = new Map();

  for (const el of elementMap.values()) {
    if (el.parent) {
      if (!childrenMap.has(el.parent)) childrenMap.set(el.parent, []);
      childrenMap.get(el.parent).push(el);
    } else {
      roots.push(el);
    }
  }

  // Attach children recursively
  function attach(node) {
    const kids = childrenMap.get(node.id) || [];
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
 * Render a canvas JSONL file to ASCII wireframe string.
 * @param {string} canvasPath - Path to the JSONL file
 * @param {number} [width=60] - Output width in characters
 * @returns {string} ASCII wireframe
 */
export function render(canvasPath, width = 60) {
  const content = readFileSync(canvasPath, 'utf-8');
  return renderFromString(content, width);
}

/**
 * Render canvas JSONL content string to ASCII wireframe.
 * @param {string} content - JSONL string
 * @param {number} [width=60] - Output width in characters
 * @returns {string} ASCII wireframe
 */
export function renderFromString(content, width = 60) {
  const map = parseCanvasJSONL(content);
  if (map.size === 0) return '(empty canvas)';
  const tree = buildTree(map);
  return renderElements(tree, width);
}

/**
 * Render a pre-built element tree to ASCII wireframe.
 * @param {Array} elements - Array of element objects (with children)
 * @param {number} [width=60] - Output width
 * @returns {string} ASCII wireframe
 */
export function renderElements(elements, width = 60) {
  const lines = [];
  for (const el of elements) {
    const w = resolveWidth(el, width);
    lines.push(...renderElement(el, w, 0));
  }
  return lines.join('\n');
}

// ─── CLI ─────────────────────────────────────────────────────

const isMain = process.argv[1] && (
  process.argv[1].endsWith('/renderer.js') ||
  process.argv[1].endsWith('/renderer.mjs') ||
  process.argv[1] === 'renderer.js'
);

if (isMain) {
  const args = process.argv.slice(2);
  let file = null;
  let width = 60;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--width' && args[i + 1]) {
      width = parseInt(args[i + 1], 10);
      i++;
    } else if (!args[i].startsWith('-')) {
      file = args[i];
    }
  }

  if (!file) {
    console.error('Usage: node renderer.js <canvas.jsonl> [--width N]');
    process.exit(1);
  }

  console.log(render(file, width));
}
