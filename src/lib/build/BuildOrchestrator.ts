/**
 * BuildOrchestrator — Manages parallel website builds + dev server lifecycle
 *
 * Separate from EDAOrchestrator: copy agents *deliberate* (turn-based),
 * build agents *execute independently* (parallel, file generation).
 */

import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BUILD_PERSONAS, getBuildPersonaById, getBuildPersonaByName } from '../../agents/build-personas';
import type { BuildResult, BuildEvent, BuildCallback, BuildAgentPersona } from '../../types/build';
import { buildSite } from '../../../cli/adapters/BuildAgentRunner';

export class BuildOrchestrator {
  private results: Map<string, BuildResult> = new Map();
  private devServers: Map<string, ChildProcess> = new Map();
  private callbacks: BuildCallback[] = [];
  private sessionDir: string;
  private draftCopy: string;
  private projectName: string;

  constructor(sessionDir: string, draftCopy: string, projectName: string) {
    this.sessionDir = sessionDir;
    this.draftCopy = draftCopy;
    this.projectName = projectName;

    // Initialize results for each persona
    for (const persona of BUILD_PERSONAS) {
      this.results.set(persona.id, {
        agentId: persona.id,
        siteDir: path.join(sessionDir, 'builds', persona.id),
        port: persona.port,
        status: 'pending',
      });
    }
  }

  /**
   * Subscribe to build events
   */
  on(callback: BuildCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  private emit(event: BuildEvent): void {
    for (const cb of this.callbacks) {
      try { cb(event); } catch { /* ignore listener errors */ }
    }
  }

  /**
   * Create build directories and launch all 3 agents in parallel
   */
  async startBuilds(): Promise<void> {
    const buildsDir = path.join(this.sessionDir, 'builds');
    fs.mkdirSync(buildsDir, { recursive: true });

    this.emit({ type: 'build_started', data: { agents: BUILD_PERSONAS.map((p) => p.id) } });

    const buildPromises = BUILD_PERSONAS.map(async (persona) => {
      const result = this.results.get(persona.id)!;
      result.status = 'building';
      result.startedAt = new Date();

      // Create agent directory
      fs.mkdirSync(result.siteDir, { recursive: true });

      this.emit({
        type: 'build_progress',
        data: { agentId: persona.id, message: `${persona.name} starting build...` },
      });

      const buildResult = await buildSite(
        persona,
        this.draftCopy,
        this.projectName,
        result.siteDir,
        (agentId, message) => {
          this.emit({ type: 'build_progress', data: { agentId, message } });
        },
      );

      result.completedAt = new Date();

      if (buildResult.success) {
        this.emit({ type: 'build_complete', data: { agentId: persona.id } });
      } else {
        result.status = 'error';
        result.error = buildResult.error;
        this.emit({ type: 'build_error', data: { agentId: persona.id, error: buildResult.error } });
      }

      return { persona, buildResult };
    });

    // Wait for all builds (don't fail-fast — let each finish independently)
    const settled = await Promise.allSettled(buildPromises);

    // After all builds done, start dev servers for successful ones
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value.buildResult.success) {
        const buildResult = this.results.get(result.value.persona.id)!;
        buildResult.status = 'running';
      }
    }
  }

  /**
   * Start dev servers for all successfully built projects
   */
  async startDevServers(): Promise<void> {
    const serverPromises: Promise<void>[] = [];

    for (const persona of BUILD_PERSONAS) {
      const result = this.results.get(persona.id)!;
      if (result.status !== 'running' && result.status !== 'building') continue;

      // Find the actual SvelteKit project directory (might be nested)
      const projectDir = this.findProjectDir(result.siteDir);
      if (!projectDir) {
        result.status = 'error';
        result.error = 'No package.json found in build output';
        this.emit({ type: 'build_error', data: { agentId: persona.id, error: result.error } });
        continue;
      }

      serverPromises.push(this.startDevServer(persona, projectDir));
    }

    await Promise.allSettled(serverPromises);

    // Check if any servers are running
    const running = [...this.results.values()].filter((r) => r.status === 'running');
    if (running.length > 0) {
      this.emit({ type: 'all_servers_ready', data: { urls: this.getUrls() } });
    }
  }

  /**
   * Find the directory containing package.json (may be nested one level)
   */
  private findProjectDir(baseDir: string): string | null {
    if (fs.existsSync(path.join(baseDir, 'package.json'))) {
      return baseDir;
    }
    // Check one level deep
    try {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const nested = path.join(baseDir, entry.name);
          if (fs.existsSync(path.join(nested, 'package.json'))) {
            return nested;
          }
        }
      }
    } catch { /* ignore */ }
    return null;
  }

  /**
   * Start a single dev server
   */
  private startDevServer(persona: BuildAgentPersona, projectDir: string): Promise<void> {
    return new Promise((resolve) => {
      const result = this.results.get(persona.id)!;

      const child = spawn('npm', ['run', 'dev', '--', '--port', String(persona.port)], {
        cwd: projectDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      this.devServers.set(persona.id, child);
      result.devServerPid = child.pid;

      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Even if we don't see the ready message, the server might still be starting
          result.status = 'running';
          this.emit({
            type: 'server_started',
            data: { agentId: persona.id, port: persona.port, url: `http://localhost:${persona.port}` },
          });
          resolve();
        }
      }, 30000);

      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!resolved && (output.includes('localhost:') || output.includes('Local:'))) {
          resolved = true;
          clearTimeout(timeout);
          result.status = 'running';
          this.emit({
            type: 'server_started',
            data: { agentId: persona.id, port: persona.port, url: `http://localhost:${persona.port}` },
          });
          resolve();
        }
      });

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          result.status = 'error';
          result.error = `Dev server failed: ${err.message}`;
          this.emit({ type: 'build_error', data: { agentId: persona.id, error: result.error } });
          resolve();
        }
      });

      child.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (code !== 0) {
            result.status = 'error';
            result.error = `Dev server exited with code ${code}`;
            this.emit({ type: 'build_error', data: { agentId: persona.id, error: result.error } });
          }
          resolve();
        }
      });
    });
  }

  /**
   * Stop all dev servers
   */
  async stopDevServers(): Promise<void> {
    for (const [agentId, child] of this.devServers) {
      try {
        child.kill('SIGTERM');
        // Give it a moment to shut down gracefully
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (!child.killed) {
          child.kill('SIGKILL');
        }
      } catch { /* already dead */ }
      this.devServers.delete(agentId);
    }
  }

  /**
   * Pick a winner — stop other dev servers, keep winner running
   */
  async pickWinner(nameOrId: string): Promise<{ success: boolean; agentId?: string; error?: string }> {
    const persona = getBuildPersonaById(nameOrId) || getBuildPersonaByName(nameOrId);
    if (!persona) {
      return { success: false, error: `Unknown agent: ${nameOrId}. Use: mika, dani, or shai` };
    }

    const result = this.results.get(persona.id);
    if (!result || result.status !== 'running') {
      return { success: false, error: `${persona.name}'s site is not running` };
    }

    // Stop other servers
    for (const [agentId, child] of this.devServers) {
      if (agentId !== persona.id) {
        try { child.kill('SIGTERM'); } catch { /* ok */ }
        this.devServers.delete(agentId);
      }
    }

    this.emit({ type: 'user_pick', data: { agentId: persona.id, name: persona.name } });
    return { success: true, agentId: persona.id };
  }

  /**
   * Request changes to a specific agent's build — re-runs the build with feedback
   */
  async requestChanges(
    nameOrId: string,
    feedback: string,
  ): Promise<{ success: boolean; error?: string }> {
    const persona = getBuildPersonaById(nameOrId) || getBuildPersonaByName(nameOrId);
    if (!persona) {
      return { success: false, error: `Unknown agent: ${nameOrId}. Use: mika, dani, or shai` };
    }

    const result = this.results.get(persona.id)!;

    // Stop existing dev server for this agent
    const existingServer = this.devServers.get(persona.id);
    if (existingServer) {
      try { existingServer.kill('SIGTERM'); } catch { /* ok */ }
      this.devServers.delete(persona.id);
    }

    result.status = 'building';
    this.emit({
      type: 'build_progress',
      data: { agentId: persona.id, message: `${persona.name} rebuilding with feedback...` },
    });

    const feedbackCopy = `${this.draftCopy}\n\n## REVISION FEEDBACK\nThe user reviewed your previous build and wants these changes:\n${feedback}\n\nPlease update the existing SvelteKit project in this directory to address the feedback.`;

    const buildResult = await buildSite(
      persona,
      feedbackCopy,
      this.projectName,
      result.siteDir,
      (agentId, message) => {
        this.emit({ type: 'build_progress', data: { agentId, message } });
      },
    );

    if (buildResult.success) {
      result.status = 'running';
      result.completedAt = new Date();
      this.emit({ type: 'build_complete', data: { agentId: persona.id } });

      // Restart dev server
      const projectDir = this.findProjectDir(result.siteDir);
      if (projectDir) {
        await this.startDevServer(persona, projectDir);
      }
    } else {
      result.status = 'error';
      result.error = buildResult.error;
      this.emit({ type: 'build_error', data: { agentId: persona.id, error: buildResult.error } });
    }

    return { success: buildResult.success, error: buildResult.error };
  }

  /**
   * Get URLs for all running dev servers
   */
  getUrls(): { agentId: string; name: string; url: string; port: number }[] {
    return BUILD_PERSONAS
      .filter((p) => {
        const r = this.results.get(p.id);
        return r && r.status === 'running';
      })
      .map((p) => ({
        agentId: p.id,
        name: p.name,
        url: `http://localhost:${p.port}`,
        port: p.port,
      }));
  }

  /**
   * Get all build results
   */
  getResults(): Map<string, BuildResult> {
    return this.results;
  }
}
