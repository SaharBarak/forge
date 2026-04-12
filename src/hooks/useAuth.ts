import { useCallback, useEffect, useState } from 'react';
import { restoreSession, logout as authLogout, type AuthState } from '../lib/auth';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface UseAuthResult {
  readonly status: AuthStatus;
  readonly authState: AuthState | null;
  readonly setAuthState: (state: AuthState) => void;
  readonly logout: () => Promise<void>;
}

/**
 * Top-level auth lifecycle hook.
 *
 * Functional core, imperative shell: the underlying session module returns
 * Result values, and this hook adapts them to React-friendly
 * `{status, authState}` state. Errors from `restoreSession` are treated as
 * "fall through to login" — we don't expose them separately since there's
 * nothing the user can do about a corrupted stored session beyond signing
 * in again.
 */
export function useAuth(): UseAuthResult {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [authState, setAuthStateInternal] = useState<AuthState | null>(null);

  useEffect(() => {
    let cancelled = false;
    restoreSession().match(
      (state) => {
        if (cancelled) return;
        if (state) {
          setAuthStateInternal(state);
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      },
      (error) => {
        console.error('[useAuth] restore failed:', error);
        if (!cancelled) setStatus('unauthenticated');
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const setAuthState = useCallback((state: AuthState) => {
    setAuthStateInternal(state);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setAuthStateInternal(null);
    setStatus('unauthenticated');
  }, []);

  return { status, authState, setAuthState, logout };
}
