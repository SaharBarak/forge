import { useState } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { VirtualMessageList } from './VirtualMessageList';
import { ChatInput } from './ChatInput';
import { PhaseIndicator } from './PhaseIndicator';
import { TypingIndicator } from './TypingIndicator';
import { ExportModal } from './ExportModal';

export function ChatView() {
  const { session, typingAgents } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const [showExportModal, setShowExportModal] = useState(false);
  const {
    start,
    pause,
    stop,
    sendHumanMessage,
    isRunning,
    waitingForHuman,
    error,
  } = useOrchestrator();

  if (!session) return null;

  const t = {
    noMessages: hebrewMode
      ? 'עדיין אין הודעות. לחץ על "התחל דיון" להתחיל!'
      : 'No messages yet. Click "Start Discussion" to begin!',
    startDiscussion: hebrewMode ? 'התחל דיון' : 'Start Discussion',
    pauseDiscussion: hebrewMode ? 'השהה' : 'Pause',
    resumeDiscussion: hebrewMode ? 'המשך' : 'Resume',
    stopDiscussion: hebrewMode ? 'עצור' : 'Stop',
    exportSession: hebrewMode ? 'ייצוא' : 'Export',
    waitingForYou: hebrewMode ? '⏳ ממתינים לתגובתך...' : '⏳ Waiting for your input...',
    error: hebrewMode ? 'שגיאה' : 'Error',
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Phase Indicator & Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-dark-800">
        <PhaseIndicator />

        <div className="flex items-center gap-2">
          {error && (
            <span className="text-red-500 text-sm mr-4">
              {t.error}: {error}
            </span>
          )}

          {!isRunning && session.status !== 'completed' && (
            <button
              onClick={start}
              className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {session.messages.length === 0 ? t.startDiscussion : t.resumeDiscussion}
            </button>
          )}

          {isRunning && (
            <>
              <button
                onClick={pause}
                className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t.pauseDiscussion}
              </button>
              <button
                onClick={stop}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {t.stopDiscussion}
              </button>
            </>
          )}

          {/* Export button - always visible when there are messages */}
          {session.messages.length > 0 && (
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-sm font-medium rounded-lg transition-colors"
            >
              📤 {t.exportSession}
            </button>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Messages - Virtual scrolling for 50+ messages */}
      <VirtualMessageList
        messages={session.messages}
        typingAgents={typingAgents}
        waitingForHuman={waitingForHuman}
        hebrewMode={hebrewMode}
      />

      {/* Typing indicators (rendered outside virtual list for visibility) */}
      {session.messages.length >= 50 && typingAgents.length > 0 && (
        <div className="px-4 py-2 border-t border-dark-800">
          {typingAgents.map((agentId) => (
            <TypingIndicator key={agentId} agentId={agentId} />
          ))}
        </div>
      )}

      {/* Typing indicators for non-virtualized mode */}
      {session.messages.length < 50 && typingAgents.length > 0 && (
        <div className="px-4 pb-2">
          {typingAgents.map((agentId) => (
            <TypingIndicator key={agentId} agentId={agentId} />
          ))}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendHumanMessage}
        onInterrupt={pause}
        isRunning={isRunning}
      />
    </div>
  );
}
