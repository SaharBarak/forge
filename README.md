# Copywrite Think Tank

A multi-agent copywriting orchestrator with an instant messaging interface. Watch AI agents debate, argue, and collaborate to create compelling copy.

**[View Documentation Site](https://yourusername.github.io/copywrite-think-tank/)**

![Think Tank Screenshot](docs/screenshot.png)

## Features

- **5 Distinct Agent Personas**: Each with unique perspectives, biases, and communication styles
- **5 Researcher Agents**: Specialized agents for data, competitors, audience, examples, and local context
- **Human Participation**: Join the discussion, guide the debate, or just observe
- **Methodology Framework**: Structured argumentation and consensus-building methods
- **Visual & Structure Decision Guides**: Built-in rules for when to use graphs, text, bullets, etc.
- **Hebrew/English Support**: Full RTL support for Hebrew-first projects
- **Context Scanning**: Load brand, audience, and research context from files
- **Session Export**: Save discussions, decisions, and drafts

## Agent Personas

| Agent | Role | Perspective |
|-------|------|-------------|
| **Ronit** (רונית) | The Busy Parent | Time-conscious, practical, cuts through BS |
| **Yossi** (יוסי) | The Burned Veteran | Historical perspective, skeptical, values authenticity |
| **Noa** (נועה) | The Data Skeptic | Evidence-based, logical, needs proof |
| **Avi** (אבי) | The Practical Businessman | Results-oriented, direct, ROI-focused |
| **Michal** (מיכל) | The Burned Activist | Empathetic, protective, values vulnerability |

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

```bash
# Clone the repository
git clone https://github.com/yourusername/copywrite-think-tank.git
cd copywrite-think-tank

# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run electron:build
```

## CLI Flags

When running in development, you can use flags:

```bash
# Run with specific options
npm run electron:dev -- --project "My Landing Page" --human --methodology dialectic
```

| Flag | Description | Default |
|------|-------------|---------|
| `--project` | Project name | "New Project" |
| `--goal` | Discussion goal | Required |
| `--agents` | Comma-separated agent IDs | All agents |
| `--human` | Enable human participation | true |
| `--methodology` | Argumentation style | mixed |
| `--consensus` | Consensus method | consent |
| `--context-dir` | Context files directory | ./context |
| `--output-dir` | Output files directory | ./output |

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

## Methodology Guides

### When to Use Visuals

| Condition | Recommended Visual |
|-----------|-------------------|
| Showing change over time | Chart (line/area) |
| Comparing quantities | Graph (bar) |
| Before/after states | Comparison |
| Abstract concepts | Illustration |
| Building trust | Photo |
| Multiple statistics | Infographic |
| Narrative/emotional | None (text only) |

### When to Use Which Structure

| Condition | Recommended Structure |
|-----------|----------------------|
| Explaining a sequence | Numbered list |
| Listing features/benefits | Bullets |
| Us vs them comparison | Table/columns |
| Telling a story | Prose |
| Showing history | Timeline |
| Key metrics | Stats display |
| Multiple equal items | Grid |

## Development

```bash
# Run frontend only (no Electron)
npm run dev

# Run with Electron
npm run electron:dev

# Type checking
npm run typecheck

# Linting
npm run lint

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

## License

MIT

---

Built with ❤️ for better copywriting through structured debate.
