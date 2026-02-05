/**
 * FormatSelector - Visual format selection cards
 */

import { type ExportFormat, FORMAT_INFO } from './types';

interface FormatSelectorProps {
  selectedFormat: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  hebrewMode: boolean;
}

export function FormatSelector({
  selectedFormat,
  onFormatChange,
  hebrewMode,
}: FormatSelectorProps) {
  const formats = Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO[ExportFormat]][];

  const t = {
    title: hebrewMode ? 'בחר פורמט' : 'Select Format',
    subtitle: hebrewMode ? 'בחר את פורמט הקובץ לייצוא' : 'Choose the output file format',
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-dark-100">{t.title}</h3>
        <p className="text-sm text-dark-400 mt-1">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {formats.map(([format, info]) => (
          <button
            key={format}
            onClick={() => onFormatChange(format)}
            className={`
              p-4 rounded-xl border-2 transition-all text-start
              ${selectedFormat === format
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-dark-700 bg-dark-800 hover:border-dark-600'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-dark-100">
                  {hebrewMode ? info.labelHe : info.label}
                </div>
                <div className="text-xs text-dark-400 mt-0.5">
                  {info.extension}
                </div>
                <div className="text-xs text-dark-500 mt-1 line-clamp-2">
                  {info.description}
                </div>
              </div>
            </div>
            
            {selectedFormat === format && (
              <div className="mt-3 flex justify-end">
                <span className="text-blue-400 text-sm">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Format-specific notes */}
      {selectedFormat === 'pdf' && (
        <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-amber-300 text-sm">
          {hebrewMode 
            ? '📝 PDF תומך בכל אפשרויות העיצוב והמבנה'
            : '📝 PDF supports all styling and structure options'}
        </div>
      )}
      
      {selectedFormat === 'md' && (
        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg text-blue-300 text-sm">
          {hebrewMode 
            ? '📝 Markdown מתאים לשיתוף וגרסאות'
            : '📝 Markdown is great for sharing and version control'}
        </div>
      )}

      {selectedFormat === 'json' && (
        <div className="p-3 bg-purple-900/20 border border-purple-700/50 rounded-lg text-purple-300 text-sm">
          {hebrewMode 
            ? '📊 JSON מייצא את כל המידע המובנה לשימוש תכנותי'
            : '📊 JSON exports all structured data for programmatic use'}
        </div>
      )}
    </div>
  );
}
