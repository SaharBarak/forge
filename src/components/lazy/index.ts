/**
 * Lazy loading exports
 * Provides lazy-loaded versions of heavy components
 */

import { lazy } from 'react';
import { 
  ModalSkeleton, 
  TerminalSkeleton, 
  SettingsSkeleton,
  ChatViewSkeleton,
  PersonaCardSkeleton,
  Shimmer,
} from './Skeleton';
import { 
  LazyWrapper, 
  createLazyComponent, 
  prefetchComponent, 
  usePrefetch 
} from './LazyWrapper';

// ============================================
// Lazy-loaded Modal Components
// ============================================

/**
 * Lazy ExportModal - loaded on-demand when export is triggered
 */
export const LazyExportModal = lazy(() => 
  import('../chat/ExportModal').then(m => ({ default: m.ExportModal }))
);

/**
 * Lazy SettingsModal - loaded on-demand when settings is opened
 */
export const LazySettingsModal = lazy(() => 
  import('../settings/SettingsModal').then(m => ({ default: m.SettingsModal }))
);

// ============================================
// Lazy-loaded Heavy Components
// ============================================

/**
 * Lazy TerminalPane - xterm.js is heavy (~200KB)
 * Use for dynamic terminal instances outside ShellLayout
 */
export const LazyTerminalPane = lazy(() => 
  import('../shell/TerminalPane').then(m => ({ default: m.TerminalPane }))
);

/**
 * Lazy ChatView - for code-splitting main views
 */
export const LazyChatView = lazy(() => 
  import('../chat/ChatView').then(m => ({ default: m.ChatView }))
);

// ============================================
// Prefetch Hints
// ============================================

/**
 * Prefetch likely-needed components based on user action hints
 */
export const prefetchHints = {
  /**
   * Call when user hovers over export button
   */
  exportModal: () => prefetchComponent(LazyExportModal),
  
  /**
   * Call when user hovers over settings button
   */
  settingsModal: () => prefetchComponent(LazySettingsModal),
  
  /**
   * Call when a session is about to start (terminal will be needed)
   */
  terminal: () => prefetchComponent(LazyTerminalPane),
  
  /**
   * Call when switching to chat view
   */
  chatView: () => prefetchComponent(LazyChatView),

  /**
   * Prefetch all modals (call during idle time)
   */
  allModals: () => {
    prefetchComponent(LazyExportModal);
    prefetchComponent(LazySettingsModal);
  },
};

/**
 * Hook for common prefetch patterns
 */
export function useComponentPrefetch() {
  return {
    exportModal: usePrefetch(LazyExportModal),
    settingsModal: usePrefetch(LazySettingsModal),
    terminal: usePrefetch(LazyTerminalPane),
    chatView: usePrefetch(LazyChatView),
  };
}

// ============================================
// Re-exports
// ============================================

export {
  // Wrapper components
  LazyWrapper,
  createLazyComponent,
  prefetchComponent,
  usePrefetch,
  
  // Skeletons
  ModalSkeleton,
  TerminalSkeleton,
  SettingsSkeleton,
  ChatViewSkeleton,
  PersonaCardSkeleton,
  Shimmer,
};
