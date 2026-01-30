/**
 * SessionPersistence - Auto-save sessions to disk
 * Saves messages as JSONL, generates transcript and draft markdown
 */

import * as path from 'path';
import type { Message, Session } from '../../src/types';
import type { IFileSystem } from '../../src/lib/interfaces';
import { getAgentById } from '../../src/agents/personas';

export interface PersistenceConfig {
  outputDir: string;
  autoSaveInterval: number; // ms
}

const DEFAULT_CONFIG: PersistenceConfig = {
  outputDir: 'output/sessions',
  autoSaveInterval: 30000, // 30 seconds
};

export class SessionPersistence {
  private fs: IFileSystem;
  private config: PersistenceConfig;
  private sessionDir: string | null = null;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private lastSavedMessageCount = 0;
  private session: Session | null = null;

  constructor(fs: IFileSystem, config: Partial<PersistenceConfig> = {}) {
    this.fs = fs;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize session directory for a new session
   */
  async initSession(session: Session): Promise<string> {
    this.session = session;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionName = `${session.config.projectName.replace(/\s+/g, '-')}-${timestamp}`;
    this.sessionDir = path.join(this.config.outputDir, sessionName);

    await this.fs.ensureDir(this.sessionDir);

    // Save initial session metadata
    const metadata = {
      id: session.id,
      projectName: session.config.projectName,
      goal: session.config.goal,
      enabledAgents: session.config.enabledAgents,
      startedAt: session.startedAt.toISOString(),
    };
    await this.fs.writeFile(
      path.join(this.sessionDir, 'session.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Start auto-save
    this.startAutoSave();

    return this.sessionDir;
  }

  /**
   * Start auto-save timer
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveIncremental().catch(console.error);
    }, this.config.autoSaveInterval);
  }

  /**
   * Save new messages incrementally (append to JSONL)
   */
  async saveIncremental(): Promise<void> {
    if (!this.sessionDir || !this.session) return;

    const messages = this.session.messages;
    const newMessages = messages.slice(this.lastSavedMessageCount);

    if (newMessages.length === 0) return;

    // Append new messages to JSONL
    const jsonlPath = path.join(this.sessionDir, 'messages.jsonl');
    const jsonlContent = newMessages.map((m) => JSON.stringify(m)).join('\n') + '\n';
    await this.fs.appendFile(jsonlPath, jsonlContent);

    this.lastSavedMessageCount = messages.length;

    // Also regenerate transcript on each save
    await this.generateTranscript();
  }

  /**
   * Force a full save (e.g., on exit)
   */
  async saveFull(): Promise<void> {
    if (!this.sessionDir || !this.session) return;

    // Stop auto-save
    this.stopAutoSave();

    // Save any remaining messages
    await this.saveIncremental();

    // Generate final files
    await this.generateTranscript();
    await this.generateDraft();

    // Update session metadata with end time
    const metadata = {
      id: this.session.id,
      projectName: this.session.config.projectName,
      goal: this.session.config.goal,
      enabledAgents: this.session.config.enabledAgents,
      startedAt: this.session.startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      messageCount: this.session.messages.length,
      currentPhase: this.session.currentPhase,
    };
    await this.fs.writeFile(
      path.join(this.sessionDir, 'session.json'),
      JSON.stringify(metadata, null, 2)
    );
  }

  /**
   * Generate readable markdown transcript
   */
  async generateTranscript(): Promise<void> {
    if (!this.sessionDir || !this.session) return;

    const lines: string[] = [
      `# ${this.session.config.projectName} - Debate Transcript`,
      '',
      `**Goal:** ${this.session.config.goal}`,
      `**Started:** ${this.session.startedAt.toISOString()}`,
      `**Agents:** ${this.session.config.enabledAgents.join(', ')}`,
      '',
      '---',
      '',
    ];

    for (const message of this.session.messages) {
      const sender = this.getSenderName(message.agentId);
      const time = new Date(message.timestamp).toLocaleTimeString();
      const typeTag = message.type !== 'system' ? `[${message.type.toUpperCase()}]` : '';

      lines.push(`### ${sender} ${typeTag}`);
      lines.push(`*${time}*`);
      lines.push('');
      lines.push(message.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    await this.fs.writeFile(
      path.join(this.sessionDir, 'transcript.md'),
      lines.join('\n')
    );
  }

  /**
   * Generate draft document from synthesis and drafting messages
   */
  async generateDraft(): Promise<void> {
    if (!this.sessionDir || !this.session) return;

    // Find synthesis and draft content
    const syntheses = this.session.messages.filter((m) => m.type === 'synthesis');
    const drafts = this.session.messages.filter((m) =>
      m.content.includes('## Hero') ||
      m.content.includes('## Problem') ||
      m.content.includes('## Solution')
    );

    const lines: string[] = [
      `# ${this.session.config.projectName} - Draft Copy`,
      '',
      `**Goal:** ${this.session.config.goal}`,
      `**Generated:** ${new Date().toISOString()}`,
      '',
    ];

    if (syntheses.length > 0) {
      lines.push('## Synthesis Summary');
      lines.push('');
      lines.push(syntheses[syntheses.length - 1].content);
      lines.push('');
    }

    if (drafts.length > 0) {
      lines.push('## Draft Sections');
      lines.push('');
      for (const draft of drafts) {
        lines.push(draft.content);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    await this.fs.writeFile(
      path.join(this.sessionDir, 'draft.md'),
      lines.join('\n')
    );
  }

  /**
   * Get human-readable sender name
   */
  private getSenderName(agentId: string): string {
    if (agentId === 'human') return '**Human**';
    if (agentId === 'system') return '**System**';

    const agent = getAgentById(agentId);
    if (agent) {
      return `**${agent.name}** (${agent.nameHe})`;
    }
    return `**${agentId}**`;
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Get current session directory
   */
  getSessionDir(): string | null {
    return this.sessionDir;
  }

  /**
   * Update session reference (for live updates)
   */
  updateSession(session: Session): void {
    this.session = session;
  }

  /**
   * Save session with memory state (for full context persistence)
   */
  async saveSessionWithMemory(sessionWithMemory: Session & { memoryState?: object }): Promise<void> {
    if (!this.sessionDir) return;

    // Update session
    this.session = sessionWithMemory;

    // Save any remaining messages
    await this.saveIncremental();

    // Generate final files
    await this.generateTranscript();
    await this.generateDraft();

    // Update session metadata with end time
    const metadata = {
      id: sessionWithMemory.id,
      projectName: sessionWithMemory.config.projectName,
      goal: sessionWithMemory.config.goal,
      enabledAgents: sessionWithMemory.config.enabledAgents,
      startedAt: sessionWithMemory.startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      messageCount: sessionWithMemory.messages.length,
      currentPhase: sessionWithMemory.currentPhase,
    };
    await this.fs.writeFile(
      path.join(this.sessionDir, 'session.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Save memory state if present
    if (sessionWithMemory.memoryState) {
      await this.fs.writeFile(
        path.join(this.sessionDir, 'memory.json'),
        JSON.stringify(sessionWithMemory.memoryState, null, 2)
      );
    }
  }
}
