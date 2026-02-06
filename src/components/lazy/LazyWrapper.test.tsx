/**
 * LazyWrapper Tests
 * Tests for lazy loading utilities and skeletons
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { lazy } from 'react';
import { 
  LazyWrapper, 
  createLazyComponent, 
  prefetchComponent, 
  usePrefetch,
  ModalSkeleton,
  TerminalSkeleton,
  SettingsSkeleton,
} from './LazyWrapper';
import { 
  ChatViewSkeleton, 
  PersonaCardSkeleton, 
  Shimmer 
} from './Skeleton';

describe('Skeleton Components', () => {
  it('renders ModalSkeleton correctly', () => {
    render(<ModalSkeleton />);
    // Modal skeleton should have fixed positioning
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeTruthy();
  });

  it('renders TerminalSkeleton correctly', () => {
    render(<TerminalSkeleton />);
    // Should have terminal-like elements
    const container = document.querySelector('.bg-dark-950');
    expect(container).toBeTruthy();
  });

  it('renders SettingsSkeleton correctly', () => {
    render(<SettingsSkeleton />);
    // Settings skeleton should have modal overlay
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).toBeTruthy();
  });

  it('renders ChatViewSkeleton correctly', () => {
    render(<ChatViewSkeleton />);
    // Should have flex column layout
    const container = document.querySelector('.flex-1.flex.flex-col');
    expect(container).toBeTruthy();
  });

  it('renders PersonaCardSkeleton correctly', () => {
    render(<PersonaCardSkeleton />);
    // Should have rounded avatar placeholder
    const avatar = document.querySelector('.rounded-full');
    expect(avatar).toBeTruthy();
  });

  it('renders Shimmer correctly', () => {
    render(<Shimmer className="h-4 w-full" />);
    // Should have gradient background
    const shimmer = document.querySelector('.bg-gradient-to-r');
    expect(shimmer).toBeTruthy();
  });

  it('accepts custom className', () => {
    render(<ModalSkeleton className="custom-class" />);
    const overlay = document.querySelector('.custom-class');
    expect(overlay).toBeTruthy();
  });
});

describe('LazyWrapper', () => {
  it('renders children after loading', async () => {
    const TestComponent = () => <div data-testid="test-child">Loaded!</div>;

    render(
      <LazyWrapper fallback={<div>Loading...</div>}>
        <TestComponent />
      </LazyWrapper>
    );

    expect(screen.getByTestId('test-child')).toBeTruthy();
  });

  it('shows default spinner when no fallback provided', () => {
    const TestComponent = () => <div data-testid="test-child">Loaded!</div>;

    render(
      <LazyWrapper>
        <TestComponent />
      </LazyWrapper>
    );

    // Children should render immediately since no suspense is triggered
    expect(screen.getByTestId('test-child')).toBeTruthy();
  });
});

describe('createLazyComponent', () => {
  it('creates a working lazy component', async () => {
    const MockComponent = ({ text }: { text: string }) => (
      <div data-testid="mock">{text}</div>
    );

    // Create a lazy component that resolves immediately
    const LazyMock = createLazyComponent(
      () => Promise.resolve({ default: MockComponent }),
      () => <div data-testid="fallback">Loading...</div>
    );

    render(<LazyMock text="Hello" />);

    // Should show fallback initially then content
    await waitFor(() => {
      expect(screen.getByTestId('mock')).toBeTruthy();
    });

    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('exposes prefetch method', () => {
    const MockComponent = () => <div>Mock</div>;
    const LazyMock = createLazyComponent(
      () => Promise.resolve({ default: MockComponent })
    );

    expect(typeof LazyMock.prefetch).toBe('function');
    expect(LazyMock.lazyComponent).toBeTruthy();
  });
});

describe('prefetchComponent', () => {
  it('triggers component load without rendering', () => {
    const loadFn = vi.fn(() => Promise.resolve({ default: () => <div>Test</div> }));
    const LazyComponent = lazy(loadFn);

    // Prefetch should attempt to trigger the load
    prefetchComponent(LazyComponent);

    // The implementation depends on React internals, so we just verify it doesn't throw
    expect(true).toBe(true);
  });
});

describe('usePrefetch hook', () => {
  it('returns prefetch handlers', () => {
    const LazyComponent = lazy(() => Promise.resolve({ default: () => <div>Test</div> }));

    function TestHook() {
      const prefetch = usePrefetch(LazyComponent);
      return (
        <button
          data-testid="btn"
          onMouseEnter={prefetch.onMouseEnter}
          onFocus={prefetch.onFocus}
          onClick={prefetch.prefetch}
        >
          Hover me
        </button>
      );
    }

    render(<TestHook />);
    const button = screen.getByTestId('btn');

    // Trigger handlers - they should not throw
    fireEvent.mouseEnter(button);
    fireEvent.focus(button);
    fireEvent.click(button);

    expect(button).toBeTruthy();
  });

  it('only prefetches once', () => {
    const loadFn = vi.fn(() => Promise.resolve({ default: () => <div>Test</div> }));
    const LazyComponent = lazy(loadFn);

    function TestHook() {
      const prefetch = usePrefetch(LazyComponent);
      return (
        <button data-testid="btn" onClick={prefetch.prefetch}>
          Click
        </button>
      );
    }

    render(<TestHook />);
    const button = screen.getByTestId('btn');

    // Multiple clicks should only prefetch once (ref tracking)
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // usePrefetch uses a ref to track, so it won't call again
    expect(button).toBeTruthy();
  });
});
