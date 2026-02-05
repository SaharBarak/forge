/**
 * Built-in Session Templates
 * 
 * These 5 starter templates cover common copywriting workflows:
 * 1. Landing Page Copy
 * 2. Email Campaign
 * 3. Product Description
 * 4. Social Media Series
 * 5. Brand Messaging Workshop
 */

import type { SessionTemplate } from '../../types';

export const BUILT_IN_TEMPLATES: SessionTemplate[] = [
  // ===========================================================================
  // 1. LANDING PAGE COPY
  // ===========================================================================
  {
    id: 'landing-page',
    name: 'Landing Page Copy',
    nameHe: 'טקסט לדף נחיתה',
    description: 'Create high-converting landing page copy with headline, subheadline, features, benefits, and CTA. Agents debate messaging hierarchy and persuasion tactics.',
    descriptionHe: 'צרו טקסט משכנע לדף נחיתה עם כותרת ראשית, יתרונות וקריאה לפעולה',
    category: 'copywriting',
    
    mode: 'copywrite',
    methodology: 'dialectic',
    consensusMethod: 'synthesis',
    defaultAgents: [],
    suggestedAgents: ['ronit', 'yossi', 'noa', 'avi', 'michal'],
    
    prompts: {
      goal: 'Create compelling landing page copy that converts visitors into [leads/customers/subscribers]. Focus on [main value proposition] for [target audience].',
      context: ['brand', 'audience', 'competitors'],
    },
    defaultGoal: 'Create a high-converting landing page that clearly communicates value proposition',
    defaultGoalHe: 'צרו דף נחיתה ממיר שמעביר בבהירות את הצעת הערך',
    
    suggestedExports: ['md', 'html'],
    
    // UI display properties
    icon: '🚀',
    color: '#3b82f6',
    tags: ['landing', 'conversion', 'hero'],
    estimatedDuration: '30-45 min',
    difficulty: 'intermediate',
    
    version: 1,
    builtIn: true,
  },

  // ===========================================================================
  // 2. EMAIL CAMPAIGN
  // ===========================================================================
  {
    id: 'email-campaign',
    name: 'Email Campaign',
    nameHe: 'קמפיין דוא"ל',
    description: 'Design a multi-email sequence with subject lines, preview text, body copy, and CTAs. Agents optimize for open rates, click-through, and conversions.',
    descriptionHe: 'עצבו רצף דוא"ל אוטומטי עם נושאים, תצוגה מקדימה וקריאה לפעולה',
    category: 'copywriting',
    
    mode: 'copywrite',
    methodology: 'collaborative',
    consensusMethod: 'consent',
    defaultAgents: [],
    suggestedAgents: ['ronit', 'yossi', 'avi'],
    
    prompts: {
      goal: 'Create a [3-5] email sequence for [campaign purpose: welcome, nurture, launch, re-engagement]. Target outcome: [specific conversion goal].',
      context: ['brand', 'audience'],
    },
    defaultGoal: 'Create a 5-email nurture sequence that builds trust and converts',
    defaultGoalHe: 'צרו רצף טיפוח של 5 מיילים שבונה אמון וממיר',
    
    suggestedExports: ['md', 'json'],
    
    // UI display properties
    icon: '✉️',
    color: '#8b5cf6',
    tags: ['email', 'automation', 'nurture', 'sequence'],
    estimatedDuration: '40-60 min',
    difficulty: 'advanced',
    
    version: 1,
    builtIn: true,
  },

  // ===========================================================================
  // 3. PRODUCT DESCRIPTION
  // ===========================================================================
  {
    id: 'product-description',
    name: 'Product Description',
    nameHe: 'תיאור מוצר',
    description: 'Craft compelling product descriptions that highlight features, benefits, and unique selling points. Agents balance technical accuracy with emotional appeal.',
    descriptionHe: 'כתבו תיאורי מוצר משכנעים שמדגישים תכונות ויתרונות',
    category: 'copywriting',
    
    mode: 'copywrite',
    methodology: 'socratic',
    consensusMethod: 'majority',
    defaultAgents: [],
    suggestedAgents: ['ronit', 'yossi', 'noa'],
    
    prompts: {
      goal: 'Write product descriptions for [product name/category] that drive [e-commerce purchases/inquiries/demos]. Emphasize [key differentiators].',
      context: ['brand', 'competitors', 'research'],
    },
    defaultGoal: 'Write product descriptions that convert browsers into buyers',
    defaultGoalHe: 'כתבו תיאורי מוצר שהופכים גולשים לקונים',
    
    suggestedExports: ['md', 'json'],
    
    // UI display properties
    icon: '📦',
    color: '#10b981',
    tags: ['product', 'ecommerce', 'features'],
    estimatedDuration: '20-30 min',
    difficulty: 'beginner',
    
    version: 1,
    builtIn: true,
  },

  // ===========================================================================
  // 4. SOCIAL MEDIA SERIES
  // ===========================================================================
  {
    id: 'social-media-series',
    name: 'Social Media Series',
    nameHe: 'סדרת רשתות חברתיות',
    description: 'Create a cohesive series of social media posts across platforms. Agents adapt messaging for each platform while maintaining brand consistency.',
    descriptionHe: 'צרו סדרת פוסטים מגובשת לרשתות חברתיות עם מסרים עקביים',
    category: 'copywriting',
    
    mode: 'copywrite',
    methodology: 'collaborative',
    consensusMethod: 'synthesis',
    defaultAgents: [],
    suggestedAgents: ['ronit', 'noa', 'michal'],
    
    prompts: {
      goal: 'Create [5-10] social media posts for [platforms: LinkedIn, Twitter, Instagram, Facebook] about [topic/campaign]. Goal: [awareness/engagement/traffic].',
      context: ['brand', 'audience', 'examples'],
    },
    defaultGoal: 'Create a 5-post social campaign with consistent messaging',
    defaultGoalHe: 'צרו קמפיין של 5 פוסטים עם מסרים עקביים',
    
    suggestedExports: ['md', 'json'],
    
    // UI display properties
    icon: '📱',
    color: '#ec4899',
    tags: ['social', 'campaign', 'series'],
    estimatedDuration: '35-50 min',
    difficulty: 'intermediate',
    
    version: 1,
    builtIn: true,
  },

  // ===========================================================================
  // 5. BRAND MESSAGING WORKSHOP
  // ===========================================================================
  {
    id: 'brand-messaging',
    name: 'Brand Messaging Workshop',
    nameHe: 'סדנת מסרי מותג',
    description: 'Define or refine brand positioning, voice, tone, and key messages. Agents challenge assumptions and synthesize a coherent brand narrative.',
    descriptionHe: 'הגדירו או חדדו מיצוב, קול, טון ומסרים מרכזיים למותג',
    category: 'strategy',
    
    mode: 'ideation',
    methodology: 'dialectic',
    consensusMethod: 'synthesis',
    defaultAgents: [],
    suggestedAgents: ['ronit', 'yossi', 'noa', 'avi', 'michal'],
    
    prompts: {
      goal: 'Define brand messaging framework including: positioning statement, value proposition, key messages, and tone of voice for [brand/product].',
      context: ['brand', 'audience', 'competitors', 'research'],
    },
    defaultGoal: 'Create comprehensive brand voice guidelines',
    defaultGoalHe: 'צרו הנחיות מקיפות לקול המותג',
    
    suggestedExports: ['md', 'pdf'],
    
    // UI display properties
    icon: '🎯',
    color: '#f59e0b',
    tags: ['brand', 'messaging', 'workshop'],
    estimatedDuration: '45-60 min',
    difficulty: 'advanced',
    
    version: 1,
    builtIn: true,
  },
];

/**
 * Get a built-in template by ID
 */
export function getBuiltInTemplate(id: string): SessionTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all built-in template IDs
 */
export function getBuiltInTemplateIds(): string[] {
  return BUILT_IN_TEMPLATES.map(t => t.id);
}
