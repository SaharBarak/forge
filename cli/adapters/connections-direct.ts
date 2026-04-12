/**
 * Direct connections adapter for the CLI.
 *
 * Imports the embeddings + HNSW service directly (in-process). Same surface
 * as src/lib/connections/client.ts but without IPC.
 */

import { ResultAsync, fromPromise } from '../../src/lib/core';
import type { ConnectionError } from '../../src/lib/connections/errors';
import {
  indexingFailed,
  searchFailed,
  statusFailed,
} from '../../src/lib/connections/errors';
import type { ConnectionsStatus, SimilarityMatch } from '../../src/lib/connections/types';

let serviceModule: typeof import('../../electron/connections/service.js') | null = null;

const getService = async () => {
  if (!serviceModule) {
    serviceModule = await import('../../electron/connections/service.js');
  }
  return serviceModule;
};

export const startConnections = async (dataDir: string): Promise<void> => {
  const svc = await getService();
  await svc.startService({ dataDir });
};

export const stopConnections = async (): Promise<void> => {
  if (!serviceModule) return;
  await serviceModule.stopService();
};

export const getStatus = (): ResultAsync<ConnectionsStatus, ConnectionError> =>
  ResultAsync.fromPromise(
    getService().then((s) => s.status()),
    (c) => statusFailed('connections status failed', c)
  );

export const indexContribution = (
  id: string,
  text: string
): ResultAsync<{ readonly skipped: boolean; readonly reason?: string }, ConnectionError> =>
  ResultAsync.fromPromise(
    getService().then((s) => s.indexContribution(id, text)),
    (c) => indexingFailed(`Failed to index ${id}`, c)
  );

export const findSimilar = (
  text: string,
  k = 10,
  excludeId: string | null = null
): ResultAsync<ReadonlyArray<SimilarityMatch>, ConnectionError> =>
  fromPromise(
    getService().then((s) => s.findSimilarByText(text, k, excludeId)),
    (c) => searchFailed('findSimilar failed', c)
  );
