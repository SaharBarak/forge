/**
 * VirtualMessageList - Virtualized message list for performance
 * Issue #25: Virtual scrolling for long message lists
 * 
 * Uses react-window for efficient rendering of large message lists.
 * Only renders messages that are visible in the viewport.
 */

import { useRef, useEffect, useCallback, memo } from 'react';
import { VariableSizeList } from 'react-window';
import type { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface VirtualMessageListProps {
  messages: Message[];
  height: number;
  width: number;
  waitingForHuman?: boolean;
  waitingText?: string;
  typingAgents?: string[];
  TypingIndicator?: React.ComponentType<{ agentId: string }>;
}

// Memoized message row component to prevent unnecessary re-renders
const MessageRow = memo(function MessageRow({
  data,
  index,
  style,
}: {
  data: { messages: Message[] };
  index: number;
  style: React.CSSProperties;
}) {
  const message = data.messages[index];
  
  return (
    <div style={{ ...style, paddingRight: '16px', paddingLeft: '16px' }}>
      <MessageBubble message={message} />
    </div>
  );
});

// Estimate row height based on message content
function estimateRowHeight(message: Message): number {
  // Base height for message bubble chrome (padding, avatar, etc.)
  const baseHeight = 80;
  
  // Estimate based on content length (rough approximation)
  // Average ~60 chars per line at typical widths
  const contentLength = message.content.length;
  const estimatedLines = Math.ceil(contentLength / 60);
  const contentHeight = estimatedLines * 24; // ~24px per line
  
  return Math.max(baseHeight, baseHeight + contentHeight);
}

export function VirtualMessageList({
  messages,
  height,
  width,
  waitingForHuman,
  waitingText,
  typingAgents = [],
  TypingIndicator,
}: VirtualMessageListProps) {
  const listRef = useRef<VariableSizeList<{ messages: Message[] }>>(null);
  const rowHeights = useRef<Map<number, number>>(new Map());
  
  // Get row height - use cached value or estimate
  const getRowHeight = useCallback((index: number): number => {
    if (rowHeights.current.has(index)) {
      return rowHeights.current.get(index)!;
    }
    const estimated = estimateRowHeight(messages[index]);
    rowHeights.current.set(index, estimated);
    return estimated;
  }, [messages]);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);
  
  // Reset row height cache when messages change significantly
  useEffect(() => {
    rowHeights.current.clear();
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [messages]);
  
  // Calculate extra height needed for indicators
  const indicatorHeight = (waitingForHuman ? 48 : 0) + (typingAgents.length * 40);
  
  if (messages.length === 0) {
    return null;
  }
  
  return (
    <div style={{ height, width }}>
      <VariableSizeList
        ref={listRef}
        height={height - indicatorHeight}
        width={width}
        itemCount={messages.length}
        itemSize={getRowHeight}
        itemData={{ messages }}
        overscanCount={3}
        style={{ paddingTop: '16px' }}
      >
        {MessageRow}
      </VariableSizeList>
      
      {/* Waiting for human indicator */}
      {waitingForHuman && (
        <div className="flex justify-center py-4 px-4">
          <span className="text-orange-400 animate-pulse">{waitingText}</span>
        </div>
      )}
      
      {/* Typing indicators */}
      {TypingIndicator && typingAgents.map((agentId) => (
        <div key={agentId} className="px-4">
          <TypingIndicator agentId={agentId} />
        </div>
      ))}
    </div>
  );
}

// Threshold for when to use virtual scrolling
export const VIRTUAL_SCROLL_THRESHOLD = 50;
