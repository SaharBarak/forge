/**
 * IFileSystem - Interface for file system operations
 * Abstracts between Electron IPC and Node.js fs
 */

// Import and re-export canonical types from src/types/index.ts
// These were previously duplicated here - now centralized
import type { FileInfo, LoadedContext } from '../../types';
export type { FileInfo, LoadedContext };

/**
 * Interface for file system operations
 * Implementations:
 * - ElectronFileSystem: Uses window.electronAPI for Electron app
 * - NodeFileSystem: Uses Node.js fs module for CLI
 */
export interface IFileSystem {
  /**
   * Read directory contents
   */
  readDir(dirPath: string): Promise<FileInfo[]>;

  /**
   * Read file contents
   */
  readFile(filePath: string): Promise<string | null>;

  /**
   * Write file contents
   */
  writeFile(filePath: string, content: string): Promise<boolean>;

  /**
   * Find files matching a glob pattern
   */
  glob(pattern: string, options?: { cwd?: string }): Promise<string[]>;

  /**
   * Check if path exists
   */
  exists(filePath: string): Promise<boolean>;

  /**
   * Load context from a directory
   */
  loadContext(contextDir: string): Promise<LoadedContext>;

  /**
   * Read a brief by name
   */
  readBrief(briefName: string): Promise<string | null>;

  /**
   * List available briefs
   */
  listBriefs(): Promise<string[]>;

  /**
   * Ensure a directory exists (create if needed)
   */
  ensureDir(dirPath: string): Promise<boolean>;

  /**
   * Append to a file (for JSONL)
   */
  appendFile(filePath: string, content: string): Promise<boolean>;

  /**
   * List directory names (simple string array for directory enumeration)
   */
  listDir(dirPath: string): Promise<string[]>;
}
