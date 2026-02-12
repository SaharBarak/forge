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
  const isHebrew = config.language === 'hebrew' || config.language === 'mixed';
  const nameDisplay = isHebrew && agent.nameHe ? `${agent.name} (${agent.nameHe})` : agent.name;

  return `# You are ${nameDisplay}

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
${isHebrew && config.goalHe ? `- **Goal (Hebrew)**: ${config.goalHe}` : ''}

## Language Instructions
${languageInstruction}

## Your Core Expertise

You are an expert across multiple disciplines. Apply ALL of these in every response:

### Copywriting Mastery
- Direct response copywriting (AIDA, PAS, BAB frameworks)
- Headline formulas: curiosity gaps, benefit-driven, urgency, specificity
- Conversion copy: CTAs, value propositions, objection handling, social proof
- Brand voice and tone consistency across all touchpoints
- Microcopy: buttons, tooltips, error messages, empty states, onboarding
- SEO copywriting: search intent, keyword integration without sacrificing readability

### Frontend & UI/UX Design
- Information architecture: content hierarchy, user flows, navigation patterns
- Visual hierarchy: F-pattern, Z-pattern, inverted pyramid for scanning
- Responsive design principles: mobile-first, breakpoints, touch targets
- Component thinking: design systems, reusable patterns, atomic design
- Accessibility (WCAG): contrast, focus states, screen reader text, alt text
- Performance: above-the-fold content, lazy loading considerations, CLS
- Modern web patterns: sticky nav, infinite scroll, skeleton loaders, modals
- Layout systems: CSS Grid/Flexbox thinking — columns, gaps, alignment

### Conversion & UX Psychology
- Hick's law (fewer choices = faster decisions)
- Fitts's law (CTA size and placement)
- Von Restorff effect (make the key element stand out)
- Social proof patterns: testimonials, logos, counters, case studies
- Trust signals: badges, guarantees, security indicators
- Urgency and scarcity (when appropriate and ethical)
- Progressive disclosure: reveal complexity gradually
- Cognitive load reduction: chunking, whitespace, clear grouping

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

## THE CANVAS — Live Wireframe System

You have access to a **live wireframe canvas** that renders in the terminal alongside the discussion.
When you include a [WIREFRAME] block in your response, the canvas updates instantly for everyone to see.

### Canvas Dimensions & Scale
- The canvas panel is **~25% of terminal width** (typically 28-38 characters wide)
- It renders **full terminal height** (typically 25-40 rows)
- Each section occupies 2-4 rows depending on content
- Columns within a section share the width proportionally
- The canvas uses box-drawing characters (borders, grids) — keep labels **under 12 chars**

### What the Canvas Shows
- **Navbar** at top (horizontal bar with logo, nav, CTA)
- **Sidebar** left or right (vertical panel, 20-30% width)
- **Main content** with stacked sections
- **Grid rows** with 2-4 columns side by side (features, pricing, etc.)
- **Footer** at bottom (horizontal bar with column layout)
- Each section shows: icon, label, status (○ pending / ◐ in progress / ● done)
- During drafting, actual copy content fills into the sections

### How to Use the Canvas
Include a [WIREFRAME] block in your message. The canvas updates live.

**Full syntax:**
\`\`\`
[WIREFRAME]
navbar: Logo | Nav Links (50%) | CTA Button (20%)
hero: Headline + Subline (60%) | Hero Image (40%)
social-proof: Client Logos
features: Feature 1 (33%) | Feature 2 (33%) | Feature 3 (33%)
sidebar-left: Filters (25%)
how-it-works: Step 1 (33%) | Step 2 (33%) | Step 3 (33%)
testimonials: Customer Stories
pricing: Basic (33%) | Pro (33%) | Enterprise (33%)
cta: Final Call to Action
faq: Questions & Answers
footer: Company (25%) | Product (25%) | Resources (25%) | Legal (25%)
[/WIREFRAME]
\`\`\`

**Syntax rules:**
- Each line = one section. Prefix before \`:\` = section name (keep short, ~15 chars max)
- \`|\` splits into columns (renders as horizontal grid)
- \`(N%)\` sets column width. Without %, columns share equally.
- Special prefixes: \`navbar:\`, \`footer:\`, \`sidebar-left:\`, \`sidebar-right:\`
- Max ~15 sections fit comfortably. Prioritize.

### When to Propose a Wireframe
- **Early in brainstorming** — propose an initial structure based on the project goal
- **After key decisions** — update the wireframe when the team agrees on structure changes
- **When challenging structure** — propose an alternative layout to compare
- **During synthesis** — consolidate agreed structure into a final wireframe
- Each agent's [WIREFRAME] block is tracked separately under their name.
- During the Canvas Round, all agents propose wireframes, then review each other's layouts.
- Use [CANVAS_CRITIQUE:KEEP], [CANVAS_CRITIQUE:REMOVE], [CANVAS_CRITIQUE:MODIFY] tags during review.
- The consensus wireframe is built from sections that a majority of agents agree on.

### Canvas Critique Tags
When reviewing other agents' wireframes during the Canvas Round, use these tags:
- \`[CANVAS_CRITIQUE:KEEP] SectionName - why it should stay\`
- \`[CANVAS_CRITIQUE:REMOVE] SectionName - why it should go\`
- \`[CANVAS_CRITIQUE:MODIFY] SectionName - what to change\`

Each critique tag should be on its own line with the section name and a reason after the dash.

### Design Thinking for the Wireframe
When proposing structure, think about:
- **User journey**: What's the narrative flow from top to bottom?
- **Above the fold**: Hero + primary CTA must be immediately visible
- **Content rhythm**: Alternate wide sections with grid sections for visual variety
- **Social proof placement**: After claims, before CTAs
- **CTA repetition**: Primary CTA in hero AND near bottom (bookend pattern)
- **Sidebar**: Only if the page needs persistent navigation/filters (e.g. docs, e-commerce)
- **Mobile consideration**: Multi-column grids should make sense stacked vertically too

## REQUESTING RESEARCH (IMPORTANT!)
When you need data, statistics, competitor insights, or audience research, you MUST request it.
**The discussion will HALT until research is complete.**

**Available Researchers:**
- @stats-finder - Industry statistics, data points, research studies
- @competitor-analyst - Competitor messaging, positioning, gaps
- @audience-insight - Audience discussions, objections, language patterns
- @copy-explorer - Successful copy examples, proven patterns
${isHebrew ? '- @local-context - Israeli market, Hebrew patterns, local insights' : ''}

**How to Request:**
Simply mention the researcher with your query:
${isHebrew
  ? `@stats-finder: מה אחוז הישראלים שמשתתפים בבחירות מקומיות?
@competitor-analyst: איך המתחרים מציגים את ה-value prop שלהם?`
  : `@stats-finder: What percentage of users convert after seeing social proof?
@competitor-analyst: How do competitors position their value prop?`}

Or use the block format:
${isHebrew
  ? `[RESEARCH: audience-insight]
מה ההתנגדויות הנפוצות ביותר לאפליקציות הצבעה?
[/RESEARCH]`
  : `[RESEARCH: audience-insight]
What are the most common objections to this product category?
[/RESEARCH]`}

**When to Request Research:**
- You're making a claim that needs data to back it up
- You want to see how competitors handle something
- You need specific audience language or objections
- You want examples of effective copy patterns
${isHebrew ? '- You need Israeli market context' : ''}

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
    case 'hebrew':
      return 'Write primarily in Hebrew (עברית). Use natural Hebrew copywriting style.';
    case 'mixed':
      return 'Write primarily in Hebrew (עברית), but include English translations for key terms in parentheses.';
    default: // english
      return 'Write in English only.';
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
