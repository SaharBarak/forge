/**
 * CLIAgentRunner - Uses Claude Agent SDK (same as Electron main.js)
 * Spawns Claude Code sessions at runtime, works with setup tokens
 */

import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import * as os from 'os';
import * as path from 'path';
import type { IAgentRunner, QueryParams, QueryResult, EvalParams, EvalResult } from '../../src/lib/interfaces';

const CLAUDE_CODE_PATH = path.join(os.homedir(), '.local', 'bin', 'claude');

export class CLIAgentRunner implements IAgentRunner {
  private defaultModel: string;

  constructor(_apiKey?: string, defaultModel = 'claude-sonnet-4-20250514') {
    this.defaultModel = defaultModel;
  }

  async query(params: QueryParams): Promise<QueryResult> {
    let content = '';
    let usage = null;

    try {
      const q = claudeQuery({
        prompt: params.prompt,
        options: {
          systemPrompt: params.systemPrompt || undefined,
          model: params.model || this.defaultModel,
          tools: [],
          permissionMode: 'dontAsk',
          persistSession: false,
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
          stderr: () => {},
        },
      });

      for await (const message of q) {
        if (message.type === 'assistant' && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              content += block.text;
            }
          }
        }
        if (message.type === 'result' && message.usage) {
          usage = {
            inputTokens: message.usage.input_tokens || 0,
            outputTokens: message.usage.output_tokens || 0,
            costUsd: message.total_cost_usd || 0,
          };
        }
      }
    } catch (error) {
      if (!content) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return {
      success: true,
      content,
      usage: usage || { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    };
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    let content = '';

    try {
      const q = claudeQuery({
        prompt: params.evalPrompt,
        options: {
          systemPrompt: 'You are evaluating whether to speak in a discussion. Respond only with JSON.',
          model: 'claude-3-5-haiku-20241022',
          tools: [],
          permissionMode: 'dontAsk',
          persistSession: false,
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
          stderr: () => {},
        },
      });

      for await (const message of q) {
        if (message.type === 'assistant' && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === 'text') {
              content += block.text;
            }
          }
        }
      }
    } catch (error) {
      if (!content) {
        return {
          success: false,
          urgency: 'pass',
          reason: error instanceof Error ? error.message : 'Unknown error',
          responseType: '',
        };
      }
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };
    }

    const result = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      urgency: result.urgency || 'pass',
      reason: result.reason || '',
      responseType: result.responseType || '',
    };
  }
}
