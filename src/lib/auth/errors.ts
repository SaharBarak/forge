/**
 * AuthError — tagged union of every failure mode in the auth domain.
 *
 * Each surface function returns Result<T, AuthError> rather than throwing.
 * Callers exhaustively switch on `_tag` to handle recovery or fall through
 * to a generic display path.
 */

import type { TaggedError } from '../core';
import { makeError } from '../core';

export type AuthError =
  | TaggedError<'InvalidPublicKey'>
  | TaggedError<'InvalidDidFormat'>
  | TaggedError<'SignatureVerificationFailed'>
  | TaggedError<'SigningFailed'>
  | TaggedError<'KeyGenerationFailed'>
  | TaggedError<'CredentialTampered'>
  | TaggedError<'IssuerSubjectMismatch'>
  | TaggedError<'CredentialSigningFailed'>
  | TaggedError<'AttestationLookupFailed'>
  | TaggedError<'AttestationRateLimited'>
  | TaggedError<'UnsupportedPlatform'>
  | TaggedError<'InvalidHandle'>
  | TaggedError<'SessionStorageFailed'>
  | TaggedError<'SessionNotAvailable'>
  | TaggedError<'BridgeUnavailable'>;

// Per-tag factories for ergonomic call-sites.
export const invalidPublicKey = makeError('InvalidPublicKey');
export const invalidDidFormat = makeError('InvalidDidFormat');
export const signatureVerificationFailed = makeError('SignatureVerificationFailed');
export const signingFailed = makeError('SigningFailed');
export const keyGenerationFailed = makeError('KeyGenerationFailed');
export const credentialTampered = makeError('CredentialTampered');
export const issuerSubjectMismatch = makeError('IssuerSubjectMismatch');
export const credentialSigningFailed = makeError('CredentialSigningFailed');
export const attestationLookupFailed = makeError('AttestationLookupFailed');
export const attestationRateLimited = makeError('AttestationRateLimited');
export const unsupportedPlatform = makeError('UnsupportedPlatform');
export const invalidHandle = makeError('InvalidHandle');
export const sessionStorageFailed = makeError('SessionStorageFailed');
export const sessionNotAvailable = makeError('SessionNotAvailable');
export const bridgeUnavailable = makeError('BridgeUnavailable');
