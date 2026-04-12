/**
 * Per-agent wireframe proposal tracking and canvas consensus types
 */

import type { WireframeNode } from './wireframe';

export interface WireframeProposal {
  agentId: string;
  agentName: string;
  wireframe: WireframeNode;
  timestamp: number;
  messageIndex: number;
}

export type CanvasConsensusPhase = 'idle' | 'proposing' | 'critiquing' | 'converged';
