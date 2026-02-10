import { describe, it, expect } from 'vitest';
import { renderFromString, parseCanvasJSONL, buildTree } from '../renderer';

describe('Canvas ASCII Renderer', () => {
  it('renders empty canvas', () => {
    expect(renderFromString('')).toBe('(empty canvas)');
    expect(renderFromString('   ')).toBe('(empty canvas)');
  });

  it('renders a section with status badge', () => {
    const jsonl = '{"type":"section","id":"hero","label":"Hero Section","width":"full","status":"agreed"}';
    const result = renderFromString(jsonl, 40);
    expect(result).toContain('HERO SECTION');
    expect(result).toContain('[✓]');
    expect(result).toContain('┌');
    expect(result).toContain('┘');
  });

  it('renders discussed and proposed status badges', () => {
    const discussed = '{"type":"section","id":"feat","label":"Features","width":"full","status":"discussed"}';
    const proposed = '{"type":"section","id":"cta","label":"CTA","width":"full","status":"proposed"}';
    
    expect(renderFromString(discussed, 40)).toContain('[~]');
    expect(renderFromString(proposed, 40)).toContain('[?]');
  });

  it('renders text elements with different roles', () => {
    const headline = '{"type":"text","id":"h1","content":"Ship faster with AI","role":"headline"}';
    const result = renderFromString(headline, 40);
    expect(result).toContain('Ship faster with AI');
    expect(result).toContain('┌');
  });

  it('renders notes with author', () => {
    const note = '{"type":"note","id":"n1","author":"ronit","text":"Consider RTL layout"}';
    const result = renderFromString(note, 40);
    expect(result).toContain('📝');
    expect(result).toContain('Consider RTL layout');
  });

  it('renders dividers', () => {
    const jsonl = [
      '{"type":"section","id":"s1","label":"Top","width":"full","status":"agreed"}',
      '{"type":"divider","id":"d1"}',
      '{"type":"section","id":"s2","label":"Bottom","width":"full","status":"proposed"}',
    ].join('\n');
    const result = renderFromString(jsonl, 40);
    expect(result).toContain('├');
    expect(result).toContain('┤');
  });

  it('handles nested elements (parent reference)', () => {
    const jsonl = [
      '{"type":"section","id":"hero","label":"Hero","width":"full","status":"agreed"}',
      '{"type":"text","id":"t1","content":"Welcome","role":"headline","parent":"hero"}',
    ].join('\n');
    const result = renderFromString(jsonl, 40);
    expect(result).toContain('HERO');
    expect(result).toContain('Welcome');
  });

  it('last-write-wins: later entries override earlier', () => {
    const jsonl = [
      '{"type":"section","id":"hero","label":"Old Label","width":"full","status":"proposed"}',
      '{"type":"section","id":"hero","label":"New Label","width":"full","status":"agreed"}',
    ].join('\n');
    const result = renderFromString(jsonl, 40);
    expect(result).toContain('NEW LABEL');
    expect(result).not.toContain('OLD LABEL');
    expect(result).toContain('[✓]');
  });

  it('skips malformed lines gracefully', () => {
    const jsonl = [
      '{"type":"section","id":"s1","label":"Valid","width":"full","status":"agreed"}',
      'this is not json',
      '{"type":"section","id":"s2","label":"Also Valid","width":"full","status":"proposed"}',
    ].join('\n');
    const result = renderFromString(jsonl, 40);
    expect(result).toContain('VALID');
    expect(result).toContain('ALSO VALID');
  });

  it('parseCanvasJSONL returns correct map', () => {
    const jsonl = [
      '{"type":"section","id":"a","label":"A","width":"full"}',
      '{"type":"section","id":"b","label":"B","width":"full"}',
    ].join('\n');
    const map = parseCanvasJSONL(jsonl);
    expect(map.size).toBe(2);
    expect(map.get('a')?.label).toBe('A');
  });

  it('buildTree creates parent-child relationships', () => {
    const map = new Map();
    map.set('root', { type: 'section', id: 'root', label: 'Root' });
    map.set('child', { type: 'text', id: 'child', content: 'Hi', parent: 'root' });
    const tree = buildTree(map);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].content).toBe('Hi');
  });

  it('configurable width', () => {
    const jsonl = '{"type":"section","id":"s","label":"Test","width":"full","status":"agreed"}';
    const narrow = renderFromString(jsonl, 20);
    const wide = renderFromString(jsonl, 60);
    // Narrow output lines should be shorter
    const narrowMaxLen = Math.max(...narrow.split('\n').map(l => l.length));
    const wideMaxLen = Math.max(...wide.split('\n').map(l => l.length));
    expect(narrowMaxLen).toBeLessThanOrEqual(20);
    expect(wideMaxLen).toBeLessThanOrEqual(60);
  });
});
