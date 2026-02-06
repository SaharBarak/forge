/**
 * Lazy-loaded components for code splitting
 * Issue #23: Lazy loading components
 */

import { lazy, Suspense, ComponentType } from 'react';

// Loading fallback component
export function LoadingFallback({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-dark-400">{message}</span>
      </div>
    </div>
  );
}

// Modal loading fallback (overlay style)
export function ModalLoadingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-dark-900 rounded-2xl border border-dark-700 p-8 shadow-2xl">
        <LoadingFallback message="Loading..." />
      </div>
    </div>
  );
}

// Lazy load the SettingsModal
export const LazySettingsModal = lazy(() =>
  import('./settings/SettingsModal').then(module => ({
    default: module.SettingsModal,
  }))
);

// Lazy load the ExportModal
export const LazyExportModal = lazy(() =>
  import('./chat/ExportModal').then(module => ({
    default: module.ExportModal,
  }))
);

// Lazy load ShellLayout (heavy component with xterm)
export const LazyShellLayout = lazy(() =>
  import('./shell/ShellLayout').then(module => ({
    default: module.ShellLayout,
  }))
);

// Lazy load WelcomeScreen
export const LazyWelcomeScreen = lazy(() =>
  import('./WelcomeScreen').then(module => ({
    default: module.WelcomeScreen,
  }))
);

// HOC to wrap any component with Suspense
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback: React.ReactNode = <LoadingFallback />
) {
  return function SuspenseWrapper(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}
