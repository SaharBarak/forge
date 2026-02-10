/**
 * ChatPane - Scrollable message list with dynamic agent colors and typing indicator
 */

import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Message } from '../../src/types';
import { getAgentById, getAgentColor, getAgentDisplayName } from '../../src/agents/personas';

interface ChatPaneProps {
  messages: Message[];
  maxHeight?: number;
  currentSpeaker?: string | null;
}

const TYPE_BADGES: Record<string, string> = {
  argument: '[ARG]',
  question: '[Q]',
  proposal: '[PROP]',
  agreement: '[+1]',
  disagreement: '[-1]',
  synthesis: '[SYN]',
  system: '',
  human_input: '[YOU]',
  research_result: '[🔍]',
  tool_result: '[IMG]',
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function truncateContent(content: string, maxLines = 8): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join('\n') + '\n...';
}

function MessageItem({ message }: { message: Message }): React.ReactElement {
  const color = getAgentColor(message.agentId);
  const badge = TYPE_BADGES[message.type] || '';
  const time = formatTime(message.timestamp);
  const content = truncateContent(message.content);
  const displayName = getAgentDisplayName(message.agentId);

  // System messages are styled differently
  if (message.agentId === 'system') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>{content}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text dimColor>{time} </Text>
        <Text color={color} bold>
          {displayName}
        </Text>
        {badge && (
          <Text dimColor> {badge}</Text>
        )}
      </Box>
      <Box marginLeft={2}>
        <Text wrap="wrap">{content}</Text>
      </Box>
    </Box>
  );
}

export function ChatPane({ messages, maxHeight = 20, currentSpeaker }: ChatPaneProps): React.ReactElement {
  // Show only recent messages that fit
  const visibleMessages = messages.slice(-maxHeight);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      flexGrow={1}
      overflow="hidden"
    >
      {visibleMessages.length === 0 ? (
        <Text dimColor>No messages yet...</Text>
      ) : (
        visibleMessages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))
      )}
      {currentSpeaker && (
        <Box>
          <Text color={getAgentColor(currentSpeaker)}>
            <Spinner type="dots" />{' '}
            {getAgentDisplayName(currentSpeaker)} is thinking...
          </Text>
        </Box>
      )}
    </Box>
  );
}
