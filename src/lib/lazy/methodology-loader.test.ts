/**
 * Tests for methodology lazy loader
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadMethodologies,
  getArgumentationGuide,
  getConsensusGuide,
  getVisualDecisionRules,
  getStructureDecisionRules,
  getPhaseMethodology,
  getMethodologyPrompt,
  getDefaultMethodology,
  getDefaultPhases,
} from './methodology-loader';

describe('methodology-loader', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('loadMethodologies', () => {
    it('should load the methodologies module', async () => {
      const module = await loadMethodologies();

      expect(module).toBeDefined();
      expect(module.ARGUMENTATION_GUIDES).toBeDefined();
      expect(module.CONSENSUS_GUIDES).toBeDefined();
    });

    it('should cache the loaded module', async () => {
      const module1 = await loadMethodologies();
      const module2 = await loadMethodologies();

      expect(module1).toBe(module2);
    });
  });

  describe('getArgumentationGuide', () => {
    it('should return dialectic guide', async () => {
      const guide = await getArgumentationGuide('dialectic');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Dialectic Method');
      expect(guide.nameHe).toBe('שיטה דיאלקטית');
    });

    it('should return socratic guide', async () => {
      const guide = await getArgumentationGuide('socratic');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Socratic Method');
    });

    it('should return collaborative guide', async () => {
      const guide = await getArgumentationGuide('collaborative');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Collaborative Building');
    });

    it('should return adversarial guide', async () => {
      const guide = await getArgumentationGuide('adversarial');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Adversarial Debate');
    });

    it('should return mixed guide', async () => {
      const guide = await getArgumentationGuide('mixed');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Mixed Methods');
    });
  });

  describe('getConsensusGuide', () => {
    it('should return unanimous guide', async () => {
      const guide = await getConsensusGuide('unanimous');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Unanimous Agreement');
      expect(guide.threshold).toBe(1.0);
    });

    it('should return supermajority guide', async () => {
      const guide = await getConsensusGuide('supermajority');

      expect(guide).toBeDefined();
      expect(guide.threshold).toBe(0.67);
    });

    it('should return majority guide', async () => {
      const guide = await getConsensusGuide('majority');

      expect(guide).toBeDefined();
      expect(guide.threshold).toBe(0.5);
    });

    it('should return consent guide', async () => {
      const guide = await getConsensusGuide('consent');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Consent-Based');
    });

    it('should return synthesis guide', async () => {
      const guide = await getConsensusGuide('synthesis');

      expect(guide).toBeDefined();
      expect(guide.name).toBe('Synthesis');
    });
  });

  describe('getVisualDecisionRules', () => {
    it('should return visual decision rules array', async () => {
      const rules = await getVisualDecisionRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have condition and recommendedVisual fields', async () => {
      const rules = await getVisualDecisionRules();

      rules.forEach((rule) => {
        expect(rule.condition).toBeDefined();
        expect(rule.recommendedVisual).toBeDefined();
        expect(rule.reasoning).toBeDefined();
      });
    });
  });

  describe('getStructureDecisionRules', () => {
    it('should return structure decision rules array', async () => {
      const rules = await getStructureDecisionRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });

    it('should have condition and recommendedStructure fields', async () => {
      const rules = await getStructureDecisionRules();

      rules.forEach((rule) => {
        expect(rule.condition).toBeDefined();
        expect(rule.recommendedStructure).toBeDefined();
        expect(rule.reasoning).toBeDefined();
      });
    });
  });

  describe('getPhaseMethodology', () => {
    it('should return methodology for initialization phase', async () => {
      const methodology = await getPhaseMethodology('initialization');

      expect(methodology).toBeDefined();
      expect(methodology.argumentationStyle).toBe('collaborative');
      expect(methodology.consensusMethod).toBe('consent');
    });

    it('should return methodology for argumentation phase', async () => {
      const methodology = await getPhaseMethodology('argumentation');

      expect(methodology).toBeDefined();
      expect(methodology.argumentationStyle).toBe('dialectic');
      expect(methodology.consensusMethod).toBe('supermajority');
    });

    it('should return methodology for consensus phase', async () => {
      const methodology = await getPhaseMethodology('consensus');

      expect(methodology).toBeDefined();
      expect(methodology.argumentationStyle).toBe('mixed');
      expect(methodology.consensusMethod).toBe('unanimous');
    });
  });

  describe('getMethodologyPrompt', () => {
    it('should return a prompt string', async () => {
      const config = await getDefaultMethodology();
      const prompt = await getMethodologyPrompt(config);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include argumentation methodology', async () => {
      const config = await getDefaultMethodology();
      const prompt = await getMethodologyPrompt(config);

      expect(prompt).toContain('ARGUMENTATION METHODOLOGY');
    });

    it('should include consensus method', async () => {
      const config = await getDefaultMethodology();
      const prompt = await getMethodologyPrompt(config);

      expect(prompt).toContain('CONSENSUS METHOD');
    });

    it('should include phase context when phase provided', async () => {
      const config = await getDefaultMethodology();
      const prompt = await getMethodologyPrompt(config, 'argumentation');

      expect(prompt).toContain('CURRENT PHASE');
      expect(prompt).toContain('ARGUMENTATION');
    });
  });

  describe('getDefaultMethodology', () => {
    it('should return a valid methodology config', async () => {
      const config = await getDefaultMethodology();

      expect(config).toBeDefined();
      expect(config.argumentationStyle).toBeDefined();
      expect(config.consensusMethod).toBeDefined();
      expect(config.visualDecisionRules).toBeDefined();
      expect(config.structureDecisionRules).toBeDefined();
      expect(config.phases).toBeDefined();
    });

    it('should return mixed argumentation style by default', async () => {
      const config = await getDefaultMethodology();

      expect(config.argumentationStyle).toBe('mixed');
    });

    it('should return consent consensus method by default', async () => {
      const config = await getDefaultMethodology();

      expect(config.consensusMethod).toBe('consent');
    });
  });

  describe('getDefaultPhases', () => {
    it('should return phases array', async () => {
      const phases = await getDefaultPhases();

      expect(Array.isArray(phases)).toBe(true);
      expect(phases.length).toBeGreaterThan(0);
    });

    it('should include all session phases', async () => {
      const phases = await getDefaultPhases();
      const phaseNames = phases.map((p) => p.phase);

      expect(phaseNames).toContain('initialization');
      expect(phaseNames).toContain('brainstorming');
      expect(phaseNames).toContain('argumentation');
      expect(phaseNames).toContain('synthesis');
      expect(phaseNames).toContain('consensus');
      expect(phaseNames).toContain('finalization');
    });

    it('should have required fields for each phase', async () => {
      const phases = await getDefaultPhases();

      phases.forEach((phase) => {
        expect(phase.phase).toBeDefined();
        expect(phase.description).toBeDefined();
        expect(phase.maxRounds).toBeDefined();
        expect(phase.requiredActions).toBeDefined();
        expect(phase.exitConditions).toBeDefined();
      });
    });
  });
});
