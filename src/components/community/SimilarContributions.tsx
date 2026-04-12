import { useEffect, useState } from 'react';
import type { EnrichedContribution } from '../../lib/community';
import type { SimilarityMatch } from '../../lib/connections';
import { useConnections } from '../../hooks/useConnections';
import { shortenDid } from '../../lib/community';

interface SimilarContributionsProps {
  readonly source: EnrichedContribution;
  readonly allContributions: ReadonlyArray<EnrichedContribution>;
  readonly onClose: () => void;
}

type Resolved = SimilarityMatch & { readonly contribution: EnrichedContribution };

export function SimilarContributions({
  source,
  allContributions,
  onClose,
}: SimilarContributionsProps) {
  const { findSimilarTo, status } = useConnections();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<ReadonlyArray<Resolved>>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const raw = await findSimilarTo(source, 5);
      if (!active) return;

      // Resolve IDs back to full contributions (functional pipeline).
      const byId = new Map(allContributions.map((c) => [c.id, c]));
      const resolved = raw
        .map((m): Resolved | null => {
          const contribution = byId.get(m.id);
          return contribution ? { ...m, contribution } : null;
        })
        .filter((r): r is Resolved => r !== null);

      setMatches(resolved);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [source, allContributions, findSimilarTo]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(1, 4, 9, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 10,
          padding: 28,
          width: 640,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflowY: 'auto',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          color: '#c9d1d9',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: 0, color: '#58a6ff' }}>Connections</h2>
            <p style={{ fontSize: 12, color: '#8b949e', margin: '4px 0 0 0' }}>
              Semantically similar to:{' '}
              <span style={{ color: '#c9d1d9' }}>{source.contribution.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #30363d',
              color: '#c9d1d9',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6e7681', fontSize: 12 }}>
            {status?.loaded ? 'Searching…' : 'Loading embedding model… (first run downloads ~22 MB)'}
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#6e7681', fontSize: 12 }}>
            No similar contributions found yet.
          </div>
        )}

        {!loading && matches.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: 12,
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <h3 style={{ fontSize: 13, margin: 0, color: '#c9d1d9' }}>
                    {m.contribution.contribution.title}
                  </h3>
                  <span
                    style={{
                      fontSize: 10,
                      color: '#7ee787',
                      backgroundColor: '#0d1117',
                      border: '1px solid #238636',
                      padding: '2px 8px',
                      borderRadius: 10,
                    }}
                  >
                    {(m.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: '#8b949e',
                    margin: '0 0 6px 0',
                    lineHeight: 1.5,
                  }}
                >
                  {m.contribution.contribution.description}
                </p>
                <div style={{ fontSize: 10, color: '#6e7681' }}>
                  by{' '}
                  <span style={{ color: '#79c0ff' }}>
                    {shortenDid(m.contribution.authorDid, 8)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {status && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #30363d',
              fontSize: 10,
              color: '#6e7681',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Model: {status.model}</span>
            <span>
              {status.indexSize} vectors · {status.loaded ? 'ready' : 'loading'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
