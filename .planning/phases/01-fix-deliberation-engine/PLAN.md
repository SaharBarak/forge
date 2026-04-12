# Phase 1 — PLAN

## T1 — `GoalParser.ts` (new module)
Create `src/lib/eda/GoalParser.ts` exporting:
```ts
export interface RequiredSection { id: string; name: string; order: number; }
export function parseGoalSections(goal: string): RequiredSection[]
export function normalizeSectionName(raw: string): string
```

**Logic:**
1. Try markdown numbered list: `/^\s*(\d+)\.\s+\*\*([A-Z][A-Z /]+?)\*\*/gm`
2. Fall back to header: `/^##\s+(\d+\.\s+)?([A-Z][A-Z /]+?)$/gm`
3. Fall back to inline numbered: `/(\d+)\.\s+([A-Z][A-Z /]{2,30})/g`
4. For each match, emit `{ id: slug(name), name, order: parsedNum }`
5. If <2 sections found, return the generic fallback `[{id:'overview'},{id:'body'},{id:'conclusion'}]`
6. Deduplicate by id, sort by order.

**Test file:** `src/lib/eda/GoalParser.test.ts` — 5 cases: landing-page goal (finds 10), minimal goal (returns 3 fallback), mixed headers, punctuation, empty.

## T2 — Harden `ModeController.detectOutputs()`
Replace substring check at `src/lib/modes/ModeController.ts:512-533` with:
```ts
private detectOutputs(message: Message): void {
  // A section counts as produced ONLY if the message contains
  // a markdown header followed by >= 80 chars of content.
  const pattern = /^##\s+([A-Za-z][\w /]*?)\s*\n([\s\S]+?)(?=\n##\s|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(message.content)) !== null) {
    const name = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const body = m[2].trim();
    if (body.length >= 80) {
      this.progress.outputsProduced.add(name);
      // Known aliases
      if (name.includes('hero')) this.progress.outputsProduced.add('hero');
      if (name.includes('value') || name.includes('benefit')) this.progress.outputsProduced.add('value_proposition');
      if (name.includes('cta') || name.includes('call')) this.progress.outputsProduced.add('cta');
      if (name.includes('verdict')) this.progress.outputsProduced.add('verdict');
    }
  }
}
```
**Compat:** existing `ModeController.test.ts` uses messages like `'## Hero\nOur hero copy is amazing and converts well because it speaks directly to the user and clearly articulates the value proposition they care about most.'` → ensure tests still pass or update fixtures.

## T3 — `AgentListener` — bound context + `speakWithContext`
At `src/lib/eda/AgentListener.ts:29`, change `maxResponseMessages` default to 6.

Add new public method:
```ts
async speakWithContext(reason: string, overrideContext: string): Promise<Message | null>
```
Same as `onFloorGranted` path but uses `overrideContext` verbatim instead of building from the bus. Returns the produced message so the orchestrator can await it.

Also expose a Promise-returning variant of `onFloorGranted` for the drafting phase; or simply add a `speakNow(reason, contextOverride?)` method that:
1. Sets state = 'speaking'
2. Calls `claudeAgent.generateResponse(contextOverride ?? fullContext, reason)`
3. Adds message to bus
4. Returns the message

## T4 — `EDAOrchestrator` — phase machine
In `src/lib/eda/EDAOrchestrator.ts`:

1. **Import `parseGoalSections`** from `./GoalParser`.
2. **Delete rolling round-robin** (lines ~228-257).
3. **Replace `start()` tail** with a call to `runPhaseMachine()` fire-and-forget.
4. **New method `runPhaseMachine()`:**
   ```ts
   private async runPhaseMachine(): Promise<void> {
     if (this.isStopped) return;

     const sections = parseGoalSections(this.session.config.goal);
     const agentIds = Array.from(this.agentListeners.keys());

     // Phase: Discovery
     await this.runDiscoveryPhase(agentIds);
     if (this.isStopped) return;

     // Phase: Synthesis
     await this.runSynthesisPhase(agentIds);
     if (this.isStopped) return;

     // Phase: Drafting (one section at a time)
     await this.runDraftingPhase(agentIds, sections);
     if (this.isStopped) return;

     // Finalize
     await this.finalizeDraftingMachine(sections);
   }
   ```
5. **`runDiscoveryPhase(agentIds)`:** emit phase_change 'brainstorming', inject a brief system message "⏭ DISCOVERY: each agent share your first instinct (1-2 paragraphs)". Then sequentially for each agent: `await this.forceSpeakAndWait(agentId, 'Discovery: initial perspective')` with a 60s per-agent timeout.
6. **`runSynthesisPhase(agentIds)`:** phase_change 'synthesis', inject "⏭ SYNTHESIS: propose the structure and tone you'd use", then sequential force-speak.
7. **`runDraftingPhase(agentIds, sections)`:** phase_change 'drafting'. Build a running `draftedSoFar` string. For each section `s` (index `i`), pick `agentIds[i % agentIds.length]`, inject system message "⏭ DRAFT ONLY: ## {s.name} — output must start with `## {s.name}` and contain the full, final copy. No meta commentary.", then `await forceSpeakAndWait(...)` with a section-scoped context override. Extract `## {s.name}` from the reply using the same regex as T2. Append to `draftedSoFar`.
8. **`finalizeDraftingMachine(sections)`:** assemble consolidated draft, emit `draft_section` per section, push a final system message "🎉 DRAFTING COMPLETE", emit `this.bus.emit('session:end', { reason: 'completed', sectionsCompleted: sections.length })`.

**`forceSpeakAndWait(agentId, reason, contextOverride?)`:**
```ts
private async forceSpeakAndWait(
  agentId: string,
  reason: string,
  contextOverride?: string,
  timeoutMs = 90_000
): Promise<Message | null> {
  const listener = this.agentListeners.get(agentId);
  if (!listener) return null;

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsub();
      resolve(null);
    }, timeoutMs);

    const unsub = this.bus.subscribe('message:new', (payload) => {
      if (payload.fromAgent === agentId) {
        clearTimeout(timer);
        unsub();
        resolve(payload.message);
      }
    }, `await-${agentId}-${Date.now()}`);

    listener.speakNow(reason, contextOverride).catch(() => {
      clearTimeout(timer);
      unsub();
      resolve(null);
    });
  });
}
```

## T5 — `forge-landing-copy.ts` — exit on session:end
Keep the existing `messageBus.subscribe('session:end', ...)` handler. The orchestrator will now actually emit it, so the `while` loop will exit via `sessionEnded` long before the 20-min timeout. Reduce timeout to 12 min as a safety net. Optionally truncate system messages in the transcript to 500 chars each.

## T6 — Regression sweep
- `npm run build` — must compile.
- `npm test` — all 882 tests must pass. Likely adjust:
  - `src/lib/eda/EDAOrchestrator.test.ts` if it asserts on rolling round-robin specifically.
  - `src/lib/modes/ModeController.test.ts` for `detectOutputs` — fixtures may need `## Header\n` + 80+ chars.
- Fix any test that breaks with the minimum change needed.

## T7 — Live e2e
`npx tsx scripts/forge-landing-copy.ts` — success criteria:
- Exits via `session:end` (not timeout).
- `output/forge-landing-copy/landing-copy.md` contains ≥9 of the 10 requested sections (HERO, PROBLEM, SOLUTION, HOW IT WORKS, FEATURES, FOR WHOM, SOCIAL PROOF, FAQ, FINAL CTA, FOOTER).
- Each section has substantive content (>80 chars).
- Transcript file < 1 MB.
- Runtime < 10 minutes.

## Rollback plan
If any test breaks and can't be fixed in <10 min, revert only the ModeController.detectOutputs change and keep the orchestrator rewrite — the test regressions are likely concentrated there.
