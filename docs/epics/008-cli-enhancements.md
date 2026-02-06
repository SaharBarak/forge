# Epic: CLI Enhancements

## Overview

Expand the CLI with batch operations, scripting support, and improved developer experience for automation workflows.

## Problem Statement

Current CLI limitations:
- **No batch processing** for multiple briefs
- **Limited scripting** support (no JSON output mode)
- **No watch mode** for context file changes
- **Missing completions** for shells

## Proposed Solution

### Batch Processing

```bash
# Process multiple briefs
forge batch ./briefs/*.md --output ./output/

# Parallel execution
forge batch ./briefs/ --parallel 3 --output ./output/

# With template
forge batch ./briefs/ --template landing-page --output ./output/
```

### JSON Output Mode

```bash
# Machine-readable output for scripting
forge run --json --brief ./brief.md

# Output:
{
  "sessionId": "sess_abc123",
  "status": "completed",
  "decisions": [...],
  "drafts": [...],
  "duration": 245000
}
```

### Watch Mode

```bash
# Re-run on context changes
forge watch --context ./context/ --brief ./brief.md

# Auto-reload personas
forge watch --personas ./personas/
```

### Shell Completions

```bash
# Generate completions
forge completions bash > /etc/bash_completion.d/forge
forge completions zsh > ~/.zfunc/_forge
forge completions fish > ~/.config/fish/completions/forge.fish
```

### New Commands

```bash
# Session management
forge sessions list
forge sessions resume <id>
forge sessions delete <id>

# Template management
forge templates list
forge templates create <name>
forge templates export <name> > template.json
forge templates import < template.json

# Persona management
forge personas list
forge personas test <id>
forge personas export <id> > persona.json

# Export command
forge export <session-id> --format pdf --output ./report.pdf
```

### Configuration

```bash
# Config management
forge config get apiKey
forge config set defaultTemplate landing-page
forge config list

# Stored in ~/.forge/config.json
```

## Affected Components

| Component | Changes |
|-----------|---------|
| `cli/index.ts` | New commands and flags |
| `cli/commands/batch.ts` | Batch processing logic |
| `cli/commands/watch.ts` | File watching |
| `cli/commands/sessions.ts` | Session management |
| `cli/commands/templates.ts` | Template CLI |
| `cli/commands/personas.ts` | Persona CLI |
| `cli/completions/` | Shell completion generators |
| `cli/output/` | JSON/table output formatters |

## Success Criteria

- [ ] `forge batch` processes multiple briefs
- [ ] `--json` flag on all commands
- [ ] `forge watch` reacts to file changes
- [ ] Shell completions for bash/zsh/fish
- [ ] `forge sessions/templates/personas` subcommands
- [ ] `forge config` for settings management
- [ ] Exit codes follow conventions (0=success, 1=error)

## Implementation Phases

### Phase 1: Output Formatting
- JSON output mode
- Table output mode
- Exit code standardization

### Phase 2: Session/Template/Persona Commands
- List/show/delete subcommands
- Import/export functionality

### Phase 3: Batch Processing
- Multi-brief processing
- Parallel execution
- Progress reporting

### Phase 4: Watch Mode
- File system watching
- Debounced re-execution
- Clear screen between runs

### Phase 5: Shell Completions
- Bash completions
- Zsh completions
- Fish completions

## Estimated Effort

- **Backend (BE)**: 4 days
- **QA**: 2 days
- **Total**: ~6 days

## Dependencies

- chokidar for file watching
- Commander.js (already using)

## Risks

| Risk | Mitigation |
|------|------------|
| Cross-platform issues | Test on Mac/Linux/Windows |
| Shell completion complexity | Start with bash only |
