import { useRef, useEffect, useState, Suspense, lazy } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import { useOrchestrator } from '../../hooks/useOrchestrator';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { PhaseIndicator } from './PhaseIndicator';
import { TypingIndicator } from './TypingIndicator';
import { VirtualMessageList, VIRTUAL_SCROLL_THRESHOLD } from './VirtualMessageList';
import { LoadingFallback } from '../lazy';

// Lazy load ExportModal - Issue #23
const LazyExportModal = lazy(() =>
  import('./ExportModal').then(module => ({
    default: module.ExportModal,
  }))
);

export function ChatView() {
  const { session, typingAgents } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const {
    start,
    pause,
    stop,
    sendHumanMessage,
    isRunning,
    waitingForHuman,
    error,
  } = useOrchestrator();

  // Auto-scroll to bottom on new messages (only for non-virtual list)
  useEffect(() => {
    // Skip if using virtual scrolling - VirtualMessageList handles its own scrolling
    if (session && session.messages.length >= VIRTUAL_SCROLL_THRESHOLD) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, typingAgents]);

  // Track container size for virtual scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

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

      {/* Export Modal - Lazy loaded */}
      {showExportModal && (
        <Suspense fallback={<LoadingFallback />}>
          <LazyExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
          />
        </Suspense>
      )}

      {/* Messages - Uses virtual scrolling for large lists (Issue #25) */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {session.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-dark-500">{t.noMessages}</p>
          </div>
        ) : session.messages.length >= VIRTUAL_SCROLL_THRESHOLD && containerSize.height > 0 ? (
          /* Virtual scrolling for large message lists */
          <VirtualMessageList
            messages={session.messages}
            height={containerSize.height}
            width={containerSize.width}
            waitingForHuman={waitingForHuman}
            waitingText={t.waitingForYou}
            typingAgents={typingAgents}
            TypingIndicator={TypingIndicator}
          />
        ) : (
          /* Standard rendering for smaller lists */
          <>
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Waiting for human indicator */}
            {waitingForHuman && (
              <div className="flex justify-center py-4">
                <span className="text-orange-400 animate-pulse">{t.waitingForYou}</span>
              </div>
            )}

            {/* Typing indicators */}
            {typingAgents.map((agentId) => (
              <TypingIndicator key={agentId} agentId={agentId} />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendHumanMessage}
        onInterrupt={pause}
        isRunning={isRunning}
      />
    </div>
  );
}
