# Epic: Session Templates

## Overview

Enable users to start sessions from pre-built templates for common copywriting workflows, reducing setup friction and encoding best practices.

## Problem Statement

Currently, users must configure every session from scratch:
- Select mode, methodology, consensus method
- Define goals and context
- Choose agents

This creates friction for repetitive workflows and makes it harder for new users to experience the value of structured deliberation.

## Proposed Solution

### Template System

1. **Built-in Templates** (5 starter templates)
   - Landing Page Copy
   - Email Campaign
   - Product Description
   - Social Media Series
   - Brand Messaging Workshop

2. **Template Structure**
   ```typescript
   interface SessionTemplate {
     id: string;
     name: string;
     description: string;
     category: 'copywriting' | 'strategy' | 'validation' | 'custom';
     
     // Pre-filled configuration
     mode: SessionMode;
     methodology: MethodologyType;
     consensusMethod: ConsensusMethod;
     defaultAgents: string[];
     
     // Guided setup
     prompts: {
       goal: string;        // Placeholder text
       context: string[];   // Required context types
     };
     
     // Post-session
     suggestedExports: ExportFormat[];
   }
   ```

3. **User Custom Templates**
   - Save current session config as template
   - Import/export templates as JSON
   - Templates stored in `~/.forge/templates/`

### UI Changes

1. **New Session Modal**
   - Template gallery with categories
   - Preview template configuration
   - "Start Fresh" option for power users

2. **Template Manager**
   - View/edit/delete custom templates
   - Duplicate and modify built-in templates

## Affected Components

| Component | Changes |
|-----------|---------|
| `SessionKernel` | Add `createFromTemplate(templateId)` command |
| `src/types/index.ts` | Add `SessionTemplate` interface |
| `src/lib/templates/` | New module for template management |
| `electron/main.js` | IPC handlers for template CRUD |
| `src/components/` | New `TemplateGallery`, `TemplateManager` components |
| CLI | `--template` flag for starting from template |

## Success Criteria

- [ ] 5 built-in templates available on first run
- [ ] Users can create custom templates from completed sessions
- [ ] Templates reduce average session setup time by 60%
- [ ] CLI supports `forge --template landing-page` workflow
- [ ] Templates can be imported/exported as JSON

## Implementation Phases

### Phase 1: Core Template System
- Define `SessionTemplate` interface
- Implement template loading/saving
- Add `createFromTemplate` to SessionKernel

### Phase 2: Built-in Templates
- Create 5 high-quality starter templates
- Write documentation for each template

### Phase 3: UI Integration
- Template gallery component
- Template manager for custom templates
- CLI `--template` flag

### Phase 4: Polish
- Template preview
- Template search/filter
- Import/export functionality

## Estimated Effort

- **Backend (BE)**: 3 days
- **Frontend (FE)**: 4 days
- **QA**: 2 days
- **Total**: ~9 days

## Dependencies

None - this is a standalone feature enhancement.

## Risks

| Risk | Mitigation |
|------|------------|
| Template bloat | Limit built-in templates to 5, clear naming |
| Stale templates | Version templates, migration on upgrade |
