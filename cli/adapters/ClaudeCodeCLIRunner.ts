/**
 * ClaudeCodeCLIRunner — IAgentRunner backed by @anthropic-ai/claude-agent-sdk.
 *
 * Shells out to the authenticated `claude` CLI binary, reusing existing
 * Claude Code OAuth credentials. No ANTHROPIC_API_KEY required.
 *
 * This mirrors the approach Electron's main process uses (see
 * electron/main.js claude-agent:query handler) but runs in-process for
 * the CLI instead of behind IPC.
 *
 * Preferred over CLIAgentRunner for the CLI-first architecture.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { execFileSync } from 'node:child_process';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import type {
  IAgentRunner,
  QueryParams,
  QueryResult,
  EvalParams,
  EvalResult,
} from '../../src/lib/interfaces';

function resolveClaudeCodePath(): string {
  if (process.env.CLAUDE_CODE_PATH) return process.env.CLAUDE_CODE_PATH;

  const candidates = [
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    const locator = process.platform === 'win32' ? 'where' : 'which';
    const located = execFileSync(locator, ['claude'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .find(Boolean);
    if (located) return located;
  } catch {
    // Let the SDK surface the normal executable-not-found error below.
  }
  return 'claude';
}

const CLAUDE_CODE_PATH = resolveClaudeCodePath();
// Despite its historical `_DIR` name, Claude Code currently treats this
// environment variable as the full debug-log file path.
const CLAUDE_DEBUG_LOG_FILE =
  process.env.CLAUDE_CODE_DEBUG_LOGS_DIR ||
  path.join(os.tmpdir(), 'forge-claude-debug', `claude-sdk-${process.pid}.log`);
fs.mkdirSync(path.dirname(CLAUDE_DEBUG_LOG_FILE), { recursive: true });
// The SDK's own buffered logger reads this from the parent process after a
// query completes. Set it once so managed/read-only home directories do not
// turn a successful response into a delayed EPERM crash.
process.env.CLAUDE_CODE_DEBUG_LOGS_DIR = CLAUDE_DEBUG_LOG_FILE;

function stableModelAlias(model: string): string | undefined {
  if (model === 'sonnet' || model === 'haiku' || model === 'opus' || model === 'fable') {
    return undefined;
  }
  if (model.includes('haiku')) return 'haiku';
  if (model.includes('opus')) return 'opus';
  if (model.includes('fable')) return 'fable';
  if (model.includes('sonnet')) return 'sonnet';
  return undefined;
}

function isUnavailableModelResult(result: QueryResult): boolean {
  const text = `${result.error || ''}\n${result.content || ''}`;
  return /selected model|model.+(?:may not exist|not exist|not available)|do not have access/i.test(text);
}

export class ClaudeCodeCLIRunner implements IAgentRunner {
  private readonly defaultModel: string;
  private readonly evalModel: string;
  private readonly unavailableModels = new Set<string>();

  constructor(
    defaultModel = 'claude-sonnet-4-20250514',
    evalModel = 'claude-3-5-haiku-20241022'
  ) {
    this.defaultModel = defaultModel;
    this.evalModel = evalModel;
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const requestedModel = params.model || this.defaultModel;
    const knownFallback = this.unavailableModels.has(requestedModel)
      ? stableModelAlias(requestedModel)
      : undefined;
    if (knownFallback) return this.queryWithTransientRetry(params, knownFallback);

    const first = await this.queryWithTransientRetry(params, requestedModel);
    if (!isUnavailableModelResult(first)) return first;

    const fallback = stableModelAlias(requestedModel);
    if (!fallback) return first;
    this.unavailableModels.add(requestedModel);
    console.warn(
      `[ClaudeCodeCLIRunner] Model ${requestedModel} is unavailable; retrying with the stable ${fallback} alias.`,
    );
    return this.queryWithTransientRetry(params, fallback);
  }

  private async queryWithTransientRetry(
    params: QueryParams,
    model: string,
  ): Promise<QueryResult> {
    const first = await this.queryWithModel(params, model);
    if (
      first.success ||
      isUnavailableModelResult(first) ||
      !/process exited with code 1|terminated by signal/i.test(first.error || '')
    ) {
      return first;
    }

    console.warn(
      `[ClaudeCodeCLIRunner] Claude worker exited before returning content; retrying ${model} once.`,
    );
    return this.queryWithModel(params, model);
  }

  private async queryWithModel(params: QueryParams, model: string): Promise<QueryResult> {
    let content = '';
    let sessionId: string | undefined;
    let usage: { inputTokens: number; outputTokens: number; costUsd: number } | undefined;

    try {
      // Claude Code refuses to start a nested session while CLAUDECODE is
      // present. Forge intentionally launches isolated one-turn workers from
      // its plugin/MCP host, so strip only the nesting sentinel while keeping
      // the operator's normal OAuth/provider environment intact.
      const childEnv = { ...process.env };
      delete childEnv.CLAUDECODE;
      childEnv.CLAUDE_CODE_DEBUG_LOGS_DIR = CLAUDE_DEBUG_LOG_FILE;

      const q = claudeQuery({
        prompt: params.prompt,
        options: {
          systemPrompt: params.systemPrompt || undefined,
          model,
          permissionMode: 'bypassPermissions',
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
          env: childEnv,
          allowDangerouslySkipPermissions: true,
          stderr: (data) => {
            // Suppress routine stderr; only log anomalies
            const text = typeof data === 'string' ? data : String(data);
            if (!text.trim()) return;
            if (text.includes('[DEBUG]') || text.includes('INFO')) return;
            console.error('[claude sdk]', text.trim());
          },
        },
      });

      for await (const message of q) {
        if ('session_id' in message && typeof message.session_id === 'string') {
          sessionId = message.session_id;
        }

        if (message.type === 'assistant' && 'message' in message) {
          const msg = (message as unknown as { message: { content: unknown[] } }).message;
          if (msg?.content && Array.isArray(msg.content)) {
            for (const block of msg.content) {
              const b = block as { type: string; text?: string };
              if (b.type === 'text' && b.text) {
                content += b.text;
              }
            }
          }
        }

        if (message.type === 'result') {
          const result = message as unknown as {
            usage?: { input_tokens?: number; output_tokens?: number };
            total_cost_usd?: number;
          };
          if (result.usage) {
            usage = {
              inputTokens: result.usage.input_tokens || 0,
              outputTokens: result.usage.output_tokens || 0,
              costUsd: result.total_cost_usd || 0,
            };
          }
        }
      }
    } catch (error) {
      // SDK sometimes throws during cleanup after successful completion. Only
      // preserve content when it is not Claude's model-selection error text.
      if (content) {
        if (isUnavailableModelResult({ success: true, content })) {
          return { success: false, error: content, sessionId, usage };
        }
        return { success: true, content, sessionId, usage };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    const result = { success: true, content, sessionId, usage } satisfies QueryResult;
    if (isUnavailableModelResult(result)) {
      return {
        success: false,
        error: content || `Claude model ${model} is unavailable.`,
        sessionId,
        usage,
      };
    }
    return result;
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    const queryResult = await this.query({
      prompt: params.evalPrompt,
      systemPrompt: 'You are evaluating whether to speak in a discussion. Respond only with JSON.',
      model: this.evalModel,
    });

    if (!queryResult.success || !queryResult.content) {
      return {
        success: false,
        urgency: 'pass',
        reason: queryResult.error || 'No response',
        responseType: '',
      };
    }

    const jsonMatch = queryResult.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as {
        urgency?: string;
        reason?: string;
        responseType?: string;
      };
      return {
        success: true,
        urgency: (parsed.urgency as EvalResult['urgency']) || 'pass',
        reason: parsed.reason || '',
        responseType: parsed.responseType || '',
      };
    } catch {
      return { success: true, urgency: 'pass', reason: 'Parse error', responseType: '' };
    }
  }
}
