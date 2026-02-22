/**
 * Minimal test to verify the 3-column Ink layout with wireframe
 * Run: npx tsx cli/test-layout.ts
 */
import React from 'react';
import { render, Box, Text } from 'ink';

const rows = process.stdout.rows || 24;
const cols = process.stdout.columns || 80;
const mainH = Math.max(8, rows - 8);
const sideW = Math.max(16, Math.floor(cols * 0.2));
const canvasW = Math.max(16, Math.floor(cols * 0.2));

// Enter alternate screen buffer
process.stdout.write('\x1b[?1049h\x1b[H');

function WireframeBlock({ label, icon, color }: { label: string; icon: string; color: string }) {
  return React.createElement(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: color, width: '100%' },
    React.createElement(Box, null,
      React.createElement(Text, { color, bold: true }, `${icon} ${label}`),
      React.createElement(Text, { dimColor: true }, ' ○')
    ),
    React.createElement(Text, { dimColor: true, italic: true }, `[  ${label}  ]`)
  );
}

function TestLayout(): React.ReactElement {
  return React.createElement(Box, { flexDirection: 'column', height: rows },
    React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { bold: true, color: 'cyan' }, `Forge > Test > BRAINSTORMING  (${cols}x${rows})`)
    ),
    React.createElement(Box, { borderStyle: 'single', borderColor: 'gray', paddingX: 1 },
      React.createElement(Text, { color: 'cyan', bold: true }, '💭 BRAINSTORMING'),
      React.createElement(Text, { dimColor: true }, '  |  Floor: open  |  Messages: 0')
    ),
    // 3-column layout
    React.createElement(Box, { flexDirection: 'row', height: mainH, width: '100%' },
      // Chat (~60%)
      React.createElement(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1, flexGrow: 1, height: mainH },
        React.createElement(Text, { dimColor: true }, 'No messages yet...'),
        React.createElement(Text, null, ''),
        React.createElement(Text, { color: 'green' }, 'Chat area fills remaining width')
      ),
      // Agents (20%)
      React.createElement(Box, { flexDirection: 'column', borderStyle: 'single', borderColor: 'gray', paddingX: 1, width: sideW, height: mainH },
        React.createElement(Text, { bold: true, underline: true }, 'Agents'),
        React.createElement(Text, null, ''),
        React.createElement(Text, { color: 'magenta' }, '👂 Ronit (0)'),
        React.createElement(Text, { color: 'blue' }, '👂 Avi (0)'),
        React.createElement(Text, { color: 'green' }, '👂 Yossi (0)')
      ),
      // Wireframe (20%)
      React.createElement(Box, { flexDirection: 'column', borderStyle: 'double', borderColor: 'cyan', width: canvasW, height: mainH },
        React.createElement(Box, { justifyContent: 'center' },
          React.createElement(Text, { bold: true, color: 'cyan' }, ' WIREFRAME ')
        ),
        React.createElement(Box, { paddingX: 1 },
          React.createElement(Text, { dimColor: true }, 'BRAINSTORMING '),
          React.createElement(Text, { color: 'green' }, '✓0'),
          React.createElement(Text, { dimColor: true }, '/'),
          React.createElement(Text, { color: 'red' }, '✗0')
        ),
        React.createElement(Box, { flexDirection: 'column' },
          React.createElement(WireframeBlock, { label: 'Hero', icon: '🏠', color: 'gray' }),
          React.createElement(WireframeBlock, { label: 'Problem', icon: '⚡', color: 'gray' }),
          React.createElement(WireframeBlock, { label: 'Solution', icon: '✨', color: 'gray' }),
          React.createElement(WireframeBlock, { label: 'Social Proof', icon: '★', color: 'gray' }),
          React.createElement(WireframeBlock, { label: 'CTA', icon: '🔘', color: 'gray' })
        )
      )
    ),
    React.createElement(Box, { borderStyle: 'single', borderColor: 'cyan', paddingX: 1 },
      React.createElement(Text, { color: 'cyan' }, '> '),
      React.createElement(Text, { dimColor: true }, 'Type message or /help...')
    ),
    React.createElement(Box, { paddingX: 1 },
      React.createElement(Text, { dimColor: true }, `${cols}x${rows} | ? help | Arrows scroll | Ctrl+C quit`)
    )
  );
}

const { waitUntilExit } = render(
  React.createElement(TestLayout),
  { patchConsole: false, exitOnCtrlC: true }
);

await waitUntilExit();
process.stdout.write('\x1b[?1049l');
