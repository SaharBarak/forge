import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useSessionStore } from '../../stores/sessionStore';
import { ARGUMENTATION_GUIDES, CONSENSUS_GUIDES } from '../../methodologies';

export function SettingsModal() {
  const { setSettingsOpen, hebrewMode, toggleHebrewMode } = useUIStore();
  const { session } = useSessionStore();

  const [apiKey, setApiKey] = useState('');
  const [contextDir, setContextDir] = useState(session?.config.contextDir || './context');
  const [outputDir, setOutputDir] = useState(session?.config.outputDir || './output');

  const handleSelectContextDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.openDirectory();
      if (dir) setContextDir(dir);
    }
  };

  const handleSelectOutputDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.openDirectory();
      if (dir) setOutputDir(dir);
    }
  };

  const t = {
    title: hebrewMode ? 'הגדרות' : 'Settings',
    close: hebrewMode ? 'סגור' : 'Close',
    save: hebrewMode ? 'שמור' : 'Save',
    apiKey: hebrewMode ? 'מפתח API של Anthropic' : 'Anthropic API Key',
    apiKeyPlaceholder: hebrewMode ? 'sk-ant-...' : 'sk-ant-...',
    language: hebrewMode ? 'שפה' : 'Language',
    hebrew: hebrewMode ? 'עברית' : 'Hebrew',
    english: hebrewMode ? 'אנגלית' : 'English',
    directories: hebrewMode ? 'תיקיות' : 'Directories',
    contextDir: hebrewMode ? 'תיקיית הקשר' : 'Context Directory',
    outputDir: hebrewMode ? 'תיקיית פלט' : 'Output Directory',
    browse: hebrewMode ? 'עיון' : 'Browse',
    methodology: hebrewMode ? 'מתודולוגיה' : 'Methodology',
    argumentationStyle: hebrewMode ? 'סגנון דיון' : 'Argumentation Style',
    consensusMethod: hebrewMode ? 'שיטת קונצנזוס' : 'Consensus Method',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Modal */}
      <div className="relative bg-dark-900 rounded-2xl border border-dark-700 w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <h2 className="text-xl font-semibold text-dark-100">{t.title}</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 hover:bg-dark-800 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">
              {t.apiKey}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t.apiKeyPlaceholder}
              className="w-full px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-dark-300">
              {t.language}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => !hebrewMode && toggleHebrewMode()}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  hebrewMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                {t.hebrew}
              </button>
              <button
                onClick={() => hebrewMode && toggleHebrewMode()}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  !hebrewMode
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                }`}
              >
                {t.english}
              </button>
            </div>
          </div>

          {/* Directories */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-dark-300">
              {t.directories}
            </label>

            {/* Context Directory */}
            <div className="space-y-1">
              <label className="block text-xs text-dark-400">{t.contextDir}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={contextDir}
                  onChange={(e) => setContextDir(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSelectContextDir}
                  className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm rounded-lg transition-colors"
                >
                  {t.browse}
                </button>
              </div>
            </div>

            {/* Output Directory */}
            <div className="space-y-1">
              <label className="block text-xs text-dark-400">{t.outputDir}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={outputDir}
                  onChange={(e) => setOutputDir(e.target.value)}
                  className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSelectOutputDir}
                  className="px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 text-sm rounded-lg transition-colors"
                >
                  {t.browse}
                </button>
              </div>
            </div>
          </div>

          {/* Methodology */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-dark-300">
              {t.methodology}
            </label>

            {/* Argumentation Style */}
            <div className="space-y-1">
              <label className="block text-xs text-dark-400">
                {t.argumentationStyle}
              </label>
              <select className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(ARGUMENTATION_GUIDES).map(([key, guide]) => (
                  <option key={key} value={key}>
                    {hebrewMode ? guide.nameHe : guide.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Consensus Method */}
            <div className="space-y-1">
              <label className="block text-xs text-dark-400">
                {t.consensusMethod}
              </label>
              <select className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(CONSENSUS_GUIDES).map(([key, guide]) => (
                  <option key={key} value={key}>
                    {hebrewMode ? guide.nameHe : guide.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-800">
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg transition-colors"
          >
            {t.close}
          </button>
          <button
            onClick={() => setSettingsOpen(false)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-dark-400"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
