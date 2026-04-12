import { useEffect, useState } from 'react';
import { useCommunity } from '../../hooks/useCommunity';
import { useConnections } from '../../hooks/useConnections';
import type { ContributionKind, EnrichedContribution, PersonaContribution } from '../../lib/community';
import { ContributionCard } from './ContributionCard';
import { PublishDialog } from './PublishDialog';
import { SimilarContributions } from './SimilarContributions';

interface CommunityPanelProps {
  onClose: () => void;
}

type FilterTab = 'all' | ContributionKind;

const TABS: Array<{ id: FilterTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'persona', label: 'Personas' },
  { id: 'insight', label: 'Insights' },
  { id: 'template', label: 'Templates' },
  { id: 'prompt', label: 'Prompts' },
];

export function CommunityPanel({ onClose }: CommunityPanelProps) {
  const [tab, setTab] = useState<FilterTab>('all');
  const [showPublish, setShowPublish] = useState(false);
  const [similarSource, setSimilarSource] = useState<EnrichedContribution | null>(null);
  const { contributions, loading, error, publish, react } = useCommunity({
    filterKind: tab === 'all' ? undefined : tab,
  });
  const { indexAll, status: connectionsStatus } = useConnections();

  // Keep the HNSW index in sync with the feed. Every time the contribution
  // list changes (new replication, new publish, etc.), re-run indexAll.
  // The service dedupes by ID, so this is cheap for already-indexed items.
  useEffect(() => {
    if (contributions.length === 0) return;
    void indexAll(contributions);
  }, [contributions, indexAll]);

  const handleImportPersona = async (item: EnrichedContribution) => {
    if (item.contribution.kind !== 'persona') return;
    const content = (item.contribution as PersonaContribution).content;
    try {
      const api = (window as unknown as { electronAPI?: { savePersonas?: Function } }).electronAPI;
      if (!api?.savePersonas) {
        alert('Electron API not available.');
        return;
      }
      const setName = `community-${content.id}`;
      await api.savePersonas({ name: setName, personas: [content], skills: null });
      alert(`Imported as "${setName}". Select it from the persona picker in a new session.`);
    } catch (err) {
      alert('Import failed: ' + (err as Error).message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 900,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid #30363d',
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, margin: 0, color: '#58a6ff' }}>Community</h1>
          <p style={{ fontSize: 11, color: '#8b949e', margin: '4px 0 0 0' }}>
            Signed contributions from connected peers. No servers. No accounts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowPublish(true)}
            style={{
              padding: '8px 16px',
              background: '#238636',
              border: 'none',
              color: '#ffffff',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            + Publish
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid #30363d',
              color: '#c9d1d9',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: '12px 32px',
          borderBottom: '1px solid #30363d',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px',
              background: tab === t.id ? '#1f6feb' : 'transparent',
              border: '1px solid ' + (tab === t.id ? '#1f6feb' : '#30363d'),
              color: tab === t.id ? '#ffffff' : '#8b949e',
              borderRadius: 20,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 12,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 32px',
        }}
      >
        {loading && <EmptyState text="Loading community feed..." />}
        {!loading && error && <EmptyState text={`Error: ${error}`} />}
        {!loading && !error && contributions.length === 0 && (
          <EmptyState text="No contributions yet. Be the first to publish something." />
        )}
        {!loading && contributions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 820, margin: '0 auto' }}>
            {contributions.map((item) => (
              <ContributionCard
                key={item.id}
                item={item}
                onVote={(vote) => react(item.id, vote)}
                onFindSimilar={() => setSimilarSource(item)}
                onImport={
                  item.contribution.kind === 'persona' ? () => handleImportPersona(item) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Status line for the embedding / HNSW subsystem */}
      {connectionsStatus && (
        <div
          style={{
            padding: '6px 32px',
            borderTop: '1px solid #30363d',
            backgroundColor: '#0a0d12',
            fontSize: 10,
            color: '#6e7681',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Connections:{' '}
            {connectionsStatus.loaded
              ? `${connectionsStatus.indexSize} vectors indexed`
              : connectionsStatus.loading
                ? 'loading model…'
                : 'idle'}
          </span>
          <span>{connectionsStatus.model}</span>
        </div>
      )}

      {showPublish && <PublishDialog onPublish={publish} onClose={() => setShowPublish(false)} />}
      {similarSource && (
        <SimilarContributions
          source={similarSource}
          allContributions={contributions}
          onClose={() => setSimilarSource(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 60,
        color: '#6e7681',
        fontSize: 13,
      }}
    >
      {text}
    </div>
  );
}
