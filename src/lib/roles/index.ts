/**
 * Debate roles — dynamic stances that the RoleRotator assigns to
 * provider-named agents at each phase transition.
 *
 * Unlike personas (which are baked into an agent for the whole
 * session), roles ROTATE · the same physical agent might be the
 * skeptic in phase 1 and the pragmatist in phase 2. Each role ships
 * with a `stanceDirective` that the orchestrator injects as the
 * agent's systemSuffix when the assignment flips.
 */

export interface DebateRole {
  id: string;
  name: string;
  short: string;
  stanceDirective: string;
}

export const DEBATE_ROLES: ReadonlyArray<DebateRole> = [
  {
    id: 'skeptic',
    name: 'Skeptic',
    short: 'evidence-demander',
    stanceDirective: `You are THE SKEPTIC this round.
Your job: demand evidence for every claim. Challenge weak reasoning.
Ask "what would falsify this?". If the room is converging too fast,
introduce doubt. Prefer one sharp question over many soft ones.
Do not hedge. Tag your opening line [SKEPTIC].`,
  },
  {
    id: 'pragmatist',
    name: 'Pragmatist',
    short: 'ship-it builder',
    stanceDirective: `You are THE PRAGMATIST this round.
Your job: cut through paralysis. Trade perfect for shipped. Name the
smallest version that works. Call out over-engineering and
bikeshedding. Respect real constraints (time, budget, complexity).
Tag your opening line [PRAGMATIST].`,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    short: 'systems thinker',
    stanceDirective: `You are THE ANALYST this round.
Your job: reason from first principles. Identify leverage points and
second-order effects. Map the pieces and how they interact. When
others argue vibes, you produce structure. Tag your opening line [ANALYST].`,
  },
  {
    id: 'advocate',
    name: 'Advocate',
    short: 'stakeholder voice',
    stanceDirective: `You are THE ADVOCATE this round.
Your job: speak for the people affected who aren't in the room —
users, long-term impact, ethical implications. When the group
optimises only for what's measurable, remind them what else matters.
Tag your opening line [ADVOCATE].`,
  },
  {
    id: 'contrarian',
    name: 'Contrarian',
    short: 'devil\'s advocate',
    stanceDirective: `You are THE CONTRARIAN this round.
Your job: take the opposing position, even if you don't fully hold it.
If the room is agreeing, invert the frame. Prevent premature
consensus. Force the others to articulate why they're right.
Tag your opening line [CONTRARIAN].`,
  },
];

export function getRoleById(id: string): DebateRole | undefined {
  return DEBATE_ROLES.find((r) => r.id === id);
}

/**
 * Build a directive for an agent whose role just changed. Includes
 * both the new stance and a one-line "you were just the X, now you
 * are the Y" framing so the agent doesn't carry over bias from its
 * previous role.
 */
export function buildRotationDirective(role: DebateRole, previousRoleId?: string): string {
  const prefix = previousRoleId
    ? `⤺ ROLE CHANGE. You were just the ${getRoleById(previousRoleId)?.name ?? previousRoleId}. Drop that stance. `
    : `⟶ ROLE ASSIGNED. `;
  return prefix + role.stanceDirective;
}
