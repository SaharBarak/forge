/**
 * File-based auth storage bridge for the CLI.
 *
 * Uses ~/.forge/auth.json instead of Electron's userData directory. Same
 * AuthStorageBridge interface that session.ts expects — the domain module
 * doesn't know or care whether it's running in Electron or a terminal.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { AuthStorageBridge, StoredAuth } from '../../src/lib/auth/session';

const FORGE_DIR = path.join(os.homedir(), '.forge');
const AUTH_FILE = path.join(FORGE_DIR, 'auth.json');

const ensureDir = async (): Promise<void> => {
  await fs.mkdir(FORGE_DIR, { recursive: true });
};

export const createFileAuthBridge = (): AuthStorageBridge => ({
  save: async (payload: StoredAuth): Promise<boolean> => {
    try {
      await ensureDir();
      await fs.writeFile(AUTH_FILE, JSON.stringify(payload, null, 2), {
        encoding: 'utf-8',
        mode: 0o600,
      });
      return true;
    } catch (err) {
      console.error('[auth] save failed:', err);
      return false;
    }
  },

  load: async (): Promise<StoredAuth | null> => {
    try {
      const data = await fs.readFile(AUTH_FILE, 'utf-8');
      return JSON.parse(data) as StoredAuth;
    } catch {
      return null;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      await fs.unlink(AUTH_FILE);
      return true;
    } catch {
      return true; // already gone
    }
  },
});

/** Path to the Forge data directory (~/.forge/). */
export const forgeDataDir = FORGE_DIR;
