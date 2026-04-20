/**
 * `forge debate "<question>"` — cross-provider debate with rotating roles.
 *
 * Signature Forge feature. Each agent is named by its provider + model
 * (Claude · Sonnet 4.5, Gemini · 2.5 Pro, GPT · 4o, …). Debate roles
 * (skeptic / pragmatist / analyst / advocate / contrarian) ROTATE
 * between agents at every phase transition — the operator sees Claude
 * start as the skeptic, then Gemini take the skeptic seat in phase 2,
 * then GPT in phase 3, etc. Each time an agent's role changes, the
 * RoleRotator announces it on the bus (visible in the discussion pane)
 * and injects a fresh stance directive.
 *
 * The debate runs through the `will-it-work` phase machine (4 phases ·
 * define → evidence → debate → verdict), so you get one rotation per
 * phase plus a forced verdict at the end.
 *
 * Wizard:
 *   1. Type the question
 *   2. Pick which providers+models to put in the ring (2-5)
 *   3. (optional) human participation
 *   4. Confirm → launches OpenTUI
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import path from 'path';
import { launchSession } from '../lib/session-launcher';
import { loadConfig } from '../../src/lib/config/ForgeConfig';
import {
  generateProviderAvatars,
  type ProviderSlot,
} from '../../src/agents/provider-avatars';
import type { IProvider } from '../../src/lib/providers';

interface AvailableProvider {
  id: string;
  label: string;
  models: Array<{ id: string; label: string }>;
}

/** Resolve which providers are actually available (config/env keys present). */
async function availableProviders(): Promise<AvailableProvider[]> {
  const { ProviderRegistry, AnthropicProvider, GeminiProvider, OpenAIProvider, OllamaProvider, OpenRouterProvider, PerplexityProvider } =
    await import('../../src/lib/providers');
  const { CLIAgentRunner } = await import('../adapters/CLIAgentRunner');
  const { ClaudeCodeCLIRunner } = await import('../adapters/ClaudeCodeCLIRunner');
  const { resolveProviderKey } = await import('../../src/lib/config/ForgeConfig');

  const settings = await loadConfig();
  const reg = new ProviderRegistry();
  // Anthropic is always in for the debate — it drives the wizard and is the default.
  const runner = process.env.ANTHROPIC_API_KEY ? new CLIAgentRunner() : new ClaudeCodeCLIRunner();
  reg.register(new AnthropicProvider(runner, true), { asDefault: true });

  const gemini = new GeminiProvider(resolveProviderKey(settings, 'gemini', 'GEMINI_API_KEY'));
  if (gemini.isAvailable()) reg.register(gemini);

  const openai = new OpenAIProvider(resolveProviderKey(settings, 'openai', 'OPENAI_API_KEY'));
  if (openai.isAvailable()) reg.register(openai);

  const openrouter = new OpenRouterProvider(resolveProviderKey(settings, 'openrouter', 'OPENROUTER_API_KEY'));
  if (openrouter.isAvailable()) reg.register(openrouter);

  const perplexity = new PerplexityProvider(resolveProviderKey(settings, 'perplexity', 'PERPLEXITY_API_KEY'));
  if (perplexity.isAvailable()) reg.register(perplexity);

  const ollamaCfg = settings.providers.ollama;
  if (ollamaCfg?.enabled !== false) {
    const ollama = new OllamaProvider({ baseUrl: ollamaCfg?.baseUrl });
    if (await ollama.probe()) reg.register(ollama);
  }

  return reg.listAvailable().map((prov: IProvider) => ({
    id: prov.id,
    label: prov.name,
    models: prov.listModels().map((m) => ({ id: m.id, label: m.label })),
  }));
}

async function pickProviderSlots(): Promise<ProviderSlot[] | null> {
  const providers = await availableProviders();
  if (providers.length === 0) {
    p.note(
      'No providers available. Run ' + chalk.bold('forge init') + ' first.',
      'No providers'
    );
    return null;
  }

  // When only one provider is configured, run a single-provider debate
  // with multiple MODELS from that provider. The role rotation still
  // produces a meaningful cross-perspective debate — agents rotate
  // through skeptic/pragmatist/analyst/advocate/contrarian stances.
  if (providers.length === 1) {
    const only = providers[0];
    if (only.models.length < 2) {
      p.note(
        `Only one provider (${only.label}) with one model is available. A debate needs at least 2 participants — add another provider via ` +
          chalk.bold('forge init') +
          ' or a provider with more models.',
        'Not enough participants'
      );
      return null;
    }
    p.note(
      `Only ${only.label} is configured. The debate will put ${only.label}'s own models in the ring — the role rotation still produces distinct perspectives.`,
      'Single-provider debate'
    );
    const picked = await p.multiselect({
      message: `Which ${only.label} models step into the ring? (space to toggle · 2–5)`,
      options: only.models.map((m) => ({ value: m.id, label: m.label })),
      initialValues: only.models.slice(0, Math.min(4, only.models.length)).map((m) => m.id),
      required: true,
    });
    if (p.isCancel(picked)) return null;
    return (picked as string[]).map((modelId) => {
      const modelLabel = only.models.find((m) => m.id === modelId)?.label ?? modelId;
      return { providerId: only.id, modelId, label: `${only.label} · ${modelLabel}` };
    });
  }

  const picked = await p.multiselect({
    message: 'Which providers step into the ring? (space to toggle · 2–5)',
    options: providers.map((pr) => ({
      value: pr.id,
      label: pr.label,
      hint: `${pr.models.length} model${pr.models.length === 1 ? '' : 's'}`,
    })),
    initialValues: providers.slice(0, Math.min(4, providers.length)).map((pr) => pr.id),
    required: true,
  });
  if (p.isCancel(picked)) return null;

  const slots: ProviderSlot[] = [];
  for (const providerId of picked as string[]) {
    const prov = providers.find((pr) => pr.id === providerId);
    if (!prov) continue;
    const modelId = await p.select({
      message: `${prov.label} · which model?`,
      options: prov.models.map((m) => ({ value: m.id, label: m.label })),
      initialValue: prov.models[0]?.id,
    });
    if (p.isCancel(modelId)) return null;
    const modelLabel = prov.models.find((m) => m.id === modelId)?.label ?? String(modelId);
    slots.push({
      providerId,
      modelId: String(modelId),
      label: `${prov.label} · ${modelLabel}`,
    });
  }
  return slots;
}

async function run(question: string, opts: { yes?: boolean; output?: string }): Promise<void> {
  p.intro(chalk.bold('⚒  forge debate · cross-provider with rotating roles'));

  const slots = await pickProviderSlots();
  if (!slots || slots.length < 2) {
    p.cancel('Cancelled · debate needs at least 2 providers.');
    return;
  }

  // Generate the avatars here purely to preview them in the plan note;
  // launchSession re-generates + registers the real ones internally.
  const avatars = generateProviderAvatars(slots);

  const humanChoice = opts.yes
    ? false
    : await p.confirm({ message: 'Human participation? (can interject between turns)', initialValue: false });
  if (p.isCancel(humanChoice)) return;

  p.note(
    [
      `${chalk.bold('Question:')} ${question}`,
      `${chalk.bold('Ring:')}`,
      ...slots.map((s, i) => `  ${i + 1}. ${s.label}`),
      ``,
      chalk.dim('Mode: will-it-work (define → evidence → debate → verdict)'),
      chalk.dim('Each phase rotates the skeptic/pragmatist/analyst/advocate/contrarian roles.'),
    ].join('\n'),
    'Plan'
  );

  if (!opts.yes) {
    const go = await p.confirm({ message: 'Start the debate?', initialValue: true });
    if (p.isCancel(go) || !go) {
      p.cancel('Cancelled.');
      return;
    }
  }

  // Launch. session-launcher sees `debateSlots` option and wires the
  // role rotator + per-avatar runtime configs.
  const result = await launchSession({
    projectName: 'DebateRing',
    goal: question,
    mode: 'will-it-work',
    agents: avatars.map((a) => a.id),
    language: 'english',
    humanParticipation: !!humanChoice,
    outputDir: opts.output ?? 'output/sessions',
    debateSlots: slots,
  });

  if (!result.success) {
    console.error(chalk.red(result.error ?? 'Debate did not start'));
    process.exitCode = 1;
  }
}

export function createDebateCommand(): Command {
  return new Command('debate')
    .description('Cross-provider debate · agents named by provider, roles rotate each phase')
    .argument('<question...>', 'The question to put in the ring')
    .option('-y, --yes', 'Skip confirmations')
    .option('-o, --output <dir>', 'Output directory', 'output/sessions')
    .action(async (question: string[], opts: { yes?: boolean; output?: string }) => {
      try {
        await run(question.join(' '), opts);
      } catch (err) {
        if (err instanceof Error && /force closed/i.test(err.message)) return;
        console.error(chalk.red('forge debate failed:'), err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}

// Keep path import used (silence unused) — debate saves per-slot metadata next to session.
void path;
