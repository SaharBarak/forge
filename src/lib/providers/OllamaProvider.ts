/**
 * OllamaProvider — local model backend via Ollama's chat API.
 *
 * Ollama runs as a daemon on localhost:11434 (configurable). Works with
 * any model you've pulled — gemma, llama, qwen, mistral, deepseek, etc.
 * No npm dep: we just fetch the REST API directly.
 *
 * Activation: the provider is "available" when the daemon answers
 * `GET /api/tags` on construction. Discovery is synchronous because
 * the provider registry is built at CLI startup — an unreachable
 * daemon just means OllamaProvider.isAvailable() returns false.
 *
 * Models: listed dynamically from /api/tags. If the daemon is
 * unreachable we fall back to a small curated default set so the
 * TUI picker still shows something sensible for the user to enable.
 */

import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const DEFAULT_BASE_URL = 'http://localhost:11434';

const CURATED_MODELS: ReadonlyArray<ProviderModel> = [
  { id: 'gemma3:27b',   label: 'Gemma 3 27B',   tier: 'slow',     hint: 'Google open model — strong reasoning' },
  { id: 'gemma3:4b',    label: 'Gemma 3 4B',    tier: 'fast',     hint: 'small, fast, multilingual' },
  { id: 'llama3.3:70b', label: 'Llama 3.3 70B', tier: 'slow',     hint: 'Meta flagship open model' },
  { id: 'qwen2.5:32b',  label: 'Qwen 2.5 32B',  tier: 'balanced', hint: 'Alibaba — strong code + reasoning' },
  { id: 'mistral:latest', label: 'Mistral',     tier: 'balanced', hint: 'general-purpose' },
];

export class OllamaProvider implements IProvider {
  readonly id = 'ollama';
  readonly name = 'Ollama (local)';
  private readonly baseUrl: string;
  private available: boolean;
  private installedModels: ReadonlyArray<ProviderModel> | null = null;

  constructor(opts: { baseUrl?: string; assumeAvailable?: boolean } = {}) {
    this.baseUrl = opts.baseUrl ?? process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL;
    this.available = opts.assumeAvailable ?? false;
  }

  isAvailable(): boolean {
    return this.available;
  }

  /**
   * Async liveness probe. The CLI calls this once at startup to flip
   * `available` and cache the real model list. Sync `isAvailable()`
   * reads the cached flag.
   */
  async probe(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(1500) });
      if (!res.ok) {
        this.available = false;
        return false;
      }
      const body = (await res.json()) as { models?: Array<{ name: string; size?: number }> };
      if (Array.isArray(body.models) && body.models.length > 0) {
        this.installedModels = body.models.map((m) => ({
          id: m.name,
          label: m.name,
          tier: 'balanced' as const,
          hint: m.size ? `${(m.size / 1e9).toFixed(1)} GB` : undefined,
        }));
      }
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return this.installedModels ?? CURATED_MODELS;
  }

  defaultModelId(): string {
    const list = this.listModels();
    return list[0]?.id ?? 'gemma3:4b';
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const model = params.model || this.defaultModelId();
    const messages = [
      ...(params.systemPrompt ? [{ role: 'system' as const, content: params.systemPrompt }] : []),
      { role: 'user' as const, content: params.prompt },
    ];

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, stream: false }),
      });
      if (!res.ok) {
        return { success: false, error: `Ollama ${res.status}: ${await res.text().catch(() => '')}` };
      }
      const body = (await res.json()) as {
        message?: { content?: string };
        prompt_eval_count?: number;
        eval_count?: number;
      };
      return {
        success: true,
        content: body.message?.content ?? '',
        usage: {
          inputTokens: body.prompt_eval_count ?? 0,
          outputTokens: body.eval_count ?? 0,
          // Local inference has no $ cost — keep the TUI meter honest.
          costUsd: 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ollama request failed',
      };
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const result = await this.query({
      prompt: params.evalPrompt,
      systemPrompt:
        'You are evaluating whether to speak in a discussion. Respond only with JSON.',
      model: this.defaultModelId(),
    });

    if (!result.success || !result.content) {
      return {
        success: false,
        urgency: 'pass',
        reason: result.error || 'No response',
        responseType: '',
      };
    }

    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        urgency?: string; reason?: string; responseType?: string;
      };
      return {
        success: true,
        urgency: (parsed.urgency as EvalResult['urgency']) ?? 'pass',
        reason: parsed.reason ?? '',
        responseType: parsed.responseType ?? '',
      };
    } catch {
      return { success: true, urgency: 'pass', reason: 'Parse error', responseType: '' };
    }
  }
}
