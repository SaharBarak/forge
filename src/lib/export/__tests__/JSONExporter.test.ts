/**
 * JSONExporter Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSONExporter } from '../JSONExporter';
import type { SelectedContent, ExportOptions } from '../types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockContent(overrides: Partial<SelectedContent> = {}): SelectedContent {
  return {
    session: {
      id: 'test-session-123',
      projectName: 'Test Campaign',
      goal: 'Test marketing campaign',
      mode: 'copywrite',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      endedAt: new Date('2024-01-15T12:00:00Z'),
      currentPhase: 'finalization',
    },
    messages: [
      {
        id: 'msg-1',
        timestamp: new Date('2024-01-15T10:05:00Z'),
        agentId: 'strategist',
        type: 'argument',
        content: 'We should focus on emotional appeal',
        contentHe: 'עלינו להתמקד בפנייה רגשית',
      },
      {
        id: 'msg-2',
        timestamp: new Date('2024-01-15T10:10:00Z'),
        agentId: 'analyst',
        type: 'disagreement',
        content: 'Data suggests rational benefits work better',
        replyTo: 'msg-1',
      },
    ],
    decisions: [
      {
        id: 'dec-1',
        topic: 'Primary Message Tone',
        topicHe: 'טון המסר הראשי',
        options: [
          { id: 'opt-1', description: 'Emotional', descriptionHe: 'רגשי', proposedBy: 'strategist', pros: ['memorable'], cons: ['may not convince'] },
          { id: 'opt-2', description: 'Rational', descriptionHe: 'רציונלי', proposedBy: 'analyst', pros: ['convincing'], cons: ['forgettable'] },
        ],
        votes: [
          { agentId: 'strategist', optionId: 'opt-1', confidence: 80, reasoning: 'Brand fit' },
          { agentId: 'analyst', optionId: 'opt-2', confidence: 70, reasoning: 'Data support' },
        ],
        outcome: 'Balanced approach',
        reasoning: 'Combine emotional hooks with data points',
        madeAt: new Date('2024-01-15T11:00:00Z'),
        phase: 'synthesis',
      },
    ],
    drafts: [
      {
        id: 'draft-1',
        version: 1,
        section: 'headline',
        content: {
          type: 'text',
          title: 'Campaign Headline',
          titleHe: 'כותרת הקמפיין',
          body: 'Transform Your Business Today',
          bodyHe: 'שנה את העסק שלך היום',
        },
        createdBy: 'copywriter',
        feedback: [],
        createdAt: new Date('2024-01-15T11:30:00Z'),
        status: 'approved',
      },
    ],
    summary: 'Session summary here',
    ...overrides,
  };
}

function createOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'json',
    contentTypes: ['full'],
    includeSystemMessages: false,
    includeTimestamps: true,
    includeAgentMetadata: false,
    style: 'professional',
    language: 'en',
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('JSONExporter', () => {
  let exporter: JSONExporter;

  beforeEach(() => {
    exporter = new JSONExporter();
  });

  describe('format properties', () => {
    it('should have correct format', () => {
      expect(exporter.format).toBe('json');
    });

    it('should have correct mimeType', () => {
      expect(exporter.mimeType).toBe('application/json');
    });

    it('should have correct extension', () => {
      expect(exporter.extension).toBe('json');
    });
  });

  describe('supports()', () => {
    it('should support json format', () => {
      expect(exporter.supports(createOptions({ format: 'json' }))).toBe(true);
    });

    it('should not support other formats', () => {
      expect(exporter.supports(createOptions({ format: 'md' }))).toBe(false);
      expect(exporter.supports(createOptions({ format: 'pdf' }))).toBe(false);
    });
  });

  describe('export()', () => {
    it('should export valid JSON', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(() => JSON.parse(result.content!)).not.toThrow();
    });

    it('should include version and exportedAt', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.version).toBe('1.0.0');
      expect(data.exportedAt).toBeDefined();
      expect(new Date(data.exportedAt)).toBeInstanceOf(Date);
    });

    it('should export session metadata', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.session.id).toBe('test-session-123');
      expect(data.session.projectName).toBe('Test Campaign');
      expect(data.session.goal).toBe('Test marketing campaign');
      expect(data.session.mode).toBe('copywrite');
      expect(data.session.phase).toBe('finalization');
    });

    it('should export messages', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.messages).toHaveLength(2);
      expect(data.content.messages[0].id).toBe('msg-1');
      expect(data.content.messages[0].agent.id).toBe('strategist');
      expect(data.content.messages[1].replyTo).toBe('msg-1');
    });

    it('should export decisions', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.decisions).toHaveLength(1);
      expect(data.content.decisions[0].topic).toBe('Primary Message Tone');
      expect(data.content.decisions[0].outcome).toBe('Balanced approach');
    });

    it('should include options and votes in detailed style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.decisions[0].options).toBeDefined();
      expect(data.content.decisions[0].options).toHaveLength(2);
      expect(data.content.decisions[0].votes).toBeDefined();
      expect(data.content.decisions[0].votes).toHaveLength(2);
    });

    it('should export drafts', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.drafts).toHaveLength(1);
      expect(data.content.drafts[0].section).toBe('headline');
      expect(data.content.drafts[0].status).toBe('approved');
    });

    it('should export summary', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.summary).toBe('Session summary here');
    });

    it('should export metadata', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he', style: 'detailed' });

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.metadata.format).toBe('json');
      expect(data.metadata.style).toBe('detailed');
      expect(data.metadata.language).toBe('he');
      expect(data.metadata.messageCount).toBe(2);
      expect(data.metadata.decisionCount).toBe(1);
      expect(data.metadata.draftCount).toBe(1);
    });

    it('should use Hebrew content when language is he', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.messages[0].content).toBe('עלינו להתמקד בפנייה רגשית');
    });

    it('should generate minimal JSON for minimal style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'minimal' });

      const result = await exporter.export(content, options);

      // Minimal style should not include pretty printing
      expect(result.content).not.toContain('\n  ');
    });

    it('should generate pretty JSON for non-minimal styles', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'professional' });

      const result = await exporter.export(content, options);

      // Should be pretty-printed
      expect(result.content).toContain('\n');
    });

    it('should generate correct filename', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.filename).toMatch(/^test-campaign-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('should use custom filename if provided', async () => {
      const content = createMockContent();
      const options = createOptions({ filename: 'my-export' });

      const result = await exporter.export(content, options);

      expect(result.filename).toBe('my-export.json');
    });
  });

  describe('empty content', () => {
    it('should handle no messages', async () => {
      const content = createMockContent({ messages: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.messages).toBeUndefined();
      expect(data.metadata.messageCount).toBe(0);
    });

    it('should handle no decisions', async () => {
      const content = createMockContent({ decisions: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.decisions).toBeUndefined();
      expect(data.metadata.decisionCount).toBe(0);
    });

    it('should handle no drafts', async () => {
      const content = createMockContent({ drafts: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.drafts).toBeUndefined();
      expect(data.metadata.draftCount).toBe(0);
    });

    it('should handle no summary', async () => {
      const content = createMockContent({ summary: undefined });
      const options = createOptions();

      const result = await exporter.export(content, options);
      const data = JSON.parse(result.content!);

      expect(data.content.summary).toBeUndefined();
    });
  });
});
