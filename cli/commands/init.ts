/**
 * `forge init` — interactive first-run setup wizard.
 *
 * Walks the user through enabling each provider, pasting API keys, and
 * picking a default mode. Writes to `~/.config/forge/config.json` so
 * subsequent `forge start` invocations don't need env vars every run.
 *
 * Design principles:
 *   - Every step is skippable — the wizard never forces a key
 *   - Env vars always win over the saved config, so CI / ephemeral keys
 *     override the persistent setup
 *   - Ollama is auto-detected (probe localhost:11434) before prompting
 *   - Re-running `forge init` edits the existing config, doesn't wipe it
 */

import { Command } from 'commander';
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { loadConfig, saveConfig, configPath, type ForgeSettings } from '../../src/lib/config/ForgeConfig';
import { OllamaProvider } from '../../src/lib/providers/OllamaProvider';

async function probeOllama(): Promise<{ up: boolean; models: string[] }> {
  const provider = new OllamaProvider();
  const up = await provider.probe();
  if (!up) return { up: false, models: [] };
  return {
    up: true,
    models: provider.listModels().map((m) => m.id),
  };
}

async function runInit(opts: { force?: boolean }): Promise<void> {
  p.intro(chalk.bold('⚒  forge init'));

  const existing = await loadConfig();
  const hasExisting = Object.keys(existing.providers ?? {}).length > 0;
  if (hasExisting && !opts.force) {
    const keep = await p.confirm({
      message: `Existing config at ${configPath()}. Edit it?`,
      initialValue: true,
    });
    if (p.isCancel(keep) || !keep) {
      p.cancel('No changes.');
      return;
    }
  }

  const next: ForgeSettings = {
    ...existing,
    providers: { ...existing.providers },
  };

  // ─── Anthropic ──────────────────────────────────────────────────
  const anthropic = await p.confirm({
    message: 'Enable Anthropic (Claude)? Uses your local `claude` CLI auth — no key needed.',
    initialValue: next.providers.anthropic?.enabled ?? true,
  });
  if (p.isCancel(anthropic)) return abortAndReturn();
  next.providers.anthropic = {
    enabled: !!anthropic,
    defaultModel: next.providers.anthropic?.defaultModel ?? 'claude-sonnet-4-20250514',
  };

  // ─── Gemini ─────────────────────────────────────────────────────
  const gemini = await p.confirm({
    message: 'Enable Gemini (Google)?',
    initialValue: next.providers.gemini?.enabled ?? false,
  });
  if (p.isCancel(gemini)) return abortAndReturn();
  if (gemini) {
    const key = await p.password({
      message: 'Paste GEMINI_API_KEY (enter to skip — env var still works):',
      mask: '•',
    });
    if (p.isCancel(key)) return abortAndReturn();
    next.providers.gemini = {
      enabled: true,
      apiKey: key ? String(key).trim() : next.providers.gemini?.apiKey,
      defaultModel: next.providers.gemini?.defaultModel ?? 'gemini-2.5-flash',
    };
  } else {
    next.providers.gemini = { enabled: false };
  }

  // ─── OpenAI ─────────────────────────────────────────────────────
  const openai = await p.confirm({
    message: 'Enable OpenAI (GPT)?',
    initialValue: next.providers.openai?.enabled ?? false,
  });
  if (p.isCancel(openai)) return abortAndReturn();
  if (openai) {
    const key = await p.password({
      message: 'Paste OPENAI_API_KEY (enter to skip — env var still works):',
      mask: '•',
    });
    if (p.isCancel(key)) return abortAndReturn();
    next.providers.openai = {
      enabled: true,
      apiKey: key ? String(key).trim() : next.providers.openai?.apiKey,
      defaultModel: next.providers.openai?.defaultModel ?? 'gpt-4o',
    };
  } else {
    next.providers.openai = { enabled: false };
  }

  // ─── OpenRouter (aggregates 100+ models behind one key) ─────────
  const openrouter = await p.confirm({
    message: 'Enable OpenRouter? (100+ models · Claude / GPT / Gemini / DeepSeek / Grok / Llama / Mistral / Qwen via one API)',
    initialValue: next.providers.openrouter?.enabled ?? false,
  });
  if (p.isCancel(openrouter)) return abortAndReturn();
  if (openrouter) {
    const key = await p.password({
      message: 'Paste OPENROUTER_API_KEY:',
      mask: '•',
    });
    if (p.isCancel(key)) return abortAndReturn();
    next.providers.openrouter = {
      enabled: true,
      apiKey: key ? String(key).trim() : next.providers.openrouter?.apiKey,
      defaultModel: next.providers.openrouter?.defaultModel ?? 'anthropic/claude-sonnet-4.5',
    };
  } else {
    next.providers.openrouter = { enabled: false };
  }

  // ─── Perplexity (web-search-grounded answers) ───────────────────
  const perplexity = await p.confirm({
    message: 'Enable Perplexity? (live web search for research phases · sonar / sonar-pro)',
    initialValue: next.providers.perplexity?.enabled ?? false,
  });
  if (p.isCancel(perplexity)) return abortAndReturn();
  if (perplexity) {
    const key = await p.password({
      message: 'Paste PERPLEXITY_API_KEY:',
      mask: '•',
    });
    if (p.isCancel(key)) return abortAndReturn();
    next.providers.perplexity = {
      enabled: true,
      apiKey: key ? String(key).trim() : next.providers.perplexity?.apiKey,
      defaultModel: next.providers.perplexity?.defaultModel ?? 'sonar-pro',
    };
  } else {
    next.providers.perplexity = { enabled: false };
  }

  // ─── Ollama (local: Gemma / Llama / Qwen / Mistral / DeepSeek) ──
  const spin = p.spinner();
  spin.start('Probing Ollama at http://localhost:11434');
  const ollama = await probeOllama();
  spin.stop(
    ollama.up
      ? `Ollama daemon up · ${ollama.models.length} model${ollama.models.length === 1 ? '' : 's'} installed`
      : 'No Ollama daemon (install from ollama.com if you want local models like Gemma)'
  );

  if (ollama.up) {
    const pick = await p.confirm({
      message: 'Enable Ollama for local models (Gemma, Llama, Qwen, Mistral, DeepSeek)?',
      initialValue: next.providers.ollama?.enabled ?? true,
    });
    if (p.isCancel(pick)) return abortAndReturn();
    let defaultModel = next.providers.ollama?.defaultModel;
    if (pick && ollama.models.length > 0 && !defaultModel) {
      const m = await p.select({
        message: 'Default local model to seed new agents with:',
        options: ollama.models.map((id) => ({ value: id, label: id })),
        initialValue: ollama.models[0],
      });
      if (p.isCancel(m)) return abortAndReturn();
      defaultModel = String(m);
    }
    next.providers.ollama = {
      enabled: !!pick,
      baseUrl: next.providers.ollama?.baseUrl ?? 'http://localhost:11434',
      defaultModel,
    };
  } else {
    next.providers.ollama = { enabled: false };
  }

  // ─── Defaults ───────────────────────────────────────────────────
  const mode = await p.select({
    message: 'Default mode when `forge start` is called without -m:',
    options: [
      { value: 'will-it-work', label: 'will-it-work — force a YES/NO/MAYBE-IF verdict' },
      { value: 'idea-validation', label: 'idea-validation — GO/NO-GO/PIVOT' },
      { value: 'tech-review', label: 'tech-review — specialist repo audit' },
      { value: 'red-team', label: 'red-team — adversarial review' },
      { value: 'vc-pitch', label: 'vc-pitch — simulated partner meeting' },
      { value: 'copywrite', label: 'copywrite — section-by-section drafting' },
      { value: 'custom', label: 'custom — your phases' },
    ],
    initialValue: next.defaults?.mode ?? 'will-it-work',
  });
  if (p.isCancel(mode)) return abortAndReturn();
  next.defaults = { ...next.defaults, mode: String(mode) };

  await saveConfig(next);

  const enabled = Object.entries(next.providers)
    .filter(([, cfg]) => cfg?.enabled)
    .map(([id]) => id);

  p.note(
    [
      `Config saved → ${configPath()}`,
      '',
      `Providers enabled: ${enabled.length > 0 ? enabled.join(', ') : '(none)'}`,
      `Default mode:      ${next.defaults.mode}`,
      '',
      chalk.dim('Re-run `forge init` any time to edit.'),
      chalk.dim('Env vars (GEMINI_API_KEY, OPENAI_API_KEY) always override the saved config.'),
    ].join('\n'),
    'Done'
  );

  p.outro(chalk.green('Ready. Try `forge start -m ' + next.defaults.mode + '` to run your first deliberation.'));
}

function abortAndReturn(): void {
  p.cancel('Cancelled — nothing saved.');
}

export function createInitCommand(): Command {
  return new Command('init')
    .description('Interactive setup: enable providers, paste API keys, pick defaults')
    .option('-f, --force', 'Skip the "edit existing?" prompt and rewrite directly')
    .action(async (opts: { force?: boolean }) => {
      try {
        await runInit(opts);
      } catch (err) {
        console.error(chalk.red('forge init failed:'), err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
