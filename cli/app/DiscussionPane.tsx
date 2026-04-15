/**
 * DiscussionPane — the rebuilt message pane that replaces ChatPane.
 *
 * Key differences from ChatPane:
 *   - System messages get a distinct dim treatment and are collapsed
 *     (first line only + marker) so they don't dominate
 *   - Research halts and research results get their own styled prefix
 *   - Agent messages get a colored title bar with type badge
 *   - The MOST RECENT agent message gets a "● NOW" marker and bright
 *     left border so your eye always knows what's current
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../../src/types';
import { renderMarkdown } from '../../src/lib/render/markdown';
import { agentColor } from '../../src/lib/render/theme';
import { renderMessageWithToolCalls } from '../../src/lib/render/tool-call';

interface DiscussionPaneProps {
  readonly messages: ReadonlyArray<Message>;
  readonly maxHeight?: number;
}

const TYPE_BADGES: Readonly<Record<string, { label: string; color: string }>> = {
  argument:        { label: 'ARGUMENT',     color: 'red' },
  question:        { label: 'QUESTION',     color: 'cyan' },
  proposal:        { label: 'PROPOSAL',     color: 'magenta' },
  agreement:       { label: 'AGREEMENT',    color: 'green' },
  disagreement:    { label: 'DISAGREEMENT', color: 'red' },
  synthesis:       { label: 'SYNTHESIS',    color: 'magenta' },
  research_result: { label: 'RESEARCH',     color: 'yellow' },
  human_input:     { label: 'YOU',          color: 'cyan' },
};

const formatTime = (date: Date): string =>
  new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

function SystemMessage({
  content,
}: {
  readonly content: string;
}): React.ReactElement {
  // Collapse to first meaningful line
  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || '';
  const hasMore = lines.length > 1;
  return (
    <Box flexDirection="row" marginBottom={0}>
      <Text dimColor>◎ {first}</Text>
      {hasMore && <Text dimColor> …</Text>}
    </Box>
  );
}

function AgentMessage({
  message,
  isCurrent,
}: {
  readonly message: Message;
  readonly isCurrent: boolean;
}): React.ReactElement {
  const color = agentColor(message.agentId);
  const badge = TYPE_BADGES[message.type];
  const time = formatTime(message.timestamp);

  const body = renderMessageWithToolCalls(message.content, {
    renderText: (text) => renderMarkdown(text, 72),
  });

  return (
    <Box
      flexDirection="column"
      marginBottom={1}
      borderStyle={isCurrent ? 'round' : undefined}
      borderColor={isCurrent ? 'cyan' : undefined}
      paddingX={isCurrent ? 1 : 0}
    >
      <Box>
        {isCurrent && <Text color="cyan" bold>● NOW </Text>}
        <Text color={color as 'red'} bold>
          {message.agentId}
        </Text>
        {badge && (
          <>
            <Text dimColor> · </Text>
            <Text color={badge.color as 'red'}>[{badge.label}]</Text>
          </>
        )}
        <Text dimColor> · {time}</Text>
      </Box>
      <Box marginLeft={isCurrent ? 0 : 2}>
        <Text wrap="wrap">{body}</Text>
      </Box>
    </Box>
  );
}

function ResearchResultMessage({
  message,
}: {
  readonly message: Message;
}): React.ReactElement {
  const body = renderMessageWithToolCalls(message.content, {
    renderText: (text) => renderMarkdown(text, 72),
  });
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text color="yellow" bold>
          🔍 {message.agentId}
        </Text>
        <Text dimColor> research result</Text>
      </Box>
      <Box marginLeft={2}>
        <Text>{body}</Text>
      </Box>
    </Box>
  );
}

function DiscussionPaneImpl({
  messages,
  maxHeight = 22,
}: DiscussionPaneProps): React.ReactElement {
  const visible = messages.slice(-maxHeight);
  const lastAgentIdx = (() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].agentId !== 'system') return i;
    }
    return -1;
  })();

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      flexGrow={1}
      overflow="hidden"
    >
      <Box>
        <Text bold color="cyan">
          DISCUSSION
        </Text>
        <Text dimColor> · {messages.length} messages</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {visible.length === 0 ? (
          <Text dimColor>Waiting for the orchestrator to open the floor…</Text>
        ) : (
          visible.map((msg, i) => {
            if (msg.agentId === 'system') {
              return <SystemMessage key={msg.id} content={msg.content} />;
            }
            if (msg.type === 'research_result') {
              return <ResearchResultMessage key={msg.id} message={msg} />;
            }
            return (
              <AgentMessage
                key={msg.id}
                message={msg}
                isCurrent={i === lastAgentIdx}
              />
            );
          })
        )}
      </Box>
    </Box>
  );
}

// Re-render only when the messages array reference changes AND its length
// differs. The parent always passes a fresh array on each new message,
// so reference equality works as a cheap gate.
export const DiscussionPane = React.memo(DiscussionPaneImpl, (prev, next) => {
  if (prev.maxHeight !== next.maxHeight) return false;
  if (prev.messages === next.messages) return true;
  if (prev.messages.length !== next.messages.length) return false;
  const lastPrev = prev.messages[prev.messages.length - 1];
  const lastNext = next.messages[next.messages.length - 1];
  return lastPrev?.id === lastNext?.id;
});
