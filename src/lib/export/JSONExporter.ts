/**
 * JSONExporter - Export sessions as structured JSON
 */

import type { ExportFormat, ExportOptions, SelectedContent, ExportResult } from './types';
import { BaseExporter } from './BaseExporter';

/**
 * JSON output structure
 */
interface JSONExportData {
  version: string;
  exportedAt: string;
  session: {
    id: string;
    projectName: string;
    goal: string;
    mode?: string;
    startedAt: string;
    endedAt?: string;
    phase: string;
  };
  content: {
    summary?: string;
    messages?: MessageExport[];
    decisions?: DecisionExport[];
    drafts?: DraftExport[];
  };
  metadata: {
    format: string;
    style: string;
    language: string;
    contentTypes: string[];
    messageCount: number;
    decisionCount: number;
    draftCount: number;
  };
}

interface MessageExport {
  id: string;
  timestamp: string;
  agent: {
    id: string;
    name: string;
  };
  type: string;
  content: string;
  replyTo?: string;
}

interface DecisionExport {
  id: string;
  topic: string;
  outcome?: string;
  reasoning: string;
  phase: string;
  madeAt: string;
  options?: {
    id: string;
    description: string;
    proposedBy: string;
    pros: string[];
    cons: string[];
  }[];
  votes?: {
    agentId: string;
    optionId: string;
    confidence: number;
  }[];
}

interface DraftExport {
  id: string;
  version: number;
  section: string;
  status: string;
  createdBy: string;
  createdAt: string;
  content: {
    type: string;
    title?: string;
    body?: string;
  };
  feedbackCount: number;
}

export class JSONExporter extends BaseExporter {
  readonly format: ExportFormat = 'json';
  readonly mimeType = 'application/json';
  readonly extension = 'json';

  async export(content: SelectedContent, options: ExportOptions): Promise<ExportResult> {
    try {
      const data = this.buildExportData(content, options);
      const jsonString = options.style === 'minimal'
        ? JSON.stringify(data)
        : JSON.stringify(data, null, 2);

      const filename = this.generateFilename(content, options);

      return this.success(jsonString, filename);
    } catch (error) {
      return this.error(`JSON export failed: ${error}`);
    }
  }

  /**
   * Build the complete export data structure
   */
  private buildExportData(content: SelectedContent, options: ExportOptions): JSONExportData {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session: this.exportSession(content, options),
      content: this.exportContent(content, options),
      metadata: this.exportMetadata(content, options),
    };
  }

  /**
   * Export session metadata
   */
  private exportSession(content: SelectedContent, options: ExportOptions): JSONExportData['session'] {
    return {
      id: content.session.id,
      projectName: content.session.projectName,
      goal: content.session.goal,
      mode: content.session.mode,
      startedAt: new Date(content.session.startedAt).toISOString(),
      endedAt: content.session.endedAt
        ? new Date(content.session.endedAt).toISOString()
        : undefined,
      phase: content.session.currentPhase,
    };
  }

  /**
   * Export content based on options
   */
  private exportContent(content: SelectedContent, options: ExportOptions): JSONExportData['content'] {
    const exported: JSONExportData['content'] = {};

    // Summary
    if (content.summary) {
      exported.summary = content.summary;
    }

    // Messages
    if (content.messages.length > 0) {
      exported.messages = content.messages.map(msg => this.exportMessage(msg, options));
    }

    // Decisions
    if (content.decisions.length > 0) {
      exported.decisions = content.decisions.map(dec => this.exportDecision(dec, options));
    }

    // Drafts
    if (content.drafts.length > 0) {
      exported.drafts = content.drafts.map(draft => this.exportDraft(draft, options));
    }

    return exported;
  }

  /**
   * Export a single message
   */
  private exportMessage(message: any, options: ExportOptions): MessageExport {
    const isHebrew = options.language === 'he';
    
    return {
      id: message.id,
      timestamp: new Date(message.timestamp).toISOString(),
      agent: {
        id: message.agentId,
        name: this.getAgentName(message.agentId, options),
      },
      type: message.type,
      content: isHebrew && message.contentHe ? message.contentHe : message.content,
      replyTo: message.replyTo,
    };
  }

  /**
   * Export a single decision
   */
  private exportDecision(decision: any, options: ExportOptions): DecisionExport {
    const isHebrew = options.language === 'he';
    
    const exported: DecisionExport = {
      id: decision.id,
      topic: isHebrew && decision.topicHe ? decision.topicHe : decision.topic,
      outcome: decision.outcome,
      reasoning: decision.reasoning,
      phase: decision.phase,
      madeAt: new Date(decision.madeAt).toISOString(),
    };

    // Include options and votes for detailed style
    if (options.style === 'detailed') {
      if (decision.options?.length > 0) {
        exported.options = decision.options.map((opt: any) => ({
          id: opt.id,
          description: isHebrew && opt.descriptionHe ? opt.descriptionHe : opt.description,
          proposedBy: opt.proposedBy,
          pros: opt.pros,
          cons: opt.cons,
        }));
      }

      if (decision.votes?.length > 0) {
        exported.votes = decision.votes.map((vote: any) => ({
          agentId: vote.agentId,
          optionId: vote.optionId,
          confidence: vote.confidence,
        }));
      }
    }

    return exported;
  }

  /**
   * Export a single draft
   */
  private exportDraft(draft: any, options: ExportOptions): DraftExport {
    const isHebrew = options.language === 'he';
    
    return {
      id: draft.id,
      version: draft.version,
      section: draft.section,
      status: draft.status,
      createdBy: draft.createdBy,
      createdAt: new Date(draft.createdAt).toISOString(),
      content: {
        type: draft.content.type,
        title: isHebrew && draft.content.titleHe
          ? draft.content.titleHe
          : draft.content.title,
        body: isHebrew && draft.content.bodyHe
          ? draft.content.bodyHe
          : draft.content.body,
      },
      feedbackCount: draft.feedback?.length || 0,
    };
  }

  /**
   * Export metadata
   */
  private exportMetadata(content: SelectedContent, options: ExportOptions): JSONExportData['metadata'] {
    return {
      format: 'json',
      style: options.style || 'minimal',
      language: options.language || 'en',
      contentTypes: options.contentTypes,
      messageCount: content.messages.length,
      decisionCount: content.decisions.length,
      draftCount: content.drafts.length,
    };
  }
}

// Export singleton
export const jsonExporter = new JSONExporter();
