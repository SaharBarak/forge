import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import type { SessionPhase } from '../../types';

const PHASE_INFO: Record<SessionPhase, { en: string; he: string; icon: string }> = {
  initialization: { en: 'Initialization', he: 'אתחול', icon: '🚀' },
  context_loading: { en: 'Loading Context', he: 'טעינת הקשר', icon: '📚' },
  research: { en: 'Research', he: 'מחקר', icon: '🔍' },
  brainstorming: { en: 'Brainstorming', he: 'סיעור מוחות', icon: '💡' },
  argumentation: { en: 'Argumentation', he: 'דיון', icon: '⚔️' },
  synthesis: { en: 'Synthesis', he: 'סינתזה', icon: '🔄' },
  drafting: { en: 'Drafting', he: 'כתיבה', icon: '✏️' },
  review: { en: 'Review', he: 'סקירה', icon: '👁️' },
  consensus: { en: 'Consensus', he: 'קונצנזוס', icon: '🤝' },
  finalization: { en: 'Finalization', he: 'סיום', icon: '✅' },
  building: { en: 'Building', he: 'בנייה', icon: '🔨' },
  picking: { en: 'Picking', he: 'בחירה', icon: '🏆' },
};

export function PhaseIndicator() {
  const { session } = useSessionStore();
  const { hebrewMode } = useUIStore();

  if (!session) return null;

  const phaseInfo = PHASE_INFO[session.currentPhase];
  const phaseName = hebrewMode ? phaseInfo.he : phaseInfo.en;

  const t = {
    round: hebrewMode ? 'סבב' : 'Round',
    phase: hebrewMode ? 'שלב' : 'Phase',
  };

  return (
    <div className="px-4 py-2 border-b border-dark-800 bg-dark-900/80 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Phase */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{phaseInfo.icon}</span>
          <span className="text-sm font-medium text-dark-300">
            {t.phase}: <span className="text-dark-100">{phaseName}</span>
          </span>
        </div>

        {/* Round */}
        <div className="text-sm text-dark-400">
          {t.round}: <span className="text-dark-200">{session.currentRound}</span>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            session.status === 'running'
              ? 'bg-green-500 animate-pulse'
              : session.status === 'paused'
              ? 'bg-yellow-500'
              : 'bg-dark-500'
          }`}
        />
        <span className="text-xs text-dark-400 capitalize">{session.status}</span>
      </div>
    </div>
  );
}
