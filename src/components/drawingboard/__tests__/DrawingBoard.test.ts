/**
 * DrawingBoard store + parsing tests
 * Issue #55
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore, selectSections, selectByStatus, selectNotes } from '../../../stores/canvasStore';

const SAMPLE_JSONL = [
  '{"type":"section","id":"hero","label":"Hero Section","width":80,"status":"agreed"}',
  '{"type":"text","content":"Ship faster with AI","role":"headline","parent":"hero"}',
  '{"type":"text","content":"Get Started","role":"cta","parent":"hero"}',
  '{"type":"section","id":"features","label":"Features","width":80,"status":"discussed"}',
  '{"type":"wireframe","id":"wf-1","layout":"3-col","elements":["card1","card2","card3"],"parent":"features","status":"proposed"}',
  '{"type":"note","author":"forge-pm","text":"CTA copy still under debate","parent":"hero"}',
  '{"type":"divider","style":"single"}',
].join('\n');

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      elements: [],
      byId: new Map(),
      panelVisible: false,
      lastUpdated: null,
    });
  });

  it('loads JSONL and resolves elements', () => {
    useCanvasStore.getState().loadFromJsonl(SAMPLE_JSONL);
    const state = useCanvasStore.getState();
    expect(state.elements.length).toBe(7);
    expect(state.lastUpdated).toBeTruthy();
  });

  it('resolves last-write-wins for duplicate ids', () => {
    const jsonl = [
      '{"type":"section","id":"hero","label":"Hero v1","width":80,"status":"proposed"}',
      '{"type":"section","id":"hero","label":"Hero v2","width":80,"status":"agreed"}',
    ].join('\n');

    useCanvasStore.getState().loadFromJsonl(jsonl);
    const state = useCanvasStore.getState();

    expect(state.elements.length).toBe(1);
    expect((state.elements[0] as any).label).toBe('Hero v2');
    expect((state.elements[0] as any).status).toBe('agreed');
  });

  it('provides byId lookup', () => {
    useCanvasStore.getState().loadFromJsonl(SAMPLE_JSONL);
    const state = useCanvasStore.getState();

    expect(state.byId.get('hero')).toBeTruthy();
    expect((state.byId.get('hero') as any).label).toBe('Hero Section');
  });

  it('selectSections returns only sections', () => {
    useCanvasStore.getState().loadFromJsonl(SAMPLE_JSONL);
    const sections = selectSections(useCanvasStore.getState());
    expect(sections.length).toBe(2);
    expect(sections[0].type).toBe('section');
  });

  it('selectByStatus filters correctly', () => {
    useCanvasStore.getState().loadFromJsonl(SAMPLE_JSONL);
    const agreed = selectByStatus('agreed')(useCanvasStore.getState());
    expect(agreed.length).toBe(1);
    expect((agreed[0] as any).id).toBe('hero');
  });

  it('selectNotes returns notes', () => {
    useCanvasStore.getState().loadFromJsonl(SAMPLE_JSONL);
    const notes = selectNotes(useCanvasStore.getState());
    expect(notes.length).toBe(1);
    expect(notes[0].author).toBe('forge-pm');
  });

  it('togglePanel flips visibility', () => {
    expect(useCanvasStore.getState().panelVisible).toBe(false);
    useCanvasStore.getState().togglePanel();
    expect(useCanvasStore.getState().panelVisible).toBe(true);
    useCanvasStore.getState().togglePanel();
    expect(useCanvasStore.getState().panelVisible).toBe(false);
  });

  it('handles empty JSONL gracefully', () => {
    useCanvasStore.getState().loadFromJsonl('');
    expect(useCanvasStore.getState().elements.length).toBe(0);
  });

  it('skips malformed JSON lines', () => {
    const jsonl = [
      '{"type":"section","id":"hero","label":"Hero","width":80}',
      'not valid json',
      '{"type":"note","author":"test","text":"hello"}',
    ].join('\n');

    useCanvasStore.getState().loadFromJsonl(jsonl);
    expect(useCanvasStore.getState().elements.length).toBe(2);
  });
});
