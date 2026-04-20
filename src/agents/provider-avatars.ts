/**
 * Provider avatars — agents whose identity is their provider + model,
 * not a fixed persona. Used by `forge debate` where roles (skeptic /
 * pragmatist / analyst / advocate / contrarian) rotate between agents
 * across phases, so the persona can't own the role.
 *
 * Each avatar has:
 *   - a provider-named id/name that never changes
 *   - a minimal, role-agnostic base persona
 *   - a runtime config that pins it to exactly one provider+model
 *
 * The role-specific behaviour is injected each phase by RoleRotator
 * via injectSystemSuffix().
 */

import type { AgentPersona } from '../types';

export interface ProviderSlot {
  providerId: string;          // 'anthropic' | 'gemini' | 'openai' | 'ollama' | 'openrouter' | 'perplexity'
  modelId: string;
  /** Display label for the TUI, e.g. "Claude Sonnet 4.5" */
  label: string;
}

const PALETTE = ['#ff5454', '#4ade80', '#00e5ff', '#e879f9', '#fb923c', '#facc15', '#60a5fa', '#b4ff3d'];

/**
 * Generate N AgentPersona slots, one per provider+model the operator
 * picked. The persona text is role-agnostic · the RoleRotator swaps
 * the real behaviour in via systemSuffix each phase.
 */
export function generateProviderAvatars(slots: ReadonlyArray<ProviderSlot>): AgentPersona[] {
  return slots.map((s, i) => ({
    id: `avatar-${i + 1}`,
    name: s.label,
    nameHe: s.label,
    role: `${s.providerId} · ${s.modelId}`,
    age: 0,
    background: `This agent speaks as ${s.label}. In a cross-provider debate, this
    avatar takes on a different stance each round — skeptic, pragmatist, analyst,
    advocate, or contrarian — and adopts that role's directive for the duration.
    Identity stays with the model; the stance rotates.`,
    personality: [
      'Thoughtful, adaptable reasoner',
      'Listens to previous speakers before responding',
      'Adopts the round\'s assigned role fully',
      'Cites sources when available',
      'Respects the phase machine\'s structure',
    ],
    biases: [
      'Underlying model biases are inherited from the provider',
    ],
    strengths: [
      'Adapts stance per round without mixing',
      'Brings the provider\'s distinctive reasoning style',
    ],
    weaknesses: [
      'Role changes mid-session require a fresh context commitment',
    ],
    speakingStyle: `Per-round stance set by the role directive; underlying voice is ${s.label}'s default.`,
    color: PALETTE[i % PALETTE.length],
  }));
}

/** Runtime config patches keyed by avatar id so launchSession can
 *  pin each avatar to its provider+model from the very first turn. */
export function avatarRuntimeConfigs(
  slots: ReadonlyArray<ProviderSlot>
): Record<string, { providerId: string; modelId: string }> {
  const out: Record<string, { providerId: string; modelId: string }> = {};
  for (let i = 0; i < slots.length; i++) {
    out[`avatar-${i + 1}`] = { providerId: slots[i].providerId, modelId: slots[i].modelId };
  }
  return out;
}
