/**
 * forge login — create or restore a decentralized DID identity.
 *
 * No API keys, no OAuth, no servers. Generates an Ed25519 keypair on disk,
 * optionally attaches public attestations (Mastodon, GitHub, Bluesky).
 */

import { Command } from 'commander';
import * as readline from 'readline';
import { createSessionRepository, type AuthState } from '../../src/lib/auth/session';
import { createFileAuthBridge } from '../adapters/auth-bridge';
import { ResultAsync } from '../../src/lib/core';
import { forgeTheme, style } from '../../src/lib/render/theme';
import { attestationDots } from '../../src/lib/render/progress';
import type { Platform } from '../../src/lib/auth/attestations';

const repo = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);

const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

const printIdentity = (state: AuthState): void => {
  console.log('');
  console.log(style(forgeTheme.heading.h1, '  Your Forge Identity'));
  console.log('');
  console.log(`  DID: ${style(forgeTheme.text.link, state.did)}`);
  console.log(`  Attestations: ${attestationDots(state.attestations.length)}`);
  if (state.attestations.length > 0) {
    for (const a of state.attestations) {
      console.log(`    ${style(forgeTheme.status.success, '✔')} ${a.platform}: ${style(forgeTheme.text.muted, a.handle)}`);
    }
  }
  console.log('');
};

export const createLoginCommand = (): Command => {
  const cmd = new Command('login')
    .description('Create or restore your decentralized DID identity')
    .option('--new', 'Force create a new identity (replaces existing)')
    .action(async (opts) => {
      // Try restoring first.
      if (!opts.new) {
        const restoreResult = await repo.restoreSession();
        const restored = restoreResult.match(
          (s) => s,
          () => null
        );
        if (restored) {
          console.log(style(forgeTheme.status.success, '✔ Session restored'));
          printIdentity(restored);
          return;
        }
      }

      // Create new identity.
      console.log(style(forgeTheme.status.info, '  Creating new did:key identity…'));
      const createResult = await repo.createIdentity();
      const state = createResult.match(
        (s) => s,
        (err) => {
          console.error(style(forgeTheme.status.error, `✘ Failed: ${err.message}`));
          return null;
        }
      );
      if (!state) return;

      console.log(style(forgeTheme.status.success, '✔ Identity created'));
      printIdentity(state);

      // Offer attestations.
      const wantAttestation = await ask(
        `  Add public profile evidence? ${style(forgeTheme.text.muted, '(mastodon/github/bluesky or skip)')}: `
      );

      if (wantAttestation && wantAttestation !== 'skip' && wantAttestation !== 'n') {
        const platforms: Platform[] = ['mastodon', 'github', 'bluesky'];
        let platform: Platform | null = null;
        for (const p of platforms) {
          if (wantAttestation.toLowerCase().includes(p)) {
            platform = p;
            break;
          }
        }
        if (!platform) {
          // Assume it's a handle — try to detect platform.
          if (wantAttestation.includes('@') && wantAttestation.split('@').length >= 2) {
            platform = 'mastodon';
          } else if (wantAttestation.includes('.bsky.')) {
            platform = 'bluesky';
          } else {
            platform = 'github';
          }
        }

        const handle = await ask(`  ${platform} handle: `);
        if (handle) {
          console.log(style(forgeTheme.text.muted, `  Fetching ${platform} signals…`));
          const attestResult = await repo.addAttestation(platform, handle);
          attestResult.match(
            (updated) => {
              console.log(style(forgeTheme.status.success, `  ✔ ${platform} attestation added`));
              printIdentity(updated);
            },
            (err) => {
              console.log(style(forgeTheme.status.error, `  ✘ ${err.message}`));
              printIdentity(state);
            }
          );
        }
      }
    });

  cmd.addCommand(
    new Command('status')
      .description('Show current identity status')
      .action(async () => {
        const result = await repo.restoreSession();
        result.match(
          (s) => {
            if (s) {
              printIdentity(s);
            } else {
              console.log(style(forgeTheme.text.muted, '  No identity found. Run: forge login'));
            }
          },
          (err) => {
            console.error(style(forgeTheme.status.error, `  ✘ ${err.message}`));
          }
        );
      })
  );

  cmd.addCommand(
    new Command('logout')
      .description('Remove stored identity')
      .action(async () => {
        await repo.logout();
        console.log(style(forgeTheme.status.success, '  ✔ Identity cleared'));
      })
  );

  return cmd;
};
