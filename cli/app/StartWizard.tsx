/**
 * StartWizard — Ink-native interactive setup for `forge start`.
 *
 * Replaces the old readline-based prompts that printed to stdout and
 * scrolled the terminal each step. This wizard:
 *   - Stays inside the Ink render tree the whole time
 *   - Uses useInput for arrow-key navigation
 *   - Uses ink-text-input for text fields
 *   - Resolves a single {goal, personaSetName} result via onComplete
 *
 * Steps:
 *   1. Goal input   (skip if `initialGoal` is non-empty)
 *   2. Persona set  (skip if `initialPersonaSet` is non-null)
 *
 * After both are answered, onComplete fires with the captured values.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

export interface PersonaSetOption {
  readonly id: string;           // 'default' | 'generate' | '<file-stem>'
  readonly label: string;        // human-readable name
  readonly subtitle?: string;    // short description
}

interface StartWizardProps {
  readonly projectName: string;
  readonly initialGoal: string;
  readonly personaOptions: ReadonlyArray<PersonaSetOption>;
  readonly initialPersonaSet: string | null;
  readonly onComplete: (result: { goal: string; personaSet: string }) => void;
  readonly onCancel: () => void;
}

type Step = 'goal' | 'persona' | 'done';

export function StartWizard({
  projectName,
  initialGoal,
  personaOptions,
  initialPersonaSet,
  onComplete,
  onCancel,
}: StartWizardProps): React.ReactElement {
  const needsGoal = !initialGoal.trim();
  const needsPersona = !initialPersonaSet;

  const [step, setStep] = useState<Step>(needsGoal ? 'goal' : needsPersona ? 'persona' : 'done');
  const [goal, setGoal] = useState(initialGoal);
  const [goalInput, setGoalInput] = useState('');
  const [personaCursor, setPersonaCursor] = useState(0);
  const [personaSet, setPersonaSet] = useState<string | null>(initialPersonaSet);

  // When step === 'done', fire the completion callback once.
  React.useEffect(() => {
    if (step === 'done' && personaSet !== null) {
      onComplete({ goal, personaSet });
    }
  }, [step, personaSet, goal, onComplete]);

  // Goal submission handler
  const handleGoalSubmit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoal(trimmed);
    setStep(needsPersona ? 'persona' : 'done');
  };

  // Persona navigation (arrow keys + enter)
  useInput((input, key) => {
    if (step !== 'persona') return;
    if (key.escape || (key.ctrl && input === 'c')) {
      onCancel();
      return;
    }
    if (key.upArrow || (key.ctrl && input === 'p')) {
      setPersonaCursor((c) => (c - 1 + personaOptions.length) % personaOptions.length);
      return;
    }
    if (key.downArrow || (key.ctrl && input === 'n')) {
      setPersonaCursor((c) => (c + 1) % personaOptions.length);
      return;
    }
    if (key.return) {
      const selected = personaOptions[personaCursor];
      if (selected) {
        setPersonaSet(selected.id);
        setStep('done');
      }
      return;
    }
    // Digit shortcuts: 0–9 pick by index
    const n = parseInt(input, 10);
    if (!Number.isNaN(n) && n >= 0 && n < personaOptions.length) {
      const selected = personaOptions[n];
      setPersonaSet(selected.id);
      setStep('done');
    }
  });

  if (step === 'done') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text dimColor>Launching deliberation…</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={1}
        flexDirection="column"
        marginBottom={1}
      >
        <Text bold color="yellow">
          ⚒ FORGE · {projectName || 'New Session'}
        </Text>
        <Text dimColor>Set up your deliberation</Text>
      </Box>

      {step === 'goal' && (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            What do you want decided?
          </Text>
          <Text dimColor>
            One clear question. Agents will deliberate against it.
          </Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              value={goalInput}
              onChange={setGoalInput}
              onSubmit={handleGoalSubmit}
              placeholder="Should we migrate from Postgres to Cockroach?"
            />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Enter to continue · Ctrl+C to cancel</Text>
          </Box>
        </Box>
      )}

      {step === 'persona' && (
        <Box flexDirection="column">
          <Text color="cyan" bold>
            Pick a council.
          </Text>
          <Text dimColor>
            {goal ? `Goal: ${goal.slice(0, 60)}${goal.length > 60 ? '…' : ''}` : ''}
          </Text>
          <Box marginTop={1} flexDirection="column">
            {personaOptions.map((opt, i) => {
              const isCursor = i === personaCursor;
              return (
                <Box key={opt.id}>
                  <Text color={isCursor ? 'cyan' : 'gray'}>
                    {isCursor ? '▸ ' : '  '}
                  </Text>
                  <Text color={isCursor ? 'cyan' : undefined} bold={isCursor}>
                    {i}. {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text dimColor>  · {opt.subtitle}</Text>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box marginTop={1}>
            <Text dimColor>↑↓ navigate · Enter select · 0-{personaOptions.length - 1} shortcut · Esc cancel</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
