/**
 * HeaderBar — always-visible project + goal + phase timeline.
 *
 * Fixed at the top of the TUI. Shows:
 *   row 1: project name, mode label, session timer
 *   row 2: 🎯 the goal (truncated if long)
 *   row 3: fat phase timeline strip with ◆/◇ nodes and ──/── connectors
 *
 * The goal is always visible so the reader never loses context.
 */

import React from 'react';
import { Box, Text } from 'ink';

interface PhaseDef {
  readonly id: string;
  readonly name: string;
}

interface HeaderBarProps {
  readonly projectName: string;
  readonly goal: string;
  readonly modeLabel: string;
  readonly phases: ReadonlyArray<PhaseDef>;
  readonly currentPhaseId: string;
  readonly elapsedSeconds: number;
}

const fmtElapsed = (s: number): string => {
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
};

export function HeaderBar({
  projectName,
  goal,
  modeLabel,
  phases,
  currentPhaseId,
  elapsedSeconds,
}: HeaderBarProps): React.ReactElement {
  const currentIdx = Math.max(0, phases.findIndex((p) => p.id === currentPhaseId));

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
    >
      {/* Row 1 — project name · mode · timer */}
      <Box flexDirection="row" justifyContent="space-between">
        <Box>
          <Text bold color="yellow">
            ⚒ FORGE
          </Text>
          <Text dimColor> · </Text>
          <Text bold color="white">
            {projectName}
          </Text>
        </Box>
        <Box>
          <Text dimColor>mode </Text>
          <Text color="magenta">{modeLabel}</Text>
          <Text dimColor> · </Text>
          <Text color="cyan">{fmtElapsed(elapsedSeconds)}</Text>
        </Box>
      </Box>

      {/* Row 2 — the goal, always visible */}
      <Box>
        <Text dimColor>🎯 </Text>
        <Text wrap="truncate">{goal}</Text>
      </Box>

      {/* Row 3 — fat phase timeline */}
      <Box flexDirection="row" marginTop={1}>
        {phases.map((phase, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const node = isPast ? '◆' : isCurrent ? '◆' : '◇';
          const nodeColor = isPast ? 'green' : isCurrent ? 'yellow' : 'gray';
          const nameColor = isPast ? 'green' : isCurrent ? 'yellow' : 'gray';
          const connector = i < phases.length - 1 ? (isPast ? '──' : '┈┈') : '';
          const connectorColor = isPast ? 'green' : 'gray';
          return (
            <React.Fragment key={phase.id}>
              <Box>
                <Text color={nodeColor as 'green'} bold={isCurrent}>
                  {node}
                </Text>
                <Text color={nameColor as 'green'} bold={isCurrent}>
                  {' '}
                  {phase.name}
                </Text>
              </Box>
              {connector && (
                <Text color={connectorColor as 'green'} dimColor={!isPast}>
                  {' '}
                  {connector}{' '}
                </Text>
              )}
            </React.Fragment>
          );
        })}
      </Box>
    </Box>
  );
}
