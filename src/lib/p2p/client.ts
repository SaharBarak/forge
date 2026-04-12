/**
 * Forge P2P client — renderer-side, Result-returning, functional.
 *
 * Layers cryptographic integrity on top of OrbitDB:
 *   - `publish()` signs the payload with the cached DID keypair and pushes
 *     a SignedEnvelope into the shared store
 *   - `fetch()` / `fetchAll()` verify every envelope's signature against its
 *     embedded DID and drop invalid entries
 *
 * The underlying store is open-write; integrity comes from envelopes, not
 * from access control. This mirrors a PGP-signed public mailing list: the
 * transport is untrusted, the envelopes are not.
 *
 * All public functions return `ResultAsync<T, P2PError>`. Throwing is
 * reserved for programmer errors.
 */

import { ResultAsync, okAsync, errAsync, fromPromise } from '../core';
import { canonicalize } from '../core';
import { signMessage, verifySignature } from '../auth/did';
import { getCurrentKeypair } from '../auth/session';
import type { P2PError } from './errors';
import {
  bridgeUnavailable,
  fetchFailed,
  noActiveKeypair,
  publishFailed,
  deleteFailed,
  statusFailed,
  verificationFailed,
} from './errors';

// ---- domain types ----

export interface SignedEnvelope {
  readonly _id: string;
  readonly _did: string;
  readonly _ts: string;
  readonly _sig: string;
  readonly payload: unknown;
}

export interface VerifiedDoc<T = unknown> {
  readonly id: string;
  readonly did: string;
  readonly timestamp: string;
  readonly payload: T;
  readonly hash?: string;
}

export interface P2PStatus {
  readonly running: boolean;
  readonly peerId?: string;
  readonly dbAddress?: string;
  readonly peerCount?: number;
  readonly connectionCount?: number;
}

// ---- Electron bridge contract ----

interface P2PBridge {
  readonly status: () => Promise<P2PStatus>;
  readonly put: (doc: SignedEnvelope) => Promise<{ hash: string; id: string }>;
  readonly get: (id: string) => Promise<SignedEnvelope | null>;
  readonly all: () => Promise<Array<{ hash: string; doc: SignedEnvelope }>>;
  readonly delete: (id: string) => Promise<string>;
  readonly onUpdate: (cb: (evt: { hash: string; id: string | null; op: string | null }) => void) => () => void;
}

const getBridge = (): ResultAsync<P2PBridge, P2PError> => {
  const api = (globalThis as unknown as { electronAPI?: { p2p?: P2PBridge } }).electronAPI;
  return api?.p2p
    ? okAsync(api.p2p)
    : errAsync(bridgeUnavailable('P2P bridge not available — is preload.js up to date?'));
};

// ---- envelope helpers ----

type EnvelopeWithoutSig = Omit<SignedEnvelope, '_sig'>;

/**
 * Build the exact byte sequence that gets signed/verified. Covers every
 * field except `_sig` itself.
 */
const buildSigningMessage = (env: EnvelopeWithoutSig): string =>
  canonicalize({
    _id: env._id,
    _did: env._did,
    _ts: env._ts,
    payload: env.payload,
  });

/**
 * Shape-check an unknown value to see if it's a well-formed envelope.
 * Used as a cheap gate before running the actual signature check.
 */
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

// ---- public API ----

export const getStatus = (): ResultAsync<P2PStatus, P2PError> =>
  getBridge().andThen((bridge) =>
    fromPromise(bridge.status(), (c) => statusFailed('p2p.status failed', c))
  );

/**
 * Publish a signed document. Returns the OrbitDB hash + canonical ID on
 * success. Requires an active keypair.
 */
export const publish = <T>(opts: {
  readonly payload: T;
  readonly id?: string;
}): ResultAsync<{ readonly hash: string; readonly id: string }, P2PError> => {
  const keypair = getCurrentKeypair();
  if (!keypair) {
    return errAsync(noActiveKeypair('No active keypair — log in before publishing'));
  }

  const envelope: EnvelopeWithoutSig = {
    _id: opts.id ?? crypto.randomUUID(),
    _did: keypair.did,
    _ts: new Date().toISOString(),
    payload: opts.payload,
  };

  const message = buildSigningMessage(envelope);

  return signMessage(keypair.privateKey, message)
    .mapErr((e) => publishFailed(`Signature failed: ${e.message}`, e))
    .andThen((sig) =>
      getBridge().andThen((bridge) =>
        fromPromise(bridge.put({ ...envelope, _sig: sig }), (c) =>
          publishFailed('bridge.put failed', c)
        )
      )
    );
};

/**
 * Verify a single envelope. Returns the decoded doc or Err — shape errors,
 * missing fields, and failed signature checks all become
 * `VerificationFailed`.
 */
const verifyEnvelope = <T>(
  raw: unknown,
  hash?: string
): ResultAsync<VerifiedDoc<T>, P2PError> => {
  if (!isEnvelope(raw)) {
    return errAsync(verificationFailed('Not a valid envelope shape'));
  }
  const envelope = raw;
  const message = buildSigningMessage(envelope);
  return verifySignature(envelope._did, message, envelope._sig)
    .mapErr((e) => verificationFailed(e.message, e))
    .map(
      (): VerifiedDoc<T> => ({
        id: envelope._id,
        did: envelope._did,
        timestamp: envelope._ts,
        payload: envelope.payload as T,
        hash,
      })
    );
};

/**
 * Fetch a single document by ID. Returns Ok(null) if the ID doesn't exist,
 * Err if the envelope exists but fails verification.
 */
export const fetch = <T>(id: string): ResultAsync<VerifiedDoc<T> | null, P2PError> =>
  getBridge()
    .andThen((bridge) => fromPromise(bridge.get(id), (c) => fetchFailed('bridge.get failed', c)))
    .andThen((raw): ResultAsync<VerifiedDoc<T> | null, P2PError> => {
      if (raw === null) return okAsync(null);
      return verifyEnvelope<T>(raw);
    });

/**
 * Fetch every document in the store. Silently drops unsigned or tampered
 * entries — the returned array contains only cryptographically valid docs.
 */
export const fetchAll = <T>(): ResultAsync<ReadonlyArray<VerifiedDoc<T>>, P2PError> =>
  getBridge()
    .andThen((bridge) => fromPromise(bridge.all(), (c) => fetchFailed('bridge.all failed', c)))
    .andThen((entries) => {
      const verificationTasks = entries.map(({ hash, doc }) => verifyEnvelope<T>(doc, hash));
      return ResultAsync.fromSafePromise(Promise.all(verificationTasks.map((r) => r.match(
        (v) => ({ ok: true as const, value: v }),
        () => ({ ok: false as const })
      )))).map((results) => results.filter((r) => r.ok).map((r) => (r as { ok: true; value: VerifiedDoc<T> }).value));
    });

/**
 * Remove a document you authored. OrbitDB deletions are tombstones —
 * other peers may still hold replicas. Verification at read time ensures
 * tombstoned documents are no longer surfaced once your peer has the delete.
 */
export const remove = (id: string): ResultAsync<string, P2PError> =>
  getBridge().andThen((bridge) =>
    fromPromise(bridge.delete(id), (c) => deleteFailed('bridge.delete failed', c))
  );

/**
 * Subscribe to replication events. Fires whenever any peer pushes a change.
 * Returns an unsubscribe function.
 */
export const subscribe = (
  cb: (evt: { hash: string; id: string | null }) => void
): (() => void) => {
  const api = (globalThis as unknown as { electronAPI?: { p2p?: P2PBridge } }).electronAPI;
  if (!api?.p2p) {
    // Subscription requested before bridge is ready — return a no-op
    // unsubscriber. Caller will typically resubscribe on next render.
    return () => {};
  }
  return api.p2p.onUpdate((evt) => cb({ hash: evt.hash, id: evt.id }));
};
