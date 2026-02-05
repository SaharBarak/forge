/**
 * TemplateManager - UI for managing custom templates
 * 
 * Features:
 * - View/edit/delete custom templates
 * - Duplicate built-in templates
 * - Import/export as JSON
 */

import { useState } from 'react';
import type { SessionTemplate, TemplateInfo } from '../../types';
import { TemplateEditor } from './TemplateEditor';
import { getTemplateDisplayInfo } from './types';

interface TemplateManagerProps {
  templates: TemplateInfo[];
  onCreateTemplate: (template: Omit<SessionTemplate, 'id' | 'version' | 'builtIn' | 'createdAt' | 'updatedAt'>) => Promise<SessionTemplate>;
  onUpdateTemplate: (id: string, updates: Partial<SessionTemplate>) => Promise<SessionTemplate>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onDuplicateTemplate: (id: string, newName?: string) => Promise<SessionTemplate>;
  onExportTemplate: (id: string) => string;
  onImportTemplate: (json: string) => Promise<SessionTemplate>;
  getTemplate: (id: string) => SessionTemplate | null;
  onClose: () => void;
  hebrewMode?: boolean;
}

type ViewMode = 'list' | 'create' | 'edit' | 'import';

export function TemplateManager({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onExportTemplate,
  onImportTemplate,
  getTemplate,
  onClose,
  hebrewMode = false,
}: TemplateManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [importJson, setImportJson] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'builtin' | 'custom'>('all');

  const filteredTemplates = templates.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'builtin') return t.builtIn;
    if (filter === 'custom') return !t.builtIn;
    return true;
  });

  const labels = {
    title: hebrewMode ? 'ניהול תבניות' : 'Manage Templates',
    newTemplate: hebrewMode ? 'תבנית חדשה' : 'New Template',
    import: hebrewMode ? 'ייבוא' : 'Import',
    export: hebrewMode ? 'ייצוא' : 'Export',
    duplicate: hebrewMode ? 'שכפול' : 'Duplicate',
    edit: hebrewMode ? 'עריכה' : 'Edit',
    delete: hebrewMode ? 'מחיקה' : 'Delete',
    close: hebrewMode ? 'סגור' : 'Close',
    all: hebrewMode ? 'הכל' : 'All',
    builtin: hebrewMode ? 'מובנות' : 'Built-in',
    custom: hebrewMode ? 'מותאמות' : 'Custom',
    noTemplates: hebrewMode ? 'אין תבניות' : 'No templates',
    importJson: hebrewMode ? 'הדבק JSON כאן...' : 'Paste JSON here...',
    importButton: hebrewMode ? 'ייבא תבנית' : 'Import Template',
    cancel: hebrewMode ? 'ביטול' : 'Cancel',
    confirmDelete: hebrewMode ? 'האם למחוק את התבנית?' : 'Delete this template?',
    yes: hebrewMode ? 'כן' : 'Yes',
    no: hebrewMode ? 'לא' : 'No',
    copied: hebrewMode ? 'הועתק!' : 'Copied!',
    builtInBadge: hebrewMode ? 'מובנה' : 'Built-in',
    customBadge: hebrewMode ? 'מותאם' : 'Custom',
  };

  const handleCreate = async (data: Omit<SessionTemplate, 'id' | 'version' | 'builtIn' | 'createdAt' | 'updatedAt'>) => {
    setIsLoading(true);
    setActionError(null);
    try {
      await onCreateTemplate(data);
      setViewMode('list');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (data: Omit<SessionTemplate, 'id' | 'version' | 'builtIn' | 'createdAt' | 'updatedAt'>) => {
    if (!editingTemplate) return;
    
    setIsLoading(true);
    setActionError(null);
    try {
      await onUpdateTemplate(editingTemplate.id, data);
      setEditingTemplate(null);
      setViewMode('list');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(labels.confirmDelete)) return;
    
    setIsLoading(true);
    setActionError(null);
    try {
      await onDeleteTemplate(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setIsLoading(true);
    setActionError(null);
    try {
      await onDuplicateTemplate(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to duplicate template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = (id: string) => {
    try {
      const json = onExportTemplate(id);
      navigator.clipboard.writeText(json);
      // Show brief "Copied!" feedback
      setActionError(labels.copied);
      setTimeout(() => setActionError(null), 2000);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to export template');
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setImportError(null);
    try {
      await onImportTemplate(importJson);
      setImportJson('');
      setViewMode('list');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    const template = getTemplate(id);
    if (template) {
      setEditingTemplate(template);
      setViewMode('edit');
    }
  };

  // Render based on view mode
  if (viewMode === 'create') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <TemplateEditor
          onSave={handleCreate}
          onCancel={() => setViewMode('list')}
          hebrewMode={hebrewMode}
        />
      </div>
    );
  }

  if (viewMode === 'edit' && editingTemplate) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <TemplateEditor
          template={editingTemplate}
          onSave={handleUpdate}
          onCancel={() => {
            setEditingTemplate(null);
            setViewMode('list');
          }}
          hebrewMode={hebrewMode}
        />
      </div>
    );
  }

  if (viewMode === 'import') {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
        <div 
          className="bg-neutral-900 rounded-xl p-6 max-w-lg w-full"
          dir={hebrewMode ? 'rtl' : 'ltr'}
        >
          <h2 className="text-xl font-bold text-white mb-4">
            {labels.import}
          </h2>
          
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            placeholder={labels.importJson}
            rows={10}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          
          {importError && (
            <p className="mt-2 text-sm text-red-400">{importError}</p>
          )}
          
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setImportJson('');
                setImportError(null);
                setViewMode('list');
              }}
              className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
            >
              {labels.cancel}
            </button>
            <button
              onClick={handleImport}
              disabled={!importJson.trim() || isLoading}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {labels.importButton}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-neutral-900 rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        dir={hebrewMode ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              {labels.title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('create')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              + {labels.newTemplate}
            </button>
            <button
              onClick={() => setViewMode('import')}
              className="px-4 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-colors"
            >
              📥 {labels.import}
            </button>
          </div>
          
          {/* Filter tabs */}
          <div className="flex gap-2 mt-4">
            {(['all', 'builtin', 'custom'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {labels[f]}
                <span className="ms-1 opacity-60">
                  ({f === 'all' 
                    ? templates.length 
                    : templates.filter(t => f === 'builtin' ? t.builtIn : !t.builtIn).length
                  })
                </span>
              </button>
            ))}
          </div>
        </div>
        
        {/* Error message */}
        {actionError && (
          <div className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm ${
            actionError === labels.copied 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {actionError}
          </div>
        )}
        
        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              {labels.noTemplates}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((template) => {
                const displayInfo = getTemplateDisplayInfo(template.id);
                
                return (
                  <div
                    key={template.id}
                    className="flex items-center gap-4 p-4 bg-neutral-800/50 rounded-xl border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    {/* Icon */}
                    <span 
                      className="text-2xl p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: `${displayInfo.color}20` }}
                    >
                      {displayInfo.icon}
                    </span>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium truncate">
                          {template.name}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          template.builtIn 
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}>
                          {template.builtIn ? labels.builtInBadge : labels.customBadge}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-sm truncate">
                        {template.description}
                      </p>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Export (always available) */}
                      <button
                        onClick={() => handleExport(template.id)}
                        className="p-2 text-neutral-400 hover:text-white transition-colors"
                        title={labels.export}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </button>
                      
                      {/* Duplicate (always available) */}
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="p-2 text-neutral-400 hover:text-white transition-colors"
                        title={labels.duplicate}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      
                      {/* Edit (custom only) */}
                      {!template.builtIn && (
                        <button
                          onClick={() => handleEdit(template.id)}
                          className="p-2 text-neutral-400 hover:text-blue-400 transition-colors"
                          title={labels.edit}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Delete (custom only) */}
                      {!template.builtIn && (
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                          title={labels.delete}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-colors"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TemplateManager;
