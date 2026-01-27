import { useState } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { useUIStore } from '../stores/uiStore';
import { AGENT_PERSONAS } from '../agents/personas';

export function WelcomeScreen() {
  const { createSession } = useSessionStore();
  const { hebrewMode } = useUIStore();

  const [projectName, setProjectName] = useState('');
  const [goal, setGoal] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(
    AGENT_PERSONAS.map((a) => a.id)
  );
  const [humanParticipation, setHumanParticipation] = useState(true);

  const handleStart = () => {
    if (!projectName.trim() || !goal.trim()) return;

    createSession({
      projectName: projectName.trim(),
      goal: goal.trim(),
      enabledAgents: selectedAgents,
      humanParticipation,
    });
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const t = {
    title: hebrewMode ? 'ברוכים הבאים ל-Think Tank' : 'Welcome to Think Tank',
    subtitle: hebrewMode
      ? 'צור סשן חדש כדי להתחיל דיון עם הסוכנים'
      : 'Create a new session to start a discussion with agents',
    projectName: hebrewMode ? 'שם הפרויקט' : 'Project Name',
    projectPlaceholder: hebrewMode ? 'למשל: דף נחיתה לתַּרְאוּ' : 'e.g., Landing page for Taro',
    goal: hebrewMode ? 'מטרת הדיון' : 'Discussion Goal',
    goalPlaceholder: hebrewMode
      ? 'מה אתם רוצים להשיג? למשל: ליצור 5 גרסאות שונות של דף נחיתה'
      : 'What do you want to achieve? e.g., Create 5 different landing page versions',
    selectAgents: hebrewMode ? 'בחר סוכנים' : 'Select Agents',
    humanParticipation: hebrewMode ? 'אני רוצה להשתתף בדיון' : 'I want to participate',
    start: hebrewMode ? 'התחל סשן' : 'Start Session',
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-dark-50">{t.title}</h1>
          <p className="text-dark-400">{t.subtitle}</p>
        </div>

        {/* Form */}
        <div className="bg-dark-900 rounded-xl p-6 space-y-6 border border-dark-800">
          {/* Project Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">
              {t.projectName}
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t.projectPlaceholder}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">{t.goal}</label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t.goalPlaceholder}
              rows={3}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Agent Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-dark-300">
              {t.selectAgents}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AGENT_PERSONAS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => toggleAgent(agent.id)}
                  className={`p-3 rounded-lg border transition-all text-start ${
                    selectedAgents.includes(agent.id)
                      ? `bg-${agent.color}/20 border-${agent.color} text-${agent.color}`
                      : 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600'
                  }`}
                  style={{
                    borderColor: selectedAgents.includes(agent.id)
                      ? `var(--color-${agent.color})`
                      : undefined,
                    backgroundColor: selectedAgents.includes(agent.id)
                      ? `color-mix(in srgb, var(--color-${agent.color}) 15%, transparent)`
                      : undefined,
                  }}
                >
                  <div className="font-medium">
                    {hebrewMode ? agent.nameHe : agent.name}
                  </div>
                  <div className="text-xs opacity-70">{agent.role}</div>
                </button>
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
            disabled={!projectName.trim() || !goal.trim() || selectedAgents.length === 0}
            className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-lg transition-colors"
          >
            {t.start}
          </button>
        </div>
      </div>
    </div>
  );
}
