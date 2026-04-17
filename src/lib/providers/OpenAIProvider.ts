/**
 * OpenAIProvider — OpenAI chat backend for Forge agents.
 *
 * Uses the official `openai` SDK. Chat Completions API maps cleanly to
 * the Forge IProvider contract: `systemPrompt` becomes a system role
 * message, `prompt` becomes a user role message.
 *
 * Shape mirrors GeminiProvider for symmetry — activation key, cost
 * estimation table, evaluate() reusing query(). Rough cost table is
 * approximate public pricing and only feeds the TUI cost meter at
 * order-of-magnitude accuracy.
 */

import OpenAI from 'openai';
import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const MODELS: ReadonlyArray<ProviderModel> = [
  {
    id: 'gpt-4o',
    label: 'GPT-4o',
    tier: 'balanced',
    hint: 'default — balanced reasoning and speed',
  },
  {
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    tier: 'fast',
    hint: 'cheap + fast — good for reactive agents',
  },
  {
    id: 'o1-mini',
    label: 'o1 mini',
    tier: 'balanced',
    hint: 'reasoning-focused, thinks before answering',
  },
  {
    id: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    tier: 'slow',
    hint: 'prior-gen, widely available',
  },
];

export class OpenAIProvider implements IProvider {
  readonly id = 'openai';
  readonly name = 'OpenAI';
  private readonly client: OpenAI | null;
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY;
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return MODELS;
  }

  defaultModelId(): string {
    return 'gpt-4o';
  }

  async query(params: QueryParams): Promise<QueryResult> {
    if (!this.client) {
      return { success: false, error: 'OPENAI_API_KEY not set' };
    }

    try {
      const model = params.model || this.defaultModelId();

      // o1-series models don't support system role — fold any
      // system prompt into the user message prefix.
      const isOSeries = model.startsWith('o1') || model.startsWith('o3');
      const messages: OpenAI.ChatCompletionMessageParam[] = isOSeries
        ? [
            {
              role: 'user',
              content: params.systemPrompt
                ? `${params.systemPrompt}\n\n---\n\n${params.prompt}`
                : params.prompt,
            },
          ]
        : [
            ...(params.systemPrompt
              ? [{ role: 'system' as const, content: params.systemPrompt }]
              : []),
            { role: 'user' as const, content: params.prompt },
          ];

      const response = await this.client.chat.completions.create({
        model,
        messages,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';
      const usage = response.usage;

      return {
        success: true,
        content,
        usage: usage
          ? {
              inputTokens: usage.prompt_tokens ?? 0,
              outputTokens: usage.completion_tokens ?? 0,
              costUsd: this.estimateCost(
                model,
                usage.prompt_tokens ?? 0,
                usage.completion_tokens ?? 0
              ),
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenAI request failed',
      };
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const queryResult = await this.query({
      prompt: params.evalPrompt,
      systemPrompt:
        'You are evaluating whether to speak in a discussion. Respond only with JSON.',
      model: this.defaultModelId(),
    });

    if (!queryResult.success || !queryResult.content) {
      return {
        success: false,
        urgency: 'pass',
        reason: queryResult.error || 'No response',
        responseType: '',
      };
    }

    const jsonMatch = queryResult.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        urgency?: string;
        reason?: string;
        responseType?: string;
      };
      return {
        success: true,
        urgency: (parsed.urgency as EvalResult['urgency']) || 'pass',
        reason: parsed.reason || '',
        responseType: parsed.responseType || '',
      };
    } catch {
      return { success: true, urgency: 'pass', reason: 'Parse error', responseType: '' };
    }
  }

  /**
   * Rough cost estimate per-model (USD). Approximate public pricing.
   */
  private estimateCost(model: string, inTokens: number, outTokens: number): number {
    // Prices per 1M tokens (approximate public pricing, Jan 2026).
    const priceTable: Record<string, { in: number; out: number }> = {
      'gpt-4o': { in: 2.5, out: 10 },
      'gpt-4o-mini': { in: 0.15, out: 0.6 },
      'o1-mini': { in: 3, out: 12 },
      'gpt-4-turbo': { in: 10, out: 30 },
    };
    const price = priceTable[model] ?? { in: 2.5, out: 10 };
    return (inTokens / 1_000_000) * price.in + (outTokens / 1_000_000) * price.out;
  }
}
