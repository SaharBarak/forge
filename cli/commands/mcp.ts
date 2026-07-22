/**
 * `forge mcp` — run forge as an MCP server.
 *
 * Exposes a handful of read-only + launch tools so Cursor, Claude Code,
 * or any other MCP-aware host can drive forge:
 *
 *   list_modes          · catalog of deliberation modes
 *   list_agents         · catalog of personas
 *   list_sessions       · past sessions with metadata
 *   get_consensus       · consensus dir contents for a session
 *   get_transcript      · full markdown transcript of a session
 *   run_copywrite_consensus · run copywrite mode to completion and return
 *                             the finished deliverable
 *   route               · smart-routes a natural-language request to
 *                         a proposed (mode, agents, goal) plan
 *
 * Uses the @modelcontextprotocol/sdk stdio transport — the host spawns
 * `forge mcp` and talks to us over stdin/stdout JSON-RPC.
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllModes, getModeById } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';
import {
  DEFAULT_COPYWRITE_AGENTS,
  DEFAULT_COPYWRITE_SECTIONS,
  runHeadlessCopywriteSession,
} from '../lib/headless-session';
import { createHostAgentRunner } from '../adapters/HostAgentRunner';

interface SessionMeta {
  name: string;
  dir: string;
  project?: string;
  goal?: string;
  startedAt?: string;
  messageCount?: number;
}

async function listSessions(outputDir = 'output/sessions'): Promise<SessionMeta[]> {
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort().reverse();
    const metas: SessionMeta[] = [];
    for (const name of dirs.slice(0, 50)) {
      const dir = path.join(outputDir, name);
      try {
        const raw = await fs.readFile(path.join(dir, 'session.json'), 'utf-8');
        const parsed = JSON.parse(raw);
        metas.push({
          name,
          dir,
          project: parsed.projectName,
          goal: parsed.goal,
          startedAt: parsed.startedAt,
          messageCount: parsed.messageCount,
        });
      } catch {
        metas.push({ name, dir });
      }
    }
    return metas;
  } catch {
    return [];
  }
}

async function listConsensusArtifacts(sessionDir: string): Promise<Array<{ file: string; body: string }>> {
  const dir = path.join(sessionDir, 'consensus');
  try {
    const files = await fs.readdir(dir);
    const out: Array<{ file: string; body: string }> = [];
    for (const f of files.sort()) {
      if (!f.endsWith('.md')) continue;
      const body = await fs.readFile(path.join(dir, f), 'utf-8');
      out.push({ file: f, body });
    }
    return out;
  } catch {
    return [];
  }
}

function sessionDirFromName(session: unknown, workspaceDir = process.cwd()): string | null {
  const name = String(session ?? '');
  if (!name || name !== path.basename(name) || name === '.' || name === '..') return null;
  return path.join(workspaceDir, 'output', 'sessions', name);
}

export async function runMcp(): Promise<void> {
  const server = new Server(
    { name: 'forge', version: '0.3.0' },
    { capabilities: { tools: {} } }
  );
  let consensusRunActive = false;

  const getWorkspaceDir = async (): Promise<string> => {
    try {
      const result = await server.listRoots();
      const fileRoot = result.roots.find((root) => root.uri.startsWith('file:'));
      if (fileRoot) return fileURLToPath(fileRoot.uri);
    } catch {
      // Older/minimal MCP hosts may not advertise roots. stdio servers
      // conventionally inherit the host workspace as their cwd.
    }
    return process.cwd();
  };

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'list_modes',
        description:
          'List Forge deliberation modes (copywrite, will-it-work, vc-pitch, tech-review, red-team, …). Each mode has its own phase machine and required outputs.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_agents',
        description:
          'List available personas the operator can assign to a session (skeptic, pragmatist, architect, vc-partner, attack-planner, …).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_sessions',
        description: 'List past Forge sessions (newest first, up to 50). Each entry has name, project, goal, messageCount.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_consensus',
        description:
          'Return every consensus artifact captured in a session (files under <session>/consensus/).',
        inputSchema: {
          type: 'object',
          properties: {
            session: { type: 'string', description: 'Session directory name (as returned by list_sessions).' },
          },
          required: ['session'],
        },
      },
      {
        name: 'get_transcript',
        description: 'Return the full markdown transcript of a Forge session.',
        inputSchema: {
          type: 'object',
          properties: {
            session: { type: 'string', description: 'Session directory name.' },
          },
          required: ['session'],
        },
      },
      {
        name: 'run_copywrite_consensus',
        description:
          'Run a complete, headless Forge copywriting consensus session. The tool blocks through discovery, research, synthesis, drafting, and adversarial review/revision rounds. It returns finished Markdown only after every enabled reviewer approves alignment with the original brief; otherwise it fails closed. Use this when the user asks Forge to write or rewrite copy, not merely to plan it.',
        inputSchema: {
          type: 'object',
          properties: {
            brief: {
              type: 'string',
              minLength: 20,
              description:
                'The complete copywriting brief: product/offer, audience, goal, differentiators, tone, constraints, and all known proof points.',
            },
            project_name: {
              type: 'string',
              description: 'Short name used in the output title and session artifacts.',
            },
            sections: {
              type: 'array',
              minItems: 2,
              maxItems: 12,
              items: { type: 'string' },
              description: `Required final sections. Defaults to: ${DEFAULT_COPYWRITE_SECTIONS.join(', ')}.`,
            },
            agents: {
              type: 'array',
              minItems: 2,
              maxItems: 5,
              items: { type: 'string' },
              description: `Forge persona IDs. Defaults to: ${DEFAULT_COPYWRITE_AGENTS.join(', ')}.`,
            },
            language: {
              type: 'string',
              enum: ['english', 'hebrew', 'mixed'],
              description: 'Language for the final copy. Defaults to english.',
            },
          },
          required: ['brief'],
        },
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: true,
        },
      },
      {
        name: 'route',
        description:
          'Smart-router: take a natural-language request, return a proposed (mode, agents, goal) plan without running a session. The caller can then invoke `forge auto "..."` or `forge start -m ...` with the suggestion.',
        inputSchema: {
          type: 'object',
          properties: {
            request: { type: 'string', description: 'Free-form request.' },
          },
          required: ['request'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;

    if (name === 'list_modes') {
      const modes = getAllModes().map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        phases: m.phases.map((p) => p.id),
        requiredOutputs: m.successCriteria?.requiredOutputs ?? [],
      }));
      return { content: [{ type: 'text', text: JSON.stringify(modes, null, 2) }] };
    }

    if (name === 'list_agents') {
      const agents = AGENT_PERSONAS.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        strengths: a.strengths?.slice(0, 3) ?? [],
      }));
      return { content: [{ type: 'text', text: JSON.stringify(agents, null, 2) }] };
    }

    if (name === 'list_sessions') {
      const workspaceDir = await getWorkspaceDir();
      const sessions = await listSessions(path.join(workspaceDir, 'output', 'sessions'));
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    }

    if (name === 'get_consensus') {
      const dir = sessionDirFromName(args.session, await getWorkspaceDir());
      if (!dir) {
        return {
          content: [{ type: 'text', text: 'Invalid session name.' }],
          isError: true,
        };
      }
      const artifacts = await listConsensusArtifacts(dir);
      return { content: [{ type: 'text', text: JSON.stringify(artifacts, null, 2) }] };
    }

    if (name === 'get_transcript') {
      const dir = sessionDirFromName(args.session, await getWorkspaceDir());
      if (!dir) {
        return {
          content: [{ type: 'text', text: 'Invalid session name.' }],
          isError: true,
        };
      }
      try {
        const body = await fs.readFile(path.join(dir, 'transcript.md'), 'utf-8');
        return { content: [{ type: 'text', text: body }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Transcript not found: ${String(err)}` }],
          isError: true,
        };
      }
    }

    if (name === 'run_copywrite_consensus') {
      if (consensusRunActive) {
        return {
          content: [{ type: 'text', text: 'A Forge consensus run is already active in this MCP server.' }],
          isError: true,
        };
      }

      consensusRunActive = true;
      try {
        const workspaceDir = await getWorkspaceDir();
        const result = await runHeadlessCopywriteSession({
          brief: String(args.brief ?? ''),
          projectName: typeof args.project_name === 'string' ? args.project_name : undefined,
          sections: Array.isArray(args.sections) ? args.sections.map(String) : undefined,
          agents: Array.isArray(args.agents) ? args.agents.map(String) : undefined,
          language:
            args.language === 'hebrew' || args.language === 'mixed'
              ? args.language
              : 'english',
          workspacePath: workspaceDir,
        });
        const complete =
          result.completedSections === result.totalSections &&
          result.criticalConsensus.approved;
        const metadata = {
          sessionId: result.sessionId,
          sessionDir: result.sessionDir,
          completedSections: result.completedSections,
          totalSections: result.totalSections,
          unanimousApproval: result.criticalConsensus.approved,
          reviewRounds: result.criticalConsensus.roundsCompleted,
          reviewerCount: result.criticalConsensus.reviewerCount,
          durationMs: result.durationMs,
        };
        return {
          content: [
            {
              type: 'text',
              text: `${result.output}\n\n---\n\nForge run metadata:\n${JSON.stringify(metadata, null, 2)}`,
            },
          ],
          structuredContent: { ...metadata, output: result.output },
          ...(complete ? {} : { isError: true }),
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Forge copywrite consensus failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      } finally {
        consensusRunActive = false;
      }
    }

    if (name === 'route') {
      const request = String(args.request ?? '');
      const runner = createHostAgentRunner();
      const modes = getAllModes();
      const system = `You are a router. Pick the right Forge mode and 3-4 agents.

## Modes
${modes.map((m) => `- ${m.id}: ${m.description}`).join('\n')}

## Personas
${AGENT_PERSONAS.map((a) => `- ${a.id}: ${a.role}`).join('\n')}

Output JSON only: {"mode":"...", "agents":[...], "goal":"...", "projectName":"...", "rationale":"..."}`;
      const r = await runner.query({
        prompt: `Request: ${request}\nReturn JSON only.`,
        systemPrompt: system,
        model: 'claude-sonnet-4-20250514',
      });
      if (!r.success || !r.content) {
        return {
          content: [{ type: 'text', text: r.error ?? 'Router failed' }],
          isError: true,
        };
      }
      const m = r.content.match(/\{[\s\S]*\}/);
      return {
        content: [{ type: 'text', text: m ? m[0] : r.content }],
      };
    }

    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Silent by design — stdout is reserved for the JSON-RPC transport.
  // Log startup to stderr so the host can see it.
  process.stderr.write('forge mcp · ready · tools: list_modes, list_agents, list_sessions, get_consensus, get_transcript, run_copywrite_consensus, route\n');
}

// Unused — used only to check modes import isn't stripped
void getModeById;

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Run Forge as an MCP server over stdio (for Cursor, Claude Code, etc.)')
    .action(async () => {
      try {
        await runMcp();
      } catch (err) {
        process.stderr.write(`forge mcp failed: ${err instanceof Error ? err.message : err}\n`);
        process.exit(1);
      }
    });
}
