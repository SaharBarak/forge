import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  addSection,
  addText,
  addWireframe,
  addNote,
  addDivider,
  updateStatus,
} from '../api';
import { CanvasElement } from '../types';

const TEST_PATH = join(__dirname, '__test_canvas.jsonl');
const opts = { canvasPath: TEST_PATH };

function readLines(): CanvasElement[] {
  if (!existsSync(TEST_PATH)) return [];
  return readFileSync(TEST_PATH, 'utf-8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

beforeEach(() => {
  if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
});

afterEach(() => {
  if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
});

describe('addSection', () => {
  it('appends a section element', () => {
    addSection('s1', 'Header', { width: 80, ...opts });
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('section');
    expect((lines[0] as any).id).toBe('s1');
    expect((lines[0] as any).status).toBe('proposed');
  });
});

describe('addText', () => {
  it('appends a text element', () => {
    addText('Hello world', 'description', opts);
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('text');
    expect((lines[0] as any).content).toBe('Hello world');
  });
});

describe('addWireframe', () => {
  it('appends a wireframe element', () => {
    addWireframe('vertical', ['[A]', '[B]'], opts);
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('wireframe');
    expect((lines[0] as any).elements).toEqual(['[A]', '[B]']);
  });
});

describe('addNote', () => {
  it('appends a note with author', () => {
    addNote('agent-1', 'This is a note', opts);
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect((lines[0] as any).author).toBe('agent-1');
  });
});

describe('addDivider', () => {
  it('appends a divider', () => {
    addDivider({ style: 'double', ...opts });
    const lines = readLines();
    expect(lines).toHaveLength(1);
    expect(lines[0].type).toBe('divider');
    expect((lines[0] as any).style).toBe('double');
  });
});

describe('updateStatus', () => {
  it('transitions proposed → discussed → agreed', () => {
    addSection('s1', 'Test', { width: 40, ...opts });
    updateStatus('s1', 'discussed', opts);
    updateStatus('s1', 'agreed', opts);
    const lines = readLines();
    expect(lines).toHaveLength(3);
    expect((lines[2] as any).status).toBe('agreed');
  });

  it('rejects invalid transitions (agreed → proposed)', () => {
    addSection('s1', 'Test', { width: 40, status: 'agreed', ...opts });
    expect(() => updateStatus('s1', 'proposed', opts)).toThrow('Invalid status transition');
  });

  it('throws if element not found', () => {
    expect(() => updateStatus('nonexistent', 'discussed', opts)).toThrow('not found');
  });
});

describe('validation', () => {
  it('rejects section without label', () => {
    expect(() => addSection('s1', '', opts)).toThrow('validation failed');
  });

  it('rejects note without author', () => {
    expect(() => addNote('', 'text', opts)).toThrow('validation failed');
  });
});
