/**
 * Result — tiny re-export layer over `neverthrow`.
 *
 * We standardize on neverthrow's Result/ResultAsync because:
 *   - It's the most widely adopted Result library in TS (2026)
 *   - Zero runtime deps, <5 KB gzipped
 *   - ResultAsync handles the Promise<Result> idiom cleanly
 *   - It plays well with TS exhaustive switch via tagged errors
 *
 * Always import from here, never directly from neverthrow, so we have a
 * single place to swap the implementation if needed.
 */

export {
  Result,
  ResultAsync,
  ok,
  err,
  okAsync,
  errAsync,
  fromPromise,
  fromThrowable,
  fromAsyncThrowable,
  safeTry,
  Ok,
  Err,
} from 'neverthrow';
