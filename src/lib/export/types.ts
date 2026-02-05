/**
 * Export Types - Interfaces for the export system
 */

import type { Session, Message, Decision, Draft } from '../../types';

/**
 * Available export formats
 */
export type ExportFormat = 'md' | 'json' | 'html' | 'pdf' | 'docx';

/**
 * Content types that can be exported
 */
export type ExportContentType = 'transcript' | 'decisions' | 'drafts' | 'summary' | 'full';

/**
 * Export style presets
 */
export type ExportStyle = 'minimal' | 'professional' | 'detailed';

/**
 * Export options for controlling what and how to export
 */
export interface ExportOptions {
  // Format selection
  format: ExportFormat;
  
  // Content selection
  contentTypes: ExportContentType[];
  
  // Filter options
  includeSystemMessages?: boolean;
  includeTimestamps?: boolean;
  includeAgentMetadata?: boolean;
  
  // Phase filtering
  phases?: string[];
  
  // Agent filtering
  agents?: string[];
  
  // Style
  style?: ExportStyle;
  
  // Localization
  language?: 'en' | 'he';
  
  // Branding
  includeLogo?: boolean;
  logoPath?: string;
  
  // PDF-specific
  includeTableOfContents?: boolean;
  includeCoverPage?: boolean;
  
  // Output
  filename?: string;
  outputDir?: string;
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'md',
  contentTypes: ['transcript'],
  includeSystemMessages: false,
  includeTimestamps: true,
  includeAgentMetadata: false,
  style: 'minimal',
  language: 'en',
  includeLogo: false,
  includeTableOfContents: false,
  includeCoverPage: false,
};

/**
 * Content selection result - filtered session data
 */
export interface SelectedContent {
  // Session metadata
  session: {
    id: string;
    projectName: string;
    goal: string;
    mode?: string;
    startedAt: Date;
    endedAt?: Date;
    currentPhase: string;
  };
  
  // Selected messages
  messages: Message[];
  
  // Selected decisions
  decisions: Decision[];
  
  // Selected drafts
  drafts: Draft[];
  
  // Summary (generated if requested)
  summary?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  content?: string;
  filename?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Exporter interface - all exporters must implement this
 */
export interface IExporter {
  /**
   * Format this exporter produces
   */
  readonly format: ExportFormat;
  
  /**
   * MIME type for the output
   */
  readonly mimeType: string;
  
  /**
   * File extension
   */
  readonly extension: string;
  
  /**
   * Export session content
   */
  export(content: SelectedContent, options: ExportOptions): Promise<ExportResult>;
  
  /**
   * Check if this exporter supports the given options
   */
  supports(options: ExportOptions): boolean;
}

/**
 * Content selector interface
 */
export interface IContentSelector {
  /**
   * Select content from a session based on options
   */
  select(session: Session, options: ExportOptions): SelectedContent;
}
