/**
 * CommunityError — tagged union of failure modes when working with the
 * community contribution store.
 */

import type { TaggedError } from '../core';
import { makeError } from '../core';

export type CommunityError =
  | TaggedError<'PublishFailed'>
  | TaggedError<'ListFailed'>
  | TaggedError<'ReactFailed'>
  | TaggedError<'NoActiveIdentity'>;

export const publishFailed = makeError('PublishFailed');
export const listFailed = makeError('ListFailed');
export const reactFailed = makeError('ReactFailed');
export const noActiveIdentity = makeError('NoActiveIdentity');
