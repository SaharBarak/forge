/**
 * MemoryIndex - Scans saved sessions and builds a searchable index
 * of summaries, decisions, and accepted proposals across all past sessions.
 */

import * as path from 'path';
import type { IFileSystem } from '../../src/lib/interfaces';
import type { ConversationMemoryState, MemoryEntry } from '../../src/lib/eda/ConversationMemory';

export interface IndexedMemoryEntry {
  sessionId: string;
  projectName: string;
  entryType: 'summary' | 'decision' | 'proposal';
  content: string;
  topic?: string;
  agentId?: string;
  timestamp: Date;
  sessionPath: string;
}

export class MemoryIndex {
  private fs: IFileSystem;
  private sessionsDir: string;
  private index: IndexedMemoryEntry[] = [];

  constructor(fs: IFileSystem, sessionsDir = 'output/sessions') {
    this.fs = fs;
    this.sessionsDir = sessionsDir;
  }

  /**
   * Scan all saved sessions and build in-memory index
   */
  async buildIndex(): Promise<void> {
    this.index = [];

    // List session directories
    let sessionDirs: string[];
    try {
      sessionDirs = await this.fs.listDir(this.sessionsDir);
    } catch {
      return; // No sessions directory yet
    }

    for (const dir of sessionDirs) {
      const sessionPath = path.join(this.sessionsDir, dir);
      const memoryPath = path.join(sessionPath, 'memory.json');

      try {
        const exists = await this.fs.exists(memoryPath);
        if (!exists) continue;

        const content = await this.fs.readFile(memoryPath);
        if (!content) continue;

        const memory: ConversationMemoryState = JSON.parse(content);

        // Load session metadata
        const sessionJsonPath = path.join(sessionPath, 'session.json');
        const sessionJson = await this.fs.readFile(sessionJsonPath);
        const sessionMeta = sessionJson ? JSON.parse(sessionJson) : {};

        const sessionId = sessionMeta.id || dir;
        const projectName = sessionMeta.projectName || 'Unknown';

        // Index summaries
        for (const summary of memory.summaries || []) {
          this.index.push({
            sessionId,
            projectName,
            entryType: 'summary',
            content: summary.content,
            timestamp: new Date(summary.timestamp),
            sessionPath,
          });
        }

        // Index decisions
        for (const decision of memory.decisions || []) {
          this.index.push({
            sessionId,
            projectName,
            entryType: 'decision',
            content: decision.content,
            topic: decision.topic,
            agentId: decision.agentId,
            timestamp: new Date(decision.timestamp),
            sessionPath,
          });
        }

        // Index accepted proposals only
        for (const proposal of memory.proposals || []) {
          if (proposal.status === 'accepted') {
            this.index.push({
              sessionId,
              projectName,
              entryType: 'proposal',
              content: proposal.content,
              topic: proposal.topic,
              agentId: proposal.agentId,
              timestamp: new Date(proposal.timestamp),
              sessionPath,
            });
          }
        }
      } catch {
        // Skip sessions with corrupted data
      }
    }
  }

  /**
   * Search for relevant past memories using keyword-based scoring
   */
  async search(projectName: string, goal: string, limit = 10): Promise<IndexedMemoryEntry[]> {
    if (this.index.length === 0) {
      await this.buildIndex();
    }

    const goalLower = goal.toLowerCase();
    const projectLower = projectName.toLowerCase();

    const scored = this.index.map(entry => {
      let score = 0;

      // Project name match
      if (entry.projectName.toLowerCase().includes(projectLower)) {
        score += 10;
      }

      // Goal keyword overlap
      const contentLower = entry.content.toLowerCase();
      const goalWords = goalLower.split(/\s+/).filter(w => w.length > 3);
      for (const word of goalWords) {
        if (contentLower.includes(word)) score += 2;
      }

      // Topic match
      if (entry.topic) {
        const topicLower = entry.topic.toLowerCase();
        for (const word of goalWords) {
          if (topicLower.includes(word)) score += 3;
        }
      }

      // Recency bonus
      const ageInDays = (Date.now() - entry.timestamp.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays < 7) score += 5;
      else if (ageInDays < 30) score += 2;

      // Type weighting (decisions > proposals > summaries)
      if (entry.entryType === 'decision') score += 3;
      else if (entry.entryType === 'proposal') score += 2;

      return { entry, score };
    });

    // Only return entries with positive scores
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /**
   * Get index statistics
   */
  getStats(): { totalSessions: number; totalEntries: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const entry of this.index) {
      byType[entry.entryType] = (byType[entry.entryType] || 0) + 1;
    }

    const uniqueSessions = new Set(this.index.map(e => e.sessionId));

    return {
      totalSessions: uniqueSessions.size,
      totalEntries: this.index.length,
      byType,
    };
  }
}
