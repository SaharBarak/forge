/**
 * Tool call rendering — collapsible ANSI blocks for [TOOL: name] ... [/TOOL]
 * protocol used by Forge agents.
 *
 * Parses agent message content, extracts tool call blocks, and renders them
 * as framed sections with a status badge. Non-tool text renders normally.
 *
 * Inspired by claw-code's tool call visualization but adapted for Forge's
 * text-protocol approach (which is model-agnostic — Claude SDK tools are
 * hidden inside the message payload).
 */

import { forgeTheme, style } from './theme';

const TOOL_REGEX = /\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/g;

export interface ToolCallBlock {
  readonly kind: 'text' | 'tool';
  readonly text: string;
  readonly toolName?: string;
  readonly toolPrompt?: string;
}

/**
 * Split a message into text and tool-call segments in order.
 * Each segment is either plain text or a tool invocation block.
 */
export const parseToolCalls = (content: string): ReadonlyArray<ToolCallBlock> => {
  const blocks: ToolCallBlock[] = [];
  let lastIndex = 0;

  // Regex with /g needs fresh state per call.
  const re = new RegExp(TOOL_REGEX.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    // Emit plain text before the match.
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      if (text.length > 0) blocks.push({ kind: 'text', text });
    }
    blocks.push({
      kind: 'tool',
      text: match[0],
      toolName: match[1],
      toolPrompt: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  // Trailing text after the last match.
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex);
    if (text.length > 0) blocks.push({ kind: 'text', text });
  }

  return blocks;
};

/**
 * Render a single tool call block as an ANSI-styled collapsible-looking
 * section. The "collapsed" preview shows the first line of the prompt; the
 * full prompt follows below, indented.
 *
 *   ╭─ TOOL · graph-generation ──────────────────────────
 *   │ Generate a bar chart showing agent contributions:
 *   │ - Ronit: 12
 *   │ - Yossi: 8
 *   ╰─ pending
 */
export const renderToolCall = (
  toolName: string,
  toolPrompt: string,
  status: 'pending' | 'running' | 'done' | 'failed' = 'pending',
  resultSummary?: string
): string => {
  const border = forgeTheme.border.accent;
  const label = forgeTheme.text.emphasis;
  const headerWidth = 52;

  const title = `TOOL · ${toolName}`;
  const titleLen = title.length;
  const lineFill = Math.max(0, headerWidth - titleLen - 4);
  const header =
    style(border, `╭─ `) +
    style(`${forgeTheme.bold}${label}`, title) +
    style(border, ` ${'─'.repeat(lineFill)}`) +
    '\n';

  const promptLines = toolPrompt.split('\n');
  const body = promptLines
    .map((line) => style(border, '│ ') + style(forgeTheme.text.primary, line))
    .join('\n');

  const statusColor =
    status === 'done' ? forgeTheme.status.success
      : status === 'failed' ? forgeTheme.status.error
      : status === 'running' ? forgeTheme.status.info
      : forgeTheme.text.muted;

  const statusLabel = status.toUpperCase();
  const statusLine = resultSummary
    ? `${statusLabel} · ${resultSummary}`
    : statusLabel;

  const footer =
    '\n' +
    style(border, '╰─ ') +
    style(statusColor, statusLine) +
    '\n';

  return header + body + footer;
};

/**
 * Render an entire message: mix of plain text and tool call blocks.
 * Plain text is returned as-is (caller should pipe it through the
 * markdown renderer); tool blocks are rendered as framed sections.
 */
export const renderMessageWithToolCalls = (
  content: string,
  opts: {
    readonly renderText?: (text: string) => string;
    readonly toolStatus?: Readonly<Record<string, 'pending' | 'running' | 'done' | 'failed'>>;
    readonly toolResults?: Readonly<Record<string, string>>;
  } = {}
): string => {
  const { renderText = (s) => s, toolStatus = {}, toolResults = {} } = opts;
  const blocks = parseToolCalls(content);

  return blocks
    .map((block) => {
      if (block.kind === 'text') return renderText(block.text);
      const name = block.toolName ?? 'unknown';
      return renderToolCall(
        name,
        block.toolPrompt ?? '',
        toolStatus[name] ?? 'pending',
        toolResults[name]
      );
    })
    .join('');
};
