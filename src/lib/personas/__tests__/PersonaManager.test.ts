/**
 * PersonaManager Tests
 * 
 * Comprehensive tests for the Persona Marketplace infrastructure.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PersonaManager, getPersonaManager, resetPersonaManager } from '../PersonaManager';
import type { CreatePersonaInput, CustomPersona, PersonaFilter, UpdatePersonaInput } from '../types';

// ============================================================================
// TEST UTILITIES
// ============================================================================

const TEST_PERSONAS_DIR = path.join(os.tmpdir(), 'forge-test-personas');
const TEST_SETS_DIR = path.join(os.tmpdir(), 'forge-test-persona-sets');

/**
 * Create a valid persona input for testing
 */
function createValidInput(overrides: Partial<CreatePersonaInput> = {}): CreatePersonaInput {
  return {
    name: 'Test Persona',
    nameHe: 'פרסונה לבדיקה',
    role: 'The Test Subject',
    age: 30,
    background: 'A test persona created for unit testing the PersonaManager.',
    personality: ['Analytical', 'Detail-oriented', 'Methodical'],
    biases: ['Prefers structured approaches', 'Values documentation'],
    strengths: ['Finding edge cases', 'Thorough analysis', 'Clear communication'],
    weaknesses: ['May over-analyze', 'Sometimes too rigid'],
    speakingStyle: 'Technical, precise, uses testing terminology.',
    color: 'blue',
    description: 'A persona for testing purposes',
    industry: 'Technology',
    tags: ['test', 'development'],
    ...overrides,
  };
}

/**
 * Clean up test directories
 */
async function cleanup(): Promise<void> {
  try {
    await fs.promises.rm(TEST_PERSONAS_DIR, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
  try {
    await fs.promises.rm(TEST_SETS_DIR, { recursive: true, force: true });
  } catch {
    // Directory might not exist
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('PersonaManager', () => {
  let manager: PersonaManager;

  beforeEach(async () => {
    await cleanup();
    resetPersonaManager();
    // Skip built-in industry personas in tests to isolate custom persona testing
    manager = new PersonaManager(TEST_PERSONAS_DIR, TEST_SETS_DIR, true);
  });

  afterEach(async () => {
    await cleanup();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await manager.initialize();
      const personas = await manager.list();
      expect(Array.isArray(personas)).toBe(true);
    });

    test('should create personas directory if it does not exist', async () => {
      await manager.initialize();
      const exists = await fs.promises
        .access(TEST_PERSONAS_DIR)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test('should only initialize once', async () => {
      await manager.initialize();
      await manager.initialize();
      // Should not throw
      const personas = await manager.list();
      expect(Array.isArray(personas)).toBe(true);
    });

    test('should load existing personas on initialization', async () => {
      // Create a persona file manually
      await fs.promises.mkdir(TEST_PERSONAS_DIR, { recursive: true });
      const persona: CustomPersona = {
        id: 'manual-persona',
        name: 'Manual',
        nameHe: 'ידני',
        role: 'Manual Role',
        age: 25,
        background: 'Created manually for testing.',
        personality: ['Test', 'Manual'],
        biases: ['Testing bias'],
        strengths: ['Testing strength'],
        weaknesses: ['Testing weakness'],
        speakingStyle: 'Manual style',
        color: 'green',
        version: '1.0.0',
        author: 'test',
        tags: [],
        description: 'Manual test',
        isBuiltIn: false,
        isFavorite: false,
        isPublished: false,
        usageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await fs.promises.writeFile(
        path.join(TEST_PERSONAS_DIR, 'manual-persona.json'),
        JSON.stringify(persona),
        'utf-8'
      );

      await manager.initialize();
      const loaded = await manager.get('manual-persona');
      expect(loaded).not.toBeNull();
      expect(loaded?.name).toBe('Manual');
    });
  });

  // ==========================================================================
  // CREATE
  // ==========================================================================

  describe('Create', () => {
    test('should create a persona with valid input', async () => {
      const input = createValidInput();
      const persona = await manager.create(input);

      expect(persona).toBeDefined();
      expect(persona.id).toBeDefined();
      expect(persona.name).toBe(input.name);
      expect(persona.nameHe).toBe(input.nameHe);
      expect(persona.role).toBe(input.role);
      expect(persona.age).toBe(input.age);
      expect(persona.background).toBe(input.background);
      expect(persona.personality).toEqual(input.personality);
      expect(persona.biases).toEqual(input.biases);
      expect(persona.strengths).toEqual(input.strengths);
      expect(persona.weaknesses).toEqual(input.weaknesses);
      expect(persona.speakingStyle).toBe(input.speakingStyle);
      expect(persona.color).toBe(input.color);
      expect(persona.description).toBe(input.description);
      expect(persona.industry).toBe(input.industry);
      expect(persona.tags).toEqual(input.tags);
      expect(persona.isBuiltIn).toBe(false);
      expect(persona.isFavorite).toBe(false);
      expect(persona.usageCount).toBe(0);
      expect(persona.createdAt).toBeDefined();
      expect(persona.updatedAt).toBeDefined();
    });

    test('should generate a unique ID', async () => {
      const persona1 = await manager.create(createValidInput({ name: 'Persona One' }));
      const persona2 = await manager.create(createValidInput({ name: 'Persona Two' }));

      expect(persona1.id).not.toBe(persona2.id);
    });

    test('should save persona to disk', async () => {
      const persona = await manager.create(createValidInput());
      const filePath = path.join(TEST_PERSONAS_DIR, `${persona.id}.json`);
      const exists = await fs.promises
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.promises.readFile(filePath, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved.name).toBe(persona.name);
    });

    test('should set default values for optional fields', async () => {
      const persona = await manager.create(createValidInput({ tags: undefined }));
      expect(persona.tags).toEqual([]);
      expect(persona.version).toBe('1.0.0');
      expect(persona.author).toBe('user');
    });

    test('should reject invalid input', async () => {
      const invalid = createValidInput({ name: '' });
      await expect(manager.create(invalid)).rejects.toThrow('Invalid persona');
    });

    test('should emit change event on create', async () => {
      const handler = vi.fn();
      manager.on('change', handler);

      await manager.create(createValidInput());

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].type).toBe('created');
    });
  });

  // ==========================================================================
  // READ
  // ==========================================================================

  describe('Read', () => {
    test('should get persona by ID', async () => {
      const created = await manager.create(createValidInput());
      const retrieved = await manager.get(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe(created.name);
    });

    test('should return null for non-existent ID', async () => {
      const retrieved = await manager.get('non-existent-id');
      expect(retrieved).toBeNull();
    });

    test('should list all personas', async () => {
      await manager.create(createValidInput({ name: 'Persona 1' }));
      await manager.create(createValidInput({ name: 'Persona 2' }));
      await manager.create(createValidInput({ name: 'Persona 3' }));

      const all = await manager.list();
      expect(all).toHaveLength(3);
    });

    test('should list with filter by industry', async () => {
      await manager.create(createValidInput({ name: 'Tech', industry: 'Technology' }));
      await manager.create(createValidInput({ name: 'Finance', industry: 'Finance' }));

      const techOnly = await manager.list({ industry: 'Technology' });
      expect(techOnly).toHaveLength(1);
      expect(techOnly[0].name).toBe('Tech');
    });

    test('should list with filter by tags', async () => {
      await manager.create(createValidInput({ name: 'P1', tags: ['tag-a', 'tag-b'] }));
      await manager.create(createValidInput({ name: 'P2', tags: ['tag-b', 'tag-c'] }));
      await manager.create(createValidInput({ name: 'P3', tags: ['tag-c'] }));

      const withTagA = await manager.list({ tags: ['tag-a'] });
      expect(withTagA).toHaveLength(1);

      const withTagB = await manager.list({ tags: ['tag-b'] });
      expect(withTagB).toHaveLength(2);
    });

    test('should list with search filter', async () => {
      await manager.create(createValidInput({ name: 'Developer Dan', description: 'A dev' }));
      await manager.create(createValidInput({ name: 'Manager Mary', description: 'A manager' }));

      const devSearch = await manager.list({ search: 'developer' });
      expect(devSearch).toHaveLength(1);
      expect(devSearch[0].name).toBe('Developer Dan');
    });

    test('should list with sort by name ascending', async () => {
      await manager.create(createValidInput({ name: 'Zara' }));
      await manager.create(createValidInput({ name: 'Alice' }));
      await manager.create(createValidInput({ name: 'Mike' }));

      const sorted = await manager.list(undefined, { field: 'name', order: 'asc' });
      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Mike');
      expect(sorted[2].name).toBe('Zara');
    });

    test('should list with sort by usageCount descending', async () => {
      const p1 = await manager.create(createValidInput({ name: 'Low Usage' }));
      const p2 = await manager.create(createValidInput({ name: 'High Usage' }));
      
      // Increment usage for p2
      await manager.incrementUsage(p2.id);
      await manager.incrementUsage(p2.id);
      await manager.incrementUsage(p2.id);

      const sorted = await manager.list(undefined, { field: 'usageCount', order: 'desc' });
      expect(sorted[0].name).toBe('High Usage');
    });

    test('should list favorites only', async () => {
      const p1 = await manager.create(createValidInput({ name: 'Fav' }));
      await manager.create(createValidInput({ name: 'Not Fav' }));
      await manager.toggleFavorite(p1.id);

      const favs = await manager.list({ favoritesOnly: true });
      expect(favs).toHaveLength(1);
      expect(favs[0].name).toBe('Fav');
    });
  });

  // ==========================================================================
  // UPDATE
  // ==========================================================================

  describe('Update', () => {
    test('should update persona fields', async () => {
      const created = await manager.create(createValidInput());
      const updated = await manager.update(created.id, {
        name: 'Updated Name',
        age: 35,
        description: 'Updated description',
      });

      expect(updated.name).toBe('Updated Name');
      expect(updated.age).toBe(35);
      expect(updated.description).toBe('Updated description');
      expect(updated.id).toBe(created.id); // ID preserved
    });

    test('should update timestamp on update', async () => {
      const created = await manager.create(createValidInput());
      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await manager.update(created.id, { name: 'New Name' });
      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    });

    test('should persist update to disk', async () => {
      const created = await manager.create(createValidInput());
      await manager.update(created.id, { name: 'Persisted Update' });

      const filePath = path.join(TEST_PERSONAS_DIR, `${created.id}.json`);
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const saved = JSON.parse(content);
      expect(saved.name).toBe('Persisted Update');
    });

    test('should throw for non-existent persona', async () => {
      await expect(manager.update('non-existent', { name: 'Fail' })).rejects.toThrow(
        'Persona not found'
      );
    });

    test('should reject invalid update', async () => {
      const created = await manager.create(createValidInput());
      await expect(manager.update(created.id, { age: 150 })).rejects.toThrow('Invalid persona');
    });

    test('should emit change event on update', async () => {
      const handler = vi.fn();
      manager.on('change', handler);

      const created = await manager.create(createValidInput());
      handler.mockClear();

      await manager.update(created.id, { name: 'Updated' });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].type).toBe('updated');
    });
  });

  // ==========================================================================
  // DELETE
  // ==========================================================================

  describe('Delete', () => {
    test('should delete persona', async () => {
      const created = await manager.create(createValidInput());
      await manager.delete(created.id);

      const retrieved = await manager.get(created.id);
      expect(retrieved).toBeNull();
    });

    test('should remove file from disk', async () => {
      const created = await manager.create(createValidInput());
      const filePath = path.join(TEST_PERSONAS_DIR, `${created.id}.json`);

      await manager.delete(created.id);

      const exists = await fs.promises
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    test('should throw for non-existent persona', async () => {
      await expect(manager.delete('non-existent')).rejects.toThrow('Persona not found');
    });

    test('should emit change event on delete', async () => {
      const handler = vi.fn();
      manager.on('change', handler);

      const created = await manager.create(createValidInput());
      handler.mockClear();

      await manager.delete(created.id);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].type).toBe('deleted');
    });
  });

  // ==========================================================================
  // DUPLICATE
  // ==========================================================================

  describe('Duplicate', () => {
    test('should duplicate persona with new ID', async () => {
      const original = await manager.create(createValidInput({ name: 'Original' }));
      const duplicate = await manager.duplicate(original.id);

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original (Copy)');
      expect(duplicate.role).toBe(original.role);
      expect(duplicate.personality).toEqual(original.personality);
    });

    test('should duplicate with custom name', async () => {
      const original = await manager.create(createValidInput({ name: 'Original' }));
      const duplicate = await manager.duplicate(original.id, 'Custom Name');

      expect(duplicate.name).toBe('Custom Name');
    });

    test('should reset usage count on duplicate', async () => {
      const original = await manager.create(createValidInput());
      await manager.incrementUsage(original.id);
      await manager.incrementUsage(original.id);

      const duplicate = await manager.duplicate(original.id);
      expect(duplicate.usageCount).toBe(0);
    });
  });

  // ==========================================================================
  // FAVORITES & USAGE
  // ==========================================================================

  describe('Favorites and Usage', () => {
    test('should toggle favorite status', async () => {
      const created = await manager.create(createValidInput());
      expect(created.isFavorite).toBe(false);

      const toggled = await manager.toggleFavorite(created.id);
      expect(toggled.isFavorite).toBe(true);

      const toggled2 = await manager.toggleFavorite(created.id);
      expect(toggled2.isFavorite).toBe(false);
    });

    test('should increment usage count', async () => {
      const created = await manager.create(createValidInput());
      expect(created.usageCount).toBe(0);

      await manager.incrementUsage(created.id);
      const updated = await manager.get(created.id);
      expect(updated?.usageCount).toBe(1);

      await manager.incrementUsage(created.id);
      const updated2 = await manager.get(created.id);
      expect(updated2?.usageCount).toBe(2);
    });

    test('should handle incrementUsage for non-existent persona gracefully', async () => {
      // Should not throw
      await manager.incrementUsage('non-existent');
    });
  });

  // ==========================================================================
  // IMPORT / EXPORT
  // ==========================================================================

  describe('Import and Export', () => {
    test('should export persona to JSON', async () => {
      const created = await manager.create(createValidInput({ name: 'Export Test' }));
      const json = await manager.export(created.id);

      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('Export Test');
      expect(parsed.id).toBe(created.id);
    });

    test('should throw when exporting non-existent persona', async () => {
      await expect(manager.export('non-existent')).rejects.toThrow('Persona not found');
    });

    test('should import persona from JSON string', async () => {
      const json = JSON.stringify(createValidInput({ name: 'Imported' }));
      const imported = await manager.import(json);

      expect(imported.name).toBe('Imported');
      expect(imported.id).toBeDefined();
    });

    test('should import persona from object', async () => {
      const obj = createValidInput({ name: 'Imported Object' });
      const imported = await manager.import(obj);

      expect(imported.name).toBe('Imported Object');
    });

    test('should generate new ID on import to avoid conflicts', async () => {
      const original = await manager.create(createValidInput({ name: 'Original' }));
      const json = await manager.export(original.id);

      const imported = await manager.import(json);
      expect(imported.id).not.toBe(original.id);
    });

    test('should emit imported event', async () => {
      const handler = vi.fn();
      manager.on('change', handler);

      await manager.import(createValidInput({ name: 'Import Event' }));

      // Should emit both 'created' and 'imported'
      const events = handler.mock.calls.map((c) => c[0].type);
      expect(events).toContain('created');
      expect(events).toContain('imported');
    });
  });

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  describe('Validation', () => {
    test('should validate valid persona', () => {
      const result = manager.validate(createValidInput() as any);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing name', () => {
      const result = manager.validate({ ...createValidInput(), name: '' } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    test('should reject name too long', () => {
      const result = manager.validate({
        ...createValidInput(),
        name: 'a'.repeat(100),
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MAX_LENGTH' && e.field === 'name')).toBe(true);
    });

    test('should reject missing Hebrew name', () => {
      const result = manager.validate({ ...createValidInput(), nameHe: '' } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'nameHe')).toBe(true);
    });

    test('should reject invalid age', () => {
      const result = manager.validate({ ...createValidInput(), age: 10 } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'age')).toBe(true);
    });

    test('should reject age over 120', () => {
      const result = manager.validate({ ...createValidInput(), age: 150 } as any);
      expect(result.valid).toBe(false);
    });

    test('should reject insufficient personality traits', () => {
      const result = manager.validate({
        ...createValidInput(),
        personality: ['Only one'],
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'personality')).toBe(true);
    });

    test('should reject invalid color', () => {
      const result = manager.validate({
        ...createValidInput(),
        color: 'invalid-color',
      } as any);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'color')).toBe(true);
    });

    test('should warn about missing description', () => {
      const result = manager.validate({
        ...createValidInput(),
        description: '',
      } as any);
      expect(result.warnings.some((w) => w.field === 'description')).toBe(true);
    });

    test('should warn about missing tags', () => {
      const result = manager.validate({
        ...createValidInput(),
        tags: [],
      } as any);
      expect(result.warnings.some((w) => w.field === 'tags')).toBe(true);
    });

    test('should warn about missing industry', () => {
      const result = manager.validate({
        ...createValidInput(),
        industry: undefined,
      } as any);
      expect(result.warnings.some((w) => w.field === 'industry')).toBe(true);
    });
  });

  // ==========================================================================
  // SESSION INTEGRATION
  // ==========================================================================

  describe('Session Integration', () => {
    test('should apply personas to session', async () => {
      const p1 = await manager.create(createValidInput({ name: 'Session P1' }));
      const p2 = await manager.create(createValidInput({ name: 'Session P2' }));

      const applied = await manager.applyToSession([p1.id, p2.id]);
      expect(applied).toHaveLength(2);
      expect(applied[0].name).toBe('Session P1');
      expect(applied[1].name).toBe('Session P2');
    });

    test('should increment usage when applying to session', async () => {
      const created = await manager.create(createValidInput());
      await manager.applyToSession([created.id]);

      const updated = await manager.get(created.id);
      expect(updated?.usageCount).toBe(1);
    });

    test('should throw when applying empty persona list', async () => {
      await expect(manager.applyToSession([])).rejects.toThrow('No valid personas');
    });

    test('should skip invalid persona IDs when applying', async () => {
      const valid = await manager.create(createValidInput({ name: 'Valid' }));
      const applied = await manager.applyToSession([valid.id, 'non-existent']);

      expect(applied).toHaveLength(1);
      expect(applied[0].name).toBe('Valid');
    });

    test('should clear session personas', async () => {
      const created = await manager.create(createValidInput());
      await manager.applyToSession([created.id]);

      // Should not throw
      manager.clearSessionPersonas();
    });

    test('should get compatible personas by industry', async () => {
      await manager.create(createValidInput({ name: 'Tech 1', industry: 'Technology' }));
      await manager.create(createValidInput({ name: 'Tech 2', industry: 'Technology' }));
      await manager.create(createValidInput({ name: 'Finance', industry: 'Finance' }));

      const compatible = await manager.getCompatiblePersonas('Technology');
      expect(compatible).toHaveLength(2);
    });

    test('should get compatible personas by tags', async () => {
      await manager.create(createValidInput({ name: 'P1', tags: ['startup'] }));
      await manager.create(createValidInput({ name: 'P2', tags: ['enterprise'] }));

      const compatible = await manager.getCompatiblePersonas(undefined, ['startup']);
      expect(compatible).toHaveLength(1);
      expect(compatible[0].name).toBe('P1');
    });
  });

  // ==========================================================================
  // PERSONA SETS
  // ==========================================================================

  describe('Persona Sets', () => {
    test('should create a persona set', async () => {
      const p1 = await manager.create(createValidInput({ name: 'Set Member 1' }));
      const p2 = await manager.create(createValidInput({ name: 'Set Member 2' }));

      const set = await manager.createSet('Test Set', [p1.id, p2.id], {
        description: 'A test set',
      });

      expect(set.id).toBeDefined();
      expect(set.name).toBe('Test Set');
      expect(set.personaIds).toHaveLength(2);
    });

    test('should reject set with non-existent persona IDs', async () => {
      await expect(manager.createSet('Bad Set', ['non-existent'])).rejects.toThrow(
        'Persona not found'
      );
    });

    test('should get persona set by ID', async () => {
      const p1 = await manager.create(createValidInput());
      const created = await manager.createSet('Get Test', [p1.id]);

      const retrieved = await manager.getSet(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Get Test');
    });

    test('should return null for non-existent set', async () => {
      const retrieved = await manager.getSet('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should list all persona sets', async () => {
      const p1 = await manager.create(createValidInput());

      await manager.createSet('Set 1', [p1.id]);
      await manager.createSet('Set 2', [p1.id]);

      const sets = await manager.listSets();
      expect(sets).toHaveLength(2);
    });

    test('should delete persona set', async () => {
      const p1 = await manager.create(createValidInput());
      const set = await manager.createSet('To Delete', [p1.id]);

      await manager.deleteSet(set.id);

      const retrieved = await manager.getSet(set.id);
      expect(retrieved).toBeNull();
    });

    test('should throw when deleting non-existent set', async () => {
      await expect(manager.deleteSet('non-existent')).rejects.toThrow('Persona set not found');
    });

    test('should apply persona set to session', async () => {
      const p1 = await manager.create(createValidInput({ name: 'Set Apply 1' }));
      const p2 = await manager.create(createValidInput({ name: 'Set Apply 2' }));
      const set = await manager.createSet('Apply Test', [p1.id, p2.id]);

      const applied = await manager.applySetToSession(set.id);
      expect(applied).toHaveLength(2);
    });

    test('should throw when applying non-existent set', async () => {
      await expect(manager.applySetToSession('non-existent')).rejects.toThrow(
        'Persona set not found'
      );
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('Singleton', () => {
    test('should return same instance', () => {
      resetPersonaManager();
      const instance1 = getPersonaManager();
      const instance2 = getPersonaManager();
      expect(instance1).toBe(instance2);
    });

    test('should reset singleton', () => {
      const instance1 = getPersonaManager();
      resetPersonaManager();
      const instance2 = getPersonaManager();
      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // STATIC METHODS
  // ==========================================================================

  describe('Static Methods', () => {
    test('should get default personas directory', () => {
      const dir = PersonaManager.getDefaultPersonasDir();
      expect(dir).toContain('.forge');
      expect(dir).toContain('personas');
    });

    test('should check if personas directory exists', async () => {
      // Create directory
      const dir = PersonaManager.getDefaultPersonasDir();
      await fs.promises.mkdir(dir, { recursive: true });

      const exists = await PersonaManager.personasDirExists();
      expect(typeof exists).toBe('boolean');
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('PersonaManager Edge Cases', () => {
  let manager: PersonaManager;

  beforeEach(async () => {
    await cleanup();
    resetPersonaManager();
    manager = new PersonaManager(TEST_PERSONAS_DIR, TEST_SETS_DIR);
  });

  afterEach(async () => {
    await cleanup();
  });

  test('should handle special characters in name', async () => {
    const persona = await manager.create(
      createValidInput({ name: "Test's Persona (v2.0) [Beta]" })
    );
    expect(persona.name).toBe("Test's Persona (v2.0) [Beta]");
  });

  test('should handle Hebrew in search', async () => {
    await manager.create(createValidInput({ name: 'Hebrew Test', nameHe: 'בדיקה עברית' }));

    const results = await manager.list({ search: 'בדיקה' });
    expect(results).toHaveLength(1);
  });

  test('should handle concurrent creates', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      manager.create(createValidInput({ name: `Concurrent ${i}` }))
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);

    const ids = new Set(results.map((r) => r.id));
    expect(ids.size).toBe(10); // All unique IDs
  });

  test('should handle empty strings in arrays', async () => {
    const result = manager.validate({
      ...createValidInput(),
      personality: ['Valid', '', 'Another Valid'],
    } as any);
    // Empty strings are allowed but may be filtered out in real usage
    expect(result.valid).toBe(true);
  });

  test('should handle very long background', async () => {
    const longBackground = 'a'.repeat(2000);
    const result = manager.validate({
      ...createValidInput(),
      background: longBackground,
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'background')).toBe(true);
  });

  test('should preserve custom prompt on update', async () => {
    const created = await manager.create(
      createValidInput({ customPrompt: 'Custom system prompt addition' })
    );
    expect(created.customPrompt).toBe('Custom system prompt addition');

    const updated = await manager.update(created.id, { name: 'New Name' });
    expect(updated.customPrompt).toBe('Custom system prompt addition');
  });

  test('should handle expertise field', async () => {
    const expertise = `## Domain Expertise\n\n- Point 1\n- Point 2`;
    const created = await manager.create(createValidInput({ expertise }));
    expect(created.expertise).toBe(expertise);
  });
});
