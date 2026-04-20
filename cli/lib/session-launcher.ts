/**
 * session-launcher.ts — shared runway from "session config decided" to
 * "OpenTUI deliberation view mounted and running".
 *
 * Both paths end up here:
 *   1. The interactive menu (`forge` with no args) after the wizard
 *   2. The power-user `forge start -m -g -a` flag command
 *
 * The function takes a fully-resolved SessionLaunchRequest (project
 * name + goal + mode + agents + language + flags) and handles all the
 * boilerplate: runner, provider registry, persona registration, skill
 * loading, workdir, identity, console capture, and OpenTUI render.
 *
 * Keeps `cli/index.ts` thin and `cli/commands/menu.ts` focused on UX.
 */

import React from 'react';
import { v4 as uuid } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { ClaudeCodeCLIRunner } from '../adapters/ClaudeCodeCLIRunner';
import { FileSystemAdapter } from '../adapters/FileSystemAdapter';
import { SessionPersistence } from '../adapters/SessionPersistence';
import { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import { getDefaultMethodology } from '../../src/methodologies';
import {
  AGENT_PERSONAS,
  registerCustomPersonas,
  clearCustomPersonas,
} from '../../src/agents/personas';
import { createFileAuthBridge } from '../adapters/auth-bridge';
import { createSessionRepository } from '../../src/lib/auth/session';
import { ResultAsync } from '../../src/lib/core';
import { loadConfig, resolveProviderKey } from '../../src/lib/config/ForgeConfig';
import type { Session, SessionConfig, AgentPersona } from '../../src/types';

export interface SessionLaunchRequest {
  projectName: string;
  goal: string;
  mode: string;
  agents: string[];
  language: 'english' | 'hebrew' | 'mixed';
  humanParticipation: boolean;
  outputDir: string;
  /** Optional custom persona set name (from personas/<name>.json). */
  personaSet?: string | null;
  /** Optional path hint for brief-based flows. Leave undefined otherwise. */
  brief?: string;
  /**
   * When set · avatar-i is pinned to slots[i-1].providerId/modelId and a
   * RoleRotator rotates debate roles across phases. Used by
   * `forge debate`.
   */
  debateSlots?: ReadonlyArray<{ providerId: string; modelId: string; label: string }>;
}

/**
 * Run one session end-to-end: builds adapters, registry, persistence,
 * renders OpenTUI, resolves on session:end. Never throws — errors are
 * printed to stderr and bubbled via `success: false`.
 */
export async function launchSession(
  req: SessionLaunchRequest
): Promise<{ success: boolean; sessionDir?: string; error?: string }> {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);

  // Claude Code CLI runner by default — inherits the user's authenticated
  // `claude` session. Only fall back to the raw SDK runner if
  // ANTHROPIC_API_KEY is explicitly set.
  const agentRunner = process.env.ANTHROPIC_API_KEY
    ? new CLIAgentRunner()
    : new ClaudeCodeCLIRunner();

  // Provider registry — Anthropic always; the rest activate when their
  // credentials are available (either env var or saved config).
  const {
    ProviderRegistry,
    AnthropicProvider,
    GeminiProvider,
    OpenAIProvider,
    OllamaProvider,
    OpenRouterProvider,
    PerplexityProvider,
  } = await import('../../src/lib/providers');
  const forgeSettings = await loadConfig();

  const providers = new ProviderRegistry();
  providers.register(new AnthropicProvider(agentRunner, true), { asDefault: true });

  const geminiKey =
    resolveProviderKey(forgeSettings, 'gemini', 'GEMINI_API_KEY') ??
    resolveProviderKey(forgeSettings, 'gemini', 'GOOGLE_API_KEY');
  const gemini = new GeminiProvider(geminiKey);
  if (gemini.isAvailable()) providers.register(gemini);

  const openaiKey = resolveProviderKey(forgeSettings, 'openai', 'OPENAI_API_KEY');
  const openai = new OpenAIProvider(openaiKey);
  if (openai.isAvailable()) providers.register(openai);

  const openrouterKey = resolveProviderKey(forgeSettings, 'openrouter', 'OPENROUTER_API_KEY');
  const openrouter = new OpenRouterProvider(openrouterKey);
  if (openrouter.isAvailable()) providers.register(openrouter);

  const perplexityKey = resolveProviderKey(forgeSettings, 'perplexity', 'PERPLEXITY_API_KEY');
  const perplexity = new PerplexityProvider(perplexityKey);
  if (perplexity.isAvailable()) providers.register(perplexity);

  const ollamaCfg = forgeSettings.providers.ollama;
  if (ollamaCfg?.enabled !== false) {
    const ollama = new OllamaProvider({ baseUrl: ollamaCfg?.baseUrl });
    if (await ollama.probe()) providers.register(ollama);
  }

  // Personas: default council, or a named custom set from personas/<name>.json,
  // or generated provider-avatars for debate sessions.
  let availablePersonas: AgentPersona[] = AGENT_PERSONAS;
  let domainSkills: string | undefined;
  if (req.personaSet) {
    const personasPath = path.join(cwd, 'personas', `${req.personaSet}.json`);
    try {
      const content = await fs.readFile(personasPath, 'utf-8');
      availablePersonas = JSON.parse(content) as AgentPersona[];
    } catch {
      return {
        success: false,
        error: `Persona set "${req.personaSet}" not found in personas/`,
      };
    }
    const skillsPath = path.join(cwd, 'personas', `${req.personaSet}.skills.md`);
    try {
      domainSkills = await fs.readFile(skillsPath, 'utf-8');
    } catch {
      // Missing .skills.md is fine.
    }
    registerCustomPersonas(availablePersonas);
  } else if (req.debateSlots) {
    // Debate mode · generate one provider-avatar per slot and register
    // them as custom personas so the orchestrator lookup finds them.
    const { generateProviderAvatars } = await import('../../src/agents/provider-avatars');
    const avatars = generateProviderAvatars(req.debateSlots);
    registerCustomPersonas(avatars);
    availablePersonas = [...AGENT_PERSONAS, ...avatars];
  } else {
    clearCustomPersonas();
  }

  const validAgents = req.agents.filter((id) =>
    availablePersonas.some((a) => a.id === id)
  );
  if (validAgents.length === 0) {
    return {
      success: false,
      error: `None of the requested agents match the active persona set.`,
    };
  }

  const config: SessionConfig = {
    id: uuid(),
    projectName: req.projectName,
    goal: req.goal,
    enabledAgents: validAgents,
    humanParticipation: req.humanParticipation,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path.join(cwd, 'context'),
    outputDir: req.outputDir,
    language: req.language,
    mode: req.mode,
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
    outputDir: req.outputDir,
  });
  await persistence.initSession(session);

  const { loadSkills, discoverSkills } = await import('../../src/lib/skills');
  const resolvedSkills = await loadSkills({
    cwd,
    modeId: req.mode,
    enabledAgents: validAgents,
    sessionWorkdir: persistence.getSessionDir(),
    goal: req.goal,
  });
  const skillCatalog = await discoverSkills({ cwd });

  // If this is a debate-mode session, seed each avatar's runtime config
  // to pin it to its designated provider+model from turn 1.
  const initialAgentConfigs: Record<string, { providerId: string; modelId: string }> = {};
  if (req.debateSlots) {
    for (let i = 0; i < req.debateSlots.length; i++) {
      initialAgentConfigs[`avatar-${i + 1}`] = {
        providerId: req.debateSlots[i].providerId,
        modelId: req.debateSlots[i].modelId,
      };
    }
  }

  const orchestrator = new EDAOrchestrator(session, undefined, domainSkills, {
    agentRunner,
    fileSystem: fsAdapter,
    autoRunPhaseMachine: !req.humanParticipation,
    providers,
    sessionWorkdir: persistence.getSessionDir(),
    perAgentSkills: resolvedSkills.perAgent,
    skillCatalog,
    initialAgentConfigs: Object.keys(initialAgentConfigs).length > 0 ? initialAgentConfigs : undefined,
  });

  // Debate mode · start the role rotator so each phase shuffles who
  // plays skeptic / pragmatist / analyst / advocate / contrarian.
  if (req.debateSlots) {
    const { RoleRotator } = await import('../../src/lib/eda/RoleRotator');
    const rotator = new RoleRotator(orchestrator, validAgents);
    rotator.start();
  }

  orchestrator.on((event) => {
    if (event.type === 'agent_message') {
      persistence.updateSession(orchestrator.getSession());
    }
  });

  // Reaction engine · loads reactions.json / reactions.yaml from the
  // working directory if present, falls back to sensible defaults
  // (handle loop_detected, stuck_agent, low_consensus_after_15).
  const { ReactionEngine, DEFAULT_RULES } = await import('../../src/lib/eda/ReactionEngine');
  let reactionConfig = DEFAULT_RULES;
  for (const candidate of ['reactions.json']) {
    const p = path.join(cwd, candidate);
    try {
      const raw = await fs.readFile(p, 'utf-8');
      reactionConfig = JSON.parse(raw);
      console.error(chalk.dim(`  · reactions loaded from ${candidate}`));
      break;
    } catch {
      // ignore
    }
  }
  const reactions = new ReactionEngine(orchestrator, reactionConfig);
  reactions.start();

  let configFlushPending = false;
  orchestrator.on(async (event) => {
    if (event.type !== 'agent_config_change') return;
    if (configFlushPending) return;
    configFlushPending = true;
    queueMicrotask(async () => {
      configFlushPending = false;
      try {
        const snapshot = Object.fromEntries(orchestrator.getAllAgentConfigs());
        await fsAdapter.writeFile(
          path.join(persistence.getSessionDir(), 'agent-configs.json'),
          JSON.stringify(snapshot, null, 2)
        );
      } catch (err) {
        console.error('[agent-configs] persist failed:', err);
      }
    });
  });

  // Ensure DID identity.
  const authRepo = createSessionRepository(() =>
    ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
  );
  const authResult = await authRepo.restoreSession();
  authResult.match(
    () => undefined,
    async () => {
      await authRepo.createIdentity();
    }
  );

  // Silence stray console.log so the TUI stays clean.
  const { captureConsoleToFile } = await import('../adapters/console-capture');
  const captured = captureConsoleToFile(persistence.getSessionDir());

  // Mount OpenTUI.
  const { createCliRenderer } = await import('@opentui/core');
  const { createRoot } = await import('@opentui/react');
  const { OpenTuiApp } = await import('../otui/App');

  // backgroundColor forces the renderer to clear cells with a known bg every
  // frame — without it, OpenTUI's diff algorithm can skip overwriting cells
  // where a new space matches the fg-only comparison, leaving old letters
  // from previous messages visible (root cause of the "IvappreciateAthe"
  // word-collision artifacts the user saw in the debate.gif).
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    backgroundColor: '#0a0a0b',
    targetFps: 15,
  });
  const root = createRoot(renderer);
  const done = new Promise<void>((resolve) => {
    renderer.on('destroy', () => resolve());
  });

  root.render(
    React.createElement(OpenTuiApp, {
      orchestrator,
      persistence,
      session,
      onExit: () => {
        renderer.destroy();
      },
    })
  );

  await done;
  captured.restore();
  await persistence.saveFull();
  clearCustomPersonas();

  console.log('');
  console.log(chalk.green(`Session saved to ${persistence.getSessionDir()}`));
  console.log(chalk.dim(`  debug log: ${captured.logPath}`));

  return { success: true, sessionDir: persistence.getSessionDir() };
}
