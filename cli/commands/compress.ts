/**
 * `forge compress` — token-compression pipe.
 *
 * Read a transcript (file or stdin), summarize it down to the key
 * facts + decisions + open questions, write to stdout (or file).
 * The idea is that long deliberations can be compressed into a handoff
 * that fits another session's context budget, exactly like Octopus's
 * `bin/octo-compress` pipe.
 *
 * Uses the default Claude runner for the summarization pass. The
 * output format is structured Markdown so a downstream session can
 * parse it programmatically.
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { CLIAgentRunner } from '../adapters/CLIAgentRunner';
import { ClaudeCodeCLIRunner } from '../adapters/ClaudeCodeCLIRunner';

const SYSTEM_PROMPT = `You are a transcript compressor. Distill the deliberation into a handoff brief a new session could pick up without reading the full transcript.

## Output shape (markdown)
# Compressed handoff

## Premise
<1-2 sentences · what the session was about>

## Key facts established
- <tight bullets · research findings, commitments, agreements>

## Decisions reached
- <each decision on its own bullet · include the verdict in CAPS>

## Open questions
- <things the session flagged but did not resolve>

## Next action
<one sentence · what the handoff agent should do next>

Keep every section under 300 words. Preserve citations, file paths, and specific numbers verbatim.`;

async function readInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    return fs.readFile(inputPath, 'utf-8');
  }
  if (process.stdin.isTTY) {
    throw new Error('No input — pass a file or pipe a transcript via stdin');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function run(
  inputPath: string | undefined,
  opts: { output?: string; model?: string }
): Promise<void> {
  const input = await readInput(inputPath);
  if (!input.trim()) {
    throw new Error('Empty input');
  }

  // Ballpark the savings — roughly 4 chars per token.
  const before = Math.round(input.length / 4);

  const runner = process.env.ANTHROPIC_API_KEY
    ? new CLIAgentRunner()
    : new ClaudeCodeCLIRunner();

  const result = await runner.query({
    prompt: `Transcript to compress:\n\n${input}`,
    systemPrompt: SYSTEM_PROMPT,
    model: opts.model ?? 'claude-sonnet-4-20250514',
  });

  if (!result.success || !result.content) {
    throw new Error(result.error ?? 'Compression failed');
  }

  const compressed = result.content.trim();
  const after = Math.round(compressed.length / 4);

  if (opts.output) {
    await fs.mkdir(path.dirname(opts.output), { recursive: true }).catch(() => {});
    await fs.writeFile(opts.output, compressed);
    console.error(
      chalk.green('✓'),
      `${opts.output}  ·  ${chalk.dim(`~${before.toLocaleString()} → ~${after.toLocaleString()} tokens (${Math.round((1 - after / before) * 100)}% smaller)`)}`
    );
  } else {
    process.stdout.write(compressed);
    if (!compressed.endsWith('\n')) process.stdout.write('\n');
    console.error(
      chalk.dim(`\n~${before.toLocaleString()} → ~${after.toLocaleString()} tokens (${Math.round((1 - after / before) * 100)}% smaller)`)
    );
  }
}

export function createCompressCommand(): Command {
  return new Command('compress')
    .description('Summarize a transcript into a handoff brief (stdin → stdout pipe, or file args)')
    .argument('[input]', 'Input file (reads stdin if omitted)')
    .option('-o, --output <file>', 'Write to a file instead of stdout')
    .option('--model <model>', 'Model to use for the compression pass', 'claude-sonnet-4-20250514')
    .action(async (input: string | undefined, opts: { output?: string; model?: string }) => {
      try {
        await run(input, opts);
      } catch (err) {
        console.error(chalk.red('forge compress failed:'), err instanceof Error ? err.message : err);
        process.exitCode = 1;
      }
    });
}
