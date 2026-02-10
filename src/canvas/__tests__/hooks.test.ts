import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { onCanvasSessionEnd, withCanvasSession } from '../hooks';
import { getFeedback } from '../feedback';
import { addSection, addText } from '../api';

const TEST_CANVAS = join(__dirname, '__test_hooks_canvas.jsonl');
const TEST_FEEDBACK = join(__dirname, '__test_hooks_feedback.jsonl');

function cleanup() {
  for (const f of [TEST_CANVAS, TEST_FEEDBACK]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe('onCanvasSessionEnd', () => {
  it('writes a session_end feedback entry', () => {
    onCanvasSessionEnd(TEST_CANVAS, TEST_FEEDBACK, 'agent-x');
    const entries = getFeedback(TEST_FEEDBACK);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('session_end');
    expect(entries[0].agentId).toBe('agent-x');
    expect(entries[0].description).toContain('Session complete');
  });

  it('includes stats when provided', () => {
    onCanvasSessionEnd(TEST_CANVAS, TEST_FEEDBACK, 'agent-x', {
      elementsAdded: 3,
      elementsByType: { section: 2, text: 1 },
    });
    const entry = getFeedback(TEST_FEEDBACK)[0];
    expect(entry.description).toContain('2 section');
    expect(entry.description).toContain('1 text');
    expect(entry.context).toBeDefined();
  });
});

describe('withCanvasSession', () => {
  it('runs work function and generates feedback with stats', async () => {
    const result = await withCanvasSession(TEST_CANVAS, TEST_FEEDBACK, 'agent-y', () => {
      addSection('s1', 'Header', { canvasPath: TEST_CANVAS });
      addText('Hello', 'desc', { canvasPath: TEST_CANVAS });
      return 'done';
    });

    expect(result).toBe('done');
    const entries = getFeedback(TEST_FEEDBACK);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('session_end');
    expect(entries[0].description).toContain('1 section');
    expect(entries[0].description).toContain('1 text');
    expect(entries[0].description).toContain('2 total');
  });

  it('works with async work functions', async () => {
    const result = await withCanvasSession(TEST_CANVAS, TEST_FEEDBACK, 'agent-z', async () => {
      addSection('s1', 'Header', { canvasPath: TEST_CANVAS });
      return 42;
    });
    expect(result).toBe(42);
    expect(getFeedback(TEST_FEEDBACK)).toHaveLength(1);
  });

  it('handles empty session (no elements added)', async () => {
    await withCanvasSession(TEST_CANVAS, TEST_FEEDBACK, 'agent-z', () => {});
    const entry = getFeedback(TEST_FEEDBACK)[0];
    expect(entry.description).toContain('No elements added');
  });
});
