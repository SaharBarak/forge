/**
 * End-to-end integration test for render modules.
 * Exercises everything added in the claw-code UI integration pass.
 */

import {
  renderMarkdown,
  createStreamRenderer,
  renderToolCall,
  renderMessageWithToolCalls,
  parseToolCalls,
  renderDiff,
  buildSimpleDiff,
  countDiffStats,
  createPermissionBroker,
  classifyToolRisk,
  forgeTheme,
  style,
} from '../src/lib/render';

const SEP = '\n' + '═'.repeat(70) + '\n';
let passed = 0;
let failed = 0;

const assert = (name: string, condition: boolean, detail?: string): void => {
  if (condition) {
    console.log(style(forgeTheme.status.success, '  ✔') + ' ' + name);
    passed++;
  } else {
    console.log(style(forgeTheme.status.error, '  ✘') + ' ' + name + (detail ? ` — ${detail}` : ''));
    failed++;
  }
};

const section = (title: string): void => {
  console.log(SEP);
  console.log(style(forgeTheme.heading.h1, `  ${title}`));
  console.log(SEP);
};

const preview = (text: string, maxLines = 10): void => {
  const lines = text.split('\n').slice(0, maxLines);
  for (const line of lines) console.log('    ' + line);
  if (text.split('\n').length > maxLines) {
    console.log(style(forgeTheme.text.muted, `    … (${text.split('\n').length - maxLines} more lines)`));
  }
};

// ==========================================================================
// 1. Markdown rendering
// ==========================================================================
section('1. Markdown → ANSI');

const md = `# Proposal

We should **prioritize** the *onboarding* flow.

## Reasons

- User retention drops 40% after signup
- Current flow has \`4 steps\`
- Industry benchmark is 2

> Every extra step is a leak.

\`\`\`typescript
const onboarding = async (user: User) => {
  await sendWelcomeEmail(user);
  return user;
};
\`\`\`
`;

const rendered = renderMarkdown(md);
assert('renderMarkdown returns non-empty string', rendered.length > 0);
assert('contains ANSI color codes', rendered.includes('\x1b['));
assert('heading rendered', rendered.includes('# Proposal') || rendered.includes('Proposal'));
assert('code block has border char', rendered.includes('╭') || rendered.includes('│'));
preview(rendered);

// ==========================================================================
// 2. Streaming markdown renderer
// ==========================================================================
section('2. Streaming markdown (fence-aware boundary detection)');

const streamer = createStreamRenderer();
const chunks = [
  'Let me think about this.\n\n',
  '```js\nconst x = 1;\n',
  'const y = 2;\n```\n\nDone.',
];

let streamOutput = '';
for (const chunk of chunks) {
  streamOutput += streamer.push(chunk);
}
streamOutput += streamer.finish();

assert('stream renderer produces output', streamOutput.length > 0);
assert('stream handles fenced code blocks', streamOutput.includes('const x') || streamOutput.includes('╭'));
preview(streamOutput);

// ==========================================================================
// 3. Tool call parsing
// ==========================================================================
section('3. [TOOL:] block parsing + rendering');

const messageWithTool = `I think we need to visualize this.

[TOOL: graph-generation]
Generate a bar chart showing agent contributions:
- Ronit: 12
- Yossi: 8
- Noa: 15
[/TOOL]

This will make the imbalance clear.`;

const blocks = parseToolCalls(messageWithTool);
assert('parseToolCalls returns 3 blocks (text + tool + text)', blocks.length === 3,
  `got ${blocks.length}: ${blocks.map(b => b.kind).join(', ')}`);
assert('first block is text', blocks[0]?.kind === 'text');
assert('second block is tool', blocks[1]?.kind === 'tool');
assert('tool name extracted', blocks[1]?.toolName === 'graph-generation');
assert('tool prompt extracted', blocks[1]?.toolPrompt?.includes('bar chart') ?? false);
assert('third block is trailing text', blocks[2]?.kind === 'text');

const toolRendered = renderToolCall('graph-generation', 'Generate a bar chart', 'done', 'output: chart-123.png');
assert('renderToolCall produces framed output', toolRendered.includes('╭') && toolRendered.includes('╰'));
assert('tool name visible in output', toolRendered.includes('graph-generation'));
assert('status label visible', toolRendered.toUpperCase().includes('DONE'));
preview(toolRendered);

const fullRendered = renderMessageWithToolCalls(messageWithTool, {
  renderText: (t) => renderMarkdown(t),
  toolStatus: { 'graph-generation': 'pending' },
});
assert('renderMessageWithToolCalls mixes text + tool blocks', fullRendered.length > 0);
assert('contains both text and tool markers', fullRendered.includes('╭') && fullRendered.includes('visualize'));
preview(fullRendered, 15);

// ==========================================================================
// 4. Diff rendering
// ==========================================================================
section('4. Unified diff rendering');

const before = `function greet(name) {
  console.log("Hello, " + name);
}`;

const after = `function greet(name: string): void {
  console.log(\`Hello, \${name}!\`);
  logAnalytics('greet', name);
}`;

const diffText = buildSimpleDiff(before, after);
assert('buildSimpleDiff produces diff text', diffText.includes('---') && diffText.includes('+++'));
assert('diff contains +/- markers', diffText.includes('\n+') && diffText.includes('\n-'));

const stats = countDiffStats(diffText);
assert('diff stats: added > 0', stats.added > 0, `added=${stats.added}`);
assert('diff stats: removed > 0', stats.removed > 0, `removed=${stats.removed}`);

const renderedDiff = renderDiff(diffText, { filePath: 'greet.ts' });
assert('renderDiff produces framed output', renderedDiff.includes('╭') && renderedDiff.includes('╰'));
assert('diff has added color (green ANSI 32)', renderedDiff.includes('\x1b[32m'));
assert('diff has removed color (red ANSI 31)', renderedDiff.includes('\x1b[31m'));
preview(renderedDiff, 12);

// ==========================================================================
// 5. Permission broker
// ==========================================================================
section('5. Permission broker lifecycle');

const broker = createPermissionBroker();

// Simulate UI that auto-approves once
const autoApprover = broker.onRequest((req, respond) => {
  console.log(`    ${style(forgeTheme.text.muted, '→ received request for')} ${req.toolName} ${style(forgeTheme.text.muted, `(risk: ${req.risk})`)}`);
  respond('once');
});

const safeResult = await broker.requestPermission({
  id: 'test-1',
  toolName: 'image-generation',
  toolPrompt: 'generate cat',
  risk: 'safe',
  timestamp: new Date(),
});
assert('permission broker returns decision', safeResult === 'once');
autoApprover(); // unsubscribe

// Simulate 'always' — second call should auto-approve without hitting handler
let callCount = 0;
const countingApprover = broker.onRequest((req, respond) => {
  callCount++;
  respond('always');
});

await broker.requestPermission({
  id: 'test-2',
  toolName: 'bash',
  toolPrompt: 'ls',
  risk: 'execute',
  timestamp: new Date(),
});

const autoResult = await broker.requestPermission({
  id: 'test-3',
  toolName: 'bash',
  toolPrompt: 'pwd',
  risk: 'execute',
  timestamp: new Date(),
});
assert('second call auto-approved via always cache', autoResult === 'always' && callCount === 1,
  `callCount=${callCount}`);

countingApprover(); // unsubscribe

// Risk classification
assert('risk: image-generation → safe', classifyToolRisk('image-generation') === 'safe');
assert('risk: write-file → write', classifyToolRisk('write-file') === 'write');
assert('risk: bash → execute', classifyToolRisk('bash') === 'execute');
assert('risk: delete-file → destructive', classifyToolRisk('delete-file') === 'destructive');

// ==========================================================================
// 6. Summary
// ==========================================================================
section('Summary');

const total = passed + failed;
const summary = `${passed}/${total} passed`;
if (failed === 0) {
  console.log('  ' + style(forgeTheme.status.success, `✔ ALL TESTS PASSED — ${summary}`));
} else {
  console.log('  ' + style(forgeTheme.status.error, `✘ ${failed} FAILED — ${summary}`));
  process.exit(1);
}
