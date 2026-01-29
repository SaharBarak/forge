/**
 * IAgentRunner - Interface for running agent queries
 * Abstracts the underlying execution method (Electron IPC vs. direct SDK)
 */

export interface QueryParams {
  prompt: string;
  systemPrompt?: string;
  model?: string;
}

export interface QueryResult {
  success: boolean;
  content?: string;
  sessionId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
  };
  error?: string;
}

export interface EvalParams {
  evalPrompt: string;
}

export interface EvalResult {
  success: boolean;
  urgency: 'high' | 'medium' | 'low' | 'pass';
  reason: string;
  responseType: string;
}

/**
 * Interface for running Claude agent queries
 * Implementations:
 * - ElectronAgentRunner: Uses window.electronAPI for Electron app
 * - CLIAgentRunner: Uses Claude SDK directly for CLI
 */
export interface IAgentRunner {
  /**
   * Run a full agent query with system prompt
   */
  query(params: QueryParams): Promise<QueryResult>;

  /**
   * Run a lightweight evaluation query (for deciding whether to speak)
   */
  evaluate(params: EvalParams): Promise<EvalResult>;
}
