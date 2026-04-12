/**
 * Canonical JSON serialization.
 *
 * Produces a deterministic string form of any JSON-serializable value with
 * keys in sort order and no whitespace. Used everywhere a signature needs to
 * cover "the same thing" across time, processes, and peers.
 *
 * This is intentionally simpler than RFC 8785 JCS — we don't normalize number
 * representation — but it's stable for our use case because all numbers we
 * serialize are either integers or ISO timestamps.
 */

export const canonicalize = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => JSON.stringify(k) + ':' + canonicalize((value as Record<string, unknown>)[k]))
    .join(',');
  return '{' + body + '}';
};
