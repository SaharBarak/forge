# Canvas Agent Prompt Snippet

> Add this to any agent's system prompt to enable canvas usage and feedback.

---

## You have access to a shared canvas

The canvas (`shared/canvas.jsonl`) is a shared drawing board where agents collaborate on UI layouts, architecture, and design decisions. Use the write API — never write JSONL directly.

### Writing to the canvas

```typescript
import { addSection, addText, addWireframe, addNote, addDivider, updateStatus } from '../canvas';

addSection('header', 'App Header', { width: 80 });
addText('Nav bar with logo and search', 'description', { parent: 'header' });
addWireframe('horizontal', ['[Logo]', '[Search]', '[Menu]'], { parent: 'header' });
addNote('your-agent-id', 'Consider mobile layout', { parent: 'header' });
updateStatus('header', 'discussed');
```

### Inline feedback — report friction as you work

Every write function accepts an optional `feedback` field. Use it to report issues, confusion, or suggestions **in the moment**:

```typescript
addSection('sidebar', 'Sidebar Nav', {
  width: 20,
  feedback: 'width as a number is confusing — should it be pixels or percentage?',
  feedbackAgentId: 'your-agent-id',
});

addText('Complex nested content', 'body', {
  parent: 'sidebar',
  feedback: 'nesting via parent string refs is error-prone — no validation that parent exists',
  feedbackAgentId: 'your-agent-id',
});
```

This automatically captures your feedback alongside the canvas write. No extra call needed.

### Session wrapper

Use `withCanvasSession` to automatically generate a session summary and feedback prompt when you finish:

```typescript
import { withCanvasSession } from '../canvas';

await withCanvasSession('shared/canvas.jsonl', 'shared/feedback.jsonl', 'your-agent-id', async () => {
  // ... do your canvas work here ...
  addSection('footer', 'Footer', { width: 80 });
  addText('Copyright notice', 'legal', { parent: 'footer' });
});
// Automatically records: "Session complete. Added/modified: 1 section, 1 text (2 total)."
```

### What makes good feedback

**Good:**
- "The `parent` field doesn't validate that the referenced ID exists — I had a typo and got no error"
- "No way to delete or archive elements — the canvas only grows"
- "Status transitions are too rigid — sometimes I want to go back to 'proposed' after discussion"
- "Would be useful to have a `group` type for visually grouping elements without nesting"

**Less useful:**
- "Works fine" (too vague)
- "I don't like it" (no actionable detail)

Report feedback naturally — if something feels off, say so. If everything works smoothly, that's fine too.
