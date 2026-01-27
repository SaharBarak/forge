/**
 * UI Store - Zustand state management for UI
 */

import { create } from 'zustand';

type View = 'chat' | 'drafts' | 'decisions' | 'context' | 'settings';

interface UIStore {
  // State
  currentView: View;
  sidebarOpen: boolean;
  settingsOpen: boolean;
  darkMode: boolean;
  hebrewMode: boolean;

  // Actions
  setView: (view: View) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleDarkMode: () => void;
  toggleHebrewMode: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentView: 'chat',
  sidebarOpen: true,
  settingsOpen: false,
  darkMode: true,
  hebrewMode: true,

  setView: (view) => set({ currentView: view }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  toggleHebrewMode: () => set((state) => ({ hebrewMode: !state.hebrewMode })),
}));
