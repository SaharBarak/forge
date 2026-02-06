/**
 * Industry Personas Tests
 * 
 * Tests for the 10 pre-built industry personas.
 */

import { describe, test, expect } from 'vitest';
import {
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
} from '../industry-personas';

// ============================================================================
// COLLECTION TESTS
// ============================================================================

describe('Industry Personas Collection', () => {
  test('should have exactly 10 industry personas', () => {
    expect(INDUSTRY_PERSONAS).toHaveLength(10);
  });

  test('should cover all 10 required industries', () => {
    const industries = getAvailableIndustries();
    
    expect(industries).toContain('Healthcare');
    expect(industries).toContain('Finance');
    expect(industries).toContain('Education');
    expect(industries).toContain('Retail');
    expect(industries).toContain('Technology');
    expect(industries).toContain('Legal');
    expect(industries).toContain('Real Estate');
    expect(industries).toContain('Hospitality');
    expect(industries).toContain('Non-profit');
    expect(industries).toContain('Government');
  });

  test('should have unique IDs for all personas', () => {
    const ids = INDUSTRY_PERSONAS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test('all personas should be marked as built-in', () => {
    for (const persona of INDUSTRY_PERSONAS) {
      expect(persona.isBuiltIn).toBe(true);
    }
  });

  test('all personas should be published', () => {
    for (const persona of INDUSTRY_PERSONAS) {
      expect(persona.isPublished).toBe(true);
    }
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('getIndustryPersona', () => {
  test('should find persona by industry name (case-insensitive)', () => {
    expect(getIndustryPersona('healthcare')?.id).toBe('industry-healthcare');
    expect(getIndustryPersona('HEALTHCARE')?.id).toBe('industry-healthcare');
    expect(getIndustryPersona('Healthcare')?.id).toBe('industry-healthcare');
  });

  test('should return undefined for unknown industry', () => {
    expect(getIndustryPersona('Unknown')).toBeUndefined();
    expect(getIndustryPersona('Aerospace')).toBeUndefined();
  });
});

describe('getIndustryPersonaById', () => {
  test('should find persona by ID', () => {
    expect(getIndustryPersonaById('industry-healthcare')?.name).toBe('Dr. Sarah');
    expect(getIndustryPersonaById('industry-tech')?.name).toBe('Alex');
  });

  test('should return undefined for unknown ID', () => {
    expect(getIndustryPersonaById('unknown')).toBeUndefined();
    expect(getIndustryPersonaById('industry-unknown')).toBeUndefined();
  });
});

describe('getAvailableIndustries', () => {
  test('should return exactly 10 industries', () => {
    const industries = getAvailableIndustries();
    expect(industries).toHaveLength(10);
  });

  test('should return strings only', () => {
    const industries = getAvailableIndustries();
    for (const industry of industries) {
      expect(typeof industry).toBe('string');
    }
  });
});

// ============================================================================
// INDIVIDUAL PERSONA VALIDATION
// ============================================================================

describe('Persona Structure Validation', () => {
  const requiredFields = [
    'id',
    'name',
    'nameHe',
    'role',
    'age',
    'background',
    'personality',
    'biases',
    'strengths',
    'weaknesses',
    'speakingStyle',
    'color',
    'version',
    'author',
    'industry',
    'tags',
    'description',
    'descriptionHe',
    'expertise',
    'customPrompt',
  ] as const;

  for (const persona of INDUSTRY_PERSONAS) {
    describe(`${persona.industry} Persona (${persona.name})`, () => {
      test('should have all required fields', () => {
        for (const field of requiredFields) {
          expect(persona).toHaveProperty(field);
          expect(persona[field]).toBeDefined();
        }
      });

      test('should have valid personality array (4-5 items)', () => {
        expect(Array.isArray(persona.personality)).toBe(true);
        expect(persona.personality.length).toBeGreaterThanOrEqual(4);
        expect(persona.personality.length).toBeLessThanOrEqual(5);
      });

      test('should have valid biases array (3-4 items)', () => {
        expect(Array.isArray(persona.biases)).toBe(true);
        expect(persona.biases.length).toBeGreaterThanOrEqual(3);
        expect(persona.biases.length).toBeLessThanOrEqual(4);
      });

      test('should have valid strengths array (3-4 items)', () => {
        expect(Array.isArray(persona.strengths)).toBe(true);
        expect(persona.strengths.length).toBeGreaterThanOrEqual(3);
        expect(persona.strengths.length).toBeLessThanOrEqual(4);
      });

      test('should have valid weaknesses array (2 items)', () => {
        expect(Array.isArray(persona.weaknesses)).toBe(true);
        expect(persona.weaknesses.length).toBe(2);
      });

      test('should have valid age (25-70)', () => {
        expect(persona.age).toBeGreaterThanOrEqual(25);
        expect(persona.age).toBeLessThanOrEqual(70);
      });

      test('should have valid color', () => {
        const validColors = ['pink', 'green', 'purple', 'orange', 'blue', 'cyan', 'yellow', 'red', 'gray'];
        expect(validColors).toContain(persona.color);
      });

      test('should have meaningful background (100+ chars)', () => {
        expect(persona.background.length).toBeGreaterThan(100);
      });

      test('should have meaningful expertise section', () => {
        expect(persona.expertise).toBeDefined();
        expect(persona.expertise!.length).toBeGreaterThan(200);
        expect(persona.expertise).toContain('##'); // Should have markdown headers
      });

      test('should have meaningful custom prompt', () => {
        expect(persona.customPrompt).toBeDefined();
        expect(persona.customPrompt!.length).toBeGreaterThan(50);
      });

      test('should have Hebrew name', () => {
        // Check that Hebrew name contains Hebrew characters
        expect(persona.nameHe).toMatch(/[\u0590-\u05FF]/);
      });

      test('should have Hebrew description', () => {
        expect(persona.descriptionHe).toMatch(/[\u0590-\u05FF]/);
      });

      test('should have industry-specific tags', () => {
        expect(persona.tags).toBeDefined();
        expect(persona.tags!.length).toBeGreaterThanOrEqual(3);
      });

      test('ID should follow industry-{name} pattern', () => {
        expect(persona.id).toMatch(/^industry-[a-z]+$/);
      });
    });
  }
});

// ============================================================================
// SPECIFIC PERSONA EXPORTS
// ============================================================================

describe('Named Persona Exports', () => {
  test('HEALTHCARE_PERSONA should be Dr. Sarah', () => {
    expect(HEALTHCARE_PERSONA.name).toBe('Dr. Sarah');
    expect(HEALTHCARE_PERSONA.industry).toBe('Healthcare');
  });

  test('FINANCE_PERSONA should be David', () => {
    expect(FINANCE_PERSONA.name).toBe('David');
    expect(FINANCE_PERSONA.industry).toBe('Finance');
  });

  test('EDUCATION_PERSONA should be Prof. Maya', () => {
    expect(EDUCATION_PERSONA.name).toBe('Prof. Maya');
    expect(EDUCATION_PERSONA.industry).toBe('Education');
  });

  test('RETAIL_PERSONA should be Rachel', () => {
    expect(RETAIL_PERSONA.name).toBe('Rachel');
    expect(RETAIL_PERSONA.industry).toBe('Retail');
  });

  test('TECH_PERSONA should be Alex', () => {
    expect(TECH_PERSONA.name).toBe('Alex');
    expect(TECH_PERSONA.industry).toBe('Technology');
  });

  test('LEGAL_PERSONA should be Attorney Lisa', () => {
    expect(LEGAL_PERSONA.name).toBe('Attorney Lisa');
    expect(LEGAL_PERSONA.industry).toBe('Legal');
  });

  test('REAL_ESTATE_PERSONA should be Marcus', () => {
    expect(REAL_ESTATE_PERSONA.name).toBe('Marcus');
    expect(REAL_ESTATE_PERSONA.industry).toBe('Real Estate');
  });

  test('HOSPITALITY_PERSONA should be Sofia', () => {
    expect(HOSPITALITY_PERSONA.name).toBe('Sofia');
    expect(HOSPITALITY_PERSONA.industry).toBe('Hospitality');
  });

  test('NONPROFIT_PERSONA should be Rev. James', () => {
    expect(NONPROFIT_PERSONA.name).toBe('Rev. James');
    expect(NONPROFIT_PERSONA.industry).toBe('Non-profit');
  });

  test('GOVERNMENT_PERSONA should be Director Chen', () => {
    expect(GOVERNMENT_PERSONA.name).toBe('Director Chen');
    expect(GOVERNMENT_PERSONA.industry).toBe('Government');
  });
});

// ============================================================================
// CONTENT QUALITY TESTS
// ============================================================================

describe('Content Quality', () => {
  test('all personas should have unique names', () => {
    const names = INDUSTRY_PERSONAS.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  test('all personas should have unique colors (or at most 2 share)', () => {
    const colors = INDUSTRY_PERSONAS.map((p) => p.color);
    const colorCounts = new Map<string, number>();
    for (const color of colors) {
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
    // Allow at most 2 personas per color (we have 10 personas and ~8 colors)
    for (const count of colorCounts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  test('all expertise sections should cover industry-specific topics', () => {
    for (const persona of INDUSTRY_PERSONAS) {
      // Each expertise should contain industry-relevant keywords
      const industryKeywords: Record<string, string[]> = {
        Healthcare: ['HIPAA', 'FDA', 'patient', 'clinical', 'medical'],
        Finance: ['SEC', 'FINRA', 'disclosure', 'risk', 'fiduciary'],
        Education: ['student', 'learning', 'accreditation', 'outcomes'],
        Retail: ['conversion', 'product', 'CTA', 'customer'],
        Technology: ['developer', 'API', 'SaaS', 'technical'],
        Legal: ['bar', 'compliance', 'attorney', 'disclaimer'],
        'Real Estate': ['fair housing', 'property', 'listing'],
        Hospitality: ['guest', 'experience', 'hotel', 'hospitality'],
        'Non-profit': ['donor', 'impact', 'fundraising', 'mission'],
        Government: ['plain language', 'accessibility', 'Section 508', 'citizen'],
      };

      const keywords = industryKeywords[persona.industry!] || [];
      const expertiseLower = persona.expertise!.toLowerCase();
      
      // At least half of the keywords should appear
      const matchingKeywords = keywords.filter((kw) => 
        expertiseLower.includes(kw.toLowerCase())
      );
      expect(matchingKeywords.length).toBeGreaterThanOrEqual(Math.ceil(keywords.length / 2));
    }
  });
});
