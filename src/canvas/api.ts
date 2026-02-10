/**
 * Canvas Agent Write API
 * Issue #57 — Drawing Board: Agent Write API
 *
 * Helper functions agents call to append elements to the canvas JSONL file.
 * Agents should never hand-craft JSONL directly — use these functions.
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';
import {
  CanvasElement,
  CanvasStatus,
  isValidStatusTransition,
  CanvasSection,
  CanvasText,
  CanvasWireframe,
  CanvasDivider,
  CanvasNote,
} from './types';
import { validateElement } from './validate';

const DEFAULT_CANVAS_PATH = 'shared/canvas.jsonl';

export interface CanvasWriterOptions {
  /** Path to the canvas JSONL file (default: shared/canvas.jsonl) */
  canvasPath?: string;
}

/**
 * Low-level: append a validated element to the canvas file.
 * Uses appendFileSync with the 'a' flag for atomic-ish appends on POSIX.
 */
function appendElement(element: CanvasElement, opts?: CanvasWriterOptions): void {
  const filePath = resolve(opts?.canvasPath ?? DEFAULT_CANVAS_PATH);

  // Validate against schema rules
  const errors = validateElement(element);
  if (errors.length > 0) {
    throw new Error(`Canvas validation failed: ${errors.join('; ')}`);
  }

  // Add timestamp
  const entry = { ...element, ts: new Date().toISOString() };

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Atomic append (O_APPEND) — safe for concurrent writers on same host
  appendFileSync(filePath, JSON.stringify(entry) + '\n', { flag: 'a' });
}

/** Read all current elements from the canvas (for status lookups) */
function readCanvas(opts?: CanvasWriterOptions): CanvasElement[] {
  const filePath = resolve(opts?.canvasPath ?? DEFAULT_CANVAS_PATH);
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line));
}

/** Get the latest version of an element by id (last-write-wins) */
function getLatestById(id: string, opts?: CanvasWriterOptions): CanvasElement | undefined {
  const elements = readCanvas(opts);
  const matches = elements.filter((e) => 'id' in e && (e as any).id === id);
  return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

// --- Public API ---

export function addSection(
  id: string,
  label: string,
  opts?: { width?: number; status?: CanvasStatus; parent?: string } & CanvasWriterOptions,
): void {
  const { width = 80, status = 'proposed', parent, ...writerOpts } = opts ?? {};
  const element: CanvasSection = { type: 'section', id, label, width, status, parent };
  appendElement(element, writerOpts);
}

export function addText(
  content: string,
  role: string,
  opts?: { parent?: string; style?: string } & CanvasWriterOptions,
): void {
  const { parent, style, ...writerOpts } = opts ?? {};
  const element: CanvasText = { type: 'text', content, role, parent, style };
  appendElement(element, writerOpts);
}

export function addWireframe(
  layout: string,
  elements: string[],
  opts?: { parent?: string; status?: CanvasStatus } & CanvasWriterOptions,
): void {
  const id = `wf-${Date.now()}`;
  const { parent, status = 'proposed', ...writerOpts } = opts ?? {};
  const element: CanvasWireframe = { type: 'wireframe', id, layout, elements, parent, status };
  appendElement(element, writerOpts);
}

export function addNote(
  author: string,
  text: string,
  opts?: { parent?: string } & CanvasWriterOptions,
): void {
  const { parent, ...writerOpts } = opts ?? {};
  const element: CanvasNote = { type: 'note', author, text, parent };
  appendElement(element, writerOpts);
}

export function addDivider(opts?: { style?: string } & CanvasWriterOptions): void {
  const { style, ...writerOpts } = opts ?? {};
  const element: CanvasDivider = { type: 'divider', style };
  appendElement(element, writerOpts);
}

/**
 * Update the status of an existing element.
 * Validates the transition: proposed → discussed → agreed.
 * Appends a new line with the same id + new status (last-write-wins).
 */
export function updateStatus(
  id: string,
  status: CanvasStatus,
  opts?: CanvasWriterOptions,
): void {
  const existing = getLatestById(id, opts);
  if (!existing) {
    throw new Error(`Element with id "${id}" not found on canvas`);
  }
  if (!('status' in existing) || !(existing as any).status) {
    throw new Error(`Element "${id}" does not support status`);
  }
  const currentStatus = (existing as any).status as CanvasStatus;
  if (!isValidStatusTransition(currentStatus, status)) {
    throw new Error(
      `Invalid status transition for "${id}": ${currentStatus} → ${status}`,
    );
  }
  // Append a new version of the element with updated status
  const updated = { ...existing, status, ts: new Date().toISOString() };
  const filePath = resolve(opts?.canvasPath ?? DEFAULT_CANVAS_PATH);
  appendFileSync(filePath, JSON.stringify(updated) + '\n', { flag: 'a' });
}
