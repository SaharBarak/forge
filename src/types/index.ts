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
  enabledAgents: string[];
  humanParticipation: boolean;
  maxRounds: number;
  consensusThreshold: number;
  methodology: MethodologyConfig;
  contextDir: string;
  outputDir: string;
  apiKey?: string;
  language?: 'hebrew' | 'english' | 'mixed' | string;
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
  phases: PhaseConfig[];
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

export interface PhaseConfig {
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
  saveSession: (params: { session: Session }) => Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }>;
}

export interface PersonaSetInfo {
  name: string;
  count: number;
  personas: { id: string; name: string; role: string }[];
}

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
