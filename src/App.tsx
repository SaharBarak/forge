import { useEffect } from 'react';
import { useSessionStore } from './stores/sessionStore';
import { useUIStore } from './stores/uiStore';
import { Sidebar } from './components/sidebar/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { SettingsModal } from './components/settings/SettingsModal';
import { WelcomeScreen } from './components/WelcomeScreen';

export default function App() {
  const { session } = useSessionStore();
  const { settingsOpen, setSettingsOpen, hebrewMode } = useUIStore();

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + ,  = Settings
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSettingsOpen]);

  return (
    <div
      className="h-screen w-screen flex bg-dark-950 text-dark-100 overflow-hidden"
      dir={hebrewMode ? 'rtl' : 'ltr'}
    >
      {/* Title bar drag region for macOS */}
      <div className="fixed top-0 left-0 right-0 h-7 titlebar-drag z-50" />

      {/* Main Layout */}
      <div className="flex w-full h-full pt-7">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          {session ? <ChatView /> : <WelcomeScreen />}
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal />}
    </div>
  );
}
