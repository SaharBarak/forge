/**
 * SessionKernel Unit Tests
 *
 * Tests the unified core engine for all UIs:
 * - State machine transitions (idle → configuring → ready → running → paused)
 * - Command execution (22+ commands)
 * - Configuration wizard (5-step flow)
 * - Event emission (state_change, agent_message, etc.)
 * - Dependency injection (IAgentRunner, IFileSystem)
 *
 * Per SESSION_KERNEL.md spec: SessionKernel is the single source of truth.
 * All operations are expressed as commands returning typed responses.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SessionKernel } from './SessionKernel';
import type { KernelEvent } from './types';
import type { IAgentRunner, QueryResult, EvalResult } from '../interfaces/IAgentRunner';
import type { IFileSystem } from '../interfaces/IFileSystem';

// =============================================================================
// MOCK FACTORIES
// =============================================================================

function createMockAgentRunner(overrides: Partial<IAgentRunner> = {}): IAgentRunner {
  return {
    query: vi.fn().mockResolvedValue({
      success: true,
      content: 'Mock agent response',
    } as QueryResult),
    evaluate: vi.fn().mockResolvedValue({
      success: true,
      urgency: 'medium',
      reason: 'Test evaluation',
      responseType: 'argument',
    } as EvalResult),
    ...overrides,
  };
}

function createMockFileSystem(overrides: Partial<IFileSystem> = {}): IFileSystem {
  const mockFiles: Record<string, string> = {};
  const mockDirs: Record<string, string[]> = {};

  return {
    readDir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockImplementation(async (path: string) => mockFiles[path] || null),
    writeFile: vi.fn().mockImplementation(async (path: string, content: string) => {
      mockFiles[path] = content;
    }),
    appendFile: vi.fn().mockResolvedValue(undefined),
    glob: vi.fn().mockResolvedValue([]),
    exists: vi.fn().mockResolvedValue(false),
    ensureDir: vi.fn().mockResolvedValue(undefined),
    listDir: vi.fn().mockImplementation(async (path: string) => mockDirs[path] || []),
    loadContext: vi.fn().mockResolvedValue({}),
    readBrief: vi.fn().mockResolvedValue(''),
    listBriefs: vi.fn().mockResolvedValue([]),
    // Allow tests to manipulate mock data
    _setFile: (path: string, content: string) => { mockFiles[path] = content; },
    _setDir: (path: string, files: string[]) => { mockDirs[path] = files; },
    ...overrides,
  } as IFileSystem & { _setFile: Function; _setDir: Function };
}

// =============================================================================
// KERNEL STATE MACHINE
// =============================================================================

describe('SessionKernel', () => {
  let kernel: SessionKernel;
  let mockRunner: IAgentRunner;
  let mockFs: IFileSystem & { _setFile: Function; _setDir: Function };
  let capturedEvents: KernelEvent[];

  beforeEach(() => {
    mockRunner = createMockAgentRunner();
    mockFs = createMockFileSystem() as IFileSystem & { _setFile: Function; _setDir: Function };
    capturedEvents = [];

    kernel = new SessionKernel({
      agentRunner: mockRunner,
      fileSystem: mockFs,
      sessionsDir: 'test/sessions',
      outputDir: 'test/output',
      onEvent: (event) => capturedEvents.push(event),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      expect(kernel.getState()).toBe('idle');
    });

    it('has empty config initially', () => {
      const config = kernel.getConfig();
      expect(config).toEqual({});
    });

    it('has no session initially', () => {
      expect(kernel.getSession()).toBeNull();
    });

    it('has no orchestrator initially', () => {
      expect(kernel.getOrchestrator()).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('transitions idle → configuring on "new" command', async () => {
      await kernel.execute({ type: 'new' });
      expect(kernel.getState()).toBe('configuring');
    });

    it('emits state_change event on transition', async () => {
      await kernel.execute({ type: 'new' });

      const stateEvents = capturedEvents.filter(e => e.type === 'state_change');
      expect(stateEvents.length).toBe(1);
      expect(stateEvents[0].data).toEqual({ from: 'idle', to: 'configuring' });
    });

    it('transitions configuring → ready after completing config', async () => {
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test Project' }); // projectName
      await kernel.execute({ type: 'config_input', value: 'Test Goal' });    // goal
      await kernel.execute({ type: 'config_input', value: 'done' });         // agents
      await kernel.execute({ type: 'config_input', value: '1' });            // language
      await kernel.execute({ type: 'config_input', value: '1' });            // mode

      expect(kernel.getState()).toBe('ready');
    });

    it('transitions ready → running on "start" command', async () => {
      // Complete config first
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test Project' });
      await kernel.execute({ type: 'config_input', value: 'Test Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });

      await kernel.execute({ type: 'start' });
      expect(kernel.getState()).toBe('running');
    });

    it('transitions running → paused on "pause" command', async () => {
      // Setup running session
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'start' });

      await kernel.execute({ type: 'pause' });
      expect(kernel.getState()).toBe('paused');
    });

    it('transitions paused → running on "resume" command', async () => {
      // Setup paused session
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'start' });
      await kernel.execute({ type: 'pause' });

      await kernel.execute({ type: 'resume' });
      expect(kernel.getState()).toBe('running');
    });

    it('transitions running → idle on "stop" command', async () => {
      // Setup running session
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'start' });

      await kernel.execute({ type: 'stop' });
      expect(kernel.getState()).toBe('idle');
    });
  });

  // ===========================================================================
  // CONFIGURATION WIZARD
  // ===========================================================================

  describe('configuration wizard', () => {
    beforeEach(async () => {
      await kernel.execute({ type: 'new' });
    });

    it('returns config_step response with prompt', async () => {
      // Already in configuring state, check first step
      const responses = await kernel.execute({ type: 'new' });
      const configStep = responses.find(r => r.type === 'config_step');

      expect(configStep).toBeDefined();
      expect(configStep?.data).toHaveProperty('id', 'projectName');
      expect(configStep?.data).toHaveProperty('prompt');
    });

    it('step 1: accepts project name', async () => {
      const responses = await kernel.execute({ type: 'config_input', value: 'My Project' });

      expect(responses.some(r => r.type === 'success' && r.content.includes('My Project'))).toBe(true);
      expect(kernel.getConfig().projectName).toBe('My Project');
    });

    it('step 1: uses default name when empty', async () => {
      await kernel.execute({ type: 'config_input', value: '' });

      expect(kernel.getConfig().projectName).toBe('Untitled Project');
    });

    it('step 2: accepts goal', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project Name' });
      const responses = await kernel.execute({ type: 'config_input', value: 'Create amazing copy' });

      expect(responses.some(r => r.type === 'success' && r.content.includes('Create amazing copy'))).toBe(true);
      expect(kernel.getConfig().goal).toBe('Create amazing copy');
    });

    it('step 3: accepts "done" to use all agents', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      const responses = await kernel.execute({ type: 'config_input', value: 'done' });

      expect(responses.some(r => r.type === 'success')).toBe(true);
      expect(kernel.getConfig().agents).toBeDefined();
      expect(kernel.getConfig().agents!.length).toBeGreaterThan(0);
    });

    it('step 3: accepts "d" for defaults', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      const responses = await kernel.execute({ type: 'config_input', value: 'd' });

      expect(responses.some(r => r.type === 'success' && r.content.includes('default'))).toBe(true);
    });

    it('step 3: accepts agent number to toggle selection', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      const responses = await kernel.execute({ type: 'config_input', value: '1' });

      // Should show info about added/removed agent and show config step again
      expect(responses.some(r => r.type === 'info')).toBe(true);
      expect(responses.some(r => r.type === 'config_step')).toBe(true);
    });

    it('step 3: accepts "a" to select all', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      const responses = await kernel.execute({ type: 'config_input', value: 'a' });

      expect(responses.some(r => r.type === 'info' && r.content.includes('all'))).toBe(true);
    });

    it('step 3: accepts "n" to select none', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      const responses = await kernel.execute({ type: 'config_input', value: 'n' });

      expect(responses.some(r => r.type === 'info' && r.content.includes('Clear'))).toBe(true);
    });

    it('step 4: accepts language by number', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '2' }); // English

      expect(kernel.getConfig().language).toBe('english');
    });

    it('step 4: accepts language by name', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: 'mixed' });

      expect(kernel.getConfig().language).toBe('mixed');
    });

    it('step 4: defaults to hebrew', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '' });

      expect(kernel.getConfig().language).toBe('hebrew');
    });

    it('step 5: accepts mode by number', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' }); // First mode

      expect(kernel.getConfig().mode).toBeDefined();
      expect(kernel.getState()).toBe('ready');
    });

    it('completes configuration after all steps', async () => {
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      const responses = await kernel.execute({ type: 'config_input', value: '1' });

      expect(responses.some(r => r.type === 'success' && r.content.includes('complete'))).toBe(true);
      expect(responses.some(r => r.type === 'status')).toBe(true);
      expect(kernel.getState()).toBe('ready');
    });

    it('returns error when not in configuring state', async () => {
      // First complete configuration
      await kernel.execute({ type: 'config_input', value: 'Project' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });

      // Now in 'ready' state, config_input should fail
      const responses = await kernel.execute({ type: 'config_input', value: 'test' });
      expect(responses.some(r => r.type === 'error')).toBe(true);
    });
  });

  // ===========================================================================
  // COMMAND EXECUTION
  // ===========================================================================

  describe('commands', () => {
    describe('new', () => {
      it('initializes configuration wizard', async () => {
        const responses = await kernel.execute({ type: 'new' });

        expect(responses.length).toBeGreaterThan(0);
        expect(responses.some(r => r.type === 'info')).toBe(true);
        expect(responses.some(r => r.type === 'config_step')).toBe(true);
      });

      it('resets previous config', async () => {
        // Set some config
        kernel.setApiKey('test-key');
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'First Project' });

        // Start new config
        await kernel.execute({ type: 'new' });

        // Config should be reset (except apiKey which is preserved)
        const config = kernel.getConfig();
        expect(config.projectName).toBeUndefined();
      });
    });

    describe('start', () => {
      it('returns error when not configured', async () => {
        const responses = await kernel.execute({ type: 'start' });
        expect(responses.some(r => r.type === 'error')).toBe(true);
      });

      it('starts session when configured', async () => {
        // Complete config
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test' });
        await kernel.execute({ type: 'config_input', value: 'Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });

        const responses = await kernel.execute({ type: 'start' });

        expect(responses.some(r => r.type === 'success')).toBe(true);
        expect(kernel.getSession()).not.toBeNull();
        expect(kernel.getOrchestrator()).not.toBeNull();
      });
    });

    describe('stop', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'stop' });
        expect(responses.some(r => r.type === 'error')).toBe(true);
      });

      it('stops running session', async () => {
        // Setup running session
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test' });
        await kernel.execute({ type: 'config_input', value: 'Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'start' });

        const responses = await kernel.execute({ type: 'stop' });

        expect(responses.some(r => r.type === 'success')).toBe(true);
        expect(kernel.getSession()).toBeNull();
        expect(kernel.getOrchestrator()).toBeNull();
      });
    });

    describe('pause', () => {
      it('returns warning when no session running', async () => {
        const responses = await kernel.execute({ type: 'pause' });
        expect(responses.some(r => r.type === 'warning')).toBe(true);
      });

      it('pauses running session', async () => {
        // Setup running session
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test' });
        await kernel.execute({ type: 'config_input', value: 'Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'start' });

        const responses = await kernel.execute({ type: 'pause' });

        expect(responses.some(r => r.type === 'success')).toBe(true);
        expect(kernel.getState()).toBe('paused');
      });
    });

    describe('resume', () => {
      it('returns warning when not paused', async () => {
        const responses = await kernel.execute({ type: 'resume' });
        expect(responses.some(r => r.type === 'warning')).toBe(true);
      });

      it('resumes paused session', async () => {
        // Setup paused session
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test' });
        await kernel.execute({ type: 'config_input', value: 'Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'start' });
        await kernel.execute({ type: 'pause' });

        const responses = await kernel.execute({ type: 'resume' });

        expect(responses.some(r => r.type === 'success')).toBe(true);
        expect(kernel.getState()).toBe('running');
      });
    });

    describe('status', () => {
      it('returns status in any state', async () => {
        const responses = await kernel.execute({ type: 'status' });

        expect(responses.length).toBe(1);
        expect(responses[0].type).toBe('status');
        expect(responses[0].data).toHaveProperty('state', 'idle');
      });

      it('includes session info when running', async () => {
        // Setup running session
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test Project' });
        await kernel.execute({ type: 'config_input', value: 'Test Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'start' });

        const responses = await kernel.execute({ type: 'status' });
        const statusData = responses[0].data as any;

        expect(statusData.state).toBe('running');
        expect(statusData.project).toBe('Test Project');
        expect(statusData.goal).toBe('Test Goal');
      });
    });

    describe('memory', () => {
      it('returns memory stats', async () => {
        const responses = await kernel.execute({ type: 'memory' });

        expect(responses.length).toBeGreaterThan(0);
        expect(responses.some(r => r.content.includes('Summaries'))).toBe(true);
        expect(responses.some(r => r.content.includes('Decisions'))).toBe(true);
      });
    });

    describe('recall', () => {
      it('returns warning when no memory built', async () => {
        const responses = await kernel.execute({ type: 'recall' });

        expect(responses.some(r => r.type === 'warning' || r.content.includes('No memory'))).toBe(true);
      });
    });

    describe('agents', () => {
      it('returns list of agents', async () => {
        const responses = await kernel.execute({ type: 'agents' });

        expect(responses.length).toBe(1);
        expect(responses[0].type).toBe('list');
        expect(responses[0].data).toHaveProperty('items');
      });
    });

    describe('help', () => {
      it('returns help information', async () => {
        const responses = await kernel.execute({ type: 'help' });

        expect(responses.length).toBe(1);
        expect(responses[0].type).toBe('help');
        expect(responses[0].data).toHaveProperty('sections');
      });

      it('includes all command categories', async () => {
        const responses = await kernel.execute({ type: 'help' });
        const helpData = responses[0].data as any;

        expect(helpData.sections.length).toBeGreaterThan(0);
        expect(helpData.sections.some((s: any) => s.title === 'Setup')).toBe(true);
        expect(helpData.sections.some((s: any) => s.title === 'Session Management')).toBe(true);
      });
    });

    describe('token', () => {
      it('sets API key when provided', async () => {
        const responses = await kernel.execute({ type: 'token', key: 'test-api-key' });

        expect(responses.some(r => r.type === 'success')).toBe(true);
        expect(kernel.getConfig().apiKey).toBe('test-api-key');
      });

      it('shows partial key when set', async () => {
        kernel.setApiKey('sk-test-key-12345');
        const responses = await kernel.execute({ type: 'token' });

        expect(responses.some(r => r.content.includes('sk-test-ke'))).toBe(true);
      });

      it('shows warning when no key set', async () => {
        const responses = await kernel.execute({ type: 'token' });

        expect(responses.some(r => r.type === 'warning')).toBe(true);
      });
    });

    describe('sessions', () => {
      it('returns info when no sessions found', async () => {
        const responses = await kernel.execute({ type: 'sessions' });

        expect(responses.some(r => r.content.includes('No saved'))).toBe(true);
      });

      it('lists sessions when available', async () => {
        // Setup mock with sessions
        mockFs._setDir('test/sessions', ['2024-01-01-project']);
        mockFs._setFile('test/sessions/2024-01-01-project/session.json', JSON.stringify({
          id: 'test-id',
          projectName: 'Test Project',
          goal: 'Test Goal',
          startedAt: '2024-01-01T00:00:00Z',
        }));

        const responses = await kernel.execute({ type: 'sessions' });

        expect(responses.some(r => r.type === 'list')).toBe(true);
      });
    });

    describe('say', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'say', content: 'Hello' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });

      it('returns warning when paused', async () => {
        // Setup paused session
        await kernel.execute({ type: 'new' });
        await kernel.execute({ type: 'config_input', value: 'Test' });
        await kernel.execute({ type: 'config_input', value: 'Goal' });
        await kernel.execute({ type: 'config_input', value: 'done' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'config_input', value: '1' });
        await kernel.execute({ type: 'start' });
        await kernel.execute({ type: 'pause' });

        const responses = await kernel.execute({ type: 'say', content: 'Hello' });

        expect(responses.some(r => r.type === 'warning')).toBe(true);
      });
    });

    describe('synthesize', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'synthesize' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });
    });

    describe('consensus', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'consensus' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });
    });

    describe('draft', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'draft' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });
    });

    describe('mode_info', () => {
      it('returns error when no session running', async () => {
        const responses = await kernel.execute({ type: 'mode_info' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });
    });

    describe('export', () => {
      it('returns error when no session', async () => {
        const responses = await kernel.execute({ type: 'export' });

        expect(responses.some(r => r.type === 'error')).toBe(true);
      });
    });

    describe('unknown command', () => {
      it('returns error for unknown command type', async () => {
        const responses = await kernel.execute({ type: 'unknown' } as any);

        expect(responses.some(r => r.type === 'error')).toBe(true);
        expect(responses.some(r => r.content.includes('Unknown'))).toBe(true);
      });
    });
  });

  // ===========================================================================
  // EVENT SUBSCRIPTIONS
  // ===========================================================================

  describe('event subscriptions', () => {
    it('allows subscribing to events', () => {
      const events: KernelEvent[] = [];
      const unsubscribe = kernel.on((event) => events.push(event));

      expect(typeof unsubscribe).toBe('function');
    });

    it('calls callback on events', async () => {
      const events: KernelEvent[] = [];
      kernel.on((event) => events.push(event));

      await kernel.execute({ type: 'new' });

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'state_change')).toBe(true);
    });

    it('allows unsubscribing', async () => {
      const events: KernelEvent[] = [];
      const unsubscribe = kernel.on((event) => events.push(event));

      await kernel.execute({ type: 'new' });
      const countAfterFirst = events.length;

      unsubscribe();

      await kernel.execute({ type: 'config_input', value: 'Test' });

      // Count should not have increased significantly after unsubscribe
      // (only new events should not be captured)
      expect(events.length).toBe(countAfterFirst);
    });

    it('handles callback errors gracefully', async () => {
      kernel.on(() => {
        throw new Error('Callback error');
      });

      // Should not throw
      await expect(kernel.execute({ type: 'new' })).resolves.toBeDefined();
    });
  });

  // ===========================================================================
  // DEPENDENCY INJECTION
  // ===========================================================================

  describe('dependency injection', () => {
    it('accepts agentRunner via constructor', () => {
      const runner = createMockAgentRunner();
      const k = new SessionKernel({ agentRunner: runner });

      expect(k).toBeDefined();
    });

    it('accepts fileSystem via constructor', () => {
      const fs = createMockFileSystem();
      const k = new SessionKernel({ fileSystem: fs });

      expect(k).toBeDefined();
    });

    it('allows setting agentRunner after construction', () => {
      const k = new SessionKernel();
      const runner = createMockAgentRunner();

      k.setAgentRunner(runner);

      expect(k).toBeDefined();
    });

    it('allows setting fileSystem after construction', () => {
      const k = new SessionKernel();
      const fs = createMockFileSystem();

      k.setFileSystem(fs);

      expect(k).toBeDefined();
    });

    it('allows setting API key', () => {
      const k = new SessionKernel();
      k.setApiKey('test-key');

      expect(k.getConfig().apiKey).toBe('test-key');
    });
  });

  // ===========================================================================
  // SESSION PERSISTENCE
  // ===========================================================================

  describe('session persistence', () => {
    it('save returns error without fileSystem', async () => {
      const k = new SessionKernel();
      // Configure and start
      await k.execute({ type: 'new' });
      await k.execute({ type: 'config_input', value: 'Test' });
      await k.execute({ type: 'config_input', value: 'Goal' });
      await k.execute({ type: 'config_input', value: 'done' });
      await k.execute({ type: 'config_input', value: '1' });
      await k.execute({ type: 'config_input', value: '1' });
      await k.execute({ type: 'start' });

      const responses = await k.execute({ type: 'save' });

      expect(responses.some(r => r.type === 'error')).toBe(true);
    });

    it('save returns error without session', async () => {
      const responses = await kernel.execute({ type: 'save' });

      expect(responses.some(r => r.type === 'error')).toBe(true);
    });

    it('saves session successfully with fileSystem', async () => {
      // Configure and start
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'start' });

      const responses = await kernel.execute({ type: 'save' });

      expect(responses.some(r => r.type === 'success')).toBe(true);
      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('emits session_saved event on save', async () => {
      // Configure and start
      await kernel.execute({ type: 'new' });
      await kernel.execute({ type: 'config_input', value: 'Test' });
      await kernel.execute({ type: 'config_input', value: 'Goal' });
      await kernel.execute({ type: 'config_input', value: 'done' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'config_input', value: '1' });
      await kernel.execute({ type: 'start' });

      capturedEvents.length = 0;
      await kernel.execute({ type: 'save' });

      expect(capturedEvents.some(e => e.type === 'session_saved')).toBe(true);
    });

    it('load returns error without fileSystem', async () => {
      const k = new SessionKernel();
      const responses = await k.execute({ type: 'load', nameOrIndex: 'test' });

      expect(responses.some(r => r.type === 'error')).toBe(true);
    });

    it('load returns error when session not found', async () => {
      const responses = await kernel.execute({ type: 'load', nameOrIndex: 'nonexistent' });

      expect(responses.some(r => r.type === 'error')).toBe(true);
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles multiple rapid state changes', async () => {
      const stateChanges: string[] = [];
      kernel.on((event) => {
        if (event.type === 'state_change') {
          stateChanges.push((event.data as any).to);
        }
      });

      await kernel.execute({ type: 'new' });

      expect(stateChanges).toContain('configuring');
    });

    it('handles concurrent commands gracefully', async () => {
      // Start multiple commands concurrently
      const results = await Promise.all([
        kernel.execute({ type: 'status' }),
        kernel.execute({ type: 'agents' }),
        kernel.execute({ type: 'memory' }),
      ]);

      // All should return valid responses
      expect(results.every(r => r.length > 0)).toBe(true);
    });

    it('maintains state consistency across errors', async () => {
      const initialState = kernel.getState();

      // Try invalid operations
      await kernel.execute({ type: 'start' });
      await kernel.execute({ type: 'pause' });

      // State should still be valid
      expect(kernel.getState()).toBe(initialState);
    });
  });
});

// =============================================================================
// RESPONSE TYPE CHECKS
// =============================================================================

describe('KernelResponse types', () => {
  let kernel: SessionKernel;

  beforeEach(() => {
    kernel = new SessionKernel();
  });

  it('status response has correct structure', async () => {
    const responses = await kernel.execute({ type: 'status' });
    const status = responses.find(r => r.type === 'status');

    expect(status).toBeDefined();
    expect(status?.data).toHaveProperty('state');
  });

  it('help response has correct structure', async () => {
    const responses = await kernel.execute({ type: 'help' });
    const help = responses.find(r => r.type === 'help');

    expect(help).toBeDefined();
    expect(help?.data).toHaveProperty('sections');
    expect(Array.isArray((help?.data as any).sections)).toBe(true);
  });

  it('list response has correct structure', async () => {
    const responses = await kernel.execute({ type: 'agents' });
    const list = responses.find(r => r.type === 'list');

    expect(list).toBeDefined();
    expect(list?.data).toHaveProperty('title');
    expect(list?.data).toHaveProperty('items');
    expect(Array.isArray((list?.data as any).items)).toBe(true);
  });

  it('config_step response has correct structure', async () => {
    const responses = await kernel.execute({ type: 'new' });
    const configStep = responses.find(r => r.type === 'config_step');

    expect(configStep).toBeDefined();
    expect(configStep?.data).toHaveProperty('id');
    expect(configStep?.data).toHaveProperty('prompt');
  });

  it('error response has content', async () => {
    const responses = await kernel.execute({ type: 'stop' });
    const error = responses.find(r => r.type === 'error');

    expect(error).toBeDefined();
    expect(error?.content).toBeTruthy();
  });
});
