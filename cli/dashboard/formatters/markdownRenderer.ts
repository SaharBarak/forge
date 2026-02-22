/**
 * Markdown → blessed tags converter
 * Converts common markdown patterns to blessed's inline tag format
 */

/**
 * Convert markdown text to blessed-compatible tagged string
 */
export function renderMarkdown(text: string): string {
  let result = text;

  // Code blocks (``` ... ```) → cyan on dark
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
    return `{cyan-fg}${code}{/cyan-fg}`;
  });

  // Inline code (`code`) → cyan
  result = result.replace(/`([^`]+)`/g, '{cyan-fg}$1{/cyan-fg}');

  // Bold (**text**) → bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '{bold}$1{/bold}');

  // Italic (*text*) — only single asterisks not already consumed by bold
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '{italic}$1{/italic}');

  // Headers (# Header) → bold yellow
  result = result.replace(/^(#{1,3})\s+(.+)$/gm, '{bold}{yellow-fg}$2{/yellow-fg}{/bold}');

  // Bullet points (- item) → bullet character
  result = result.replace(/^[-*]\s+/gm, '  \u2022 ');

  // Numbered lists (1. item) — keep as is but indent
  result = result.replace(/^(\d+)\.\s+/gm, '  $1. ');

  // Links [text](url) → underline
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '{underline}$1{/underline}');

  // Horizontal rule (---) → line
  result = result.replace(/^-{3,}$/gm, '\u2500'.repeat(40));

  return result;
}
