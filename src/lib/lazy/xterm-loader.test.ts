/**
 * Tests for xterm lazy loader
 * Note: DOM-based tests skipped - xterm requires browser environment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the xterm modules
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    loadAddon: vi.fn(),
    open: vi.fn(),
    write: vi.fn(),
    writeln: vi.fn(),
    dispose: vi.fn(),
    onData: vi.fn(),
  })),
}));

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({
    fit: vi.fn(),
  })),
}));

vi.mock('@xterm/xterm/css/xterm.css', () => ({}));

describe('xterm-loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('loadXterm', () => {
    it('should load Terminal and FitAddon classes', async () => {
      const { loadXterm } = await import('./xterm-loader');
      const result = await loadXterm();

      expect(result.Terminal).toBeDefined();
      expect(result.FitAddon).toBeDefined();
    });

    it('should cache loaded modules', async () => {
      const { loadXterm } = await import('./xterm-loader');

      const result1 = await loadXterm();
      const result2 = await loadXterm();

      expect(result1.Terminal).toBe(result2.Terminal);
      expect(result1.FitAddon).toBe(result2.FitAddon);
    });

    it('should return constructor functions', async () => {
      const { loadXterm } = await import('./xterm-loader');
      const { Terminal, FitAddon } = await loadXterm();

      expect(typeof Terminal).toBe('function');
      expect(typeof FitAddon).toBe('function');
    });
  });

  describe('module structure', () => {
    it('should export loadXterm function', async () => {
      const module = await import('./xterm-loader');
      expect(typeof module.loadXterm).toBe('function');
    });

    it('should export createTerminal function', async () => {
      const module = await import('./xterm-loader');
      expect(typeof module.createTerminal).toBe('function');
    });

    it('should use dynamic imports for lazy loading', () => {
      const loaderPath = path.resolve(__dirname, 'xterm-loader.ts');
      const content = fs.readFileSync(loaderPath, 'utf-8');

      // Check for dynamic import syntax
      expect(content).toContain("import('@xterm/xterm')");
      expect(content).toContain("import('@xterm/addon-fit')");
    });

    it('should cache loaded modules to avoid re-importing', () => {
      const loaderPath = path.resolve(__dirname, 'xterm-loader.ts');
      const content = fs.readFileSync(loaderPath, 'utf-8');

      // Check for caching logic
      expect(content).toContain('if (TerminalClass && FitAddonClass)');
    });

    it('should load CSS only once', () => {
      const loaderPath = path.resolve(__dirname, 'xterm-loader.ts');
      const content = fs.readFileSync(loaderPath, 'utf-8');

      // Check for CSS loading flag
      expect(content).toContain('cssLoaded');
      expect(content).toContain('if (!cssLoaded)');
    });
  });
});
