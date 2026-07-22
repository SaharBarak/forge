/**
 * CodexCLIRunner — IAgentRunner backed by `codex exec`.
 *
 * This lets a Forge MCP server launched by Codex reuse the operator's Codex
 * login instead of requiring an Anthropic API key or recursively launching a
 * Claude Code session. Each query is ephemeral, read-only, and receives the
 * Forge persona/system prompt as part of its input.
 */

import { spawn } from 'node:child_process';
import type {
  IAgentRunner,
  QueryParams,
  QueryResult,
  EvalParams,
  EvalResult,
} from '../../src/lib/interfaces';

const MAX_STDERR_CHARS = 12_000;

export class CodexCLIRunner implements IAgentRunner {
  private readonly model?: string;

  constructor(model = process.env.FORGE_CODEX_MODEL) {
    this.model = model || undefined;
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const prompt = [
      params.systemPrompt ? `## System instructions\n\n${params.systemPrompt}` : '',
      `## Task\n\n${params.prompt}`,
      'Return only the requested response. Do not edit files or run tools.',
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const args = [
      'exec',
      '--ephemeral',
      '--sandbox',
      'read-only',
      '--skip-git-repo-check',
      '--ignore-user-config',
      '--ignore-rules',
      '--color',
      'never',
      '-C',
      process.cwd(),
    ];
    if (this.model) args.push('--model', this.model);
    args.push('-');

    return new Promise<QueryResult>((resolve) => {
      // Codex sessions expose nesting/sandbox sentinels to child processes.
      // Forge's CLI backend intentionally creates isolated one-turn workers,
      // so do not make a child identify as the already-running host session.
      // The outer host sandbox still applies at the OS boundary.
      const childEnv = { ...process.env };
      delete childEnv.CODEX_THREAD_ID;
      delete childEnv.CODEX_SANDBOX;
      delete childEnv.CODEX_CI;

      const child = spawn('codex', args, {
        env: childEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr = (stderr + chunk).slice(-MAX_STDERR_CHARS);
      });
      child.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      child.on('close', (code) => {
        const content = stdout.trim();
        if (code === 0 && content) {
          resolve({ success: true, content });
          return;
        }
        const rawError = stderr.trim() || content || `codex exec exited with code ${code ?? 'unknown'}`;
        const recursiveSandboxHint = rawError.includes(
          'failed to initialize in-process app-server client: Operation not permitted',
        )
          ? '\nForge could not start a nested Codex worker inside this managed Codex sandbox. Use the installed forge-copywrite Codex skill, which delegates through native host subagents, or run `forge mcp` from a normal terminal.'
          : '';
        resolve({
          success: false,
          error: `${rawError}${recursiveSandboxHint}`,
        });
      });

      child.stdin.end(prompt);
    });
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const result = await this.query({
      prompt: params.evalPrompt,
      systemPrompt: 'Evaluate whether an agent should speak. Respond with one JSON object only.',
    });

    if (!result.success || !result.content) {
      return {
        success: false,
        urgency: 'pass',
        reason: result.error || 'Codex returned no evaluation',
        responseType: '',
      };
    }

    const match = result.content.match(/\{[\s\S]*\}/);
    if (!match) {
      return { success: true, urgency: 'pass', reason: 'No JSON evaluation', responseType: '' };
    }

    try {
      const parsed = JSON.parse(match[0]) as {
        urgency?: EvalResult['urgency'];
        reason?: string;
        responseType?: string;
      };
      return {
        success: true,
        urgency: parsed.urgency ?? 'pass',
        reason: parsed.reason ?? '',
        responseType: parsed.responseType ?? '',
      };
    } catch {
      return { success: true, urgency: 'pass', reason: 'Invalid JSON evaluation', responseType: '' };
    }
  }
}
