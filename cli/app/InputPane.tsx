/**
 * InputPane - Human input area with command support and tab completion
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

const COMMANDS = [
  { name: 'pause', description: 'Pause debate' },
  { name: 'resume', description: 'Resume debate' },
  { name: 'status', description: 'Show status' },
  { name: 'synthesize', description: 'Move to synthesis' },
  { name: 'synthesize force', description: 'Force synthesis' },
  { name: 'export', description: 'Export transcript' },
  { name: 'help', description: 'Toggle help' },
  { name: 'quit', description: 'Save and exit' },
];

interface InputPaneProps {
  onSubmit: (text: string) => void;
  onCommand: (command: string, args: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onInputChange?: (value: string) => void;
}

export function InputPane({
  onSubmit,
  onCommand,
  placeholder = 'Type a message or /command...',
  disabled = false,
  onInputChange,
}: InputPaneProps): React.ReactElement {
  const [value, setValue] = useState('');
  const [hint, setHint] = useState('');

  const handleChange = (newValue: string) => {
    setValue(newValue);
    onInputChange?.(newValue);

    // Show autocomplete hint for commands
    if (newValue.startsWith('/') && newValue.length > 1) {
      const partial = newValue.slice(1).toLowerCase();
      const match = COMMANDS.find(c => c.name.startsWith(partial) && c.name !== partial);
      setHint(match ? `/${match.name} — ${match.description}` : '');
    } else {
      setHint('');
    }
  };

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
    setHint('');
  };

  // Handle Ctrl shortcuts and Tab completion
  useInput((input, key) => {
    if (key.ctrl && input === 's') {
      onCommand('synthesize', []);
    }
    if (key.ctrl && input === 'e') {
      onCommand('export', []);
    }
    // Tab: autocomplete command
    if (key.tab && value.startsWith('/') && value.length > 1) {
      const partial = value.slice(1).toLowerCase();
      const match = COMMANDS.find(c => c.name.startsWith(partial));
      if (match) {
        const completed = `/${match.name}`;
        setValue(completed);
        setHint('');
        onInputChange?.(completed);
      }
    }
  });

  return (
    <Box flexDirection="column">
      {hint && (
        <Box paddingX={2}>
          <Text dimColor>  Tab: {hint}</Text>
        </Box>
      )}
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
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder={placeholder}
          />
        )}
      </Box>
    </Box>
  );
}

// Help text for commands
export function CommandHelp(): React.ReactElement {
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text dimColor>Commands:</Text>
      <Text dimColor>  /pause     - Pause debate</Text>
      <Text dimColor>  /resume    - Resume debate</Text>
      <Text dimColor>  /status    - Show status</Text>
      <Text dimColor>  /synthesize - Move to synthesis</Text>
      <Text dimColor>  /export    - Export transcript</Text>
      <Text dimColor>  /quit      - Save and exit</Text>
      <Text dimColor>  Ctrl+S     - Quick synthesize</Text>
      <Text dimColor>  Ctrl+E     - Quick export</Text>
    </Box>
  );
}
