/**
 * PerplexityProvider — live web-search-augmented reasoning.
 *
 * Why: every other provider in the registry is "closed context" — it
 * only knows what's in its training cut-off or what we feed it in the
 * prompt. Perplexity's online models (sonar family) run a web search
 * on every request and ground the answer in fresh sources. This is
 * the right model to assign to research-heavy phases (Market Probe,
 * Evidence Gathering, Red-Team Threat Model) where "what is the
 * internet currently saying about X" matters.
 *
 * API is OpenAI-compatible, served at https://api.perplexity.ai/.
 * Returns `citations` in the response body — we don't surface them in
 * the TUI yet, but they're captured in the session log for audit.
 */

import OpenAI from 'openai';
import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const BASE_URL = 'https://api.perplexity.ai';

const MODELS: ReadonlyArray<ProviderModel> = [
  { id: 'sonar',             label: 'Sonar',             tier: 'fast',     hint: 'default · live web search' },
  { id: 'sonar-pro',         label: 'Sonar Pro',         tier: 'balanced', hint: 'deeper web research, citations' },
  { id: 'sonar-reasoning',   label: 'Sonar Reasoning',   tier: 'balanced', hint: 'think-then-search' },
  { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro', tier: 'slow',  hint: 'heaviest online reasoning' },
  { id: 'sonar-deep-research', label: 'Sonar Deep Research', tier: 'slow',  hint: 'long-form research reports' },
];

export class PerplexityProvider implements IProvider {
  readonly id = 'perplexity';
  readonly name = 'Perplexity (web-search)';
  private readonly client: OpenAI | null;

  constructor(apiKey?: string) {
    const key = apiKey ?? process.env.PERPLEXITY_API_KEY;
    this.client = key ? new OpenAI({ apiKey: key, baseURL: BASE_URL }) : null;
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return MODELS;
  }

  defaultModelId(): string {
    return 'sonar-pro';
  }

  async query(params: QueryParams): Promise<QueryResult> {
    if (!this.client) {
      return { success: false, error: 'PERPLEXITY_API_KEY not set' };
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

      // Perplexity returns a citations array alongside the standard
      // OpenAI shape. Append a compact source footer so downstream
      // drafting phases can cite real URLs — the stripper won't touch
      // plain URLs.
      const raw = response as unknown as {
        citations?: string[];
        search_results?: Array<{ title?: string; url: string }>;
      };
      const cites = raw.citations || raw.search_results?.map((s) => s.url) || [];
      const withCites =
        cites.length > 0
          ? `${content}\n\nSources:\n${cites.slice(0, 5).map((u, i) => `[${i + 1}] ${u}`).join('\n')}`
          : content;

      return {
        success: true,
        content: withCites,
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
        error: error instanceof Error ? error.message : 'Perplexity request failed',
      };
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const r = await this.query({
      prompt: params.evalPrompt,
      systemPrompt:
        'You are evaluating whether to speak in a discussion. Respond only with JSON.',
      model: 'sonar',
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

  private estimateCost(model: string, inTokens: number, outTokens: number): number {
    // Public pricing as of April 2026, per 1M tokens.
    const price: Record<string, { in: number; out: number }> = {
      'sonar': { in: 1, out: 1 },
      'sonar-pro': { in: 3, out: 15 },
      'sonar-reasoning': { in: 1, out: 5 },
      'sonar-reasoning-pro': { in: 2, out: 8 },
      'sonar-deep-research': { in: 2, out: 8 },
    };
    const p = price[model] ?? { in: 1, out: 5 };
    return (inTokens / 1_000_000) * p.in + (outTokens / 1_000_000) * p.out;
  }
}
