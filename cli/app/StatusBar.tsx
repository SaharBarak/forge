/**
 * StatusBar - Shows phase, floor status, and consensus info
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { SessionPhase } from '../../src/types';
import { getRandomQuote, formatQuote } from '../../src/lib/quotes';

interface StatusBarProps {
  phase: SessionPhase;
  currentSpeaker: string | null;
  queued: string[];
  messageCount: number;
  consensusPoints: number;
  conflictPoints: number;
}

export const PHASE_EMOJI: Record<SessionPhase, string> = {
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

export const PHASE_COLORS: Record<SessionPhase, string> = {
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

  // Rotate quote every 60 seconds
  const [quote, setQuote] = useState(() => formatQuote(getRandomQuote()));
  useEffect(() => {
    const timer = setInterval(() => setQuote(formatQuote(getRandomQuote())), 60_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
    <Box flexDirection="row" justifyContent="space-between">
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
    <Box justifyContent="center">
      <Text dimColor italic>{quote}</Text>
    </Box>
    </Box>
  );
}
