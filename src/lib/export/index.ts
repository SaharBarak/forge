/**
 * Export Module - Session export infrastructure
 * 
 * Provides a unified API for exporting sessions to various formats.
 * 
 * @example
 * ```typescript
 * import { exportManager, ExportOptions } from './lib/export';
 * 
 * // Simple export
 * const result = await exportManager.export(session, { format: 'md' });
 * 
 * // Advanced export with options
 * const result = await exportManager.export(session, {
 *   format: 'json',
 *   contentTypes: ['transcript', 'decisions'],
 *   style: 'detailed',
 *   language: 'he',
 * });
 * ```
 */

// Types
export type {
  ExportFormat,
  ExportContentType,
  ExportStyle,
  ExportOptions,
  ExportResult,
  SelectedContent,
  IExporter,
  IContentSelector,
} from './types';

export { DEFAULT_EXPORT_OPTIONS } from './types';

// Core classes
export { BaseExporter } from './BaseExporter';
export { ContentSelector, contentSelector } from './ContentSelector';
export { ExportManager, exportManager } from './ExportManager';

// Built-in exporters
export { MarkdownExporter, markdownExporter } from './MarkdownExporter';
export { JSONExporter, jsonExporter } from './JSONExporter';
export { PDFExporter, pdfExporter } from './PDFExporter';
