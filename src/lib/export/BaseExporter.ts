/**
 * BaseExporter - Abstract base class for all exporters
 */

import type { ExportFormat, ExportOptions, SelectedContent, ExportResult, IExporter } from './types';
import { getAgentById } from '../../agents/personas';

export abstract class BaseExporter implements IExporter {
  abstract readonly format: ExportFormat;
  abstract readonly mimeType: string;
  abstract readonly extension: string;

  /**
   * Export content - must be implemented by subclasses
   */
  abstract export(content: SelectedContent, options: ExportOptions): Promise<ExportResult>;

  /**
   * Check if this exporter supports the given options
   */
  supports(options: ExportOptions): boolean {
    return options.format === this.format;
  }

  /**
   * Generate filename with appropriate extension
   */
  protected generateFilename(content: SelectedContent, options: ExportOptions): string {
    if (options.filename) {
      return options.filename.endsWith(`.${this.extension}`)
        ? options.filename
        : `${options.filename}.${this.extension}`;
    }

    const safeName = content.session.projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    const timestamp = new Date().toISOString().slice(0, 10);

    return `${safeName}-${timestamp}.${this.extension}`;
  }

  /**
   * Format timestamp for display
   */
  protected formatTimestamp(date: Date, options: ExportOptions): string {
    if (!options.includeTimestamps) return '';
    
    const d = new Date(date);
    return d.toLocaleString(options.language === 'he' ? 'he-IL' : 'en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  /**
   * Get agent display name
   */
  protected getAgentName(agentId: string, options: ExportOptions): string {
    if (agentId === 'human') {
      return options.language === 'he' ? 'אתה' : 'You';
    }
    if (agentId === 'system') {
      return options.language === 'he' ? 'מערכת' : 'System';
    }

    const agent = getAgentById(agentId);
    if (agent) {
      return options.language === 'he' ? agent.nameHe : agent.name;
    }

    return agentId;
  }

  /**
   * Get content type label
   */
  protected getContentTypeLabel(type: string, options: ExportOptions): string {
    const labels: Record<string, { en: string; he: string }> = {
      transcript: { en: 'Transcript', he: 'תמליל' },
      decisions: { en: 'Decisions', he: 'החלטות' },
      drafts: { en: 'Drafts', he: 'טיוטות' },
      summary: { en: 'Summary', he: 'סיכום' },
    };

    const label = labels[type];
    if (!label) return type;

    return options.language === 'he' ? label.he : label.en;
  }

  /**
   * Create success result
   */
  protected success(content: string, filename: string): ExportResult {
    return {
      success: true,
      content,
      filename,
      mimeType: this.mimeType,
    };
  }

  /**
   * Create error result
   */
  protected error(message: string): ExportResult {
    return {
      success: false,
      error: message,
    };
  }
}
