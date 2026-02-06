/**
 * Persona Marketplace Module
 * 
 * Provides persona management infrastructure for the Copywrite Think Tank.
 * 
 * @module lib/personas
 */

// Types
export type {
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

// Manager
export {
  PersonaManager,
  getPersonaManager,
  resetPersonaManager,
} from './PersonaManager';
