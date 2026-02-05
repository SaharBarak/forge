/**
 * Template UI Types
 * Extends core SessionTemplate types with UI-specific properties
 */

import type { SessionTemplate, TemplateCategory, TemplateInfo } from '../../types';

// Re-export core types for convenience
export type { SessionTemplate, TemplateCategory, TemplateInfo };

/**
 * Extended template info for gallery display
 */
export interface TemplateDisplayInfo {
  icon: string;
  color: string;
  estimatedDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface TemplateCardProps {
  template: SessionTemplate;
  displayInfo?: TemplateDisplayInfo;
  onSelect: (template: SessionTemplate) => void;
  isSelected?: boolean;
  hebrewMode?: boolean;
}

export interface TemplateGalleryProps {
  onSelectTemplate: (template: SessionTemplate | null) => void;
  onStartFresh: () => void;
  hebrewMode?: boolean;
}

/**
 * Category labels for UI display
 */
export const CATEGORY_LABELS: Record<TemplateCategory, { en: string; he: string }> = {
  copywriting: { en: 'Copywriting', he: 'קופירייטינג' },
  strategy: { en: 'Strategy', he: 'אסטרטגיה' },
  validation: { en: 'Validation', he: 'אימות' },
  custom: { en: 'Custom', he: 'מותאם אישית' },
  marketing: { en: 'Marketing', he: 'שיווק' },
  website: { en: 'Website', he: 'אתר' },
  social: { en: 'Social Media', he: 'רשתות חברתיות' },
  email: { en: 'Email', he: 'דוא"ל' },
  brand: { en: 'Branding', he: 'מיתוג' },
  product: { en: 'Product', he: 'מוצר' },
};

/**
 * Display metadata for built-in templates
 */
export const TEMPLATE_DISPLAY_INFO: Record<string, TemplateDisplayInfo> = {
  'landing-page': {
    icon: '🚀',
    color: '#3b82f6',
    estimatedDuration: '30-45 min',
    difficulty: 'intermediate',
    tags: ['landing', 'conversion', 'hero'],
  },
  'email-campaign': {
    icon: '✉️',
    color: '#8b5cf6',
    estimatedDuration: '40-60 min',
    difficulty: 'advanced',
    tags: ['email', 'automation', 'nurture'],
  },
  'product-description': {
    icon: '📦',
    color: '#10b981',
    estimatedDuration: '20-30 min',
    difficulty: 'beginner',
    tags: ['product', 'ecommerce', 'features'],
  },
  'social-media-series': {
    icon: '📱',
    color: '#ec4899',
    estimatedDuration: '35-50 min',
    difficulty: 'intermediate',
    tags: ['social', 'campaign', 'series'],
  },
  'brand-messaging': {
    icon: '🎯',
    color: '#f59e0b',
    estimatedDuration: '45-60 min',
    difficulty: 'advanced',
    tags: ['brand', 'messaging', 'workshop'],
  },
};

/**
 * Default display info for templates without specific metadata
 */
const DEFAULT_DISPLAY_INFO: TemplateDisplayInfo = {
  icon: '📄',
  color: '#6b7280',
  estimatedDuration: '30 min',
  difficulty: 'intermediate',
  tags: [],
};

/**
 * Get display info for a template
 */
export function getTemplateDisplayInfo(templateId: string): TemplateDisplayInfo {
  return TEMPLATE_DISPLAY_INFO[templateId] || DEFAULT_DISPLAY_INFO;
}
