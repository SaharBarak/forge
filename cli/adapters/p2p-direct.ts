/**
 * Direct P2P adapter for the CLI.
 *
 * Imports the Helia/OrbitDB node module directly (in-process, no IPC).
 * Provides the same surface as src/lib/p2p/client.ts but without going
 * through Electron's preload bridge.
 *
 * The signing/verification is handled at the application layer (same as
 * the Electron path) — this adapter is just a passthrough to OrbitDB.
 */

import { ResultAsync, okAsync, errAsync, fromPromise } from '../../src/lib/core';
import { canonicalize } from '../../src/lib/core';
import { signMessage, verifySignature, type DIDKeypair } from '../../src/lib/auth/did';
import type { SignedEnvelope, VerifiedDoc, P2PStatus } from '../../src/lib/p2p/client';
import type { P2PError } from '../../src/lib/p2p/errors';
import {
  noActiveKeypair,
  publishFailed,
  fetchFailed,
  deleteFailed,
  statusFailed,
  verificationFailed,
} from '../../src/lib/p2p/errors';

// Dynamic import — the p2p node module is ESM JS.
let nodeModule: typeof import('../../electron/p2p/node.js') | null = null;

const getNode = async () => {
  if (!nodeModule) {
    nodeModule = await import('../../electron/p2p/node.js');
  }
  return nodeModule;
};

// ---- envelope helpers (same as client.ts) ----

type EnvelopeWithoutSig = Omit<SignedEnvelope, '_sig'>;

const buildSigningMessage = (env: EnvelopeWithoutSig): string =>
  canonicalize({
    _id: env._id,
    _did: env._did,
    _ts: env._ts,
    payload: env.payload,
  });

const isEnvelope = (v: unknown): v is SignedEnvelope => {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<SignedEnvelope>;
  return (
    typeof e._id === 'string' &&
    typeof e._did === 'string' &&
    typeof e._ts === 'string' &&
    typeof e._sig === 'string'
  );
};

// ---- lifecycle ----

export const startP2P = async (dataDir: string): Promise<{ peerId: string; dbAddress: string }> => {
  const node = await getNode();
  return node.startNode({ dataDir });
};

export const stopP2P = async (): Promise<void> => {
  if (!nodeModule) return;
  await nodeModule.stopNode();
};

// ---- public API (same shape as src/lib/p2p/client.ts) ----

export const getStatus = (): ResultAsync<P2PStatus, P2PError> =>
  ResultAsync.fromPromise(
    getNode().then((n) => n.getStatus()),
    (c) => statusFailed('p2p status failed', c)
  );

export const publish = <T>(
  keypair: DIDKeypair,
  opts: { readonly payload: T; readonly id?: string }
): ResultAsync<{ readonly hash: string; readonly id: string }, P2PError> => {
  if (!keypair) return errAsync(noActiveKeypair('No keypair'));

  const envelope: EnvelopeWithoutSig = {
    _id: opts.id ?? crypto.randomUUID(),
    _did: keypair.did,
    _ts: new Date().toISOString(),
    payload: opts.payload,
  };

  const message = buildSigningMessage(envelope);

  return signMessage(keypair.privateKey, message)
    .mapErr((e) => publishFailed(`Signing failed: ${e.message}`, e))
    .andThen((sig) =>
      ResultAsync.fromPromise(
        getNode().then((n) => n.putDoc({ ...envelope, _sig: sig })),
        (c) => publishFailed('putDoc failed', c)
      )
    );
};

const verifyEnvelope = <T>(
  raw: unknown,
  hash?: string
): ResultAsync<VerifiedDoc<T>, P2PError> => {
  if (!isEnvelope(raw)) {
    return errAsync(verificationFailed('Not a valid envelope shape'));
  }
  const message = buildSigningMessage(raw);
  return verifySignature(raw._did, message, raw._sig)
    .mapErr((e) => verificationFailed(e.message, e))
    .map((): VerifiedDoc<T> => ({
      id: raw._id,
      did: raw._did,
      timestamp: raw._ts,
      payload: raw.payload as T,
      hash,
    }));
};

export const fetchAll = <T>(): ResultAsync<ReadonlyArray<VerifiedDoc<T>>, P2PError> =>
  ResultAsync.fromPromise(
    getNode().then((n) => n.allDocs()),
    (c) => fetchFailed('allDocs failed', c)
  ).andThen((entries: Array<{ hash: string; doc: unknown }>) => {
    const tasks = entries.map(({ hash, doc }) => verifyEnvelope<T>(doc, hash));
    return ResultAsync.fromSafePromise(
      Promise.all(tasks.map((r) => r.match(
        (v) => ({ ok: true as const, value: v }),
        () => ({ ok: false as const })
      )))
    ).map((results) =>
      results
        .filter((r): r is { ok: true; value: VerifiedDoc<T> } => r.ok)
        .map((r) => r.value)
    );
  });

export const remove = (id: string): ResultAsync<string, P2PError> =>
  ResultAsync.fromPromise(
    getNode().then((n) => n.deleteDoc(id)),
    (c) => deleteFailed('deleteDoc failed', c)
  );

export const subscribe = (
  cb: (evt: { hash: string; id: string | null }) => void
): (() => void) => {
  if (!nodeModule) return () => {};
  return nodeModule.onUpdate((evt: { hash: string; id: string | null }) => cb(evt));
};
