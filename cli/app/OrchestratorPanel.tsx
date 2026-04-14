/**
 * OrchestratorPanel — the right sidebar that exposes the orchestrator's
 * internal state as structured panels instead of letting it leak into
 * the chat stream as plain system messages.
 *
 * Panels:
 *   - Phase progress ribbon (bar + "messages in phase" count)
 *   - Floor manager: who has the floor + queue
 *   - Consensus meter: ✓N / ✗N and a ratio bar
 *   - Required outputs checklist (mode-specific — copywrite needs hero,
 *     problem, solution, social proof, cta, etc.)
 */

import React from 'react';
import { Box, Text } from 'ink';

interface OrchestratorPanelProps {
  readonly phaseName: string;
  readonly phaseIdx: number;
  readonly phaseCount: number;
  readonly messagesInPhase: number;
  readonly phaseMaxMessages: number;
  readonly currentSpeaker: string | null;
  readonly floorQueue: ReadonlyArray<string>;
  readonly consensusPoints: number;
  readonly conflictPoints: number;
  readonly requiredOutputs: ReadonlyArray<string>;
  readonly producedOutputs: ReadonlySet<string>;
  readonly totalMessages: number;
}

const BAR_WIDTH = 14;

const bar = (ratio: number, width: number): string => {
  const r = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(r * width);
  return '▓'.repeat(filled) + '░'.repeat(width - filled);
};

export function OrchestratorPanel({
  phaseName,
  phaseIdx,
  phaseCount,
  messagesInPhase,
  phaseMaxMessages,
  currentSpeaker,
  floorQueue,
  consensusPoints,
  conflictPoints,
  requiredOutputs,
  producedOutputs,
  totalMessages,
}: OrchestratorPanelProps): React.ReactElement {
  const phaseRatio = phaseCount > 0 ? (phaseIdx + 1) / phaseCount : 0;
  const phaseMessageRatio = phaseMaxMessages > 0 ? messagesInPhase / phaseMaxMessages : 0;
  const consensusTotal = consensusPoints + conflictPoints;
  const consensusRatio = consensusTotal > 0 ? consensusPoints / consensusTotal : 0.5;

  return (
    <Box flexDirection="column" width={26}>
      {/* ── Orchestrator header ── */}
      <Box
        borderStyle="round"
        borderColor="magenta"
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color="magenta">
          ORCHESTRATOR
        </Text>
        <Text dimColor>phase state machine</Text>
      </Box>

      {/* ── Phase progress ── */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text dimColor>PHASE</Text>
        <Text bold color="yellow" wrap="truncate">
          {phaseName}
        </Text>
        <Text>
          <Text color="yellow">{bar(phaseRatio, BAR_WIDTH)}</Text>
          <Text dimColor> {phaseIdx + 1}/{phaseCount}</Text>
        </Text>
        <Box marginTop={1}>
          <Text dimColor>msgs </Text>
          <Text color={phaseMessageRatio > 0.8 ? 'red' : 'cyan'}>
            {messagesInPhase}
          </Text>
          <Text dimColor>/{phaseMaxMessages || '—'}</Text>
        </Box>
      </Box>

      {/* ── Floor manager ── */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text dimColor>FLOOR</Text>
        {currentSpeaker ? (
          <Text color="cyan" bold wrap="truncate">
            ▸ {currentSpeaker}
          </Text>
        ) : (
          <Text color="gray">open</Text>
        )}
        {floorQueue.length > 0 && (
          <>
            <Text dimColor>queue</Text>
            {floorQueue.slice(0, 3).map((q, i) => (
              <Text key={q + i} dimColor>
                {i + 1}. {q}
              </Text>
            ))}
          </>
        )}
      </Box>

      {/* ── Consensus meter ── */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginTop={1}
        flexDirection="column"
      >
        <Text dimColor>CONSENSUS</Text>
        <Box>
          <Text color="green">✓{consensusPoints}</Text>
          <Text dimColor> / </Text>
          <Text color="red">✗{conflictPoints}</Text>
        </Box>
        <Text>
          <Text color="green">{bar(consensusRatio, BAR_WIDTH)}</Text>
        </Text>
        <Text dimColor>total {totalMessages} msgs</Text>
      </Box>

      {/* ── Required outputs checklist ── */}
      {requiredOutputs.length > 0 && (
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginTop={1}
          flexDirection="column"
        >
          <Text dimColor>
            REQUIRED ({producedOutputs.size}/{requiredOutputs.length})
          </Text>
          {requiredOutputs.map((out) => {
            const done = producedOutputs.has(out);
            return (
              <Text key={out}>
                <Text color={done ? 'green' : 'gray'}>
                  {done ? '✓' : '○'}
                </Text>
                <Text dimColor={!done}> {out.replace(/_/g, ' ')}</Text>
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
