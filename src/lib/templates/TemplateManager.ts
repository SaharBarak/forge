/**
 * TemplateManager - CRUD operations for session templates
 * 
 * Templates are stored in:
 * - Built-in: bundled with the app (read-only)
 * - Custom: ~/.forge/templates/ (user-created)
 */

import type { SessionTemplate, TemplateInfo } from '../../types';
import type { IFileSystem } from '../interfaces';
import { BUILT_IN_TEMPLATES } from './builtInTemplates';

const TEMPLATES_DIR = '.forge/templates';
const TEMPLATE_VERSION = 1;

export class TemplateManager {
  private fileSystem?: IFileSystem;
  private customTemplates: Map<string, SessionTemplate> = new Map();
  private homeDir: string;
  private initialized = false;

  constructor(fileSystem?: IFileSystem, homeDir?: string) {
    this.fileSystem = fileSystem;
    this.homeDir = homeDir || process.env.HOME || '~';
  }

  /**
   * Initialize the template manager - load custom templates from disk
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (this.fileSystem) {
      await this.loadCustomTemplates();
    }
    
    this.initialized = true;
  }

  /**
   * Get the templates directory path
   */
  getTemplatesDir(): string {
    return `${this.homeDir}/${TEMPLATES_DIR}`;
  }

  // ===========================================================================
  // READ OPERATIONS
  // ===========================================================================

  /**
   * List all available templates (built-in + custom)
   */
  listTemplates(): TemplateInfo[] {
    const templates: TemplateInfo[] = [];

    // Built-in templates
    for (const template of BUILT_IN_TEMPLATES) {
      templates.push({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        builtIn: true,
      });
    }

    // Custom templates
    for (const template of this.customTemplates.values()) {
      templates.push({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        builtIn: false,
      });
    }

    return templates;
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): SessionTemplate | null {
    // Check built-in first
    const builtIn = BUILT_IN_TEMPLATES.find(t => t.id === id);
    if (builtIn) {
      return { ...builtIn };
    }

    // Check custom
    const custom = this.customTemplates.get(id);
    if (custom) {
      return { ...custom };
    }

    return null;
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): TemplateInfo[] {
    return this.listTemplates().filter(t => t.category === category);
  }

  /**
   * Check if a template exists
   */
  hasTemplate(id: string): boolean {
    return (
      BUILT_IN_TEMPLATES.some(t => t.id === id) ||
      this.customTemplates.has(id)
    );
  }

  // ===========================================================================
  // WRITE OPERATIONS
  // ===========================================================================

  /**
   * Create a new custom template
   */
  async createTemplate(template: Omit<SessionTemplate, 'id' | 'version' | 'builtIn' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    const id = this.generateTemplateId(template.name);
    
    // Check for duplicate
    if (this.hasTemplate(id)) {
      throw new Error(`Template with id "${id}" already exists`);
    }

    const now = new Date().toISOString();
    const newTemplate: SessionTemplate = {
      ...template,
      id,
      version: TEMPLATE_VERSION,
      builtIn: false,
      createdAt: now,
      updatedAt: now,
    };

    // Validate
    this.validateTemplate(newTemplate);

    // Save to memory
    this.customTemplates.set(id, newTemplate);

    // Persist to disk
    await this.saveTemplateToDisk(newTemplate);

    return newTemplate;
  }

  /**
   * Update an existing custom template
   */
  async updateTemplate(id: string, updates: Partial<SessionTemplate>): Promise<SessionTemplate> {
    const existing = this.customTemplates.get(id);
    
    if (!existing) {
      // Check if it's a built-in template
      if (BUILT_IN_TEMPLATES.some(t => t.id === id)) {
        throw new Error('Cannot modify built-in templates. Duplicate first.');
      }
      throw new Error(`Template "${id}" not found`);
    }

    const updatedTemplate: SessionTemplate = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      builtIn: false, // Prevent marking as built-in
      version: existing.version,
      updatedAt: new Date().toISOString(),
    };

    // Validate
    this.validateTemplate(updatedTemplate);

    // Save to memory
    this.customTemplates.set(id, updatedTemplate);

    // Persist to disk
    await this.saveTemplateToDisk(updatedTemplate);

    return updatedTemplate;
  }

  /**
   * Delete a custom template
   */
  async deleteTemplate(id: string): Promise<boolean> {
    if (BUILT_IN_TEMPLATES.some(t => t.id === id)) {
      throw new Error('Cannot delete built-in templates');
    }

    if (!this.customTemplates.has(id)) {
      return false;
    }

    this.customTemplates.delete(id);
    
    // Remove from disk
    if (this.fileSystem) {
      const path = `${this.getTemplatesDir()}/${id}.json`;
      try {
        // Note: IFileSystem may not have delete - handle gracefully
        await this.fileSystem.writeFile(path, ''); // Overwrite with empty
      } catch {
        // Ignore deletion errors
      }
    }

    return true;
  }

  /**
   * Duplicate a template (works for both built-in and custom)
   */
  async duplicateTemplate(id: string, newName?: string): Promise<SessionTemplate> {
    const original = this.getTemplate(id);
    
    if (!original) {
      throw new Error(`Template "${id}" not found`);
    }

    const name = newName || `${original.name} (Copy)`;
    
    return this.createTemplate({
      name,
      description: original.description,
      category: 'custom', // Duplicates become custom
      mode: original.mode,
      methodology: original.methodology,
      consensusMethod: original.consensusMethod,
      defaultAgents: original.defaultAgents ? [...original.defaultAgents] : [],
      prompts: original.prompts ? {
        goal: original.prompts.goal,
        context: [...original.prompts.context],
      } : { goal: '', context: [] },
      suggestedExports: original.suggestedExports ? [...original.suggestedExports] : ['md'],
    });
  }

  // ===========================================================================
  // IMPORT / EXPORT
  // ===========================================================================

  /**
   * Export a template as JSON
   */
  exportTemplate(id: string): string {
    const template = this.getTemplate(id);
    
    if (!template) {
      throw new Error(`Template "${id}" not found`);
    }

    return JSON.stringify(template, null, 2);
  }

  /**
   * Import a template from JSON
   */
  async importTemplate(json: string): Promise<SessionTemplate> {
    let data: any;
    
    try {
      data = JSON.parse(json);
    } catch {
      throw new Error('Invalid JSON format');
    }

    // Validate required fields
    const required = ['name', 'description', 'category', 'mode', 'methodology', 'consensusMethod', 'prompts'];
    for (const field of required) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return this.createTemplate({
      name: data.name,
      description: data.description,
      category: data.category === 'custom' ? 'custom' : data.category,
      mode: data.mode,
      methodology: data.methodology,
      consensusMethod: data.consensusMethod,
      defaultAgents: data.defaultAgents || [],
      prompts: {
        goal: data.prompts?.goal || '',
        context: data.prompts?.context || [],
      },
      suggestedExports: data.suggestedExports || ['md'],
    });
  }

  // ===========================================================================
  // INTERNAL
  // ===========================================================================

  /**
   * Generate a URL-safe ID from template name
   */
  private generateTemplateId(name: string): string {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    
    // Add suffix if ID already exists
    let id = base;
    let counter = 1;
    while (this.hasTemplate(id)) {
      id = `${base}-${counter}`;
      counter++;
    }
    
    return id;
  }

  /**
   * Validate template structure
   */
  private validateTemplate(template: SessionTemplate): void {
    if (!template.name || template.name.trim().length === 0) {
      throw new Error('Template name is required');
    }

    if (!template.description || template.description.trim().length === 0) {
      throw new Error('Template description is required');
    }

    const validCategories = ['copywriting', 'strategy', 'validation', 'custom'];
    if (!validCategories.includes(template.category)) {
      throw new Error(`Invalid category: ${template.category}`);
    }

    const validModes = ['copywrite', 'idea-validation', 'ideation', 'will-it-work', 'custom'];
    if (!validModes.includes(template.mode)) {
      throw new Error(`Invalid mode: ${template.mode}`);
    }

    // prompts is optional - if provided, must be an object
    if (template.prompts !== undefined && typeof template.prompts !== 'object') {
      throw new Error('Template prompts must be an object');
    }
  }

  /**
   * Load custom templates from disk
   */
  private async loadCustomTemplates(): Promise<void> {
    if (!this.fileSystem) return;

    const templatesDir = this.getTemplatesDir();

    try {
      // Ensure directory exists
      await this.fileSystem.ensureDir(templatesDir);

      // List template files
      const files = await this.fileSystem.listDir(templatesDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const content = await this.fileSystem.readFile(`${templatesDir}/${file}`);
          if (!content) continue;

          const template = JSON.parse(content) as SessionTemplate;
          
          // Validate and add
          this.validateTemplate(template);
          template.builtIn = false; // Ensure loaded templates are not marked as built-in
          this.customTemplates.set(template.id, template);
        } catch (error) {
          console.warn(`[TemplateManager] Failed to load template ${file}:`, error);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read - that's OK
      console.info('[TemplateManager] No custom templates directory found');
    }
  }

  /**
   * Save a template to disk
   */
  private async saveTemplateToDisk(template: SessionTemplate): Promise<void> {
    if (!this.fileSystem) return;

    const templatesDir = this.getTemplatesDir();
    const path = `${templatesDir}/${template.id}.json`;

    try {
      await this.fileSystem.ensureDir(templatesDir);
      await this.fileSystem.writeFile(path, JSON.stringify(template, null, 2));
    } catch (error) {
      console.error(`[TemplateManager] Failed to save template:`, error);
      throw new Error(`Failed to save template: ${error}`);
    }
  }

}

// Export singleton for convenience
let defaultManager: TemplateManager | null = null;

export function getTemplateManager(): TemplateManager {
  if (!defaultManager) {
    defaultManager = new TemplateManager();
  }
  return defaultManager;
}

export function setTemplateManager(manager: TemplateManager): void {
  defaultManager = manager;
}
