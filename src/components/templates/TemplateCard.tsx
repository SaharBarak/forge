/**
 * TemplateCard - Individual template card component
 */

import type { TemplateCardProps } from './types';
import { getTemplateDisplayInfo } from './types';

export function TemplateCard({ 
  template, 
  displayInfo,
  onSelect, 
  isSelected = false,
  hebrewMode = false 
}: TemplateCardProps) {
  // Get display info from props or fallback to defaults
  const info = displayInfo || getTemplateDisplayInfo(template.id);
  
  const difficultyLabels = {
    beginner: hebrewMode ? 'מתחילים' : 'Beginner',
    intermediate: hebrewMode ? 'בינוני' : 'Intermediate',
    advanced: hebrewMode ? 'מתקדם' : 'Advanced',
  };

  const difficultyColors = {
    beginner: 'bg-green-500/20 text-green-400',
    intermediate: 'bg-yellow-500/20 text-yellow-400',
    advanced: 'bg-red-500/20 text-red-400',
  };

  return (
    <button
      onClick={() => onSelect(template)}
      className={`
        w-full p-4 rounded-xl border-2 transition-all duration-200 text-start
        ${isSelected 
          ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' 
          : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800'
        }
      `}
      dir={hebrewMode ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span 
          className="text-3xl flex-shrink-0 p-2 rounded-lg"
          style={{ backgroundColor: `${info.color}20` }}
        >
          {info.icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-lg truncate">
            {template.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[info.difficulty]}`}>
              {difficultyLabels[info.difficulty]}
            </span>
            <span className="text-neutral-500 text-xs">
              {info.estimatedDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-neutral-400 text-sm mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Tags */}
      {info.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {info.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="text-xs px-2 py-0.5 rounded bg-neutral-700/50 text-neutral-400"
            >
              #{tag}
            </span>
          ))}
          {info.tags.length > 3 && (
            <span className="text-xs text-neutral-500">
              +{info.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Category badge */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs px-2 py-1 rounded bg-neutral-700/30 text-neutral-500 capitalize">
          {template.category}
        </span>
        
        {/* Selection indicator */}
        {isSelected && (
          <div 
            className="flex items-center gap-1.5"
            style={{ color: info.color }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              {hebrewMode ? 'נבחר' : 'Selected'}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
