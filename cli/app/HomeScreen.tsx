/**
 * HomeScreen — Ink TUI lobby shown on bare `forge` with no args.
 *
 * Shows the full Forge banner (Last Supper art + ASCII logo), then an
 * interactive prompt for quick actions.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { showBanner } from '../prompts/banner';

interface HomeScreenProps {
  readonly did: string | null;
  readonly sessionCount: number;
  readonly onStartNew: () => void;
  readonly onLoadSession: (name: string) => void;
  readonly onExit: () => void;
}

export function HomeScreen({
  did,
  sessionCount,
  onStartNew,
  onLoadSession,
  onExit,
}: HomeScreenProps): React.ReactElement {
  const { exit } = useApp();
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // Show the full banner on first render (console.log, outside of Ink).
  // This runs once — React strict mode may double-invoke but the banner
  // is idempotent visual output.
  const [bannerShown] = useState(() => {
    showBanner(sessionCount);
    return true;
  });

  const handleSubmit = useCallback((text: string) => {
    const trimmed = text.trim().toLowerCase();
    setInput('');

    switch (trimmed) {
      case 'new':
      case 'start':
        onStartNew();
        break;
      case 'exit':
      case 'quit':
      case 'q':
        onExit();
        exit();
        break;
      case 'help':
      case '?':
        setMessage('Commands: new · start · sessions · login · community list · exit');
        setTimeout(() => setMessage(null), 5000);
        break;
      default:
        if (trimmed) {
          setMessage(`Unknown: ${trimmed}. Type 'help' for commands.`);
          setTimeout(() => setMessage(null), 3000);
        }
    }
  }, [onStartNew, onExit, exit]);

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Identity + sessions status */}
      <Box marginTop={1} flexDirection="column">
        {did ? (
          <Text>
            <Text dimColor>  Identity: </Text>
            <Text color="cyan">{did.slice(0, 24)}…</Text>
          </Text>
        ) : (
          <Text dimColor>  No identity. Run: forge login</Text>
        )}
        {sessionCount > 0 && (
          <Text dimColor>  {sessionCount} saved session(s). Type 'sessions' to view.</Text>
        )}
      </Box>

      {/* Quick actions */}
      <Box paddingX={1} marginTop={1} flexDirection="column">
        <Text>  <Text color="green">new</Text>              Start a new deliberation</Text>
        <Text>  <Text color="green">forge start</Text>      Start with options</Text>
        <Text>  <Text color="green">forge community</Text>  Browse peer contributions</Text>
        <Text>  <Text color="green">forge login</Text>      Manage identity</Text>
        <Text>  <Text color="green">help</Text>             All commands</Text>
      </Box>

      {/* Status message */}
      {message && (
        <Box paddingX={1} marginTop={1}>
          <Text color="yellow">{message}</Text>
        </Box>
      )}

      {/* Input */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginTop={1}
      >
        <Text color="cyan">{'> '}</Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Type 'new' to start..."
        />
      </Box>

      <Box paddingX={1}>
        <Text dimColor>Ctrl+C quit │ Decentralized · Keyless · Open Source</Text>
      </Box>
    </Box>
  );
}
