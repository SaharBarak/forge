/**
 * Consensus Status Protocol — Issue #60
 *
 * Status transition rules:
 *   proposed → discussed → agreed
 *   agreed → discussed (reopen for discussion)
 *   discussed → proposed (demote back)
 *
 * Forward transitions: proposed → discussed → agreed
 * Backward transitions: agreed → discussed, discussed → proposed
 * Invalid: proposed ← agreed (must go through discussed), same → same
 */

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { resolve } from 'path';
import { CanvasElement, CanvasStatus, CanvasStatusElement } from './types';

/**
 * Valid transitions — forward by one or more steps, backward by one step.
 */
const VALID_TRANSITIONS: Record<CanvasStatus, CanvasStatus[]> = {
  proposed: ['discussed', 'agreed'],
  discussed: ['agreed', 'proposed'],
  agreed: ['discussed'],
};

export function isValidConsensusTransition(from: CanvasStatus, to: CanvasStatus): boolean {
  if (from === to) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Read a JSONL canvas file and return the current resolved state.
 * Last-write-wins per id. Elements without id are collected in order.
 */
export function getCanvasState(canvasPath: string): Map<string, CanvasElement> {
  const filePath = resolve(canvasPath);
  if (!existsSync(filePath)) return new Map();

  const content = readFileSync(filePath, 'utf-8');
  const map = new Map<string, CanvasElement>();

  for (const line of content.trim().split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const el = JSON.parse(trimmed) as CanvasElement;
      const id = (el as any).id;
      if (id) {
        map.set(id, el);
      }
    } catch {
      // skip malformed lines
    }
  }

  return map;
}

/**
 * Query elements by their consensus status.
 */
export function getElementsByStatus(
  canvasPath: string,
  status: CanvasStatus,
): CanvasStatusElement[] {
  const state = getCanvasState(canvasPath);
  const results: CanvasStatusElement[] = [];

  for (const el of state.values()) {
    if ('status' in el && (el as any).status === status) {
      results.push(el as CanvasStatusElement);
    }
  }

  return results;
}

/**
 * Validate and apply a status transition for an element.
 * Appends a new JSONL line with updated status.
 */
export function transitionStatus(
  canvasPath: string,
  elementId: string,
  newStatus: CanvasStatus,
  agentId: string,
): void {
  const state = getCanvasState(canvasPath);
  const existing = state.get(elementId);

  if (!existing) {
    throw new Error(`Element "${elementId}" not found on canvas`);
  }

  if (!('status' in existing) || !(existing as any).status) {
    throw new Error(`Element "${elementId}" does not support status transitions`);
  }

  const currentStatus = (existing as any).status as CanvasStatus;

  if (!isValidConsensusTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition for "${elementId}": ${currentStatus} → ${newStatus}. ` +
      `Valid transitions from ${currentStatus}: ${VALID_TRANSITIONS[currentStatus].join(', ')}`,
    );
  }

  const updated = {
    ...existing,
    status: newStatus,
    ts: new Date().toISOString(),
    updatedBy: agentId,
  };

  const filePath = resolve(canvasPath);
  appendFileSync(filePath, JSON.stringify(updated) + '\n', { flag: 'a' });
}
