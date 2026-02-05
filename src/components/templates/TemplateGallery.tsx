/**
 * TemplateGallery - Grid layout for session templates with filtering
 */

import { useState, useMemo } from 'react';
import type { SessionTemplate, TemplateCategory } from '../../types';
import { BUILT_IN_TEMPLATES } from '../../lib/templates/builtInTemplates';
import { TemplateCard } from './TemplateCard';
import { CATEGORY_LABELS, getTemplateDisplayInfo } from './types';
import type { TemplateGalleryProps } from './types';

export function TemplateGallery({ 
  onSelectTemplate, 
  onStartFresh,
  hebrewMode = false 
}: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all templates (built-in for now, can extend with custom later)
  const allTemplates = BUILT_IN_TEMPLATES;

  // Filter templates by category and search
  const filteredTemplates = useMemo(() => {
    let templates = selectedCategory === 'all' 
      ? allTemplates 
      : allTemplates.filter(t => t.category === selectedCategory);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => {
        const displayInfo = getTemplateDisplayInfo(t.id);
        return (
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          displayInfo.tags.some(tag => tag.toLowerCase().includes(query))
        );
      });
    }
    
    return templates;
  }, [selectedCategory, searchQuery, allTemplates]);

  const categories: (TemplateCategory | 'all')[] = ['all', 'copywriting', 'strategy', 'validation', 'custom'];

  const handleTemplateSelect = (template: SessionTemplate) => {
    setSelectedTemplate(template);
    onSelectTemplate(template);
  };

  const handleStartFresh = () => {
    setSelectedTemplate(null);
    onSelectTemplate(null);
    onStartFresh();
  };

  const labels = {
    title: hebrewMode ? 'בחרו תבנית' : 'Choose a Template',
    subtitle: hebrewMode 
      ? 'התחילו עם תבנית מוכנה או צרו מההתחלה'
      : 'Start with a pre-built template or create from scratch',
    search: hebrewMode ? 'חפשו תבניות...' : 'Search templates...',
    startFresh: hebrewMode ? 'התחל מההתחלה' : 'Start Fresh',
    startFreshDesc: hebrewMode 
      ? 'צרו סשן חדש ללא תבנית'
      : 'Create a new session without a template',
    noResults: hebrewMode ? 'לא נמצאו תבניות' : 'No templates found',
    tryDifferent: hebrewMode 
      ? 'נסו חיפוש אחר או בחרו קטגוריה אחרת'
      : 'Try a different search or category',
    templates: hebrewMode ? 'תבניות' : 'templates',
    all: hebrewMode ? 'הכל' : 'All',
  };

  const getCategoryLabel = (category: TemplateCategory | 'all'): string => {
    if (category === 'all') return labels.all;
    return hebrewMode ? CATEGORY_LABELS[category].he : CATEGORY_LABELS[category].en;
  };

  const getCategoryCount = (category: TemplateCategory | 'all'): number => {
    if (category === 'all') return allTemplates.length;
    return allTemplates.filter(t => t.category === category).length;
  };

  return (
    <div 
      className="w-full max-w-5xl mx-auto px-4 py-6"
      dir={hebrewMode ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {labels.title}
        </h2>
        <p className="text-neutral-400">
          {labels.subtitle}
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder={labels.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          dir={hebrewMode ? 'rtl' : 'ltr'}
        />
        <svg 
          className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 ${hebrewMode ? 'left-4' : 'right-4'}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {categories.map((category) => {
          const isActive = selectedCategory === category;
          const count = getCategoryCount(category);
          
          // Skip categories with no templates
          if (count === 0 && category !== 'all') return null;
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'
                }
              `}
            >
              {getCategoryLabel(category)}
              <span className={`ms-1.5 ${isActive ? 'text-blue-200' : 'text-neutral-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Start Fresh Card */}
      <button
        onClick={handleStartFresh}
        className={`
          w-full p-5 mb-6 rounded-xl border-2 border-dashed transition-all duration-200 text-center
          ${selectedTemplate === null 
            ? 'border-green-500 bg-green-500/10' 
            : 'border-neutral-600 bg-neutral-800/30 hover:border-neutral-500 hover:bg-neutral-800/50'
          }
        `}
      >
        <div className="flex items-center justify-center gap-3">
          <span className="text-3xl">✨</span>
          <div className={hebrewMode ? 'text-end' : 'text-start'}>
            <h3 className="text-white font-semibold text-lg">
              {labels.startFresh}
            </h3>
            <p className="text-neutral-400 text-sm">
              {labels.startFreshDesc}
            </p>
          </div>
        </div>
      </button>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <>
          <div className="text-neutral-500 text-sm mb-4">
            {filteredTemplates.length} {labels.templates}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                displayInfo={getTemplateDisplayInfo(template.id)}
                onSelect={handleTemplateSelect}
                isSelected={selectedTemplate?.id === template.id}
                hebrewMode={hebrewMode}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <span className="text-4xl mb-4 block">🔍</span>
          <h3 className="text-white font-semibold text-lg mb-2">
            {labels.noResults}
          </h3>
          <p className="text-neutral-400">
            {labels.tryDifferent}
          </p>
        </div>
      )}
    </div>
  );
}

export default TemplateGallery;
