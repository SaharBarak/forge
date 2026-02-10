import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import {
  reportFeedback,
  getFeedback,
  getFeedbackByAgent,
  getFeedbackByCategory,
  getFeedbackSummary,
} from '../feedback';

const TEST_PATH = join(__dirname, '__test_feedback.jsonl');

beforeEach(() => {
  if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
});

afterEach(() => {
  if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH);
});

const baseFeedback = {
  agentId: 'agent-1',
  category: 'bug' as const,
  description: 'Button does not render',
  severity: 'high' as const,
};

describe('reportFeedback', () => {
  it('appends a valid feedback entry', () => {
    reportFeedback(TEST_PATH, baseFeedback);
    const entries = getFeedback(TEST_PATH);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe('feedback');
    expect(entries[0].agentId).toBe('agent-1');
    expect(entries[0].category).toBe('bug');
    expect(entries[0].severity).toBe('high');
    expect(entries[0].timestamp).toBeDefined();
  });

  it('appends multiple entries', () => {
    reportFeedback(TEST_PATH, baseFeedback);
    reportFeedback(TEST_PATH, { ...baseFeedback, agentId: 'agent-2' });
    expect(getFeedback(TEST_PATH)).toHaveLength(2);
  });

  it('includes optional context and relatedElements', () => {
    reportFeedback(TEST_PATH, {
      ...baseFeedback,
      context: 'during rendering',
      relatedElements: ['header', 'footer'],
    });
    const entry = getFeedback(TEST_PATH)[0];
    expect(entry.context).toBe('during rendering');
    expect(entry.relatedElements).toEqual(['header', 'footer']);
  });

  it('rejects invalid category', () => {
    expect(() =>
      reportFeedback(TEST_PATH, { ...baseFeedback, category: 'invalid' as any }),
    ).toThrow('category must be one of');
  });

  it('rejects invalid severity', () => {
    expect(() =>
      reportFeedback(TEST_PATH, { ...baseFeedback, severity: 'critical' as any }),
    ).toThrow('severity must be one of');
  });

  it('rejects missing agentId', () => {
    expect(() =>
      reportFeedback(TEST_PATH, { ...baseFeedback, agentId: '' }),
    ).toThrow('agentId is required');
  });

  it('rejects missing description', () => {
    expect(() =>
      reportFeedback(TEST_PATH, { ...baseFeedback, description: '' }),
    ).toThrow('description is required');
  });
});

describe('getFeedback', () => {
  it('returns empty array for missing file', () => {
    expect(getFeedback(TEST_PATH)).toEqual([]);
  });
});

describe('getFeedbackByAgent', () => {
  it('filters by agent id', () => {
    reportFeedback(TEST_PATH, baseFeedback);
    reportFeedback(TEST_PATH, { ...baseFeedback, agentId: 'agent-2' });
    reportFeedback(TEST_PATH, baseFeedback);
    expect(getFeedbackByAgent(TEST_PATH, 'agent-1')).toHaveLength(2);
    expect(getFeedbackByAgent(TEST_PATH, 'agent-2')).toHaveLength(1);
  });
});

describe('getFeedbackByCategory', () => {
  it('filters by category', () => {
    reportFeedback(TEST_PATH, baseFeedback);
    reportFeedback(TEST_PATH, { ...baseFeedback, category: 'suggestion' });
    reportFeedback(TEST_PATH, { ...baseFeedback, category: 'suggestion' });
    expect(getFeedbackByCategory(TEST_PATH, 'bug')).toHaveLength(1);
    expect(getFeedbackByCategory(TEST_PATH, 'suggestion')).toHaveLength(2);
  });
});

describe('getFeedbackSummary', () => {
  it('returns zeroed summary for empty file', () => {
    const summary = getFeedbackSummary(TEST_PATH);
    expect(summary.total).toBe(0);
    expect(summary.byCategory.bug).toBe(0);
    expect(summary.bySeverity.high).toBe(0);
    expect(summary.topDescriptions).toEqual([]);
  });

  it('aggregates counts correctly', () => {
    reportFeedback(TEST_PATH, baseFeedback);
    reportFeedback(TEST_PATH, { ...baseFeedback, category: 'suggestion', severity: 'low' });
    reportFeedback(TEST_PATH, baseFeedback);

    const summary = getFeedbackSummary(TEST_PATH);
    expect(summary.total).toBe(3);
    expect(summary.byCategory.bug).toBe(2);
    expect(summary.byCategory.suggestion).toBe(1);
    expect(summary.bySeverity.high).toBe(2);
    expect(summary.bySeverity.low).toBe(1);
    expect(summary.topDescriptions[0]).toBe('Button does not render');
  });
});
