/**
 * Enhanced export command
 * Export sessions in various formats and types
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { Message } from '../../src/types';
import { getAgentById } from '../../src/agents/personas';

interface SessionMetadata {
  id: string;
  projectName: string;
  goal: string;
  enabledAgents: string[];
  startedAt: string;
  endedAt?: string;
  messageCount?: number;
  currentPhase?: string;
}

export function createExportCommand(): Command {
  const exportCmd = new Command('export')
    .description('Export session data')
    .option('-s, --session <dir>', 'Session directory to export')
    .option('-f, --format <fmt>', 'Export format: md, json, html', 'md')
    .option('-t, --type <type>', 'Export type: transcript, draft, summary, messages, all', 'transcript')
    .option('-o, --output <file>', 'Output file path')
    .option('-l, --latest', 'Use the latest session', false)
    .action(async (options) => {
      const cwd = process.cwd();
      let sessionDir = options.session;

      // Find session directory
      if (!sessionDir || options.latest) {
        const outputDir = path.join(cwd, 'output/sessions');
        try {
          const dirs = await fs.readdir(outputDir, { withFileTypes: true });
          const sessionDirs = dirs
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort()
            .reverse();

          if (sessionDirs.length === 0) {
            console.error('No sessions found. Run "forge start" first.');
            process.exit(1);
          }

          sessionDir = path.join(outputDir, sessionDirs[0]);
          console.log(`Using session: ${sessionDirs[0]}\n`);
        } catch {
          console.error('No sessions directory found.');
          process.exit(1);
        }
      }

      // Load session data
      const metadataPath = path.join(sessionDir, 'session.json');
      const messagesPath = path.join(sessionDir, 'messages.jsonl');

      let metadata: SessionMetadata | null = null;
      let messages: Message[] = [];

      try {
        const metaContent = await fs.readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      } catch {
        console.warn('Warning: Could not load session metadata');
      }

      try {
        const msgContent = await fs.readFile(messagesPath, 'utf-8');
        messages = msgContent
          .trim()
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch {
        console.warn('Warning: Could not load messages');
      }

      // Generate export based on type and format
      let output = '';
      let filename = '';

      switch (options.type) {
        case 'transcript':
          output = generateTranscript(metadata, messages, options.format);
          filename = `transcript.${options.format}`;
          break;

        case 'draft':
          output = generateDraft(metadata, messages, options.format);
          filename = `draft.${options.format}`;
          break;

        case 'summary':
          output = generateSummary(metadata, messages, options.format);
          filename = `summary.${options.format}`;
          break;

        case 'messages':
          output = generateMessages(messages, options.format);
          filename = `messages.${options.format}`;
          break;

        case 'all':
          // Export all types
          const types = ['transcript', 'draft', 'summary', 'messages'];
          for (const t of types) {
            const typeOutput = generateByType(t, metadata, messages, options.format);
            const typeFile = options.output
              ? path.join(path.dirname(options.output), `${t}.${options.format}`)
              : path.join(sessionDir, `export-${t}.${options.format}`);
            await fs.writeFile(typeFile, typeOutput);
            console.log(`✅ Exported ${t} to ${typeFile}`);
          }
          return;

        default:
          console.error(`Unknown export type: ${options.type}`);
          process.exit(1);
      }

      // Write output
      const outputPath = options.output || path.join(sessionDir, `export-${filename}`);
      await fs.writeFile(outputPath, output);
      console.log(`✅ Exported ${options.type} to ${outputPath}`);
    });

  return exportCmd;
}

function generateByType(type: string, metadata: SessionMetadata | null, messages: Message[], format: string): string {
  switch (type) {
    case 'transcript': return generateTranscript(metadata, messages, format);
    case 'draft': return generateDraft(metadata, messages, format);
    case 'summary': return generateSummary(metadata, messages, format);
    case 'messages': return generateMessages(messages, format);
    default: return '';
  }
}

function generateTranscript(metadata: SessionMetadata | null, messages: Message[], format: string): string {
  if (format === 'json') {
    return JSON.stringify({ metadata, messages }, null, 2);
  }

  if (format === 'html') {
    return generateHTMLTranscript(metadata, messages);
  }

  // Markdown format
  const lines: string[] = [];

  if (metadata) {
    lines.push(`# ${metadata.projectName} - Debate Transcript`);
    lines.push('');
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Started:** ${metadata.startedAt}`);
    if (metadata.endedAt) lines.push(`**Ended:** ${metadata.endedAt}`);
    lines.push(`**Agents:** ${metadata.enabledAgents.join(', ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  for (const msg of messages) {
    const sender = getSenderName(msg.agentId);
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const typeTag = msg.type !== 'system' ? `[${msg.type.toUpperCase()}]` : '';

    lines.push(`### ${sender} ${typeTag}`);
    lines.push(`*${time}*`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function generateDraft(metadata: SessionMetadata | null, messages: Message[], format: string): string {
  // Extract draft content from messages
  const draftMessages = messages.filter(m =>
    m.type === 'synthesis' ||
    m.content.includes('## Hero') ||
    m.content.includes('## Problem') ||
    m.content.includes('## Solution') ||
    m.content.includes('**Hero') ||
    m.content.includes('**כותרת')
  );

  // Also look for final drafting phase content
  const draftingContent = messages.filter(m =>
    m.agentId !== 'system' &&
    m.agentId !== 'human' &&
    (m.content.includes('[PROPOSAL]') || m.content.includes('[SYNTHESIS]'))
  );

  const allDrafts = [...draftMessages, ...draftingContent];

  if (format === 'json') {
    return JSON.stringify({
      metadata,
      drafts: allDrafts.map(m => ({
        agentId: m.agentId,
        content: m.content,
        timestamp: m.timestamp,
      })),
    }, null, 2);
  }

  if (format === 'html') {
    return generateHTMLDraft(metadata, allDrafts);
  }

  // Markdown format
  const lines: string[] = [];

  if (metadata) {
    lines.push(`# ${metadata.projectName} - Draft Copy`);
    lines.push('');
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Generated:** ${new Date().toISOString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  if (allDrafts.length === 0) {
    lines.push('*No draft content found. The debate may not have reached the drafting phase.*');
  } else {
    for (const msg of allDrafts) {
      const sender = getSenderName(msg.agentId);
      lines.push(`## From ${sender}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateSummary(metadata: SessionMetadata | null, messages: Message[], format: string): string {
  // Analyze the session
  const agentCounts = new Map<string, number>();
  const typeBreakdown = new Map<string, number>();

  for (const msg of messages) {
    if (msg.agentId !== 'system') {
      agentCounts.set(msg.agentId, (agentCounts.get(msg.agentId) || 0) + 1);
    }
    typeBreakdown.set(msg.type, (typeBreakdown.get(msg.type) || 0) + 1);
  }

  const syntheses = messages.filter(m => m.type === 'synthesis');
  const agreements = messages.filter(m => m.content.includes('[AGREEMENT]'));
  const disagreements = messages.filter(m => m.content.includes('[DISAGREEMENT]'));
  const proposals = messages.filter(m => m.content.includes('[PROPOSAL]'));

  const summary = {
    metadata,
    stats: {
      totalMessages: messages.length,
      agentParticipation: Object.fromEntries(agentCounts),
      messageTypes: Object.fromEntries(typeBreakdown),
      syntheses: syntheses.length,
      agreements: agreements.length,
      disagreements: disagreements.length,
      proposals: proposals.length,
    },
    keyMoments: {
      lastSynthesis: syntheses[syntheses.length - 1]?.content.slice(0, 500),
      topProposals: proposals.slice(-3).map(m => ({
        from: getSenderName(m.agentId),
        preview: m.content.slice(0, 200),
      })),
    },
  };

  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  // Markdown format
  const lines: string[] = [];

  if (metadata) {
    lines.push(`# ${metadata.projectName} - Session Summary`);
    lines.push('');
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Duration:** ${metadata.startedAt} - ${metadata.endedAt || 'ongoing'}`);
    lines.push('');
  }

  lines.push('## Statistics');
  lines.push('');
  lines.push(`- **Total Messages:** ${summary.stats.totalMessages}`);
  lines.push(`- **Syntheses:** ${summary.stats.syntheses}`);
  lines.push(`- **Agreements:** ${summary.stats.agreements}`);
  lines.push(`- **Disagreements:** ${summary.stats.disagreements}`);
  lines.push(`- **Proposals:** ${summary.stats.proposals}`);
  lines.push('');

  lines.push('## Agent Participation');
  lines.push('');
  for (const [agent, count] of agentCounts) {
    lines.push(`- **${getSenderName(agent)}:** ${count} messages`);
  }
  lines.push('');

  if (summary.keyMoments.lastSynthesis) {
    lines.push('## Latest Synthesis');
    lines.push('');
    lines.push(summary.keyMoments.lastSynthesis + '...');
    lines.push('');
  }

  if (summary.keyMoments.topProposals.length > 0) {
    lines.push('## Recent Proposals');
    lines.push('');
    for (const p of summary.keyMoments.topProposals) {
      lines.push(`### From ${p.from}`);
      lines.push(p.preview + '...');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateMessages(messages: Message[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(messages, null, 2);
  }

  // Markdown - compact format
  const lines = messages.map(m => {
    const sender = getSenderName(m.agentId);
    const time = new Date(m.timestamp).toLocaleTimeString();
    return `**${sender}** (${time}): ${m.content.slice(0, 100)}...`;
  });

  return lines.join('\n\n');
}

function generateHTMLTranscript(metadata: SessionMetadata | null, messages: Message[]): string {
  const agentColors: Record<string, string> = {
    ronit: '#9B59B6',
    avi: '#3498DB',
    dana: '#E74C3C',
    yossi: '#2ECC71',
    michal: '#F39C12',
    noa: '#8E44AD',
    system: '#95A5A6',
    human: '#34495E',
  };

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.projectName || 'Forge Debate'} - Transcript</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d9ff; }
    .meta { color: #888; margin-bottom: 20px; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; background: #16213e; }
    .sender { font-weight: bold; margin-bottom: 5px; }
    .time { color: #666; font-size: 0.8em; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    .type-tag { font-size: 0.8em; padding: 2px 6px; border-radius: 4px; background: #333; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>🔥 ${metadata?.projectName || 'Forge Debate'}</h1>
  <div class="meta">
    <p><strong>Goal:</strong> ${metadata?.goal || 'N/A'}</p>
    <p><strong>Started:</strong> ${metadata?.startedAt || 'N/A'}</p>
  </div>
`;

  for (const msg of messages) {
    const color = agentColors[msg.agentId] || '#888';
    const sender = getSenderName(msg.agentId);
    const time = new Date(msg.timestamp).toLocaleTimeString();

    html += `
  <div class="message">
    <div class="sender" style="color: ${color}">
      ${sender}
      ${msg.type !== 'system' ? `<span class="type-tag">${msg.type}</span>` : ''}
      <span class="time">${time}</span>
    </div>
    <div class="content">${escapeHtml(msg.content)}</div>
  </div>
`;
  }

  html += `</body></html>`;
  return html;
}

function generateHTMLDraft(metadata: SessionMetadata | null, drafts: Message[]): string {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.projectName || 'Forge'} - Draft</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .draft-section { margin: 30px 0; padding: 20px; border-left: 4px solid #00d9ff; background: #f9f9f9; }
    .author { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    .content { white-space: pre-wrap; line-height: 1.8; }
  </style>
</head>
<body>
  <h1>${metadata?.projectName || 'Draft'}</h1>
  <p><em>Generated by Forge</em></p>
`;

  for (const draft of drafts) {
    html += `
  <div class="draft-section">
    <div class="author">From: ${getSenderName(draft.agentId)}</div>
    <div class="content">${escapeHtml(draft.content)}</div>
  </div>
`;
  }

  html += `</body></html>`;
  return html;
}

function getSenderName(agentId: string): string {
  if (agentId === 'human') return 'Human';
  if (agentId === 'system') return 'System';
  const agent = getAgentById(agentId);
  return agent ? `${agent.name} (${agent.nameHe})` : agentId;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}
