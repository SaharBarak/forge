---
name: forge-copywrite
description: Avoid generic AI copy by running a real Forge draft, critical review, revision, and unanimous ratification against the user's original brief.
---

# Forge Copywrite Consensus

Turn an actionable copywriting brief into finished copy that survives independent critical review. The complete approved deliverable must come back in the active host session; do not substitute an outline, a job ID, or a single-model imitation.

## Choose the host adapter

- **Codex:** use the native delegated-agent workflow below. Explicitly invoking this skill or asking for a Forge consensus run authorizes bounded delegation for this copywriting task. Use the active host subagent tools (`spawn_agent`, follow-up/send, and wait equivalents); never recursively launch `codex exec` from inside Codex.
- **Claude Code or another host exposing Forge MCP:** use the `run_copywrite_consensus` tool workflow below.

If the required MCP or host subagent tools are unavailable, say that a real Forge consensus cannot run in this surface. Do not role-play several reviewers yourself or claim unanimous approval.

## Brief contract

Preserve the user's original request as the source of truth. Extract the offer, audience, desired action, differentiators, tone, constraints, required sections, language, and verified proof. Ask one concise question only when the offer or audience is genuinely unknowable. Never invent capabilities, metrics, customers, testimonials, integrations, or guarantees.

Use the user's requested sections. Otherwise use: Hero, Problem, Solution, Benefits, How It Works, FAQ, Final CTA.

## Claude Code / MCP workflow

1. Pass the complete brief to `run_copywrite_consensus`.
2. Pass `project_name` when the product or campaign name is known.
3. Pass `sections` only when the user requested a specific structure; otherwise use the tool defaults.
4. Pass the requested `language`; default to `english` when none is stated.
5. Call the tool exactly once and wait. It is intentionally long-running: every agent independently reviews the complete draft, and any objection triggers revision and another vote. Do not start a duplicate call.
6. Return the Markdown only when the tool reports `unanimousApproval: true`. Preserve every drafted section and do not replace the output with a summary.

## Codex native workflow

1. Start three independent subagents in parallel. Give each the original brief verbatim and one role:
   - audience advocate: intent, pains, clarity, relevance, and desired action;
   - claim skeptic: grounding, specificity, unsupported claims, and credibility;
   - copy chief: AI-sounding filler, clichés, structure, persuasion, voice, and completeness.
2. Ask each for independent discovery advice, risks, and a proposed messaging direction. They must not see or imitate the other agents' answers.
3. Synthesize the useful agreements and disagreements, then draft every requested section as finished Markdown. Claims may come only from the original brief or verified workspace research.
4. Send the same complete draft and original brief to all three reviewers independently. Require exactly one JSON object:

```json
{"verdict":"approve|revise","alignment_score":0,"critical_issues":["..."],"required_changes":["..."]}
```

5. Approval requires all three verdicts to be `approve`, all three scores to be at least 85, and no blocking issue. A malformed, missing, timed-out, or ambiguous verdict is dissent.
6. If anyone dissents, revise the entire deliverable against every blocking change and run a new independent review round. Do not ask reviewers to negotiate their standards downward. Run at most three review rounds.
7. If the third round still lacks unanimous approval, fail closed: identify the dissenting roles and blockers, and do not present the disputed draft as Forge-approved copy.

## Return contract

On success, return the complete Markdown deliverable. For a Codex-native run, state `Forge consensus: 3/3 approved (round N).` immediately before the copy. Keep internal discovery and critique out of the response unless the user asks for the audit trail.

If consensus fails, report that honestly and do not present the disputed draft as final. Never silently fall back to direct, single-model copywriting while claiming Forge produced it.
