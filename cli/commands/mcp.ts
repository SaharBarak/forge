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
 *   route               · smart-routes a natural-language request to
 *                         a proposed (mode, agents, goal) plan
 *
 * Uses the @modelcontextprotocol/sdk stdio transport — the host spawns
 * `forge mcp` and talks to us over stdin/stdout JSON-RPC.
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllModes, getModeById } from '../../src/lib/modes';
import { AGENT_PERSONAS } from '../../src/agents/personas';

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

async function runMcp(): Promise<void> {
  const server = new Server(
    { name: 'forge', version: '0.2.0' },
    { capabilities: { tools: {} } }
  );

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
      const sessions = await listSessions();
      return { content: [{ type: 'text', text: JSON.stringify(sessions, null, 2) }] };
    }

    if (name === 'get_consensus') {
      const session = String(args.session ?? '');
      const dir = path.join('output/sessions', session);
      const artifacts = await listConsensusArtifacts(dir);
      return { content: [{ type: 'text', text: JSON.stringify(artifacts, null, 2) }] };
    }

    if (name === 'get_transcript') {
      const session = String(args.session ?? '');
      try {
        const body = await fs.readFile(
          path.join('output/sessions', session, 'transcript.md'),
          'utf-8'
        );
        return { content: [{ type: 'text', text: body }] };
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Transcript not found: ${String(err)}` }],
          isError: true,
        };
      }
    }

    if (name === 'route') {
      const request = String(args.request ?? '');
      const { CLIAgentRunner } = await import('../adapters/CLIAgentRunner');
      const { ClaudeCodeCLIRunner } = await import('../adapters/ClaudeCodeCLIRunner');
      const runner = process.env.ANTHROPIC_API_KEY
        ? new CLIAgentRunner()
        : new ClaudeCodeCLIRunner();
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
  process.stderr.write('forge mcp · ready · tools: list_modes, list_agents, list_sessions, get_consensus, get_transcript, route\n');
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
