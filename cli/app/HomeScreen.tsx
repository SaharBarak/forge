/**
 * HomeScreen — Ink TUI lobby shown on bare `forge` with no args.
 *
 * Displays the Forge banner in the same Ink box-border style as the
 * session App, with identity status, quick commands, and a rotating quote.
 * Replaces the old readline REPL as the default landing experience.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { getRandomQuote, formatQuote } from '../../src/lib/quotes';

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

  const [quote] = useState(() => formatQuote(getRandomQuote()));
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

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
        setMessage('Use: new · sessions · login · community list · exit');
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
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {/* Banner */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text bold color="magenta">🔥 FORGE</Text>
        <Text dimColor>Multi-Agent Deliberation Engine</Text>
        <Text dimColor>Reach consensus through structured debate</Text>
      </Box>

      {/* Quote */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor italic>{quote}</Text>
      </Box>

      {/* Identity */}
      <Box paddingX={1} marginTop={1}>
        {did ? (
          <Text>
            <Text dimColor>Identity: </Text>
            <Text color="cyan">{did.slice(0, 24)}…</Text>
          </Text>
        ) : (
          <Text dimColor>No identity yet. Run: forge login</Text>
        )}
      </Box>

      {/* Sessions */}
      {sessionCount > 0 && (
        <Box paddingX={1}>
          <Text dimColor>{sessionCount} saved session(s). Run: forge sessions</Text>
        </Box>
      )}

      {/* Quick actions */}
      <Box paddingX={1} marginTop={1} flexDirection="column">
        <Text bold color="yellow">Quick Start</Text>
        <Text>  <Text color="green">new</Text>              Start a new deliberation session</Text>
        <Text>  <Text color="green">forge start</Text>      Start with options (--goal, --agents)</Text>
        <Text>  <Text color="green">forge community</Text>  Browse peer contributions</Text>
        <Text>  <Text color="green">forge login</Text>      Manage your DID identity</Text>
        <Text>  <Text color="green">forge --help</Text>     All commands</Text>
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
          placeholder="Type 'new' to start or 'help'..."
        />
      </Box>

      {/* Footer */}
      <Box paddingX={1}>
        <Text dimColor>Ctrl+C quit │ Decentralized · Keyless · Open Source</Text>
      </Box>
    </Box>
  );
}
