/**
 * Sessions Management Command
 * List, resume, and delete saved sessions
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import chalk from 'chalk';

interface SessionMeta {
  id: string;
  projectName: string;
  goal?: string;
  startedAt: string;
  status: string;
  messageCount?: number;
  currentPhase?: string;
}

interface SessionsOptions {
  output?: string;
  json?: boolean;
  limit?: number;
}

export function createSessionsCommand(): Command {
  const sessions = new Command('sessions')
    .description('Manage saved sessions');

  // List sessions
  sessions
    .command('list')
    .alias('ls')
    .description('List all saved sessions')
    .option('-o, --output <dir>', 'Sessions directory', 'output/sessions')
    .option('--json', 'Output as JSON')
    .option('-n, --limit <count>', 'Limit number of sessions shown')
    .action(async (options: SessionsOptions) => {
      await listSessions(options);
    });

  // Show session details
  sessions
    .command('show <name>')
    .description('Show session details')
    .option('-o, --output <dir>', 'Sessions directory', 'output/sessions')
    .option('--json', 'Output as JSON')
    .action(async (name: string, options: SessionsOptions) => {
      await showSession(name, options);
    });

  // Delete session
  sessions
    .command('delete <name>')
    .alias('rm')
    .description('Delete a saved session')
    .option('-o, --output <dir>', 'Sessions directory', 'output/sessions')
    .option('--force', 'Skip confirmation')
    .action(async (name: string, options: SessionsOptions & { force?: boolean }) => {
      await deleteSession(name, options);
    });

  // Export session
  sessions
    .command('export <name>')
    .description('Export session to file')
    .option('-o, --output <dir>', 'Sessions directory', 'output/sessions')
    .option('-f, --format <format>', 'Export format (md, json, html)', 'md')
    .option('--dest <path>', 'Destination file path')
    .action(async (name: string, options: SessionsOptions & { format?: string; dest?: string }) => {
      await exportSession(name, options);
    });

  // Clean old sessions
  sessions
    .command('clean')
    .description('Delete old sessions')
    .option('-o, --output <dir>', 'Sessions directory', 'output/sessions')
    .option('--days <count>', 'Delete sessions older than N days', '30')
    .option('--dry-run', 'Show what would be deleted')
    .action(async (options: SessionsOptions & { days?: string; dryRun?: boolean }) => {
      await cleanSessions(options);
    });

  return sessions;
}

async function listSessions(options: SessionsOptions): Promise<void> {
  const cwd = process.cwd();
  const sessionsDir = path.resolve(cwd, options.output || 'output/sessions');

  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

    if (sessionDirs.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ sessions: [] }, null, 2));
      } else {
        console.log('No saved sessions found.');
      }
      return;
    }

    // Load metadata for each session
    const sessions: SessionMeta[] = [];
    for (const dir of sessionDirs) {
      const meta = await loadSessionMeta(path.join(sessionsDir, dir.name));
      if (meta) {
        sessions.push(meta);
      }
    }

    // Sort by date (newest first)
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Apply limit
    const limited = options.limit ? sessions.slice(0, parseInt(String(options.limit), 10)) : sessions;

    if (options.json) {
      console.log(JSON.stringify({ sessions: limited }, null, 2));
    } else {
      console.log('\n' + chalk.cyan.bold('SAVED SESSIONS'));
      console.log(chalk.dim('─'.repeat(60)));
      
      for (let i = 0; i < limited.length; i++) {
        const s = limited[i];
        const date = new Date(s.startedAt).toLocaleDateString();
        const status = s.status === 'completed' ? chalk.green('✓') : chalk.yellow('●');
        
        console.log(`${chalk.bold(String(i + 1))}. ${status} ${chalk.green(s.projectName)}`);
        console.log(`   ${chalk.dim(date)} • ${chalk.dim(s.goal?.slice(0, 50) || '')}`);
        console.log(`   ${chalk.dim(`Phase: ${s.currentPhase || 'unknown'} • Messages: ${s.messageCount || 0}`)}`);
      }
      
      console.log('');
      console.log(chalk.dim(`Use 'forge sessions show <name>' for details.`));
    }

  } catch (error: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

async function showSession(name: string, options: SessionsOptions): Promise<void> {
  const cwd = process.cwd();
  const sessionsDir = path.resolve(cwd, options.output || 'output/sessions');
  
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    if (options.json) {
      console.log(JSON.stringify({ error: `Session not found: ${name}` }, null, 2));
    } else {
      console.error(`Session not found: ${name}`);
    }
    process.exit(1);
  }

  try {
    // Load full session data
    const sessionPath = path.join(sessionDir, 'session.json');
    const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));

    // Load messages
    let messages: any[] = [];
    try {
      const messagesPath = path.join(sessionDir, 'messages.jsonl');
      const content = await fs.readFile(messagesPath, 'utf-8');
      messages = content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    } catch {
      // No messages file
    }

    if (options.json) {
      console.log(JSON.stringify({
        ...sessionData,
        messages,
        messageCount: messages.length,
      }, null, 2));
    } else {
      console.log('\n' + chalk.cyan.bold('SESSION DETAILS'));
      console.log(chalk.dim('─'.repeat(60)));
      console.log(`${chalk.bold('Project:')} ${sessionData.projectName || sessionData.config?.projectName}`);
      console.log(`${chalk.bold('Goal:')} ${sessionData.goal || sessionData.config?.goal}`);
      console.log(`${chalk.bold('Started:')} ${new Date(sessionData.startedAt).toLocaleString()}`);
      console.log(`${chalk.bold('Status:')} ${sessionData.status}`);
      console.log(`${chalk.bold('Phase:')} ${sessionData.currentPhase}`);
      console.log(`${chalk.bold('Messages:')} ${messages.length}`);
      console.log(`${chalk.bold('Agents:')} ${(sessionData.config?.enabledAgents || []).join(', ')}`);
      console.log('');

      // Show last few messages
      if (messages.length > 0) {
        console.log(chalk.cyan.bold('RECENT MESSAGES'));
        console.log(chalk.dim('─'.repeat(60)));
        const recent = messages.slice(-5);
        for (const msg of recent) {
          const sender = msg.agentId === 'human' ? chalk.blue('Human') : chalk.yellow(msg.agentId);
          const preview = msg.content.slice(0, 100).replace(/\n/g, ' ');
          console.log(`${sender}: ${chalk.dim(preview)}...`);
        }
        console.log('');
      }
    }

  } catch (error: any) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`Error loading session: ${error.message}`);
    }
    process.exit(1);
  }
}

async function deleteSession(name: string, options: SessionsOptions & { force?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const sessionsDir = path.resolve(cwd, options.output || 'output/sessions');
  
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }

  // Confirm unless --force
  if (!options.force) {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const confirmed = await new Promise<boolean>((resolve) => {
      rl.question(`Delete session "${path.basename(sessionDir)}"? [y/N]: `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });

    if (!confirmed) {
      console.log('Cancelled.');
      return;
    }
  }

  try {
    await fs.rm(sessionDir, { recursive: true });
    console.log(chalk.green(`Deleted: ${path.basename(sessionDir)}`));
  } catch (error: any) {
    console.error(`Error deleting session: ${error.message}`);
    process.exit(1);
  }
}

async function exportSession(name: string, options: SessionsOptions & { format?: string; dest?: string }): Promise<void> {
  const cwd = process.cwd();
  const sessionsDir = path.resolve(cwd, options.output || 'output/sessions');
  const format = options.format || 'md';
  
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }

  try {
    // Load session data
    const sessionPath = path.join(sessionDir, 'session.json');
    const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));

    // Load messages
    let messages: any[] = [];
    try {
      const messagesPath = path.join(sessionDir, 'messages.jsonl');
      const content = await fs.readFile(messagesPath, 'utf-8');
      messages = content.trim().split('\n').filter(l => l).map(l => JSON.parse(l));
    } catch {
      // No messages file
    }

    // Generate export content
    let content: string;
    let ext: string;

    switch (format) {
      case 'json':
        content = JSON.stringify({ ...sessionData, messages }, null, 2);
        ext = 'json';
        break;

      case 'html':
        content = generateHtmlExport(sessionData, messages);
        ext = 'html';
        break;

      case 'md':
      default:
        content = generateMarkdownExport(sessionData, messages);
        ext = 'md';
        break;
    }

    // Write to destination
    const destPath = options.dest || path.join(sessionDir, `export.${ext}`);
    await fs.writeFile(destPath, content);
    console.log(chalk.green(`Exported to: ${destPath}`));

  } catch (error: any) {
    console.error(`Error exporting session: ${error.message}`);
    process.exit(1);
  }
}

async function cleanSessions(options: SessionsOptions & { days?: string; dryRun?: boolean }): Promise<void> {
  const cwd = process.cwd();
  const sessionsDir = path.resolve(cwd, options.output || 'output/sessions');
  const days = parseInt(options.days || '30', 10);
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

    const toDelete: string[] = [];

    for (const dir of sessionDirs) {
      const dirPath = path.join(sessionsDir, dir.name);
      const meta = await loadSessionMeta(dirPath);
      
      if (meta && new Date(meta.startedAt).getTime() < cutoff) {
        toDelete.push(dir.name);
      }
    }

    if (toDelete.length === 0) {
      console.log('No sessions older than ' + days + ' days.');
      return;
    }

    console.log(`Found ${toDelete.length} sessions older than ${days} days:`);
    toDelete.forEach(name => console.log(`  • ${name}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\nDry run - no sessions deleted.'));
      return;
    }

    for (const name of toDelete) {
      await fs.rm(path.join(sessionsDir, name), { recursive: true });
      console.log(chalk.green(`Deleted: ${name}`));
    }

    console.log(`\nDeleted ${toDelete.length} sessions.`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Helper functions

async function loadSessionMeta(sessionDir: string): Promise<SessionMeta | null> {
  try {
    const sessionPath = path.join(sessionDir, 'session.json');
    const data = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));
    
    // Count messages
    let messageCount = 0;
    try {
      const messagesPath = path.join(sessionDir, 'messages.jsonl');
      const content = await fs.readFile(messagesPath, 'utf-8');
      messageCount = content.trim().split('\n').filter(l => l).length;
    } catch {
      // No messages file
    }

    return {
      id: data.id,
      projectName: data.projectName || data.config?.projectName || path.basename(sessionDir),
      goal: data.goal || data.config?.goal,
      startedAt: data.startedAt,
      status: data.status,
      currentPhase: data.currentPhase,
      messageCount,
    };
  } catch {
    return null;
  }
}

async function findSession(sessionsDir: string, nameOrIndex: string): Promise<string | null> {
  try {
    const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);
    
    // Sort by date (newest first)
    sessionDirs.sort().reverse();

    // Check if it's an index
    const index = parseInt(nameOrIndex, 10);
    if (!isNaN(index) && index >= 1 && index <= sessionDirs.length) {
      return path.join(sessionsDir, sessionDirs[index - 1]);
    }

    // Search by name
    const match = sessionDirs.find(d => d.includes(nameOrIndex));
    if (match) {
      return path.join(sessionsDir, match);
    }

    return null;
  } catch {
    return null;
  }
}

function generateMarkdownExport(session: any, messages: any[]): string {
  const lines: string[] = [];
  const projectName = session.projectName || session.config?.projectName || 'Session';
  const goal = session.goal || session.config?.goal || '';

  lines.push(`# ${projectName}`);
  lines.push('');
  lines.push(`**Goal:** ${goal}`);
  lines.push(`**Date:** ${new Date(session.startedAt).toLocaleString()}`);
  lines.push(`**Status:** ${session.status}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    const sender = msg.agentId === 'human' ? 'Human' : msg.agentId;
    lines.push(`## ${sender}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function generateHtmlExport(session: any, messages: any[]): string {
  const projectName = session.projectName || session.config?.projectName || 'Session';
  const goal = session.goal || session.config?.goal || '';

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Forge Session</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .meta { color: #666; margin-bottom: 20px; }
    .message { border-left: 3px solid #ddd; padding-left: 15px; margin: 20px 0; }
    .message.human { border-left-color: #4a9eff; }
    .message h3 { margin: 0 0 10px 0; color: #333; }
    .message.human h3 { color: #4a9eff; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
  </style>
</head>
<body>
  <h1>${projectName}</h1>
  <div class="meta">
    <p><strong>Goal:</strong> ${goal}</p>
    <p><strong>Date:</strong> ${new Date(session.startedAt).toLocaleString()}</p>
    <p><strong>Status:</strong> ${session.status}</p>
  </div>
  <hr>
`;

  for (const msg of messages) {
    const sender = msg.agentId === 'human' ? 'Human' : msg.agentId;
    const isHuman = msg.agentId === 'human';
    html += `  <div class="message${isHuman ? ' human' : ''}">
    <h3>${sender}</h3>
    <div class="content">${escapeHtml(msg.content)}</div>
  </div>
`;
  }

  html += `</body>
</html>`;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
