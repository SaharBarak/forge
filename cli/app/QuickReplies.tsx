/**
 * QuickReplies — numbered quick reply pills above InputPane
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { QuickReply } from '../lib/suggestions';

interface QuickRepliesProps {
  replies: QuickReply[];
  onSelect: (reply: QuickReply) => void;
}

export function QuickReplies({ replies, onSelect: _onSelect }: QuickRepliesProps): React.ReactElement | null {
  if (replies.length === 0) return null;

  return (
    <Box paddingX={1} flexDirection="row" gap={1}>
      {replies.map((reply, i) => (
        <Box key={i}>
          <Text color="gray">[</Text>
          <Text color="cyan" bold>{i + 1}</Text>
          <Text color="gray">]</Text>
          <Text> </Text>
          <Text color={reply.isCommand ? 'yellow' : 'white'}>{reply.label}</Text>
        </Box>
      ))}
      <Box marginLeft={1}>
        <Text dimColor>Press 1-{replies.length} to select</Text>
      </Box>
    </Box>
  );
}
