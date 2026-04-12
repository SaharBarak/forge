# Forge — Architectural Patterns

Core patterns applied throughout the codebase, reflecting a functional-TS solution architect style.

## Result Monad (neverthrow)

Every domain boundary returns `Result<T, E>` or `ResultAsync<T, E>` — no throwing.

```typescript
import { Result, ResultAsync, ok, err, okAsync, errAsync, fromPromise } from '../core';

export const generateDid = (): ResultAsync<DIDKeypair, AuthError> =>
  ResultAsync.fromPromise(
    generateKeypairInternal(),
    (cause) => keyGenerationFailed('Failed to generate Ed25519 keypair', cause)
  );
```

**Why:** Explicit error channels; callers can exhaustive-switch by tag; pipelines compose via `.andThen()`, `.map()`, `.mapErr()`, `.orElse()`; no surprise throws.

## Tagged Error Unions

Per-domain discriminated unions using a base `TaggedError<Tag>` shape + curried `makeError(tag)` factory.

```typescript
// src/lib/core/errors.ts
export interface TaggedError<Tag extends string = string> {
  readonly _tag: Tag;
  readonly message: string;
  readonly cause?: unknown;
}

export const makeError = <Tag extends string>(tag: Tag) =>
  (message: string, cause?: unknown): TaggedError<Tag> => ({ _tag: tag, message, cause });
```

Per-domain errors:
- `AuthError` — 15 tags (InvalidDidFormat, CredentialTampered, AttestationRateLimited, ...)
- `P2PError` — 8 tags
- `CommunityError` — 4 tags
- `ConnectionError` — 5 tags

**Why:** Exhaustive switch by `_tag` replaces class hierarchies. Composes with `Result<T, E>` better than Error subclasses. Zero prototype pollution.

## Repository Pattern with Injectable Bridge

`SessionRepository` holds keypair state in a closure (no module-level mutation) and accepts a storage bridge factory. Electron uses IPC; CLI uses file I/O.

```typescript
export const createSessionRepository = (
  bridgeResolver: () => ResultAsync<AuthStorageBridge, AuthError>
): SessionRepository => {
  let cached: DIDKeypair | null = null; // closure-scoped

  return {
    createIdentity: () => { ... },
    addAttestation: (platform, handle) => { ... },
    restoreSession: () => { ... },
    logout: () => { ... },
    getCurrentKeypair: () => cached,
  };
};
```

**Why:** Testable — inject a mock bridge. Swappable — Electron vs CLI without touching domain code. No hidden globals.

## Canonical JSON for Signatures

One canonicalizer used everywhere a signature must span process boundaries. `src/lib/core/canonical.ts`:

```typescript
export const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => JSON.stringify(k) + ':' + canonicalize(value[k]))
    .join(',');
  return '{' + body + '}';
};
```

Deterministic key-sorted, no whitespace. Used by VC signing, P2P envelope signing, and community reactions. Single source of truth.

## Functional Core, Imperative Shell

Domain modules return `Result<T,E>`. React hooks convert to `{data, loading, error}` at the UI boundary.

```typescript
// Functional core — pure, Result-returning
const result = await listContributions(filterKind);

// Imperative shell — React state
result.match(
  (list) => setContributions(list),
  (err) => setError(err.message)
);
```

Components never see Result types. They work in familiar `useState` + `useEffect` patterns.

## Event-Driven Pub/Sub

MessageBus + AgentListener implement the Mediator pattern. Agents don't know about each other — they subscribe to typed events on the bus. Floor management and consensus tracking are pure derivations from the event stream.

**Why:** Agents scale horizontally — adding a 6th agent doesn't require modifying the other 5. Testing isolates per-agent behavior. Consensus tracking is stateless: re-run over the event log produces the same result.

## Dependency Injection via Interfaces

Every side-effecting dependency is behind an interface:

- `IAgentRunner` — wraps Claude API (CLIAgentRunner, ElectronAgentRunner)
- `IFileSystem` — wraps fs (FileSystemAdapter, ElectronFileSystem)
- `AuthStorageBridge` — wraps persistence
- `P2PBridge` — wraps document store
- `ConnectionsBridge` — wraps embeddings + HNSW

Factories wire implementations based on environment. Unit tests inject mocks.

## 1-Responsibility Modules

Each file has ONE purpose. Examples:
- `spinner.ts` — braille dot spinner, nothing else
- `canonical.ts` — one `canonicalize()` function
- `auth/errors.ts` — one tagged error union
- `render/progress.ts` — fractional block bars only

File sizes stay small. Easy to delete, easy to replace.

## Module Barrel Exports

Every domain has an `index.ts` that re-exports the public surface:

```typescript
// src/lib/auth/index.ts
export * from './did';
export * from './attestations';
export * from './vc';
export * from './session';
export * from './errors';
```

Consumers import from the barrel, not individual files. Refactoring internals doesn't break call sites.

## Functional Pipelines Over Loops

Community store example — partition, score, enrich, sort — all composed:

```typescript
export const listContributions = (filterKind?: ContributionKind) =>
  p2pFetchAll<Contribution | Reaction>()
    .mapErr((e) => listFailed(`List failed: ${e.message}`, e))
    .map((docs) => {
      const me = getCurrentKeypair()?.did ?? null;
      const { contributions, reactionsByTarget } = partition(docs);
      return contributions
        .map((c) => enrich(c, reactionsByTarget, me))
        .filter((e) => !filterKind || e.contribution.kind === filterKind)
        .sort(sortNewestFirst);
    });
```

No mutable accumulators in the public surface. Every intermediate value is named and immutable.

## Immutable Data Types

All public types marked `readonly`:

```typescript
export interface PublicAttestation {
  readonly platform: Platform;
  readonly handle: string;
  readonly handleHash: string;
  readonly signals: Readonly<Record<string, string | number>>;
  readonly capturedAt: string;
}
```

Prevents accidental mutation. Compiler enforces it.
