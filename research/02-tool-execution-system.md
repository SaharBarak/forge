# Forge — Tool Execution System (Custom [TOOL:] Protocol)

## The Key Question: Do Forge Agents Execute Tools?

**Yes — but through a custom text-based protocol, NOT the Claude SDK's native `tools` parameter.**

## Why This Is Non-Obvious

Every call to `@anthropic-ai/claude-agent-sdk`'s `query()` function and every `client.messages.create()` call in `src/lib/claude.ts` passes `tools: []` explicitly. A naive code scan concludes "no tools" — but that misses the actual protocol.

**The real tool protocol is a text convention:** agents embed `[TOOL: name] ... [/TOOL]` blocks in their message content, and `DashboardController` parses these blocks and dispatches them to `ToolRunner` after the message is received.

## The Protocol

### Agent Side (Claude generates)

```
I think we should visualize this with a bar chart.

[TOOL: graph-generation]
Generate a bar chart showing agent contributions:
- Ronit: 12
- Yossi: 8
- Noa: 15
- Avi: 10
- Michal: 7
[/TOOL]

This will help us see who's dominating the discussion.
```

### Dispatcher Side (DashboardController.ts:252-276)

```typescript
// Tool requests
if (this.toolRunner && this.toolRunner.getAvailableTools().length > 0) {
  const latest = allMessages[allMessages.length - 1];
  if (latest && latest.agentId !== 'system') {
    const toolMatch = latest.content.match(/\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/);
    if (toolMatch) {
      const toolName = toolMatch[1];
      const toolPrompt = toolMatch[2].trim();
      const outputDir = this.persistence.getSessionDir();
      this.toolRunner.runTool(
        toolName,
        { prompt: toolPrompt, description: toolPrompt },
        outputDir
      ).then((result) => {
        const toolMsg: Message = {
          id: uuid(),
          timestamp: new Date(),
          agentId: 'system',
          type: 'tool_result',
          content: result.success
            ? `Tool "${toolName}" completed: ${result.description}`
            : `Tool "${toolName}" failed: ${result.error}`,
          metadata: result.outputPath ? { outputPath: result.outputPath } : undefined,
        };
        this.state.messages.push(toolMsg);
        appendMessages(this.widgets.chatLog as any, this.state.messages);
        scheduleRender(this.screen);
      });
    }
  }
}
```

## ToolRunner Architecture

`cli/tools/ToolRunner.ts` is the tool registry and dispatcher.

### Current Tools

| Tool Name | Backend | Purpose |
|-----------|---------|---------|
| `image-generation` | Gemini (via GeminiTool) | Generate images from prompts |
| `graph-generation` | Gemini (via GeminiTool) | Generate charts/graphs from data |

### Registration Flow

```typescript
// cli/prompts/idle.ts:691-693
const toolRunner = new ToolRunner();
if (geminiKey) {
  toolRunner.enableGemini(geminiKey);
}
// Later passed to dashboard:
// cli/prompts/idle.ts:788
toolRunner, // passed into startDashboard(...)
```

`ToolRunner.getAvailableTools()` returns `[]` when no Gemini key is set — meaning the `[TOOL:]` protocol only activates when the user provides a Gemini API key. Without it, agents' `[TOOL:]` blocks are left in text form (the dispatcher never matches).

### Tool Execution

```typescript
async runTool(name: string, args: Record<string, string>, outputDir: string): Promise<ToolResult> {
  switch (name) {
    case 'image-generation':
      return this.tools.gemini.generateImage(prompt, outputPath);
    case 'graph-generation':
      return this.tools.gemini.generateGraph(data, description, outputPath);
    default:
      return { success: false, error: `Unknown tool: ${name}` };
  }
}
```

Outputs are written to the session directory (PNG files), and the path is returned in the `tool_result` message metadata.

## Why Not Claude SDK Tools?

Forge was designed before the Claude Agent SDK became the standard. The team chose the text-protocol approach because:

1. **Model-agnostic** — works with any LLM that can follow a text format, not just Claude
2. **Transparent in transcripts** — `[TOOL:]` blocks are visible in session history, not hidden inside tool_use blocks
3. **Async by default** — the dispatcher fires the tool call without blocking the agent's response
4. **Simple to extend** — adding a tool means adding a case in `ToolRunner.runTool()` + updating `getAvailableTools()`

## Message Types Include `tool_result`

From `cli/dashboard/theme.ts:94`:
```typescript
tool_result: '[TOOL]',
```

And from the message system, `type: 'tool_result'` is a valid message type that the dashboard renders with a `[TOOL]` badge, distinct from `research_result` (`[RES]`).

## Research as a Related Concept

Separate from `[TOOL:]`, the system has a **research** concept:

- **Researcher agents** (5 types): `@stats-finder`, `@competitor-analyst`, `@audience-insight`, `@copy-explorer`, `@local-context`
- Agents request research via `type: 'research_request'` messages
- Researcher agents produce `type: 'research_result'` messages
- Uses puppeteer for web scraping (actually implemented, not just text protocol)
- Halts the session while researching, then resumes

Research IS a form of tool execution — just with a different code path than `[TOOL:]`.

## Missing Tools (from the cli/tools/ directory in git history)

The only tools currently in ToolRunner are Gemini-backed image/graph generation. There is no:
- Bash execution tool
- File read/write tool
- Web search tool (research uses puppeteer directly, not via ToolRunner)
- Grep/glob tool
- Custom MCP tool registration

The architecture SUPPORTS adding these — just add a case to `ToolRunner.runTool()` and list in `getAvailableTools()`. No agent loop changes needed because the dispatch happens at the message-received level, not the SDK call level.

## Correction to Earlier Analysis

Earlier code analysis incorrectly concluded "Forge agents do NOT execute tools" based on `tools: []` in the SDK calls. This was wrong — the tools exist in a separate layer at the message-parse level. The custom `[TOOL:]` text protocol is the actual tool execution mechanism.
