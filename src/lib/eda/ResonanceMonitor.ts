/**
 * ResonanceMonitor — measures how deeply content/experience aligns with each agent's
 * persona values, expectations, and emotional state.
 *
 * Hybrid approach: heuristic (every message, zero cost) + periodic LLM (every 8 messages).
 * Composite score = creatorPride*0.35 + userDelight*0.35 + discussionQuality*0.30
 */

import type { Message, SessionPhase } from '../../types';
import type { AgentMemoryState } from './ConversationMemory';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResonanceDimension {
  creatorPride: number;       // 0-100: proud of what's being made?
  userDelight: number;        // 0-100: would they enjoy visiting this site?
  discussionQuality: number;  // 0-100: is the conversation productive?
}

export interface AgentResonance {
  agentId: string;
  score: number;              // 0-100 composite
  dimensions: ResonanceDimension;
  trend: 'rising' | 'stable' | 'falling';
  lastUpdated: number;
  history: number[];          // last 20 scores
}

export interface ResonanceIntervention {
  type: 'discussion_prompt' | 'agent_rotation' | 'mode_intervention' | 'celebration';
  message: string;
  priority: 'low' | 'medium' | 'high';
  targetAgent?: string;
}

export interface ResonanceState {
  agents: Record<string, AgentResonance>;
  globalScore: number;
  globalHistory: number[];
}

// ─── Phase targets ──────────────────────────────────────────────────────────

interface PhaseTarget {
  min: number;
  max: number;
  label: string;
}

const PHASE_TARGETS: Partial<Record<SessionPhase, PhaseTarget>> = {
  initialization:  { min: 50, max: 70, label: 'Curious & Ready' },
  brainstorming:   { min: 60, max: 90, label: 'Excited & Generative' },
  argumentation:   { min: 40, max: 70, label: 'Challenged & Engaged' },
  synthesis:       { min: 55, max: 85, label: 'Satisfied & Aligned' },
  drafting:        { min: 60, max: 90, label: 'Confident & Focused' },
  finalization:    { min: 70, max: 95, label: 'Proud & Complete' },
};

// ─── Persona keyword maps for userDelight bonus ─────────────────────────────

const PERSONA_KEYWORDS: Record<string, { positive: string[]; negative: string[] }> = {
  ronit:  { positive: ['clear', 'concise', 'value'], negative: ['fluff', 'vague'] },
  yossi:  { positive: ['evidence', 'data', 'research'], negative: ['unproven', 'claims'] },
  noa:    { positive: ['authentic', 'mobile', 'social'], negative: ['corporate', 'jargon'] },
  avi:    { positive: ['roi', 'cost', 'numbers'], negative: ['emotional', 'vague'] },
  michal: { positive: ['impact', 'community', 'values'], negative: ['profit-driven'] },
};

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_HISTORY = 20;
const LLM_CHECK_INTERVAL = 8; // messages between LLM feelings checks
const HEURISTIC_WEIGHT = 0.7;
const LLM_WEIGHT = 0.3;

// ─── Utility ────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function computeTrend(history: number[]): 'rising' | 'stable' | 'falling' {
  if (history.length < 3) return 'stable';
  const recent = history.slice(-3);
  const diff = recent[recent.length - 1] - recent[0];
  if (diff > 5) return 'rising';
  if (diff < -5) return 'falling';
  return 'stable';
}

// ─── ResonanceMonitor ───────────────────────────────────────────────────────

export class ResonanceMonitor {
  private agents: Map<string, AgentResonance> = new Map();
  private enabledAgentIds: string[];
  private messagesSinceLLMCheck = 0;
  private llmScores: Map<string, ResonanceDimension> = new Map();
  private currentPhase: SessionPhase = 'initialization';

  constructor(enabledAgentIds: string[]) {
    this.enabledAgentIds = enabledAgentIds;
    for (const id of enabledAgentIds) {
      this.agents.set(id, {
        agentId: id,
        score: 50,
        dimensions: { creatorPride: 50, userDelight: 50, discussionQuality: 50 },
        trend: 'stable',
        lastUpdated: Date.now(),
        history: [50],
      });
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /**
   * Process an incoming message and return an optional intervention.
   */
  processMessage(
    message: Message,
    allMessages: Message[],
    agentMemoryStates: Map<string, AgentMemoryState>,
    consensusPoints: number,
    conflictPoints: number,
  ): ResonanceIntervention | null {
    if (message.agentId === 'system') return null;

    // Compute heuristic for all agents
    for (const agentId of this.enabledAgentIds) {
      const memState = agentMemoryStates.get(agentId);
      const heuristic = this.computeHeuristic(agentId, memState, allMessages, consensusPoints, conflictPoints);

      const existing = this.agents.get(agentId)!;
      const llmDims = this.llmScores.get(agentId);

      // Blend heuristic with LLM scores if available
      let dims: ResonanceDimension;
      if (llmDims) {
        dims = {
          creatorPride: heuristic.creatorPride * HEURISTIC_WEIGHT + llmDims.creatorPride * LLM_WEIGHT,
          userDelight: heuristic.userDelight * HEURISTIC_WEIGHT + llmDims.userDelight * LLM_WEIGHT,
          discussionQuality: heuristic.discussionQuality * HEURISTIC_WEIGHT + llmDims.discussionQuality * LLM_WEIGHT,
        };
      } else {
        dims = heuristic;
      }

      const score = clamp(Math.round(
        dims.creatorPride * 0.35 + dims.userDelight * 0.35 + dims.discussionQuality * 0.30,
      ));

      const history = [...existing.history, score].slice(-MAX_HISTORY);
      const trend = computeTrend(history);

      this.agents.set(agentId, {
        agentId,
        score,
        dimensions: dims,
        trend,
        lastUpdated: Date.now(),
        history,
      });
    }

    this.messagesSinceLLMCheck++;

    // Check for interventions
    return this.checkInterventions();
  }

  /**
   * Update the LLM-derived scores (called externally after haiku feelings check).
   */
  setLLMScores(scores: Map<string, ResonanceDimension>): void {
    this.llmScores = scores;
  }

  /**
   * Check if it's time for an LLM feelings check.
   */
  shouldRunLLMCheck(): boolean {
    return this.messagesSinceLLMCheck >= LLM_CHECK_INTERVAL;
  }

  /**
   * Reset the LLM check counter after running a check.
   */
  resetLLMCheckCounter(): void {
    this.messagesSinceLLMCheck = 0;
  }

  setPhase(phase: SessionPhase): void {
    this.currentPhase = phase;
  }

  getAgentResonance(agentId: string): AgentResonance | undefined {
    return this.agents.get(agentId);
  }

  getGlobalResonance(): number {
    if (this.agents.size === 0) return 50;
    let total = 0;
    for (const agent of this.agents.values()) {
      total += agent.score;
    }
    return Math.round(total / this.agents.size);
  }

  getGlobalHistory(): number[] {
    // Reconstruct global history from agent histories
    if (this.agents.size === 0) return [50];
    const agentHistories = Array.from(this.agents.values()).map(a => a.history);
    const maxLen = Math.max(...agentHistories.map(h => h.length));
    const globalHistory: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      let sum = 0;
      let count = 0;
      for (const h of agentHistories) {
        if (i < h.length) {
          sum += h[i];
          count++;
        }
      }
      globalHistory.push(Math.round(sum / count));
    }
    return globalHistory.slice(-MAX_HISTORY);
  }

  getPhaseTarget(): [number, number] {
    const target = PHASE_TARGETS[this.currentPhase];
    return target ? [target.min, target.max] : [50, 70];
  }

  getPhaseTargetLabel(): string {
    const target = PHASE_TARGETS[this.currentPhase];
    return target?.label || 'Engaged';
  }

  getAllAgentResonances(): Map<string, AgentResonance> {
    return new Map(this.agents);
  }

  // ─── Heuristic Scoring ──────────────────────────────────────────────────

  private computeHeuristic(
    agentId: string,
    memState: AgentMemoryState | undefined,
    allMessages: Message[],
    consensusPoints: number,
    conflictPoints: number,
  ): ResonanceDimension {
    const agreements = memState?.agreements.length ?? 0;
    const disagreements = memState?.disagreements.length ?? 0;
    const contributed = (memState?.messageCount ?? 0) > 0;
    const hasProposal = allMessages.some(m =>
      m.agentId === agentId && /\[PROPOSAL\]/i.test(m.content),
    );

    // creatorPride: base(50) + agreements(+5ea) - disagreements(-3ea) + contributed(+10) + proposal_adopted(+15)
    let pride = 50;
    pride += agreements * 5;
    pride -= disagreements * 3;
    if (contributed) pride += 10;
    if (hasProposal) pride += 15;

    // userDelight: base(50) + consensus(+4ea) - conflicts(-2ea) + persona keyword match(+/-5ea)
    let delight = 50;
    delight += consensusPoints * 4;
    delight -= conflictPoints * 2;
    delight += this.computeKeywordBonus(agentId, allMessages);

    // discussionQuality: base(50) + all_participated(+15) + balanced(+10) - loop_detected(-20)
    let quality = 50;
    const participatingAgents = new Set(allMessages.filter(m => m.agentId !== 'system' && m.agentId !== 'human').map(m => m.agentId));
    if (this.enabledAgentIds.every(id => participatingAgents.has(id))) {
      quality += 15;
    }
    if (this.isBalanced(allMessages)) {
      quality += 10;
    }
    if (this.detectLoop(allMessages)) {
      quality -= 20;
    }

    return {
      creatorPride: clamp(Math.round(pride)),
      userDelight: clamp(Math.round(delight)),
      discussionQuality: clamp(Math.round(quality)),
    };
  }

  private computeKeywordBonus(agentId: string, allMessages: Message[]): number {
    const keywords = PERSONA_KEYWORDS[agentId];
    if (!keywords) return 0;

    let bonus = 0;
    // Check recent messages (last 10) for keyword presence
    const recent = allMessages.slice(-10);
    const recentText = recent.map(m => m.content.toLowerCase()).join(' ');

    for (const word of keywords.positive) {
      if (recentText.includes(word)) bonus += 5;
    }
    for (const word of keywords.negative) {
      if (recentText.includes(word)) bonus -= 5;
    }

    return clamp(bonus, -15, 15);
  }

  private isBalanced(allMessages: Message[]): boolean {
    const counts = new Map<string, number>();
    for (const msg of allMessages) {
      if (msg.agentId !== 'system' && msg.agentId !== 'human') {
        counts.set(msg.agentId, (counts.get(msg.agentId) || 0) + 1);
      }
    }
    if (counts.size < 2) return false;
    const values = Array.from(counts.values());
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max <= min * 3; // No agent dominates more than 3x
  }

  private detectLoop(allMessages: Message[]): boolean {
    if (allMessages.length < 6) return false;
    const last6 = allMessages.slice(-6);
    const speakers = last6.map(m => m.agentId);
    // Detect if only 2 agents going back and forth
    const unique = new Set(speakers.filter(s => s !== 'system' && s !== 'human'));
    if (unique.size <= 2 && last6.length >= 6) {
      // Check for repetitive content
      const contents = last6.map(m => m.content.slice(0, 50).toLowerCase());
      const uniqueContents = new Set(contents);
      return uniqueContents.size <= 3; // Very repetitive
    }
    return false;
  }

  // ─── Interventions ──────────────────────────────────────────────────────

  private checkInterventions(): ResonanceIntervention | null {
    const global = this.getGlobalResonance();
    const [_targetMin, _targetMax] = this.getPhaseTarget();

    // During argumentation, low resonance (40-70) is expected and healthy
    if (this.currentPhase === 'argumentation' && global >= 40 && global <= 70) {
      return null;
    }

    // Global < 30: pause and ask what's not working
    if (global < 30) {
      return {
        type: 'mode_intervention',
        message: `[RESONANCE] Team energy is critically low (${global}/100). Let's pause and reflect: what's not working? What would make this discussion more productive?`,
        priority: 'high',
      };
    }

    // Single agent < 20: give them the floor
    for (const agent of this.agents.values()) {
      if (agent.score < 20) {
        return {
          type: 'agent_rotation',
          message: `[RESONANCE] ${agent.agentId} seems disengaged (resonance: ${agent.score}/100). Let's hear their perspective — what matters most to you here?`,
          priority: 'medium',
          targetAgent: agent.agentId,
        };
      }
    }

    // Multiple agents 30-45: refocus prompt
    const lowAgents = Array.from(this.agents.values()).filter(a => a.score >= 30 && a.score <= 45);
    if (lowAgents.length >= 2) {
      return {
        type: 'discussion_prompt',
        message: `[RESONANCE] Energy is low across the team (global: ${global}/100). Let's refocus on what excites us about this project.`,
        priority: 'medium',
      };
    }

    // Celebration: global > 80 and all agents > 70
    if (global > 80 && Array.from(this.agents.values()).every(a => a.score > 70)) {
      // Only celebrate occasionally (not every message)
      const lastHistory = this.getGlobalHistory();
      const prevGlobal = lastHistory.length >= 2 ? lastHistory[lastHistory.length - 2] : 0;
      if (prevGlobal <= 80) {
        return {
          type: 'celebration',
          message: `[RESONANCE] The team is aligned and energized! (${global}/100) Great momentum — keep building on this.`,
          priority: 'low',
        };
      }
    }

    return null;
  }

  // ─── Serialization ──────────────────────────────────────────────────────

  toJSON(): ResonanceState {
    const agents: Record<string, AgentResonance> = {};
    for (const [id, resonance] of this.agents) {
      agents[id] = resonance;
    }
    return {
      agents,
      globalScore: this.getGlobalResonance(),
      globalHistory: this.getGlobalHistory(),
    };
  }

  fromJSON(state: ResonanceState): void {
    this.agents.clear();
    for (const [id, resonance] of Object.entries(state.agents)) {
      this.agents.set(id, resonance);
    }
  }
}
