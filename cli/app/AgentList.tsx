/**
 * AgentList - Sidebar showing active agents and their states
 */

import React from 'react';
import { Box, Text } from 'ink';

interface AgentInfo {
  id: string;
  name: string;
  nameHe: string;
  state: string;
  contributions: number;
}

interface AgentListProps {
  agents: AgentInfo[];
  currentSpeaker: string | null;
  width?: number;
  height?: number;
}

const STATE_ICONS: Record<string, string> = {
  listening: '👂',
  thinking: '🤔',
  speaking: '💬',
  waiting: '⏳',
};

const AGENT_COLORS: Record<string, string> = {
  ronit: 'magenta',
  avi: 'blue',
  dana: 'red',
  yossi: 'green',
  michal: 'yellow',
};

export function AgentList({ agents, currentSpeaker, width = 24, height }: AgentListProps): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      width={width}
      height={height}
    >
      <Text bold underline>
        Agents
      </Text>
      <Text> </Text>

      {agents.map((agent) => {
        const isSpeaking = agent.id === currentSpeaker;
        const color = AGENT_COLORS[agent.id] || 'white';
        const stateIcon = STATE_ICONS[agent.state] || '•';

        return (
          <Box key={agent.id} flexDirection="row">
            <Text>{isSpeaking ? '💬' : stateIcon}</Text>
            <Text> </Text>
            <Text color={color} bold={isSpeaking}>
              {agent.name}
            </Text>
            <Text dimColor> ({agent.contributions})</Text>
          </Box>
        );
      })}
    </Box>
  );
}
