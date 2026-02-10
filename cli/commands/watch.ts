/**
 * Watch Command
 * Watch for file changes and trigger sessions
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { watch } from 'fs';
import chalk from 'chalk';

interface WatchOptions {
  brief?: string;
  context?: string;
  output?: string;
  debounce?: string;
  agents?: string;
  language?: string;
  json?: boolean;
}

export function createWatchCommand(): Command {
  const watchCmd = new Command('watch')
    .description('Watch for file changes and trigger sessions')
    .option('-b, --brief <path>', 'Path to brief file to watch')
    .option('-c, --context <dir>', 'Context directory to watch', 'context')
    .option('-o, --output <dir>', 'Output directory', 'output/sessions')
    .option('-d, --debounce <ms>', 'Debounce time in milliseconds', '1000')
    .option('-a, --agents <ids>', 'Comma-separated agent IDs')
    .option('-l, --language <lang>', 'Language: hebrew, english, mixed', 'hebrew')
    .option('--json', 'Output events as JSON')
    .action(async (options: WatchOptions) => {
      await runWatch(options);
    });

  return watchCmd;
}

async function runWatch(options: WatchOptions): Promise<void> {
  const cwd = process.cwd();
  const contextDir = path.resolve(cwd, options.context || 'context');
  const debounceMs = parseInt(options.debounce || '1000', 10);

  // Validate paths
  if (options.brief) {
    try {
      await fs.access(options.brief);
    } catch {
      console.error(chalk.red(`Brief file not found: ${options.brief}`));
      process.exit(1);
    }
  }

  try {
    await fs.access(contextDir);
  } catch {
    console.error(chalk.red(`Context directory not found: ${contextDir}`));
    process.exit(1);
  }

  if (!options.json) {
    console.log('\n' + chalk.cyan.bold('🔍 FORGE WATCH MODE'));
    console.log(chalk.dim('─'.repeat(50)));
    console.log(`Context: ${contextDir}`);
    if (options.brief) {
      console.log(`Brief: ${options.brief}`);
    }
    console.log(`Debounce: ${debounceMs}ms`);
    console.log('');
    console.log(chalk.dim('Watching for changes... (Ctrl+C to stop)'));
    console.log('');
  }

  // Track pending changes
  let pendingChanges: Map<string, NodeJS.Timeout> = new Map();

  const handleChange = (filePath: string, eventType: string) => {
    const relativePath = path.relative(cwd, filePath);

    // Clear existing debounce timer
    const existing = pendingChanges.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      pendingChanges.delete(filePath);
      
      if (options.json) {
        console.log(JSON.stringify({
          event: 'change',
          type: eventType,
          file: relativePath,
          timestamp: new Date().toISOString(),
        }));
      } else {
        const icon = eventType === 'rename' ? '📄' : '✏️';
        console.log(`${icon} ${chalk.yellow(relativePath)} changed`);
      }

      // Trigger session if brief specified
      if (options.brief) {
        await triggerSession(options);
      }
    }, debounceMs);

    pendingChanges.set(filePath, timer);
  };

  // Watch context directory recursively
  const watchRecursive = async (dir: string) => {
    const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        handleChange(path.join(dir, filename), eventType);
      }
    });

    return watcher;
  };

  // Start watching
  const contextWatcher = await watchRecursive(contextDir);

  // Watch brief file if specified
  let briefWatcher: any = null;
  if (options.brief) {
    briefWatcher = watch(options.brief, (eventType) => {
      handleChange(options.brief!, eventType);
    });
  }

  // Handle graceful shutdown
  const cleanup = () => {
    if (!options.json) {
      console.log('\n' + chalk.dim('Stopping watch...'));
    }
    contextWatcher.close();
    if (briefWatcher) {
      briefWatcher.close();
    }
    pendingChanges.forEach(timer => clearTimeout(timer));
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep process running
  await new Promise(() => {});
}

async function triggerSession(options: WatchOptions): Promise<void> {
  // Dynamic import to avoid circular dependencies
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  const args = [
    'start',
    options.brief ? `--brief ${options.brief}` : '',
    options.agents ? `--agents ${options.agents}` : '',
    options.language ? `--language ${options.language}` : '',
    options.output ? `--output ${options.output}` : '',
    '--no-human', // Automated mode
  ].filter(Boolean).join(' ');

  if (options.json) {
    console.log(JSON.stringify({
      event: 'trigger',
      command: `forge ${args}`,
      timestamp: new Date().toISOString(),
    }));
  } else {
    console.log(chalk.cyan('  → Triggering new session...'));
  }

  try {
    const { stdout, stderr } = await execAsync(`npx tsx cli/index.ts ${args}`, {
      cwd: process.cwd(),
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });

    if (stdout && !options.json) {
      console.log(chalk.dim(stdout));
    }
  } catch (error: any) {
    if (options.json) {
      console.log(JSON.stringify({
        event: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.error(chalk.red(`  ✗ Session failed: ${error.message}`));
    }
  }
}
