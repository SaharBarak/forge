/**
 * ExportManager Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportManager } from '../ExportManager';
import type { Session } from '../../../types';
import type { ExportOptions, IExporter, ExportResult, SelectedContent } from '../types';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session',
    config: {
      id: 'test-session',
      projectName: 'Test Project',
      goal: 'Test the export',
      enabledAgents: ['agent-1'],
      humanParticipation: true,
      maxRounds: 10,
      consensusThreshold: 0.6,
      methodology: {
        argumentationStyle: 'dialectic',
        consensusMethod: 'majority',
        visualDecisionRules: [],
        structureDecisionRules: [],
        phases: [],
      },
      contextDir: './context',
      outputDir: './output',
    },
    messages: [
      {
        id: 'msg-1',
        timestamp: new Date(),
        agentId: 'agent-1',
        type: 'argument',
        content: 'Test message',
      },
    ],
    currentPhase: 'brainstorming',
    currentRound: 1,
    decisions: [],
    drafts: [],
    startedAt: new Date(),
    status: 'running',
    ...overrides,
  } as Session;
}

function createMockExporter(format: string): IExporter {
  return {
    format: format as any,
    mimeType: `application/${format}`,
    extension: format,
    supports: vi.fn().mockReturnValue(true),
    export: vi.fn().mockResolvedValue({
      success: true,
      content: `exported as ${format}`,
      filename: `test.${format}`,
      mimeType: `application/${format}`,
    }),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('ExportManager', () => {
  let manager: ExportManager;

  beforeEach(() => {
    manager = new ExportManager();
  });

  describe('initialization', () => {
    it('should register built-in exporters', () => {
      expect(manager.supportsFormat('md')).toBe(true);
      expect(manager.supportsFormat('json')).toBe(true);
      expect(manager.supportsFormat('pdf')).toBe(true);
    });

    it('should return supported formats', () => {
      const formats = manager.getSupportedFormats();
      expect(formats).toContain('md');
      expect(formats).toContain('json');
      expect(formats).toContain('pdf');
    });
  });

  describe('registerExporter()', () => {
    it('should register custom exporter', () => {
      const customExporter = createMockExporter('custom');
      
      manager.registerExporter(customExporter);
      
      expect(manager.supportsFormat('custom' as any)).toBe(true);
    });

    it('should override existing exporter', () => {
      const customMd = createMockExporter('md');
      
      manager.registerExporter(customMd);
      
      expect(manager.getExporter('md')).toBe(customMd);
    });
  });

  describe('unregisterExporter()', () => {
    it('should remove exporter', () => {
      expect(manager.supportsFormat('md')).toBe(true);
      
      const result = manager.unregisterExporter('md');
      
      expect(result).toBe(true);
      expect(manager.supportsFormat('md')).toBe(false);
    });

    it('should return false for non-existent format', () => {
      const result = manager.unregisterExporter('nonexistent' as any);
      
      expect(result).toBe(false);
    });
  });

  describe('getExporter()', () => {
    it('should return exporter for valid format', () => {
      const exporter = manager.getExporter('md');
      
      expect(exporter).toBeDefined();
      expect(exporter?.format).toBe('md');
    });

    it('should return undefined for invalid format', () => {
      const exporter = manager.getExporter('invalid' as any);
      
      expect(exporter).toBeUndefined();
    });
  });

  describe('getFormatInfo()', () => {
    it('should return format info', () => {
      const info = manager.getFormatInfo('md');
      
      expect(info).toEqual({
        mimeType: 'text/markdown',
        extension: 'md',
      });
    });

    it('should return null for invalid format', () => {
      const info = manager.getFormatInfo('invalid' as any);
      
      expect(info).toBeNull();
    });
  });

  describe('export()', () => {
    it('should export session with markdown format', async () => {
      const session = createMockSession();
      
      const result = await manager.export(session, { format: 'md' });
      
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.filename).toMatch(/\.md$/);
    });

    it('should export session with json format', async () => {
      const session = createMockSession();
      
      const result = await manager.export(session, { format: 'json' });
      
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.filename).toMatch(/\.json$/);
    });

    it('should return error for unsupported format', async () => {
      const session = createMockSession();
      
      const result = await manager.export(session, { format: 'unsupported' as any });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported export format');
    });

    it('should use default options when not provided', async () => {
      const session = createMockSession();
      
      const result = await manager.export(session);
      
      expect(result.success).toBe(true);
      // Default format is 'md'
      expect(result.filename).toMatch(/\.md$/);
    });

    it('should return error when no content selected', async () => {
      const session = createMockSession({
        messages: [],
        decisions: [],
        drafts: [],
      });
      
      const result = await manager.export(session, { 
        format: 'md',
        contentTypes: ['decisions'], // Empty decisions
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No content selected');
    });

    it('should handle export errors gracefully', async () => {
      const failingExporter: IExporter = {
        format: 'fail' as any,
        mimeType: 'application/fail',
        extension: 'fail',
        supports: () => true,
        export: vi.fn().mockRejectedValue(new Error('Export crashed')),
      };
      
      manager.registerExporter(failingExporter);
      const session = createMockSession();
      
      const result = await manager.export(session, { format: 'fail' as any });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Export failed');
    });
  });

  describe('exportContent()', () => {
    it('should export pre-selected content', async () => {
      const content: SelectedContent = {
        session: {
          id: 'test',
          projectName: 'Test',
          goal: 'Test',
          startedAt: new Date(),
          currentPhase: 'finalization',
        },
        messages: [{
          id: 'm1',
          timestamp: new Date(),
          agentId: 'a1',
          type: 'argument',
          content: 'Test',
        }],
        decisions: [],
        drafts: [],
      };
      
      const result = await manager.exportContent(content, { format: 'json' });
      
      expect(result.success).toBe(true);
    });

    it('should return error for unsupported format', async () => {
      const content: SelectedContent = {
        session: {
          id: 'test',
          projectName: 'Test',
          goal: 'Test',
          startedAt: new Date(),
          currentPhase: 'finalization',
        },
        messages: [],
        decisions: [],
        drafts: [],
        summary: 'Test',
      };
      
      // Use 'html' as unsupported format (both pdf and docx are now supported)
      const result = await manager.exportContent(content, { format: 'html' });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported');
    });
  });

  describe('preview()', () => {
    it('should preview export without side effects', async () => {
      const session = createMockSession();
      
      const result = await manager.preview(session, { format: 'md' });
      
      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
    });
  });

  describe('content filtering', () => {
    it('should filter by content types', async () => {
      const session = createMockSession({
        decisions: [{
          id: 'dec-1',
          topic: 'Test Decision',
          options: [],
          votes: [],
          reasoning: 'Test',
          madeAt: new Date(),
          phase: 'synthesis',
        }],
      });
      
      // Only export transcript (messages)
      const result = await manager.export(session, { 
        format: 'json',
        contentTypes: ['transcript'],
      });
      
      expect(result.success).toBe(true);
      const data = JSON.parse(result.content!);
      expect(data.content.messages).toBeDefined();
      expect(data.content.decisions).toBeUndefined();
    });
  });
});
