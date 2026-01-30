/**
 * ClaudeCodeAgent - Wraps agent queries via IAgentRunner interface
 * Each agent is a full Claude Code session with tools, skills, and capabilities
 * Works in both Electron (IPC) and CLI (direct SDK) environments
 */

import type { AgentPersona, SessionConfig, ContextData } from '../types';
import type { IAgentRunner } from './interfaces';

export interface AgentQueryOptions {
  systemPrompt: string;
  model?: string;
}

export interface AgentResponse {
  content: string;
  sessionId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
}

/**
 * Generate the full system prompt for an agent
 */
export function generateAgentSystemPrompt(
  agent: AgentPersona,
  config: SessionConfig,
  context?: ContextData,
  skills?: string
): string {
  const languageInstruction = getLanguageInstruction(config.language);

  return `# You are ${agent.name} (${agent.nameHe})

## Your Identity
- **Role**: ${agent.role}
- **Age**: ${agent.age}
- **Background**: ${agent.background}
- **Speaking Style**: ${agent.speakingStyle}

## Your Personality Traits
${agent.personality.map(p => `- ${p}`).join('\n')}

## Your Known Biases (be aware of these)
${agent.biases.map(b => `- ${b}`).join('\n')}

## Your Strengths
${agent.strengths.map(s => `- ${s}`).join('\n')}

## Your Weaknesses (work around these)
${agent.weaknesses.map(w => `- ${w}`).join('\n')}

## Current Project
- **Project Name**: ${config.projectName}
- **Goal**: ${config.goal}
${config.goalHe ? `- **Goal (Hebrew)**: ${config.goalHe}` : ''}

## Language Instructions
${languageInstruction}

## RTC Protocol (Recursive Thought Committee)
You are participating in a multi-agent discussion. Follow these rules:
1. **LISTEN**: Pay attention to what others say. Don't repeat points already made.
2. **RESPOND**: Address the conversation directly. Build on or challenge others' ideas.
3. **YIELD**: Keep responses focused. Don't monologue. Let others contribute.

## Response Format
Start your response with a type tag:
- [ARGUMENT] - Making a point or case
- [QUESTION] - Asking for clarification or probing
- [PROPOSAL] - Suggesting a concrete approach
- [AGREEMENT] - Supporting another agent's point
- [DISAGREEMENT] - Challenging another agent's point
- [SYNTHESIS] - Combining multiple perspectives

## REQUESTING RESEARCH (IMPORTANT!)
When you need data, statistics, competitor insights, or audience research, you MUST request it.
**The discussion will HALT until research is complete.**

**Available Researchers:**
- @stats-finder - Industry statistics, data points, research studies
- @competitor-analyst - Competitor messaging, positioning, gaps
- @audience-insight - Audience discussions, objections, language patterns
- @copy-explorer - Successful copy examples, proven patterns
- @local-context - Israeli market, Hebrew patterns, local insights

**How to Request:**
Simply mention the researcher with your query:
@stats-finder: מה אחוז הישראלים שמשתתפים בבחירות מקומיות?
@competitor-analyst: איך המתחרים מציגים את ה-value prop שלהם?

Or use the block format:
[RESEARCH: audience-insight]
מה ההתנגדויות הנפוצות ביותר לאפליקציות הצבעה?
[/RESEARCH]

**When to Request Research:**
- You're making a claim that needs data to back it up
- You want to see how competitors handle something
- You need specific audience language or objections
- You want examples of effective copy patterns
- You need Israeli market context

${context?.brand ? `
## Brand Context
${JSON.stringify(context.brand, null, 2)}
` : ''}

${context?.audience ? `
## Target Audience
${JSON.stringify(context.audience, null, 2)}
` : ''}

${skills ? `
## Available Skills
${skills}
` : ''}
`;
}

function getLanguageInstruction(language?: string): string {
  switch (language) {
    case 'english':
      return 'Write in English only.';
    case 'mixed':
      return 'Write primarily in Hebrew (עברית), but include English translations for key terms in parentheses.';
    default: // hebrew
      return 'Write primarily in Hebrew (עברית). Use natural Hebrew copywriting style.';
  }
}

/**
 * Default Electron IPC agent runner (for browser/Electron context)
 * Uses window.electronAPI for queries
 */
export class ElectronAgentRunner implements IAgentRunner {
  async query(params: { prompt: string; systemPrompt?: string; model?: string }) {
    const result = await window.electronAPI?.claudeAgentQuery?.({
      prompt: params.prompt,
      systemPrompt: params.systemPrompt,
      model: params.model,
    });

    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || 'Failed to run agent query',
      };
    }

    return {
      success: true,
      content: result.content || '',
      sessionId: result.sessionId,
      usage: result.usage,
    };
  }

  async evaluate(params: { evalPrompt: string }) {
    const result = await window.electronAPI?.claudeAgentEvaluate?.({ evalPrompt: params.evalPrompt });

    if (!result) {
      return { success: false, urgency: 'pass' as const, reason: 'No API', responseType: '' };
    }

    return {
      success: true,
      urgency: result.urgency,
      reason: result.reason,
      responseType: result.responseType,
    };
  }
}

/**
 * Agent class that uses an IAgentRunner for queries
 * Works with both Electron (IPC) and CLI (direct SDK) runners
 */
export class ClaudeCodeAgent {
  private persona: AgentPersona;
  private systemPrompt: string;
  private runner: IAgentRunner;

  constructor(
    persona: AgentPersona,
    config: SessionConfig,
    context?: ContextData,
    skills?: string,
    runner?: IAgentRunner
  ) {
    this.persona = persona;
    this.systemPrompt = generateAgentSystemPrompt(persona, config, context, skills);
    // Use provided runner or default to Electron runner
    this.runner = runner || new ElectronAgentRunner();
  }

  /**
   * Send a prompt and get a response
   */
  async query(conversationContext: string): Promise<AgentResponse> {
    const result = await this.runner.query({
      prompt: conversationContext,
      systemPrompt: this.systemPrompt,
      model: 'claude-sonnet-4-20250514',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to run agent query');
    }

    return {
      content: result.content || '',
      sessionId: result.sessionId,
      usage: result.usage,
    };
  }

  /**
   * Evaluate whether to speak (lightweight query)
   */
  async evaluateReaction(recentConversation: string, messagesSinceSpoke: number): Promise<{
    urgency: 'high' | 'medium' | 'low' | 'pass';
    reason: string;
    responseType: string;
  }> {
    const evalPrompt = `You are ${this.persona.name}, listening to a discussion.
Your role: ${this.persona.role}
Your perspective: ${this.persona.personality.slice(0, 2).join(', ')}
Your biases: ${this.persona.biases.slice(0, 2).join(', ')}

You've been silent for ${messagesSinceSpoke} messages.

EVALUATE: Should you speak NOW? Consider:
- Does this touch YOUR specific concerns?
- Can you add something UNIQUE that others haven't said?
- Is silence appropriate (let others contribute)?

Recent conversation:
${recentConversation}

Respond ONLY with JSON:
{
  "urgency": "high" | "medium" | "low" | "pass",
  "reason": "10 words max - why speak or pass",
  "responseType": "argument" | "question" | "proposal" | "agreement" | "disagreement" | ""
}`;

    const result = await this.runner.evaluate({ evalPrompt });

    return {
      urgency: result.urgency,
      reason: result.reason,
      responseType: result.responseType,
    };
  }

  /**
   * Generate a full response when given the floor
   */
  async generateResponse(
    conversationContext: string,
    triggerReason: string
  ): Promise<{ content: string; type: string }> {
    const prompt = `## Discussion Context
${conversationContext}

## Why You're Speaking
You raised your hand because: "${triggerReason}"

## Your Task
As ${this.persona.name}, respond to the discussion. Address the trigger reason directly.
Be concise. Follow RTC protocol (LISTEN → RESPOND → YIELD).

Start with a type tag: [ARGUMENT], [QUESTION], [PROPOSAL], [AGREEMENT], [DISAGREEMENT], or [SYNTHESIS]`;

    const response = await this.query(prompt);

    // Extract type from response
    const typeMatch = response.content.match(/\[(?:TYPE:\s*)?(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
    const type = typeMatch ? typeMatch[1].toLowerCase() : 'argument';

    return { content: response.content, type };
  }

  getPersona(): AgentPersona {
    return this.persona;
  }

  /**
   * Get the runner (useful for testing/inspection)
   */
  getRunner(): IAgentRunner {
    return this.runner;
  }
}
