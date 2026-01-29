import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'md' | 'json' | 'html';
type ExportType = 'transcript' | 'draft' | 'summary' | 'messages';

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const { session } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const [format, setFormat] = useState<ExportFormat>('md');
  const [type, setType] = useState<ExportType>('transcript');
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const t = {
    title: hebrewMode ? 'ייצוא' : 'Export',
    format: hebrewMode ? 'פורמט' : 'Format',
    type: hebrewMode ? 'סוג' : 'Type',
    transcript: hebrewMode ? 'תמלול מלא' : 'Full Transcript',
    draft: hebrewMode ? 'טיוטות' : 'Drafts',
    summary: hebrewMode ? 'סיכום' : 'Summary',
    messages: hebrewMode ? 'הודעות בלבד' : 'Messages Only',
    export: hebrewMode ? 'ייצא' : 'Export',
    saveSession: hebrewMode ? 'שמור סשן' : 'Save Session',
    copyToClipboard: hebrewMode ? 'העתק ללוח' : 'Copy to Clipboard',
    close: hebrewMode ? 'סגור' : 'Close',
    copied: hebrewMode ? 'הועתק!' : 'Copied!',
    saved: hebrewMode ? 'נשמר!' : 'Saved!',
    exporting: hebrewMode ? 'מייצא...' : 'Exporting...',
    saving: hebrewMode ? 'שומר...' : 'Saving...',
  };

  const handleExport = async () => {
    if (!window.electronAPI?.exportSession) return;

    setIsExporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await window.electronAPI.exportSession({
        session,
        format,
        type,
      });

      if (response.success && response.content) {
        setResult(response.content);
      } else {
        setError(response.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveSession = async () => {
    if (!window.electronAPI?.saveSession) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await window.electronAPI.saveSession({ session });

      if (response.success) {
        setResult(`Session saved to: ${response.path}`);
      } else {
        setError(response.error || 'Save failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      // Show temporary "Copied!" feedback
      const originalResult = result;
      setResult(t.copied);
      setTimeout(() => setResult(originalResult), 1500);
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.config.projectName.replace(/\s+/g, '-').toLowerCase()}-${type}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-dark-100">📤 {t.title}</h2>
          <button
            onClick={onClose}
            className="text-dark-400 hover:text-dark-200 text-xl"
          >
            ×
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Format */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                {t.format}
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100"
              >
                <option value="md">Markdown (.md)</option>
                <option value="json">JSON (.json)</option>
                <option value="html">HTML (.html)</option>
              </select>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                {t.type}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExportType)}
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100"
              >
                <option value="transcript">{t.transcript}</option>
                <option value="draft">{t.draft}</option>
                <option value="summary">{t.summary}</option>
                <option value="messages">{t.messages}</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 text-white rounded-lg transition-colors"
            >
              {isExporting ? t.exporting : t.export}
            </button>
            <button
              onClick={handleSaveSession}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-dark-700 text-white rounded-lg transition-colors"
            >
              {isSaving ? t.saving : t.saveSession}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Result Preview */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-400">Preview:</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyToClipboard}
                    className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-dark-200 rounded transition-colors"
                  >
                    {t.copyToClipboard}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1 text-sm bg-dark-700 hover:bg-dark-600 text-dark-200 rounded transition-colors"
                  >
                    Download
                  </button>
                </div>
              </div>
              <pre className="p-4 bg-dark-800 rounded-lg text-dark-300 text-sm overflow-auto max-h-64 whitespace-pre-wrap">
                {result.slice(0, 2000)}{result.length > 2000 ? '\n\n... (truncated)' : ''}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
