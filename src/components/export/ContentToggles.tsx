/**
 * ContentToggles - Select which content sections to include
 */

import type { ExportOptions } from './types';

interface ContentTogglesProps {
  sections: ExportOptions['sections'];
  metadata: ExportOptions['metadata'];
  onSectionToggle: (section: keyof ExportOptions['sections']) => void;
  onMetadataToggle: (key: keyof ExportOptions['metadata']) => void;
  hebrewMode: boolean;
}

interface ToggleItem {
  key: string;
  label: string;
  labelHe: string;
  description: string;
  descriptionHe: string;
  icon: string;
}

const SECTION_ITEMS: ToggleItem[] = [
  {
    key: 'transcript',
    label: 'Transcript',
    labelHe: 'תמליל',
    description: 'Full conversation history',
    descriptionHe: 'היסטוריית השיחה המלאה',
    icon: '💬',
  },
  {
    key: 'decisions',
    label: 'Decisions',
    labelHe: 'החלטות',
    description: 'Consensus decisions and votes',
    descriptionHe: 'החלטות קונצנזוס והצבעות',
    icon: '✅',
  },
  {
    key: 'proposals',
    label: 'Proposals',
    labelHe: 'הצעות',
    description: 'Agent proposals and suggestions',
    descriptionHe: 'הצעות והמלצות של סוכנים',
    icon: '💡',
  },
  {
    key: 'drafts',
    label: 'Drafts',
    labelHe: 'טיוטות',
    description: 'Copy drafts and revisions',
    descriptionHe: 'טיוטות קופי ותיקונים',
    icon: '📝',
  },
  {
    key: 'summary',
    label: 'Summary',
    labelHe: 'סיכום',
    description: 'AI-generated session summary',
    descriptionHe: 'סיכום סשן שנוצר ע"י AI',
    icon: '📋',
  },
  {
    key: 'timeline',
    label: 'Timeline',
    labelHe: 'ציר זמן',
    description: 'Session timeline and milestones',
    descriptionHe: 'ציר זמן ואבני דרך',
    icon: '📅',
  },
];

const METADATA_ITEMS: ToggleItem[] = [
  {
    key: 'includeMetadata',
    label: 'Session Info',
    labelHe: 'פרטי סשן',
    description: 'Project name, goal, mode',
    descriptionHe: 'שם פרויקט, מטרה, מצב',
    icon: 'ℹ️',
  },
  {
    key: 'includeTimestamps',
    label: 'Timestamps',
    labelHe: 'חותמות זמן',
    description: 'Date and time for each message',
    descriptionHe: 'תאריך ושעה לכל הודעה',
    icon: '🕐',
  },
  {
    key: 'includeAgentAvatars',
    label: 'Agent Avatars',
    labelHe: 'אווטרים',
    description: 'Include agent profile images',
    descriptionHe: 'כלול תמונות פרופיל של סוכנים',
    icon: '👤',
  },
];

export function ContentToggles({
  sections,
  metadata,
  onSectionToggle,
  onMetadataToggle,
  hebrewMode,
}: ContentTogglesProps) {
  const t = {
    contentSections: hebrewMode ? 'קטעי תוכן' : 'Content Sections',
    contentSubtitle: hebrewMode ? 'בחר מה לכלול בייצוא' : 'Choose what to include in the export',
    metadataOptions: hebrewMode ? 'אפשרויות מטא-דאטה' : 'Metadata Options',
    metadataSubtitle: hebrewMode ? 'מידע נוסף לכלול' : 'Additional information to include',
  };

  return (
    <div className="space-y-6">
      {/* Content Sections */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.contentSections}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.contentSubtitle}</p>
        
        <div className="mt-4 space-y-2">
          {SECTION_ITEMS.map((item) => (
            <ToggleRow
              key={item.key}
              item={item}
              checked={sections[item.key as keyof typeof sections]}
              onChange={() => onSectionToggle(item.key as keyof ExportOptions['sections'])}
              hebrewMode={hebrewMode}
            />
          ))}
        </div>
      </div>

      {/* Metadata Options */}
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.metadataOptions}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.metadataSubtitle}</p>
        
        <div className="mt-4 space-y-2">
          {METADATA_ITEMS.map((item) => (
            <ToggleRow
              key={item.key}
              item={item}
              checked={metadata[item.key as keyof typeof metadata]}
              onChange={() => onMetadataToggle(item.key as keyof ExportOptions['metadata'])}
              hebrewMode={hebrewMode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  item: ToggleItem;
  checked: boolean;
  onChange: () => void;
  hebrewMode: boolean;
}

function ToggleRow({ item, checked, onChange, hebrewMode }: ToggleRowProps) {
  return (
    <label
      className={`
        flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${checked 
          ? 'bg-blue-500/10 border border-blue-500/30' 
          : 'bg-dark-800 border border-dark-700 hover:border-dark-600'
        }
      `}
    >
      <span className="text-xl">{item.icon}</span>
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-dark-100">
          {hebrewMode ? item.labelHe : item.label}
        </div>
        <div className="text-xs text-dark-400">
          {hebrewMode ? item.descriptionHe : item.description}
        </div>
      </div>
      
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`
            w-10 h-6 rounded-full transition-colors
            ${checked ? 'bg-blue-500' : 'bg-dark-600'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${checked ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </div>
      </div>
    </label>
  );
}
