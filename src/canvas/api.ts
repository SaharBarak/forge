/**
 * Canvas Agent Write API
 * Issue #57 — Drawing Board: Agent Write API
 *
 * Helper functions agents call to append elements to the canvas JSONL file.
 * Agents should never hand-craft JSONL directly — use these functions.
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';
import {
  CanvasElement,
  CanvasStatus,
  CanvasSection,
  CanvasText,
  CanvasWireframe,
  CanvasDivider,
  CanvasNote,
} from './types';
import { isValidConsensusTransition } from './consensus';
import { validateElement } from './validate';
import { reportFeedback } from './feedback';

const DEFAULT_CANVAS_PATH = 'shared/canvas.jsonl';

export interface InlineFeedbackOptions {
  /** Optional inline feedback about this API call — captured automatically */
  feedback?: string;
  /** Agent id for inline feedback attribution */
  feedbackAgentId?: string;
  /** Path to the feedback JSONL file (default: shared/feedback.jsonl) */
  feedbackPath?: string;
}

export interface CanvasWriterOptions extends InlineFeedbackOptions {
  /** Path to the canvas JSONL file (default: shared/canvas.jsonl) */
  canvasPath?: string;
}

const DEFAULT_FEEDBACK_PATH = 'shared/feedback.jsonl';

/** If inline feedback is present, auto-report it */
function maybeReportInlineFeedback(
  elementType: string,
  opts?: InlineFeedbackOptions,
): void {
  if (!opts?.feedback) return;
  reportFeedback(opts.feedbackPath ?? DEFAULT_FEEDBACK_PATH, {
    agentId: opts.feedbackAgentId ?? 'unknown',
    category: 'inline',
    description: opts.feedback,
    severity: 'low',
    context: `While writing ${elementType} element`,
  });
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
  const { width = 80, status = 'proposed', parent, feedback, feedbackAgentId, feedbackPath, ...writerOpts } = opts ?? {};
  const element: CanvasSection = { type: 'section', id, label, width, status, parent };
  appendElement(element, writerOpts);
  maybeReportInlineFeedback('section', { feedback, feedbackAgentId, feedbackPath });
}

export function addText(
  content: string,
  role: string,
  opts?: { parent?: string; style?: string } & CanvasWriterOptions,
): void {
  const { parent, style, feedback, feedbackAgentId, feedbackPath, ...writerOpts } = opts ?? {};
  const element: CanvasText = { type: 'text', content, role, parent, style };
  appendElement(element, writerOpts);
  maybeReportInlineFeedback('text', { feedback, feedbackAgentId, feedbackPath });
}

export function addWireframe(
  layout: string,
  elements: string[],
  opts?: { parent?: string; status?: CanvasStatus } & CanvasWriterOptions,
): void {
  const id = `wf-${Date.now()}`;
  const { parent, status = 'proposed', feedback, feedbackAgentId, feedbackPath, ...writerOpts } = opts ?? {};
  const element: CanvasWireframe = { type: 'wireframe', id, layout, elements, parent, status };
  appendElement(element, writerOpts);
  maybeReportInlineFeedback('wireframe', { feedback, feedbackAgentId, feedbackPath });
}

export function addNote(
  author: string,
  text: string,
  opts?: { parent?: string } & CanvasWriterOptions,
): void {
  const { parent, feedback, feedbackAgentId, feedbackPath, ...writerOpts } = opts ?? {};
  const element: CanvasNote = { type: 'note', author, text, parent };
  appendElement(element, writerOpts);
  maybeReportInlineFeedback('note', { feedback, feedbackAgentId, feedbackPath });
}

export function addDivider(opts?: { style?: string } & CanvasWriterOptions): void {
  const { style, feedback, feedbackAgentId, feedbackPath, ...writerOpts } = opts ?? {};
  const element: CanvasDivider = { type: 'divider', style };
  appendElement(element, writerOpts);
  maybeReportInlineFeedback('divider', { feedback, feedbackAgentId, feedbackPath });
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
  if (!isValidConsensusTransition(currentStatus, status)) {
    throw new Error(
      `Invalid status transition for "${id}": ${currentStatus} → ${status}`,
    );
  }
  // Append a new version of the element with updated status
  const updated = { ...existing, status, ts: new Date().toISOString() };
  const filePath = resolve(opts?.canvasPath ?? DEFAULT_CANVAS_PATH);
  appendFileSync(filePath, JSON.stringify(updated) + '\n', { flag: 'a' });
}
