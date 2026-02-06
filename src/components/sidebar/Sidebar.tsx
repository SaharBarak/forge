import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import { getActivePersonas } from '../../agents/personas';
import { AgentCard } from './AgentCard';
import { prefetchHints } from '../lazy';

export function Sidebar() {
  const { session, isRunning, pauseSession, resumeSession, endSession } = useSessionStore();
  const { sidebarOpen, hebrewMode, setView, currentView, setSettingsOpen } = useUIStore();

  if (!sidebarOpen) return null;

  const t = {
    agents: hebrewMode ? 'סוכנים' : 'Agents',
    views: hebrewMode ? 'תצוגות' : 'Views',
    chat: hebrewMode ? 'צ\'אט' : 'Chat',
    drafts: hebrewMode ? 'טיוטות' : 'Drafts',
    decisions: hebrewMode ? 'החלטות' : 'Decisions',
    context: hebrewMode ? 'הקשר' : 'Context',
    controls: hebrewMode ? 'בקרה' : 'Controls',
    pause: hebrewMode ? 'השהה' : 'Pause',
    resume: hebrewMode ? 'המשך' : 'Resume',
    end: hebrewMode ? 'סיים' : 'End Session',
    settings: hebrewMode ? 'הגדרות' : 'Settings',
    project: hebrewMode ? 'פרויקט' : 'Project',
  };

  const enabledAgents = session?.config.enabledAgents || [];

  return (
    <aside className="w-72 bg-dark-900 border-e border-dark-800 flex flex-col">
      {/* Project Info */}
      {session && (
        <div className="p-4 border-b border-dark-800">
          <div className="text-xs text-dark-500 mb-1">{t.project}</div>
          <div className="font-semibold text-dark-100 truncate">
            {session.config.projectName}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 border-b border-dark-800">
        <div className="text-xs text-dark-500 mb-2">{t.views}</div>
        <nav className="space-y-1">
          {(['chat', 'drafts', 'decisions', 'context'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setView(view)}
              className={`w-full px-3 py-2 rounded-lg text-start text-sm transition-colors ${
                currentView === view
                  ? 'bg-dark-700 text-dark-100'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-200'
              }`}
            >
              {t[view]}
            </button>
          ))}
        </nav>
      </div>

      {/* Agents - scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="text-xs text-dark-500 mb-2">{t.agents} ({enabledAgents.length})</div>
        <div className="space-y-2">
          {getActivePersonas()
            .filter((a) => enabledAgents.includes(a.id))
            .map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
        </div>
      </div>

      {/* Controls */}
      {session && (
        <div className="p-4 border-t border-dark-800 space-y-2">
          <div className="text-xs text-dark-500 mb-2">{t.controls}</div>
          <div className="flex gap-2">
            {isRunning ? (
              <button
                onClick={pauseSession}
                className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors"
              >
                {t.pause}
              </button>
            ) : (
              <button
                onClick={resumeSession}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors"
              >
                {t.resume}
              </button>
            )}
            <button
              onClick={endSession}
              className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
            >
              {t.end}
            </button>
          </div>
        </div>
      )}

      {/* Settings Button - Prefetches SettingsModal on hover */}
      <div className="p-4 border-t border-dark-800">
        <button
          onClick={() => setSettingsOpen(true)}
          onMouseEnter={prefetchHints.settingsModal}
          onFocus={prefetchHints.settingsModal}
          className="w-full px-3 py-2 bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm rounded-lg transition-colors flex items-center gap-2 justify-center"
        >
          <SettingsIcon />
          {t.settings}
        </button>
      </div>
    </aside>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

