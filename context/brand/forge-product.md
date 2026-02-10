# Forge — Product Overview

## What Forge Is

Forge is a multi-agent deliberation engine. Instead of prompting one AI and accepting its first answer, Forge assembles a team of AI agents — each with distinct personas, expertise, biases, and communication styles — and runs a structured debate until they converge on the best possible output.

Think of it as a think tank in your terminal.

## The Core Problem Forge Solves

Single-AI outputs are flat. You get one perspective, one voice, one angle. If you want a second opinion, you re-prompt. If you want a devil's advocate, you role-play. If you want nuance, you beg for it. The result is content that sounds like it was written by a committee of one — because it was.

Forge fixes this by making the committee real. Five agents argue, challenge, build on each other's ideas, and only stop when they reach genuine consensus.

## How It Works (Technical)

### The Deliberation Flow
1. **Initialization** — Goal is set, agents are introduced, context files are loaded
2. **Research** — Agents gather data, competitive intel, audience insights
3. **Brainstorming** — Free-form ideation, "yes and" mode, no criticism yet
4. **Argumentation** — Dialectic debate: thesis, antithesis, synthesis. This is where ideas get stress-tested
5. **Synthesis** — Best elements from all proposals are merged
6. **Drafting** — Actual content creation based on consensus
7. **Review** — Polish, critique, catch inconsistencies
8. **Consensus** — Formal agreement on final output
9. **Finalization** — Export-ready deliverable

### Event-Driven Architecture
Agents don't take rigid turns. They REACT to what's being said — like a real conversation. A floor manager controls who speaks when, with priority queues and cooldowns to prevent any single agent from dominating.

### Conversation Memory
Long sessions don't lose context. Rolling summaries, decision tracking, and proposal tracking keep agents aware of what's been said — even 50+ messages in.

### Persona System
- **5 built-in personas** with distinct personalities, ages, communication styles, and biases
- **10 industry-specific personas** (healthcare, finance, education, legal, etc.)
- **AI-powered persona generation** — describe your domain, get custom experts in seconds
- Personas are saved as JSON files and reusable across sessions

### Methodology Framework
- **Dialectic**: Thesis > Antithesis > Synthesis (default)
- **Socratic**: Question-driven exploration
- **Collaborative**: "Yes, and..." building
- **Adversarial**: Strong opposing viewpoints

### 8 Session Modes
Copywriting, Site Survey, Idea Validation, Ideation, Will-It-Work, Business Plan, GTM Strategy, Custom — each with specific goals, phase configurations, and success criteria.

### Export System
5 formats: Markdown, PDF (branded), DOCX, HTML, JSON. Decisions extracted and highlighted. Full traceability.

### Tools
Agents can generate images (via Gemini) and data visualizations during sessions.

## What Makes Forge Different

1. **Multi-perspective quality control** — Every idea is challenged by a skeptic, validated by an enthusiast, grounded by a pragmatist, and checked by a values advocate
2. **Structured chaos** — Rigid enough to prevent endless debate (phases, timeouts, loop detection), flexible enough for organic conversation (event-driven, reactive)
3. **Real memory** — Sessions don't degrade over time. Agents reference earlier decisions accurately
4. **Production-ready output** — Not just chat logs. Formatted, exportable, branded documents
5. **Your personas, your rules** — Generate domain-specific experts in seconds. Save and reuse across projects
6. **CLI and Desktop** — Terminal-first for power users, Electron app for visual workflows. Same engine underneath

## Tech Stack
- TypeScript, Claude API (Anthropic), React, Ink (terminal UI), @clack/prompts
- Event-driven architecture with MessageBus, FloorManager, AgentListener
- SessionKernel as unified engine for both CLI and Electron

## How Users Run Forge
```
npx tsx cli/index.ts
> Quick Start
> "Design a landing page for our SaaS product"
> English
> Generate personas for this topic
> [Watch 5 agents debate for 10-15 minutes]
> /synthesize
> /export --format pdf
```

## Current State
- Open source, actively developed
- 332 tests passing
- Full CLI with breadcrumbs navigation, quick replies, agent suggestions
- Session persistence with save/resume
- Multi-language support (English, Hebrew, Mixed)
