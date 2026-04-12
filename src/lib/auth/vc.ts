/**
 * Verifiable Credential issuance and verification.
 *
 * Implements the subset of the W3C Verifiable Credentials Data Model v2
 * we actually need: a self-issued credential binding a did:key to zero or
 * more public attestations, signed by the DID's own private key.
 *
 * This is intentionally not a full JSON-LD proof suite. The signature is a
 * detached Ed25519 over the canonical JSON of the credential body. Any
 * verifier that can resolve did:key and canonicalize JSON can check it.
 *
 * A bare credential (zero attestations) is valid — the DID itself is the
 * cryptographic root. Attestations only add evidence for Sybil resistance.
 */

import { Result, ResultAsync, ok, err, errAsync } from '../core';
import { canonicalize } from '../core';
import type { AuthError } from './errors';
import {
  credentialSigningFailed,
  credentialTampered,
  issuerSubjectMismatch,
} from './errors';
import { hashContent, signMessage, verifySignature } from './did';
import { hashAttestations, type PublicAttestation } from './attestations';

// ---- domain types ----

export interface IdentityCredential {
  readonly '@context': readonly string[];
  readonly type: readonly string[];
  readonly id: string;
  readonly issuer: string;
  readonly issuanceDate: string;
  readonly credentialSubject: {
    readonly id: string;
    readonly attestations: readonly PublicAttestation[];
    readonly attestationsHash: string;
  };
}

export interface CredentialProof {
  readonly type: 'Ed25519Signature2020';
  readonly created: string;
  readonly verificationMethod: string;
  readonly proofPurpose: 'assertionMethod';
  readonly proofValue: string;
}

export interface SignedCredential {
  readonly credential: IdentityCredential;
  readonly proof: CredentialProof;
}

// ---- pure builders ----

const buildCredential = (did: string, attestations: readonly PublicAttestation[]): IdentityCredential => ({
  '@context': [
    'https://www.w3.org/ns/credentials/v2',
    'https://w3id.org/security/suites/ed25519-2020/v1',
  ],
  type: ['VerifiableCredential', 'ForgeIdentityCredential'],
  id: `urn:uuid:${crypto.randomUUID()}`,
  issuer: did,
  issuanceDate: new Date().toISOString(),
  credentialSubject: {
    id: did,
    attestations,
    attestationsHash: hashAttestations(attestations),
  },
});

const buildProof = (did: string, proofValue: string): CredentialProof => ({
  type: 'Ed25519Signature2020',
  created: new Date().toISOString(),
  verificationMethod: `${did}#${did.split(':').pop()}`,
  proofPurpose: 'assertionMethod',
  proofValue,
});

// ---- issuance ----

/**
 * Self-issue an identity credential signed by the DID's private key.
 */
export const issueIdentityCredential = (opts: {
  readonly did: string;
  readonly privateKey: Uint8Array;
  readonly attestations: readonly PublicAttestation[];
}): ResultAsync<SignedCredential, AuthError> => {
  const credential = buildCredential(opts.did, opts.attestations);
  const message = canonicalize(credential);
  return signMessage(opts.privateKey, message)
    .map((proofValue) => ({ credential, proof: buildProof(opts.did, proofValue) }))
    .mapErr((e) =>
      e._tag === 'SigningFailed'
        ? credentialSigningFailed('Failed to sign credential', e.cause)
        : e
    );
};

// ---- verification ----

const checkIssuerMatchesSubject = (c: IdentityCredential): Result<IdentityCredential, AuthError> =>
  c.issuer === c.credentialSubject.id
    ? ok(c)
    : err(issuerSubjectMismatch('Issuer must equal subject for self-issued credential'));

const checkAttestationsHash = (c: IdentityCredential): Result<IdentityCredential, AuthError> => {
  const recomputed = hashAttestations(c.credentialSubject.attestations);
  return recomputed === c.credentialSubject.attestationsHash
    ? ok(c)
    : err(credentialTampered('Attestations hash mismatch — credential tampered'));
};

/**
 * Verify a signed credential. Returns ok(true) on success; Err with a
 * specific tag on any failure. Pre-checks (issuer=subject, hash match) run
 * synchronously before the Ed25519 verification.
 */
export const verifyCredential = (signed: SignedCredential): ResultAsync<true, AuthError> => {
  const preCheck = checkIssuerMatchesSubject(signed.credential).andThen(checkAttestationsHash);
  if (preCheck.isErr()) return errAsync(preCheck.error);

  const message = canonicalize(signed.credential);
  return verifySignature(signed.credential.issuer, message, signed.proof.proofValue);
};

/**
 * Short, user-visible fingerprint of a credential.
 */
export const credentialFingerprint = (signed: SignedCredential): string =>
  hashContent(canonicalize(signed)).slice(0, 12);
