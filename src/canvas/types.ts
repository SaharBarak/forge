/**
 * Canvas JSONL Schema Types
 * Issue #56 — Drawing Board: Canvas JSON Schema & Protocol Definition
 *
 * Each line in shared/canvas.jsonl is one CanvasElement.
 * Later entries with the same `id` override earlier ones (last-write-wins).
 */

/** Consensus status for elements that support it */
export type CanvasStatus = 'proposed' | 'discussed' | 'agreed';

/** Valid status transitions: proposed → discussed → agreed */
export const STATUS_ORDER: readonly CanvasStatus[] = ['proposed', 'discussed', 'agreed'] as const;

export function isValidStatusTransition(from: CanvasStatus, to: CanvasStatus): boolean {
  return STATUS_ORDER.indexOf(to) > STATUS_ORDER.indexOf(from);
}

// --- Element Types ---

export interface CanvasBaseElement {
  type: string;
  /** Timestamp of when this entry was appended (ISO 8601) */
  ts?: string;
}

export interface CanvasSection extends CanvasBaseElement {
  type: 'section';
  /** Unique identifier — required for referenceable elements */
  id: string;
  label: string;
  width: number;
  status?: CanvasStatus;
  parent?: string;
}

export interface CanvasText extends CanvasBaseElement {
  type: 'text';
  content: string;
  role: string;
  parent?: string;
  style?: string;
}

export interface CanvasWireframe extends CanvasBaseElement {
  type: 'wireframe';
  /** Unique identifier — required for referenceable elements */
  id: string;
  layout: string;
  elements: string[];
  parent?: string;
  status?: CanvasStatus;
}

export interface CanvasDivider extends CanvasBaseElement {
  type: 'divider';
  style?: string;
}

export interface CanvasNote extends CanvasBaseElement {
  type: 'note';
  author: string;
  text: string;
  parent?: string;
}

export type CanvasElement =
  | CanvasSection
  | CanvasText
  | CanvasWireframe
  | CanvasDivider
  | CanvasNote;

/** Elements that carry an id (referenceable) */
export type CanvasIdentifiable = CanvasSection | CanvasWireframe;

/** Elements that carry a status field */
export type CanvasStatusElement = CanvasSection | CanvasWireframe;
