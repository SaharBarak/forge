/**
 * ConsensusChartWidget — line chart showing consensus vs conflict vs resonance over time
 * Uses blessed-contrib's line widget
 */

// The contrib.line widget has a setData method
interface ContribLine {
  setData(data: Array<{ title: string; x: string[]; y: number[]; style: { line: string } }>): void;
}

const MAX_DATA_POINTS = 20;

export function updateConsensusChart(
  widget: ContribLine,
  consensusHistory: number[],
  conflictHistory: number[],
  resonanceHistory?: number[],
): void {
  // Take last N data points
  const consensus = consensusHistory.slice(-MAX_DATA_POINTS);
  const conflict = conflictHistory.slice(-MAX_DATA_POINTS);
  const resonance = resonanceHistory?.slice(-MAX_DATA_POINTS) ?? [];

  // X labels = message snapshot indices
  const maxLen = Math.max(consensus.length, conflict.length, resonance.length, 1);
  const xLabels = Array.from({ length: maxLen }, (_, i) => String(i + 1));

  const data = [
    {
      title: '\u2713 Consensus',
      x: xLabels,
      y: consensus.length > 0 ? consensus : [0],
      style: { line: 'green' },
    },
    {
      title: '\u2717 Conflict',
      x: xLabels.length > 0 ? xLabels : ['1'],
      y: conflict.length > 0 ? conflict : [0],
      style: { line: 'red' },
    },
  ];

  // Add resonance series if data exists
  if (resonance.length > 0) {
    data.push({
      title: '\u2661 Resonance',
      x: xLabels,
      y: resonance,
      style: { line: 'cyan' },
    });
  }

  widget.setData(data);
}
