/**
 * LazyWrapper - Suspense boundary with fallback for lazy-loaded components
 * Provides consistent loading states and error boundaries
 */

import { Suspense, ComponentType, lazy, ReactNode, useRef } from 'react';
import { ModalSkeleton, TerminalSkeleton, SettingsSkeleton } from './Skeleton';

// Types for component props
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    console.error('Lazy component error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-4 text-red-400">
          <span>Failed to load component</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// Import React for class component
import React from 'react';

/**
 * LazyWrapper - Wraps lazy-loaded components with Suspense and error boundary
 */
export function LazyWrapper({ children, fallback, onError }: LazyWrapperProps) {
  return (
    <LazyErrorBoundary onError={onError} fallback={fallback}>
      <Suspense fallback={fallback || <LoadingSpinner />}>
        {children}
      </Suspense>
    </LazyErrorBoundary>
  );
}

/**
 * Default loading spinner
 */
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin h-6 w-6 border-2 border-dark-500 border-t-blue-500 rounded-full" />
    </div>
  );
}

/**
 * Prefetch a lazy component (triggers load without rendering)
 */
export function prefetchComponent<T extends ComponentType<any>>(
  lazyComponent: React.LazyExoticComponent<T>
): void {
  // Access the internal _payload to trigger the load
  const component = lazyComponent as any;
  if (component._payload && typeof component._payload._result === 'function') {
    component._payload._result();
  } else if (component._init && component._payload) {
    try {
      component._init(component._payload);
    } catch {
      // Component is being loaded
    }
  }
}

/**
 * Hook for prefetching components on hover/focus
 */
export function usePrefetch<T extends ComponentType<any>>(
  lazyComponent: React.LazyExoticComponent<T>
) {
  const prefetched = useRef(false);

  const triggerPrefetch = () => {
    if (!prefetched.current) {
      prefetchComponent(lazyComponent);
      prefetched.current = true;
    }
  };

  return {
    onMouseEnter: triggerPrefetch,
    onFocus: triggerPrefetch,
    prefetch: triggerPrefetch,
  };
}

/**
 * Creates a lazy component with specific fallback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  FallbackComponent: ComponentType = LoadingSpinner
) {
  const LazyComponent = lazy(importFn);

  type Props = T extends ComponentType<infer P> ? P : never;

  const WrappedComponent = (props: Props) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );

  // Expose the lazy component for prefetching
  WrappedComponent.lazyComponent = LazyComponent;
  WrappedComponent.prefetch = () => prefetchComponent(LazyComponent);

  return WrappedComponent;
}

// Re-export skeletons for convenience
export { ModalSkeleton, TerminalSkeleton, SettingsSkeleton };
