/**
 * Canvas Session Hooks
 * Automatic feedback triggers for canvas sessions.
 *
 * - onCanvasSessionEnd: post-session feedback prompt
 * - withCanvasSession: wrapper that auto-triggers feedback after work
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { reportFeedback } from './feedback';
import { CanvasElement } from './types';

export interface SessionStats {
  elementsAdded: number;
  elementsByType: Record<string, number>;
}

/** Count elements in a canvas JSONL file */
function countElements(canvasPath: string): Map<string, number> {
  const filePath = resolve(canvasPath);
  if (!existsSync(filePath)) return new Map();
  const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  const counts = new Map<string, number>();
  for (const line of lines) {
    try {
      const el = JSON.parse(line) as CanvasElement;
      counts.set(el.type, (counts.get(el.type) ?? 0) + 1);
    } catch { /* skip malformed */ }
  }
  return counts;
}

function diffCounts(before: Map<string, number>, after: Map<string, number>): SessionStats {
  let total = 0;
  const byType: Record<string, number> = {};
  for (const [type, count] of after) {
    const prev = before.get(type) ?? 0;
    const diff = count - prev;
    if (diff > 0) {
      byType[type] = diff;
      total += diff;
    }
  }
  return { elementsAdded: total, elementsByType: byType };
}

function formatStats(stats: SessionStats): string {
  if (stats.elementsAdded === 0) return 'No elements added/modified.';
  const parts = Object.entries(stats.elementsByType).map(([t, n]) => `${n} ${t}`);
  return `Added/modified: ${parts.join(', ')} (${stats.elementsAdded} total).`;
}

/**
 * Called when an agent finishes working with the canvas.
 * Generates a session_end feedback entry with a summary.
 */
export function onCanvasSessionEnd(
  _canvasPath: string,
  feedbackPath: string,
  agentId: string,
  stats?: SessionStats,
): void {
  const summary = stats ? formatStats(stats) : 'Session ended (no stats available).';

  reportFeedback(feedbackPath, {
    agentId,
    category: 'session_end',
    description: `Session complete. ${summary} You just worked with the canvas. Report any friction, missing features, or suggestions.`,
    severity: 'low',
    context: stats ? JSON.stringify(stats) : undefined,
  });
}

/**
 * Wraps a work function with automatic session tracking and post-session feedback.
 * Snapshots the canvas before/after to compute stats.
 */
export async function withCanvasSession<T>(
  canvasPath: string,
  feedbackPath: string,
  agentId: string,
  workFn: () => T | Promise<T>,
): Promise<T> {
  const before = countElements(canvasPath);

  const result = await workFn();

  const after = countElements(canvasPath);
  const stats = diffCounts(before, after);

  onCanvasSessionEnd(canvasPath, feedbackPath, agentId, stats);

  return result;
}
