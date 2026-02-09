/**
 * Config Command
 * Get, set, and list configuration values
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

interface ForgeConfig {
  apiKey?: string;
  defaultLanguage?: string;
  defaultAgents?: string[];
  outputDir?: string;
  contextDir?: string;
  maxRounds?: number;
  consensusThreshold?: number;
  theme?: 'light' | 'dark' | 'auto';
}

const CONFIG_FILENAME = '.forgerc.json';
const CONFIG_KEYS: (keyof ForgeConfig)[] = [
  'apiKey',
  'defaultLanguage',
  'defaultAgents',
  'outputDir',
  'contextDir',
  'maxRounds',
  'consensusThreshold',
  'theme',
];

interface ConfigOptions {
  global?: boolean;
  json?: boolean;
}

export function createConfigCommand(): Command {
  const config = new Command('config')
    .description('Manage Forge configuration');

  // List all config values
  config
    .command('list')
    .alias('ls')
    .description('List all configuration values')
    .option('-g, --global', 'Show global config only')
    .option('--json', 'Output as JSON')
    .action(async (options: ConfigOptions) => {
      await listConfig(options);
    });

  // Get a config value
  config
    .command('get <key>')
    .description('Get a configuration value')
    .option('-g, --global', 'Get from global config')
    .option('--json', 'Output as JSON')
    .action(async (key: string, options: ConfigOptions) => {
      await getConfig(key, options);
    });

  // Set a config value
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .option('-g, --global', 'Set in global config')
    .action(async (key: string, value: string, options: ConfigOptions) => {
      await setConfig(key, value, options);
    });

  // Unset a config value
  config
    .command('unset <key>')
    .alias('rm')
    .description('Remove a configuration value')
    .option('-g, --global', 'Remove from global config')
    .action(async (key: string, options: ConfigOptions) => {
      await unsetConfig(key, options);
    });

  // Edit config file
  config
    .command('edit')
    .description('Open config file in editor')
    .option('-g, --global', 'Edit global config')
    .action(async (options: ConfigOptions) => {
      await editConfig(options);
    });

  // Show config file path
  config
    .command('path')
    .description('Show config file path')
    .option('-g, --global', 'Show global config path')
    .action((options: ConfigOptions) => {
      const configPath = options.global
        ? getGlobalConfigPath()
        : getLocalConfigPath();
      console.log(configPath);
    });

  // Initialize config file
  config
    .command('init')
    .description('Create a config file with defaults')
    .option('-g, --global', 'Create global config')
    .option('--force', 'Overwrite existing config')
    .action(async (options: ConfigOptions & { force?: boolean }) => {
      await initConfig(options);
    });

  return config;
}

function getGlobalConfigPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, CONFIG_FILENAME);
}

function getLocalConfigPath(): string {
  return path.join(process.cwd(), CONFIG_FILENAME);
}

async function loadConfig(configPath: string): Promise<ForgeConfig> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function saveConfig(configPath: string, config: ForgeConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

async function getMergedConfig(): Promise<{ config: ForgeConfig; sources: Record<string, string> }> {
  const globalPath = getGlobalConfigPath();
  const localPath = getLocalConfigPath();

  const globalConfig = await loadConfig(globalPath);
  const localConfig = await loadConfig(localPath);

  const sources: Record<string, string> = {};
  const merged: ForgeConfig = {};

  // Global first, then local overrides
  for (const key of CONFIG_KEYS) {
    if (globalConfig[key] !== undefined) {
      (merged as any)[key] = globalConfig[key];
      sources[key] = 'global';
    }
    if (localConfig[key] !== undefined) {
      (merged as any)[key] = localConfig[key];
      sources[key] = 'local';
    }
  }

  // Also check environment variables
  if (process.env.ANTHROPIC_API_KEY) {
    merged.apiKey = process.env.ANTHROPIC_API_KEY;
    sources.apiKey = 'env';
  }
  if (process.env.CLAUDE_API_KEY && !merged.apiKey) {
    merged.apiKey = process.env.CLAUDE_API_KEY;
    sources.apiKey = 'env';
  }

  return { config: merged, sources };
}

async function listConfig(options: ConfigOptions): Promise<void> {
  if (options.global) {
    const globalPath = getGlobalConfigPath();
    const config = await loadConfig(globalPath);

    if (options.json) {
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('\n' + chalk.cyan.bold('GLOBAL CONFIGURATION'));
      console.log(chalk.dim(`Path: ${globalPath}`));
      console.log(chalk.dim('─'.repeat(50)));
      displayConfig(config);
    }
    return;
  }

  const { config, sources } = await getMergedConfig();

  if (options.json) {
    console.log(JSON.stringify({ config, sources }, null, 2));
  } else {
    console.log('\n' + chalk.cyan.bold('FORGE CONFIGURATION'));
    console.log(chalk.dim('─'.repeat(50)));
    displayConfigWithSources(config, sources);
  }
}

function displayConfig(config: ForgeConfig): void {
  for (const key of CONFIG_KEYS) {
    const value = config[key];
    if (value !== undefined) {
      const displayValue = key === 'apiKey' && typeof value === 'string'
        ? maskApiKey(value)
        : JSON.stringify(value);
      console.log(`${chalk.bold(key)}: ${displayValue}`);
    }
  }
  console.log('');
}

function displayConfigWithSources(config: ForgeConfig, sources: Record<string, string>): void {
  for (const key of CONFIG_KEYS) {
    const value = config[key];
    if (value !== undefined) {
      const displayValue = key === 'apiKey' && typeof value === 'string'
        ? maskApiKey(value)
        : JSON.stringify(value);
      const source = sources[key];
      const sourceColor = source === 'env' ? chalk.yellow : source === 'local' ? chalk.green : chalk.blue;
      console.log(`${chalk.bold(key)}: ${displayValue} ${sourceColor(`(${source})`)}`);
    }
  }
  console.log('');
  console.log(chalk.dim('Sources: ') + chalk.yellow('env') + ' | ' + chalk.green('local') + ' | ' + chalk.blue('global'));
  console.log('');
}

function maskApiKey(key: string): string {
  if (key.length <= 10) return '***';
  return key.slice(0, 8) + '...' + key.slice(-4);
}

async function getConfig(key: string, options: ConfigOptions): Promise<void> {
  if (!CONFIG_KEYS.includes(key as keyof ForgeConfig)) {
    console.error(chalk.red(`Unknown config key: ${key}`));
    console.error(`Valid keys: ${CONFIG_KEYS.join(', ')}`);
    process.exit(1);
  }

  const { config, sources } = await getMergedConfig();
  const value = config[key as keyof ForgeConfig];

  if (value === undefined) {
    if (!options.json) {
      console.log(chalk.dim('(not set)'));
    }
    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ key, value, source: sources[key] }, null, 2));
  } else {
    const displayValue = key === 'apiKey' && typeof value === 'string'
      ? maskApiKey(value)
      : JSON.stringify(value);
    console.log(displayValue);
  }
}

async function setConfig(key: string, value: string, options: ConfigOptions): Promise<void> {
  if (!CONFIG_KEYS.includes(key as keyof ForgeConfig)) {
    console.error(chalk.red(`Unknown config key: ${key}`));
    console.error(`Valid keys: ${CONFIG_KEYS.join(', ')}`);
    process.exit(1);
  }

  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  const config = await loadConfig(configPath);

  // Parse value based on key type
  let parsedValue: any = value;
  if (key === 'defaultAgents') {
    parsedValue = value.split(',').map(s => s.trim());
  } else if (key === 'maxRounds') {
    parsedValue = parseInt(value, 10);
  } else if (key === 'consensusThreshold') {
    parsedValue = parseFloat(value);
  }

  (config as any)[key] = parsedValue;
  await saveConfig(configPath, config);

  console.log(chalk.green(`Set ${key} = ${JSON.stringify(parsedValue)}`));
}

async function unsetConfig(key: string, options: ConfigOptions): Promise<void> {
  if (!CONFIG_KEYS.includes(key as keyof ForgeConfig)) {
    console.error(chalk.red(`Unknown config key: ${key}`));
    process.exit(1);
  }

  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  const config = await loadConfig(configPath);

  if ((config as any)[key] === undefined) {
    console.log(chalk.dim(`${key} is not set`));
    return;
  }

  delete (config as any)[key];
  await saveConfig(configPath, config);

  console.log(chalk.green(`Removed ${key}`));
}

async function editConfig(options: ConfigOptions): Promise<void> {
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();

  // Ensure file exists
  try {
    await fs.access(configPath);
  } catch {
    await saveConfig(configPath, {});
  }

  const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
  const { spawn } = await import('child_process');

  console.log(`Opening ${configPath} with ${editor}...`);

  const child = spawn(editor, [configPath], {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(chalk.red(`Editor exited with code ${code}`));
    }
  });
}

async function initConfig(options: ConfigOptions & { force?: boolean }): Promise<void> {
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();

  // Check if exists
  try {
    await fs.access(configPath);
    if (!options.force) {
      console.error(chalk.yellow(`Config already exists: ${configPath}`));
      console.error('Use --force to overwrite.');
      return;
    }
  } catch {
    // File doesn't exist, that's fine
  }

  const defaultConfig: ForgeConfig = {
    defaultLanguage: 'hebrew',
    outputDir: 'output/sessions',
    contextDir: 'context',
    maxRounds: 10,
    consensusThreshold: 0.6,
    theme: 'auto',
  };

  await saveConfig(configPath, defaultConfig);
  console.log(chalk.green(`Created config: ${configPath}`));
}
