import { useState } from 'react';
import type { Contribution, ContributionKind } from '../../lib/community';

interface PublishDialogProps {
  readonly onPublish: (input: Omit<Contribution, 'v'>) => Promise<string | null>;
  readonly onClose: () => void;
}

const KINDS: Array<{ id: ContributionKind; label: string; hint: string }> = [
  { id: 'persona', label: 'Persona', hint: 'Shareable agent character' },
  { id: 'insight', label: 'Insight', hint: 'Learning from a session' },
  { id: 'template', label: 'Template', hint: 'Reusable session setup' },
  { id: 'prompt', label: 'Prompt', hint: 'Reusable prompt snippet' },
];

export function PublishDialog({ onPublish, onClose }: PublishDialogProps) {
  const [kind, setKind] = useState<ContributionKind>('insight');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Build the kind-specific payload. For MVP, the body textarea maps to
      // the canonical text slot for each kind; richer structured editors
      // (persona fields, template configs) come later.
      let input: Omit<Contribution, 'v'>;
      switch (kind) {
        case 'persona':
          input = {
            kind: 'persona',
            title: title.trim(),
            description: description.trim(),
            tags,
            content: {
              id: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: title.trim(),
              role: description.trim(),
              background: body.trim(),
              personality: [],
            },
          };
          break;
        case 'insight':
          input = {
            kind: 'insight',
            title: title.trim(),
            description: description.trim(),
            tags,
            content: { body: body.trim() },
          };
          break;
        case 'template':
          input = {
            kind: 'template',
            title: title.trim(),
            description: description.trim(),
            tags,
            content: { mode: 'custom', goal: body.trim(), personaIds: [] },
          };
          break;
        case 'prompt':
          input = {
            kind: 'prompt',
            title: title.trim(),
            description: description.trim(),
            tags,
            content: { body: body.trim() },
          };
          break;
      }

      const id = await onPublish(input);
      if (id === null) {
        setError('Publish failed. Check the console for details.');
      } else {
        onClose();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

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
          width: 560,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          color: '#c9d1d9',
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 4px 0' }}>Publish to community</h2>
        <p style={{ fontSize: 12, color: '#8b949e', margin: '0 0 20px 0' }}>
          Signed by your DID. Replicated to every connected peer.
        </p>

        {/* Kind picker */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setKind(k.id)}
              style={{
                padding: '10px 12px',
                background: kind === k.id ? '#1f6feb' : '#161b22',
                border: '1px solid ' + (kind === k.id ? '#1f6feb' : '#30363d'),
                color: kind === k.id ? '#ffffff' : '#c9d1d9',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{k.label}</div>
              <div style={{ fontSize: 11, color: kind === k.id ? '#c6e6ff' : '#6e7681', marginTop: 2 }}>
                {k.hint}
              </div>
            </button>
          ))}
        </div>

        <Label>Title</Label>
        <TextField value={title} onChange={setTitle} placeholder="Short, descriptive title" />

        <Label>Description</Label>
        <TextField
          value={description}
          onChange={setDescription}
          placeholder="One-line summary for the feed"
        />

        <Label>{kind === 'persona' ? 'Background / bio' : kind === 'template' ? 'Goal' : 'Body'}</Label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            kind === 'persona'
              ? 'Persona background, beliefs, typical arguments...'
              : kind === 'insight'
                ? 'What did you learn?'
                : kind === 'template'
                  ? 'What is the session goal?'
                  : 'Prompt text...'
          }
          rows={6}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#161b22',
            color: '#c9d1d9',
            border: '1px solid #30363d',
            borderRadius: 6,
            fontSize: 13,
            fontFamily: 'inherit',
            marginBottom: 12,
            boxSizing: 'border-box',
            resize: 'vertical',
          }}
        />

        <Label>Tags (comma-separated)</Label>
        <TextField value={tagsInput} onChange={setTagsInput} placeholder="e.g. gtm, b2b, skeptical" />

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: 10,
              backgroundColor: '#3c1014',
              border: '1px solid #f85149',
              borderRadius: 6,
              color: '#ffa198',
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: '1px solid #30363d',
              color: '#c9d1d9',
              borderRadius: 6,
              cursor: busy ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || busy}
            style={{
              padding: '10px 20px',
              background: !canSubmit || busy ? '#21262d' : '#238636',
              border: 'none',
              color: '#ffffff',
              borderRadius: 6,
              cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: 11,
        color: '#8b949e',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}
    >
      {children}
    </label>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '10px 12px',
        backgroundColor: '#161b22',
        color: '#c9d1d9',
        border: '1px solid #30363d',
        borderRadius: 6,
        fontSize: 13,
        fontFamily: 'inherit',
        marginBottom: 12,
        boxSizing: 'border-box',
      }}
    />
  );
}
