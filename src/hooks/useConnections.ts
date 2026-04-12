import { useCallback, useEffect, useState } from 'react';
import {
  findSimilar as findSimilarFn,
  indexContribution as indexContributionFn,
  getStatus as getStatusFn,
  buildSearchableText,
  type ConnectionsStatus,
  type SimilarityMatch,
} from '../lib/connections';
import type { EnrichedContribution } from '../lib/community';

export interface UseConnectionsResult {
  readonly status: ConnectionsStatus | null;
  readonly indexAll: (contributions: ReadonlyArray<EnrichedContribution>) => Promise<void>;
  readonly findSimilarTo: (
    contribution: EnrichedContribution,
    k?: number
  ) => Promise<ReadonlyArray<SimilarityMatch>>;
  readonly findSimilarByText: (
    text: string,
    k?: number
  ) => Promise<ReadonlyArray<SimilarityMatch>>;
}

/**
 * Connections hook — provides a thin React surface over the Result-returning
 * connections client. Errors are swallowed into empty results so the UI can
 * degrade gracefully while the model is still downloading on first run.
 */
export function useConnections(): UseConnectionsResult {
  const [status, setStatus] = useState<ConnectionsStatus | null>(null);

  // Poll status every 3s until the model is loaded, then stop. Cheap enough
  // for a status indicator; avoids the complexity of a dedicated progress
  // event stream.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const result = await getStatusFn();
      if (!active) return;
      result.match(
        (s) => {
          setStatus(s);
          if (!s.loaded && active) {
            timer = setTimeout(tick, 3000);
          }
        },
        () => {
          if (active) timer = setTimeout(tick, 5000);
        }
      );
    };

    tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const indexAll = useCallback(
    async (contributions: ReadonlyArray<EnrichedContribution>) => {
      // Sequentially to avoid overloading the model queue — batched mode
      // could be added later if startup time becomes an issue.
      for (const c of contributions) {
        const text = buildSearchableText(c.contribution);
        if (!text) continue;
        await indexContributionFn(c.id, text);
      }
    },
    []
  );

  const findSimilarTo = useCallback(
    async (
      contribution: EnrichedContribution,
      k = 5
    ): Promise<ReadonlyArray<SimilarityMatch>> => {
      const text = buildSearchableText(contribution.contribution);
      if (!text) return [];
      const result = await findSimilarFn(text, { k, excludeId: contribution.id });
      return result.match(
        (matches) => matches,
        () => []
      );
    },
    []
  );

  const findSimilarByText = useCallback(
    async (text: string, k = 5): Promise<ReadonlyArray<SimilarityMatch>> => {
      if (!text.trim()) return [];
      const result = await findSimilarFn(text, { k });
      return result.match(
        (matches) => matches,
        () => []
      );
    },
    []
  );

  return { status, indexAll, findSimilarTo, findSimilarByText };
}
