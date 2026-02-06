import { useRef, useEffect, useCallback, useState, CSSProperties } from 'react';
import { List, useDynamicRowHeight, ListImperativeAPI, DynamicRowHeight } from 'react-window';
import type { Message } from '../../types';
import { MessageBubble } from './MessageBubble';

interface VirtualMessageListProps {
  messages: Message[];
  typingAgents: string[];
  waitingForHuman: boolean;
  hebrewMode: boolean;
}

interface RowData {
  messages: Message[];
  dynamicRowHeight: DynamicRowHeight;
}

// Default estimated row height
const DEFAULT_ROW_HEIGHT = 120;

// Threshold for when to use virtual scrolling (messages count)
const VIRTUALIZATION_THRESHOLD = 50;

// Row component for virtual list
function Row({ 
  index, 
  style, 
  messages, 
  dynamicRowHeight 
}: { 
  index: number; 
  style: CSSProperties; 
  ariaAttributes: Record<string, unknown>;
} & RowData) {
  const rowRef = useRef<HTMLDivElement>(null);
  const message = messages[index];

  useEffect(() => {
    if (rowRef.current) {
      const cleanup = dynamicRowHeight.observeRowElements([rowRef.current]);
      return cleanup;
    }
  }, [dynamicRowHeight]);

  return (
    <div style={style}>
      <div ref={rowRef} data-row-index={index} className="pb-4 px-4">
        <MessageBubble message={message} />
      </div>
    </div>
  );
}

export function VirtualMessageList({
  messages,
  typingAgents,
  waitingForHuman,
  hebrewMode,
}: VirtualMessageListProps) {
  const listRef = useRef<ListImperativeAPI>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);
  const [containerSize, setContainerSize] = useState({ height: 400, width: 800 });
  
  // Dynamic row height hook for variable-height rows
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ROW_HEIGHT,
    key: 'message-list',
  });

  // Observe container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          height: entry.contentRect.height,
          width: entry.contentRect.width,
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to bottom when new messages arrive (if already at bottom)
  useEffect(() => {
    if (isScrolledToBottom && listRef.current && messages.length > 0) {
      listRef.current.scrollToRow({ index: messages.length - 1, align: 'end' });
    }
  }, [messages.length, isScrolledToBottom, typingAgents, listRef]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
    setIsScrolledToBottom(atBottom);
  }, []);

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToRow({ index: messages.length - 1, align: 'end' });
    setIsScrolledToBottom(true);
  }, [messages.length, listRef]);

  // Translations
  const t = {
    waitingForYou: hebrewMode ? '⏳ ממתינים לתגובתך...' : '⏳ Waiting for your input...',
    noMessages: hebrewMode
      ? 'עדיין אין הודעות. לחץ על "התחל דיון" להתחיל!'
      : 'No messages yet. Click "Start Discussion" to begin!',
    scrollToBottom: hebrewMode ? 'גלול למטה' : 'Scroll to bottom',
  };

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full flex-1">
        <p className="text-dark-500">{t.noMessages}</p>
      </div>
    );
  }

  // Use regular rendering for small message counts (better UX)
  if (messages.length < VIRTUALIZATION_THRESHOLD) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* Waiting for human indicator */}
        {waitingForHuman && (
          <div className="flex justify-center py-4">
            <span className="text-orange-400 animate-pulse">{t.waitingForYou}</span>
          </div>
        )}
      </div>
    );
  }

  // Virtual scrolling for large message counts
  const rowData: RowData = {
    messages,
    dynamicRowHeight,
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 relative overflow-hidden" 
      onScroll={handleScroll}
    >
      <List<RowData>
        listRef={listRef}
        rowCount={messages.length}
        rowHeight={dynamicRowHeight}
        rowComponent={Row}
        rowProps={rowData}
        overscanCount={5}
        className="py-4 scrollbar-thin scrollbar-thumb-dark-600 scrollbar-track-dark-800"
        style={{ height: containerSize.height, width: containerSize.width }}
      />

      {/* Scroll to bottom button */}
      {!isScrolledToBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 p-3 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-full shadow-lg transition-all transform hover:scale-105 z-10"
          title={t.scrollToBottom}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </button>
      )}

      {/* Typing/waiting indicators overlay at bottom */}
      {(waitingForHuman || typingAgents.length > 0) && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-dark-900 to-transparent pt-8 z-10">
          {waitingForHuman && (
            <div className="flex justify-center py-2">
              <span className="text-orange-400 animate-pulse">{t.waitingForYou}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
