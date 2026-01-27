import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Message } from '../../types';
import { getAgentById, getAgentDisplayName, getAgentColor } from '../../agents/personas';
import { useUIStore } from '../../stores/uiStore';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { hebrewMode } = useUIStore();
  const agent = getAgentById(message.agentId);
  const color = getAgentColor(message.agentId);
  const displayName = getAgentDisplayName(message.agentId, hebrewMode);

  const isHuman = message.agentId === 'human';
  const isSystem = message.agentId === 'system';

  const content = useMemo(() => {
    if (hebrewMode && message.contentHe) return message.contentHe;
    return message.content;
  }, [message, hebrewMode]);

  const typeLabel = useMemo(() => {
    const labels: Record<string, { en: string; he: string }> = {
      argument: { en: 'Argument', he: 'טיעון' },
      question: { en: 'Question', he: 'שאלה' },
      proposal: { en: 'Proposal', he: 'הצעה' },
      agreement: { en: 'Agreement', he: 'הסכמה' },
      disagreement: { en: 'Disagreement', he: 'התנגדות' },
      synthesis: { en: 'Synthesis', he: 'סינתזה' },
      research_request: { en: 'Research Request', he: 'בקשת מחקר' },
      research_result: { en: 'Research Result', he: 'תוצאת מחקר' },
      human_input: { en: 'Input', he: 'קלט' },
      system: { en: 'System', he: 'מערכת' },
      consensus: { en: 'Consensus', he: 'קונצנזוס' },
      vote: { en: 'Vote', he: 'הצבעה' },
      methodology: { en: 'Methodology', he: 'מתודולוגיה' },
    };
    const label = labels[message.type] || { en: message.type, he: message.type };
    return hebrewMode ? label.he : label.en;
  }, [message.type, hebrewMode]);

  const timeString = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString(hebrewMode ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [message.timestamp, hebrewMode]);

  // System messages
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="px-4 py-2 bg-dark-800/50 rounded-full text-dark-400 text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isHuman ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl border-l-4 ${isHuman ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={{
          borderLeftColor: `var(--color-${color})`,
          backgroundColor: isHuman ? 'rgb(37 99 235 / 0.15)' : 'rgb(38 38 38)',
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <span
            className="font-semibold text-sm"
            style={{ color: `var(--color-${color})` }}
          >
            {displayName}
          </span>
          {agent && (
            <span className="text-xs text-dark-500">({agent.role})</span>
          )}
          <span className="text-xs text-dark-600 ms-auto">{typeLabel}</span>
        </div>

        {/* Content */}
        <div className="px-4 pb-3 prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* Footer */}
        <div className="px-4 pb-2 text-xs text-dark-600">{timeString}</div>
      </div>
    </div>
  );
}
