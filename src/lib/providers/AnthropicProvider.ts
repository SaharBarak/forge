/**
 * AnthropicProvider — Forge's default provider.
 *
 * Wraps the existing Claude-backed IAgentRunner (either ClaudeCodeCLIRunner
 * via the Claude Code OAuth'd binary, or CLIAgentRunner via raw API key).
 * This way the provider layer is purely additive: nothing about the old
 * query path changes, the provider just picks the model per-call.
 */

import type { IAgentRunner, QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';
import type { IProvider, ProviderModel } from './IProvider';

const MODELS: ReadonlyArray<ProviderModel> = [
  {
    id: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4',
    tier: 'balanced',
    hint: 'default — balanced speed and reasoning',
  },
  {
    id: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    tier: 'slow',
    hint: 'deepest reasoning, slower',
  },
  {
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6',
    tier: 'slow',
    hint: 'prior-gen Opus, used for evaluations',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Claude Haiku 4.5',
    tier: 'fast',
    hint: 'cheapest and fastest Claude',
  },
];

export class AnthropicProvider implements IProvider {
  readonly id = 'anthropic';
  readonly name = 'Anthropic';
  private readonly runner: IAgentRunner;
  private readonly available: boolean;

  constructor(runner: IAgentRunner, available = true) {
    this.runner = runner;
    this.available = available;
  }

  isAvailable(): boolean {
    return this.available;
  }

  listModels(): ReadonlyArray<ProviderModel> {
    return MODELS;
  }

  defaultModelId(): string {
    return 'claude-sonnet-4-20250514';
  }

  query(params: QueryParams): Promise<QueryResult> {
    return this.runner.query(params);
  }

  evaluate(params: EvalParams): Promise<EvalResult> {
    return this.runner.evaluate(params);
  }
}
