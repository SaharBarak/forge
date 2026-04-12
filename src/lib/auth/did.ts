/**
 * did:key Ed25519 implementation — functional, Result-returning.
 *
 * Follows the W3C did:key spec: an Ed25519 public key is encoded with the
 * 0xed01 multicodec prefix, wrapped in multibase base58btc ('z' prefix),
 * then rendered as "did:key:z<encoded>". The public key is recoverable
 * directly from the DID string — no resolver, no registry, no network.
 *
 * This module is pure: every function is side-effect-free except for key
 * generation (which needs entropy) and the `*Async` crypto calls. Errors
 * never throw — callers get a typed Result.
 *
 * Reference: https://w3c-ccg.github.io/did-method-key/
 */

import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { Result, ResultAsync, ok, err, okAsync, errAsync } from '../core';
import type { AuthError } from './errors';
import {
  invalidPublicKey,
  invalidDidFormat,
  keyGenerationFailed,
  signingFailed,
  signatureVerificationFailed,
} from './errors';

// @noble/ed25519 v3 requires sha512 for sync operations.
ed.hashes.sha512 = (message) => sha512(message);

// Multicodec varint prefix for ed25519-pub: 0xed 0x01.
const ED25519_MULTICODEC_PREFIX = Uint8Array.from([0xed, 0x01]);
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DID_KEY_PREFIX = 'did:key:z';

// ---- domain types ----

export interface DIDKeypair {
  readonly did: string;
  readonly publicKey: Uint8Array;
  readonly privateKey: Uint8Array;
}

export interface SerializedKeypair {
  readonly did: string;
  readonly publicKeyHex: string;
  readonly privateKeyHex: string;
  readonly createdAt: string;
}

// ---- encoding primitives (pure, total) ----

const base58btcEncode = (bytes: Uint8Array): string => {
  if (bytes.length === 0) return '';
  const zeros = countLeading(bytes, 0);
  const digits: number[] = [0];
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  return '1'.repeat(zeros) + digits.reverse().map((d) => BASE58_ALPHABET[d]).join('');
};

const base58btcDecode = (str: string): Result<Uint8Array, AuthError> => {
  if (str.length === 0) return ok(new Uint8Array());
  const zeros = countLeadingChar(str, '1');
  const bytes: number[] = [0];
  for (let i = zeros; i < str.length; i++) {
    const value = BASE58_ALPHABET.indexOf(str[i]);
    if (value < 0) return err(invalidDidFormat(`Invalid base58 character: ${str[i]}`));
    let carry = value;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) out[zeros + i] = bytes[bytes.length - 1 - i];
  return ok(out);
};

const countLeading = (arr: Uint8Array, value: number): number => {
  let i = 0;
  while (i < arr.length && arr[i] === value) i++;
  return i;
};

const countLeadingChar = (s: string, ch: string): number => {
  let i = 0;
  while (i < s.length && s[i] === ch) i++;
  return i;
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string): Uint8Array => {
  const clean = hex.replace(/^0x/, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
};

// ---- DID core operations ----

/**
 * Encode an Ed25519 public key as a did:key identifier.
 * Returns Err if the key is not exactly 32 bytes.
 */
export const publicKeyToDid = (publicKey: Uint8Array): Result<string, AuthError> => {
  if (publicKey.length !== 32) {
    return err(invalidPublicKey(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`));
  }
  const prefixed = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
  prefixed.set(ED25519_MULTICODEC_PREFIX, 0);
  prefixed.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
  return ok(`${DID_KEY_PREFIX}${base58btcEncode(prefixed)}`);
};

/**
 * Decode a did:key back to its Ed25519 public key.
 */
export const didToPublicKey = (did: string): Result<Uint8Array, AuthError> => {
  if (!did.startsWith(DID_KEY_PREFIX)) {
    return err(invalidDidFormat(`Expected "${DID_KEY_PREFIX}..." prefix: ${did}`));
  }
  return base58btcDecode(did.slice(DID_KEY_PREFIX.length)).andThen((decoded) => {
    if (
      decoded.length !== 34 ||
      decoded[0] !== ED25519_MULTICODEC_PREFIX[0] ||
      decoded[1] !== ED25519_MULTICODEC_PREFIX[1]
    ) {
      return err(invalidDidFormat('DID does not encode an Ed25519 public key'));
    }
    return ok(decoded.slice(2));
  });
};

/**
 * Generate a fresh Ed25519 keypair and its matching did:key identifier.
 */
export const generateDid = (): ResultAsync<DIDKeypair, AuthError> =>
  ResultAsync.fromPromise(
    (async (): Promise<DIDKeypair> => {
      const privateKey = ed.utils.randomSecretKey();
      const publicKey = await ed.getPublicKeyAsync(privateKey);
      const didResult = publicKeyToDid(publicKey);
      if (didResult.isErr()) throw new Error(didResult.error.message);
      return { did: didResult.value, publicKey, privateKey };
    })(),
    (cause) => keyGenerationFailed('Failed to generate Ed25519 keypair', cause)
  );

/**
 * Sign a message with a private key. Returns the signature base58btc-encoded.
 */
export const signMessage = (
  privateKey: Uint8Array,
  message: Uint8Array | string
): ResultAsync<string, AuthError> => {
  const bytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
  return ResultAsync.fromPromise(
    ed.signAsync(bytes, privateKey).then(base58btcEncode),
    (cause) => signingFailed('Failed to sign message', cause)
  );
};

/**
 * Verify a signature against a DID. Returns ok(true) if valid, Err with a
 * specific tag otherwise. Crypto/runtime failures are distinguished from
 * simple "not valid" — a successful verify that returns false yields Err
 * with tag `SignatureVerificationFailed`.
 */
export const verifySignature = (
  did: string,
  message: Uint8Array | string,
  signatureB58: string
): ResultAsync<true, AuthError> => {
  const pubKeyResult = didToPublicKey(did);
  if (pubKeyResult.isErr()) return errAsync(pubKeyResult.error);

  const decodedSigResult = base58btcDecode(signatureB58);
  if (decodedSigResult.isErr()) return errAsync(decodedSigResult.error);

  const publicKey = pubKeyResult.value;
  const signature = decodedSigResult.value;
  const bytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;

  return ResultAsync.fromPromise(
    ed.verifyAsync(signature, bytes, publicKey),
    (cause) => signatureVerificationFailed('Signature verification threw', cause)
  ).andThen((valid) =>
    valid
      ? okAsync<true, AuthError>(true as const)
      : errAsync<true, AuthError>(signatureVerificationFailed('Signature does not verify'))
  );
};

// ---- hashing helpers ----

export const hashContent = (content: string | Uint8Array): string => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  return toHex(sha256(bytes));
};

// ---- serialization ----

export const serializeKeypair = (kp: DIDKeypair): SerializedKeypair => ({
  did: kp.did,
  publicKeyHex: toHex(kp.publicKey),
  privateKeyHex: toHex(kp.privateKey),
  createdAt: new Date().toISOString(),
});

export const deserializeKeypair = (s: SerializedKeypair): DIDKeypair => ({
  did: s.did,
  publicKey: fromHex(s.publicKeyHex),
  privateKey: fromHex(s.privateKeyHex),
});
