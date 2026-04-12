/**
 * Forge document store — file-based signed document persistence.
 *
 * MVP storage backend. Each document is a signed envelope stored as a line
 * in a JSONL file (~/.forge/p2p/store.jsonl). Reads are full-scan + filter.
 * Writes append. Deletes write a tombstone.
 *
 * This replaces Helia+OrbitDB (which has a Helia v6 / OrbitDB v3 API
 * mismatch on Node v25). Same signed-envelope architecture — when OrbitDB
 * 4.0 ships, this backend can be swapped without changing the application
 * layer.
 *
 * NO P2P replication in this backend. Documents are local only. The P2P
 * transport layer will be re-added with OrbitDB 4.0 or Automerge+libp2p.
 */

import path from 'path';
import fs from 'fs/promises';

let storePath = null;
let docs = new Map(); // id → doc
let updateListeners = new Set();

export async function startNode({ dataDir }) {
  storePath = path.join(dataDir, 'store.jsonl');
  await fs.mkdir(dataDir, { recursive: true });

  // Load existing docs from JSONL.
  try {
    const content = await fs.readFile(storePath, 'utf-8');
    for (const line of content.split('\n')) {
      if (!line.trim()) continue;
      try {
        const doc = JSON.parse(line);
        if (doc._tombstone) {
          docs.delete(doc._id);
        } else if (doc._id) {
          docs.set(doc._id, doc);
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file doesn't exist yet — fresh start
  }

  console.log(`[p2p] store opened: ${docs.size} docs from ${storePath}`);
  return {
    peerId: `local-${Date.now().toString(36)}`,
    dbAddress: storePath,
  };
}

export async function stopNode() {
  docs.clear();
  updateListeners.clear();
  storePath = null;
}

function requireStarted() {
  if (!storePath) throw new Error('Store not started');
}

export async function putDoc(doc) {
  requireStarted();
  if (!doc || !doc._id) throw new Error('putDoc requires _id');
  docs.set(doc._id, doc);
  await fs.appendFile(storePath, JSON.stringify(doc) + '\n', 'utf-8');

  for (const cb of updateListeners) {
    try { cb({ hash: doc._id, id: doc._id, op: 'PUT' }); } catch {}
  }

  return { hash: doc._id, id: doc._id };
}

export async function getDoc(id) {
  requireStarted();
  return docs.get(id) ?? null;
}

export async function allDocs() {
  requireStarted();
  return Array.from(docs.entries()).map(([id, doc]) => ({
    hash: id,
    doc,
  }));
}

export async function deleteDoc(id) {
  requireStarted();
  docs.delete(id);
  await fs.appendFile(storePath, JSON.stringify({ _id: id, _tombstone: true }) + '\n', 'utf-8');
  return id;
}

export async function getStatus() {
  return {
    running: !!storePath,
    peerId: storePath ? 'local' : undefined,
    dbAddress: storePath ?? undefined,
    peerCount: 0,
    connectionCount: 0,
    docCount: docs.size,
  };
}

export function onUpdate(cb) {
  updateListeners.add(cb);
  return () => updateListeners.delete(cb);
}
