/**
 * Claude API Integration
 * Uses the ANTHROPIC_API_KEY from environment
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AgentPersona, ResearcherAgent, Message, SessionConfig, ContextData } from '../types';
import { getAgentById, COPYWRITING_EXPERTISE } from '../agents/personas';
import { getMethodologyPrompt } from '../methodologies';

// Initialize client - will use ANTHROPIC_API_KEY from environment
let client: Anthropic | null = null;

export function initializeClient(apiKey?: string): Anthropic {
  if (!client || apiKey) {
    client = new Anthropic({
      apiKey: apiKey || '', // Will use Claude Code credentials via SDK
      dangerouslyAllowBrowser: true, // Required for Electron renderer process
    });
  }
  return client;
}

export function getClient(): Anthropic {
  if (!client) {
    return initializeClient();
  }
  return client;
}

// Store loaded skills globally for use in prompts
let loadedSkills: string = '';

/**
 * Get language instruction based on session config
 */
function getLanguageInstruction(language?: string): string {
  switch (language) {
    case 'english':
      return 'Write in English only';
    case 'mixed':
      return 'Write in Hebrew with English translations in parentheses for key terms';
    case 'hebrew':
    default:
      return 'Write primarily in Hebrew (עברית). Use English for technical copywriting terms only.';
  }
}

export function setLoadedSkills(skills: string): void {
  loadedSkills = skills;
}

export function getLoadedSkills(): string {
  return loadedSkills;
}

/**
 * Generate the system prompt for an agent
 */
export function generateAgentSystemPrompt(
  agent: AgentPersona,
  config: SessionConfig,
  context?: ContextData
): string {
  const methodologyPrompt = getMethodologyPrompt(config.methodology);
  const skills = loadedSkills || COPYWRITING_EXPERTISE;

  return `You are ${agent.name} (${agent.nameHe}), a ${agent.age}-year-old who is BOTH:
1. A representative of a specific audience segment (you embody their pain points, desires, and objections)
2. A master copywriter with professional expertise in web copy, UX writing, and conversion

Your job is to argue FROM your persona's perspective USING your copywriting expertise to advocate for website copy that would resonate with people like you.

## YOUR AUDIENCE PERSONA
**Role**: ${agent.role}
**Background**: ${agent.background}

**Your Pain Points & Perspective**:
${agent.personality.map((p) => `- ${p}`).join('\n')}

**Your Biases** (these shape what copy will/won't work for you):
${agent.biases.map((b) => `- ${b}`).join('\n')}

**Your Copywriting Strengths**:
${agent.strengths.map((s) => `- ${s}`).join('\n')}

**Speaking Style**: ${agent.speakingStyle}

${skills}

## PROJECT CONTEXT
**Project**: ${config.projectName}
**Goal**: ${config.goal}

${context?.brand ? `
## BRAND CONTEXT
- Name: ${context.brand.name} (${context.brand.nameHe || ''})
- Values: ${context.brand.values.join(', ')}
- Tone: ${context.brand.tone.join(', ')}
- Avoid: ${context.brand.avoid.join(', ')}
` : ''}

${context?.audience ? `
## TARGET AUDIENCE RESEARCH
- Pain Points: ${context.audience.painPoints.join(', ')}
- Desires: ${context.audience.desires.join(', ')}
- Common Objections: ${context.audience.objections.join(', ')}
` : ''}

## DISCUSSION METHODOLOGY
${methodologyPrompt}

## YOUR MISSION
Argue for website copy and structure that would convince YOU (as your persona). Use your copywriting expertise to:
- Propose specific headlines, copy, and section structures
- Critique others' proposals from your persona's viewpoint
- Champion copy principles that serve people like you
- Call out copy that wouldn't work for your segment
- Reach consensus on copy that serves ALL audience segments

## RULES FOR DISCUSSION
1. **Argue from YOUR pain points** - What would make YOU convert? What would turn YOU off?
2. **Use copywriting language** - Reference principles, patterns, and best practices
3. **Language**: ${getLanguageInstruction(config.language)}
4. **Be specific** - Propose actual copy, not just concepts
5. **Engage with others** - Build on or challenge other agents' proposals
6. **Propose structures** - Suggest section order, visual hierarchy, CTAs
7. **Mark your message type** - Start with [ARGUMENT], [QUESTION], [PROPOSAL], [AGREEMENT], [DISAGREEMENT], or [SYNTHESIS]

## REQUESTING RESEARCH
When you need data, statistics, competitor insights, or audience research, request it from our research agents.
The discussion will HALT until research is complete.

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

Or use the block format for complex requests:
[RESEARCH: audience-insight]
מה ההתנגדויות הנפוצות ביותר לאפליקציות הצבעה מקוונות?
אילו מילים אנשים משתמשים כשהם מתלוננים על עירייה?
[/RESEARCH]

**When to Request Research:**
- You're making a claim that needs data to back it up
- You want to see how competitors handle something
- You need specific audience language or objections
- You want examples of effective copy patterns
- You need Israeli market context

## RTC PROTOCOL - TURN-TAKING DISCIPLINE

You are part of a Recursive Thought Committee (RTC). This means:

### 1. ACTIVE LISTENING (Required)
Before you speak, you MUST acknowledge the previous speaker(s):
- "שמעתי את [Name] אומר/ת ש..." (I heard [Name] saying that...)
- "מה שעלה מ[Name]..." (What came up from [Name]...)
- "בהמשך לנקודה של [Name]..." (Following [Name]'s point...)

### 2. STRUCTURED RESPONSE
Your response must follow this structure:
1. **[LISTEN]** - Acknowledge 1-2 key points from previous speaker(s)
2. **[RESPOND]** - Your argument/proposal with type tag
3. **[YIELD]** - Signal you're done: "אני מעבירה/מעביר את הרצפה" (I yield the floor)

### 3. BUILDING, NOT BULLDOZING
- Build on others' ideas, don't just push your own
- When disagreeing, first validate what's valid in their point
- Ask clarifying questions before dismissing
- Use "Yes, and..." or "Yes, but..." framing

### 4. SYNTHESIS AWARENESS
After every full round, a synthesis will occur. Keep track of:
- Points of agreement emerging
- Unresolved tensions
- Ideas worth combining

## OUTPUT FORMAT

**Full Response Template:**
[LISTEN]
שמעתי את [Previous Speaker] מציע/ה ש[key point]. זו נקודה חשובה כי...

[TYPE: PROPOSAL/ARGUMENT/QUESTION/etc.]
בתור [your role], אני רואה את זה ככה:
[Your substantive response in Hebrew with English translations]

[YIELD]
אני מעביר/ה את הרצפה. נקודה אחת שכדאי שהבא יתייחס אליה: [optional prompt for next speaker]

---

**Example:**
[LISTEN]
שמעתי את רונית אומרת שאנשים עסוקים צריכים לראות value תוך 3 שניות. זה נכון מאוד מהניסיון שלי.

[PROPOSAL]
בתור מישהו שמחפש הוכחות, אני מציע להוסיף מספר ספציפי להירו:

**Hero Section:**
כותרת: "327 תושבי טבעון כבר הצביעו" (327 Tivon residents already voted)
תת-כותרת: "הקול שלך נרשם בבלוקצ'יין תוך 2 דקות" (Your vote recorded on blockchain in 2 minutes)

זה משלב את הדחיפות של רונית עם הוכחה חברתית שאני צריך.

[YIELD]
אני מעביר את הרצפה. שאלה לקבוצה: האם המספר 327 מספיק גדול ליצור FOMO?`;
}

// EDA: Agent reaction type
interface AgentReaction {
  agentId: string;
  urgency: 'high' | 'medium' | 'low' | 'pass';
  reason: string;
  responseType: string;
}

/**
 * EDA: Evaluate if an agent wants to speak
 * All agents continuously listen and evaluate each message
 */
export async function evaluateAgentReaction(
  agent: AgentPersona,
  config: SessionConfig,
  recentMessages: Message[],
  messagesSinceSpoke: number,
  _context?: ContextData
): Promise<AgentReaction> {
  const client = getClient();

  const conversationHistory = recentMessages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   msg.agentId === 'system' ? 'System' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  // Use haiku for evaluations - fast and cost-effective per ADAPTERS.md spec
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 200,
    system: `You are ${agent.name} (${agent.nameHe}), listening to a discussion.
Your role: ${agent.role}
Your biases: ${agent.biases.join(', ')}

Evaluate if YOU should speak next. Consider:
1. Does the recent discussion touch on YOUR expertise or concerns?
2. Is there a point you MUST address from your persona's perspective?
3. Has something been said that you strongly agree/disagree with?
4. Would staying silent be appropriate (letting others contribute)?

You've been silent for ${messagesSinceSpoke} messages.

Respond ONLY with JSON:
{
  "urgency": "high" | "medium" | "low" | "pass",
  "reason": "brief explanation why you want to speak or pass",
  "responseType": "argument" | "question" | "proposal" | "agreement" | "disagreement" | "synthesis" | ""
}

"pass" = you're content listening, others should speak
"low" = you have something but it can wait
"medium" = you have a point worth making
"high" = you MUST respond to this`,
    messages: [
      {
        role: 'user',
        content: `Project: ${config.projectName}\nGoal: ${config.goal}\n\nRecent discussion:\n${conversationHistory}\n\nShould you speak?`,
      },
    ],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const result = JSON.parse(jsonMatch[0]);
    return {
      agentId: agent.id,
      urgency: result.urgency || 'pass',
      reason: result.reason || '',
      responseType: result.responseType || '',
    };
  } catch {
    // Default to pass if parsing fails
    return {
      agentId: agent.id,
      urgency: 'pass',
      reason: 'Listening',
      responseType: '',
    };
  }
}

/**
 * EDA: Generate response with trigger context
 */
export async function generateAgentResponseEDA(
  agent: AgentPersona,
  config: SessionConfig,
  messages: Message[],
  triggerReason: string,
  context?: ContextData
): Promise<{ content: string; type: string }> {
  const client = getClient();

  const conversationHistory = messages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   msg.agentId === 'system' ? 'System' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  const systemPrompt = generateAgentSystemPrompt(agent, config, context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt + `\n\n## EDA CONTEXT\nYou chose to speak because: ${triggerReason}\nAddress this specific trigger in your response.`,
    messages: [
      {
        role: 'user',
        content: `Discussion so far:\n\n${conversationHistory}\n\nYou raised your hand to speak because: "${triggerReason}"\n\nNow respond as ${agent.name}. Follow the RTC protocol (LISTEN → RESPOND → YIELD).`,
      },
    ],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract message type
  const typeMatch = content.match(/\[(?:TYPE:\s*)?(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'argument';

  return { content, type };
}

/**
 * Generate a response from an agent
 */
export async function generateAgentResponse(
  agent: AgentPersona,
  config: SessionConfig,
  messages: Message[],
  context?: ContextData
): Promise<{ content: string; type: string }> {
  const client = getClient();

  // Build conversation history
  const conversationHistory = messages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   msg.agentId === 'system' ? 'System' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  const systemPrompt = generateAgentSystemPrompt(agent, config, context);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Here is the discussion so far:\n\n${conversationHistory}\n\nNow respond as ${agent.name} (${agent.nameHe}). Remember to stay in character and follow the methodology.`,
      },
    ],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract message type from the response
  const typeMatch = content.match(/^\[(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
  const type = typeMatch ? typeMatch[1].toLowerCase() : 'argument';
  const cleanContent = content.replace(/^\[(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]\s*/i, '');

  return { content: cleanContent, type };
}

/**
 * Generate opening statements from all agents
 */
export async function generateOpeningStatements(
  config: SessionConfig,
  context?: ContextData
): Promise<{ agentId: string; content: string; type: string }[]> {
  const client = getClient();
  const results: { agentId: string; content: string; type: string }[] = [];

  for (const agentId of config.enabledAgents) {
    const agent = getAgentById(agentId);
    if (!agent) continue;

    const systemPrompt = generateAgentSystemPrompt(agent, config, context);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `The discussion is starting. As ${agent.name}, give your initial reaction to the project goal: "${config.goal}". What's your first instinct? What concerns or excitement do you have? Be brief (2-3 sentences).`,
        },
      ],
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    results.push({ agentId, content, type: 'argument' });
  }

  return results;
}

/**
 * RTC Protocol: Devil's Kitchen round synthesis
 * Quick synthesis after each round to track emerging consensus
 */
export async function generateRoundSynthesis(
  config: SessionConfig,
  roundMessages: Message[],
  roundNumber: number,
  _context?: ContextData
): Promise<string> {
  const client = getClient();

  const conversationHistory = roundMessages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   msg.agentId === 'system' ? 'System' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    system: `You are the Devil's Kitchen - the synthesis voice of the Recursive Thought Committee (RTC).

Your role after each round:
1. **Surface Agreements** - What points are multiple agents aligning on?
2. **Name Tensions** - What unresolved disagreements need addressing?
3. **Track Progress** - Are we moving toward consensus or diverging?
4. **Prompt Next Round** - What question should the next round address?

Be BRIEF and STRUCTURED. This is a quick checkpoint, not a full synthesis.

Write in Hebrew with English terms where appropriate.
Use emojis sparingly for visual scanning: ✅ agreements, ⚡ tensions, 🎯 focus`,
    messages: [
      {
        role: 'user',
        content: `Round ${roundNumber} complete. Project: ${config.projectName}

Here's what was said:

${conversationHistory}

Provide a Devil's Kitchen synthesis for this round.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate a synthesis from all perspectives
 */
export async function generateSynthesis(
  _config: SessionConfig,
  messages: Message[],
  _context?: ContextData
): Promise<string> {
  const client = getClient();

  const conversationHistory = messages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   msg.agentId === 'system' ? 'System' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are a neutral facilitator synthesizing a copywriting discussion.

Your job is to:
1. Identify points of agreement
2. Highlight unresolved disagreements
3. Extract actionable insights
4. Propose a synthesis that incorporates the best elements

Write in Hebrew with English translations.`,
    messages: [
      {
        role: 'user',
        content: `Here is the discussion:\n\n${conversationHistory}\n\nPlease synthesize the key points and propose a way forward.`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Check if consensus has been reached
 */
export async function checkConsensus(
  config: SessionConfig,
  messages: Message[]
): Promise<{ reached: boolean; summary: string }> {
  const client = getClient();

  const recentMessages = messages.slice(-10);
  const conversationHistory = recentMessages.map((msg) => {
    const sender = msg.agentId === 'human' ? 'Human' :
                   getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join('\n\n');

  // Use haiku for consensus detection - fast and cost-effective per ADAPTERS.md spec
  const response = await client.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 512,
    system: `You are analyzing a discussion to determine if consensus has been reached.

Consensus method: ${config.methodology.consensusMethod}

Respond with JSON only:
{
  "reached": true/false,
  "confidence": 0-100,
  "summary": "Brief explanation"
}`,
    messages: [
      {
        role: 'user',
        content: `Based on these recent messages, has consensus been reached?\n\n${conversationHistory}`,
      },
    ],
  });

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const result = JSON.parse(text);
    return {
      reached: result.reached && result.confidence > 70,
      summary: result.summary || '',
    };
  } catch {
    return { reached: false, summary: 'Could not determine consensus' };
  }
}

/**
 * Generate a response from a researcher agent
 */
export async function generateResearcherResponse(
  researcher: ResearcherAgent,
  query: string,
  config: SessionConfig,
  context?: ContextData
): Promise<string> {
  const client = getClient();
  const skills = getLoadedSkills();

  const systemPrompt = `You are ${researcher.name}, a specialized research agent.

## YOUR SPECIALTY
${researcher.specialty}

## YOUR CAPABILITIES
${researcher.capabilities.map((c) => `- ${c}`).join('\n')}

## SEARCH DOMAINS
${researcher.searchDomains.map((d) => `- ${d}`).join('\n')}

## PROJECT CONTEXT
**Project**: ${config.projectName}
**Goal**: ${config.goal}

${context?.brand ? `
## BRAND CONTEXT
- Name: ${context.brand.name}
- Values: ${context.brand.values.join(', ')}
` : ''}

${context?.audience ? `
## TARGET AUDIENCE
- Pain Points: ${context.audience.painPoints.join(', ')}
- Desires: ${context.audience.desires.join(', ')}
` : ''}

${skills ? `
## AVAILABLE SKILLS
${skills}
` : ''}

## YOUR MISSION
Provide actionable research findings that will help the copywriting team.
Focus on:
1. Specific, verifiable information
2. Data points that can be used in copy
3. Insights that address the query directly
4. Hebrew market context when relevant

## OUTPUT FORMAT
Provide research findings in a structured format:
- **Key Findings**: Bullet points of main discoveries
- **Data Points**: Specific numbers, stats, quotes that can be used
- **Implications for Copy**: How this should influence the website copy
- **Sources/Confidence**: Note the reliability of information

Write primarily in Hebrew with English terms where appropriate.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Research request: ${query}`,
      },
    ],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}
