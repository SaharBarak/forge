/**
 * Dashboard type definitions
 */

import type Blessed from 'blessed';
import type { SessionPhase, Message, Session } from '../../src/types';
import type { EDAOrchestrator } from '../../src/lib/eda/EDAOrchestrator';
import type { SessionPersistence } from '../adapters/SessionPersistence';
import type { ToolRunner } from '../tools/ToolRunner';
import type { QuickReply, AgentSuggestionData } from '../lib/suggestions';
import type { WireframeProposal, CanvasConsensusPhase } from '../lib/wireframe-store';
import type { BuildResult } from '../../src/types/build';

// Widget creation options passed from layout
export interface WidgetOpts {
  screen: Blessed.Widgets.Screen;
}

// Agent info for display
export interface AgentInfo {
  id: string;
  name: string;
  nameHe: string;
  color: string;
  state: string;
  contributions: number;
  role?: string;
  currentStance?: string;
  latestArgument?: string;
  hasWireframe?: boolean;
  resonance?: number;
  resonanceTrend?: 'rising' | 'stable' | 'falling';
}

// Dashboard state managed by DashboardController
export interface DashboardState {
  messages: Message[];
  phase: SessionPhase;
  currentSpeaker: string | null;
  queued: string[];
  agentStates: Map<string, string>;
  contributions: Map<string, number>;
  consensusPoints: number;
  conflictPoints: number;
  consensusHistory: number[];
  conflictHistory: number[];
  statusMessage: string | null;
  agentSuggestion: AgentSuggestionData | null;
  quickReplies: QuickReply[];
  canvasMode: 'consensus' | 'agent';
  selectedCanvasAgent: string | null;
  wireframeProposals: Map<string, WireframeProposal>;
  canvasConsensusPhase: CanvasConsensusPhase;
  resonanceGlobal: number;
  resonancePerAgent: Map<string, number>;
  resonanceHistory: number[];
  resonanceTarget: [number, number];
  // Build phase state
  buildResults?: Map<string, BuildResult>;
  buildPhase?: 'building' | 'picking' | 'iterating';
  buildUrls?: { agentId: string; name: string; url: string }[];
}

// Options for creating the dashboard
export interface DashboardOptions {
  orchestrator: EDAOrchestrator;
  persistence: SessionPersistence;
  session: Session;
  toolRunner?: ToolRunner;
  onExit: () => void;
}

// Widget references held by the controller
export interface DashboardWidgets {
  header: any;
  breadcrumbs: any;
  chatLog: any;
  canvas: any;
  agentPanel: any;
  consensusChart: any;
  phaseTimeline: any;
  quickReplies: any;
  suggestion: any;
  input: any;
  statusBar: any;
}
