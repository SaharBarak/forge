/**
 * Build phase types — engineering agents that create SvelteKit websites from copy
 */

export interface BuildAgentPersona {
  id: string;                    // 'architect-mika', 'architect-dani', 'architect-shai'
  name: string;
  designPhilosophy: string;
  colorPreference: string;
  layoutStyle: string;
  typographyApproach: string;
  animationLevel: 'minimal' | 'moderate' | 'heavy';
  specialties: string[];
  port: number;                  // 5173, 5174, 5175
  color: string;                 // blessed terminal color
}

export interface BuildResult {
  agentId: string;
  siteDir: string;               // Absolute path to generated SvelteKit project
  port: number;
  status: 'pending' | 'building' | 'running' | 'error';
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  devServerPid?: number;
}

export type BuildEventType =
  | 'build_started' | 'build_progress' | 'build_complete'
  | 'build_error' | 'server_started' | 'all_servers_ready'
  | 'user_pick';

export interface BuildEvent { type: BuildEventType; data: unknown; }
export type BuildCallback = (event: BuildEvent) => void;
