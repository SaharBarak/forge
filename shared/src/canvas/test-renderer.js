#!/usr/bin/env node
// Test for ASCII Wireframe Renderer — Issue #58
import { renderFromString, renderElements } from './renderer.js';

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.error(`  ❌ ${name}`); }
}

console.log('─── ASCII Wireframe Renderer Tests ───\n');

// 1. Empty canvas
console.log('1. Empty canvas');
assert('returns empty message', renderFromString('') === '(empty canvas)');
assert('whitespace only', renderFromString('  \n  \n') === '(empty canvas)');

// 2. Single section
console.log('\n2. Single section');
const single = renderFromString('{"id":"s1","type":"section","label":"Nav","status":"agreed"}', 30);
assert('contains box top', single.includes('┌'));
assert('contains label', single.includes('NAV'));
assert('contains agreed icon', single.includes('✅'));

// 3. Malformed lines (should skip gracefully)
console.log('\n3. Malformed lines');
const malformed = '{"id":"a","type":"section","label":"OK","status":"proposed"}\nNOT JSON\n{"bad json';
const out = renderFromString(malformed, 30);
assert('renders valid element', out.includes('OK'));
assert('does not crash', typeof out === 'string');

// 4. Nesting
console.log('\n4. Nesting');
const nested = [
  '{"id":"p","type":"section","label":"Parent","status":"in progress","order":1}',
  '{"id":"c","type":"text","role":"headline","content":"Child","parent":"p","order":1}',
].join('\n');
const nOut = renderFromString(nested, 40);
assert('parent box present', nOut.includes('PARENT'));
assert('child inside', nOut.includes('Child'));

// 5. Divider
console.log('\n5. Divider');
const div = renderFromString('{"id":"d","type":"divider"}', 20);
assert('uses ├┤', div.includes('├') && div.includes('┤'));

// 6. Note
console.log('\n6. Note');
const note = renderFromString('{"id":"n","type":"note","content":"Remember this"}', 40);
assert('shows 📝', note.includes('📝'));
assert('shows content', note.includes('Remember this'));

// 7. Wireframe columns
console.log('\n7. Wireframe columns');
const wf = renderFromString('{"id":"w","type":"wireframe","columns":[{"label":"A"},{"label":"B"},{"label":"C"}]}', 40);
assert('shows column labels', wf.includes('[A]') && wf.includes('[B]') && wf.includes('[C]'));

// 8. Width: half/third
console.log('\n8. Width variants');
const elems = [
  { id: '1', type: 'section', label: 'Full', status: 'agreed', width: 'full' },
  { id: '2', type: 'section', label: 'Half', status: 'proposed', width: 'half', children: [] },
];
const wOut = renderElements(elems, 60);
assert('full width section rendered', wOut.includes('FULL'));
assert('half width section rendered', wOut.includes('HALF'));

// 9. Full example file
console.log('\n9. Full example render');
import { render } from './renderer.js';
const full = render(new URL('./example.jsonl', import.meta.url).pathname, 60);
assert('renders without error', full.length > 50);
assert('contains all sections', full.includes('HERO') && full.includes('FEATURES') && full.includes('FOOTER'));
console.log('\n--- Example output (width=60) ---');
console.log(full);
console.log('--- End ---\n');

// Summary
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
