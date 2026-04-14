/**
 * Shell — the single persistent Ink root for the forge CLI.
 *
 * Claude Code keeps its entire interactive interface inside one Ink render
 * tree and transitions between home / wizard / chat screens via state,
 * never unmounting. Forge used to render HomeScreen, unmount it, then fall
 * into readline prompts that printed to stdout and scrolled the terminal.
 * Shell replaces that flow: one mount, state-machine child swap, zero
 * console.log in the interactive path.
 *
 * Screens:
 *   home    — HomeScreen renders the banner + menu
 *   wizard  — StartWizard collects goal + persona set
 *   app     — App renders the full deliberation TUI
 *   exiting — terminal state, Ink unmounts naturally
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Box, Text } from 'ink';
import { App } from './App';
import { HomeScreen } from './HomeScreen';
import { StartWizard, type PersonaSetOption } from './StartWizard';
import { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import { ClaudeCodeCLIRunner } from '../adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { SessionPersistence } from '../adapters/SessionPersistence';
import { getDefaultMethodology } from '../../src/methodologies';
import type { Session, SessionConfig } from '../../src/types';
import { v4 as uuid } from 'uuid';
import * as path from 'path';

type Screen = 'home' | 'wizard' | 'app' | 'exiting';

interface WizardSeed {
  readonly projectName: string;
  readonly initialGoal: string;
  readonly initialPersonaSet: string | null;
  readonly personaOptions: ReadonlyArray<PersonaSetOption>;
  readonly mode: string;
  readonly language: string;
  readonly humanParticipation: boolean;
  readonly enabledAgents: ReadonlyArray<string>;
  readonly outputDir: string;
}

interface ShellProps {
  readonly did: string | null;
  readonly sessionCount: number;
  /** If non-null, Shell jumps straight past the home screen to the wizard. */
  readonly initialWizardSeed?: WizardSeed | null;
  /** Pre-built session+orchestrator ready to render. Used when CLI flags
   *  provided everything we needed — skip home + wizard entirely. */
  readonly prebuiltApp?: {
    readonly session: Session;
    readonly orchestrator: EDAOrchestrator;
    readonly persistence: SessionPersistence;
  } | null;
  readonly onExit: () => void;
}

export function Shell({
  did,
  sessionCount,
  initialWizardSeed,
  prebuiltApp,
  onExit,
}: ShellProps): React.ReactElement {
  const initialScreen: Screen = prebuiltApp
    ? 'app'
    : initialWizardSeed
    ? 'wizard'
    : 'home';

  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [wizardSeed, setWizardSeed] = useState<WizardSeed | null>(
    initialWizardSeed ?? null
  );
  const [appState, setAppState] = useState<{
    session: Session;
    orchestrator: EDAOrchestrator;
    persistence: SessionPersistence;
  } | null>(prebuiltApp ?? null);

  // HomeScreen callbacks
  const handleStartNew = useCallback(() => {
    // The home screen only opens a default wizard seed for an ad-hoc session.
    // CLI subcommands that go directly into the wizard provide their own seed.
    setWizardSeed({
      projectName: 'New Session',
      initialGoal: '',
      initialPersonaSet: null,
      personaOptions: [
        { id: 'default', label: 'Use default council', subtitle: 'skeptic · pragmatist · analyst · advocate · contrarian' },
        { id: 'generate', label: 'Generate for this project', subtitle: 'LLM-crafted personas tuned to the goal' },
      ],
      mode: 'copywrite',
      language: 'english',
      humanParticipation: true,
      enabledAgents: ['skeptic', 'pragmatist', 'analyst'],
      outputDir: 'output/sessions',
    });
    setScreen('wizard');
  }, []);

  const handleLoadSession = useCallback((_name: string) => {
    // Not implemented in this flow — delegate back up
    onExit();
    setScreen('exiting');
  }, [onExit]);

  const handleHomeExit = useCallback(() => {
    onExit();
    setScreen('exiting');
  }, [onExit]);

  // Wizard callback — builds the session + orchestrator + persistence from
  // the seed and the collected {goal, personaSet}, then swaps to 'app'.
  const handleWizardComplete = useCallback(
    async (result: { goal: string; personaSet: string }) => {
      if (!wizardSeed) return;
      const cwd = process.cwd();
      const fsAdapter = new FileSystemAdapter(cwd);
      const agentRunner = new ClaudeCodeCLIRunner();

      const config: SessionConfig = {
        id: uuid(),
        projectName: wizardSeed.projectName,
        goal: result.goal,
        enabledAgents: [...wizardSeed.enabledAgents],
        humanParticipation: wizardSeed.humanParticipation,
        maxRounds: 10,
        consensusThreshold: 0.6,
        methodology: getDefaultMethodology(),
        contextDir: path.join(cwd, 'context'),
        outputDir: wizardSeed.outputDir,
        language: wizardSeed.language,
        mode: wizardSeed.mode,
      };

      const session: Session = {
        id: config.id,
        config,
        messages: [],
        currentPhase: 'initialization',
        currentRound: 0,
        decisions: [],
        drafts: [],
        startedAt: new Date(),
        status: 'running',
      };

      const persistence = new SessionPersistence(fsAdapter, {
        outputDir: wizardSeed.outputDir,
      });
      await persistence.initSession(session);

      const orchestrator = new EDAOrchestrator(
        session,
        undefined,
        undefined,
        {
          agentRunner,
          fileSystem: fsAdapter,
          autoRunPhaseMachine: !wizardSeed.humanParticipation,
        }
      );

      orchestrator.on((event) => {
        if (event.type === 'agent_message') {
          persistence.updateSession(orchestrator.getSession());
        }
      });

      setAppState({ session, orchestrator, persistence });
      setScreen('app');
    },
    [wizardSeed]
  );

  const handleWizardCancel = useCallback(() => {
    setScreen('home');
  }, []);

  const handleAppExit = useCallback(() => {
    if (appState) {
      void appState.persistence.saveFull();
    }
    onExit();
    setScreen('exiting');
  }, [appState, onExit]);

  // Memoize the HomeScreen props so the banner doesn't re-print on every
  // shell re-render.
  const homeProps = useMemo(
    () => ({
      did,
      sessionCount,
      onStartNew: handleStartNew,
      onLoadSession: handleLoadSession,
      onExit: handleHomeExit,
    }),
    [did, sessionCount, handleStartNew, handleLoadSession, handleHomeExit]
  );

  switch (screen) {
    case 'home':
      return <HomeScreen {...homeProps} />;
    case 'wizard':
      if (!wizardSeed) {
        return <Text color="red">Wizard seed missing</Text>;
      }
      return (
        <StartWizard
          projectName={wizardSeed.projectName}
          initialGoal={wizardSeed.initialGoal}
          personaOptions={wizardSeed.personaOptions}
          initialPersonaSet={wizardSeed.initialPersonaSet}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      );
    case 'app':
      if (!appState) {
        return <Text color="red">App state missing</Text>;
      }
      return (
        <App
          orchestrator={appState.orchestrator}
          persistence={appState.persistence}
          session={appState.session}
          onExit={handleAppExit}
        />
      );
    case 'exiting':
    default:
      return <Box />;
  }
}
