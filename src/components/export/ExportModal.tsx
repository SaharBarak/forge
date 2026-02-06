/**
 * Enhanced ExportModal - Redesigned export with full customization
 * Issue #14: Enhanced Export - Redesigned ExportModal
 */

import { useState, useCallback, useMemo } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import {
  type ExportFormat,
  type ExportOptions,
  DEFAULT_EXPORT_OPTIONS,
} from './types';
import { FormatSelector } from './FormatSelector';
import { ContentToggles } from './ContentToggles';
import { StyleCustomizer } from './StyleCustomizer';
import { StructureOptions } from './StructureOptions';
import { ExportPreview } from './ExportPreview';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'format' | 'content' | 'style' | 'structure';

interface Tab {
  id: TabId;
  label: string;
  labelHe: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'format', label: 'Format', labelHe: 'פורמט', icon: '📄' },
  { id: 'content', label: 'Content', labelHe: 'תוכן', icon: '📝' },
  { id: 'style', label: 'Style', labelHe: 'עיצוב', icon: '🎨' },
  { id: 'structure', label: 'Structure', labelHe: 'מבנה', icon: '📑' },
];

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { session } = useSessionStore();
  const { hebrewMode } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<TabId>('format');
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Translations
  const t = useMemo(() => ({
    title: hebrewMode ? 'ייצוא מתקדם' : 'Advanced Export',
    export: hebrewMode ? 'ייצא' : 'Export',
    preview: hebrewMode ? 'תצוגה מקדימה' : 'Preview',
    close: hebrewMode ? 'סגור' : 'Close',
    exporting: hebrewMode ? 'מייצא...' : 'Exporting...',
    hidePreview: hebrewMode ? 'הסתר תצוגה' : 'Hide Preview',
    showPreview: hebrewMode ? 'הצג תצוגה' : 'Show Preview',
  }), [hebrewMode]);

  // Handle format change
  const handleFormatChange = useCallback((format: ExportFormat) => {
    setOptions(prev => ({ ...prev, format }));
  }, []);

  // Handle section toggle
  const handleSectionToggle = useCallback((section: keyof ExportOptions['sections']) => {
    setOptions(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: !prev.sections[section],
      },
    }));
  }, []);

  // Handle structure toggle
  const handleStructureToggle = useCallback((key: keyof ExportOptions['structure']) => {
    setOptions(prev => ({
      ...prev,
      structure: {
        ...prev.structure,
        [key]: !prev.structure[key],
      },
    }));
  }, []);

  // Handle style changes
  const handleStyleChange = useCallback(<K extends keyof ExportOptions['style']>(
    key: K,
    value: ExportOptions['style'][K]
  ) => {
    setOptions(prev => ({
      ...prev,
      style: {
        ...prev.style,
        [key]: value,
      },
    }));
  }, []);

  // Handle metadata toggle
  const handleMetadataToggle = useCallback((key: keyof ExportOptions['metadata']) => {
    setOptions(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: !prev.metadata[key],
      },
    }));
  }, []);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!session) {
      setError('No session to export');
      return;
    }
    
    if (!window.electronAPI?.exportSessionAdvanced) {
      setError('Export not available in this environment');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const response = await window.electronAPI.exportSessionAdvanced({
        session,
        options,
      });

      if (response.success) {
        onClose();
      } else {
        setError(response.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  }, [session, options, onClose]);

  // Handle close with state reset
  const handleClose = useCallback(() => {
    setError(null);
    setShowPreview(false);
    onClose();
  }, [onClose]);

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl"
        dir={hebrewMode ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
            📤 {t.title}
          </h2>
          <button
            onClick={handleClose}
            className="text-dark-400 hover:text-dark-200 text-2xl leading-none p-1 hover:bg-dark-800 rounded"
            aria-label={t.close}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-700 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-3 text-sm font-medium transition-colors relative
                ${activeTab === tab.id 
                  ? 'text-blue-400' 
                  : 'text-dark-400 hover:text-dark-200'
                }
              `}
            >
              <span className="flex items-center gap-2">
                {tab.icon} {hebrewMode ? tab.labelHe : tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex flex-1 min-h-0">
          {/* Settings Panel */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'format' && (
              <FormatSelector
                selectedFormat={options.format}
                onFormatChange={handleFormatChange}
                hebrewMode={hebrewMode}
              />
            )}
            
            {activeTab === 'content' && (
              <ContentToggles
                sections={options.sections}
                metadata={options.metadata}
                onSectionToggle={handleSectionToggle}
                onMetadataToggle={handleMetadataToggle}
                hebrewMode={hebrewMode}
              />
            )}
            
            {activeTab === 'style' && (
              <StyleCustomizer
                style={options.style}
                onStyleChange={handleStyleChange}
                hebrewMode={hebrewMode}
              />
            )}
            
            {activeTab === 'structure' && (
              <StructureOptions
                structure={options.structure}
                onStructureToggle={handleStructureToggle}
                format={options.format}
                hebrewMode={hebrewMode}
              />
            )}
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-80 border-s border-dark-700 p-4 overflow-y-auto bg-dark-850">
              <ExportPreview
                session={session}
                options={options}
                hebrewMode={hebrewMode}
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-dark-700">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors text-sm"
          >
            {showPreview ? t.hidePreview : t.showPreview}
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors"
            >
              {t.close}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-lg transition-colors font-medium"
            >
              {isExporting ? t.exporting : t.export}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
