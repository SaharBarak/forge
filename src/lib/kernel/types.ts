/**
 * Kernel Types - Commands, responses, and state for the SessionKernel
 */

// Types imported for future use in response interfaces
// import type { AgentPersona, Message, Session } from '../../types';

// =============================================================================
// KERNEL STATE
// =============================================================================

export type KernelState =
  | 'idle'           // No session, waiting for commands
  | 'configuring'    // Running config wizard
  | 'ready'          // Configured, ready to start
  | 'running'        // Session active
  | 'paused'         // Session paused
  | 'generating';    // Generating personas

export interface KernelConfig {
  projectName?: string;
  goal?: string;
  agents?: string[];
  language?: string;
  mode?: string;
  contextDir?: string;
  apiKey?: string;
}

export interface ConfigStep {
  id: string;
  prompt: string;
  options?: { value: string; label: string; default?: boolean }[];
  multiSelect?: boolean;
  allowGenerate?: boolean;  // For agent selection
}

// =============================================================================
// KERNEL COMMANDS
// =============================================================================

export type KernelCommand =
  | { type: 'new' }
  | { type: 'start' }
  | { type: 'stop' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'save' }
  | { type: 'export'; format?: string }
  | { type: 'load'; nameOrIndex: string }
  | { type: 'sessions' }
  | { type: 'status' }
  | { type: 'memory' }
  | { type: 'recall'; agentId?: string }
  | { type: 'agents' }
  | { type: 'synthesize'; force?: boolean }
  | { type: 'consensus' }
  | { type: 'draft' }
  | { type: 'say'; content: string }
  | { type: 'config_input'; value: string }
  | { type: 'token'; key?: string }
  | { type: 'test' }
  | { type: 'help' }
  | { type: 'mode_info' };

// =============================================================================
// KERNEL RESPONSES
// =============================================================================

export type KernelResponseType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'prompt'      // Waiting for input
  | 'list'        // List of items
  | 'table'       // Tabular data
  | 'message'     // Agent message
  | 'status'      // Status update
  | 'config_step' // Configuration step
  | 'help';       // Help text

export interface KernelResponse {
  type: KernelResponseType;
  content: string;
  data?: unknown;
}

export interface ListResponse extends KernelResponse {
  type: 'list';
  data: {
    title: string;
    items: { label: string; description?: string; selected?: boolean }[];
    hint?: string;
  };
}

export interface StatusResponse extends KernelResponse {
  type: 'status';
  data: {
    state: KernelState;
    project?: string;
    goal?: string;
    phase?: string;
    mode?: string;
    messages?: number;
    agents?: string[];
    consensus?: { ready: boolean; points: number; conflicts: number };
    memory?: { summaries: number; decisions: number; proposals: number };
  };
}

export interface ConfigStepResponse extends KernelResponse {
  type: 'config_step';
  data: ConfigStep;
}

export interface MessageResponse extends KernelResponse {
  type: 'message';
  data: {
    agentId: string;
    agentName?: string;
    content: string;
    messageType: string;
  };
}

export interface HelpResponse extends KernelResponse {
  type: 'help';
  data: {
    sections: {
      title: string;
      commands: { command: string; description: string }[];
    }[];
  };
}

// =============================================================================
// KERNEL EVENTS (for UI updates)
// =============================================================================

export type KernelEventType =
  | 'state_change'
  | 'agent_typing'
  | 'agent_message'
  | 'phase_change'
  | 'intervention'  // Mode controller intervention
  | 'session_saved'
  | 'session_loaded';

export interface KernelEvent {
  type: KernelEventType;
  data: unknown;
}

export type KernelEventCallback = (event: KernelEvent) => void;

// =============================================================================
// KERNEL OPTIONS
// =============================================================================

export interface KernelOptions {
  // Adapters (dependency injection)
  agentRunner?: import('../interfaces').IAgentRunner;
  fileSystem?: import('../interfaces').IFileSystem;

  // Persistence paths
  sessionsDir?: string;
  personasDir?: string;
  outputDir?: string;

  // Callbacks
  onMessage?: (response: KernelResponse) => void;
  onEvent?: KernelEventCallback;
}

// =============================================================================
// SESSION INFO (for listing)
// =============================================================================

export interface SavedSessionInfo {
  id: string;
  name: string;
  projectName: string;
  goal?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  mode?: string;
}

export interface PersonaSetInfo {
  name: string;
  count: number;
  personas: { id: string; name: string; role: string }[];
}
