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

  // Sessions (manage saved sessions)
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  loadSession: (name) => ipcRenderer.invoke('sessions:load', name),
  deleteSession: (name) => ipcRenderer.invoke('sessions:delete', name),

  // Personas (manage persona sets)
  listPersonas: () => ipcRenderer.invoke('personas:list'),
  loadPersonas: (name) => ipcRenderer.invoke('personas:load', name),
  savePersonas: (data) => ipcRenderer.invoke('personas:save', data),
  generatePersonas: (params) => ipcRenderer.invoke('personas:generate', params),

  // Export (export sessions)
  exportSession: (params) => ipcRenderer.invoke('export:session', params),
  saveSession: (params) => ipcRenderer.invoke('export:saveSession', params),

  // Auth (keyless did:key identity)
  auth: {
    save: (payload) => ipcRenderer.invoke('auth:save', payload),
    load: () => ipcRenderer.invoke('auth:load'),
    clear: () => ipcRenderer.invoke('auth:clear'),
  },

  // Connections (local embeddings + HNSW vector search)
  connections: {
    status: async () => {
      const r = await ipcRenderer.invoke('connections:status');
      if (!r.success) throw new Error(r.error || 'connections:status failed');
      return r.status;
    },
    indexContribution: async (id, text) => {
      const r = await ipcRenderer.invoke('connections:indexContribution', { id, text });
      if (!r.success) throw new Error(r.error || 'connections:indexContribution failed');
      return { skipped: r.skipped, reason: r.reason };
    },
    deindexContribution: async (id) => {
      const r = await ipcRenderer.invoke('connections:deindexContribution', { id });
      if (!r.success) throw new Error(r.error || 'connections:deindexContribution failed');
      return { skipped: r.skipped };
    },
    findSimilar: async (text, k, excludeId) => {
      const r = await ipcRenderer.invoke('connections:findSimilar', { text, k, excludeId });
      if (!r.success) throw new Error(r.error || 'connections:findSimilar failed');
      return r.matches;
    },
  },

  // P2P (Helia + OrbitDB)
  p2p: {
    status: async () => {
      const r = await ipcRenderer.invoke('p2p:status');
      if (!r.success) throw new Error(r.error || 'p2p:status failed');
      return r.status;
    },
    put: async (doc) => {
      const r = await ipcRenderer.invoke('p2p:put', doc);
      if (!r.success) throw new Error(r.error || 'p2p:put failed');
      return r.result;
    },
    get: async (id) => {
      const r = await ipcRenderer.invoke('p2p:get', id);
      if (!r.success) throw new Error(r.error || 'p2p:get failed');
      return r.doc;
    },
    all: async () => {
      const r = await ipcRenderer.invoke('p2p:all');
      if (!r.success) throw new Error(r.error || 'p2p:all failed');
      return r.docs;
    },
    delete: async (id) => {
      const r = await ipcRenderer.invoke('p2p:delete', id);
      if (!r.success) throw new Error(r.error || 'p2p:delete failed');
      return r.hash;
    },
    onUpdate: (callback) => {
      const listener = (_, evt) => callback(evt);
      ipcRenderer.on('p2p:update', listener);
      return () => ipcRenderer.off('p2p:update', listener);
    },
  },
});
