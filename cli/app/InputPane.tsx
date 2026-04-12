/**
 * InputPane - Human input area with command support
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InputPaneProps {
  onSubmit: (text: string) => void;
  onCommand: (command: string, args: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InputPane({
  onSubmit,
  onCommand,
  placeholder = 'Type a message or /command...',
  disabled = false,
}: InputPaneProps): React.ReactElement {
  const [value, setValue] = useState('');

  const handleSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Check for commands
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);
      onCommand(command, args);
    } else {
      onSubmit(trimmed);
    }

    setValue('');
  };

  // Handle Ctrl+C, Ctrl+S shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 's') {
      onCommand('synthesize', []);
    }
    if (key.ctrl && input === 'e') {
      onCommand('export', []);
    }
  });

  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Text color="cyan">{'> '}</Text>
      {disabled ? (
        <Text dimColor>Waiting for agents...</Text>
      ) : (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      )}
    </Box>
  );
}

// Help text for commands
export function CommandHelp(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text dimColor bold>Session:</Text>
      <Text dimColor>  /pause       Pause debate</Text>
      <Text dimColor>  /resume      Resume debate</Text>
      <Text dimColor>  /status      Show consensus status</Text>
      <Text dimColor>  /synthesize  Move to synthesis phase</Text>
      <Text dimColor>  /export      Export transcript</Text>
      <Text dimColor>  /quit        Save and exit</Text>
      <Text> </Text>
      <Text dimColor bold>Community (P2P):</Text>
      <Text dimColor>  /community   List community contributions</Text>
      <Text dimColor>  /connections  Search similar contributions</Text>
      <Text dimColor>  /did         Show your DID identity</Text>
      <Text> </Text>
      <Text dimColor bold>Shortcuts:</Text>
      <Text dimColor>  Ctrl+S  Quick synthesize</Text>
      <Text dimColor>  Ctrl+E  Quick export</Text>
      <Text dimColor>  ?       Toggle this help</Text>
    </Box>
  );
}
