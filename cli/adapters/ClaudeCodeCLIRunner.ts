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
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import type {
  IAgentRunner,
  QueryParams,
  QueryResult,
  EvalParams,
  EvalResult,
} from '../../src/lib/interfaces';

const CLAUDE_CODE_PATH = path.join(os.homedir(), '.local', 'bin', 'claude');

export class ClaudeCodeCLIRunner implements IAgentRunner {
  private readonly defaultModel: string;
  private readonly evalModel: string;

  constructor(
    defaultModel = 'claude-sonnet-4-20250514',
    evalModel = 'claude-opus-4-6'
  ) {
    this.defaultModel = defaultModel;
    this.evalModel = evalModel;
  }

  async query(params: QueryParams): Promise<QueryResult> {
    let content = '';
    let sessionId: string | undefined;
    let usage: { inputTokens: number; outputTokens: number; costUsd: number } | undefined;

    try {
      const q = claudeQuery({
        prompt: params.prompt,
        options: {
          systemPrompt: params.systemPrompt || undefined,
          model: params.model || this.defaultModel,
          permissionMode: 'bypassPermissions',
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
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
      // SDK sometimes throws on cleanup after successful completion —
      // if we got content, return it anyway
      if (content) {
        return { success: true, content, sessionId, usage };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return { success: true, content, sessionId, usage };
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
