/**
 * Session Modes - Different deliberation modes with specific goals and behaviors
 * Each mode has its own success criteria, phase flow, and agent instructions
 */

export interface SessionMode {
  id: string;
  name: string;
  nameHe: string;
  description: string;
  icon: string;

  // Goal anchoring - reminded every N messages
  goalReminder: {
    frequency: number; // Remind every N messages
    template: string;  // Template with {goal} placeholder
  };

  // Phase configuration
  phases: PhaseConfig[];

  // Research limits
  research: {
    maxRequests: number;      // Max research requests before forcing synthesis
    maxPerTopic: number;      // Max requests on same topic
    requiredBeforeSynthesis: number; // Min research before synthesis allowed
  };

  // Loop detection
  loopDetection: {
    enabled: boolean;
    maxSimilarMessages: number;  // Trigger after N similar messages
    maxRoundsWithoutProgress: number; // Trigger after N rounds with no new proposals
    intervention: string;  // Message to inject when loop detected
    windowSize?: number;  // Number of recent messages to analyze (default: 10)
    minHashLength?: number;  // Minimum hash length to consider meaningful (default: 10)
    messagesPerRound?: number;  // Approximate messages per round for progress calc (default: 3)
  };

  // Success criteria
  successCriteria: {
    minConsensusPoints: number;
    requiredOutputs: string[]; // e.g., ['hero_copy', 'cta', 'value_props']
    maxMessages: number;  // Force synthesis after this many messages
  };

  // Agent behavior modifiers
  agentInstructions: string; // Additional instructions for all agents in this mode
}

/**
 * Exit criteria that can be automatically checked by ModeController.
 * When specified, phase will only transition when these conditions are met
 * (in addition to maxMessages if autoTransition is true).
 */
export interface ExitCriteria {
  minProposals?: number;      // Minimum proposals made in this phase
  minConsensusPoints?: number; // Minimum consensus/agreements reached
  minResearchRequests?: number; // Minimum research conducted
  requiredOutputs?: string[];   // Specific outputs that must be produced
}

export interface PhaseConfig {
  id: string;
  name: string;
  order: number;
  maxMessages: number;
  autoTransition: boolean;  // Auto-transition when criteria met
  transitionCriteria: string; // Human-readable description
  agentFocus: string;  // What agents should focus on in this phase
  exitCriteria?: ExitCriteria; // Optional structured exit criteria
}

// =============================================================================
// COPYWRITE MODE - Create compelling website copy
// =============================================================================

export const COPYWRITE_MODE: SessionMode = {
  id: 'copywrite',
  name: 'Copywriting',
  nameHe: 'קופירייטינג',
  description: 'Create compelling website copy that converts',
  icon: '✍️',

  goalReminder: {
    frequency: 8,
    template: `🎯 **GOAL REMINDER**: We're here to create compelling copy for {goal}.

NOT to endlessly debate or research. We need:
1. A hook that grabs attention
2. Clear value proposition
3. Proof/credibility
4. Strong CTA

If you've been researching the same topic twice, STOP and synthesize what you have.
If you've been arguing the same point for 3+ messages, find common ground or move on.

What concrete copy can we write RIGHT NOW?`
  },

  phases: [
    {
      id: 'discovery',
      name: 'Discovery',
      order: 1,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Audience and value prop understood',
      agentFocus: 'Understand the audience, their pain points, and what makes this offering unique'
    },
    {
      id: 'research',
      name: 'Research',
      order: 2,
      maxMessages: 20,
      autoTransition: true,
      transitionCriteria: 'Enough data gathered',
      agentFocus: 'Gather specific data, examples, and proof points. NO more than 3 research requests.'
    },
    {
      id: 'ideation',
      name: 'Ideation',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Multiple approaches proposed',
      agentFocus: 'Propose concrete copy approaches. Each agent should offer ONE specific angle.'
    },
    {
      id: 'synthesis',
      name: 'Synthesis',
      order: 4,
      maxMessages: 10,
      autoTransition: true,
      transitionCriteria: 'Consensus on approach',
      agentFocus: 'Combine the best elements. Find what we all agree works.'
    },
    {
      id: 'drafting',
      name: 'Drafting',
      order: 5,
      maxMessages: 15,
      autoTransition: false,
      transitionCriteria: 'Copy sections complete',
      agentFocus: 'Write actual copy. Hero, benefits, CTA. Be specific, not abstract.'
    }
  ],

  research: {
    maxRequests: 5,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 1
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 3,
    maxRoundsWithoutProgress: 4,
    intervention: `⚠️ **LOOP DETECTED**: We're going in circles.

STOP debating the same points. Here's what we do now:
1. Each agent: State your ONE best idea in 2 sentences
2. Find the overlap - what do we all agree on?
3. Write ONE concrete piece of copy based on that agreement

No more research. No more "but what about..."
Let's WRITE something.`
  },

  successCriteria: {
    minConsensusPoints: 3,
    requiredOutputs: ['hero', 'value_proposition', 'cta'],
    maxMessages: 60
  },

  agentInstructions: `You are creating COPY, not having an academic discussion.

RULES:
- Research is a MEANS, not an END. One research request should yield actionable insights.
- If you've made a point twice, don't make it again. Move forward.
- Propose SPECIFIC copy, not abstract concepts.
- "I think we should..." is weak. "Here's the headline: ..." is strong.
- Disagree by offering ALTERNATIVES, not just criticism.
- When in doubt, WRITE something. Bad copy can be fixed; no copy cannot.

Your output should be COPY that a human would actually use, not a discussion about copy.`
};

// =============================================================================
// IDEA VALIDATION MODE - Test if an idea is viable
// =============================================================================

export const IDEA_VALIDATION_MODE: SessionMode = {
  id: 'idea-validation',
  name: 'Idea Validation',
  nameHe: 'בדיקת רעיון',
  description: 'Critically evaluate if an idea is viable',
  icon: '🔍',

  goalReminder: {
    frequency: 10,
    template: `🎯 **VALIDATION FOCUS**: We're evaluating: {goal}

We need to answer:
1. Is there real demand? (Evidence, not assumptions)
2. Can it be built/executed? (Practical feasibility)
3. Is the timing right? (Market conditions)
4. What are the dealbreakers?

Reach a VERDICT: GO / NO-GO / PIVOT TO X`
  },

  phases: [
    {
      id: 'understand',
      name: 'Understand',
      order: 1,
      maxMessages: 10,
      autoTransition: true,
      transitionCriteria: 'Idea fully understood',
      agentFocus: 'Clarify exactly what the idea is and what success looks like'
    },
    {
      id: 'research',
      name: 'Market Research',
      order: 2,
      maxMessages: 20,
      autoTransition: true,
      transitionCriteria: 'Market data gathered',
      agentFocus: 'Find evidence of demand, competition, and market size'
    },
    {
      id: 'stress-test',
      name: 'Stress Test',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Major risks identified',
      agentFocus: 'Challenge the idea. Find weaknesses. Play devil\'s advocate.'
    },
    {
      id: 'verdict',
      name: 'Verdict',
      order: 4,
      maxMessages: 10,
      autoTransition: false,
      transitionCriteria: 'Consensus reached',
      agentFocus: 'Reach a clear GO/NO-GO/PIVOT verdict with reasoning'
    }
  ],

  research: {
    maxRequests: 8,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 2
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 3,
    maxRoundsWithoutProgress: 3,
    intervention: `⚠️ We're circling. Time to decide.

Each agent: Give your verdict NOW:
- GO: "Yes because..."
- NO-GO: "No because..."
- PIVOT: "Change it to..."

No more "it depends" or "we need more research." Decide.`
  },

  successCriteria: {
    minConsensusPoints: 2,
    requiredOutputs: ['verdict', 'reasoning', 'next_steps'],
    maxMessages: 50
  },

  agentInstructions: `You are a critical evaluator, not a cheerleader.

RULES:
- Demand EVIDENCE, not opinions
- "I feel like there's demand" is worthless. "Reddit has 50 posts asking for this" is valuable.
- Be willing to say NO. Killing a bad idea early saves years of wasted effort.
- Identify the ONE thing that would make this fail
- Don't hedge. Take a position.`
};

// =============================================================================
// IDEATION MODE - Generate ideas through research
// =============================================================================

export const IDEATION_MODE: SessionMode = {
  id: 'ideation',
  name: 'Ideation',
  nameHe: 'רעיונות',
  description: 'Generate ideas by scouting Reddit, forums, and market gaps',
  icon: '💡',

  goalReminder: {
    frequency: 12,
    template: `🎯 **IDEATION GOAL**: Find opportunities in {goal}

We want:
1. Real problems people are complaining about
2. Gaps in existing solutions
3. Emerging trends
4. Underserved niches

Output: A ranked list of 3-5 concrete ideas with evidence of demand.`
  },

  phases: [
    {
      id: 'scout',
      name: 'Scout',
      order: 1,
      maxMessages: 25,
      autoTransition: true,
      transitionCriteria: 'Enough signals gathered',
      agentFocus: 'Find complaints, wishes, and pain points in the target domain'
    },
    {
      id: 'pattern',
      name: 'Pattern Recognition',
      order: 2,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Patterns identified',
      agentFocus: 'What themes emerge? What problems appear repeatedly?'
    },
    {
      id: 'ideate',
      name: 'Ideate',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Ideas generated',
      agentFocus: 'Propose specific solutions to the problems found'
    },
    {
      id: 'rank',
      name: 'Rank & Refine',
      order: 4,
      maxMessages: 10,
      autoTransition: false,
      transitionCriteria: 'Top ideas selected',
      agentFocus: 'Vote on best ideas. Output final ranked list with evidence.'
    }
  ],

  research: {
    maxRequests: 15,
    maxPerTopic: 3,
    requiredBeforeSynthesis: 5
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 4,
    maxRoundsWithoutProgress: 5,
    intervention: `⚠️ Time to synthesize what we've found.

Each agent: Name your TOP 1 idea based on research so far.
We'll vote and produce our final list.`
  },

  successCriteria: {
    minConsensusPoints: 3,
    requiredOutputs: ['idea_list', 'evidence', 'next_steps'],
    maxMessages: 70
  },

  agentInstructions: `You are an opportunity scout.

RULES:
- Real complaints > theoretical problems
- "10 people asked for this on Reddit" beats "I think people might want..."
- Look for: complaints, workarounds, "I wish...", failed products in the space
- Quantity first, then quality. Generate many ideas before filtering.
- The best ideas solve problems people are ALREADY trying to solve themselves.`
};

// =============================================================================
// WILL IT WORK MODE - Reach a definitive conclusion
// =============================================================================

export const WILL_IT_WORK_MODE: SessionMode = {
  id: 'will-it-work',
  name: 'Will It Work?',
  nameHe: 'האם זה יעבוד?',
  description: 'Reach a definitive conclusion on feasibility',
  icon: '⚖️',

  goalReminder: {
    frequency: 8,
    template: `🎯 **THE QUESTION**: Will {goal} work?

We must answer with:
- YES (with conditions)
- NO (with reasons)
- MAYBE IF (specific changes needed)

No fence-sitting. No "it depends." A clear answer.`
  },

  phases: [
    {
      id: 'define',
      name: 'Define Success',
      order: 1,
      maxMessages: 8,
      autoTransition: true,
      transitionCriteria: 'Success defined',
      agentFocus: 'What does "working" mean? Define measurable success criteria.'
    },
    {
      id: 'evidence',
      name: 'Gather Evidence',
      order: 2,
      maxMessages: 20,
      autoTransition: true,
      transitionCriteria: 'Evidence gathered',
      agentFocus: 'Find evidence FOR and AGAINST. Be balanced.'
    },
    {
      id: 'debate',
      name: 'Structured Debate',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Arguments exhausted',
      agentFocus: 'Make your case. Attack weak arguments. Defend strong ones.'
    },
    {
      id: 'verdict',
      name: 'Verdict',
      order: 4,
      maxMessages: 8,
      autoTransition: false,
      transitionCriteria: 'Verdict reached',
      agentFocus: 'Vote. Explain. Deliver final answer.'
    }
  ],

  research: {
    maxRequests: 6,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 1
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 2,
    maxRoundsWithoutProgress: 3,
    intervention: `⚠️ DECISION TIME.

Stop debating. Each agent votes NOW:
- YES because...
- NO because...

Majority rules. Let's conclude.`
  },

  successCriteria: {
    minConsensusPoints: 1,
    requiredOutputs: ['verdict', 'confidence_level', 'key_factors'],
    maxMessages: 45
  },

  agentInstructions: `You are a judge, not a consultant.

RULES:
- You MUST take a position. "It depends" is not allowed.
- Quantify confidence: "70% likely to work because..."
- Identify the #1 factor that determines success or failure
- If you change your mind, say so clearly and why
- The goal is a DECISION, not a discussion.`
};

// =============================================================================
// SITE SURVEY MODE - Analyze existing site and rewrite copy
// =============================================================================

export const SITE_SURVEY_MODE: SessionMode = {
  id: 'site-survey',
  name: 'Site Survey & Rewrite',
  nameHe: 'סקר אתר ושכתוב',
  description: 'Analyze an existing website and create better copy',
  icon: '🔎',

  goalReminder: {
    frequency: 10,
    template: `🎯 **SITE SURVEY GOAL**: Improve the copy for {goal}

We need to:
1. Identify what's WRONG with current copy (weak headlines, unclear value prop, etc.)
2. Understand what the site is TRYING to say
3. Rewrite it BETTER - clearer, more compelling, more human

Output: Before/After comparisons for each section.`
  },

  phases: [
    {
      id: 'analyze',
      name: 'Analyze Current Site',
      order: 1,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Site fully analyzed',
      agentFocus: 'What does this site do? Who is it for? What copy problems exist?'
    },
    {
      id: 'diagnose',
      name: 'Diagnose Problems',
      order: 2,
      maxMessages: 12,
      autoTransition: true,
      transitionCriteria: 'Problems identified',
      agentFocus: 'List specific copy problems: weak headlines, jargon, unclear CTA, missing proof, etc.'
    },
    {
      id: 'research',
      name: 'Research Context',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Context gathered',
      agentFocus: 'Research competitors, audience language, what works in this space'
    },
    {
      id: 'rewrite',
      name: 'Rewrite Copy',
      order: 4,
      maxMessages: 20,
      autoTransition: false,
      transitionCriteria: 'Rewrites complete',
      agentFocus: 'Write NEW copy for each section. Show before/after. Make it compelling.'
    }
  ],

  research: {
    maxRequests: 6,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 1
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 3,
    maxRoundsWithoutProgress: 4,
    intervention: `⚠️ Stop analyzing, start REWRITING.

Each agent: Pick ONE section and rewrite it now.
Show: BEFORE (current) → AFTER (your version)`
  },

  successCriteria: {
    minConsensusPoints: 2,
    requiredOutputs: ['hero_rewrite', 'value_prop_rewrite', 'cta_rewrite'],
    maxMessages: 60
  },

  agentInstructions: `You are a copy doctor diagnosing and fixing sick websites.

RULES:
- Don't just critique - REWRITE. Show the fix, not just the problem.
- Format: "BEFORE: [current copy] → AFTER: [your rewrite]"
- Keep the same meaning but make it: clearer, more human, more compelling
- If the current copy is jargon-heavy, translate to plain language
- If headlines are weak, make them specific and benefit-focused
- If CTA is boring, make it action-oriented and urgent`
};

// =============================================================================
// BUSINESS PLAN MODE - Create a business plan
// =============================================================================

export const BUSINESS_PLAN_MODE: SessionMode = {
  id: 'business-plan',
  name: 'Business Plan',
  nameHe: 'תוכנית עסקית',
  description: 'Create a structured business plan',
  icon: '📊',

  goalReminder: {
    frequency: 12,
    template: `🎯 **BUSINESS PLAN GOAL**: Create a plan for {goal}

We need to cover:
1. Problem & Solution (What and Why)
2. Market & Competition (Who and Against Whom)
3. Business Model (How We Make Money)
4. Go-to-Market (How We Get Customers)
5. Financials (Numbers)
6. Team & Timeline (Who and When)

Be SPECIFIC. Numbers > Adjectives.`
  },

  phases: [
    {
      id: 'problem-solution',
      name: 'Problem & Solution',
      order: 1,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Problem and solution defined',
      agentFocus: 'Define the problem clearly. What is the solution? Why now?'
    },
    {
      id: 'market-analysis',
      name: 'Market Analysis',
      order: 2,
      maxMessages: 20,
      autoTransition: true,
      transitionCriteria: 'Market understood',
      agentFocus: 'Market size, target segments, competition analysis, positioning'
    },
    {
      id: 'business-model',
      name: 'Business Model',
      order: 3,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'Model defined',
      agentFocus: 'Revenue streams, pricing, unit economics, costs'
    },
    {
      id: 'gtm-financials',
      name: 'GTM & Financials',
      order: 4,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'GTM and numbers done',
      agentFocus: 'Customer acquisition strategy, projections, funding needs'
    },
    {
      id: 'synthesis',
      name: 'Executive Summary',
      order: 5,
      maxMessages: 10,
      autoTransition: false,
      transitionCriteria: 'Plan complete',
      agentFocus: 'Write the executive summary. One page. Make it compelling.'
    }
  ],

  research: {
    maxRequests: 10,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 3
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 3,
    maxRoundsWithoutProgress: 4,
    intervention: `⚠️ We're circling. Time to commit to numbers.

Each agent: Give ONE specific metric or projection.
No more "it depends" - pick a number and defend it.`
  },

  successCriteria: {
    minConsensusPoints: 4,
    requiredOutputs: ['problem_statement', 'solution', 'market_size', 'business_model', 'projections', 'executive_summary'],
    maxMessages: 80
  },

  agentInstructions: `You are building a business plan that could raise funding.

RULES:
- NUMBERS are mandatory. "Big market" is worthless. "$50B TAM, $5B SAM, $500M SOM" is useful.
- Every claim needs EVIDENCE or clear ASSUMPTIONS
- Be realistic but ambitious. Investors want growth, not fantasy.
- Unit economics must work: CAC < LTV
- Address risks proactively - investors will find them anyway
- The executive summary should make someone want to read more`
};

// =============================================================================
// GO TO MARKET MODE - Create GTM strategy
// =============================================================================

export const GTM_STRATEGY_MODE: SessionMode = {
  id: 'gtm-strategy',
  name: 'Go-to-Market Strategy',
  nameHe: 'אסטרטגיית השקה',
  description: 'Create a go-to-market launch strategy',
  icon: '🚀',

  goalReminder: {
    frequency: 10,
    template: `🎯 **GTM GOAL**: Launch strategy for {goal}

We need:
1. Target Audience (WHO exactly)
2. Positioning (WHY us vs alternatives)
3. Channels (WHERE to find them)
4. Message (WHAT to say)
5. Tactics (HOW to execute)
6. Timeline (WHEN)

No vague strategy. Specific, actionable steps.`
  },

  phases: [
    {
      id: 'audience',
      name: 'Define Audience',
      order: 1,
      maxMessages: 15,
      autoTransition: true,
      transitionCriteria: 'ICP defined',
      agentFocus: 'Who is the ideal customer? Be SPECIFIC. Job title, company size, pain points.'
    },
    {
      id: 'positioning',
      name: 'Positioning',
      order: 2,
      maxMessages: 12,
      autoTransition: true,
      transitionCriteria: 'Positioning clear',
      agentFocus: 'How are we different? What category? What is our wedge?'
    },
    {
      id: 'channels',
      name: 'Channels & Message',
      order: 3,
      maxMessages: 18,
      autoTransition: true,
      transitionCriteria: 'Channels selected',
      agentFocus: 'Where does our audience hang out? What channels? What message for each?'
    },
    {
      id: 'tactics',
      name: 'Tactics & Timeline',
      order: 4,
      maxMessages: 15,
      autoTransition: false,
      transitionCriteria: 'Plan complete',
      agentFocus: 'Specific actions. Week 1, Week 2, Month 1, Month 3. Who does what.'
    }
  ],

  research: {
    maxRequests: 8,
    maxPerTopic: 2,
    requiredBeforeSynthesis: 2
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 3,
    maxRoundsWithoutProgress: 3,
    intervention: `⚠️ Strategy without tactics is useless.

Each agent: Name ONE specific action for Week 1.
Not "build awareness" - specific like "Post 3x/week on LinkedIn targeting CTOs"`
  },

  successCriteria: {
    minConsensusPoints: 3,
    requiredOutputs: ['icp', 'positioning_statement', 'channel_plan', 'launch_timeline'],
    maxMessages: 60
  },

  agentInstructions: `You are a GTM strategist planning a product launch.

RULES:
- Specificity wins. "Tech companies" is bad. "Series A SaaS companies with 20-50 employees" is good.
- Channel selection must match audience. Don't suggest TikTok for B2B enterprise.
- Every tactic needs: What, Who, When, How to measure
- Start narrow, expand later. Better to own one channel than be mediocre on five.
- Include budget estimates where relevant
- The output should be a checklist someone could execute`
};

// =============================================================================
// CUSTOM MODE - User-defined
// =============================================================================

export const CUSTOM_MODE: SessionMode = {
  id: 'custom',
  name: 'Custom',
  nameHe: 'מותאם אישית',
  description: 'Define your own deliberation mode',
  icon: '⚙️',

  goalReminder: {
    frequency: 10,
    template: `🎯 **GOAL**: {goal}

Stay focused. What's the next concrete step toward this goal?`
  },

  phases: [
    {
      id: 'discuss',
      name: 'Discussion',
      order: 1,
      maxMessages: 30,
      autoTransition: false,
      transitionCriteria: 'User decides',
      agentFocus: 'Open discussion on the topic'
    },
    {
      id: 'synthesize',
      name: 'Synthesize',
      order: 2,
      maxMessages: 15,
      autoTransition: false,
      transitionCriteria: 'User decides',
      agentFocus: 'Combine and summarize key points'
    },
    {
      id: 'conclude',
      name: 'Conclude',
      order: 3,
      maxMessages: 10,
      autoTransition: false,
      transitionCriteria: 'User decides',
      agentFocus: 'Reach conclusions and next steps'
    }
  ],

  research: {
    maxRequests: 10,
    maxPerTopic: 3,
    requiredBeforeSynthesis: 0
  },

  loopDetection: {
    enabled: true,
    maxSimilarMessages: 4,
    maxRoundsWithoutProgress: 5,
    intervention: `⚠️ The discussion seems to be circling. Consider:
- Synthesizing what we have so far
- Changing direction
- Asking a more specific question`
  },

  successCriteria: {
    minConsensusPoints: 1,
    requiredOutputs: [],
    maxMessages: 100
  },

  agentInstructions: `Engage naturally with the topic while staying focused on the goal.`
};

// =============================================================================
// MODE REGISTRY
// =============================================================================

export const SESSION_MODES: Record<string, SessionMode> = {
  'copywrite': COPYWRITE_MODE,
  'idea-validation': IDEA_VALIDATION_MODE,
  'ideation': IDEATION_MODE,
  'will-it-work': WILL_IT_WORK_MODE,
  'site-survey': SITE_SURVEY_MODE,
  'business-plan': BUSINESS_PLAN_MODE,
  'gtm-strategy': GTM_STRATEGY_MODE,
  'custom': CUSTOM_MODE,
};

export function getModeById(id: string): SessionMode | undefined {
  return SESSION_MODES[id];
}

export function getAllModes(): SessionMode[] {
  return Object.values(SESSION_MODES);
}

export function getDefaultMode(): SessionMode {
  return COPYWRITE_MODE;
}
