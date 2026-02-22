/**
 * BreadcrumbWidget — navigation path display
 */

import type blessed from 'blessed';
import { PHASE_EMOJI, PHASE_COLORS } from '../theme';
import type { SessionPhase } from '../../../src/types';

export function updateBreadcrumbs(
  widget: blessed.Widgets.BoxElement,
  projectName: string,
  phase: SessionPhase,
): void {
  const phaseEmoji = PHASE_EMOJI[phase] || '';
  const phaseName = phase.replace(/_/g, ' ').toUpperCase();
  const phaseColor = PHASE_COLORS[phase] || 'white';

  const content = `{cyan-fg}{bold}\u{1F525} Forge{/bold}{/cyan-fg} {gray-fg}>{/gray-fg} ${projectName} {gray-fg}>{/gray-fg} {${phaseColor}-fg}{bold}${phaseEmoji} ${phaseName}{/bold}{/${phaseColor}-fg}`;

  widget.setContent(content);
}
