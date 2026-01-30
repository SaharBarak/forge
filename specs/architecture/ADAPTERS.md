# Adapter Interfaces

> Dependency injection for environment-specific operations

**Status**: Complete
**File**: `src/lib/interfaces/`

---

## Overview

Forge uses adapter interfaces to decouple core logic from environment-specific implementations. This allows the same SessionKernel to work in Electron, CLI, and potentially web environments.

---

## IAgentRunner

Interface for AI model calls.

```typescript
interface IAgentRunner {
  /**
   * Query the AI model for a response
   */
  query(params: QueryParams): Promise<QueryResult>;

  /**
   * Quick evaluation (should agent respond?)
   */
  evaluate(params: EvalParams): Promise<EvalResult>;
}

interface QueryParams {
  prompt: string;
  systemPrompt?: string;
  model?: 'haiku' | 'sonnet' | 'opus';
  maxTokens?: number;
  temperature?: number;
}

interface QueryResult {
  response: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface EvalParams {
  evalPrompt: string;
  maxTokens?: number;
}

interface EvalResult {
  shouldRespond: boolean;
  interestLevel: 'low' | 'medium' | 'high';
  reasoning?: string;
}
```

### Implementations

**CLIAgentRunner** (`cli/adapters/CLIAgentRunner.ts`):
```typescript
class CLIAgentRunner implements IAgentRunner {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const response = await this.client.messages.create({
      model: this.getModel(params.model),
      max_tokens: params.maxTokens || 4096,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.prompt }],
    });

    return {
      response: response.content[0].text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    // Quick evaluation with haiku
    const response = await this.query({
      prompt: params.evalPrompt,
      model: 'haiku',
      maxTokens: params.maxTokens || 100,
    });

    return this.parseEvaluation(response.response);
  }
}
```

**ElectronAgentRunner** (via IPC):
```typescript
class ElectronAgentRunner implements IAgentRunner {
  async query(params: QueryParams): Promise<QueryResult> {
    return window.electronAPI.claudeAgentQuery(params);
  }

  async evaluate(params: EvalParams): Promise<EvalResult> {
    return window.electronAPI.claudeAgentEvaluate(params);
  }
}
```

---

## IFileSystem

Interface for file system operations.

```typescript
interface IFileSystem {
  readDir(dirPath: string): Promise<FileInfo[]>;
  readFile(filePath: string): Promise<string | null>;
  writeFile(filePath: string, content: string): Promise<boolean>;
  appendFile(filePath: string, content: string): Promise<boolean>;
  glob(pattern: string, options?: { cwd?: string }): Promise<string[]>;
  exists(filePath: string): Promise<boolean>;
  ensureDir(dirPath: string): Promise<boolean>;
  listDir(dirPath: string): Promise<string[]>;  // Directory names only
  loadContext(contextDir: string): Promise<LoadedContext>;
  readBrief(briefName: string): Promise<string | null>;
  listBriefs(): Promise<string[]>;
}

interface FileInfo {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface LoadedContext {
  brand: string | null;
  audience: string | null;
  research: { file: string; content: string }[];
  examples: { file: string; content: string }[];
  competitors: { file: string; content: string }[];
}
```

### Implementations

**FileSystemAdapter** (`cli/adapters/FileSystemAdapter.ts`):
```typescript
class FileSystemAdapter implements IFileSystem {
  private cwd: string;

  constructor(cwd?: string) {
    this.cwd = cwd || process.cwd();
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.cwd, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    try {
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(this.cwd, filePath);
      await this.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf-8');
      return true;
    } catch {
      return false;
    }
  }

  async listDir(dirPath: string): Promise<string[]> {
    try {
      const fullPath = path.isAbsolute(dirPath)
        ? dirPath
        : path.join(this.cwd, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  // ... other methods
}
```

**ElectronFileSystem** (via IPC):
```typescript
class ElectronFileSystem implements IFileSystem {
  async readFile(filePath: string): Promise<string | null> {
    return window.electronAPI.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<boolean> {
    return window.electronAPI.writeFile(filePath, content);
  }

  // ... other methods delegate to electronAPI
}
```

---

## Usage in SessionKernel

```typescript
class SessionKernel {
  private agentRunner?: IAgentRunner;
  private fileSystem?: IFileSystem;

  constructor(options: KernelOptions) {
    this.agentRunner = options.agentRunner;
    this.fileSystem = options.fileSystem;
  }

  // Methods use adapters
  private async saveSession(): Promise<KernelResponse[]> {
    if (!this.fileSystem) {
      return [{ type: 'error', content: 'No file system configured' }];
    }

    await this.fileSystem.ensureDir(sessionDir);
    await this.fileSystem.writeFile(`${sessionDir}/session.json`, JSON.stringify(metadata));
    // ...
  }

  private async generatePersonas(): Promise<AgentPersona[]> {
    if (!this.agentRunner) {
      throw new Error('No agent runner configured');
    }

    const result = await this.agentRunner.query({
      prompt: personaPrompt,
      systemPrompt: 'You generate personas...',
      model: 'sonnet',
    });
    // ...
  }
}
```

---

## Adding New Environments

To support a new environment (e.g., web browser):

1. **Implement IAgentRunner**:
```typescript
class WebAgentRunner implements IAgentRunner {
  async query(params: QueryParams): Promise<QueryResult> {
    const response = await fetch('/api/claude', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return response.json();
  }
}
```

2. **Implement IFileSystem**:
```typescript
class WebFileSystem implements IFileSystem {
  async readFile(path: string): Promise<string | null> {
    // Use IndexedDB or API
    return localStorage.getItem(`file:${path}`);
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    localStorage.setItem(`file:${path}`, content);
    return true;
  }
}
```

3. **Create kernel with adapters**:
```typescript
const kernel = new SessionKernel({
  agentRunner: new WebAgentRunner(),
  fileSystem: new WebFileSystem(),
});
```

---

## Best Practices

1. **Always check adapter existence** before using
2. **Handle failures gracefully** - adapters may fail
3. **Don't leak implementation details** - keep interface generic
4. **Test adapters independently** - mock for unit tests
