import { getAgentDisplayName, getAgentColor } from '../../agents/personas';
import { useUIStore } from '../../stores/uiStore';

interface TypingIndicatorProps {
  agentId: string;
}

export function TypingIndicator({ agentId }: TypingIndicatorProps) {
  const { hebrewMode } = useUIStore();
  const displayName = getAgentDisplayName(agentId, hebrewMode);
  const color = getAgentColor(agentId);

  const t = {
    typing: hebrewMode ? 'מקליד/ה...' : 'is typing...',
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <span
        className="text-sm font-medium"
        style={{ color: `var(--color-${color})` }}
      >
        {displayName}
      </span>
      <span className="text-dark-500 text-sm">{t.typing}</span>
      <div className="flex items-center gap-1">
        <span
          className="w-2 h-2 rounded-full typing-dot"
          style={{ backgroundColor: `var(--color-${color})` }}
        />
        <span
          className="w-2 h-2 rounded-full typing-dot"
          style={{ backgroundColor: `var(--color-${color})` }}
        />
        <span
          className="w-2 h-2 rounded-full typing-dot"
          style={{ backgroundColor: `var(--color-${color})` }}
        />
      </div>
    </div>
  );
}
