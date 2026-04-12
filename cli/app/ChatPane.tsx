/**
 * ChatPane — scrollable message list with markdown rendering.
 *
 * Agent messages are rendered through the Forge markdown→ANSI pipeline so
 * headings, bold, code blocks with borders, lists, and blockquotes all
 * display correctly in the terminal. Ink's <Text> passes ANSI codes through.
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../../src/types';
import { renderMarkdown } from '../../src/lib/render/markdown';
import { agentColor } from '../../src/lib/render/theme';
import { renderMessageWithToolCalls } from '../../src/lib/render/tool-call';

interface ChatPaneProps {
  readonly messages: ReadonlyArray<Message>;
  readonly maxHeight?: number;
}

const TYPE_BADGES: Readonly<Record<string, string>> = {
  argument: '[ARG]',
  question: '[Q]',
  proposal: '[PROP]',
  agreement: '[+1]',
  disagreement: '[-1]',
  synthesis: '[SYN]',
  system: '',
  human_input: '[YOU]',
  research_result: '[🔍]',
};

const formatTime = (date: Date): string =>
  new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

function MessageItem({ message }: { readonly message: Message }): React.ReactElement {
  const color = agentColor(message.agentId);
  const badge = TYPE_BADGES[message.type] || '';
  const time = formatTime(message.timestamp);

  // System messages — dimmed, no markdown rendering.
  if (message.agentId === 'system') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>{message.content}</Text>
      </Box>
    );
  }

  // Agent / human messages — mix of markdown and [TOOL:] call blocks.
  const rendered = renderMessageWithToolCalls(message.content, {
    renderText: (text) => renderMarkdown(text, 72),
  });

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text dimColor>{time} </Text>
        <Text color={color as 'red'} bold>
          {message.agentId}
        </Text>
        {badge && <Text dimColor> {badge}</Text>}
      </Box>
      <Box marginLeft={2}>
        <Text>{rendered}</Text>
      </Box>
    </Box>
  );
}

export function ChatPane({
  messages,
  maxHeight = 20,
}: ChatPaneProps): React.ReactElement {
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
    </Box>
  );
}
