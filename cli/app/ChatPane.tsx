/**
 * ChatPane - Scrollable message list with scrollbar, agent colors, typing indicator
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../../src/types';
import { getAgentColor, getAgentDisplayName } from '../../src/agents/personas';

interface ChatPaneProps {
  messages: Message[];
  maxHeight?: number;
  currentSpeaker?: string | null;
  scrollOffset?: number;
  height?: number;
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
  research_result: '[RES]',
  tool_result: '[IMG]',
};

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function truncateContent(content: string, maxLines = 20): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join('\n') + '\n  ...';
}

/** Estimate how many terminal rows a message will use (header + content + margin) */
function estimateMessageRows(content: string, wrapWidth: number): number {
  const truncated = truncateContent(content);
  let rows = 1; // header line (time + name + badge)
  for (const line of truncated.split('\n')) {
    rows += Math.max(1, Math.ceil((line.length + 1) / Math.max(wrapWidth, 20)));
  }
  rows += 1; // marginBottom
  return rows;
}

function MessageItem({ message }: { message: Message }): React.ReactElement {
  const color = getAgentColor(message.agentId);
  const badge = TYPE_BADGES[message.type] || '';
  const time = formatTime(message.timestamp);
  const content = truncateContent(message.content);
  const displayName = getAgentDisplayName(message.agentId);

  if (message.agentId === 'system') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor>{content}</Text>
      </Box>
    );
  }

  // Human messages get distinct green styling
  if (message.agentId === 'human' || message.type === 'human_input') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text dimColor>{time} </Text>
          <Text color="green" bold>
            {'You'}
          </Text>
          <Text color="green" dimColor> [YOU]</Text>
        </Box>
        <Box marginLeft={2} borderStyle="round" borderColor="green" paddingX={1}>
          <Text wrap="wrap" color="greenBright">{content}</Text>
        </Box>
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

/**
 * Build a vertical scrollbar track.
 * Returns an array of characters, one per row of the track.
 * The thumb position reflects where we are in the message list.
 */
function buildScrollbar(trackHeight: number, totalMessages: number, visibleCount: number, scrollOffset: number): string[] {
  if (totalMessages <= visibleCount || trackHeight < 3) {
    // No scrollbar needed — fill with thin line
    return Array(trackHeight).fill('│');
  }

  const track: string[] = [];
  // Thumb size: proportional to visible/total, min 1 row
  const thumbSize = Math.max(1, Math.round((visibleCount / totalMessages) * trackHeight));
  // Thumb position: 0 = bottom, max = top
  const maxOffset = totalMessages - visibleCount;
  const scrollFraction = maxOffset > 0 ? scrollOffset / maxOffset : 0;
  // thumbTop: when scrollFraction=1 (scrolled to top), thumb is at row 0
  // when scrollFraction=0 (at bottom), thumb is at bottom
  const thumbTop = Math.round(scrollFraction * (trackHeight - thumbSize));

  for (let i = 0; i < trackHeight; i++) {
    if (i >= thumbTop && i < thumbTop + thumbSize) {
      track.push('┃'); // thick = thumb
    } else {
      track.push('╎'); // thin dotted = track
    }
  }

  return track;
}

export function ChatPane({ messages, maxHeight = 20, currentSpeaker, scrollOffset = 0, height }: ChatPaneProps): React.ReactElement {
  // Available rows inside the bordered box (border=2 lines, typing indicator=1, padding=0)
  const innerHeight = Math.max(4, (height || maxHeight + 2) - 4);
  // Estimate wrap width (terminal width * ~45% minus border/padding/scrollbar ≈ rough)
  const wrapWidth = Math.max(30, Math.floor((process.stdout.columns || 80) * 0.4));

  // Work backwards from the end to find how many messages fit in innerHeight rows
  const endIndex = scrollOffset > 0 ? messages.length - scrollOffset : messages.length;
  let rowBudget = innerHeight;
  let startIndex = endIndex;
  for (let i = endIndex - 1; i >= 0 && rowBudget > 0; i--) {
    const est = estimateMessageRows(messages[i].content, wrapWidth);
    if (rowBudget - est < 0 && startIndex < endIndex) break; // Don't fit — stop
    rowBudget -= est;
    startIndex = i;
  }

  const visibleMessages = messages.slice(startIndex, endIndex);
  const hiddenAbove = startIndex;
  const hiddenBelow = messages.length - endIndex;

  // Scrollbar track height = inner height (height minus border top/bottom)
  const trackHeight = Math.max(3, (height || maxHeight + 2) - 2);
  const scrollbar = buildScrollbar(trackHeight, messages.length, visibleMessages.length || 1, scrollOffset);

  return (
    <Box flexDirection="row" flexGrow={1} height={height}>
      {/* Messages area — overflow hidden prevents bleed into input */}
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        flexGrow={1}
        height={height}
        overflow="hidden"
      >
        {hiddenAbove > 0 && (
          <Text dimColor>  ↑ {hiddenAbove} more</Text>
        )}
        {visibleMessages.length === 0 ? (
          <Text dimColor>No messages yet...</Text>
        ) : (
          visibleMessages.map((msg) => (
            <MessageItem key={msg.id} message={msg} />
          ))
        )}
        {hiddenBelow > 0 && (
          <Text dimColor>  ↓ {hiddenBelow} more</Text>
        )}
        {currentSpeaker && (
          <Box>
            <Text color={getAgentColor(currentSpeaker)}>
              {'... '}{getAgentDisplayName(currentSpeaker)} is thinking...
            </Text>
          </Box>
        )}
      </Box>

      {/* Scrollbar track */}
      <Box flexDirection="column" width={1} overflow="hidden" height={height}>
        {scrollbar.map((ch, i) => (
          <Text key={i} color={ch === '┃' ? 'cyan' : 'gray'}>{ch}</Text>
        ))}
      </Box>
    </Box>
  );
}
