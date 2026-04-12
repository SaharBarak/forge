import { useState } from 'react';
import {
  createIdentity,
  addAttestation,
  type AuthState,
  type Platform,
} from '../../lib/auth';

interface LoginViewProps {
  readonly onLoggedIn: (state: AuthState) => void;
}

const PLATFORMS: ReadonlyArray<{
  readonly id: Platform;
  readonly label: string;
  readonly placeholder: string;
  readonly hint: string;
}> = [
  {
    id: 'mastodon',
    label: 'Mastodon',
    placeholder: 'user@mastodon.social',
    hint: 'Any Fediverse instance',
  },
  {
    id: 'github',
    label: 'GitHub',
    placeholder: 'username',
    hint: 'Public profile only',
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    placeholder: 'user.bsky.social',
    hint: 'Handle or custom domain',
  },
];

export function LoginView({ onLoggedIn }: LoginViewProps) {
  const [stage, setStage] = useState<'start' | 'evidence'>('start');
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<Platform>('mastodon');
  const [handle, setHandle] = useState('');

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    const result = await createIdentity();
    result.match(
      (state) => {
        setAuth(state);
        setStage('evidence');
      },
      (err) => setError(err.message)
    );
    setBusy(false);
  };

  const handleAddAttestation = async () => {
    if (!handle.trim()) return;
    setError(null);
    setBusy(true);
    const result = await addAttestation(platform, handle.trim());
    result.match(
      (state) => {
        setAuth(state);
        setHandle('');
      },
      (err) => setError(err.message)
    );
    setBusy(false);
  };

  const handleContinue = () => {
    if (auth) onLoggedIn(auth);
  };

  const currentPlatform = PLATFORMS.find((p) => p.id === platform)!;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        padding: '40px',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, color: '#58a6ff', margin: 0, fontWeight: 600 }}>Forge</h1>
        <p style={{ color: '#8b949e', marginTop: 8, marginBottom: 40, fontSize: 14 }}>
          Decentralized identity · Zero API keys · Zero walled gardens
        </p>

        {stage === 'start' && (
          <div
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 32,
              textAlign: 'left',
            }}
          >
            <h2 style={{ fontSize: 18, margin: 0, marginBottom: 12, color: '#c9d1d9' }}>
              Create your identity
            </h2>
            <p style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.6, marginBottom: 24 }}>
              Forge generates a <code style={{ color: '#79c0ff' }}>did:key</code> keypair on your
              device. No accounts, no OAuth, no servers. Your private key never leaves this
              machine.
            </p>
            <button
              onClick={handleCreate}
              disabled={busy}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: busy ? '#21262d' : '#238636',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Generating keypair…' : 'Create identity'}
            </button>
            {error && (
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  backgroundColor: '#3c1014',
                  border: '1px solid #f85149',
                  borderRadius: 6,
                  color: '#ffa198',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}

        {stage === 'evidence' && auth && (
          <div
            style={{
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: 8,
              padding: 32,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: 6,
                padding: 12,
                marginBottom: 24,
                fontSize: 11,
                color: '#79c0ff',
                wordBreak: 'break-all',
              }}
            >
              {auth.did}
            </div>

            <h2 style={{ fontSize: 16, margin: 0, marginBottom: 8, color: '#c9d1d9' }}>
              Add public evidence <span style={{ color: '#6e7681', fontWeight: 400 }}>(optional)</span>
            </h2>
            <p style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.6, marginBottom: 20 }}>
              Bind public profiles to your DID for stronger Sybil resistance. We fetch only public
              bucketed signals — no raw data. All keyless.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: platform === p.id ? '#1f6feb' : '#21262d',
                    color: platform === p.id ? '#ffffff' : '#c9d1d9',
                    border: '1px solid ' + (platform === p.id ? '#1f6feb' : '#30363d'),
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder={currentPlatform.placeholder}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !busy && handle.trim()) handleAddAttestation();
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                backgroundColor: '#0d1117',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'inherit',
                marginBottom: 8,
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 11, color: '#6e7681', margin: '0 0 12px 0' }}>
              {currentPlatform.hint}
            </p>

            <button
              onClick={handleAddAttestation}
              disabled={busy || !handle.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: busy || !handle.trim() ? '#21262d' : '#1f6feb',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: busy || !handle.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'Fetching signals…' : `Add ${currentPlatform.label} attestation`}
            </button>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
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

            {auth.attestations.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, color: '#8b949e', margin: '0 0 8px 0' }}>
                  Attached attestations:
                </p>
                {auth.attestations.map((a) => (
                  <div
                    key={`${a.platform}-${a.handleHash}`}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#0d1117',
                      border: '1px solid #238636',
                      borderRadius: 6,
                      fontSize: 12,
                      marginBottom: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: '#7ee787' }}>✓ {a.platform}</span>
                    <span style={{ color: '#8b949e' }}>{a.handle}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleContinue}
              style={{
                width: '100%',
                marginTop: 24,
                padding: '12px 16px',
                backgroundColor: '#238636',
                color: '#ffffff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Continue to Forge →
            </button>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#6e7681', marginTop: 24 }}>
          Phase 1 · Keyless identity · No OAuth, no walled gardens
        </p>
      </div>
    </div>
  );
}
