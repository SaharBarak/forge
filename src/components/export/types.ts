/**
 * Export Types for Enhanced Export System
 */

export type ExportFormat = 'md' | 'pdf' | 'docx' | 'html' | 'json';

export interface ContentSection {
  id: string;
  name: string;
  nameHe: string;
  enabled: boolean;
  description?: string;
}

export interface ExportOptions {
  // Format
  format: ExportFormat;
  
  // Content sections to include
  sections: {
    transcript: boolean;
    decisions: boolean;
    proposals: boolean;
    drafts: boolean;
    summary: boolean;
    timeline: boolean;
  };
  
  // Document structure
  structure: {
    coverPage: boolean;
    tableOfContents: boolean;
    appendix: boolean;
    pageNumbers: boolean;
  };
  
  // Styling
  style: {
    template: ExportTemplate;
    primaryColor: string;
    includeLogo: boolean;
    logoUrl?: string;
    fontFamily: ExportFont;
  };
  
  // Metadata
  metadata: {
    includeMetadata: boolean;
    includeTimestamps: boolean;
    includeAgentAvatars: boolean;
  };
}

export type ExportTemplate = 'minimal' | 'professional' | 'creative' | 'academic';

export type ExportFont = 'inter' | 'georgia' | 'arial' | 'times' | 'courier';

export const FORMAT_INFO: Record<ExportFormat, { 
  label: string; 
  labelHe: string; 
  icon: string;
  extension: string;
  description: string;
}> = {
  md: { 
    label: 'Markdown', 
    labelHe: 'מארקדאון',
    icon: '📝',
    extension: '.md',
    description: 'Plain text with formatting',
  },
  pdf: { 
    label: 'PDF', 
    labelHe: 'PDF',
    icon: '📄',
    extension: '.pdf',
    description: 'Print-ready document',
  },
  docx: { 
    label: 'Word Document', 
    labelHe: 'מסמך וורד',
    icon: '📘',
    extension: '.docx',
    description: 'Editable in Microsoft Word',
  },
  html: { 
    label: 'HTML', 
    labelHe: 'HTML',
    icon: '🌐',
    extension: '.html',
    description: 'Web page format',
  },
  json: { 
    label: 'JSON', 
    labelHe: 'JSON',
    icon: '📊',
    extension: '.json',
    description: 'Structured data format',
  },
};

export const TEMPLATE_INFO: Record<ExportTemplate, {
  label: string;
  labelHe: string;
  description: string;
}> = {
  minimal: {
    label: 'Minimal',
    labelHe: 'מינימלי',
    description: 'Clean and simple',
  },
  professional: {
    label: 'Professional',
    labelHe: 'מקצועי',
    description: 'Business-ready',
  },
  creative: {
    label: 'Creative',
    labelHe: 'יצירתי',
    description: 'Bold and colorful',
  },
  academic: {
    label: 'Academic',
    labelHe: 'אקדמי',
    description: 'Formal citations',
  },
};

export const FONT_INFO: Record<ExportFont, {
  label: string;
  family: string;
}> = {
  inter: { label: 'Inter', family: 'Inter, sans-serif' },
  georgia: { label: 'Georgia', family: 'Georgia, serif' },
  arial: { label: 'Arial', family: 'Arial, sans-serif' },
  times: { label: 'Times New Roman', family: '"Times New Roman", serif' },
  courier: { label: 'Courier', family: '"Courier New", monospace' },
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'md',
  sections: {
    transcript: true,
    decisions: true,
    proposals: true,
    drafts: true,
    summary: false,
    timeline: false,
  },
  structure: {
    coverPage: true,
    tableOfContents: false,
    appendix: false,
    pageNumbers: true,
  },
  style: {
    template: 'professional',
    primaryColor: '#3b82f6',
    includeLogo: false,
    fontFamily: 'inter',
  },
  metadata: {
    includeMetadata: true,
    includeTimestamps: true,
    includeAgentAvatars: true,
  },
};
