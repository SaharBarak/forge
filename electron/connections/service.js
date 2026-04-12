/**
 * Connections service — the thin layer that wires embeddings + vector index
 * together and exposes the operations called over IPC.
 *
 * Public surface:
 *   startService(dataDir)                 → open index, warm up model
 *   stopService()                         → persist + close
 *   indexContribution(id, text)           → embed + add (idempotent)
 *   findSimilarByText(text, k, excludeId) → top-k similar contributions
 *   status()                              → { modelLoaded, indexSize, ... }
 *
 * Note: the service does NOT subscribe to P2P events itself. The renderer
 * calls indexContribution() on its schedule — keeping the main process
 * simple and avoiding a second source of truth for "what's indexed".
 */

import path from 'path';
import {
  ensureReady as ensureModelReady,
  embed,
  getStatus as getEmbeddingStatus,
  EMBEDDING_DIMENSIONS,
} from './embeddings.js';
import {
  load as loadIndex,
  addVector,
  searchSimilar,
  hasId,
  removeVector,
  save as saveIndex,
  close as closeIndex,
  size as indexSize,
} from './vector-index.js';

let serviceDataDir = null;

export const startService = async ({ dataDir }) => {
  serviceDataDir = path.join(dataDir, 'connections');
  await loadIndex({ dir: serviceDataDir, dims: EMBEDDING_DIMENSIONS });
  // Kick off model warmup without blocking — it downloads ~22 MB on first
  // run, so we don't want to stall the UI. Errors are logged but don't
  // surface until the first actual embed call.
  ensureModelReady().catch((err) =>
    console.error('[connections] model warmup failed:', err)
  );
  console.log('[connections] service started');
};

export const stopService = async () => {
  try {
    await saveIndex();
  } catch (err) {
    console.error('[connections] save error:', err);
  }
  try {
    await closeIndex();
  } catch (err) {
    console.error('[connections] close error:', err);
  }
  serviceDataDir = null;
  console.log('[connections] service stopped');
};

/**
 * Embed a contribution's searchable text and add it to the HNSW index.
 * Idempotent: returns immediately if the ID is already known.
 */
export const indexContribution = async (id, text) => {
  if (hasId(id)) return { skipped: true, reason: 'already indexed' };
  const vector = await embed(text);
  addVector(id, vector);
  // Auto-save every 32 additions so we don't lose too much on crash.
  if (indexSize() % 32 === 0) {
    await saveIndex().catch((err) => console.error('[connections] autosave:', err));
  }
  return { skipped: false };
};

export const deindexContribution = (id) => {
  if (!hasId(id)) return { skipped: true };
  removeVector(id);
  return { skipped: false };
};

/**
 * Find contributions semantically similar to the given text. Optionally
 * exclude a specific ID (e.g. to exclude the source contribution when
 * surfacing "similar to this one").
 */
export const findSimilarByText = async (text, k = 10, excludeId = null) => {
  const vector = await embed(text);
  const raw = searchSimilar(vector, k + (excludeId ? 1 : 0));
  return excludeId ? raw.filter((m) => m.id !== excludeId).slice(0, k) : raw.slice(0, k);
};

export const status = () => ({
  ...getEmbeddingStatus(),
  indexSize: indexSize(),
  dataDir: serviceDataDir,
});
