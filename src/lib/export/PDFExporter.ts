// @ts-nocheck
/**
 * PDFExporter - Export sessions as PDF via Puppeteer
 * 
 * Features:
 * - HTML template system for PDF rendering
 * - Style templates (minimal, professional, detailed)
 * - Cover page and TOC generation
 * - Logo/branding support
 * - RTL support for Hebrew
 */

import type { ExportFormat, ExportOptions, ExportStyle, SelectedContent, ExportResult } from './types';
import type { Message, Decision, Draft } from '../../types';
import { BaseExporter } from './BaseExporter';

// Dynamic import for puppeteer to avoid issues in renderer process
let puppeteer: typeof import('puppeteer') | null = null;

async function getPuppeteer() {
  if (!puppeteer) {
    puppeteer = await import('puppeteer');
  }
  return puppeteer;
}

/**
 * PDF page margins
 */
interface PDFMargins {
  top: string;
  bottom: string;
  left: string;
  right: string;
}

/**
 * Style configuration for different presets
 */
interface StyleConfig {
  primaryColor: string;
  secondaryColor: string;
  headerBg: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  margins: PDFMargins;
}

const STYLE_CONFIGS: Record<ExportStyle, StyleConfig> = {
  minimal: {
    primaryColor: '#333333',
    secondaryColor: '#666666',
    headerBg: '#f8f9fa',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '11pt',
    lineHeight: '1.5',
    margins: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' },
  },
  professional: {
    primaryColor: '#1a365d',
    secondaryColor: '#4a5568',
    headerBg: '#edf2f7',
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontSize: '11pt',
    lineHeight: '1.6',
    margins: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
  },
  detailed: {
    primaryColor: '#2c5282',
    secondaryColor: '#4a5568',
    headerBg: '#e2e8f0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '10pt',
    lineHeight: '1.5',
    margins: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
  },
};

export class PDFExporter extends BaseExporter {
  readonly format: ExportFormat = 'pdf';
  readonly mimeType = 'application/pdf';
  readonly extension = 'pdf';

  async export(content: SelectedContent, options: ExportOptions): Promise<ExportResult> {
    try {
      const pup = await getPuppeteer();
      
      // Generate HTML
      const html = this.generateHTML(content, options);
      
      // Launch browser and generate PDF
      const browser = await pup.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      try {
        const page = await browser.newPage();
        
        // Set content
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Get style config
        const styleConfig = STYLE_CONFIGS[options.style || 'minimal'];

        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: styleConfig.margins,
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: this.getHeaderTemplate(content, options),
          footerTemplate: this.getFooterTemplate(options),
        });

        // Convert buffer to base64
        const base64Content = Buffer.from(pdfBuffer).toString('base64');
        const filename = this.generateFilename(content, options);

        return this.success(base64Content, filename);
      } finally {
        await browser.close();
      }
    } catch (error) {
      return this.error(`PDF export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate complete HTML document
   */
  private generateHTML(content: SelectedContent, options: ExportOptions): string {
    const isHebrew = options.language === 'he';
    const styleConfig = STYLE_CONFIGS[options.style || 'minimal'];

    const sections: string[] = [];

    // Cover page
    if (options.includeCoverPage) {
      sections.push(this.renderCoverPage(content, options, styleConfig));
    }

    // Table of contents
    if (options.includeTableOfContents) {
      sections.push(this.renderTableOfContents(content, options));
    }

    // Summary
    if (content.summary) {
      sections.push(this.renderSummary(content.summary, options));
    }

    // Transcript
    if (content.messages.length > 0) {
      sections.push(this.renderTranscript(content.messages, options));
    }

    // Decisions
    if (content.decisions.length > 0) {
      sections.push(this.renderDecisions(content.decisions, options));
    }

    // Drafts
    if (content.drafts.length > 0) {
      sections.push(this.renderDrafts(content.drafts, options));
    }

    return `<!DOCTYPE html>
<html lang="${isHebrew ? 'he' : 'en'}" dir="${isHebrew ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(content.session.projectName)}</title>
  <style>
    ${this.getBaseStyles(styleConfig, isHebrew)}
  </style>
</head>
<body>
  ${!options.includeCoverPage ? this.renderSimpleHeader(content, options, styleConfig) : ''}
  ${sections.join('\n')}
</body>
</html>`;
  }

  /**
   * Get base CSS styles
   */
  private getBaseStyles(config: StyleConfig, isHebrew: boolean): string {
    const fontStack = isHebrew 
      ? "'David', 'Segoe UI', 'Arial Hebrew', Arial, sans-serif"
      : config.fontFamily;

    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: ${fontStack};
        font-size: ${config.fontSize};
        line-height: ${config.lineHeight};
        color: ${config.primaryColor};
        direction: ${isHebrew ? 'rtl' : 'ltr'};
      }

      .cover-page {
        page-break-after: always;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 90vh;
        text-align: center;
        padding: 2rem;
      }

      .cover-logo {
        max-width: 200px;
        max-height: 100px;
        margin-bottom: 2rem;
      }

      .cover-title {
        font-size: 2.5rem;
        color: ${config.primaryColor};
        margin-bottom: 1rem;
        font-weight: bold;
      }

      .cover-goal {
        font-size: 1.25rem;
        color: ${config.secondaryColor};
        margin-bottom: 2rem;
        max-width: 600px;
      }

      .cover-meta {
        font-size: 0.9rem;
        color: ${config.secondaryColor};
        margin-top: auto;
      }

      .simple-header {
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid ${config.primaryColor};
      }

      .simple-header h1 {
        font-size: 1.75rem;
        color: ${config.primaryColor};
        margin-bottom: 0.5rem;
      }

      .simple-header .meta {
        font-size: 0.9rem;
        color: ${config.secondaryColor};
      }

      .toc {
        page-break-after: always;
        padding: 2rem;
      }

      .toc h2 {
        font-size: 1.5rem;
        color: ${config.primaryColor};
        margin-bottom: 1.5rem;
        border-bottom: 2px solid ${config.headerBg};
        padding-bottom: 0.5rem;
      }

      .toc-item {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0.5rem 0;
        border-bottom: 1px dotted ${config.headerBg};
      }

      .toc-title {
        color: ${config.primaryColor};
      }

      .toc-page {
        color: ${config.secondaryColor};
      }

      section {
        margin-bottom: 2rem;
      }

      section h2 {
        font-size: 1.5rem;
        color: ${config.primaryColor};
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid ${config.headerBg};
      }

      .message {
        margin-bottom: 1.5rem;
        padding: 1rem;
        background: ${config.headerBg};
        border-radius: 4px;
        page-break-inside: avoid;
      }

      .message-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .message-agent {
        font-weight: bold;
        color: ${config.primaryColor};
      }

      .message-time {
        font-size: 0.85rem;
        color: ${config.secondaryColor};
      }

      .message-content {
        color: ${config.primaryColor};
        white-space: pre-wrap;
      }

      .decision {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border: 1px solid ${config.headerBg};
        border-left: 4px solid ${config.primaryColor};
        border-radius: 4px;
        page-break-inside: avoid;
      }

      .decision h3 {
        color: ${config.primaryColor};
        margin-bottom: 0.75rem;
      }

      .decision-outcome {
        background: ${config.headerBg};
        padding: 0.75rem;
        border-radius: 4px;
        margin-bottom: 0.75rem;
      }

      .decision-outcome strong {
        color: ${config.primaryColor};
      }

      .decision-reasoning {
        font-style: italic;
        color: ${config.secondaryColor};
      }

      .options-list {
        margin-top: 1rem;
        padding-${isHebrew ? 'right' : 'left'}: 1.5rem;
      }

      .option-item {
        margin-bottom: 0.5rem;
      }

      .option-title {
        font-weight: bold;
      }

      .pros-cons {
        font-size: 0.9rem;
        color: ${config.secondaryColor};
        margin-${isHebrew ? 'right' : 'left'}: 1rem;
      }

      .pros { color: #38a169; }
      .cons { color: #e53e3e; }

      .votes {
        margin-top: 1rem;
        font-size: 0.9rem;
      }

      .vote-item {
        display: inline-block;
        margin-${isHebrew ? 'left' : 'right'}: 1rem;
        padding: 0.25rem 0.5rem;
        background: ${config.headerBg};
        border-radius: 4px;
      }

      .draft {
        margin-bottom: 1.5rem;
        padding: 1rem;
        border: 1px solid ${config.headerBg};
        border-radius: 4px;
        page-break-inside: avoid;
      }

      .draft-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }

      .draft h3 {
        color: ${config.primaryColor};
      }

      .draft-status {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: bold;
      }

      .status-approved { background: #c6f6d5; color: #276749; }
      .status-rejected { background: #fed7d7; color: #c53030; }
      .status-review { background: #feebc8; color: #c05621; }
      .status-draft { background: ${config.headerBg}; color: ${config.secondaryColor}; }

      .draft-content {
        white-space: pre-wrap;
        background: #fff;
        padding: 1rem;
        border: 1px solid ${config.headerBg};
        border-radius: 4px;
      }

      .feedback-section {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid ${config.headerBg};
      }

      .feedback-item {
        margin-bottom: 0.75rem;
        padding: 0.75rem;
        background: ${config.headerBg};
        border-radius: 4px;
      }

      .feedback-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
      }

      .feedback-agent {
        font-weight: bold;
      }

      .feedback-rating {
        color: #ecc94b;
      }

      .summary-content {
        padding: 1rem;
        background: ${config.headerBg};
        border-radius: 4px;
        font-style: italic;
      }
    `;
  }

  /**
   * Render cover page
   */
  private renderCoverPage(
    content: SelectedContent, 
    options: ExportOptions, 
    styleConfig: StyleConfig
  ): string {
    const isHebrew = options.language === 'he';
    const startDate = this.formatTimestamp(content.session.startedAt, { ...options, includeTimestamps: true });

    let logoHtml = '';
    if (options.includeLogo && options.logoPath) {
      logoHtml = `<img src="${this.escapeHtml(options.logoPath)}" alt="Logo" class="cover-logo" />`;
    }

    return `
      <div class="cover-page">
        ${logoHtml}
        <h1 class="cover-title">${this.escapeHtml(content.session.projectName)}</h1>
        <p class="cover-goal">${this.escapeHtml(content.session.goal)}</p>
        <div class="cover-meta">
          <p><strong>${isHebrew ? 'מצב' : 'Mode'}:</strong> ${content.session.mode || 'Standard'}</p>
          <p><strong>${isHebrew ? 'שלב' : 'Phase'}:</strong> ${content.session.currentPhase}</p>
          <p><strong>${isHebrew ? 'תאריך' : 'Date'}:</strong> ${startDate}</p>
        </div>
      </div>
    `;
  }

  /**
   * Render simple header (when no cover page)
   */
  private renderSimpleHeader(
    content: SelectedContent, 
    options: ExportOptions,
    styleConfig: StyleConfig
  ): string {
    const isHebrew = options.language === 'he';
    const startDate = options.includeTimestamps 
      ? this.formatTimestamp(content.session.startedAt, options) 
      : '';

    return `
      <div class="simple-header">
        <h1>${this.escapeHtml(content.session.projectName)}</h1>
        <div class="meta">
          <span>${this.escapeHtml(content.session.goal)}</span>
          ${startDate ? ` | <span>${startDate}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render table of contents
   */
  private renderTableOfContents(content: SelectedContent, options: ExportOptions): string {
    const isHebrew = options.language === 'he';
    const items: Array<{ title: string; count?: number }> = [];

    if (content.summary) {
      items.push({ title: isHebrew ? 'סיכום' : 'Summary' });
    }
    if (content.messages.length > 0) {
      items.push({ title: isHebrew ? 'תמליל' : 'Transcript', count: content.messages.length });
    }
    if (content.decisions.length > 0) {
      items.push({ title: isHebrew ? 'החלטות' : 'Decisions', count: content.decisions.length });
    }
    if (content.drafts.length > 0) {
      items.push({ title: isHebrew ? 'טיוטות' : 'Drafts', count: content.drafts.length });
    }

    const tocItems = items.map(item => `
      <div class="toc-item">
        <span class="toc-title">${item.title}</span>
        <span class="toc-page">${item.count !== undefined ? `(${item.count})` : ''}</span>
      </div>
    `).join('');

    return `
      <div class="toc">
        <h2>${isHebrew ? 'תוכן עניינים' : 'Table of Contents'}</h2>
        ${tocItems}
      </div>
    `;
  }

  /**
   * Render summary section
   */
  private renderSummary(summary: string, options: ExportOptions): string {
    const isHebrew = options.language === 'he';

    return `
      <section id="summary">
        <h2>${isHebrew ? 'סיכום' : 'Summary'}</h2>
        <div class="summary-content">${this.escapeHtml(summary)}</div>
      </section>
    `;
  }

  /**
   * Render transcript section
   */
  private renderTranscript(messages: Message[], options: ExportOptions): string {
    const isHebrew = options.language === 'he';

    const messageHtml = messages.map(msg => this.renderMessage(msg, options)).join('');

    return `
      <section id="transcript">
        <h2>${isHebrew ? 'תמליל' : 'Transcript'}</h2>
        ${messageHtml}
      </section>
    `;
  }

  /**
   * Render a single message
   */
  private renderMessage(message: Message, options: ExportOptions): string {
    const agentName = this.getAgentName(message.agentId, options);
    const timestamp = options.includeTimestamps 
      ? this.formatTimestamp(message.timestamp, options) 
      : '';
    
    const content = options.language === 'he' && message.contentHe
      ? message.contentHe
      : message.content;

    return `
      <div class="message">
        <div class="message-header">
          <span class="message-agent">${this.escapeHtml(agentName)}</span>
          ${timestamp ? `<span class="message-time">${timestamp}</span>` : ''}
        </div>
        <div class="message-content">${this.escapeHtml(content)}</div>
      </div>
    `;
  }

  /**
   * Render decisions section
   */
  private renderDecisions(decisions: Decision[], options: ExportOptions): string {
    const isHebrew = options.language === 'he';

    const decisionHtml = decisions.map(dec => this.renderDecision(dec, options)).join('');

    return `
      <section id="decisions">
        <h2>${isHebrew ? 'החלטות' : 'Decisions'}</h2>
        ${decisionHtml}
      </section>
    `;
  }

  /**
   * Render a single decision
   */
  private renderDecision(decision: Decision, options: ExportOptions): string {
    const isHebrew = options.language === 'he';
    const topic = isHebrew && decision.topicHe ? decision.topicHe : decision.topic;

    let outcomeHtml = '';
    if (decision.outcome) {
      outcomeHtml = `
        <div class="decision-outcome">
          <strong>${isHebrew ? 'תוצאה' : 'Outcome'}:</strong> ${this.escapeHtml(decision.outcome)}
        </div>
      `;
    }

    let optionsHtml = '';
    if (options.style === 'detailed' && decision.options.length > 0) {
      const optionItems = decision.options.map(opt => {
        const desc = isHebrew && opt.descriptionHe ? opt.descriptionHe : opt.description;
        const prosText = opt.pros.length > 0 ? `<span class="pros">+ ${opt.pros.join(', ')}</span>` : '';
        const consText = opt.cons.length > 0 ? `<span class="cons">- ${opt.cons.join(', ')}</span>` : '';
        
        return `
          <div class="option-item">
            <span class="option-title">${this.escapeHtml(desc)}</span>
            <div class="pros-cons">${prosText} ${consText}</div>
          </div>
        `;
      }).join('');

      optionsHtml = `
        <div class="options-list">
          <strong>${isHebrew ? 'אפשרויות' : 'Options'}:</strong>
          ${optionItems}
        </div>
      `;
    }

    let votesHtml = '';
    if (options.style === 'detailed' && decision.votes.length > 0) {
      const voteItems = decision.votes.map(vote => {
        const agentName = this.getAgentName(vote.agentId, options);
        return `<span class="vote-item">${this.escapeHtml(agentName)}: ${vote.confidence}%</span>`;
      }).join('');

      votesHtml = `
        <div class="votes">
          <strong>${isHebrew ? 'הצבעות' : 'Votes'}:</strong> ${voteItems}
        </div>
      `;
    }

    return `
      <div class="decision">
        <h3>${this.escapeHtml(topic)}</h3>
        ${outcomeHtml}
        <p class="decision-reasoning">
          <strong>${isHebrew ? 'נימוק' : 'Reasoning'}:</strong> ${this.escapeHtml(decision.reasoning)}
        </p>
        ${optionsHtml}
        ${votesHtml}
      </div>
    `;
  }

  /**
   * Render drafts section
   */
  private renderDrafts(drafts: Draft[], options: ExportOptions): string {
    const isHebrew = options.language === 'he';

    const draftHtml = drafts.map(draft => this.renderDraft(draft, options)).join('');

    return `
      <section id="drafts">
        <h2>${isHebrew ? 'טיוטות' : 'Drafts'}</h2>
        ${draftHtml}
      </section>
    `;
  }

  /**
   * Render a single draft
   */
  private renderDraft(draft: Draft, options: ExportOptions): string {
    const isHebrew = options.language === 'he';
    const title = isHebrew && draft.content.titleHe
      ? draft.content.titleHe
      : draft.content.title || draft.section;

    const statusClass = `status-${draft.status}`;
    const statusText = draft.status.charAt(0).toUpperCase() + draft.status.slice(1);

    const body = isHebrew && draft.content.bodyHe
      ? draft.content.bodyHe
      : draft.content.body;

    let feedbackHtml = '';
    if (options.style === 'detailed' && draft.feedback.length > 0) {
      const feedbackItems = draft.feedback.map(fb => {
        const agentName = this.getAgentName(fb.agentId, options);
        const stars = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);

        return `
          <div class="feedback-item">
            <div class="feedback-header">
              <span class="feedback-agent">${this.escapeHtml(agentName)}</span>
              <span class="feedback-rating">${stars}</span>
            </div>
            <p>${this.escapeHtml(fb.comments)}</p>
            ${fb.suggestions.length > 0 ? `<p><em>${isHebrew ? 'הצעות' : 'Suggestions'}: ${fb.suggestions.join('; ')}</em></p>` : ''}
          </div>
        `;
      }).join('');

      feedbackHtml = `
        <div class="feedback-section">
          <strong>${isHebrew ? 'משוב' : 'Feedback'}:</strong>
          ${feedbackItems}
        </div>
      `;
    }

    return `
      <div class="draft">
        <div class="draft-header">
          <h3>${this.escapeHtml(title)} (v${draft.version})</h3>
          <span class="draft-status ${statusClass}">${statusText}</span>
        </div>
        ${body ? `<div class="draft-content">${this.escapeHtml(body)}</div>` : ''}
        ${feedbackHtml}
      </div>
    `;
  }

  /**
   * Get header template for PDF pages
   */
  private getHeaderTemplate(content: SelectedContent, options: ExportOptions): string {
    const styleConfig = STYLE_CONFIGS[options.style || 'minimal'];
    
    return `
      <div style="
        width: 100%;
        font-size: 9px;
        padding: 5px 15px;
        color: ${styleConfig.secondaryColor};
        border-bottom: 1px solid ${styleConfig.headerBg};
      ">
        <span>${this.escapeHtml(content.session.projectName)}</span>
      </div>
    `;
  }

  /**
   * Get footer template for PDF pages
   */
  private getFooterTemplate(options: ExportOptions): string {
    const isHebrew = options.language === 'he';
    const styleConfig = STYLE_CONFIGS[options.style || 'minimal'];

    return `
      <div style="
        width: 100%;
        font-size: 9px;
        padding: 5px 15px;
        color: ${styleConfig.secondaryColor};
        border-top: 1px solid ${styleConfig.headerBg};
        display: flex;
        justify-content: space-between;
      ">
        <span>${isHebrew ? 'נוצר עם Forge' : 'Generated by Forge'}</span>
        <span>${isHebrew ? 'עמוד' : 'Page'} <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
  }
}

// Export singleton
export const pdfExporter = new PDFExporter();
