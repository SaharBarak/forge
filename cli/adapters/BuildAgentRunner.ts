/**
 * BuildAgentRunner — Uses Claude Agent SDK with full tool access to build SvelteKit sites
 *
 * Each build agent gets its own working directory, full Bash/Write/Edit/Read tools,
 * and 30 turns to scaffold a complete SvelteKit + Tailwind project from copy.
 */

import { query as claudeQuery } from '@anthropic-ai/claude-agent-sdk';
import * as os from 'os';
import * as path from 'path';
import type { BuildAgentPersona } from '../../src/types/build';

const CLAUDE_CODE_PATH = path.join(os.homedir(), '.local', 'bin', 'claude');

export type BuildProgressCallback = (agentId: string, message: string) => void;

/**
 * Generate the system prompt for a build agent
 */
function generateBuildSystemPrompt(
  persona: BuildAgentPersona,
  draftCopy: string,
  projectName: string,
): string {
  return `You are ${persona.name}, an expert front-end engineer and designer.

## YOUR DESIGN IDENTITY
- **Philosophy**: ${persona.designPhilosophy}
- **Color Palette**: ${persona.colorPreference}
- **Layout Style**: ${persona.layoutStyle}
- **Typography**: ${persona.typographyApproach}
- **Animation Level**: ${persona.animationLevel}
- **Specialties**: ${persona.specialties.join(', ')}

## YOUR TASK
Build a complete SvelteKit landing page for **${projectName}** using the copy below.
You MUST use the copy VERBATIM — do not rewrite, paraphrase, or change any wording.
Your creative freedom is in layout, colors, typography, spacing, and animations ONLY.

## TECHNICAL REQUIREMENTS
1. Create a new SvelteKit project: \`npx sv create ${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')} --template minimal --types ts --no-add-ons --no-install\`
2. Install dependencies: \`cd <project-dir> && npm install\`
3. Install Tailwind CSS v4: \`npx sv add tailwindcss --no-install && npm install\`
4. Build a single landing page in \`src/routes/+page.svelte\`
5. Each copy section becomes a distinct visual section on the page
6. Make it fully responsive (mobile-first)
7. Add a shared layout in \`src/routes/+layout.svelte\` with Google Fonts if needed
8. DO NOT start a dev server — that's handled externally

## COPY TO USE (VERBATIM)

${draftCopy}

## SECTION MAPPING
Parse the copy above. Each ## heading = one page section.
Create distinct visual treatments per section following your design philosophy.

## QUALITY CHECKLIST
- [ ] All copy text appears verbatim on the page
- [ ] Responsive on mobile, tablet, desktop
- [ ] Consistent with your design philosophy
- [ ] Tailwind CSS classes used throughout
- [ ] No broken imports or missing files
- [ ] Page loads without errors

Build the site now. Work methodically: scaffold → install → layout → page → verify.`;
}

/**
 * Build a SvelteKit site using Claude Agent SDK with full tool access
 */
export async function buildSite(
  persona: BuildAgentPersona,
  draftCopy: string,
  projectName: string,
  outputDir: string,
  onProgress?: BuildProgressCallback,
): Promise<{ success: boolean; error?: string }> {
  const systemPrompt = generateBuildSystemPrompt(persona, draftCopy, projectName);
  const buildPrompt = `Build the SvelteKit landing page now. Your working directory is: ${outputDir}\n\nCreate the project inside this directory. Follow all instructions from your system prompt.`;

  try {
    const q = claudeQuery({
      prompt: buildPrompt,
      options: {
        systemPrompt,
        model: 'claude-sonnet-4-20250514',
        tools: { type: 'preset', preset: 'claude_code' },
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        persistSession: false,
        maxTurns: 30,
        cwd: outputDir,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
        stderr: () => {},
      },
    });

    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text' && onProgress) {
            // Extract a short progress line from the assistant's text
            const lines = block.text.split('\n').filter((l: string) => l.trim());
            const summary = lines[0]?.slice(0, 120) || 'Working...';
            onProgress(persona.id, summary);
          }
        }
      }
      if (message.type === 'result') {
        onProgress?.(persona.id, 'Build complete');
      }
    }

    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown build error';
    onProgress?.(persona.id, `Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
