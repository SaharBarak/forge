/**
 * CouncilPanel — rich agent cards replacing the old AgentList.
 *
 * Each agent gets a card with:
 *   - colored name + role
 *   - contribution bar (▓▓▓░░ relative to max contributor)
 *   - state icon (listening, thinking, speaking, paused)
 *   - speaking indicator (bright ring + bold + ink-spinner)
 *   - stance (+ / − / ~) if available
 *
 * The active speaker's card is highlighted with a cyan border so your
 * eye lands on "who's talking right now" immediately.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { agentColor } from '../../src/lib/render/theme';

export interface CouncilAgent {
  readonly id: string;
  readonly name: string;
  readonly role?: string;
  readonly state: string; // listening / thinking / speaking / waiting
  readonly contributions: number;
  readonly stance?: 'FOR' | 'AGAINST' | 'NEUTRAL';
}

interface CouncilPanelProps {
  readonly agents: ReadonlyArray<CouncilAgent>;
  readonly currentSpeaker: string | null;
}

const STATE_ICONS: Readonly<Record<string, string>> = {
  listening: '👂',
  thinking:  '🤔',
  speaking:  '💬',
  waiting:   '⏳',
  paused:    '⏸',
};

const STANCE: Readonly<Record<string, { label: string; color: string }>> = {
  FOR:     { label: '+', color: 'green' },
  AGAINST: { label: '−', color: 'red' },
  NEUTRAL: { label: '~', color: 'yellow' },
};

const BAR_WIDTH = 8;
const BAR_FILLED = '▓';
const BAR_EMPTY  = '░';

const buildBar = (count: number, max: number): string => {
  if (max === 0) return BAR_EMPTY.repeat(BAR_WIDTH);
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((count / max) * BAR_WIDTH)));
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled);
};

export function CouncilPanel({
  agents,
  currentSpeaker,
}: CouncilPanelProps): React.ReactElement {
  const maxContribs = Math.max(1, ...agents.map((a) => a.contributions));

  return (
    <Box flexDirection="column" width={28}>
      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        flexDirection="column"
      >
        <Text bold color="yellow">
          COUNCIL
        </Text>
        <Text dimColor>{agents.length} archetypes in the room</Text>
      </Box>

      {agents.map((agent) => {
        const isSpeaking = agent.id === currentSpeaker;
        const color = agentColor(agent.id);
        const stateIcon = STATE_ICONS[agent.state] || '•';
        const stance = agent.stance ? STANCE[agent.stance] : null;
        const bar = buildBar(agent.contributions, maxContribs);

        return (
          <Box
            key={agent.id}
            flexDirection="column"
            borderStyle={isSpeaking ? 'round' : 'single'}
            borderColor={isSpeaking ? 'cyan' : 'gray'}
            paddingX={1}
            marginTop={1}
          >
            {/* Row 1: state icon + name + stance */}
            <Box flexDirection="row">
              {isSpeaking ? (
                <Text color="cyan">
                  <Spinner type="dots" />
                </Text>
              ) : (
                <Text>{stateIcon}</Text>
              )}
              <Text> </Text>
              <Text color={color as 'red'} bold={isSpeaking}>
                {agent.name}
              </Text>
              {stance && (
                <Text color={stance.color as 'red'}> {stance.label}</Text>
              )}
            </Box>

            {/* Row 2: role — one-line dim label */}
            {agent.role && (
              <Text dimColor wrap="truncate">
                {agent.role}
              </Text>
            )}

            {/* Row 3: contribution bar + count */}
            <Box>
              <Text color={isSpeaking ? 'cyan' : 'gray'}>{bar}</Text>
              <Text dimColor> {agent.contributions}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
