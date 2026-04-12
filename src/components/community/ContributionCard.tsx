import type { EnrichedContribution } from '../../lib/community';
import { shortenDid } from '../../lib/community';

interface ContributionCardProps {
  readonly item: EnrichedContribution;
  readonly onVote: (vote: 'up' | 'down') => void;
  readonly onImport?: () => void;
  readonly onFindSimilar?: () => void;
}

const KIND_LABELS: Record<string, string> = {
  persona: 'PERSONA',
  insight: 'INSIGHT',
  template: 'TEMPLATE',
  prompt: 'PROMPT',
};

const KIND_COLORS: Record<string, string> = {
  persona: '#bc8cff',
  insight: '#7ee787',
  template: '#ffa657',
  prompt: '#79c0ff',
};

function formatAge(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ContributionCard({ item, onVote, onImport, onFindSimilar }: ContributionCardProps) {
  const c = item.contribution;
  const kindColor = KIND_COLORS[c.kind] ?? '#8b949e';

  return (
    <div
      style={{
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 8,
        padding: 16,
        display: 'flex',
        gap: 16,
      }}
    >
      {/* Vote column */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          width: 40,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => onVote('up')}
          title="Upvote"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            background: item.myVote === 'up' ? '#238636' : 'transparent',
            border: '1px solid ' + (item.myVote === 'up' ? '#238636' : '#30363d'),
            color: item.myVote === 'up' ? '#ffffff' : '#8b949e',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          ▲
        </button>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: item.score > 0 ? '#7ee787' : item.score < 0 ? '#f85149' : '#8b949e',
          }}
        >
          {item.score}
        </div>
        <button
          onClick={() => onVote('down')}
          title="Downvote"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            background: item.myVote === 'down' ? '#da3633' : 'transparent',
            border: '1px solid ' + (item.myVote === 'down' ? '#da3633' : '#30363d'),
            color: item.myVote === 'down' ? '#ffffff' : '#8b949e',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontFamily: 'inherit',
          }}
        >
          ▼
        </button>
      </div>

      {/* Content column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: kindColor,
              border: '1px solid ' + kindColor,
              padding: '2px 6px',
              borderRadius: 4,
              letterSpacing: 0.5,
            }}
          >
            {KIND_LABELS[c.kind] ?? c.kind.toUpperCase()}
          </span>
          <h3
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#c9d1d9',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {c.title}
          </h3>
        </div>

        <p
          style={{
            fontSize: 13,
            color: '#8b949e',
            margin: '0 0 12px 0',
            lineHeight: 1.5,
          }}
        >
          {c.description}
        </p>

        {c.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {c.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 11,
                  color: '#8b949e',
                  backgroundColor: '#0d1117',
                  border: '1px solid #30363d',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#6e7681',
          }}
        >
          <span title={item.authorDid}>
            by <span style={{ color: '#79c0ff' }}>{shortenDid(item.authorDid, 8)}</span>
            {' · '}
            {formatAge(item.publishedAt)}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {onFindSimilar && (
              <button
                onClick={onFindSimilar}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid #30363d',
                  color: '#bc8cff',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Connections →
              </button>
            )}
            {c.kind === 'persona' && onImport && (
              <button
                onClick={onImport}
                style={{
                  padding: '4px 10px',
                  background: 'transparent',
                  border: '1px solid #30363d',
                  color: '#79c0ff',
                  borderRadius: 4,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Import persona →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
