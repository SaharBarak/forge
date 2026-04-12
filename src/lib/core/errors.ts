/**
 * Tagged error primitives.
 *
 * We use discriminated unions rather than Error subclasses because they
 * compose with Result<T, E> and TypeScript exhaustive-switch ergonomics far
 * better than class hierarchies. Every domain defines its own error union
 * (AuthError, P2PError, CommunityError) using `TaggedError` as the base
 * shape and `makeError` as the factory.
 */

export interface TaggedError<Tag extends string = string> {
  readonly _tag: Tag;
  readonly message: string;
  readonly cause?: unknown;
}

/**
 * Curried factory — `const notFound = makeError('NotFound')` returns a
 * function that builds errors with the given tag.
 */
export const makeError =
  <Tag extends string>(tag: Tag) =>
  (message: string, cause?: unknown): TaggedError<Tag> => ({
    _tag: tag,
    message,
    cause,
  });

/**
 * Narrow a TaggedError union by its tag. Use with filter/find on
 * aggregations of mixed errors.
 */
export const isTag =
  <Tag extends string>(tag: Tag) =>
  <E extends TaggedError>(e: E): e is Extract<E, { _tag: Tag }> =>
    e._tag === tag;

/**
 * Convert an unknown thrown value into a TaggedError of a given tag. Useful
 * as the `fromThrowable` error handler in neverthrow.
 */
export const fromUnknown =
  <Tag extends string>(tag: Tag, message: string) =>
  (cause: unknown): TaggedError<Tag> => ({
    _tag: tag,
    message: cause instanceof Error ? `${message}: ${cause.message}` : message,
    cause,
  });
