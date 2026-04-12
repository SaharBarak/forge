/**
 * Forge connections client — renderer-side, Result-returning facade over
 * the Electron `connections:*` IPC bridge.
 *
 * Every function returns `ResultAsync<T, ConnectionError>`. The backend
 * (Electron main) holds the Transformers.js pipeline + USearch HNSW index;
 * this module is purely the wire protocol adapter.
 */

import { ResultAsync, okAsync, errAsync, fromPromise } from '../core';
import type { ConnectionError } from './errors';
import {
  bridgeUnavailable,
  embeddingFailed,
  indexingFailed,
  searchFailed,
  statusFailed,
} from './errors';
import type { ConnectionsStatus, SimilarityMatch } from './types';

// ---- bridge contract ----

interface ConnectionsBridge {
  readonly status: () => Promise<ConnectionsStatus>;
  readonly indexContribution: (
    id: string,
    text: string
  ) => Promise<{ skipped: boolean; reason?: string }>;
  readonly deindexContribution: (id: string) => Promise<{ skipped: boolean }>;
  readonly findSimilar: (
    text: string,
    k?: number,
    excludeId?: string | null
  ) => Promise<SimilarityMatch[]>;
}

const getBridge = (): ResultAsync<ConnectionsBridge, ConnectionError> => {
  const api = (globalThis as unknown as {
    electronAPI?: { connections?: ConnectionsBridge };
  }).electronAPI;
  return api?.connections
    ? okAsync(api.connections)
    : errAsync(
        bridgeUnavailable('Connections bridge not available — is preload.js up to date?')
      );
};

// ---- public API ----

export const getStatus = (): ResultAsync<ConnectionsStatus, ConnectionError> =>
  getBridge().andThen((bridge) =>
    fromPromise(bridge.status(), (c) => statusFailed('connections.status failed', c))
  );

export const indexContribution = (
  id: string,
  text: string
): ResultAsync<{ readonly skipped: boolean; readonly reason?: string }, ConnectionError> =>
  getBridge().andThen((bridge) =>
    fromPromise(
      bridge.indexContribution(id, text),
      (c) => indexingFailed(`Failed to index contribution ${id}`, c)
    )
  );

export const deindexContribution = (
  id: string
): ResultAsync<{ readonly skipped: boolean }, ConnectionError> =>
  getBridge().andThen((bridge) =>
    fromPromise(bridge.deindexContribution(id), (c) =>
      indexingFailed(`Failed to deindex contribution ${id}`, c)
    )
  );

export const findSimilar = (
  text: string,
  opts: { readonly k?: number; readonly excludeId?: string | null } = {}
): ResultAsync<ReadonlyArray<SimilarityMatch>, ConnectionError> =>
  getBridge().andThen((bridge) =>
    fromPromise(
      bridge.findSimilar(text, opts.k ?? 10, opts.excludeId ?? null),
      (c) => searchFailed('findSimilar failed', c)
    ).mapErr((e) =>
      e._tag === 'SearchFailed' ? e : embeddingFailed('Embedding threw during search', e)
    )
  );
