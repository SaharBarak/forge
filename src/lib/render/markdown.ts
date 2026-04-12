/**
 * Markdown → ANSI renderer for terminal panes.
 *
 * Uses `marked`'s Lexer to tokenize markdown, then walks the token tree
 * and produces ANSI-styled output. No Node-only deps — bundles cleanly in
 * Vite for Electron's renderer process.
 *
 * Features:
 *   - Headings (H1-H3 with distinct styles)
 *   - Bold, italic, strikethrough, inline code
 *   - Fenced code blocks with box borders (╭─ lang / ╰─)
 *   - Blockquotes with │ prefix
 *   - Ordered and unordered lists with nesting
 *   - Horizontal rules
 *   - Links (text shown, URL dimmed)
 *
 * Also exports a StreamRenderer for incremental rendering during LLM
 * streaming — buffers until code fences close, then renders.
 */

import { type Token, type Tokens, Lexer } from 'marked';
import { forgeTheme, style } from './theme';

const { bold, dim, italic, strikethrough: strikeStyle } = forgeTheme;

// ---- token walker (pure, recursive) ----

const renderToken = (token: Token, depth: number): string => {
  switch (token.type) {
    case 'heading':
      return renderHeading(token as Tokens.Heading);
    case 'paragraph':
      return renderInline((token as Tokens.Paragraph).tokens ?? []) + '\n\n';
    case 'code':
      return renderCodeBlock(token as Tokens.Code);
    case 'blockquote':
      return renderBlockquote(token as Tokens.Blockquote);
    case 'list':
      return renderList(token as Tokens.List, depth);
    case 'hr':
      return style(forgeTheme.border.muted, '─'.repeat(40)) + '\n\n';
    case 'space':
      return '\n';
    case 'html':
      return (token as Tokens.HTML).text;
    default:
      if ('text' in token && typeof (token as { text: unknown }).text === 'string') {
        return (token as { text: string }).text + '\n';
      }
      return '';
  }
};

const renderHeading = (token: Tokens.Heading): string => {
  const themes: Record<number, string> = {
    1: forgeTheme.heading.h1,
    2: forgeTheme.heading.h2,
    3: forgeTheme.heading.h3,
  };
  const themeStr = themes[token.depth] ?? forgeTheme.heading.h3;
  const prefix = '#'.repeat(token.depth) + ' ';
  const text = renderInline(token.tokens ?? []);
  return style(themeStr, `${prefix}${text}`) + '\n\n';
};

const renderCodeBlock = (token: Tokens.Code): string => {
  const lang = token.lang || '';
  const border = forgeTheme.border.accent;
  const top = style(border, `╭─${lang ? ` ${lang} ` : '─'}${'─'.repeat(Math.max(0, 36 - lang.length))}`) + '\n';
  const lines = token.text
    .split('\n')
    .map((line: string) => style(border, '│') + ' ' + style(forgeTheme.text.inlineCode, line))
    .join('\n');
  const bottom = '\n' + style(border, `╰${'─'.repeat(40)}`) + '\n\n';
  return top + lines + bottom;
};

const renderBlockquote = (token: Tokens.Blockquote): string => {
  const inner = (token.tokens ?? []).map((t: Token) => renderToken(t, 0)).join('');
  return inner
    .split('\n')
    .map((line: string) => style(forgeTheme.quote, '│ ') + style(forgeTheme.quote, line))
    .join('\n') + '\n';
};

const renderList = (token: Tokens.List, depth: number): string => {
  const indent = '  '.repeat(depth);
  return token.items
    .map((item: Tokens.ListItem, i: number) => {
      const marker = token.ordered
        ? style(forgeTheme.status.info, `${i + 1}.`)
        : style(forgeTheme.status.info, '•');
      const body = (item.tokens ?? [])
        .map((t: Token) => renderToken(t, depth + 1))
        .join('')
        .replace(/\n\n$/, '\n');
      return `${indent}${marker} ${body}`;
    })
    .join('') + '\n';
};

// ---- inline rendering ----

const renderInline = (tokens: Token[]): string =>
  tokens.map(renderInlineToken).join('');

const renderInlineToken = (token: Token): string => {
  switch (token.type) {
    case 'text':
      return (token as Tokens.Text).text;
    case 'strong':
      return style(`${bold}${forgeTheme.text.strong}`, renderInline((token as Tokens.Strong).tokens ?? []));
    case 'em':
      return style(`${italic}${forgeTheme.text.emphasis}`, renderInline((token as Tokens.Em).tokens ?? []));
    case 'del':
      return style(strikeStyle, renderInline((token as Tokens.Del).tokens ?? []));
    case 'codespan':
      return style(forgeTheme.text.inlineCode, (token as Tokens.Codespan).text);
    case 'link': {
      const link = token as Tokens.Link;
      const text = renderInline(link.tokens ?? []);
      return style(forgeTheme.text.link, text) + style(dim, ` (${link.href})`);
    }
    case 'br':
      return '\n';
    case 'escape':
      return (token as Tokens.Escape).text;
    default:
      if ('text' in token && typeof (token as { text: unknown }).text === 'string') {
        return (token as { text: string }).text;
      }
      return '';
  }
};

// ---- public API ----

/**
 * Render a complete markdown string to ANSI.
 */
export const renderMarkdown = (markdown: string, _width?: number): string => {
  const tokens = Lexer.lex(markdown);
  return tokens.map((t: Token) => renderToken(t, 0)).join('');
};

// ---- streaming renderer ----

export interface StreamRenderer {
  readonly push: (delta: string) => string;
  readonly finish: (finalDelta?: string) => string;
  readonly reset: () => void;
}

/**
 * Incremental streaming renderer. Buffers chunks until a safe boundary
 * (closed code fence or blank line outside a fence), then renders the
 * completed fragment. Prose appears immediately; code blocks pop in fully
 * formatted once the closing ``` arrives.
 */
export const createStreamRenderer = (_width?: number): StreamRenderer => {
  let buffer = '';
  let inFence = false;

  const findSafeBoundary = (text: string): number => {
    let fence = inFence;
    let lastSafe = -1;
    const lines = text.split('\n');
    let pos = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pos += line.length + 1;

      if (/^```/.test(line)) {
        fence = !fence;
      }

      if (!fence && (line.trim() === '' || i === lines.length - 1)) {
        lastSafe = pos;
      }
    }

    inFence = fence;
    return lastSafe;
  };

  const push = (delta: string): string => {
    buffer += delta;
    const boundary = findSafeBoundary(buffer);
    if (boundary <= 0) return '';

    const ready = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary);
    return renderMarkdown(ready);
  };

  const finish = (finalDelta?: string): string => {
    if (finalDelta) buffer += finalDelta;
    const out = buffer.length > 0 ? renderMarkdown(buffer) : '';
    buffer = '';
    inFence = false;
    return out;
  };

  const reset = (): void => {
    buffer = '';
    inFence = false;
  };

  return { push, finish, reset };
};
