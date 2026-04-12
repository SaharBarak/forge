/**
 * Community contribution types.
 *
 * These are the *payloads* that get wrapped in P2P signed envelopes. Author
 * DID, timestamp, and signature come from the envelope — we don't duplicate
 * them here.
 *
 * The schema is deliberately small and versioned. Future kinds can be added
 * by extending the `Contribution` union; old clients will see unknown kinds
 * and skip them.
 */

export const CONTRIBUTION_SCHEMA_VERSION = 1;

export type ContributionKind = 'persona' | 'insight' | 'template' | 'prompt';

interface ContributionBase {
  /** Schema version — allows forward-compatible migrations. */
  v: number;
  kind: ContributionKind;
  title: string;
  description: string;
  tags: string[];
}

/**
 * A shareable agent persona — someone's custom debate character they think
 * others will find useful. Format mirrors Forge's existing AgentPersona.
 */
export interface PersonaContribution extends ContributionBase {
  kind: 'persona';
  content: {
    id: string;
    name: string;
    role: string;
    background: string;
    personality: string[];
    biases?: string[];
    strengths?: string[];
    weaknesses?: string[];
    speakingStyle?: string;
    color?: string;
  };
}

/**
 * A short learning from a real deliberation session — e.g. "Adding a
 * skeptical veteran persona unlocks consensus on GTM mode in <3 rounds."
 */
export interface InsightContribution extends ContributionBase {
  kind: 'insight';
  content: {
    body: string;
    sessionMode?: string;
    outcome?: 'converged' | 'stuck' | 'diverged';
  };
}

/**
 * A reusable session template — e.g. a pre-configured mode + goal + persona
 * set for a specific use case.
 */
export interface TemplateContribution extends ContributionBase {
  kind: 'template';
  content: {
    mode: string;
    goal: string;
    personaIds: string[];
    initialPrompt?: string;
  };
}

/**
 * A reusable prompt snippet — system prompt, skill, or research brief.
 */
export interface PromptContribution extends ContributionBase {
  kind: 'prompt';
  content: {
    body: string;
    targetAgent?: string;
  };
}

export type Contribution =
  | PersonaContribution
  | InsightContribution
  | TemplateContribution
  | PromptContribution;

/**
 * A lightweight reaction pointing to a contribution by its envelope ID.
 * Reactions are themselves signed envelopes, so upvote manipulation by a
 * single DID is impossible — one DID, one vote per target. (The store layer
 * de-duplicates by {voter DID, target ID}.)
 */
export interface Reaction {
  v: number;
  kind: 'reaction';
  targetId: string;
  vote: 'up' | 'down';
}

/**
 * A contribution as displayed in the UI — envelope metadata merged with the
 * decoded payload plus computed score.
 */
export interface EnrichedContribution {
  id: string;
  authorDid: string;
  publishedAt: string;
  hash?: string;
  contribution: Contribution;
  score: number;
  myVote: 'up' | 'down' | null;
}
