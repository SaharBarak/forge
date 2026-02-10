// @ts-nocheck
/**
 * PersonaManager - CRUD operations for custom personas
 * 
 * Manages custom personas for the Persona Marketplace.
 * Stores personas in ~/.forge/personas/ with JSON files.
 * 
 * @module lib/personas/PersonaManager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import type {
  CustomPersona,
  CreatePersonaInput,
  UpdatePersonaInput,
  PersonaFilter,
  PersonaSort,
  PersonaValidationResult,
  PersonaValidationError,
  PersonaValidationWarning,
  PersonaChangeEvent,
  PersonaSet,
} from './types';
import { AGENT_PERSONAS, registerCustomPersonas, clearCustomPersonas } from '../../agents/personas';
import { INDUSTRY_PERSONAS } from './industry-personas';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default personas directory */
const DEFAULT_PERSONAS_DIR = path.join(os.homedir(), '.forge', 'personas');

/** Persona sets directory */
const PERSONA_SETS_DIR = path.join(os.homedir(), '.forge', 'persona-sets');

/** Valid persona colors */
const VALID_COLORS = ['pink', 'green', 'purple', 'orange', 'blue', 'cyan', 'yellow', 'red', 'gray'];

/** Max lengths for validation */
const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_BACKGROUND_LENGTH = 1000;
const MAX_SPEAKING_STYLE_LENGTH = 500;
const MIN_PERSONALITY_TRAITS = 2;
const MAX_PERSONALITY_TRAITS = 10;
const MIN_BIASES = 1;
const MAX_BIASES = 10;
const MIN_STRENGTHS = 1;
const MAX_STRENGTHS = 10;
const MIN_WEAKNESSES = 1;
const MAX_WEAKNESSES = 5;

// ============================================================================
// PERSONA MANAGER CLASS
// ============================================================================

/**
 * PersonaManager handles CRUD operations for custom personas.
 * 
 * Features:
 * - Load/save personas from ~/.forge/personas/
 * - Create, read, update, delete personas
 * - Validate persona data
 * - Filter and sort personas
 * - Track favorites and usage
 * - Manage persona sets
 * - Integrate with session persona registry
 * 
 * @example
 * ```typescript
 * const manager = new PersonaManager();
 * await manager.initialize();
 * 
 * // Create a persona
 * const persona = await manager.create({
 *   name: 'Alex',
 *   nameHe: 'אלכס',
 *   role: 'The Skeptical Developer',
 *   age: 32,
 *   background: 'Senior developer with 10 years experience...',
 *   personality: ['Technical', 'Detail-oriented'],
 *   biases: ['Prefers code over marketing'],
 *   strengths: ['Technical accuracy'],
 *   weaknesses: ['May over-engineer'],
 *   speakingStyle: 'Technical, precise',
 *   color: 'blue',
 *   description: 'A developer persona for tech products',
 * });
 * 
 * // Use in session
 * manager.applyToSession([persona.id]);
 * ```
 */
export class PersonaManager extends EventEmitter {
  private personasDir: string;
  private setsDir: string;
  private personas: Map<string, CustomPersona> = new Map();
  private sets: Map<string, PersonaSet> = new Map();
  private initialized: boolean = false;
  private skipBuiltIns: boolean = false;

  /**
   * Create a new PersonaManager
   * @param personasDir - Directory for custom persona storage
   * @param setsDir - Directory for persona sets storage
   * @param skipBuiltIns - If true, skip loading built-in industry personas (for testing)
   */
  constructor(personasDir?: string, setsDir?: string, skipBuiltIns: boolean = false) {
    super();
    this.personasDir = personasDir || DEFAULT_PERSONAS_DIR;
    this.setsDir = setsDir || PERSONA_SETS_DIR;
    this.skipBuiltIns = skipBuiltIns;
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Initialize the PersonaManager by loading all personas from disk.
   * Creates the personas directory if it doesn't exist.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Ensure directories exist
    await this.ensureDirectories();

    // Load all personas
    await this.loadAllPersonas();

    // Load persona sets
    await this.loadAllSets();

    this.initialized = true;
  }

  /**
   * Ensure personas and sets directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.promises.mkdir(this.personasDir, { recursive: true });
      await fs.promises.mkdir(this.setsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Load all personas from the personas directory
   */
  private async loadAllPersonas(): Promise<void> {
    this.personas.clear();

    // Load built-in industry personas first (unless skipped for testing)
    if (!this.skipBuiltIns) {
      for (const persona of INDUSTRY_PERSONAS) {
        this.personas.set(persona.id, persona);
      }
    }

    // Load custom personas from disk (can override built-ins if same ID)
    try {
      const files = await fs.promises.readdir(this.personasDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.personasDir, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const persona = JSON.parse(content) as CustomPersona;
          
          // Validate loaded persona
          const validation = this.validate(persona);
          if (validation.valid) {
            this.personas.set(persona.id, persona);
          } else {
            console.warn(`[PersonaManager] Invalid persona file ${file}:`, validation.errors);
          }
        } catch (err) {
          console.warn(`[PersonaManager] Failed to load persona file ${file}:`, err);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  /**
   * Load all persona sets
   */
  private async loadAllSets(): Promise<void> {
    this.sets.clear();

    try {
      const files = await fs.promises.readdir(this.setsDir);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.setsDir, file);
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const set = JSON.parse(content) as PersonaSet;
          this.sets.set(set.id, set);
        } catch (err) {
          console.warn(`[PersonaManager] Failed to load persona set ${file}:`, err);
        }
      }
    } catch (error) {
      // Directory might not exist yet
    }
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new custom persona
   */
  async create(input: CreatePersonaInput): Promise<CustomPersona> {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const id = this.generateId(input.name);

    const persona: CustomPersona = {
      // Base AgentPersona fields
      id,
      name: input.name,
      nameHe: input.nameHe,
      role: input.role,
      age: input.age,
      background: input.background,
      personality: input.personality,
      biases: input.biases,
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      speakingStyle: input.speakingStyle,
      color: input.color,
      avatar: input.avatar,

      // CustomPersona extensions
      version: '1.0.0',
      author: input.author || 'user',
      authorEmail: input.authorEmail,
      industry: input.industry,
      tags: input.tags || [],
      description: input.description,
      descriptionHe: input.descriptionHe,
      isBuiltIn: false,
      isFavorite: false,
      isPublished: false,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      customPrompt: input.customPrompt,
      expertise: input.expertise,
    };

    // Validate before saving
    const validation = this.validate(persona);
    if (!validation.valid) {
      throw new Error(`Invalid persona: ${validation.errors.map((e) => e.message).join(', ')}`);
    }

    // Save to disk
    await this.savePersona(persona);

    // Add to cache
    this.personas.set(persona.id, persona);

    // Emit event
    this.emitChange('created', persona.id, persona);

    return persona;
  }

  /**
   * Get a persona by ID
   */
  async get(id: string): Promise<CustomPersona | null> {
    await this.ensureInitialized();
    return this.personas.get(id) || null;
  }

  /**
   * Get all personas with optional filtering and sorting
   */
  async list(filter?: PersonaFilter, sort?: PersonaSort): Promise<CustomPersona[]> {
    await this.ensureInitialized();

    let personas = Array.from(this.personas.values());

    // Apply filters
    if (filter) {
      personas = this.applyFilter(personas, filter);
    }

    // Apply sorting
    if (sort) {
      personas = this.applySort(personas, sort);
    }

    return personas;
  }

  /**
   * Update an existing persona
   */
  async update(id: string, input: UpdatePersonaInput): Promise<CustomPersona> {
    await this.ensureInitialized();

    const existing = this.personas.get(id);
    if (!existing) {
      throw new Error(`Persona not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in personas');
    }

    const updated: CustomPersona = {
      ...existing,
      ...input,
      id: existing.id, // Preserve ID
      isBuiltIn: false, // Cannot become built-in
      updatedAt: new Date().toISOString(),
    };

    // Validate before saving
    const validation = this.validate(updated);
    if (!validation.valid) {
      throw new Error(`Invalid persona: ${validation.errors.map((e) => e.message).join(', ')}`);
    }

    // Save to disk
    await this.savePersona(updated);

    // Update cache
    this.personas.set(updated.id, updated);

    // Emit event
    this.emitChange('updated', updated.id, updated);

    return updated;
  }

  /**
   * Delete a persona
   */
  async delete(id: string): Promise<void> {
    await this.ensureInitialized();

    const existing = this.personas.get(id);
    if (!existing) {
      throw new Error(`Persona not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot delete built-in personas');
    }

    // Delete from disk
    const filePath = path.join(this.personasDir, `${id}.json`);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // File might not exist
    }

    // Remove from cache
    this.personas.delete(id);

    // Emit event
    this.emitChange('deleted', id);
  }

  /**
   * Duplicate a persona
   */
  async duplicate(id: string, newName?: string): Promise<CustomPersona> {
    await this.ensureInitialized();

    const existing = this.personas.get(id);
    if (!existing) {
      throw new Error(`Persona not found: ${id}`);
    }

    const input: CreatePersonaInput = {
      name: newName || `${existing.name} (Copy)`,
      nameHe: existing.nameHe,
      role: existing.role,
      age: existing.age,
      background: existing.background,
      personality: [...existing.personality],
      biases: [...existing.biases],
      strengths: [...existing.strengths],
      weaknesses: [...existing.weaknesses],
      speakingStyle: existing.speakingStyle,
      color: existing.color,
      description: existing.description,
      descriptionHe: existing.descriptionHe,
      industry: existing.industry,
      tags: [...existing.tags],
      avatar: existing.avatar,
      customPrompt: existing.customPrompt,
      expertise: existing.expertise,
      author: existing.author,
    };

    return this.create(input);
  }

  // ==========================================================================
  // FAVORITES & USAGE
  // ==========================================================================

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string): Promise<CustomPersona> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Persona not found: ${id}`);
    }

    return this.update(id, { isFavorite: !existing.isFavorite });
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const updated: CustomPersona = {
      ...existing,
      usageCount: existing.usageCount + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.savePersona(updated);
    this.personas.set(id, updated);
  }

  // ==========================================================================
  // IMPORT / EXPORT
  // ==========================================================================

  /**
   * Import a persona from JSON
   */
  async import(json: string | object): Promise<CustomPersona> {
    const data = typeof json === 'string' ? JSON.parse(json) : json;

    // Generate new ID to avoid conflicts
    const input: CreatePersonaInput = {
      name: data.name,
      nameHe: data.nameHe,
      role: data.role,
      age: data.age,
      background: data.background,
      personality: data.personality,
      biases: data.biases,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      speakingStyle: data.speakingStyle,
      color: data.color,
      description: data.description || '',
      descriptionHe: data.descriptionHe,
      industry: data.industry,
      tags: data.tags || [],
      avatar: data.avatar,
      customPrompt: data.customPrompt,
      expertise: data.expertise,
      author: data.author,
      authorEmail: data.authorEmail,
    };

    const persona = await this.create(input);
    this.emitChange('imported', persona.id, persona);
    return persona;
  }

  /**
   * Export a persona to JSON
   */
  async export(id: string): Promise<string> {
    const persona = await this.get(id);
    if (!persona) {
      throw new Error(`Persona not found: ${id}`);
    }

    return JSON.stringify(persona, null, 2);
  }

  /**
   * Import built-in personas as editable custom personas
   */
  async importBuiltIns(): Promise<CustomPersona[]> {
    const imported: CustomPersona[] = [];

    for (const builtin of AGENT_PERSONAS) {
      const input: CreatePersonaInput = {
        name: builtin.name,
        nameHe: builtin.nameHe,
        role: builtin.role,
        age: builtin.age,
        background: builtin.background,
        personality: builtin.personality,
        biases: builtin.biases,
        strengths: builtin.strengths,
        weaknesses: builtin.weaknesses,
        speakingStyle: builtin.speakingStyle,
        color: builtin.color,
        description: `Imported from built-in: ${builtin.role}`,
        tags: ['built-in', 'imported'],
      };

      try {
        const persona = await this.create(input);
        imported.push(persona);
      } catch (err) {
        console.warn(`[PersonaManager] Failed to import ${builtin.name}:`, err);
      }
    }

    return imported;
  }

  // ==========================================================================
  // SESSION INTEGRATION
  // ==========================================================================

  /**
   * Apply custom personas to the current session.
   * Registers the specified personas as the active personas for debates.
   * 
   * @param personaIds - Array of persona IDs to activate
   * @returns The activated personas as AgentPersona array
   */
  async applyToSession(personaIds: string[]): Promise<CustomPersona[]> {
    await this.ensureInitialized();

    const personas: CustomPersona[] = [];

    for (const id of personaIds) {
      const persona = this.personas.get(id);
      if (persona) {
        personas.push(persona);
        await this.incrementUsage(id);
      }
    }

    if (personas.length === 0) {
      throw new Error('No valid personas found for the given IDs');
    }

    // Register with the global persona registry
    registerCustomPersonas(personas);

    return personas;
  }

  /**
   * Clear session personas and revert to built-in defaults
   */
  clearSessionPersonas(): void {
    clearCustomPersonas();
  }

  /**
   * Get personas that are compatible with a session's industry/domain
   */
  async getCompatiblePersonas(industry?: string, tags?: string[]): Promise<CustomPersona[]> {
    const filter: PersonaFilter = {};
    
    if (industry) {
      filter.industry = industry;
    }
    
    if (tags && tags.length > 0) {
      filter.tags = tags;
    }

    return this.list(filter, { field: 'usageCount', order: 'desc' });
  }

  // ==========================================================================
  // PERSONA SETS
  // ==========================================================================

  /**
   * Create a new persona set
   */
  async createSet(
    name: string,
    personaIds: string[],
    options?: {
      nameHe?: string;
      description?: string;
      descriptionHe?: string;
      expertise?: string;
      author?: string;
    }
  ): Promise<PersonaSet> {
    await this.ensureInitialized();

    const now = new Date().toISOString();
    const id = this.generateId(name);

    const set: PersonaSet = {
      id,
      name,
      nameHe: options?.nameHe,
      description: options?.description || '',
      descriptionHe: options?.descriptionHe,
      personaIds,
      expertise: options?.expertise,
      author: options?.author || 'user',
      createdAt: now,
      updatedAt: now,
    };

    // Validate persona IDs exist
    for (const pid of personaIds) {
      if (!this.personas.has(pid)) {
        throw new Error(`Persona not found: ${pid}`);
      }
    }

    // Save to disk
    const filePath = path.join(this.setsDir, `${id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(set, null, 2), 'utf-8');

    // Add to cache
    this.sets.set(id, set);

    return set;
  }

  /**
   * Get a persona set by ID
   */
  async getSet(id: string): Promise<PersonaSet | null> {
    await this.ensureInitialized();
    return this.sets.get(id) || null;
  }

  /**
   * List all persona sets
   */
  async listSets(): Promise<PersonaSet[]> {
    await this.ensureInitialized();
    return Array.from(this.sets.values());
  }

  /**
   * Delete a persona set
   */
  async deleteSet(id: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.sets.has(id)) {
      throw new Error(`Persona set not found: ${id}`);
    }

    // Delete from disk
    const filePath = path.join(this.setsDir, `${id}.json`);
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      // File might not exist
    }

    this.sets.delete(id);
  }

  /**
   * Apply a persona set to the current session
   */
  async applySetToSession(setId: string): Promise<CustomPersona[]> {
    const set = await this.getSet(setId);
    if (!set) {
      throw new Error(`Persona set not found: ${setId}`);
    }

    return this.applyToSession(set.personaIds);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  /**
   * Validate persona data
   */
  validate(persona: Partial<CustomPersona>): PersonaValidationResult {
    const errors: PersonaValidationError[] = [];
    const warnings: PersonaValidationWarning[] = [];

    // Required fields
    if (!persona.name || persona.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' });
    } else if (persona.name.length > MAX_NAME_LENGTH) {
      errors.push({
        field: 'name',
        message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
        code: 'MAX_LENGTH',
      });
    }

    if (!persona.nameHe || persona.nameHe.trim().length === 0) {
      errors.push({ field: 'nameHe', message: 'Hebrew name is required', code: 'REQUIRED' });
    }

    if (!persona.role || persona.role.trim().length === 0) {
      errors.push({ field: 'role', message: 'Role is required', code: 'REQUIRED' });
    }

    if (persona.age === undefined || persona.age < 18 || persona.age > 120) {
      errors.push({ field: 'age', message: 'Age must be between 18 and 120', code: 'INVALID_RANGE' });
    }

    if (!persona.background || persona.background.trim().length === 0) {
      errors.push({ field: 'background', message: 'Background is required', code: 'REQUIRED' });
    } else if (persona.background.length > MAX_BACKGROUND_LENGTH) {
      errors.push({
        field: 'background',
        message: `Background must be ${MAX_BACKGROUND_LENGTH} characters or less`,
        code: 'MAX_LENGTH',
      });
    }

    // Array fields
    if (!persona.personality || persona.personality.length < MIN_PERSONALITY_TRAITS) {
      errors.push({
        field: 'personality',
        message: `At least ${MIN_PERSONALITY_TRAITS} personality traits are required`,
        code: 'MIN_LENGTH',
      });
    } else if (persona.personality.length > MAX_PERSONALITY_TRAITS) {
      errors.push({
        field: 'personality',
        message: `Maximum ${MAX_PERSONALITY_TRAITS} personality traits allowed`,
        code: 'MAX_LENGTH',
      });
    }

    if (!persona.biases || persona.biases.length < MIN_BIASES) {
      errors.push({
        field: 'biases',
        message: `At least ${MIN_BIASES} bias is required`,
        code: 'MIN_LENGTH',
      });
    } else if (persona.biases.length > MAX_BIASES) {
      errors.push({
        field: 'biases',
        message: `Maximum ${MAX_BIASES} biases allowed`,
        code: 'MAX_LENGTH',
      });
    }

    if (!persona.strengths || persona.strengths.length < MIN_STRENGTHS) {
      errors.push({
        field: 'strengths',
        message: `At least ${MIN_STRENGTHS} strength is required`,
        code: 'MIN_LENGTH',
      });
    } else if (persona.strengths.length > MAX_STRENGTHS) {
      errors.push({
        field: 'strengths',
        message: `Maximum ${MAX_STRENGTHS} strengths allowed`,
        code: 'MAX_LENGTH',
      });
    }

    if (!persona.weaknesses || persona.weaknesses.length < MIN_WEAKNESSES) {
      errors.push({
        field: 'weaknesses',
        message: `At least ${MIN_WEAKNESSES} weakness is required`,
        code: 'MIN_LENGTH',
      });
    } else if (persona.weaknesses.length > MAX_WEAKNESSES) {
      errors.push({
        field: 'weaknesses',
        message: `Maximum ${MAX_WEAKNESSES} weaknesses allowed`,
        code: 'MAX_LENGTH',
      });
    }

    // Speaking style
    if (!persona.speakingStyle || persona.speakingStyle.trim().length === 0) {
      errors.push({ field: 'speakingStyle', message: 'Speaking style is required', code: 'REQUIRED' });
    } else if (persona.speakingStyle.length > MAX_SPEAKING_STYLE_LENGTH) {
      errors.push({
        field: 'speakingStyle',
        message: `Speaking style must be ${MAX_SPEAKING_STYLE_LENGTH} characters or less`,
        code: 'MAX_LENGTH',
      });
    }

    // Color
    if (!persona.color || !VALID_COLORS.includes(persona.color)) {
      errors.push({
        field: 'color',
        message: `Color must be one of: ${VALID_COLORS.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Warnings for optional but recommended fields
    if (!persona.description || persona.description.trim().length === 0) {
      warnings.push({
        field: 'description',
        message: 'Description is recommended for marketplace visibility',
        code: 'RECOMMENDED',
      });
    }

    if (!persona.tags || persona.tags.length === 0) {
      warnings.push({
        field: 'tags',
        message: 'Tags are recommended for discoverability',
        code: 'RECOMMENDED',
      });
    }

    if (!persona.industry) {
      warnings.push({
        field: 'industry',
        message: 'Industry is recommended for filtering',
        code: 'RECOMMENDED',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateId(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const shortUuid = uuidv4().slice(0, 8);
    return `${slug}-${shortUuid}`;
  }

  private async savePersona(persona: CustomPersona): Promise<void> {
    const filePath = path.join(this.personasDir, `${persona.id}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(persona, null, 2), 'utf-8');
  }

  private applyFilter(personas: CustomPersona[], filter: PersonaFilter): CustomPersona[] {
    return personas.filter((p) => {
      if (filter.industry && p.industry !== filter.industry) return false;
      if (filter.author && p.author !== filter.author) return false;
      if (filter.favoritesOnly && !p.isFavorite) return false;
      if (filter.builtInOnly && !p.isBuiltIn) return false;
      if (filter.customOnly && p.isBuiltIn) return false;

      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some((t) => p.tags.includes(t));
        if (!hasMatchingTag) return false;
      }

      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(searchLower) ||
          p.nameHe.includes(filter.search) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.role.toLowerCase().includes(searchLower);
        if (!matches) return false;
      }

      return true;
    });
  }

  private applySort(personas: CustomPersona[], sort: PersonaSort): CustomPersona[] {
    return [...personas].sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'usageCount':
          comparison = a.usageCount - b.usageCount;
          break;
      }

      return sort.order === 'desc' ? -comparison : comparison;
    });
  }

  private emitChange(
    type: PersonaChangeEvent['type'],
    personaId: string,
    persona?: CustomPersona
  ): void {
    const event: PersonaChangeEvent = {
      type,
      personaId,
      persona,
      timestamp: new Date().toISOString(),
    };
    this.emit('change', event);
  }

  // ==========================================================================
  // STATIC HELPERS
  // ==========================================================================

  /**
   * Get the default personas directory path
   */
  static getDefaultPersonasDir(): string {
    return DEFAULT_PERSONAS_DIR;
  }

  /**
   * Check if the personas directory exists
   */
  static async personasDirExists(): Promise<boolean> {
    try {
      await fs.promises.access(DEFAULT_PERSONAS_DIR);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: PersonaManager | null = null;

/**
 * Get the singleton PersonaManager instance
 */
export function getPersonaManager(): PersonaManager {
  if (!instance) {
    instance = new PersonaManager();
  }
  return instance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetPersonaManager(): void {
  instance = null;
}
