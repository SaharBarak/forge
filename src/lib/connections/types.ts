/**
 * Types for the connections domain.
 *
 * `SimilarityMatch` is the pure vector-search result (ID + score). Higher
 * layers resolve the ID back to the full contribution before presenting to
 * the user.
 */

export interface SimilarityMatch {
  readonly id: string;
  readonly similarity: number;
  readonly distance: number;
}

export interface ConnectionsStatus {
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly model: string;
  readonly dimensions: number;
  readonly indexSize: number;
  readonly dataDir: string | null;
}

/**
 * Canonical text extraction for a contribution — what we actually feed to
 * the embedding model. We embed title + description + body together, tagged
 * so the model sees the full context.
 */
export const buildSearchableText = (contribution: {
  readonly title: string;
  readonly description: string;
  readonly content: unknown;
}): string => {
  const bodyText = extractBodyText(contribution.content);
  return [contribution.title, contribution.description, bodyText]
    .filter((s) => s && s.length > 0)
    .join('\n\n');
};

const extractBodyText = (content: unknown): string => {
  if (!content || typeof content !== 'object') return '';
  const c = content as Record<string, unknown>;
  // Check every known body-bearing field across the four contribution kinds.
  const candidates = [
    c.body,
    c.background, // persona
    c.goal, // template
    c.initialPrompt, // template
  ];
  return candidates.filter((v): v is string => typeof v === 'string' && v.length > 0).join('\n');
};
