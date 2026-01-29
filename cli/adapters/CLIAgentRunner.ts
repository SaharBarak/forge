/**
 * CLIAgentRunner - Direct Claude SDK integration for CLI
 * Runs Claude queries without going through Electron IPC
 */

import Anthropic from '@anthropic-ai/sdk';
import type { IAgentRunner, QueryParams, QueryResult, EvalParams, EvalResult } from '../../src/lib/interfaces';

export class CLIAgentRunner implements IAgentRunner {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, defaultModel = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.defaultModel = defaultModel;
  }

  async query(params: QueryParams): Promise<QueryResult> {
    try {
      const response = await this.client.messages.create({
        model: params.model || this.defaultModel,
        max_tokens: 2048,
        system: params.systemPrompt || '',
        messages: [
          {
            role: 'user',
            content: params.prompt,
          },
        ],
      });

      const content = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      return {
        success: true,
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUsd: this.estimateCost(response.usage.input_tokens, response.usage.output_tokens),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514', // Use faster model for evaluations
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: params.evalPrompt,
          },
        ],
      });

      const text = response.content[0].type === 'text'
        ? response.content[0].text
        : '{}';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          urgency: 'pass',
          reason: 'Failed to parse response',
          responseType: '',
        };
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        urgency: result.urgency || 'pass',
        reason: result.reason || '',
        responseType: result.responseType || '',
      };
    } catch (error) {
      return {
        success: false,
        urgency: 'pass',
        reason: error instanceof Error ? error.message : 'Unknown error',
        responseType: '',
      };
    }
  }

  private estimateCost(inputTokens: number, outputTokens: number): number {
    // Sonnet pricing (approximate)
    const inputCost = (inputTokens / 1_000_000) * 3;
    const outputCost = (outputTokens / 1_000_000) * 15;
    return inputCost + outputCost;
  }
}
