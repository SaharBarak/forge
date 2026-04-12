/**
 * Phase transition rendering for the deliberation pipeline.
 *
 * Forge sessions move through 10 phases. This module produces visual
 * indicators for phase state: transition banners, progress bars, and
 * phase-list summaries.
 */

import { forgeTheme, style } from './theme';
import { progressBar } from './progress';
import { phaseBanner } from './borders';

const PHASES = [
  'initialization',
  'context_loading',
  'research',
  'brainstorming',
  'argumentation',
  'synthesis',
  'drafting',
  'review',
  'consensus',
  'finalization',
] as const;

export type PhaseName = (typeof PHASES)[number];

// ---- phase transition banner ----

/**
 * Full-width banner announcing a phase transition.
 *
 *   ═══════ ENTERING SYNTHESIS ═══════
 */
export const phaseTransition = (
  _from: PhaseName | null,
  to: PhaseName,
  width: number
): string => {
  const label = `ENTERING ${to.toUpperCase().replace('_', ' ')}`;
  return phaseBanner(label, width);
};

// ---- phase progress ----

/**
 * Compact phase progress indicator.
 *
 *   Phase 6/10 ████████░░ SYNTHESIS
 */
export const phaseProgress = (current: PhaseName, width: number): string => {
  const idx = PHASES.indexOf(current);
  const ratio = (idx + 1) / PHASES.length;
  const barWidth = Math.max(6, Math.min(20, width - 25));
  const bar = progressBar(ratio, barWidth, forgeTheme.phase.active);
  const label = style(forgeTheme.phase.label, current.toUpperCase().replace('_', ' '));
  const counter = style(forgeTheme.text.muted, `${idx + 1}/${PHASES.length}`);
  return `${counter} ${bar} ${label}`;
};

// ---- phase list ----

/**
 * Vertical phase list with done/active/pending markers.
 *
 *   ✔ initialization
 *   ✔ context_loading
 *   ● research          ← active
 *   ○ brainstorming
 *   ○ argumentation
 */
export const phaseList = (current: PhaseName): string => {
  const currentIdx = PHASES.indexOf(current);
  return PHASES.map((phase, i) => {
    if (i < currentIdx) {
      return `  ${style(forgeTheme.phase.done, '✔')} ${style(forgeTheme.text.muted, phase)}`;
    }
    if (i === currentIdx) {
      return `  ${style(forgeTheme.phase.active, '●')} ${style(forgeTheme.phase.active, phase)}`;
    }
    return `  ${style(forgeTheme.text.muted, '○')} ${style(forgeTheme.text.muted, phase)}`;
  }).join('\r\n') + '\r\n';
};
