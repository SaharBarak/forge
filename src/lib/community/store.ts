/**
 * Community store — typed, functional layer on top of the P2P client.
 *
 * Two envelope kinds travel through the underlying OrbitDB store:
 *   1. Contributions — payloads matching a Contribution variant
 *   2. Reactions     — payloads of shape { kind: 'reaction', targetId, vote }
 *
 * This module:
 *   - Publishes contributions and reactions as signed envelopes
 *   - Reads the full store, partitions by payload shape, aggregates scores,
 *     and returns a sorted, enriched list — all via functional pipelines
 *     (no mutable accumulators in the public surface)
 *
 * Every public function returns `ResultAsync<T, CommunityError>`.
 */

import { ResultAsync, errAsync } from '../core';
import { publish as p2pPublish, fetchAll as p2pFetchAll, type VerifiedDoc } from '../p2p';
import { getCurrentKeypair } from '../auth/session';
import type { CommunityError } from './errors';
import { listFailed, noActiveIdentity, publishFailed, reactFailed } from './errors';
import {
  CONTRIBUTION_SCHEMA_VERSION,
  type Contribution,
  type Reaction,
  type EnrichedContribution,
  type ContributionKind,
} from './types';

// ---- type guards (pure, total) ----

const isContribution = (payload: unknown): payload is Contribution => {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as { kind?: unknown; v?: unknown; title?: unknown; content?: unknown };
  return (
    typeof p.kind === 'string' &&
    typeof p.v === 'number' &&
    typeof p.title === 'string' &&
    ['persona', 'insight', 'template', 'prompt'].includes(p.kind as string) &&
    typeof p.content === 'object'
  );
};

const isReaction = (payload: unknown): payload is Reaction => {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as { kind?: unknown; targetId?: unknown; vote?: unknown };
  return (
    p.kind === 'reaction' &&
    typeof p.targetId === 'string' &&
    (p.vote === 'up' || p.vote === 'down')
  );
};

// ---- mutations ----

/**
 * Publish a new contribution. Schema version is auto-stamped.
 */
export const publishContribution = (
  input: Omit<Contribution, 'v'> & { readonly v?: number }
): ResultAsync<string, CommunityError> => {
  const payload = { ...input, v: input.v ?? CONTRIBUTION_SCHEMA_VERSION } as Contribution;
  return p2pPublish({ payload })
    .map(({ id }) => id)
    .mapErr((e) => publishFailed(`Publish failed: ${e.message}`, e));
};

/**
 * Cast a vote on a contribution. Deterministic envelope ID
 * (`vote:{voterDid}:{targetId}`) ensures that flipping a vote replaces the
 * previous envelope rather than accumulating tombstones.
 */
export const publishReaction = (
  targetId: string,
  vote: 'up' | 'down'
): ResultAsync<void, CommunityError> => {
  const keypair = getCurrentKeypair();
  if (!keypair) return errAsync(noActiveIdentity('Must be logged in to react'));

  const payload: Reaction = {
    v: CONTRIBUTION_SCHEMA_VERSION,
    kind: 'reaction',
    targetId,
    vote,
  };
  const id = `vote:${keypair.did}:${targetId}`;

  return p2pPublish({ payload, id })
    .map(() => undefined)
    .mapErr((e) => reactFailed(`React failed: ${e.message}`, e));
};

// ---- query pipeline (pure, functional) ----

interface PartitionedDocs {
  readonly contributions: ReadonlyArray<VerifiedDoc<Contribution>>;
  readonly reactionsByTarget: ReadonlyMap<string, ReadonlyMap<string, Reaction>>;
}

/**
 * Partition the full store into contributions and reactions. Reactions are
 * indexed by target ID, then by voter DID, keeping only the most recent
 * vote from each voter.
 */
const partition = (
  docs: ReadonlyArray<VerifiedDoc<Contribution | Reaction>>
): PartitionedDocs => {
  type MutableReactionIndex = Map<string, Map<string, Reaction & { _receivedAt: string }>>;

  const initial = {
    contributions: [] as VerifiedDoc<Contribution>[],
    reactionsByTarget: new Map() as MutableReactionIndex,
  };

  const result = docs.reduce((acc, doc) => {
    if (isContribution(doc.payload)) {
      acc.contributions.push(doc as VerifiedDoc<Contribution>);
    } else if (isReaction(doc.payload)) {
      const reaction = doc.payload;
      const byVoter = acc.reactionsByTarget.get(reaction.targetId) ?? new Map();
      const existing = byVoter.get(doc.did);
      if (!existing || doc.timestamp > existing._receivedAt) {
        byVoter.set(doc.did, { ...reaction, _receivedAt: doc.timestamp });
      }
      acc.reactionsByTarget.set(reaction.targetId, byVoter);
    }
    return acc;
  }, initial);

  return result;
};

interface ScoreAndMyVote {
  readonly score: number;
  readonly myVote: 'up' | 'down' | null;
}

const scoreContribution = (
  targetId: string,
  reactionsByTarget: ReadonlyMap<string, ReadonlyMap<string, Reaction>>,
  me: string | null
): ScoreAndMyVote => {
  const reactions = reactionsByTarget.get(targetId);
  if (!reactions) return { score: 0, myVote: null };

  return Array.from(reactions.entries()).reduce<ScoreAndMyVote>(
    (acc, [voterDid, reaction]) => ({
      score: acc.score + (reaction.vote === 'up' ? 1 : -1),
      myVote: voterDid === me ? reaction.vote : acc.myVote,
    }),
    { score: 0, myVote: null }
  );
};

const enrich = (
  contribution: VerifiedDoc<Contribution>,
  reactionsByTarget: ReadonlyMap<string, ReadonlyMap<string, Reaction>>,
  me: string | null
): EnrichedContribution => {
  const { score, myVote } = scoreContribution(contribution.id, reactionsByTarget, me);
  return {
    id: contribution.id,
    authorDid: contribution.did,
    publishedAt: contribution.timestamp,
    hash: contribution.hash,
    contribution: contribution.payload,
    score,
    myVote,
  };
};

const sortNewestFirst = (a: EnrichedContribution, b: EnrichedContribution): number =>
  b.publishedAt.localeCompare(a.publishedAt);

/**
 * Fetch, partition, enrich, filter, and sort.
 */
export const listContributions = (
  filterKind?: ContributionKind
): ResultAsync<ReadonlyArray<EnrichedContribution>, CommunityError> =>
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

// ---- pure helpers ----

export const shortenDid = (did: string, length = 10): string =>
  did.length <= length * 2 + 3 ? did : `${did.slice(0, length)}…${did.slice(-length)}`;
