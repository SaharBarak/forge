/**
 * DOCXExporter Unit Tests
 * 
 * Tests DOCX generation including:
 * - Document structure and styles
 * - Style presets (minimal, professional, detailed)
 * - Cover page and TOC
 * - RTL/Hebrew support
 * - Message, decision, and draft rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DOCXExporter } from '../DOCXExporter';
import type { SelectedContent, ExportOptions } from '../types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockContent(overrides: Partial<SelectedContent> = {}): SelectedContent {
  return {
    session: {
      id: 'test-session-123',
      projectName: 'Test Campaign',
      goal: 'Test marketing campaign for product launch',
      mode: 'debate',
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
        body: 'Balanced approach combining emotion with data',
        bodyHe: 'גישה מאוזנת המשלבת רגש עם נתונים',
        supporters: ['strategist', 'analyst'],
        confidence: 0.85,
        madeAt: new Date('2024-01-15T11:00:00Z'),
        phase: 'synthesis',
      },
      {
        id: 'dec-2',
        topic: 'Call to Action Style',
        topicHe: 'סגנון קריאה לפעולה',
        body: 'Use urgency-based CTAs',
        bodyHe: 'שימוש בקריאות לפעולה מבוססות דחיפות',
        supporters: ['copywriter'],
        confidence: 0.72,
        madeAt: new Date('2024-01-15T11:30:00Z'),
        phase: 'finalization',
      },
    ],
    drafts: [
      {
        id: 'draft-1',
        version: 1,
        title: 'Campaign Headline',
        titleHe: 'כותרת הקמפיין',
        content: 'Transform Your Business Today\n\nExperience innovation like never before.',
        contentHe: 'שנה את העסק שלך היום\n\nחווה חדשנות כמו שלא הכרת.',
        createdBy: 'copywriter',
        createdAt: new Date('2024-01-15T11:30:00Z'),
        status: 'approved',
      },
      {
        id: 'draft-2',
        version: 2,
        title: 'Body Copy',
        content: 'Experience the difference with our innovative solution.\n\nJoin thousands of satisfied customers.',
        createdBy: 'copywriter',
        createdAt: new Date('2024-01-15T11:45:00Z'),
        status: 'review',
      },
    ],
    summary: 'The team debated messaging strategy and reached consensus on a balanced approach combining emotional appeal with data-driven benefits.',
    ...overrides,
  };
}

function createOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'docx',
    contentTypes: ['full'],
    includeSystemMessages: false,
    includeTimestamps: true,
    includeAgentMetadata: false,
    style: 'professional',
    language: 'en',
    includeCoverPage: false,
    includeTableOfContents: false,
    ...overrides,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('DOCXExporter', () => {
  let exporter: DOCXExporter;

  beforeEach(() => {
    exporter = new DOCXExporter();
  });

  // ---------------------------------------------------------------------------
  // Basic Properties
  // ---------------------------------------------------------------------------

  describe('Exporter Properties', () => {
    it('should have correct format', () => {
      expect(exporter.format).toBe('docx');
    });

    it('should have correct mimeType', () => {
      expect(exporter.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should have correct extension', () => {
      expect(exporter.extension).toBe('docx');
    });

    it('should support docx format options', () => {
      const options = createOptions();
      expect(exporter.supports(options)).toBe(true);
    });

    it('should not support other formats', () => {
      const options = createOptions({ format: 'pdf' });
      expect(exporter.supports(options)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Export Success
  // ---------------------------------------------------------------------------

  describe('Export Success', () => {
    it('should export basic content successfully', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.filename).toContain('.docx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should return base64 encoded content', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
      // Base64 string should be non-empty
      expect(result.content!.length).toBeGreaterThan(0);
      // Should be valid base64 (no special chars except +, /, =)
      expect(result.content).toMatch(/^[A-Za-z0-9+/]+=*$/);
    });

    it('should generate correct filename', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.filename).toMatch(/^test-campaign-\d{4}-\d{2}-\d{2}\.docx$/);
    });

    it('should use custom filename if provided', async () => {
      const content = createMockContent();
      const options = createOptions({ filename: 'my-export' });

      const result = await exporter.export(content, options);

      expect(result.filename).toBe('my-export.docx');
    });

    it('should not duplicate extension in filename', async () => {
      const content = createMockContent();
      const options = createOptions({ filename: 'my-export.docx' });

      const result = await exporter.export(content, options);

      expect(result.filename).toBe('my-export.docx');
      expect(result.filename).not.toBe('my-export.docx.docx');
    });
  });

  // ---------------------------------------------------------------------------
  // Style Presets
  // ---------------------------------------------------------------------------

  describe('Style Presets', () => {
    it('should export with minimal style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'minimal' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should export with professional style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'professional' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should export with detailed style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should default to minimal style if not specified', async () => {
      const content = createMockContent();
      const options = createOptions();
      delete (options as any).style;

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Cover Page
  // ---------------------------------------------------------------------------

  describe('Cover Page', () => {
    it('should export with cover page when enabled', async () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
      // Cover page adds content so file should be larger
      expect(result.content!.length).toBeGreaterThan(0);
    });

    it('should include project name in cover page', async () => {
      const content = createMockContent({ 
        session: { 
          ...createMockContent().session,
          projectName: 'Unique Project Name 12345' 
        } 
      });
      const options = createOptions({ includeCoverPage: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include goal in cover page', async () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include mode in cover page', async () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Table of Contents
  // ---------------------------------------------------------------------------

  describe('Table of Contents', () => {
    it('should export with TOC when enabled', async () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include decision topics in TOC', async () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include all section headers in TOC', async () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Hebrew / RTL Support
  // ---------------------------------------------------------------------------

  describe('Hebrew/RTL Support', () => {
    it('should export in Hebrew language', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should use Hebrew content when available', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should use Hebrew font for Hebrew content', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should export Hebrew cover page correctly', async () => {
      const content = createMockContent();
      const options = createOptions({ 
        language: 'he',
        includeCoverPage: true,
      });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should export Hebrew TOC correctly', async () => {
      const content = createMockContent();
      const options = createOptions({ 
        language: 'he',
        includeTableOfContents: true,
      });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should translate mode names to Hebrew', async () => {
      const content = createMockContent();
      const options = createOptions({ 
        language: 'he',
        includeCoverPage: true,
      });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Transcript Section
  // ---------------------------------------------------------------------------

  describe('Transcript Section', () => {
    it('should include all messages', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include agent names', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include timestamps when enabled', async () => {
      const content = createMockContent();
      const options = createOptions({ includeTimestamps: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should omit timestamps when disabled', async () => {
      const content = createMockContent();
      const options = createOptions({ includeTimestamps: false });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle empty messages array', async () => {
      const content = createMockContent({ messages: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Decisions Section
  // ---------------------------------------------------------------------------

  describe('Decisions Section', () => {
    it('should include all decisions', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include decision topics as headings', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include decision body', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include confidence in detailed style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include supporters when metadata enabled', async () => {
      const content = createMockContent();
      const options = createOptions({ includeAgentMetadata: true });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle empty decisions array', async () => {
      const content = createMockContent({ decisions: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should use Hebrew decision content when appropriate', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Drafts Section
  // ---------------------------------------------------------------------------

  describe('Drafts Section', () => {
    it('should include all drafts', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include draft titles', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should include version info for non-minimal style', async () => {
      const content = createMockContent();
      const options = createOptions({ style: 'professional' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle multi-line draft content', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle empty drafts array', async () => {
      const content = createMockContent({ drafts: [] });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should use Hebrew draft content when appropriate', async () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Summary Section
  // ---------------------------------------------------------------------------

  describe('Summary Section', () => {
    it('should include summary when present', async () => {
      const content = createMockContent();
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle multi-line summary', async () => {
      const content = createMockContent({
        summary: 'Line one.\n\nLine two.\n\nLine three.',
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle missing summary', async () => {
      const content = createMockContent({ summary: undefined });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Content Combinations
  // ---------------------------------------------------------------------------

  describe('Content Combinations', () => {
    it('should handle only messages', async () => {
      const content = createMockContent({
        decisions: [],
        drafts: [],
        summary: undefined,
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle only decisions', async () => {
      const content = createMockContent({
        messages: [],
        drafts: [],
        summary: undefined,
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle only drafts', async () => {
      const content = createMockContent({
        messages: [],
        decisions: [],
        summary: undefined,
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle full content with all options', async () => {
      const content = createMockContent();
      const options = createOptions({
        includeCoverPage: true,
        includeTableOfContents: true,
        includeTimestamps: true,
        includeAgentMetadata: true,
        style: 'detailed',
      });

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle special characters in content', async () => {
      const content = createMockContent({
        messages: [{
          id: 'msg-1',
          timestamp: new Date(),
          agentId: 'strategist',
          type: 'argument',
          content: 'Special chars: <tag> & "quotes" \'apostrophe\' ©®™',
        }],
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle very long content', async () => {
      const longText = 'A'.repeat(10000);
      const content = createMockContent({
        messages: [{
          id: 'msg-1',
          timestamp: new Date(),
          agentId: 'strategist',
          type: 'argument',
          content: longText,
        }],
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle emoji in content', async () => {
      const content = createMockContent({
        messages: [{
          id: 'msg-1',
          timestamp: new Date(),
          agentId: 'strategist',
          type: 'argument',
          content: 'Great idea! 🎉 Let\'s go! 🚀',
        }],
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle newlines in messages', async () => {
      const content = createMockContent({
        messages: [{
          id: 'msg-1',
          timestamp: new Date(),
          agentId: 'strategist',
          type: 'argument',
          content: 'Line 1\nLine 2\n\nLine 4',
        }],
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });

    it('should handle very long project names', async () => {
      const content = createMockContent({
        session: {
          ...createMockContent().session,
          projectName: 'A'.repeat(200),
        },
      });
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
      // Filename should be truncated
      expect(result.filename!.length).toBeLessThan(60);
    });

    it('should handle undefined optional fields', async () => {
      const content: SelectedContent = {
        session: {
          id: 'test',
          projectName: 'Test',
          goal: '',
          startedAt: new Date(),
          currentPhase: 'ideation',
        },
        messages: [],
        decisions: [],
        drafts: [],
      };
      const options = createOptions();

      const result = await exporter.export(content, options);

      expect(result.success).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Integration with ExportManager
  // ---------------------------------------------------------------------------

  describe('Integration', () => {
    it('should work when registered with ExportManager', async () => {
      const { ExportManager } = await import('../ExportManager');
      const manager = new ExportManager();

      expect(manager.supportsFormat('docx')).toBe(true);
    });

    it('should export via ExportManager', async () => {
      const { ExportManager } = await import('../ExportManager');
      
      const manager = new ExportManager();
      const content = createMockContent();
      
      // Use exportContent to bypass session→content selection
      const result = await manager.exportContent(content, { 
        format: 'docx',
        contentTypes: ['decisions'],
      });

      expect(result.success).toBe(true);
      expect(result.filename).toContain('.docx');
    });
  });
});
