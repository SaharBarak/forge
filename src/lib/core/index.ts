/**
 * Forge core primitives — zero-dependency building blocks shared by every
 * domain module.
 *
 *   result.ts     — Result<T, E>, ResultAsync<T, E>, ok, err, ...
 *   errors.ts     — TaggedError base, makeError, isTag, fromUnknown
 *   canonical.ts  — deterministic JSON serialization for signatures
 */

export * from './result';
export * from './errors';
export * from './canonical';
