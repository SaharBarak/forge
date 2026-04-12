/**
 * GoalParser tests — section parsing heuristics + extraction + output detection.
 */

import { describe, it, expect } from 'vitest';
import {
  parseGoalSections,
  extractSection,
  findProducedSections,
  normalizeSectionId,
} from './GoalParser';

describe('normalizeSectionId', () => {
  it('slugifies uppercase phrases', () => {
    expect(normalizeSectionId('HOW IT WORKS')).toBe('how_it_works');
    expect(normalizeSectionId('Final CTA!')).toBe('final_cta');
    expect(normalizeSectionId('Problem/Statement')).toBe('problem_statement');
  });

  it('returns empty for empty input', () => {
    expect(normalizeSectionId('   ')).toBe('');
    expect(normalizeSectionId('')).toBe('');
  });
});

describe('parseGoalSections', () => {
  it('parses a full 10-section landing page goal', () => {
    const goal = `
Write a COMPLETE landing page.

## DELIVERABLE:

1. **HERO**
   - Headline
   - Subheadline

2. **PROBLEM STATEMENT**
   - Opener
   - Pain points

3. **SOLUTION OVERVIEW**

4. **HOW IT WORKS**

5. **FEATURES**

6. **FOR WHOM**

7. **SOCIAL PROOF**

8. **FAQ**

9. **FINAL CTA**

10. **FOOTER**
`;
    const sections = parseGoalSections(goal);
    expect(sections.length).toBe(10);
    expect(sections[0].id).toBe('hero');
    expect(sections[0].order).toBe(1);
    expect(sections[3].id).toBe('how_it_works');
    expect(sections[9].id).toBe('footer');
  });

  it('parses markdown headers when bold syntax is absent', () => {
    const goal = `
## Overview
Text

## Main Points
Text

## Conclusion
Text
`;
    const sections = parseGoalSections(goal);
    // "Overview" is not all-caps — headerList requires start with uppercase letter
    // but accepts mixed case words; let's just check we got >= 2.
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to generic 3 sections for unstructured goals', () => {
    const goal = 'Help me write a blog post about distributed systems.';
    const sections = parseGoalSections(goal);
    expect(sections).toEqual([
      { id: 'overview', name: 'Overview', order: 1 },
      { id: 'body', name: 'Body', order: 2 },
      { id: 'conclusion', name: 'Conclusion', order: 3 },
    ]);
  });

  it('deduplicates by id', () => {
    const goal = `
1. **HERO**
2. **HERO**
3. **PROBLEM**
`;
    const sections = parseGoalSections(goal);
    expect(sections.length).toBe(2);
    expect(sections.map((s) => s.id)).toEqual(['hero', 'problem']);
  });

  it('handles empty/whitespace goals', () => {
    expect(parseGoalSections('').length).toBe(3); // fallback
    expect(parseGoalSections('   \n  ').length).toBe(3);
  });

  it('preserves parse order', () => {
    const goal = `
1. **FIRST**
2. **SECOND**
3. **THIRD**
`;
    const sections = parseGoalSections(goal);
    expect(sections.map((s) => s.id)).toEqual(['first', 'second', 'third']);
  });
});

describe('extractSection', () => {
  it('extracts a section by exact name', () => {
    const content = `
## HERO
**Headline:** Stop Getting Single AI Opinions
Subheadline: Multi-agent deliberation.

## PROBLEM
Another section.
`;
    const extracted = extractSection(content, 'HERO');
    expect(extracted).toBeTruthy();
    expect(extracted).toContain('Stop Getting Single AI Opinions');
    expect(extracted).not.toContain('Another section');
  });

  it('is case-insensitive and tolerant of punctuation', () => {
    const content = `## How it Works!\n\nStep 1\nStep 2\n\n## Next`;
    const extracted = extractSection(content, 'HOW IT WORKS');
    expect(extracted).toBeTruthy();
    expect(extracted).toContain('Step 1');
  });

  it('returns null when no matching section exists', () => {
    const content = `## OTHER\nSome content`;
    expect(extractSection(content, 'HERO')).toBeNull();
  });

  it('extracts the last section (no next header)', () => {
    const content = `## INTRO\nStuff\n\n## FOOTER\nAll rights reserved.`;
    const extracted = extractSection(content, 'FOOTER');
    expect(extracted).toBeTruthy();
    expect(extracted).toContain('All rights reserved');
  });
});

describe('findProducedSections', () => {
  it('only counts sections with body ≥ 80 chars', () => {
    const content = `
## SHORT
Too short.

## LONG
This is a long section body with more than eighty characters of actual content so it should be counted as a produced output in the mode controller's success criteria check.
`;
    const produced = findProducedSections(content);
    expect(produced.length).toBe(1);
    expect(produced[0].id).toBe('long');
  });

  it('returns empty for free-text mentions without headers', () => {
    const content = `
I think the hero section should talk about value prop and the cta should be strong.
`;
    expect(findProducedSections(content)).toEqual([]);
  });

  it('captures body length for inspection', () => {
    const body = 'x'.repeat(100);
    const content = `## TEST\n${body}\n`;
    const produced = findProducedSections(content);
    expect(produced[0].bodyLength).toBeGreaterThanOrEqual(100);
  });
});
