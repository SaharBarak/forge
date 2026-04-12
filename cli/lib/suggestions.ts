/**
 * Suggestion engine — phase-aware hints, quick replies, and agent suggestion detection
 */

import type { SessionPhase, Message } from '../../src/types';

export interface QuickReply {
  label: string;
  value: string;
  isCommand: boolean;
}

export interface AgentSuggestionData {
  agentId: string;
  agentName: string;
  suggestion: string;
  trigger: 'proposal' | 'conflict' | 'stall' | 'new_phase';
}

interface PhaseSuggestion {
  commands: string[];
  prompts: string[];
  hint: string;
}

const PHASE_SUGGESTIONS: Record<SessionPhase, PhaseSuggestion> = {
  initialization: {
    commands: ['/status', '/help'],
    prompts: ['Set the agenda', 'Define constraints'],
    hint: 'Session starting...',
  },
  context_loading: {
    commands: ['/status'],
    prompts: ['Add context', 'Clarify the scope'],
    hint: 'Loading context...',
  },
  research: {
    commands: ['/status', '/pause'],
    prompts: ['Share a reference', 'What do we know?'],
    hint: 'Research phase — share knowledge',
  },
  brainstorming: {
    commands: ['/status', '/synthesize'],
    prompts: ['New idea:', 'What if we...', 'Build on that'],
    hint: 'Brainstorming — share ideas freely',
  },
  argumentation: {
    commands: ['/status', '/synthesize'],
    prompts: ['I agree because...', 'I disagree because...', 'Consider this angle'],
    hint: 'Debate in progress',
  },
  synthesis: {
    commands: ['/status', '/export'],
    prompts: ['Approve synthesis', 'Request revision'],
    hint: 'Synthesis in progress',
  },
  drafting: {
    commands: ['/status', '/export'],
    prompts: ['Looks good', 'Revise section...'],
    hint: 'Drafting document',
  },
  review: {
    commands: ['/status', '/synthesize'],
    prompts: ['Approve', 'Needs changes'],
    hint: 'Review phase',
  },
  consensus: {
    commands: ['/status', '/export'],
    prompts: ['Confirm consensus', 'Raise objection'],
    hint: 'Building consensus',
  },
  finalization: {
    commands: ['/export', '/build', '/quit'],
    prompts: ['Finalize', 'Build websites'],
    hint: 'Type /build to generate 3 website variants',
  },
  building: {
    commands: ['/urls', '/quit'],
    prompts: [],
    hint: 'Building 3 website variants...',
  },
  picking: {
    commands: ['/pick mika', '/pick dani', '/pick shai', '/urls', '/quit'],
    prompts: ['Pick a winner'],
    hint: 'Review sites and /pick a winner',
  },
};

/**
 * Detect the type of the last agent message for contextual replies
 */
function detectMessageType(message: Message): 'proposal' | 'disagreement' | 'synthesis' | 'question' | 'other' {
  const content = message.content.toLowerCase();

  if (message.type === 'synthesis' || content.includes('synthesis') || content.includes('summary')) {
    return 'synthesis';
  }
  if (content.includes('i propose') || content.includes('i suggest') || content.includes('we should') || content.includes('my proposal')) {
    return 'proposal';
  }
  if (content.includes('i disagree') || content.includes('however') || content.includes('but i think') || content.includes('on the contrary')) {
    return 'disagreement';
  }
  if (content.endsWith('?') || content.includes('what do you think') || content.includes('how about')) {
    return 'question';
  }
  return 'other';
}

/**
 * Get quick reply suggestions based on phase and conversation context
 */
export function getQuickReplies(
  phase: SessionPhase,
  messages: Message[],
  consensusPoints: number,
  conflictPoints: number,
): QuickReply[] {
  const phaseSugg = PHASE_SUGGESTIONS[phase];
  if (!phaseSugg) return [];

  const replies: QuickReply[] = [];

  // Always add 1-2 phase-appropriate commands
  for (const cmd of phaseSugg.commands.slice(0, 2)) {
    replies.push({ label: cmd, value: cmd, isCommand: true });
  }

  // Add context-dependent replies based on last agent message (walk backward, no copy)
  let lastAgentMsg: Message | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].agentId !== 'human' && messages[i].agentId !== 'system') {
      lastAgentMsg = messages[i];
      break;
    }
  }
  if (lastAgentMsg) {
    const msgType = detectMessageType(lastAgentMsg);
    switch (msgType) {
      case 'proposal':
        replies.push({ label: 'Support this', value: 'I support this proposal', isCommand: false });
        replies.push({ label: 'Ask for evidence', value: 'Can you provide evidence for this?', isCommand: false });
        break;
      case 'disagreement':
        replies.push({ label: 'Mediate', value: 'Let me offer a middle ground here', isCommand: false });
        replies.push({ label: 'Agree with concern', value: 'That\'s a valid concern, let\'s address it', isCommand: false });
        break;
      case 'synthesis':
        replies.push({ label: 'Approve', value: 'I approve this synthesis', isCommand: false });
        replies.push({ label: 'Request revision', value: 'This needs revision in the following areas:', isCommand: false });
        break;
      case 'question':
        replies.push({ label: 'Answer this', value: 'To answer that question:', isCommand: false });
        break;
      default:
        // Use phase default prompts
        if (phaseSugg.prompts.length > 0) {
          replies.push({ label: phaseSugg.prompts[0], value: phaseSugg.prompts[0], isCommand: false });
        }
        break;
    }
  }

  // Add conflict-aware suggestion
  if (conflictPoints > consensusPoints + 2) {
    replies.push({ label: 'Call for compromise', value: 'I think we need to find a compromise here', isCommand: false });
  }

  return replies.slice(0, 4);
}

/**
 * Get phase-specific hint text for InputPane placeholder
 */
export function getPhaseHint(phase: SessionPhase): string {
  return PHASE_SUGGESTIONS[phase]?.hint || 'Type a message';
}

/**
 * Detect if we should show an agent suggestion notification
 */
export function detectAgentSuggestion(
  messages: Message[],
  phase: SessionPhase,
  consensusPoints: number,
  conflictPoints: number,
  prevCount: number,
): AgentSuggestionData | null {
  if (messages.length === 0 || messages.length === prevCount) return null;

  const latest = messages[messages.length - 1];
  if (!latest || latest.agentId === 'human' || latest.agentId === 'system') return null;

  const msgType = detectMessageType(latest);

  // Trigger on new proposals
  if (msgType === 'proposal') {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: 'Share your thoughts on this proposal',
      trigger: 'proposal',
    };
  }

  // Trigger on escalating conflict
  if (conflictPoints > consensusPoints + 2 && msgType === 'disagreement') {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: 'Consider mediating this disagreement',
      trigger: 'conflict',
    };
  }

  // Trigger on debate stall (every 8 messages with 0 consensus)
  if (messages.length % 8 === 0 && consensusPoints === 0 && messages.length > 0) {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: 'The debate may be stalling — try /synthesize or set direction',
      trigger: 'stall',
    };
  }

  return null;
}
