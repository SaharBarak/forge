/**
 * Auth session — repository pattern over the Electron storage bridge.
 *
 * The `SessionRepository` encapsulates the in-memory keypair cache and all
 * persistence operations. The module-level singleton `sessionRepo` is the
 * default binding used by hooks and other consumers, but tests and alternate
 * entry points can instantiate their own repository with a mock bridge.
 *
 * Every public method returns `ResultAsync<T, AuthError>`. Throwing is
 * reserved for programmer errors (e.g. passing an invalid type); runtime
 * and user-correctable failures travel through Result.
 */

import { ResultAsync, okAsync, errAsync, fromPromise } from '../core';
import type { AuthError } from './errors';
import {
  bridgeUnavailable,
  sessionNotAvailable,
  sessionStorageFailed,
} from './errors';
import {
  generateDid,
  deserializeKeypair,
  serializeKeypair,
  type DIDKeypair,
  type SerializedKeypair,
} from './did';
import { fetchAttestation, type Platform, type PublicAttestation } from './attestations';
import { issueIdentityCredential, verifyCredential, type SignedCredential } from './vc';

// ---- domain types ----

export interface AuthState {
  readonly did: string;
  readonly credential: SignedCredential;
  readonly attestations: readonly PublicAttestation[];
}

export interface StoredAuth {
  readonly keypair: SerializedKeypair;
  readonly credential: SignedCredential;
}

// ---- storage bridge abstraction ----

export interface AuthStorageBridge {
  readonly save: (payload: StoredAuth) => Promise<boolean>;
  readonly load: () => Promise<StoredAuth | null>;
  readonly clear: () => Promise<boolean>;
}

const getElectronBridge = (): ResultAsync<AuthStorageBridge, AuthError> => {
  const api = (globalThis as unknown as { electronAPI?: { auth?: AuthStorageBridge } }).electronAPI;
  return api?.auth
    ? okAsync(api.auth)
    : errAsync(bridgeUnavailable('Auth bridge not available — is preload.js up to date?'));
};

// ---- repository ----

export interface SessionRepository {
  readonly createIdentity: () => ResultAsync<AuthState, AuthError>;
  readonly addAttestation: (platform: Platform, handle: string) => ResultAsync<AuthState, AuthError>;
  readonly removeAttestation: (platform: Platform, handleHash: string) => ResultAsync<AuthState, AuthError>;
  readonly restoreSession: () => ResultAsync<AuthState | null, AuthError>;
  readonly logout: () => ResultAsync<void, AuthError>;
  readonly getCurrentKeypair: () => DIDKeypair | null;
}

export const createSessionRepository = (
  bridgeResolver: () => ResultAsync<AuthStorageBridge, AuthError> = getElectronBridge
): SessionRepository => {
  let cached: DIDKeypair | null = null;

  const saveThrough = (bridge: AuthStorageBridge, stored: StoredAuth): ResultAsync<StoredAuth, AuthError> =>
    fromPromise(bridge.save(stored), (c) => sessionStorageFailed('Failed to persist session', c))
      .andThen((ok) => (ok ? okAsync(stored) : errAsync(sessionStorageFailed('save returned false'))));

  const loadRaw = (): ResultAsync<StoredAuth | null, AuthError> =>
    bridgeResolver().andThen((bridge) =>
      fromPromise(bridge.load(), (c) => sessionStorageFailed('Failed to load session', c))
    );

  const clearRaw = (): ResultAsync<boolean, AuthError> =>
    bridgeResolver().andThen((bridge) =>
      fromPromise(bridge.clear(), (c) => sessionStorageFailed('Failed to clear session', c))
    );

  const getOrCreateKeypair = (): ResultAsync<DIDKeypair, AuthError> => {
    if (cached) return okAsync(cached);
    return loadRaw().andThen((stored) => {
      if (stored) {
        cached = deserializeKeypair(stored.keypair);
        return okAsync(cached);
      }
      return generateDid().map((kp) => {
        cached = kp;
        return kp;
      });
    });
  };

  const persistAndBuildState = (
    keypair: DIDKeypair,
    attestations: readonly PublicAttestation[]
  ): ResultAsync<AuthState, AuthError> =>
    issueIdentityCredential({
      did: keypair.did,
      privateKey: keypair.privateKey,
      attestations,
    }).andThen((credential) =>
      bridgeResolver().andThen((bridge) =>
        saveThrough(bridge, {
          keypair: serializeKeypair(keypair),
          credential,
        }).map(() => ({ did: keypair.did, credential, attestations }))
      )
    );

  // ---- public API ----

  const createIdentity: SessionRepository['createIdentity'] = () =>
    generateDid().andThen((keypair) => {
      cached = keypair;
      return persistAndBuildState(keypair, []);
    });

  const addAttestation: SessionRepository['addAttestation'] = (platform, handle) =>
    getOrCreateKeypair().andThen((keypair) =>
      fetchAttestation(platform, handle).andThen((attestation) =>
        loadRaw().andThen((stored) => {
          const existing = stored?.credential.credential.credentialSubject.attestations ?? [];
          const deduped = [
            ...existing.filter(
              (a) => !(a.platform === platform && a.handleHash === attestation.handleHash)
            ),
            attestation,
          ];
          return persistAndBuildState(keypair, deduped);
        })
      )
    );

  const removeAttestation: SessionRepository['removeAttestation'] = (platform, handleHash) =>
    getOrCreateKeypair().andThen((keypair) =>
      loadRaw().andThen((stored) => {
        const existing = stored?.credential.credential.credentialSubject.attestations ?? [];
        const filtered = existing.filter(
          (a) => !(a.platform === platform && a.handleHash === handleHash)
        );
        return persistAndBuildState(keypair, filtered);
      })
    );

  const restoreSession: SessionRepository['restoreSession'] = () =>
    loadRaw().andThen((stored): ResultAsync<AuthState | null, AuthError> => {
      if (!stored) return okAsync(null);
      return verifyCredential(stored.credential)
        .map((): AuthState | null => {
          cached = deserializeKeypair(stored.keypair);
          return {
            did: stored.credential.credential.issuer,
            credential: stored.credential,
            attestations: stored.credential.credential.credentialSubject.attestations,
          };
        })
        .orElse((verifyError): ResultAsync<AuthState | null, AuthError> => {
          console.warn('[auth] stored credential invalid, clearing:', verifyError.message);
          cached = null;
          return clearRaw().map((): AuthState | null => null);
        });
    });

  const logout: SessionRepository['logout'] = () =>
    clearRaw().map(() => {
      cached = null;
      return undefined;
    });

  const getCurrentKeypair: SessionRepository['getCurrentKeypair'] = () => cached;

  return {
    createIdentity,
    addAttestation,
    removeAttestation,
    restoreSession,
    logout,
    getCurrentKeypair,
  };
};

// ---- default singleton ----

/**
 * Default session repository backed by the Electron auth bridge. Used by
 * hooks and other consumers that don't need a custom storage backend.
 */
export const sessionRepo: SessionRepository = createSessionRepository();

// ---- convenience re-exports (back-compat thin wrappers) ----
//
// These kept the renderer call-sites simple during the refactor. They all
// delegate to the default singleton.

export const createIdentity = (): ResultAsync<AuthState, AuthError> => sessionRepo.createIdentity();
export const addAttestation = (p: Platform, h: string) => sessionRepo.addAttestation(p, h);
export const removeAttestation = (p: Platform, h: string) => sessionRepo.removeAttestation(p, h);
export const restoreSession = () => sessionRepo.restoreSession();
export const logout = () => sessionRepo.logout();
export const getCurrentKeypair = (): DIDKeypair | null => sessionRepo.getCurrentKeypair();

/** Require a current keypair — returns Err if none is loaded. */
export const requireKeypair = (): ResultAsync<DIDKeypair, AuthError> => {
  const kp = sessionRepo.getCurrentKeypair();
  return kp ? okAsync(kp) : errAsync(sessionNotAvailable('No active session'));
};
