import { Suspense, lazy } from 'react';

/**
 * Issue #23: Lazy loading - Code split the heavy ShellLayout component
 * This includes xterm and other heavy dependencies
 */
const LazyShellLayout = lazy(() =>
  import('./components/shell').then(module => ({
    default: module.ShellLayout,
  }))
);

// Full-page loading state
function AppLoadingFallback() {
  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      }}
    >
      <div 
        style={{
          width: '40px',
          height: '40px',
          border: '3px solid #30363d',
          borderTopColor: '#58a6ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#8b949e' }}>
        Loading Forge...
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<AppLoadingFallback />}>
      <LazyShellLayout />
    </Suspense>
  );
}
