/**
 * Canvas Agent Feedback API
 * Issue #61 — Agent Feedback API — Canvas Capability Self-Assessment
 *
 * Allows agents to report feedback about the canvas system (missing features,
 * usability issues, bugs, suggestions, capability gaps) via a JSONL file.
 */

import { appendFileSync, existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

// --- Types ---

export const FEEDBACK_CATEGORIES = [
  'missing_feature',
  'usability',
  'bug',
  'suggestion',
  'capability_gap',
  'session_end',
  'inline',
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_SEVERITIES = ['low', 'medium', 'high', 'blocking'] as const;

export type FeedbackSeverity = (typeof FEEDBACK_SEVERITIES)[number];

export interface FeedbackEntry {
  type: 'feedback';
  agentId: string;
  timestamp: string;
  category: FeedbackCategory;
  description: string;
  severity: FeedbackSeverity;
  context?: string;
  relatedElements?: string[];
}

export interface FeedbackSummary {
  total: number;
  byCategory: Record<FeedbackCategory, number>;
  bySeverity: Record<FeedbackSeverity, number>;
  topDescriptions: string[];
}

// --- Validation ---

function validateFeedback(
  feedback: Omit<FeedbackEntry, 'type' | 'timestamp'>,
): string[] {
  const errors: string[] = [];

  if (!feedback.agentId || typeof feedback.agentId !== 'string') {
    errors.push('agentId is required and must be a string');
  }
  if (!feedback.description || typeof feedback.description !== 'string') {
    errors.push('description is required and must be a string');
  }
  if (!FEEDBACK_CATEGORIES.includes(feedback.category)) {
    errors.push(
      `category must be one of: ${FEEDBACK_CATEGORIES.join(', ')}`,
    );
  }
  if (!FEEDBACK_SEVERITIES.includes(feedback.severity)) {
    errors.push(
      `severity must be one of: ${FEEDBACK_SEVERITIES.join(', ')}`,
    );
  }
  if (
    feedback.relatedElements !== undefined &&
    !Array.isArray(feedback.relatedElements)
  ) {
    errors.push('relatedElements must be an array of strings');
  }

  return errors;
}

// --- Public API ---

/**
 * Append a feedback entry to the JSONL file.
 * Validates the entry before writing.
 */
export function reportFeedback(
  feedbackPath: string,
  feedback: Omit<FeedbackEntry, 'type' | 'timestamp'>,
): void {
  const errors = validateFeedback(feedback);
  if (errors.length > 0) {
    throw new Error(`Feedback validation failed: ${errors.join('; ')}`);
  }

  const entry: FeedbackEntry = {
    type: 'feedback',
    timestamp: new Date().toISOString(),
    ...feedback,
  };

  const filePath = resolve(feedbackPath);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  appendFileSync(filePath, JSON.stringify(entry) + '\n', { flag: 'a' });
}

/**
 * Read all feedback entries from the JSONL file.
 */
export function getFeedback(feedbackPath: string): FeedbackEntry[] {
  const filePath = resolve(feedbackPath);
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line));
}

/**
 * Get feedback entries filtered by agent id.
 */
export function getFeedbackByAgent(
  feedbackPath: string,
  agentId: string,
): FeedbackEntry[] {
  return getFeedback(feedbackPath).filter((e) => e.agentId === agentId);
}

/**
 * Get feedback entries filtered by category.
 */
export function getFeedbackByCategory(
  feedbackPath: string,
  category: FeedbackCategory,
): FeedbackEntry[] {
  return getFeedback(feedbackPath).filter((e) => e.category === category);
}

/**
 * Get an aggregate summary of all feedback.
 */
export function getFeedbackSummary(feedbackPath: string): FeedbackSummary {
  const entries = getFeedback(feedbackPath);

  const byCategory = Object.fromEntries(
    FEEDBACK_CATEGORIES.map((c) => [c, 0]),
  ) as Record<FeedbackCategory, number>;

  const bySeverity = Object.fromEntries(
    FEEDBACK_SEVERITIES.map((s) => [s, 0]),
  ) as Record<FeedbackSeverity, number>;

  const descCounts = new Map<string, number>();

  for (const entry of entries) {
    byCategory[entry.category]++;
    bySeverity[entry.severity]++;
    descCounts.set(entry.description, (descCounts.get(entry.description) ?? 0) + 1);
  }

  // Top descriptions sorted by frequency (descending), take top 5
  const topDescriptions = [...descCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([desc]) => desc);

  return {
    total: entries.length,
    byCategory,
    bySeverity,
    topDescriptions,
  };
}
