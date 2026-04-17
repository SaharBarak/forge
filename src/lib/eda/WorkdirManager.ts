/**
 * WorkdirManager — owns the session's on-disk layout.
 *
 * Each session produces:
 *   <sessionDir>/agents/<agentId>/
 *     messages.jsonl    — only this agent's own messages
 *     notes/            — scratch dir the agent can write into
 *   <sessionDir>/consensus/
 *     <phase>-<ts>.md   — written whenever an agent emits [CONSENSUS]
 *                         or [SYNTHESIS] tagged content
 *   <sessionDir>/skills/<agentId>.md
 *     the resolved skill bundle for each agent, copied once at init
 *     so the session is self-describing.
 *
 * The manager is created by EDAOrchestrator on start() and used
 * imperatively — no event plumbing here, the orchestrator owns the
 * decisions about when to write.
 */

import * as path from 'path';
import type { IFileSystem } from '../interfaces';
import type { Message } from '../../types';

export interface WorkdirOptions {
  sessionDir: string;
  agentIds: ReadonlyArray<string>;
}

export interface AgentPaths {
  dir: string;
  messagesPath: string;
  notesDir: string;
}

export class WorkdirManager {
  private readonly fs: IFileSystem;
  private readonly sessionDir: string;
  private readonly agentPaths: Map<string, AgentPaths> = new Map();
  private readonly consensusDir: string;
  private readonly skillsDir: string;
  private initialized = false;

  constructor(fs: IFileSystem, opts: WorkdirOptions) {
    this.fs = fs;
    this.sessionDir = opts.sessionDir;
    this.consensusDir = path.join(opts.sessionDir, 'consensus');
    this.skillsDir = path.join(opts.sessionDir, 'skills');

    for (const id of opts.agentIds) {
      const dir = path.join(opts.sessionDir, 'agents', id);
      this.agentPaths.set(id, {
        dir,
        messagesPath: path.join(dir, 'messages.jsonl'),
        notesDir: path.join(dir, 'notes'),
      });
    }
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.fs.ensureDir(this.consensusDir);
    await this.fs.ensureDir(this.skillsDir);
    for (const { dir, notesDir } of this.agentPaths.values()) {
      await this.fs.ensureDir(dir);
      await this.fs.ensureDir(notesDir);
    }
    this.initialized = true;
  }

  /**
   * Persist each agent's resolved skill bundle as a self-describing
   * artifact of the session. Future reruns can diff against this to
   * see what knowledge the agents were primed with.
   */
  async writeSkills(perAgent: ReadonlyMap<string, string>): Promise<void> {
    await this.init();
    for (const [agentId, content] of perAgent) {
      if (!content.trim()) continue;
      const p = path.join(this.skillsDir, `${agentId}.md`);
      await this.fs.writeFile(p, content);
    }
  }

  getAgentPaths(agentId: string): AgentPaths | undefined {
    return this.agentPaths.get(agentId);
  }

  getConsensusDir(): string {
    return this.consensusDir;
  }

  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * Append a single message to the agent's own per-agent log. Called
   * by the orchestrator on every new message so the per-agent folders
   * build up independently of the session-wide messages.jsonl.
   */
  async appendAgentMessage(message: Message): Promise<void> {
    const paths = this.agentPaths.get(message.agentId);
    if (!paths) return; // system/human messages don't get per-agent logs
    await this.init();
    await this.fs.appendFile(paths.messagesPath, JSON.stringify(message) + '\n');
  }

  /**
   * Write a consensus artifact. Triggered by the orchestrator when a
   * message carries a [CONSENSUS] / [SYNTHESIS] tag — the idea being
   * that what the group actually agreed on lives here, separate from
   * the full discussion transcript.
   */
  async recordConsensus(
    message: Message,
    opts: { phaseId: string; reason?: string }
  ): Promise<string> {
    await this.init();
    const ts = new Date(message.timestamp).toISOString().replace(/[:.]/g, '-');
    const safePhase = opts.phaseId.replace(/[^a-z0-9_-]+/gi, '_');
    const filename = `${safePhase}-${ts}-${message.agentId}.md`;
    const p = path.join(this.consensusDir, filename);

    const body = [
      `# ${opts.phaseId} · consensus · ${message.agentId}`,
      '',
      `- **type:** ${message.type}`,
      `- **timestamp:** ${new Date(message.timestamp).toISOString()}`,
      opts.reason ? `- **captured because:** ${opts.reason}` : null,
      '',
      '---',
      '',
      message.content,
      '',
    ]
      .filter((l) => l !== null)
      .join('\n');

    await this.fs.writeFile(p, body);
    return p;
  }
}
