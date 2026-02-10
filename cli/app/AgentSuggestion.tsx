/**
 * AgentSuggestion — notification banner for contextual agent suggestions
 */

import React, { useEffect, useRef } from 'react';
import { Box, Text } from 'ink';

interface AgentSuggestionProps {
  agentName: string;
  agentColor: string;
  suggestion: string;
  onDismiss: () => void;
}

export function AgentSuggestion({
  agentName,
  agentColor,
  suggestion,
  onDismiss,
}: AgentSuggestionProps): React.ReactElement {
  // Stable ref so the timer doesn't reset on every parent re-render
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), 10000);
    return () => clearTimeout(timer);
  }, []); // runs once on mount, cleans up on unmount

  return (
    <Box
      borderStyle="round"
      borderColor={agentColor}
      paddingX={1}
      marginX={1}
    >
      <Text color={agentColor} bold>{'💡 '}{agentName}</Text>
      <Text> suggests: </Text>
      <Text>{suggestion}</Text>
    </Box>
  );
}
