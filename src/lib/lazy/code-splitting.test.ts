/**
 * Tests for code splitting configuration
 * Validates chunk separation and lazy loading behavior
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Code Splitting Configuration', () => {
  describe('vite.config.ts', () => {
    it('should have manualChunks configuration', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain('manualChunks');
    });

    it('should define xterm chunk', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain("xterm: ['@xterm/xterm', '@xterm/addon-fit']");
    });

    it('should define methodologies chunk', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain('methodologies');
    });

    it('should define vendor-react chunk', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain("'vendor-react': ['react', 'react-dom']");
    });

    it('should define vendor-ai chunk', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain("'vendor-ai': ['@anthropic-ai/sdk']");
    });

    it('should define vendor-utils chunk', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain("'vendor-utils': ['uuid', 'yaml', 'gray-matter']");
    });

    it('should have chunk size warning limit', () => {
      const configPath = path.resolve(__dirname, '../../../vite.config.ts');
      const config = fs.readFileSync(configPath, 'utf-8');

      expect(config).toContain('chunkSizeWarningLimit');
    });
  });

  describe('Lazy Loaders', () => {
    it('should export xterm loader functions', async () => {
      const { loadXterm, createTerminal } = await import('./xterm-loader');

      expect(typeof loadXterm).toBe('function');
      expect(typeof createTerminal).toBe('function');
    });

    it('should export methodology loader functions', async () => {
      const {
        loadMethodologies,
        getArgumentationGuide,
        getConsensusGuide,
        getDefaultMethodology,
      } = await import('./methodology-loader');

      expect(typeof loadMethodologies).toBe('function');
      expect(typeof getArgumentationGuide).toBe('function');
      expect(typeof getConsensusGuide).toBe('function');
      expect(typeof getDefaultMethodology).toBe('function');
    });
  });

  describe('Module Structure', () => {
    it('should have lazy module index', () => {
      const indexPath = path.resolve(__dirname, 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
    });

    it('should have xterm-loader module', () => {
      const loaderPath = path.resolve(__dirname, 'xterm-loader.ts');
      expect(fs.existsSync(loaderPath)).toBe(true);
    });

    it('should have methodology-loader module', () => {
      const loaderPath = path.resolve(__dirname, 'methodology-loader.ts');
      expect(fs.existsSync(loaderPath)).toBe(true);
    });
  });

  describe('Bundle Optimization', () => {
    it('should use dynamic imports for xterm', () => {
      const loaderPath = path.resolve(__dirname, 'xterm-loader.ts');
      const loader = fs.readFileSync(loaderPath, 'utf-8');

      expect(loader).toContain("import('@xterm/xterm')");
      expect(loader).toContain("import('@xterm/addon-fit')");
    });

    it('should use dynamic imports for methodologies', () => {
      const loaderPath = path.resolve(__dirname, 'methodology-loader.ts');
      const loader = fs.readFileSync(loaderPath, 'utf-8');

      expect(loader).toContain("import('../../methodologies')");
    });

    it('should cache loaded modules', () => {
      const xtermLoader = fs.readFileSync(
        path.resolve(__dirname, 'xterm-loader.ts'),
        'utf-8'
      );
      const methodologyLoader = fs.readFileSync(
        path.resolve(__dirname, 'methodology-loader.ts'),
        'utf-8'
      );

      // Both should check for cached module before loading
      expect(xtermLoader).toContain('if (TerminalClass && FitAddonClass)');
      expect(methodologyLoader).toContain('if (methodologiesModule)');
    });
  });
});
