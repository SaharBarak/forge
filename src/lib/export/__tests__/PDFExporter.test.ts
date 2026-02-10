// @ts-nocheck
/**
 * PDFExporter Unit Tests
 * 
 * Tests PDF generation including:
 * - HTML template generation
 * - Style presets (minimal, professional, detailed)
 * - Cover page and TOC
 * - RTL/Hebrew support
 * - Message, decision, and draft rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PDFExporter } from '../PDFExporter';
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
          { id: 'opt-1', description: 'Emotional appeal', descriptionHe: 'פנייה רגשית', proposedBy: 'strategist', pros: ['memorable', 'engaging'], cons: ['may not convince skeptics'] },
          { id: 'opt-2', description: 'Rational benefits', descriptionHe: 'יתרונות רציונליים', proposedBy: 'analyst', pros: ['convincing', 'credible'], cons: ['less memorable'] },
        ],
        votes: [
          { agentId: 'strategist', optionId: 'opt-1', confidence: 80, reasoning: 'Brand fit' },
          { agentId: 'analyst', optionId: 'opt-2', confidence: 70, reasoning: 'Data support' },
        ],
        outcome: 'Balanced approach combining emotion with data',
        reasoning: 'Combine emotional hooks with supporting data points',
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
        feedback: [
          {
            agentId: 'strategist',
            rating: 4,
            comments: 'Strong headline, captures the transformation theme',
            suggestions: ['Consider adding urgency'],
          },
        ],
        createdAt: new Date('2024-01-15T11:30:00Z'),
        status: 'approved',
      },
      {
        id: 'draft-2',
        version: 2,
        section: 'body',
        content: {
          type: 'text',
          title: 'Body Copy',
          body: 'Experience the difference with our innovative solution.',
        },
        createdBy: 'copywriter',
        feedback: [],
        createdAt: new Date('2024-01-15T11:45:00Z'),
        status: 'review',
      },
    ],
    summary: 'The team debated messaging strategy and reached consensus on a balanced approach.',
    ...overrides,
  };
}

function createOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
  return {
    format: 'pdf',
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

describe('PDFExporter', () => {
  let exporter: PDFExporter;

  beforeEach(() => {
    exporter = new PDFExporter();
  });

  // ---------------------------------------------------------------------------
  // Basic Properties
  // ---------------------------------------------------------------------------

  describe('Exporter Properties', () => {
    it('should have correct format', () => {
      expect(exporter.format).toBe('pdf');
    });

    it('should have correct mimeType', () => {
      expect(exporter.mimeType).toBe('application/pdf');
    });

    it('should have correct extension', () => {
      expect(exporter.extension).toBe('pdf');
    });

    it('should support PDF options', () => {
      const options = createOptions();
      expect(exporter.supports(options)).toBe(true);
    });

    it('should not support other formats', () => {
      const options = createOptions({ format: 'md' });
      expect(exporter.supports(options)).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // HTML Generation (via private method access for testing)
  // ---------------------------------------------------------------------------

  describe('HTML Generation', () => {
    // Access private method for testing HTML output
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should generate valid HTML structure', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
    });

    it('should include project name in title', () => {
      const content = createMockContent({ session: { ...createMockContent().session, projectName: 'My Project' } });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('<title>My Project</title>');
    });

    it('should set correct language and direction for English', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'en' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('lang="en"');
      expect(html).toContain('dir="ltr"');
    });

    it('should set correct language and direction for Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('lang="he"');
      expect(html).toContain('dir="rtl"');
    });

    it('should include CSS styles', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('<style>');
      expect(html).toContain('</style>');
      expect(html).toContain('font-family');
    });
  });

  // ---------------------------------------------------------------------------
  // Cover Page
  // ---------------------------------------------------------------------------

  describe('Cover Page', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should not include cover page by default', () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: false });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('class="cover-page"');
    });

    it('should include cover page when enabled', () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="cover-page"');
      expect(html).toContain('class="cover-title"');
      expect(html).toContain('class="cover-goal"');
    });

    it('should include project name on cover page', () => {
      const content = createMockContent({ session: { ...createMockContent().session, projectName: 'Amazing Campaign' } });
      const options = createOptions({ includeCoverPage: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Amazing Campaign');
    });

    it('should include goal on cover page', () => {
      const content = createMockContent();
      const options = createOptions({ includeCoverPage: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain(content.session.goal);
    });

    it('should include logo when specified', () => {
      const content = createMockContent();
      const options = createOptions({ 
        includeCoverPage: true, 
        includeLogo: true, 
        logoPath: '/path/to/logo.png' 
      });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="cover-logo"');
      expect(html).toContain('/path/to/logo.png');
    });
  });

  // ---------------------------------------------------------------------------
  // Table of Contents
  // ---------------------------------------------------------------------------

  describe('Table of Contents', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should not include TOC by default', () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: false });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('class="toc"');
    });

    it('should include TOC when enabled', () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="toc"');
      expect(html).toContain('Table of Contents');
    });

    it('should list sections with counts in TOC', () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Transcript');
      expect(html).toContain('Decisions');
      expect(html).toContain('Drafts');
      expect(html).toContain('Summary');
    });

    it('should use Hebrew labels when language is Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ includeTableOfContents: true, language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('תוכן עניינים');
      expect(html).toContain('תמליל');
      expect(html).toContain('החלטות');
    });
  });

  // ---------------------------------------------------------------------------
  // Message Rendering
  // ---------------------------------------------------------------------------

  describe('Message Rendering', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should render all messages', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('We should focus on emotional appeal');
      expect(html).toContain('Data suggests rational benefits work better');
    });

    it('should include timestamps when enabled', () => {
      const content = createMockContent();
      const options = createOptions({ includeTimestamps: true });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="message-time"');
    });

    it('should not include timestamps when disabled', () => {
      const content = createMockContent();
      const options = createOptions({ includeTimestamps: false });
      
      const html = generateHTML(exporter, content, options);
      
      // Check for empty timestamp spans or absence
      const messageTimeCount = (html.match(/class="message-time"[^>]*>[^<]+</g) || []).length;
      expect(messageTimeCount).toBe(0);
    });

    it('should use Hebrew content when language is Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('עלינו להתמקד בפנייה רגשית');
    });
  });

  // ---------------------------------------------------------------------------
  // Decision Rendering
  // ---------------------------------------------------------------------------

  describe('Decision Rendering', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should render decisions section', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('id="decisions"');
      expect(html).toContain('Primary Message Tone');
    });

    it('should include outcome', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Balanced approach');
    });

    it('should include reasoning', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Combine emotional hooks');
    });

    it('should include options with pros/cons in detailed style', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Emotional appeal');
      expect(html).toContain('Rational benefits');
      expect(html).toContain('memorable');
      expect(html).toContain('convincing');
    });

    it('should not include options in minimal style', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'minimal' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('class="options-list"');
    });

    it('should include votes in detailed style', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="votes"');
      expect(html).toContain('80%');
      expect(html).toContain('70%');
    });

    it('should use Hebrew topic when language is Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('טון המסר הראשי');
    });
  });

  // ---------------------------------------------------------------------------
  // Draft Rendering
  // ---------------------------------------------------------------------------

  describe('Draft Rendering', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should render drafts section', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('id="drafts"');
      expect(html).toContain('Campaign Headline');
    });

    it('should include version numbers', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('(v1)');
      expect(html).toContain('(v2)');
    });

    it('should include status badges', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('status-approved');
      expect(html).toContain('status-review');
    });

    it('should include draft content', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('Transform Your Business Today');
      expect(html).toContain('Experience the difference');
    });

    it('should include feedback in detailed style', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('class="feedback-section"');
      expect(html).toContain('Strong headline');
      expect(html).toContain('Consider adding urgency');
    });

    it('should not include feedback in minimal style', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'minimal' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('class="feedback-section"');
    });

    it('should use Hebrew content when language is Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('כותרת הקמפיין');
      expect(html).toContain('שנה את העסק שלך היום');
    });
  });

  // ---------------------------------------------------------------------------
  // Summary Rendering
  // ---------------------------------------------------------------------------

  describe('Summary Rendering', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should render summary when present', () => {
      const content = createMockContent();
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('id="summary"');
      expect(html).toContain('reached consensus on a balanced approach');
    });

    it('should not render summary section when absent', () => {
      const content = createMockContent({ summary: undefined });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('id="summary"');
    });
  });

  // ---------------------------------------------------------------------------
  // Style Presets
  // ---------------------------------------------------------------------------

  describe('Style Presets', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should apply minimal style colors', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'minimal' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('#333333'); // primary color
    });

    it('should apply professional style colors', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'professional' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('#1a365d'); // primary color
    });

    it('should apply detailed style colors', () => {
      const content = createMockContent();
      const options = createOptions({ style: 'detailed' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('#2c5282'); // primary color
    });
  });

  // ---------------------------------------------------------------------------
  // Filename Generation
  // ---------------------------------------------------------------------------

  describe('Filename Generation', () => {
    it('should generate filename with pdf extension', async () => {
      // Mock puppeteer to avoid actual browser launch
      vi.mock('puppeteer', () => ({
        default: {
          launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              setContent: vi.fn(),
              pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
            }),
            close: vi.fn(),
          }),
        },
      }));

      const content = createMockContent({ session: { ...createMockContent().session, projectName: 'My Campaign' } });
      const options = createOptions();
      
      const result = await exporter.export(content, options);
      
      if (result.success) {
        expect(result.filename).toMatch(/\.pdf$/);
        expect(result.filename).toContain('my-campaign');
      }
    });

    it('should use custom filename when provided', async () => {
      vi.mock('puppeteer', () => ({
        default: {
          launch: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              setContent: vi.fn(),
              pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
            }),
            close: vi.fn(),
          }),
        },
      }));

      const content = createMockContent();
      const options = createOptions({ filename: 'custom-export' });
      
      const result = await exporter.export(content, options);
      
      if (result.success) {
        expect(result.filename).toBe('custom-export.pdf');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling
  // ---------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle empty messages gracefully', () => {
      const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
        return (exporter as any).generateHTML(content, options);
      };

      const content = createMockContent({ messages: [] });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toBeDefined();
      expect(html).not.toContain('id="transcript"');
    });

    it('should handle empty decisions gracefully', () => {
      const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
        return (exporter as any).generateHTML(content, options);
      };

      const content = createMockContent({ decisions: [] });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toBeDefined();
      expect(html).not.toContain('id="decisions"');
    });

    it('should handle empty drafts gracefully', () => {
      const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
        return (exporter as any).generateHTML(content, options);
      };

      const content = createMockContent({ drafts: [] });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toBeDefined();
      expect(html).not.toContain('id="drafts"');
    });

    it('should escape HTML in content', () => {
      const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
        return (exporter as any).generateHTML(content, options);
      };

      const content = createMockContent({
        messages: [{
          id: 'msg-xss',
          timestamp: new Date(),
          agentId: 'test',
          type: 'argument',
          content: '<script>alert("xss")</script>',
        }],
      });
      const options = createOptions();
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  // ---------------------------------------------------------------------------
  // RTL Support
  // ---------------------------------------------------------------------------

  describe('RTL Support', () => {
    const generateHTML = (exporter: PDFExporter, content: SelectedContent, options: ExportOptions) => {
      return (exporter as any).generateHTML(content, options);
    };

    it('should use David font for Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain("'David'");
    });

    it('should use RTL margin directions for Hebrew', () => {
      const content = createMockContent();
      const options = createOptions({ language: 'he', style: 'detailed' });
      
      const html = generateHTML(exporter, content, options);
      
      expect(html).toContain('padding-right:');
    });
  });
});
