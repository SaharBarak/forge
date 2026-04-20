/**
 * ReactionEngine — event-driven remediation rules for a running
 * deliberation.
 *
 * Subscribes to orchestrator events and, based on a user-configurable
 * rule set, fires actions: force-speak, inject a directive into an
 * agent's system prompt, pause an agent, or just log.
 *
 * Inspired by Octopus's reaction engine, scoped to the signals a
 * deliberation engine actually emits (loop detected, stuck agent,
 * low consensus, phase transition). GitHub/CI reactions are out of
 * scope — those need infrastructure we don't have.
 *
 * Config shape (YAML or JSON at `reactions.yaml` / `reactions.json`
 * in the cwd, or passed explicitly):
 *
 *   rules:
 *     - trigger: loop_detected
 *       action: inject_directive
 *       agent: "*"
 *       param: "Stop re-debating. State your ONE best idea. Vote now."
 *     - trigger: stuck_agent
 *       action: force_speak
 *     - trigger: low_consensus_after_15
 *       action: inject_directive
 *       agent: analyst
 *       param: "Run a final synthesis, tag it [SYNTHESIS]."
 *
 * A sensible built-in default is used if no config is loaded.
 */

import type { EDAOrchestrator, EDAEvent } from './EDAOrchestrator';

export type ReactionTrigger =
  | 'loop_detected'
  | 'stuck_agent'
  | 'low_consensus_after_15'
  | 'phase_change'
  | 'session_start';

export type ReactionAction =
  | 'force_speak'
  | 'inject_directive'
  | 'pause'
  | 'log';

export interface ReactionRule {
  trigger: ReactionTrigger;
  action: ReactionAction;
  /** Target agent for actions that need one · '*' = all, or a persona id. */
  agent?: string;
  /** For inject_directive: the suffix text. For log: the message to log. */
  param?: string;
  /** Only fire the rule this many times per session (default: 3). */
  maxFires?: number;
}

export interface ReactionConfig {
  rules: ReactionRule[];
}

export const DEFAULT_RULES: ReactionConfig = {
  rules: [
    {
      trigger: 'loop_detected',
      action: 'inject_directive',
      agent: '*',
      param: 'Stop re-litigating. State your single strongest position in two sentences. Tag it [SYNTHESIS].',
      maxFires: 3,
    },
    {
      trigger: 'stuck_agent',
      action: 'force_speak',
      maxFires: 4,
    },
    {
      trigger: 'low_consensus_after_15',
      action: 'inject_directive',
      agent: 'analyst',
      param: 'The room has been talking for 15+ turns without agreement. Run a written synthesis tagged [SYNTHESIS] that names the single decision point.',
      maxFires: 1,
    },
  ],
};

export class ReactionEngine {
  private readonly orchestrator: EDAOrchestrator;
  private readonly rules: ReactionRule[];
  private readonly fired: Map<string, number> = new Map();
  private messageCount = 0;
  private lastSpokeAt: Map<string, number> = new Map();
  private unsubscribe?: () => void;

  constructor(orchestrator: EDAOrchestrator, config: ReactionConfig = DEFAULT_RULES) {
    this.orchestrator = orchestrator;
    this.rules = config.rules;
  }

  start(): void {
    this.unsubscribe = this.orchestrator.on((event) => this.handle(event));
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private ruleKey(rule: ReactionRule): string {
    return `${rule.trigger}:${rule.action}:${rule.agent ?? ''}`;
  }

  private canFire(rule: ReactionRule): boolean {
    const key = this.ruleKey(rule);
    const fires = this.fired.get(key) ?? 0;
    const cap = rule.maxFires ?? 3;
    return fires < cap;
  }

  private recordFire(rule: ReactionRule): void {
    const key = this.ruleKey(rule);
    this.fired.set(key, (this.fired.get(key) ?? 0) + 1);
  }

  private async apply(rule: ReactionRule): Promise<void> {
    const targetAgents = this.resolveTargets(rule.agent);
    switch (rule.action) {
      case 'force_speak':
        for (const id of targetAgents) {
          void this.orchestrator.forceSpeak(id, 'reaction-engine');
        }
        break;
      case 'inject_directive':
        if (rule.param) {
          for (const id of targetAgents) {
            this.orchestrator.injectSystemSuffix(id, rule.param);
          }
        }
        break;
      case 'pause':
        for (const id of targetAgents) {
          this.orchestrator.updateAgentConfig(id, { paused: true });
        }
        break;
      case 'log':
        console.error(`[reaction] ${rule.trigger} → log: ${rule.param ?? ''}`);
        break;
    }
    this.recordFire(rule);
  }

  private resolveTargets(spec?: string): string[] {
    const enabled = this.orchestrator.getSession().config.enabledAgents;
    if (!spec || spec === '*') return [...enabled];
    return enabled.filter((id) => id === spec);
  }

  private handle(event: EDAEvent): void {
    // Track message count + last-spoke per agent for stuck detection
    if (event.type === 'agent_message') {
      const data = event.data as { agentId?: string };
      this.messageCount++;
      if (data.agentId) this.lastSpokeAt.set(data.agentId, this.messageCount);
    }

    if (event.type === 'intervention') {
      const data = event.data as { type?: string };
      if (data.type === 'loop_detected') {
        for (const rule of this.rules) {
          if (rule.trigger === 'loop_detected' && this.canFire(rule)) void this.apply(rule);
        }
      }
    }

    if (event.type === 'phase_change') {
      for (const rule of this.rules) {
        if (rule.trigger === 'phase_change' && this.canFire(rule)) void this.apply(rule);
      }
    }

    // Stuck-agent detection: any enabled agent who hasn't spoken in
    // 12+ messages while others have triggered a force-speak rule.
    if (event.type === 'agent_message' && this.messageCount % 6 === 0) {
      const enabled = this.orchestrator.getSession().config.enabledAgents;
      for (const id of enabled) {
        const lastTurn = this.lastSpokeAt.get(id) ?? 0;
        if (this.messageCount - lastTurn >= 12) {
          for (const rule of this.rules) {
            if (rule.trigger === 'stuck_agent' && this.canFire(rule)) {
              // Only target the stuck agent
              const scoped: ReactionRule = { ...rule, agent: id };
              void this.apply(scoped);
            }
          }
        }
      }
    }

    // Low-consensus rule fires once at the 15-message mark if the
    // consensus ratio is still under threshold.
    if (event.type === 'agent_message' && this.messageCount === 15) {
      const ratio = this.orchestrator.getConsensusRatio();
      if (ratio < 0.5) {
        for (const rule of this.rules) {
          if (rule.trigger === 'low_consensus_after_15' && this.canFire(rule)) void this.apply(rule);
        }
      }
    }
  }
}
