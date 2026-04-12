import { useCallback, useEffect, useState } from 'react';
import {
  listContributions,
  publishContribution,
  publishReaction,
  type Contribution,
  type ContributionKind,
  type EnrichedContribution,
} from '../lib/community';
import { subscribe as subscribeP2P } from '../lib/p2p';

interface UseCommunityOptions {
  readonly filterKind?: ContributionKind;
}

export interface UseCommunityResult {
  readonly contributions: ReadonlyArray<EnrichedContribution>;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly publish: (input: Omit<Contribution, 'v'>) => Promise<string | null>;
  readonly react: (targetId: string, vote: 'up' | 'down') => Promise<void>;
}

/**
 * Live community feed. Functional-core / imperative-shell: every underlying
 * call returns a Result, which we match into React state. A replication
 * event from the P2P layer re-runs the list pipeline.
 */
export function useCommunity(opts: UseCommunityOptions = {}): UseCommunityResult {
  const { filterKind } = opts;
  const [contributions, setContributions] = useState<ReadonlyArray<EnrichedContribution>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const result = await listContributions(filterKind);
    result.match(
      (list) => {
        setContributions(list);
      },
      (e) => {
        setError(e.message);
      }
    );
    setLoading(false);
  }, [filterKind]);

  // Initial load + subscribe to P2P replication events.
  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await refresh();
    })();

    const unsubscribe = subscribeP2P(() => {
      if (active) refresh();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [refresh]);

  const publish = useCallback(
    async (input: Omit<Contribution, 'v'>): Promise<string | null> => {
      const result = await publishContribution(input);
      return result.match(
        async (id) => {
          await refresh();
          return id;
        },
        (e) => {
          setError(e.message);
          return null;
        }
      );
    },
    [refresh]
  );

  const react = useCallback(
    async (targetId: string, vote: 'up' | 'down'): Promise<void> => {
      const result = await publishReaction(targetId, vote);
      result.match(
        () => {
          // refresh fires via the subscription event, but nudge it immediately
          // for snappier UX.
          void refresh();
        },
        (e) => {
          setError(e.message);
        }
      );
    },
    [refresh]
  );

  return { contributions, loading, error, refresh, publish, react };
}
