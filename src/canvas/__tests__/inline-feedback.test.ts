import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { addSection, addText, addNote } from '../api';
import { getFeedback } from '../feedback';

const TEST_CANVAS = join(__dirname, '__test_inline_canvas.jsonl');
const TEST_FEEDBACK = join(__dirname, '__test_inline_feedback.jsonl');

function cleanup() {
  for (const f of [TEST_CANVAS, TEST_FEEDBACK]) {
    if (existsSync(f)) unlinkSync(f);
  }
}

beforeEach(cleanup);
afterEach(cleanup);

describe('inline feedback via write API', () => {
  it('addSection captures inline feedback', () => {
    addSection('s1', 'Test', {
      canvasPath: TEST_CANVAS,
      feedback: 'width param is confusing',
      feedbackAgentId: 'agent-1',
      feedbackPath: TEST_FEEDBACK,
    });
    const entries = getFeedback(TEST_FEEDBACK);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('inline');
    expect(entries[0].description).toBe('width param is confusing');
    expect(entries[0].context).toContain('section');
  });

  it('no feedback file written when feedback is omitted', () => {
    addSection('s1', 'Test', { canvasPath: TEST_CANVAS });
    expect(existsSync(TEST_FEEDBACK)).toBe(false);
  });

  it('addText captures inline feedback', () => {
    addText('Hello', 'desc', {
      canvasPath: TEST_CANVAS,
      feedback: 'role field is unclear',
      feedbackAgentId: 'agent-2',
      feedbackPath: TEST_FEEDBACK,
    });
    const entries = getFeedback(TEST_FEEDBACK);
    expect(entries).toHaveLength(1);
    expect(entries[0].description).toBe('role field is unclear');
  });

  it('addNote captures inline feedback', () => {
    addNote('author', 'note text', {
      canvasPath: TEST_CANVAS,
      feedback: 'notes should support markdown',
      feedbackAgentId: 'agent-3',
      feedbackPath: TEST_FEEDBACK,
    });
    expect(getFeedback(TEST_FEEDBACK)).toHaveLength(1);
  });
});
