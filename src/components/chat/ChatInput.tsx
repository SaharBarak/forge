import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';

interface ChatInputProps {
  onSend?: (message: string) => Promise<void>;
  onInterrupt?: () => void;
  isRunning?: boolean;
}

export function ChatInput({ onSend, onInterrupt, isRunning = false }: ChatInputProps) {
  const { session, addHumanMessage, humanInputEnabled, isSending } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'join' | 'interrupt'>('join');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend =
    session?.config.humanParticipation &&
    humanInputEnabled &&
    !isSending &&
    input.trim().length > 0;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!canSend) return;
    const message = input.trim();
    setInput('');

    // If interrupt mode and agents are running, pause first
    if (mode === 'interrupt' && isRunning && onInterrupt) {
      onInterrupt();
    }

    if (onSend) {
      await onSend(message);
    } else {
      addHumanMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const t = {
    placeholder: hebrewMode
      ? 'הקלד את תגובתך... (Enter לשליחה)'
      : 'Type your message... (Enter to send)',
    join: hebrewMode ? 'הצטרף' : 'Join',
    interrupt: hebrewMode ? 'קטע' : 'Interrupt',
    joinDesc: hebrewMode ? 'הוסף הודעה, הסוכנים ימשיכו' : 'Add message, agents continue',
    interruptDesc: hebrewMode ? 'עצור סוכנים, קח שליטה' : 'Stop agents, take control',
    disabled: hebrewMode ? 'השתתפות מושבתת' : 'Participation disabled',
    send: hebrewMode ? 'שלח' : 'Send',
  };

  if (!session?.config.humanParticipation) {
    return (
      <div className="px-4 py-3 border-t border-dark-800 bg-dark-900/50">
        <p className="text-dark-500 text-center text-sm">{t.disabled}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-dark-800 bg-dark-900/50">
      {/* Mode Toggle */}
      {isRunning && (
        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={() => setMode('join')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              mode === 'join'
                ? 'bg-green-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
            title={t.joinDesc}
          >
            {t.join}
          </button>
          <button
            onClick={() => setMode('interrupt')}
            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
              mode === 'interrupt'
                ? 'bg-red-600 text-white'
                : 'bg-dark-800 text-dark-400 hover:text-dark-200'
            }`}
            title={t.interruptDesc}
          >
            {t.interrupt}
          </button>
        </div>
      )}

      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
            disabled={!humanInputEnabled || isSending}
            rows={1}
            className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-xl text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ minHeight: '48px' }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`px-6 py-3 font-medium rounded-xl transition-colors flex items-center gap-2 ${
            mode === 'interrupt' && isRunning
              ? 'bg-red-600 hover:bg-red-500 disabled:bg-dark-700'
              : 'bg-orange-600 hover:bg-orange-500 disabled:bg-dark-700'
          } disabled:text-dark-500 text-white`}
        >
          <SendIcon />
          {mode === 'interrupt' && isRunning ? t.interrupt : t.send}
        </button>
      </div>

      {/* Mode hint */}
      {isRunning && (
        <p className="text-center text-xs text-dark-500 mt-2">
          {mode === 'join' ? t.joinDesc : t.interruptDesc}
        </p>
      )}
    </div>
  );
}

function SendIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
