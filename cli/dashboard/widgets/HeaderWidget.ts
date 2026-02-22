/**
 * HeaderWidget — gradient logo + phase info + message stats + resonance
 */

import chalk from 'chalk';
import type blessed from 'blessed';
import { LOGO_GRADIENT, PHASE_EMOJI, RESONANCE_COLORS } from '../theme';
import type { SessionPhase } from '../../../src/types';

const FORGE_LETTERS = ['F', ' ', 'O', ' ', 'R', ' ', 'G', ' ', 'E'];

function buildGradientLogo(): string {
  // Map each letter to a gradient RGB color using chalk
  let logo = '';
  const colorIdx = [0, 0, 1, 1, 2, 2, 3, 3, 4]; // map 9 chars → 5 colors
  for (let i = 0; i < FORGE_LETTERS.length; i++) {
    const [r, g, b] = LOGO_GRADIENT[colorIdx[i]];
    logo += chalk.rgb(r, g, b).bold(FORGE_LETTERS[i]);
  }
  return logo;
}

function getResonanceColor(score: number): string {
  if (score >= 60) return RESONANCE_COLORS.high;
  if (score >= 30) return RESONANCE_COLORS.medium;
  return RESONANCE_COLORS.low;
}

export function updateHeader(
  widget: blessed.Widgets.BoxElement,
  phase: SessionPhase,
  currentSpeaker: string | null,
  messageCount: number,
  consensusPoints: number,
  conflictPoints: number,
  resonanceGlobal?: number,
): void {
  const logo = buildGradientLogo();
  const phaseEmoji = PHASE_EMOJI[phase] || '';
  const phaseName = phase.replace(/_/g, ' ').toUpperCase();

  // Build floor info
  const floor = currentSpeaker
    ? `Floor: {green-fg}${currentSpeaker}{/green-fg}`
    : 'Floor: {gray-fg}open{/gray-fg}';

  // Build stats with resonance
  let stats = `Msgs:{bold}${messageCount}{/bold} {green-fg}\u2713${consensusPoints}{/green-fg} {red-fg}\u2717${conflictPoints}{/red-fg}`;

  if (resonanceGlobal !== undefined) {
    const rColor = getResonanceColor(resonanceGlobal);
    stats += ` {${rColor}-fg}R:${resonanceGlobal}{/${rColor}-fg}`;
  }

  // Raw ANSI from chalk works inside blessed box content alongside blessed tags
  const content = `${logo}  {gray-fg}\u2502{/gray-fg}  ${phaseEmoji} {bold}${phaseName}{/bold}  {gray-fg}\u2502{/gray-fg}  ${floor}  {gray-fg}\u2502{/gray-fg}  ${stats}`;

  widget.setContent(content);
}
