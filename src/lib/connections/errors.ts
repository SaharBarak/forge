/**
 * ConnectionError — tagged failure modes for the semantic matching layer.
 */

import type { TaggedError } from '../core';
import { makeError } from '../core';

export type ConnectionError =
  | TaggedError<'BridgeUnavailable'>
  | TaggedError<'EmbeddingFailed'>
  | TaggedError<'IndexingFailed'>
  | TaggedError<'SearchFailed'>
  | TaggedError<'StatusFailed'>;

export const bridgeUnavailable = makeError('BridgeUnavailable');
export const embeddingFailed = makeError('EmbeddingFailed');
export const indexingFailed = makeError('IndexingFailed');
export const searchFailed = makeError('SearchFailed');
export const statusFailed = makeError('StatusFailed');
