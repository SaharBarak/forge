/**
 * ToolRunner - Manages available tools and dispatches tool calls during sessions
 */

import * as path from 'path';
import { GeminiTool } from './GeminiTool';

export interface ToolResult {
  success: boolean;
  outputPath?: string;
  description?: string;
  error?: string;
}

interface SessionTools {
  gemini?: GeminiTool;
}

export class ToolRunner {
  private tools: SessionTools = {};
  private counter = 0;

  enableGemini(apiKey: string): void {
    this.tools.gemini = new GeminiTool(apiKey);
  }

  getAvailableTools(): string[] {
    const available: string[] = [];
    if (this.tools.gemini) {
      available.push('image-generation', 'graph-generation');
    }
    return available;
  }

  async runTool(name: string, args: Record<string, string>, outputDir: string): Promise<ToolResult> {
    this.counter++;
    const timestamp = Date.now();

    try {
      switch (name) {
        case 'image-generation': {
          if (!this.tools.gemini) return { success: false, error: 'Gemini not configured' };
          const outputPath = path.join(outputDir, `image-${timestamp}-${this.counter}.png`);
          const description = await this.tools.gemini.generateImage(
            args.prompt || args.description || 'Generate an image',
            outputPath
          );
          return { success: true, outputPath, description };
        }

        case 'graph-generation': {
          if (!this.tools.gemini) return { success: false, error: 'Gemini not configured' };
          const outputPath = path.join(outputDir, `graph-${timestamp}-${this.counter}.png`);
          const description = await this.tools.gemini.generateGraph(
            args.data || '',
            args.description || 'Generate a chart',
            outputPath
          );
          return { success: true, outputPath, description };
        }

        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
