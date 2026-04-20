/**
 * ForgeConfig — persistent user-level settings for the CLI.
 *
 * Stored at `~/.config/forge/config.json` (XDG-ish). `forge init` writes
 * to it; the CLI reads it at startup and layers env vars on top
 * (env always wins, so ephemeral keys / CI overrides Just Work).
 *
 * Keep the shape narrow and forward-compatible — unknown fields are
 * preserved through the read → write cycle so hand-edits survive.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';

export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  /** Ollama-style local endpoint. Ignored by API-key providers. */
  baseUrl?: string;
  /** Optional default model for the provider when the user doesn't pick one. */
  defaultModel?: string;
}

export interface ForgeSettings {
  providers: {
    anthropic?: ProviderConfig;
    gemini?: ProviderConfig;
    openai?: ProviderConfig;
    ollama?: ProviderConfig;
    openrouter?: ProviderConfig;
    perplexity?: ProviderConfig;
  };
  defaults?: {
    /** Default deliberation mode when none is passed to `forge start`. */
    mode?: string;
    /** Default provider picked when a new agent is seeded. */
    defaultProvider?: string;
  };
  /** Anything the user hand-added stays here so it survives rewrites. */
  [extra: string]: unknown;
}

const EMPTY: ForgeSettings = { providers: {} };

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  return path.join(xdg ?? path.join(os.homedir(), '.config'), 'forge');
}

export function configPath(): string {
  return path.join(configDir(), 'config.json');
}

/** Load settings. Missing file → empty settings (not an error). */
export async function loadConfig(): Promise<ForgeSettings> {
  try {
    const raw = await fs.readFile(configPath(), 'utf-8');
    const parsed = JSON.parse(raw) as ForgeSettings;
    // Defensive: ensure providers object exists even in malformed files.
    if (!parsed.providers || typeof parsed.providers !== 'object') {
      parsed.providers = {};
    }
    return parsed;
  } catch {
    return { ...EMPTY };
  }
}

/** Save settings, creating the config dir as needed. */
export async function saveConfig(settings: ForgeSettings): Promise<void> {
  await fs.mkdir(configDir(), { recursive: true });
  await fs.writeFile(configPath(), JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

/**
 * Resolve a provider's credentials — env vars win over file config.
 * Returns `undefined` when the provider is disabled OR no key is set
 * through either path.
 */
export function resolveProviderKey(
  settings: ForgeSettings,
  provider: 'gemini' | 'openai' | 'ollama' | 'anthropic' | 'openrouter' | 'perplexity',
  envName?: string
): string | undefined {
  const envKey = envName ? process.env[envName] : undefined;
  if (envKey) return envKey;
  const cfg = settings.providers[provider];
  if (!cfg || cfg.enabled === false) return undefined;
  return cfg.apiKey;
}
