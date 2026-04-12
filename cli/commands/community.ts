/**
 * forge community — publish, browse, and vote on community contributions.
 *
 * All operations go through the P2P store directly (no IPC). Every write
 * is signed by the user's DID keypair.
 */

import { Command } from 'commander';
import * as readline from 'readline';
import { createSessionRepository } from '../../src/lib/auth/session';
import { createFileAuthBridge } from '../adapters/auth-bridge';
import { ResultAsync } from '../../src/lib/core';
import * as p2p from '../adapters/p2p-direct';
import { ensureServices } from '../adapters/services';
import { CONTRIBUTION_SCHEMA_VERSION, type Contribution, type Reaction, type ContributionKind } from '../../src/lib/community/types';
import { forgeTheme, style } from '../../src/lib/render/theme';
import { renderMarkdown } from '../../src/lib/render/markdown';
import { voteTally } from '../../src/lib/render/consensus';
import type { VerifiedDoc } from '../../src/lib/p2p/client';

const repo = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);

const isContribution = (payload: unknown): payload is Contribution => {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as { kind?: unknown; v?: unknown; title?: unknown; content?: unknown };
  return (
    typeof p.kind === 'string' &&
    typeof p.v === 'number' &&
    typeof p.title === 'string' &&
    ['persona', 'insight', 'template', 'prompt'].includes(p.kind as string) &&
    typeof p.content === 'object'
  );
};

const isReaction = (payload: unknown): payload is Reaction => {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as { kind?: unknown; targetId?: unknown; vote?: unknown };
  return p.kind === 'reaction' && typeof p.targetId === 'string';
};

const shortenDid = (did: string): string =>
  did.length > 24 ? `${did.slice(0, 12)}…${did.slice(-8)}` : did;

const ask = (question: string): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

export const createCommunityCommand = (): Command => {
  const cmd = new Command('community')
    .description('Browse and publish community contributions (P2P)');

  cmd.addCommand(
    new Command('list')
      .description('List contributions from connected peers')
      .option('-k, --kind <kind>', 'Filter by kind (persona|insight|template|prompt)')
      .action(async (opts) => {
        await ensureServices();
        const result = await p2p.fetchAll<Contribution | Reaction>();
        result.match(
          (docs) => {
            const contribs = docs.filter((d): d is VerifiedDoc<Contribution> => isContribution(d.payload));
            const reactions = docs.filter((d) => isReaction(d.payload));

            const filtered = opts.kind
              ? contribs.filter((c) => c.payload.kind === opts.kind)
              : contribs;

            if (filtered.length === 0) {
              console.log(style(forgeTheme.text.muted, '\n  No contributions found. Be the first: forge community publish\n'));
              return;
            }

            console.log(style(forgeTheme.heading.h1, `\n  Community Feed (${filtered.length} contributions)\n`));

            for (const c of filtered) {
              const up = reactions.filter((r) =>
                isReaction(r.payload) && r.payload.targetId === c.id && r.payload.vote === 'up'
              ).length;
              const down = reactions.filter((r) =>
                isReaction(r.payload) && r.payload.targetId === c.id && r.payload.vote === 'down'
              ).length;

              const kindColor: Record<string, string> = {
                persona: forgeTheme.text.emphasis,
                insight: forgeTheme.status.success,
                template: forgeTheme.status.warning,
                prompt: forgeTheme.status.info,
              };

              console.log(
                `  ${style(kindColor[c.payload.kind] ?? forgeTheme.text.primary, `[${c.payload.kind.toUpperCase()}]`)} ` +
                `${style(forgeTheme.bold, c.payload.title)}  ${voteTally(up, down)}`
              );
              console.log(`  ${style(forgeTheme.text.muted, c.payload.description)}`);
              console.log(`  ${style(forgeTheme.text.muted, `by ${shortenDid(c.did)} · ${c.id.slice(0, 8)}`)}`);
              console.log('');
            }
          },
          (err) => {
            console.error(style(forgeTheme.status.error, `  ✘ ${err.message}`));
          }
        );
      })
  );

  cmd.addCommand(
    new Command('publish')
      .description('Publish a new contribution')
      .requiredOption('-k, --kind <kind>', 'Contribution kind (persona|insight|template|prompt)')
      .requiredOption('-t, --title <title>', 'Title')
      .requiredOption('-d, --description <desc>', 'One-line description')
      .option('-b, --body <body>', 'Body content (or will prompt)')
      .option('--tags <tags>', 'Comma-separated tags')
      .action(async (opts) => {
        await ensureServices();
        const session = await repo.restoreSession();
        const authState = session.match((s) => s, () => null);
        if (!authState) {
          console.error(style(forgeTheme.status.error, '  ✘ Not logged in. Run: forge login'));
          return;
        }

        const keypair = repo.getCurrentKeypair();
        if (!keypair) {
          console.error(style(forgeTheme.status.error, '  ✘ No keypair loaded'));
          return;
        }

        const body = opts.body || await ask('  Body: ');
        const tags = opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : [];

        const kind = opts.kind as ContributionKind;
        let content: unknown;
        switch (kind) {
          case 'persona':
            content = {
              id: opts.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: opts.title,
              role: opts.description,
              background: body,
              personality: [],
            };
            break;
          case 'insight':
            content = { body };
            break;
          case 'template':
            content = { mode: 'custom', goal: body, personaIds: [] };
            break;
          case 'prompt':
            content = { body };
            break;
          default:
            console.error(style(forgeTheme.status.error, `  ✘ Unknown kind: ${kind}`));
            return;
        }

        const payload: Contribution = {
          v: CONTRIBUTION_SCHEMA_VERSION,
          kind,
          title: opts.title,
          description: opts.description,
          tags,
          content,
        } as Contribution;

        const result = await p2p.publish(keypair, { payload });
        result.match(
          ({ id }) => {
            console.log(style(forgeTheme.status.success, `  ✔ Published: ${id.slice(0, 12)}…`));
          },
          (err) => {
            console.error(style(forgeTheme.status.error, `  ✘ ${err.message}`));
          }
        );
      })
  );

  cmd.addCommand(
    new Command('vote')
      .description('Upvote or downvote a contribution')
      .argument('<id>', 'Contribution ID (or prefix)')
      .option('--down', 'Downvote instead of upvote')
      .action(async (idOrPrefix: string, opts) => {
        await ensureServices();
        const session = await repo.restoreSession();
        const authState = session.match((s) => s, () => null);
        if (!authState) {
          console.error(style(forgeTheme.status.error, '  ✘ Not logged in. Run: forge login'));
          return;
        }

        const keypair = repo.getCurrentKeypair();
        if (!keypair) return;

        // Resolve prefix to full contribution ID by scanning the store.
        const allResult = await p2p.fetchAll<Contribution | Reaction>();
        const resolvedId = allResult.match(
          (docs) => {
            const match = docs.find(
              (d) => isContribution(d.payload) && d.id.startsWith(idOrPrefix)
            );
            return match?.id ?? null;
          },
          () => null
        );

        if (!resolvedId) {
          console.error(style(forgeTheme.status.error, `  ✘ No contribution matches "${idOrPrefix}"`));
          return;
        }

        const vote = opts.down ? 'down' : 'up';
        const reaction: Reaction = {
          v: CONTRIBUTION_SCHEMA_VERSION,
          kind: 'reaction',
          targetId: resolvedId,
          vote,
        };
        const voteId = `vote:${keypair.did}:${resolvedId}`;

        const result = await p2p.publish(keypair, { payload: reaction, id: voteId });
        result.match(
          () => console.log(style(forgeTheme.status.success, `  ✔ ${vote === 'up' ? '▲' : '▼'} Vote cast on ${resolvedId.slice(0, 12)}…`)),
          (err) => console.error(style(forgeTheme.status.error, `  ✘ ${err.message}`))
        );
      })
  );

  return cmd;
};
