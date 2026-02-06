/**
 * PersonaCreatorWizard - Multi-step wizard for creating agent personas
 * Issue #18: Persona Marketplace - Creator Wizard
 */

import { useState, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { AgentPersona } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

interface PersonaCreatorWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: AgentPersona) => Promise<void>;
  existingPersona?: AgentPersona;
}

interface WizardFormData {
  // Step 1: Basic Info
  id: string;
  name: string;
  nameHe: string;
  role: string;
  age: number;
  background: string;
  avatar: string;
  color: string;

  // Step 2: Communication Style
  speakingStyle: string;
  formality: 'formal' | 'casual' | 'professional' | 'friendly';
  tone: 'assertive' | 'supportive' | 'analytical' | 'creative' | 'diplomatic';
  verbosity: 'concise' | 'moderate' | 'detailed';

  // Step 3: Personality & Biases
  personality: string[];
  biases: string[];
  strengths: string[];
  weaknesses: string[];

  // Step 4: Language Preferences
  primaryLanguage: 'hebrew' | 'english' | 'mixed';
  languageNotes: string;
}

const AVATAR_OPTIONS = [
  '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨', '👨‍💻', '👩‍💻',
  '🧑‍🏫', '👨‍⚖️', '👩‍⚖️', '🧠', '💡', '📊', '🎯', '🔍',
];

const COLOR_OPTIONS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

const PERSONALITY_SUGGESTIONS = [
  'Analytical', 'Creative', 'Empathetic', 'Strategic', 'Detail-oriented',
  'Big-picture thinker', 'Risk-taker', 'Conservative', 'Collaborative',
  'Independent', 'Data-driven', 'Intuitive', 'Pragmatic', 'Visionary',
];

const BIAS_SUGGESTIONS = [
  'Favors data over intuition', 'Prefers proven solutions', 'Prioritizes innovation',
  'Values efficiency', 'Emphasizes user experience', 'Focuses on ROI',
  'Champions sustainability', 'Advocates for simplicity', 'Supports bold moves',
];

const STRENGTH_SUGGESTIONS = [
  'Research', 'Persuasion', 'Critical thinking', 'Synthesis',
  'Communication', 'Problem-solving', 'Creative ideation', 'Analysis',
];

const WEAKNESS_SUGGESTIONS = [
  'Overthinking', 'Impatience', 'Risk aversion', 'Over-optimism',
  'Perfectionism', 'Scope creep', 'Analysis paralysis',
];

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  formData: WizardFormData;
  setFormData: React.Dispatch<React.SetStateAction<WizardFormData>>;
  hebrewMode: boolean;
}

function Step1BasicInfo({ formData, setFormData, hebrewMode }: StepProps) {
  const t = {
    title: hebrewMode ? 'מידע בסיסי' : 'Basic Information',
    name: hebrewMode ? 'שם (אנגלית)' : 'Name (English)',
    nameHe: hebrewMode ? 'שם (עברית)' : 'Name (Hebrew)',
    role: hebrewMode ? 'תפקיד' : 'Role',
    age: hebrewMode ? 'גיל' : 'Age',
    background: hebrewMode ? 'רקע' : 'Background',
    avatar: hebrewMode ? 'אווטאר' : 'Avatar',
    color: hebrewMode ? 'צבע' : 'Color',
    backgroundPlaceholder: hebrewMode
      ? 'תאר את הרקע המקצועי והניסיון של הפרסונה...'
      : 'Describe the persona\'s professional background and experience...',
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{t.title}</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t.name}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Alex"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t.nameHe}</label>
          <input
            type="text"
            value={formData.nameHe}
            onChange={(e) => setFormData((prev) => ({ ...prev, nameHe: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            dir="rtl"
            placeholder="אלכס"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t.role}</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Senior Copywriter"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t.age}</label>
          <input
            type="number"
            value={formData.age}
            onChange={(e) => setFormData((prev) => ({ ...prev, age: parseInt(e.target.value) || 30 }))}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={18}
            max={80}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{t.background}</label>
        <textarea
          value={formData.background}
          onChange={(e) => setFormData((prev) => ({ ...prev, background: e.target.value }))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder={t.backgroundPlaceholder}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.avatar}</label>
        <div className="flex flex-wrap gap-2">
          {AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => setFormData((prev) => ({ ...prev, avatar: emoji }))}
              className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                formData.avatar === emoji
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.color}</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              onClick={() => setFormData((prev) => ({ ...prev, color }))}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                formData.color === color ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2CommunicationStyle({ formData, setFormData, hebrewMode }: StepProps) {
  const t = {
    title: hebrewMode ? 'סגנון תקשורת' : 'Communication Style',
    speakingStyle: hebrewMode ? 'סגנון דיבור' : 'Speaking Style',
    formality: hebrewMode ? 'רשמיות' : 'Formality',
    tone: hebrewMode ? 'טון' : 'Tone',
    verbosity: hebrewMode ? 'מידת פירוט' : 'Verbosity',
    speakingStylePlaceholder: hebrewMode
      ? 'תאר את סגנון הדיבור הייחודי...'
      : 'Describe the unique speaking style...',
  };

  const formalityOptions = [
    { value: 'formal', label: hebrewMode ? 'רשמי' : 'Formal' },
    { value: 'professional', label: hebrewMode ? 'מקצועי' : 'Professional' },
    { value: 'friendly', label: hebrewMode ? 'ידידותי' : 'Friendly' },
    { value: 'casual', label: hebrewMode ? 'יומיומי' : 'Casual' },
  ];

  const toneOptions = [
    { value: 'assertive', label: hebrewMode ? 'אסרטיבי' : 'Assertive' },
    { value: 'supportive', label: hebrewMode ? 'תומך' : 'Supportive' },
    { value: 'analytical', label: hebrewMode ? 'אנליטי' : 'Analytical' },
    { value: 'creative', label: hebrewMode ? 'יצירתי' : 'Creative' },
    { value: 'diplomatic', label: hebrewMode ? 'דיפלומטי' : 'Diplomatic' },
  ];

  const verbosityOptions = [
    { value: 'concise', label: hebrewMode ? 'תמציתי' : 'Concise' },
    { value: 'moderate', label: hebrewMode ? 'מתון' : 'Moderate' },
    { value: 'detailed', label: hebrewMode ? 'מפורט' : 'Detailed' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{t.title}</h3>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{t.speakingStyle}</label>
        <textarea
          value={formData.speakingStyle}
          onChange={(e) => setFormData((prev) => ({ ...prev, speakingStyle: e.target.value }))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={2}
          placeholder={t.speakingStylePlaceholder}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.formality}</label>
        <div className="flex flex-wrap gap-2">
          {formalityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData((prev) => ({ ...prev, formality: opt.value as WizardFormData['formality'] }))}
              className={`px-4 py-2 rounded-lg border transition-all ${
                formData.formality === opt.value
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.tone}</label>
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData((prev) => ({ ...prev, tone: opt.value as WizardFormData['tone'] }))}
              className={`px-4 py-2 rounded-lg border transition-all ${
                formData.tone === opt.value
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.verbosity}</label>
        <div className="flex flex-wrap gap-2">
          {verbosityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData((prev) => ({ ...prev, verbosity: opt.value as WizardFormData['verbosity'] }))}
              className={`px-4 py-2 rounded-lg border transition-all ${
                formData.verbosity === opt.value
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3PersonalityBiases({ formData, setFormData, hebrewMode }: StepProps) {
  const t = {
    title: hebrewMode ? 'אישיות והטיות' : 'Personality & Biases',
    personality: hebrewMode ? 'תכונות אישיות' : 'Personality Traits',
    biases: hebrewMode ? 'הטיות' : 'Biases',
    strengths: hebrewMode ? 'חוזקות' : 'Strengths',
    weaknesses: hebrewMode ? 'חולשות' : 'Weaknesses',
    addCustom: hebrewMode ? 'הוסף...' : 'Add custom...',
  };

  const toggleArrayItem = (field: 'personality' | 'biases' | 'strengths' | 'weaknesses', item: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
  };

  const renderTagSelector = (
    field: 'personality' | 'biases' | 'strengths' | 'weaknesses',
    suggestions: string[],
    label: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {suggestions.map((item) => (
          <button
            key={item}
            onClick={() => toggleArrayItem(field, item)}
            className={`px-3 py-1 text-sm rounded-full border transition-all ${
              formData[field].includes(item)
                ? 'border-blue-500 bg-blue-500/20 text-white'
                : 'border-gray-600 text-gray-400 hover:border-gray-500'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t.addCustom}
          className="flex-1 px-3 py-1 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const value = (e.target as HTMLInputElement).value.trim();
              if (value && !formData[field].includes(value)) {
                toggleArrayItem(field, value);
                (e.target as HTMLInputElement).value = '';
              }
            }
          }}
        />
      </div>
      {formData[field].length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {formData[field].map((item) => (
            <span
              key={item}
              className="inline-flex items-center px-2 py-1 text-xs bg-blue-500/30 text-blue-200 rounded-full"
            >
              {item}
              <button
                onClick={() => toggleArrayItem(field, item)}
                className="ml-1 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{t.title}</h3>
      {renderTagSelector('personality', PERSONALITY_SUGGESTIONS, t.personality)}
      {renderTagSelector('biases', BIAS_SUGGESTIONS, t.biases)}
      {renderTagSelector('strengths', STRENGTH_SUGGESTIONS, t.strengths)}
      {renderTagSelector('weaknesses', WEAKNESS_SUGGESTIONS, t.weaknesses)}
    </div>
  );
}

function Step4LanguagePreferences({ formData, setFormData, hebrewMode }: StepProps) {
  const t = {
    title: hebrewMode ? 'העדפות שפה' : 'Language Preferences',
    primaryLanguage: hebrewMode ? 'שפה ראשית' : 'Primary Language',
    languageNotes: hebrewMode ? 'הערות שפה' : 'Language Notes',
    languageNotesPlaceholder: hebrewMode
      ? 'הערות נוספות על שימוש בשפה, מונחים מועדפים וכו\'...'
      : 'Additional notes on language usage, preferred terms, etc...',
  };

  const languageOptions = [
    { value: 'hebrew', label: hebrewMode ? 'עברית' : 'Hebrew', emoji: '🇮🇱' },
    { value: 'english', label: hebrewMode ? 'אנגלית' : 'English', emoji: '🇬🇧' },
    { value: 'mixed', label: hebrewMode ? 'משולב' : 'Mixed', emoji: '🌐' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">{t.title}</h3>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">{t.primaryLanguage}</label>
        <div className="flex flex-wrap gap-3">
          {languageOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFormData((prev) => ({ ...prev, primaryLanguage: opt.value as WizardFormData['primaryLanguage'] }))}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                formData.primaryLanguage === opt.value
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 text-gray-300 hover:border-gray-500'
              }`}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{t.languageNotes}</label>
        <textarea
          value={formData.languageNotes}
          onChange={(e) => setFormData((prev) => ({ ...prev, languageNotes: e.target.value }))}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          rows={4}
          placeholder={t.languageNotesPlaceholder}
        />
      </div>
    </div>
  );
}

function Step5Review({ formData, hebrewMode }: Omit<StepProps, 'setFormData'>) {
  const t = {
    title: hebrewMode ? 'סקירה ושמירה' : 'Review & Save',
    basicInfo: hebrewMode ? 'מידע בסיסי' : 'Basic Info',
    communication: hebrewMode ? 'תקשורת' : 'Communication',
    personality: hebrewMode ? 'אישיות' : 'Personality',
    language: hebrewMode ? 'שפה' : 'Language',
    name: hebrewMode ? 'שם' : 'Name',
    role: hebrewMode ? 'תפקיד' : 'Role',
    age: hebrewMode ? 'גיל' : 'Age',
    style: hebrewMode ? 'סגנון' : 'Style',
    formality: hebrewMode ? 'רשמיות' : 'Formality',
    tone: hebrewMode ? 'טון' : 'Tone',
    traits: hebrewMode ? 'תכונות' : 'Traits',
    biases: hebrewMode ? 'הטיות' : 'Biases',
    strengths: hebrewMode ? 'חוזקות' : 'Strengths',
    weaknesses: hebrewMode ? 'חולשות' : 'Weaknesses',
    primaryLang: hebrewMode ? 'שפה ראשית' : 'Primary Language',
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-gray-700/50 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-400 mb-3">{title}</h4>
      {children}
    </div>
  );

  const InfoRow = ({ label, value }: { label: string; value: string | number }) => (
    <div className="flex justify-between py-1">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );

  const TagList = ({ items }: { items: string[] }) => (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.length > 0 ? (
        items.map((item) => (
          <span key={item} className="px-2 py-0.5 text-xs bg-gray-600 text-gray-200 rounded-full">
            {item}
          </span>
        ))
      ) : (
        <span className="text-gray-500 text-sm">—</span>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">{t.title}</h3>

      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ backgroundColor: formData.color + '30', border: `2px solid ${formData.color}` }}
        >
          {formData.avatar || '👤'}
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{formData.name || 'Unnamed'}</h2>
          {formData.nameHe && <p className="text-gray-400" dir="rtl">{formData.nameHe}</p>}
          <p className="text-gray-400">{formData.role || 'No role'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Section title={t.basicInfo}>
          <InfoRow label={t.age} value={formData.age} />
          <div className="mt-2">
            <span className="text-gray-400 text-sm">{hebrewMode ? 'רקע' : 'Background'}</span>
            <p className="text-white text-sm mt-1">{formData.background || '—'}</p>
          </div>
        </Section>

        <Section title={t.communication}>
          <InfoRow label={t.formality} value={formData.formality} />
          <InfoRow label={t.tone} value={formData.tone} />
          <InfoRow label={hebrewMode ? 'מידת פירוט' : 'Verbosity'} value={formData.verbosity} />
        </Section>
      </div>

      <Section title={t.personality}>
        <div className="space-y-2">
          <div>
            <span className="text-gray-400 text-xs">{t.traits}</span>
            <TagList items={formData.personality} />
          </div>
          <div>
            <span className="text-gray-400 text-xs">{t.biases}</span>
            <TagList items={formData.biases} />
          </div>
          <div>
            <span className="text-gray-400 text-xs">{t.strengths}</span>
            <TagList items={formData.strengths} />
          </div>
          <div>
            <span className="text-gray-400 text-xs">{t.weaknesses}</span>
            <TagList items={formData.weaknesses} />
          </div>
        </div>
      </Section>

      <Section title={t.language}>
        <InfoRow
          label={t.primaryLang}
          value={
            formData.primaryLanguage === 'hebrew' ? '🇮🇱 Hebrew' :
            formData.primaryLanguage === 'english' ? '🇬🇧 English' : '🌐 Mixed'
          }
        />
        {formData.languageNotes && (
          <p className="text-sm text-gray-300 mt-2">{formData.languageNotes}</p>
        )}
      </Section>
    </div>
  );
}

// ============================================================================
// MAIN WIZARD COMPONENT
// ============================================================================

const INITIAL_FORM_DATA: WizardFormData = {
  id: '',
  name: '',
  nameHe: '',
  role: '',
  age: 35,
  background: '',
  avatar: '👨‍💼',
  color: '#3B82F6',
  speakingStyle: '',
  formality: 'professional',
  tone: 'analytical',
  verbosity: 'moderate',
  personality: [],
  biases: [],
  strengths: [],
  weaknesses: [],
  primaryLanguage: 'mixed',
  languageNotes: '',
};

export function PersonaCreatorWizard({ isOpen, onClose, onSave, existingPersona }: PersonaCreatorWizardProps) {
  const { hebrewMode } = useUIStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>(() => {
    if (existingPersona) {
      return {
        id: existingPersona.id,
        name: existingPersona.name,
        nameHe: existingPersona.nameHe,
        role: existingPersona.role,
        age: existingPersona.age,
        background: existingPersona.background,
        avatar: existingPersona.avatar || '👨‍💼',
        color: existingPersona.color,
        speakingStyle: existingPersona.speakingStyle,
        formality: 'professional',
        tone: 'analytical',
        verbosity: 'moderate',
        personality: existingPersona.personality,
        biases: existingPersona.biases,
        strengths: existingPersona.strengths,
        weaknesses: existingPersona.weaknesses,
        primaryLanguage: 'mixed',
        languageNotes: '',
      };
    }
    return INITIAL_FORM_DATA;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = {
    title: hebrewMode ? 'יצירת פרסונה' : 'Create Persona',
    editTitle: hebrewMode ? 'עריכת פרסונה' : 'Edit Persona',
    step: hebrewMode ? 'שלב' : 'Step',
    of: hebrewMode ? 'מתוך' : 'of',
    next: hebrewMode ? 'הבא' : 'Next',
    back: hebrewMode ? 'חזור' : 'Back',
    save: hebrewMode ? 'שמור' : 'Save',
    saving: hebrewMode ? 'שומר...' : 'Saving...',
    cancel: hebrewMode ? 'ביטול' : 'Cancel',
  };

  const totalSteps = 5;

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const persona: AgentPersona = {
        id: formData.id || `persona-${Date.now()}`,
        name: formData.name,
        nameHe: formData.nameHe,
        role: formData.role,
        age: formData.age,
        background: formData.background,
        personality: formData.personality,
        biases: formData.biases,
        strengths: formData.strengths,
        weaknesses: formData.weaknesses,
        speakingStyle: formData.speakingStyle,
        color: formData.color,
        avatar: formData.avatar,
      };

      await onSave(persona);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save persona');
    } finally {
      setIsSaving(false);
    }
  }, [formData, onSave, onClose]);

  const handleClose = useCallback(() => {
    setCurrentStep(1);
    setFormData(INITIAL_FORM_DATA);
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo formData={formData} setFormData={setFormData} hebrewMode={hebrewMode} />;
      case 2:
        return <Step2CommunicationStyle formData={formData} setFormData={setFormData} hebrewMode={hebrewMode} />;
      case 3:
        return <Step3PersonalityBiases formData={formData} setFormData={setFormData} hebrewMode={hebrewMode} />;
      case 4:
        return <Step4LanguagePreferences formData={formData} setFormData={setFormData} hebrewMode={hebrewMode} />;
      case 5:
        return <Step5Review formData={formData} hebrewMode={hebrewMode} />;
      default:
        return null;
    }
  };

  const stepLabels = hebrewMode
    ? ['בסיסי', 'תקשורת', 'אישיות', 'שפה', 'סקירה']
    : ['Basic', 'Communication', 'Personality', 'Language', 'Review'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        dir={hebrewMode ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {existingPersona ? t.editTitle : t.title}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex justify-between items-center">
            {stepLabels.map((label, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;

              return (
                <div key={label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      {isCompleted ? '✓' : stepNum}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isActive ? 'text-blue-400' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-2 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-600'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStep()}</div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            {t.step} {currentStep} {t.of} {totalSteps}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              {t.cancel}
            </button>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t.back}
              </button>
            )}
            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {t.next}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t.saving : t.save}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PersonaCreatorWizard;
