# Providers

**Status**: Complete (Anthropic + Gemini + OpenAI live)
**Owner**: `src/lib/providers/`
**Since**: Phase 2

## Purpose

Route each agent's chat queries through a pluggable backend so operators can mix model providers within a single deliberation — e.g. the Skeptic runs on Claude Opus while the Pragmatist runs on Gemini 2.5 Flash. Introduced in Phase 2 without breaking the existing `IAgentRunner` contract used by the Electron path.

## Contract

```ts
interface IProvider {
  readonly id: string;                      // 'anthropic' | 'gemini' | 'openai'
  readonly name: string;                    // human label
  isAvailable(): boolean;                   // credentials present
  listModels(): ReadonlyArray<ProviderModel>;
  defaultModelId(): string;
  query(params: QueryParams): Promise<QueryResult>;
  evaluate(params: EvalParams): Promise<EvalResult>;
}

interface ProviderModel {
  readonly id: string;                      // provider-local model id
  readonly label: string;                   // human-friendly label
  readonly tier: 'fast' | 'balanced' | 'slow';
  readonly hint?: string;
}
```

`QueryParams`, `QueryResult`, `EvalParams`, `EvalResult` are the same types `IAgentRunner` already uses — providers are a *higher-level* abstraction that sits on top of runners.

## Registry

```ts
class ProviderRegistry {
  register(provider: IProvider, opts?: { asDefault?: boolean }): void;
  get(id: string): IProvider;                // throws if missing
  tryGet(id: string): IProvider | undefined;
  list(): ReadonlyArray<IProvider>;
  listAvailable(): ReadonlyArray<IProvider>;
  getDefault(): IProvider;
  has(id: string): boolean;
}
```

The registry is constructed once in `cli/index.ts`, injected into `EDAOrchestrator` via `options.providers`. The orchestrator selects the provider per-query from the agent's live `AgentRuntimeConfig`.

## Implementations

### AnthropicProvider
Wraps the existing `IAgentRunner` (either `ClaudeCodeCLIRunner` via `@anthropic-ai/claude-agent-sdk` or `CLIAgentRunner` via `@anthropic-ai/sdk`). Zero-cost abstraction — every query flows through the same code path as Phase 1. Models exposed: `claude-sonnet-4-20250514` (default), `claude-opus-4-7`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`.

### GeminiProvider
`@google/genai` chat backend. Activates only when `GEMINI_API_KEY` or `GOOGLE_API_KEY` is set. Models: `gemini-2.5-flash` (default), `gemini-2.5-pro`, `gemini-2.0-flash`. Gemini expects `systemInstruction` in `config` (not a separate role), so the adapter folds `QueryParams.systemPrompt` into `config.systemInstruction`.

Cost estimation per-response uses a small internal price table (approximate public pricing as of Apr 2026) — sufficient for TUI cost-meter order-of-magnitude display; not authoritative.

### OpenAIProvider
`openai` SDK (chat completions). Activates on `OPENAI_API_KEY`. Models: `gpt-4o` (default), `gpt-4o-mini`, `o1-mini`, `gpt-4-turbo`. o-series models don't accept a `system` role, so the adapter folds `QueryParams.systemPrompt` into the user message prefix for those models only.

Cost estimation uses an approximate public-pricing table for the TUI cost meter at order-of-magnitude accuracy; not authoritative.

## Live routing in `ClaudeCodeAgent`

```ts
private async routedQuery(prompt, systemPrompt) {
  const cfg = this.effectiveConfig();           // resolveConfig(agentId)
  if (cfg && this.providers) {
    const provider = this.providers.tryGet(cfg.providerId) ?? this.providers.getDefault();
    return provider.query({ prompt, systemPrompt, model: cfg.modelId });
  }
  return this.runner.query({ prompt, systemPrompt, model: 'claude-sonnet-4-20250514' }); // legacy fallback
}
```

The fallback preserves the Electron path (which has no `providers` registry). Configuration changes propagate on the next query — listeners resolve `getAgentConfig(id)` each call.

## Wiring

```
cli/index.ts
  ├─ construct CLIAgentRunner or ClaudeCodeCLIRunner as before
  ├─ new ProviderRegistry
  │    .register(new AnthropicProvider(runner), { asDefault: true })
  │    .register(new GeminiProvider())   // iff GEMINI_API_KEY / GOOGLE_API_KEY
  │    .register(new OpenAIProvider())   // iff OPENAI_API_KEY
  └─ new EDAOrchestrator(…, { providers, agentRunner, … })
```

## Non-goals
- Streaming. AgentListener consumes whole messages; streaming isn't useful today.
- Provider-level rate limiting or circuit breakers (handled by SDKs).
- Persisting provider choices across sessions (see `agent-configs.json` which is session-scoped).
