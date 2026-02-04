# Epic: Persona Marketplace

## Overview

Enable users to create, customize, and share agent personas through an intuitive UI and optional community marketplace.

## Problem Statement

Currently, personas are hardcoded (5 default Israeli tech personas). Users need:
- **Custom personas** tailored to their specific audience segments
- **Industry-specific personas** (healthcare, finance, education, etc.)
- **Multi-language personas** beyond Hebrew/English
- **Community sharing** to benefit from others' persona designs

## Proposed Solution

### Persona Creator UI

1. **Persona Builder Wizard**
   - Name, avatar, background story
   - Communication style (formal/casual, verbose/terse)
   - Biases and perspectives
   - Language preferences
   - Sample responses for calibration

2. **Persona Testing Sandbox**
   - Test persona responses before using in session
   - Side-by-side comparison with existing personas
   - Adjust parameters in real-time

### Persona Data Structure

```typescript
interface CustomPersona {
  id: string;
  name: string;
  displayName: string;
  avatar?: string;
  
  // Core identity
  background: string;          // Backstory and context
  role: string;                // Professional role
  perspective: string;         // Worldview and biases
  
  // Communication
  communicationStyle: {
    formality: 'formal' | 'casual' | 'mixed';
    verbosity: 'terse' | 'balanced' | 'verbose';
    tone: 'supportive' | 'challenging' | 'neutral';
    humor: 'none' | 'occasional' | 'frequent';
  };
  
  // Behavior
  decisionStyle: 'analytical' | 'intuitive' | 'balanced';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  focusAreas: string[];        // Topics they care about
  
  // Language
  primaryLanguage: string;
  secondaryLanguages: string[];
  
  // System prompt components
  systemPromptAdditions?: string;
  exampleResponses?: string[];
  
  // Metadata
  author?: string;
  version: string;
  tags: string[];
  isPublic: boolean;
  downloads?: number;
}
```

### Local Persona Management

- Store in `~/.forge/personas/`
- Import/export as JSON
- Duplicate and modify existing personas
- Archive/delete unused personas

### Community Marketplace (Phase 2)

- Browse public personas by category/industry
- Preview persona behavior before download
- Rate and review personas
- Featured/trending personas

## Affected Components

| Component | Changes |
|-----------|---------|
| `src/agents/personas.ts` | Support custom persona loading |
| `src/types/index.ts` | Add `CustomPersona` interface |
| `src/lib/personas/` | New module for persona CRUD |
| `src/lib/personas/PersonaManager.ts` | Load, save, validate personas |
| `src/lib/personas/PersonaBuilder.ts` | Wizard logic and validation |
| `src/components/personas/` | PersonaCreator, PersonaLibrary, PersonaSandbox |
| `electron/main.js` | IPC handlers for persona operations |
| CLI | `forge persona create`, `forge persona list` |

## Success Criteria

- [ ] Persona creator wizard in UI
- [ ] Custom personas saved to `~/.forge/personas/`
- [ ] Persona testing sandbox with live preview
- [ ] Import/export personas as JSON
- [ ] CLI persona management commands
- [ ] At least 10 pre-built industry personas available
- [ ] Custom personas work seamlessly in sessions

## Implementation Phases

### Phase 1: Persona Data Model
- Define `CustomPersona` interface
- Implement PersonaManager for CRUD
- Migration path for existing personas

### Phase 2: Creator Wizard
- Multi-step wizard UI
- Form validation and preview
- Save to local storage

### Phase 3: Testing Sandbox
- Isolated test environment
- Side-by-side comparison
- Quick iteration loop

### Phase 4: Library & Management
- Persona library view
- Import/export functionality
- Duplicate/archive/delete

### Phase 5: Pre-built Personas
- Create 10 industry personas
- Healthcare, Finance, Education, Retail, Tech, etc.

### Phase 6: Marketplace (Future)
- Backend API for sharing
- Browse/search/filter
- Rating system

## Estimated Effort

- **Backend (BE)**: 4 days
- **Frontend (FE)**: 5 days
- **QA**: 2 days
- **Total**: ~11 days (excludes marketplace backend)

## Dependencies

None for local features. Marketplace requires backend infrastructure.

## Risks

| Risk | Mitigation |
|------|------------|
| Persona quality variance | Validation rules, example personas |
| Complex wizard UX | Progressive disclosure, defaults |
| Persona conflicts | Unique ID system, versioning |
