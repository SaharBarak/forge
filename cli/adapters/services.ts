/**
 * Lazy service bootstrap for CLI.
 *
 * Extracted into its own module to avoid circular imports between
 * cli/index.ts and cli/commands/*.ts.
 */

import * as path from 'path';
import { forgeDataDir } from './auth-bridge';
import { startP2P, stopP2P } from './p2p-direct';
import { startConnections, stopConnections } from './connections-direct';

let started = false;

export async function ensureServices(): Promise<void> {
  if (started) return;
  started = true;
  const p2pDataDir = path.join(forgeDataDir, 'p2p');
  try {
    const { peerId } = await startP2P(p2pDataDir);
    console.log(`\x1b[2m[p2p] peer: ${peerId.slice(0, 12)}…\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[2m[p2p] failed to start: ${(err as Error).message}\x1b[0m`);
  }
  try {
    await startConnections(forgeDataDir);
  } catch (err) {
    console.error(`\x1b[2m[connections] failed to start: ${(err as Error).message}\x1b[0m`);
  }
}

export async function shutdownServices(): Promise<void> {
  if (!started) return;
  try { await stopConnections(); } catch {}
  try { await stopP2P(); } catch {}
}
