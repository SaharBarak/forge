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

// Industry Personas
export {
  INDUSTRY_PERSONAS,
  HEALTHCARE_PERSONA,
  FINANCE_PERSONA,
  EDUCATION_PERSONA,
  RETAIL_PERSONA,
  TECH_PERSONA,
  LEGAL_PERSONA,
  REAL_ESTATE_PERSONA,
  HOSPITALITY_PERSONA,
  NONPROFIT_PERSONA,
  GOVERNMENT_PERSONA,
  getIndustryPersona,
  getIndustryPersonaById,
  getAvailableIndustries,
} from './industry-personas';
