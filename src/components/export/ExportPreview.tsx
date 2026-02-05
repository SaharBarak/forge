/**
 * ExportPreview - Live preview of export output
 */

import { useMemo } from 'react';
import type { ExportOptions } from './types';
import { FORMAT_INFO, TEMPLATE_INFO, FONT_INFO } from './types';
import type { Session } from '../../types';

interface ExportPreviewProps {
  session: Session;
  options: ExportOptions;
  hebrewMode: boolean;
}

export function ExportPreview({ session, options, hebrewMode }: ExportPreviewProps) {
  const t = {
    preview: hebrewMode ? 'תצוגה מקדימה' : 'Preview',
    format: hebrewMode ? 'פורמט' : 'Format',
    template: hebrewMode ? 'תבנית' : 'Template',
    sections: hebrewMode ? 'קטעים' : 'Sections',
    noSections: hebrewMode ? 'לא נבחרו קטעים' : 'No sections selected',
    coverPage: hebrewMode ? 'עמוד שער' : 'Cover Page',
    toc: hebrewMode ? 'תוכן עניינים' : 'Table of Contents',
    appendix: hebrewMode ? 'נספח' : 'Appendix',
    pageNumbers: hebrewMode ? 'מספרי עמודים' : 'Page Numbers',
  };

  // Get selected sections
  const selectedSections = useMemo(() => {
    const sections: string[] = [];
    if (options.sections.transcript) sections.push(hebrewMode ? 'תמליל' : 'Transcript');
    if (options.sections.decisions) sections.push(hebrewMode ? 'החלטות' : 'Decisions');
    if (options.sections.proposals) sections.push(hebrewMode ? 'הצעות' : 'Proposals');
    if (options.sections.drafts) sections.push(hebrewMode ? 'טיוטות' : 'Drafts');
    if (options.sections.summary) sections.push(hebrewMode ? 'סיכום' : 'Summary');
    if (options.sections.timeline) sections.push(hebrewMode ? 'ציר זמן' : 'Timeline');
    return sections;
  }, [options.sections, hebrewMode]);

  const formatInfo = FORMAT_INFO[options.format];
  const templateInfo = TEMPLATE_INFO[options.style.template];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-dark-300 flex items-center gap-2">
        👁️ {t.preview}
      </h4>

      {/* Mini Document Preview */}
      <div 
        className="bg-white rounded-lg p-4 text-dark-900 shadow-lg"
        style={{ 
          fontFamily: FONT_INFO[options.style.fontFamily].family,
          minHeight: '200px',
        }}
      >
        {/* Cover Page Preview */}
        {options.structure.coverPage && ['pdf', 'docx', 'html'].includes(options.format) && (
          <div 
            className="text-center pb-3 mb-3 border-b"
            style={{ borderColor: options.style.primaryColor }}
          >
            {options.style.includeLogo && options.style.logoUrl && (
              <img 
                src={options.style.logoUrl} 
                alt="Logo" 
                className="h-8 mx-auto mb-2 object-contain"
              />
            )}
            <h1 
              className="text-lg font-bold"
              style={{ color: options.style.primaryColor }}
            >
              {session.config.projectName}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              {session.config.goal}
            </p>
          </div>
        )}

        {/* TOC Preview */}
        {options.structure.tableOfContents && (
          <div className="mb-3 text-xs">
            <div className="font-semibold mb-1" style={{ color: options.style.primaryColor }}>
              {t.toc}
            </div>
            <ul className="text-gray-600 space-y-0.5 ps-3">
              {selectedSections.map((section, i) => (
                <li key={i}>• {section}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Sections Preview */}
        <div className="space-y-2">
          {selectedSections.length === 0 ? (
            <p className="text-gray-400 text-xs italic">{t.noSections}</p>
          ) : (
            selectedSections.slice(0, 3).map((section, i) => (
              <div key={i} className="text-xs">
                <div 
                  className="font-semibold"
                  style={{ color: options.style.primaryColor }}
                >
                  {section}
                </div>
                <div className="text-gray-500 h-2 bg-gray-100 rounded mt-1" />
                <div className="text-gray-500 h-2 bg-gray-100 rounded mt-1 w-3/4" />
              </div>
            ))
          )}
          {selectedSections.length > 3 && (
            <p className="text-gray-400 text-xs">
              +{selectedSections.length - 3} {hebrewMode ? 'נוספים' : 'more'}...
            </p>
          )}
        </div>

        {/* Page Number Preview */}
        {options.structure.pageNumbers && ['pdf', 'docx'].includes(options.format) && (
          <div className="text-center text-xs text-gray-400 mt-4 pt-2 border-t border-gray-200">
            1
          </div>
        )}
      </div>

      {/* Export Summary */}
      <div className="space-y-2 text-sm">
        {/* Format */}
        <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
          <span className="text-dark-400">{t.format}</span>
          <span className="text-dark-200 flex items-center gap-1">
            {formatInfo.icon} {hebrewMode ? formatInfo.labelHe : formatInfo.label}
          </span>
        </div>

        {/* Template */}
        <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
          <span className="text-dark-400">{t.template}</span>
          <span className="text-dark-200">
            {hebrewMode ? templateInfo.labelHe : templateInfo.label}
          </span>
        </div>

        {/* Sections Count */}
        <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
          <span className="text-dark-400">{t.sections}</span>
          <span className="text-dark-200">{selectedSections.length}</span>
        </div>

        {/* Primary Color */}
        <div className="flex items-center justify-between p-2 bg-dark-800 rounded">
          <span className="text-dark-400">Color</span>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: options.style.primaryColor }}
            />
            <span className="text-dark-400 text-xs font-mono">
              {options.style.primaryColor}
            </span>
          </div>
        </div>

        {/* Structure Options */}
        <div className="p-2 bg-dark-800 rounded space-y-1">
          {options.structure.coverPage && (
            <div className="text-xs text-green-400">✓ {t.coverPage}</div>
          )}
          {options.structure.tableOfContents && (
            <div className="text-xs text-green-400">✓ {t.toc}</div>
          )}
          {options.structure.appendix && (
            <div className="text-xs text-green-400">✓ {t.appendix}</div>
          )}
          {options.structure.pageNumbers && (
            <div className="text-xs text-green-400">✓ {t.pageNumbers}</div>
          )}
        </div>
      </div>
    </div>
  );
}
