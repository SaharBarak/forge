import { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';

export function ChatInput() {
  const { session, addHumanMessage, humanInputEnabled, isSending } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const [input, setInput] = useState('');
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

  const handleSend = () => {
    if (!canSend) return;
    addHumanMessage(input.trim());
    setInput('');
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
      ? 'הקלד את תגובתך... (Enter לשליחה, Shift+Enter לשורה חדשה)'
      : 'Type your response... (Enter to send, Shift+Enter for new line)',
    send: hebrewMode ? 'שלח' : 'Send',
    disabled: hebrewMode ? 'השתתפות מושבתת' : 'Participation disabled',
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
          className="px-6 py-3 bg-human hover:bg-orange-500 disabled:bg-dark-700 disabled:text-dark-500 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          <SendIcon />
          {t.send}
        </button>
      </div>
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
