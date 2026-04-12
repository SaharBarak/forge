/**
 * CrossSessionMemory - Load relevant past session context for new sessions
 * Searches across all saved sessions to find decisions, proposals, and summaries
 * that are relevant to the current project/goal.
 */

import type { IFileSystem } from '../../src/lib/interfaces';
import { MemoryIndex, type IndexedMemoryEntry } from './MemoryIndex';

export interface PastContextSummary {
  relevantMemories: IndexedMemoryEntry[];
  summary: string;
}

export class CrossSessionMemory {
  private index: MemoryIndex;

  constructor(fs: IFileSystem, sessionsDir?: string) {
    this.index = new MemoryIndex(fs, sessionsDir);
  }

  /**
   * Get relevant past context formatted as markdown for injection into agent context
   */
  async getRelevantPastContext(
    projectName: string,
    goal: string
  ): Promise<PastContextSummary | null> {
    const memories = await this.index.search(projectName, goal, 10);

    if (memories.length === 0) {
      return null;
    }

    const parts: string[] = [];
    parts.push('## Past Session Insights\n');
    parts.push('From previous sessions on similar projects:\n');

    const byType: Record<string, IndexedMemoryEntry[]> = {
      decision: [],
      proposal: [],
      summary: [],
    };

    for (const mem of memories) {
      byType[mem.entryType] = byType[mem.entryType] || [];
      byType[mem.entryType].push(mem);
    }

    if (byType.decision.length > 0) {
      parts.push('### Key Decisions from Past Sessions');
      for (const dec of byType.decision.slice(0, 5)) {
        const date = dec.timestamp.toLocaleDateString();
        parts.push(`- [${dec.projectName}, ${date}] ${dec.content}`);
      }
      parts.push('');
    }

    if (byType.proposal.length > 0) {
      parts.push('### Accepted Approaches');
      for (const prop of byType.proposal.slice(0, 5)) {
        const date = prop.timestamp.toLocaleDateString();
        parts.push(`- [${prop.projectName}, ${date}] ${prop.content}`);
      }
      parts.push('');
    }

    if (byType.summary.length > 0) {
      parts.push('### Discussion Highlights');
      for (const summ of byType.summary.slice(0, 3)) {
        const date = summ.timestamp.toLocaleDateString();
        parts.push(`- [${summ.projectName}, ${date}] ${summ.content.slice(0, 200)}`);
      }
      parts.push('');
    }

    parts.push('---');
    parts.push('*Use these insights to inform your discussion, but evaluate them critically.*');

    return {
      relevantMemories: memories,
      summary: parts.join('\n'),
    };
  }

  /**
   * Rebuild the index (call on demand)
   */
  async rebuildIndex(): Promise<void> {
    await this.index.buildIndex();
  }

  /**
   * Get index statistics
   */
  getStats() {
    return this.index.getStats();
  }
}
