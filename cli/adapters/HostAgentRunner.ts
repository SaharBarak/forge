import type { IAgentRunner } from '../../src/lib/interfaces';
import { CLIAgentRunner } from './CLIAgentRunner';
import { ClaudeCodeCLIRunner } from './ClaudeCodeCLIRunner';
import { CodexCLIRunner } from './CodexCLIRunner';

export type ForgeAgentBackend = 'claude' | 'codex';

/** Select the authenticated CLI that should power agents inside an MCP host. */
export function createHostAgentRunner(
  backend = process.env.FORGE_AGENT_BACKEND as ForgeAgentBackend | undefined,
): IAgentRunner {
  if (backend === 'codex') return new CodexCLIRunner();
  if (backend === 'claude') return new ClaudeCodeCLIRunner();
  return process.env.ANTHROPIC_API_KEY
    ? new CLIAgentRunner()
    : new ClaudeCodeCLIRunner();
}
