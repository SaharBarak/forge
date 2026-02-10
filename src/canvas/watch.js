#!/usr/bin/env node
/**
 * Canvas JSONL File Watcher — Issue #59
 * Watches a canvas JSONL file and re-renders ASCII wireframes on change.
 * Usage: node src/canvas/watch.js [canvas-path] [--width N]
 *
 * Designed to run in a tmux pane or terminal side panel.
 */

import { watch, existsSync } from 'fs';
import { resolve } from 'path';
import { render } from '../../shared/src/canvas/renderer.js';

const args = process.argv.slice(2);
let canvasPath = null;
let width = 60;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--width' && args[i + 1]) {
    width = parseInt(args[i + 1], 10);
    i++;
  } else if (!args[i].startsWith('-')) {
    canvasPath = args[i];
  }
}

if (!canvasPath) {
  canvasPath = 'shared/canvas.jsonl';
}

canvasPath = resolve(canvasPath);

if (!existsSync(canvasPath)) {
  console.error(`Canvas file not found: ${canvasPath}`);
  console.error('Create it first or specify a valid path.');
  process.exit(1);
}

function clearAndRender() {
  // Clear terminal
  process.stdout.write('\x1B[2J\x1B[H');
  
  const timestamp = new Date().toLocaleTimeString();
  console.log(`📋 Canvas Watcher — ${timestamp}`);
  console.log('─'.repeat(width));
  
  try {
    const output = render(canvasPath, width);
    console.log(output);
  } catch (err) {
    console.error(`⚠ Render error: ${err.message}`);
  }
  
  console.log('─'.repeat(width));
  console.log('Watching for changes... (Ctrl+C to quit)');
}

// Initial render
clearAndRender();

// Watch for changes with debounce
let debounceTimer = null;
watch(canvasPath, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(clearAndRender, 100);
});
