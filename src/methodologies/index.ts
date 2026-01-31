/**
 * Methodologies for Agent Argumentation and Decision Making
 */

import type {
  MethodologyConfig,
  VisualDecisionRule,
  StructureDecisionRule,
  PhaseConfig,
  SessionPhase,
  ArgumentationStyle,
  ConsensusMethod,
} from '../types';

// ============================================================================
// ARGUMENTATION METHODOLOGIES
// ============================================================================

export const ARGUMENTATION_GUIDES = {
  dialectic: {
    name: 'Dialectic Method',
    nameHe: 'שיטה דיאלקטית',
    description: 'Thesis → Antithesis → Synthesis',
    steps: [
      '1. One agent presents a thesis (position)',
      '2. Another agent presents antithesis (opposing view)',
      '3. Group works to synthesize into a higher truth',
      '4. Repeat until synthesis is satisfactory',
    ],
    rules: [
      'Every thesis must be met with an antithesis',
      'No position is dismissed without examination',
      'Synthesis must incorporate valid points from both sides',
      'The goal is truth, not winning',
    ],
  },
  socratic: {
    name: 'Socratic Method',
    nameHe: 'שיטה סוקרטית',
    description: 'Question-driven exploration',
    steps: [
      '1. Start with a question, not a statement',
      '2. Each response generates new questions',
      '3. Drill down until assumptions are exposed',
      '4. Build understanding from examined foundations',
    ],
    rules: [
      'Ask "why" at least 3 times',
      'Challenge assumptions, not people',
      'Admit when you don\'t know',
      'Let questions lead to discovery',
    ],
  },
  collaborative: {
    name: 'Collaborative Building',
    nameHe: 'בנייה משותפת',
    description: 'Yes, and... approach',
    steps: [
      '1. One agent proposes an idea',
      '2. Next agent builds on it ("Yes, and...")',
      '3. Continue building until complete',
      '4. Then critique and refine together',
    ],
    rules: [
      'No immediate rejection of ideas',
      'Build before you critique',
      'Credit others\' contributions',
      'Combine strengths',
    ],
  },
  adversarial: {
    name: 'Adversarial Debate',
    nameHe: 'דיון אדברסרי',
    description: 'Strong opposing viewpoints',
    steps: [
      '1. Divide into opposing camps',
      '2. Each side argues their strongest case',
      '3. Cross-examination and rebuttal',
      '4. Neutral evaluation of arguments',
    ],
    rules: [
      'Argue your position as strongly as possible',
      'Attack arguments, not people',
      'Acknowledge strong opposing points',
      'Judge based on argument quality',
    ],
  },
  mixed: {
    name: 'Mixed Methods',
    nameHe: 'שיטות משולבות',
    description: 'Adaptive combination of methods',
    steps: [
      '1. Start with collaborative brainstorming',
      '2. Use Socratic questioning to probe ideas',
      '3. Allow adversarial debate on key tensions',
      '4. Conclude with dialectic synthesis',
    ],
    rules: [
      'Adapt method to the situation',
      'Start supportive, increase challenge over time',
      'Use questioning when stuck',
      'Always end with synthesis',
    ],
  },
};

// ============================================================================
// CONSENSUS METHODOLOGIES
// ============================================================================

export const CONSENSUS_GUIDES = {
  unanimous: {
    name: 'Unanimous Agreement',
    nameHe: 'הסכמה פה אחד',
    threshold: 1.0,
    description: 'All must agree',
    process: [
      '1. Discuss until everyone agrees',
      '2. Any objection blocks consensus',
      '3. Modify proposal to address objections',
      '4. Repeat until unanimous',
    ],
  },
  supermajority: {
    name: 'Supermajority',
    nameHe: 'רוב מיוחס',
    threshold: 0.67,
    description: '2/3 must agree',
    process: [
      '1. Discuss the proposal',
      '2. Call for vote when ready',
      '3. 67%+ agreement passes',
      '4. Document minority concerns',
    ],
  },
  majority: {
    name: 'Simple Majority',
    nameHe: 'רוב פשוט',
    threshold: 0.5,
    description: '50%+ must agree',
    process: [
      '1. Present options clearly',
      '2. Allow brief discussion',
      '3. Vote on options',
      '4. Majority wins',
    ],
  },
  consent: {
    name: 'Consent-Based',
    nameHe: 'מבוסס הסכמה',
    threshold: 0,
    description: 'No strong objections',
    process: [
      '1. Present proposal',
      '2. Ask for objections (not opinions)',
      '3. Only blocks if "cannot live with this"',
      '4. Silence = consent',
    ],
  },
  synthesis: {
    name: 'Synthesis',
    nameHe: 'סינתזה',
    threshold: 0,
    description: 'Combine elements from all',
    process: [
      '1. Gather all perspectives',
      '2. Identify common ground',
      '3. Integrate unique valuable elements',
      '4. Create new combined solution',
    ],
  },
};

// ============================================================================
// VISUAL DECISION FRAMEWORK
// ============================================================================

export const VISUAL_DECISION_RULES: VisualDecisionRule[] = [
  {
    condition: 'Showing change over time or trends',
    recommendedVisual: 'chart',
    reasoning: 'Line or area charts best show temporal progression',
    examples: ['Growth metrics', 'Historical data', 'Progress tracking'],
  },
  {
    condition: 'Comparing quantities or proportions',
    recommendedVisual: 'graph',
    reasoning: 'Bar graphs clearly show relative differences',
    examples: ['Market share', 'Survey results', 'Budget allocation'],
  },
  {
    condition: 'Showing before/after or two opposing states',
    recommendedVisual: 'comparison',
    reasoning: 'Side-by-side visuals make differences immediately clear',
    examples: ['Problem vs solution', 'Old way vs new way', 'Us vs competitors'],
  },
  {
    condition: 'Explaining abstract concepts or emotions',
    recommendedVisual: 'illustration',
    reasoning: 'Illustrations can represent intangible ideas visually',
    examples: ['Community feeling', 'Trust', 'Hope', 'Connection'],
  },
  {
    condition: 'Building trust through authenticity',
    recommendedVisual: 'photo',
    reasoning: 'Real photos of real people/places build credibility',
    examples: ['Team photos', 'Location shots', 'User testimonials'],
  },
  {
    condition: 'Presenting multiple related statistics',
    recommendedVisual: 'infographic',
    reasoning: 'Infographics combine data with visual hierarchy',
    examples: ['Key metrics dashboard', 'Process overview', 'Fact sheets'],
  },
  {
    condition: 'Content is narrative or emotional',
    recommendedVisual: 'none',
    reasoning: 'Sometimes text alone is more powerful',
    examples: ['Personal stories', 'Mission statements', 'Emotional appeals'],
  },
];

// ============================================================================
// STRUCTURE DECISION FRAMEWORK
// ============================================================================

export const STRUCTURE_DECISION_RULES: StructureDecisionRule[] = [
  {
    condition: 'Explaining a sequence or process',
    recommendedStructure: 'numbered',
    reasoning: 'Numbers imply order and make steps easy to follow',
    examples: ['How it works', 'Getting started', 'Step-by-step guide'],
  },
  {
    condition: 'Listing features or benefits',
    recommendedStructure: 'bullets',
    reasoning: 'Bullets allow quick scanning without implied order',
    examples: ['Feature list', 'Benefits', 'What you get'],
  },
  {
    condition: 'Showing us vs them or two options',
    recommendedStructure: 'comparison',
    reasoning: 'Tables or columns make differences clear',
    examples: ['Pricing tiers', 'Plan comparison', 'Before/after'],
  },
  {
    condition: 'Telling a story or building emotional connection',
    recommendedStructure: 'prose',
    reasoning: 'Continuous text allows narrative flow and emotional buildup',
    examples: ['About us', 'Founder story', 'Mission statement'],
  },
  {
    condition: 'Showing history or progression',
    recommendedStructure: 'timeline',
    reasoning: 'Timelines show progression and milestones',
    examples: ['Company history', 'Project roadmap', 'Achievement milestones'],
  },
  {
    condition: 'Presenting key metrics or numbers',
    recommendedStructure: 'stats',
    reasoning: 'Bold numbers with labels grab attention',
    examples: ['Impact metrics', 'Growth numbers', 'Social proof'],
  },
  {
    condition: 'Showing multiple related items equally',
    recommendedStructure: 'grid',
    reasoning: 'Grids give equal visual weight to all items',
    examples: ['Team members', 'Product features', 'Testimonials'],
  },
];

// ============================================================================
// PHASE METHODOLOGY MAP
// Auto-selects optimal argumentation style and consensus method per phase
// Per DELIBERATION_WORKFLOW.md specification
// ============================================================================

export interface PhaseMethodology {
  argumentationStyle: ArgumentationStyle;
  consensusMethod: ConsensusMethod;
  rationale: string;
}

/**
 * Maps each session phase to its optimal methodology combination.
 * This enables phase-aware methodology selection for more effective deliberation.
 *
 * Design rationale:
 * - Early phases (brainstorming) use collaborative "Yes, and..." approach
 * - Middle phases (argumentation) use dialectic thesis→antithesis→synthesis
 * - Late phases (synthesis, consensus) focus on synthesis and consent-building
 */
export const PHASE_METHODOLOGY_MAP: Record<SessionPhase, PhaseMethodology> = {
  initialization: {
    argumentationStyle: 'collaborative',
    consensusMethod: 'consent',
    rationale: 'Setup phase - collaborative introduction, no contentious decisions',
  },
  context_loading: {
    argumentationStyle: 'collaborative',
    consensusMethod: 'consent',
    rationale: 'Information gathering - collaborative review of materials',
  },
  research: {
    argumentationStyle: 'socratic',
    consensusMethod: 'consent',
    rationale: 'Question-driven exploration to identify information gaps',
  },
  brainstorming: {
    argumentationStyle: 'collaborative',
    consensusMethod: 'consent',
    rationale: 'Idea generation - "Yes, and..." builds on ideas without premature criticism',
  },
  argumentation: {
    argumentationStyle: 'dialectic',
    consensusMethod: 'supermajority',
    rationale: 'Critical debate - thesis→antithesis→synthesis refines ideas rigorously',
  },
  synthesis: {
    argumentationStyle: 'mixed',
    consensusMethod: 'synthesis',
    rationale: 'Combining best elements - adaptive methods converge on combined solutions',
  },
  drafting: {
    argumentationStyle: 'collaborative',
    consensusMethod: 'consent',
    rationale: 'Content creation - collaborative building with rapid iteration',
  },
  review: {
    argumentationStyle: 'adversarial',
    consensusMethod: 'supermajority',
    rationale: 'Critical review - strong opposing viewpoints catch issues',
  },
  consensus: {
    argumentationStyle: 'mixed',
    consensusMethod: 'unanimous',
    rationale: 'Final agreement - all voices heard, full alignment required',
  },
  finalization: {
    argumentationStyle: 'collaborative',
    consensusMethod: 'consent',
    rationale: 'Wrap-up phase - no objections needed to proceed',
  },
};

/**
 * Gets the optimal methodology for a given phase.
 * Falls back to default if phase not found.
 */
export function getPhaseMethodology(phase: SessionPhase): PhaseMethodology {
  return PHASE_METHODOLOGY_MAP[phase] || {
    argumentationStyle: 'mixed',
    consensusMethod: 'consent',
    rationale: 'Fallback methodology',
  };
}

// ============================================================================
// PHASE CONFIGURATIONS
// ============================================================================

export const DEFAULT_PHASES: PhaseConfig[] = [
  {
    phase: 'initialization',
    description: 'Set up the session and introduce the goal',
    maxRounds: 1,
    requiredActions: ['Load configuration', 'Introduce agents', 'Present goal'],
    exitConditions: ['All agents acknowledged'],
  },
  {
    phase: 'context_loading',
    description: 'Load and review context materials',
    maxRounds: 2,
    requiredActions: ['Scan context folder', 'Summarize findings', 'Identify gaps'],
    exitConditions: ['Context reviewed', 'Gaps identified'],
  },
  {
    phase: 'research',
    description: 'Gather additional information if needed',
    maxRounds: 3,
    requiredActions: ['Request research', 'Review findings', 'Extract insights'],
    exitConditions: ['Sufficient information gathered', 'No more questions'],
  },
  {
    phase: 'brainstorming',
    description: 'Generate ideas freely',
    maxRounds: 5,
    requiredActions: ['Generate ideas', 'Build on others', 'No criticism yet'],
    exitConditions: ['Enough ideas generated', 'Ideas start repeating'],
  },
  {
    phase: 'argumentation',
    description: 'Debate and refine ideas',
    maxRounds: 10,
    requiredActions: ['Present arguments', 'Counter-argue', 'Find common ground'],
    exitConditions: ['Key points settled', 'Ready for synthesis'],
  },
  {
    phase: 'synthesis',
    description: 'Combine best elements',
    maxRounds: 3,
    requiredActions: ['Identify best elements', 'Propose combinations', 'Refine'],
    exitConditions: ['Synthesis achieved', 'Ready for drafting'],
  },
  {
    phase: 'drafting',
    description: 'Create actual content',
    maxRounds: 5,
    requiredActions: ['Write drafts', 'Review structure', 'Check visual needs'],
    exitConditions: ['Drafts complete', 'Ready for review'],
  },
  {
    phase: 'review',
    description: 'Critique and improve drafts',
    maxRounds: 5,
    requiredActions: ['Review each draft', 'Provide feedback', 'Suggest changes'],
    exitConditions: ['All feedback given', 'Changes incorporated'],
  },
  {
    phase: 'consensus',
    description: 'Reach final agreement',
    maxRounds: 3,
    requiredActions: ['Present final versions', 'Vote/discuss', 'Resolve conflicts'],
    exitConditions: ['Consensus reached', 'Minority concerns documented'],
  },
  {
    phase: 'finalization',
    description: 'Finalize and export',
    maxRounds: 1,
    requiredActions: ['Final review', 'Export content', 'Document decisions'],
    exitConditions: ['Content exported', 'Session complete'],
  },
];

// ============================================================================
// DEFAULT METHODOLOGY CONFIG
// ============================================================================

export const DEFAULT_METHODOLOGY: MethodologyConfig = {
  argumentationStyle: 'mixed',
  consensusMethod: 'consent',
  visualDecisionRules: VISUAL_DECISION_RULES,
  structureDecisionRules: STRUCTURE_DECISION_RULES,
  phases: DEFAULT_PHASES,
};

export function getDefaultMethodology(): MethodologyConfig {
  return { ...DEFAULT_METHODOLOGY };
}

/**
 * Gets methodology prompt for the current configuration.
 * When phase is provided, overrides config's methodology with phase-optimal settings.
 *
 * @param config - The methodology configuration
 * @param currentPhase - Optional phase to use phase-specific methodology
 */
export function getMethodologyPrompt(config: MethodologyConfig, currentPhase?: SessionPhase): string {
  // Use phase-specific methodology if phase is provided
  const phaseMethodology = currentPhase ? getPhaseMethodology(currentPhase) : null;

  const argStyle = phaseMethodology?.argumentationStyle || config.argumentationStyle;
  const consMethod = phaseMethodology?.consensusMethod || config.consensusMethod;

  const argGuide = ARGUMENTATION_GUIDES[argStyle];
  const consGuide = CONSENSUS_GUIDES[consMethod];

  // Build phase context if available
  const phaseContext = phaseMethodology
    ? `
## CURRENT PHASE: ${currentPhase?.toUpperCase()}
Methodology rationale: ${phaseMethodology.rationale}

`
    : '';

  return `${phaseContext}## ARGUMENTATION METHODOLOGY: ${argGuide.name}
${argGuide.description}

Steps:
${argGuide.steps.join('\n')}

Rules:
${argGuide.rules.join('\n')}

## CONSENSUS METHOD: ${consGuide.name}
${consGuide.description}

Process:
${consGuide.process.join('\n')}

## WHEN TO USE VISUALS
${config.visualDecisionRules.map((r) => `- ${r.condition} → ${r.recommendedVisual}: ${r.reasoning}`).join('\n')}

## WHEN TO USE WHICH STRUCTURE
${config.structureDecisionRules.map((r) => `- ${r.condition} → ${r.recommendedStructure}: ${r.reasoning}`).join('\n')}
`.trim();
}

/**
 * Gets a methodology prompt optimized for a specific phase.
 * Uses PHASE_METHODOLOGY_MAP for automatic methodology selection.
 *
 * @param phase - The session phase to get methodology for
 * @param config - Optional config for visual/structure rules (uses DEFAULT if not provided)
 */
export function getPhaseMethodologyPrompt(phase: SessionPhase, config?: MethodologyConfig): string {
  const effectiveConfig = config || DEFAULT_METHODOLOGY;
  return getMethodologyPrompt(effectiveConfig, phase);
}
