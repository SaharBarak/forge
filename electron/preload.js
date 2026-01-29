const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // File System
  readDir: (dirPath) => ipcRenderer.invoke('fs:readDir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  glob: (pattern, options) => ipcRenderer.invoke('fs:glob', pattern, options),
  exists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),

  // Context
  loadContext: (contextDir) => ipcRenderer.invoke('context:load', contextDir),

  // Dialogs
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  saveFile: (defaultPath) => ipcRenderer.invoke('dialog:saveFile', defaultPath),

  // App
  getPath: (name) => ipcRenderer.invoke('app:getPath', name),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getCwd: () => ipcRenderer.invoke('app:getCwd'),

  // Skills (loaded from .agents/skills/ via npx skills add)
  listSkills: () => ipcRenderer.invoke('skills:list'),
  getAllSkills: () => ipcRenderer.invoke('skills:getAll'),
  getCombinedSkills: () => ipcRenderer.invoke('skills:getCombined'),

  // Briefs (loaded from briefs/ directory)
  readBrief: (briefName) => ipcRenderer.invoke('briefs:read', briefName),
  listBriefs: () => ipcRenderer.invoke('briefs:list'),

  // Settings (persisted configuration)
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // Claude Code credentials
  getClaudeToken: () => ipcRenderer.invoke('claude:getToken'),

  // Claude Agent SDK (runs in main process)
  claudeAgentQuery: (params) => ipcRenderer.invoke('claude-agent:query', params),
  claudeAgentEvaluate: (params) => ipcRenderer.invoke('claude-agent:evaluate', params),

  // Personas (manage persona sets)
  listPersonas: () => ipcRenderer.invoke('personas:list'),
  loadPersonas: (name) => ipcRenderer.invoke('personas:load', name),
  savePersonas: (data) => ipcRenderer.invoke('personas:save', data),
  generatePersonas: (params) => ipcRenderer.invoke('personas:generate', params),

  // Export (export sessions)
  exportSession: (params) => ipcRenderer.invoke('export:session', params),
  saveSession: (params) => ipcRenderer.invoke('export:saveSession', params),
});
