# Forge

A multi-agent deliberation engine. Watch AI agents debate, argue, and collaborate to reach consensus through structured debate.

**[View Documentation Site](https://yourusername.github.io/forge/)**

![Forge Screenshot](docs/screenshot.png)

## Features

- **Dynamic Agent Personas**: Generate domain-specific personas for any topic, or use built-in defaults. Save and reuse persona sets across sessions.
- **Researcher Agents**: Specialized agents for data, competitors, audience, examples, and local context
- **Human Participation**: Join the discussion, guide the debate, or just observe
- **Methodology Framework**: Structured argumentation and consensus-building methods
- **Visual & Structure Decision Guides**: Built-in rules for when to use graphs, text, bullets, etc.
- **Multi-language Support**: English, Hebrew (RTL), and mixed-language sessions
- **Context Scanning**: Load brand, audience, and research context from files
- **Session Export**: Save discussions, decisions, and drafts

## Persona System

Forge uses a flexible persona system instead of hardcoded agents:

- **Generate**: AI-powered persona generation tailored to your project topic and domain
- **Built-in**: A set of default personas available out of the box
- **Saved Sets**: Previously generated persona sets stored in `personas/` for reuse

During Quick Start and New Session flows, you choose which personas should debate. Generated personas include domain expertise and specialized skills.

## Argumentation Methodologies

- **Dialectic**: Thesis → Antithesis → Synthesis
- **Socratic**: Question-driven exploration
- **Collaborative**: "Yes, and..." building approach
- **Adversarial**: Strong opposing viewpoints

## Consensus Methods

- **Unanimous**: All must agree
- **Supermajority**: 2/3 must agree
- **Majority**: 50%+ must agree
- **Consent**: No strong objections
- **Synthesis**: Combine elements from all

## Quick Start

### CLI (Interactive Mode)

```bash
# Install dependencies
npm install

# Build the CLI
npm run cli:build

# Run interactive mode
npx tsx cli/index.ts
```

The interactive menu offers:
- **Quick Start** — enter a goal, pick language and persona source, jump into a session
- **New Session** — full configuration wizard (project, personas, agents, language, mode)
- **Preferences** — set default language (persisted to `~/.forge/preferences.json`)
- **Saved Sessions** — browse and resume previous debates

### CLI (Direct Start)

```bash
# Start with explicit options
npx tsx cli/index.ts start --project "My App" --goal "Design the landing page" -l english

# Start with a brief file
npx tsx cli/index.ts start --brief landing-page
```

## CLI Flags

| Flag | Description | Default |
|------|-------------|---------|
| `--project` | Project name | "New Project" |
| `--goal` | Discussion goal | prompted |
| `--agents` | Comma-separated agent IDs | prompted |
| `--personas` | Persona set name (from `personas/`) | prompted |
| `-l, --language` | english, hebrew, mixed | from preferences or prompted |
| `--human` / `--no-human` | Human participation | true |
| `-o, --output` | Output directory | output/sessions |

### Electron App

```bash
# Run in development mode
npm run electron:dev

# Build for production
npm run electron:build
```

## Context Directory Structure

Place your context files in the `context/` directory:

```
context/
├── brand/
│   └── brand.md          # Brand guidelines, tone, values
├── audience/
│   └── segments.md       # Target audience descriptions
├── competitors/
│   └── analysis.md       # Competitor messaging analysis
├── research/
│   └── statistics.md     # Relevant research and data
└── examples/
    └── references.md     # Good copywriting examples
```

## Output Structure

Sessions are saved to the `output/` directory:

```
output/
├── sessions/
│   └── 2024-01-27-landing-page.md
├── drafts/
│   └── hero-v1.md
│   └── hero-v2.md
└── final/
    └── landing-page-copy.md
```

## Development

```bash
# Run frontend only (no Electron)
npm run dev

# Run with Electron
npm run electron:dev

# Type checking
npm run typecheck

# Build
npm run build
```

## Tech Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **Anthropic SDK**: AI agent communication
- **@clack/prompts**: CLI interactive prompts
- **Ink**: CLI React-based rendering

## License

MIT

---

Built with ❤️ for better decisions through structured debate.
