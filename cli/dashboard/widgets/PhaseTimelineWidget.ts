/**
 * PhaseTimelineWidget — phase dots with progress indication
 */

import type blessed from 'blessed';
import type { SessionPhase } from '../../../src/types';
import { ALL_PHASES, PHASE_LABELS, PHASE_COLORS, DOT_DONE, DOT_CURRENT, DOT_FUTURE, DOT_LINE, BAR_CHAR, BAR_EMPTY } from '../theme';

/**
 * Build a gauge bar for current phase progress
 */
function buildGauge(percent: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
  return `{green-fg}${BAR_CHAR.repeat(filled)}{/green-fg}{gray-fg}${BAR_EMPTY.repeat(width - filled)}{/gray-fg} ${percent}%`;
}

export function updatePhaseTimeline(
  widget: blessed.Widgets.BoxElement,
  currentPhase: SessionPhase,
  phaseMessageCount: number,
  phaseThreshold: number,
): void {
  const currentIdx = ALL_PHASES.indexOf(currentPhase);
  const lines: string[] = [];

  // Render each phase as a labeled dot: "● Init ── ● Brain ── ..."
  // This keeps dots and labels together so alignment is never an issue.
  let timeline = '';
  for (let i = 0; i < ALL_PHASES.length; i++) {
    const phaseColor = PHASE_COLORS[ALL_PHASES[i]] || 'white';
    const label = PHASE_LABELS[ALL_PHASES[i]];
    let dot: string;
    let labelColor: string;

    if (i < currentIdx) {
      dot = `{green-fg}${DOT_DONE}{/green-fg}`;
      labelColor = 'green';
    } else if (i === currentIdx) {
      dot = `{${phaseColor}-fg}${DOT_CURRENT}{/${phaseColor}-fg}`;
      labelColor = phaseColor;
    } else {
      dot = `{gray-fg}${DOT_FUTURE}{/gray-fg}`;
      labelColor = 'gray';
    }

    timeline += `${dot}{${labelColor}-fg}${label}{/${labelColor}-fg}`;

    // Connector between phases
    if (i < ALL_PHASES.length - 1) {
      if (i < currentIdx) {
        timeline += `{green-fg}${DOT_LINE}{/green-fg}`;
      } else {
        timeline += `{gray-fg}${DOT_LINE}{/gray-fg}`;
      }
    }
  }

  lines.push(timeline);

  // Progress gauge for current phase
  const percent = phaseThreshold > 0
    ? Math.max(0, Math.min(100, Math.round((phaseMessageCount / phaseThreshold) * 100)))
    : 0;
  lines.push('');
  lines.push(`Progress: ${buildGauge(percent, 15)}`);

  widget.setContent(lines.join('\n'));
}
