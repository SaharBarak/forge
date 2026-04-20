/**
 * OpenRouterProvider — 100+ models behind a single OpenAI-compatible API.
 *
 * Why: OpenRouter aggregates Anthropic, Google, Meta, DeepSeek, Mistral,
 * Qwen, xAI, and more under one endpoint (https://openrouter.ai/api/v1).
 * Activating this provider gives the operator a pick-any-model experience
 * from the Agent Control panel without integrating each vendor separately.
 *
 * Uses the `openai` SDK with `baseURL` overridden — the protocol is
 * identical, only the endpoint + model strings differ. `prompt_tokens` /
 * `completion_tokens` follow OpenAI shape so usage reporting is uniform.
 */

import OpenAI from 'openai';
import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const BASE_URL = 'https://openrouter.ai/api/v1';

const MODELS: ReadonlyArray<ProviderModel> = [
  { id: 'anthropic/claude-opus-4.1',         label: 'Claude Opus 4.1 (via OR)',         tier: 'slow',     hint: 'deep reasoning' },
  { id: 'anthropic/claude-sonnet-4.5',        label: 'Claude Sonnet 4.5 (via OR)',       tier: 'balanced', hint: 'default Anthropic' },
  { id: 'openai/gpt-4o',                      label: 'GPT-4o (via OR)',                  tier: 'balanced', hint: 'OpenAI flagship' },
  { id: 'openai/o1',                          label: 'o1 (via OR)',                      tier: 'slow',     hint: 'reasoning-heavy' },
  { id: 'google/gemini-2.5-pro',              label: 'Gemini 2.5 Pro (via OR)',          tier: 'slow',     hint: 'long-context' },
  { id: 'google/gemini-2.5-flash',            label: 'Gemini 2.5 Flash (via OR)',        tier: 'fast',     hint: 'cheap + fast' },
  { id: 'deepseek/deepseek-chat',             label: 'DeepSeek V3',                      tier: 'balanced', hint: 'open-weight flagship' },
  { id: 'x-ai/grok-2',                        label: 'Grok 2',                           tier: 'balanced', hint: 'xAI' },
  { id: 'meta-llama/llama-3.1-405b-instruct', label: 'Llama 3.1 405B',                   tier: 'slow',     hint: 'Meta flagship' },
  { id: 'mistralai/mistral-large',            label: 'Mistral Large',                    tier: 'balanced', hint: 'strong European alternative' },
  { id: 'qwen/qwen-2.5-72b-instruct',         label: 'Qwen 2.5 72B',                     tier: 'balanced', hint: 'Alibaba, strong code' },
];

export class OpenRouterProvider implements IProvider {
  readonly id = 'openrouter';
  readonly name = 'OpenRouter';
  private readonly client: OpenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.OPENROUTER_API_KEY;
    // OpenAI SDK with baseURL override — OpenRouter implements the same
    // chat.completions contract.
    this.client = key
      ? new OpenAI({
          apiKey: key,
          baseURL: BASE_URL,
          defaultHeaders: {
            'HTTP-Referer': 'https://github.com/SaharBarak/forge',
            'X-Title': 'Forge · deliberation engine',
          },
        })
      : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return MODELS;
  }

  defaultModelId(): string {
    return 'anthropic/claude-sonnet-4.5';
  }

  async query(params: QueryParams): Promise<QueryResult> {
    if (!this.client) {
      return { success: false, error: 'OPENROUTER_API_KEY not set' };
    }
    try {
      const model = params.model || this.defaultModelId();
      const messages: OpenAI.ChatCompletionMessageParam[] = [
        ...(params.systemPrompt
          ? [{ role: 'system' as const, content: params.systemPrompt }]
          : []),
        { role: 'user' as const, content: params.prompt },
      ];
      const response = await this.client.chat.completions.create({ model, messages });
      const content = response.choices[0]?.message?.content ?? '';
      const usage = response.usage;
      return {
        success: true,
        content,
        usage: usage
          ? {
              inputTokens: usage.prompt_tokens ?? 0,
              outputTokens: usage.completion_tokens ?? 0,
              // OpenRouter bills per-token at model-specific rates; the
              // exact cost is returned in the `generation` meta endpoint
              // which we don't fetch per call. Report 0 and let operators
              // reconcile from the OR dashboard.
              costUsd: 0,
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenRouter request failed',
      };
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const r = await this.query({
      prompt: params.evalPrompt,
      systemPrompt:
        'You are evaluating whether to speak in a discussion. Respond only with JSON.',
      model: this.defaultModelId(),
    });
    if (!r.success || !r.content) {
      return { success: false, urgency: 'pass', reason: r.error || 'No response', responseType: '' };
    }
    const m = r.content.match(/\{[\s\S]*\}/);
    if (!m) return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };
    try {
      const parsed = JSON.parse(m[0]) as { urgency?: string; reason?: string; responseType?: string };
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
