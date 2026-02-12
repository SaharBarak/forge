/**
 * Dashboard grid layout using blessed-contrib
 *
 * 12x12 grid:
 *   Row 0:    Header (1 row, 12 cols)
 *   Row 1:    Breadcrumbs (1 row, 12 cols)
 *   Row 2-8:  Chat Log (7 rows, 5 cols) | Canvas (7 rows, 3 cols) | Agent Panel (3 rows, 4 cols)
 *   Row 5-6:  (continued)               | (continued)              | Consensus Chart (2 rows, 4 cols)
 *   Row 7-8:  (continued)               | (continued)              | Phase Timeline (2 rows, 4 cols)
 *   Row 9:    Quick Replies / Suggestion (1 row, 12 cols)
 *   Row 10:   Input Box (1 row, 12 cols)
 *   Row 11:   Status Bar (1 row, 12 cols)
 */

import contrib from 'blessed-contrib';
import blessed from 'blessed';
import type { DashboardWidgets } from './types';
import { BOX_STYLE, COLORS } from './theme';

export function createLayout(screen: blessed.Widgets.Screen): DashboardWidgets {
  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen,
  });

  // Row 0: Header
  const header = grid.set(0, 0, 1, 12, blessed.box, {
    tags: true,
    style: {
      fg: 'white',
      bg: 'default',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
  });

  // Row 1: Breadcrumbs
  const breadcrumbs = grid.set(1, 0, 1, 12, blessed.box, {
    tags: true,
    style: {
      fg: 'white',
      bg: 'default',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
  });

  // Rows 2-8, cols 0-4: Chat Log (using contrib.log for scrollback + tags)
  const chatLog = grid.set(2, 0, 7, 5, contrib.log, {
    tags: true,
    fg: 'white',
    label: ' Chat ',
    border: { type: 'line', fg: 'gray' },
    style: {
      fg: 'white',
      border: { fg: 'gray' },
      focus: { border: { fg: 'cyan' } },
    },
    scrollbar: {
      fg: 'cyan',
      ch: '\u2503', // ┃
    },
    scrollable: true,
    mouse: false,
    keys: true,
    vi: true,
    interactive: true,
    bufferLength: 2000,
  });

  // Rows 2-8, cols 5-7: Canvas (wireframe)
  const canvas = grid.set(2, 5, 7, 3, blessed.box, {
    tags: true,
    label: ' Wireframe ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'cyan' },
    },
    scrollable: true,
  });

  // Rows 2-4, cols 8-11: Agent Panel
  const agentPanel = grid.set(2, 8, 3, 4, blessed.box, {
    tags: true,
    label: ' Agents ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'gray' },
    },
    scrollable: true,
  });

  // Rows 5-6, cols 8-11: Consensus Chart
  const consensusChart = grid.set(5, 8, 2, 4, contrib.line, {
    label: ' Consensus Trend ',
    showLegend: true,
    legend: { width: 14 },
    minY: 0,
    style: {
      line: 'green',
      text: 'white',
      baseline: 'black',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
    xLabelPadding: 1,
    xPadding: 2,
    wholeNumbersOnly: true,
  });

  // Rows 7-8, cols 8-11: Phase Timeline
  const phaseTimeline = grid.set(7, 8, 2, 4, blessed.box, {
    tags: true,
    label: ' Phase Progress ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      border: { fg: 'gray' },
    },
  });

  // Row 9: Quick Replies + Suggestion banner (overlaid)
  const quickReplies = grid.set(9, 0, 1, 12, blessed.box, {
    tags: true,
    style: {
      fg: 'white',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
  });

  // Suggestion — same row as quick replies, shown/hidden dynamically
  const suggestion = grid.set(9, 0, 1, 12, blessed.box, {
    tags: true,
    hidden: true,
    style: {
      fg: 'yellow',
      bg: 'default',
      border: { fg: 'yellow' },
    },
    border: { type: 'line' },
  });

  // Row 10: Input Box
  // NOTE: mouse is OFF to prevent raw mouse escape sequences from leaking into the textbox as text.
  // Focus is managed programmatically by the DashboardController.
  const input = grid.set(10, 0, 1, 12, blessed.textbox, {
    label: ' > ',
    border: { type: 'line' },
    style: {
      fg: 'white',
      bg: 'default',
      border: { fg: 'cyan' },
      focus: { border: { fg: 'cyan' } },
    },
    inputOnFocus: false,
    mouse: false,
    keys: true,
  });

  // Row 11: Status Bar
  const statusBar = grid.set(11, 0, 1, 12, blessed.box, {
    tags: true,
    style: {
      fg: 'gray',
      bg: 'default',
      border: { fg: 'gray' },
    },
    border: { type: 'line' },
  });

  return {
    header,
    breadcrumbs,
    chatLog,
    canvas,
    agentPanel,
    consensusChart,
    phaseTimeline,
    quickReplies,
    suggestion,
    input,
    statusBar,
  };
}
