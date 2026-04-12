/**
 * StatusBar — phase, floor status, consensus, DID identity, P2P peers.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { SessionPhase } from '../../src/types';
import { getRandomQuote, formatQuote } from '../../src/lib/quotes';
import { progressBar } from '../../src/lib/render/progress';

interface StatusBarProps {
  readonly phase: SessionPhase;
  readonly currentSpeaker: string | null;
  readonly queued: ReadonlyArray<string>;
  readonly messageCount: number;
  readonly consensusPoints: number;
  readonly conflictPoints: number;
  readonly did?: string | null;
  readonly peerCount?: number;
  readonly connectionsIndexSize?: number;
}

const PHASES: ReadonlyArray<SessionPhase> = [
  'initialization',
  'context_loading',
  'research',
  'brainstorming',
  'argumentation',
  'synthesis',
  'drafting',
  'review',
  'consensus',
  'finalization',
];

const PHASE_EMOJI: Readonly<Record<SessionPhase, string>> = {
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

const PHASE_COLORS: Readonly<Record<SessionPhase, string>> = {
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

const shortenDid = (did: string): string =>
  did.length > 20 ? `${did.slice(0, 12)}…${did.slice(-6)}` : did;

export function StatusBar({
  phase,
  currentSpeaker,
  queued,
  messageCount,
  consensusPoints,
  conflictPoints,
  did,
  peerCount,
  connectionsIndexSize,
}: StatusBarProps): React.ReactElement {
  const phaseColor = PHASE_COLORS[phase] || 'white';
  const phaseEmoji = PHASE_EMOJI[phase] || '📍';
  const phaseIdx = PHASES.indexOf(phase);
  const phaseRatio = (phaseIdx + 1) / PHASES.length;
  const phaseBar = progressBar(phaseRatio, 10);

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
        {/* Phase + progress */}
        <Box>
          <Text color={phaseColor as 'red'} bold>
            {phaseEmoji} {phase.toUpperCase()}
          </Text>
          <Text> </Text>
          <Text>{phaseBar}</Text>
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
          <Text dimColor>Msgs: </Text>
          <Text>{messageCount}</Text>
          <Text dimColor> | </Text>
          <Text color="green">✓{consensusPoints}</Text>
          <Text dimColor>/</Text>
          <Text color="red">✗{conflictPoints}</Text>
        </Box>
      </Box>

      {/* Second row: identity + P2P + connections */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          {did ? (
            <Text dimColor>DID: <Text color="cyan">{shortenDid(did)}</Text></Text>
          ) : (
            <Text dimColor>No identity — run /login</Text>
          )}
        </Box>

        <Box>
          {typeof peerCount === 'number' && (
            <Text dimColor>Peers: <Text color={peerCount > 0 ? 'green' : 'gray'}>{peerCount}</Text></Text>
          )}
          {typeof connectionsIndexSize === 'number' && (
            <Text dimColor> | Vectors: {connectionsIndexSize}</Text>
          )}
        </Box>

        <Box>
          <Text dimColor italic>{quote}</Text>
        </Box>
      </Box>
    </Box>
  );
}
