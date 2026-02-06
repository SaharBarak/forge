/**
 * Persona Marketplace Types
 * 
 * Defines interfaces for custom personas in the Persona Marketplace.
 */

import type { AgentPersona } from '../../types';

// ============================================================================
// CUSTOM PERSONA TYPES
// ============================================================================

/**
 * CustomPersona extends AgentPersona with marketplace-specific metadata.
 * Supports user-created personas, templates, and marketplace distribution.
 */
export interface CustomPersona extends AgentPersona {
  /** Unique identifier for the custom persona */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Hebrew name */
  nameHe: string;
  
  /** Version string for tracking updates */
  version: string;
  
  /** Author/creator identifier */
  author: string;
  
  /** Optional author email */
  authorEmail?: string;
  
  /** Industry or domain this persona is designed for */
  industry?: string;
  
  /** Tags for search and categorization */
  tags: string[];
  
  /** Short description for marketplace listing */
  description: string;
  
  /** Hebrew description */
  descriptionHe?: string;
  
  /** URL to avatar image */
  avatar?: string;
  
  /** Whether this persona is a built-in default */
  isBuiltIn: boolean;
  
  /** Whether this persona is marked as favorite */
  isFavorite: boolean;
  
  /** Whether this persona is published to marketplace */
  isPublished: boolean;
  
  /** Usage count for analytics */
  usageCount: number;
  
  /** ISO timestamp of creation */
  createdAt: string;
  
  /** ISO timestamp of last update */
  updatedAt: string;
  
  /** Optional custom system prompt additions */
  customPrompt?: string;
  
  /** Domain-specific expertise (markdown) */
  expertise?: string;
}

/**
 * Minimal input for creating a new persona
 */
export interface CreatePersonaInput {
  name: string;
  nameHe: string;
  role: string;
  age: number;
  background: string;
  personality: string[];
  biases: string[];
  strengths: string[];
  weaknesses: string[];
  speakingStyle: string;
  color: string;
  description: string;
  descriptionHe?: string;
  industry?: string;
  tags?: string[];
  avatar?: string;
  customPrompt?: string;
  expertise?: string;
  author?: string;
  authorEmail?: string;
}

/**
 * Update input for modifying an existing persona
 */
export interface UpdatePersonaInput {
  name?: string;
  nameHe?: string;
  role?: string;
  age?: number;
  background?: string;
  personality?: string[];
  biases?: string[];
  strengths?: string[];
  weaknesses?: string[];
  speakingStyle?: string;
  color?: string;
  description?: string;
  descriptionHe?: string;
  industry?: string;
  tags?: string[];
  avatar?: string;
  customPrompt?: string;
  expertise?: string;
  isFavorite?: boolean;
  isPublished?: boolean;
}

/**
 * Filter options for listing personas
 */
export interface PersonaFilter {
  /** Filter by industry */
  industry?: string;
  
  /** Filter by tags (any match) */
  tags?: string[];
  
  /** Filter by author */
  author?: string;
  
  /** Include only favorites */
  favoritesOnly?: boolean;
  
  /** Include only built-in personas */
  builtInOnly?: boolean;
  
  /** Include only custom (non-built-in) personas */
  customOnly?: boolean;
  
  /** Search query for name, description, role */
  search?: string;
}

/**
 * Sort options for listing personas
 */
export interface PersonaSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'usageCount';
  order: 'asc' | 'desc';
}

/**
 * Validation result for persona data
 */
export interface PersonaValidationResult {
  valid: boolean;
  errors: PersonaValidationError[];
  warnings: PersonaValidationWarning[];
}

export interface PersonaValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PersonaValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Persona set - a collection of personas for a specific domain/project
 */
export interface PersonaSet {
  id: string;
  name: string;
  nameHe?: string;
  description: string;
  descriptionHe?: string;
  personaIds: string[];
  expertise?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event emitted when persona data changes
 */
export interface PersonaChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'imported' | 'favorited';
  personaId: string;
  persona?: CustomPersona;
  timestamp: string;
}
