/**
 * GeminiProvider — Google Gemini chat backend for Forge agents.
 *
 * Uses @google/genai. Gemini's chat API expects a `systemInstruction` at
 * config-level (not a separate "system" role like Anthropic), so the
 * adapter folds `params.systemPrompt` into the `config.systemInstruction`
 * and passes the user prompt as `contents`.
 *
 * Evaluation reuses query() because the judge prompt is short enough that
 * the cheap flash model is plenty fast.
 */

import { GoogleGenAI } from '@google/genai';
import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const MODELS: ReadonlyArray<ProviderModel> = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    tier: 'fast',
    hint: 'fast + cheap — good for reactive agents',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    tier: 'slow',
    hint: 'deeper reasoning, long context',
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    tier: 'fast',
    hint: 'stable, widely available',
  },
];

export class GeminiProvider implements IProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';
  private readonly client: GoogleGenAI | null;
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    this.client = this.apiKey ? new GoogleGenAI({ apiKey: this.apiKey }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return MODELS;
  }

  defaultModelId(): string {
    return 'gemini-2.5-flash';
  }

  async query(params: QueryParams): Promise<QueryResult> {
    if (!this.client) {
      return { success: false, error: 'GEMINI_API_KEY not set' };
    }

    try {
      const model = params.model || this.defaultModelId();
      const response = await this.client.models.generateContent({
        model,
        contents: params.prompt,
        config: params.systemPrompt
          ? { systemInstruction: params.systemPrompt }
          : undefined,
      });

      const content = response.text ?? '';
      const usage = response.usageMetadata;
      return {
        success: true,
        content,
        usage: usage
          ? {
              inputTokens: usage.promptTokenCount ?? 0,
              outputTokens: usage.candidatesTokenCount ?? 0,
              costUsd: this.estimateCost(
                model,
                usage.promptTokenCount ?? 0,
                usage.candidatesTokenCount ?? 0
              ),
            }
          : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gemini request failed',
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
   * Rough cost estimate per-model (USD). Keeps the CostMeter honest even
   * though Gemini's pricing changes over time — we only care about order
   * of magnitude for the TUI.
   */
  private estimateCost(model: string, inTokens: number, outTokens: number): number {
    // Prices per 1M tokens (approximate public pricing, Apr 2026).
    const priceTable: Record<string, { in: number; out: number }> = {
      'gemini-2.5-flash': { in: 0.3, out: 2.5 },
      'gemini-2.5-pro': { in: 1.25, out: 10 },
      'gemini-2.0-flash': { in: 0.1, out: 0.4 },
    };
    const price = priceTable[model] ?? { in: 0.3, out: 2.5 };
    return (inTokens / 1_000_000) * price.in + (outTokens / 1_000_000) * price.out;
  }
}
