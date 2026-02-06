/**
 * StructureOptions - Document structure toggles (cover, TOC, appendix, etc.)
 */

import type { ExportOptions, ExportFormat } from './types';

interface StructureOptionsProps {
  structure: ExportOptions['structure'];
  onStructureToggle: (key: keyof ExportOptions['structure']) => void;
  format: ExportFormat;
  hebrewMode: boolean;
}

interface StructureItem {
  key: keyof ExportOptions['structure'];
  label: string;
  labelHe: string;
  description: string;
  descriptionHe: string;
  icon: string;
  supportedFormats: ExportFormat[];
}

const STRUCTURE_ITEMS: StructureItem[] = [
  {
    key: 'coverPage',
    label: 'Cover Page',
    labelHe: 'עמוד שער',
    description: 'Add a professional cover page with project info',
    descriptionHe: 'הוסף עמוד שער מקצועי עם פרטי הפרויקט',
    icon: '📕',
    supportedFormats: ['pdf', 'docx', 'html'],
  },
  {
    key: 'tableOfContents',
    label: 'Table of Contents',
    labelHe: 'תוכן עניינים',
    description: 'Generate a navigable table of contents',
    descriptionHe: 'צור תוכן עניינים לניווט',
    icon: '📑',
    supportedFormats: ['pdf', 'docx', 'html', 'md'],
  },
  {
    key: 'appendix',
    label: 'Appendix',
    labelHe: 'נספח',
    description: 'Include raw data and additional notes',
    descriptionHe: 'כלול נתונים גולמיים והערות נוספות',
    icon: '📎',
    supportedFormats: ['pdf', 'docx', 'html', 'md'],
  },
  {
    key: 'pageNumbers',
    label: 'Page Numbers',
    labelHe: 'מספרי עמודים',
    description: 'Add page numbers to the footer',
    descriptionHe: 'הוסף מספרי עמודים לתחתית',
    icon: '#️⃣',
    supportedFormats: ['pdf', 'docx'],
  },
];

export function StructureOptions({
  structure,
  onStructureToggle,
  format,
  hebrewMode,
}: StructureOptionsProps) {
  const t = {
    title: hebrewMode ? 'מבנה המסמך' : 'Document Structure',
    subtitle: hebrewMode ? 'הגדר את מבנה המסמך הסופי' : 'Configure the final document structure',
    notAvailable: hebrewMode ? 'לא זמין בפורמט זה' : 'Not available in this format',
    preview: hebrewMode ? 'תצוגת מבנה' : 'Structure Preview',
  };

  // Filter items based on format support
  const availableItems = STRUCTURE_ITEMS.filter(item => 
    item.supportedFormats.includes(format)
  );
  
  const unavailableItems = STRUCTURE_ITEMS.filter(item => 
    !item.supportedFormats.includes(format)
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.title}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.subtitle}</p>
      </div>

      {/* Available Options */}
      {availableItems.length > 0 && (
        <div className="space-y-2">
          {availableItems.map((item) => (
            <StructureToggle
              key={item.key}
              item={item}
              checked={structure[item.key]}
              onChange={() => onStructureToggle(item.key)}
              hebrewMode={hebrewMode}
              disabled={false}
            />
          ))}
        </div>
      )}

      {/* Unavailable Options (grayed out) */}
      {unavailableItems.length > 0 && (
        <div className="space-y-2 opacity-50">
          <p className="text-xs text-dark-500 mb-2">{t.notAvailable}</p>
          {unavailableItems.map((item) => (
            <StructureToggle
              key={item.key}
              item={item}
              checked={false}
              onChange={() => {}}
              hebrewMode={hebrewMode}
              disabled={true}
            />
          ))}
        </div>
      )}

      {/* Visual Structure Preview */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-dark-300 mb-3">{t.preview}</h4>
        <StructurePreview structure={structure} format={format} hebrewMode={hebrewMode} />
      </div>
    </div>
  );
}

interface StructureToggleProps {
  item: StructureItem;
  checked: boolean;
  onChange: () => void;
  hebrewMode: boolean;
  disabled: boolean;
}

function StructureToggle({ 
  item, 
  checked, 
  onChange, 
  hebrewMode, 
  disabled 
}: StructureToggleProps) {
  return (
    <label
      className={`
        flex items-center gap-3 p-3 rounded-lg transition-colors
        ${disabled 
          ? 'cursor-not-allowed' 
          : 'cursor-pointer'
        }
        ${checked && !disabled
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
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            w-10 h-6 rounded-full transition-colors
            ${checked && !disabled ? 'bg-blue-500' : 'bg-dark-600'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${checked && !disabled ? 'translate-x-5' : 'translate-x-1'}
            `}
          />
        </div>
      </div>
    </label>
  );
}

interface StructurePreviewProps {
  structure: ExportOptions['structure'];
  format: ExportFormat;
  hebrewMode: boolean;
}

function StructurePreview({ structure, format, hebrewMode }: StructurePreviewProps) {
  const pages: { label: string; labelHe: string; icon: string }[] = [];
  
  if (structure.coverPage && ['pdf', 'docx', 'html'].includes(format)) {
    pages.push({ label: 'Cover', labelHe: 'שער', icon: '📕' });
  }
  
  if (structure.tableOfContents) {
    pages.push({ label: 'TOC', labelHe: 'תוכן', icon: '📑' });
  }
  
  pages.push({ label: 'Content', labelHe: 'תוכן', icon: '📄' });
  
  if (structure.appendix) {
    pages.push({ label: 'Appendix', labelHe: 'נספח', icon: '📎' });
  }

  return (
    <div className="flex items-center justify-center gap-2 p-4 bg-dark-800 rounded-lg border border-dark-700">
      {pages.map((page, index) => (
        <div key={index} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-16 bg-dark-700 border border-dark-600 rounded flex items-center justify-center text-lg">
              {page.icon}
            </div>
            <span className="text-xs text-dark-400 mt-1">
              {hebrewMode ? page.labelHe : page.label}
            </span>
          </div>
          {index < pages.length - 1 && (
            <div className="mx-2 text-dark-600">→</div>
          )}
        </div>
      ))}
      
      {structure.pageNumbers && ['pdf', 'docx'].includes(format) && (
        <div className="ms-4 ps-4 border-s border-dark-700">
          <span className="text-xs text-dark-500">
            {hebrewMode ? 'עמ׳ 1, 2, 3...' : 'pg. 1, 2, 3...'}
          </span>
        </div>
      )}
    </div>
  );
}
