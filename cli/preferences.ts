/**
 * Persistent preferences stored at ~/.forge/preferences.json
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface Preferences {
  language?: string;
}

const PREFS_DIR = path.join(os.homedir(), '.forge');
const PREFS_FILE = path.join(PREFS_DIR, 'preferences.json');

export async function loadPreferences(): Promise<Preferences> {
  try {
    const content = await fs.readFile(PREFS_FILE, 'utf-8');
    return JSON.parse(content) as Preferences;
  } catch {
    return {};
  }
}

export async function savePreferences(partial: Partial<Preferences>): Promise<void> {
  const current = await loadPreferences();
  const merged = { ...current, ...partial };
  await fs.mkdir(PREFS_DIR, { recursive: true });
  await fs.writeFile(PREFS_FILE, JSON.stringify(merged, null, 2));
}
