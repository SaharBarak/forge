/**
 * Lazy loader for methodology guides
 * Reduces initial bundle by deferring methodology data until needed
 */

import type {
  MethodologyConfig,
  SessionPhase,
} from '../../types';

// Cached module reference
let methodologiesModule: typeof import('../../methodologies') | null = null;

/**
 * Lazily loads the methodologies module
 */
export async function loadMethodologies() {
  if (methodologiesModule) {
    return methodologiesModule;
  }

  methodologiesModule = await import('../../methodologies');
  return methodologiesModule;
}

/**
 * Gets argumentation guide by style name
 */
export async function getArgumentationGuide(style: string) {
  const { ARGUMENTATION_GUIDES } = await loadMethodologies();
  return ARGUMENTATION_GUIDES[style as keyof typeof ARGUMENTATION_GUIDES];
}

/**
 * Gets consensus guide by method name
 */
export async function getConsensusGuide(method: string) {
  const { CONSENSUS_GUIDES } = await loadMethodologies();
  return CONSENSUS_GUIDES[method as keyof typeof CONSENSUS_GUIDES];
}

/**
 * Gets visual decision rules
 */
export async function getVisualDecisionRules() {
  const { VISUAL_DECISION_RULES } = await loadMethodologies();
  return VISUAL_DECISION_RULES;
}

/**
 * Gets structure decision rules
 */
export async function getStructureDecisionRules() {
  const { STRUCTURE_DECISION_RULES } = await loadMethodologies();
  return STRUCTURE_DECISION_RULES;
}

/**
 * Gets phase methodology for a given phase
 */
export async function getPhaseMethodology(phase: SessionPhase) {
  const { getPhaseMethodology: getPhaseMeth } = await loadMethodologies();
  return getPhaseMeth(phase);
}

/**
 * Gets methodology prompt
 */
export async function getMethodologyPrompt(
  config: MethodologyConfig,
  currentPhase?: SessionPhase
): Promise<string> {
  const { getMethodologyPrompt: getMethPrompt } = await loadMethodologies();
  return getMethPrompt(config, currentPhase);
}

/**
 * Gets default methodology config
 */
export async function getDefaultMethodology(): Promise<MethodologyConfig> {
  const { getDefaultMethodology: getDefMeth } = await loadMethodologies();
  return getDefMeth();
}

/**
 * Gets default phases configuration
 */
export async function getDefaultPhases() {
  const { DEFAULT_PHASES } = await loadMethodologies();
  return DEFAULT_PHASES;
}
