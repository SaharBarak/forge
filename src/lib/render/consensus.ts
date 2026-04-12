/**
 * Consensus and deliberation visualizations.
 *
 * Terminal-native renderers for multi-agent debate state: thermometers,
 * stance indicators, vote summaries, debate intensity. All produce ANSI
 * strings — callers write them to xterm.js.
 */

import { forgeTheme, style } from './theme';
import { dualProgressBar, sparkline, percentLabel } from './progress';

// ---- consensus thermometer ----

export interface ConsensusSnapshot {
  readonly agrees: number;
  readonly disagrees: number;
  readonly neutrals: number;
  readonly total: number;
}

/**
 * Full-width consensus thermometer with vote counts.
 *
 *   Consensus ████████████░░░░ 75% agree (3/4)
 */
export const consensusThermometer = (
  snapshot: ConsensusSnapshot,
  width: number
): string => {
  const barWidth = Math.max(8, width - 30);
  const agreeRatio = snapshot.total > 0 ? snapshot.agrees / snapshot.total : 0;
  const disagreeRatio = snapshot.total > 0 ? snapshot.disagrees / snapshot.total : 0;
  const bar = dualProgressBar(agreeRatio, disagreeRatio, barWidth);
  const pct = percentLabel(agreeRatio);
  const counts = style(
    forgeTheme.text.muted,
    `(${snapshot.agrees}/${snapshot.total})`
  );
  return `${style(forgeTheme.consensus.proposal, 'Consensus')} ${bar} ${pct} ${counts}`;
};

// ---- debate intensity ----

/**
 * Message-velocity sparkline — shows how hot the debate is over a window.
 * Increasing velocity = diverging; decreasing = converging.
 *
 *   Debate ▁▂▃▅▇▅▃▂▁ converging
 */
export const debateIntensity = (
  messageCounts: ReadonlyArray<number>,
  width: number
): string => {
  const recent = messageCounts.slice(-Math.min(messageCounts.length, width));
  const trend = detectTrend(recent);
  const chart = sparkline(recent, forgeTheme.status.info);
  const label = style(
    trend === 'converging'
      ? forgeTheme.status.success
      : trend === 'diverging'
        ? forgeTheme.status.warning
        : forgeTheme.text.muted,
    trend
  );
  return `${style(forgeTheme.text.muted, 'Debate')} ${chart} ${label}`;
};

type Trend = 'converging' | 'diverging' | 'stable';

const detectTrend = (values: ReadonlyArray<number>): Trend => {
  if (values.length < 3) return 'stable';
  const mid = Math.floor(values.length / 2);
  const firstHalfAvg =
    values.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const secondHalfAvg =
    values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid);
  const delta = secondHalfAvg - firstHalfAvg;
  if (delta > 0.5) return 'diverging';
  if (delta < -0.5) return 'converging';
  return 'stable';
};

// ---- stance summary ----

export interface AgentStance {
  readonly agentId: string;
  readonly stance: 'FOR' | 'AGAINST' | 'NEUTRAL';
  readonly confidence?: number;
}

/**
 * Compact stance summary across all agents.
 *
 *   ronit:FOR  yossi:AGAINST  noa:NEUTRAL
 */
export const stanceSummary = (
  stances: ReadonlyArray<AgentStance>,
  agentColors: Readonly<Record<string, string>>
): string =>
  stances
    .map((s) => {
      const nameColor = agentColors[s.agentId] ?? forgeTheme.text.primary;
      const stanceColor =
        s.stance === 'FOR'
          ? forgeTheme.consensus.agree
          : s.stance === 'AGAINST'
            ? forgeTheme.consensus.disagree
            : forgeTheme.consensus.neutral;
      return `${style(nameColor, s.agentId)}:${style(stanceColor, s.stance)}`;
    })
    .join('  ');

// ---- vote tally ----

/**
 * Compact vote tally for community contributions.
 *
 *   ▲12 ▼3
 */
export const voteTally = (up: number, down: number): string => {
  const upStr = style(forgeTheme.consensus.agree, `▲${up}`);
  const downStr = style(forgeTheme.consensus.disagree, `▼${down}`);
  return `${upStr} ${downStr}`;
};
