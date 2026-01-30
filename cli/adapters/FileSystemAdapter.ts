/**
 * FileSystemAdapter - Node.js fs implementation for CLI
 * Direct file system access without Electron IPC
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob as globLib } from 'glob';
import type { IFileSystem, FileInfo, LoadedContext } from '../../src/lib/interfaces';

export class FileSystemAdapter implements IFileSystem {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  async readDir(dirPath: string): Promise<FileInfo[]> {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(fullPath, entry.name),
      }));
    } catch {
      return [];
    }
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await this.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  async glob(pattern: string, options?: { cwd?: string }): Promise<string[]> {
    try {
      const cwd = options?.cwd || this.cwd;
      return await globLib(pattern, { cwd, absolute: true });
    } catch {
      return [];
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async loadContext(contextDir: string): Promise<LoadedContext> {
    const fullPath = path.isAbsolute(contextDir) ? contextDir : path.join(this.cwd, contextDir);

    const result: LoadedContext = {
      brand: null,
      audience: null,
      research: [],
      examples: [],
      competitors: [],
    };

    // Load brand.md
    const brandPath = path.join(fullPath, 'brand.md');
    result.brand = await this.readFile(brandPath);

    // Load audience.md
    const audiencePath = path.join(fullPath, 'audience.md');
    result.audience = await this.readFile(audiencePath);

    // Load research directory
    const researchFiles = await this.glob('research/*.md', { cwd: fullPath });
    for (const file of researchFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.research.push({ file: path.basename(file), content });
      }
    }

    // Load examples directory
    const exampleFiles = await this.glob('examples/*.md', { cwd: fullPath });
    for (const file of exampleFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.examples.push({ file: path.basename(file), content });
      }
    }

    // Load competitors directory
    const competitorFiles = await this.glob('competitors/*.md', { cwd: fullPath });
    for (const file of competitorFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.competitors.push({ file: path.basename(file), content });
      }
    }

    return result;
  }

  async readBrief(briefName: string): Promise<string | null> {
    // Try with and without .md extension
    const withExt = briefName.endsWith('.md') ? briefName : `${briefName}.md`;
    const briefPath = path.join(this.cwd, 'briefs', withExt);
    return this.readFile(briefPath);
  }

  async listBriefs(): Promise<string[]> {
    const briefsDir = path.join(this.cwd, 'briefs');
    const files = await this.glob('*.md', { cwd: briefsDir });
    return files.map((f) => path.basename(f, '.md'));
  }

  async ensureDir(dirPath: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }

  async appendFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await this.ensureDir(path.dirname(fullPath));
      await fs.appendFile(fullPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  async listDir(dirPath: string): Promise<string[]> {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
      return [];
    }
  }

  getCwd(): string {
    return this.cwd;
  }
}
