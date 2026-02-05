/**
 * MarkdownExporter - Export sessions as Markdown
 */

import type { ExportFormat, ExportOptions, SelectedContent, ExportResult } from './types';
import type { Message, Decision, Draft } from '../../types';
import { BaseExporter } from './BaseExporter';

export class MarkdownExporter extends BaseExporter {
  readonly format: ExportFormat = 'md';
  readonly mimeType = 'text/markdown';
  readonly extension = 'md';

  async export(content: SelectedContent, options: ExportOptions): Promise<ExportResult> {
    try {
      const lines: string[] = [];

      // Header
      lines.push(...this.renderHeader(content, options));

      // Summary
      if (content.summary) {
        lines.push(...this.renderSummary(content.summary, options));
      }

      // Transcript
      if (content.messages.length > 0) {
        lines.push(...this.renderTranscript(content.messages, options));
      }

      // Decisions
      if (content.decisions.length > 0) {
        lines.push(...this.renderDecisions(content.decisions, options));
      }

      // Drafts
      if (content.drafts.length > 0) {
        lines.push(...this.renderDrafts(content.drafts, options));
      }

      // Footer
      lines.push(...this.renderFooter(options));

      const markdown = lines.join('\n');
      const filename = this.generateFilename(content, options);

      return this.success(markdown, filename);
    } catch (error) {
      return this.error(`Markdown export failed: ${error}`);
    }
  }

  /**
   * Render document header
   */
  private renderHeader(content: SelectedContent, options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    // Title
    lines.push(`# ${content.session.projectName}`);
    lines.push('');

    // Metadata
    if (options.style !== 'minimal') {
      lines.push(`**${isHebrew ? 'מטרה' : 'Goal'}:** ${content.session.goal}`);
      
      if (content.session.mode) {
        lines.push(`**${isHebrew ? 'מצב' : 'Mode'}:** ${content.session.mode}`);
      }

      if (options.includeTimestamps) {
        const startDate = this.formatTimestamp(content.session.startedAt, options);
        lines.push(`**${isHebrew ? 'תאריך' : 'Date'}:** ${startDate}`);
      }

      lines.push(`**${isHebrew ? 'שלב' : 'Phase'}:** ${content.session.currentPhase}`);
      lines.push('');
    }

    // Horizontal rule
    lines.push('---');
    lines.push('');

    return lines;
  }

  /**
   * Render summary section
   */
  private renderSummary(summary: string, options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    lines.push(`## ${isHebrew ? 'סיכום' : 'Summary'}`);
    lines.push('');
    lines.push(summary);
    lines.push('');
    lines.push('---');
    lines.push('');

    return lines;
  }

  /**
   * Render transcript section
   */
  private renderTranscript(messages: Message[], options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    lines.push(`## ${isHebrew ? 'תמליל' : 'Transcript'}`);
    lines.push('');

    for (const message of messages) {
      lines.push(...this.renderMessage(message, options));
    }

    lines.push('---');
    lines.push('');

    return lines;
  }

  /**
   * Render a single message
   */
  private renderMessage(message: Message, options: ExportOptions): string[] {
    const lines: string[] = [];
    const agentName = this.getAgentName(message.agentId, options);

    // Message header with optional timestamp
    if (options.includeTimestamps) {
      const timestamp = this.formatTimestamp(message.timestamp, options);
      lines.push(`### ${agentName} *${timestamp}*`);
    } else {
      lines.push(`### ${agentName}`);
    }

    lines.push('');

    // Content
    const content = options.language === 'he' && message.contentHe
      ? message.contentHe
      : message.content;
    
    lines.push(content);
    lines.push('');

    // Metadata for detailed style
    if (options.style === 'detailed' && options.includeAgentMetadata) {
      lines.push(`> *Type: ${message.type}*`);
      if (message.replyTo) {
        lines.push(`> *Reply to: ${message.replyTo}*`);
      }
      lines.push('');
    }

    return lines;
  }

  /**
   * Render decisions section
   */
  private renderDecisions(decisions: Decision[], options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    lines.push(`## ${isHebrew ? 'החלטות' : 'Decisions'}`);
    lines.push('');

    for (const decision of decisions) {
      lines.push(...this.renderDecision(decision, options));
    }

    lines.push('---');
    lines.push('');

    return lines;
  }

  /**
   * Render a single decision
   */
  private renderDecision(decision: Decision, options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    const topic = isHebrew && decision.topicHe ? decision.topicHe : decision.topic;
    lines.push(`### ${topic}`);
    lines.push('');

    if (decision.outcome) {
      lines.push(`**${isHebrew ? 'תוצאה' : 'Outcome'}:** ${decision.outcome}`);
      lines.push('');
    }

    lines.push(`**${isHebrew ? 'נימוק' : 'Reasoning'}:** ${decision.reasoning}`);
    lines.push('');

    // Options with pros/cons for detailed style
    if (options.style === 'detailed' && decision.options.length > 0) {
      lines.push(`**${isHebrew ? 'אפשרויות' : 'Options'}:**`);
      lines.push('');

      for (const opt of decision.options) {
        const desc = isHebrew && opt.descriptionHe ? opt.descriptionHe : opt.description;
        lines.push(`- **${desc}**`);
        if (opt.pros.length > 0) {
          lines.push(`  - ${isHebrew ? 'יתרונות' : 'Pros'}: ${opt.pros.join(', ')}`);
        }
        if (opt.cons.length > 0) {
          lines.push(`  - ${isHebrew ? 'חסרונות' : 'Cons'}: ${opt.cons.join(', ')}`);
        }
      }
      lines.push('');
    }

    // Votes for detailed style
    if (options.style === 'detailed' && decision.votes.length > 0) {
      lines.push(`**${isHebrew ? 'הצבעות' : 'Votes'}:**`);
      for (const vote of decision.votes) {
        const agentName = this.getAgentName(vote.agentId, options);
        lines.push(`- ${agentName}: ${vote.confidence}% confidence`);
      }
      lines.push('');
    }

    return lines;
  }

  /**
   * Render drafts section
   */
  private renderDrafts(drafts: Draft[], options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    lines.push(`## ${isHebrew ? 'טיוטות' : 'Drafts'}`);
    lines.push('');

    for (const draft of drafts) {
      lines.push(...this.renderDraft(draft, options));
    }

    lines.push('---');
    lines.push('');

    return lines;
  }

  /**
   * Render a single draft
   */
  private renderDraft(draft: Draft, options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    const title = isHebrew && draft.content.titleHe
      ? draft.content.titleHe
      : draft.content.title || draft.section;

    lines.push(`### ${title} (v${draft.version})`);
    lines.push('');

    // Status badge
    const statusBadge = draft.status === 'approved' ? '✅' :
                        draft.status === 'rejected' ? '❌' :
                        draft.status === 'review' ? '👀' : '📝';
    lines.push(`*${statusBadge} ${draft.status}*`);
    lines.push('');

    // Content
    const body = isHebrew && draft.content.bodyHe
      ? draft.content.bodyHe
      : draft.content.body;

    if (body) {
      lines.push(body);
      lines.push('');
    }

    // Feedback for detailed style
    if (options.style === 'detailed' && draft.feedback.length > 0) {
      lines.push(`**${isHebrew ? 'משוב' : 'Feedback'}:**`);
      lines.push('');

      for (const fb of draft.feedback) {
        const agentName = this.getAgentName(fb.agentId, options);
        lines.push(`> **${agentName}** (${fb.rating}/5)`);
        lines.push(`> ${fb.comments}`);
        if (fb.suggestions.length > 0) {
          lines.push(`> Suggestions: ${fb.suggestions.join('; ')}`);
        }
        lines.push('');
      }
    }

    return lines;
  }

  /**
   * Render document footer
   */
  private renderFooter(options: ExportOptions): string[] {
    const lines: string[] = [];
    const isHebrew = options.language === 'he';

    if (options.style !== 'minimal') {
      lines.push('');
      const exportDate = new Date().toLocaleString(isHebrew ? 'he-IL' : 'en-US');
      lines.push(`*${isHebrew ? 'יוצא ב' : 'Exported on'} ${exportDate} ${isHebrew ? 'באמצעות Forge' : 'via Forge'}*`);
    }

    return lines;
  }
}

// Export singleton
export const markdownExporter = new MarkdownExporter();
