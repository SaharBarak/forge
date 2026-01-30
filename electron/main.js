import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { glob } from 'glob';
import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================================================
// IPC HANDLERS
// ============================================================================

// File System Operations
ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.map((f) => ({
      name: f.name,
      isDirectory: f.isDirectory(),
      path: path.join(dirPath, f.name),
    }));
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading file:', error);
    return null;
  }
});

ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing file:', error);
    return false;
  }
});

ipcMain.handle('fs:glob', async (_, pattern, options) => {
  try {
    return await glob(pattern, options);
  } catch (error) {
    console.error('Error globbing:', error);
    return [];
  }
});

ipcMain.handle('fs:exists', async (_, filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

// Load context files from a directory
ipcMain.handle('context:load', async (_, contextDir) => {
  const context = {
    brand: null,
    audience: null,
    research: [],
    examples: [],
    competitors: [],
  };

  try {
    // Load brand context
    const brandPath = path.join(contextDir, 'brand', 'brand.md');
    try {
      context.brand = await fs.readFile(brandPath, 'utf-8');
    } catch {}

    // Load audience context
    const audiencePath = path.join(contextDir, 'audience', 'segments.md');
    try {
      context.audience = await fs.readFile(audiencePath, 'utf-8');
    } catch {}

    // Load research files
    const researchDir = path.join(contextDir, 'research');
    try {
      const researchFiles = await fs.readdir(researchDir);
      for (const file of researchFiles) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(researchDir, file), 'utf-8');
          context.research.push({ file, content });
        }
      }
    } catch {}

    // Load example files
    const examplesDir = path.join(contextDir, 'examples');
    try {
      const exampleFiles = await fs.readdir(examplesDir);
      for (const file of exampleFiles) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(examplesDir, file), 'utf-8');
          context.examples.push({ file, content });
        }
      }
    } catch {}

    return context;
  } catch (error) {
    console.error('Error loading context:', error);
    return context;
  }
});

// Dialog Operations
ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result.canceled ? null : result.filePath;
});

// App Info
ipcMain.handle('app:getPath', (_, name) => {
  return app.getPath(name);
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getCwd', () => {
  return process.cwd();
});

// ============================================================================
// CLAUDE CODE CREDENTIALS (reads from ~/.claude/credentials.json)
// ============================================================================

const CLAUDE_CREDENTIALS_PATH = path.join(app.getPath('home'), '.claude', 'credentials.json');

ipcMain.handle('claude:getToken', async () => {
  try {
    const data = await fs.readFile(CLAUDE_CREDENTIALS_PATH, 'utf-8');
    const creds = JSON.parse(data);
    return creds?.claudeAiOauth?.accessToken || null;
  } catch (error) {
    console.error('Error reading Claude credentials:', error);
    return null;
  }
});

// ============================================================================
// SETTINGS/STORAGE HANDLERS (persisted config)
// ============================================================================

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

// Load settings
async function loadSettings() {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Save settings
async function saveSettings(settings) {
  try {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
}

// Get a setting
ipcMain.handle('settings:get', async (_, key) => {
  const settings = await loadSettings();
  return settings[key] ?? null;
});

// Set a setting
ipcMain.handle('settings:set', async (_, key, value) => {
  const settings = await loadSettings();
  settings[key] = value;
  return await saveSettings(settings);
});

// Get all settings
ipcMain.handle('settings:getAll', async () => {
  return await loadSettings();
});

// ============================================================================
// BRIEFS HANDLERS (reads from briefs/ directory)
// ============================================================================

const BRIEFS_DIR = path.join(process.cwd(), 'briefs');

// Read a specific brief
ipcMain.handle('briefs:read', async (_, briefName) => {
  try {
    const briefPath = path.join(BRIEFS_DIR, `${briefName}.md`);
    return await fs.readFile(briefPath, 'utf-8');
  } catch (error) {
    console.error('Error reading brief:', error);
    return null;
  }
});

// List all available briefs
ipcMain.handle('briefs:list', async () => {
  try {
    const files = await fs.readdir(BRIEFS_DIR);
    return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
  } catch {
    return [];
  }
});

// ============================================================================
// SESSIONS HANDLERS (manage saved sessions)
// ============================================================================

const SESSIONS_DIR = path.join(process.cwd(), 'output', 'sessions');

// List all saved sessions
ipcMain.handle('sessions:list', async () => {
  try {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });
    const dirs = await fs.readdir(SESSIONS_DIR, { withFileTypes: true });
    const sessions = [];

    for (const dir of dirs) {
      if (!dir.isDirectory()) continue;

      const sessionPath = path.join(SESSIONS_DIR, dir.name, 'session.json');
      try {
        const content = await fs.readFile(sessionPath, 'utf-8');
        const metadata = JSON.parse(content);
        sessions.push({
          id: metadata.id,
          name: dir.name,
          projectName: metadata.projectName,
          goal: metadata.goal?.slice(0, 100),
          startedAt: metadata.startedAt,
          endedAt: metadata.endedAt,
          messageCount: metadata.messageCount || 0,
          currentPhase: metadata.currentPhase,
        });
      } catch {
        // Skip invalid sessions
      }
    }

    // Sort by date, newest first
    sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return sessions;
  } catch {
    return [];
  }
});

// Load a specific session
ipcMain.handle('sessions:load', async (_, sessionName) => {
  try {
    const sessionDir = path.join(SESSIONS_DIR, sessionName);
    const sessionPath = path.join(sessionDir, 'session.json');
    const messagesPath = path.join(sessionDir, 'messages.jsonl');
    const memoryPath = path.join(sessionDir, 'memory.json');

    // Load metadata
    const metadataContent = await fs.readFile(sessionPath, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    // Load messages
    let messages = [];
    try {
      const messagesContent = await fs.readFile(messagesPath, 'utf-8');
      messages = messagesContent
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));
    } catch {
      // No messages file
    }

    // Load memory state
    let memoryState = null;
    try {
      const memoryContent = await fs.readFile(memoryPath, 'utf-8');
      memoryState = JSON.parse(memoryContent);
    } catch {
      // No memory file (older session)
    }

    return { success: true, metadata, messages, memoryState };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete a session
ipcMain.handle('sessions:delete', async (_, sessionName) => {
  try {
    const sessionDir = path.join(SESSIONS_DIR, sessionName);
    await fs.rm(sessionDir, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ============================================================================
// SKILLS HANDLERS (reads from .agents/skills/ - installed via npx skills)
// ============================================================================

const AGENTS_SKILLS_DIR = path.join(process.cwd(), '.agents', 'skills');

// List all installed skills (from npx skills add)
ipcMain.handle('skills:list', async () => {
  try {
    const skillDirs = await fs.readdir(AGENTS_SKILLS_DIR);
    const skills = [];

    for (const dir of skillDirs) {
      const skillPath = path.join(AGENTS_SKILLS_DIR, dir, 'SKILL.md');
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = dir;
        let description = '';

        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
          const descMatch = frontmatter.match(/^description:\s*(.+)$/m);
          if (nameMatch) name = nameMatch[1];
          if (descMatch) description = descMatch[1];
        }

        skills.push({ name, description, dir });
      } catch {}
    }

    return skills;
  } catch {
    return [];
  }
});

// Get all skills content
ipcMain.handle('skills:getAll', async () => {
  try {
    const skillDirs = await fs.readdir(AGENTS_SKILLS_DIR);
    const skills = [];

    for (const dir of skillDirs) {
      const skillPath = path.join(AGENTS_SKILLS_DIR, dir, 'SKILL.md');
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        // Remove frontmatter for the content
        const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n*/, '');
        skills.push({ name: dir, content: withoutFrontmatter });
      } catch {}
    }

    return skills;
  } catch {
    return [];
  }
});

// Get combined skills content as single string (for agent prompts)
ipcMain.handle('skills:getCombined', async () => {
  try {
    const skillDirs = await fs.readdir(AGENTS_SKILLS_DIR);
    let combined = '';

    for (const dir of skillDirs) {
      const skillPath = path.join(AGENTS_SKILLS_DIR, dir, 'SKILL.md');
      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        // Remove frontmatter
        const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n*/, '');
        combined += `\n\n## SKILL: ${dir.toUpperCase()}\n\n${withoutFrontmatter}`;
      } catch {}
    }

    return combined.trim();
  } catch {
    return '';
  }
});

// ============================================================================
// PERSONAS HANDLERS (manage persona sets)
// ============================================================================

const PERSONAS_DIR = path.join(process.cwd(), 'personas');

// List available persona sets
ipcMain.handle('personas:list', async () => {
  try {
    await fs.mkdir(PERSONAS_DIR, { recursive: true });
    const files = await fs.readdir(PERSONAS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('.skills'));

    const personaSets = [];
    for (const file of jsonFiles) {
      const name = path.basename(file, '.json');
      try {
        const content = await fs.readFile(path.join(PERSONAS_DIR, file), 'utf-8');
        const personas = JSON.parse(content);
        personaSets.push({
          name,
          count: personas.length,
          personas: personas.map(p => ({ id: p.id, name: p.name, role: p.role })),
        });
      } catch {}
    }
    return personaSets;
  } catch {
    return [];
  }
});

// Load a specific persona set
ipcMain.handle('personas:load', async (_, name) => {
  try {
    const personasPath = path.join(PERSONAS_DIR, `${name}.json`);
    const content = await fs.readFile(personasPath, 'utf-8');
    const personas = JSON.parse(content);

    // Try to load skills too
    let skills = null;
    try {
      const skillsPath = path.join(PERSONAS_DIR, `${name}.skills.md`);
      skills = await fs.readFile(skillsPath, 'utf-8');
    } catch {}

    return { success: true, personas, skills };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save a persona set
ipcMain.handle('personas:save', async (_, { name, personas, skills }) => {
  try {
    await fs.mkdir(PERSONAS_DIR, { recursive: true });

    const personasPath = path.join(PERSONAS_DIR, `${name}.json`);
    await fs.writeFile(personasPath, JSON.stringify(personas, null, 2));

    if (skills) {
      const skillsPath = path.join(PERSONAS_DIR, `${name}.skills.md`);
      await fs.writeFile(skillsPath, skills);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generate personas using AI
ipcMain.handle('personas:generate', async (_, { projectName, goal, count = 5 }) => {
  const PERSONA_GENERATION_PROMPT = `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project.

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have.

### 2. "personas" field
An array of personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name
- role: Short role description
- age: Realistic age
- background: 2-3 sentence background
- personality: Array of 4-5 traits
- biases: Array of 3-4 biases
- strengths: Array of 3-4 strengths
- weaknesses: Array of 2 weaknesses
- speakingStyle: How they communicate
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red`;

  const contextPrompt = `Generate debate personas for this project:

**Project:** ${projectName}
**Goal:** ${goal}

Create ${count} personas that would be valuable stakeholders in debating and making decisions for this project. Include diverse perspectives that will create productive tension.`;

  try {
    let content = '';
    const q = claudeQuery({
      prompt: contextPrompt,
      options: {
        systemPrompt: PERSONA_GENERATION_PROMPT,
        model: 'claude-sonnet-4-20250514',
        tools: [],
        permissionMode: 'dontAsk',
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
        stderr: (data) => console.error('[Persona Gen stderr]', data),
      },
    });

    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            content += block.text;
          }
        }
      }
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: 'Failed to parse personas from response' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const personas = parsed.personas || parsed;
    const skills = parsed.expertise || null;

    // Auto-save the generated personas
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    await fs.mkdir(PERSONAS_DIR, { recursive: true });
    await fs.writeFile(
      path.join(PERSONAS_DIR, `${safeName}.json`),
      JSON.stringify(personas, null, 2)
    );
    if (skills) {
      await fs.writeFile(
        path.join(PERSONAS_DIR, `${safeName}.skills.md`),
        skills
      );
    }

    return { success: true, personas, skills, savedAs: safeName };
  } catch (error) {
    console.error('Persona generation error:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// EXPORT HANDLERS (export sessions in various formats)
// ============================================================================

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'sessions');

// Export session data
ipcMain.handle('export:session', async (_, { session, format = 'md', type = 'transcript' }) => {
  try {
    const messages = session.messages || [];
    const metadata = {
      id: session.id,
      projectName: session.config?.projectName || 'Unknown',
      goal: session.config?.goal || '',
      enabledAgents: session.config?.enabledAgents || [],
      startedAt: session.startedAt,
      endedAt: session.endedAt,
    };

    let output = '';
    let filename = '';

    switch (type) {
      case 'transcript':
        output = generateTranscript(metadata, messages, format);
        filename = `transcript.${format}`;
        break;
      case 'draft':
        output = generateDraft(metadata, messages, format);
        filename = `draft.${format}`;
        break;
      case 'summary':
        output = generateSummary(metadata, messages, format);
        filename = `summary.${format}`;
        break;
      case 'messages':
        output = format === 'json' ? JSON.stringify(messages, null, 2) : messages.map(m => `**${m.agentId}**: ${m.content.slice(0, 100)}...`).join('\n\n');
        filename = `messages.${format}`;
        break;
      default:
        return { success: false, error: 'Unknown export type' };
    }

    return { success: true, content: output, filename };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Save session to disk
ipcMain.handle('export:saveSession', async (_, { session }) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safeName = (session.config?.projectName || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
    const sessionDir = path.join(OUTPUT_DIR, `${timestamp}-${safeName}`);

    await fs.mkdir(sessionDir, { recursive: true });

    // Save session metadata
    await fs.writeFile(
      path.join(sessionDir, 'session.json'),
      JSON.stringify({
        id: session.id,
        projectName: session.config?.projectName,
        goal: session.config?.goal,
        enabledAgents: session.config?.enabledAgents,
        startedAt: session.startedAt,
        endedAt: session.endedAt || new Date().toISOString(),
        messageCount: session.messages?.length || 0,
        currentPhase: session.currentPhase,
      }, null, 2)
    );

    // Save messages as JSONL
    const messagesLines = (session.messages || []).map(m => JSON.stringify(m)).join('\n');
    await fs.writeFile(path.join(sessionDir, 'messages.jsonl'), messagesLines);

    // Save memory state if present
    if (session.memoryState) {
      await fs.writeFile(
        path.join(sessionDir, 'memory.json'),
        JSON.stringify(session.memoryState, null, 2)
      );
    }

    // Save transcript
    const transcript = generateTranscript(
      { projectName: session.config?.projectName, goal: session.config?.goal },
      session.messages || [],
      'md'
    );
    await fs.writeFile(path.join(sessionDir, 'transcript.md'), transcript);

    return { success: true, path: sessionDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Helper functions for export
function generateTranscript(metadata, messages, format) {
  if (format === 'json') {
    return JSON.stringify({ metadata, messages }, null, 2);
  }

  if (format === 'html') {
    return generateHTMLTranscript(metadata, messages);
  }

  // Markdown format
  const lines = [];
  if (metadata) {
    lines.push(`# ${metadata.projectName || 'Debate'} - Transcript`);
    lines.push('');
    if (metadata.goal) lines.push(`**Goal:** ${metadata.goal}`);
    if (metadata.startedAt) lines.push(`**Started:** ${metadata.startedAt}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  for (const msg of messages) {
    const sender = msg.agentId === 'human' ? 'Human' : msg.agentId === 'system' ? 'System' : msg.agentId;
    const time = new Date(msg.timestamp).toLocaleTimeString();
    lines.push(`### ${sender}`);
    lines.push(`*${time}*`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function generateDraft(metadata, messages, format) {
  const draftMessages = messages.filter(m =>
    m.type === 'synthesis' ||
    m.content.includes('## Hero') ||
    m.content.includes('[PROPOSAL]') ||
    m.content.includes('[SYNTHESIS]')
  );

  if (format === 'json') {
    return JSON.stringify({ metadata, drafts: draftMessages }, null, 2);
  }

  const lines = [];
  if (metadata) {
    lines.push(`# ${metadata.projectName || 'Draft'} - Copy`);
    lines.push('');
  }

  if (draftMessages.length === 0) {
    lines.push('*No draft content found.*');
  } else {
    for (const msg of draftMessages) {
      lines.push(`## From ${msg.agentId}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function generateSummary(metadata, messages, format) {
  const agentCounts = new Map();
  for (const msg of messages) {
    if (msg.agentId !== 'system') {
      agentCounts.set(msg.agentId, (agentCounts.get(msg.agentId) || 0) + 1);
    }
  }

  const summary = {
    metadata,
    stats: {
      totalMessages: messages.length,
      agentParticipation: Object.fromEntries(agentCounts),
      syntheses: messages.filter(m => m.type === 'synthesis').length,
      proposals: messages.filter(m => m.content.includes('[PROPOSAL]')).length,
    },
  };

  if (format === 'json') {
    return JSON.stringify(summary, null, 2);
  }

  const lines = [];
  lines.push(`# ${metadata?.projectName || 'Session'} - Summary`);
  lines.push('');
  lines.push('## Statistics');
  lines.push(`- **Total Messages:** ${summary.stats.totalMessages}`);
  lines.push(`- **Syntheses:** ${summary.stats.syntheses}`);
  lines.push(`- **Proposals:** ${summary.stats.proposals}`);
  lines.push('');
  lines.push('## Agent Participation');
  for (const [agent, count] of agentCounts) {
    lines.push(`- **${agent}:** ${count} messages`);
  }

  return lines.join('\n');
}

function generateHTMLTranscript(metadata, messages) {
  const agentColors = {
    ronit: '#9B59B6', avi: '#3498DB', dana: '#E74C3C',
    yossi: '#2ECC71', michal: '#F39C12', noa: '#8E44AD',
    system: '#95A5A6', human: '#34495E',
  };

  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.projectName || 'Forge Debate'} - Transcript</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d9ff; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; background: #16213e; }
    .sender { font-weight: bold; margin-bottom: 5px; }
    .content { white-space: pre-wrap; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>🔥 ${metadata?.projectName || 'Forge Debate'}</h1>
`;

  for (const msg of messages) {
    const color = agentColors[msg.agentId] || '#888';
    html += `
  <div class="message">
    <div class="sender" style="color: ${color}">${msg.agentId}</div>
    <div class="content">${(msg.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
  </div>`;
  }

  html += `</body></html>`;
  return html;
}

// ============================================================================
// CLAUDE AGENT SDK HANDLERS (runs in main process)
// ============================================================================

// Path to Claude Code executable
const CLAUDE_CODE_PATH = path.join(app.getPath('home'), '.local', 'bin', 'claude');

/**
 * Run a Claude Agent SDK query
 * This runs in the main process where Node.js APIs are available
 */
ipcMain.handle('claude-agent:query', async (_, { prompt, systemPrompt, model }) => {
  let content = '';
  let sessionId = '';
  let usage = null;

  try {
    const q = claudeQuery({
      prompt,
      options: {
        systemPrompt: systemPrompt || undefined,
        model: model || 'claude-sonnet-4-20250514',
        tools: [], // No tools for simple queries
        permissionMode: 'dontAsk',
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
        stderr: (data) => console.error('[Claude SDK stderr]', data),
      },
    });

    for await (const message of q) {
      sessionId = message.session_id;

      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            content += block.text;
          }
        }
      }

      if (message.type === 'result') {
        if (message.usage) {
          usage = {
            inputTokens: message.usage.input_tokens || 0,
            outputTokens: message.usage.output_tokens || 0,
            costUsd: message.total_cost_usd || 0,
          };
        }
      }
    }
  } catch (error) {
    // SDK may throw on cleanup even if query succeeded - return content if we have it
    if (content) {
      console.log('Claude SDK threw after completion, returning content anyway');
    } else {
      console.error('Claude Agent SDK error:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true, content, sessionId, usage };
});

/**
 * Evaluate reaction - lightweight query for deciding whether to speak
 */
ipcMain.handle('claude-agent:evaluate', async (_, { evalPrompt }) => {
  let content = '';

  try {
    const q = claudeQuery({
      prompt: evalPrompt,
      options: {
        systemPrompt: 'You are evaluating whether to speak in a discussion. Respond only with JSON.',
        model: 'claude-opus-4-20250514',
        tools: [],
        permissionMode: 'dontAsk',
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
        stderr: (data) => console.error('[Claude SDK stderr]', data),
      },
    });

    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            content += block.text;
          }
        }
      }
    }
  } catch (error) {
    // SDK may throw on cleanup even if query succeeded
    if (!content) {
      console.error('Claude Agent evaluate error:', error);
      return { success: false, urgency: 'pass', reason: 'Error', responseType: '' };
    }
  }

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { success: true, urgency: 'pass', reason: 'Listening', responseType: '' };
  }

  const result = JSON.parse(jsonMatch[0]);
  return {
    success: true,
    urgency: result.urgency || 'pass',
    reason: result.reason || '',
    responseType: result.responseType || '',
  };
});
