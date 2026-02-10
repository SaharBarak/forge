// @ts-nocheck
/**
 * DOCXExporter - Export sessions as Word documents using docx library
 * 
 * Features:
 * - Style templates (minimal, professional, detailed)
 * - Cover page and TOC generation
 * - Structure mapping (decisions → headings)
 * - RTL support for Hebrew
 * - Compatible with Word/Google Docs
 */

import type { ExportFormat, ExportOptions, ExportStyle, SelectedContent, ExportResult } from './types';
import type { Message, Decision, Draft } from '../../types';
import { BaseExporter } from './BaseExporter';

// Dynamic import for docx to avoid bundling issues
let docxModule: typeof import('docx') | null = null;

async function getDocx() {
  if (!docxModule) {
    docxModule = await import('docx');
  }
  return docxModule;
}

/**
 * Style configuration for different presets
 */
interface StyleConfig {
  primaryColor: string;
  secondaryColor: string;
  headerColor: string;
  titleFontSize: number;
  headingFontSize: number;
  bodyFontSize: number;
  fontFamily: string;
  lineSpacing: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

const STYLE_CONFIGS: Record<ExportStyle, StyleConfig> = {
  minimal: {
    primaryColor: '333333',
    secondaryColor: '666666',
    headerColor: '333333',
    titleFontSize: 28,
    headingFontSize: 14,
    bodyFontSize: 11,
    fontFamily: 'Arial',
    lineSpacing: 276, // 1.15 line spacing (240 * 1.15)
    margins: {
      top: 720,    // 0.5 inch in twips (1440 twips = 1 inch)
      bottom: 720,
      left: 720,
      right: 720,
    },
  },
  professional: {
    primaryColor: '1a365d',
    secondaryColor: '4a5568',
    headerColor: '1a365d',
    titleFontSize: 32,
    headingFontSize: 16,
    bodyFontSize: 11,
    fontFamily: 'Times New Roman',
    lineSpacing: 360, // 1.5 line spacing
    margins: {
      top: 1080,   // 0.75 inch
      bottom: 1080,
      left: 1080,
      right: 1080,
    },
  },
  detailed: {
    primaryColor: '2c5282',
    secondaryColor: '4a5568',
    headerColor: '2c5282',
    titleFontSize: 30,
    headingFontSize: 14,
    bodyFontSize: 10,
    fontFamily: 'Calibri',
    lineSpacing: 276, // 1.15 line spacing
    margins: {
      top: 1080,
      bottom: 1080,
      left: 1080,
      right: 1080,
    },
  },
};

/**
 * Hebrew-compatible font family
 */
const HEBREW_FONT_FAMILY = 'David';

export class DOCXExporter extends BaseExporter {
  readonly format: ExportFormat = 'docx';
  readonly mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  readonly extension = 'docx';

  async export(content: SelectedContent, options: ExportOptions): Promise<ExportResult> {
    try {
      const docx = await getDocx();
      const style = STYLE_CONFIGS[options.style || 'minimal'];
      const isHebrew = options.language === 'he';
      const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;

      // Build document sections
      const sections: any[] = [];

      // Cover page
      if (options.includeCoverPage) {
        sections.push(...this.createCoverPage(content, options, style, docx));
      }

      // Table of contents
      if (options.includeTableOfContents) {
        sections.push(...this.createTableOfContents(content, options, style, docx));
      }

      // Main content
      sections.push(...this.createMainContent(content, options, style, docx));

      // Create document
      const doc = new docx.Document({
        styles: this.createStyles(style, isHebrew, docx),
        sections: [{
          properties: {
            page: {
              margin: style.margins,
            },
          },
          children: sections,
        }],
      });

      // Generate buffer
      const buffer = await docx.Packer.toBase64String(doc);
      const filename = this.generateFilename(content, options);

      return this.success(buffer, filename);
    } catch (error) {
      return this.error(`DOCX export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create document styles
   */
  private createStyles(
    style: StyleConfig, 
    isHebrew: boolean, 
    docx: typeof import('docx')
  ): any {
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    
    return {
      default: {
        document: {
          run: {
            font: fontFamily,
            size: style.bodyFontSize * 2, // docx uses half-points
          },
          paragraph: {
            spacing: {
              line: style.lineSpacing,
            },
            bidirectional: isHebrew,
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: fontFamily,
            size: style.titleFontSize * 2,
            bold: true,
            color: style.primaryColor,
          },
          paragraph: {
            spacing: { after: 400 },
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.headerColor,
          },
          paragraph: {
            spacing: { before: 400, after: 200 },
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: fontFamily,
            size: (style.headingFontSize - 2) * 2,
            bold: true,
            color: style.secondaryColor,
          },
          paragraph: {
            spacing: { before: 300, after: 150 },
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          },
        },
        {
          id: 'Quote',
          name: 'Quote',
          basedOn: 'Normal',
          run: {
            font: fontFamily,
            size: style.bodyFontSize * 2,
            italics: true,
            color: style.secondaryColor,
          },
          paragraph: {
            indent: { left: 720 }, // 0.5 inch indent
            spacing: { before: 100, after: 100 },
          },
        },
      ],
    };
  }

  /**
   * Create cover page
   */
  private createCoverPage(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // Add spacing at top
    elements.push(new docx.Paragraph({ spacing: { before: 2000 } }));

    // Title
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: content.session.projectName,
            font: fontFamily,
            size: style.titleFontSize * 2,
            bold: true,
            color: style.primaryColor,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Subtitle (goal)
    if (content.session.goal) {
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: content.session.goal,
              font: fontFamily,
              size: (style.headingFontSize - 2) * 2,
              color: style.secondaryColor,
            }),
          ],
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 800 },
        })
      );
    }

    // Mode badge
    if (content.session.mode) {
      const modeLabel = isHebrew ? this.getModeNameHe(content.session.mode) : content.session.mode;
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: modeLabel,
              font: fontFamily,
              size: style.bodyFontSize * 2,
              color: style.secondaryColor,
            }),
          ],
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 1200 },
        })
      );
    }

    // Date
    const dateLabel = isHebrew ? 'תאריך' : 'Date';
    const dateValue = new Date(content.session.startedAt).toLocaleDateString(
      isHebrew ? 'he-IL' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
    
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `${dateLabel}: ${dateValue}`,
            font: fontFamily,
            size: style.bodyFontSize * 2,
            color: style.secondaryColor,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Phase
    const phaseLabel = isHebrew ? 'שלב נוכחי' : 'Phase';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: `${phaseLabel}: ${content.session.currentPhase}`,
            font: fontFamily,
            size: style.bodyFontSize * 2,
            color: style.secondaryColor,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
      })
    );

    // Page break after cover
    elements.push(new docx.Paragraph({ pageBreakBefore: true }));

    return elements;
  }

  /**
   * Create table of contents
   */
  private createTableOfContents(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // TOC Header
    const tocTitle = isHebrew ? 'תוכן עניינים' : 'Table of Contents';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: tocTitle,
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.primaryColor,
          }),
        ],
        alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        spacing: { after: 400 },
      })
    );

    // TOC entries
    const tocEntries: { label: string; level: number }[] = [];

    // Add entries based on content
    if (content.messages.length > 0) {
      tocEntries.push({ label: isHebrew ? 'תמליל הדיון' : 'Discussion Transcript', level: 0 });
    }
    if (content.decisions.length > 0) {
      tocEntries.push({ label: isHebrew ? 'החלטות' : 'Decisions', level: 0 });
      content.decisions.forEach((d, i) => {
        const title = isHebrew && d.topicHe ? d.topicHe : d.topic;
        tocEntries.push({ label: `${i + 1}. ${title}`, level: 1 });
      });
    }
    if (content.drafts.length > 0) {
      tocEntries.push({ label: isHebrew ? 'טיוטות' : 'Drafts', level: 0 });
    }
    if (content.summary) {
      tocEntries.push({ label: isHebrew ? 'סיכום' : 'Summary', level: 0 });
    }

    tocEntries.forEach(entry => {
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: entry.label,
              font: fontFamily,
              size: style.bodyFontSize * 2,
              color: entry.level === 0 ? style.primaryColor : style.secondaryColor,
            }),
          ],
          indent: { left: entry.level * 360 }, // 0.25 inch per level
          spacing: { after: 100 },
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        })
      );
    });

    // Page break after TOC
    elements.push(new docx.Paragraph({ pageBreakBefore: true }));

    return elements;
  }

  /**
   * Create main content sections
   */
  private createMainContent(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const elements: any[] = [];

    // Transcript section
    if (content.messages.length > 0) {
      elements.push(...this.createTranscriptSection(content, options, style, docx));
    }

    // Decisions section
    if (content.decisions.length > 0) {
      elements.push(...this.createDecisionsSection(content, options, style, docx));
    }

    // Drafts section
    if (content.drafts.length > 0) {
      elements.push(...this.createDraftsSection(content, options, style, docx));
    }

    // Summary section
    if (content.summary) {
      elements.push(...this.createSummarySection(content, options, style, docx));
    }

    return elements;
  }

  /**
   * Create transcript section
   */
  private createTranscriptSection(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // Section header
    const title = isHebrew ? 'תמליל הדיון' : 'Discussion Transcript';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: title,
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.headerColor,
          }),
        ],
        heading: docx.HeadingLevel.HEADING_1,
        alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        spacing: { after: 300 },
      })
    );

    // Messages
    content.messages.forEach((message, index) => {
      const agentName = this.getAgentName(message.agentId, options);
      const timestamp = options.includeTimestamps ? this.formatTimestamp(message.timestamp, options) : '';

      // Agent name with optional timestamp
      const headerText = timestamp ? `${agentName} (${timestamp})` : agentName;
      
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: headerText,
              font: fontFamily,
              size: style.bodyFontSize * 2,
              bold: true,
              color: style.primaryColor,
            }),
          ],
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
        })
      );

      // Message content
      const messageContent = isHebrew && message.contentHe ? message.contentHe : message.content;
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: messageContent,
              font: fontFamily,
              size: style.bodyFontSize * 2,
            }),
          ],
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          spacing: { after: 200 },
          bidirectional: isHebrew,
        })
      );
    });

    return elements;
  }

  /**
   * Create decisions section
   */
  private createDecisionsSection(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // Add page break before decisions
    elements.push(new docx.Paragraph({ pageBreakBefore: true }));

    // Section header
    const title = isHebrew ? 'החלטות' : 'Decisions';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: title,
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.headerColor,
          }),
        ],
        heading: docx.HeadingLevel.HEADING_1,
        alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        spacing: { after: 300 },
      })
    );

    // Each decision
    content.decisions.forEach((decision, index) => {
      const topic = isHebrew && decision.topicHe ? decision.topicHe : decision.topic;
      
      // Decision heading (maps to H2)
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: `${index + 1}. ${topic}`,
              font: fontFamily,
              size: (style.headingFontSize - 2) * 2,
              bold: true,
              color: style.secondaryColor,
            }),
          ],
          heading: docx.HeadingLevel.HEADING_2,
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          spacing: { before: 300, after: 150 },
        })
      );

      // Decision body
      const body = isHebrew && decision.bodyHe ? decision.bodyHe : decision.body;
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: body,
              font: fontFamily,
              size: style.bodyFontSize * 2,
            }),
          ],
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          spacing: { after: 150 },
          bidirectional: isHebrew,
        })
      );

      // Confidence (if detailed style)
      if (options.style === 'detailed' && decision.confidence !== undefined) {
        const confidenceLabel = isHebrew ? 'רמת ביטחון' : 'Confidence';
        const confidencePercent = Math.round(decision.confidence * 100);
        
        elements.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `${confidenceLabel}: ${confidencePercent}%`,
                font: fontFamily,
                size: (style.bodyFontSize - 1) * 2,
                italics: true,
                color: style.secondaryColor,
              }),
            ],
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
            spacing: { after: 100 },
          })
        );
      }

      // Supporting agents (if metadata enabled)
      if (options.includeAgentMetadata && decision.supporters && decision.supporters.length > 0) {
        const supportLabel = isHebrew ? 'תומכים' : 'Supported by';
        const supporters = decision.supporters
          .map(id => this.getAgentName(id, options))
          .join(', ');
        
        elements.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `${supportLabel}: ${supporters}`,
                font: fontFamily,
                size: (style.bodyFontSize - 1) * 2,
                italics: true,
                color: style.secondaryColor,
              }),
            ],
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
            spacing: { after: 200 },
          })
        );
      }
    });

    return elements;
  }

  /**
   * Create drafts section
   */
  private createDraftsSection(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // Add page break before drafts
    elements.push(new docx.Paragraph({ pageBreakBefore: true }));

    // Section header
    const title = isHebrew ? 'טיוטות' : 'Drafts';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: title,
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.headerColor,
          }),
        ],
        heading: docx.HeadingLevel.HEADING_1,
        alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        spacing: { after: 300 },
      })
    );

    // Each draft
    content.drafts.forEach((draft, index) => {
      const draftTitle = isHebrew && draft.titleHe ? draft.titleHe : draft.title;
      
      // Draft heading
      elements.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: `${index + 1}. ${draftTitle}`,
              font: fontFamily,
              size: (style.headingFontSize - 2) * 2,
              bold: true,
              color: style.secondaryColor,
            }),
          ],
          heading: docx.HeadingLevel.HEADING_2,
          alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
          spacing: { before: 300, after: 150 },
        })
      );

      // Version info
      if (options.style !== 'minimal' && draft.version) {
        const versionLabel = isHebrew ? 'גרסה' : 'Version';
        elements.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: `${versionLabel}: ${draft.version}`,
                font: fontFamily,
                size: (style.bodyFontSize - 1) * 2,
                italics: true,
                color: style.secondaryColor,
              }),
            ],
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
            spacing: { after: 100 },
          })
        );
      }

      // Draft content
      const draftContent = isHebrew && draft.contentHe ? draft.contentHe : draft.content;
      
      // Split content by lines and create paragraphs
      const lines = draftContent.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          elements.push(
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: line,
                  font: fontFamily,
                  size: style.bodyFontSize * 2,
                }),
              ],
              alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
              bidirectional: isHebrew,
            })
          );
        } else {
          // Empty line
          elements.push(new docx.Paragraph({ spacing: { after: 100 } }));
        }
      });

      // Spacing after draft
      elements.push(new docx.Paragraph({ spacing: { after: 300 } }));
    });

    return elements;
  }

  /**
   * Create summary section
   */
  private createSummarySection(
    content: SelectedContent,
    options: ExportOptions,
    style: StyleConfig,
    docx: typeof import('docx')
  ): any[] {
    const isHebrew = options.language === 'he';
    const fontFamily = isHebrew ? HEBREW_FONT_FAMILY : style.fontFamily;
    const elements: any[] = [];

    // Add page break before summary
    elements.push(new docx.Paragraph({ pageBreakBefore: true }));

    // Section header
    const title = isHebrew ? 'סיכום' : 'Summary';
    elements.push(
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: title,
            font: fontFamily,
            size: style.headingFontSize * 2,
            bold: true,
            color: style.headerColor,
          }),
        ],
        heading: docx.HeadingLevel.HEADING_1,
        alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
        spacing: { after: 300 },
      })
    );

    // Summary content
    const summaryLines = content.summary!.split('\n');
    summaryLines.forEach(line => {
      if (line.trim()) {
        elements.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: line,
                font: fontFamily,
                size: style.bodyFontSize * 2,
              }),
            ],
            alignment: isHebrew ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
            bidirectional: isHebrew,
          })
        );
      } else {
        elements.push(new docx.Paragraph({ spacing: { after: 100 } }));
      }
    });

    return elements;
  }

  /**
   * Get Hebrew mode name
   */
  private getModeNameHe(mode: string): string {
    const modeNames: Record<string, string> = {
      debate: 'דיון',
      brainstorm: 'סיעור מוחות',
      critique: 'ביקורת',
      consensus: 'הסכמה',
    };
    return modeNames[mode] || mode;
  }
}

// Export singleton
export const docxExporter = new DOCXExporter();
