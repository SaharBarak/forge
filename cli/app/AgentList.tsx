/**
 * AgentList — sidebar showing active agents, their states, and stance
 * on any active proposal.
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { agentColor } from '../../src/lib/render/theme';

interface AgentInfo {
  readonly id: string;
  readonly name: string;
  readonly nameHe: string;
  readonly state: string;
  readonly contributions: number;
  readonly stance?: 'FOR' | 'AGAINST' | 'NEUTRAL';
}

interface AgentListProps {
  readonly agents: ReadonlyArray<AgentInfo>;
  readonly currentSpeaker: string | null;
}

const STATE_ICONS: Readonly<Record<string, string>> = {
  listening: '👂',
  thinking: '🤔',
  speaking: '💬',
  waiting: '⏳',
};

const STANCE_DISPLAY: Readonly<Record<string, { label: string; color: string }>> = {
  FOR: { label: '+', color: 'green' },
  AGAINST: { label: '-', color: 'red' },
  NEUTRAL: { label: '~', color: 'yellow' },
};

export function AgentList({
  agents,
  currentSpeaker,
}: AgentListProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width={26}
    >
      <Text bold underline>
        Agents
      </Text>
      <Text> </Text>

      {agents.map((agent) => {
        const isSpeaking = agent.id === currentSpeaker;
        const color = agentColor(agent.id);
        const stateIcon = STATE_ICONS[agent.state] || '•';
        const stance = agent.stance ? STANCE_DISPLAY[agent.stance] : null;

        return (
          <Box key={agent.id} flexDirection="row">
            {isSpeaking ? (
              <Text color="green">
                <Spinner type="dots" />
              </Text>
            ) : (
              <Text>{stateIcon}</Text>
            )}
            <Text> </Text>
            <Text color={color as 'red'} bold={isSpeaking}>
              {agent.name}
            </Text>
            <Text dimColor> ({agent.contributions})</Text>
            {stance && (
              <Text color={stance.color as 'red'}> [{stance.label}]</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
