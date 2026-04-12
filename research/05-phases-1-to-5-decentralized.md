# Forge — Decentralized Features (Phases 1-5)

Five phases of decentralization added to the core deliberation engine.

## Phase 1 — Keyless DID Identity

**Module:** `src/lib/auth/`

No OAuth, no API keys, no accounts. Users create a W3C `did:key` identity in one click; optionally attach public attestations from keyless Mastodon/GitHub/Bluesky profile APIs.

### Files

- `did.ts` — Ed25519 keypair generation (`did:key` method), multibase base58btc encoding
- `attestations.ts` — Fetchers for Mastodon (`/api/v1/accounts/lookup`), GitHub (`/users/:login`), Bluesky (`getProfile`) — all keyless
- `vc.ts` — Self-issued W3C Verifiable Credential binding DID to attestation signals
- `session.ts` — `SessionRepository` with injectable `AuthStorageBridge`
- `errors.ts` — `AuthError` tagged union

### CLI Commands

```
forge login              # Create or restore identity
forge login status       # Show current DID
forge login logout       # Clear stored identity
```

### Storage

`~/.forge/auth.json` (mode 0600). Contains serialized keypair + self-issued VC.

### Architecture

- Uses `neverthrow` Result monad at domain boundaries
- Tagged error union (15 variants)
- Canonical JSON signing via `src/lib/core/canonical.ts`
- Injectable storage bridge (Electron IPC in desktop, file in CLI)

## Phase 2 — Signed Document Store

**Module:** `src/lib/p2p/` + `electron/p2p/node.js`

Originally intended to use Helia + OrbitDB for true P2P replication. Due to an **incompatibility between Helia v6 and OrbitDB v3 on Node v25** (`blockstore-fs` v3 returns `AsyncGenerator<Uint8Array>`, OrbitDB v3 expects `Promise<Uint8Array>`), the MVP uses a **JSONL file store** with the same signed-envelope architecture. P2P replication can be plugged in when OrbitDB 4.0 ships.

### Files

- `electron/p2p/node.js` — JSONL document store with append + tombstone. Load on boot, full scan on query. Does NOT use libp2p/Helia in current MVP.
- `src/lib/p2p/client.ts` — Result-based client with sign-on-write, verify-on-read
- `src/lib/p2p/errors.ts` — `P2PError` tagged union

### Signed Envelope Format

```typescript
interface SignedEnvelope {
  _id: string;
  _did: string;        // author
  _ts: string;          // ISO timestamp
  _sig: string;         // base58btc Ed25519 signature
  payload: unknown;
}
```

Signature covers canonical JSON of `{_id, _did, _ts, payload}` — NOT including `_sig` itself.

### Verification

`fetchAll()` returns only envelopes that pass signature verification. Invalid or unsigned entries are silently dropped.

## Phase 3 — Community Contributions

**Module:** `src/lib/community/`

Typed layer on top of Phase 2's signed envelopes. Four kinds of contributions:

- `persona` — shareable agent persona (full AgentPersona format)
- `insight` — learning from a session (body text)
- `template` — reusable session template (mode + goal + personaIds)
- `prompt` — reusable prompt snippet

Plus `Reaction` type for upvotes/downvotes.

### Files

- `types.ts` — `Contribution` union, `Reaction`, `EnrichedContribution`
- `store.ts` — Functional pipeline for fetch → partition → aggregate scores → filter → sort
- `errors.ts` — `CommunityError` tagged union

### Deterministic Vote IDs

A user's vote for a contribution always has ID `vote:{voterDid}:{targetId}`. Changing a vote overwrites instead of accumulating. One DID = one vote per target, enforced at the ID schema level.

### CLI Commands

```
forge community list                      # Feed
forge community list -k insight           # Filter by kind
forge community publish -k insight -t ... -d ... -b ...
forge community vote <id>                 # Upvote
forge community vote <id> --down          # Downvote
```

### UI

- `src/components/community/CommunityPanel.tsx` — Full-screen overlay (Electron)
- `src/components/community/ContributionCard.tsx` — Single item with vote buttons, score, author DID, "Import persona →" action
- `src/components/community/PublishDialog.tsx` — Kind picker + form
- `src/components/community/SimilarContributions.tsx` — Uses Phase 4 connections

## Phase 4 — Semantic Connections

**Module:** `src/lib/connections/` + `electron/connections/`

On-device embeddings + HNSW vector search. When a user publishes a contribution or reads one, "similar ideas from other peers" surface as connections.

### Files

- `electron/connections/embeddings.js` — Transformers.js v4 pipeline. Lazy single-flight loader. `Xenova/all-MiniLM-L6-v2` (22M params, 384-dim, ~22MB download cached in `~/.cache/huggingface/`).
- `electron/connections/vector-index.js` — usearch HNSW wrapper. Bidirectional string-ID ↔ BigUint64 map (usearch keys are bigint). Persists `index.usearch` + `id-map.json`.
- `electron/connections/service.js` — Orchestrator. `indexContribution`, `findSimilarByText`, status.
- `src/lib/connections/client.ts` — Result-based IPC facade
- `src/lib/connections/errors.ts` — `ConnectionError` tagged union
- `src/lib/connections/types.ts` — `SimilarityMatch`, `buildSearchableText()`

### buildSearchableText()

Extracts canonical text from a contribution for embedding:

```typescript
const buildSearchableText = (contribution) => {
  const bodyText = extractBodyText(contribution.content);
  return [contribution.title, contribution.description, bodyText]
    .filter(Boolean)
    .join('\n\n');
};
```

### React Hook

`src/hooks/useConnections.ts` — Live status polling (3s while loading, 5s otherwise), `indexAll()` idempotent bulk indexer, `findSimilarTo(contribution, k)`, `findSimilarByText(text, k)`.

## Phase 5 — Terminal Rendering Pipeline

**Module:** `src/lib/render/`

Pure ANSI rendering functions shared across CLI dashboard and shell components.

### Files

- `theme.ts` — `SemanticTheme` with 50+ named color tokens (`text.primary`, `heading.h1`, `status.success`, `agent.ronit`, `consensus.agree`, `phase.active`, etc.)
- `markdown.ts` — Markdown → ANSI via `marked` Lexer. Headings, bold, italic, code blocks with `╭─ lang` borders, blockquotes, nested lists, links. Also `createStreamRenderer()` with fence-aware boundary detection for LLM streaming.
- `spinner.ts` — Braille dot spinner (`⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`). `tick()` / `finish(✔)` / `fail(✘)` at 80ms frame rate.
- `borders.ts` — Box drawing, separators, agent message headers, phase transition banners (`═══ ENTERING SYNTHESIS ═══`).
- `progress.ts` — Fractional block bars (`▏▎▍▌▋▊▉█`), dual-color bars, sparklines (`▁▂▃▄▅▆▇█`), attestation dots (`●●●○○`), percentage labels.
- `consensus.ts` — Consensus thermometer, debate intensity sparkline with trend detection, stance summary, vote tally.
- `phase.ts` — Phase transition banners, 10-phase progress bar, vertical phase list with `✔`/`●`/`○` markers.

### Used By

- `src/components/shell/AgentShell.ts` — Renders agent messages with markdown
- `src/components/shell/FloorManagerShell.ts` — Consensus thermometer + debate intensity
- `src/components/shell/MainShell.ts` — Theme tokens instead of hardcoded ANSI
- `cli/app/ChatPane.tsx` — `renderMarkdown()` for message content
- `cli/app/AgentList.tsx` — `agentColor()` for identity + stance badges
- `cli/app/StatusBar.tsx` — `progressBar()` for phase progress

### Why `marked` Instead of markdansi/shiki

Originally picked `markdansi` but it has a Node-only dep (`supports-color` imports `node:process`) that breaks Vite's browser bundle for the Electron renderer. Swapped to custom renderer using `marked`'s `Lexer.lex()` — walks token tree and produces ANSI strings. Zero Node deps, bundles clean. `shiki` v4 removed `codeToAnsi`, so code block syntax highlighting is currently monochrome (future enhancement: `cli-highlight`).
