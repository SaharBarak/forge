# Canvas Protocol

**Issue:** [#56](https://github.com/SaharBarak/forge/issues/56) — Canvas JSON Schema & Protocol Definition  
**Parent Epic:** [#55](https://github.com/SaharBarak/forge/issues/55) — Shared Drawing Board

## File Format

- **Location:** `shared/canvas.jsonl` (append-only JSONL)
- Each line is a self-contained JSON object representing one canvas element
- Every element **MUST** have a `type` field
- Elements with an `id` are referenceable; later entries with the same `id` override earlier ones (**last-write-wins**)

## Element Types

| Type | Required Fields | Optional Fields |
|------|----------------|-----------------|
| `section` | `id`, `label`, `width` | `status`, `parent` |
| `text` | `content`, `role` | `parent`, `style` |
| `wireframe` | `id`, `layout`, `elements` | `parent`, `status` |
| `divider` | — | `style` |
| `note` | `author`, `text` | `parent` |

All elements also receive a `ts` (ISO 8601 timestamp) when written via the API.

## Nesting

Use the `parent` field to reference another element's `id`. This creates a logical tree structure — sections can contain text, wireframes, notes, and even sub-sections.

## Consensus Protocol (Status)

Elements that support status (`section`, `wireframe`) follow this progression:

```
proposed → discussed → agreed
```

### Rules

1. New elements default to `proposed`
2. Status can only move **forward**: proposed → discussed → agreed
3. Backward transitions are **not allowed**
4. To update status, append a new line with the same `id` and the new status (last-write-wins)

## Agent Write API

Agents should **never** write JSONL directly. Use the API from `src/canvas/api.ts`:

```typescript
import { addSection, addText, addWireframe, addNote, addDivider, updateStatus } from '../canvas';

addSection('header', 'App Header', { width: 80 });
addText('Navigation bar description', 'description', { parent: 'header' });
addWireframe('horizontal', ['[Logo]', '[Search]', '[Menu]'], { parent: 'header' });
addNote('forge-architect', 'Consider mobile layout', { parent: 'header' });
addDivider({ style: 'double' });
updateStatus('header', 'discussed');
updateStatus('header', 'agreed');
```

## Schema Validation

JSON Schema: `schemas/canvas.schema.json`

Each line in the JSONL file validates independently against this schema.
