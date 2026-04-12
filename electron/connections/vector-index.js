/**
 * Persistent vector index backed by USearch (HNSW).
 *
 * USearch keys are BigUint64 — to index string contribution IDs we maintain
 * a bidirectional map between string IDs and numeric keys, persisted as a
 * companion JSON file next to the index.
 *
 * Files on disk (all under userData/connections/):
 *   - index.usearch     (binary HNSW index)
 *   - id-map.json       ({ nextKey: number, strToNum: {}, numToStr: {} })
 *
 * Public surface:
 *   load(dataDir, dimensions)                       → idempotent open
 *   addVector(id: string, vector: Float32Array)     → index one item
 *   searchSimilar(vector, k)                        → [{id, score}]
 *   hasId(id: string) → boolean
 *   size() → number
 *   save() → Promise<void>
 *   close() → Promise<void>
 */

import path from 'path';
import fs from 'fs/promises';

let Index = null; // lazy-loaded usearch class
let MetricKind = null;
let index = null;
let idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
let dataDir = null;
let indexPath = null;
let mapPath = null;
let dimensions = 384;
let dirty = false;

const loadUsearch = async () => {
  if (!Index) {
    const mod = await import('usearch');
    Index = mod.Index;
    MetricKind = mod.MetricKind;
  }
};

const loadIdMap = async () => {
  try {
    const raw = await fs.readFile(mapPath, 'utf-8');
    idMap = JSON.parse(raw);
  } catch {
    idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
  }
};

const saveIdMap = async () => {
  await fs.writeFile(mapPath, JSON.stringify(idMap), 'utf-8');
};

/**
 * Idempotent open. Creates directories, loads any existing index + map, or
 * starts a fresh empty index.
 */
export const load = async ({ dir, dims = 384 }) => {
  if (index) return; // already open
  await loadUsearch();

  dataDir = dir;
  dimensions = dims;
  indexPath = path.join(dir, 'index.usearch');
  mapPath = path.join(dir, 'id-map.json');

  await fs.mkdir(dir, { recursive: true });
  await loadIdMap();

  index = new Index(dimensions, MetricKind.Cos);

  // Try to load an existing index from disk. usearch throws if the file
  // doesn't exist — we treat that as "first run, start empty".
  try {
    await fs.access(indexPath);
    index.load(indexPath);
    console.log(`[vector-index] loaded ${index.size()} vectors from ${indexPath}`);
  } catch {
    console.log('[vector-index] starting fresh index');
  }
};

const requireOpen = () => {
  if (!index) throw new Error('Vector index not open — call load() first');
};

/**
 * Add a single vector keyed by a string contribution ID. Idempotent — if the
 * ID is already indexed, this is a no-op.
 */
export const addVector = (id, vector) => {
  requireOpen();
  if (idMap.strToNum[id] !== undefined) return; // already indexed

  const numericKey = idMap.nextKey++;
  idMap.strToNum[id] = numericKey;
  idMap.numToStr[numericKey] = id;

  index.add(BigInt(numericKey), vector);
  dirty = true;
};

export const hasId = (id) => {
  requireOpen();
  return idMap.strToNum[id] !== undefined;
};

export const removeVector = (id) => {
  requireOpen();
  const numericKey = idMap.strToNum[id];
  if (numericKey === undefined) return;
  try {
    index.remove(BigInt(numericKey));
  } catch (err) {
    console.warn('[vector-index] remove failed:', err.message);
  }
  delete idMap.strToNum[id];
  delete idMap.numToStr[numericKey];
  dirty = true;
};

/**
 * k-NN search. Returns up to `k` matches sorted by ascending distance
 * (closest first). Cosine metric => distance in [0, 2], similarity = 1 - dist/2.
 */
export const searchSimilar = (vector, k = 10) => {
  requireOpen();
  if (index.size() === 0) return [];

  const limit = Math.min(k, index.size());
  const matches = index.search(vector, limit, 1);
  const results = [];
  for (let i = 0; i < matches.keys.length; i++) {
    const numericKey = Number(matches.keys[i]);
    const id = idMap.numToStr[numericKey];
    if (!id) continue; // stale entry — shouldn't happen but guard anyway
    const distance = matches.distances[i];
    // Cosine distance is in [0, 2]; convert to similarity score in [0, 1].
    const similarity = Math.max(0, 1 - distance / 2);
    results.push({ id, similarity, distance });
  }
  return results;
};

export const size = () => {
  if (!index) return 0;
  return index.size();
};

/**
 * Flush both the index and id-map to disk. Only writes if dirty.
 */
export const save = async () => {
  requireOpen();
  if (!dirty) return;
  index.save(indexPath);
  await saveIdMap();
  dirty = false;
  console.log(`[vector-index] saved ${index.size()} vectors`);
};

export const close = async () => {
  if (!index) return;
  if (dirty) await save();
  index = null;
  idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
  dataDir = null;
};
