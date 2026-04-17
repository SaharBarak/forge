/**
 * IProvider — pluggable chat-model provider for Forge agents.
 *
 * Sits underneath the existing IAgentRunner facade. The orchestrator holds
 * a ProviderRegistry and a per-agent `AgentRuntimeConfig` keyed by agentId.
 * When an agent speaks, its config chooses which provider+model handles
 * the call, so individual agents can run on Claude/Gemini/etc. in the
 * same deliberation.
 *
 * Providers own their own auth (env var, keychain lookup) and model
 * catalog. The contract is deliberately narrow: query + evaluate + list
 * — no streaming yet, because AgentListener consumes whole messages.
 */

import type { QueryParams, QueryResult, EvalParams, EvalResult } from '../interfaces';

export interface ProviderModel {
  /** Provider-local model id passed to the underlying SDK. */
  readonly id: string;
  /** Human-friendly label shown in the TUI picker. */
  readonly label: string;
  /** Rough latency/cost hint: 'fast' | 'balanced' | 'slow'. */
  readonly tier: 'fast' | 'balanced' | 'slow';
  /** One-line description for the picker. */
  readonly hint?: string;
}

export interface IProvider {
  /** Stable provider id: 'anthropic' | 'gemini' | 'openai'. */
  readonly id: string;
  /** Human-facing provider name. */
  readonly name: string;
  /** Whether credentials are available. Providers without auth skip listing. */
  isAvailable(): boolean;
  /** Models this provider exposes to the user. */
  listModels(): ReadonlyArray<ProviderModel>;
  /** Default model id for this provider. */
  defaultModelId(): string;
  /** Run a full agent query against the given model. */
  query(params: QueryParams): Promise<QueryResult>;
  /** Lightweight evaluation (should-I-speak). Providers may reuse query. */
  evaluate(params: EvalParams): Promise<EvalResult>;
}

/**
 * Per-agent runtime config. Owned by the orchestrator, mutable at runtime
 * via `updateAgentConfig`. Changes emit an EDA `agent_config_change` event
 * so the UI can reflect them without a restart.
 */
export interface AgentRuntimeConfig {
  providerId: string;
  modelId: string;
  /** true = skip normal speaking cadence, agent speaks only on force-speak. */
  paused?: boolean;
  /** Optional instruction appended to the agent's system prompt. */
  systemSuffix?: string;
}

/** Resolver injected into agent listeners so they pick up live config. */
export type AgentRuntimeConfigResolver = (agentId: string) => AgentRuntimeConfig;
