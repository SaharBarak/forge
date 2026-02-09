import { useState, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useUIStore } from '../stores/uiStore';
import { AGENT_PERSONAS, getActivePersonas, registerCustomPersonas, clearCustomPersonas } from '../agents/personas';
import type { AgentPersona, PersonaSetInfo } from '../types';

interface EditableAgent {
  id: string;
  name: string;
  nameHe: string;
  role: string;
  background: string;
  enabled: boolean;
}

type PersonaSource = 'default' | 'custom' | 'generate';

export function WelcomeScreen() {
  const { createSession } = useSessionStore();
  const { hebrewMode } = useUIStore();

  const [apiKey, setApiKey] = useState('');
  const [websiteName, setWebsiteName] = useState('');
  const [websiteDescription, setWebsiteDescription] = useState('');
  const [brief, setBrief] = useState('');
  const [humanParticipation, setHumanParticipation] = useState(true);

  // Persona state
  const [personaSource, setPersonaSource] = useState<PersonaSource>('default');
  const [availablePersonaSets, setAvailablePersonaSets] = useState<PersonaSetInfo[]>([]);
  const [selectedPersonaSet, setSelectedPersonaSet] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [domainSkills, setDomainSkills] = useState<string | null>(null);
  const [fullPersonas, setFullPersonas] = useState<AgentPersona[] | null>(null); // Full persona data for custom sets

  // Editable agents
  const [agents, setAgents] = useState<EditableAgent[]>(
    getActivePersonas().map((a) => ({
      id: a.id,
      name: a.name,
      nameHe: a.nameHe,
      role: a.role,
      background: a.background,
      enabled: true,
    }))
  );
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  // Load available persona sets on mount
  useEffect(() => {
    loadPersonaSets();
  }, []);

  const loadPersonaSets = async () => {
    if (window.electronAPI?.listPersonas) {
      const sets = await window.electronAPI.listPersonas();
      setAvailablePersonaSets(sets);
    }
  };

  const handleLoadPersonaSet = async (name: string) => {
    if (!window.electronAPI?.loadPersonas) return;

    const result = await window.electronAPI.loadPersonas(name);
    if (result.success && result.personas) {
      setFullPersonas(result.personas); // Store full persona data
      setAgents(
        result.personas.map((a) => ({
          id: a.id,
          name: a.name,
          nameHe: a.nameHe,
          role: a.role,
          background: a.background,
          enabled: true,
        }))
      );
      setDomainSkills(result.skills || null);
      setSelectedPersonaSet(name);
      setPersonaSource('custom');
    }
  };

  const handleGeneratePersonas = async () => {
    if (!window.electronAPI?.generatePersonas) {
      setGenerationError('Persona generation not available');
      return;
    }

    if (!websiteName.trim() || !websiteDescription.trim()) {
      setGenerationError('Please enter project name and description first');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const result = await window.electronAPI.generatePersonas({
        projectName: websiteName,
        goal: websiteDescription,
        count: 5,
      });

      if (result.success && result.personas) {
        setFullPersonas(result.personas); // Store full persona data
        setAgents(
          result.personas.map((a) => ({
            id: a.id,
            name: a.name,
            nameHe: a.nameHe,
            role: a.role,
            background: a.background,
            enabled: true,
          }))
        );
        setDomainSkills(result.skills || null);
        setSelectedPersonaSet(result.savedAs || null);
        setPersonaSource('generate');
        // Refresh the persona sets list
        loadPersonaSets();
      } else {
        setGenerationError(result.error || 'Failed to generate personas');
      }
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResetToDefault = () => {
    setAgents(
      AGENT_PERSONAS.map((a) => ({
        id: a.id,
        name: a.name,
        nameHe: a.nameHe,
        role: a.role,
        background: a.background,
        enabled: true,
      }))
    );
    setFullPersonas(null);
    setDomainSkills(null);
    setSelectedPersonaSet(null);
    setPersonaSource('default');
    clearCustomPersonas();
  };

  const handleStart = () => {
    if (!apiKey.trim() || !websiteName.trim() || !websiteDescription.trim()) return;

    const enabledAgents = agents.filter((a) => a.enabled);
    if (enabledAgents.length === 0) return;

    // Register custom personas if using custom or generated
    if (personaSource !== 'default' && fullPersonas) {
      // Use the full persona data we stored, filtering to only enabled agents
      const enabledPersonas = fullPersonas.filter((p) =>
        enabledAgents.some((a) => a.id === p.id)
      );
      registerCustomPersonas(enabledPersonas);
    } else if (personaSource !== 'default') {
      // Fallback: create from agent data
      const personasToRegister: AgentPersona[] = agents.map((a) => {
        const original = AGENT_PERSONAS.find((p) => p.id === a.id);
        return {
          id: a.id,
          name: a.name,
          nameHe: a.nameHe,
          role: a.role,
          background: a.background,
          age: original?.age || 35,
          personality: original?.personality || [],
          biases: original?.biases || [],
          strengths: original?.strengths || [],
          weaknesses: original?.weaknesses || [],
          speakingStyle: original?.speakingStyle || '',
          color: original?.color || 'blue',
        };
      });
      registerCustomPersonas(personasToRegister);
    } else {
      clearCustomPersonas();
    }

    // Create the goal from the inputs
    const goal = `Create website copy for: ${websiteName}

${websiteDescription}

${brief ? `Additional context:\n${brief}` : ''}

## Agent Personas:
${enabledAgents.map((a) => `- ${a.name} (${a.nameHe}): ${a.role} - ${a.background}`).join('\n')}

${domainSkills ? `## Domain Expertise:\n${domainSkills}` : ''}`;

    createSession({
      projectName: websiteName.trim(),
      goal: goal.trim(),
      enabledAgents: enabledAgents.map((a) => a.id),
      humanParticipation,
      apiKey: apiKey.trim(),
    });
  };

  const updateAgent = (id: string, updates: Partial<EditableAgent>) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const toggleAgent = (id: string) => {
    updateAgent(id, { enabled: !agents.find((a) => a.id === id)?.enabled });
  };

  const t = {
    title: hebrewMode ? 'Forge' : 'Forge',
    subtitle: hebrewMode
      ? 'סוכנים מומחים שמייצגים פרספקטיבות שונות יתווכחו וייצרו תוכן לפרויקט שלך'
      : 'Expert agents representing different perspectives will debate and create content for your project',
    apiKey: hebrewMode ? 'מפתח API של Claude' : 'Claude API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    websiteName: hebrewMode ? 'שם הפרויקט' : 'Project Name',
    websiteNamePlaceholder: hebrewMode ? 'למשל: תַּרְאוּ, Slack, Notion' : 'e.g., Taro, Slack, Notion',
    websiteDescription: hebrewMode ? 'מטרה / תיאור' : 'Goal / Description',
    websiteDescriptionPlaceholder: hebrewMode
      ? 'תאר את הפרויקט ב-2-3 משפטים. מה הוא עושה? למי הוא מיועד?'
      : 'Describe the project in 2-3 sentences. What does it do? Who is it for?',
    brief: hebrewMode ? 'הקשר נוסף (אופציונלי)' : 'Additional Context (optional)',
    briefPlaceholder: hebrewMode
      ? 'מידע נוסף: מתחרים, טון רצוי, מסרים מרכזיים...'
      : 'Extra info: competitors, desired tone, key messages...',
    humanParticipation: hebrewMode
      ? 'אני רוצה להשתתף ולכוון את הדיון'
      : 'I want to participate and guide the discussion',
    start: hebrewMode ? 'התחל דיון' : 'Start Discussion',
    agents: hebrewMode ? 'פרסונות:' : 'Personas:',
    generatePersonas: hebrewMode ? '🔥 יצירת פרסונות' : '🔥 Generate Personas',
    generating: hebrewMode ? 'יוצר פרסונות...' : 'Generating personas...',
    useDefault: hebrewMode ? 'ברירת מחדל' : 'Default',
    loadPersonaSet: hebrewMode ? 'טען סט פרסונות' : 'Load Persona Set',
    personaSource: hebrewMode ? 'מקור פרסונות:' : 'Persona Source:',
    default: hebrewMode ? 'ברירת מחדל (קופירייטינג)' : 'Default (Copywriting)',
    custom: hebrewMode ? 'סט מותאם אישית' : 'Custom Set',
    generated: hebrewMode ? 'נוצר לפרויקט זה' : 'Generated for this project',
  };

  const enabledCount = agents.filter((a) => a.enabled).length;

  return (
    <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-dark-50">🔥 {t.title}</h1>
          <p className="text-dark-400 max-w-lg mx-auto">{t.subtitle}</p>
        </div>

        {/* Form */}
        <div className="bg-dark-900 rounded-xl p-6 space-y-5 border border-dark-800">
          {/* API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">
              {t.apiKey}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.apiKeyPlaceholder}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="border-t border-dark-800 pt-5 space-y-4">
            {/* Website Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                {t.websiteName}
              </label>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder={t.websiteNamePlaceholder}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Website Description */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                {t.websiteDescription}
              </label>
              <textarea
                value={websiteDescription}
                onChange={(e) => setWebsiteDescription(e.target.value)}
                placeholder={t.websiteDescriptionPlaceholder}
                rows={3}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Brief */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-dark-300">
                {t.brief}
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={t.briefPlaceholder}
                rows={2}
                className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Persona Controls */}
          <div className="border-t border-dark-800 pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-dark-300">
                {t.agents}
              </label>
              <div className="flex items-center gap-2">
                {/* Generate Button */}
                <button
                  onClick={handleGeneratePersonas}
                  disabled={isGenerating || !websiteName.trim() || !websiteDescription.trim()}
                  className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-500 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      {t.generating}
                    </>
                  ) : (
                    t.generatePersonas
                  )}
                </button>

                {/* Load from saved */}
                {availablePersonaSets.length > 0 && (
                  <select
                    value={selectedPersonaSet || ''}
                    onChange={(e) => e.target.value && handleLoadPersonaSet(e.target.value)}
                    className="px-3 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-lg text-dark-200"
                  >
                    <option value="">{t.loadPersonaSet}</option>
                    {availablePersonaSets.map((set) => (
                      <option key={set.name} value={set.name}>
                        {set.name} ({set.count})
                      </option>
                    ))}
                  </select>
                )}

                {/* Reset to default */}
                {personaSource !== 'default' && (
                  <button
                    onClick={handleResetToDefault}
                    className="px-3 py-1.5 text-sm text-dark-400 hover:text-dark-200"
                  >
                    {t.useDefault}
                  </button>
                )}
              </div>
            </div>

            {/* Generation Error */}
            {generationError && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                {generationError}
              </div>
            )}

            {/* Persona Source Indicator */}
            {personaSource !== 'default' && (
              <div className="p-2 bg-blue-900/30 border border-blue-700 rounded-lg text-blue-300 text-sm flex items-center gap-2">
                <span>✨</span>
                {personaSource === 'generate' ? t.generated : `${t.custom}: ${selectedPersonaSet}`}
                {domainSkills && <span className="text-blue-400 text-xs ml-2">(+ domain expertise)</span>}
              </div>
            )}

            {/* Agent List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {agents.map((agent) => (
                <div key={agent.id}>
                  {editingAgent === agent.id ? (
                    // Edit Mode
                    <div className="p-4 bg-dark-800 rounded-lg border border-blue-500 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={agent.name}
                          onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                          placeholder="Name"
                          className="px-3 py-2 bg-dark-700 border border-dark-600 rounded text-dark-100 text-sm"
                        />
                        <input
                          type="text"
                          value={agent.nameHe}
                          onChange={(e) => updateAgent(agent.id, { nameHe: e.target.value })}
                          placeholder="Hebrew Name"
                          className="px-3 py-2 bg-dark-700 border border-dark-600 rounded text-dark-100 text-sm"
                          dir="rtl"
                        />
                      </div>
                      <input
                        type="text"
                        value={agent.role}
                        onChange={(e) => updateAgent(agent.id, { role: e.target.value })}
                        placeholder="Role"
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-dark-100 text-sm"
                      />
                      <textarea
                        value={agent.background}
                        onChange={(e) => updateAgent(agent.id, { background: e.target.value })}
                        placeholder="Background"
                        rows={2}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-dark-100 text-sm resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingAgent(null)}
                          className="px-3 py-1.5 text-sm text-dark-400 hover:text-dark-200"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                        agent.enabled
                          ? 'bg-dark-800 border-dark-600 hover:border-dark-500'
                          : 'bg-dark-900 border-dark-800 opacity-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={agent.enabled}
                        onChange={() => toggleAgent(agent.id)}
                        className="w-4 h-4 rounded bg-dark-700 border-dark-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div
                        className="flex-1 min-w-0"
                        onClick={() => setEditingAgent(agent.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-dark-100">
                            {hebrewMode ? agent.nameHe : agent.name}
                          </span>
                          <span className="text-dark-500 text-sm">•</span>
                          <span className="text-dark-400 text-sm truncate">{agent.role}</span>
                        </div>
                        <p className="text-dark-500 text-xs truncate mt-0.5">
                          {agent.background.slice(0, 80)}...
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingAgent(agent.id)}
                        className="text-dark-500 hover:text-dark-300 text-sm"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Human Participation */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={humanParticipation}
              onChange={(e) => setHumanParticipation(e.target.checked)}
              className="w-5 h-5 rounded bg-dark-800 border-dark-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-dark-900"
            />
            <span className="text-dark-300">{t.humanParticipation}</span>
          </label>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!apiKey.trim() || !websiteName.trim() || !websiteDescription.trim() || enabledCount === 0 || isGenerating}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-lg transition-colors mt-4"
          >
            {t.start} ({enabledCount} {hebrewMode ? 'פרסונות' : 'personas'})
          </button>
        </div>
      </div>
    </div>
  );
}
