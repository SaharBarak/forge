import type { AgentPersona } from '../../types';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';

interface AgentCardProps {
  agent: AgentPersona;
}

export function AgentCard({ agent }: AgentCardProps) {
  const { hebrewMode } = useUIStore();
  const { typingAgents } = useSessionStore();

  const isTyping = typingAgents.includes(agent.id);
  const displayName = hebrewMode ? agent.nameHe : agent.name;

  return (
    <div
      className="p-3 rounded-lg border transition-all"
      style={{
        borderColor: `var(--color-${agent.color})`,
        backgroundColor: `color-mix(in srgb, var(--color-${agent.color}) 10%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full ${isTyping ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: `var(--color-${agent.color})` }}
        />

        {/* Name */}
        <span
          className="font-medium text-sm"
          style={{ color: `var(--color-${agent.color})` }}
        >
          {displayName}
        </span>
      </div>

      {/* Role */}
      <div className="text-xs text-dark-400 mt-1">{agent.role}</div>

      {/* Typing indicator */}
      {isTyping && (
        <div className="text-xs text-dark-500 mt-1 flex items-center gap-1">
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
          <span className="typing-dot w-1 h-1 rounded-full bg-current" />
        </div>
      )}
    </div>
  );
}
