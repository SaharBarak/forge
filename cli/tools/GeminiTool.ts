/**
 * GeminiTool - Wrapper around @google/genai SDK for image and graph generation
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs/promises';
import * as path from 'path';

export class GeminiTool {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate an image from a text prompt using Gemini's multimodal output
   */
  async generateImage(prompt: string, outputPath: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    let description = '';
    let imageSaved = false;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          description += part.text;
        }
        if (part.inlineData?.data && !imageSaved) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, buffer);
          imageSaved = true;
        }
      }
    }

    if (!imageSaved) {
      throw new Error('Gemini did not return an image');
    }

    return `Image saved to ${outputPath}${description ? `\n${description}` : ''}`;
  }

  /**
   * Generate a chart/graph visualization from data using Gemini
   */
  async generateGraph(data: string, description: string, outputPath: string): Promise<string> {
    const prompt = `Create a clear, professional chart or graph visualization for the following data. ${description}\n\nData:\n${data}`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    let explanation = '';
    let imageSaved = false;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          explanation += part.text;
        }
        if (part.inlineData?.data && !imageSaved) {
          const buffer = Buffer.from(part.inlineData.data, 'base64');
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          await fs.writeFile(outputPath, buffer);
          imageSaved = true;
        }
      }
    }

    if (!imageSaved) {
      throw new Error('Gemini did not return a graph image');
    }

    return `Graph saved to ${outputPath}${explanation ? `\n${explanation}` : ''}`;
  }
}
