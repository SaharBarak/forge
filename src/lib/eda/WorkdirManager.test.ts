/**
 * WorkdirManager Unit Tests
 *
 * Covers the on-disk session layout:
 * - init() creates agents/<id>/, agents/<id>/notes/, consensus/, skills/
 * - writeSkills() drops per-agent bundles under skills/
 * - appendAgentMessage() writes only for known agents (skips system/human)
 * - recordConsensus() writes a phase-stamped file with structured header
 * - idempotent init (safe to call twice)
 *
 * Uses the same IFileSystem mock pattern as EDAOrchestrator tests — we
 * verify the orchestration of writeFile / appendFile / ensureDir calls
 * rather than touching real disk, since those methods are already
 * exercised by node's fs in the SkillsLoader test suite.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as path from 'path';
import { WorkdirManager } from './WorkdirManager';
import type { IFileSystem } from '../interfaces/IFileSystem';
import type { Message } from '../../types';

function createMockFileSystem(): IFileSystem {
  return {
    readFile: vi.fn().mockResolvedValue('mock file content'),
    writeFile: vi.fn().mockResolvedValue(true),
    appendFile: vi.fn().mockResolvedValue(true),
    exists: vi.fn().mockResolvedValue(true),
    readDir: vi.fn().mockResolvedValue([]),
    ensureDir: vi.fn().mockResolvedValue(true),
    listDir: vi.fn().mockResolvedValue([]),
    loadContext: vi.fn().mockResolvedValue({}),
    readBrief: vi.fn().mockResolvedValue(''),
    listBriefs: vi.fn().mockResolvedValue([]),
    glob: vi.fn().mockResolvedValue([]),
  };
}

function makeMessage(partial: Partial<Message>): Message {
  return {
    id: partial.id ?? `msg-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: partial.timestamp ?? new Date('2026-04-17T12:00:00Z'),
    agentId: partial.agentId ?? 'architect',
    type: partial.type ?? 'argument',
    content: partial.content ?? 'Test content',
    ...partial,
  };
}

const SESSION_DIR = '/tmp/forge-test-session';

describe('WorkdirManager', () => {
  let fs: IFileSystem;
  let mgr: WorkdirManager;

  beforeEach(() => {
    fs = createMockFileSystem();
    mgr = new WorkdirManager(fs, {
      sessionDir: SESSION_DIR,
      agentIds: ['architect', 'security-reviewer'],
    });
  });

  describe('init', () => {
    it('creates the consensus dir, skills dir, and per-agent dirs', async () => {
      await mgr.init();

      const calls = (fs.ensureDir as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
      expect(calls).toEqual(
        expect.arrayContaining([
          `${SESSION_DIR}/consensus`,
          `${SESSION_DIR}/skills`,
          `${SESSION_DIR}/agents/architect`,
          `${SESSION_DIR}/agents/architect/notes`,
          `${SESSION_DIR}/agents/security-reviewer`,
          `${SESSION_DIR}/agents/security-reviewer/notes`,
        ])
      );
    });

    it('is idempotent — second call does not re-issue ensureDir', async () => {
      await mgr.init();
      const firstCount = (fs.ensureDir as ReturnType<typeof vi.fn>).mock.calls.length;
      await mgr.init();
      const secondCount = (fs.ensureDir as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(secondCount).toBe(firstCount);
    });
  });

  describe('writeSkills', () => {
    it('writes each per-agent skill bundle under skills/<id>.md', async () => {
      const bundles = new Map([
        ['architect', '# Architect\nbody'],
        ['security-reviewer', '# Sec\nbody'],
      ]);
      await mgr.writeSkills(bundles);

      const calls = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls;
      const paths = calls.map((c) => c[0]);
      expect(paths).toContain(`${SESSION_DIR}/skills/architect.md`);
      expect(paths).toContain(`${SESSION_DIR}/skills/security-reviewer.md`);
    });

    it('skips empty bundles', async () => {
      await mgr.writeSkills(new Map([['architect', '   ']]));
      expect((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    });
  });

  describe('appendAgentMessage', () => {
    it('appends a JSONL line to the matching agent log', async () => {
      const msg = makeMessage({ agentId: 'architect', content: 'hello' });
      await mgr.appendAgentMessage(msg);

      const append = fs.appendFile as ReturnType<typeof vi.fn>;
      expect(append).toHaveBeenCalledTimes(1);
      const [logPath, body] = append.mock.calls[0];
      expect(logPath).toBe(`${SESSION_DIR}/agents/architect/messages.jsonl`);
      expect((body as string).trim()).toBe(JSON.stringify(msg));
      expect(body).toMatch(/\n$/);
    });

    it('skips system/human messages without throwing', async () => {
      await mgr.appendAgentMessage(makeMessage({ agentId: 'system' }));
      await mgr.appendAgentMessage(makeMessage({ agentId: 'human' }));
      expect((fs.appendFile as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    });
  });

  describe('recordConsensus', () => {
    it('writes a markdown file with phase + agent + reason metadata', async () => {
      const msg = makeMessage({
        agentId: 'architect',
        type: 'synthesis',
        content: 'Agreed: we migrate to cockroach.',
        timestamp: new Date('2026-04-17T12:34:56.000Z'),
      });

      const p = await mgr.recordConsensus(msg, {
        phaseId: 'partner-debate',
        reason: 'tag [CONSENSUS]',
      });

      expect(p).toMatch(new RegExp(`${SESSION_DIR}/consensus/partner-debate-.+-architect\\.md$`));

      const write = fs.writeFile as ReturnType<typeof vi.fn>;
      const [, body] = write.mock.calls[write.mock.calls.length - 1];
      expect(body).toContain('# partner-debate · consensus · architect');
      expect(body).toContain('**type:** synthesis');
      expect(body).toContain('**captured because:** tag [CONSENSUS]');
      expect(body).toContain('Agreed: we migrate to cockroach.');
    });

    it('sanitizes phase id for safe filenames', async () => {
      const msg = makeMessage({ agentId: 'architect' });
      const p = await mgr.recordConsensus(msg, { phaseId: 'weird/phase:with?chars' });
      // Safe filename: slashes, colons, question marks replaced.
      expect(path.basename(p)).toMatch(/^weird_phase_with_chars-/);
      expect(p).not.toContain('/weird/phase');
    });
  });

  describe('accessors', () => {
    it('exposes consensus and session dirs', () => {
      expect(mgr.getSessionDir()).toBe(SESSION_DIR);
      expect(mgr.getConsensusDir()).toBe(`${SESSION_DIR}/consensus`);
      expect(mgr.getAgentPaths('architect')?.dir).toBe(`${SESSION_DIR}/agents/architect`);
      expect(mgr.getAgentPaths('unknown')).toBeUndefined();
    });
  });
});

