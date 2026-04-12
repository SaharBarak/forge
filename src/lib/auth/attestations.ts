/**
 * Public attestation fetchers — keyless evidence gatherers.
 *
 * Each fetcher hits a fully public HTTP API (no OAuth, no API key, no
 * registration) and returns a normalized `PublicAttestation`. The fetchers
 * are registered in a platform → fetcher map; adding a new platform is a
 * one-line addition to the map.
 *
 * Every function returns `ResultAsync<PublicAttestation, AuthError>` — no
 * throws. Failure modes are distinguished by tag so the UI can surface
 * "rate limited" differently from "handle not found".
 */

import { ResultAsync, errAsync, fromPromise } from '../core';
import type { AuthError } from './errors';
import {
  attestationLookupFailed,
  attestationRateLimited,
  invalidHandle,
  unsupportedPlatform,
} from './errors';
import { hashContent } from './did';

export type Platform = 'mastodon' | 'github' | 'bluesky';

export interface PublicAttestation {
  readonly platform: Platform;
  readonly handle: string;
  readonly handleHash: string;
  readonly signals: Readonly<Record<string, string | number>>;
  readonly capturedAt: string;
}

// ---- bucketing (pure, total) ----

const bucketCount = (n: number): string => {
  if (n < 10) return '<10';
  if (n < 100) return '<100';
  if (n < 1_000) return '<1k';
  if (n < 10_000) return '<10k';
  if (n < 100_000) return '<100k';
  return '100k+';
};

const bucketAgeYears = (createdAt: string): string => {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const years = ageMs / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0.5) return '<0.5y';
  if (years < 1) return '<1y';
  if (years < 2) return '1-2y';
  if (years < 4) return '2-4y';
  if (years < 7) return '4-7y';
  return '7y+';
};

// ---- shared HTTP helper ----

const http = <T>(
  url: string,
  init: RequestInit = {}
): ResultAsync<T, AuthError> =>
  fromPromise(
    (async (): Promise<T> => {
      const res = await fetch(url, init);
      if (res.status === 403 || res.status === 429) {
        const err = new Error('rate_limited');
        (err as Error & { status: number }).status = res.status;
        throw err;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as T;
    })(),
    (cause: unknown): AuthError => {
      if (cause instanceof Error && cause.message === 'rate_limited') {
        return attestationRateLimited(`Rate limited at ${url}`, cause);
      }
      return attestationLookupFailed(`Fetch failed: ${url}`, cause);
    }
  );

// ---- Mastodon ----

interface MastodonAccount {
  readonly id: string;
  readonly username: string;
  readonly created_at: string;
  readonly followers_count: number;
  readonly following_count: number;
  readonly statuses_count: number;
  readonly note: string;
}

interface MastodonHandle {
  readonly user: string;
  readonly instance: string;
}

const parseMastodonHandle = (raw: string): ResultAsync<MastodonHandle, AuthError> => {
  const urlMatch = raw.match(/^https?:\/\/([^/]+)\/@([^/?#]+)/);
  if (urlMatch) {
    return fromPromise(Promise.resolve({ instance: urlMatch[1], user: urlMatch[2] }), (c) =>
      invalidHandle('bad mastodon URL', c)
    );
  }
  const cleaned = raw.replace(/^@/, '');
  const parts = cleaned.split('@');
  if (parts.length !== 2) {
    return errAsync(invalidHandle(`Mastodon handle must be "user@instance", got "${raw}"`));
  }
  return fromPromise(Promise.resolve({ user: parts[0], instance: parts[1] }), (c) =>
    invalidHandle('bad mastodon handle', c)
  );
};

const fetchMastodon = (handle: string): ResultAsync<PublicAttestation, AuthError> =>
  parseMastodonHandle(handle).andThen(({ user, instance }) =>
    http<MastodonAccount>(
      `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`
    ).map((account) => {
      const canonicalHandle = `@${account.username}@${instance}`;
      return {
        platform: 'mastodon' as const,
        handle: canonicalHandle,
        handleHash: hashContent(canonicalHandle.toLowerCase()),
        signals: {
          instance,
          accountAgeBucket: bucketAgeYears(account.created_at),
          followersBucket: bucketCount(account.followers_count),
          followingBucket: bucketCount(account.following_count),
          statusesBucket: bucketCount(account.statuses_count),
          hasBio: account.note && account.note.length > 0 ? 'yes' : 'no',
        },
        capturedAt: new Date().toISOString(),
      };
    })
  );

// ---- GitHub ----

interface GitHubUser {
  readonly login: string;
  readonly created_at: string;
  readonly public_repos: number;
  readonly public_gists: number;
  readonly followers: number;
  readonly following: number;
  readonly bio: string | null;
  readonly type: 'User' | 'Organization';
}

const fetchGitHub = (handle: string): ResultAsync<PublicAttestation, AuthError> => {
  const username = handle.replace(/^@/, '').trim();
  if (!username) return errAsync(invalidHandle('GitHub handle is empty'));

  return http<GitHubUser>(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { Accept: 'application/vnd.github+json' },
  }).map((user) => {
    const canonicalHandle = `@${user.login}`;
    return {
      platform: 'github' as const,
      handle: canonicalHandle,
      handleHash: hashContent(canonicalHandle.toLowerCase()),
      signals: {
        accountType: user.type,
        accountAgeBucket: bucketAgeYears(user.created_at),
        reposBucket: bucketCount(user.public_repos),
        gistsBucket: bucketCount(user.public_gists),
        followersBucket: bucketCount(user.followers),
        followingBucket: bucketCount(user.following),
        hasBio: user.bio ? 'yes' : 'no',
      },
      capturedAt: new Date().toISOString(),
    };
  });
};

// ---- Bluesky ----

interface BlueskyProfile {
  readonly did: string;
  readonly handle: string;
  readonly followersCount?: number;
  readonly followsCount?: number;
  readonly postsCount?: number;
  readonly indexedAt?: string;
  readonly description?: string;
}

const fetchBluesky = (handle: string): ResultAsync<PublicAttestation, AuthError> => {
  const actor = handle.replace(/^@/, '').trim();
  if (!actor) return errAsync(invalidHandle('Bluesky handle is empty'));

  return http<BlueskyProfile>(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
  ).map((profile) => {
    const canonicalHandle = `@${profile.handle}`;
    return {
      platform: 'bluesky' as const,
      handle: canonicalHandle,
      handleHash: hashContent(canonicalHandle.toLowerCase()),
      signals: {
        accountAgeBucket: profile.indexedAt ? bucketAgeYears(profile.indexedAt) : 'unknown',
        followersBucket: bucketCount(profile.followersCount ?? 0),
        followsBucket: bucketCount(profile.followsCount ?? 0),
        postsBucket: bucketCount(profile.postsCount ?? 0),
        hasBio: profile.description ? 'yes' : 'no',
      },
      capturedAt: new Date().toISOString(),
    };
  });
};

// ---- registry / dispatcher ----

type PlatformFetcher = (handle: string) => ResultAsync<PublicAttestation, AuthError>;

const REGISTRY: Readonly<Record<Platform, PlatformFetcher>> = {
  mastodon: fetchMastodon,
  github: fetchGitHub,
  bluesky: fetchBluesky,
};

/**
 * Unified entry point. Dispatches to the platform-specific fetcher.
 */
export const fetchAttestation = (
  platform: Platform,
  handle: string
): ResultAsync<PublicAttestation, AuthError> => {
  const fetcher = REGISTRY[platform];
  if (!fetcher) {
    return errAsync(unsupportedPlatform(`Unknown platform: ${platform}`));
  }
  return fetcher(handle);
};

/**
 * Deterministic hash over a set of attestations — used inside the VC.
 */
export const hashAttestations = (attestations: readonly PublicAttestation[]): string => {
  const canonical = JSON.stringify(
    attestations.map((a) => ({
      platform: a.platform,
      handleHash: a.handleHash,
      signals: a.signals,
    }))
  );
  return hashContent(canonical);
};
