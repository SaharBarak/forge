/**
 * Templates Module - Session template gallery and management
 */

// Gallery components
export { TemplateGallery } from './TemplateGallery';
export { TemplateCard } from './TemplateCard';

// Manager components
export { TemplateManager } from './TemplateManager';
export { TemplateEditor } from './TemplateEditor';

// Types and utilities
export { 
  CATEGORY_LABELS, 
  TEMPLATE_DISPLAY_INFO, 
  getTemplateDisplayInfo,
  type FilterCategory,
} from './types';

export type { 
  TemplateCardProps, 
  TemplateGalleryProps, 
  TemplateDisplayInfo,
} from './types';

// Re-export core types from main types
export type { SessionTemplate, TemplateCategory, TemplateInfo } from '../../types';
