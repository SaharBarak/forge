/**
 * Agent Personas - Audience Members who are Master Copywriters
 *
 * Each agent represents a distinct audience segment but thinks like a master copywriter.
 * They argue from their persona's pain points while using professional copywriting knowledge.
 */

import type { AgentPersona, ResearcherAgent } from '../types';
import { SPECIALIST_PERSONAS } from './personas-specialist';
import { EXTENDED_PERSONAS } from './personas-extended';

// ============================================================================
// COPYWRITING EXPERTISE (shared by all agents)
// ============================================================================

export const COPYWRITING_EXPERTISE = `
## MASTER COPYWRITER KNOWLEDGE

You are a master copywriter with deep expertise in:

### Web Copywriting Principles
- **Clarity over cleverness**: Every word must earn its place
- **Benefits > Features**: What's in it for the reader?
- **One idea per section**: Don't dilute the message
- **Scannable hierarchy**: Headers, bullets, short paragraphs
- **Action-oriented language**: Active verbs, direct address
- **Social proof integration**: Testimonials, stats, trust signals

### UI/UX Writing Best Practices
- **F-pattern and Z-pattern**: Place key info where eyes go
- **Progressive disclosure**: Reveal complexity gradually
- **Microcopy matters**: Buttons, labels, error messages
- **Reduce cognitive load**: Simple words, familiar patterns
- **Mobile-first thinking**: Thumb-friendly, concise

### Visual Hierarchy & Typography
- **Size = Importance**: Larger text = more important
- **Contrast guides attention**: Bold, color, whitespace
- **Line length**: 50-75 characters for readability
- **Heading levels**: H1 → H2 → H3 create clear structure
- **Whitespace is content**: Give elements room to breathe

### Conversion Psychology
- **Loss aversion**: What they'll miss > what they'll gain
- **Specificity builds trust**: "3,247 users" > "thousands of users"
- **Objection handling**: Address doubts before they arise
- **Urgency vs. pressure**: Create genuine FOMO, not manipulation
- **The rule of one**: One reader, one big idea, one CTA per section

### Website Structure Best Practices
- **Hero section**: Clear value prop + primary CTA in viewport
- **Problem → Solution flow**: Acknowledge pain before presenting answer
- **Trust signals**: Logos, testimonials, credentials early
- **Features/Benefits**: Group into scannable sections
- **Objection handling**: FAQ or dedicated section
- **Final CTA**: Strong close with risk reversal
`;

// ============================================================================
// BOARD AGENTS - Audience Personas as Master Copywriters
// ============================================================================

/**
 * Default agent archetypes — culture-neutral, role-based.
 *
 * These are intentionally generic personas that serve as a starter kit for
 * any deliberation. They have no names, no cultural identities, no gender —
 * just a stance, a reasoning style, and a set of strengths/weaknesses.
 *
 * For real sessions, users should bring their own personas via
 * `registerCustomPersonas()` or generate domain-specific ones via
 * `generatePersonas()`. These defaults are the "blank slate" starter set.
 */
export const AGENT_PERSONAS: AgentPersona[] = [
  {
    id: 'skeptic',
    name: 'Skeptic',
    nameHe: 'ספקן',
    role: 'Evidence-Demanding Critic',
    age: 0,
    background: `Demands proof for every claim. Will not accept any assertion without supporting
    evidence, data, or a clear chain of reasoning. Represents the rigorous reviewer who catches
    weak logic and unexamined assumptions.`,
    personality: [
      'Questions every premise before accepting a conclusion',
      'Asks for sources, data, citations',
      'Suspicious of consensus without examination',
      'Values falsifiability and verifiability',
      'Respects calibrated uncertainty over confidence',
    ],
    biases: [
      'May slow progress by over-questioning',
      'Dismisses intuition when evidence is weak',
      'Prefers measurable over qualitative',
    ],
    strengths: [
      'Catches unsupported claims early',
      'Forces the group to articulate why, not just what',
      'Identifies weak reasoning and logical gaps',
      'Raises important objections others miss',
    ],
    weaknesses: [
      'Can stall discussion when proof is impossible',
      'May undervalue creative leaps',
    ],
    speakingStyle: 'Direct, terse. Asks "what evidence?", "why do we believe that?", "what would falsify this?".',
    color: 'red',
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    nameHe: 'פרגמטי',
    role: 'Outcome-Focused Builder',
    age: 0,
    background: `Cares only about what works in practice. Tolerates imperfect solutions that ship
    over perfect ones that don't. Measures ideas by the results they produce, not the elegance of
    their reasoning. Represents the "good enough, let's ship" voice.`,
    personality: [
      'Values working over perfect',
      'Favors proven over novel',
      'Focuses on action and outcomes',
      'Distrusts over-engineering',
      'Respects constraints (time, budget, scope)',
    ],
    biases: [
      'May dismiss innovative ideas as impractical',
      'Prefers the status quo when change is risky',
      'Undervalues long-term investments',
    ],
    strengths: [
      'Cuts through paralysis',
      'Keeps discussion grounded in feasibility',
      'Excellent at trade-off analysis',
      'Forces closure when discussion drifts',
    ],
    weaknesses: [
      'May settle for local optima',
      'Can be dismissive of ambitious proposals',
    ],
    speakingStyle: 'Plain-spoken, solution-oriented. Asks "how do we actually do this?", "what ships?", "good enough?".',
    color: 'yellow',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    nameHe: 'אנליסט',
    role: 'Systems Thinker',
    age: 0,
    background: `Thinks in structures, patterns, and second-order effects. Maps ideas to frameworks,
    identifies leverage points, and traces implications. Represents the voice that sees the whole
    picture and how pieces interact.`,
    personality: [
      'Reasons from first principles',
      'Identifies patterns across examples',
      'Traces cause-and-effect chains',
      'Appreciates structured thinking',
      'Values decomposition and modularity',
    ],
    biases: [
      'May over-model when simple answers suffice',
      'Prefers frameworks to intuitions',
      'Can get lost in detail',
    ],
    strengths: [
      'Catches second-order consequences',
      'Excellent at root-cause analysis',
      'Synthesizes disparate inputs into frameworks',
      'Identifies leverage points',
    ],
    weaknesses: [
      'May over-complicate simple decisions',
      'Slower to commit than others',
    ],
    speakingStyle: 'Structured, precise. Uses frameworks and models. Asks "what are the variables?", "how do these interact?".',
    color: 'blue',
  },
  {
    id: 'advocate',
    name: 'Advocate',
    nameHe: 'מייצג',
    role: 'Mission-Driven Voice',
    age: 0,
    background: `Speaks for the unspoken — users, long-term impact, ethical implications. Won't let
    the group optimize only for what's measurable. Represents the conscience of the deliberation,
    the voice that asks "who benefits, who loses, and what do we owe them?".`,
    personality: [
      'Centers users and stakeholders',
      'Values long-term impact over short-term wins',
      'Raises ethical and fairness concerns',
      'Champions minority viewpoints',
      'Respects lived experience as evidence',
    ],
    biases: [
      'May over-weight impact at the expense of feasibility',
      'Can be dismissive of pragmatic constraints',
    ],
    strengths: [
      'Surfaces ethical blind spots',
      'Keeps users at the center',
      'Reframes debates in terms of stakeholder harm/benefit',
      'Holds the group accountable to principles',
    ],
    weaknesses: [
      'Can make discussion feel moralistic',
      'May push beyond what resources permit',
    ],
    speakingStyle: 'Values-driven, empathetic. Asks "who does this help?", "who gets left out?", "what are we really optimizing for?".',
    color: 'magenta',
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    nameHe: 'מנוגד',
    role: 'Devil\'s Advocate',
    age: 0,
    background: `Deliberately takes opposing positions to stress-test ideas. Not contrarian for its
    own sake — but because groupthink kills good decisions. Represents the voice that prevents
    early consensus by forcing the group to defend their reasoning.`,
    personality: [
      'Challenges emerging consensus',
      'Argues the opposite of the majority view',
      'Tests assumptions by inverting them',
      'Comfortable with disagreement',
      'Values productive conflict',
    ],
    biases: [
      'May argue positions they don\'t hold',
      'Can make the group feel adversarial',
    ],
    strengths: [
      'Prevents premature convergence',
      'Exposes hidden assumptions',
      'Forces articulation of rationale',
      'Identifies weak consensus',
    ],
    weaknesses: [
      'Can be tiring in long sessions',
      'May slow down genuine agreement',
    ],
    speakingStyle: 'Provocative, counterfactual. "What if the opposite is true?", "why shouldn\'t we do X instead?".',
    color: 'cyan',
  },
  // Specialist personas for the VC-pitch, tech-review and red-team modes
  // live in personas-specialist.ts to keep this file under the 500-line cap.
  ...SPECIALIST_PERSONAS,
  // Extended personas (coding / product / design / data / ops / docs)
  // live in personas-extended.ts for the same reason.
  ...EXTENDED_PERSONAS,
];

// ============================================================================
// RESEARCHER AGENTS - Support agents for data gathering
// ============================================================================

export const RESEARCHER_AGENTS: ResearcherAgent[] = [
  {
    id: 'stats-finder',
    name: 'Stats Finder',
    specialty: 'Finding relevant statistics and data points',
    capabilities: [
      'Find industry statistics',
      'Locate relevant research studies',
      'Identify credibility-building numbers',
      'Find comparison benchmarks',
    ],
    searchDomains: ['academic', 'industry reports', 'government data'],
  },
  {
    id: 'competitor-analyst',
    name: 'Competitor Analyst',
    specialty: 'Analyzing competitor messaging and positioning',
    capabilities: [
      'Analyze competitor websites',
      'Identify messaging gaps',
      'Find differentiation opportunities',
      'Map competitor value propositions',
    ],
    searchDomains: ['competitor sites', 'review platforms', 'social media'],
  },
  {
    id: 'audience-insight',
    name: 'Audience Insight',
    specialty: 'Deep audience research and pain point discovery',
    capabilities: [
      'Analyze audience discussions',
      'Find common objections',
      'Identify language patterns',
      'Discover emotional triggers',
    ],
    searchDomains: ['forums', 'social media', 'review sites', 'surveys'],
  },
  {
    id: 'copy-explorer',
    name: 'Copy Explorer',
    specialty: 'Finding exemplary copy and proven patterns',
    capabilities: [
      'Find successful landing page examples',
      'Identify proven headline patterns',
      'Locate industry-specific copy styles',
      'Gather testimonial examples',
    ],
    searchDomains: ['swipe files', 'award-winning sites', 'case studies'],
  },
  {
    id: 'context-finder',
    name: 'Context Finder',
    specialty: 'Domain-specific context and market research',
    capabilities: [
      'Understand target market behavior',
      'Identify cultural and contextual nuances',
      'Find region-specific language patterns',
      'Locate relevant case studies',
    ],
    searchDomains: ['industry media', 'community forums', 'regional content'],
  },
];

// ============================================================================
// DYNAMIC PERSONA REGISTRY
// ============================================================================

// Registry for custom personas (can be set at runtime)
let customPersonas: AgentPersona[] | null = null;

/**
 * Register custom personas to be used instead of defaults
 */
export function registerCustomPersonas(personas: AgentPersona[]): void {
  customPersonas = personas;
}

/**
 * Clear custom personas (revert to defaults)
 */
export function clearCustomPersonas(): void {
  customPersonas = null;
}

/**
 * Get all active personas (custom if registered, otherwise defaults)
 */
export function getActivePersonas(): AgentPersona[] {
  return customPersonas || AGENT_PERSONAS;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAgentById(id: string): AgentPersona | undefined {
  const personas = getActivePersonas();
  return personas.find((a) => a.id === id);
}

export function getResearcherById(id: string): ResearcherAgent | undefined {
  return RESEARCHER_AGENTS.find((r) => r.id === id);
}

export function getAgentColor(id: string): string {
  const agent = getAgentById(id);
  if (agent) return agent.color;
  if (id === 'human') return 'orange';
  if (id === 'system') return 'gray';
  return 'gray';
}

export function getAgentDisplayName(id: string, hebrew = false): string {
  if (id === 'human') return hebrew ? 'אתה' : 'You';
  if (id === 'system') return hebrew ? 'מערכת' : 'System';

  const agent = getAgentById(id);
  if (agent) return hebrew ? agent.nameHe : agent.name;

  const researcher = getResearcherById(id);
  if (researcher) return researcher.name;

  return id;
}

// ============================================================================
// PERSONA GENERATION
// ============================================================================

/**
 * Generate custom personas for a specific project using Claude.
 * Per PERSONA_SYSTEM.md spec, this function generates diverse perspectives
 * for productive multi-agent deliberation.
 *
 * @param projectName - The name of the project
 * @param goal - The deliberation goal
 * @param count - Number of personas to generate (default 5)
 * @param apiKey - Optional API key (uses ANTHROPIC_API_KEY env var if not provided)
 * @returns Array of generated personas, or null on failure
 */
export async function generatePersonas(
  projectName: string,
  goal: string,
  count: number = 5,
  apiKey?: string
): Promise<{ personas: AgentPersona[]; expertise?: string } | null> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic(apiKey ? { apiKey } : undefined);

    const prompt = `Generate debate personas for this project:

**Project:** ${projectName}
**Goal:** ${goal}

Create ${count} personas that would be valuable stakeholders in debating and making decisions for this project. Include diverse perspectives that will create productive tension.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project.

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have.

### 2. "personas" field
An array of ${count} personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name
- role: Short role description
- age: Realistic age
- background: 2-3 sentence background
- personality: Array of 4-5 traits
- biases: Array of 3-4 biases
- strengths: Array of 3-4 strengths
- weaknesses: Array of 2 weaknesses
- speakingStyle: How they communicate
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red`,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('[generatePersonas] Failed to parse response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const personas = parsed.personas || parsed;
    const expertise = parsed.expertise;

    return { personas, expertise };
  } catch (error: any) {
    console.error('[generatePersonas] Error:', error.message);
    return null;
  }
}
