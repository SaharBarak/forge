/**
 * StatusBar - Shows phase, floor status, and consensus info
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { SessionPhase } from '../../src/types';

interface StatusBarProps {
  phase: SessionPhase;
  currentSpeaker: string | null;
  queued: string[];
  messageCount: number;
  consensusPoints: number;
  conflictPoints: number;
}

const PHASE_EMOJI: Record<SessionPhase, string> = {
  initialization: '🚀',
  context_loading: '📂',
  research: '🔍',
  brainstorming: '💭',
  argumentation: '⚖️',
  synthesis: '📊',
  drafting: '✍️',
  review: '👁️',
  consensus: '🤝',
  finalization: '🎉',
};

const PHASE_COLORS: Record<SessionPhase, string> = {
  initialization: 'gray',
  context_loading: 'blue',
  research: 'cyan',
  brainstorming: 'cyan',
  argumentation: 'yellow',
  synthesis: 'magenta',
  drafting: 'green',
  review: 'blue',
  consensus: 'green',
  finalization: 'yellow',
};

export function StatusBar({
  phase,
  currentSpeaker,
  queued,
  messageCount,
  consensusPoints,
  conflictPoints,
}: StatusBarProps): React.ReactElement {
  const phaseColor = PHASE_COLORS[phase] || 'white';
  const phaseEmoji = PHASE_EMOJI[phase] || '📍';

  return (
    <Box
      flexDirection="row"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      justifyContent="space-between"
    >
      {/* Phase */}
      <Box>
        <Text color={phaseColor} bold>
          {phaseEmoji} {phase.toUpperCase()}
        </Text>
      </Box>

      {/* Floor Status */}
      <Box>
        <Text dimColor>Floor: </Text>
        {currentSpeaker ? (
          <Text color="green">{currentSpeaker} speaking</Text>
        ) : (
          <Text color="gray">open</Text>
        )}
        {queued.length > 0 && (
          <Text dimColor> ({queued.length} waiting)</Text>
        )}
      </Box>

      {/* Stats */}
      <Box>
        <Text dimColor>Messages: </Text>
        <Text>{messageCount}</Text>
        <Text dimColor> | </Text>
        <Text color="green">✓{consensusPoints}</Text>
        <Text dimColor> / </Text>
        <Text color="red">✗{conflictPoints}</Text>
      </Box>
    </Box>
  );
}
