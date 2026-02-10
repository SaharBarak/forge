/**
 * Core Types for Copywrite Think Tank
 */

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentPersona {
  id: string;
  name: string;
  nameHe: string;
  role: string;
  age: number;
  background: string;
  personality: string[];
  biases: string[];
  strengths: string[];
  weaknesses: string[];
  speakingStyle: string;
  color: string;
  avatar?: string;
}

export interface ResearcherAgent {
  id: string;
  name: string;
  specialty: string;
  capabilities: string[];
  searchDomains: string[];
}

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageType =
  | 'argument'
  | 'question'
  | 'proposal'
  | 'agreement'
  | 'disagreement'
  | 'synthesis'
  | 'research_request'
  | 'research_result'
  | 'human_input'
  | 'system'
  | 'consensus'
  | 'vote'
  | 'methodology';

export interface Message {
  id: string;
  timestamp: Date;
  agentId: string;
  type: MessageType;
  content: string;
  contentHe?: string;
  replyTo?: string;
  reactions?: Reaction[];
  metadata?: Record<string, unknown>;
}

export interface Reaction {
  agentId: string;
  emoji: string;
  timestamp: Date;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface SessionConfig {
  id: string;
  projectName: string;
  goal: string;
  goalHe?: string;
  initialCopy?: string;  // Optional existing copy for agents to critique/improve
  enabledAgents: string[];
  humanParticipation: boolean;
  maxRounds: number;
  consensusThreshold: number;
  methodology: MethodologyConfig;
  contextDir: string;
  outputDir: string;
  apiKey?: string;
  language?: 'hebrew' | 'english' | 'mixed' | string;
  mode?: string; // Mode ID: copywrite, idea-validation, ideation, will-it-work, custom
}

export interface Session {
  id: string;
  config: SessionConfig;
  messages: Message[];
  currentPhase: SessionPhase;
  currentRound: number;
  decisions: Decision[];
  drafts: Draft[];
  startedAt: Date;
  endedAt?: Date;
  status: 'idle' | 'running' | 'paused' | 'completed';
  memoryState?: object; // Conversation memory for context persistence
}

export type SessionPhase =
  | 'initialization'
  | 'context_loading'
  | 'research'
  | 'brainstorming'
  | 'argumentation'
  | 'synthesis'
  | 'drafting'
  | 'review'
  | 'consensus'
  | 'finalization';

// ============================================================================
// DECISION TYPES
// ============================================================================

export interface Decision {
  id: string;
  topic: string;
  topicHe?: string;
  options: DecisionOption[];
  votes: Vote[];
  outcome?: string;
  reasoning: string;
  madeAt: Date;
  phase: SessionPhase;
}

export interface DecisionOption {
  id: string;
  description: string;
  descriptionHe?: string;
  proposedBy: string;
  pros: string[];
  cons: string[];
}

export interface Vote {
  agentId: string;
  optionId: string;
  confidence: number;
  reasoning: string;
}

/**
 * A proposal made during deliberation for tracking reactions and status.
 * Used by ConversationMemory and EDAOrchestrator for consensus tracking.
 */
export interface Proposal {
  id: string;
  timestamp: Date;
  proposer: string;
  content: string;
  status: 'active' | 'accepted' | 'rejected' | 'modified';
  reactions: ProposalReaction[];
}

export interface ProposalReaction {
  agentId: string;
  reaction: 'support' | 'oppose' | 'neutral';
  reasoning?: string;
  timestamp?: Date;
}

// ============================================================================
// DRAFT TYPES
// ============================================================================

export interface Draft {
  id: string;
  version: number;
  section: string;
  content: DraftContent;
  createdBy: string;
  feedback: DraftFeedback[];
  createdAt: Date;
  status: 'draft' | 'review' | 'approved' | 'rejected';
}

export interface DraftContent {
  type: 'text' | 'visual' | 'mixed';
  title?: string;
  titleHe?: string;
  body?: string;
  bodyHe?: string;
  visualDescription?: string;
  structure?: ContentStructure;
}

export interface ContentStructure {
  format: 'prose' | 'bullets' | 'numbered' | 'comparison' | 'timeline' | 'stats' | 'grid';
  visualType: 'none' | 'graph' | 'chart' | 'illustration' | 'photo' | 'comparison' | 'infographic';
  sections: StructureSection[];
}

export interface StructureSection {
  name: string;
  type: 'hero' | 'data' | 'howItWorks' | 'social' | 'cta' | 'testimonial' | 'faq' | 'custom';
  visualType?: string;
  reasoning: string;
}

export interface DraftFeedback {
  agentId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  timestamp: Date;
}

// ============================================================================
// METHODOLOGY TYPES
// ============================================================================

export interface MethodologyConfig {
  argumentationStyle: ArgumentationStyle;
  consensusMethod: ConsensusMethod;
  visualDecisionRules: VisualDecisionRule[];
  structureDecisionRules: StructureDecisionRule[];
  phases: MethodologyPhaseConfig[];
}

export type ArgumentationStyle =
  | 'dialectic'
  | 'socratic'
  | 'collaborative'
  | 'adversarial'
  | 'mixed';

export type ConsensusMethod =
  | 'unanimous'
  | 'supermajority'
  | 'majority'
  | 'consent'
  | 'synthesis';

export interface VisualDecisionRule {
  condition: string;
  recommendedVisual: 'graph' | 'chart' | 'illustration' | 'photo' | 'comparison' | 'infographic' | 'none';
  reasoning: string;
  examples: string[];
}

export interface StructureDecisionRule {
  condition: string;
  recommendedStructure: 'prose' | 'bullets' | 'numbered' | 'comparison' | 'timeline' | 'stats' | 'grid';
  reasoning: string;
  examples: string[];
}

/**
 * Methodology-focused phase configuration.
 * Used by MethodologyConfig to describe deliberation phases.
 * Note: For mode-specific phase config, see ModePhaseConfig in src/lib/modes/index.ts
 */
export interface MethodologyPhaseConfig {
  phase: SessionPhase;
  description: string;
  maxRounds: number;
  requiredActions: string[];
  exitConditions: string[];
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface ContextData {
  brand?: BrandContext;
  audience?: AudienceContext;
  competitors?: CompetitorContext[];
  research?: ResearchContext[];
  examples?: ExampleContext[];
}

export interface BrandContext {
  name: string;
  nameHe?: string;
  tagline?: string;
  taglineHe?: string;
  values: string[];
  tone: string[];
  avoid: string[];
  keyMessages: string[];
}

export interface AudienceContext {
  primary: AudienceSegment;
  secondary?: AudienceSegment[];
  painPoints: string[];
  desires: string[];
  objections: string[];
}

export interface AudienceSegment {
  name: string;
  ageRange: [number, number];
  description: string;
  characteristics: string[];
}

export interface CompetitorContext {
  name: string;
  positioning: string;
  strengths: string[];
  weaknesses: string[];
  messaging: string[];
}

export interface ResearchContext {
  source: string;
  url?: string;
  date: string;
  findings: string[];
  relevance: string;
}

export interface ExampleContext {
  name: string;
  type: string;
  content: string;
  notes: string;
  rating?: number;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export type SessionMode = 'copywrite' | 'idea-validation' | 'ideation' | 'will-it-work' | 'custom';
export type TemplateCategory = 'copywriting' | 'strategy' | 'validation' | 'custom' | 'marketing' | 'website' | 'social' | 'email' | 'brand' | 'product';
export type ExportFormat = 'md' | 'json' | 'html' | 'pdf' | 'docx';

/**
 * Session template for pre-configured workflows.
 * Templates encode best practices and reduce setup friction.
 */
export interface SessionTemplate {
  id: string;
  name: string;
  nameHe?: string;         // Hebrew name for UI
  description: string;
  descriptionHe?: string;  // Hebrew description for UI
  category: TemplateCategory;
  
  // Pre-filled configuration
  mode: SessionMode;
  methodology?: ArgumentationStyle;
  consensusMethod?: ConsensusMethod;
  defaultAgents?: string[];
  suggestedAgents?: string[];  // Alternative to defaultAgents for UI
  suggestedMode?: string;      // Alternative to mode for UI
  
  // Guided setup prompts
  prompts?: {
    goal: string;           // Placeholder/example text for goal input
    context: string[];      // Required context types (brand, audience, research, etc.)
  };
  defaultGoal?: string;        // Alternative goal format for UI
  defaultGoalHe?: string;      // Hebrew goal for UI
  
  // Post-session recommendations
  suggestedExports?: ExportFormat[];
  
  // UI display properties (optional)
  icon?: string;
  color?: string;
  tags?: string[];
  estimatedDuration?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  
  // Metadata
  version?: number;
  builtIn?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Information about a template for listing purposes.
 */
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  builtIn: boolean;
}

// ============================================================================
// UI TYPES
// ============================================================================

export interface AppState {
  session: Session | null;
  isConnected: boolean;
  isSending: boolean;
  activeAgents: string[];
  typingAgents: string[];
  sidebarOpen: boolean;
  settingsOpen: boolean;
  currentView: 'chat' | 'drafts' | 'decisions' | 'context';
}

// ============================================================================
// ELECTRON API TYPES
// ============================================================================

/**
 * Context loaded from project directories (brand, audience, research, examples, competitors).
 * This is the canonical definition - do not duplicate elsewhere.
 */
export interface LoadedContext {
  brand: string | null;
  audience: string | null;
  research: { file: string; content: string }[];
  examples: { file: string; content: string }[];
  competitors: { file: string; content: string }[];
}

export interface SkillInfo {
  name: string;
  description: string;
  dir: string;
}

export interface LoadedSkill {
  name: string;
  content: string;
}

export interface ElectronAPI {
  // File System
  readDir: (dirPath: string) => Promise<FileInfo[]>;
  readFile: (filePath: string) => Promise<string | null>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  glob: (pattern: string, options?: object) => Promise<string[]>;
  exists: (filePath: string) => Promise<boolean>;

  // File watching
  watchFile: (filePath: string, callback: () => void) => Promise<(() => void) | null>;

  // Context
  loadContext: (contextDir: string) => Promise<LoadedContext>;

  // Dialogs
  openDirectory: () => Promise<string | null>;
  saveFile: (defaultPath?: string) => Promise<string | null>;

  // App
  getPath: (name: string) => Promise<string>;
  getVersion: () => Promise<string>;
  getCwd: () => Promise<string>;

  // Skills (loaded from .agents/skills/ via npx skills add)
  listSkills: () => Promise<SkillInfo[]>;
  getAllSkills: () => Promise<LoadedSkill[]>;
  getCombinedSkills: () => Promise<string>;

  // Briefs (loaded from briefs/ directory)
  readBrief: (briefName: string) => Promise<string | null>;
  listBriefs: () => Promise<string[]>;

  // Settings (persisted configuration)
  getSetting: (key: string) => Promise<unknown>;
  setSetting: (key: string, value: unknown) => Promise<boolean>;
  getAllSettings: () => Promise<Record<string, unknown>>;

  // Claude Code credentials
  getClaudeToken: () => Promise<string | null>;

  // Claude Agent SDK (runs in main process)
  claudeAgentQuery: (params: {
    prompt: string;
    systemPrompt?: string;
    model?: string;
  }) => Promise<{
    success: boolean;
    content?: string;
    sessionId?: string;
    usage?: { inputTokens: number; outputTokens: number; costUsd: number };
    error?: string;
  }>;

  claudeAgentEvaluate: (params: { evalPrompt: string }) => Promise<{
    success: boolean;
    urgency: 'high' | 'medium' | 'low' | 'pass';
    reason: string;
    responseType: string;
  }>;

  // Sessions (manage saved sessions)
  listSessions: () => Promise<SavedSessionInfo[]>;
  loadSession: (name: string) => Promise<{
    success: boolean;
    metadata?: {
      id: string;
      projectName: string;
      goal: string;
      enabledAgents: string[];
      startedAt: string;
      endedAt?: string;
    };
    messages?: Message[];
    memoryState?: object;
    error?: string;
  }>;
  deleteSession: (name: string) => Promise<{ success: boolean; error?: string }>;

  // Personas (manage persona sets)
  listPersonas: () => Promise<PersonaSetInfo[]>;
  loadPersonas: (name: string) => Promise<{
    success: boolean;
    personas?: AgentPersona[];
    skills?: string;
    error?: string;
  }>;
  savePersonas: (data: {
    name: string;
    personas: AgentPersona[];
    skills?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  generatePersonas: (params: {
    projectName: string;
    goal: string;
    count?: number;
  }) => Promise<{
    success: boolean;
    personas?: AgentPersona[];
    skills?: string;
    savedAs?: string;
    error?: string;
  }>;

  // Export (export sessions)
  exportSession: (params: {
    session: Session;
    format?: 'md' | 'json' | 'html';
    type?: 'transcript' | 'draft' | 'summary' | 'messages';
  }) => Promise<{ success: boolean; content?: string; filename?: string; error?: string }>;
  
  // Advanced export with full customization (Issue #14)
  exportSessionAdvanced: (params: {
    session: Session;
    options: {
      format: 'md' | 'pdf' | 'docx' | 'html' | 'json';
      sections: {
        transcript: boolean;
        decisions: boolean;
        proposals: boolean;
        drafts: boolean;
        summary: boolean;
        timeline: boolean;
      };
      structure: {
        coverPage: boolean;
        tableOfContents: boolean;
        appendix: boolean;
        pageNumbers: boolean;
      };
      style: {
        template: 'minimal' | 'professional' | 'creative' | 'academic';
        primaryColor: string;
        includeLogo: boolean;
        logoUrl?: string;
        fontFamily: 'inter' | 'georgia' | 'arial' | 'times' | 'courier';
      };
      metadata: {
        includeMetadata: boolean;
        includeTimestamps: boolean;
        includeAgentAvatars: boolean;
      };
    };
  }) => Promise<{ success: boolean; content?: string; filename?: string; error?: string }>;
  
  saveSession: (params: { session: Session }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
}

/**
 * Information about a persona set for listing purposes.
 * This is the canonical definition - do not duplicate elsewhere.
 */
export interface PersonaSetInfo {
  name: string;
  count: number;
  personas: { id: string; name: string; role: string }[];
}

/**
 * Information about a saved session for listing purposes.
 * This is the canonical definition - do not duplicate elsewhere.
 */
export interface SavedSessionInfo {
  id: string;
  name: string;
  projectName: string;
  goal?: string;
  startedAt: string;
  endedAt?: string;
  messageCount: number;
  currentPhase?: string;
  mode?: string;
}

/**
 * File information returned by directory listing operations.
 * This is the canonical definition - do not duplicate elsewhere.
 */
export interface FileInfo {
  name: string;
  isDirectory: boolean;
  path: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
