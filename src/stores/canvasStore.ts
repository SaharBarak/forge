/**
 * Canvas Store — Zustand state for Drawing Board UI
 * Issue #55: Shared Drawing Board — Live Visual Consensus Canvas
 *
 * Manages the resolved canvas state from shared/canvas.jsonl
 * and provides reactive updates for the DrawingBoard component.
 */

import { create } from 'zustand';
import type {
  CanvasElement,
  CanvasSection,
  CanvasNote,
  CanvasStatus,
} from '../canvas/types';

/** Resolved canvas state — last-write-wins per id, ordered */
export interface CanvasState {
  /** All resolved elements in display order */
  elements: CanvasElement[];
  /** Map of id → element for quick lookup */
  byId: Map<string, CanvasElement>;
  /** Whether the canvas panel is visible */
  panelVisible: boolean;
  /** Last update timestamp */
  lastUpdated: string | null;

  // Actions
  loadFromJsonl: (jsonlContent: string) => void;
  togglePanel: () => void;
  setPanelVisible: (visible: boolean) => void;
}

/** Parse JSONL content into resolved canvas state */
function parseJsonl(content: string): { elements: CanvasElement[]; byId: Map<string, CanvasElement> } {
  const lines = content.trim().split('\n').filter(Boolean);
  const byId = new Map<string, CanvasElement>();
  const nonIdElements: CanvasElement[] = [];

  for (const line of lines) {
    try {
      const el = JSON.parse(line) as CanvasElement;
      const id = (el as any).id;
      if (id) {
        byId.set(id, el);
      } else {
        nonIdElements.push(el);
      }
    } catch {
      // skip malformed
    }
  }

  // Ordered: id-based elements first (insertion order), then non-id elements
  const elements: CanvasElement[] = [...byId.values(), ...nonIdElements];
  return { elements, byId };
}

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [],
  byId: new Map(),
  panelVisible: false,
  lastUpdated: null,

  loadFromJsonl: (jsonlContent: string) => {
    const { elements, byId } = parseJsonl(jsonlContent);
    set({ elements, byId, lastUpdated: new Date().toISOString() });
  },

  togglePanel: () => set((s) => ({ panelVisible: !s.panelVisible })),
  setPanelVisible: (visible: boolean) => set({ panelVisible: visible }),
}));

// Selector helpers
export const selectSections = (state: CanvasState) =>
  state.elements.filter((e): e is CanvasSection => e.type === 'section');

export const selectChildrenOf = (parentId: string) => (state: CanvasState) =>
  state.elements.filter((e) => 'parent' in e && (e as any).parent === parentId);

export const selectByStatus = (status: CanvasStatus) => (state: CanvasState) =>
  state.elements.filter((e) => 'status' in e && (e as any).status === status);

export const selectNotes = (state: CanvasState) =>
  state.elements.filter((e): e is CanvasNote => e.type === 'note');
