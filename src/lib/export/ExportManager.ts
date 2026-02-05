/**
 * ExportManager - Orchestrates session exports with format-specific exporters
 * 
 * Central registry and coordinator for all export formats.
 * Handles exporter selection, content filtering, and export execution.
 */

import type { Session } from '../../types';
import type { 
  ExportFormat, 
  ExportOptions, 
  ExportResult, 
  IExporter,
  SelectedContent,
  DEFAULT_EXPORT_OPTIONS,
} from './types';
import { ContentSelector } from './ContentSelector';
import { MarkdownExporter } from './MarkdownExporter';
import { JSONExporter } from './JSONExporter';

/**
 * ExportManager - Central export orchestration
 */
export class ExportManager {
  private exporters: Map<ExportFormat, IExporter> = new Map();
  private contentSelector: ContentSelector;

  constructor() {
    this.contentSelector = new ContentSelector();
    
    // Register built-in exporters
    this.registerExporter(new MarkdownExporter());
    this.registerExporter(new JSONExporter());
  }

  /**
   * Register an exporter for a format
   */
  registerExporter(exporter: IExporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  /**
   * Unregister an exporter
   */
  unregisterExporter(format: ExportFormat): boolean {
    return this.exporters.delete(format);
  }

  /**
   * Get registered exporter for a format
   */
  getExporter(format: ExportFormat): IExporter | undefined {
    return this.exporters.get(format);
  }

  /**
   * Get all supported formats
   */
  getSupportedFormats(): ExportFormat[] {
    return Array.from(this.exporters.keys());
  }

  /**
   * Check if a format is supported
   */
  supportsFormat(format: ExportFormat): boolean {
    return this.exporters.has(format);
  }

  /**
   * Export a session with the given options
   */
  async export(session: Session, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    // Merge with defaults
    const fullOptions = this.mergeWithDefaults(options);

    // Validate format
    const exporter = this.exporters.get(fullOptions.format);
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${fullOptions.format}. Supported: ${this.getSupportedFormats().join(', ')}`,
      };
    }

    // Check if exporter supports these options
    if (!exporter.supports(fullOptions)) {
      return {
        success: false,
        error: `Exporter does not support the given options`,
      };
    }

    try {
      // Select content based on options
      const content = this.contentSelector.select(session, fullOptions);

      // Validate content
      const validation = this.validateContent(content, fullOptions);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Execute export
      return await exporter.export(content, fullOptions);
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Export session content that's already been selected
   */
  async exportContent(content: SelectedContent, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    const fullOptions = this.mergeWithDefaults(options);

    const exporter = this.exporters.get(fullOptions.format);
    if (!exporter) {
      return {
        success: false,
        error: `Unsupported export format: ${fullOptions.format}`,
      };
    }

    try {
      return await exporter.export(content, fullOptions);
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Preview export (returns content without writing to file)
   */
  async preview(session: Session, options: Partial<ExportOptions> = {}): Promise<ExportResult> {
    // Preview is essentially the same as export but caller decides what to do with result
    return this.export(session, options);
  }

  /**
   * Get format info
   */
  getFormatInfo(format: ExportFormat): { mimeType: string; extension: string } | null {
    const exporter = this.exporters.get(format);
    if (!exporter) return null;

    return {
      mimeType: exporter.mimeType,
      extension: exporter.extension,
    };
  }

  /**
   * Merge options with defaults
   */
  private mergeWithDefaults(options: Partial<ExportOptions>): ExportOptions {
    return {
      format: options.format || 'md',
      contentTypes: options.contentTypes || ['transcript'],
      includeSystemMessages: options.includeSystemMessages ?? false,
      includeTimestamps: options.includeTimestamps ?? true,
      includeAgentMetadata: options.includeAgentMetadata ?? false,
      style: options.style || 'minimal',
      language: options.language || 'en',
      includeLogo: options.includeLogo ?? false,
      logoPath: options.logoPath,
      includeTableOfContents: options.includeTableOfContents ?? false,
      includeCoverPage: options.includeCoverPage ?? false,
      phases: options.phases,
      agents: options.agents,
      filename: options.filename,
      outputDir: options.outputDir,
    };
  }

  /**
   * Validate selected content
   */
  private validateContent(
    content: SelectedContent, 
    options: ExportOptions
  ): { valid: boolean; error?: string } {
    // Check if any content was selected
    const hasContent = 
      content.messages.length > 0 ||
      content.decisions.length > 0 ||
      content.drafts.length > 0 ||
      content.summary;

    if (!hasContent) {
      return {
        valid: false,
        error: 'No content selected for export. Adjust content type filters.',
      };
    }

    // Validate session metadata
    if (!content.session.id || !content.session.projectName) {
      return {
        valid: false,
        error: 'Session missing required metadata (id, projectName)',
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const exportManager = new ExportManager();
