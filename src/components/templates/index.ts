/**
 * Templates Module - Session template gallery and components
 */

export { TemplateGallery } from './TemplateGallery';
export { TemplateCard } from './TemplateCard';
export { CATEGORY_LABELS, TEMPLATE_DISPLAY_INFO, getTemplateDisplayInfo } from './types';
export type { TemplateCardProps, TemplateGalleryProps, TemplateDisplayInfo } from './types';

// Re-export core types from main types
export type { SessionTemplate, TemplateCategory, TemplateInfo } from '../../types';
