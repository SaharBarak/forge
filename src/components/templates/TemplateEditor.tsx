/**
 * TemplateEditor - Form for creating/editing templates
 */

import { useState } from 'react';
import type { SessionTemplate, TemplateCategory, SessionMode, ArgumentationStyle, ConsensusMethod, ExportFormat } from '../../types';

interface TemplateEditorProps {
  template?: SessionTemplate;
  onSave: (template: Omit<SessionTemplate, 'id' | 'version' | 'builtIn' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  hebrewMode?: boolean;
}

const MODE_OPTIONS: { value: SessionMode; label: string; labelHe: string }[] = [
  { value: 'copywrite', label: 'Copywriting', labelHe: 'קופירייטינג' },
  { value: 'idea-validation', label: 'Idea Validation', labelHe: 'אימות רעיון' },
  { value: 'ideation', label: 'Ideation', labelHe: 'סיעור מוחות' },
  { value: 'will-it-work', label: 'Will It Work?', labelHe: 'האם זה יעבוד?' },
  { value: 'custom', label: 'Custom', labelHe: 'מותאם אישית' },
];

const METHODOLOGY_OPTIONS: { value: ArgumentationStyle; label: string }[] = [
  { value: 'dialectic', label: 'Dialectic' },
  { value: 'socratic', label: 'Socratic' },
  { value: 'collaborative', label: 'Collaborative' },
  { value: 'adversarial', label: 'Adversarial' },
  { value: 'mixed', label: 'Mixed' },
];

const CONSENSUS_OPTIONS: { value: ConsensusMethod; label: string }[] = [
  { value: 'unanimous', label: 'Unanimous' },
  { value: 'supermajority', label: 'Supermajority' },
  { value: 'majority', label: 'Majority' },
  { value: 'consent', label: 'Consent' },
  { value: 'synthesis', label: 'Synthesis' },
];

const CATEGORY_OPTIONS: { value: TemplateCategory; label: string; labelHe: string }[] = [
  { value: 'copywriting', label: 'Copywriting', labelHe: 'קופירייטינג' },
  { value: 'strategy', label: 'Strategy', labelHe: 'אסטרטגיה' },
  { value: 'validation', label: 'Validation', labelHe: 'אימות' },
  { value: 'custom', label: 'Custom', labelHe: 'מותאם אישית' },
];

const EXPORT_OPTIONS: ExportFormat[] = ['md', 'json', 'html'];

const CONTEXT_OPTIONS = ['brand', 'audience', 'research', 'competitors', 'examples'];

export function TemplateEditor({ template, onSave, onCancel, hebrewMode = false }: TemplateEditorProps) {
  const isEditing = !!template;
  
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState<TemplateCategory>(template?.category || 'custom');
  const [mode, setMode] = useState<SessionMode>(template?.mode || 'copywrite');
  const [methodology, setMethodology] = useState<ArgumentationStyle>(template?.methodology || 'collaborative');
  const [consensusMethod, setConsensusMethod] = useState<ConsensusMethod>(template?.consensusMethod || 'synthesis');
  const [goalPrompt, setGoalPrompt] = useState(template?.prompts?.goal || '');
  const [contextTypes, setContextTypes] = useState<string[]>(template?.prompts?.context || []);
  const [suggestedExports, setSuggestedExports] = useState<ExportFormat[]>(template?.suggestedExports || ['md']);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const labels = {
    title: isEditing 
      ? (hebrewMode ? 'עריכת תבנית' : 'Edit Template')
      : (hebrewMode ? 'תבנית חדשה' : 'New Template'),
    name: hebrewMode ? 'שם' : 'Name',
    namePlaceholder: hebrewMode ? 'שם התבנית' : 'Template name',
    description: hebrewMode ? 'תיאור' : 'Description',
    descriptionPlaceholder: hebrewMode ? 'תיאור קצר של התבנית' : 'Brief description of the template',
    category: hebrewMode ? 'קטגוריה' : 'Category',
    mode: hebrewMode ? 'מצב' : 'Mode',
    methodology: hebrewMode ? 'מתודולוגיה' : 'Methodology',
    consensus: hebrewMode ? 'שיטת הסכמה' : 'Consensus Method',
    goalPrompt: hebrewMode ? 'הנחיית מטרה' : 'Goal Prompt',
    goalPlaceholder: hebrewMode ? 'טקסט לדוגמה למטרת הסשן...' : 'Example text for session goal...',
    contextTypes: hebrewMode ? 'סוגי הקשר נדרשים' : 'Required Context Types',
    exports: hebrewMode ? 'פורמטי ייצוא מומלצים' : 'Suggested Export Formats',
    save: hebrewMode ? 'שמור' : 'Save',
    cancel: hebrewMode ? 'ביטול' : 'Cancel',
    required: hebrewMode ? 'שדה חובה' : 'Required field',
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = labels.required;
    }
    if (!description.trim()) {
      newErrors.description = labels.required;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    
    onSave({
      name: name.trim(),
      description: description.trim(),
      category,
      mode,
      methodology,
      consensusMethod,
      defaultAgents: [],
      prompts: {
        goal: goalPrompt.trim(),
        context: contextTypes,
      },
      suggestedExports,
    });
  };

  const toggleContextType = (type: string) => {
    setContextTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleExportFormat = (format: ExportFormat) => {
    setSuggestedExports(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  return (
    <div 
      className="bg-neutral-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      dir={hebrewMode ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <h2 className="text-xl font-bold text-white mb-6">
        {labels.title}
      </h2>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
            {labels.name}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={labels.namePlaceholder}
            className={`w-full px-3 py-2 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? 'border-red-500' : 'border-neutral-700'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
            {labels.description}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={labels.descriptionPlaceholder}
            rows={3}
            className={`w-full px-3 py-2 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.description ? 'border-red-500' : 'border-neutral-700'
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-400">{errors.description}</p>
          )}
        </div>

        {/* Category & Mode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              {labels.category}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {hebrewMode ? opt.labelHe : opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              {labels.mode}
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SessionMode)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MODE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {hebrewMode ? opt.labelHe : opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Methodology & Consensus */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              {labels.methodology}
            </label>
            <select
              value={methodology}
              onChange={(e) => setMethodology(e.target.value as ArgumentationStyle)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {METHODOLOGY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              {labels.consensus}
            </label>
            <select
              value={consensusMethod}
              onChange={(e) => setConsensusMethod(e.target.value as ConsensusMethod)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CONSENSUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Goal Prompt */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1.5">
            {labels.goalPrompt}
          </label>
          <textarea
            value={goalPrompt}
            onChange={(e) => setGoalPrompt(e.target.value)}
            placeholder={labels.goalPlaceholder}
            rows={3}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Context Types */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            {labels.contextTypes}
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTEXT_OPTIONS.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => toggleContextType(type)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  contextTypes.includes(type)
                    ? 'bg-blue-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Export Formats */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            {labels.exports}
          </label>
          <div className="flex flex-wrap gap-2">
            {EXPORT_OPTIONS.map(format => (
              <button
                key={format}
                type="button"
                onClick={() => toggleExportFormat(format)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  suggestedExports.includes(format)
                    ? 'bg-green-500 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                }`}
              >
                .{format}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-neutral-800">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
        >
          {labels.cancel}
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
        >
          {labels.save}
        </button>
      </div>
    </div>
  );
}
