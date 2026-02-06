/**
 * ContentSelector - Extracts and filters content from sessions for export
 */

import type { Session, Message, Decision, Draft } from '../../types';
import type { ExportOptions, SelectedContent, IContentSelector } from './types';

export class ContentSelector implements IContentSelector {
  /**
   * Select content from a session based on export options
   */
  select(session: Session, options: ExportOptions): SelectedContent {
    return {
      session: this.extractSessionMetadata(session),
      messages: this.selectMessages(session, options),
      decisions: this.selectDecisions(session, options),
      drafts: this.selectDrafts(session, options),
      summary: this.shouldIncludeSummary(options) ? this.generateSummary(session) : undefined,
    };
  }

  /**
   * Extract session metadata
   */
  private extractSessionMetadata(session: Session) {
    return {
      id: session.id,
      projectName: session.config.projectName,
      goal: session.config.goal,
      mode: session.config.mode,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      currentPhase: session.currentPhase,
    };
  }

  /**
   * Select and filter messages
   */
  private selectMessages(session: Session, options: ExportOptions): Message[] {
    if (!this.shouldIncludeMessages(options)) {
      return [];
    }

    let messages = [...session.messages];

    // Filter system messages
    if (!options.includeSystemMessages) {
      messages = messages.filter(m => m.type !== 'system');
    }

    // Filter by agents
    if (options.agents && options.agents.length > 0) {
      const agentSet = new Set(options.agents);
      messages = messages.filter(m => agentSet.has(m.agentId) || m.agentId === 'human');
    }

    return messages;
  }

  /**
   * Select decisions
   */
  private selectDecisions(session: Session, options: ExportOptions): Decision[] {
    if (!this.shouldIncludeDecisions(options)) {
      return [];
    }

    let decisions = [...session.decisions];

    // Filter by phases
    if (options.phases && options.phases.length > 0) {
      const phaseSet = new Set(options.phases);
      decisions = decisions.filter(d => phaseSet.has(d.phase));
    }

    return decisions;
  }

  /**
   * Select drafts
   */
  private selectDrafts(session: Session, options: ExportOptions): Draft[] {
    if (!this.shouldIncludeDrafts(options)) {
      return [];
    }

    return [...session.drafts];
  }

  /**
   * Check if messages should be included
   */
  private shouldIncludeMessages(options: ExportOptions): boolean {
    return (
      options.contentTypes.includes('transcript') ||
      options.contentTypes.includes('full')
    );
  }

  /**
   * Check if decisions should be included
   */
  private shouldIncludeDecisions(options: ExportOptions): boolean {
    return (
      options.contentTypes.includes('decisions') ||
      options.contentTypes.includes('full')
    );
  }

  /**
   * Check if drafts should be included
   */
  private shouldIncludeDrafts(options: ExportOptions): boolean {
    return (
      options.contentTypes.includes('drafts') ||
      options.contentTypes.includes('full')
    );
  }

  /**
   * Check if summary should be included
   */
  private shouldIncludeSummary(options: ExportOptions): boolean {
    return (
      options.contentTypes.includes('summary') ||
      options.contentTypes.includes('full')
    );
  }

  /**
   * Generate a basic summary of the session
   */
  private generateSummary(session: Session): string {
    const lines: string[] = [];

    lines.push(`Project: ${session.config.projectName}`);
    lines.push(`Goal: ${session.config.goal}`);
    lines.push(`Phase: ${session.currentPhase}`);
    lines.push(`Messages: ${session.messages.length}`);
    lines.push(`Decisions: ${session.decisions.length}`);
    lines.push(`Drafts: ${session.drafts.length}`);

    // Count messages by agent
    const agentCounts: Record<string, number> = {};
    for (const msg of session.messages) {
      agentCounts[msg.agentId] = (agentCounts[msg.agentId] || 0) + 1;
    }

    if (Object.keys(agentCounts).length > 0) {
      lines.push('');
      lines.push('Participation:');
      for (const [agent, count] of Object.entries(agentCounts)) {
        lines.push(`  - ${agent}: ${count} messages`);
      }
    }

    return lines.join('\n');
  }
}

// Export singleton for convenience
export const contentSelector = new ContentSelector();
