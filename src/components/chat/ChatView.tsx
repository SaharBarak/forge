import { useRef, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessionStore';
import { useUIStore } from '../../stores/uiStore';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { PhaseIndicator } from './PhaseIndicator';
import { TypingIndicator } from './TypingIndicator';

export function ChatView() {
  const { session, typingAgents } = useSessionStore();
  const { hebrewMode } = useUIStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages.length, typingAgents]);

  if (!session) return null;

  const t = {
    noMessages: hebrewMode
      ? 'עדיין אין הודעות. התחל את הדיון!'
      : 'No messages yet. Start the discussion!',
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Phase Indicator */}
      <PhaseIndicator />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {session.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-dark-500">{t.noMessages}</p>
          </div>
        ) : (
          <>
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {/* Typing indicators */}
            {typingAgents.map((agentId) => (
              <TypingIndicator key={agentId} agentId={agentId} />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput />
    </div>
  );
}
