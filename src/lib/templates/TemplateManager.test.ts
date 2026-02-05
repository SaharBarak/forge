/**
 * TemplateManager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from './TemplateManager';
import { BUILT_IN_TEMPLATES } from './builtInTemplates';
import type { IFileSystem } from '../interfaces';

describe('TemplateManager', () => {
  let manager: TemplateManager;
  let mockFs: IFileSystem;

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn().mockResolvedValue(null),
      writeFile: vi.fn().mockResolvedValue(undefined),
      listDir: vi.fn().mockResolvedValue([]),
      ensureDir: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn().mockResolvedValue(false),
    };
    manager = new TemplateManager(mockFs, '/home/test');
  });

  describe('listTemplates', () => {
    it('returns built-in templates', () => {
      const templates = manager.listTemplates();
      
      expect(templates.length).toBeGreaterThanOrEqual(5);
      expect(templates.some(t => t.id === 'landing-page')).toBe(true);
      expect(templates.some(t => t.id === 'email-campaign')).toBe(true);
      expect(templates.some(t => t.id === 'product-description')).toBe(true);
      expect(templates.some(t => t.id === 'social-media-series')).toBe(true);
      expect(templates.some(t => t.id === 'brand-messaging')).toBe(true);
    });

    it('marks built-in templates as builtIn', () => {
      const templates = manager.listTemplates();
      const landingPage = templates.find(t => t.id === 'landing-page');
      
      expect(landingPage?.builtIn).toBe(true);
    });
  });

  describe('getTemplate', () => {
    it('returns built-in template by ID', () => {
      const template = manager.getTemplate('landing-page');
      
      expect(template).not.toBeNull();
      expect(template?.name).toBe('Landing Page Copy');
      expect(template?.category).toBe('copywriting');
      expect(template?.mode).toBe('copywrite');
    });

    it('returns null for non-existent template', () => {
      const template = manager.getTemplate('non-existent');
      
      expect(template).toBeNull();
    });

    it('returns a copy, not the original', () => {
      const template1 = manager.getTemplate('landing-page');
      const template2 = manager.getTemplate('landing-page');
      
      expect(template1).not.toBe(template2);
      expect(template1).toEqual(template2);
    });
  });

  describe('hasTemplate', () => {
    it('returns true for existing built-in template', () => {
      expect(manager.hasTemplate('landing-page')).toBe(true);
    });

    it('returns false for non-existent template', () => {
      expect(manager.hasTemplate('non-existent')).toBe(false);
    });
  });

  describe('getTemplatesByCategory', () => {
    it('returns templates in copywriting category', () => {
      const templates = manager.getTemplatesByCategory('copywriting');
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.category === 'copywriting')).toBe(true);
    });

    it('returns templates in strategy category', () => {
      const templates = manager.getTemplatesByCategory('strategy');
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.every(t => t.category === 'strategy')).toBe(true);
    });
  });

  describe('createTemplate', () => {
    it('creates a new custom template', async () => {
      const newTemplate = await manager.createTemplate({
        name: 'My Custom Template',
        description: 'A custom template for testing',
        category: 'custom',
        mode: 'copywrite',
        methodology: 'collaborative',
        consensusMethod: 'majority',
        defaultAgents: [],
        prompts: {
          goal: 'Test goal',
          context: ['brand'],
        },
        suggestedExports: ['md'],
      });

      expect(newTemplate.id).toBe('my-custom-template');
      expect(newTemplate.builtIn).toBe(false);
      expect(newTemplate.version).toBe(1);
      expect(newTemplate.createdAt).toBeDefined();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('generates unique ID for duplicate names', async () => {
      await manager.createTemplate({
        name: 'Landing Page',
        description: 'Another landing page template',
        category: 'custom',
        mode: 'copywrite',
      });

      const templates = manager.listTemplates();
      const customLanding = templates.find(t => t.id.startsWith('landing-page-') && !t.builtIn);
      
      expect(customLanding).toBeDefined();
    });

    it('throws on invalid category', async () => {
      await expect(manager.createTemplate({
        name: 'Invalid',
        description: 'Invalid template',
        category: 'invalid' as any,
        mode: 'copywrite',
      })).rejects.toThrow('Invalid category');
    });
  });

  describe('updateTemplate', () => {
    it('updates custom template', async () => {
      // Create a custom template first
      const created = await manager.createTemplate({
        name: 'Updatable Template',
        description: 'Will be updated',
        category: 'custom',
        mode: 'copywrite',
      });

      const updated = await manager.updateTemplate(created.id, {
        description: 'Updated description',
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.updatedAt).toBeDefined();
      // Name and ID should remain unchanged
      expect(updated.name).toBe(created.name);
      expect(updated.id).toBe(created.id);
    });

    it('throws when trying to update built-in template', async () => {
      await expect(manager.updateTemplate('landing-page', {
        description: 'Hacked!',
      })).rejects.toThrow('Cannot modify built-in templates');
    });
  });

  describe('deleteTemplate', () => {
    it('deletes custom template', async () => {
      const created = await manager.createTemplate({
        name: 'Deletable Template',
        description: 'Will be deleted',
        category: 'custom',
        mode: 'copywrite',
      });

      const result = await manager.deleteTemplate(created.id);
      
      expect(result).toBe(true);
      expect(manager.hasTemplate(created.id)).toBe(false);
    });

    it('throws when trying to delete built-in template', async () => {
      await expect(manager.deleteTemplate('landing-page')).rejects.toThrow('Cannot delete built-in templates');
    });

    it('returns false for non-existent template', async () => {
      const result = await manager.deleteTemplate('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('duplicateTemplate', () => {
    it('duplicates built-in template', async () => {
      const duplicate = await manager.duplicateTemplate('landing-page', 'My Landing Page');
      
      expect(duplicate.id).toBe('my-landing-page');
      expect(duplicate.name).toBe('My Landing Page');
      expect(duplicate.category).toBe('custom'); // Duplicates become custom
      expect(duplicate.builtIn).toBe(false);
    });

    it('uses default name if not provided', async () => {
      const duplicate = await manager.duplicateTemplate('landing-page');
      
      expect(duplicate.name).toBe('Landing Page Copy (Copy)');
    });
  });

  describe('exportTemplate', () => {
    it('exports template as JSON string', () => {
      const json = manager.exportTemplate('landing-page');
      const parsed = JSON.parse(json);
      
      expect(parsed.id).toBe('landing-page');
      expect(parsed.name).toBe('Landing Page Copy');
    });

    it('throws for non-existent template', () => {
      expect(() => manager.exportTemplate('non-existent')).toThrow('not found');
    });
  });

  describe('importTemplate', () => {
    it('imports template from JSON', async () => {
      const json = JSON.stringify({
        name: 'Imported Template',
        description: 'Imported from JSON',
        category: 'custom',
        mode: 'ideation',
        methodology: 'socratic',
        consensusMethod: 'synthesis',
        prompts: { goal: 'Test', context: [] },
      });

      const imported = await manager.importTemplate(json);
      
      expect(imported.id).toBe('imported-template');
      expect(imported.builtIn).toBe(false);
    });

    it('throws on invalid JSON', async () => {
      await expect(manager.importTemplate('not json')).rejects.toThrow('Invalid JSON');
    });

    it('throws on missing required fields', async () => {
      await expect(manager.importTemplate('{}')).rejects.toThrow('Missing required field');
    });
  });

  describe('initialize', () => {
    it('loads custom templates from disk', async () => {
      const customTemplate = {
        id: 'disk-template',
        name: 'Disk Template',
        description: 'Loaded from disk',
        category: 'custom',
        mode: 'copywrite',
        methodology: 'collaborative',
        consensusMethod: 'majority',
        prompts: { goal: '', context: [] },
        version: 1,
        builtIn: false,
      };

      mockFs.listDir = vi.fn().mockResolvedValue(['disk-template.json']);
      mockFs.readFile = vi.fn().mockResolvedValue(JSON.stringify(customTemplate));

      await manager.initialize();
      
      const templates = manager.listTemplates();
      const loaded = templates.find(t => t.id === 'disk-template');
      
      expect(loaded).toBeDefined();
      expect(loaded?.builtIn).toBe(false);
    });
  });
});

describe('Built-in Templates', () => {
  it('has exactly 5 built-in templates', () => {
    expect(BUILT_IN_TEMPLATES.length).toBe(5);
  });

  it('all templates have required fields', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.category).toBeDefined();
      expect(template.mode).toBeDefined();
      expect(template.builtIn).toBe(true);
    }
  });

  it('all templates have UI display properties', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.icon).toBeDefined();
      expect(template.color).toBeDefined();
      expect(template.tags).toBeDefined();
      expect(template.estimatedDuration).toBeDefined();
      expect(template.difficulty).toBeDefined();
    }
  });

  it('all templates have Hebrew translations', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.nameHe).toBeDefined();
      expect(template.descriptionHe).toBeDefined();
    }
  });
});
