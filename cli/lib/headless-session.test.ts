import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DEFAULT_COPYWRITE_SECTIONS,
  buildCopywriteGoal,
  runHeadlessCopywriteSession,
  sanitizeProjectName,
} from './headless-session';
import { parseGoalSections } from '../../src/lib/eda/GoalParser';
import type { IAgentRunner, QueryParams } from '../../src/lib/interfaces';

const deterministicRunner: IAgentRunner = {
  async query(params: QueryParams) {
    if (params.prompt.includes('## CRITICAL CONSENSUS REVIEW')) {
      return {
        success: true,
        content:
          '{"verdict":"approve","alignment_score":96,"critical_issues":[],"required_changes":[]}',
      };
    }
    const drafting = /because: "Drafting: ([^"]+)"/.exec(params.prompt);
    if (drafting) {
      return {
        success: true,
        content: `## ${drafting[1]}\n\nFinished ${drafting[1]} copy for the test product.`,
      };
    }
    return { success: true, content: '[SYNTHESIS] Use direct, evidence-based copy.' };
  },
  async evaluate() {
    return { success: true, urgency: 'pass', reason: 'test', responseType: '' };
  },
};

describe('headless copywrite session helpers', () => {
  it('builds a goal whose required sections are parsed by the phase machine', () => {
    const goal = buildCopywriteGoal(
      'A planning product for small engineering teams that need faster decisions.',
      DEFAULT_COPYWRITE_SECTIONS,
    );

    expect(parseGoalSections(goal).map((section) => section.name)).toEqual(
      DEFAULT_COPYWRITE_SECTIONS.map((section) => section.toUpperCase()),
    );
    expect(goal).toContain('Never invent testimonials');
  });

  it('removes path separators and reserved filename characters from project names', () => {
    expect(sanitizeProjectName('../Acme: Launch/2026')).toBe('Acme Launch 2026');
    expect(sanitizeProjectName('///')).toBe('Forge Copywrite');
  });

  it('runs to completion, returns every section, and persists the final consensus', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-headless-test-'));
    try {
      const result = await runHeadlessCopywriteSession({
        brief: 'A release planning product for engineering managers who need clear launch decisions.',
        projectName: 'Test Product',
        sections: ['Hero', 'Final CTA'],
        agents: ['skeptic', 'analyst'],
        outputDir,
        timeoutMs: 10_000,
        speakTimeoutMs: 1_000,
        agentRunner: deterministicRunner,
      });

      expect(result.completedSections).toBe(2);
      expect(result.totalSections).toBe(2);
      expect(result.criticalConsensus.approved).toBe(true);
      expect(result.criticalConsensus.roundsCompleted).toBe(1);
      expect(result.output).toContain('## HERO');
      expect(result.output).toContain('## FINAL CTA');
      expect(result.output.match(/## HERO/g)).toHaveLength(1);
      expect(await fs.readFile(path.join(result.sessionDir, 'final.md'), 'utf8')).toBe(
        result.output,
      );
      expect(
        await fs.readFile(path.join(result.sessionDir, 'consensus', 'final-copy.md'), 'utf8'),
      ).toBe(result.output);
      expect(
        await fs.readFile(path.join(result.sessionDir, 'consensus', 'critical-review.md'), 'utf8'),
      ).toContain('UNANIMOUSLY APPROVED');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('revises disputed copy and only returns after every reviewer approves', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-critical-review-test-'));
    let reviewCalls = 0;
    let sawRawReviewContract = false;
    let sawRawRevisionContract = false;
    const criticalRunner: IAgentRunner = {
      async query(params: QueryParams) {
        const drafting = /because: "Drafting: ([^"]+)"/.exec(params.prompt);
        if (drafting) {
          return {
            success: true,
            content: `## ${drafting[1]}\n\nUnlock the future with powerful innovation.`,
          };
        }
        if (params.prompt.includes('## UNANIMOUS REVISION TASK')) {
          sawRawRevisionContract =
            params.prompt.includes('Return ONLY the complete replacement draft') &&
            !params.prompt.includes('Start with a type tag');
          return {
            success: true,
            content:
              '## HERO\n\nSee release risk before Friday’s launch.\n\n## FINAL CTA\n\nBring your next launch plan and leave with a clear go/no-go decision.',
          };
        }
        if (params.prompt.includes('## CRITICAL CONSENSUS REVIEW')) {
          sawRawReviewContract =
            params.prompt.includes('Return ONLY the exact JSON verdict object') &&
            !params.prompt.includes('Start with a type tag');
          reviewCalls += 1;
          const revised = params.prompt.includes('See release risk before Friday');
          return {
            success: true,
            content: revised
              ? '{"verdict":"approve","alignment_score":93,"critical_issues":[],"required_changes":[]}'
              : '{"verdict":"revise","alignment_score":42,"critical_issues":["Generic AI filler"],"required_changes":["Use a concrete release-risk promise"]}',
          };
        }
        return { success: true, content: '[SYNTHESIS] Lead with the concrete release-risk job.' };
      },
      async evaluate() {
        return { success: true, urgency: 'pass', reason: 'test', responseType: '' };
      },
    };

    try {
      const result = await runHeadlessCopywriteSession({
        brief: 'A release-risk dashboard for engineering managers preparing a weekly launch.',
        projectName: 'Critical Review',
        sections: ['Hero', 'Final CTA'],
        agents: ['skeptic', 'analyst'],
        outputDir,
        timeoutMs: 10_000,
        speakTimeoutMs: 1_000,
        criticalReviewRounds: 2,
        agentRunner: criticalRunner,
      });

      expect(result.criticalConsensus.approved).toBe(true);
      expect(result.criticalConsensus.roundsCompleted).toBe(2);
      expect(reviewCalls).toBe(4);
      expect(sawRawReviewContract).toBe(true);
      expect(sawRawRevisionContract).toBe(true);
      expect(result.output).toContain('See release risk before Friday');
      expect(result.output).not.toContain('Unlock the future');
      expect(result.criticalConsensus.reviews.filter((review) => review.verdict === 'revise'))
        .toHaveLength(2);
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('fails closed instead of presenting copy without unanimous approval', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-consensus-failure-test-'));
    const dissentingRunner: IAgentRunner = {
      async query(params: QueryParams) {
        const drafting = /because: "Drafting: ([^"]+)"/.exec(params.prompt);
        if (drafting) {
          return { success: true, content: `## ${drafting[1]}\n\nA complete but disputed draft.` };
        }
        if (params.prompt.includes('## CRITICAL CONSENSUS REVIEW')) {
          return {
            success: true,
            content:
              '{"verdict":"revise","alignment_score":50,"critical_issues":["The claim is too generic"],"required_changes":["Make the value concrete"]}',
          };
        }
        return { success: true, content: '[SYNTHESIS] Make the value concrete.' };
      },
      async evaluate() {
        return { success: true, urgency: 'pass', reason: 'test', responseType: '' };
      },
    };

    try {
      await expect(
        runHeadlessCopywriteSession({
          brief: 'A release-risk dashboard for engineering managers preparing a weekly launch.',
          projectName: 'Failed Consensus',
          sections: ['Hero', 'Final CTA'],
          agents: ['skeptic', 'analyst'],
          outputDir,
          timeoutMs: 10_000,
          speakTimeoutMs: 1_000,
          criticalReviewRounds: 1,
          agentRunner: dissentingRunner,
        }),
      ).rejects.toThrow('Unanimous copy approval was not reached');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('treats approve-with-required-changes as dissent', async () => {
    const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'forge-contradictory-review-test-'));
    const contradictoryRunner: IAgentRunner = {
      async query(params: QueryParams) {
        const drafting = /because: "Drafting: ([^"]+)"/.exec(params.prompt);
        if (drafting) {
          return { success: true, content: `## ${drafting[1]}\n\nFinished copy.` };
        }
        if (params.prompt.includes('## CRITICAL CONSENSUS REVIEW')) {
          return {
            success: true,
            content:
              '{"verdict":"approve","alignment_score":91,"critical_issues":[],"required_changes":["Remove the formatting artifact"]}',
          };
        }
        return { success: true, content: '[SYNTHESIS] Keep it concrete.' };
      },
      async evaluate() {
        return { success: true, urgency: 'pass', reason: 'test', responseType: '' };
      },
    };

    try {
      await expect(
        runHeadlessCopywriteSession({
          brief: 'A copywriting consensus product for marketers reviewing AI-generated copy.',
          projectName: 'Contradictory Approval',
          sections: ['Hero', 'Final CTA'],
          agents: ['skeptic', 'analyst'],
          outputDir,
          timeoutMs: 10_000,
          speakTimeoutMs: 1_000,
          criticalReviewRounds: 1,
          agentRunner: contradictoryRunner,
        }),
      ).rejects.toThrow('Unanimous copy approval was not reached');
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});
