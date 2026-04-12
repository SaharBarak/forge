/**
 * P2PError — tagged union of every failure mode in the replication domain.
 */

import type { TaggedError } from '../core';
import { makeError } from '../core';

export type P2PError =
  | TaggedError<'BridgeUnavailable'>
  | TaggedError<'NoActiveKeypair'>
  | TaggedError<'SigningFailed'>
  | TaggedError<'PublishFailed'>
  | TaggedError<'FetchFailed'>
  | TaggedError<'DeleteFailed'>
  | TaggedError<'StatusFailed'>
  | TaggedError<'VerificationFailed'>;

export const bridgeUnavailable = makeError('BridgeUnavailable');
export const noActiveKeypair = makeError('NoActiveKeypair');
export const signingFailed = makeError('SigningFailed');
export const publishFailed = makeError('PublishFailed');
export const fetchFailed = makeError('FetchFailed');
export const deleteFailed = makeError('DeleteFailed');
export const statusFailed = makeError('StatusFailed');
export const verificationFailed = makeError('VerificationFailed');
