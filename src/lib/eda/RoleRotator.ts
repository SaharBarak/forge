/**
 * RoleRotator — assigns a rotating debate role to each agent.
 *
 * On session start, every agent gets an initial role from the
 * DEBATE_ROLES catalog. At each phase transition, the assignments
 * shift by one (round-robin) and every agent receives a fresh
 * `systemSuffix` containing the new role's stance directive plus a
 * "you were X, now you're Y" preamble.
 *
 * The orchestrator's `injectSystemSuffix` applies live — the agent's
 * very next response uses the new stance. A system message is also
 * dropped onto the bus so the TUI discussion pane shows a
 * "⤺ Agent X is now the Y" breadcrumb.
 */

import type { EDAOrchestrator, EDAEvent } from './EDAOrchestrator';
import { DEBATE_ROLES, type DebateRole, buildRotationDirective } from '../roles';

interface RoleAssignment {
  agentId: string;
  roleIndex: number;
}

export class RoleRotator {
  private readonly orchestrator: EDAOrchestrator;
  private readonly agentIds: string[];
  private assignments: RoleAssignment[];
  private previous: Map<string, string> = new Map();
  private unsubscribe?: () => void;

  constructor(orchestrator: EDAOrchestrator, agentIds: ReadonlyArray<string>) {
    this.orchestrator = orchestrator;
    this.agentIds = [...agentIds];
    // Initial assignment: agent i → role i (mod role count)
    this.assignments = this.agentIds.map((id, i) => ({
      agentId: id,
      roleIndex: i % DEBATE_ROLES.length,
    }));
  }

  /** Apply the current assignment set and subscribe to phase_change. */
  start(): void {
    this.applyAssignments(/* initial = */ true);
    this.unsubscribe = this.orchestrator.on((event) => this.handleEvent(event));
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  /** Current role (by id) each agent is playing — for TUI to show a badge. */
  snapshot(): Map<string, DebateRole> {
    const out = new Map<string, DebateRole>();
    for (const { agentId, roleIndex } of this.assignments) {
      out.set(agentId, DEBATE_ROLES[roleIndex]);
    }
    return out;
  }

  private handleEvent(event: EDAEvent): void {
    if (event.type !== 'phase_change') return;
    // Phase just advanced · rotate every role by one slot.
    this.assignments = this.assignments.map(({ agentId, roleIndex }) => ({
      agentId,
      roleIndex: (roleIndex + 1) % DEBATE_ROLES.length,
    }));
    this.applyAssignments(false);
  }

  private applyAssignments(initial: boolean): void {
    for (const { agentId, roleIndex } of this.assignments) {
      const role = DEBATE_ROLES[roleIndex];
      const prevId = this.previous.get(agentId);
      const directive = buildRotationDirective(role, initial ? undefined : prevId);
      this.orchestrator.injectSystemSuffix(agentId, directive);
      this.previous.set(agentId, role.id);

      // Announce the rotation in the bus so the TUI + transcript show it.
      const announcement = initial
        ? `${this.labelFor(agentId)} starts as the ${role.name}.`
        : `${this.labelFor(agentId)} is now the ${role.name}. (was ${prevId ? this.capitalise(prevId) : 'unassigned'})`;
      this.orchestrator.addSystemMessage(announcement);
    }
  }

  private labelFor(agentId: string): string {
    // Try to read the agent's runtime config for a provider-aware label.
    try {
      const cfg = this.orchestrator.getAgentConfig(agentId);
      const providers = this.orchestrator.getProviders();
      const provider = providers?.tryGet(cfg.providerId);
      const model = provider?.listModels().find((m) => m.id === cfg.modelId);
      return `${provider?.name ?? cfg.providerId} · ${model?.label ?? cfg.modelId}`;
    } catch {
      return agentId;
    }
  }

  private capitalise(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
