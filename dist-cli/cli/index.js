#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// cli/adapters/ClaudeCodeCLIRunner.ts
import * as path from "path";
import * as os from "os";
import { query as claudeQuery } from "@anthropic-ai/claude-agent-sdk";
var CLAUDE_CODE_PATH, ClaudeCodeCLIRunner;
var init_ClaudeCodeCLIRunner = __esm({
  "cli/adapters/ClaudeCodeCLIRunner.ts"() {
    "use strict";
    CLAUDE_CODE_PATH = path.join(os.homedir(), ".local", "bin", "claude");
    ClaudeCodeCLIRunner = class {
      defaultModel;
      evalModel;
      constructor(defaultModel = "claude-sonnet-4-20250514", evalModel = "claude-opus-4-6") {
        this.defaultModel = defaultModel;
        this.evalModel = evalModel;
      }
      async query(params) {
        let content = "";
        let sessionId;
        let usage;
        try {
          const q = claudeQuery({
            prompt: params.prompt,
            options: {
              systemPrompt: params.systemPrompt || void 0,
              model: params.model || this.defaultModel,
              permissionMode: "bypassPermissions",
              maxTurns: 1,
              pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
              stderr: (data) => {
                const text = typeof data === "string" ? data : String(data);
                if (!text.trim()) return;
                if (text.includes("[DEBUG]") || text.includes("INFO")) return;
                console.error("[claude sdk]", text.trim());
              }
            }
          });
          for await (const message of q) {
            if ("session_id" in message && typeof message.session_id === "string") {
              sessionId = message.session_id;
            }
            if (message.type === "assistant" && "message" in message) {
              const msg = message.message;
              if (msg?.content && Array.isArray(msg.content)) {
                for (const block of msg.content) {
                  const b = block;
                  if (b.type === "text" && b.text) {
                    content += b.text;
                  }
                }
              }
            }
            if (message.type === "result") {
              const result = message;
              if (result.usage) {
                usage = {
                  inputTokens: result.usage.input_tokens || 0,
                  outputTokens: result.usage.output_tokens || 0,
                  costUsd: result.total_cost_usd || 0
                };
              }
            }
          }
        } catch (error) {
          if (content) {
            return { success: true, content, sessionId, usage };
          }
          return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          };
        }
        return { success: true, content, sessionId, usage };
      }
      async evaluate(params) {
        const queryResult = await this.query({
          prompt: params.evalPrompt,
          systemPrompt: "You are evaluating whether to speak in a discussion. Respond only with JSON.",
          model: this.evalModel
        });
        if (!queryResult.success || !queryResult.content) {
          return {
            success: false,
            urgency: "pass",
            reason: queryResult.error || "No response",
            responseType: ""
          };
        }
        const jsonMatch = queryResult.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          return { success: true, urgency: "pass", reason: "Listening", responseType: "" };
        }
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            success: true,
            urgency: parsed.urgency || "pass",
            reason: parsed.reason || "",
            responseType: parsed.responseType || ""
          };
        } catch {
          return { success: true, urgency: "pass", reason: "Parse error", responseType: "" };
        }
      }
    };
  }
});

// cli/adapters/FileSystemAdapter.ts
import * as fs from "fs/promises";
import * as path2 from "path";
import { glob as globLib } from "glob";
var FileSystemAdapter;
var init_FileSystemAdapter = __esm({
  "cli/adapters/FileSystemAdapter.ts"() {
    "use strict";
    FileSystemAdapter = class {
      cwd;
      constructor(cwd) {
        this.cwd = cwd || process.cwd();
      }
      async readDir(dirPath) {
        try {
          const fullPath = path2.isAbsolute(dirPath) ? dirPath : path2.join(this.cwd, dirPath);
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return entries.map((entry) => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            path: path2.join(fullPath, entry.name)
          }));
        } catch {
          return [];
        }
      }
      async readFile(filePath) {
        try {
          const fullPath = path2.isAbsolute(filePath) ? filePath : path2.join(this.cwd, filePath);
          return await fs.readFile(fullPath, "utf-8");
        } catch {
          return null;
        }
      }
      async writeFile(filePath, content) {
        try {
          const fullPath = path2.isAbsolute(filePath) ? filePath : path2.join(this.cwd, filePath);
          await this.ensureDir(path2.dirname(fullPath));
          await fs.writeFile(fullPath, content, "utf-8");
          return true;
        } catch {
          return false;
        }
      }
      async glob(pattern, options) {
        try {
          const cwd = options?.cwd || this.cwd;
          return await globLib(pattern, { cwd, absolute: true });
        } catch {
          return [];
        }
      }
      async exists(filePath) {
        try {
          const fullPath = path2.isAbsolute(filePath) ? filePath : path2.join(this.cwd, filePath);
          await fs.access(fullPath);
          return true;
        } catch {
          return false;
        }
      }
      async loadContext(contextDir) {
        const fullPath = path2.isAbsolute(contextDir) ? contextDir : path2.join(this.cwd, contextDir);
        const result = {
          brand: null,
          audience: null,
          research: [],
          examples: [],
          competitors: []
        };
        const brandPath = path2.join(fullPath, "brand.md");
        result.brand = await this.readFile(brandPath);
        const audiencePath = path2.join(fullPath, "audience.md");
        result.audience = await this.readFile(audiencePath);
        const researchFiles = await this.glob("research/*.md", { cwd: fullPath });
        for (const file of researchFiles) {
          const content = await this.readFile(file);
          if (content) {
            result.research.push({ file: path2.basename(file), content });
          }
        }
        const exampleFiles = await this.glob("examples/*.md", { cwd: fullPath });
        for (const file of exampleFiles) {
          const content = await this.readFile(file);
          if (content) {
            result.examples.push({ file: path2.basename(file), content });
          }
        }
        const competitorFiles = await this.glob("competitors/*.md", { cwd: fullPath });
        for (const file of competitorFiles) {
          const content = await this.readFile(file);
          if (content) {
            result.competitors.push({ file: path2.basename(file), content });
          }
        }
        return result;
      }
      async readBrief(briefName) {
        const withExt = briefName.endsWith(".md") ? briefName : `${briefName}.md`;
        const briefPath = path2.join(this.cwd, "briefs", withExt);
        return this.readFile(briefPath);
      }
      async listBriefs() {
        const briefsDir = path2.join(this.cwd, "briefs");
        const files = await this.glob("*.md", { cwd: briefsDir });
        return files.map((f) => path2.basename(f, ".md"));
      }
      async ensureDir(dirPath) {
        try {
          const fullPath = path2.isAbsolute(dirPath) ? dirPath : path2.join(this.cwd, dirPath);
          await fs.mkdir(fullPath, { recursive: true });
          return true;
        } catch {
          return false;
        }
      }
      async appendFile(filePath, content) {
        try {
          const fullPath = path2.isAbsolute(filePath) ? filePath : path2.join(this.cwd, filePath);
          await this.ensureDir(path2.dirname(fullPath));
          await fs.appendFile(fullPath, content, "utf-8");
          return true;
        } catch {
          return false;
        }
      }
      async listDir(dirPath) {
        try {
          const fullPath = path2.isAbsolute(dirPath) ? dirPath : path2.join(this.cwd, dirPath);
          const entries = await fs.readdir(fullPath, { withFileTypes: true });
          return entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch {
          return [];
        }
      }
      getCwd() {
        return this.cwd;
      }
    };
  }
});

// src/agents/personas.ts
function registerCustomPersonas(personas) {
  customPersonas = personas;
}
function clearCustomPersonas() {
  customPersonas = null;
}
function getActivePersonas() {
  return customPersonas || AGENT_PERSONAS;
}
function getAgentById(id) {
  const personas = getActivePersonas();
  return personas.find((a) => a.id === id);
}
function getResearcherById(id) {
  return RESEARCHER_AGENTS.find((r) => r.id === id);
}
var AGENT_PERSONAS, RESEARCHER_AGENTS, customPersonas;
var init_personas = __esm({
  "src/agents/personas.ts"() {
    "use strict";
    AGENT_PERSONAS = [
      {
        id: "skeptic",
        name: "Skeptic",
        nameHe: "\u05E1\u05E4\u05E7\u05DF",
        role: "Evidence-Demanding Critic",
        age: 0,
        background: `Demands proof for every claim. Will not accept any assertion without supporting
    evidence, data, or a clear chain of reasoning. Represents the rigorous reviewer who catches
    weak logic and unexamined assumptions.`,
        personality: [
          "Questions every premise before accepting a conclusion",
          "Asks for sources, data, citations",
          "Suspicious of consensus without examination",
          "Values falsifiability and verifiability",
          "Respects calibrated uncertainty over confidence"
        ],
        biases: [
          "May slow progress by over-questioning",
          "Dismisses intuition when evidence is weak",
          "Prefers measurable over qualitative"
        ],
        strengths: [
          "Catches unsupported claims early",
          "Forces the group to articulate why, not just what",
          "Identifies weak reasoning and logical gaps",
          "Raises important objections others miss"
        ],
        weaknesses: [
          "Can stall discussion when proof is impossible",
          "May undervalue creative leaps"
        ],
        speakingStyle: 'Direct, terse. Asks "what evidence?", "why do we believe that?", "what would falsify this?".',
        color: "red"
      },
      {
        id: "pragmatist",
        name: "Pragmatist",
        nameHe: "\u05E4\u05E8\u05D2\u05DE\u05D8\u05D9",
        role: "Outcome-Focused Builder",
        age: 0,
        background: `Cares only about what works in practice. Tolerates imperfect solutions that ship
    over perfect ones that don't. Measures ideas by the results they produce, not the elegance of
    their reasoning. Represents the "good enough, let's ship" voice.`,
        personality: [
          "Values working over perfect",
          "Favors proven over novel",
          "Focuses on action and outcomes",
          "Distrusts over-engineering",
          "Respects constraints (time, budget, scope)"
        ],
        biases: [
          "May dismiss innovative ideas as impractical",
          "Prefers the status quo when change is risky",
          "Undervalues long-term investments"
        ],
        strengths: [
          "Cuts through paralysis",
          "Keeps discussion grounded in feasibility",
          "Excellent at trade-off analysis",
          "Forces closure when discussion drifts"
        ],
        weaknesses: [
          "May settle for local optima",
          "Can be dismissive of ambitious proposals"
        ],
        speakingStyle: 'Plain-spoken, solution-oriented. Asks "how do we actually do this?", "what ships?", "good enough?".',
        color: "yellow"
      },
      {
        id: "analyst",
        name: "Analyst",
        nameHe: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8",
        role: "Systems Thinker",
        age: 0,
        background: `Thinks in structures, patterns, and second-order effects. Maps ideas to frameworks,
    identifies leverage points, and traces implications. Represents the voice that sees the whole
    picture and how pieces interact.`,
        personality: [
          "Reasons from first principles",
          "Identifies patterns across examples",
          "Traces cause-and-effect chains",
          "Appreciates structured thinking",
          "Values decomposition and modularity"
        ],
        biases: [
          "May over-model when simple answers suffice",
          "Prefers frameworks to intuitions",
          "Can get lost in detail"
        ],
        strengths: [
          "Catches second-order consequences",
          "Excellent at root-cause analysis",
          "Synthesizes disparate inputs into frameworks",
          "Identifies leverage points"
        ],
        weaknesses: [
          "May over-complicate simple decisions",
          "Slower to commit than others"
        ],
        speakingStyle: 'Structured, precise. Uses frameworks and models. Asks "what are the variables?", "how do these interact?".',
        color: "blue"
      },
      {
        id: "advocate",
        name: "Advocate",
        nameHe: "\u05DE\u05D9\u05D9\u05E6\u05D2",
        role: "Mission-Driven Voice",
        age: 0,
        background: `Speaks for the unspoken \u2014 users, long-term impact, ethical implications. Won't let
    the group optimize only for what's measurable. Represents the conscience of the deliberation,
    the voice that asks "who benefits, who loses, and what do we owe them?".`,
        personality: [
          "Centers users and stakeholders",
          "Values long-term impact over short-term wins",
          "Raises ethical and fairness concerns",
          "Champions minority viewpoints",
          "Respects lived experience as evidence"
        ],
        biases: [
          "May over-weight impact at the expense of feasibility",
          "Can be dismissive of pragmatic constraints"
        ],
        strengths: [
          "Surfaces ethical blind spots",
          "Keeps users at the center",
          "Reframes debates in terms of stakeholder harm/benefit",
          "Holds the group accountable to principles"
        ],
        weaknesses: [
          "Can make discussion feel moralistic",
          "May push beyond what resources permit"
        ],
        speakingStyle: 'Values-driven, empathetic. Asks "who does this help?", "who gets left out?", "what are we really optimizing for?".',
        color: "magenta"
      },
      {
        id: "contrarian",
        name: "Contrarian",
        nameHe: "\u05DE\u05E0\u05D5\u05D2\u05D3",
        role: "Devil's Advocate",
        age: 0,
        background: `Deliberately takes opposing positions to stress-test ideas. Not contrarian for its
    own sake \u2014 but because groupthink kills good decisions. Represents the voice that prevents
    early consensus by forcing the group to defend their reasoning.`,
        personality: [
          "Challenges emerging consensus",
          "Argues the opposite of the majority view",
          "Tests assumptions by inverting them",
          "Comfortable with disagreement",
          "Values productive conflict"
        ],
        biases: [
          "May argue positions they don't hold",
          "Can make the group feel adversarial"
        ],
        strengths: [
          "Prevents premature convergence",
          "Exposes hidden assumptions",
          "Forces articulation of rationale",
          "Identifies weak consensus"
        ],
        weaknesses: [
          "Can be tiring in long sessions",
          "May slow down genuine agreement"
        ],
        speakingStyle: `Provocative, counterfactual. "What if the opposite is true?", "why shouldn't we do X instead?".`,
        color: "cyan"
      }
    ];
    RESEARCHER_AGENTS = [
      {
        id: "stats-finder",
        name: "Stats Finder",
        specialty: "Finding relevant statistics and data points",
        capabilities: [
          "Find industry statistics",
          "Locate relevant research studies",
          "Identify credibility-building numbers",
          "Find comparison benchmarks"
        ],
        searchDomains: ["academic", "industry reports", "government data"]
      },
      {
        id: "competitor-analyst",
        name: "Competitor Analyst",
        specialty: "Analyzing competitor messaging and positioning",
        capabilities: [
          "Analyze competitor websites",
          "Identify messaging gaps",
          "Find differentiation opportunities",
          "Map competitor value propositions"
        ],
        searchDomains: ["competitor sites", "review platforms", "social media"]
      },
      {
        id: "audience-insight",
        name: "Audience Insight",
        specialty: "Deep audience research and pain point discovery",
        capabilities: [
          "Analyze audience discussions",
          "Find common objections",
          "Identify language patterns",
          "Discover emotional triggers"
        ],
        searchDomains: ["forums", "social media", "review sites", "surveys"]
      },
      {
        id: "copy-explorer",
        name: "Copy Explorer",
        specialty: "Finding exemplary copy and proven patterns",
        capabilities: [
          "Find successful landing page examples",
          "Identify proven headline patterns",
          "Locate industry-specific copy styles",
          "Gather testimonial examples"
        ],
        searchDomains: ["swipe files", "award-winning sites", "case studies"]
      },
      {
        id: "context-finder",
        name: "Context Finder",
        specialty: "Domain-specific context and market research",
        capabilities: [
          "Understand target market behavior",
          "Identify cultural and contextual nuances",
          "Find region-specific language patterns",
          "Locate relevant case studies"
        ],
        searchDomains: ["industry media", "community forums", "regional content"]
      }
    ];
    customPersonas = null;
  }
});

// cli/adapters/SessionPersistence.ts
import * as path3 from "path";
var DEFAULT_CONFIG, SessionPersistence;
var init_SessionPersistence = __esm({
  "cli/adapters/SessionPersistence.ts"() {
    "use strict";
    init_personas();
    DEFAULT_CONFIG = {
      outputDir: "output/sessions",
      autoSaveInterval: 5e3
      // 5 seconds — fallback; updateSession() persists on every message
    };
    SessionPersistence = class {
      fs;
      config;
      sessionDir = null;
      autoSaveTimer = null;
      lastSavedMessageCount = 0;
      session = null;
      constructor(fs14, config = {}) {
        this.fs = fs14;
        this.config = { ...DEFAULT_CONFIG, ...config };
      }
      /**
       * Initialize session directory for a new session
       */
      async initSession(session) {
        this.session = session;
        const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
        const sessionName = `${session.config.projectName.replace(/\s+/g, "-")}-${timestamp}`;
        this.sessionDir = path3.join(this.config.outputDir, sessionName);
        await this.fs.ensureDir(this.sessionDir);
        const metadata = {
          id: session.id,
          projectName: session.config.projectName,
          goal: session.config.goal,
          enabledAgents: session.config.enabledAgents,
          startedAt: session.startedAt.toISOString()
        };
        await this.fs.writeFile(
          path3.join(this.sessionDir, "session.json"),
          JSON.stringify(metadata, null, 2)
        );
        this.startAutoSave();
        return this.sessionDir;
      }
      /**
       * Start auto-save timer
       */
      startAutoSave() {
        if (this.autoSaveTimer) {
          clearInterval(this.autoSaveTimer);
        }
        this.autoSaveTimer = setInterval(() => {
          this.saveIncremental().catch(console.error);
        }, this.config.autoSaveInterval);
      }
      /**
       * Save new messages incrementally (append to JSONL)
       */
      async saveIncremental() {
        if (!this.sessionDir || !this.session) return;
        const messages = this.session.messages;
        const newMessages = messages.slice(this.lastSavedMessageCount);
        if (newMessages.length === 0) return;
        const jsonlPath = path3.join(this.sessionDir, "messages.jsonl");
        const jsonlContent = newMessages.map((m) => JSON.stringify(m)).join("\n") + "\n";
        await this.fs.appendFile(jsonlPath, jsonlContent);
        this.lastSavedMessageCount = messages.length;
        await this.generateTranscript();
      }
      /**
       * Force a full save (e.g., on exit)
       */
      async saveFull() {
        if (!this.sessionDir || !this.session) return;
        this.stopAutoSave();
        await this.saveIncremental();
        await this.generateTranscript();
        await this.generateDraft();
        const metadata = {
          id: this.session.id,
          projectName: this.session.config.projectName,
          goal: this.session.config.goal,
          enabledAgents: this.session.config.enabledAgents,
          startedAt: this.session.startedAt.toISOString(),
          endedAt: (/* @__PURE__ */ new Date()).toISOString(),
          messageCount: this.session.messages.length,
          currentPhase: this.session.currentPhase
        };
        await this.fs.writeFile(
          path3.join(this.sessionDir, "session.json"),
          JSON.stringify(metadata, null, 2)
        );
      }
      /**
       * Generate readable markdown transcript
       */
      async generateTranscript() {
        if (!this.sessionDir || !this.session) return;
        const lines = [
          `# ${this.session.config.projectName} - Debate Transcript`,
          "",
          `**Goal:** ${this.session.config.goal}`,
          `**Started:** ${this.session.startedAt.toISOString()}`,
          `**Agents:** ${this.session.config.enabledAgents.join(", ")}`,
          "",
          "---",
          ""
        ];
        for (const message of this.session.messages) {
          const sender = this.getSenderName(message.agentId);
          const time = new Date(message.timestamp).toLocaleTimeString();
          const typeTag = message.type !== "system" ? `[${message.type.toUpperCase()}]` : "";
          lines.push(`### ${sender} ${typeTag}`);
          lines.push(`*${time}*`);
          lines.push("");
          lines.push(message.content);
          lines.push("");
          lines.push("---");
          lines.push("");
        }
        await this.fs.writeFile(
          path3.join(this.sessionDir, "transcript.md"),
          lines.join("\n")
        );
      }
      /**
       * Generate draft document from synthesis and drafting messages
       */
      async generateDraft() {
        if (!this.sessionDir || !this.session) return;
        const syntheses = this.session.messages.filter((m) => m.type === "synthesis");
        const drafts = this.session.messages.filter(
          (m) => m.content.includes("## Hero") || m.content.includes("## Problem") || m.content.includes("## Solution")
        );
        const lines = [
          `# ${this.session.config.projectName} - Draft Copy`,
          "",
          `**Goal:** ${this.session.config.goal}`,
          `**Generated:** ${(/* @__PURE__ */ new Date()).toISOString()}`,
          ""
        ];
        if (syntheses.length > 0) {
          lines.push("## Synthesis Summary");
          lines.push("");
          lines.push(syntheses[syntheses.length - 1].content);
          lines.push("");
        }
        if (drafts.length > 0) {
          lines.push("## Draft Sections");
          lines.push("");
          for (const draft of drafts) {
            lines.push(draft.content);
            lines.push("");
            lines.push("---");
            lines.push("");
          }
        }
        await this.fs.writeFile(
          path3.join(this.sessionDir, "draft.md"),
          lines.join("\n")
        );
      }
      /**
       * Get human-readable sender name
       */
      getSenderName(agentId) {
        if (agentId === "human") return "**Human**";
        if (agentId === "system") return "**System**";
        const agent = getAgentById(agentId);
        if (agent) {
          const isHebrew = this.session?.config.language === "hebrew";
          return isHebrew ? `**${agent.name}** (${agent.nameHe})` : `**${agent.name}**`;
        }
        return `**${agentId}**`;
      }
      /**
       * Stop auto-save timer
       */
      stopAutoSave() {
        if (this.autoSaveTimer) {
          clearInterval(this.autoSaveTimer);
          this.autoSaveTimer = null;
        }
      }
      /**
       * Get current session directory
       */
      getSessionDir() {
        return this.sessionDir;
      }
      /**
       * Update session reference (for live updates) and immediately persist
       * any new messages to disk. This is event-driven — every message ends
       * up on disk within ~ms of being emitted, so a crash mid-session loses
       * nothing.
       */
      updateSession(session) {
        this.session = session;
        this.saveIncremental().catch((err2) => {
          console.error("[SessionPersistence] Incremental save failed:", err2);
        });
      }
      /**
       * Save session with memory state (for full context persistence)
       */
      async saveSessionWithMemory(sessionWithMemory) {
        if (!this.sessionDir) return;
        this.session = sessionWithMemory;
        await this.saveIncremental();
        await this.generateTranscript();
        await this.generateDraft();
        const metadata = {
          id: sessionWithMemory.id,
          projectName: sessionWithMemory.config.projectName,
          goal: sessionWithMemory.config.goal,
          enabledAgents: sessionWithMemory.config.enabledAgents,
          startedAt: sessionWithMemory.startedAt.toISOString(),
          endedAt: (/* @__PURE__ */ new Date()).toISOString(),
          messageCount: sessionWithMemory.messages.length,
          currentPhase: sessionWithMemory.currentPhase
        };
        await this.fs.writeFile(
          path3.join(this.sessionDir, "session.json"),
          JSON.stringify(metadata, null, 2)
        );
        if (sessionWithMemory.memoryState) {
          await this.fs.writeFile(
            path3.join(this.sessionDir, "memory.json"),
            JSON.stringify(sessionWithMemory.memoryState, null, 2)
          );
        }
      }
    };
  }
});

// src/lib/eda/ConversationMemory.ts
function extractTopic(content) {
  const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, "").trim();
  const quoteMatch = cleaned.match(/"([^"]+)"|'([^']+)'/);
  if (quoteMatch) {
    return (quoteMatch[1] || quoteMatch[2]).slice(0, 100);
  }
  const aboutMatch = cleaned.match(/(?:about|regarding|on|for)\s+(.+?)(?:\.|,|$)/i);
  if (aboutMatch) {
    return aboutMatch[1].slice(0, 100);
  }
  const words = cleaned.split(/\s+/).slice(0, 8);
  return words.join(" ").slice(0, 100);
}
function extractOutcome(content) {
  const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, "").trim();
  const outcomeMatch = cleaned.match(/(?:decided|agreed|concluded|will|should)\s+(?:to\s+)?(.+?)(?:\.|!|$)/i);
  if (outcomeMatch) {
    return outcomeMatch[1].slice(0, 200);
  }
  const sentenceMatch = cleaned.match(/^(.+?[.!?])/);
  if (sentenceMatch) {
    return sentenceMatch[1].slice(0, 200);
  }
  return cleaned.slice(0, 200);
}
function detectReaction(content) {
  for (const pattern of REACTION_PATTERNS.support) {
    if (pattern.test(content)) return "support";
  }
  for (const pattern of REACTION_PATTERNS.oppose) {
    if (pattern.test(content)) return "oppose";
  }
  for (const pattern of REACTION_PATTERNS.neutral) {
    if (pattern.test(content)) return "neutral";
  }
  return "neutral";
}
function generateMemoryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function retentionLimitsToConfig(limits) {
  return {
    maxSummaries: limits.maxSummaries,
    maxDecisions: limits.maxDecisions,
    maxProposals: limits.maxProposals,
    maxAgentKeyPoints: limits.maxKeyPoints,
    maxAgentPositions: limits.maxPositions
  };
}
var DEFAULT_MEMORY_CONFIG, SUMMARY_INTERVAL, DECISION_PATTERNS, PROPOSAL_PATTERNS, REACTION_PATTERNS, ConversationMemory;
var init_ConversationMemory = __esm({
  "src/lib/eda/ConversationMemory.ts"() {
    "use strict";
    DEFAULT_MEMORY_CONFIG = {
      maxSummaries: 20,
      maxDecisions: 50,
      maxProposals: 30,
      maxAgentKeyPoints: 20,
      maxAgentPositions: 15,
      pruneThreshold: 0.9
      // Prune when at 90% capacity
    };
    SUMMARY_INTERVAL = 12;
    DECISION_PATTERNS = [
      /we('ve)?\s+(agreed|decided|concluded)/i,
      /consensus\s+(is|reached)/i,
      /let's\s+go\s+with/i,
      /final\s+(decision|answer)/i,
      /\[CONSENSUS\]/i,
      /\[DECISION\]/i
    ];
    PROPOSAL_PATTERNS = [
      /I\s+propose/i,
      /what\s+if\s+we/i,
      /let's\s+consider/i,
      /my\s+suggestion/i,
      /\[PROPOSAL\]/i
    ];
    REACTION_PATTERNS = {
      support: [/I\s+agree/i, /great\s+idea/i, /let's\s+do\s+it/i, /מסכים/i, /רעיון מצוין/i],
      oppose: [/I\s+disagree/i, /won't\s+work/i, /problem\s+with/i, /לא מסכים/i, /בעיה עם/i],
      neutral: [/not\s+sure/i, /need\s+more\s+info/i, /לא בטוח/i]
    };
    ConversationMemory = class _ConversationMemory {
      summaries = [];
      decisions = [];
      proposals = [];
      agentStates = /* @__PURE__ */ new Map();
      lastSummarizedIndex = 0;
      totalMessages = 0;
      runner;
      config;
      constructor(runner, config) {
        this.runner = runner;
        this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
      }
      /**
       * Update memory configuration
       */
      setConfig(config) {
        this.config = { ...this.config, ...config };
        this.pruneIfNeeded(true);
      }
      /**
       * Get current memory configuration
       */
      getConfig() {
        return { ...this.config };
      }
      /**
       * Set retention limits (legacy API for backwards compatibility)
       * @deprecated Use setConfig() instead
       */
      setRetentionLimits(limits) {
        const configPatch = retentionLimitsToConfig(limits);
        this.setConfig(configPatch);
      }
      /**
       * Set the agent runner (for summarization)
       */
      setRunner(runner) {
        this.runner = runner;
      }
      /**
       * Prune memory arrays if they exceed configured limits
       * @param force - If true, prune to exact limits; otherwise use threshold
       */
      pruneIfNeeded(force = false) {
        const threshold = force ? 1 : this.config.pruneThreshold;
        if (this.summaries.length > this.config.maxSummaries * threshold) {
          const toRemove = this.summaries.length - this.config.maxSummaries;
          this.summaries = this.summaries.slice(toRemove);
        }
        if (this.decisions.length > this.config.maxDecisions * threshold) {
          const toRemove = this.decisions.length - this.config.maxDecisions;
          this.decisions = this.decisions.slice(toRemove);
        }
        if (this.proposals.length > this.config.maxProposals * threshold) {
          const active = this.proposals.filter((p) => p.status === "active");
          const resolved = this.proposals.filter((p) => p.status !== "active");
          const targetTotal = this.config.maxProposals;
          if (active.length >= targetTotal) {
            this.proposals = active.slice(-targetTotal);
          } else {
            const resolvedToKeep = targetTotal - active.length;
            this.proposals = [
              ...resolved.slice(-resolvedToKeep),
              ...active
            ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          }
        }
        for (const [agentId, state] of this.agentStates) {
          if (state.keyPoints.length > this.config.maxAgentKeyPoints * threshold) {
            state.keyPoints = state.keyPoints.slice(-this.config.maxAgentKeyPoints);
          }
          if (state.positions.length > this.config.maxAgentPositions * threshold) {
            state.positions = state.positions.slice(-this.config.maxAgentPositions);
          }
          if (state.agreements.length > this.config.maxAgentPositions * threshold) {
            state.agreements = state.agreements.slice(-this.config.maxAgentPositions);
          }
          if (state.disagreements.length > this.config.maxAgentPositions * threshold) {
            state.disagreements = state.disagreements.slice(-this.config.maxAgentPositions);
          }
          this.agentStates.set(agentId, state);
        }
      }
      /**
       * Legacy method for backwards compatibility
       * @deprecated Use pruneIfNeeded() internally; this is kept for existing tests
       */
      enforceRetentionLimits() {
        this.pruneIfNeeded(true);
      }
      /**
       * Get memory usage statistics
       */
      getMemoryUsage() {
        let totalKeyPoints = 0;
        let totalPositions = 0;
        for (const state of this.agentStates.values()) {
          totalKeyPoints += state.keyPoints.length;
          totalPositions += state.positions.length + state.agreements.length + state.disagreements.length;
        }
        const agentCount = this.agentStates.size || 1;
        return {
          summaries: {
            count: this.summaries.length,
            max: this.config.maxSummaries,
            usage: this.summaries.length / this.config.maxSummaries
          },
          decisions: {
            count: this.decisions.length,
            max: this.config.maxDecisions,
            usage: this.decisions.length / this.config.maxDecisions
          },
          proposals: {
            count: this.proposals.length,
            max: this.config.maxProposals,
            usage: this.proposals.length / this.config.maxProposals
          },
          agents: {
            count: this.agentStates.size,
            avgKeyPoints: totalKeyPoints / agentCount,
            avgPositions: totalPositions / agentCount
          }
        };
      }
      /**
       * Cleanup inactive agent states (agents that haven't participated recently)
       * Call this periodically for long-running sessions
       */
      cleanupInactiveAgents(activeAgentIds) {
        const activeSet = new Set(activeAgentIds);
        let removed = 0;
        for (const agentId of this.agentStates.keys()) {
          if (!activeSet.has(agentId) && agentId !== "human") {
            this.agentStates.delete(agentId);
            removed++;
          }
        }
        return removed;
      }
      /**
       * Clear all inactive agents (no recent messages)
       * @param activeAgentIds - Set of currently active agent IDs to keep
       */
      clearInactiveAgents(activeAgentIds) {
        for (const agentId of this.agentStates.keys()) {
          if (!activeAgentIds.has(agentId)) {
            this.agentStates.delete(agentId);
          }
        }
      }
      /**
       * Process a new message and update memory
       */
      async processMessage(message, allMessages) {
        this.totalMessages = allMessages.length;
        this.extractFromMessage(message);
        if (this.shouldSummarize()) {
          await this.summarizeConversation(allMessages);
        }
        this.pruneIfNeeded();
      }
      /**
       * Extract key info from a single message using pattern matching
       * (per CONVERSATION_MEMORY.md spec)
       */
      extractFromMessage(message) {
        const agentId = message.agentId;
        if (agentId === "system") return;
        if (!this.agentStates.has(agentId)) {
          this.agentStates.set(agentId, {
            agentId,
            keyPoints: [],
            positions: [],
            agreements: [],
            disagreements: [],
            messageCount: 0
          });
        }
        const state = this.agentStates.get(agentId);
        state.messageCount++;
        const content = message.content;
        const isProposal = message.type === "proposal" || PROPOSAL_PATTERNS.some((p) => p.test(content));
        if (isProposal) {
          this.proposals.push({
            id: generateMemoryId(),
            type: "proposal",
            content: extractOutcome(content),
            topic: extractTopic(content),
            agentId,
            timestamp: message.timestamp,
            status: "active",
            // New proposals start as active
            reactions: []
            // Empty reactions array
          });
          state.keyPoints.push(this.extractFirstSentence(content));
        }
        const isDecision = DECISION_PATTERNS.some((p) => p.test(content));
        if (isDecision) {
          this.decisions.push({
            id: generateMemoryId(),
            type: "decision",
            content: extractOutcome(content),
            topic: extractTopic(content),
            agentId,
            timestamp: message.timestamp
          });
        }
        if (message.type === "agreement") {
          state.agreements.push(this.extractFirstSentence(content));
        } else {
          const reactionType = detectReaction(content);
          if (reactionType === "support") {
            state.agreements.push(this.extractFirstSentence(content));
          } else if (reactionType === "oppose") {
            state.disagreements.push(this.extractFirstSentence(content));
          }
        }
        if (message.type === "disagreement") {
          state.disagreements.push(this.extractFirstSentence(content));
        }
        this.pruneIfNeeded();
      }
      /**
       * Check if we need to summarize
       */
      shouldSummarize() {
        return this.totalMessages - this.lastSummarizedIndex >= SUMMARY_INTERVAL;
      }
      /**
       * Summarize the conversation using AI
       */
      async summarizeConversation(allMessages) {
        if (!this.runner) {
          this.createFallbackSummary(allMessages);
          return;
        }
        const startIdx = this.lastSummarizedIndex;
        const endIdx = Math.min(startIdx + SUMMARY_INTERVAL, allMessages.length);
        const messagesToSummarize = allMessages.slice(startIdx, endIdx);
        if (messagesToSummarize.length === 0) return;
        const conversationText = messagesToSummarize.map((m) => {
          const sender = m.agentId === "human" ? "Human" : m.agentId;
          return `[${sender}]: ${m.content}`;
        }).join("\n\n");
        try {
          const result = await this.runner.query({
            prompt: `Summarize this discussion segment concisely (2-3 sentences). Focus on:
1. Key decisions or agreements reached
2. Main proposals made
3. Unresolved disagreements

Discussion:
${conversationText}

Summary:`,
            systemPrompt: "You are a concise summarizer. Output only the summary, no preamble.",
            model: "claude-opus-4-6"
            // Use haiku for fast, cheap summarization (per CONVERSATION_MEMORY.md)
          });
          if (result.success && result.content) {
            this.summaries.push({
              id: generateMemoryId(),
              type: "summary",
              content: result.content,
              timestamp: /* @__PURE__ */ new Date(),
              messageRange: [startIdx, endIdx]
            });
          }
        } catch (error) {
          console.error("[ConversationMemory] Summarization failed:", error);
          this.createFallbackSummary(allMessages);
        }
        this.lastSummarizedIndex = endIdx;
      }
      /**
       * Create a simple fallback summary without AI
       */
      createFallbackSummary(allMessages) {
        const startIdx = this.lastSummarizedIndex;
        const endIdx = Math.min(startIdx + SUMMARY_INTERVAL, allMessages.length);
        const messagesToSummarize = allMessages.slice(startIdx, endIdx);
        const keyPoints = messagesToSummarize.filter((m) => m.agentId !== "system").slice(0, 5).map((m) => `- ${m.agentId}: ${this.extractFirstSentence(m.content)}`);
        this.summaries.push({
          id: generateMemoryId(),
          type: "summary",
          content: `Messages ${startIdx + 1}-${endIdx}:
${keyPoints.join("\n")}`,
          timestamp: /* @__PURE__ */ new Date(),
          messageRange: [startIdx, endIdx]
        });
        this.lastSummarizedIndex = endIdx;
      }
      /**
       * Extract first sentence from content
       */
      extractFirstSentence(content) {
        const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, "").trim();
        const match = cleaned.match(/^(.+?[.!?])/);
        if (match) {
          return match[1].slice(0, 150);
        }
        return cleaned.slice(0, 100) + (cleaned.length > 100 ? "..." : "");
      }
      /**
       * Get memory context for an agent's prompt
       */
      getMemoryContext(forAgentId) {
        const parts = [];
        if (this.summaries.length > 0) {
          parts.push("## Conversation Summary (so far)");
          this.summaries.forEach((s, i) => {
            parts.push(`### Segment ${i + 1} (messages ${(s.messageRange?.[0] || 0) + 1}-${s.messageRange?.[1] || 0})`);
            parts.push(s.content);
          });
        }
        if (this.decisions.length > 0) {
          parts.push("\n## Key Decisions & Agreements");
          this.decisions.slice(-5).forEach((d) => {
            parts.push(`- ${d.content}`);
          });
        }
        if (this.proposals.length > 0) {
          parts.push("\n## Active Proposals");
          this.proposals.slice(-5).forEach((p) => {
            parts.push(`- [${p.agentId}] ${p.content}`);
          });
        }
        if (forAgentId && this.agentStates.has(forAgentId)) {
          const state = this.agentStates.get(forAgentId);
          parts.push(`
## Your Previous Contributions (${forAgentId})`);
          if (state.keyPoints.length > 0) {
            parts.push("Key points you made:");
            state.keyPoints.slice(-3).forEach((p) => parts.push(`- ${p}`));
          }
          if (state.agreements.length > 0) {
            parts.push("You agreed with:");
            state.agreements.slice(-2).forEach((a) => parts.push(`- ${a}`));
          }
        }
        return parts.join("\n");
      }
      /**
       * Get concise memory for evaluation (shorter)
       */
      getEvalMemoryContext() {
        const parts = [];
        if (this.summaries.length > 0) {
          const latest = this.summaries[this.summaries.length - 1];
          parts.push(`Prior discussion: ${latest.content}`);
        }
        if (this.decisions.length > 0) {
          parts.push("Agreed: " + this.decisions.slice(-3).map((d) => d.content).join("; "));
        }
        return parts.join("\n");
      }
      /**
       * Serialize memory state
       */
      toJSON() {
        return {
          summaries: this.summaries,
          decisions: this.decisions,
          proposals: this.proposals,
          agentStates: Object.fromEntries(this.agentStates),
          lastSummarizedIndex: this.lastSummarizedIndex,
          totalMessages: this.totalMessages,
          config: this.config
        };
      }
      /**
       * Restore from serialized state
       */
      static fromJSON(data, runner, configOrLimits) {
        let effectiveConfig;
        if (configOrLimits) {
          if ("maxKeyPoints" in configOrLimits || "maxAgreements" in configOrLimits) {
            effectiveConfig = retentionLimitsToConfig(configOrLimits);
          } else {
            effectiveConfig = configOrLimits;
          }
        }
        const finalConfig = { ...data.config, ...effectiveConfig };
        const memory = new _ConversationMemory(runner, finalConfig);
        if (data.summaries) memory.summaries = data.summaries;
        if (data.decisions) memory.decisions = data.decisions;
        if (data.proposals) memory.proposals = data.proposals;
        if (data.agentStates) {
          const entries = Object.entries(data.agentStates);
          for (const [agentId, state] of entries) {
            memory.agentStates.set(agentId, {
              ...state,
              messageCount: state.messageCount ?? 0
              // Default for old saved sessions
            });
          }
        }
        if (data.lastSummarizedIndex) memory.lastSummarizedIndex = data.lastSummarizedIndex;
        if (data.totalMessages) memory.totalMessages = data.totalMessages;
        memory.pruneIfNeeded(true);
        return memory;
      }
      /**
       * Reset memory (for new session)
       */
      reset() {
        this.summaries = [];
        this.decisions = [];
        this.proposals = [];
        this.agentStates.clear();
        this.lastSummarizedIndex = 0;
        this.totalMessages = 0;
      }
      /**
       * Compact memory by aggressively pruning to 50% of limits
       * Use when memory pressure is high
       */
      compact() {
        const halfLimits = {
          maxSummaries: Math.ceil(this.config.maxSummaries / 2),
          maxDecisions: Math.ceil(this.config.maxDecisions / 2),
          maxProposals: Math.ceil(this.config.maxProposals / 2),
          maxAgentKeyPoints: Math.ceil(this.config.maxAgentKeyPoints / 2),
          maxAgentPositions: Math.ceil(this.config.maxAgentPositions / 2)
        };
        const originalConfig = this.config;
        this.config = { ...this.config, ...halfLimits };
        this.pruneIfNeeded(true);
        this.config = originalConfig;
      }
      /**
       * Get stats
       */
      getStats() {
        return {
          summaryCount: this.summaries.length,
          decisionCount: this.decisions.length,
          proposalCount: this.proposals.length,
          agentCount: this.agentStates.size
        };
      }
      /**
       * Update the status of a proposal (per CONVERSATION_MEMORY.md spec)
       * @param proposalId - ID of the proposal to update
       * @param status - New status to set
       * @returns true if proposal was found and updated, false otherwise
       */
      updateProposalStatus(proposalId, status2) {
        const proposal = this.proposals.find((p) => p.id === proposalId);
        if (proposal) {
          proposal.status = status2;
          return true;
        }
        return false;
      }
      /**
       * Add a reaction to a proposal
       * @param proposalId - ID of the proposal to react to
       * @param reaction - The reaction to add
       * @returns true if proposal was found and reaction added, false otherwise
       */
      addProposalReaction(proposalId, reaction) {
        const proposal = this.proposals.find((p) => p.id === proposalId);
        if (proposal) {
          if (!proposal.reactions) {
            proposal.reactions = [];
          }
          const existingIdx = proposal.reactions.findIndex((r) => r.agentId === reaction.agentId);
          if (existingIdx >= 0) {
            proposal.reactions[existingIdx] = reaction;
          } else {
            proposal.reactions.push(reaction);
          }
          return true;
        }
        return false;
      }
      /**
       * Get a proposal by ID
       * @param proposalId - ID of the proposal to find
       * @returns The proposal if found, undefined otherwise
       */
      getProposal(proposalId) {
        return this.proposals.find((p) => p.id === proposalId);
      }
      /**
       * Get all active proposals
       * @returns Array of proposals with status 'active'
       */
      getActiveProposals() {
        return this.proposals.filter((p) => p.status === "active");
      }
      /**
       * Get the most recent proposal for reaction tracking
       * @returns The most recent proposal, or undefined if none exist
       */
      getLatestProposal() {
        return this.proposals.length > 0 ? this.proposals[this.proposals.length - 1] : void 0;
      }
      /**
       * Track a reaction from an agent to the latest proposal
       * (Convenience method that auto-detects reaction from content)
       * @param agentId - ID of the reacting agent
       * @param content - Content to analyze for reaction type
       * @returns true if a reaction was tracked, false if no proposals exist
       */
      trackReactionToLatest(agentId, content) {
        const latest = this.getLatestProposal();
        if (!latest || !latest.id) return false;
        const reactionType = detectReaction(content);
        return this.addProposalReaction(latest.id, {
          agentId,
          reaction: reactionType,
          timestamp: /* @__PURE__ */ new Date()
        });
      }
    };
  }
});

// src/lib/eda/MessageBus.ts
var DEFAULT_BUS_CONFIG, MessageBus, messageBus;
var init_MessageBus = __esm({
  "src/lib/eda/MessageBus.ts"() {
    "use strict";
    init_ConversationMemory();
    DEFAULT_BUS_CONFIG = {
      maxMessages: 500,
      maxMessagesForContext: 50,
      virtualScrollWindow: 100,
      pruneThreshold: 0.9
    };
    MessageBus = class {
      subscriptions = [];
      messageHistory = [];
      isActive = false;
      memory;
      agentRunner;
      busConfig;
      prunedMessageCount = 0;
      // Track pruned messages for virtual scroll offset
      constructor(busConfig, memoryConfig) {
        this.busConfig = { ...DEFAULT_BUS_CONFIG, ...busConfig };
        this.memory = new ConversationMemory(void 0, memoryConfig);
      }
      /**
       * Configure message bus limits
       */
      setBusConfig(config) {
        this.busConfig = { ...this.busConfig, ...config };
        this.pruneMessagesIfNeeded(true);
      }
      /**
       * Configure memory limits
       */
      setMemoryConfig(config) {
        this.memory.setConfig(config);
      }
      /**
       * Get current configuration
       */
      getConfig() {
        return {
          bus: { ...this.busConfig },
          memory: this.memory.getConfig()
        };
      }
      /**
       * Prune old messages if history exceeds limit
       */
      pruneMessagesIfNeeded(force = false) {
        const threshold = force ? 1 : this.busConfig.pruneThreshold;
        const maxWithThreshold = this.busConfig.maxMessages * threshold;
        if (this.messageHistory.length > maxWithThreshold) {
          const toRemove = this.messageHistory.length - this.busConfig.maxMessages;
          this.messageHistory = this.messageHistory.slice(toRemove);
          this.prunedMessageCount += toRemove;
        }
      }
      /**
       * Subscribe to an event
       */
      subscribe(event, callback, subscriberId) {
        const subscription = {
          event,
          callback,
          subscriberId
        };
        this.subscriptions.push(subscription);
        return () => {
          this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
        };
      }
      /**
       * Emit an event to all subscribers
       */
      emit(event, payload) {
        if (!this.isActive && !event.startsWith("session:")) return;
        if (process.env.FORGE_DEBUG_BUS) {
          console.log(`[MessageBus] ${event}`);
        }
        const relevantSubs = this.subscriptions.filter((s) => s.event === event);
        for (const sub of relevantSubs) {
          try {
            setTimeout(() => sub.callback(payload), 0);
          } catch (error) {
            console.error(`[MessageBus] Error in subscriber ${sub.subscriberId}:`, error);
          }
        }
      }
      /**
       * Set the agent runner for memory summarization
       */
      setAgentRunner(runner) {
        this.agentRunner = runner;
        this.memory.setRunner(runner);
      }
      /**
       * Add message to history and emit
       */
      addMessage(message, fromAgent) {
        this.messageHistory.push(message);
        this.memory.processMessage(message, this.messageHistory).catch((err2) => {
          console.error("[MessageBus] Memory processing error:", err2);
        });
        this.pruneMessagesIfNeeded();
        this.emit("message:new", { message, fromAgent });
      }
      /**
       * Get conversation memory context
       */
      getMemoryContext(forAgentId) {
        return this.memory.getMemoryContext(forAgentId);
      }
      /**
       * Get brief memory context for evaluation
       */
      getEvalMemoryContext() {
        return this.memory.getEvalMemoryContext();
      }
      /**
       * Get memory stats
       */
      getMemoryStats() {
        return this.memory.getStats();
      }
      /**
       * Serialize memory for session save
       */
      getMemoryState() {
        return this.memory.toJSON();
      }
      /**
       * Restore memory from session load
       */
      restoreMemory(state) {
        this.memory = ConversationMemory.fromJSON(state, this.agentRunner);
      }
      /**
       * Get recent messages for context
       * @param count - Number of messages (capped at maxMessagesForContext)
       */
      getRecentMessages(count = 10) {
        const effectiveCount = Math.min(count, this.busConfig.maxMessagesForContext);
        return this.messageHistory.slice(-effectiveCount);
      }
      /**
       * Get all messages currently in memory
       * Note: May not include all session messages if pruning occurred
       */
      getAllMessages() {
        return [...this.messageHistory];
      }
      /**
       * Get total message count including pruned messages
       */
      getTotalMessageCount() {
        return this.prunedMessageCount + this.messageHistory.length;
      }
      /**
       * Get a window of messages for virtual scrolling
       * @param startIndex - Virtual index (accounts for pruned messages)
       * @param count - Number of messages to retrieve
       * @returns Messages in the window, or empty if out of range
       */
      getMessageWindow(startIndex, count) {
        const windowSize = count ?? this.busConfig.virtualScrollWindow;
        const adjustedStart = startIndex - this.prunedMessageCount;
        if (adjustedStart < 0) {
          const availableStart = Math.max(0, adjustedStart + windowSize);
          if (availableStart >= this.messageHistory.length) {
            return [];
          }
          return this.messageHistory.slice(availableStart, availableStart + windowSize);
        }
        if (adjustedStart >= this.messageHistory.length) {
          return [];
        }
        return this.messageHistory.slice(adjustedStart, adjustedStart + windowSize);
      }
      /**
       * Get virtual scroll info for UI
       */
      getScrollInfo() {
        return {
          totalCount: this.getTotalMessageCount(),
          availableStart: this.prunedMessageCount,
          availableEnd: this.prunedMessageCount + this.messageHistory.length - 1,
          prunedCount: this.prunedMessageCount
        };
      }
      /**
       * Get memory usage statistics
       */
      getUsageStats() {
        return {
          messages: {
            count: this.messageHistory.length,
            max: this.busConfig.maxMessages,
            pruned: this.prunedMessageCount,
            usage: this.messageHistory.length / this.busConfig.maxMessages
          },
          memory: this.memory.getMemoryUsage(),
          subscriptions: this.subscriptions.length
        };
      }
      /**
       * Compact memory to free resources
       * Aggressively prunes to 50% of limits
       */
      compact() {
        const targetMessages = Math.ceil(this.busConfig.maxMessages / 2);
        if (this.messageHistory.length > targetMessages) {
          const toRemove = this.messageHistory.length - targetMessages;
          this.messageHistory = this.messageHistory.slice(toRemove);
          this.prunedMessageCount += toRemove;
        }
        this.memory.compact();
      }
      /**
       * Start the bus
       */
      start(sessionId, goal) {
        this.isActive = true;
        this.messageHistory = [];
        this.prunedMessageCount = 0;
        this.memory.reset();
        this.emit("session:start", { sessionId, goal });
      }
      /**
       * Pause the bus
       */
      pause(reason) {
        this.emit("session:pause", { reason });
      }
      /**
       * Resume the bus
       */
      resume() {
        this.emit("session:resume", {});
      }
      /**
       * Full reset - clears all state for a clean slate without emitting events
       */
      fullReset() {
        this.isActive = false;
        this.messageHistory = [];
        this.prunedMessageCount = 0;
        this.memory.reset();
        this.subscriptions = [];
      }
      /**
       * Stop the bus
       */
      stop(reason) {
        this.isActive = false;
        this.emit("session:end", { reason });
        this.subscriptions = [];
      }
      /**
       * Clear inactive agent memory
       * @param activeAgentIds - Set of currently active agent IDs
       */
      clearInactiveAgents(activeAgentIds) {
        this.memory.clearInactiveAgents(activeAgentIds);
      }
      /**
       * Check if active
       */
      get active() {
        return this.isActive;
      }
      /**
       * Get subscriber count for an event
       */
      getSubscriberCount(event) {
        return this.subscriptions.filter((s) => s.event === event).length;
      }
    };
    messageBus = new MessageBus();
  }
});

// src/lib/eda/FloorManager.ts
var FloorManager;
var init_FloorManager = __esm({
  "src/lib/eda/FloorManager.ts"() {
    "use strict";
    FloorManager = class {
      bus;
      currentSpeaker = null;
      requestQueue = [];
      speakerHistory = [];
      isProcessing = false;
      // Configuration
      maxQueueSize = 10;
      speakerCooldown = 500;
      // ms before same agent can speak again
      floorTimeout = 3e4;
      // ms max time on floor
      floorTimeoutId = null;
      constructor(bus) {
        this.bus = bus;
        this.setupListeners();
      }
      setupListeners() {
        this.bus.subscribe("floor:request", (payload) => {
          this.handleFloorRequest(payload);
        }, "floor-manager");
        this.bus.subscribe("floor:released", (payload) => {
          this.handleFloorReleased(payload.agentId);
        }, "floor-manager");
        this.bus.subscribe("session:start", () => {
          this.reset();
        }, "floor-manager");
        this.bus.subscribe("session:end", () => {
          this.reset();
        }, "floor-manager");
      }
      /**
       * Handle incoming floor request
       */
      handleFloorRequest(request) {
        const lastSpoke = this.speakerHistory.find((h) => h.agentId === request.agentId);
        if (lastSpoke && Date.now() - lastSpoke.timestamp < this.speakerCooldown) {
          this.bus.emit("floor:denied", {
            agentId: request.agentId,
            reason: "cooldown"
          });
          return;
        }
        const queuedRequest = {
          ...request,
          queuedAt: Date.now()
        };
        this.insertIntoQueue(queuedRequest);
        console.log(`[FloorManager] Queued request from ${request.agentId} (urgency: ${request.urgency}). Queue size: ${this.requestQueue.length}`);
        if (!this.currentSpeaker && !this.isProcessing) {
          this.processQueue();
        }
      }
      /**
       * Insert request into queue based on urgency
       */
      insertIntoQueue(request) {
        this.requestQueue = this.requestQueue.filter((r) => r.agentId !== request.agentId);
        const urgencyOrder = { high: 0, medium: 1, low: 2 };
        const insertIndex = this.requestQueue.findIndex(
          (r) => urgencyOrder[r.urgency] > urgencyOrder[request.urgency]
        );
        if (insertIndex === -1) {
          this.requestQueue.push(request);
        } else {
          this.requestQueue.splice(insertIndex, 0, request);
        }
        if (this.requestQueue.length > this.maxQueueSize) {
          const removed = this.requestQueue.pop();
          if (removed) {
            this.bus.emit("floor:denied", {
              agentId: removed.agentId,
              reason: "queue_full"
            });
          }
        }
      }
      /**
       * Process the queue and grant floor to next speaker
       */
      processQueue() {
        if (this.currentSpeaker || this.requestQueue.length === 0) return;
        this.isProcessing = true;
        const nextRequest = this.requestQueue.shift();
        if (!nextRequest) {
          this.isProcessing = false;
          return;
        }
        this.currentSpeaker = nextRequest.agentId;
        this.isProcessing = false;
        console.log(`[FloorManager] Granting floor to ${nextRequest.agentId}`);
        this.bus.emit("floor:granted", {
          agentId: nextRequest.agentId,
          reason: nextRequest.reason
        });
        this.floorTimeoutId = setTimeout(() => {
          if (this.currentSpeaker === nextRequest.agentId) {
            console.log(`[FloorManager] Floor timeout for ${nextRequest.agentId}`);
            this.forceRelease(nextRequest.agentId);
          }
        }, this.floorTimeout);
      }
      /**
       * Handle floor release
       */
      handleFloorReleased(agentId) {
        if (this.currentSpeaker !== agentId) return;
        if (this.floorTimeoutId) {
          clearTimeout(this.floorTimeoutId);
          this.floorTimeoutId = null;
        }
        this.speakerHistory.push({ agentId, timestamp: Date.now() });
        if (this.speakerHistory.length > 50) {
          this.speakerHistory.shift();
        }
        this.currentSpeaker = null;
        console.log(`[FloorManager] Floor released by ${agentId}. Queue size: ${this.requestQueue.length}`);
        setTimeout(() => this.processQueue(), 100);
      }
      /**
       * Force release floor (timeout or interruption)
       */
      forceRelease(agentId) {
        if (this.currentSpeaker === agentId) {
          this.bus.emit("floor:released", { agentId });
        }
      }
      /**
       * Check if an agent has the floor
       */
      hasFloor(agentId) {
        return this.currentSpeaker === agentId;
      }
      /**
       * Get current speaker
       */
      getCurrentSpeaker() {
        return this.currentSpeaker;
      }
      /**
       * Get queue status
       */
      getQueueStatus() {
        return {
          current: this.currentSpeaker,
          queued: this.requestQueue.map((r) => r.agentId)
        };
      }
      /**
       * Reset manager
       */
      reset() {
        if (this.floorTimeoutId) {
          clearTimeout(this.floorTimeoutId);
          this.floorTimeoutId = null;
        }
        this.currentSpeaker = null;
        this.requestQueue = [];
        this.speakerHistory = [];
        this.isProcessing = false;
      }
    };
  }
});

// src/lib/claude-code-agent.ts
function generateAgentSystemPrompt(agent, config, context, skills) {
  const languageInstruction = getLanguageInstruction(config.language);
  return `# You are ${agent.name} (${agent.nameHe})

## Your Identity
- **Role**: ${agent.role}
- **Age**: ${agent.age}
- **Background**: ${agent.background}
- **Speaking Style**: ${agent.speakingStyle}

## Your Personality Traits
${agent.personality.map((p) => `- ${p}`).join("\n")}

## Your Known Biases (be aware of these)
${agent.biases.map((b) => `- ${b}`).join("\n")}

## Your Strengths
${agent.strengths.map((s) => `- ${s}`).join("\n")}

## Your Weaknesses (work around these)
${agent.weaknesses.map((w) => `- ${w}`).join("\n")}

## Current Project
- **Project Name**: ${config.projectName}
- **Goal**: ${config.goal}
${config.goalHe ? `- **Goal (Hebrew)**: ${config.goalHe}` : ""}

## Language Instructions
${languageInstruction}

## RTC Protocol (Recursive Thought Committee)
You are participating in a multi-agent discussion. Follow these rules:
1. **LISTEN**: Pay attention to what others say. Don't repeat points already made.
2. **RESPOND**: Address the conversation directly. Build on or challenge others' ideas.
3. **YIELD**: Keep responses focused. Don't monologue. Let others contribute.

## Response Format
Start your response with a type tag:
- [ARGUMENT] - Making a point or case
- [QUESTION] - Asking for clarification or probing
- [PROPOSAL] - Suggesting a concrete approach
- [AGREEMENT] - Supporting another agent's point
- [DISAGREEMENT] - Challenging another agent's point
- [SYNTHESIS] - Combining multiple perspectives

## REQUESTING RESEARCH (IMPORTANT!)
When you need data, statistics, competitor insights, or audience research, you MUST request it.
**The discussion will HALT until research is complete.**

**Available Researchers:**
- @stats-finder - Industry statistics, data points, research studies
- @competitor-analyst - Competitor messaging, positioning, gaps
- @audience-insight - Audience discussions, objections, language patterns
- @copy-explorer - Successful copy examples, proven patterns
- @local-context - Israeli market, Hebrew patterns, local insights

**How to Request:**
Simply mention the researcher with your query:
@stats-finder: \u05DE\u05D4 \u05D0\u05D7\u05D5\u05D6 \u05D4\u05D9\u05E9\u05E8\u05D0\u05DC\u05D9\u05DD \u05E9\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05D1\u05D1\u05D7\u05D9\u05E8\u05D5\u05EA \u05DE\u05E7\u05D5\u05DE\u05D9\u05D5\u05EA?
@competitor-analyst: \u05D0\u05D9\u05DA \u05D4\u05DE\u05EA\u05D7\u05E8\u05D9\u05DD \u05DE\u05E6\u05D9\u05D2\u05D9\u05DD \u05D0\u05EA \u05D4-value prop \u05E9\u05DC\u05D4\u05DD?

Or use the block format:
[RESEARCH: audience-insight]
\u05DE\u05D4 \u05D4\u05D4\u05EA\u05E0\u05D2\u05D3\u05D5\u05D9\u05D5\u05EA \u05D4\u05E0\u05E4\u05D5\u05E6\u05D5\u05EA \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DC\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D5\u05EA \u05D4\u05E6\u05D1\u05E2\u05D4?
[/RESEARCH]

**When to Request Research:**
- You're making a claim that needs data to back it up
- You want to see how competitors handle something
- You need specific audience language or objections
- You want examples of effective copy patterns
- You need Israeli market context

${context?.brand ? `
## Brand Context
${JSON.stringify(context.brand, null, 2)}
` : ""}

${context?.audience ? `
## Target Audience
${JSON.stringify(context.audience, null, 2)}
` : ""}

${skills ? `
## Available Skills
${skills}
` : ""}
`;
}
function getLanguageInstruction(language) {
  switch (language) {
    case "english":
      return "Write in English only.";
    case "mixed":
      return "Write primarily in Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA), but include English translations for key terms in parentheses.";
    default:
      return "Write primarily in Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA). Use natural Hebrew copywriting style.";
  }
}
var ElectronAgentRunner, ClaudeCodeAgent;
var init_claude_code_agent = __esm({
  "src/lib/claude-code-agent.ts"() {
    "use strict";
    ElectronAgentRunner = class {
      async query(params) {
        const result = await window.electronAPI?.claudeAgentQuery?.({
          prompt: params.prompt,
          systemPrompt: params.systemPrompt,
          model: params.model
        });
        if (!result || !result.success) {
          return {
            success: false,
            error: result?.error || "Failed to run agent query"
          };
        }
        return {
          success: true,
          content: result.content || "",
          sessionId: result.sessionId,
          usage: result.usage
        };
      }
      async evaluate(params) {
        const result = await window.electronAPI?.claudeAgentEvaluate?.({ evalPrompt: params.evalPrompt });
        if (!result) {
          return { success: false, urgency: "pass", reason: "No API", responseType: "" };
        }
        return {
          success: true,
          urgency: result.urgency,
          reason: result.reason,
          responseType: result.responseType
        };
      }
    };
    ClaudeCodeAgent = class {
      persona;
      systemPrompt;
      runner;
      constructor(persona, config, context, skills, runner) {
        this.persona = persona;
        this.systemPrompt = generateAgentSystemPrompt(persona, config, context, skills);
        this.runner = runner || new ElectronAgentRunner();
      }
      /**
       * Send a prompt and get a response
       */
      async query(conversationContext) {
        const result = await this.runner.query({
          prompt: conversationContext,
          systemPrompt: this.systemPrompt,
          model: "claude-sonnet-4-20250514"
        });
        if (!result.success) {
          throw new Error(result.error || "Failed to run agent query");
        }
        return {
          content: result.content || "",
          sessionId: result.sessionId,
          usage: result.usage
        };
      }
      /**
       * Evaluate whether to speak (lightweight query)
       */
      async evaluateReaction(recentConversation, messagesSinceSpoke) {
        const evalPrompt = `You are ${this.persona.name}, listening to a discussion.
Your role: ${this.persona.role}
Your perspective: ${this.persona.personality.slice(0, 2).join(", ")}
Your biases: ${this.persona.biases.slice(0, 2).join(", ")}

You've been silent for ${messagesSinceSpoke} messages.

EVALUATE: Should you speak NOW? Consider:
- Does this touch YOUR specific concerns?
- Can you add something UNIQUE that others haven't said?
- Is silence appropriate (let others contribute)?

Recent conversation:
${recentConversation}

Respond ONLY with JSON:
{
  "urgency": "high" | "medium" | "low" | "pass",
  "reason": "10 words max - why speak or pass",
  "responseType": "argument" | "question" | "proposal" | "agreement" | "disagreement" | ""
}`;
        const result = await this.runner.evaluate({ evalPrompt });
        return {
          urgency: result.urgency,
          reason: result.reason,
          responseType: result.responseType
        };
      }
      /**
       * Generate a full response when given the floor
       */
      async generateResponse(conversationContext, triggerReason) {
        const prompt = `## Discussion Context
${conversationContext}

## Why You're Speaking
You raised your hand because: "${triggerReason}"

## Your Task
As ${this.persona.name}, respond to the discussion. Address the trigger reason directly.
Be concise. Follow RTC protocol (LISTEN \u2192 RESPOND \u2192 YIELD).

Start with a type tag: [ARGUMENT], [QUESTION], [PROPOSAL], [AGREEMENT], [DISAGREEMENT], or [SYNTHESIS]`;
        const response = await this.query(prompt);
        const typeMatch = response.content.match(/\[(?:TYPE:\s*)?(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
        const type = typeMatch ? typeMatch[1].toLowerCase() : "argument";
        return { content: response.content, type };
      }
      getPersona() {
        return this.persona;
      }
      /**
       * Get the runner (useful for testing/inspection)
       */
      getRunner() {
        return this.runner;
      }
    };
  }
});

// src/lib/eda/AgentListener.ts
var DEFAULT_CONFIG2, AgentListener;
var init_AgentListener = __esm({
  "src/lib/eda/AgentListener.ts"() {
    "use strict";
    init_claude_code_agent();
    init_personas();
    DEFAULT_CONFIG2 = {
      reactivityThreshold: 0.95,
      minSilenceBeforeReact: 1,
      evaluationDebounce: 150,
      maxEvaluationMessages: 6,
      // Drafting phases pass context explicitly via `speakNow(contextOverride)`,
      // so autonomous speaking only needs a short recent window — bounds O(N²)
      // prompt growth in long sessions.
      maxResponseMessages: 6,
      skipAutonomousEval: false
      // tests rely on autonomous eval
    };
    AgentListener = class {
      id;
      agent;
      bus;
      sessionConfig = null;
      state = "listening";
      messagesSinceSpoke = 0;
      pendingEvaluation = null;
      unsubscribers = [];
      config;
      // Claude Code Agent instance
      claudeAgent = null;
      // Optional injected runner (for CLI)
      agentRunner;
      constructor(agent, bus, config = {}, agentRunner) {
        this.id = agent.id;
        this.agent = agent;
        this.bus = bus;
        this.config = { ...DEFAULT_CONFIG2, ...config };
        this.agentRunner = agentRunner;
      }
      /**
       * Start listening to the bus
       */
      start(sessionConfig, context, skills) {
        this.sessionConfig = sessionConfig;
        this.state = "listening";
        this.messagesSinceSpoke = 0;
        this.claudeAgent = new ClaudeCodeAgent(
          this.agent,
          sessionConfig,
          context,
          skills,
          this.agentRunner
        );
        this.unsubscribers.push(
          this.bus.subscribe("message:new", (payload) => {
            this.onMessage(payload.message, payload.fromAgent);
          }, this.id)
        );
        this.unsubscribers.push(
          this.bus.subscribe("floor:granted", (payload) => {
            if (payload.agentId === this.id) {
              this.onFloorGranted(payload.reason);
            }
          }, this.id)
        );
        this.unsubscribers.push(
          this.bus.subscribe("floor:denied", (payload) => {
            if (payload.agentId === this.id) {
              this.onFloorDenied(payload.reason);
            }
          }, this.id)
        );
        this.unsubscribers.push(
          this.bus.subscribe("session:end", () => {
            this.stop();
          }, this.id)
        );
        this.unsubscribers.push(
          this.bus.subscribe("session:pause", () => {
            if (this.pendingEvaluation) {
              clearTimeout(this.pendingEvaluation);
              this.pendingEvaluation = null;
            }
            this.state = "listening";
            console.log(`[AgentListener:${this.id}] Paused (research/halt)`);
          }, this.id)
        );
        this.unsubscribers.push(
          this.bus.subscribe("session:resume", () => {
            console.log(`[AgentListener:${this.id}] Resumed`);
            if (this.messagesSinceSpoke > 0 && this.state === "listening") {
              this.pendingEvaluation = setTimeout(() => {
                this.evaluateAndReact();
              }, this.config.evaluationDebounce + Math.random() * 100);
            }
          }, this.id)
        );
        console.log(`[AgentListener:${this.id}] Started with ${this.agentRunner ? "injected runner" : "default runner"}`);
      }
      /**
       * Stop listening
       */
      stop() {
        if (this.pendingEvaluation) {
          clearTimeout(this.pendingEvaluation);
          this.pendingEvaluation = null;
        }
        this.unsubscribers.forEach((unsub) => unsub());
        this.unsubscribers = [];
        this.state = "listening";
        this.claudeAgent = null;
        console.log(`[AgentListener:${this.id}] Stopped listening`);
      }
      /**
       * Handle new message - core listening logic
       */
      onMessage(_message, fromAgent) {
        if (fromAgent === this.id) {
          this.messagesSinceSpoke = 0;
          return;
        }
        this.messagesSinceSpoke++;
        if (this.config.skipAutonomousEval) {
          return;
        }
        if (this.state === "speaking" || this.state === "thinking") {
          return;
        }
        if (this.pendingEvaluation) {
          clearTimeout(this.pendingEvaluation);
        }
        this.pendingEvaluation = setTimeout(() => {
          this.evaluateAndReact();
        }, this.config.evaluationDebounce);
      }
      /**
       * Evaluate the conversation and decide whether to request floor
       */
      async evaluateAndReact() {
        if (!this.sessionConfig || !this.claudeAgent) return;
        if (this.state !== "listening") return;
        if (this.messagesSinceSpoke < this.config.minSilenceBeforeReact) {
          return;
        }
        if (Math.random() > this.config.reactivityThreshold) {
          console.log(`[AgentListener:${this.id}] Skipping reaction (probability threshold ${this.config.reactivityThreshold})`);
          return;
        }
        this.state = "thinking";
        try {
          const recentMessages = this.bus.getRecentMessages(this.config.maxEvaluationMessages);
          const conversationHistory = this.formatConversation(recentMessages);
          const memoryContext = this.bus.getEvalMemoryContext();
          const fullContext = memoryContext ? `${memoryContext}

---
Recent:
${conversationHistory}` : conversationHistory;
          const reaction = await this.claudeAgent.evaluateReaction(
            fullContext,
            this.messagesSinceSpoke
          );
          if (reaction.urgency !== "pass") {
            const request = {
              agentId: this.id,
              urgency: reaction.urgency,
              reason: reaction.reason,
              responseType: reaction.responseType,
              timestamp: Date.now()
            };
            this.state = "waiting";
            this.bus.emit("floor:request", request);
            console.log(`[AgentListener:${this.id}] Requesting floor (${reaction.urgency}): ${reaction.reason}`);
          } else {
            this.state = "listening";
            console.log(`[AgentListener:${this.id}] Passing: ${reaction.reason}`);
          }
        } catch (error) {
          console.error(`[AgentListener:${this.id}] Evaluation error:`, error);
          this.state = "listening";
        }
      }
      /**
       * Called when granted the floor
       */
      async onFloorGranted(reason) {
        if (!this.sessionConfig || !this.claudeAgent) return;
        this.state = "speaking";
        console.log(`[AgentListener:${this.id}] Got floor, speaking...`);
        try {
          const recentMessages = this.bus.getRecentMessages(this.config.maxResponseMessages);
          const conversationHistory = this.formatConversation(recentMessages);
          const memoryContext = this.bus.getMemoryContext(this.id);
          const fullContext = memoryContext ? `${memoryContext}

---
Recent Discussion:
${conversationHistory}` : conversationHistory;
          const response = await this.claudeAgent.generateResponse(
            fullContext,
            reason
          );
          const message = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: this.id,
            type: response.type,
            content: response.content,
            metadata: {
              triggerReason: reason,
              poweredBy: this.agentRunner ? "cli-runner" : "electron-runner"
            }
          };
          this.bus.addMessage(message, this.id);
          this.bus.emit("floor:released", { agentId: this.id });
          this.state = "listening";
          this.messagesSinceSpoke = 0;
        } catch (error) {
          console.error(`[AgentListener:${this.id}] Response error:`, error);
          this.bus.emit("floor:released", { agentId: this.id });
          this.state = "listening";
        }
      }
      /**
       * Speak now — bypass FloorManager, used by the orchestrator's deterministic
       * phase executor to drive discovery/synthesis/drafting turn-by-turn.
       *
       * When `contextOverride` is provided, the agent receives exactly that string
       * as its conversation context (no bus history merge). The drafting phase
       * passes a synthesized summary + already-drafted sections here to keep the
       * per-turn prompt small and focused.
       *
       * Returns the produced Message, or null on failure.
       */
      async speakNow(reason, contextOverride) {
        if (!this.sessionConfig || !this.claudeAgent) return null;
        if (this.state === "speaking") return null;
        this.state = "speaking";
        try {
          let fullContext;
          if (contextOverride !== void 0) {
            fullContext = contextOverride;
          } else {
            const recentMessages = this.bus.getRecentMessages(this.config.maxResponseMessages);
            const conversationHistory = this.formatConversation(recentMessages);
            const memoryContext = this.bus.getMemoryContext(this.id);
            fullContext = memoryContext ? `${memoryContext}

---
Recent Discussion:
${conversationHistory}` : conversationHistory;
          }
          const response = await this.claudeAgent.generateResponse(fullContext, reason);
          const message = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: this.id,
            type: response.type,
            content: response.content,
            metadata: {
              triggerReason: reason,
              poweredBy: this.agentRunner ? "cli-runner" : "electron-runner"
            }
          };
          this.bus.addMessage(message, this.id);
          this.state = "listening";
          this.messagesSinceSpoke = 0;
          return message;
        } catch (error) {
          console.error(`[AgentListener:${this.id}] speakNow error:`, error);
          this.state = "listening";
          return null;
        }
      }
      /**
       * Called when floor request is denied
       */
      onFloorDenied(reason) {
        console.log(`[AgentListener:${this.id}] Floor denied: ${reason}`);
        this.state = "listening";
      }
      /**
       * Format messages into conversation string
       */
      formatConversation(messages) {
        return messages.map((msg) => {
          const sender = msg.agentId === "human" ? "Human" : msg.agentId === "system" ? "System" : getAgentById(msg.agentId)?.name || msg.agentId;
          return `[${sender}]: ${msg.content}`;
        }).join("\n\n");
      }
      /**
       * Get current state
       */
      getState() {
        return this.state;
      }
    };
  }
});

// src/methodologies/index.ts
function getDefaultMethodology() {
  return { ...DEFAULT_METHODOLOGY };
}
var VISUAL_DECISION_RULES, STRUCTURE_DECISION_RULES, DEFAULT_PHASES, DEFAULT_METHODOLOGY;
var init_methodologies = __esm({
  "src/methodologies/index.ts"() {
    "use strict";
    VISUAL_DECISION_RULES = [
      {
        condition: "Showing change over time or trends",
        recommendedVisual: "chart",
        reasoning: "Line or area charts best show temporal progression",
        examples: ["Growth metrics", "Historical data", "Progress tracking"]
      },
      {
        condition: "Comparing quantities or proportions",
        recommendedVisual: "graph",
        reasoning: "Bar graphs clearly show relative differences",
        examples: ["Market share", "Survey results", "Budget allocation"]
      },
      {
        condition: "Showing before/after or two opposing states",
        recommendedVisual: "comparison",
        reasoning: "Side-by-side visuals make differences immediately clear",
        examples: ["Problem vs solution", "Old way vs new way", "Us vs competitors"]
      },
      {
        condition: "Explaining abstract concepts or emotions",
        recommendedVisual: "illustration",
        reasoning: "Illustrations can represent intangible ideas visually",
        examples: ["Community feeling", "Trust", "Hope", "Connection"]
      },
      {
        condition: "Building trust through authenticity",
        recommendedVisual: "photo",
        reasoning: "Real photos of real people/places build credibility",
        examples: ["Team photos", "Location shots", "User testimonials"]
      },
      {
        condition: "Presenting multiple related statistics",
        recommendedVisual: "infographic",
        reasoning: "Infographics combine data with visual hierarchy",
        examples: ["Key metrics dashboard", "Process overview", "Fact sheets"]
      },
      {
        condition: "Content is narrative or emotional",
        recommendedVisual: "none",
        reasoning: "Sometimes text alone is more powerful",
        examples: ["Personal stories", "Mission statements", "Emotional appeals"]
      }
    ];
    STRUCTURE_DECISION_RULES = [
      {
        condition: "Explaining a sequence or process",
        recommendedStructure: "numbered",
        reasoning: "Numbers imply order and make steps easy to follow",
        examples: ["How it works", "Getting started", "Step-by-step guide"]
      },
      {
        condition: "Listing features or benefits",
        recommendedStructure: "bullets",
        reasoning: "Bullets allow quick scanning without implied order",
        examples: ["Feature list", "Benefits", "What you get"]
      },
      {
        condition: "Showing us vs them or two options",
        recommendedStructure: "comparison",
        reasoning: "Tables or columns make differences clear",
        examples: ["Pricing tiers", "Plan comparison", "Before/after"]
      },
      {
        condition: "Telling a story or building emotional connection",
        recommendedStructure: "prose",
        reasoning: "Continuous text allows narrative flow and emotional buildup",
        examples: ["About us", "Founder story", "Mission statement"]
      },
      {
        condition: "Showing history or progression",
        recommendedStructure: "timeline",
        reasoning: "Timelines show progression and milestones",
        examples: ["Company history", "Project roadmap", "Achievement milestones"]
      },
      {
        condition: "Presenting key metrics or numbers",
        recommendedStructure: "stats",
        reasoning: "Bold numbers with labels grab attention",
        examples: ["Impact metrics", "Growth numbers", "Social proof"]
      },
      {
        condition: "Showing multiple related items equally",
        recommendedStructure: "grid",
        reasoning: "Grids give equal visual weight to all items",
        examples: ["Team members", "Product features", "Testimonials"]
      }
    ];
    DEFAULT_PHASES = [
      {
        phase: "initialization",
        description: "Set up the session and introduce the goal",
        maxRounds: 1,
        requiredActions: ["Load configuration", "Introduce agents", "Present goal"],
        exitConditions: ["All agents acknowledged"]
      },
      {
        phase: "context_loading",
        description: "Load and review context materials",
        maxRounds: 2,
        requiredActions: ["Scan context folder", "Summarize findings", "Identify gaps"],
        exitConditions: ["Context reviewed", "Gaps identified"]
      },
      {
        phase: "research",
        description: "Gather additional information if needed",
        maxRounds: 3,
        requiredActions: ["Request research", "Review findings", "Extract insights"],
        exitConditions: ["Sufficient information gathered", "No more questions"]
      },
      {
        phase: "brainstorming",
        description: "Generate ideas freely",
        maxRounds: 5,
        requiredActions: ["Generate ideas", "Build on others", "No criticism yet"],
        exitConditions: ["Enough ideas generated", "Ideas start repeating"]
      },
      {
        phase: "argumentation",
        description: "Debate and refine ideas",
        maxRounds: 10,
        requiredActions: ["Present arguments", "Counter-argue", "Find common ground"],
        exitConditions: ["Key points settled", "Ready for synthesis"]
      },
      {
        phase: "synthesis",
        description: "Combine best elements",
        maxRounds: 3,
        requiredActions: ["Identify best elements", "Propose combinations", "Refine"],
        exitConditions: ["Synthesis achieved", "Ready for drafting"]
      },
      {
        phase: "drafting",
        description: "Create actual content",
        maxRounds: 5,
        requiredActions: ["Write drafts", "Review structure", "Check visual needs"],
        exitConditions: ["Drafts complete", "Ready for review"]
      },
      {
        phase: "review",
        description: "Critique and improve drafts",
        maxRounds: 5,
        requiredActions: ["Review each draft", "Provide feedback", "Suggest changes"],
        exitConditions: ["All feedback given", "Changes incorporated"]
      },
      {
        phase: "consensus",
        description: "Reach final agreement",
        maxRounds: 3,
        requiredActions: ["Present final versions", "Vote/discuss", "Resolve conflicts"],
        exitConditions: ["Consensus reached", "Minority concerns documented"]
      },
      {
        phase: "finalization",
        description: "Finalize and export",
        maxRounds: 1,
        requiredActions: ["Final review", "Export content", "Document decisions"],
        exitConditions: ["Content exported", "Session complete"]
      }
    ];
    DEFAULT_METHODOLOGY = {
      argumentationStyle: "mixed",
      consensusMethod: "consent",
      visualDecisionRules: VISUAL_DECISION_RULES,
      structureDecisionRules: STRUCTURE_DECISION_RULES,
      phases: DEFAULT_PHASES
    };
  }
});

// src/lib/claude.ts
import Anthropic2 from "@anthropic-ai/sdk";
function initializeClient(apiKey) {
  if (!client || apiKey) {
    client = new Anthropic2({
      apiKey: apiKey || "",
      // Will use Claude Code credentials via SDK
      dangerouslyAllowBrowser: true
      // Required for Electron renderer process
    });
  }
  return client;
}
function getClient() {
  if (!client) {
    return initializeClient();
  }
  return client;
}
async function generateRoundSynthesis(config, roundMessages, roundNumber, _context) {
  const client2 = getClient();
  const conversationHistory = roundMessages.map((msg) => {
    const sender = msg.agentId === "human" ? "Human" : msg.agentId === "system" ? "System" : getAgentById(msg.agentId)?.name || msg.agentId;
    return `[${sender}]: ${msg.content}`;
  }).join("\n\n");
  const response = await client2.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: `You are the Devil's Kitchen - the synthesis voice of the Recursive Thought Committee (RTC).

Your role after each round:
1. **Surface Agreements** - What points are multiple agents aligning on?
2. **Name Tensions** - What unresolved disagreements need addressing?
3. **Track Progress** - Are we moving toward consensus or diverging?
4. **Prompt Next Round** - What question should the next round address?

Be BRIEF and STRUCTURED. This is a quick checkpoint, not a full synthesis.

Write in Hebrew with English terms where appropriate.
Use emojis sparingly for visual scanning: \u2705 agreements, \u26A1 tensions, \u{1F3AF} focus`,
    messages: [
      {
        role: "user",
        content: `Round ${roundNumber} complete. Project: ${config.projectName}

Here's what was said:

${conversationHistory}

Provide a Devil's Kitchen synthesis for this round.`
      }
    ]
  });
  return response.content[0].type === "text" ? response.content[0].text : "";
}
var client;
var init_claude = __esm({
  "src/lib/claude.ts"() {
    "use strict";
    init_personas();
    init_methodologies();
    client = null;
  }
});

// src/lib/modes/index.ts
function getModeById(id) {
  return SESSION_MODES[id];
}
function getDefaultMode() {
  return COPYWRITE_MODE;
}
var COPYWRITE_MODE, IDEA_VALIDATION_MODE, IDEATION_MODE, WILL_IT_WORK_MODE, SITE_SURVEY_MODE, BUSINESS_PLAN_MODE, GTM_STRATEGY_MODE, CUSTOM_MODE, SESSION_MODES;
var init_modes = __esm({
  "src/lib/modes/index.ts"() {
    "use strict";
    COPYWRITE_MODE = {
      id: "copywrite",
      name: "Copywriting",
      nameHe: "\u05E7\u05D5\u05E4\u05D9\u05E8\u05D9\u05D9\u05D8\u05D9\u05E0\u05D2",
      description: "Create compelling website copy that converts",
      icon: "\u270D\uFE0F",
      goalReminder: {
        frequency: 8,
        template: `\u{1F3AF} **GOAL REMINDER**: We're here to create compelling copy for {goal}.

NOT to endlessly debate or research. We need:
1. A hook that grabs attention
2. Clear value proposition
3. Proof/credibility
4. Strong CTA

If you've been researching the same topic twice, STOP and synthesize what you have.
If you've been arguing the same point for 3+ messages, find common ground or move on.

What concrete copy can we write RIGHT NOW?`
      },
      phases: [
        {
          id: "discovery",
          name: "Discovery",
          order: 1,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Audience and value prop understood",
          agentFocus: "Understand the audience, their pain points, and what makes this offering unique"
        },
        {
          id: "research",
          name: "Research",
          order: 2,
          maxMessages: 20,
          autoTransition: true,
          transitionCriteria: "Enough data gathered",
          agentFocus: "Gather specific data, examples, and proof points. NO more than 3 research requests."
        },
        {
          id: "ideation",
          name: "Ideation",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Multiple approaches proposed",
          agentFocus: "Propose concrete copy approaches. Each agent should offer ONE specific angle."
        },
        {
          id: "synthesis",
          name: "Synthesis",
          order: 4,
          maxMessages: 10,
          autoTransition: true,
          transitionCriteria: "Consensus on approach",
          agentFocus: "Combine the best elements. Find what we all agree works."
        },
        {
          id: "drafting",
          name: "Drafting",
          order: 5,
          maxMessages: 15,
          autoTransition: false,
          transitionCriteria: "Copy sections complete",
          agentFocus: "Write actual copy. Hero, benefits, CTA. Be specific, not abstract."
        }
      ],
      research: {
        maxRequests: 5,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 1
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 3,
        maxRoundsWithoutProgress: 4,
        intervention: `\u26A0\uFE0F **LOOP DETECTED**: We're going in circles.

STOP debating the same points. Here's what we do now:
1. Each agent: State your ONE best idea in 2 sentences
2. Find the overlap - what do we all agree on?
3. Write ONE concrete piece of copy based on that agreement

No more research. No more "but what about..."
Let's WRITE something.`
      },
      successCriteria: {
        minConsensusPoints: 3,
        requiredOutputs: ["hero", "value_proposition", "cta"],
        maxMessages: 60
      },
      agentInstructions: `You are creating COPY, not having an academic discussion.

RULES:
- Research is a MEANS, not an END. One research request should yield actionable insights.
- If you've made a point twice, don't make it again. Move forward.
- Propose SPECIFIC copy, not abstract concepts.
- "I think we should..." is weak. "Here's the headline: ..." is strong.
- Disagree by offering ALTERNATIVES, not just criticism.
- When in doubt, WRITE something. Bad copy can be fixed; no copy cannot.

Your output should be COPY that a human would actually use, not a discussion about copy.`
    };
    IDEA_VALIDATION_MODE = {
      id: "idea-validation",
      name: "Idea Validation",
      nameHe: "\u05D1\u05D3\u05D9\u05E7\u05EA \u05E8\u05E2\u05D9\u05D5\u05DF",
      description: "Critically evaluate if an idea is viable",
      icon: "\u{1F50D}",
      goalReminder: {
        frequency: 10,
        template: `\u{1F3AF} **VALIDATION FOCUS**: We're evaluating: {goal}

We need to answer:
1. Is there real demand? (Evidence, not assumptions)
2. Can it be built/executed? (Practical feasibility)
3. Is the timing right? (Market conditions)
4. What are the dealbreakers?

Reach a VERDICT: GO / NO-GO / PIVOT TO X`
      },
      phases: [
        {
          id: "understand",
          name: "Understand",
          order: 1,
          maxMessages: 10,
          autoTransition: true,
          transitionCriteria: "Idea fully understood",
          agentFocus: "Clarify exactly what the idea is and what success looks like"
        },
        {
          id: "research",
          name: "Market Research",
          order: 2,
          maxMessages: 20,
          autoTransition: true,
          transitionCriteria: "Market data gathered",
          agentFocus: "Find evidence of demand, competition, and market size"
        },
        {
          id: "stress-test",
          name: "Stress Test",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Major risks identified",
          agentFocus: "Challenge the idea. Find weaknesses. Play devil's advocate."
        },
        {
          id: "verdict",
          name: "Verdict",
          order: 4,
          maxMessages: 10,
          autoTransition: false,
          transitionCriteria: "Consensus reached",
          agentFocus: "Reach a clear GO/NO-GO/PIVOT verdict with reasoning"
        }
      ],
      research: {
        maxRequests: 8,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 2
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 3,
        maxRoundsWithoutProgress: 3,
        intervention: `\u26A0\uFE0F We're circling. Time to decide.

Each agent: Give your verdict NOW:
- GO: "Yes because..."
- NO-GO: "No because..."
- PIVOT: "Change it to..."

No more "it depends" or "we need more research." Decide.`
      },
      successCriteria: {
        minConsensusPoints: 2,
        requiredOutputs: ["verdict", "reasoning", "next_steps"],
        maxMessages: 50
      },
      agentInstructions: `You are a critical evaluator, not a cheerleader.

RULES:
- Demand EVIDENCE, not opinions
- "I feel like there's demand" is worthless. "Reddit has 50 posts asking for this" is valuable.
- Be willing to say NO. Killing a bad idea early saves years of wasted effort.
- Identify the ONE thing that would make this fail
- Don't hedge. Take a position.`
    };
    IDEATION_MODE = {
      id: "ideation",
      name: "Ideation",
      nameHe: "\u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA",
      description: "Generate ideas by scouting Reddit, forums, and market gaps",
      icon: "\u{1F4A1}",
      goalReminder: {
        frequency: 12,
        template: `\u{1F3AF} **IDEATION GOAL**: Find opportunities in {goal}

We want:
1. Real problems people are complaining about
2. Gaps in existing solutions
3. Emerging trends
4. Underserved niches

Output: A ranked list of 3-5 concrete ideas with evidence of demand.`
      },
      phases: [
        {
          id: "scout",
          name: "Scout",
          order: 1,
          maxMessages: 25,
          autoTransition: true,
          transitionCriteria: "Enough signals gathered",
          agentFocus: "Find complaints, wishes, and pain points in the target domain"
        },
        {
          id: "pattern",
          name: "Pattern Recognition",
          order: 2,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Patterns identified",
          agentFocus: "What themes emerge? What problems appear repeatedly?"
        },
        {
          id: "ideate",
          name: "Ideate",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Ideas generated",
          agentFocus: "Propose specific solutions to the problems found"
        },
        {
          id: "rank",
          name: "Rank & Refine",
          order: 4,
          maxMessages: 10,
          autoTransition: false,
          transitionCriteria: "Top ideas selected",
          agentFocus: "Vote on best ideas. Output final ranked list with evidence."
        }
      ],
      research: {
        maxRequests: 15,
        maxPerTopic: 3,
        requiredBeforeSynthesis: 5
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 4,
        maxRoundsWithoutProgress: 5,
        intervention: `\u26A0\uFE0F Time to synthesize what we've found.

Each agent: Name your TOP 1 idea based on research so far.
We'll vote and produce our final list.`
      },
      successCriteria: {
        minConsensusPoints: 3,
        requiredOutputs: ["idea_list", "evidence", "next_steps"],
        maxMessages: 70
      },
      agentInstructions: `You are an opportunity scout.

RULES:
- Real complaints > theoretical problems
- "10 people asked for this on Reddit" beats "I think people might want..."
- Look for: complaints, workarounds, "I wish...", failed products in the space
- Quantity first, then quality. Generate many ideas before filtering.
- The best ideas solve problems people are ALREADY trying to solve themselves.`
    };
    WILL_IT_WORK_MODE = {
      id: "will-it-work",
      name: "Will It Work?",
      nameHe: "\u05D4\u05D0\u05DD \u05D6\u05D4 \u05D9\u05E2\u05D1\u05D5\u05D3?",
      description: "Reach a definitive conclusion on feasibility",
      icon: "\u2696\uFE0F",
      goalReminder: {
        frequency: 8,
        template: `\u{1F3AF} **THE QUESTION**: Will {goal} work?

We must answer with:
- YES (with conditions)
- NO (with reasons)
- MAYBE IF (specific changes needed)

No fence-sitting. No "it depends." A clear answer.`
      },
      phases: [
        {
          id: "define",
          name: "Define Success",
          order: 1,
          maxMessages: 8,
          autoTransition: true,
          transitionCriteria: "Success defined",
          agentFocus: 'What does "working" mean? Define measurable success criteria.'
        },
        {
          id: "evidence",
          name: "Gather Evidence",
          order: 2,
          maxMessages: 20,
          autoTransition: true,
          transitionCriteria: "Evidence gathered",
          agentFocus: "Find evidence FOR and AGAINST. Be balanced."
        },
        {
          id: "debate",
          name: "Structured Debate",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Arguments exhausted",
          agentFocus: "Make your case. Attack weak arguments. Defend strong ones."
        },
        {
          id: "verdict",
          name: "Verdict",
          order: 4,
          maxMessages: 8,
          autoTransition: false,
          transitionCriteria: "Verdict reached",
          agentFocus: "Vote. Explain. Deliver final answer."
        }
      ],
      research: {
        maxRequests: 6,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 1
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 2,
        maxRoundsWithoutProgress: 3,
        intervention: `\u26A0\uFE0F DECISION TIME.

Stop debating. Each agent votes NOW:
- YES because...
- NO because...

Majority rules. Let's conclude.`
      },
      successCriteria: {
        minConsensusPoints: 1,
        requiredOutputs: ["verdict", "confidence_level", "key_factors"],
        maxMessages: 45
      },
      agentInstructions: `You are a judge, not a consultant.

RULES:
- You MUST take a position. "It depends" is not allowed.
- Quantify confidence: "70% likely to work because..."
- Identify the #1 factor that determines success or failure
- If you change your mind, say so clearly and why
- The goal is a DECISION, not a discussion.`
    };
    SITE_SURVEY_MODE = {
      id: "site-survey",
      name: "Site Survey & Rewrite",
      nameHe: "\u05E1\u05E7\u05E8 \u05D0\u05EA\u05E8 \u05D5\u05E9\u05DB\u05EA\u05D5\u05D1",
      description: "Analyze an existing website and create better copy",
      icon: "\u{1F50E}",
      goalReminder: {
        frequency: 10,
        template: `\u{1F3AF} **SITE SURVEY GOAL**: Improve the copy for {goal}

We need to:
1. Identify what's WRONG with current copy (weak headlines, unclear value prop, etc.)
2. Understand what the site is TRYING to say
3. Rewrite it BETTER - clearer, more compelling, more human

Output: Before/After comparisons for each section.`
      },
      phases: [
        {
          id: "analyze",
          name: "Analyze Current Site",
          order: 1,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Site fully analyzed",
          agentFocus: "What does this site do? Who is it for? What copy problems exist?"
        },
        {
          id: "diagnose",
          name: "Diagnose Problems",
          order: 2,
          maxMessages: 12,
          autoTransition: true,
          transitionCriteria: "Problems identified",
          agentFocus: "List specific copy problems: weak headlines, jargon, unclear CTA, missing proof, etc."
        },
        {
          id: "research",
          name: "Research Context",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Context gathered",
          agentFocus: "Research competitors, audience language, what works in this space"
        },
        {
          id: "rewrite",
          name: "Rewrite Copy",
          order: 4,
          maxMessages: 20,
          autoTransition: false,
          transitionCriteria: "Rewrites complete",
          agentFocus: "Write NEW copy for each section. Show before/after. Make it compelling."
        }
      ],
      research: {
        maxRequests: 6,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 1
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 3,
        maxRoundsWithoutProgress: 4,
        intervention: `\u26A0\uFE0F Stop analyzing, start REWRITING.

Each agent: Pick ONE section and rewrite it now.
Show: BEFORE (current) \u2192 AFTER (your version)`
      },
      successCriteria: {
        minConsensusPoints: 2,
        requiredOutputs: ["hero_rewrite", "value_prop_rewrite", "cta_rewrite"],
        maxMessages: 60
      },
      agentInstructions: `You are a copy doctor diagnosing and fixing sick websites.

RULES:
- Don't just critique - REWRITE. Show the fix, not just the problem.
- Format: "BEFORE: [current copy] \u2192 AFTER: [your rewrite]"
- Keep the same meaning but make it: clearer, more human, more compelling
- If the current copy is jargon-heavy, translate to plain language
- If headlines are weak, make them specific and benefit-focused
- If CTA is boring, make it action-oriented and urgent`
    };
    BUSINESS_PLAN_MODE = {
      id: "business-plan",
      name: "Business Plan",
      nameHe: "\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05E2\u05E1\u05E7\u05D9\u05EA",
      description: "Create a structured business plan",
      icon: "\u{1F4CA}",
      goalReminder: {
        frequency: 12,
        template: `\u{1F3AF} **BUSINESS PLAN GOAL**: Create a plan for {goal}

We need to cover:
1. Problem & Solution (What and Why)
2. Market & Competition (Who and Against Whom)
3. Business Model (How We Make Money)
4. Go-to-Market (How We Get Customers)
5. Financials (Numbers)
6. Team & Timeline (Who and When)

Be SPECIFIC. Numbers > Adjectives.`
      },
      phases: [
        {
          id: "problem-solution",
          name: "Problem & Solution",
          order: 1,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Problem and solution defined",
          agentFocus: "Define the problem clearly. What is the solution? Why now?"
        },
        {
          id: "market-analysis",
          name: "Market Analysis",
          order: 2,
          maxMessages: 20,
          autoTransition: true,
          transitionCriteria: "Market understood",
          agentFocus: "Market size, target segments, competition analysis, positioning"
        },
        {
          id: "business-model",
          name: "Business Model",
          order: 3,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "Model defined",
          agentFocus: "Revenue streams, pricing, unit economics, costs"
        },
        {
          id: "gtm-financials",
          name: "GTM & Financials",
          order: 4,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "GTM and numbers done",
          agentFocus: "Customer acquisition strategy, projections, funding needs"
        },
        {
          id: "synthesis",
          name: "Executive Summary",
          order: 5,
          maxMessages: 10,
          autoTransition: false,
          transitionCriteria: "Plan complete",
          agentFocus: "Write the executive summary. One page. Make it compelling."
        }
      ],
      research: {
        maxRequests: 10,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 3
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 3,
        maxRoundsWithoutProgress: 4,
        intervention: `\u26A0\uFE0F We're circling. Time to commit to numbers.

Each agent: Give ONE specific metric or projection.
No more "it depends" - pick a number and defend it.`
      },
      successCriteria: {
        minConsensusPoints: 4,
        requiredOutputs: ["problem_statement", "solution", "market_size", "business_model", "projections", "executive_summary"],
        maxMessages: 80
      },
      agentInstructions: `You are building a business plan that could raise funding.

RULES:
- NUMBERS are mandatory. "Big market" is worthless. "$50B TAM, $5B SAM, $500M SOM" is useful.
- Every claim needs EVIDENCE or clear ASSUMPTIONS
- Be realistic but ambitious. Investors want growth, not fantasy.
- Unit economics must work: CAC < LTV
- Address risks proactively - investors will find them anyway
- The executive summary should make someone want to read more`
    };
    GTM_STRATEGY_MODE = {
      id: "gtm-strategy",
      name: "Go-to-Market Strategy",
      nameHe: "\u05D0\u05E1\u05D8\u05E8\u05D8\u05D2\u05D9\u05D9\u05EA \u05D4\u05E9\u05E7\u05D4",
      description: "Create a go-to-market launch strategy",
      icon: "\u{1F680}",
      goalReminder: {
        frequency: 10,
        template: `\u{1F3AF} **GTM GOAL**: Launch strategy for {goal}

We need:
1. Target Audience (WHO exactly)
2. Positioning (WHY us vs alternatives)
3. Channels (WHERE to find them)
4. Message (WHAT to say)
5. Tactics (HOW to execute)
6. Timeline (WHEN)

No vague strategy. Specific, actionable steps.`
      },
      phases: [
        {
          id: "audience",
          name: "Define Audience",
          order: 1,
          maxMessages: 15,
          autoTransition: true,
          transitionCriteria: "ICP defined",
          agentFocus: "Who is the ideal customer? Be SPECIFIC. Job title, company size, pain points."
        },
        {
          id: "positioning",
          name: "Positioning",
          order: 2,
          maxMessages: 12,
          autoTransition: true,
          transitionCriteria: "Positioning clear",
          agentFocus: "How are we different? What category? What is our wedge?"
        },
        {
          id: "channels",
          name: "Channels & Message",
          order: 3,
          maxMessages: 18,
          autoTransition: true,
          transitionCriteria: "Channels selected",
          agentFocus: "Where does our audience hang out? What channels? What message for each?"
        },
        {
          id: "tactics",
          name: "Tactics & Timeline",
          order: 4,
          maxMessages: 15,
          autoTransition: false,
          transitionCriteria: "Plan complete",
          agentFocus: "Specific actions. Week 1, Week 2, Month 1, Month 3. Who does what."
        }
      ],
      research: {
        maxRequests: 8,
        maxPerTopic: 2,
        requiredBeforeSynthesis: 2
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 3,
        maxRoundsWithoutProgress: 3,
        intervention: `\u26A0\uFE0F Strategy without tactics is useless.

Each agent: Name ONE specific action for Week 1.
Not "build awareness" - specific like "Post 3x/week on LinkedIn targeting CTOs"`
      },
      successCriteria: {
        minConsensusPoints: 3,
        requiredOutputs: ["icp", "positioning_statement", "channel_plan", "launch_timeline"],
        maxMessages: 60
      },
      agentInstructions: `You are a GTM strategist planning a product launch.

RULES:
- Specificity wins. "Tech companies" is bad. "Series A SaaS companies with 20-50 employees" is good.
- Channel selection must match audience. Don't suggest TikTok for B2B enterprise.
- Every tactic needs: What, Who, When, How to measure
- Start narrow, expand later. Better to own one channel than be mediocre on five.
- Include budget estimates where relevant
- The output should be a checklist someone could execute`
    };
    CUSTOM_MODE = {
      id: "custom",
      name: "Custom",
      nameHe: "\u05DE\u05D5\u05EA\u05D0\u05DD \u05D0\u05D9\u05E9\u05D9\u05EA",
      description: "Define your own deliberation mode",
      icon: "\u2699\uFE0F",
      goalReminder: {
        frequency: 10,
        template: `\u{1F3AF} **GOAL**: {goal}

Stay focused. What's the next concrete step toward this goal?`
      },
      phases: [
        {
          id: "discuss",
          name: "Discussion",
          order: 1,
          maxMessages: 30,
          autoTransition: false,
          transitionCriteria: "User decides",
          agentFocus: "Open discussion on the topic"
        },
        {
          id: "synthesize",
          name: "Synthesize",
          order: 2,
          maxMessages: 15,
          autoTransition: false,
          transitionCriteria: "User decides",
          agentFocus: "Combine and summarize key points"
        },
        {
          id: "conclude",
          name: "Conclude",
          order: 3,
          maxMessages: 10,
          autoTransition: false,
          transitionCriteria: "User decides",
          agentFocus: "Reach conclusions and next steps"
        }
      ],
      research: {
        maxRequests: 10,
        maxPerTopic: 3,
        requiredBeforeSynthesis: 0
      },
      loopDetection: {
        enabled: true,
        maxSimilarMessages: 4,
        maxRoundsWithoutProgress: 5,
        intervention: `\u26A0\uFE0F The discussion seems to be circling. Consider:
- Synthesizing what we have so far
- Changing direction
- Asking a more specific question`
      },
      successCriteria: {
        minConsensusPoints: 1,
        requiredOutputs: [],
        maxMessages: 100
      },
      agentInstructions: `Engage naturally with the topic while staying focused on the goal.`
    };
    SESSION_MODES = {
      "copywrite": COPYWRITE_MODE,
      "idea-validation": IDEA_VALIDATION_MODE,
      "ideation": IDEATION_MODE,
      "will-it-work": WILL_IT_WORK_MODE,
      "site-survey": SITE_SURVEY_MODE,
      "business-plan": BUSINESS_PLAN_MODE,
      "gtm-strategy": GTM_STRATEGY_MODE,
      "custom": CUSTOM_MODE
    };
  }
});

// src/lib/eda/GoalParser.ts
function normalizeSectionId(raw) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
function parseGoalSections(goal) {
  if (!goal || goal.trim().length === 0) return GENERIC_FALLBACK;
  const found = /* @__PURE__ */ new Map();
  let order = 0;
  const add = (rawName) => {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (name.length < MIN_SECTION_NAME || name.length > MAX_SECTION_NAME) return;
    const id = normalizeSectionId(name);
    if (!id || found.has(id)) return;
    order += 1;
    found.set(id, { id, name, order });
  };
  const boldList = /^\s*\d+\.\s+\*\*([A-Z][A-Z0-9 /&\-]*?)\*\*/gm;
  let m;
  while ((m = boldList.exec(goal)) !== null) {
    add(m[1]);
  }
  const headerList = /^\s{0,3}#{2,4}\s+(?:\d+\.\s+)?([A-Z][A-Z0-9 /&\-]{2,})\s*$/gm;
  while ((m = headerList.exec(goal)) !== null) {
    add(m[1]);
  }
  if (found.size < 2) {
    const inlineNumbered = /(?:^|\n)\s*(\d+)\.\s+([A-Z][A-Z0-9 /&\-]{2,})(?:\s*[—\-:])/g;
    while ((m = inlineNumbered.exec(goal)) !== null) {
      add(m[2]);
    }
  }
  if (found.size < 2) return GENERIC_FALLBACK;
  return Array.from(found.values()).sort((a, b) => a.order - b.order);
}
function walkSections(content) {
  const blocks = [];
  const lines = content.split(/\r?\n/);
  let header = null;
  let body = [];
  const flush = () => {
    if (header !== null) {
      blocks.push({ header, body: body.join("\n").trim() });
    }
  };
  const headerRe = /^\s{0,3}#{1,4}\s+(.+?)\s*$/;
  for (const line of lines) {
    const m = headerRe.exec(line);
    if (m) {
      flush();
      header = m[1].trim();
      body = [];
    } else if (header !== null) {
      body.push(line);
    }
  }
  flush();
  return blocks;
}
function sectionNameMatches(headerText, target) {
  const canonical = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).join(" ");
  const h = canonical(headerText);
  const t = canonical(target);
  if (!h || !t) return false;
  return h === t || h.startsWith(t) || h.includes(t);
}
function extractSection(content, sectionName) {
  if (!content || !sectionName) return null;
  const blocks = walkSections(content);
  for (const block of blocks) {
    if (sectionNameMatches(block.header, sectionName)) {
      return `## ${block.header}
${block.body}`.trim();
    }
  }
  return null;
}
function findProducedSections(content, minBodyChars = 80) {
  return walkSections(content).filter((b) => b.body.length >= minBodyChars).map((b) => ({
    name: b.header,
    id: normalizeSectionId(b.header),
    bodyLength: b.body.length
  }));
}
var GENERIC_FALLBACK, MIN_SECTION_NAME, MAX_SECTION_NAME;
var init_GoalParser = __esm({
  "src/lib/eda/GoalParser.ts"() {
    "use strict";
    GENERIC_FALLBACK = [
      { id: "overview", name: "Overview", order: 1 },
      { id: "body", name: "Body", order: 2 },
      { id: "conclusion", name: "Conclusion", order: 3 }
    ];
    MIN_SECTION_NAME = 3;
    MAX_SECTION_NAME = 40;
  }
});

// src/lib/modes/ModeController.ts
var ModeController;
var init_ModeController = __esm({
  "src/lib/modes/ModeController.ts"() {
    "use strict";
    init_modes();
    init_GoalParser();
    ModeController = class _ModeController {
      mode;
      progress;
      messageHashes = [];
      // For similarity detection
      interventionHistory = [];
      constructor(mode) {
        this.mode = mode || getDefaultMode();
        this.progress = this.createInitialProgress();
      }
      createInitialProgress() {
        return {
          currentPhase: this.mode.phases[0]?.id || "discuss",
          messagesInPhase: 0,
          totalMessages: 0,
          researchRequests: 0,
          researchByTopic: /* @__PURE__ */ new Map(),
          consensusPoints: 0,
          proposalsCount: 0,
          lastProgressAt: 0,
          loopDetected: false,
          outputsProduced: /* @__PURE__ */ new Set()
        };
      }
      /**
       * Set a new mode
       */
      setMode(mode) {
        this.mode = mode;
        this.progress = this.createInitialProgress();
        this.messageHashes = [];
        this.interventionHistory = [];
      }
      /**
       * Get current mode
       */
      getMode() {
        return this.mode;
      }
      /**
       * Get current progress
       */
      getProgress() {
        return { ...this.progress };
      }
      /**
       * Process a new message and return any interventions needed
       */
      processMessage(message, _allMessages) {
        const interventions = [];
        this.progress.totalMessages++;
        this.progress.messagesInPhase++;
        this.trackMessageSimilarity(message);
        if (this.isResearchRequest(message)) {
          this.trackResearchRequest(message);
          const researchIntervention = this.checkResearchLimits();
          if (researchIntervention) {
            interventions.push(researchIntervention);
          }
        }
        if (message.type === "proposal") {
          this.progress.proposalsCount++;
          this.progress.lastProgressAt = this.progress.totalMessages;
        }
        if (message.type === "agreement" || message.type === "consensus") {
          this.progress.consensusPoints++;
          this.progress.lastProgressAt = this.progress.totalMessages;
        }
        this.detectOutputs(message);
        if (this.shouldRemindGoal()) {
          interventions.push(this.createGoalReminder());
        }
        const loopIntervention = this.detectLoop();
        if (loopIntervention) {
          this.progress.loopDetected = true;
          interventions.push(loopIntervention);
        }
        const phaseIntervention = this.checkPhaseTransition();
        if (phaseIntervention) {
          interventions.push(phaseIntervention);
        }
        if (this.shouldForceSynthesis()) {
          interventions.push(this.createForcedSynthesisIntervention());
        }
        const successCheck = this.checkSuccessCriteria();
        if (successCheck.met) {
          interventions.push(this.createSuccessCheckIntervention());
        }
        this.interventionHistory.push(...interventions);
        return interventions;
      }
      /**
       * Check if message is a research request
       */
      isResearchRequest(message) {
        const content = message.content.toLowerCase();
        return message.type === "research_request" || content.includes("[research:");
      }
      /**
       * Track research request and topic
       */
      trackResearchRequest(message) {
        this.progress.researchRequests++;
        const content = message.content.toLowerCase();
        const topicMatch = content.match(/@([a-z]+-[a-z]+)|\[research:\s*([a-z\-]+)\s*\]/);
        const topic = topicMatch ? topicMatch[1] || topicMatch[2] || "general" : "general";
        const count = this.progress.researchByTopic.get(topic) || 0;
        this.progress.researchByTopic.set(topic, count + 1);
      }
      /**
       * Check research limits
       */
      checkResearchLimits() {
        const limits = this.mode.research;
        if (this.progress.researchRequests >= limits.maxRequests) {
          return {
            type: "research_limit",
            priority: "high",
            message: `\u26A0\uFE0F **RESEARCH LIMIT REACHED** (${limits.maxRequests} requests)

We have enough research. Time to USE what we've learned.

STOP requesting more data. START writing/deciding based on what we have.
If we don't have perfect information, that's okay. Make the best decision with available data.`
          };
        }
        for (const [topic, count] of this.progress.researchByTopic) {
          if (count >= limits.maxPerTopic) {
            return {
              type: "research_limit",
              priority: "medium",
              message: `\u26A0\uFE0F **TOPIC SATURATED**: We've researched "${topic}" ${count} times.

Move on. Use what we have. Repeated research on the same topic suggests we're avoiding the actual work.`
            };
          }
        }
        return null;
      }
      /**
       * Check if we should remind of the goal
       */
      shouldRemindGoal() {
        const frequency = this.mode.goalReminder.frequency;
        return this.progress.totalMessages > 0 && this.progress.totalMessages % frequency === 0;
      }
      /**
       * Create goal reminder intervention
       */
      createGoalReminder() {
        return {
          type: "goal_reminder",
          priority: "medium",
          message: this.mode.goalReminder.template
          // {goal} will be replaced by orchestrator
        };
      }
      /**
       * Track message similarity for loop detection
       */
      trackMessageSimilarity(message) {
        const content = message.content.toLowerCase();
        const words = content.split(/\s+/).filter((w) => w.length > 4).sort().slice(0, 10).join("|");
        this.messageHashes.push(words);
      }
      /**
       * Detect if agents are going in circles
       * Uses configurable parameters for window size and hash comparison
       */
      detectLoop() {
        if (!this.mode.loopDetection.enabled) return null;
        const settings = this.mode.loopDetection;
        const windowSize = settings.windowSize ?? 10;
        const minHashLength = settings.minHashLength ?? 10;
        const messagesPerRound = settings.messagesPerRound ?? 3;
        const recentHashes = this.messageHashes.slice(-windowSize);
        const hashCounts = /* @__PURE__ */ new Map();
        for (const hash of recentHashes) {
          if (hash.length > minHashLength) {
            hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
          }
        }
        for (const count of hashCounts.values()) {
          if (count >= settings.maxSimilarMessages) {
            return {
              type: "loop_detected",
              priority: "high",
              message: settings.intervention
            };
          }
        }
        const messagesSinceProgress = this.progress.totalMessages - this.progress.lastProgressAt;
        if (messagesSinceProgress >= settings.maxRoundsWithoutProgress * messagesPerRound) {
          return {
            type: "loop_detected",
            priority: "high",
            message: settings.intervention
          };
        }
        return null;
      }
      /**
       * Check for phase transition
       * Per MODE_SYSTEM.md: Enforces requiredBeforeSynthesis and phase exit criteria
       */
      checkPhaseTransition() {
        const currentPhaseConfig = this.mode.phases.find((p) => p.id === this.progress.currentPhase);
        if (!currentPhaseConfig) return null;
        if (!currentPhaseConfig.autoTransition) return null;
        const maxMessagesReached = this.progress.messagesInPhase >= currentPhaseConfig.maxMessages;
        const exitCriteriaMet = this.checkExitCriteria(currentPhaseConfig.exitCriteria);
        if (maxMessagesReached || exitCriteriaMet.met) {
          const nextPhase = this.mode.phases.find((p) => p.order === currentPhaseConfig.order + 1);
          if (nextPhase) {
            if (this.isSynthesisPhase(nextPhase.id)) {
              const researchCheck = this.checkRequiredResearch();
              if (!researchCheck.allowed) {
                return {
                  type: "research_limit",
                  priority: "high",
                  message: researchCheck.message
                };
              }
            }
            this.progress.currentPhase = nextPhase.id;
            this.progress.messagesInPhase = 0;
            const transitionReason = exitCriteriaMet.met ? "Exit criteria met" : `Max messages (${currentPhaseConfig.maxMessages}) reached`;
            return {
              type: "phase_transition",
              priority: "high",
              message: `\u{1F4CD} **PHASE TRANSITION**: Moving to "${nextPhase.name}"

**Reason**: ${transitionReason}
**Focus now on**: ${nextPhase.agentFocus}

Previous phase complete. Carry forward what we learned, but shift focus.`
            };
          }
        }
        return null;
      }
      /**
       * Check if structured exit criteria are met for current phase
       * Per MODE_SYSTEM.md spec: Phases should check specific criteria, not just message count
       */
      checkExitCriteria(criteria) {
        if (!criteria) {
          return { met: false, details: [] };
        }
        const details = [];
        let allMet = true;
        if (criteria.minProposals !== void 0) {
          const met = this.progress.proposalsCount >= criteria.minProposals;
          if (!met) {
            allMet = false;
            details.push(`Proposals: ${this.progress.proposalsCount}/${criteria.minProposals}`);
          }
        }
        if (criteria.minConsensusPoints !== void 0) {
          const met = this.progress.consensusPoints >= criteria.minConsensusPoints;
          if (!met) {
            allMet = false;
            details.push(`Consensus: ${this.progress.consensusPoints}/${criteria.minConsensusPoints}`);
          }
        }
        if (criteria.minResearchRequests !== void 0) {
          const met = this.progress.researchRequests >= criteria.minResearchRequests;
          if (!met) {
            allMet = false;
            details.push(`Research: ${this.progress.researchRequests}/${criteria.minResearchRequests}`);
          }
        }
        if (criteria.requiredOutputs && criteria.requiredOutputs.length > 0) {
          const missing = criteria.requiredOutputs.filter(
            (output) => !this.progress.outputsProduced.has(output)
          );
          if (missing.length > 0) {
            allMet = false;
            details.push(`Missing outputs: ${missing.join(", ")}`);
          }
        }
        return { met: allMet, details };
      }
      /**
       * Check if a phase is a synthesis-type phase
       */
      isSynthesisPhase(phaseId) {
        const synthesisPhases = ["synthesis", "synthesize", "verdict", "conclude", "drafting", "executive-summary"];
        return synthesisPhases.some((s) => phaseId.toLowerCase().includes(s));
      }
      /**
       * Check if required research has been completed before synthesis
       * Per spec: research.requiredBeforeSynthesis enforces minimum research
       */
      checkRequiredResearch() {
        const required = this.mode.research.requiredBeforeSynthesis;
        const completed = this.progress.researchRequests;
        if (completed < required) {
          return {
            allowed: false,
            message: `\u26A0\uFE0F **RESEARCH REQUIRED BEFORE SYNTHESIS**

\u05E0\u05D3\u05E8\u05E9 \u05DC\u05E4\u05D7\u05D5\u05EA ${required} \u05D1\u05E7\u05E9\u05D5\u05EA \u05DE\u05D7\u05E7\u05E8 \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2\u05D1\u05E8 \u05DC\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4.
\u05D1\u05D5\u05E6\u05E2\u05D5 \u05E2\u05D3 \u05DB\u05D4: ${completed}

**\u05E4\u05E2\u05D5\u05DC\u05D4 \u05E0\u05D3\u05E8\u05E9\u05EA:** \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05E6\u05E8\u05D9\u05DB\u05D9\u05DD \u05DC\u05D1\u05E7\u05E9 \u05DE\u05D9\u05D3\u05E2 \u05E0\u05D5\u05E1\u05E3 \u05DE\u05D4\u05D7\u05D5\u05E7\u05E8\u05D9\u05DD \u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05DE\u05E9\u05D9\u05DB\u05D9\u05DD.

**\u05D7\u05D5\u05E7\u05E8\u05D9\u05DD \u05D6\u05DE\u05D9\u05E0\u05D9\u05DD:**
- @stats-finder - \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D5\u05EA
- @competitor-analyst - \u05E0\u05D9\u05EA\u05D5\u05D7 \u05DE\u05EA\u05D7\u05E8\u05D9\u05DD
- @audience-insight - \u05EA\u05D5\u05D1\u05E0\u05D5\u05EA \u05E7\u05D4\u05DC \u05D9\u05E2\u05D3
- @copy-explorer - \u05D3\u05D5\u05D2\u05DE\u05D0\u05D5\u05EA \u05E7\u05D5\u05E4\u05D9
- @local-context - \u05D4\u05E7\u05E9\u05E8 \u05DE\u05E7\u05D5\u05DE\u05D9`
          };
        }
        return {
          allowed: true,
          message: `\u2705 \u05D3\u05E8\u05D9\u05E9\u05D5\u05EA \u05D4\u05DE\u05D7\u05E7\u05E8 \u05D4\u05EA\u05DE\u05DC\u05D0\u05D5 (${completed}/${required})`
        };
      }
      /**
       * Check if we should force synthesis
       */
      shouldForceSynthesis() {
        const maxMessages = this.mode.successCriteria.maxMessages;
        const atLimit = this.progress.totalMessages >= maxMessages;
        const neverSynthesized = !this.mode.phases.some(
          (p) => p.id === "synthesis" && this.progress.currentPhase === "synthesis"
        );
        return atLimit && neverSynthesized;
      }
      /**
       * Create forced synthesis intervention
       */
      createForcedSynthesisIntervention() {
        return {
          type: "force_synthesis",
          priority: "high",
          message: `\u{1F6A8} **SYNTHESIS REQUIRED**: We've reached ${this.mode.successCriteria.maxMessages} messages.

Time's up. No more discussion. We must now:
1. Summarize what we agree on
2. Make decisions on remaining open questions
3. Produce our final output

Each agent: State your final position in 2 sentences. Then let's conclude.`
        };
      }
      /**
       * Create success check intervention when all criteria are met
       * Per MODE_SYSTEM.md spec: notify when session goals have been achieved
       */
      createSuccessCheckIntervention() {
        const outputs = Array.from(this.progress.outputsProduced).join(", ");
        return {
          type: "success_check",
          priority: "high",
          action: "pause",
          message: `\u2705 **SUCCESS CRITERIA MET**

All session goals have been achieved:
- Consensus points: ${this.progress.consensusPoints}/${this.mode.successCriteria.minConsensusPoints}
- Required outputs: ${outputs}

The session can now be finalized. Review the outputs and confirm completion.`
        };
      }
      /**
       * Detect outputs produced. A section only counts when it is a real
       * markdown `## HEADER` block whose body is ≥ 80 chars — prevents false
       * positives where an agent merely mentions "hero" or "CTA" in passing
       * and the mode controller prematurely fires `success_check`.
       *
       * Known aliases (hero, value_proposition, cta, verdict, next_steps) are
       * added alongside the slug so legacy mode success criteria keep working.
       */
      detectOutputs(message) {
        const produced = findProducedSections(message.content, 80);
        if (produced.length === 0) return;
        for (const section of produced) {
          this.progress.outputsProduced.add(section.id);
          const id = section.id;
          if (id.includes("hero")) this.progress.outputsProduced.add("hero");
          if (id.includes("value") || id.includes("benefit")) {
            this.progress.outputsProduced.add("value_proposition");
          }
          if (id.includes("cta") || id.includes("call")) this.progress.outputsProduced.add("cta");
          if (id.includes("verdict")) this.progress.outputsProduced.add("verdict");
          if (id.includes("next")) this.progress.outputsProduced.add("next_steps");
        }
      }
      /**
       * Check if success criteria are met
       */
      checkSuccessCriteria() {
        const criteria = this.mode.successCriteria;
        const missing = [];
        if (this.progress.consensusPoints < criteria.minConsensusPoints) {
          missing.push(`Need ${criteria.minConsensusPoints - this.progress.consensusPoints} more consensus points`);
        }
        for (const output of criteria.requiredOutputs) {
          if (!this.progress.outputsProduced.has(output)) {
            missing.push(`Missing output: ${output}`);
          }
        }
        return {
          met: missing.length === 0,
          missing
        };
      }
      /**
       * Manually transition to a phase
       */
      transitionToPhase(phaseId) {
        const phase = this.mode.phases.find((p) => p.id === phaseId);
        if (phase) {
          this.progress.currentPhase = phaseId;
          this.progress.messagesInPhase = 0;
          return true;
        }
        return false;
      }
      /**
       * Get current phase config
       */
      getCurrentPhase() {
        return this.mode.phases.find((p) => p.id === this.progress.currentPhase);
      }
      /**
       * Get mode-specific agent instructions
       */
      getAgentInstructions() {
        return this.mode.agentInstructions;
      }
      /**
       * Get phase-specific focus
       */
      getCurrentPhaseFocus() {
        const phase = this.getCurrentPhase();
        return phase?.agentFocus || "";
      }
      /**
       * Serialize for session save
       */
      toJSON() {
        return {
          modeId: this.mode.id,
          progress: {
            ...this.progress,
            researchByTopic: Object.fromEntries(this.progress.researchByTopic),
            outputsProduced: Array.from(this.progress.outputsProduced)
          },
          messageHashes: this.messageHashes.slice(-20)
          // Keep last 20
        };
      }
      /**
       * Restore from session load
       */
      static fromJSON(data, mode) {
        const controller = new _ModeController(mode);
        if (data.progress) {
          controller.progress = {
            ...data.progress,
            researchByTopic: new Map(Object.entries(data.progress.researchByTopic || {})),
            outputsProduced: new Set(data.progress.outputsProduced || [])
          };
        }
        if (data.messageHashes) {
          controller.messageHashes = data.messageHashes;
        }
        return controller;
      }
    };
  }
});

// src/lib/research/ProjectIntrospector.ts
import * as fs2 from "fs/promises";
import * as path4 from "path";
async function introspectProject(opts) {
  const {
    projectDir,
    query,
    runner,
    maxFiles = DEFAULT_MAX_FILES,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxDepth = DEFAULT_MAX_DEPTH,
    skipDirs = DEFAULT_SKIP_DIRS
  } = opts;
  try {
    const stat2 = await fs2.stat(projectDir);
    if (!stat2.isDirectory()) {
      return {
        summary: `Project directory does not exist or is not a directory: ${projectDir}`,
        filesRead: [],
        snippets: [],
        error: "invalid-project-dir"
      };
    }
  } catch {
    return {
      summary: `Cannot access project directory: ${projectDir}`,
      filesRead: [],
      snippets: [],
      error: "project-dir-not-found"
    };
  }
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    return {
      summary: "Query did not contain any searchable keywords.",
      filesRead: [],
      snippets: [],
      error: "no-keywords"
    };
  }
  const allFiles = await walkFiles(projectDir, skipDirs, maxDepth);
  if (allFiles.length === 0) {
    return {
      summary: `No text files found under ${projectDir}.`,
      filesRead: [],
      snippets: [],
      error: "no-files"
    };
  }
  const scored = [];
  for (const file of allFiles) {
    const rel = path4.relative(projectDir, file).toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (rel.includes(kw)) score += 10;
    }
    if (score > 0) scored.push({ path: file, score });
  }
  if (scored.length < maxFiles) {
    const already = new Set(scored.map((s) => s.path));
    const rest = allFiles.filter((f) => !already.has(f)).slice(0, MAX_CONTENT_SCAN_CANDIDATES);
    for (const file of rest) {
      try {
        const stat2 = await fs2.stat(file);
        if (stat2.size > maxFileSize * 3) continue;
        const content = (await fs2.readFile(file, "utf-8")).toLowerCase();
        let contentScore = 0;
        for (const kw of keywords) {
          let idx = 0;
          let hits = 0;
          while (hits < 5) {
            const next = content.indexOf(kw, idx);
            if (next < 0) break;
            hits += 1;
            idx = next + kw.length;
          }
          contentScore += hits;
        }
        if (contentScore > 0) scored.push({ path: file, score: contentScore });
      } catch {
      }
    }
  }
  if (scored.length === 0) {
    return {
      summary: `No files matched keywords [${keywords.join(", ")}] under ${projectDir}.`,
      filesRead: [],
      snippets: [],
      error: "no-matches"
    };
  }
  scored.sort((a, b) => b.score - a.score);
  const topFiles = scored.slice(0, maxFiles);
  const snippets = [];
  for (const { path: filePath } of topFiles) {
    try {
      const raw = await fs2.readFile(filePath, "utf-8");
      const content = raw.length > maxFileSize ? raw.slice(0, maxFileSize) + "\n// \u2026truncated" : raw;
      snippets.push({
        path: path4.relative(projectDir, filePath),
        content
      });
    } catch {
    }
  }
  if (snippets.length === 0) {
    return {
      summary: "Files matched but none could be read.",
      filesRead: [],
      snippets: [],
      error: "read-failure"
    };
  }
  const contextBlob = snippets.map((s) => `### ${s.path}
\`\`\`
${s.content}
\`\`\``).join("\n\n");
  const prompt = [
    `You are a project introspection agent. Answer the question by analyzing the provided source files from a local project.`,
    ``,
    `## QUESTION`,
    query,
    ``,
    `## PROJECT FILES (${snippets.length} files, top matches)`,
    contextBlob,
    ``,
    `## INSTRUCTIONS`,
    `- Answer the question directly and concisely, grounded in the source you just read.`,
    `- Cite specific files (by relative path) and code symbols when relevant.`,
    `- If the question asks "what modes / features / capabilities exist", list them explicitly with file references.`,
    `- Prefer facts you can verify from the code over general claims.`,
    `- If the code doesn't answer the question, say so plainly \u2014 do NOT invent features.`,
    ``,
    `## ANSWER`
  ].join("\n");
  const result = await runner.query({
    prompt,
    systemPrompt: "You are a precise code reader. You answer ONLY what the source code you were given supports. If the code is ambiguous or silent, say so.",
    model: "claude-sonnet-4-20250514"
  });
  if (!result.success || !result.content) {
    return {
      summary: `Introspection failed: ${result.error || "no content returned"}`,
      filesRead: snippets.map((s) => s.path),
      snippets,
      error: "runner-failure"
    };
  }
  return {
    summary: result.content,
    filesRead: snippets.map((s) => s.path),
    snippets
  };
}
function extractKeywords(query) {
  const tokens = query.toLowerCase().replace(/[^a-z0-9_\-\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out.slice(0, 12);
}
async function walkFiles(root, skipDirs, maxDepth) {
  const results = [];
  const visited = /* @__PURE__ */ new Set();
  async function visit(dir, depth) {
    if (depth > maxDepth) return;
    if (results.length >= MAX_WALK_FILES) return;
    let real;
    try {
      real = await fs2.realpath(dir);
    } catch {
      return;
    }
    if (visited.has(real)) return;
    visited.add(real);
    let entries;
    try {
      entries = await fs2.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= MAX_WALK_FILES) return;
      if (skipDirs.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      if (entry.isSymbolicLink()) continue;
      const full = path4.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, depth + 1);
      } else if (entry.isFile()) {
        const ext = path4.extname(entry.name).toLowerCase();
        if (TEXT_EXTENSIONS.has(ext)) results.push(full);
      }
    }
  }
  await visit(root, 0);
  return results;
}
var DEFAULT_SKIP_DIRS, TEXT_EXTENSIONS, DEFAULT_MAX_FILES, DEFAULT_MAX_FILE_SIZE, DEFAULT_MAX_DEPTH, MAX_CONTENT_SCAN_CANDIDATES, MAX_WALK_FILES, STOPWORDS;
var init_ProjectIntrospector = __esm({
  "src/lib/research/ProjectIntrospector.ts"() {
    "use strict";
    DEFAULT_SKIP_DIRS = /* @__PURE__ */ new Set([
      // Build / dep output
      "node_modules",
      "dist",
      "build",
      ".git",
      ".turbo",
      ".next",
      "coverage",
      ".cache",
      "tmp",
      ".tmp",
      ".venv",
      "venv",
      "__pycache__",
      "target",
      ".pytest_cache",
      ".swarm",
      "output",
      // Developer-internal docs (planning, ADRs, notes) — these describe the
      // code's EVOLUTION, not its current shipped state. An introspector asked
      // "what does this project do" should read source code, not the backlog.
      // Including them caused skeptic agents to read old "the engine is broken"
      // context docs and refuse to draft copy.
      ".planning",
      "research",
      "notes",
      "docs-internal"
    ]);
    TEXT_EXTENSIONS = /* @__PURE__ */ new Set([
      ".ts",
      ".tsx",
      ".js",
      ".jsx",
      ".mts",
      ".cts",
      ".md",
      ".json",
      ".yaml",
      ".yml",
      ".toml",
      ".py",
      ".rs",
      ".go",
      ".java",
      ".html",
      ".css",
      ".scss",
      ".sh"
    ]);
    DEFAULT_MAX_FILES = 15;
    DEFAULT_MAX_FILE_SIZE = 16e3;
    DEFAULT_MAX_DEPTH = 4;
    MAX_CONTENT_SCAN_CANDIDATES = 300;
    MAX_WALK_FILES = 2500;
    STOPWORDS = /* @__PURE__ */ new Set([
      "the",
      "and",
      "are",
      "what",
      "how",
      "why",
      "for",
      "with",
      "this",
      "that",
      "from",
      "has",
      "have",
      "does",
      "can",
      "you",
      "your",
      "our",
      "tell",
      "find",
      "list",
      "show",
      "project",
      "about",
      "code",
      "all",
      "any",
      "which",
      "who",
      "where",
      "when",
      "does",
      "exist",
      "existing",
      "available",
      "support"
    ]);
  }
});

// src/lib/eda/EDAOrchestrator.ts
var COPY_SECTIONS, EDAOrchestrator;
var init_EDAOrchestrator = __esm({
  "src/lib/eda/EDAOrchestrator.ts"() {
    "use strict";
    init_MessageBus();
    init_FloorManager();
    init_AgentListener();
    init_personas();
    init_claude();
    init_ModeController();
    init_modes();
    init_GoalParser();
    init_ProjectIntrospector();
    COPY_SECTIONS = [
      { id: "hero", name: "Hero Section", nameHe: "\u05DB\u05D5\u05EA\u05E8\u05EA \u05E8\u05D0\u05E9\u05D9\u05EA" },
      { id: "problem", name: "Problem Statement", nameHe: "\u05D1\u05E2\u05D9\u05D4" },
      { id: "solution", name: "Solution/Benefits", nameHe: "\u05E4\u05EA\u05E8\u05D5\u05DF \u05D5\u05D9\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA" },
      { id: "social-proof", name: "Social Proof", nameHe: "\u05D4\u05D5\u05DB\u05D7\u05D4 \u05D7\u05D1\u05E8\u05EA\u05D9\u05EA" },
      { id: "cta", name: "Call to Action", nameHe: "\u05E7\u05E8\u05D9\u05D0\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4" }
    ];
    EDAOrchestrator = class {
      session;
      context;
      skills;
      bus;
      floorManager;
      agentListeners = /* @__PURE__ */ new Map();
      eventCallbacks = [];
      isRunning = false;
      isStopped = false;
      messageCount = 0;
      synthesisInterval = null;
      phaseMachineStarted = false;
      autoRunPhaseMachine = false;
      // 180s per turn — drafting with heavy research context can push Sonnet
      // past the default 90s, especially for the first section after Research.
      speakTimeoutMs = 18e4;
      unsubscribers = [];
      // Phase management
      currentPhase = "initialization";
      copySections = [];
      // Consensus tracking
      agentContributions = /* @__PURE__ */ new Map();
      keyInsights = /* @__PURE__ */ new Map();
      consensusThreshold = 0.6;
      // 60% agreement needed
      // Research state (used for tracking pending research)
      researchPending = false;
      // Dependency injection
      agentRunner;
      fileSystem;
      // Mode controller for goal anchoring and loop detection
      modeController;
      constructor(session, context, skills, options) {
        this.session = session;
        this.context = context;
        this.skills = skills;
        this.bus = messageBus;
        this.floorManager = new FloorManager(this.bus);
        this.agentRunner = options?.agentRunner;
        this.fileSystem = options?.fileSystem;
        this.autoRunPhaseMachine = options?.autoRunPhaseMachine ?? false;
        if (options?.phaseMachineOptions?.speakTimeoutMs !== void 0) {
          this.speakTimeoutMs = options.phaseMachineOptions.speakTimeoutMs;
        }
        const mode = getModeById(session.config.mode || "copywrite") || getDefaultMode();
        this.modeController = new ModeController(mode);
      }
      /**
       * Subscribe to orchestrator events (for UI)
       */
      on(callback) {
        this.eventCallbacks.push(callback);
        return () => {
          this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
        };
      }
      emit(type, data) {
        const event = { type, data };
        this.eventCallbacks.forEach((cb) => cb(event));
      }
      /**
       * Start the EDA orchestration
       */
      async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log("[EDAOrchestrator] Starting...");
        this.setupBusSubscriptions();
        this.createAgentListeners();
        this.bus.start(this.session.id, this.session.config.goal);
        this.emit("phase_change", { phase: "initialization" });
        const mode = this.modeController.getMode();
        const firstPhase = this.modeController.getCurrentPhase();
        const systemMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u{1F399}\uFE0F Session started: ${this.session.config.projectName}

**Mode:** ${mode.icon} ${mode.name}
**Goal:** ${this.session.config.goal}

**${mode.description}**

\u{1F4CD} **Phase 1: ${firstPhase?.name || "Discovery"}**
${firstPhase?.agentFocus || "Begin the discussion"}

*All agents are now listening. Stay focused on the goal.*`
        };
        this.bus.addMessage(systemMessage, "system");
        const modeInstructions = this.modeController.getAgentInstructions();
        const combinedSkills = this.skills ? `${this.skills}

## Mode Instructions
${modeInstructions}` : `## Mode Instructions
${modeInstructions}`;
        for (const listener of this.agentListeners.values()) {
          listener.start(this.session.config, this.context, combinedSkills);
        }
        setTimeout(async () => {
          if (this.isStopped) return;
          let briefContent = "";
          const briefName = this.session.config.briefName ?? this.session.config.projectName?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
          if (briefName) {
            try {
              const brief = await this.readBrief(briefName);
              if (brief) {
                briefContent = `

**\u{1F4CB} Project Brief:**
${brief.slice(0, 1500)}...`;
              }
            } catch {
            }
          }
          const promptMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "system",
            content: `\u{1F4E2} **SESSION STARTED**

Goal: ${this.session.config.goal}
${briefContent}

We will work through three phases: Discovery (share perspectives), Synthesis (agree on structure), Drafting (produce the final deliverable, one section at a time).`
          };
          this.bus.addMessage(promptMessage, "system");
          if (this.autoRunPhaseMachine && !this.phaseMachineStarted) {
            this.phaseMachineStarted = true;
            this.runPhaseMachine().catch((err2) => {
              console.error("[EDAOrchestrator] Phase machine error:", err2);
            });
          }
        }, 1e3);
        if (!this.autoRunPhaseMachine) {
          this.synthesisInterval = setInterval(() => {
            this.checkForSynthesis();
          }, 3e4);
        }
        if (this.session.config.humanParticipation) {
          setTimeout(() => {
            this.promptHuman("The floor is open. Add your thoughts anytime.");
          }, 5e3);
        }
        this.emit("phase_change", { phase: "brainstorming" });
      }
      /**
       * Read brief using injected file system or window.electronAPI
       */
      async readBrief(briefName) {
        if (this.fileSystem) {
          return this.fileSystem.readBrief(briefName);
        }
        if (typeof window !== "undefined" && window.electronAPI?.readBrief) {
          return window.electronAPI.readBrief(briefName);
        }
        return null;
      }
      /**
       * Setup MessageBus subscriptions for UI events
       */
      setupBusSubscriptions() {
        this.unsubscribers.push(
          this.bus.subscribe("message:new", (payload) => {
            this.messageCount++;
            this.session.messages.push(payload.message);
            if (payload.fromAgent !== "system") {
              this.trackAgentContribution(payload.fromAgent, payload.message);
            }
            const agent = getAgentById(payload.fromAgent);
            if (agent) {
              this.emit("agent_typing", { agentId: payload.fromAgent, typing: false });
            }
            this.emit("agent_message", { agentId: payload.fromAgent, message: payload.message });
            this.checkForResearchRequests(payload.message);
            this.processModeInterventions(payload.message);
          }, "orchestrator")
        );
        this.unsubscribers.push(
          this.bus.subscribe("floor:granted", (payload) => {
            this.emit("agent_typing", { agentId: payload.agentId, typing: true });
            this.emit("floor_status", { current: payload.agentId, status: "speaking" });
          }, "orchestrator")
        );
        this.unsubscribers.push(
          this.bus.subscribe("floor:released", () => {
            this.emit("floor_status", { current: null, status: "open" });
          }, "orchestrator")
        );
        this.unsubscribers.push(
          this.bus.subscribe("floor:request", (payload) => {
            console.log(`[EDAOrchestrator] Floor request from ${payload.agentId}`);
          }, "orchestrator")
        );
      }
      /**
       * Create agent listeners for all enabled agents
       */
      createAgentListeners() {
        for (const agentId of this.session.config.enabledAgents) {
          const agent = getAgentById(agentId);
          if (!agent) continue;
          const listener = new AgentListener(
            agent,
            this.bus,
            {
              reactivityThreshold: 0.6,
              minSilenceBeforeReact: 1,
              evaluationDebounce: 800 + Math.random() * 400,
              // Orchestrator drives turn-taking via rolling round-robin —
              // disable autonomous per-message evaluation to prevent N*Opus
              // calls per incoming message and unbounded memory growth.
              skipAutonomousEval: true
            },
            this.agentRunner
          );
          this.agentListeners.set(agentId, listener);
        }
        console.log(`[EDAOrchestrator] Created ${this.agentListeners.size} agent listeners`);
      }
      /**
       * Track agent contribution and consensus signals
       */
      trackAgentContribution(agentId, message) {
        const count = this.agentContributions.get(agentId) || 0;
        this.agentContributions.set(agentId, count + 1);
        const content = message.content;
        const typeMatch = content.match(/\[(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
        const responseType = typeMatch ? typeMatch[1].toUpperCase() : null;
        if (responseType === "AGREEMENT" || responseType === "DISAGREEMENT") {
          const recentMessages = this.bus.getRecentMessages(5);
          const previousMessage = recentMessages.find((m) => m.agentId !== agentId && m.agentId !== "system");
          if (previousMessage) {
            const insightKey = `${previousMessage.agentId}-${previousMessage.id.slice(0, 8)}`;
            if (!this.keyInsights.has(insightKey)) {
              this.keyInsights.set(insightKey, {
                content: previousMessage.content.slice(0, 200),
                supporters: /* @__PURE__ */ new Set([previousMessage.agentId]),
                opposers: /* @__PURE__ */ new Set()
              });
            }
            const insight = this.keyInsights.get(insightKey);
            if (responseType === "AGREEMENT") {
              insight.supporters.add(agentId);
              insight.opposers.delete(agentId);
            } else {
              insight.opposers.add(agentId);
              insight.supporters.delete(agentId);
            }
          }
        }
        if (responseType === "PROPOSAL" || responseType === "SYNTHESIS") {
          const insightKey = `${agentId}-${message.id.slice(0, 8)}`;
          this.keyInsights.set(insightKey, {
            content: content.slice(0, 200),
            supporters: /* @__PURE__ */ new Set([agentId]),
            opposers: /* @__PURE__ */ new Set()
          });
        }
      }
      /**
       * Check if discussion is ready for synthesis
       */
      getConsensusStatus() {
        const enabledAgents = this.session.config.enabledAgents;
        const agentsWhoSpoke = new Set(this.agentContributions.keys());
        const allAgentsSpoke = enabledAgents.every((id) => agentsWhoSpoke.has(id));
        let consensusPoints = 0;
        let conflictPoints = 0;
        const humanWeight = 2;
        for (const insight of this.keyInsights.values()) {
          let effectiveSupport = insight.supporters.size;
          let effectiveOppose = insight.opposers.size;
          if (insight.supporters.has("human")) {
            effectiveSupport += humanWeight - 1;
          }
          if (insight.opposers.has("human")) {
            effectiveOppose += humanWeight - 1;
          }
          const totalWeight = enabledAgents.length + (this.agentContributions.has("human") ? humanWeight : 0);
          const supportRatio = effectiveSupport / totalWeight;
          const opposeRatio = effectiveOppose / totalWeight;
          if (supportRatio >= this.consensusThreshold) {
            consensusPoints++;
          }
          if (opposeRatio >= 0.4) {
            conflictPoints++;
          }
        }
        const minContributions = enabledAgents.length * 2;
        const totalContributions = Array.from(this.agentContributions.values()).reduce((a, b) => a + b, 0);
        let recommendation;
        let ready = false;
        if (this.researchPending) {
          recommendation = "\u05DE\u05D7\u05DB\u05D9\u05DD \u05DC\u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05DE\u05D7\u05E7\u05E8...";
        } else if (!allAgentsSpoke) {
          const silent = enabledAgents.filter((id) => !agentsWhoSpoke.has(id));
          recommendation = `\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DB\u05DC \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D3\u05D9\u05D1\u05E8\u05D5. \u05D7\u05E1\u05E8\u05D9\u05DD: ${silent.join(", ")}`;
        } else if (totalContributions < minContributions) {
          recommendation = `\u05D4\u05D3\u05D9\u05D5\u05DF \u05E2\u05D3\u05D9\u05D9\u05DF \u05E7\u05E6\u05E8 \u05DE\u05D3\u05D9 (${totalContributions}/${minContributions} \u05EA\u05D2\u05D5\u05D1\u05D5\u05EA)`;
        } else if (conflictPoints > consensusPoints) {
          recommendation = `\u05D9\u05E9 \u05D9\u05D5\u05EA\u05E8 \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05DE\u05D4\u05E1\u05DB\u05DE\u05D5\u05EA (${conflictPoints} \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA, ${consensusPoints} \u05D4\u05E1\u05DB\u05DE\u05D5\u05EA). \u05D4\u05DE\u05E9\u05D9\u05DB\u05D5 \u05DC\u05D3\u05D5\u05DF.`;
        } else if (consensusPoints === 0) {
          recommendation = "\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D4\u05D5\u05E9\u05D2\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4. \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05E6\u05E8\u05D9\u05DB\u05D9\u05DD \u05DC\u05D4\u05D2\u05D9\u05D1 \u05D0\u05D7\u05D3 \u05DC\u05E9\u05E0\u05D9.";
        } else {
          ready = true;
          recommendation = `\u05DE\u05D5\u05DB\u05E0\u05D9\u05DD \u05DC\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4! ${consensusPoints} \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4, ${conflictPoints} \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA.`;
        }
        return {
          ready,
          allAgentsSpoke,
          agentParticipation: new Map(this.agentContributions),
          consensusPoints,
          conflictPoints,
          recommendation
        };
      }
      /**
       * Get current mode info
       */
      getModeInfo() {
        const mode = this.modeController.getMode();
        const progress = this.modeController.getProgress();
        const phase = this.modeController.getCurrentPhase();
        return {
          id: mode.id,
          name: mode.name,
          phase: phase?.name || "Unknown",
          progress: {
            messagesInPhase: progress.messagesInPhase,
            totalMessages: progress.totalMessages,
            researchRequests: progress.researchRequests,
            consensusPoints: progress.consensusPoints,
            proposalsCount: progress.proposalsCount,
            loopDetected: progress.loopDetected,
            outputsProduced: Array.from(progress.outputsProduced)
          }
        };
      }
      /**
       * Check if mode success criteria are met
       */
      checkModeSuccess() {
        return this.modeController.checkSuccessCriteria();
      }
      /**
       * Get mode controller (for serialization)
       */
      getModeController() {
        return this.modeController;
      }
      /**
       * Process mode interventions (goal reminders, loop detection, phase transitions).
       *
       * Two guards prevent the ModeController from feedback-looping on its own
       * output:
       *
       * 1. System messages are NOT fed back into processMessage — otherwise the
       *    controller sees its own injected system messages, counts them toward
       *    thresholds, and fires more interventions.
       *
       * 2. When `autoRunPhaseMachine` is true, the phase machine owns flow
       *    control (phase transitions, drafting, termination). ModeController
       *    interventions are STILL tracked for stats but NOT injected into the
       *    bus as system messages — that would confuse agents and the phase
       *    machine, and cause exactly the "LOOP DETECTED" / "SYNTHESIS REQUIRED"
       *    spam that tanked the last run. External observers (UI, tests) still
       *    get the `intervention` event for visibility.
       */
      processModeInterventions(message) {
        if (message.agentId === "system") return;
        const interventions = this.modeController.processMessage(message, this.session.messages);
        for (const intervention of interventions) {
          let content = intervention.message;
          if (content.includes("{goal}")) {
            content = content.replace("{goal}", this.session.config.goal);
          }
          this.emit("intervention", {
            type: intervention.type,
            message: content,
            priority: intervention.priority,
            action: intervention.action
          });
          if (this.autoRunPhaseMachine) {
            continue;
          }
          const interventionMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "system",
            content,
            metadata: {
              interventionType: intervention.type,
              priority: intervention.priority
            }
          };
          setTimeout(() => {
            this.bus.addMessage(interventionMessage, "system");
          }, 500);
          console.log(
            `[EDAOrchestrator] Mode intervention: ${intervention.type} (${intervention.priority})`
          );
        }
      }
      /**
       * Check for research requests in message
       */
      checkForResearchRequests(message) {
        const content = message.content;
        const mentionPattern = /@(stats-finder|competitor-analyst|audience-insight|copy-explorer|context-finder|local-context)[:\s]+["']?([^"'\n]+?)["']?(?:\n|$)/gi;
        let match;
        while ((match = mentionPattern.exec(content)) !== null) {
          let researcherId = match[1].toLowerCase();
          if (researcherId === "local-context") researcherId = "context-finder";
          const query = match[2].trim();
          this.processResearchRequest(researcherId, query, message.agentId);
        }
        const blockPattern = /\[RESEARCH:\s*([a-z-]+)\]([\s\S]*?)\[\/RESEARCH\]/gi;
        while ((match = blockPattern.exec(content)) !== null) {
          const researcherId = match[1].toLowerCase();
          const query = match[2].trim();
          this.processResearchRequest(researcherId, query, message.agentId);
        }
      }
      /**
       * Process a research request - HALTS discussion until complete.
       * Serialized: if a research request is already in-flight, subsequent
       * requests are silently dropped for this message — they'd compound into
       * parallel filesystem walks and crash the process.
       */
      async processResearchRequest(researcherId, query, requestedBy) {
        const researcher = getResearcherById(researcherId);
        if (!researcher) return;
        if (this.researchPending) {
          console.log(
            `[EDAOrchestrator] Research already pending, dropping new request from ${requestedBy}`
          );
          return;
        }
        this.researchPending = true;
        this.bus.pause("Research in progress");
        this.emit("research_halt", { researcherId, query, requestedBy });
        this.bus.emit("message:research", { request: { researcherId, query }, fromAgent: requestedBy });
        const lang = this.session.config.language;
        const isHebrew = lang === "hebrew";
        const announceMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: isHebrew ? `\u{1F50D} **\u05D4\u05D3\u05D9\u05D5\u05DF \u05E0\u05E2\u05E6\u05E8 \u05DC\u05E6\u05D5\u05E8\u05DA \u05DE\u05D7\u05E7\u05E8**

**\u05D7\u05D5\u05E7\u05E8:** ${researcher.name}
**\u05D1\u05E7\u05E9\u05D4:** "${query}"
**\u05DE\u05D1\u05E7\u05E9:** ${this.getAgentName(requestedBy)}

\u23F3 \u05DE\u05D7\u05E4\u05E9 \u05DE\u05D9\u05D3\u05E2... \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD.` : `\u{1F50D} **Research in progress \u2014 discussion paused**

**Researcher:** ${researcher.name}
**Query:** "${query}"
**Requested by:** ${this.getAgentName(requestedBy)}

\u23F3 Looking up information... agents waiting.`
        };
        this.bus.addMessage(announceMessage, "system");
        try {
          const result = researcher.id === "context-finder" ? await this.runLocalContextResearch(researcher, query) : await this.runResearchWithWebSearch(researcher, query);
          const resultMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: researcher.id,
            type: "research_result",
            content: result,
            metadata: { query, requestedBy }
          };
          this.bus.addMessage(resultMessage, researcher.id);
          this.emit("research_result", { researcher: researcher.name, result });
          const resumeMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "system",
            content: isHebrew ? `\u2705 **\u05DE\u05D7\u05E7\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DD - \u05D4\u05D3\u05D9\u05D5\u05DF \u05DE\u05DE\u05E9\u05D9\u05DA**

\u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DB\u05E2\u05EA \u05DC\u05D4\u05EA\u05D9\u05D9\u05D7\u05E1 \u05DC\u05DE\u05DE\u05E6\u05D0\u05D9\u05DD.` : `\u2705 **Research complete \u2014 resuming discussion**

Agents can now respond to the findings.`
          };
          this.bus.addMessage(resumeMessage, "system");
        } catch (error) {
          console.error("[EDAOrchestrator] Research error:", error);
          const errorMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "system",
            content: isHebrew ? `\u274C **\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05E7\u05E8:** ${error}

\u05D4\u05D3\u05D9\u05D5\u05DF \u05DE\u05DE\u05E9\u05D9\u05DA \u05DC\u05DC\u05D0 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05DE\u05D7\u05E7\u05E8.` : `\u274C **Research error:** ${error}

Discussion continues without research results.`
          };
          this.bus.addMessage(errorMessage, "system");
        }
        this.researchPending = false;
        this.bus.resume();
      }
      /**
       * Run research by introspecting the local project directory. Powered by
       * `ProjectIntrospector` — walks `session.config.contextDir`, finds files
       * matching the query, and asks the agent runner to answer from the code
       * itself. Result is returned as plain markdown so it drops into the
       * research_result message exactly like web-search results do.
       */
      async runLocalContextResearch(researcher, query) {
        if (!this.agentRunner) {
          return `**${researcher.name}:** Cannot introspect project \u2014 no agent runner configured.`;
        }
        const projectDir = this.session.config.contextDir;
        if (!projectDir) {
          return `**${researcher.name}:** No contextDir configured on the session \u2014 cannot read project.`;
        }
        const result = await introspectProject({
          projectDir,
          query,
          runner: this.agentRunner
        });
        const fileList = result.filesRead.length > 0 ? `

**\u{1F4C1} Files read (${result.filesRead.length}):**
${result.filesRead.slice(0, 12).map((p) => `- \`${p}\``).join("\n")}${result.filesRead.length > 12 ? `
- \u2026and ${result.filesRead.length - 12} more` : ""}` : "";
        return [
          `**\u{1F50D} Local project introspection**`,
          ``,
          `**Query:** "${query}"`,
          ``,
          result.summary,
          fileList
        ].join("\n");
      }
      /**
       * Run research using Claude Agent SDK with web search
       */
      async runResearchWithWebSearch(researcher, query) {
        const systemPrompt = `You are ${researcher.name}, a specialized research agent.

## YOUR SPECIALTY
${researcher.specialty}

## YOUR CAPABILITIES
${researcher.capabilities.map((c) => `- ${c}`).join("\n")}

## SEARCH DOMAINS
${researcher.searchDomains.map((d) => `- ${d}`).join("\n")}

## PROJECT CONTEXT
**Project**: ${this.session.config.projectName}
**Goal**: ${this.session.config.goal}

## YOUR MISSION
1. Search the web for relevant, current information
2. Focus on Israeli market data when relevant
3. Find specific numbers, statistics, and facts
4. Verify information from multiple sources when possible

## OUTPUT FORMAT
Provide research findings in Hebrew:

**\u{1F50D} \u05DE\u05DE\u05E6\u05D0\u05D9\u05DD \u05E2\u05D9\u05E7\u05E8\u05D9\u05D9\u05DD:**
- [bullet points of main discoveries]

**\u{1F4CA} \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05E1\u05E4\u05E6\u05D9\u05E4\u05D9\u05D9\u05DD:**
- [specific numbers, stats that can be used in copy]

**\u{1F4A1} \u05DE\u05E9\u05DE\u05E2\u05D5\u05EA \u05DC\u05E7\u05D5\u05E4\u05D9:**
- [how this should influence the website copy]

**\u{1F4DA} \u05DE\u05E7\u05D5\u05E8\u05D5\u05EA:**
- [note sources and reliability]`;
        if (this.agentRunner) {
          const result = await this.agentRunner.query({
            prompt: `Research request: ${query}

Search the web for current, accurate information. Focus on Israeli market data when relevant.`,
            systemPrompt,
            model: "claude-sonnet-4-20250514"
          });
          if (!result.success) {
            throw new Error(result.error || "Research query failed");
          }
          return result.content || "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA";
        }
        if (typeof window !== "undefined" && window.electronAPI?.claudeAgentQuery) {
          const result = await window.electronAPI.claudeAgentQuery({
            prompt: `Research request: ${query}

Search the web for current, accurate information. Focus on Israeli market data when relevant.`,
            systemPrompt,
            model: "claude-sonnet-4-20250514"
          });
          if (!result || !result.success) {
            throw new Error(result?.error || "Research query failed");
          }
          return result.content || "\u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D5 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA";
        }
        throw new Error("No agent runner available");
      }
      /**
       * Check if synthesis is needed
       */
      async checkForSynthesis() {
        if (!this.isRunning) return;
        if (this.messageCount > 0 && this.messageCount % 10 === 0) {
          await this.runSynthesis();
        }
      }
      /**
       * Run synthesis checkpoint
       */
      async runSynthesis() {
        const recentMessages = this.bus.getRecentMessages(10);
        if (recentMessages.length < 5) return;
        try {
          const synthesis = await generateRoundSynthesis(
            this.session.config,
            recentMessages,
            Math.floor(this.messageCount / 10),
            this.context
          );
          const synthMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "synthesis",
            content: synthesis
          };
          this.bus.addMessage(synthMessage, "system");
          this.emit("synthesis", { synthesis, messageCount: this.messageCount });
          this.bus.emit("message:synthesis", { synthesis, round: Math.floor(this.messageCount / 10) });
        } catch (error) {
          console.error("[EDAOrchestrator] Synthesis error:", error);
        }
      }
      /**
       * Prompt for human input
       */
      promptHuman(prompt) {
        this.bus.emit("human:requested", { prompt });
        this.emit("human_turn", { prompt });
      }
      /**
       * Add human message
       */
      async addHumanMessage(content) {
        const message = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "human",
          type: "human_input",
          content
        };
        this.bus.addMessage(message, "human");
        this.bus.emit("human:received", { content });
      }
      /**
       * Pause orchestration
       */
      pause() {
        this.isRunning = false;
        this.bus.pause("User paused");
        if (this.synthesisInterval) {
          clearInterval(this.synthesisInterval);
          this.synthesisInterval = null;
        }
      }
      /**
       * Resume orchestration
       */
      resume() {
        this.isRunning = true;
        this.bus.resume();
        this.synthesisInterval = setInterval(() => {
          this.checkForSynthesis();
        }, 3e4);
      }
      /**
       * Stop orchestration
       */
      stop() {
        this.isRunning = false;
        this.isStopped = true;
        if (this.synthesisInterval) {
          clearInterval(this.synthesisInterval);
          this.synthesisInterval = null;
        }
        for (const listener of this.agentListeners.values()) {
          listener.stop();
        }
        this.agentListeners.clear();
        this.unsubscribers.forEach((unsub) => unsub());
        this.unsubscribers = [];
        this.bus.stop("Session ended");
        this.emit("phase_change", { phase: "finalization" });
      }
      /**
       * Transition to argumentation phase - structured debate on brainstorming ideas
       * Per DELIBERATION_WORKFLOW.md: Argumentation follows brainstorming for critical evaluation
       */
      async transitionToArgumentation() {
        if (this.currentPhase !== "brainstorming") {
          return { success: false, message: `\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D5\u05E8 \u05DC\u05D3\u05D9\u05D5\u05DF \u05DE\u05E9\u05DC\u05D1 ${this.currentPhase}` };
        }
        const status2 = this.getConsensusStatus();
        if (!status2.allAgentsSpoke) {
          return {
            success: false,
            message: `\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DB\u05DC \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D3\u05D9\u05D1\u05E8\u05D5. \u05D4\u05DE\u05EA\u05DF \u05DC\u05EA\u05D2\u05D5\u05D1\u05D5\u05EA \u05DE: ${this.session.config.enabledAgents.filter((id) => !status2.agentParticipation.has(id)).join(", ")}`
          };
        }
        this.currentPhase = "argumentation";
        this.emit("phase_change", { phase: "argumentation" });
        const transitionMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u2694\uFE0F **PHASE: ARGUMENTATION**

\u05E2\u05DB\u05E9\u05D9\u05D5 \u05E0\u05D1\u05D7\u05DF \u05D0\u05EA \u05D4\u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA \u05D1\u05E6\u05D5\u05E8\u05D4 \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA\u05D9\u05EA.

**\u05DE\u05D8\u05E8\u05EA \u05D4\u05E9\u05DC\u05D1:**
- \u05D4\u05E2\u05DC\u05D5 \u05D8\u05D9\u05E2\u05D5\u05E0\u05D9 \u05E0\u05D2\u05D3 \u05DC\u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA \u05E9\u05D4\u05D5\u05E6\u05E2\u05D5
- \u05D0\u05EA\u05D2\u05E8\u05D5 \u05D4\u05E0\u05D7\u05D5\u05EA \u05D9\u05E1\u05D5\u05D3
- \u05D6\u05D4\u05D5 \u05D7\u05D5\u05DC\u05E9\u05D5\u05EA \u05D5\u05E1\u05D9\u05DB\u05D5\u05E0\u05D9\u05DD
- \u05D4\u05D2\u05E0\u05D5 \u05E2\u05DC \u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA \u05D8\u05D5\u05D1\u05D9\u05DD \u05E2\u05DD \u05E8\u05D0\u05D9\u05D5\u05EA

**\u05DB\u05DC\u05DC\u05D9 \u05D4\u05D3\u05D9\u05D5\u05DF:**
- \u05DB\u05DC \u05E1\u05D5\u05DB\u05DF \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05E2\u05DC\u05D5\u05EA \u05DC\u05E4\u05D7\u05D5\u05EA \u05D8\u05D9\u05E2\u05D5\u05DF \u05D0\u05D7\u05D3 \u05E0\u05D2\u05D3 \u05E8\u05E2\u05D9\u05D5\u05DF \u05E9\u05D4\u05D5\u05E6\u05E2
- \u05D4\u05E9\u05EA\u05DE\u05E9\u05D5 \u05D1\u05EA\u05D2\u05D9\u05D5\u05EA: [ARGUMENT], [COUNTER], [DEFENSE]
- \u05D0\u05DC \u05EA\u05E1\u05DB\u05D9\u05DE\u05D5 \u05DE\u05D4\u05E8 \u05DE\u05D3\u05D9 - \u05D1\u05D3\u05E7\u05D5 \u05D0\u05EA \u05D4\u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA \u05DC\u05E2\u05D5\u05DE\u05E7

**\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD!** ${this.getNextSpeakerForArgumentation()} - \u05D4\u05E2\u05DC\u05D4/\u05D9 \u05D8\u05D9\u05E2\u05D5\u05DF \u05D1\u05D9\u05E7\u05D5\u05E8\u05EA\u05D9 \u05DC\u05D2\u05D1\u05D9 \u05D0\u05D7\u05D3 \u05D4\u05E8\u05E2\u05D9\u05D5\u05E0\u05D5\u05EA.`
        };
        this.bus.addMessage(transitionMessage, "system");
        setTimeout(() => {
          const firstAgent = this.getNextSpeakerForArgumentation();
          this.forceAgentToSpeak(firstAgent, "Opening argumentation with critical analysis");
        }, 2e3);
        return { success: true, message: "\u05E2\u05D5\u05D1\u05E8\u05D9\u05DD \u05DC\u05E9\u05DC\u05D1 \u05D4\u05D3\u05D9\u05D5\u05DF \u05D4\u05D1\u05D9\u05E7\u05D5\u05E8\u05EA\u05D9" };
      }
      /**
       * Get next speaker for argumentation phase (prefer devil's advocate persona)
       */
      getNextSpeakerForArgumentation() {
        const agents = Array.from(this.agentListeners.keys());
        if (agents.includes("yossi")) return "yossi";
        if (agents.includes("michal")) return "michal";
        return agents[0] || "yossi";
      }
      /**
       * Transition to synthesis phase - consolidate insights from brainstorming/argumentation
       * @param force - Skip consensus check and force transition
       */
      async transitionToSynthesis(force = false) {
        if (this.currentPhase !== "brainstorming" && this.currentPhase !== "argumentation") {
          return { success: false, message: `\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05D1\u05D5\u05E8 \u05DC\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4 \u05DE\u05E9\u05DC\u05D1 ${this.currentPhase}` };
        }
        const status2 = this.getConsensusStatus();
        if (!status2.ready && !force) {
          const warningMessage = {
            id: crypto.randomUUID(),
            timestamp: /* @__PURE__ */ new Date(),
            agentId: "system",
            type: "system",
            content: `\u26A0\uFE0F **\u05D0\u05D6\u05D4\u05E8\u05D4: \u05D4\u05D3\u05D9\u05D5\u05DF \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D1\u05E9\u05DC \u05DC\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4**

${status2.recommendation}

**\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E0\u05D5\u05DB\u05D7\u05D9:**
- \u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05E9\u05D3\u05D9\u05D1\u05E8\u05D5: ${status2.agentParticipation.size}/${this.session.config.enabledAgents.length}
- \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4: ${status2.consensusPoints}
- \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA: ${status2.conflictPoints}

\u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA, \u05D4\u05E7\u05DC\u05D3 \`synthesize force\``
          };
          this.bus.addMessage(warningMessage, "system");
          return { success: false, message: status2.recommendation };
        }
        this.currentPhase = "synthesis";
        this.emit("phase_change", { phase: "synthesis" });
        const participationList = Array.from(status2.agentParticipation.entries()).map(([id, count]) => `  - ${this.getAgentName(id)}: ${count} \u05EA\u05D2\u05D5\u05D1\u05D5\u05EA`).join("\n");
        const transitionMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u{1F4CA} **PHASE: SYNTHESIS**

\u05D4\u05D3\u05D9\u05D5\u05DF \u05E2\u05D5\u05D1\u05E8 \u05DC\u05E9\u05DC\u05D1 \u05D4\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4.

**\u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05D3\u05D9\u05D5\u05DF:**
- \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4: ${status2.consensusPoints}
- \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5: ${status2.conflictPoints}

**\u05D4\u05E9\u05EA\u05EA\u05E4\u05D5\u05EA:**
${participationList}

**\u05DE\u05E9\u05D9\u05DE\u05D4 \u05DC\u05DB\u05DC \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD:**
1. \u05E1\u05DB\u05DE\u05D5 \u05D0\u05EA \u05D4\u05EA\u05D5\u05D1\u05E0\u05D5\u05EA \u05D4\u05E2\u05D9\u05E7\u05E8\u05D9\u05D5\u05EA \u05E9\u05E2\u05DC\u05D5
2. \u05D6\u05D4\u05D5 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4 \u05D5\u05D7\u05D9\u05DC\u05D5\u05E7\u05D9 \u05D3\u05E2\u05D5\u05EA
3. \u05D4\u05D2\u05D3\u05D9\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E1\u05E8\u05D9\u05DD \u05D4\u05DE\u05E8\u05DB\u05D6\u05D9\u05D9\u05DD \u05E9\u05D7\u05D9\u05D9\u05D1\u05D9\u05DD \u05DC\u05D4\u05D5\u05E4\u05D9\u05E2 \u05D1\u05E7\u05D5\u05E4\u05D9

**\u05D4\u05E1\u05D5\u05DB\u05DF \u05D4\u05D1\u05D0:** ${this.getNextSpeakerForSynthesis()} - \u05E1\u05DB\u05DD/\u05D9 \u05D0\u05EA \u05D4\u05D3\u05D9\u05D5\u05DF \u05DE\u05E0\u05E7\u05D5\u05D3\u05EA \u05D4\u05DE\u05D1\u05D8 \u05E9\u05DC\u05DA.`
        };
        this.bus.addMessage(transitionMessage, "system");
        setTimeout(() => {
          const firstAgent = this.getNextSpeakerForSynthesis();
          this.forceAgentToSpeak(firstAgent, "Synthesizing discussion insights");
        }, 2e3);
        return { success: true, message: "\u05E2\u05D5\u05D1\u05E8\u05D9\u05DD \u05DC\u05E9\u05DC\u05D1 \u05D4\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4" };
      }
      /**
       * Transition to drafting phase - agents write actual copy sections
       */
      async transitionToDrafting() {
        if (this.currentPhase !== "synthesis" && this.currentPhase !== "brainstorming") {
          console.log(`[EDAOrchestrator] Cannot transition to drafting from ${this.currentPhase}`);
          return;
        }
        this.currentPhase = "drafting";
        this.emit("phase_change", { phase: "drafting" });
        this.copySections = COPY_SECTIONS.map((section, index2) => ({
          ...section,
          status: "pending",
          assignedAgent: this.assignAgentToSection(index2)
        }));
        const assignments = this.copySections.map((s) => `- **${s.nameHe}** (${s.name}): ${this.getAgentName(s.assignedAgent)}`).join("\n");
        const transitionMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u270D\uFE0F **PHASE: DRAFTING**

\u05E2\u05DB\u05E9\u05D9\u05D5 \u05E0\u05DB\u05EA\u05D5\u05D1 \u05D0\u05EA \u05D4\u05E7\u05D5\u05E4\u05D9 \u05D1\u05E4\u05D5\u05E2\u05DC!

**\u05D7\u05DC\u05D5\u05E7\u05EA \u05DE\u05E9\u05D9\u05DE\u05D5\u05EA:**
${assignments}

**\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA:**
- \u05DB\u05EA\u05D1\u05D5 \u05D8\u05D9\u05D5\u05D8\u05D4 \u05E8\u05D0\u05E9\u05D5\u05E0\u05D4 \u05DC\u05D7\u05DC\u05E7 \u05E9\u05DC\u05DB\u05DD
- \u05D4\u05EA\u05D1\u05E1\u05E1\u05D5 \u05E2\u05DC \u05D4\u05EA\u05D5\u05D1\u05E0\u05D5\u05EA \u05DE\u05D4\u05D3\u05D9\u05D5\u05DF
- \u05E9\u05DE\u05E8\u05D5 \u05E2\u05DC \u05E2\u05E7\u05D1\u05D9\u05D5\u05EA \u05D1\u05D8\u05D5\u05DF \u05D5\u05D1\u05E9\u05E4\u05D4
- \u05D0\u05D7\u05E8\u05D9 \u05DB\u05DC \u05D8\u05D9\u05D5\u05D8\u05D4, \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D4\u05D0\u05D7\u05E8\u05D9\u05DD \u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DC\u05D4\u05D2\u05D9\u05D1 \u05D5\u05DC\u05E9\u05E4\u05E8

**\u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD!** ${this.getAgentName(this.copySections[0].assignedAgent)} - \u05DB\u05EA\u05D5\u05D1/\u05D9 \u05D0\u05EA ${this.copySections[0].nameHe}.`
        };
        this.bus.addMessage(transitionMessage, "system");
        setTimeout(() => {
          this.startDraftingSection(0);
        }, 2e3);
      }
      /**
       * Get a consolidated draft of all sections
       */
      async getConsolidatedDraft() {
        const sections = this.copySections.filter((s) => s.content).map((s) => `## ${s.nameHe} (${s.name})

${s.content}`).join("\n\n---\n\n");
        return `# ${this.session.config.projectName} - Draft Copy

${sections}`;
      }
      /**
       * Assign agent to section based on their strengths
       */
      assignAgentToSection(sectionIndex) {
        const agents = Array.from(this.agentListeners.keys());
        return agents[sectionIndex % agents.length];
      }
      /**
       * Get agent display name
       */
      getAgentName(agentId) {
        const agent = getAgentById(agentId);
        if (!agent) return agentId;
        return this.session.config.language === "hebrew" ? `${agent.name} (${agent.nameHe})` : agent.name;
      }
      /**
       * Get next speaker for synthesis phase
       */
      getNextSpeakerForSynthesis() {
        const agents = Array.from(this.agentListeners.keys());
        if (agents.includes("ronit")) return "ronit";
        return agents[0] || "ronit";
      }
      /**
       * Start drafting a specific section
       */
      startDraftingSection(sectionIndex) {
        if (sectionIndex >= this.copySections.length) {
          this.finalizeDrafting();
          return;
        }
        const section = this.copySections[sectionIndex];
        section.status = "in_progress";
        this.emit("draft_section", { section, sectionIndex });
        this.forceAgentToSpeak(section.assignedAgent, `Writing ${section.name} (${section.nameHe})`);
      }
      /**
       * Mark a section as complete and move to next
       */
      completeDraftSection(sectionId, content) {
        const sectionIndex = this.copySections.findIndex((s) => s.id === sectionId);
        if (sectionIndex === -1) return;
        this.copySections[sectionIndex].content = content;
        this.copySections[sectionIndex].status = "complete";
        const section = this.copySections[sectionIndex];
        const completeMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u2705 **${section.nameHe}** complete!

---

${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`
        };
        this.bus.addMessage(completeMessage, "system");
        setTimeout(() => {
          this.startDraftingSection(sectionIndex + 1);
        }, 3e3);
      }
      /**
       * Finalize drafting phase
       */
      async finalizeDrafting() {
        this.currentPhase = "finalization";
        this.emit("phase_change", { phase: "finalization" });
        const draft = await this.getConsolidatedDraft();
        const finalMessage = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content: `\u{1F389} **DRAFTING COMPLETE!**

\u05DB\u05DC \u05D4\u05D7\u05DC\u05E7\u05D9\u05DD \u05E0\u05DB\u05EA\u05D1\u05D5. \u05D4\u05E7\u05D5\u05E4\u05D9 \u05D4\u05DE\u05DC\u05D0:

${draft}

**\u05DE\u05D4 \u05E2\u05DB\u05E9\u05D9\u05D5?**
- \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DC\u05EA\u05EA \u05E4\u05D9\u05D3\u05D1\u05E7 \u05E1\u05D5\u05E4\u05D9
- \u05E0\u05D9\u05EA\u05DF \u05DC\u05E2\u05E8\u05D5\u05DA \u05D5\u05DC\u05E9\u05E4\u05E8
- \u05D4\u05E7\u05D5\u05E4\u05D9 \u05DE\u05D5\u05DB\u05DF \u05DC\u05D9\u05D9\u05E6\u05D5\u05D0`
        };
        this.bus.addMessage(finalMessage, "system");
      }
      /**
       * Get current phase
       */
      getCurrentPhase() {
        return this.currentPhase;
      }
      /**
       * Get copy sections status
       */
      getCopySections() {
        return [...this.copySections];
      }
      // ===========================================================================
      // PHASE EXECUTOR — deterministic Discovery → Synthesis → Drafting → Final
      // ===========================================================================
      /**
       * Run the deterministic phase machine that produces a complete deliverable.
       * Discovery and Synthesis each do one round-robin pass; Drafting does one
       * agent per required section (parsed from the goal). Each turn uses
       * `AgentListener.speakNow()` which bypasses FloorManager queueing and
       * resolves with the produced Message — so the loop is fully awaitable.
       */
      async runPhaseMachine() {
        if (this.isStopped) return;
        const sections = parseGoalSections(this.session.config.goal);
        const agentIds = Array.from(this.agentListeners.keys());
        if (agentIds.length === 0) {
          console.warn("[EDAOrchestrator] PhaseMachine: no agents available");
          return;
        }
        console.log(
          `[EDAOrchestrator] PhaseMachine starting \u2014 ${agentIds.length} agents, ${sections.length} sections`
        );
        await this.runDiscoveryPhase(agentIds);
        if (this.isStopped) return;
        await this.runResearchPhase(agentIds);
        if (this.isStopped) return;
        const synthesisSummary = await this.runSynthesisPhase(agentIds);
        if (this.isStopped) return;
        await this.runDraftingPhase(agentIds, sections, synthesisSummary);
        if (this.isStopped) return;
        await this.finalizeByMachine(sections);
      }
      /**
       * Discovery: each enabled agent shares their initial perspective once.
       */
      async runDiscoveryPhase(agentIds) {
        this.currentPhase = "brainstorming";
        this.emit("phase_change", { phase: "brainstorming" });
        this.modeController.transitionToPhase("discovery");
        this.pushSystemMessage(
          `\u{1F50E} **PHASE 1/4: DISCOVERY**

Each agent: share your initial perspective on the goal in 2\u20133 short paragraphs. What's your first instinct? What concerns you? What opportunity do you see? Do NOT draft the final deliverable yet \u2014 we'll do that in Phase 4.`
        );
        for (const agentId of agentIds) {
          if (this.isStopped) return;
          await this.forceSpeakAndWait(agentId, "Discovery: initial perspective");
        }
      }
      /**
       * Research: each agent gets one chance to invoke @context-finder (or
       * another researcher) to ground themselves in the project. Unlike
       * Discovery, only ONE round-robin happens — if an agent doesn't need
       * research, they're told to say "[PASS] no research needed" and the
       * next agent goes. Research requests halt deliberation via the existing
       * `processResearchRequest` pause/resume path.
       */
      async runResearchPhase(agentIds) {
        if (this.isStopped) return;
        this.currentPhase = "research";
        this.emit("phase_change", { phase: "research" });
        this.modeController.transitionToPhase("research");
        const hasContextDir = !!this.session.config.contextDir;
        const contextDirHint = hasContextDir ? `The session has a local project at \`${this.session.config.contextDir}\` that you can introspect.` : `No local project is attached to this session \u2014 skip project introspection and pass.`;
        this.pushSystemMessage(
          `\u{1F50D} **PHASE 2/4: RESEARCH**

${contextDirHint}

To invoke a researcher, emit a research block (this is the ONLY trigger \u2014 bare mentions of researcher names in prose are ignored):

\`\`\`
[RESEARCH: context-finder]
What deliberation modes are defined in src/lib/modes/? List each mode's id, name, and phase structure.
[/RESEARCH]
\`\`\`

**Available researchers:**
- \`context-finder\` \u2014 reads files in the local project directory and answers grounded in the source code. Use this to discover what the project actually does.
- \`stats-finder\` \u2014 web search for statistics.
- \`competitor-analyst\` \u2014 web search for competitor analysis.
- \`audience-insight\` \u2014 web search for audience/user pain points.
- \`copy-explorer\` \u2014 web search for exemplary copy patterns.

**Rules:**
- Each agent emits ONE research block and waits for the answer. No more than one per turn.
- If you don't need research, reply with \`[PASS] no research needed\` and the next agent goes.
- Keep your query specific and answerable from code/data (not "is Forge good?" but "what modes exist in src/lib/modes/?").`
        );
        for (const agentId of agentIds) {
          if (this.isStopped) return;
          await this.forceSpeakAndWait(agentId, "Research: ask one grounded question");
          await this.waitForResearchComplete();
        }
      }
      /**
       * Poll until `researchPending` clears or the timeout hits. Used by the
       * research phase to serialize research turns (the processResearchRequest
       * path is fire-and-forget from the message bus subscriber).
       */
      async waitForResearchComplete(timeoutMs = 18e4) {
        const start = Date.now();
        while (this.researchPending && Date.now() - start < timeoutMs) {
          if (this.isStopped) return;
          await new Promise((r) => setTimeout(r, 500));
        }
      }
      /**
       * Synthesis: each agent proposes structure and key messages. Returns a
       * concise summary string (used as context in the drafting phase).
       */
      async runSynthesisPhase(agentIds) {
        if (this.isStopped) return "";
        this.currentPhase = "synthesis";
        this.emit("phase_change", { phase: "synthesis" });
        this.modeController.transitionToPhase("synthesis");
        this.pushSystemMessage(
          `\u{1F9ED} **PHASE 3/4: SYNTHESIS**

Each agent: propose the structure, tone, and key messages for the final deliverable. Reference what the others said in Discovery AND what was found in Research. Still no drafting \u2014 just align on what we're going to write.`
        );
        const synthesisMessages = [];
        for (const agentId of agentIds) {
          if (this.isStopped) return "";
          const msg = await this.forceSpeakAndWait(agentId, "Synthesis: propose structure");
          if (msg) synthesisMessages.push(msg);
        }
        return synthesisMessages.map((m) => `[${m.agentId}]: ${m.content.slice(0, 800)}`).join("\n\n");
      }
      /**
       * Drafting: one agent per required section. Each turn gets a bounded,
       * focused context (goal + synthesis summary + already-drafted sections)
       * and an instruction to emit ONLY the `## <SECTION_NAME>` block.
       */
      async runDraftingPhase(agentIds, sections, synthesisSummary) {
        if (this.isStopped) return;
        this.currentPhase = "drafting";
        this.emit("phase_change", { phase: "drafting" });
        this.modeController.transitionToPhase("drafting");
        this.pushSystemMessage(
          `\u270D\uFE0F **PHASE 4/4: DRAFTING** \u2014 ${sections.length} sections

We will now draft the final deliverable one section at a time. For each section, the assigned agent writes ONLY that section. Output MUST start with \`## <SECTION_NAME>\` on its own line and contain the full, finished copy \u2014 no meta-commentary, no evidence notes, no questions to the team.

**GROUNDING RULE (strict):** You may ONLY name features, modes, commands, files, or technical claims that were explicitly verified during the Research phase. If Research found the mode is called \`copywrite\`, you write "Copywrite" \u2014 NOT "Architecture Review" or "Copywriting Assistant" or any other plausible-sounding name you might prefer. If Research did not cover a feature, omit it entirely rather than inventing it. Plausible-sounding fabrications (made-up commands, made-up modes, made-up flag names) are the single biggest failure mode \u2014 do not commit them.

**Concreteness rule:** every section that describes capability or value must include at least one named, specific example drawn from what Research actually found. Abstract phrasing like "complex decisions" is not acceptable \u2014 name the feature, mode, file, or scenario that Research returned. Hero and Footer are exempt from the concreteness rule but NOT from the grounding rule.`
        );
        this.copySections = sections.map((s, i) => ({
          id: s.id,
          name: s.name,
          nameHe: s.name,
          status: "pending",
          assignedAgent: agentIds[i % agentIds.length]
        }));
        for (let i = 0; i < this.copySections.length; i++) {
          if (this.isStopped) return;
          const section = this.copySections[i];
          section.status = "in_progress";
          this.emit("draft_section", { section, sectionIndex: i });
          const alreadyDrafted = this.copySections.filter((s) => s.content && s.content.length > 0).map((s) => `## ${s.name}
${s.content}`).join("\n\n");
          const exemptFromExamples = section.id === "hero" || section.id === "footer" || section.id === "final_cta";
          const researchFindings = this.bus.getAllMessages().filter((m) => m.type === "research_result").map((m) => m.content).join("\n\n---\n\n").slice(0, 6e3);
          const draftContext = [
            `## GOAL`,
            this.session.config.goal.slice(0, 2e3),
            ``,
            researchFindings ? `## RESEARCH FINDINGS (authoritative \u2014 cite ONLY from here for technical facts)

${researchFindings}` : `## RESEARCH FINDINGS

_(no research was conducted \u2014 do not make specific technical claims)_`,
            ``,
            `## SYNTHESIS (what the team agreed on)`,
            synthesisSummary.slice(0, 2e3),
            alreadyDrafted ? `
## ALREADY DRAFTED (for reference \u2014 do NOT rewrite these)

${alreadyDrafted.slice(0, 2500)}` : "",
            ``,
            `## YOUR TASK`,
            `Draft ONLY the **${section.name}** section (section ${i + 1} of ${this.copySections.length}).`,
            ``,
            `Requirements:`,
            `- Start your response with: \`## ${section.name}\``,
            `- Follow with the FULL, finished copy for this section \u2014 ready to ship.`,
            `- No meta-commentary, no outlines, no evidence notes, no "here is my draft" preambles, no questions to the team.`,
            `- **GROUNDING RULE (strict):** every feature, mode name, command, file, or technical claim in this section MUST appear verbatim (or as a direct paraphrase) in the RESEARCH FINDINGS above. If Research says the mode is \`copywrite\`, write "Copywrite" \u2014 NOT "Copywriting Assistant". If Research didn't cover something, do not mention it. Plausible-sounding fabrications are forbidden.`,
            exemptFromExamples ? `- This section is short-form \u2014 no example needed, just punchy copy grounded in Research.` : `- **Concreteness rule:** include at least one named, specific example drawn from Research. Name the user ("a 20-person eng team choosing between monolith and microservices"), the decision, or the workflow. The example must be consistent with what Research actually returned \u2014 don't invent scenarios.`,
            `- Keep it concise but complete \u2014 the reader should not need a second pass.`
          ].filter(Boolean).join("\n");
          const msg = await this.forceSpeakAndWait(
            section.assignedAgent,
            `Drafting: ${section.name}`,
            draftContext
          );
          if (msg) {
            const extracted = extractSection(msg.content, section.name);
            section.content = (extracted || msg.content).trim();
          } else {
            section.content = `## ${section.name}

_(agent did not respond in time)_`;
          }
          section.status = "complete";
        }
      }
      /**
       * Finalize: emit consolidated draft, push completion system message, and
       * signal `session:end` so the CLI / test harness exits cleanly.
       */
      async finalizeByMachine(sections) {
        if (this.isStopped) return;
        this.currentPhase = "finalization";
        this.emit("phase_change", { phase: "finalization" });
        const draft = await this.getConsolidatedDraft();
        const completed = this.copySections.filter(
          (s) => s.content && !s.content.includes("_(agent did not respond in time)_")
        ).length;
        this.pushSystemMessage(
          `\u{1F389} **DRAFTING COMPLETE** \u2014 ${completed}/${sections.length} sections

${draft}`
        );
        this.bus.emit("session:end", {
          reason: `completed:${completed}/${sections.length}`
        });
      }
      /**
       * Drive one agent to speak with an optional focused context, waiting up to
       * `speakTimeoutMs` for the message. Returns the produced Message or null.
       */
      async forceSpeakAndWait(agentId, reason, contextOverride) {
        const listener = this.agentListeners.get(agentId);
        if (!listener) {
          console.warn(`[EDAOrchestrator] forceSpeakAndWait: ${agentId} not found`);
          return null;
        }
        let timer = null;
        const timeout = new Promise((resolve4) => {
          timer = setTimeout(() => resolve4(null), this.speakTimeoutMs);
        });
        try {
          const result = await Promise.race([
            listener.speakNow(reason, contextOverride),
            timeout
          ]);
          return result;
        } catch (err2) {
          console.error(`[EDAOrchestrator] forceSpeakAndWait error for ${agentId}:`, err2);
          return null;
        } finally {
          if (timer) clearTimeout(timer);
        }
      }
      /**
       * Inject a system message into the bus (helper for phase headers).
       */
      pushSystemMessage(content) {
        const msg = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content
        };
        this.bus.addMessage(msg, "system");
      }
      /**
       * Force an agent to speak (bypass normal floor request) — legacy API used
       * by manual transition methods (transitionToArgumentation/Synthesis/Drafting).
       */
      forceAgentToSpeak(agentId, reason) {
        const listener = this.agentListeners.get(agentId);
        if (!listener) {
          console.log(`[EDAOrchestrator] Agent ${agentId} not found, trying next`);
          const firstAgent = this.agentListeners.keys().next().value;
          if (firstAgent) {
            this.forceAgentToSpeak(firstAgent, reason);
          }
          return;
        }
        const request = {
          agentId,
          urgency: "high",
          reason,
          responseType: "argument",
          timestamp: Date.now()
        };
        console.log(`[EDAOrchestrator] Forcing ${agentId} to speak: ${reason}`);
        this.bus.emit("floor:request", request);
      }
      /**
       * Get floor status
       */
      getFloorStatus() {
        return this.floorManager.getQueueStatus();
      }
      /**
       * Get agent states
       */
      getAgentStates() {
        const states = /* @__PURE__ */ new Map();
        for (const [id, listener] of this.agentListeners) {
          states.set(id, listener.getState());
        }
        return states;
      }
      /**
       * Get session reference
       */
      getSession() {
        return this.session;
      }
      /**
       * Get messages from the bus
       */
      getMessages() {
        return this.bus.getAllMessages();
      }
    };
  }
});

// src/lib/core/result.ts
import {
  Result,
  ResultAsync,
  ok,
  err,
  okAsync,
  errAsync,
  fromPromise,
  fromThrowable,
  fromAsyncThrowable,
  safeTry,
  Ok,
  Err
} from "neverthrow";
var init_result = __esm({
  "src/lib/core/result.ts"() {
    "use strict";
  }
});

// src/lib/core/errors.ts
var makeError;
var init_errors = __esm({
  "src/lib/core/errors.ts"() {
    "use strict";
    makeError = (tag) => (message, cause) => ({
      _tag: tag,
      message,
      cause
    });
  }
});

// src/lib/core/canonical.ts
var canonicalize;
var init_canonical = __esm({
  "src/lib/core/canonical.ts"() {
    "use strict";
    canonicalize = (value) => {
      if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
      }
      if (Array.isArray(value)) {
        return "[" + value.map(canonicalize).join(",") + "]";
      }
      const keys = Object.keys(value).sort();
      const body = keys.map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",");
      return "{" + body + "}";
    };
  }
});

// src/lib/core/index.ts
var init_core = __esm({
  "src/lib/core/index.ts"() {
    "use strict";
    init_result();
    init_errors();
    init_canonical();
  }
});

// src/lib/auth/errors.ts
var invalidPublicKey, invalidDidFormat, signatureVerificationFailed, signingFailed, keyGenerationFailed, credentialTampered, issuerSubjectMismatch, credentialSigningFailed, attestationLookupFailed, attestationRateLimited, unsupportedPlatform, invalidHandle, sessionStorageFailed, sessionNotAvailable, bridgeUnavailable;
var init_errors2 = __esm({
  "src/lib/auth/errors.ts"() {
    "use strict";
    init_core();
    invalidPublicKey = makeError("InvalidPublicKey");
    invalidDidFormat = makeError("InvalidDidFormat");
    signatureVerificationFailed = makeError("SignatureVerificationFailed");
    signingFailed = makeError("SigningFailed");
    keyGenerationFailed = makeError("KeyGenerationFailed");
    credentialTampered = makeError("CredentialTampered");
    issuerSubjectMismatch = makeError("IssuerSubjectMismatch");
    credentialSigningFailed = makeError("CredentialSigningFailed");
    attestationLookupFailed = makeError("AttestationLookupFailed");
    attestationRateLimited = makeError("AttestationRateLimited");
    unsupportedPlatform = makeError("UnsupportedPlatform");
    invalidHandle = makeError("InvalidHandle");
    sessionStorageFailed = makeError("SessionStorageFailed");
    sessionNotAvailable = makeError("SessionNotAvailable");
    bridgeUnavailable = makeError("BridgeUnavailable");
  }
});

// src/lib/auth/did.ts
import * as ed from "@noble/ed25519";
import { sha256, sha512 } from "@noble/hashes/sha2.js";
var ED25519_MULTICODEC_PREFIX, BASE58_ALPHABET, DID_KEY_PREFIX, base58btcEncode, base58btcDecode, countLeading, countLeadingChar, toHex, fromHex, publicKeyToDid, didToPublicKey, generateDid, signMessage, verifySignature, hashContent, serializeKeypair, deserializeKeypair;
var init_did = __esm({
  "src/lib/auth/did.ts"() {
    "use strict";
    init_core();
    init_errors2();
    ed.hashes.sha512 = (message) => sha512(message);
    ED25519_MULTICODEC_PREFIX = Uint8Array.from([237, 1]);
    BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    DID_KEY_PREFIX = "did:key:z";
    base58btcEncode = (bytes) => {
      if (bytes.length === 0) return "";
      const zeros = countLeading(bytes, 0);
      const digits = [0];
      for (let i = zeros; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = 0; j < digits.length; j++) {
          carry += digits[j] << 8;
          digits[j] = carry % 58;
          carry = carry / 58 | 0;
        }
        while (carry > 0) {
          digits.push(carry % 58);
          carry = carry / 58 | 0;
        }
      }
      return "1".repeat(zeros) + digits.reverse().map((d) => BASE58_ALPHABET[d]).join("");
    };
    base58btcDecode = (str) => {
      if (str.length === 0) return ok(new Uint8Array());
      const zeros = countLeadingChar(str, "1");
      const bytes = [0];
      for (let i = zeros; i < str.length; i++) {
        const value = BASE58_ALPHABET.indexOf(str[i]);
        if (value < 0) return err(invalidDidFormat(`Invalid base58 character: ${str[i]}`));
        let carry = value;
        for (let j = 0; j < bytes.length; j++) {
          carry += bytes[j] * 58;
          bytes[j] = carry & 255;
          carry >>= 8;
        }
        while (carry > 0) {
          bytes.push(carry & 255);
          carry >>= 8;
        }
      }
      const out = new Uint8Array(zeros + bytes.length);
      for (let i = 0; i < bytes.length; i++) out[zeros + i] = bytes[bytes.length - 1 - i];
      return ok(out);
    };
    countLeading = (arr, value) => {
      let i = 0;
      while (i < arr.length && arr[i] === value) i++;
      return i;
    };
    countLeadingChar = (s, ch) => {
      let i = 0;
      while (i < s.length && s[i] === ch) i++;
      return i;
    };
    toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    fromHex = (hex) => {
      const clean = hex.replace(/^0x/, "");
      const out = new Uint8Array(clean.length / 2);
      for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
      return out;
    };
    publicKeyToDid = (publicKey) => {
      if (publicKey.length !== 32) {
        return err(invalidPublicKey(`Ed25519 public key must be 32 bytes, got ${publicKey.length}`));
      }
      const prefixed = new Uint8Array(ED25519_MULTICODEC_PREFIX.length + publicKey.length);
      prefixed.set(ED25519_MULTICODEC_PREFIX, 0);
      prefixed.set(publicKey, ED25519_MULTICODEC_PREFIX.length);
      return ok(`${DID_KEY_PREFIX}${base58btcEncode(prefixed)}`);
    };
    didToPublicKey = (did) => {
      if (!did.startsWith(DID_KEY_PREFIX)) {
        return err(invalidDidFormat(`Expected "${DID_KEY_PREFIX}..." prefix: ${did}`));
      }
      return base58btcDecode(did.slice(DID_KEY_PREFIX.length)).andThen((decoded) => {
        if (decoded.length !== 34 || decoded[0] !== ED25519_MULTICODEC_PREFIX[0] || decoded[1] !== ED25519_MULTICODEC_PREFIX[1]) {
          return err(invalidDidFormat("DID does not encode an Ed25519 public key"));
        }
        return ok(decoded.slice(2));
      });
    };
    generateDid = () => ResultAsync.fromPromise(
      (async () => {
        const privateKey = ed.utils.randomSecretKey();
        const publicKey = await ed.getPublicKeyAsync(privateKey);
        const didResult = publicKeyToDid(publicKey);
        if (didResult.isErr()) throw new Error(didResult.error.message);
        return { did: didResult.value, publicKey, privateKey };
      })(),
      (cause) => keyGenerationFailed("Failed to generate Ed25519 keypair", cause)
    );
    signMessage = (privateKey, message) => {
      const bytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
      return ResultAsync.fromPromise(
        ed.signAsync(bytes, privateKey).then(base58btcEncode),
        (cause) => signingFailed("Failed to sign message", cause)
      );
    };
    verifySignature = (did, message, signatureB58) => {
      const pubKeyResult = didToPublicKey(did);
      if (pubKeyResult.isErr()) return errAsync(pubKeyResult.error);
      const decodedSigResult = base58btcDecode(signatureB58);
      if (decodedSigResult.isErr()) return errAsync(decodedSigResult.error);
      const publicKey = pubKeyResult.value;
      const signature = decodedSigResult.value;
      const bytes = typeof message === "string" ? new TextEncoder().encode(message) : message;
      return ResultAsync.fromPromise(
        ed.verifyAsync(signature, bytes, publicKey),
        (cause) => signatureVerificationFailed("Signature verification threw", cause)
      ).andThen(
        (valid) => valid ? okAsync(true) : errAsync(signatureVerificationFailed("Signature does not verify"))
      );
    };
    hashContent = (content) => {
      const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
      return toHex(sha256(bytes));
    };
    serializeKeypair = (kp) => ({
      did: kp.did,
      publicKeyHex: toHex(kp.publicKey),
      privateKeyHex: toHex(kp.privateKey),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    deserializeKeypair = (s) => ({
      did: s.did,
      publicKey: fromHex(s.publicKeyHex),
      privateKey: fromHex(s.privateKeyHex)
    });
  }
});

// src/lib/auth/attestations.ts
var bucketCount, bucketAgeYears, http, parseMastodonHandle, fetchMastodon, fetchGitHub, fetchBluesky, REGISTRY, fetchAttestation, hashAttestations;
var init_attestations = __esm({
  "src/lib/auth/attestations.ts"() {
    "use strict";
    init_core();
    init_errors2();
    init_did();
    bucketCount = (n) => {
      if (n < 10) return "<10";
      if (n < 100) return "<100";
      if (n < 1e3) return "<1k";
      if (n < 1e4) return "<10k";
      if (n < 1e5) return "<100k";
      return "100k+";
    };
    bucketAgeYears = (createdAt) => {
      const ageMs = Date.now() - new Date(createdAt).getTime();
      const years = ageMs / (365.25 * 24 * 60 * 60 * 1e3);
      if (years < 0.5) return "<0.5y";
      if (years < 1) return "<1y";
      if (years < 2) return "1-2y";
      if (years < 4) return "2-4y";
      if (years < 7) return "4-7y";
      return "7y+";
    };
    http = (url, init = {}) => fromPromise(
      (async () => {
        const res = await fetch(url, init);
        if (res.status === 403 || res.status === 429) {
          const err2 = new Error("rate_limited");
          err2.status = res.status;
          throw err2;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return await res.json();
      })(),
      (cause) => {
        if (cause instanceof Error && cause.message === "rate_limited") {
          return attestationRateLimited(`Rate limited at ${url}`, cause);
        }
        return attestationLookupFailed(`Fetch failed: ${url}`, cause);
      }
    );
    parseMastodonHandle = (raw) => {
      const urlMatch = raw.match(/^https?:\/\/([^/]+)\/@([^/?#]+)/);
      if (urlMatch) {
        return fromPromise(
          Promise.resolve({ instance: urlMatch[1], user: urlMatch[2] }),
          (c) => invalidHandle("bad mastodon URL", c)
        );
      }
      const cleaned = raw.replace(/^@/, "");
      const parts = cleaned.split("@");
      if (parts.length !== 2) {
        return errAsync(invalidHandle(`Mastodon handle must be "user@instance", got "${raw}"`));
      }
      return fromPromise(
        Promise.resolve({ user: parts[0], instance: parts[1] }),
        (c) => invalidHandle("bad mastodon handle", c)
      );
    };
    fetchMastodon = (handle) => parseMastodonHandle(handle).andThen(
      ({ user, instance }) => http(
        `https://${instance}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`
      ).map((account) => {
        const canonicalHandle = `@${account.username}@${instance}`;
        return {
          platform: "mastodon",
          handle: canonicalHandle,
          handleHash: hashContent(canonicalHandle.toLowerCase()),
          signals: {
            instance,
            accountAgeBucket: bucketAgeYears(account.created_at),
            followersBucket: bucketCount(account.followers_count),
            followingBucket: bucketCount(account.following_count),
            statusesBucket: bucketCount(account.statuses_count),
            hasBio: account.note && account.note.length > 0 ? "yes" : "no"
          },
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      })
    );
    fetchGitHub = (handle) => {
      const username = handle.replace(/^@/, "").trim();
      if (!username) return errAsync(invalidHandle("GitHub handle is empty"));
      return http(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { Accept: "application/vnd.github+json" }
      }).map((user) => {
        const canonicalHandle = `@${user.login}`;
        return {
          platform: "github",
          handle: canonicalHandle,
          handleHash: hashContent(canonicalHandle.toLowerCase()),
          signals: {
            accountType: user.type,
            accountAgeBucket: bucketAgeYears(user.created_at),
            reposBucket: bucketCount(user.public_repos),
            gistsBucket: bucketCount(user.public_gists),
            followersBucket: bucketCount(user.followers),
            followingBucket: bucketCount(user.following),
            hasBio: user.bio ? "yes" : "no"
          },
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
    };
    fetchBluesky = (handle) => {
      const actor = handle.replace(/^@/, "").trim();
      if (!actor) return errAsync(invalidHandle("Bluesky handle is empty"));
      return http(
        `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
      ).map((profile) => {
        const canonicalHandle = `@${profile.handle}`;
        return {
          platform: "bluesky",
          handle: canonicalHandle,
          handleHash: hashContent(canonicalHandle.toLowerCase()),
          signals: {
            accountAgeBucket: profile.indexedAt ? bucketAgeYears(profile.indexedAt) : "unknown",
            followersBucket: bucketCount(profile.followersCount ?? 0),
            followsBucket: bucketCount(profile.followsCount ?? 0),
            postsBucket: bucketCount(profile.postsCount ?? 0),
            hasBio: profile.description ? "yes" : "no"
          },
          capturedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
    };
    REGISTRY = {
      mastodon: fetchMastodon,
      github: fetchGitHub,
      bluesky: fetchBluesky
    };
    fetchAttestation = (platform, handle) => {
      const fetcher = REGISTRY[platform];
      if (!fetcher) {
        return errAsync(unsupportedPlatform(`Unknown platform: ${platform}`));
      }
      return fetcher(handle);
    };
    hashAttestations = (attestations) => {
      const canonical = JSON.stringify(
        attestations.map((a) => ({
          platform: a.platform,
          handleHash: a.handleHash,
          signals: a.signals
        }))
      );
      return hashContent(canonical);
    };
  }
});

// src/lib/auth/vc.ts
var buildCredential, buildProof, issueIdentityCredential, checkIssuerMatchesSubject, checkAttestationsHash, verifyCredential;
var init_vc = __esm({
  "src/lib/auth/vc.ts"() {
    "use strict";
    init_core();
    init_core();
    init_errors2();
    init_did();
    init_attestations();
    buildCredential = (did, attestations) => ({
      "@context": [
        "https://www.w3.org/ns/credentials/v2",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      type: ["VerifiableCredential", "ForgeIdentityCredential"],
      id: `urn:uuid:${crypto.randomUUID()}`,
      issuer: did,
      issuanceDate: (/* @__PURE__ */ new Date()).toISOString(),
      credentialSubject: {
        id: did,
        attestations,
        attestationsHash: hashAttestations(attestations)
      }
    });
    buildProof = (did, proofValue) => ({
      type: "Ed25519Signature2020",
      created: (/* @__PURE__ */ new Date()).toISOString(),
      verificationMethod: `${did}#${did.split(":").pop()}`,
      proofPurpose: "assertionMethod",
      proofValue
    });
    issueIdentityCredential = (opts) => {
      const credential = buildCredential(opts.did, opts.attestations);
      const message = canonicalize(credential);
      return signMessage(opts.privateKey, message).map((proofValue) => ({ credential, proof: buildProof(opts.did, proofValue) })).mapErr(
        (e) => e._tag === "SigningFailed" ? credentialSigningFailed("Failed to sign credential", e.cause) : e
      );
    };
    checkIssuerMatchesSubject = (c) => c.issuer === c.credentialSubject.id ? ok(c) : err(issuerSubjectMismatch("Issuer must equal subject for self-issued credential"));
    checkAttestationsHash = (c) => {
      const recomputed = hashAttestations(c.credentialSubject.attestations);
      return recomputed === c.credentialSubject.attestationsHash ? ok(c) : err(credentialTampered("Attestations hash mismatch \u2014 credential tampered"));
    };
    verifyCredential = (signed) => {
      const preCheck = checkIssuerMatchesSubject(signed.credential).andThen(checkAttestationsHash);
      if (preCheck.isErr()) return errAsync(preCheck.error);
      const message = canonicalize(signed.credential);
      return verifySignature(signed.credential.issuer, message, signed.proof.proofValue);
    };
  }
});

// src/lib/auth/session.ts
var getElectronBridge, createSessionRepository, sessionRepo;
var init_session = __esm({
  "src/lib/auth/session.ts"() {
    "use strict";
    init_core();
    init_errors2();
    init_did();
    init_attestations();
    init_vc();
    getElectronBridge = () => {
      const api = globalThis.electronAPI;
      return api?.auth ? okAsync(api.auth) : errAsync(bridgeUnavailable("Auth bridge not available \u2014 is preload.js up to date?"));
    };
    createSessionRepository = (bridgeResolver = getElectronBridge) => {
      let cached = null;
      const saveThrough = (bridge, stored) => fromPromise(bridge.save(stored), (c) => sessionStorageFailed("Failed to persist session", c)).andThen((ok2) => ok2 ? okAsync(stored) : errAsync(sessionStorageFailed("save returned false")));
      const loadRaw = () => bridgeResolver().andThen(
        (bridge) => fromPromise(bridge.load(), (c) => sessionStorageFailed("Failed to load session", c))
      );
      const clearRaw = () => bridgeResolver().andThen(
        (bridge) => fromPromise(bridge.clear(), (c) => sessionStorageFailed("Failed to clear session", c))
      );
      const getOrCreateKeypair = () => {
        if (cached) return okAsync(cached);
        return loadRaw().andThen((stored) => {
          if (stored) {
            cached = deserializeKeypair(stored.keypair);
            return okAsync(cached);
          }
          return generateDid().map((kp) => {
            cached = kp;
            return kp;
          });
        });
      };
      const persistAndBuildState = (keypair, attestations) => issueIdentityCredential({
        did: keypair.did,
        privateKey: keypair.privateKey,
        attestations
      }).andThen(
        (credential) => bridgeResolver().andThen(
          (bridge) => saveThrough(bridge, {
            keypair: serializeKeypair(keypair),
            credential
          }).map(() => ({ did: keypair.did, credential, attestations }))
        )
      );
      const createIdentity = () => generateDid().andThen((keypair) => {
        cached = keypair;
        return persistAndBuildState(keypair, []);
      });
      const addAttestation = (platform, handle) => getOrCreateKeypair().andThen(
        (keypair) => fetchAttestation(platform, handle).andThen(
          (attestation) => loadRaw().andThen((stored) => {
            const existing = stored?.credential.credential.credentialSubject.attestations ?? [];
            const deduped = [
              ...existing.filter(
                (a) => !(a.platform === platform && a.handleHash === attestation.handleHash)
              ),
              attestation
            ];
            return persistAndBuildState(keypair, deduped);
          })
        )
      );
      const removeAttestation = (platform, handleHash) => getOrCreateKeypair().andThen(
        (keypair) => loadRaw().andThen((stored) => {
          const existing = stored?.credential.credential.credentialSubject.attestations ?? [];
          const filtered = existing.filter(
            (a) => !(a.platform === platform && a.handleHash === handleHash)
          );
          return persistAndBuildState(keypair, filtered);
        })
      );
      const restoreSession = () => loadRaw().andThen((stored) => {
        if (!stored) return okAsync(null);
        return verifyCredential(stored.credential).map(() => {
          cached = deserializeKeypair(stored.keypair);
          return {
            did: stored.credential.credential.issuer,
            credential: stored.credential,
            attestations: stored.credential.credential.credentialSubject.attestations
          };
        }).orElse((verifyError) => {
          console.warn("[auth] stored credential invalid, clearing:", verifyError.message);
          cached = null;
          return clearRaw().map(() => null);
        });
      });
      const logout = () => clearRaw().map(() => {
        cached = null;
        return void 0;
      });
      const getCurrentKeypair = () => cached;
      return {
        createIdentity,
        addAttestation,
        removeAttestation,
        restoreSession,
        logout,
        getCurrentKeypair
      };
    };
    sessionRepo = createSessionRepository();
  }
});

// cli/adapters/auth-bridge.ts
import * as fs9 from "fs/promises";
import * as path11 from "path";
import * as os2 from "os";
var FORGE_DIR, AUTH_FILE, ensureDir, createFileAuthBridge, forgeDataDir;
var init_auth_bridge = __esm({
  "cli/adapters/auth-bridge.ts"() {
    "use strict";
    FORGE_DIR = path11.join(os2.homedir(), ".forge");
    AUTH_FILE = path11.join(FORGE_DIR, "auth.json");
    ensureDir = async () => {
      await fs9.mkdir(FORGE_DIR, { recursive: true });
    };
    createFileAuthBridge = () => ({
      save: async (payload) => {
        try {
          await ensureDir();
          await fs9.writeFile(AUTH_FILE, JSON.stringify(payload, null, 2), {
            encoding: "utf-8",
            mode: 384
          });
          return true;
        } catch (err2) {
          console.error("[auth] save failed:", err2);
          return false;
        }
      },
      load: async () => {
        try {
          const data = await fs9.readFile(AUTH_FILE, "utf-8");
          return JSON.parse(data);
        } catch {
          return null;
        }
      },
      clear: async () => {
        try {
          await fs9.unlink(AUTH_FILE);
          return true;
        } catch {
          return true;
        }
      }
    });
    forgeDataDir = FORGE_DIR;
  }
});

// src/lib/render/theme.ts
var ESC, RESET, fg, bgRgb, bold, dim, italic, underline, strikethrough, forgeTheme, style, agentColor;
var init_theme = __esm({
  "src/lib/render/theme.ts"() {
    "use strict";
    ESC = "\x1B[";
    RESET = `${ESC}0m`;
    fg = (code) => `${ESC}${code}m`;
    bgRgb = (r, g, b) => `${ESC}48;2;${r};${g};${b}m`;
    bold = `${ESC}1m`;
    dim = `${ESC}2m`;
    italic = `${ESC}3m`;
    underline = `${ESC}4m`;
    strikethrough = `${ESC}9m`;
    forgeTheme = {
      reset: RESET,
      bold,
      dim,
      italic,
      underline,
      strikethrough,
      text: {
        primary: fg(37),
        // white
        muted: fg(90),
        // bright black (grey)
        emphasis: fg(35),
        // magenta
        strong: fg(33),
        // yellow
        link: `${underline}${fg(34)}`,
        // blue underlined
        inlineCode: fg(32)
        // green
      },
      heading: {
        h1: `${bold}${fg(36)}`,
        // bold cyan
        h2: `${bold}${fg(37)}`,
        // bold white
        h3: `${bold}${fg(34)}`
        // bold blue
      },
      status: {
        success: fg(32),
        // green
        warning: fg(33),
        // yellow
        error: fg(31),
        // red
        info: fg(36),
        // cyan
        running: fg(32),
        // green
        idle: fg(90)
        // grey
      },
      agent: {
        ronit: fg(35),
        // magenta/pink
        yossi: fg(32),
        // green
        noa: fg(34),
        // blue
        avi: fg(33),
        // yellow/orange
        michal: fg(36),
        // cyan
        dana: fg(31),
        // red
        system: fg(90),
        // grey
        human: fg(37)
        // white
      },
      bg: {
        surface: bgRgb(22, 27, 34),
        // #161b22
        codeBlock: bgRgb(30, 30, 46),
        // dark grey-blue
        overlay: bgRgb(13, 17, 23)
        // #0d1117
      },
      border: {
        normal: fg(90),
        // grey
        accent: fg(36),
        // cyan
        muted: `${dim}${fg(90)}`
      },
      consensus: {
        agree: fg(32),
        // green
        disagree: fg(31),
        // red
        neutral: fg(33),
        // yellow
        proposal: fg(36)
        // cyan
      },
      phase: {
        label: `${bold}${fg(36)}`,
        // bold cyan
        separator: fg(90),
        // grey
        active: `${bold}${fg(33)}`,
        // bold yellow
        done: fg(32)
        // green
      },
      spinner: {
        active: fg(36),
        // cyan
        done: fg(32),
        // green
        failed: fg(31)
        // red
      },
      quote: fg(90),
      // grey
      diff: {
        added: fg(32),
        // green
        removed: fg(31),
        // red
        context: fg(90)
        // grey
      }
    };
    style = (theme, text) => `${theme}${text}${RESET}`;
    agentColor = (agentId) => forgeTheme.agent[agentId] ?? forgeTheme.text.primary;
  }
});

// src/lib/p2p/errors.ts
var bridgeUnavailable2, noActiveKeypair, signingFailed2, publishFailed, fetchFailed, deleteFailed, statusFailed, verificationFailed;
var init_errors3 = __esm({
  "src/lib/p2p/errors.ts"() {
    "use strict";
    init_core();
    bridgeUnavailable2 = makeError("BridgeUnavailable");
    noActiveKeypair = makeError("NoActiveKeypair");
    signingFailed2 = makeError("SigningFailed");
    publishFailed = makeError("PublishFailed");
    fetchFailed = makeError("FetchFailed");
    deleteFailed = makeError("DeleteFailed");
    statusFailed = makeError("StatusFailed");
    verificationFailed = makeError("VerificationFailed");
  }
});

// electron/p2p/node.js
var node_exports = {};
__export(node_exports, {
  allDocs: () => allDocs,
  deleteDoc: () => deleteDoc,
  getDoc: () => getDoc,
  getStatus: () => getStatus,
  onUpdate: () => onUpdate,
  putDoc: () => putDoc,
  startNode: () => startNode,
  stopNode: () => stopNode
});
import path12 from "path";
import fs10 from "fs/promises";
async function startNode({ dataDir: dataDir2 }) {
  storePath = path12.join(dataDir2, "store.jsonl");
  await fs10.mkdir(dataDir2, { recursive: true });
  try {
    const content = await fs10.readFile(storePath, "utf-8");
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      try {
        const doc = JSON.parse(line);
        if (doc._tombstone) {
          docs.delete(doc._id);
        } else if (doc._id) {
          docs.set(doc._id, doc);
        }
      } catch {
      }
    }
  } catch {
  }
  console.log(`[p2p] store opened: ${docs.size} docs from ${storePath}`);
  return {
    peerId: `local-${Date.now().toString(36)}`,
    dbAddress: storePath
  };
}
async function stopNode() {
  docs.clear();
  updateListeners.clear();
  storePath = null;
}
function requireStarted() {
  if (!storePath) throw new Error("Store not started");
}
async function putDoc(doc) {
  requireStarted();
  if (!doc || !doc._id) throw new Error("putDoc requires _id");
  docs.set(doc._id, doc);
  await fs10.appendFile(storePath, JSON.stringify(doc) + "\n", "utf-8");
  for (const cb of updateListeners) {
    try {
      cb({ hash: doc._id, id: doc._id, op: "PUT" });
    } catch {
    }
  }
  return { hash: doc._id, id: doc._id };
}
async function getDoc(id) {
  requireStarted();
  return docs.get(id) ?? null;
}
async function allDocs() {
  requireStarted();
  return Array.from(docs.entries()).map(([id, doc]) => ({
    hash: id,
    doc
  }));
}
async function deleteDoc(id) {
  requireStarted();
  docs.delete(id);
  await fs10.appendFile(storePath, JSON.stringify({ _id: id, _tombstone: true }) + "\n", "utf-8");
  return id;
}
async function getStatus() {
  return {
    running: !!storePath,
    peerId: storePath ? "local" : void 0,
    dbAddress: storePath ?? void 0,
    peerCount: 0,
    connectionCount: 0,
    docCount: docs.size
  };
}
function onUpdate(cb) {
  updateListeners.add(cb);
  return () => updateListeners.delete(cb);
}
var storePath, docs, updateListeners;
var init_node = __esm({
  "electron/p2p/node.js"() {
    "use strict";
    storePath = null;
    docs = /* @__PURE__ */ new Map();
    updateListeners = /* @__PURE__ */ new Set();
  }
});

// cli/adapters/p2p-direct.ts
var nodeModule, getNode, buildSigningMessage, isEnvelope, startP2P, stopP2P, getStatus2, publish, verifyEnvelope, fetchAll;
var init_p2p_direct = __esm({
  "cli/adapters/p2p-direct.ts"() {
    "use strict";
    init_core();
    init_core();
    init_did();
    init_errors3();
    nodeModule = null;
    getNode = async () => {
      if (!nodeModule) {
        nodeModule = await Promise.resolve().then(() => (init_node(), node_exports));
      }
      return nodeModule;
    };
    buildSigningMessage = (env) => canonicalize({
      _id: env._id,
      _did: env._did,
      _ts: env._ts,
      payload: env.payload
    });
    isEnvelope = (v) => {
      if (!v || typeof v !== "object") return false;
      const e = v;
      return typeof e._id === "string" && typeof e._did === "string" && typeof e._ts === "string" && typeof e._sig === "string";
    };
    startP2P = async (dataDir2) => {
      const node = await getNode();
      return node.startNode({ dataDir: dataDir2 });
    };
    stopP2P = async () => {
      if (!nodeModule) return;
      await nodeModule.stopNode();
    };
    getStatus2 = () => ResultAsync.fromPromise(
      getNode().then((n) => n.getStatus()),
      (c) => statusFailed("p2p status failed", c)
    );
    publish = (keypair, opts) => {
      if (!keypair) return errAsync(noActiveKeypair("No keypair"));
      const envelope = {
        _id: opts.id ?? crypto.randomUUID(),
        _did: keypair.did,
        _ts: (/* @__PURE__ */ new Date()).toISOString(),
        payload: opts.payload
      };
      const message = buildSigningMessage(envelope);
      return signMessage(keypair.privateKey, message).mapErr((e) => publishFailed(`Signing failed: ${e.message}`, e)).andThen(
        (sig) => ResultAsync.fromPromise(
          getNode().then((n) => n.putDoc({ ...envelope, _sig: sig })),
          (c) => publishFailed("putDoc failed", c)
        )
      );
    };
    verifyEnvelope = (raw, hash) => {
      if (!isEnvelope(raw)) {
        return errAsync(verificationFailed("Not a valid envelope shape"));
      }
      const message = buildSigningMessage(raw);
      return verifySignature(raw._did, message, raw._sig).mapErr((e) => verificationFailed(e.message, e)).map(() => ({
        id: raw._id,
        did: raw._did,
        timestamp: raw._ts,
        payload: raw.payload,
        hash
      }));
    };
    fetchAll = () => ResultAsync.fromPromise(
      getNode().then((n) => n.allDocs()),
      (c) => fetchFailed("allDocs failed", c)
    ).andThen((entries) => {
      const tasks = entries.map(({ hash, doc }) => verifyEnvelope(doc, hash));
      return ResultAsync.fromSafePromise(
        Promise.all(tasks.map((r) => r.match(
          (v) => ({ ok: true, value: v }),
          () => ({ ok: false })
        )))
      ).map(
        (results) => results.filter((r) => r.ok).map((r) => r.value)
      );
    });
  }
});

// src/lib/connections/errors.ts
var bridgeUnavailable3, embeddingFailed, indexingFailed, searchFailed, statusFailed2;
var init_errors4 = __esm({
  "src/lib/connections/errors.ts"() {
    "use strict";
    init_core();
    bridgeUnavailable3 = makeError("BridgeUnavailable");
    embeddingFailed = makeError("EmbeddingFailed");
    indexingFailed = makeError("IndexingFailed");
    searchFailed = makeError("SearchFailed");
    statusFailed2 = makeError("StatusFailed");
  }
});

// electron/connections/embeddings.js
var MODEL_ID, DIMENSIONS, pipelinePromise, pipelineInstance, loading, loadPipeline, ensureReady, embed, getStatus3, EMBEDDING_DIMENSIONS;
var init_embeddings = __esm({
  "electron/connections/embeddings.js"() {
    "use strict";
    MODEL_ID = "Xenova/all-MiniLM-L6-v2";
    DIMENSIONS = 384;
    pipelinePromise = null;
    pipelineInstance = null;
    loading = false;
    loadPipeline = async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowRemoteModels = true;
      env.allowLocalModels = true;
      return pipeline("feature-extraction", MODEL_ID, {
        // `quantized: true` would halve memory but we keep full precision for
        // better small-model quality. Revisit if bundle size becomes an issue.
        quantized: false
      });
    };
    ensureReady = async () => {
      if (pipelineInstance) return pipelineInstance;
      if (pipelinePromise) return pipelinePromise;
      loading = true;
      pipelinePromise = loadPipeline().then((p) => {
        pipelineInstance = p;
        loading = false;
        console.log("[embeddings] model loaded:", MODEL_ID);
        return p;
      }).catch((err2) => {
        loading = false;
        pipelinePromise = null;
        console.error("[embeddings] failed to load model:", err2);
        throw err2;
      });
      return pipelinePromise;
    };
    embed = async (text) => {
      const pipe = await ensureReady();
      const output = await pipe(text, { pooling: "mean", normalize: true });
      return new Float32Array(output.data);
    };
    getStatus3 = () => ({
      loaded: !!pipelineInstance,
      loading,
      model: MODEL_ID,
      dimensions: DIMENSIONS
    });
    EMBEDDING_DIMENSIONS = DIMENSIONS;
  }
});

// electron/connections/vector-index.js
import path13 from "path";
import fs11 from "fs/promises";
var Index, MetricKind, index, idMap, dataDir, indexPath, mapPath, dimensions, dirty, loadUsearch, loadIdMap, saveIdMap, load, requireOpen, addVector, hasId, removeVector, searchSimilar, size, save, close;
var init_vector_index = __esm({
  "electron/connections/vector-index.js"() {
    "use strict";
    Index = null;
    MetricKind = null;
    index = null;
    idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
    dataDir = null;
    indexPath = null;
    mapPath = null;
    dimensions = 384;
    dirty = false;
    loadUsearch = async () => {
      if (!Index) {
        const mod = await import("usearch");
        Index = mod.Index;
        MetricKind = mod.MetricKind;
      }
    };
    loadIdMap = async () => {
      try {
        const raw = await fs11.readFile(mapPath, "utf-8");
        idMap = JSON.parse(raw);
      } catch {
        idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
      }
    };
    saveIdMap = async () => {
      await fs11.writeFile(mapPath, JSON.stringify(idMap), "utf-8");
    };
    load = async ({ dir, dims = 384 }) => {
      if (index) return;
      await loadUsearch();
      dataDir = dir;
      dimensions = dims;
      indexPath = path13.join(dir, "index.usearch");
      mapPath = path13.join(dir, "id-map.json");
      await fs11.mkdir(dir, { recursive: true });
      await loadIdMap();
      index = new Index(dimensions, MetricKind.Cos);
      try {
        await fs11.access(indexPath);
        index.load(indexPath);
        console.log(`[vector-index] loaded ${index.size()} vectors from ${indexPath}`);
      } catch {
        console.log("[vector-index] starting fresh index");
      }
    };
    requireOpen = () => {
      if (!index) throw new Error("Vector index not open \u2014 call load() first");
    };
    addVector = (id, vector) => {
      requireOpen();
      if (idMap.strToNum[id] !== void 0) return;
      const numericKey = idMap.nextKey++;
      idMap.strToNum[id] = numericKey;
      idMap.numToStr[numericKey] = id;
      index.add(BigInt(numericKey), vector);
      dirty = true;
    };
    hasId = (id) => {
      requireOpen();
      return idMap.strToNum[id] !== void 0;
    };
    removeVector = (id) => {
      requireOpen();
      const numericKey = idMap.strToNum[id];
      if (numericKey === void 0) return;
      try {
        index.remove(BigInt(numericKey));
      } catch (err2) {
        console.warn("[vector-index] remove failed:", err2.message);
      }
      delete idMap.strToNum[id];
      delete idMap.numToStr[numericKey];
      dirty = true;
    };
    searchSimilar = (vector, k = 10) => {
      requireOpen();
      if (index.size() === 0) return [];
      const limit = Math.min(k, index.size());
      const matches = index.search(vector, limit, 1);
      const results = [];
      for (let i = 0; i < matches.keys.length; i++) {
        const numericKey = Number(matches.keys[i]);
        const id = idMap.numToStr[numericKey];
        if (!id) continue;
        const distance = matches.distances[i];
        const similarity = Math.max(0, 1 - distance / 2);
        results.push({ id, similarity, distance });
      }
      return results;
    };
    size = () => {
      if (!index) return 0;
      return index.size();
    };
    save = async () => {
      requireOpen();
      if (!dirty) return;
      index.save(indexPath);
      await saveIdMap();
      dirty = false;
      console.log(`[vector-index] saved ${index.size()} vectors`);
    };
    close = async () => {
      if (!index) return;
      if (dirty) await save();
      index = null;
      idMap = { nextKey: 1, strToNum: {}, numToStr: {} };
      dataDir = null;
    };
  }
});

// electron/connections/service.js
var service_exports = {};
__export(service_exports, {
  deindexContribution: () => deindexContribution,
  findSimilarByText: () => findSimilarByText,
  indexContribution: () => indexContribution,
  startService: () => startService,
  status: () => status,
  stopService: () => stopService
});
import path14 from "path";
var serviceDataDir, startService, stopService, indexContribution, deindexContribution, findSimilarByText, status;
var init_service = __esm({
  "electron/connections/service.js"() {
    "use strict";
    init_embeddings();
    init_vector_index();
    serviceDataDir = null;
    startService = async ({ dataDir: dataDir2 }) => {
      serviceDataDir = path14.join(dataDir2, "connections");
      await load({ dir: serviceDataDir, dims: EMBEDDING_DIMENSIONS });
      ensureReady().catch(
        (err2) => console.error("[connections] model warmup failed:", err2)
      );
      console.log("[connections] service started");
    };
    stopService = async () => {
      try {
        await save();
      } catch (err2) {
        console.error("[connections] save error:", err2);
      }
      try {
        await close();
      } catch (err2) {
        console.error("[connections] close error:", err2);
      }
      serviceDataDir = null;
      console.log("[connections] service stopped");
    };
    indexContribution = async (id, text) => {
      if (hasId(id)) return { skipped: true, reason: "already indexed" };
      const vector = await embed(text);
      addVector(id, vector);
      if (size() % 32 === 0) {
        await save().catch((err2) => console.error("[connections] autosave:", err2));
      }
      return { skipped: false };
    };
    deindexContribution = (id) => {
      if (!hasId(id)) return { skipped: true };
      removeVector(id);
      return { skipped: false };
    };
    findSimilarByText = async (text, k = 10, excludeId = null) => {
      const vector = await embed(text);
      const raw = searchSimilar(vector, k + (excludeId ? 1 : 0));
      return excludeId ? raw.filter((m) => m.id !== excludeId).slice(0, k) : raw.slice(0, k);
    };
    status = () => ({
      ...getStatus3(),
      indexSize: size(),
      dataDir: serviceDataDir
    });
  }
});

// cli/adapters/connections-direct.ts
var serviceModule, getService, startConnections, stopConnections, getStatus4, findSimilar;
var init_connections_direct = __esm({
  "cli/adapters/connections-direct.ts"() {
    "use strict";
    init_core();
    init_errors4();
    serviceModule = null;
    getService = async () => {
      if (!serviceModule) {
        serviceModule = await Promise.resolve().then(() => (init_service(), service_exports));
      }
      return serviceModule;
    };
    startConnections = async (dataDir2) => {
      const svc = await getService();
      await svc.startService({ dataDir: dataDir2 });
    };
    stopConnections = async () => {
      if (!serviceModule) return;
      await serviceModule.stopService();
    };
    getStatus4 = () => ResultAsync.fromPromise(
      getService().then((s) => s.status()),
      (c) => statusFailed2("connections status failed", c)
    );
    findSimilar = (text, k = 10, excludeId = null) => fromPromise(
      getService().then((s) => s.findSimilarByText(text, k, excludeId)),
      (c) => searchFailed("findSimilar failed", c)
    );
  }
});

// cli/adapters/console-capture.ts
var console_capture_exports = {};
__export(console_capture_exports, {
  captureConsoleToFile: () => captureConsoleToFile
});
import * as fs12 from "fs";
import * as path16 from "path";
function captureConsoleToFile(logDir) {
  try {
    fs12.mkdirSync(logDir, { recursive: true });
  } catch {
  }
  const logPath = path16.join(logDir, "session.log");
  const stream = fs12.createWriteStream(logPath, { flags: "a" });
  const originals = {};
  const writeLine = (level, args) => {
    try {
      const ts = (/* @__PURE__ */ new Date()).toISOString();
      const rendered = args.map((a) => {
        if (a instanceof Error) return `${a.message}
${a.stack ?? ""}`;
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }).join(" ");
      stream.write(`${ts} [${level}] ${rendered}
`);
    } catch {
    }
  };
  for (const m of METHODS) {
    originals[m] = console[m];
    console[m] = (...args) => writeLine(m, args);
  }
  return {
    logPath,
    restore: () => {
      for (const m of METHODS) {
        const orig = originals[m];
        if (orig) console[m] = orig;
      }
      try {
        stream.end();
      } catch {
      }
    }
  };
}
var METHODS;
var init_console_capture = __esm({
  "cli/adapters/console-capture.ts"() {
    "use strict";
    METHODS = ["log", "warn", "error", "info", "debug"];
  }
});

// cli/app/HeaderBar.tsx
import React from "react";
import { Box, Text } from "ink";
import { jsx, jsxs } from "react/jsx-runtime";
function HeaderBarImpl({
  projectName,
  goal,
  modeLabel,
  phases,
  currentPhaseId,
  elapsedSeconds
}) {
  const currentIdx = Math.max(0, phases.findIndex((p) => p.id === currentPhaseId));
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "yellow",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsxs(Box, { flexDirection: "row", justifyContent: "space-between", children: [
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { bold: true, color: "yellow", children: "\u2692 FORGE" }),
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: " \xB7 " }),
            /* @__PURE__ */ jsx(Text, { bold: true, color: "white", children: projectName })
          ] }),
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "mode " }),
            /* @__PURE__ */ jsx(Text, { color: "magenta", children: modeLabel }),
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: " \xB7 " }),
            /* @__PURE__ */ jsx(Text, { color: "cyan", children: fmtElapsed(elapsedSeconds) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Box, { children: [
          /* @__PURE__ */ jsx(Text, { dimColor: true, children: "\u{1F3AF} " }),
          /* @__PURE__ */ jsx(Text, { wrap: "truncate", children: goal })
        ] }),
        /* @__PURE__ */ jsx(Box, { flexDirection: "row", marginTop: 1, children: phases.map((phase, i) => {
          const isPast = i < currentIdx;
          const isCurrent = i === currentIdx;
          const node = isPast ? "\u25C6" : isCurrent ? "\u25C6" : "\u25C7";
          const nodeColor = isPast ? "green" : isCurrent ? "yellow" : "gray";
          const nameColor = isPast ? "green" : isCurrent ? "yellow" : "gray";
          const connector = i < phases.length - 1 ? isPast ? "\u2500\u2500" : "\u2508\u2508" : "";
          const connectorColor = isPast ? "green" : "gray";
          return /* @__PURE__ */ jsxs(React.Fragment, { children: [
            /* @__PURE__ */ jsxs(Box, { children: [
              /* @__PURE__ */ jsx(Text, { color: nodeColor, bold: isCurrent, children: node }),
              /* @__PURE__ */ jsxs(Text, { color: nameColor, bold: isCurrent, children: [
                " ",
                phase.name
              ] })
            ] }),
            connector && /* @__PURE__ */ jsxs(Text, { color: connectorColor, dimColor: !isPast, children: [
              " ",
              connector,
              " "
            ] })
          ] }, phase.id);
        }) })
      ]
    }
  );
}
var fmtElapsed, HeaderBar;
var init_HeaderBar = __esm({
  "cli/app/HeaderBar.tsx"() {
    "use strict";
    fmtElapsed = (s) => {
      const m = Math.floor(s / 60);
      const ss = String(s % 60).padStart(2, "0");
      return `${m}:${ss}`;
    };
    HeaderBar = React.memo(HeaderBarImpl);
  }
});

// cli/app/CouncilPanel.tsx
import { Box as Box2, Text as Text2 } from "ink";
import Spinner from "ink-spinner";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function CouncilPanel({
  agents,
  currentSpeaker
}) {
  const maxContribs = Math.max(1, ...agents.map((a) => a.contributions));
  return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "column", width: 28, children: [
    /* @__PURE__ */ jsxs2(
      Box2,
      {
        borderStyle: "round",
        borderColor: "yellow",
        paddingX: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx2(Text2, { bold: true, color: "yellow", children: "COUNCIL" }),
          /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
            agents.length,
            " archetypes in the room"
          ] })
        ]
      }
    ),
    agents.map((agent) => {
      const isSpeaking = agent.id === currentSpeaker;
      const color = agentColor(agent.id);
      const stateIcon = STATE_ICONS[agent.state] || "\u2022";
      const stance = agent.stance ? STANCE[agent.stance] : null;
      const bar2 = buildBar(agent.contributions, maxContribs);
      return /* @__PURE__ */ jsxs2(
        Box2,
        {
          flexDirection: "column",
          borderStyle: isSpeaking ? "round" : "single",
          borderColor: isSpeaking ? "cyan" : "gray",
          paddingX: 1,
          marginTop: 1,
          children: [
            /* @__PURE__ */ jsxs2(Box2, { flexDirection: "row", children: [
              isSpeaking ? /* @__PURE__ */ jsx2(Text2, { color: "cyan", children: /* @__PURE__ */ jsx2(Spinner, { type: "dots" }) }) : /* @__PURE__ */ jsx2(Text2, { children: stateIcon }),
              /* @__PURE__ */ jsx2(Text2, { children: " " }),
              /* @__PURE__ */ jsx2(Text2, { color, bold: isSpeaking, children: agent.name }),
              stance && /* @__PURE__ */ jsxs2(Text2, { color: stance.color, children: [
                " ",
                stance.label
              ] })
            ] }),
            agent.role && /* @__PURE__ */ jsx2(Text2, { dimColor: true, wrap: "truncate", children: agent.role }),
            /* @__PURE__ */ jsxs2(Box2, { children: [
              /* @__PURE__ */ jsx2(Text2, { color: isSpeaking ? "cyan" : "gray", children: bar2 }),
              /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
                " ",
                agent.contributions
              ] })
            ] })
          ]
        },
        agent.id
      );
    })
  ] });
}
var STATE_ICONS, STANCE, BAR_WIDTH, BAR_FILLED, BAR_EMPTY, buildBar;
var init_CouncilPanel = __esm({
  "cli/app/CouncilPanel.tsx"() {
    "use strict";
    init_theme();
    STATE_ICONS = {
      listening: "\u{1F442}",
      thinking: "\u{1F914}",
      speaking: "\u{1F4AC}",
      waiting: "\u23F3",
      paused: "\u23F8"
    };
    STANCE = {
      FOR: { label: "+", color: "green" },
      AGAINST: { label: "\u2212", color: "red" },
      NEUTRAL: { label: "~", color: "yellow" }
    };
    BAR_WIDTH = 8;
    BAR_FILLED = "\u2593";
    BAR_EMPTY = "\u2591";
    buildBar = (count, max) => {
      if (max === 0) return BAR_EMPTY.repeat(BAR_WIDTH);
      const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round(count / max * BAR_WIDTH)));
      return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_WIDTH - filled);
    };
  }
});

// cli/app/OrchestratorPanel.tsx
import { Box as Box3, Text as Text3 } from "ink";
import { Fragment, jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function OrchestratorPanel({
  phaseName,
  phaseIdx,
  phaseCount,
  messagesInPhase,
  phaseMaxMessages,
  currentSpeaker,
  floorQueue,
  consensusPoints,
  conflictPoints,
  requiredOutputs,
  producedOutputs,
  totalMessages
}) {
  const phaseRatio = phaseCount > 0 ? (phaseIdx + 1) / phaseCount : 0;
  const phaseMessageRatio = phaseMaxMessages > 0 ? messagesInPhase / phaseMaxMessages : 0;
  const consensusTotal = consensusPoints + conflictPoints;
  const consensusRatio = consensusTotal > 0 ? consensusPoints / consensusTotal : 0.5;
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", width: 26, children: [
    /* @__PURE__ */ jsxs3(
      Box3,
      {
        borderStyle: "round",
        borderColor: "magenta",
        paddingX: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx3(Text3, { bold: true, color: "magenta", children: "ORCHESTRATOR" }),
          /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "phase state machine" })
        ]
      }
    ),
    /* @__PURE__ */ jsxs3(
      Box3,
      {
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "PHASE" }),
          /* @__PURE__ */ jsx3(Text3, { bold: true, color: "yellow", wrap: "truncate", children: phaseName }),
          /* @__PURE__ */ jsxs3(Text3, { children: [
            /* @__PURE__ */ jsx3(Text3, { color: "yellow", children: bar(phaseRatio, BAR_WIDTH2) }),
            /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
              " ",
              phaseIdx + 1,
              "/",
              phaseCount
            ] })
          ] }),
          /* @__PURE__ */ jsxs3(Box3, { marginTop: 1, children: [
            /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "msgs " }),
            /* @__PURE__ */ jsx3(Text3, { color: phaseMessageRatio > 0.8 ? "red" : "cyan", children: messagesInPhase }),
            /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
              "/",
              phaseMaxMessages || "\u2014"
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs3(
      Box3,
      {
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "FLOOR" }),
          currentSpeaker ? /* @__PURE__ */ jsxs3(Text3, { color: "cyan", bold: true, wrap: "truncate", children: [
            "\u25B8 ",
            currentSpeaker
          ] }) : /* @__PURE__ */ jsx3(Text3, { color: "gray", children: "open" }),
          floorQueue.length > 0 && /* @__PURE__ */ jsxs3(Fragment, { children: [
            /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "queue" }),
            floorQueue.slice(0, 3).map((q, i) => /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
              i + 1,
              ". ",
              q
            ] }, q + i))
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs3(
      Box3,
      {
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "CONSENSUS" }),
          /* @__PURE__ */ jsxs3(Box3, { children: [
            /* @__PURE__ */ jsxs3(Text3, { color: "green", children: [
              "\u2713",
              consensusPoints
            ] }),
            /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: " / " }),
            /* @__PURE__ */ jsxs3(Text3, { color: "red", children: [
              "\u2717",
              conflictPoints
            ] })
          ] }),
          /* @__PURE__ */ jsx3(Text3, { children: /* @__PURE__ */ jsx3(Text3, { color: "green", children: bar(consensusRatio, BAR_WIDTH2) }) }),
          /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
            "total ",
            totalMessages,
            " msgs"
          ] })
        ]
      }
    ),
    requiredOutputs.length > 0 && /* @__PURE__ */ jsxs3(
      Box3,
      {
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
        marginTop: 1,
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
            "REQUIRED (",
            producedOutputs.size,
            "/",
            requiredOutputs.length,
            ")"
          ] }),
          requiredOutputs.map((out) => {
            const done = producedOutputs.has(out);
            return /* @__PURE__ */ jsxs3(Text3, { children: [
              /* @__PURE__ */ jsx3(Text3, { color: done ? "green" : "gray", children: done ? "\u2713" : "\u25CB" }),
              /* @__PURE__ */ jsxs3(Text3, { dimColor: !done, children: [
                " ",
                out.replace(/_/g, " ")
              ] })
            ] }, out);
          })
        ]
      }
    )
  ] });
}
var BAR_WIDTH2, bar;
var init_OrchestratorPanel = __esm({
  "cli/app/OrchestratorPanel.tsx"() {
    "use strict";
    BAR_WIDTH2 = 14;
    bar = (ratio, width) => {
      const r = Math.max(0, Math.min(1, ratio));
      const filled = Math.round(r * width);
      return "\u2593".repeat(filled) + "\u2591".repeat(width - filled);
    };
  }
});

// src/lib/render/markdown.ts
import { Lexer } from "marked";
var bold2, dim2, italic2, strikeStyle, HTML_ENTITY_MAP, decodeEntities, highlightCache, highlighter, warmHighlighter, getHighlightedSync, renderToken, renderHeading, renderCodeBlock, renderBlockquote, renderList, renderInline, renderInlineToken, renderMarkdown;
var init_markdown = __esm({
  "src/lib/render/markdown.ts"() {
    "use strict";
    init_theme();
    ({ bold: bold2, dim: dim2, italic: italic2, strikethrough: strikeStyle } = forgeTheme);
    HTML_ENTITY_MAP = {
      "&quot;": '"',
      "&apos;": "'",
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&nbsp;": " ",
      "&#39;": "'",
      "&#34;": '"'
    };
    decodeEntities = (text) => {
      if (!text || text.indexOf("&") === -1) return text;
      return text.replace(/&(?:quot|apos|amp|lt|gt|nbsp|#39|#34);/g, (m) => HTML_ENTITY_MAP[m] ?? m).replace(/&#(\d+);/g, (_, code) => {
        const n = parseInt(code, 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : _;
      }).replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const n = parseInt(hex, 16);
        return Number.isFinite(n) ? String.fromCodePoint(n) : _;
      });
    };
    highlightCache = /* @__PURE__ */ new Map();
    highlighter = null;
    warmHighlighter = async () => {
      if (highlighter) return;
      try {
        const mod = await import("@speed-highlight/core/terminal");
        highlighter = mod.highlightText;
      } catch {
      }
    };
    void warmHighlighter();
    getHighlightedSync = (code, lang) => {
      const key = `${lang}:${code}`;
      const cached = highlightCache.get(key);
      if (cached) return cached;
      if (highlighter) {
        highlighter(code, lang).then((result) => {
          highlightCache.set(key, result);
        }).catch(() => {
        });
      }
      return code;
    };
    renderToken = (token, depth) => {
      switch (token.type) {
        case "heading":
          return renderHeading(token);
        case "paragraph":
          return renderInline(token.tokens ?? []) + "\n\n";
        case "code":
          return renderCodeBlock(token);
        case "blockquote":
          return renderBlockquote(token);
        case "list":
          return renderList(token, depth);
        case "hr":
          return style(forgeTheme.border.muted, "\u2500".repeat(40)) + "\n\n";
        case "space":
          return "\n";
        case "html":
          return decodeEntities(token.text);
        default:
          if ("text" in token && typeof token.text === "string") {
            return decodeEntities(token.text) + "\n";
          }
          return "";
      }
    };
    renderHeading = (token) => {
      const themes = {
        1: forgeTheme.heading.h1,
        2: forgeTheme.heading.h2,
        3: forgeTheme.heading.h3
      };
      const themeStr = themes[token.depth] ?? forgeTheme.heading.h3;
      const prefix = "#".repeat(token.depth) + " ";
      const text = renderInline(token.tokens ?? []);
      return style(themeStr, `${prefix}${text}`) + "\n\n";
    };
    renderCodeBlock = (token) => {
      const lang = token.lang || "";
      const border = forgeTheme.border.accent;
      const top = style(border, `\u256D\u2500${lang ? ` ${lang} ` : "\u2500"}${"\u2500".repeat(Math.max(0, 36 - lang.length))}`) + "\n";
      const codeText = decodeEntities(token.text);
      const highlighted = lang ? getHighlightedSync(codeText, lang) : codeText;
      const isHighlighted = highlighted !== codeText;
      const lines = highlighted.split("\n").map(
        (line) => style(border, "\u2502 ") + (isHighlighted ? line : style(forgeTheme.text.inlineCode, line))
      ).join("\n");
      const bottom = "\n" + style(border, `\u2570${"\u2500".repeat(40)}`) + "\n\n";
      return top + lines + bottom;
    };
    renderBlockquote = (token) => {
      const inner = (token.tokens ?? []).map((t) => renderToken(t, 0)).join("");
      return inner.split("\n").map((line) => style(forgeTheme.quote, "\u2502 ") + style(forgeTheme.quote, line)).join("\n") + "\n";
    };
    renderList = (token, depth) => {
      const indent = "  ".repeat(depth);
      return token.items.map((item, i) => {
        const marker = token.ordered ? style(forgeTheme.status.info, `${i + 1}.`) : style(forgeTheme.status.info, "\u2022");
        const body = (item.tokens ?? []).map((t) => renderToken(t, depth + 1)).join("").replace(/\n\n$/, "\n");
        return `${indent}${marker} ${body}`;
      }).join("") + "\n";
    };
    renderInline = (tokens) => tokens.map(renderInlineToken).join("");
    renderInlineToken = (token) => {
      switch (token.type) {
        case "text":
          return decodeEntities(token.text);
        case "strong":
          return style(`${bold2}${forgeTheme.text.strong}`, renderInline(token.tokens ?? []));
        case "em":
          return style(`${italic2}${forgeTheme.text.emphasis}`, renderInline(token.tokens ?? []));
        case "del":
          return style(strikeStyle, renderInline(token.tokens ?? []));
        case "codespan":
          return style(forgeTheme.text.inlineCode, decodeEntities(token.text));
        case "link": {
          const link = token;
          const text = renderInline(link.tokens ?? []);
          return style(forgeTheme.text.link, text) + style(dim2, ` (${link.href})`);
        }
        case "br":
          return "\n";
        case "escape":
          return decodeEntities(token.text);
        default:
          if ("text" in token && typeof token.text === "string") {
            return decodeEntities(token.text);
          }
          return "";
      }
    };
    renderMarkdown = (markdown, _width) => {
      const tokens = Lexer.lex(markdown);
      return tokens.map((t) => renderToken(t, 0)).join("");
    };
  }
});

// src/lib/render/tool-call.ts
var TOOL_REGEX, parseToolCalls, renderToolCall, renderMessageWithToolCalls;
var init_tool_call = __esm({
  "src/lib/render/tool-call.ts"() {
    "use strict";
    init_theme();
    TOOL_REGEX = /\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/g;
    parseToolCalls = (content) => {
      const blocks = [];
      let lastIndex = 0;
      const re = new RegExp(TOOL_REGEX.source, "g");
      let match;
      while ((match = re.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const text = content.slice(lastIndex, match.index);
          if (text.length > 0) blocks.push({ kind: "text", text });
        }
        blocks.push({
          kind: "tool",
          text: match[0],
          toolName: match[1],
          toolPrompt: match[2].trim()
        });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < content.length) {
        const text = content.slice(lastIndex);
        if (text.length > 0) blocks.push({ kind: "text", text });
      }
      return blocks;
    };
    renderToolCall = (toolName, toolPrompt, status2 = "pending", resultSummary) => {
      const border = forgeTheme.border.accent;
      const label = forgeTheme.text.emphasis;
      const headerWidth = 52;
      const title = `TOOL \xB7 ${toolName}`;
      const titleLen = title.length;
      const lineFill = Math.max(0, headerWidth - titleLen - 4);
      const header = style(border, `\u256D\u2500 `) + style(`${forgeTheme.bold}${label}`, title) + style(border, ` ${"\u2500".repeat(lineFill)}`) + "\n";
      const promptLines = toolPrompt.split("\n");
      const body = promptLines.map((line) => style(border, "\u2502 ") + style(forgeTheme.text.primary, line)).join("\n");
      const statusColor = status2 === "done" ? forgeTheme.status.success : status2 === "failed" ? forgeTheme.status.error : status2 === "running" ? forgeTheme.status.info : forgeTheme.text.muted;
      const statusLabel = status2.toUpperCase();
      const statusLine = resultSummary ? `${statusLabel} \xB7 ${resultSummary}` : statusLabel;
      const footer = "\n" + style(border, "\u2570\u2500 ") + style(statusColor, statusLine) + "\n";
      return header + body + footer;
    };
    renderMessageWithToolCalls = (content, opts = {}) => {
      const { renderText = (s) => s, toolStatus = {}, toolResults = {} } = opts;
      const blocks = parseToolCalls(content);
      return blocks.map((block) => {
        if (block.kind === "text") return renderText(block.text);
        const name = block.toolName ?? "unknown";
        return renderToolCall(
          name,
          block.toolPrompt ?? "",
          toolStatus[name] ?? "pending",
          toolResults[name]
        );
      }).join("");
    };
  }
});

// cli/app/DiscussionPane.tsx
import { Box as Box4, Text as Text4 } from "ink";
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function SystemMessage({
  content
}) {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  const hasMore = lines.length > 1;
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "row", marginBottom: 0, children: [
    /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
      "\u25CE ",
      first
    ] }),
    hasMore && /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: " \u2026" })
  ] });
}
function AgentMessage({
  message,
  isCurrent
}) {
  const color = agentColor(message.agentId);
  const badge = TYPE_BADGES[message.type];
  const time = formatTime(message.timestamp);
  const body = renderMessageWithToolCalls(message.content, {
    renderText: (text) => renderMarkdown(text, 72)
  });
  return /* @__PURE__ */ jsxs4(
    Box4,
    {
      flexDirection: "column",
      marginBottom: 1,
      borderStyle: isCurrent ? "round" : void 0,
      borderColor: isCurrent ? "cyan" : void 0,
      paddingX: isCurrent ? 1 : 0,
      children: [
        /* @__PURE__ */ jsxs4(Box4, { children: [
          isCurrent && /* @__PURE__ */ jsx4(Text4, { color: "cyan", bold: true, children: "\u25CF NOW " }),
          /* @__PURE__ */ jsx4(Text4, { color, bold: true, children: message.agentId }),
          badge && /* @__PURE__ */ jsxs4(Fragment2, { children: [
            /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: " \xB7 " }),
            /* @__PURE__ */ jsxs4(Text4, { color: badge.color, children: [
              "[",
              badge.label,
              "]"
            ] })
          ] }),
          /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
            " \xB7 ",
            time
          ] })
        ] }),
        /* @__PURE__ */ jsx4(Box4, { marginLeft: isCurrent ? 0 : 2, children: /* @__PURE__ */ jsx4(Text4, { wrap: "wrap", children: body }) })
      ]
    }
  );
}
function ResearchResultMessage({
  message
}) {
  const body = renderMessageWithToolCalls(message.content, {
    renderText: (text) => renderMarkdown(text, 72)
  });
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsxs4(Box4, { children: [
      /* @__PURE__ */ jsxs4(Text4, { color: "yellow", bold: true, children: [
        "\u{1F50D} ",
        message.agentId
      ] }),
      /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: " research result" })
    ] }),
    /* @__PURE__ */ jsx4(Box4, { marginLeft: 2, children: /* @__PURE__ */ jsx4(Text4, { children: body }) })
  ] });
}
function DiscussionPane({
  messages,
  maxHeight = 22
}) {
  const visible = messages.slice(-maxHeight);
  const lastAgentIdx = (() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].agentId !== "system") return i;
    }
    return -1;
  })();
  return /* @__PURE__ */ jsxs4(
    Box4,
    {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "gray",
      paddingX: 1,
      flexGrow: 1,
      overflow: "hidden",
      children: [
        /* @__PURE__ */ jsxs4(Box4, { children: [
          /* @__PURE__ */ jsx4(Text4, { bold: true, color: "cyan", children: "DISCUSSION" }),
          /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
            " \xB7 ",
            messages.length,
            " messages"
          ] })
        ] }),
        /* @__PURE__ */ jsx4(Box4, { marginTop: 1, flexDirection: "column", children: visible.length === 0 ? /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "Waiting for the orchestrator to open the floor\u2026" }) : visible.map((msg, i) => {
          if (msg.agentId === "system") {
            return /* @__PURE__ */ jsx4(SystemMessage, { content: msg.content }, msg.id);
          }
          if (msg.type === "research_result") {
            return /* @__PURE__ */ jsx4(ResearchResultMessage, { message: msg }, msg.id);
          }
          return /* @__PURE__ */ jsx4(
            AgentMessage,
            {
              message: msg,
              isCurrent: i === lastAgentIdx
            },
            msg.id
          );
        }) })
      ]
    }
  );
}
var TYPE_BADGES, formatTime;
var init_DiscussionPane = __esm({
  "cli/app/DiscussionPane.tsx"() {
    "use strict";
    init_markdown();
    init_theme();
    init_tool_call();
    TYPE_BADGES = {
      argument: { label: "ARGUMENT", color: "red" },
      question: { label: "QUESTION", color: "cyan" },
      proposal: { label: "PROPOSAL", color: "magenta" },
      agreement: { label: "AGREEMENT", color: "green" },
      disagreement: { label: "DISAGREEMENT", color: "red" },
      synthesis: { label: "SYNTHESIS", color: "magenta" },
      research_result: { label: "RESEARCH", color: "yellow" },
      human_input: { label: "YOU", color: "cyan" }
    };
    formatTime = (date) => new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  }
});

// cli/app/InputPane.tsx
import { useState } from "react";
import { Box as Box5, Text as Text5, useInput } from "ink";
import TextInput from "ink-text-input";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function InputPane({
  onSubmit,
  onCommand,
  placeholder = "Type a message or /command...",
  disabled = false
}) {
  const [value, setValue] = useState("");
  const handleSubmit = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("/")) {
      const parts = trimmed.slice(1).split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);
      onCommand(command, args);
    } else {
      onSubmit(trimmed);
    }
    setValue("");
  };
  useInput((input, key) => {
    if (key.ctrl && input === "s") {
      onCommand("synthesize", []);
    }
    if (key.ctrl && input === "e") {
      onCommand("export", []);
    }
  });
  return /* @__PURE__ */ jsxs5(
    Box5,
    {
      borderStyle: "single",
      borderColor: "cyan",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsx5(Text5, { color: "cyan", children: "> " }),
        disabled ? /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "Waiting for agents..." }) : /* @__PURE__ */ jsx5(
          TextInput,
          {
            value,
            onChange: setValue,
            onSubmit: handleSubmit,
            placeholder
          }
        )
      ]
    }
  );
}
function CommandHelp() {
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, bold: true, children: "Session:" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /pause       Pause debate" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /resume      Resume debate" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /status      Show consensus status" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /synthesize  Move to synthesis phase" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /export      Export transcript" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /quit        Save and exit" }),
    /* @__PURE__ */ jsx5(Text5, { children: " " }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, bold: true, children: "Community (P2P):" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /community   List community contributions" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /connections  Search similar contributions" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /did         Show your DID identity" }),
    /* @__PURE__ */ jsx5(Text5, { children: " " }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, bold: true, children: "Shortcuts:" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  Ctrl+S  Quick synthesize" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  Ctrl+E  Quick export" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  ?       Toggle this help" })
  ] });
}
var init_InputPane = __esm({
  "cli/app/InputPane.tsx"() {
    "use strict";
  }
});

// cli/app/PermissionDialog.tsx
import { useEffect, useState as useState2 } from "react";
import { Box as Box6, Text as Text6, useInput as useInput2 } from "ink";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function PermissionDialog({ broker }) {
  const [pending, setPending] = useState2(null);
  useEffect(() => {
    const unsub = broker.onRequest((request2, respond) => {
      setPending({ request: request2, respond });
    });
    return () => {
      unsub();
    };
  }, [broker]);
  useInput2((input, key) => {
    if (!pending) return;
    const choose = (decision) => {
      pending.respond(decision);
      setPending(null);
    };
    if (input === "y" || input === "1" || key.return) choose("once");
    else if (input === "a" || input === "2") choose("always");
    else if (input === "n" || input === "3" || key.escape) choose("deny");
  });
  if (!pending) return null;
  const { request } = pending;
  const riskColor = RISK_COLORS[request.risk];
  const riskLabel = RISK_LABELS[request.risk];
  return /* @__PURE__ */ jsxs6(
    Box6,
    {
      flexDirection: "column",
      borderStyle: "double",
      borderColor: riskColor,
      paddingX: 2,
      paddingY: 1,
      children: [
        /* @__PURE__ */ jsx6(Text6, { bold: true, color: riskColor, children: "\u26A0  Tool Permission Request" }),
        /* @__PURE__ */ jsx6(Text6, { children: " " }),
        /* @__PURE__ */ jsxs6(Text6, { children: [
          /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "Tool: " }),
          /* @__PURE__ */ jsx6(Text6, { bold: true, children: request.toolName }),
          /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "  \xB7  Risk: " }),
          /* @__PURE__ */ jsx6(Text6, { color: riskColor, bold: true, children: riskLabel })
        ] }),
        /* @__PURE__ */ jsx6(Text6, { children: " " }),
        /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "Prompt:" }),
        /* @__PURE__ */ jsxs6(Box6, { paddingLeft: 2, flexDirection: "column", children: [
          request.toolPrompt.split("\n").slice(0, 8).map((line, i) => /* @__PURE__ */ jsx6(Text6, { children: line }, i)),
          request.toolPrompt.split("\n").length > 8 && /* @__PURE__ */ jsxs6(Text6, { dimColor: true, children: [
            "\u2026 (",
            request.toolPrompt.split("\n").length - 8,
            " more lines)"
          ] })
        ] }),
        /* @__PURE__ */ jsx6(Text6, { children: " " }),
        /* @__PURE__ */ jsxs6(Text6, { children: [
          /* @__PURE__ */ jsx6(Text6, { color: "green", children: "[y] Once" }),
          /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "  \xB7  " }),
          /* @__PURE__ */ jsx6(Text6, { color: "yellow", children: "[a] Always" }),
          /* @__PURE__ */ jsx6(Text6, { dimColor: true, children: "  \xB7  " }),
          /* @__PURE__ */ jsx6(Text6, { color: "red", children: "[n] Deny" })
        ] })
      ]
    }
  );
}
var RISK_COLORS, RISK_LABELS;
var init_PermissionDialog = __esm({
  "cli/app/PermissionDialog.tsx"() {
    "use strict";
    RISK_COLORS = {
      safe: "green",
      write: "yellow",
      execute: "magenta",
      destructive: "red"
    };
    RISK_LABELS = {
      safe: "SAFE",
      write: "WRITES FILES",
      execute: "EXECUTES COMMANDS",
      destructive: "DESTRUCTIVE"
    };
  }
});

// src/lib/render/permission.ts
import { EventEmitter } from "events";
var createPermissionBroker;
var init_permission = __esm({
  "src/lib/render/permission.ts"() {
    "use strict";
    createPermissionBroker = () => {
      const emitter = new EventEmitter();
      const pending = /* @__PURE__ */ new Map();
      const autoApproved = /* @__PURE__ */ new Set();
      const requestPermission = (req) => {
        if (autoApproved.has(req.toolName)) {
          return Promise.resolve("always");
        }
        return new Promise((resolve4) => {
          pending.set(req.id, (decision) => {
            if (decision === "always") autoApproved.add(req.toolName);
            resolve4(decision);
          });
          emitter.emit("request", req);
        });
      };
      const respond = (res) => {
        const handler = pending.get(res.id);
        if (handler) {
          pending.delete(res.id);
          handler(res.decision);
        }
      };
      const onRequest = (handler) => {
        const wrapped = (req) => {
          handler(req, (decision) => respond({ id: req.id, decision }));
        };
        emitter.on("request", wrapped);
        return () => emitter.off("request", wrapped);
      };
      return { requestPermission, respond, onRequest };
    };
  }
});

// cli/app/App.tsx
import { useState as useState3, useEffect as useEffect2, useCallback, useMemo, useRef } from "react";
import { Box as Box7, Text as Text7, useApp, useInput as useInput3 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function App({ orchestrator, persistence, session, onExit, permissionBroker }) {
  const { exit } = useApp();
  const broker = useMemo(() => permissionBroker ?? createPermissionBroker(), [permissionBroker]);
  const [messages, setMessages] = useState3([]);
  const [phase, setPhase] = useState3("initialization");
  const [currentSpeaker, setCurrentSpeaker] = useState3(null);
  const [queued, setQueued] = useState3([]);
  const [agentStates, setAgentStates] = useState3(/* @__PURE__ */ new Map());
  const [contributions, setContributions] = useState3(/* @__PURE__ */ new Map());
  const [consensusPoints, setConsensusPoints] = useState3(0);
  const [conflictPoints, setConflictPoints] = useState3(0);
  const [showHelp, setShowHelp] = useState3(false);
  const [statusMessage, setStatusMessage] = useState3(null);
  const [did, setDid] = useState3(null);
  const [peerCount, setPeerCount] = useState3(void 0);
  const [connectionsIndexSize, setConnectionsIndexSize] = useState3(void 0);
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState3(0);
  useEffect2(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1e3));
    }, 1e3);
    return () => clearInterval(t);
  }, []);
  const mode = orchestrator.getModeController().getMode();
  const modeLabel = mode.name;
  const modePhases = mode.phases.map((p) => ({ id: p.id, name: p.name || p.id }));
  const [modeProgress, setModeProgress] = useState3(
    () => orchestrator.getModeController().getProgress()
  );
  useEffect2(() => {
    authRepo.restoreSession().then((result) => {
      result.match(
        (s) => {
          if (s) setDid(s.did);
        },
        () => {
        }
      );
    });
  }, []);
  useEffect2(() => {
    const tick = async () => {
      const p2pResult = await getStatus2();
      p2pResult.match(
        (s) => {
          if (s.running) setPeerCount(s.peerCount);
        },
        () => {
        }
      );
      const connResult = await getStatus4();
      connResult.match(
        (s) => setConnectionsIndexSize(s.indexSize),
        () => {
        }
      );
    };
    tick();
    const timer = setInterval(tick, 1e4);
    return () => clearInterval(timer);
  }, []);
  const agents = session.config.enabledAgents.map((id) => {
    const agent = getAgentById(id);
    return {
      id,
      name: agent?.name || id,
      role: agent?.role,
      state: agentStates.get(id) || "listening",
      contributions: contributions.get(id) || 0
    };
  });
  useEffect2(() => {
    const unsubscribe = orchestrator.on((event) => {
      switch (event.type) {
        case "phase_change":
          setPhase(event.data.phase);
          break;
        case "agent_message":
          setMessages(orchestrator.getMessages());
          {
            const status2 = orchestrator.getConsensusStatus();
            setContributions(status2.agentParticipation);
            setConsensusPoints(status2.consensusPoints);
            setConflictPoints(status2.conflictPoints);
          }
          break;
        case "agent_typing": {
          const typingData = event.data;
          if (typingData.typing) setCurrentSpeaker(typingData.agentId);
          break;
        }
        case "floor_status": {
          const floorData = event.data;
          setCurrentSpeaker(floorData.current);
          const floorStatus = orchestrator.getFloorStatus();
          setQueued(floorStatus.queued);
          break;
        }
        case "synthesis":
          setStatusMessage("Synthesis complete");
          setTimeout(() => setStatusMessage(null), 3e3);
          break;
        case "error":
          setStatusMessage(`Error: ${event.data.message}`);
          break;
      }
      setAgentStates(new Map(orchestrator.getAgentStates()));
      setModeProgress(orchestrator.getModeController().getProgress());
    });
    orchestrator.start();
    return () => {
      unsubscribe();
    };
  }, [orchestrator]);
  const handleSubmit = useCallback(async (text) => {
    await orchestrator.addHumanMessage(text);
    setMessages(orchestrator.getMessages());
  }, [orchestrator]);
  const handleCommand = useCallback(async (command, args) => {
    switch (command.toLowerCase()) {
      case "pause":
        orchestrator.pause();
        setStatusMessage("Debate paused");
        break;
      case "resume":
        orchestrator.resume();
        setStatusMessage("Debate resumed");
        break;
      case "status":
        setStatusMessage(orchestrator.getConsensusStatus().recommendation);
        break;
      case "synthesize": {
        const force = args.includes("force");
        const result = await orchestrator.transitionToSynthesis(force);
        setStatusMessage(result.message);
        break;
      }
      case "export":
        await persistence.saveFull();
        setStatusMessage(`Exported to ${persistence.getSessionDir()}`);
        break;
      // ---- new: identity ----
      case "login":
      case "identity":
      case "did":
        if (did) {
          setStatusMessage(`DID: ${did}`);
        } else {
          setStatusMessage("No identity. Run: forge login");
        }
        break;
      // ---- new: community ----
      case "community": {
        const sub = args[0]?.toLowerCase();
        if (sub === "list" || !sub) {
          const result = await fetchAll();
          result.match(
            (docs2) => {
              const contribs = docs2.filter((d) => isContribution2(d.payload));
              if (contribs.length === 0) {
                setStatusMessage("No community contributions yet");
              } else {
                const lines = contribs.slice(0, 5).map((c) => `  [${c.payload.kind.toUpperCase()}] ${c.payload.title}`).join("\n");
                setStatusMessage(`Community (${contribs.length}):
${lines}`);
              }
            },
            (err2) => setStatusMessage(`Community error: ${err2.message}`)
          );
        } else if (sub === "publish") {
          setStatusMessage('Use CLI: forge community publish -k insight -t "Title" -d "Desc" -b "Body"');
        }
        break;
      }
      // ---- new: connections ----
      case "connections":
      case "similar": {
        const query = args.join(" ");
        if (!query) {
          setStatusMessage("Usage: /connections <search text>");
          break;
        }
        const result = await findSimilar(query, 5);
        result.match(
          (matches) => {
            if (matches.length === 0) {
              setStatusMessage("No similar contributions found");
            } else {
              const lines = matches.map((m) => `  ${(m.similarity * 100).toFixed(0)}% \u2014 ${m.id.slice(0, 12)}\u2026`).join("\n");
              setStatusMessage(`Similar:
${lines}`);
            }
          },
          (err2) => setStatusMessage(`Connections error: ${err2.message}`)
        );
        break;
      }
      case "help":
        setShowHelp(!showHelp);
        break;
      case "quit":
      case "exit":
        await persistence.saveFull();
        orchestrator.stop();
        onExit();
        exit();
        break;
      default:
        setStatusMessage(`Unknown command: ${command}`);
    }
    setTimeout(() => setStatusMessage(null), 8e3);
  }, [orchestrator, persistence, onExit, exit, showHelp, did]);
  useInput3((input, key) => {
    if (key.ctrl && input === "c") {
      handleCommand("quit", []);
    }
    if (input === "?") {
      setShowHelp(!showHelp);
    }
  });
  const currentModePhase = modeProgress.currentPhase;
  const currentPhaseIdx = Math.max(
    0,
    modePhases.findIndex((p) => p.id === currentModePhase)
  );
  const currentPhaseConfig = mode.phases[currentPhaseIdx];
  const phaseMaxMessages = currentPhaseConfig?.maxMessages ?? 0;
  const successCriteria = mode.successCriteria;
  const requiredOutputs = successCriteria?.requiredOutputs ?? [];
  return /* @__PURE__ */ jsxs7(Box7, { flexDirection: "column", height: "100%", children: [
    /* @__PURE__ */ jsx7(
      HeaderBar,
      {
        projectName: session.config.projectName,
        goal: session.config.goal,
        modeLabel,
        phases: modePhases,
        currentPhaseId: currentModePhase,
        elapsedSeconds: elapsed
      }
    ),
    /* @__PURE__ */ jsxs7(Box7, { flexDirection: "row", flexGrow: 1, marginTop: 1, children: [
      /* @__PURE__ */ jsx7(CouncilPanel, { agents, currentSpeaker }),
      /* @__PURE__ */ jsx7(Box7, { flexGrow: 1, marginX: 1, children: /* @__PURE__ */ jsx7(DiscussionPane, { messages }) }),
      /* @__PURE__ */ jsx7(
        OrchestratorPanel,
        {
          phaseName: currentPhaseConfig?.name || currentModePhase,
          phaseIdx: currentPhaseIdx,
          phaseCount: modePhases.length,
          messagesInPhase: modeProgress.messagesInPhase,
          phaseMaxMessages,
          currentSpeaker,
          floorQueue: queued,
          consensusPoints,
          conflictPoints,
          requiredOutputs,
          producedOutputs: modeProgress.outputsProduced,
          totalMessages: modeProgress.totalMessages
        }
      )
    ] }),
    statusMessage && /* @__PURE__ */ jsx7(Box7, { paddingX: 1, marginTop: 1, children: /* @__PURE__ */ jsxs7(Text7, { color: "yellow", children: [
      "\u25B8 ",
      statusMessage
    ] }) }),
    false,
    showHelp && /* @__PURE__ */ jsx7(CommandHelp, {}),
    /* @__PURE__ */ jsx7(PermissionDialog, { broker }),
    /* @__PURE__ */ jsx7(
      InputPane,
      {
        onSubmit: handleSubmit,
        onCommand: handleCommand,
        placeholder: "Type message or /help for commands..."
      }
    ),
    /* @__PURE__ */ jsx7(Box7, { paddingX: 1, children: /* @__PURE__ */ jsxs7(Text7, { dimColor: true, children: [
      "? help | /community | /connections ",
      "<query>",
      " | Ctrl+C quit"
    ] }) })
  ] });
}
var authRepo, isContribution2;
var init_App = __esm({
  "cli/app/App.tsx"() {
    "use strict";
    init_HeaderBar();
    init_CouncilPanel();
    init_OrchestratorPanel();
    init_DiscussionPane();
    init_InputPane();
    init_PermissionDialog();
    init_personas();
    init_session();
    init_auth_bridge();
    init_core();
    init_p2p_direct();
    init_connections_direct();
    init_permission();
    authRepo = createSessionRepository(
      () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
    );
    isContribution2 = (p) => !!p && typeof p === "object" && "kind" in p && "title" in p && p.kind !== "reaction";
  }
});

// cli/prompts/banner.ts
import chalk5 from "chalk";
function showBanner(savedCount) {
  console.log("");
  console.log(gold("  \u2554" + "\u2550".repeat(76) + "\u2557"));
  for (const line of PAINTING_LINES) {
    console.log(gold("  \u2551") + line + gold("\u2551"));
  }
  console.log(gold("  \u255A" + "\u2550".repeat(76) + "\u255D"));
  console.log("");
  console.log(
    amber("         \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557")
  );
  console.log(
    amber("         \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D \u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D")
  );
  console.log(
    gold("         \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2557  ")
  );
  console.log(
    darkGold("         \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  ")
  );
  console.log(
    brown("         \u2588\u2588\u2551     \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557")
  );
  console.log(
    brown("         \u255A\u2550\u255D      \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D")
  );
  console.log("");
  console.log(
    warmWhite("              The Digital Renaissance of Ideas")
  );
  console.log(
    chalk5.dim('           "Where great minds converge, renaissance begins"')
  );
  console.log("");
  if (savedCount && savedCount > 0) {
    console.log(chalk5.dim(`              ${savedCount} saved session(s) available`));
    console.log("");
  }
}
var PAINTING_LINES, gold, darkGold, amber, warmWhite, brown;
var init_banner = __esm({
  "cli/prompts/banner.ts"() {
    "use strict";
    PAINTING_LINES = [
      "\x1B[0m\x1B[38;2;52;34;21;48;2;54;41;32m\u2584\x1B[38;2;47;27;16;48;2;76;64;55m\u2584\x1B[38;2;50;34;28;48;2;84;74;68m\u2584\x1B[38;2;69;56;47;48;2;88;77;70m\u2584\x1B[38;2;79;68;60;48;2;90;78;68m\u2584\x1B[38;2;84;74;65;48;2;90;78;70m\u258C\x1B[38;2;93;81;71;48;2;89;78;69m\u2584\x1B[38;2;92;81;73;48;2;80;69;61m\u2584\x1B[48;2;81;71;62m\u2584\x1B[38;2;96;86;81;48;2;86;76;68m\u2584\x1B[38;2;104;92;88;48;2;85;74;68m\u2584\x1B[38;2;101;90;83;48;2;90;79;71m\u2584\x1B[38;2;101;89;84;48;2;95;83;77m\u2584\x1B[38;2;102;89;82;48;2;100;87;81m\u258C\x1B[38;2;103;91;85;48;2;99;88;82m\u258C\x1B[38;2;102;90;84;48;2;99;88;84m\u2584\x1B[38;2;100;88;83;48;2;97;85;79m\u258C\x1B[38;2;91;80;76;48;2;91;79;72m\u2584\x1B[38;2;89;78;75;48;2;88;75;68m\u2584\x1B[38;2;87;76;70;48;2;81;68;60m\u2584\x1B[38;2;80;67;60;48;2;71;59;50m\u2584\x1B[38;2;77;65;58;48;2;67;55;46m\u2584\x1B[38;2;76;64;56;48;2;74;61;50m\u2584\x1B[38;2;79;66;57;48;2;82;71;62m\u258C\x1B[38;2;86;74;64;48;2;82;71;60m\u258C\x1B[38;2;84;73;65;48;2;94;81;70m\u2584\x1B[38;2;92;82;74;48;2;86;76;67m\u2584\x1B[38;2;88;78;69;48;2;91;80;70m\u258C\x1B[38;2;93;81;73;48;2;96;84;76m\u258C\x1B[38;2;100;89;81;48;2;98;87;78m\u2584\x1B[38;2;98;88;79;48;2;100;90;82m\u258C\x1B[38;2;104;94;85;48;2;112;99;90m\u2584\x1B[38;2;103;91;80;48;2;98;86;76m\u2584\x1B[38;2;106;95;83;48;2;104;92;82m\u258C\x1B[38;2;102;90;80;48;2;98;85;75m\u2584\x1B[38;2;99;86;75;48;2;97;84;73m\u258C\x1B[38;2;99;87;75;48;2;104;91;78m\u2584\x1B[38;2;94;82;71;48;2;92;79;67m\u258C\x1B[38;2;97;85;72;48;2;100;87;77m\u258C\x1B[38;2;102;91;80;48;2;98;87;76m\u258C\x1B[38;2;99;88;77;48;2;94;82;71m\u2584\x1B[38;2;102;90;80;48;2;97;86;75m\u2584\x1B[38;2;104;92;81;48;2;97;86;77m\u2584\x1B[38;2;108;97;85;48;2;97;87;78m\u2584\x1B[38;2;102;90;77;48;2;104;91;78m\u258C\x1B[38;2;105;91;78;48;2;101;89;77m\u2584\x1B[38;2;109;94;80;48;2;102;87;74m\u2584\x1B[38;2;110;96;82;48;2;102;87;73m\u2584\x1B[38;2;108;94;79;48;2;95;82;67m\u2584\x1B[38;2;110;95;79;48;2;111;96;81m\u2584\x1B[38;2;112;98;84;48;2;108;92;77m\u2584\x1B[38;2;110;96;83;48;2;118;104;90m\u258C\x1B[38;2;125;112;98;48;2;117;103;91m\u2584\x1B[38;2;128;115;101;48;2;134;120;106m\u258C\x1B[38;2;136;124;111;48;2;146;131;119m\u258C\x1B[38;2;147;130;113;48;2;142;126;113m\u2584\x1B[38;2;156;141;128;48;2;136;118;104m\u2584\x1B[38;2;163;148;134;48;2;146;128;114m\u2584\x1B[38;2;167;151;137;48;2;150;132;118m\u2584\x1B[38;2;162;145;129;48;2;150;132;116m\u2584\x1B[38;2;168;149;133;48;2;151;132;117m\u2584\x1B[38;2;162;145;129;48;2;150;131;115m\u2584\x1B[38;2;162;144;129;48;2;148;130;114m\u2584\x1B[38;2;162;146;130;48;2;146;128;113m\u2584\x1B[38;2;160;143;127;48;2;145;127;113m\u2584\x1B[38;2;159;141;125;48;2;145;127;111m\u2584\x1B[38;2;159;142;127;48;2;144;126;111m\u2584\x1B[38;2;155;137;122;48;2;138;121;108m\u2584\x1B[38;2;149;131;116;48;2;138;119;106m\u2584\x1B[38;2;148;130;116;48;2;139;121;106m\u2584\x1B[38;2;145;128;115;48;2;137;118;103m\u2584\x1B[38;2;119;101;84;48;2;134;116;100m\u2584\x1B[38;2;85;64;42;48;2;127;110;96m\u2584\x1B[38;2;77;54;31;48;2;104;89;75m\u2584\x1B[38;2;71;51;29;48;2;78;60;42m\u2584\x1B[38;2;77;56;32;48;2;89;64;39m\u258C\x1B[0m",
      "\x1B[38;2;49;29;17;48;2;50;32;20m\u2584\x1B[38;2;47;27;16;48;2;44;25;15m\u258C\x1B[38;2;45;25;15;48;2;38;22;14m\u2584\x1B[38;2;42;23;15;48;2;40;22;14m\u258C\x1B[38;2;40;22;13;48;2;47;33;27m\u2584\x1B[38;2;47;29;18;48;2;77;65;56m\u2584\x1B[38;2;59;40;29;48;2;97;85;74m\u2584\x1B[38;2;79;66;56;48;2;103;91;82m\u2584\x1B[38;2;92;79;71;48;2;97;86;79m\u2584\x1B[38;2;98;85;77;48;2;98;88;82m\u2584\x1B[38;2;101;87;80;48;2;104;91;84m\u258C\x1B[38;2;107;94;88;48;2;104;92;84m\u258C\x1B[38;2;108;94;86;48;2;101;89;82m\u2584\x1B[38;2;104;91;83;48;2;104;91;85m\u2584\x1B[38;2;108;94;86;48;2;102;90;84m\u2584\x1B[38;2;96;83;74;48;2;100;88;83m\u2584\x1B[38;2;91;79;73;48;2;95;85;81m\u2584\x1B[38;2;92;81;75;48;2;94;84;82m\u2584\x1B[38;2;87;76;69;48;2;90;81;78m\u2584\x1B[38;2;87;76;70;48;2;87;78;75m\u2584\x1B[38;2;85;74;71;48;2;84;73;69m\u2584\x1B[38;2;79;68;62;48;2;85;72;67m\u2584\x1B[38;2;83;71;63;48;2;71;59;53m\u2584\x1B[38;2;73;64;56;48;2;73;62;54m\u2584\x1B[38;2;75;66;58;48;2;78;69;60m\u2584\x1B[38;2;74;64;56;48;2;82;71;63m\u2584\x1B[38;2;79;69;61;48;2;85;75;67m\u258C\x1B[38;2;92;81;71;48;2;89;79;69m\u2584\x1B[38;2;85;75;66;48;2;96;84;75m\u2584\x1B[38;2;92;83;74;48;2;99;88;78m\u2584\x1B[38;2;95;85;77;48;2;103;93;84m\u258C\x1B[38;2;107;96;85;48;2;104;93;83m\u2584\x1B[38;2;107;96;86;48;2;106;95;83m\u2584\x1B[38;2;103;92;80;48;2;94;84;74m\u258C\x1B[38;2;101;90;79m\u258C\x1B[38;2;93;80;70;48;2;101;89;79m\u2584\x1B[38;2;97;85;74;48;2;98;85;72m\u2584\x1B[38;2;94;82;70;48;2;101;86;72m\u2584\x1B[38;2;88;79;68;48;2;95;84;75m\u258C\x1B[38;2;96;83;72;48;2;104;90;78m\u2584\x1B[38;2;102;87;71;48;2;106;93;80m\u2584\x1B[38;2;105;91;78;48;2;101;88;75m\u258C\x1B[38;2;103;89;78;48;2;109;97;85m\u258C\x1B[38;2;100;86;74;48;2;104;90;78m\u2584\x1B[38;2;104;90;77;48;2;109;94;79m\u2584\x1B[38;2;97;82;69;48;2;106;91;76m\u2584\x1B[38;2;93;80;67;48;2;107;93;78m\u2584\x1B[38;2;101;86;72;48;2;107;92;78m\u258C\x1B[38;2;93;81;66;48;2;110;95;81m\u2584\x1B[38;2;96;82;69;48;2;100;88;76m\u258C\x1B[38;2;110;97;84;48;2;102;91;80m\u2584\x1B[38;2;110;97;83;48;2;116;102;87m\u258C\x1B[38;2;141;124;109;48;2;123;109;95m\u2584\x1B[38;2;148;130;114;48;2;155;138;122m\u258C\x1B[38;2;176;164;157;48;2;158;140;124m\u2584\x1B[38;2;175;164;155;48;2;172;160;151m\u258C\x1B[38;2;172;159;150;48;2;171;157;145m\u2584\x1B[38;2;176;164;152;48;2;180;166;159m\u258C\x1B[38;2;182;171;162;48;2;178;164;153m\u2584\x1B[38;2;185;174;164;48;2;174;158;141m\u2584\x1B[38;2;183;170;159;48;2;169;151;133m\u2584\x1B[38;2;185;173;165;48;2;172;158;144m\u2584\x1B[38;2;184;173;168;48;2;173;160;149m\u2584\x1B[38;2;182;172;167;48;2;175;162;154m\u2584\x1B[38;2;186;176;172;48;2;177;166;159m\u2584\x1B[38;2;183;172;165;48;2;172;159;147m\u2584\x1B[38;2;175;162;152;48;2;168;154;142m\u258C\x1B[38;2;132;117;102;48;2;163;149;137m\u2584\x1B[38;2;85;66;45;48;2;154;139;128m\u2584\x1B[38;2;78;56;32;48;2;114;99;83m\u2584\x1B[38;2;80;56;31;48;2;92;74;51m\u2584\x1B[38;2;76;51;24;48;2;85;64;37m\u2584\x1B[38;2;76;48;22;48;2;85;60;32m\u2584\x1B[38;2;72;48;22;48;2;83;57;31m\u2584\x1B[38;2;66;35;15;48;2;80;54;28m\u2584\x1B[38;2;68;46;21;48;2;91;70;42m\u2584\x1B[0m",
      "\x1B[38;2;52;32;16;48;2;59;37;20m\u258C\x1B[38;2;57;38;22;48;2;45;27;15m\u258C\x1B[38;2;45;27;14;48;2;39;20;11m\u2584\x1B[38;2;42;23;13;48;2;41;20;12m\u2584\x1B[38;2;45;26;13;48;2;46;28;15m\u2584\x1B[38;2;48;27;14;48;2;50;23;12m\u258C\x1B[38;2;51;26;15;48;2;63;35;18m\u258C\x1B[38;2;64;41;24;48;2;66;43;28m\u258C\x1B[38;2;65;42;28;48;2;71;58;48m\u258C\x1B[38;2;89;75;65;48;2;93;78;69m\u2584\x1B[38;2;95;80;72;48;2;93;79;70m\u2584\x1B[38;2;90;77;69;48;2;101;88;79m\u2584\x1B[38;2;95;81;72;48;2;102;87;77m\u2584\x1B[38;2;96;82;71;48;2;102;87;75m\u258C\x1B[38;2;103;87;74;48;2;102;87;77m\u2584\x1B[38;2;98;83;70;48;2;96;82;72m\u2584\x1B[38;2;94;79;67;48;2;94;81;71m\u2584\x1B[38;2;88;73;60;48;2;88;75;64m\u2584\x1B[38;2;92;78;66;48;2;86;73;64m\u2584\x1B[38;2;92;77;65;48;2;85;72;63m\u2584\x1B[38;2;90;77;68;48;2;87;74;65m\u258C\x1B[38;2;84;72;65;48;2;75;63;57m\u258C\x1B[38;2;70;59;52;48;2;61;51;44m\u258C\x1B[38;2;59;48;40;48;2;67;56;49m\u2584\x1B[38;2;67;55;48;48;2;79;68;59m\u2584\x1B[38;2;70;58;49;48;2;88;76;66m\u2584\x1B[38;2;78;66;56;48;2;90;80;71m\u2584\x1B[38;2;86;74;64;48;2;92;81;70m\u2584\x1B[38;2;93;79;66;48;2;94;81;69m\u2584\x1B[38;2;86;72;62;48;2;92;81;72m\u2584\x1B[38;2;86;75;65;48;2;101;89;79m\u2584\x1B[38;2;94;82;72;48;2;99;89;79m\u2584\x1B[38;2;87;77;68;48;2;101;90;80m\u2584\x1B[38;2;96;85;75;48;2;100;89;79m\u2584\x1B[38;2;89;78;68;48;2;95;83;73m\u2584\x1B[38;2;89;77;68;48;2;92;79;70m\u2584\x1B[38;2;90;77;65;48;2;92;80;69m\u2584\x1B[38;2;93;81;70;48;2;90;79;70m\u258C\x1B[38;2;98;86;75;48;2;89;80;70m\u2584\x1B[38;2;92;80;70;48;2;90;78;67m\u258C\x1B[38;2;89;75;63;48;2;99;85;72m\u2584\x1B[38;2;87;74;63;48;2;101;88;74m\u2584\x1B[38;2;87;74;61;48;2;104;90;76m\u2584\x1B[38;2;86;74;62;48;2;103;87;73m\u2584\x1B[38;2;91;75;61;48;2;106;90;77m\u2584\x1B[38;2;90;74;61;48;2;106;90;75m\u2584\x1B[38;2;82;69;57;48;2;93;79;66m\u2584\x1B[38;2;86;71;56;48;2;98;84;69m\u2584\x1B[38;2;87;71;57;48;2;95;81;68m\u2584\x1B[38;2;92;77;63;48;2;103;90;76m\u2584\x1B[38;2;101;86;73;48;2;107;92;79m\u2584\x1B[38;2;109;93;78;48;2;121;106;94m\u2584\x1B[38;2;140;125;116;48;2;134;114;99m\u2584\x1B[38;2;161;146;135;48;2;170;159;152m\u258C\x1B[38;2;176;164;157;48;2;178;166;159m\u258C\x1B[38;2;181;167;155;48;2;174;163;154m\u2584\x1B[38;2;180;166;156;48;2;173;161;153m\u2584\x1B[38;2;182;167;153;48;2;182;171;164m\u2584\x1B[38;2;184;171;163;48;2;188;177;171m\u258C\x1B[38;2;189;179;173;48;2;188;177;168m\u258C\x1B[38;2;188;177;170;48;2;190;176;166m\u2584\x1B[38;2;188;179;174;48;2;185;176;170m\u258C\x1B[38;2;187;176;170;48;2;180;170;163m\u258C\x1B[38;2;143;129;114;48;2;185;176;171m\u2584\x1B[38;2;173;159;145;48;2;182;172;167m\u2584\x1B[38;2;179;164;150;48;2;181;169;160m\u2584\x1B[38;2;176;161;147;48;2;161;146;131m\u258C\x1B[38;2;74;51;27;48;2;88;68;44m\u2584\x1B[38;2;70;46;24;48;2;77;55;32m\u2584\x1B[38;2;73;51;28;48;2;79;53;30m\u258C\x1B[38;2;75;52;30;48;2;68;47;23m\u258C\x1B[38;2;64;45;25;48;2;65;42;19m\u2584\x1B[38;2;63;40;19;48;2;68;44;21m\u2584\x1B[38;2;62;39;18;48;2;69;48;24m\u2584\x1B[38;2;67;44;24;48;2;73;49;26m\u2584\x1B[38;2;71;48;23;48;2;74;50;26m\u2584\x1B[0m",
      "\x1B[38;2;60;40;24;48;2;56;36;21m\u2584\x1B[38;2;61;41;23;48;2;58;38;22m\u258C\x1B[38;2;54;35;19;48;2;48;29;17m\u258C\x1B[38;2;48;33;22;48;2;48;29;15m\u2584\x1B[38;2;51;32;18;48;2;48;30;17m\u2584\x1B[38;2;59;38;21;48;2;56;32;18m\u2584\x1B[38;2;61;32;17;48;2;55;32;17m\u2584\x1B[38;2;67;43;24;48;2;62;35;20m\u258C\x1B[38;2;65;44;28;48;2;67;55;46m\u258C\x1B[38;2;92;79;70;48;2;87;73;64m\u2584\x1B[38;2;95;83;76;48;2;92;79;70m\u2584\x1B[38;2;96;83;75;48;2;73;59;49m\u258C\x1B[38;2;61;41;25;48;2;64;48;34m\u2584\x1B[38;2;65;45;29;48;2;80;67;58m\u2584\x1B[38;2;57;43;31;48;2;96;82;73m\u2584\x1B[38;2;76;62;50;48;2;100;86;75m\u2584\x1B[38;2;91;76;66;48;2;93;80;68m\u2584\x1B[48;2;90;76;65m\u258C\x1B[38;2;92;78;66;48;2;93;79;69m\u2584\x1B[38;2;91;77;65;48;2;88;74;63m\u258C\x1B[38;2;88;75;65;48;2;86;72;61m\u258C\x1B[38;2;85;72;61;48;2;79;67;58m\u258C\x1B[38;2;78;66;57;48;2;74;62;53m\u258C\x1B[38;2;66;55;47;48;2;60;49;42m\u258C\x1B[38;2;62;51;45;48;2;56;46;38m\u258C\x1B[38;2;46;37;31;48;2;54;44;38m\u258C\x1B[38;2;50;42;35;48;2;58;48;41m\u2584\x1B[38;2;58;48;42;48;2;65;53;45m\u2584\x1B[38;2;63;51;45;48;2;67;54;46m\u2584\x1B[38;2;60;49;41;48;2;64;53;45m\u2584\x1B[48;2;64;53;44m\u2584\x1B[38;2;59;48;39;48;2;63;51;42m\u2584\x1B[38;2;60;50;41;48;2;66;52;41m\u2584\x1B[38;2;58;49;41;48;2;68;54;43m\u2584\x1B[38;2;58;48;41;48;2;68;55;45m\u2584\x1B[38;2;61;50;43;48;2;67;55;46m\u2584\x1B[38;2;60;49;41;48;2;66;52;42m\u2584\x1B[38;2;61;52;43;48;2;69;55;46m\u2584\x1B[38;2;62;52;43;48;2;68;56;47m\u2584\x1B[38;2;55;46;39;48;2;68;57;47m\u2584\x1B[38;2;61;52;44;48;2;65;53;44m\u2584\x1B[38;2;64;54;46;48;2;69;57;47m\u2584\x1B[38;2;56;47;41;48;2;69;56;46m\u2584\x1B[38;2;58;49;43;48;2;70;57;46m\u2584\x1B[38;2;62;51;44;48;2;68;54;44m\u2584\x1B[38;2;59;49;42;48;2;62;50;40m\u2584\x1B[38;2;53;43;36;48;2;63;49;39m\u2584\x1B[38;2;55;44;36;48;2;65;51;39m\u2584\x1B[38;2;56;44;37;48;2;62;48;37m\u2584\x1B[38;2;60;48;39;48;2;66;52;40m\u2584\x1B[38;2;70;56;46;48;2;80;66;54m\u258C\x1B[38;2;109;94;80;48;2;118;103;89m\u258C\x1B[38;2;128;112;101;48;2;141;124;112m\u258C\x1B[38;2;152;138;128;48;2;163;149;141m\u258C\x1B[38;2;171;157;146;48;2;178;164;158m\u258C\x1B[38;2;176;162;151;48;2;180;167;157m\u2584\x1B[38;2;179;163;149;48;2;178;165;156m\u2584\x1B[38;2;181;165;146;48;2;184;169;157m\u258C\x1B[38;2;194;182;174;48;2;187;175;166m\u2584\x1B[38;2;162;145;130;48;2;191;181;175m\u2584\x1B[38;2;109;83;60;48;2;185;175;168m\u2584\x1B[38;2;104;76;48;48;2;145;130;116m\u2584\x1B[38;2;100;76;53;48;2;94;69;42m\u258C\x1B[38;2;102;75;46;48;2;102;80;51m\u258C\x1B[38;2;158;140;122;48;2;173;157;141m\u258C\x1B[38;2;174;159;144;48;2;172;155;137m\u258C\x1B[38;2;172;154;136;48;2;164;148;130m\u258C\x1B[38;2;84;66;40;48;2;77;57;32m\u258C\x1B[38;2;78;54;30;48;2;66;43;22m\u2584\x1B[38;2;81;59;34;48;2;71;49;27m\u2584\x1B[38;2;79;57;32;48;2;75;55;32m\u2584\x1B[38;2;71;49;26;48;2;63;43;21m\u258C\x1B[38;2;68;47;25m\u2584\x1B[38;2;72;49;26;48;2;67;43;21m\u2584\x1B[38;2;77;55;30;48;2;71;50;26m\u2584\x1B[38;2;80;58;31;48;2;76;54;29m\u2584\x1B[0m",
      "\x1B[38;2;49;21;10;48;2;51;28;15m\u2584\x1B[38;2;53;21;11;48;2;51;28;16m\u2584\x1B[38;2;57;36;26;48;2;51;27;15m\u2584\x1B[38;2;58;35;24;48;2;52;31;17m\u258C\x1B[38;2;50;29;17;48;2;55;34;21m\u2584\x1B[38;2;61;40;24;48;2;54;31;18m\u2584\x1B[38;2;48;27;17;48;2;53;27;16m\u258C\x1B[38;2;58;34;21;48;2;61;39;24m\u2584\x1B[38;2;51;31;22;48;2;52;40;31m\u258C\x1B[38;2;95;81;72;48;2;90;77;67m\u2584\x1B[38;2;93;78;70;48;2;88;75;67m\u258C\x1B[38;2;91;78;69;48;2;72;58;46m\u258C\x1B[38;2;78;54;36;48;2;65;47;31m\u2584\x1B[38;2;71;52;36;48;2;67;46;29m\u258C\x1B[38;2;79;55;34;48;2;70;48;31m\u2584\x1B[38;2;83;57;38;48;2;73;53;36m\u258C\x1B[38;2;72;57;44;48;2;90;76;63m\u258C\x1B[38;2;87;74;63;48;2;88;74;61m\u2584\x1B[38;2;68;54;40;48;2;88;72;61m\u2584\x1B[38;2;62;49;38;48;2;88;74;61m\u2584\x1B[38;2;80;67;55;48;2;89;74;63m\u2584\x1B[38;2;87;73;63;48;2;80;66;57m\u258C\x1B[38;2;85;71;59;48;2;78;64;54m\u2584\x1B[38;2;75;62;52;48;2;69;56;48m\u2584\x1B[38;2;68;55;47;48;2;64;52;45m\u258C\x1B[38;2;59;48;41;48;2;49;39;33m\u2584\x1B[38;2;59;49;41;48;2;47;39;34m\u2584\x1B[38;2;59;49;42;48;2;56;46;41m\u2584\x1B[38;2;61;50;44;48;2;61;50;42m\u258C\x1B[38;2;64;52;44;48;2;61;50;41m\u2584\x1B[38;2;65;54;46;48;2;60;49;42m\u2584\x1B[38;2;61;50;43;48;2;56;47;40m\u2584\x1B[38;2;63;52;43;48;2;58;48;40m\u2584\x1B[38;2;61;51;41;48;2;58;48;41m\u258C\x1B[38;2;61;50;42;48;2;57;46;39m\u258C\x1B[38;2;59;49;40;48;2;57;46;38m\u258C\x1B[38;2;63;50;41;48;2;57;47;38m\u2584\x1B[38;2;58;48;41;48;2;61;51;44m\u258C\x1B[38;2;58;51;44;48;2;62;53;45m\u2584\x1B[38;2;55;47;41;48;2;60;50;43m\u2584\x1B[38;2;59;51;44;48;2;61;52;46m\u2584\x1B[38;2;63;54;46;48;2;62;52;45m\u258C\x1B[38;2;59;49;42;48;2;63;53;45m\u258C\x1B[38;2;60;50;42;48;2;66;55;47m\u2584\x1B[38;2;61;50;42;48;2;65;53;44m\u2584\x1B[38;2;61;51;44;48;2;60;49;43m\u2584\x1B[38;2;57;46;40;48;2;56;46;39m\u258C\x1B[38;2;56;47;40;48;2;57;47;38m\u2584\x1B[38;2;54;44;37;48;2;56;46;38m\u2584\x1B[38;2;57;46;38;48;2;53;44;37m\u2584\x1B[38;2;61;49;38;48;2;75;60;49m\u258C\x1B[38;2;114;97;81;48;2;125;107;91m\u258C\x1B[38;2;131;113;98;48;2;142;122;106m\u258C\x1B[38;2;154;138;126;48;2;169;157;151m\u258C\x1B[38;2;175;162;156;48;2;175;164;158m\u258C\x1B[38;2;147;132;116;48;2;176;164;156m\u2584\x1B[38;2;119;95;66;48;2;177;163;153m\u2584\x1B[38;2;139;120;96;48;2;188;172;159m\u258C\x1B[38;2;189;173;158;48;2;192;176;162m\u258C\x1B[38;2;172;155;136;48;2;91;66;42m\u258C\x1B[38;2;94;64;38;48;2;99;68;42m\u2584\x1B[38;2;95;64;38;48;2;102;76;47m\u2584\x1B[38;2;96;64;36;48;2;90;63;36m\u2584\x1B[38;2;94;65;36;48;2;97;75;44m\u258C\x1B[38;2;157;140;121;48;2;173;159;145m\u258C\x1B[38;2;179;163;147;48;2;169;153;138m\u2584\x1B[38;2;175;159;145;48;2;167;153;139m\u2584\x1B[38;2;91;73;51;48;2;79;60;37m\u258C\x1B[38;2;76;57;35;48;2;79;59;36m\u258C\x1B[38;2;78;58;33;48;2;84;64;39m\u2584\x1B[38;2;70;49;26;48;2;80;60;36m\u2584\x1B[38;2;76;56;32;48;2;74;50;27m\u258C\x1B[38;2;70;44;20;48;2;72;53;29m\u2584\x1B[38;2;71;48;24;48;2;75;53;29m\u258C\x1B[38;2;73;50;25;48;2;82;56;30m\u258C\x1B[38;2;83;62;33;48;2;89;67;41m\u2584\x1B[0m",
      "\x1B[38;2;54;33;18;48;2;42;20;12m\u2584\x1B[38;2;58;34;19;48;2;52;22;12m\u2584\x1B[38;2;56;32;17;48;2;50;28;15m\u2584\x1B[38;2;54;27;17;48;2;59;32;17m\u2584\x1B[38;2;57;39;25;48;2;55;35;24m\u2584\x1B[38;2;57;36;22;48;2;50;26;16m\u2584\x1B[38;2;54;34;21;48;2;53;28;16m\u2584\x1B[38;2;46;18;12;48;2;54;23;12m\u2584\x1B[38;2;57;33;22;48;2;63;51;41m\u258C\x1B[38;2;98;80;64;48;2;97;84;73m\u2584\x1B[38;2;101;83;67;48;2;91;78;68m\u2584\x1B[38;2;98;85;72;48;2;70;55;44m\u258C\x1B[38;2;72;44;26;48;2;77;50;31m\u2584\x1B[38;2;76;48;29;48;2;77;51;33m\u258C\x1B[38;2;83;58;38;48;2;75;49;31m\u2584\x1B[38;2;71;49;32;48;2;64;46;31m\u258C\x1B[38;2;66;52;41;48;2;84;70;58m\u258C\x1B[38;2;81;68;56;48;2;81;68;58m\u258C\x1B[38;2;73;60;47;48;2;51;33;19m\u258C\x1B[38;2;47;30;18;48;2;52;31;16m\u2584\x1B[38;2;49;32;19;48;2;50;36;22m\u2584\x1B[38;2;61;47;33;48;2;78;65;55m\u258C\x1B[38;2;72;58;47;48;2;84;70;58m\u2584\x1B[38;2;66;51;37;48;2;72;59;50m\u2584\x1B[38;2;69;56;46;48;2;76;62;51m\u258C\x1B[38;2;54;43;36;48;2;57;46;39m\u2584\x1B[38;2;57;47;41;48;2;62;52;44m\u258C\x1B[38;2;66;53;44;48;2;59;48;40m\u2584\x1B[38;2;73;60;51;48;2;67;55;47m\u2584\x1B[38;2;67;55;47;48;2;71;59;50m\u258C\x1B[38;2;70;59;52;48;2;64;55;47m\u258C\x1B[38;2;66;55;49;48;2;62;53;45m\u2584\x1B[38;2;65;55;48;48;2;62;52;44m\u2584\x1B[38;2;68;59;53;48;2;63;53;45m\u2584\x1B[38;2;63;54;48;48;2;63;52;44m\u2584\x1B[38;2;58;49;44;48;2;59;50;43m\u2584\x1B[38;2;57;49;42;48;2;62;53;48m\u258C\x1B[38;2;70;60;53;48;2;61;51;45m\u2584\x1B[38;2;73;63;58;48;2;58;51;44m\u2584\x1B[38;2;73;64;59;48;2;58;51;45m\u2584\x1B[38;2;71;61;54;48;2;57;49;43m\u2584\x1B[38;2;68;56;48;48;2;61;51;44m\u2584\x1B[38;2;66;56;47;48;2;61;52;44m\u2584\x1B[38;2;69;59;51;48;2;61;52;45m\u2584\x1B[38;2;71;58;50;48;2;63;52;44m\u2584\x1B[38;2;67;56;48;48;2;59;50;43m\u2584\x1B[38;2;66;54;47m\u2584\x1B[38;2;65;53;45;48;2;59;48;41m\u2584\x1B[38;2;65;54;45;48;2;58;48;40m\u2584\x1B[38;2;69;56;47;48;2;63;51;41m\u2584\x1B[38;2;65;53;43;48;2;68;56;47m\u258C\x1B[38;2;98;82;65;48;2;119;102;88m\u2584\x1B[38;2;92;72;51;48;2;133;115;100m\u2584\x1B[38;2;134;115;96;48;2;163;144;127m\u258C\x1B[38;2;153;136;116;48;2;111;86;60m\u258C\x1B[38;2;104;76;48;48;2;107;80;52m\u2584\x1B[38;2;91;63;40;48;2;97;72;44m\u2584\x1B[38;2;107;85;59;48;2;187;169;152m\u258C\x1B[38;2;189;173;156;48;2;191;177;164m\u258C\x1B[38;2;181;168;152;48;2;95;70;43m\u258C\x1B[38;2;100;67;40;48;2;94;62;35m\u258C\x1B[38;2;94;61;34;48;2;86;54;27m\u258C\x1B[38;2;85;55;28;48;2;88;55;29m\u258C\x1B[38;2;91;61;34;48;2;93;66;38m\u258C\x1B[38;2;157;139;121;48;2;181;168;157m\u258C\x1B[38;2;183;171;160;48;2;184;173;163m\u258C\x1B[38;2;184;172;163;48;2;176;162;148m\u258C\x1B[38;2;83;67;47;48;2;77;55;32m\u258C\x1B[38;2;76;47;23;48;2;78;57;32m\u2584\x1B[38;2;79;58;34;48;2;81;54;28m\u258C\x1B[38;2;77;52;26;48;2;71;49;24m\u258C\x1B[38;2;76;52;25;48;2;70;47;23m\u2584\x1B[38;2;74;41;19;48;2;69;48;23m\u258C\x1B[38;2;71;46;22;48;2;68;46;21m\u2584\x1B[38;2;62;41;17;48;2;80;47;23m\u258C\x1B[38;2;83;58;29;48;2;87;65;35m\u258C\x1B[0m",
      "\x1B[38;2;52;33;20;48;2;51;31;19m\u258C\x1B[38;2;46;26;15;48;2;51;30;17m\u258C\x1B[38;2;53;29;17;48;2;47;24;15m\u258C\x1B[38;2;46;28;18;48;2;54;33;22m\u2584\x1B[38;2;49;29;18;48;2;47;26;17m\u258C\x1B[38;2;54;35;21;48;2;60;38;24m\u2584\x1B[38;2;58;35;21;48;2;65;42;25m\u258C\x1B[38;2;61;37;25;48;2;54;32;20m\u258C\x1B[38;2;61;41;28;48;2;55;42;30m\u258C\x1B[38;2;104;82;61;48;2;119;94;68m\u258C\x1B[38;2;121;94;68;48;2;110;78;48m\u258C\x1B[38;2;100;74;49;48;2;88;71;52m\u258C\x1B[38;2;80;51;30;48;2;66;43;25m\u258C\x1B[38;2;63;39;23;48;2;76;47;28m\u2584\x1B[38;2;69;45;26;48;2;75;49;29m\u258C\x1B[38;2;70;47;29;48;2;74;46;25m\u2584\x1B[38;2;69;53;39;48;2;83;65;49m\u258C\x1B[38;2;101;76;50;48;2;80;65;51m\u2584\x1B[38;2;80;64;49;48;2;66;46;28m\u258C\x1B[38;2;67;45;25;48;2;57;39;21m\u2584\x1B[38;2;61;39;21;48;2;62;43;26m\u258C\x1B[38;2;62;46;30;48;2;81;67;57m\u258C\x1B[38;2;87;74;62;48;2;71;59;48m\u258C\x1B[38;2;62;46;33;48;2;58;44;30m\u258C\x1B[38;2;64;48;31;48;2;67;50;34m\u258C\x1B[38;2;57;46;40;48;2;50;41;35m\u258C\x1B[38;2;54;45;39;48;2;59;49;42m\u258C\x1B[38;2;65;52;43;48;2;68;56;47m\u258C\x1B[38;2;80;66;57;48;2;77;63;53m\u2584\x1B[38;2;80;64;54;48;2;74;62;52m\u2584\x1B[38;2;81;68;59;48;2;75;63;55m\u2584\x1B[38;2;73;61;52;48;2;69;58;50m\u2584\x1B[38;2;82;69;58;48;2;72;60;52m\u2584\x1B[38;2;80;67;58;48;2;73;61;53m\u2584\x1B[38;2;80;69;61;48;2;70;60;54m\u2584\x1B[38;2;86;76;71;48;2;76;66;60m\u2584\x1B[38;2;81;70;65;48;2;78;66;59m\u2584\x1B[38;2;83;71;63;48;2;79;66;58m\u2584\x1B[38;2;89;79;73;48;2;79;69;63m\u2584\x1B[38;2;92;82;78;48;2;81;71;67m\u2584\x1B[38;2;90;80;75;48;2;80;70;65m\u2584\x1B[38;2;89;77;70;48;2;78;67;60m\u2584\x1B[38;2;80;69;64;48;2;67;57;51m\u2584\x1B[38;2;71;61;54;48;2;73;62;55m\u258C\x1B[38;2;81;68;57;48;2;73;61;52m\u2584\x1B[38;2;73;61;52;48;2;70;58;49m\u258C\x1B[38;2;75;62;52;48;2;69;57;48m\u2584\x1B[38;2;77;62;52;48;2;71;58;49m\u2584\x1B[38;2;74;60;51;48;2;71;59;51m\u2584\x1B[38;2;76;63;53;48;2;70;57;49m\u2584\x1B[38;2;78;65;55;48;2;77;63;52m\u258C\x1B[38;2;82;62;43;48;2;85;60;40m\u258C\x1B[38;2;85;62;41;48;2;97;70;46m\u258C\x1B[38;2;123;101;78;48;2;164;144;125m\u258C\x1B[38;2;158;140;120;48;2;108;83;56m\u258C\x1B[38;2;106;80;50;48;2;99;72;45m\u258C\x1B[38;2;98;71;44;48;2;94;67;41m\u258C\x1B[38;2;100;78;53;48;2;178;158;139m\u258C\x1B[38;2;188;168;147;48;2;190;176;163m\u2584\x1B[38;2;182;164;146;48;2;97;72;45m\u258C\x1B[38;2;88;59;34;48;2;105;71;42m\u2584\x1B[38;2;87;58;33;48;2;96;65;39m\u2584\x1B[38;2;84;55;31;48;2;93;64;36m\u2584\x1B[38;2;85;53;27;48;2;90;64;37m\u2584\x1B[38;2;146;126;107;48;2;178;161;143m\u258C\x1B[38;2;179;162;144;48;2;182;166;149m\u2584\x1B[38;2;177;160;142;48;2;170;153;134m\u258C\x1B[38;2;89;74;54;48;2;85;62;37m\u258C\x1B[38;2;81;54;30;48;2;88;58;31m\u2584\x1B[38;2;85;57;31;48;2;88;59;32m\u258C\x1B[38;2;76;51;27;48;2;83;58;32m\u2584\x1B[38;2;78;50;25;48;2;80;49;23m\u2584\x1B[38;2;67;46;23;48;2;78;51;26m\u2584\x1B[38;2;70;42;19;48;2;79;55;30m\u2584\x1B[38;2;73;49;24;48;2;71;47;23m\u2584\x1B[38;2;77;53;25;48;2;87;62;33m\u258C\x1B[0m",
      "\x1B[38;2;45;27;17;48;2;40;20;14m\u2584\x1B[38;2;40;20;12;48;2;41;22;14m\u2584\x1B[38;2;42;21;14;48;2;47;25;16m\u258C\x1B[38;2;50;28;17;48;2;43;22;13m\u2584\x1B[38;2;49;27;17;48;2;49;25;14m\u2584\x1B[38;2;55;30;18;48;2;59;35;19m\u258C\x1B[38;2;63;38;24;48;2;69;41;25m\u258C\x1B[38;2;65;40;26;48;2;65;40;23m\u2584\x1B[38;2;65;40;25;48;2;65;48;33m\u258C\x1B[38;2;99;77;54;48;2;101;72;43m\u258C\x1B[38;2;114;84;56;48;2;105;73;41m\u258C\x1B[38;2;101;74;47;48;2;87;68;47m\u258C\x1B[38;2;62;39;21;48;2;70;46;26m\u2584\x1B[38;2;69;43;24;48;2;72;46;27m\u2584\x1B[38;2;67;40;22;48;2;71;45;27m\u258C\x1B[38;2;66;45;27;48;2;60;38;23m\u258C\x1B[38;2;66;49;35;48;2;96;76;56m\u258C\x1B[38;2;113;87;59;48;2;107;82;55m\u2584\x1B[38;2;84;68;51;48;2;74;55;37m\u258C\x1B[38;2;74;55;36;48;2;79;59;39m\u258C\x1B[38;2;83;61;41;48;2;71;50;32m\u2584\x1B[38;2;79;60;43;48;2;97;80;63m\u258C\x1B[38;2;106;84;60;48;2;87;70;52m\u258C\x1B[38;2;72;54;40;48;2;68;51;37m\u258C\x1B[48;2;64;49;34m\u2584\x1B[38;2;72;59;48;48;2;62;50;41m\u2584\x1B[38;2;61;50;42;48;2;68;57;47m\u258C\x1B[38;2;76;62;51;48;2;70;58;48m\u2584\x1B[38;2;116;96;77;48;2;89;75;63m\u2584\x1B[38;2;147;141;139;48;2;98;85;75m\u2584\x1B[38;2;160;157;163;48;2;96;85;76m\u2584\x1B[38;2;158;156;160;48;2;94;84;77m\u2584\x1B[38;2;87;74;64;48;2;87;73;64m\u2584\x1B[38;2;89;75;63;48;2;82;68;58m\u2584\x1B[38;2;90;75;64;48;2;104;89;78m\u258C\x1B[38;2;140;131;129;48;2;102;90;82m\u2584\x1B[38;2;166;163;164;48;2;102;92;86m\u2584\x1B[38;2;165;165;172;48;2;110;98;91m\u2584\x1B[38;2;172;167;166m\u2584\x1B[38;2;171;166;163;48;2;113;101;93m\u2584\x1B[38;2;145;142;145;48;2;107;95;88m\u2584\x1B[38;2;103;89;77;48;2;92;81;72m\u258C\x1B[38;2;82;70;63;48;2;72;63;56m\u258C\x1B[38;2;65;56;49;48;2;71;63;56m\u2584\x1B[38;2;142;144;151;48;2;96;84;74m\u2584\x1B[38;2;158;162;173;48;2;99;87;76m\u2584\x1B[38;2;161;162;170;48;2;99;86;75m\u2584\x1B[38;2;113;90;67;48;2;91;75;61m\u2584\x1B[38;2;75;61;49;48;2;79;65;53m\u2584\x1B[38;2;76;59;44;48;2;83;68;57m\u2584\x1B[38;2;75;58;43;48;2;80;67;55m\u2584\x1B[38;2;80;61;39;48;2;88;65;43m\u2584\x1B[38;2;84;61;39;48;2;91;66;42m\u258C\x1B[38;2;118;97;73;48;2;169;147;122m\u258C\x1B[38;2;160;139;115;48;2;91;68;44m\u258C\x1B[38;2;101;75;48;48;2;96;70;44m\u258C\x1B[38;2;104;78;50;48;2;95;69;44m\u2584\x1B[38;2;106;83;56;48;2;173;154;134m\u258C\x1B[38;2;186;167;145;48;2;190;171;152m\u2584\x1B[38;2;189;171;147;48;2;78;58;32m\u258C\x1B[38;2;65;44;24;48;2;81;58;33m\u2584\x1B[38;2;66;47;25;48;2;84;59;33m\u2584\x1B[38;2;67;48;26;48;2;79;53;26m\u2584\x1B[38;2;67;46;23;48;2;78;53;27m\u2584\x1B[38;2;135;113;94;48;2;175;157;137m\u258C\x1B[38;2;173;155;137;48;2;179;161;141m\u2584\x1B[38;2;167;148;128;48;2;177;159;138m\u2584\x1B[38;2;89;70;49;48;2;75;49;26m\u258C\x1B[38;2;65;42;22;48;2;79;52;26m\u2584\x1B[38;2;64;44;22m\u2584\x1B[38;2;60;38;20;48;2;73;46;22m\u2584\x1B[38;2;57;33;16;48;2;72;47;22m\u2584\x1B[38;2;61;34;17;48;2;64;45;22m\u2584\x1B[38;2;62;38;17;48;2;72;45;21m\u2584\x1B[38;2;68;45;21;48;2;77;47;23m\u258C\x1B[38;2;79;52;25;48;2;86;58;32m\u258C\x1B[0m",
      "\x1B[38;2;45;30;21;48;2;36;22;15m\u2584\x1B[38;2;44;15;10;48;2;27;14;11m\u258C\x1B[38;2;34;19;13;48;2;41;22;14m\u258C\x1B[38;2;44;26;16;48;2;41;17;10m\u258C\x1B[38;2;44;23;13;48;2;42;25;15m\u2584\x1B[38;2;45;24;16;48;2;57;32;19m\u2584\x1B[38;2;61;46;27;48;2;53;29;17m\u2584\x1B[38;2;45;26;16;48;2;55;28;16m\u2584\x1B[38;2;52;32;18;48;2;62;41;25m\u2584\x1B[38;2;73;42;23;48;2;89;65;44m\u2584\x1B[38;2;89;56;32;48;2;97;63;38m\u258C\x1B[38;2;107;75;52;48;2;81;58;40m\u258C\x1B[38;2;68;47;28;48;2;53;31;17m\u2584\x1B[38;2;115;81;50;48;2;60;36;20m\u2584\x1B[38;2;117;86;59;48;2;59;37;21m\u2584\x1B[38;2;112;85;62;48;2;59;36;21m\u2584\x1B[38;2;146;111;87;48;2;87;67;48m\u2584\x1B[38;2;117;88;63;48;2;112;86;59m\u2584\x1B[38;2;90;73;56;48;2;75;53;34m\u258C\x1B[38;2;77;55;35;48;2;75;52;32m\u258C\x1B[38;2;75;51;30;48;2;77;56;37m\u2584\x1B[38;2;82;63;43;48;2;108;83;58m\u258C\x1B[38;2;124;92;60;48;2;87;67;46m\u258C\x1B[38;2;70;52;37;48;2;66;48;33m\u258C\x1B[38;2;67;49;33;48;2;72;55;40m\u2584\x1B[38;2;76;63;51;48;2;66;56;46m\u258C\x1B[38;2;73;60;50;48;2;78;65;54m\u258C\x1B[38;2;84;69;58;48;2;89;75;63m\u258C\x1B[38;2;104;88;74;48;2;133;108;84m\u258C\x1B[38;2;163;156;155;48;2;195;197;206m\u258C\x1B[38;2;198;196;200;48;2;203;203;211m\u258C\x1B[38;2;203;205;216;48;2;186;184;190m\u258C\x1B[38;2;96;81;67;48;2;89;75;63m\u258C\x1B[38;2;88;74;61;48;2;92;78;65m\u2584\x1B[38;2;96;81;69;48;2;113;97;83m\u258C\x1B[38;2;132;112;99;48;2;197;198;209m\u258C\x1B[38;2;211;206;207;48;2;194;194;202m\u2584\x1B[38;2;186;172;166;48;2;200;204;220m\u2584\x1B[38;2;133;102;79;48;2;185;181;181m\u2584\x1B[38;2;146;120;102;48;2;188;185;190m\u2584\x1B[38;2;206;205;211;48;2;165;152;149m\u258C\x1B[38;2;111;97;85;48;2;100;87;77m\u258C\x1B[38;2;85;73;63;48;2;76;65;55m\u258C\x1B[38;2;85;72;61;48;2;76;64;55m\u2584\x1B[38;2;146;125;109;48;2;157;149;144m\u2584\x1B[38;2;128;97;70;48;2;151;136;125m\u2584\x1B[38;2;118;87;55;48;2;162;149;139m\u2584\x1B[38;2;123;92;60;48;2;111;83;53m\u258C\x1B[38;2;91;71;52;48;2;120;90;67m\u258C\x1B[38;2;138;102;79;48;2;112;80;53m\u2584\x1B[38;2;116;81;54;48;2;98;68;40m\u2584\x1B[38;2;109;79;53;48;2;74;52;30m\u2584\x1B[38;2;148;109;82;48;2;72;53;35m\u2584\x1B[38;2;126;98;74;48;2;155;125;99m\u258C\x1B[38;2;149;125;102;48;2;89;67;44m\u258C\x1B[38;2;86;62;39;48;2;91;66;40m\u2584\x1B[38;2;80;57;35;48;2;95;71;45m\u2584\x1B[38;2;89;67;42;48;2;150;128;106m\u258C\x1B[38;2;138;103;67;48;2;164;139;113m\u2584\x1B[38;2;163;140;112;48;2;67;48;27m\u258C\x1B[38;2;87;60;29;48;2;69;47;23m\u2584\x1B[38;2;89;54;22;48;2;86;52;19m\u258C\x1B[38;2;92;63;37;48;2;85;56;26m\u2584\x1B[38;2;60;44;25;48;2;65;46;26m\u2584\x1B[38;2;119;98;77;48;2;137;114;91m\u2584\x1B[38;2;108;87;65;48;2;118;89;61m\u2584\x1B[38;2;106;85;63;48;2;117;96;75m\u258C\x1B[38;2;92;70;50;48;2;64;45;28m\u258C\x1B[38;2;54;36;21;48;2;57;43;23m\u258C\x1B[38;2;93;69;43;48;2;53;38;20m\u2584\x1B[38;2;102;71;41;48;2;56;38;22m\u2584\x1B[38;2;54;32;16;48;2;41;27;15m\u2584\x1B[38;2;37;20;12;48;2;44;30;17m\u258C\x1B[38;2;46;32;16;48;2;44;27;13m\u258C\x1B[38;2;50;32;15;48;2;69;41;17m\u258C\x1B[38;2;75;53;25;48;2;79;56;28m\u258C\x1B[0m",
      "\x1B[38;2;28;14;10;48;2;43;27;18m\u2584\x1B[38;2;29;14;10;48;2;35;13;9m\u2584\x1B[38;2;30;12;8;48;2;46;20;12m\u2584\x1B[38;2;39;17;11;48;2;49;23;12m\u2584\x1B[38;2;40;22;15;48;2;43;18;11m\u2584\x1B[38;2;80;77;75;48;2;48;30;18m\u2584\x1B[38;2;95;99;107;48;2;70;64;49m\u2584\x1B[38;2;63;58;40;48;2;70;56;37m\u258C\x1B[38;2;124;89;64;48;2;104;75;54m\u2584\x1B[38;2;129;90;63;48;2;115;79;56m\u2584\x1B[38;2;82;53;28;48;2;125;87;61m\u2584\x1B[38;2;99;64;39;48;2;85;58;37m\u258C\x1B[38;2;122;87;59;48;2;100;69;42m\u2584\x1B[38;2;119;84;56;48;2;118;82;50m\u2584\x1B[38;2;119;83;58;48;2;140;104;80m\u2584\x1B[38;2;81;61;45;48;2;117;89;69m\u2584\x1B[38;2;147;113;90;48;2;135;102;82m\u258C\x1B[38;2;134;104;82;48;2;114;87;65m\u258C\x1B[38;2;83;66;48;48;2;76;57;41m\u258C\x1B[38;2;118;88;66;48;2;68;44;25m\u2584\x1B[38;2;99;69;49;48;2;70;45;25m\u2584\x1B[38;2;74;55;39;48;2;101;79;59m\u258C\x1B[38;2;114;85;59;48;2;85;67;51m\u258C\x1B[38;2;86;66;51;48;2;66;50;35m\u2584\x1B[38;2;147;115;92;48;2;104;89;75m\u2584\x1B[38;2;132;104;84;48;2;108;81;62m\u258C\x1B[38;2;112;85;61;48;2;152;123;96m\u258C\x1B[38;2;156;126;101;48;2;119;89;59m\u2584\x1B[38;2;125;94;67;48;2;111;86;61m\u2584\x1B[38;2;131;117;107;48;2;141;138;139m\u258C\x1B[38;2;147;139;131;48;2;133;139;151m\u2584\x1B[38;2;148;139;130;48;2;146;148;159m\u2584\x1B[38;2;96;82;69;48;2;91;77;65m\u258C\x1B[38;2;86;73;61;48;2;89;75;63m\u258C\x1B[38;2;94;79;66;48;2;112;96;83m\u258C\x1B[38;2;125;104;88;48;2;142;141;144m\u258C\x1B[38;2;144;134;125;48;2;141;145;151m\u2584\x1B[38;2;108;84;66;48;2;128;110;97m\u2584\x1B[38;2;129;98;79;48;2;140;109;88m\u2584\x1B[38;2;118;90;75;48;2;105;82;66m\u258C\x1B[38;2;127;108;90;48;2;131;121;112m\u2584\x1B[38;2;109;92;80;48;2;102;88;77m\u258C\x1B[38;2;95;79;68;48;2;80;68;58m\u258C\x1B[38;2;137;108;90;48;2;99;81;67m\u2584\x1B[38;2;121;104;84;48;2;132;114;97m\u2584\x1B[38;2;117;93;70;48;2;137;101;72m\u2584\x1B[38;2;118;86;59;48;2;136;102;74m\u2584\x1B[38;2;127;90;61;48;2;114;81;48m\u258C\x1B[38;2;108;78;49;48;2;91;68;46m\u258C\x1B[38;2;142;111;91;48;2;97;67;46m\u2584\x1B[38;2;145;107;84;48;2;132;97;74m\u258C\x1B[38;2;148;113;90;48;2;160;124;99m\u258C\x1B[38;2;155;119;99;48;2;175;130;100m\u2584\x1B[38;2;157;109;82;48;2;165;123;93m\u2584\x1B[38;2;162;115;85;48;2;147;106;79m\u2584\x1B[38;2;119;86;60;48;2;91;68;46m\u258C\x1B[38;2;87;74;64;48;2;73;54;37m\u2584\x1B[38;2;111;114;120;48;2;102;83;65m\u2584\x1B[38;2;121;119;119;48;2;120;107;96m\u2584\x1B[38;2;129;117;104;48;2;137;112;92m\u258C\x1B[38;2;137;107;83;48;2;127;94;68m\u258C\x1B[38;2;86;67;51;48;2;125;91;62m\u2584\x1B[38;2;77;61;45;48;2;108;78;55m\u2584\x1B[38;2;124;84;40;48;2;72;50;28m\u2584\x1B[38;2;115;78;43;48;2;97;77;57m\u2584\x1B[38;2;111;86;63;48;2;100;76;52m\u258C\x1B[38;2;99;74;51;48;2;111;85;61m\u258C\x1B[38;2;96;72;52;48;2;69;51;35m\u258C\x1B[38;2;39;28;18;48;2;44;30;16m\u258C\x1B[38;2;60;39;22;48;2;96;67;39m\u258C\x1B[38;2;91;62;35;48;2;81;49;23m\u258C\x1B[38;2;94;60;33;48;2;59;36;17m\u2584\x1B[38;2;94;69;53;48;2;37;22;14m\u2584\x1B[38;2;74;52;35;48;2;47;31;15m\u2584\x1B[38;2;54;35;18;48;2;64;41;20m\u258C\x1B[38;2;71;49;23;48;2;79;54;27m\u258C\x1B[0m",
      "\x1B[38;2;38;23;16;48;2;32;17;13m\u258C\x1B[38;2;23;11;8;48;2;31;15;10m\u2584\x1B[38;2;23;15;11;48;2;29;15;11m\u2584\x1B[38;2;25;16;11;48;2;33;17;12m\u2584\x1B[38;2;38;26;18;48;2;62;63;63m\u258C\x1B[38;2;75;72;73;48;2;78;80;85m\u2584\x1B[38;2;59;58;59;48;2;80;80;83m\u2584\x1B[38;2;54;50;47;48;2;44;38;20m\u258C\x1B[38;2;39;29;14;48;2;69;50;27m\u2584\x1B[38;2;25;18;9;48;2;75;53;31m\u2584\x1B[38;2;36;27;15;48;2;52;33;20m\u258C\x1B[38;2;136;88;65;48;2;149;101;79m\u258C\x1B[38;2;157;107;85;48;2;129;93;77m\u2584\x1B[38;2;137;94;72;48;2;116;88;71m\u2584\x1B[38;2;118;85;67;48;2;94;70;52m\u258C\x1B[38;2;74;58;38;48;2;139;98;67m\u258C\x1B[38;2;136;94;60;48;2;148;113;92m\u2584\x1B[38;2;119;87;63;48;2;91;74;58m\u258C\x1B[38;2;87;75;67;48;2;44;43;33m\u2584\x1B[38;2;87;98;120;48;2;99;90;89m\u2584\x1B[38;2;89;98;120;48;2;99;95;102m\u2584\x1B[38;2;97;101;112;48;2;89;87;91m\u258C\x1B[38;2;111;81;62;48;2;82;64;50m\u2584\x1B[38;2;102;64;34;48;2;91;58;36m\u2584\x1B[38;2;86;63;37;48;2;118;84;58m\u2584\x1B[38;2;117;90;66;48;2;118;89;69m\u2584\x1B[38;2;128;107;96;48;2;114;84;60m\u2584\x1B[38;2;118;107;106;48;2;150;116;90m\u2584\x1B[38;2;141;127;120;48;2;148;118;93m\u2584\x1B[38;2;157;131;124;48;2;149;117;97m\u2584\x1B[38;2;170;136;120;48;2;145;122;106m\u2584\x1B[38;2;130;110;99;48;2;144;130;116m\u2584\x1B[38;2;94;80;70;48;2;90;76;66m\u258C\x1B[38;2;86;72;61;48;2;93;79;69m\u2584\x1B[38;2;92;78;66;48;2;108;91;77m\u258C\x1B[38;2;118;94;77;48;2;147;112;94m\u258C\x1B[38;2;167;107;84;48;2;156;115;93m\u2584\x1B[38;2;161;105;80;48;2;119;85;67m\u2584\x1B[38;2;143;92;70;48;2;159;127;107m\u2584\x1B[38;2;139;105;86;48;2;113;101;94m\u258C\x1B[38;2;114;105;98;48;2;106;100;95m\u258C\x1B[38;2;103;96;91;48;2;99;88;79m\u258C\x1B[38;2;102;80;63;48;2;132;104;88m\u2584\x1B[38;2;137;116;83;48;2;116;93;76m\u2584\x1B[38;2;130;110;83;48;2;142;120;89m\u258C\x1B[38;2;155;130;97;48;2;136;111;82m\u2584\x1B[38;2;151;122;92;48;2;164;133;104m\u258C\x1B[38;2;157;128;98;48;2;146;110;83m\u2584\x1B[38;2;143;122;99;48;2;123;99;77m\u2584\x1B[38;2;137;120;110;48;2;117;107;98m\u258C\x1B[38;2;115;91;73;48;2;93;80;73m\u2584\x1B[38;2;125;87;65;48;2;133;103;84m\u258C\x1B[38;2;141;113;97;48;2;152;108;81m\u258C\x1B[38;2;112;100;95;48;2;163;110;84m\u2584\x1B[38;2;101;97;99;48;2;139;107;92m\u2584\x1B[38;2;97;90;88;48;2;115;106;104m\u2584\x1B[38;2;93;83;76;48;2;123;114;108m\u2584\x1B[38;2;84;75;70;48;2;100;99;102m\u2584\x1B[38;2;82;77;76;48;2;95;97;102m\u2584\x1B[38;2;109;98;88;48;2;92;88;84m\u258C\x1B[38;2;86;83;83;48;2;93;84;76m\u258C\x1B[38;2;84;80;73;48;2;78;75;68m\u258C\x1B[38;2;74;73;67;48;2;68;67;60m\u2584\x1B[38;2;93;71;42;48;2;112;81;48m\u258C\x1B[38;2;109;76;45;48;2;113;76;38m\u2584\x1B[38;2;97;68;41;48;2;103;70;40m\u2584\x1B[38;2;97;68;39;48;2;97;78;47m\u258C\x1B[38;2;98;77;52;48;2;89;70;43m\u258C\x1B[38;2;108;84;61;48;2;48;32;19m\u2584\x1B[38;2;124;102;80;48;2;116;92;68m\u2584\x1B[38;2;130;107;85;48;2;99;70;45m\u2584\x1B[38;2;113;84;65;48;2;123;99;85m\u258C\x1B[38;2;138;117;108;48;2;129;109;97m\u2584\x1B[38;2;135;112;97;48;2;108;82;64m\u258C\x1B[38;2;102;75;49;48;2;80;56;35m\u2584\x1B[38;2;70;50;26;48;2;82;57;30m\u258C\x1B[0m",
      "\x1B[38;2;20;13;10;48;2;27;15;12m\u2584\x1B[38;2;19;9;6;48;2;16;8;6m\u258C\x1B[38;2;14;8;6;48;2;20;14;9m\u258C\x1B[38;2;46;38;24;48;2;34;27;15m\u2584\x1B[38;2;69;68;68;48;2;75;80;86m\u258C\x1B[38;2;39;40;42;48;2;77;77;78m\u2584\x1B[38;2;32;28;27;48;2;38;34;31m\u2584\x1B[38;2;39;33;28;48;2;33;29;25m\u2584\x1B[38;2;43;34;21;48;2;23;18;9m\u2584\x1B[38;2;54;45;28;48;2;19;15;10m\u2584\x1B[38;2;26;21;14;48;2;60;43;30m\u258C\x1B[38;2;131;87;67;48;2;153;105;85m\u258C\x1B[38;2;156;105;85;48;2;148;97;75m\u258C\x1B[38;2;105;75;48;48;2;116;81;61m\u2584\x1B[38;2;114;77;47;48;2;144;100;77m\u2584\x1B[38;2;100;71;47;48;2;139;94;54m\u258C\x1B[38;2;151;104;61;48;2;143;97;54m\u2584\x1B[38;2;113;84;52;48;2;127;91;62m\u2584\x1B[38;2;155;118;88;48;2;118;93;78m\u2584\x1B[38;2;109;100;96;48;2;82;85;94m\u258C\x1B[38;2;104;91;85;48;2;90;93;107m\u2584\x1B[38;2;118;131;143;48;2;111;116;123m\u2584\x1B[38;2;96;103;109;48;2;130;100;80m\u2584\x1B[38;2;95;87;85;48;2;116;77;51m\u2584\x1B[38;2;122;95;78;48;2;95;74;52m\u2584\x1B[38;2;94;79;53;48;2;82;69;47m\u258C\x1B[38;2;88;73;47;48;2;91;91;95m\u2584\x1B[38;2;97;88;78;48;2;110;116;131m\u2584\x1B[38;2;112;109;113;48;2;118;125;141m\u2584\x1B[38;2;161;143;140;48;2;196;166;151m\u258C\x1B[38;2;190;156;140;48;2;179;147;132m\u2584\x1B[38;2;193;160;144;48;2;167;133;118m\u2584\x1B[38;2;173;141;126;48;2;120;98;86m\u2584\x1B[38;2;104;85;75;48;2;86;72;63m\u2584\x1B[38;2;108;80;64;48;2;139;95;74m\u258C\x1B[38;2;150;92;70;48;2;153;94;73m\u258C\x1B[38;2;152;91;67;48;2;159;110;82m\u258C\x1B[38;2;148;106;83;48;2;162;111;82m\u2584\x1B[38;2;98;103;119;48;2;153;105;82m\u2584\x1B[38;2;85;89;99;48;2;100;101;107m\u2584\x1B[38;2;107;106;110;48;2;104;102;102m\u2584\x1B[38;2;108;110;118;48;2;102;102;105m\u2584\x1B[38;2;111;112;117;48;2;95;89;86m\u2584\x1B[38;2;99;94;90;48;2;102;85;66m\u2584\x1B[38;2;112;92;69;48;2;151;128;97m\u258C\x1B[38;2;157;133;100;48;2;167;141;112m\u2584\x1B[38;2;160;135;100;48;2;166;140;108m\u2584\x1B[38;2;165;138;108;48;2;164;137;106m\u258C\x1B[38;2;161;133;103;48;2;153;126;95m\u258C\x1B[38;2;144;118;89;48;2;135;111;79m\u258C\x1B[38;2;131;105;75;48;2;125;95;67m\u258C\x1B[38;2;128;95;70;48;2;136;92;60m\u2584\x1B[38;2;143;97;66;48;2;122;80;55m\u258C\x1B[38;2;115;73;49;48;2;120;77;52m\u258C\x1B[38;2;111;68;45;48;2;122;81;54m\u2584\x1B[38;2;111;69;48;48;2;119;79;56m\u2584\x1B[38;2;86;63;53;48;2;108;78;60m\u2584\x1B[38;2;85;88;90;48;2;110;92;79m\u2584\x1B[38;2;97;92;86;48;2;112;85;64m\u2584\x1B[38;2;94;82;70;48;2;95;91;86m\u258C\x1B[38;2;91;87;79;48;2;96;97;101m\u2584\x1B[38;2;90;87;82;48;2;93;93;93m\u258C\x1B[38;2;93;94;94;48;2;87;87;84m\u2584\x1B[38;2;84;83;80;48;2;96;83;64m\u258C\x1B[38;2;117;82;52;48;2;99;68;41m\u258C\x1B[38;2;91;59;33;48;2;103;71;43m\u258C\x1B[38;2;116;82;55;48;2;124;96;71m\u258C\x1B[38;2;104;90;78;48;2;105;76;55m\u2584\x1B[38;2;81;69;58;48;2;106;74;51m\u2584\x1B[38;2;82;59;39;48;2;109;90;72m\u258C\x1B[38;2;120;104;88;48;2;125;104;81m\u258C\x1B[38;2;127;107;83;48;2;118;94;71m\u2584\x1B[38;2;99;82;66;48;2;128;107;96m\u2584\x1B[38;2;100;71;56;48;2;119;94;78m\u2584\x1B[38;2;105;78;51;48;2;103;76;51m\u258C\x1B[38;2;91;64;40;48;2;80;56;34m\u258C\x1B[0m",
      "\x1B[38;2;27;18;13;48;2;20;15;11m\u258C\x1B[38;2;36;28;18;48;2;21;13;9m\u2584\x1B[38;2;45;36;21;48;2;33;25;14m\u2584\x1B[38;2;45;35;21;48;2;48;40;23m\u258C\x1B[38;2;58;53;49;48;2;65;62;59m\u2584\x1B[38;2;53;50;45;48;2;40;34;23m\u258C\x1B[38;2;64;55;35;48;2;39;32;24m\u2584\x1B[38;2;89;81;54;48;2;54;47;33m\u2584\x1B[38;2;78;67;45;48;2;56;48;35m\u2584\x1B[38;2;77;65;45;48;2;59;50;30m\u2584\x1B[38;2;66;52;35;48;2;73;57;36m\u258C\x1B[38;2;92;69;44;48;2;110;77;58m\u258C\x1B[38;2;99;79;69;48;2;134;93;72m\u2584\x1B[38;2;76;66;55;48;2;87;67;43m\u2584\x1B[38;2;95;75;54;48;2;76;63;48m\u258C\x1B[38;2;93;79;64;48;2;84;65;41m\u2584\x1B[38;2;104;78;55;48;2;141;100;61m\u2584\x1B[38;2;111;82;58;48;2;125;95;67m\u2584\x1B[38;2;118;90;71;48;2;145;108;81m\u2584\x1B[38;2;126;95;76;48;2;111;85;70m\u258C\x1B[38;2;106;79;63;48;2;102;95;91m\u258C\x1B[38;2;106;117;127;48;2;111;125;138m\u2584\x1B[38;2;90;101;111;48;2;94;98;100m\u258C\x1B[38;2;110;103;98;48;2;94;91;88m\u2584\x1B[38;2;114;89;72;48;2;121;100;86m\u2584\x1B[38;2;109;94;74;48;2;86;74;56m\u258C\x1B[38;2;106;92;76;48;2;87;73;46m\u2584\x1B[38;2;130;111;97;48;2;100;84;58m\u2584\x1B[38;2;135;108;91;48;2;108;101;95m\u2584\x1B[38;2;129;99;83;48;2;158;135;121m\u2584\x1B[38;2;155;129;112;48;2;173;140;123m\u2584\x1B[38;2;165;136;117;48;2;135;114;101m\u258C\x1B[38;2;114;101;95;48;2;137;114;101m\u258C\x1B[38;2;132;102;87;48;2;136;93;74m\u2584\x1B[38;2;134;106;91;48;2;152;101;75m\u2584\x1B[38;2;141;116;103;48;2;142;98;75m\u2584\x1B[38;2;106;98;95;48;2;114;106;106m\u258C\x1B[38;2;118;110;110;48;2;94;96;106m\u2584\x1B[38;2;133;127;126;48;2;96;96;101m\u2584\x1B[38;2;126;120;119;48;2;100;99;102m\u2584\x1B[38;2;135;126;123;48;2;100;100;106m\u2584\x1B[38;2;129;109;97;48;2;97;100;108m\u2584\x1B[38;2;153;132;120;48;2;117;104;101m\u2584\x1B[38;2;157;122;104;48;2;133;116;107m\u2584\x1B[38;2;122;102;88;48;2;154;137;114m\u258C\x1B[38;2;165;146;133;48;2;143;123;92m\u2584\x1B[38;2;143;130;119;48;2;138;117;85m\u2584\x1B[38;2;155;138;122;48;2;150;125;93m\u2584\x1B[38;2;153;128;107;48;2;146;121;90m\u2584\x1B[38;2;136;121;110;48;2;129;107;79m\u2584\x1B[38;2;127;111;99;48;2;134;100;75m\u2584\x1B[38;2;150;124;105;48;2;122;85;59m\u2584\x1B[38;2;131;100;83;48;2;130;88;62m\u2584\x1B[38;2;132;108;91;48;2;119;75;51m\u2584\x1B[38;2;129;116;108;48;2;123;73;51m\u2584\x1B[38;2;110;91;74;48;2;120;77;54m\u2584\x1B[38;2;118;90;64;48;2;105;69;51m\u2584\x1B[38;2;120;94;70;48;2;90;84;80m\u2584\x1B[38;2;105;87;70;48;2;101;99;97m\u2584\x1B[38;2;98;89;82;48;2;106;101;95m\u2584\x1B[38;2;130;116;107;48;2;103;93;81m\u2584\x1B[38;2;129;114;105;48;2;96;91;88m\u2584\x1B[38;2;122;107;95;48;2;102;101;97m\u2584\x1B[38;2;122;98;83;48;2;95;83;68m\u2584\x1B[38;2;113;91;76;48;2;107;73;44m\u2584\x1B[38;2;110;83;60;48;2;114;77;39m\u2584\x1B[38;2;107;77;46;48;2;96;78;54m\u258C\x1B[38;2;111;95;80;48;2;101;81;62m\u2584\x1B[38;2;106;87;73;48;2;92;71;57m\u2584\x1B[38;2;105;86;71;48;2;82;72;63m\u2584\x1B[38;2;94;78;66;48;2;78;67;55m\u2584\x1B[38;2;90;78;67;48;2;89;74;60m\u2584\x1B[38;2;89;76;66;48;2;63;53;46m\u2584\x1B[38;2;103;74;48;48;2;92;61;50m\u2584\x1B[38;2;100;72;46;48;2;102;74;46m\u258C\x1B[38;2;110;79;51;48;2;104;73;46m\u2584\x1B[0m",
      "\x1B[38;2;40;29;19;48;2;35;26;19m\u258C\x1B[38;2;45;35;23;48;2;57;45;29m\u258C\x1B[38;2;42;33;23;48;2;51;40;24m\u2584\x1B[38;2;50;41;26;48;2;34;30;19m\u2584\x1B[38;2;53;43;32;48;2;84;62;47m\u258C\x1B[38;2;96;72;58;48;2;85;62;41m\u2584\x1B[38;2;102;85;74;48;2;96;83;58m\u2584\x1B[38;2;107;90;72;48;2;94;85;72m\u258C\x1B[38;2;97;91;91;48;2;104;95;75m\u2584\x1B[38;2;108;100;98;48;2;97;82;65m\u2584\x1B[38;2;104;97;97;48;2;95;81;71m\u2584\x1B[38;2;107;103;104;48;2;97;84;77m\u2584\x1B[38;2;97;93;96;48;2;97;86;82m\u2584\x1B[38;2;105;99;101;48;2;107;96;91m\u2584\x1B[38;2;121;113;115;48;2;121;110;106m\u2584\x1B[38;2;128;116;113;48;2;137;105;83m\u2584\x1B[38;2;136;126;125;48;2;103;92;85m\u2584\x1B[38;2;147;137;133;48;2;93;82;74m\u2584\x1B[38;2;156;144;140;48;2;96;85;80m\u2584\x1B[38;2;159;148;144;48;2;110;101;95m\u2584\x1B[38;2;149;138;134;48;2;127;110;100m\u2584\x1B[38;2;165;155;151;48;2;110;108;109m\u2584\x1B[38;2;173;163;161;48;2;120;120;122m\u2584\x1B[38;2;179;171;169;48;2;143;136;133m\u2584\x1B[38;2;179;171;170;48;2;132;117;105m\u2584\x1B[38;2;177;170;169;48;2;122;109;104m\u2584\x1B[38;2;180;171;169;48;2;149;139;135m\u2584\x1B[38;2;177;167;164;48;2;161;143;134m\u2584\x1B[38;2;177;167;161;48;2;162;145;133m\u2584\x1B[38;2;179;165;157;48;2;155;132;115m\u2584\x1B[38;2;185;173;164;48;2;132;120;115m\u2584\x1B[38;2;192;180;175;48;2;145;125;114m\u2584\x1B[38;2;188;178;173;48;2;159;138;127m\u2584\x1B[38;2;185;174;170;48;2;182;165;152m\u2584\x1B[38;2;189;177;171;48;2;178;158;142m\u2584\x1B[38;2;190;178;173;48;2;170;141;121m\u2584\x1B[38;2;193;183;178;48;2;158;144;134m\u2584\x1B[38;2;193;180;171;48;2;164;153;147m\u2584\x1B[38;2;191;177;167;48;2;172;160;153m\u2584\x1B[38;2;192;179;169;48;2;169;155;146m\u2584\x1B[38;2;191;177;165;48;2;160;145;133m\u2584\x1B[38;2;188;172;160;48;2;177;150;134m\u2584\x1B[38;2;183;162;151;48;2;194;180;170m\u258C\x1B[38;2;196;183;175;48;2;190;175;167m\u258C\x1B[38;2;192;178;169;48;2;185;162;147m\u2584\x1B[38;2;189;174;163;48;2;181;156;139m\u2584\x1B[38;2;183;171;162;48;2;180;153;138m\u2584\x1B[38;2;189;175;166;48;2;187;173;164m\u258C\x1B[38;2;191;177;169;48;2;183;168;157m\u258C\x1B[38;2;182;168;157;48;2;190;176;164m\u2584\x1B[38;2;183;169;160;48;2;178;158;143m\u258C\x1B[38;2;173;159;148;48;2;160;128;101m\u2584\x1B[38;2;175;161;151;48;2;168;149;135m\u2584\x1B[38;2;174;163;154;48;2;181;168;158m\u2584\x1B[38;2;170;158;152;48;2;178;166;158m\u2584\x1B[38;2;170;158;149;48;2;160;144;131m\u258C\x1B[38;2;167;156;146;48;2;146;127;111m\u2584\x1B[38;2;165;154;144;48;2;149;136;124m\u2584\x1B[38;2;164;149;137;48;2;137;120;108m\u2584\x1B[38;2;158;143;131;48;2;126;98;76m\u2584\x1B[38;2;143;129;116;48;2;157;144;133m\u258C\x1B[38;2;159;145;135;48;2;161;148;138m\u2584\x1B[38;2;151;137;128;48;2;156;146;141m\u2584\x1B[38;2;134;126;119;48;2;138;130;126m\u2584\x1B[38;2;131;123;119;48;2;142;130;121m\u258C\x1B[38;2;138;125;116;48;2;136;116;99m\u258C\x1B[38;2;132;122;114;48;2;117;98;83m\u2584\x1B[38;2;136;128;123;48;2;117;104;96m\u2584\x1B[38;2;138;125;116;48;2;112;97;83m\u2584\x1B[38;2;136;124;116;48;2;130;113;99m\u2584\x1B[38;2;139;126;115;48;2;126;107;94m\u2584\x1B[38;2;133;118;107;48;2;132;113;100m\u2584\x1B[38;2;120;104;92;48;2;106;89;76m\u2584\x1B[38;2;91;69;49;48;2;102;72;48m\u258C\x1B[38;2;96;68;42;48;2;104;73;48m\u258C\x1B[38;2;112;80;51;48;2;116;84;55m\u258C\x1B[0m",
      "\x1B[38;2;48;38;29;48;2;44;33;23m\u2584\x1B[38;2;59;39;19;48;2;66;45;23m\u2584\x1B[38;2;65;42;19;48;2;63;46;26m\u258C\x1B[38;2;62;51;36;48;2;55;45;31m\u2584\x1B[38;2;72;64;59;48;2;83;75;70m\u258C\x1B[38;2;96;89;86;48;2;91;82;78m\u2584\x1B[38;2;94;87;86;48;2;96;87;83m\u2584\x1B[38;2;94;87;85;48;2;95;88;86m\u2584\x1B[38;2;103;94;94;48;2;107;101;101m\u258C\x1B[38;2;111;105;104;48;2;106;101;100m\u258C\x1B[38;2;98;92;93;48;2;103;97;98m\u258C\x1B[38;2;110;105;106;48;2;103;98;98m\u2584\x1B[38;2;111;105;108;48;2;103;99;101m\u2584\x1B[38;2;117;110;112;48;2;106;102;106m\u2584\x1B[38;2;126;117;119;48;2;119;111;113m\u2584\x1B[38;2;131;124;124;48;2;136;127;127m\u258C\x1B[38;2;133;125;126;48;2;135;127;130m\u258C\x1B[38;2;139;132;132;48;2;142;134;136m\u258C\x1B[38;2;144;137;138;48;2;150;140;141m\u2584\x1B[38;2;148;140;139;48;2;153;144;142m\u2584\x1B[38;2;150;141;140;48;2;159;150;149m\u258C\x1B[38;2;167;159;157;48;2;167;156;154m\u2584\x1B[38;2;167;162;166;48;2;170;160;158m\u2584\x1B[38;2;171;164;165;48;2;172;164;163m\u2584\x1B[38;2;172;164;164;48;2;177;170;169m\u258C\x1B[38;2;175;167;166;48;2;178;170;170m\u2584\x1B[38;2;183;174;170;48;2;179;172;174m\u258C\x1B[38;2;178;172;175;48;2;178;170;170m\u2584\x1B[38;2;179;172;172;48;2;181;173;169m\u258C\x1B[38;2;185;176;174;48;2;187;180;179m\u258C\x1B[38;2;198;189;187;48;2;193;185;183m\u2584\x1B[38;2;207;197;193;48;2;191;185;184m\u2584\x1B[38;2;212;202;200;48;2;195;188;185m\u2584\x1B[38;2;211;203;200;48;2;197;189;186m\u2584\x1B[38;2;212;206;206;48;2;200;191;188m\u2584\x1B[38;2;216;210;211;48;2;202;195;194m\u2584\x1B[38;2;219;212;211;48;2;201;191;188m\u2584\x1B[38;2;222;213;213;48;2;204;192;187m\u2584\x1B[38;2;220;212;210;48;2;203;192;187m\u2584\x1B[38;2;215;203;198;48;2;198;186;180m\u2584\x1B[38;2;210;201;197;48;2;196;183;176m\u2584\x1B[38;2;209;200;196;48;2;191;179;172m\u2584\x1B[38;2;210;201;197;48;2;192;182;176m\u2584\x1B[38;2;211;202;201;48;2;196;185;180m\u2584\x1B[38;2;211;203;203;48;2;198;186;181m\u2584\x1B[38;2;211;205;205;48;2;194;183;175m\u2584\x1B[38;2;212;205;205;48;2;187;175;168m\u2584\x1B[38;2;203;195;193;48;2;187;174;166m\u2584\x1B[38;2;190;178;171;48;2;179;168;162m\u258C\x1B[38;2;180;171;166;48;2;179;168;163m\u2584\x1B[38;2;178;168;160;48;2;174;163;157m\u258C\x1B[38;2;171;162;156;48;2;172;163;158m\u2584\x1B[38;2;177;167;161;48;2;174;164;158m\u2584\x1B[38;2;175;166;163;48;2;175;165;161m\u258C\x1B[38;2;168;158;155;48;2;171;160;155m\u2584\x1B[38;2;162;153;146;48;2;164;151;143m\u258C\x1B[38;2;160;147;135;48;2;162;150;139m\u2584\x1B[38;2;162;150;137;48;2;166;153;143m\u258C\x1B[38;2;165;153;141;48;2;165;149;134m\u2584\x1B[38;2;163;150;139;48;2;157;143;132m\u258C\x1B[38;2;152;139;128;48;2;156;144;134m\u2584\x1B[38;2;151;140;131;48;2;154;143;135m\u2584\x1B[38;2;142;129;119;48;2;151;139;128m\u2584\x1B[38;2;136;126;117;48;2;148;134;122m\u258C\x1B[38;2;143;131;121;48;2;149;140;132m\u258C\x1B[38;2;134;125;118;48;2;129;119;110m\u258C\x1B[38;2;133;123;113;48;2;140;132;124m\u258C\x1B[38;2;136;128;124;48;2;145;135;128m\u258C\x1B[38;2;134;123;113;48;2;137;128;119m\u258C\x1B[38;2;131;122;116;48;2;135;124;116m\u258C\x1B[38;2;137;124;114;48;2;138;124;115m\u2584\x1B[38;2;136;123;113;48;2;130;116;104m\u2584\x1B[38;2;132;116;102;48;2;124;109;97m\u2584\x1B[38;2;104;88;76;48;2;97;69;46m\u258C\x1B[38;2;115;86;62;48;2;104;74;49m\u2584\x1B[38;2;122;92;68;48;2;114;84;56m\u2584\x1B[0m",
      "\x1B[38;2;65;52;38;48;2;55;43;30m\u2584\x1B[38;2;63;47;27;48;2;65;44;21m\u258C\x1B[38;2;59;42;24;48;2;60;47;33m\u258C\x1B[38;2;63;56;41;48;2;73;66;56m\u258C\x1B[38;2;77;69;66;48;2;84;76;72m\u2584\x1B[38;2;78;72;68;48;2;93;85;80m\u2584\x1B[38;2;84;77;74;48;2;90;82;80m\u2584\x1B[38;2;89;82;78;48;2;95;88;87m\u2584\x1B[38;2;95;89;88;48;2;108;101;101m\u2584\x1B[38;2;101;94;91;48;2;109;103;102m\u2584\x1B[38;2;99;90;88;48;2;104;98;99m\u2584\x1B[38;2;106;94;90;48;2;112;106;105m\u2584\x1B[38;2;100;90;87;48;2;114;109;110m\u2584\x1B[38;2;111;100;99;48;2;122;114;116m\u2584\x1B[38;2;109;101;98;48;2;131;122;123m\u2584\x1B[38;2;110;101;99;48;2;134;126;127m\u2584\x1B[38;2;111;103;102;48;2;133;127;130m\u2584\x1B[38;2;121;110;109;48;2;139;130;131m\u2584\x1B[38;2;132;119;116;48;2;144;138;139m\u2584\x1B[38;2;131;120;117;48;2;147;140;141m\u2584\x1B[38;2;129;121;118;48;2;154;146;145m\u2584\x1B[38;2;135;128;124;48;2;163;153;151m\u2584\x1B[38;2;144;135;131;48;2;171;162;161m\u2584\x1B[38;2;146;137;132;48;2;174;163;162m\u2584\x1B[38;2;142;135;133;48;2;171;163;162m\u2584\x1B[38;2;143;135;132;48;2;178;169;167m\u2584\x1B[38;2;158;147;141;48;2;181;171;169m\u2584\x1B[38;2;169;157;150m\u2584\x1B[38;2;183;173;168;48;2;196;188;183m\u258C\x1B[38;2;205;190;178;48;2;205;197;195m\u2584\x1B[38;2;173;156;138;48;2;210;202;200m\u2584\x1B[38;2;149;132;115;48;2;193;184;179m\u2584\x1B[38;2;157;140;122;48;2;174;163;155m\u2584\x1B[38;2;162;145;127;48;2;160;149;140m\u2584\x1B[38;2;162;144;126;48;2;158;146;137m\u2584\x1B[38;2;162;145;127;48;2;156;141;128m\u2584\x1B[48;2;153;137;123m\u2584\x1B[48;2;151;135;122m\u2584\x1B[38;2;161;144;126;48;2;153;137;123m\u2584\x1B[48;2;151;135;120m\u2584\x1B[48;2;153;138;125m\u2584\x1B[48;2;154;140;127m\u2584\x1B[48;2;157;144;132m\u2584\x1B[38;2;162;145;126;48;2;161;148;140m\u2584\x1B[38;2;162;145;127;48;2;169;157;151m\u2584\x1B[38;2;161;144;126;48;2;180;170;166m\u2584\x1B[38;2;170;151;132;48;2;187;179;177m\u2584\x1B[38;2;192;172;153;48;2;201;194;192m\u2584\x1B[38;2;190;178;166;48;2;199;190;185m\u2584\x1B[38;2;158;147;138;48;2;187;177;171m\u2584\x1B[38;2;146;134;125;48;2;180;172;166m\u2584\x1B[38;2;142;128;117;48;2;179;170;163m\u2584\x1B[38;2;140;126;114;48;2;177;165;155m\u2584\x1B[38;2;130;117;107;48;2;174;162;152m\u2584\x1B[38;2;121;108;98;48;2;168;158;155m\u2584\x1B[38;2;129;108;95;48;2;164;153;146m\u2584\x1B[38;2;132;111;97;48;2;163;149;139m\u2584\x1B[38;2;128;110;96;48;2;165;150;136m\u2584\x1B[38;2;120;107;95;48;2;163;153;147m\u2584\x1B[38;2;114;104;94;48;2;162;151;143m\u2584\x1B[38;2;117;104;92;48;2;162;150;142m\u2584\x1B[38;2;116;102;88;48;2;158;144;132m\u2584\x1B[38;2;115;98;81;48;2;144;131;119m\u2584\x1B[38;2;99;86;76;48;2;132;126;121m\u2584\x1B[38;2;107;93;82;48;2;142;134;128m\u2584\x1B[38;2;97;83;71;48;2;115;115;114m\u2584\x1B[38;2;89;75;60;48;2;137;129;121m\u2584\x1B[38;2;98;82;69;48;2;139;131;124m\u2584\x1B[38;2;90;76;63;48;2;131;123;117m\u2584\x1B[38;2;91;75;61;48;2;133;125;119m\u2584\x1B[38;2;87;75;64;48;2;135;122;112m\u2584\x1B[38;2;92;78;66;48;2;136;123;113m\u2584\x1B[38;2;102;87;73;48;2;126;111;97m\u2584\x1B[38;2;104;93;83;48;2;78;55;40m\u258C\x1B[38;2;71;43;29;48;2;91;64;46m\u2584\x1B[38;2;95;68;47;48;2;109;77;57m\u2584\x1B[0m",
      "\x1B[38;2;72;57;42;48;2;63;46;28m\u258C\x1B[38;2;60;44;28;48;2;53;35;19m\u2584\x1B[38;2;57;45;32;48;2;60;47;34m\u258C\x1B[38;2;63;52;38;48;2;68;58;51m\u258C\x1B[38;2;67;58;52;48;2;65;50;35m\u258C\x1B[38;2;71;49;27;48;2;53;44;34m\u2584\x1B[38;2;55;38;22;48;2;45;36;25m\u2584\x1B[38;2;56;33;18;48;2;54;39;22m\u2584\x1B[38;2;57;31;18;48;2;61;46;30m\u2584\x1B[38;2;63;40;23;48;2;58;47;37m\u2584\x1B[38;2;60;40;23;48;2;57;40;26m\u2584\x1B[38;2;63;39;21;48;2;72;48;30m\u2584\x1B[38;2;73;45;25;48;2;62;41;24m\u258C\x1B[38;2;58;41;29;48;2;63;43;27m\u258C\x1B[38;2;68;48;30;48;2;57;42;29m\u258C\x1B[38;2;53;34;22;48;2;52;42;34m\u2584\x1B[38;2;63;45;35;48;2;54;45;37m\u2584\x1B[38;2;69;50;35;48;2;78;54;38m\u258C\x1B[38;2;89;65;45;48;2;74;55;43m\u2584\x1B[38;2;83;65;50;48;2;74;62;52m\u2584\x1B[38;2;85;66;53;48;2;76;62;50m\u2584\x1B[38;2;87;67;53;48;2;76;59;46m\u2584\x1B[38;2;81;64;50;48;2;74;60;49m\u2584\x1B[38;2;86;68;51;48;2;79;64;52m\u2584\x1B[38;2;88;71;56;48;2;77;66;55m\u2584\x1B[38;2;104;91;81;48;2;80;68;57m\u2584\x1B[38;2;98;82;70;48;2;102;86;71m\u258C\x1B[38;2;113;95;81;48;2;109;91;76m\u2584\x1B[38;2;138;120;104;48;2;188;171;155m\u258C\x1B[38;2;205;187;166;48;2;209;190;173m\u2584\x1B[38;2;205;186;164;48;2;182;165;145m\u258C\x1B[38;2;162;145;126;48;2;162;145;127m\u258C\x1B[38;2;161;144;126;48;2;162;145;126m\u258C\x1B[38;2;162;145;127;48;2;161;144;126m\u258C\x1B[38;2;161;144;126;48;2;162;144;126m\u258C\x1B[38;2;162;144;126;48;2;162;145;127m\u258C\x1B[38;2;161;144;126m\u2584\u2584\x1B[38;2;162;145;127;48;2;161;144;126m\u2584\x1B[38;2;161;144;126;48;2;162;144;126m\u2584\x1B[38;2;162;145;127;48;2;162;145;126m\u2584\x1B[38;2;162;145;126;48;2;161;144;126m\u2584\x1B[38;2;161;144;126;48;2;162;145;127m\u258C\x1B[38;2;162;144;126;48;2;161;144;126m\u258C\x1B[38;2;162;145;127;48;2;162;144;126m\u258C\x1B[38;2;161;144;126m\u2584\x1B[48;2;185;168;148m\u258C\x1B[38;2;212;193;175;48;2;209;188;168m\u2584\x1B[38;2;202;184;167;48;2;183;168;158m\u258C\x1B[38;2;150;133;122;48;2;136;119;107m\u258C\x1B[38;2;141;123;109;48;2;121;104;91m\u2584\x1B[38;2;126;106;90;48;2;110;92;75m\u2584\x1B[38;2;116;91;72;48;2;102;84;68m\u2584\x1B[38;2;113;93;72;48;2;93;76;61m\u2584\x1B[38;2;118;97;75;48;2;83;70;57m\u2584\x1B[38;2;109;90;68;48;2;88;69;53m\u2584\x1B[38;2;107;88;67;48;2;105;76;53m\u2584\x1B[38;2;99;82;62;48;2;90;67;47m\u2584\x1B[38;2;96;78;56;48;2;77;59;40m\u2584\x1B[38;2;89;67;45;48;2;74;58;42m\u2584\x1B[38;2;84;62;42;48;2;83;69;52m\u2584\x1B[38;2;80;62;45;48;2;103;74;45m\u258C\x1B[38;2;99;68;35;48;2;86;61;36m\u258C\x1B[38;2;80;57;36;48;2;81;59;34m\u2584\x1B[38;2;85;60;37;48;2;87;59;32m\u2584\x1B[38;2;92;65;38;48;2;84;58;32m\u258C\x1B[38;2;84;54;27;48;2;73;47;25m\u2584\x1B[38;2;66;42;24;48;2;70;45;26m\u258C\x1B[38;2;69;44;26;48;2;72;52;31m\u258C\x1B[38;2;67;53;38;48;2;71;53;38m\u2584\x1B[38;2;66;52;36;48;2;71;54;34m\u258C\x1B[38;2;74;53;30;48;2;82;61;38m\u258C\x1B[38;2;85;64;41;48;2;90;72;51m\u258C\x1B[38;2;98;83;67;48;2;67;50;33m\u258C\x1B[38;2;82;61;40;48;2;76;50;36m\u2584\x1B[38;2;97;72;50;48;2;104;78;55m\u258C\x1B[0m",
      "\x1B[38;2;82;61;39;48;2;74;53;31m\u258C\x1B[38;2;72;55;41;48;2;68;52;33m\u2584\x1B[38;2;78;62;51;48;2;68;53;40m\u2584\x1B[38;2;72;57;45;48;2;73;60;49m\u2584\x1B[38;2;72;56;42;48;2;65;48;35m\u2584\x1B[38;2;72;53;39;48;2;78;49;26m\u2584\x1B[38;2;67;43;27;48;2;56;38;25m\u258C\x1B[38;2;63;45;33;48;2;77;57;42m\u258C\x1B[38;2;86;62;43;48;2;76;55;41m\u2584\x1B[38;2;64;39;18;48;2;64;41;23m\u2584\x1B[38;2;87;66;44;48;2;69;48;32m\u2584\x1B[38;2;96;74;48;48;2;70;50;34m\u2584\x1B[38;2;102;79;54;48;2;74;52;32m\u2584\x1B[38;2;114;90;66;48;2;83;63;44m\u2584\x1B[38;2;88;63;42;48;2;77;53;34m\u258C\x1B[38;2;84;64;46;48;2;64;46;31m\u2584\x1B[38;2;109;86;64;48;2;88;66;47m\u2584\x1B[38;2;118;95;73;48;2;94;72;51m\u2584\x1B[38;2;113;89;68;48;2;102;80;60m\u2584\x1B[38;2;118;94;71;48;2;103;83;65m\u2584\x1B[38;2;128;107;88;48;2;113;94;78m\u2584\x1B[38;2;125;102;80;48;2;109;90;72m\u2584\x1B[38;2;129;103;78;48;2;115;92;69m\u2584\x1B[38;2;131;106;81;48;2;118;95;72m\u2584\x1B[38;2;131;106;85;48;2;117;97;77m\u2584\x1B[38;2;125;107;93;48;2;124;99;85m\u2584\x1B[38;2;138;117;99;48;2;131;109;94m\u2584\x1B[38;2;139;118;98;48;2;137;116;99m\u2584\x1B[38;2;150;129;110;48;2;191;172;153m\u258C\x1B[38;2;199;178;155;48;2;204;187;167m\u258C\x1B[38;2;205;187;169;48;2;183;165;146m\u258C\x1B[38;2;162;144;127;48;2;161;144;126m\u258C\x1B[38;2;161;144;126;48;2;162;145;127m\u258C\x1B[38;2;162;145;127;48;2;161;144;126m\u2584\x1B[48;2;162;144;126m\u2584\x1B[48;2;161;144;126m\u258C\u2584\x1B[38;2;162;144;126m\u258C\x1B[38;2;162;145;127;48;2;162;144;126m\u258C\x1B[38;2;161;144;126m\u2584\x1B[48;2;161;144;126m\u2584\x1B[48;2;162;144;126m\u2584\x1B[38;2;162;144;126;48;2;161;144;126m\u258C\x1B[38;2;162;145;126;48;2;162;145;126m\u2584\x1B[48;2;162;145;127m\u258C\x1B[38;2;162;145;127;48;2;161;144;126m\u2584\x1B[38;2;162;144;126;48;2;182;165;147m\u258C\x1B[38;2;212;196;183;48;2;212;194;178m\u2584\x1B[38;2;207;191;175;48;2;195;180;168m\u258C\x1B[38;2;161;142;131;48;2;141;121;106m\u258C\x1B[38;2;136;111;93;48;2;138;117;101m\u2584\x1B[38;2;136;110;91;48;2;122;101;84m\u2584\x1B[38;2;141;114;92;48;2;116;92;73m\u2584\x1B[38;2;147;122;99;48;2;131;108;82m\u2584\x1B[38;2;144;120;96;48;2;126;105;86m\u2584\x1B[38;2;133;111;94;48;2;118;98;76m\u2584\x1B[38;2;130;107;87;48;2;120;100;77m\u2584\x1B[38;2;134;110;86;48;2;119;100;78m\u2584\x1B[38;2;135;110;91;48;2;123;102;80m\u2584\x1B[38;2;130;107;86;48;2;108;86;64m\u2584\x1B[38;2;125;101;78;48;2;107;85;61m\u2584\x1B[38;2;120;88;59;48;2;117;82;48m\u258C\x1B[38;2;100;74;46;48;2;92;73;50m\u258C\x1B[38;2;98;76;54;48;2;87;61;38m\u2584\x1B[38;2;97;74;54;48;2;89;63;41m\u2584\x1B[38;2;104;82;57;48;2;90;68;46m\u2584\x1B[38;2;106;74;45;48;2;98;67;38m\u2584\x1B[38;2;90;65;43;48;2;79;58;39m\u2584\x1B[38;2;94;73;49;48;2;73;53;34m\u2584\x1B[38;2;102;83;60;48;2;83;65;43m\u2584\x1B[38;2;106;86;62;48;2;89;67;44m\u2584\x1B[38;2;107;88;65;48;2;86;64;39m\u2584\x1B[38;2;110;89;65;48;2;101;80;53m\u2584\x1B[38;2;111;91;69;48;2;108;86;59m\u2584\x1B[38;2;116;96;76;48;2;110;88;62m\u2584\x1B[38;2;120;97;76;48;2;104;80;55m\u2584\x1B[0m",
      "\x1B[38;2;89;71;56;48;2;82;64;49m\u2584\x1B[38;2;81;64;50;48;2;84;67;53m\u258C\x1B[38;2;86;67;49;48;2;79;61;48m\u2584\x1B[38;2;91;72;54;48;2;83;66;52m\u2584\x1B[38;2;97;75;54;48;2;84;66;49m\u2584\x1B[38;2;101;79;58;48;2;84;66;48m\u2584\x1B[38;2;112;87;63;48;2;90;69;49m\u2584\x1B[38;2;98;75;55;48;2;104;82;59m\u258C\x1B[38;2;106;82;58;48;2;97;74;51m\u2584\x1B[38;2;115;90;64;48;2;92;69;44m\u2584\x1B[38;2;116;90;64;48;2;106;82;55m\u2584\x1B[38;2;129;102;75;48;2;119;94;68m\u2584\x1B[38;2;126;100;74;48;2;132;106;80m\u258C\x1B[38;2;137;110;83;48;2;132;105;77m\u2584\x1B[38;2;136;109;81;48;2;120;94;69m\u2584\x1B[38;2;142;115;90;48;2;125;101;78m\u2584\x1B[38;2;142;116;91;48;2;135;111;87m\u2584\x1B[38;2;142;117;93;48;2;131;107;84m\u2584\x1B[38;2;140;114;90;48;2;124;99;76m\u2584\x1B[38;2;136;108;81;48;2;128;103;80m\u2584\x1B[38;2;132;107;80;48;2;135;108;83m\u258C\x1B[38;2;139;113;89;48;2;134;109;83m\u2584\x1B[38;2;136;110;85;48;2;129;103;78m\u2584\x1B[38;2;142;117;92;48;2;130;106;81m\u2584\x1B[38;2;142;116;95;48;2;131;107;84m\u2584\x1B[38;2;140;118;102;48;2;145;124;109m\u258C\x1B[38;2;155;134;119;48;2;140;119;102m\u2584\x1B[38;2;154;132;117;48;2;137;115;98m\u2584\x1B[38;2;157;137;120;48;2;194;175;154m\u258C\x1B[38;2;200;181;161;48;2;202;185;164m\u258C\x1B[38;2;201;182;161;48;2;182;164;144m\u258C\x1B[38;2;162;144;126;48;2;161;144;126m\u2584\x1B[48;2;162;145;126m\u2584\x1B[48;2;161;144;126m\u2584\x1B[38;2;162;145;127m\u258C\x1B[38;2;161;144;126;48;2;162;144;126m\u2584\x1B[38;2;162;144;126;48;2;161;144;126m\u258C\x1B[48;2;162;145;127m\u258C\u2584\x1B[48;2;161;144;126m\u2584\x1B[38;2;161;144;126;48;2;162;144;126m\u258C\x1B[38;2;162;145;127;48;2;161;144;126m\u2584\x1B[38;2;161;144;126;48;2;162;145;126m\u2584\x1B[38;2;162;144;126m\u258C\x1B[38;2;162;145;126;48;2;162;144;126m\u2584\x1B[38;2;161;144;126;48;2;162;145;126m\u2584\x1B[48;2;180;164;148m\u258C\x1B[38;2;207;194;182;48;2;210;196;185m\u2584\x1B[38;2;209;194;180;48;2;193;177;163m\u258C\x1B[38;2;171;148;132;48;2;152;127;107m\u258C\x1B[38;2;162;136;116;48;2;152;126;109m\u2584\x1B[38;2;156;130;112;48;2;152;124;110m\u2584\x1B[38;2;155;128;112;48;2;153;124;106m\u258C\x1B[38;2;151;123;105;48;2;153;127;111m\u2584\x1B[38;2;157;132;116;48;2;152;126;106m\u2584\x1B[38;2;154;128;106;48;2;152;125;104m\u258C\x1B[38;2;150;121;96;48;2;149;122;106m\u2584\x1B[38;2;147;121;100;48;2;146;121;105m\u2584\x1B[38;2;148;125;107;48;2;146;121;104m\u2584\x1B[38;2;146;122;102;48;2;146;123;107m\u258C\x1B[38;2;146;123;107;48;2;141;120;107m\u2584\x1B[38;2;145;121;106;48;2;134;110;96m\u2584\x1B[38;2;147;123;105;48;2;126;104;86m\u2584\x1B[38;2;135;112;91;48;2;124;101;81m\u2584\x1B[38;2;139;117;97;48;2;126;103;83m\u2584\x1B[38;2;135;112;89;48;2;126;103;79m\u2584\x1B[38;2;127;103;80;48;2;126;98;74m\u2584\x1B[38;2;126;101;77;48;2;124;97;71m\u2584\x1B[38;2;124;98;70;48;2;127;103;82m\u2584\x1B[38;2;130;107;85;48;2;124;103;81m\u2584\x1B[38;2;127;107;87;48;2;123;102;82m\u2584\x1B[38;2;126;106;87;48;2;117;98;79m\u2584\x1B[38;2;121;99;79;48;2;113;92;73m\u2584\x1B[38;2;126;105;86;48;2;119;100;84m\u2584\x1B[38;2;116;95;76;48;2;126;103;82m\u258C\x1B[38;2;137;113;88;48;2;127;105;83m\u2584\x1B[0m"
    ];
    gold = chalk5.hex("#D4A017");
    darkGold = chalk5.hex("#B8860B");
    amber = chalk5.hex("#FFBF00");
    warmWhite = chalk5.hex("#F5E6C8");
    brown = chalk5.hex("#8B4513");
  }
});

// cli/app/HomeScreen.tsx
import { useState as useState4, useCallback as useCallback2 } from "react";
import { Box as Box8, Text as Text8, useApp as useApp2 } from "ink";
import TextInput2 from "ink-text-input";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function HomeScreen({
  did,
  sessionCount,
  onStartNew,
  onLoadSession,
  onExit
}) {
  const { exit } = useApp2();
  const [input, setInput] = useState4("");
  const [message, setMessage] = useState4(null);
  const [bannerShown] = useState4(() => {
    showBanner(sessionCount);
    return true;
  });
  const handleSubmit = useCallback2((text) => {
    const trimmed = text.trim().toLowerCase();
    setInput("");
    switch (trimmed) {
      case "new":
      case "start":
        onStartNew();
        exit();
        break;
      case "exit":
      case "quit":
      case "q":
        onExit();
        exit();
        break;
      case "help":
      case "?":
        setMessage("Commands: new \xB7 start \xB7 sessions \xB7 login \xB7 community list \xB7 exit");
        setTimeout(() => setMessage(null), 5e3);
        break;
      default:
        if (trimmed) {
          setMessage(`Unknown: ${trimmed}. Type 'help' for commands.`);
          setTimeout(() => setMessage(null), 3e3);
        }
    }
  }, [onStartNew, onExit, exit]);
  return /* @__PURE__ */ jsxs8(Box8, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsxs8(Box8, { marginTop: 1, flexDirection: "column", children: [
      did ? /* @__PURE__ */ jsxs8(Text8, { children: [
        /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "  Identity: " }),
        /* @__PURE__ */ jsxs8(Text8, { color: "cyan", children: [
          did.slice(0, 24),
          "\u2026"
        ] })
      ] }) : /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "  No identity. Run: forge login" }),
      sessionCount > 0 && /* @__PURE__ */ jsxs8(Text8, { dimColor: true, children: [
        "  ",
        sessionCount,
        " saved session(s). Type 'sessions' to view."
      ] })
    ] }),
    /* @__PURE__ */ jsxs8(Box8, { paddingX: 1, marginTop: 1, flexDirection: "column", children: [
      /* @__PURE__ */ jsxs8(Text8, { children: [
        "  ",
        /* @__PURE__ */ jsx8(Text8, { color: "green", children: "new" }),
        "              Start a new deliberation"
      ] }),
      /* @__PURE__ */ jsxs8(Text8, { children: [
        "  ",
        /* @__PURE__ */ jsx8(Text8, { color: "green", children: "forge start" }),
        "      Start with options"
      ] }),
      /* @__PURE__ */ jsxs8(Text8, { children: [
        "  ",
        /* @__PURE__ */ jsx8(Text8, { color: "green", children: "forge community" }),
        "  Browse peer contributions"
      ] }),
      /* @__PURE__ */ jsxs8(Text8, { children: [
        "  ",
        /* @__PURE__ */ jsx8(Text8, { color: "green", children: "forge login" }),
        "      Manage identity"
      ] }),
      /* @__PURE__ */ jsxs8(Text8, { children: [
        "  ",
        /* @__PURE__ */ jsx8(Text8, { color: "green", children: "help" }),
        "             All commands"
      ] })
    ] }),
    message && /* @__PURE__ */ jsx8(Box8, { paddingX: 1, marginTop: 1, children: /* @__PURE__ */ jsx8(Text8, { color: "yellow", children: message }) }),
    /* @__PURE__ */ jsxs8(
      Box8,
      {
        borderStyle: "single",
        borderColor: "cyan",
        paddingX: 1,
        marginTop: 1,
        children: [
          /* @__PURE__ */ jsx8(Text8, { color: "cyan", children: "> " }),
          /* @__PURE__ */ jsx8(
            TextInput2,
            {
              value: input,
              onChange: setInput,
              onSubmit: handleSubmit,
              placeholder: "Type 'new' to start..."
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ jsx8(Box8, { paddingX: 1, children: /* @__PURE__ */ jsx8(Text8, { dimColor: true, children: "Ctrl+C quit \u2502 Decentralized \xB7 Keyless \xB7 Open Source" }) })
  ] });
}
var init_HomeScreen = __esm({
  "cli/app/HomeScreen.tsx"() {
    "use strict";
    init_banner();
  }
});

// cli/app/StartWizard.tsx
import React6, { useState as useState5 } from "react";
import { Box as Box9, Text as Text9, useInput as useInput4 } from "ink";
import TextInput3 from "ink-text-input";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
function StartWizard({
  projectName,
  initialGoal,
  personaOptions,
  initialPersonaSet,
  onComplete,
  onCancel
}) {
  const needsGoal = !initialGoal.trim();
  const needsPersona = !initialPersonaSet;
  const [step, setStep] = useState5(needsGoal ? "goal" : needsPersona ? "persona" : "done");
  const [goal, setGoal] = useState5(initialGoal);
  const [goalInput, setGoalInput] = useState5("");
  const [personaCursor, setPersonaCursor] = useState5(0);
  const [personaSet, setPersonaSet] = useState5(initialPersonaSet);
  React6.useEffect(() => {
    if (step === "done" && personaSet !== null) {
      onComplete({ goal, personaSet });
    }
  }, [step, personaSet, goal, onComplete]);
  const handleGoalSubmit = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoal(trimmed);
    setStep(needsPersona ? "persona" : "done");
  };
  useInput4((input, key) => {
    if (step !== "persona") return;
    if (key.escape || key.ctrl && input === "c") {
      onCancel();
      return;
    }
    if (key.upArrow || key.ctrl && input === "p") {
      setPersonaCursor((c) => (c - 1 + personaOptions.length) % personaOptions.length);
      return;
    }
    if (key.downArrow || key.ctrl && input === "n") {
      setPersonaCursor((c) => (c + 1) % personaOptions.length);
      return;
    }
    if (key.return) {
      const selected = personaOptions[personaCursor];
      if (selected) {
        setPersonaSet(selected.id);
        setStep("done");
      }
      return;
    }
    const n = parseInt(input, 10);
    if (!Number.isNaN(n) && n >= 0 && n < personaOptions.length) {
      const selected = personaOptions[n];
      setPersonaSet(selected.id);
      setStep("done");
    }
  });
  if (step === "done") {
    return /* @__PURE__ */ jsx9(Box9, { flexDirection: "column", padding: 1, children: /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Launching deliberation\u2026" }) });
  }
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", padding: 1, children: [
    /* @__PURE__ */ jsxs9(
      Box9,
      {
        borderStyle: "round",
        borderColor: "yellow",
        paddingX: 1,
        flexDirection: "column",
        marginBottom: 1,
        children: [
          /* @__PURE__ */ jsxs9(Text9, { bold: true, color: "yellow", children: [
            "\u2692 FORGE \xB7 ",
            projectName || "New Session"
          ] }),
          /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Set up your deliberation" })
        ]
      }
    ),
    step === "goal" && /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx9(Text9, { color: "cyan", bold: true, children: "What do you want decided?" }),
      /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "One clear question. Agents will deliberate against it." }),
      /* @__PURE__ */ jsxs9(Box9, { marginTop: 1, children: [
        /* @__PURE__ */ jsx9(Text9, { color: "cyan", children: "> " }),
        /* @__PURE__ */ jsx9(
          TextInput3,
          {
            value: goalInput,
            onChange: setGoalInput,
            onSubmit: handleGoalSubmit,
            placeholder: "Should we migrate from Postgres to Cockroach?"
          }
        )
      ] }),
      /* @__PURE__ */ jsx9(Box9, { marginTop: 1, children: /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: "Enter to continue \xB7 Ctrl+C to cancel" }) })
    ] }),
    step === "persona" && /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", children: [
      /* @__PURE__ */ jsx9(Text9, { color: "cyan", bold: true, children: "Pick a council." }),
      /* @__PURE__ */ jsx9(Text9, { dimColor: true, children: goal ? `Goal: ${goal.slice(0, 60)}${goal.length > 60 ? "\u2026" : ""}` : "" }),
      /* @__PURE__ */ jsx9(Box9, { marginTop: 1, flexDirection: "column", children: personaOptions.map((opt, i) => {
        const isCursor = i === personaCursor;
        return /* @__PURE__ */ jsxs9(Box9, { children: [
          /* @__PURE__ */ jsx9(Text9, { color: isCursor ? "cyan" : "gray", children: isCursor ? "\u25B8 " : "  " }),
          /* @__PURE__ */ jsxs9(Text9, { color: isCursor ? "cyan" : void 0, bold: isCursor, children: [
            i,
            ". ",
            opt.label
          ] }),
          opt.subtitle && /* @__PURE__ */ jsxs9(Text9, { dimColor: true, children: [
            "  \xB7 ",
            opt.subtitle
          ] })
        ] }, opt.id);
      }) }),
      /* @__PURE__ */ jsx9(Box9, { marginTop: 1, children: /* @__PURE__ */ jsxs9(Text9, { dimColor: true, children: [
        "\u2191\u2193 navigate \xB7 Enter select \xB7 0-",
        personaOptions.length - 1,
        " shortcut \xB7 Esc cancel"
      ] }) })
    ] })
  ] });
}
var init_StartWizard = __esm({
  "cli/app/StartWizard.tsx"() {
    "use strict";
  }
});

// cli/app/Shell.tsx
var Shell_exports = {};
__export(Shell_exports, {
  Shell: () => Shell
});
import { useState as useState6, useCallback as useCallback3, useMemo as useMemo2 } from "react";
import { Box as Box10, Text as Text10 } from "ink";
import { v4 as uuid2 } from "uuid";
import * as path17 from "path";
import { jsx as jsx10 } from "react/jsx-runtime";
function Shell({
  did,
  sessionCount,
  initialWizardSeed,
  prebuiltApp,
  onExit
}) {
  const initialScreen = prebuiltApp ? "app" : initialWizardSeed ? "wizard" : "home";
  const [screen, setScreen] = useState6(initialScreen);
  const [wizardSeed, setWizardSeed] = useState6(
    initialWizardSeed ?? null
  );
  const [appState, setAppState] = useState6(prebuiltApp ?? null);
  const handleStartNew = useCallback3(() => {
    setWizardSeed({
      projectName: "New Session",
      initialGoal: "",
      initialPersonaSet: null,
      personaOptions: [
        { id: "default", label: "Use default council", subtitle: "skeptic \xB7 pragmatist \xB7 analyst \xB7 advocate \xB7 contrarian" },
        { id: "generate", label: "Generate for this project", subtitle: "LLM-crafted personas tuned to the goal" }
      ],
      mode: "copywrite",
      language: "english",
      humanParticipation: true,
      enabledAgents: ["skeptic", "pragmatist", "analyst"],
      outputDir: "output/sessions"
    });
    setScreen("wizard");
  }, []);
  const handleLoadSession = useCallback3((_name) => {
    onExit();
    setScreen("exiting");
  }, [onExit]);
  const handleHomeExit = useCallback3(() => {
    onExit();
    setScreen("exiting");
  }, [onExit]);
  const handleWizardComplete = useCallback3(
    async (result) => {
      if (!wizardSeed) return;
      const cwd = process.cwd();
      const fsAdapter = new FileSystemAdapter(cwd);
      const agentRunner = new ClaudeCodeCLIRunner();
      const config = {
        id: uuid2(),
        projectName: wizardSeed.projectName,
        goal: result.goal,
        enabledAgents: [...wizardSeed.enabledAgents],
        humanParticipation: wizardSeed.humanParticipation,
        maxRounds: 10,
        consensusThreshold: 0.6,
        methodology: getDefaultMethodology(),
        contextDir: path17.join(cwd, "context"),
        outputDir: wizardSeed.outputDir,
        language: wizardSeed.language,
        mode: wizardSeed.mode
      };
      const session = {
        id: config.id,
        config,
        messages: [],
        currentPhase: "initialization",
        currentRound: 0,
        decisions: [],
        drafts: [],
        startedAt: /* @__PURE__ */ new Date(),
        status: "running"
      };
      const persistence = new SessionPersistence(fsAdapter, {
        outputDir: wizardSeed.outputDir
      });
      await persistence.initSession(session);
      const orchestrator = new EDAOrchestrator(
        session,
        void 0,
        void 0,
        {
          agentRunner,
          fileSystem: fsAdapter,
          autoRunPhaseMachine: !wizardSeed.humanParticipation
        }
      );
      orchestrator.on((event) => {
        if (event.type === "agent_message") {
          persistence.updateSession(orchestrator.getSession());
        }
      });
      setAppState({ session, orchestrator, persistence });
      setScreen("app");
    },
    [wizardSeed]
  );
  const handleWizardCancel = useCallback3(() => {
    setScreen("home");
  }, []);
  const handleAppExit = useCallback3(() => {
    if (appState) {
      void appState.persistence.saveFull();
    }
    onExit();
    setScreen("exiting");
  }, [appState, onExit]);
  const homeProps = useMemo2(
    () => ({
      did,
      sessionCount,
      onStartNew: handleStartNew,
      onLoadSession: handleLoadSession,
      onExit: handleHomeExit
    }),
    [did, sessionCount, handleStartNew, handleLoadSession, handleHomeExit]
  );
  switch (screen) {
    case "home":
      return /* @__PURE__ */ jsx10(HomeScreen, { ...homeProps });
    case "wizard":
      if (!wizardSeed) {
        return /* @__PURE__ */ jsx10(Text10, { color: "red", children: "Wizard seed missing" });
      }
      return /* @__PURE__ */ jsx10(
        StartWizard,
        {
          projectName: wizardSeed.projectName,
          initialGoal: wizardSeed.initialGoal,
          personaOptions: wizardSeed.personaOptions,
          initialPersonaSet: wizardSeed.initialPersonaSet,
          onComplete: handleWizardComplete,
          onCancel: handleWizardCancel
        }
      );
    case "app":
      if (!appState) {
        return /* @__PURE__ */ jsx10(Text10, { color: "red", children: "App state missing" });
      }
      return /* @__PURE__ */ jsx10(
        App,
        {
          orchestrator: appState.orchestrator,
          persistence: appState.persistence,
          session: appState.session,
          onExit: handleAppExit
        }
      );
    case "exiting":
    default:
      return /* @__PURE__ */ jsx10(Box10, {});
  }
}
var init_Shell = __esm({
  "cli/app/Shell.tsx"() {
    "use strict";
    init_App();
    init_HomeScreen();
    init_StartWizard();
    init_EDAOrchestrator();
    init_ClaudeCodeCLIRunner();
    init_FileSystemAdapter();
    init_SessionPersistence();
    init_methodologies();
  }
});

// cli/index.ts
import { Command as Command10 } from "commander";
import { render } from "ink";
import React8 from "react";
import { v4 as uuid3 } from "uuid";
import * as path18 from "path";
import * as fs13 from "fs/promises";

// cli/adapters/CLIAgentRunner.ts
import Anthropic from "@anthropic-ai/sdk";
var CLIAgentRunner = class {
  client;
  defaultModel;
  constructor(apiKey, defaultModel = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.defaultModel = defaultModel;
  }
  async query(params) {
    try {
      const response = await this.client.messages.create({
        model: params.model || this.defaultModel,
        max_tokens: 2048,
        system: params.systemPrompt || "",
        messages: [
          {
            role: "user",
            content: params.prompt
          }
        ]
      });
      const content = response.content[0].type === "text" ? response.content[0].text : "";
      return {
        success: true,
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          costUsd: this.estimateCost(response.usage.input_tokens, response.usage.output_tokens)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  async evaluate(params) {
    try {
      const response = await this.client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: params.evalPrompt
          }
        ]
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "{}";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          urgency: "pass",
          reason: "Failed to parse response",
          responseType: ""
        };
      }
      const result = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        urgency: result.urgency || "pass",
        reason: result.reason || "",
        responseType: result.responseType || ""
      };
    } catch (error) {
      return {
        success: false,
        urgency: "pass",
        reason: error instanceof Error ? error.message : "Unknown error",
        responseType: ""
      };
    }
  }
  estimateCost(inputTokens, outputTokens) {
    const inputCost = inputTokens / 1e6 * 3;
    const outputCost = outputTokens / 1e6 * 15;
    return inputCost + outputCost;
  }
};

// cli/index.ts
init_ClaudeCodeCLIRunner();
init_FileSystemAdapter();
init_SessionPersistence();
init_EDAOrchestrator();
init_methodologies();
init_personas();

// cli/commands/personas.ts
import { Command } from "commander";
import * as path5 from "path";
import * as fs3 from "fs/promises";
import Anthropic3 from "@anthropic-ai/sdk";
var PERSONA_GENERATION_PROMPT = `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project. Each persona should:

1. **Represent a distinct stakeholder perspective** - Different roles, backgrounds, or viewpoints that naturally create productive tension
2. **Have complementary blind spots** - What one misses, another catches
3. **Bring unique expertise** - Each persona should have domain knowledge the others lack
4. **Have realistic biases** - Based on their background and role
5. **Create productive conflict** - Their perspectives should naturally clash in ways that lead to better outcomes

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have. This should include:
- Key terminology and concepts for the domain
- Best practices and frameworks
- Common pitfalls to avoid
- Decision-making criteria relevant to the domain
- Industry standards or regulations if applicable

### 2. "personas" field
An array of personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name (transliterate if needed)
- role: Short role description (e.g., "The Risk-Averse Investor")
- age: Realistic age for their role
- background: 2-3 sentence background explaining their perspective
- personality: Array of 4-5 personality traits relevant to debates
- biases: Array of 3-4 biases they bring to discussions
- strengths: Array of 3-4 debate/analysis strengths
- weaknesses: Array of 2 potential blind spots
- speakingStyle: How they communicate in debates
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red
- expertise: Array of 3-5 specific areas THIS persona is expert in (unique to them)

## Example Output Structure
{
  "expertise": "## Domain Expertise\\n\\n### Key Concepts\\n- Concept 1...\\n### Best Practices\\n- Practice 1...",
  "personas": [
    {
      "id": "cautious-analyst",
      "name": "Sarah",
      ...
      "expertise": ["risk assessment", "regulatory compliance", "data analysis"]
    }
  ]
}

## Important
- Create 4-6 personas unless specified otherwise
- Ensure diversity in age, background, and perspective
- Make them feel like real people, not caricatures
- Their conflicts should be productive, not personal
- The shared expertise should be comprehensive enough to inform good debates
- Each persona's individual expertise should be distinct`;
function createPersonasCommand() {
  const personas = new Command("personas").description("Manage debate personas");
  personas.command("generate").description("Generate new personas for a domain").option("-d, --domain <domain>", "Domain or topic for the debate").option("-b, --brief <name>", "Generate from a brief file").option("-c, --count <n>", "Number of personas to generate", "5").option("-r, --roles <roles>", "Specific roles to include (comma-separated)").option("-n, --name <name>", "Name for the persona set", "custom").option("-o, --output <dir>", "Output directory", "personas").action(async (options) => {
    const cwd = process.cwd();
    let contextPrompt = "";
    if (options.brief) {
      const briefPath = path5.join(cwd, "briefs", `${options.brief}.md`);
      try {
        const briefContent = await fs3.readFile(briefPath, "utf-8");
        contextPrompt = `## Project Brief
${briefContent}

Generate personas that would be valuable stakeholders in debating and creating content/strategy for this project.`;
      } catch {
        console.error(`Brief "${options.brief}" not found`);
        process.exit(1);
      }
    } else if (options.domain) {
      contextPrompt = `## Domain
${options.domain}

Generate personas that would be valuable stakeholders in debating decisions and strategy for this domain.`;
    } else {
      console.error("Please specify either --domain or --brief");
      process.exit(1);
    }
    if (options.roles) {
      contextPrompt += `

## Required Roles
Make sure to include personas for these roles: ${options.roles}`;
    }
    contextPrompt += `

## Number of Personas
Generate exactly ${options.count} personas.`;
    console.log("\u{1F525} Generating personas...\n");
    try {
      const client2 = new Anthropic3();
      const response = await client2.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: PERSONA_GENERATION_PROMPT,
        messages: [
          {
            role: "user",
            content: contextPrompt
          }
        ]
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("Failed to parse personas from response");
        console.log("Raw response:", text);
        process.exit(1);
      }
      const parsed = JSON.parse(jsonMatch[0]);
      let personas2;
      let expertise = "";
      if (Array.isArray(parsed)) {
        personas2 = parsed;
      } else {
        personas2 = parsed.personas;
        expertise = parsed.expertise || "";
      }
      for (const p of personas2) {
        if (!p.id || !p.name || !p.role) {
          console.error("Invalid persona structure:", p);
          process.exit(1);
        }
      }
      const outputDir = path5.join(cwd, options.output);
      await fs3.mkdir(outputDir, { recursive: true });
      const personasFile = path5.join(outputDir, `${options.name}.json`);
      await fs3.writeFile(personasFile, JSON.stringify(personas2, null, 2));
      if (expertise) {
        const skillsFile = path5.join(outputDir, `${options.name}.skills.md`);
        await fs3.writeFile(skillsFile, expertise);
        console.log(`\u{1F4DA} Domain expertise saved to: ${skillsFile}`);
      }
      console.log(`\u2705 Generated ${personas2.length} personas:
`);
      for (const p of personas2) {
        console.log(`  \u2022 ${p.name} (${p.nameHe}) - ${p.role}`);
        console.log(`    ${p.background.slice(0, 80)}...`);
        if (p.expertise) {
          console.log(`    Expertise: ${p.expertise.slice(0, 3).join(", ")}`);
        }
        console.log("");
      }
      console.log(`\u{1F4C1} Personas saved to: ${personasFile}`);
      console.log(`
Use with: forge start --personas ${options.name}`);
    } catch (error) {
      console.error("Error generating personas:", error);
      process.exit(1);
    }
  });
  personas.command("list").description("List available persona sets").option("-d, --dir <dir>", "Personas directory", "personas").action(async (options) => {
    const cwd = process.cwd();
    const personasDir = path5.join(cwd, options.dir);
    try {
      const files = await fs3.readdir(personasDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      if (jsonFiles.length === 0) {
        console.log("No persona sets found.");
        console.log('Generate some with: forge personas generate --domain "your domain"');
        return;
      }
      console.log("Available persona sets:\n");
      for (const file of jsonFiles) {
        const name = path5.basename(file, ".json");
        const content = await fs3.readFile(path5.join(personasDir, file), "utf-8");
        const personas2 = JSON.parse(content);
        console.log(`  \u2022 ${name} (${personas2.length} personas)`);
        for (const p of personas2) {
          console.log(`    - ${p.name}: ${p.role}`);
        }
        console.log("");
      }
    } catch {
      console.log("No personas directory found.");
      console.log('Generate some with: forge personas generate --domain "your domain"');
    }
  });
  personas.command("show <name>").description("Show details of a persona set").option("-d, --dir <dir>", "Personas directory", "personas").action(async (name, options) => {
    const cwd = process.cwd();
    const filePath = path5.join(cwd, options.dir, `${name}.json`);
    try {
      const content = await fs3.readFile(filePath, "utf-8");
      const personas2 = JSON.parse(content);
      console.log(`
\u{1F4CB} Persona Set: ${name}
`);
      console.log("\u2500".repeat(60));
      for (const p of personas2) {
        console.log(`
### ${p.name} (${p.nameHe}) - ${p.role}`);
        console.log(`Age: ${p.age} | Color: ${p.color}`);
        console.log(`
Background:
${p.background}`);
        console.log(`
Personality:`);
        p.personality.forEach((t) => console.log(`  \u2022 ${t}`));
        console.log(`
Biases:`);
        p.biases.forEach((b) => console.log(`  \u2022 ${b}`));
        console.log(`
Strengths:`);
        p.strengths.forEach((s) => console.log(`  \u2022 ${s}`));
        console.log(`
Weaknesses:`);
        p.weaknesses.forEach((w) => console.log(`  \u2022 ${w}`));
        console.log(`
Speaking Style: ${p.speakingStyle}`);
        console.log("\n" + "\u2500".repeat(60));
      }
    } catch {
      console.error(`Persona set "${name}" not found`);
      process.exit(1);
    }
  });
  return personas;
}

// cli/commands/export.ts
init_personas();
import { Command as Command2 } from "commander";
import * as path6 from "path";
import * as fs4 from "fs/promises";
function createExportCommand() {
  const exportCmd = new Command2("export").description("Export session data").option("-s, --session <dir>", "Session directory to export").option("-f, --format <fmt>", "Export format: md, json, html", "md").option("-t, --type <type>", "Export type: transcript, draft, summary, messages, all", "transcript").option("-o, --output <file>", "Output file path").option("-l, --latest", "Use the latest session", false).action(async (options) => {
    const cwd = process.cwd();
    let sessionDir = options.session;
    if (!sessionDir || options.latest) {
      const outputDir = path6.join(cwd, "output/sessions");
      try {
        const dirs = await fs4.readdir(outputDir, { withFileTypes: true });
        const sessionDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
        if (sessionDirs.length === 0) {
          console.error('No sessions found. Run "forge start" first.');
          process.exit(1);
        }
        sessionDir = path6.join(outputDir, sessionDirs[0]);
        console.log(`Using session: ${sessionDirs[0]}
`);
      } catch {
        console.error("No sessions directory found.");
        process.exit(1);
      }
    }
    const metadataPath = path6.join(sessionDir, "session.json");
    const messagesPath = path6.join(sessionDir, "messages.jsonl");
    let metadata = null;
    let messages = [];
    try {
      const metaContent = await fs4.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(metaContent);
    } catch {
      console.warn("Warning: Could not load session metadata");
    }
    try {
      const msgContent = await fs4.readFile(messagesPath, "utf-8");
      messages = msgContent.trim().split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
    } catch {
      console.warn("Warning: Could not load messages");
    }
    let output = "";
    let filename = "";
    switch (options.type) {
      case "transcript":
        output = generateTranscript(metadata, messages, options.format);
        filename = `transcript.${options.format}`;
        break;
      case "draft":
        output = generateDraft(metadata, messages, options.format);
        filename = `draft.${options.format}`;
        break;
      case "summary":
        output = generateSummary(metadata, messages, options.format);
        filename = `summary.${options.format}`;
        break;
      case "messages":
        output = generateMessages(messages, options.format);
        filename = `messages.${options.format}`;
        break;
      case "all":
        const types = ["transcript", "draft", "summary", "messages"];
        for (const t of types) {
          const typeOutput = generateByType(t, metadata, messages, options.format);
          const typeFile = options.output ? path6.join(path6.dirname(options.output), `${t}.${options.format}`) : path6.join(sessionDir, `export-${t}.${options.format}`);
          await fs4.writeFile(typeFile, typeOutput);
          console.log(`\u2705 Exported ${t} to ${typeFile}`);
        }
        return;
      default:
        console.error(`Unknown export type: ${options.type}`);
        process.exit(1);
    }
    const outputPath = options.output || path6.join(sessionDir, `export-${filename}`);
    await fs4.writeFile(outputPath, output);
    console.log(`\u2705 Exported ${options.type} to ${outputPath}`);
  });
  return exportCmd;
}
function generateByType(type, metadata, messages, format) {
  switch (type) {
    case "transcript":
      return generateTranscript(metadata, messages, format);
    case "draft":
      return generateDraft(metadata, messages, format);
    case "summary":
      return generateSummary(metadata, messages, format);
    case "messages":
      return generateMessages(messages, format);
    default:
      return "";
  }
}
function generateTranscript(metadata, messages, format) {
  if (format === "json") {
    return JSON.stringify({ metadata, messages }, null, 2);
  }
  if (format === "html") {
    return generateHTMLTranscript(metadata, messages);
  }
  const lines = [];
  if (metadata) {
    lines.push(`# ${metadata.projectName} - Debate Transcript`);
    lines.push("");
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Started:** ${metadata.startedAt}`);
    if (metadata.endedAt) lines.push(`**Ended:** ${metadata.endedAt}`);
    lines.push(`**Agents:** ${metadata.enabledAgents.join(", ")}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  for (const msg of messages) {
    const sender = getSenderName(msg.agentId);
    const time = new Date(msg.timestamp).toLocaleTimeString();
    const typeTag = msg.type !== "system" ? `[${msg.type.toUpperCase()}]` : "";
    lines.push(`### ${sender} ${typeTag}`);
    lines.push(`*${time}*`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}
function generateDraft(metadata, messages, format) {
  const draftMessages = messages.filter(
    (m) => m.type === "synthesis" || m.content.includes("## Hero") || m.content.includes("## Problem") || m.content.includes("## Solution") || m.content.includes("**Hero") || m.content.includes("**\u05DB\u05D5\u05EA\u05E8\u05EA")
  );
  const draftingContent = messages.filter(
    (m) => m.agentId !== "system" && m.agentId !== "human" && (m.content.includes("[PROPOSAL]") || m.content.includes("[SYNTHESIS]"))
  );
  const allDrafts = [...draftMessages, ...draftingContent];
  if (format === "json") {
    return JSON.stringify({
      metadata,
      drafts: allDrafts.map((m) => ({
        agentId: m.agentId,
        content: m.content,
        timestamp: m.timestamp
      }))
    }, null, 2);
  }
  if (format === "html") {
    return generateHTMLDraft(metadata, allDrafts);
  }
  const lines = [];
  if (metadata) {
    lines.push(`# ${metadata.projectName} - Draft Copy`);
    lines.push("");
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Generated:** ${(/* @__PURE__ */ new Date()).toISOString()}`);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  if (allDrafts.length === 0) {
    lines.push("*No draft content found. The debate may not have reached the drafting phase.*");
  } else {
    for (const msg of allDrafts) {
      const sender = getSenderName(msg.agentId);
      lines.push(`## From ${sender}`);
      lines.push("");
      lines.push(msg.content);
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }
  return lines.join("\n");
}
function generateSummary(metadata, messages, format) {
  const agentCounts = /* @__PURE__ */ new Map();
  const typeBreakdown = /* @__PURE__ */ new Map();
  for (const msg of messages) {
    if (msg.agentId !== "system") {
      agentCounts.set(msg.agentId, (agentCounts.get(msg.agentId) || 0) + 1);
    }
    typeBreakdown.set(msg.type, (typeBreakdown.get(msg.type) || 0) + 1);
  }
  const syntheses = messages.filter((m) => m.type === "synthesis");
  const agreements = messages.filter((m) => m.content.includes("[AGREEMENT]"));
  const disagreements = messages.filter((m) => m.content.includes("[DISAGREEMENT]"));
  const proposals = messages.filter((m) => m.content.includes("[PROPOSAL]"));
  const summary = {
    metadata,
    stats: {
      totalMessages: messages.length,
      agentParticipation: Object.fromEntries(agentCounts),
      messageTypes: Object.fromEntries(typeBreakdown),
      syntheses: syntheses.length,
      agreements: agreements.length,
      disagreements: disagreements.length,
      proposals: proposals.length
    },
    keyMoments: {
      lastSynthesis: syntheses[syntheses.length - 1]?.content.slice(0, 500),
      topProposals: proposals.slice(-3).map((m) => ({
        from: getSenderName(m.agentId),
        preview: m.content.slice(0, 200)
      }))
    }
  };
  if (format === "json") {
    return JSON.stringify(summary, null, 2);
  }
  const lines = [];
  if (metadata) {
    lines.push(`# ${metadata.projectName} - Session Summary`);
    lines.push("");
    lines.push(`**Goal:** ${metadata.goal}`);
    lines.push(`**Duration:** ${metadata.startedAt} - ${metadata.endedAt || "ongoing"}`);
    lines.push("");
  }
  lines.push("## Statistics");
  lines.push("");
  lines.push(`- **Total Messages:** ${summary.stats.totalMessages}`);
  lines.push(`- **Syntheses:** ${summary.stats.syntheses}`);
  lines.push(`- **Agreements:** ${summary.stats.agreements}`);
  lines.push(`- **Disagreements:** ${summary.stats.disagreements}`);
  lines.push(`- **Proposals:** ${summary.stats.proposals}`);
  lines.push("");
  lines.push("## Agent Participation");
  lines.push("");
  for (const [agent, count] of agentCounts) {
    lines.push(`- **${getSenderName(agent)}:** ${count} messages`);
  }
  lines.push("");
  if (summary.keyMoments.lastSynthesis) {
    lines.push("## Latest Synthesis");
    lines.push("");
    lines.push(summary.keyMoments.lastSynthesis + "...");
    lines.push("");
  }
  if (summary.keyMoments.topProposals.length > 0) {
    lines.push("## Recent Proposals");
    lines.push("");
    for (const p of summary.keyMoments.topProposals) {
      lines.push(`### From ${p.from}`);
      lines.push(p.preview + "...");
      lines.push("");
    }
  }
  return lines.join("\n");
}
function generateMessages(messages, format) {
  if (format === "json") {
    return JSON.stringify(messages, null, 2);
  }
  const lines = messages.map((m) => {
    const sender = getSenderName(m.agentId);
    const time = new Date(m.timestamp).toLocaleTimeString();
    return `**${sender}** (${time}): ${m.content.slice(0, 100)}...`;
  });
  return lines.join("\n\n");
}
function generateHTMLTranscript(metadata, messages) {
  const agentColors = {
    ronit: "#9B59B6",
    avi: "#3498DB",
    dana: "#E74C3C",
    yossi: "#2ECC71",
    michal: "#F39C12",
    noa: "#8E44AD",
    system: "#95A5A6",
    human: "#34495E"
  };
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.projectName || "Forge Debate"} - Transcript</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d9ff; }
    .meta { color: #888; margin-bottom: 20px; }
    .message { margin: 20px 0; padding: 15px; border-radius: 8px; background: #16213e; }
    .sender { font-weight: bold; margin-bottom: 5px; }
    .time { color: #666; font-size: 0.8em; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    .type-tag { font-size: 0.8em; padding: 2px 6px; border-radius: 4px; background: #333; margin-left: 10px; }
  </style>
</head>
<body>
  <h1>\u{1F525} ${metadata?.projectName || "Forge Debate"}</h1>
  <div class="meta">
    <p><strong>Goal:</strong> ${metadata?.goal || "N/A"}</p>
    <p><strong>Started:</strong> ${metadata?.startedAt || "N/A"}</p>
  </div>
`;
  for (const msg of messages) {
    const color = agentColors[msg.agentId] || "#888";
    const sender = getSenderName(msg.agentId);
    const time = new Date(msg.timestamp).toLocaleTimeString();
    html += `
  <div class="message">
    <div class="sender" style="color: ${color}">
      ${sender}
      ${msg.type !== "system" ? `<span class="type-tag">${msg.type}</span>` : ""}
      <span class="time">${time}</span>
    </div>
    <div class="content">${escapeHtml(msg.content)}</div>
  </div>
`;
  }
  html += `</body></html>`;
  return html;
}
function generateHTMLDraft(metadata, drafts) {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata?.projectName || "Forge"} - Draft</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .draft-section { margin: 30px 0; padding: 20px; border-left: 4px solid #00d9ff; background: #f9f9f9; }
    .author { color: #666; font-size: 0.9em; margin-bottom: 10px; }
    .content { white-space: pre-wrap; line-height: 1.8; }
  </style>
</head>
<body>
  <h1>${metadata?.projectName || "Draft"}</h1>
  <p><em>Generated by Forge</em></p>
`;
  for (const draft of drafts) {
    html += `
  <div class="draft-section">
    <div class="author">From: ${getSenderName(draft.agentId)}</div>
    <div class="content">${escapeHtml(draft.content)}</div>
  </div>
`;
  }
  html += `</body></html>`;
  return html;
}
function getSenderName(agentId) {
  if (agentId === "human") return "Human";
  if (agentId === "system") return "System";
  const agent = getAgentById(agentId);
  return agent ? `${agent.name} (${agent.nameHe})` : agentId;
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
}

// cli/commands/batch.ts
import { Command as Command3 } from "commander";
import * as path7 from "path";
import * as fs5 from "fs/promises";
import { glob } from "glob";
import { v4 as uuid } from "uuid";
init_FileSystemAdapter();
init_SessionPersistence();
init_EDAOrchestrator();
init_methodologies();
init_personas();
function createBatchCommand() {
  const batch = new Command3("batch").description("Process multiple briefs in batch mode").argument("<pattern>", 'Glob pattern for brief files (e.g., "./briefs/*.md")').option("-p, --parallel <count>", "Number of parallel sessions", "1").option("-o, --output <dir>", "Output directory", "output/batch").option("-a, --agents <ids>", "Comma-separated agent IDs").option("-l, --language <lang>", "Language: hebrew, english, mixed", "hebrew").option("--json", "Output results as JSON").option("--dry-run", "Show what would be processed without running").option("--resume", "Skip already processed briefs").option("--timeout <minutes>", "Timeout per brief in minutes", "30").action(async (pattern, options) => {
    const exitCode = await runBatch(pattern, options);
    process.exit(exitCode);
  });
  return batch;
}
async function runBatch(pattern, options) {
  const cwd = process.cwd();
  const parallel = parseInt(options.parallel || "1", 10);
  const outputDir = path7.resolve(cwd, options.output || "output/batch");
  const timeout = parseInt(options.timeout || "30", 10) * 60 * 1e3;
  const briefPaths = await glob(pattern, { cwd, absolute: true });
  if (briefPaths.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ error: "No briefs found matching pattern", pattern }, null, 2));
    } else {
      console.error(`No briefs found matching pattern: ${pattern}`);
    }
    return 1;
  }
  briefPaths.sort();
  if (!options.json) {
    console.log(`
\u{1F525} Forge Batch Processing`);
    console.log(`   Briefs: ${briefPaths.length}`);
    console.log(`   Parallel: ${parallel}`);
    console.log(`   Output: ${outputDir}`);
    console.log("");
  }
  if (options.dryRun) {
    const dryRunResults = briefPaths.map((p) => ({
      brief: path7.relative(cwd, p),
      wouldProcess: true
    }));
    if (options.json) {
      console.log(JSON.stringify({ dryRun: true, briefs: dryRunResults }, null, 2));
    } else {
      console.log("Would process:");
      dryRunResults.forEach((r) => console.log(`  \u2022 ${r.brief}`));
    }
    return 0;
  }
  await fs5.mkdir(outputDir, { recursive: true });
  let toProcess = briefPaths;
  if (options.resume) {
    const processed = await getProcessedBriefs(outputDir);
    toProcess = briefPaths.filter((p) => !processed.has(path7.basename(p, ".md")));
    if (!options.json && toProcess.length < briefPaths.length) {
      console.log(`Skipping ${briefPaths.length - toProcess.length} already processed briefs.`);
    }
  }
  if (toProcess.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ message: "All briefs already processed", count: 0 }, null, 2));
    } else {
      console.log("All briefs already processed.");
    }
    return 0;
  }
  let enabledAgents = AGENT_PERSONAS.map((a) => a.id);
  if (options.agents) {
    enabledAgents = options.agents.split(",").map((id) => id.trim());
  }
  const results = [];
  const startTime = Date.now();
  for (let i = 0; i < toProcess.length; i += parallel) {
    const batch = toProcess.slice(i, i + parallel);
    if (!options.json) {
      console.log(`
Processing batch ${Math.floor(i / parallel) + 1}/${Math.ceil(toProcess.length / parallel)}...`);
    }
    const batchResults = await Promise.all(
      batch.map((briefPath) => processBrief(briefPath, {
        cwd,
        outputDir,
        enabledAgents,
        language: options.language || "hebrew",
        timeout,
        json: options.json
      }))
    );
    results.push(...batchResults);
  }
  const endTime = Date.now();
  const totalDuration = (endTime - startTime) / 1e3;
  const successful = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  if (options.json) {
    console.log(JSON.stringify({
      summary: {
        total: results.length,
        successful,
        failed,
        skipped,
        durationSeconds: totalDuration
      },
      results
    }, null, 2));
  } else {
    console.log("\n" + "\u2550".repeat(50));
    console.log("BATCH COMPLETE");
    console.log("\u2550".repeat(50));
    console.log(`Total: ${results.length} briefs`);
    console.log(`Success: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Duration: ${totalDuration.toFixed(1)}s`);
    console.log(`Output: ${outputDir}`);
  }
  return failed > 0 ? 1 : 0;
}
async function processBrief(briefPath, opts) {
  const briefName = path7.basename(briefPath, ".md");
  const startTime = Date.now();
  if (!opts.json) {
    console.log(`  \u{1F4C4} ${briefName}...`);
  }
  try {
    const fsAdapter = new FileSystemAdapter(opts.cwd);
    const agentRunner = new CLIAgentRunner();
    const briefContent = await fs5.readFile(briefPath, "utf-8");
    const titleMatch = briefContent.match(/^#\s+(.+)$/m);
    const projectName = titleMatch ? titleMatch[1] : briefName;
    const goal = `Create content for ${projectName}`;
    const config = {
      id: uuid(),
      projectName,
      goal,
      enabledAgents: opts.enabledAgents,
      humanParticipation: false,
      // Batch mode = no human
      maxRounds: 5,
      // Shorter for batch
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path7.join(opts.cwd, "context"),
      outputDir: opts.outputDir,
      language: opts.language
    };
    const session = {
      id: config.id,
      config,
      messages: [],
      currentPhase: "initialization",
      currentRound: 0,
      decisions: [],
      drafts: [],
      startedAt: /* @__PURE__ */ new Date(),
      status: "running"
    };
    const persistence = new SessionPersistence(fsAdapter, {
      outputDir: path7.join(opts.outputDir, briefName)
    });
    await persistence.initSession(session);
    const orchestrator = new EDAOrchestrator(
      session,
      void 0,
      void 0,
      {
        agentRunner,
        fileSystem: fsAdapter
      }
    );
    orchestrator.on((event) => {
      if (event.type === "agent_message") {
        persistence.updateSession(orchestrator.getSession());
      }
    });
    const runPromise = runSession(orchestrator, briefContent);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), opts.timeout);
    });
    await Promise.race([runPromise, timeoutPromise]);
    await persistence.saveFull();
    const duration = (Date.now() - startTime) / 1e3;
    if (!opts.json) {
      console.log(`  \u2705 ${briefName} (${duration.toFixed(1)}s)`);
    }
    return {
      brief: briefName,
      status: "success",
      sessionId: session.id,
      outputDir: persistence.getSessionDir(),
      duration
    };
  } catch (error) {
    const duration = (Date.now() - startTime) / 1e3;
    if (!opts.json) {
      console.log(`  \u274C ${briefName}: ${error.message}`);
    }
    return {
      brief: briefName,
      status: "error",
      error: error.message,
      duration
    };
  }
}
async function runSession(orchestrator, briefContent) {
  orchestrator.start();
  await orchestrator.addHumanMessage(`Here is the brief:

${briefContent}`);
  return new Promise((resolve4) => {
    let checkCount = 0;
    const maxChecks = 60;
    const checkInterval = setInterval(() => {
      const session = orchestrator.getSession();
      checkCount++;
      if (session.status === "completed" || session.currentPhase === "completed" || checkCount >= maxChecks) {
        clearInterval(checkInterval);
        orchestrator.stop();
        resolve4();
      }
    }, 5e3);
  });
}
async function getProcessedBriefs(outputDir) {
  const processed = /* @__PURE__ */ new Set();
  try {
    const entries = await fs5.readdir(outputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        try {
          await fs5.access(path7.join(outputDir, entry.name, "session.json"));
          processed.add(entry.name);
        } catch {
        }
      }
    }
  } catch {
  }
  return processed;
}

// cli/commands/sessions.ts
import { Command as Command4 } from "commander";
import * as path8 from "path";
import * as fs6 from "fs/promises";
import chalk from "chalk";
function createSessionsCommand() {
  const sessions = new Command4("sessions").description("Manage saved sessions");
  sessions.command("list").alias("ls").description("List all saved sessions").option("-o, --output <dir>", "Sessions directory", "output/sessions").option("--json", "Output as JSON").option("-n, --limit <count>", "Limit number of sessions shown").action(async (options) => {
    await listSessions(options);
  });
  sessions.command("show <name>").description("Show session details").option("-o, --output <dir>", "Sessions directory", "output/sessions").option("--json", "Output as JSON").action(async (name, options) => {
    await showSession(name, options);
  });
  sessions.command("delete <name>").alias("rm").description("Delete a saved session").option("-o, --output <dir>", "Sessions directory", "output/sessions").option("--force", "Skip confirmation").action(async (name, options) => {
    await deleteSession(name, options);
  });
  sessions.command("export <name>").description("Export session to file").option("-o, --output <dir>", "Sessions directory", "output/sessions").option("-f, --format <format>", "Export format (md, json, html)", "md").option("--dest <path>", "Destination file path").action(async (name, options) => {
    await exportSession(name, options);
  });
  sessions.command("clean").description("Delete old sessions").option("-o, --output <dir>", "Sessions directory", "output/sessions").option("--days <count>", "Delete sessions older than N days", "30").option("--dry-run", "Show what would be deleted").action(async (options) => {
    await cleanSessions(options);
  });
  return sessions;
}
async function listSessions(options) {
  const cwd = process.cwd();
  const sessionsDir = path8.resolve(cwd, options.output || "output/sessions");
  try {
    const entries = await fs6.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    if (sessionDirs.length === 0) {
      if (options.json) {
        console.log(JSON.stringify({ sessions: [] }, null, 2));
      } else {
        console.log("No saved sessions found.");
      }
      return;
    }
    const sessions = [];
    for (const dir of sessionDirs) {
      const meta = await loadSessionMeta(path8.join(sessionsDir, dir.name));
      if (meta) {
        sessions.push(meta);
      }
    }
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    const limited = options.limit ? sessions.slice(0, parseInt(String(options.limit), 10)) : sessions;
    if (options.json) {
      console.log(JSON.stringify({ sessions: limited }, null, 2));
    } else {
      console.log("\n" + chalk.cyan.bold("SAVED SESSIONS"));
      console.log(chalk.dim("\u2500".repeat(60)));
      for (let i = 0; i < limited.length; i++) {
        const s = limited[i];
        const date = new Date(s.startedAt).toLocaleDateString();
        const status2 = s.status === "completed" ? chalk.green("\u2713") : chalk.yellow("\u25CF");
        console.log(`${chalk.bold(String(i + 1))}. ${status2} ${chalk.green(s.projectName)}`);
        console.log(`   ${chalk.dim(date)} \u2022 ${chalk.dim(s.goal?.slice(0, 50) || "")}`);
        console.log(`   ${chalk.dim(`Phase: ${s.currentPhase || "unknown"} \u2022 Messages: ${s.messageCount || 0}`)}`);
      }
      console.log("");
      console.log(chalk.dim(`Use 'forge sessions show <name>' for details.`));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}
async function showSession(name, options) {
  const cwd = process.cwd();
  const sessionsDir = path8.resolve(cwd, options.output || "output/sessions");
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    if (options.json) {
      console.log(JSON.stringify({ error: `Session not found: ${name}` }, null, 2));
    } else {
      console.error(`Session not found: ${name}`);
    }
    process.exit(1);
  }
  try {
    const sessionPath = path8.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs6.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path8.join(sessionDir, "messages.jsonl");
      const content = await fs6.readFile(messagesPath, "utf-8");
      messages = content.trim().split("\n").filter((l) => l).map((l) => JSON.parse(l));
    } catch {
    }
    if (options.json) {
      console.log(JSON.stringify({
        ...sessionData,
        messages,
        messageCount: messages.length
      }, null, 2));
    } else {
      console.log("\n" + chalk.cyan.bold("SESSION DETAILS"));
      console.log(chalk.dim("\u2500".repeat(60)));
      console.log(`${chalk.bold("Project:")} ${sessionData.projectName || sessionData.config?.projectName}`);
      console.log(`${chalk.bold("Goal:")} ${sessionData.goal || sessionData.config?.goal}`);
      console.log(`${chalk.bold("Started:")} ${new Date(sessionData.startedAt).toLocaleString()}`);
      console.log(`${chalk.bold("Status:")} ${sessionData.status}`);
      console.log(`${chalk.bold("Phase:")} ${sessionData.currentPhase}`);
      console.log(`${chalk.bold("Messages:")} ${messages.length}`);
      console.log(`${chalk.bold("Agents:")} ${(sessionData.config?.enabledAgents || []).join(", ")}`);
      console.log("");
      if (messages.length > 0) {
        console.log(chalk.cyan.bold("RECENT MESSAGES"));
        console.log(chalk.dim("\u2500".repeat(60)));
        const recent = messages.slice(-5);
        for (const msg of recent) {
          const sender = msg.agentId === "human" ? chalk.blue("Human") : chalk.yellow(msg.agentId);
          const preview = msg.content.slice(0, 100).replace(/\n/g, " ");
          console.log(`${sender}: ${chalk.dim(preview)}...`);
        }
        console.log("");
      }
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`Error loading session: ${error.message}`);
    }
    process.exit(1);
  }
}
async function deleteSession(name, options) {
  const cwd = process.cwd();
  const sessionsDir = path8.resolve(cwd, options.output || "output/sessions");
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }
  if (!options.force) {
    const readline3 = await import("readline");
    const rl = readline3.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const confirmed = await new Promise((resolve4) => {
      rl.question(`Delete session "${path8.basename(sessionDir)}"? [y/N]: `, (answer) => {
        rl.close();
        resolve4(answer.toLowerCase() === "y");
      });
    });
    if (!confirmed) {
      console.log("Cancelled.");
      return;
    }
  }
  try {
    await fs6.rm(sessionDir, { recursive: true });
    console.log(chalk.green(`Deleted: ${path8.basename(sessionDir)}`));
  } catch (error) {
    console.error(`Error deleting session: ${error.message}`);
    process.exit(1);
  }
}
async function exportSession(name, options) {
  const cwd = process.cwd();
  const sessionsDir = path8.resolve(cwd, options.output || "output/sessions");
  const format = options.format || "md";
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }
  try {
    const sessionPath = path8.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs6.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path8.join(sessionDir, "messages.jsonl");
      const content2 = await fs6.readFile(messagesPath, "utf-8");
      messages = content2.trim().split("\n").filter((l) => l).map((l) => JSON.parse(l));
    } catch {
    }
    let content;
    let ext;
    switch (format) {
      case "json":
        content = JSON.stringify({ ...sessionData, messages }, null, 2);
        ext = "json";
        break;
      case "html":
        content = generateHtmlExport(sessionData, messages);
        ext = "html";
        break;
      case "md":
      default:
        content = generateMarkdownExport(sessionData, messages);
        ext = "md";
        break;
    }
    const destPath = options.dest || path8.join(sessionDir, `export.${ext}`);
    await fs6.writeFile(destPath, content);
    console.log(chalk.green(`Exported to: ${destPath}`));
  } catch (error) {
    console.error(`Error exporting session: ${error.message}`);
    process.exit(1);
  }
}
async function cleanSessions(options) {
  const cwd = process.cwd();
  const sessionsDir = path8.resolve(cwd, options.output || "output/sessions");
  const days = parseInt(options.days || "30", 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1e3;
  try {
    const entries = await fs6.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const toDelete = [];
    for (const dir of sessionDirs) {
      const dirPath = path8.join(sessionsDir, dir.name);
      const meta = await loadSessionMeta(dirPath);
      if (meta && new Date(meta.startedAt).getTime() < cutoff) {
        toDelete.push(dir.name);
      }
    }
    if (toDelete.length === 0) {
      console.log("No sessions older than " + days + " days.");
      return;
    }
    console.log(`Found ${toDelete.length} sessions older than ${days} days:`);
    toDelete.forEach((name) => console.log(`  \u2022 ${name}`));
    if (options.dryRun) {
      console.log(chalk.yellow("\nDry run - no sessions deleted."));
      return;
    }
    for (const name of toDelete) {
      await fs6.rm(path8.join(sessionsDir, name), { recursive: true });
      console.log(chalk.green(`Deleted: ${name}`));
    }
    console.log(`
Deleted ${toDelete.length} sessions.`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
async function loadSessionMeta(sessionDir) {
  try {
    const sessionPath = path8.join(sessionDir, "session.json");
    const data = JSON.parse(await fs6.readFile(sessionPath, "utf-8"));
    let messageCount = 0;
    try {
      const messagesPath = path8.join(sessionDir, "messages.jsonl");
      const content = await fs6.readFile(messagesPath, "utf-8");
      messageCount = content.trim().split("\n").filter((l) => l).length;
    } catch {
    }
    return {
      id: data.id,
      projectName: data.projectName || data.config?.projectName || path8.basename(sessionDir),
      goal: data.goal || data.config?.goal,
      startedAt: data.startedAt,
      status: data.status,
      currentPhase: data.currentPhase,
      messageCount
    };
  } catch {
    return null;
  }
}
async function findSession(sessionsDir, nameOrIndex) {
  try {
    const entries = await fs6.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
    sessionDirs.sort().reverse();
    const index2 = parseInt(nameOrIndex, 10);
    if (!isNaN(index2) && index2 >= 1 && index2 <= sessionDirs.length) {
      return path8.join(sessionsDir, sessionDirs[index2 - 1]);
    }
    const match = sessionDirs.find((d) => d.includes(nameOrIndex));
    if (match) {
      return path8.join(sessionsDir, match);
    }
    return null;
  } catch {
    return null;
  }
}
function generateMarkdownExport(session, messages) {
  const lines = [];
  const projectName = session.projectName || session.config?.projectName || "Session";
  const goal = session.goal || session.config?.goal || "";
  lines.push(`# ${projectName}`);
  lines.push("");
  lines.push(`**Goal:** ${goal}`);
  lines.push(`**Date:** ${new Date(session.startedAt).toLocaleString()}`);
  lines.push(`**Status:** ${session.status}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  for (const msg of messages) {
    const sender = msg.agentId === "human" ? "Human" : msg.agentId;
    lines.push(`## ${sender}`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }
  return lines.join("\n");
}
function generateHtmlExport(session, messages) {
  const projectName = session.projectName || session.config?.projectName || "Session";
  const goal = session.goal || session.config?.goal || "";
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - Forge Session</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; }
    .meta { color: #666; margin-bottom: 20px; }
    .message { border-left: 3px solid #ddd; padding-left: 15px; margin: 20px 0; }
    .message.human { border-left-color: #4a9eff; }
    .message h3 { margin: 0 0 10px 0; color: #333; }
    .message.human h3 { color: #4a9eff; }
    .content { white-space: pre-wrap; line-height: 1.6; }
    hr { border: none; border-top: 1px solid #eee; margin: 30px 0; }
  </style>
</head>
<body>
  <h1>${projectName}</h1>
  <div class="meta">
    <p><strong>Goal:</strong> ${goal}</p>
    <p><strong>Date:</strong> ${new Date(session.startedAt).toLocaleString()}</p>
    <p><strong>Status:</strong> ${session.status}</p>
  </div>
  <hr>
`;
  for (const msg of messages) {
    const sender = msg.agentId === "human" ? "Human" : msg.agentId;
    const isHuman = msg.agentId === "human";
    html += `  <div class="message${isHuman ? " human" : ""}">
    <h3>${sender}</h3>
    <div class="content">${escapeHtml2(msg.content)}</div>
  </div>
`;
  }
  html += `</body>
</html>`;
  return html;
}
function escapeHtml2(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// cli/commands/watch.ts
import { Command as Command5 } from "commander";
import * as path9 from "path";
import * as fs7 from "fs/promises";
import { watch } from "fs";
import chalk2 from "chalk";
function createWatchCommand() {
  const watchCmd = new Command5("watch").description("Watch for file changes and trigger sessions").option("-b, --brief <path>", "Path to brief file to watch").option("-c, --context <dir>", "Context directory to watch", "context").option("-o, --output <dir>", "Output directory", "output/sessions").option("-d, --debounce <ms>", "Debounce time in milliseconds", "1000").option("-a, --agents <ids>", "Comma-separated agent IDs").option("-l, --language <lang>", "Language: hebrew, english, mixed", "hebrew").option("--json", "Output events as JSON").action(async (options) => {
    await runWatch(options);
  });
  return watchCmd;
}
async function runWatch(options) {
  const cwd = process.cwd();
  const contextDir = path9.resolve(cwd, options.context || "context");
  const debounceMs = parseInt(options.debounce || "1000", 10);
  if (options.brief) {
    try {
      await fs7.access(options.brief);
    } catch {
      console.error(chalk2.red(`Brief file not found: ${options.brief}`));
      process.exit(1);
    }
  }
  try {
    await fs7.access(contextDir);
  } catch {
    console.error(chalk2.red(`Context directory not found: ${contextDir}`));
    process.exit(1);
  }
  if (!options.json) {
    console.log("\n" + chalk2.cyan.bold("\u{1F50D} FORGE WATCH MODE"));
    console.log(chalk2.dim("\u2500".repeat(50)));
    console.log(`Context: ${contextDir}`);
    if (options.brief) {
      console.log(`Brief: ${options.brief}`);
    }
    console.log(`Debounce: ${debounceMs}ms`);
    console.log("");
    console.log(chalk2.dim("Watching for changes... (Ctrl+C to stop)"));
    console.log("");
  }
  let pendingChanges = /* @__PURE__ */ new Map();
  const handleChange = (filePath, eventType) => {
    const relativePath = path9.relative(cwd, filePath);
    const existing = pendingChanges.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(async () => {
      pendingChanges.delete(filePath);
      if (options.json) {
        console.log(JSON.stringify({
          event: "change",
          type: eventType,
          file: relativePath,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }));
      } else {
        const icon = eventType === "rename" ? "\u{1F4C4}" : "\u270F\uFE0F";
        console.log(`${icon} ${chalk2.yellow(relativePath)} changed`);
      }
      if (options.brief) {
        await triggerSession(options);
      }
    }, debounceMs);
    pendingChanges.set(filePath, timer);
  };
  const watchRecursive = async (dir) => {
    const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith(".")) {
        handleChange(path9.join(dir, filename), eventType);
      }
    });
    return watcher;
  };
  const contextWatcher = await watchRecursive(contextDir);
  let briefWatcher = null;
  if (options.brief) {
    briefWatcher = watch(options.brief, (eventType) => {
      handleChange(options.brief, eventType);
    });
  }
  const cleanup = () => {
    if (!options.json) {
      console.log("\n" + chalk2.dim("Stopping watch..."));
    }
    contextWatcher.close();
    if (briefWatcher) {
      briefWatcher.close();
    }
    pendingChanges.forEach((timer) => clearTimeout(timer));
    process.exit(0);
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
  await new Promise(() => {
  });
}
async function triggerSession(options) {
  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);
  const args = [
    "start",
    options.brief ? `--brief ${options.brief}` : "",
    options.agents ? `--agents ${options.agents}` : "",
    options.language ? `--language ${options.language}` : "",
    options.output ? `--output ${options.output}` : "",
    "--no-human"
    // Automated mode
  ].filter(Boolean).join(" ");
  if (options.json) {
    console.log(JSON.stringify({
      event: "trigger",
      command: `forge ${args}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
  } else {
    console.log(chalk2.cyan("  \u2192 Triggering new session..."));
  }
  try {
    const { stdout, stderr } = await execAsync(`npx tsx cli/index.ts ${args}`, {
      cwd: process.cwd(),
      timeout: 5 * 60 * 1e3
      // 5 minute timeout
    });
    if (stdout && !options.json) {
      console.log(chalk2.dim(stdout));
    }
  } catch (error) {
    if (options.json) {
      console.log(JSON.stringify({
        event: "error",
        message: error.message,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }));
    } else {
      console.error(chalk2.red(`  \u2717 Session failed: ${error.message}`));
    }
  }
}

// cli/commands/completions.ts
import { Command as Command6 } from "commander";
import chalk3 from "chalk";
function createCompletionsCommand() {
  const completions = new Command6("completions").description("Generate shell completions").argument("<shell>", "Shell type: bash, zsh, or fish").action((shell) => {
    const shellLower = shell.toLowerCase();
    switch (shellLower) {
      case "bash":
        console.log(generateBashCompletions());
        break;
      case "zsh":
        console.log(generateZshCompletions());
        break;
      case "fish":
        console.log(generateFishCompletions());
        break;
      default:
        console.error(chalk3.red(`Unknown shell: ${shell}`));
        console.error("Supported shells: bash, zsh, fish");
        console.error("");
        console.error("Installation:");
        console.error("  bash: forge completions bash >> ~/.bashrc");
        console.error("  zsh:  forge completions zsh >> ~/.zshrc");
        console.error("  fish: forge completions fish > ~/.config/fish/completions/forge.fish");
        process.exit(1);
    }
  });
  return completions;
}
function generateBashCompletions() {
  return `# Forge CLI bash completions
# Add to ~/.bashrc: source <(forge completions bash)

_forge_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="start briefs agents personas sessions batch watch export completions help"
    local sessions_commands="list ls show delete rm export clean"
    local personas_commands="list generate export import test"
    
    case "\${COMP_CWORD}" in
        1)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
        2)
            case "\${prev}" in
                sessions)
                    COMPREPLY=( $(compgen -W "\${sessions_commands}" -- "\${cur}") )
                    ;;
                personas)
                    COMPREPLY=( $(compgen -W "\${personas_commands}" -- "\${cur}") )
                    ;;
                export)
                    COMPREPLY=( $(compgen -W "md json html pdf docx" -- "\${cur}") )
                    ;;
                completions)
                    COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
                    ;;
                start)
                    COMPREPLY=( $(compgen -W "-b --brief -p --project -g --goal -a --agents --personas -l --language --human --no-human -o --output" -- "\${cur}") )
                    ;;
                batch)
                    COMPREPLY=( $(compgen -f -X '!*.md' -- "\${cur}") $(compgen -W "-p --parallel -o --output -a --agents -l --language --json --dry-run --resume --timeout" -- "\${cur}") )
                    ;;
                watch)
                    COMPREPLY=( $(compgen -W "-b --brief -c --context -o --output -d --debounce -a --agents -l --language --json" -- "\${cur}") )
                    ;;
            esac
            ;;
        *)
            case "\${words[1]}" in
                start)
                    case "\${prev}" in
                        -b|--brief)
                            COMPREPLY=( $(compgen -f -X '!*.md' -- "\${cur}") )
                            ;;
                        -l|--language)
                            COMPREPLY=( $(compgen -W "hebrew english mixed" -- "\${cur}") )
                            ;;
                        *)
                            COMPREPLY=( $(compgen -W "-b --brief -p --project -g --goal -a --agents --personas -l --language --human --no-human -o --output" -- "\${cur}") )
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

complete -F _forge_completions forge
`;
}
function generateZshCompletions() {
  return `#compdef forge

# Forge CLI zsh completions
# Add to ~/.zshrc: source <(forge completions zsh)

_forge() {
    local -a commands
    local -a sessions_commands
    local -a personas_commands

    commands=(
        'start:Start a new debate session'
        'briefs:List available briefs'
        'agents:List available agents'
        'personas:Manage custom personas'
        'sessions:Manage saved sessions'
        'batch:Process multiple briefs in batch mode'
        'watch:Watch for file changes'
        'export:Export session'
        'completions:Generate shell completions'
        'help:Show help'
    )

    sessions_commands=(
        'list:List all saved sessions'
        'ls:List all saved sessions'
        'show:Show session details'
        'delete:Delete a saved session'
        'rm:Delete a saved session'
        'export:Export session to file'
        'clean:Delete old sessions'
    )

    personas_commands=(
        'list:List available personas'
        'generate:Generate new personas'
        'export:Export personas to file'
        'import:Import personas from file'
        'test:Test a persona'
    )

    case $state in
        (command)
            _describe -t commands 'forge commands' commands
            ;;
    esac

    case "$words[2]" in
        sessions)
            _describe -t commands 'sessions commands' sessions_commands
            ;;
        personas)
            _describe -t commands 'personas commands' personas_commands
            ;;
        completions)
            _values 'shell' bash zsh fish
            ;;
        start)
            _arguments \\
                '-b[Brief file]:brief:_files -g "*.md"' \\
                '--brief[Brief file]:brief:_files -g "*.md"' \\
                '-p[Project name]:project:' \\
                '--project[Project name]:project:' \\
                '-g[Project goal]:goal:' \\
                '--goal[Project goal]:goal:' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '--personas[Persona set]:personas:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--human[Enable human participation]' \\
                '--no-human[Disable human participation]' \\
                '-o[Output directory]:output:_directories'
            ;;
        batch)
            _arguments \\
                '*:brief pattern:_files -g "*.md"' \\
                '-p[Parallel count]:parallel:' \\
                '--parallel[Parallel count]:parallel:' \\
                '-o[Output directory]:output:_directories' \\
                '--output[Output directory]:output:_directories' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--json[JSON output]' \\
                '--dry-run[Dry run]' \\
                '--resume[Skip processed]' \\
                '--timeout[Timeout in minutes]:timeout:'
            ;;
        watch)
            _arguments \\
                '-b[Brief file]:brief:_files -g "*.md"' \\
                '--brief[Brief file]:brief:_files -g "*.md"' \\
                '-c[Context directory]:context:_directories' \\
                '--context[Context directory]:context:_directories' \\
                '-o[Output directory]:output:_directories' \\
                '--output[Output directory]:output:_directories' \\
                '-d[Debounce ms]:debounce:' \\
                '--debounce[Debounce ms]:debounce:' \\
                '-a[Agent IDs]:agents:' \\
                '--agents[Agent IDs]:agents:' \\
                '-l[Language]:language:(hebrew english mixed)' \\
                '--language[Language]:language:(hebrew english mixed)' \\
                '--json[JSON output]'
            ;;
    esac
}

_forge "$@"
`;
}
function generateFishCompletions() {
  return `# Forge CLI fish completions
# Save to: ~/.config/fish/completions/forge.fish

# Disable file completion by default
complete -c forge -f

# Main commands
complete -c forge -n __fish_use_subcommand -a start -d 'Start a new debate session'
complete -c forge -n __fish_use_subcommand -a briefs -d 'List available briefs'
complete -c forge -n __fish_use_subcommand -a agents -d 'List available agents'
complete -c forge -n __fish_use_subcommand -a personas -d 'Manage custom personas'
complete -c forge -n __fish_use_subcommand -a sessions -d 'Manage saved sessions'
complete -c forge -n __fish_use_subcommand -a batch -d 'Process multiple briefs in batch mode'
complete -c forge -n __fish_use_subcommand -a watch -d 'Watch for file changes'
complete -c forge -n __fish_use_subcommand -a export -d 'Export session'
complete -c forge -n __fish_use_subcommand -a completions -d 'Generate shell completions'
complete -c forge -n __fish_use_subcommand -a help -d 'Show help'

# sessions subcommands
complete -c forge -n '__fish_seen_subcommand_from sessions' -a list -d 'List all saved sessions'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a ls -d 'List all saved sessions'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a show -d 'Show session details'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a delete -d 'Delete a saved session'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a rm -d 'Delete a saved session'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a export -d 'Export session to file'
complete -c forge -n '__fish_seen_subcommand_from sessions' -a clean -d 'Delete old sessions'

# personas subcommands
complete -c forge -n '__fish_seen_subcommand_from personas' -a list -d 'List available personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a generate -d 'Generate new personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a export -d 'Export personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a import -d 'Import personas'
complete -c forge -n '__fish_seen_subcommand_from personas' -a test -d 'Test a persona'

# completions subcommand
complete -c forge -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish'

# start command options
complete -c forge -n '__fish_seen_subcommand_from start' -s b -l brief -d 'Brief file' -r -F
complete -c forge -n '__fish_seen_subcommand_from start' -s p -l project -d 'Project name' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s g -l goal -d 'Project goal' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from start' -l personas -d 'Persona set' -r
complete -c forge -n '__fish_seen_subcommand_from start' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from start' -l human -d 'Enable human participation'
complete -c forge -n '__fish_seen_subcommand_from start' -l no-human -d 'Disable human participation'
complete -c forge -n '__fish_seen_subcommand_from start' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'

# batch command options
complete -c forge -n '__fish_seen_subcommand_from batch' -s p -l parallel -d 'Parallel count' -r
complete -c forge -n '__fish_seen_subcommand_from batch' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from batch' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from batch' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l json -d 'JSON output'
complete -c forge -n '__fish_seen_subcommand_from batch' -l dry-run -d 'Show what would be processed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l resume -d 'Skip already processed'
complete -c forge -n '__fish_seen_subcommand_from batch' -l timeout -d 'Timeout per brief in minutes' -r

# watch command options
complete -c forge -n '__fish_seen_subcommand_from watch' -s b -l brief -d 'Brief file' -r -F
complete -c forge -n '__fish_seen_subcommand_from watch' -s c -l context -d 'Context directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from watch' -s o -l output -d 'Output directory' -r -a '(__fish_complete_directories)'
complete -c forge -n '__fish_seen_subcommand_from watch' -s d -l debounce -d 'Debounce time in ms' -r
complete -c forge -n '__fish_seen_subcommand_from watch' -s a -l agents -d 'Agent IDs' -r
complete -c forge -n '__fish_seen_subcommand_from watch' -s l -l language -d 'Language' -r -a 'hebrew english mixed'
complete -c forge -n '__fish_seen_subcommand_from watch' -l json -d 'JSON output'
`;
}

// cli/commands/config.ts
import { Command as Command7 } from "commander";
import * as path10 from "path";
import * as fs8 from "fs/promises";
import chalk4 from "chalk";
var CONFIG_FILENAME = ".forgerc.json";
var CONFIG_KEYS = [
  "apiKey",
  "defaultLanguage",
  "defaultAgents",
  "outputDir",
  "contextDir",
  "maxRounds",
  "consensusThreshold",
  "theme"
];
function createConfigCommand() {
  const config = new Command7("config").description("Manage Forge configuration");
  config.command("list").alias("ls").description("List all configuration values").option("-g, --global", "Show global config only").option("--json", "Output as JSON").action(async (options) => {
    await listConfig(options);
  });
  config.command("get <key>").description("Get a configuration value").option("-g, --global", "Get from global config").option("--json", "Output as JSON").action(async (key, options) => {
    await getConfig(key, options);
  });
  config.command("set <key> <value>").description("Set a configuration value").option("-g, --global", "Set in global config").action(async (key, value, options) => {
    await setConfig(key, value, options);
  });
  config.command("unset <key>").alias("rm").description("Remove a configuration value").option("-g, --global", "Remove from global config").action(async (key, options) => {
    await unsetConfig(key, options);
  });
  config.command("edit").description("Open config file in editor").option("-g, --global", "Edit global config").action(async (options) => {
    await editConfig(options);
  });
  config.command("path").description("Show config file path").option("-g, --global", "Show global config path").action((options) => {
    const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
    console.log(configPath);
  });
  config.command("init").description("Create a config file with defaults").option("-g, --global", "Create global config").option("--force", "Overwrite existing config").action(async (options) => {
    await initConfig(options);
  });
  return config;
}
function getGlobalConfigPath() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path10.join(home, CONFIG_FILENAME);
}
function getLocalConfigPath() {
  return path10.join(process.cwd(), CONFIG_FILENAME);
}
async function loadConfig(configPath) {
  try {
    const content = await fs8.readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
async function saveConfig(configPath, config) {
  await fs8.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
}
async function getMergedConfig() {
  const globalPath = getGlobalConfigPath();
  const localPath = getLocalConfigPath();
  const globalConfig = await loadConfig(globalPath);
  const localConfig = await loadConfig(localPath);
  const sources = {};
  const merged = {};
  for (const key of CONFIG_KEYS) {
    if (globalConfig[key] !== void 0) {
      merged[key] = globalConfig[key];
      sources[key] = "global";
    }
    if (localConfig[key] !== void 0) {
      merged[key] = localConfig[key];
      sources[key] = "local";
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    merged.apiKey = process.env.ANTHROPIC_API_KEY;
    sources.apiKey = "env";
  }
  if (process.env.CLAUDE_API_KEY && !merged.apiKey) {
    merged.apiKey = process.env.CLAUDE_API_KEY;
    sources.apiKey = "env";
  }
  return { config: merged, sources };
}
async function listConfig(options) {
  if (options.global) {
    const globalPath = getGlobalConfigPath();
    const config2 = await loadConfig(globalPath);
    if (options.json) {
      console.log(JSON.stringify(config2, null, 2));
    } else {
      console.log("\n" + chalk4.cyan.bold("GLOBAL CONFIGURATION"));
      console.log(chalk4.dim(`Path: ${globalPath}`));
      console.log(chalk4.dim("\u2500".repeat(50)));
      displayConfig(config2);
    }
    return;
  }
  const { config, sources } = await getMergedConfig();
  if (options.json) {
    console.log(JSON.stringify({ config, sources }, null, 2));
  } else {
    console.log("\n" + chalk4.cyan.bold("FORGE CONFIGURATION"));
    console.log(chalk4.dim("\u2500".repeat(50)));
    displayConfigWithSources(config, sources);
  }
}
function displayConfig(config) {
  for (const key of CONFIG_KEYS) {
    const value = config[key];
    if (value !== void 0) {
      const displayValue = key === "apiKey" && typeof value === "string" ? maskApiKey(value) : JSON.stringify(value);
      console.log(`${chalk4.bold(key)}: ${displayValue}`);
    }
  }
  console.log("");
}
function displayConfigWithSources(config, sources) {
  for (const key of CONFIG_KEYS) {
    const value = config[key];
    if (value !== void 0) {
      const displayValue = key === "apiKey" && typeof value === "string" ? maskApiKey(value) : JSON.stringify(value);
      const source = sources[key];
      const sourceColor = source === "env" ? chalk4.yellow : source === "local" ? chalk4.green : chalk4.blue;
      console.log(`${chalk4.bold(key)}: ${displayValue} ${sourceColor(`(${source})`)}`);
    }
  }
  console.log("");
  console.log(chalk4.dim("Sources: ") + chalk4.yellow("env") + " | " + chalk4.green("local") + " | " + chalk4.blue("global"));
  console.log("");
}
function maskApiKey(key) {
  if (key.length <= 10) return "***";
  return key.slice(0, 8) + "..." + key.slice(-4);
}
async function getConfig(key, options) {
  if (!CONFIG_KEYS.includes(key)) {
    console.error(chalk4.red(`Unknown config key: ${key}`));
    console.error(`Valid keys: ${CONFIG_KEYS.join(", ")}`);
    process.exit(1);
  }
  const { config, sources } = await getMergedConfig();
  const value = config[key];
  if (value === void 0) {
    if (!options.json) {
      console.log(chalk4.dim("(not set)"));
    }
    return;
  }
  if (options.json) {
    console.log(JSON.stringify({ key, value, source: sources[key] }, null, 2));
  } else {
    const displayValue = key === "apiKey" && typeof value === "string" ? maskApiKey(value) : JSON.stringify(value);
    console.log(displayValue);
  }
}
async function setConfig(key, value, options) {
  if (!CONFIG_KEYS.includes(key)) {
    console.error(chalk4.red(`Unknown config key: ${key}`));
    console.error(`Valid keys: ${CONFIG_KEYS.join(", ")}`);
    process.exit(1);
  }
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  const config = await loadConfig(configPath);
  let parsedValue = value;
  if (key === "defaultAgents") {
    parsedValue = value.split(",").map((s) => s.trim());
  } else if (key === "maxRounds") {
    parsedValue = parseInt(value, 10);
  } else if (key === "consensusThreshold") {
    parsedValue = parseFloat(value);
  }
  config[key] = parsedValue;
  await saveConfig(configPath, config);
  console.log(chalk4.green(`Set ${key} = ${JSON.stringify(parsedValue)}`));
}
async function unsetConfig(key, options) {
  if (!CONFIG_KEYS.includes(key)) {
    console.error(chalk4.red(`Unknown config key: ${key}`));
    process.exit(1);
  }
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  const config = await loadConfig(configPath);
  if (config[key] === void 0) {
    console.log(chalk4.dim(`${key} is not set`));
    return;
  }
  delete config[key];
  await saveConfig(configPath, config);
  console.log(chalk4.green(`Removed ${key}`));
}
async function editConfig(options) {
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  try {
    await fs8.access(configPath);
  } catch {
    await saveConfig(configPath, {});
  }
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";
  const { spawn } = await import("child_process");
  console.log(`Opening ${configPath} with ${editor}...`);
  const child = spawn(editor, [configPath], {
    stdio: "inherit"
  });
  child.on("exit", (code) => {
    if (code !== 0) {
      console.error(chalk4.red(`Editor exited with code ${code}`));
    }
  });
}
async function initConfig(options) {
  const configPath = options.global ? getGlobalConfigPath() : getLocalConfigPath();
  try {
    await fs8.access(configPath);
    if (!options.force) {
      console.error(chalk4.yellow(`Config already exists: ${configPath}`));
      console.error("Use --force to overwrite.");
      return;
    }
  } catch {
  }
  const defaultConfig = {
    defaultLanguage: "hebrew",
    outputDir: "output/sessions",
    contextDir: "context",
    maxRounds: 10,
    consensusThreshold: 0.6,
    theme: "auto"
  };
  await saveConfig(configPath, defaultConfig);
  console.log(chalk4.green(`Created config: ${configPath}`));
}

// cli/commands/login.ts
init_session();
init_auth_bridge();
init_core();
init_theme();
import { Command as Command8 } from "commander";
import * as readline from "readline";

// src/lib/render/progress.ts
init_theme();
var attestationDots = (count, max = 5) => {
  const filled = Math.min(count, max);
  const empty = max - filled;
  return style(forgeTheme.consensus.agree, "\u25CF".repeat(filled)) + style(forgeTheme.text.muted, "\u25CB".repeat(empty));
};

// cli/commands/login.ts
var repo = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);
var ask = (question) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve4) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve4(answer.trim());
    });
  });
};
var printIdentity = (state) => {
  console.log("");
  console.log(style(forgeTheme.heading.h1, "  Your Forge Identity"));
  console.log("");
  console.log(`  DID: ${style(forgeTheme.text.link, state.did)}`);
  console.log(`  Attestations: ${attestationDots(state.attestations.length)}`);
  if (state.attestations.length > 0) {
    for (const a of state.attestations) {
      console.log(`    ${style(forgeTheme.status.success, "\u2714")} ${a.platform}: ${style(forgeTheme.text.muted, a.handle)}`);
    }
  }
  console.log("");
};
var createLoginCommand = () => {
  const cmd = new Command8("login").description("Create or restore your decentralized DID identity").option("--new", "Force create a new identity (replaces existing)").action(async (opts) => {
    if (!opts.new) {
      const restoreResult = await repo.restoreSession();
      const restored = restoreResult.match(
        (s) => s,
        () => null
      );
      if (restored) {
        console.log(style(forgeTheme.status.success, "\u2714 Session restored"));
        printIdentity(restored);
        return;
      }
    }
    console.log(style(forgeTheme.status.info, "  Creating new did:key identity\u2026"));
    const createResult = await repo.createIdentity();
    const state = createResult.match(
      (s) => s,
      (err2) => {
        console.error(style(forgeTheme.status.error, `\u2718 Failed: ${err2.message}`));
        return null;
      }
    );
    if (!state) return;
    console.log(style(forgeTheme.status.success, "\u2714 Identity created"));
    printIdentity(state);
    const wantAttestation = await ask(
      `  Add public profile evidence? ${style(forgeTheme.text.muted, "(mastodon/github/bluesky or skip)")}: `
    );
    if (wantAttestation && wantAttestation !== "skip" && wantAttestation !== "n") {
      const platforms = ["mastodon", "github", "bluesky"];
      let platform = null;
      for (const p of platforms) {
        if (wantAttestation.toLowerCase().includes(p)) {
          platform = p;
          break;
        }
      }
      if (!platform) {
        if (wantAttestation.includes("@") && wantAttestation.split("@").length >= 2) {
          platform = "mastodon";
        } else if (wantAttestation.includes(".bsky.")) {
          platform = "bluesky";
        } else {
          platform = "github";
        }
      }
      const handle = await ask(`  ${platform} handle: `);
      if (handle) {
        console.log(style(forgeTheme.text.muted, `  Fetching ${platform} signals\u2026`));
        const attestResult = await repo.addAttestation(platform, handle);
        attestResult.match(
          (updated) => {
            console.log(style(forgeTheme.status.success, `  \u2714 ${platform} attestation added`));
            printIdentity(updated);
          },
          (err2) => {
            console.log(style(forgeTheme.status.error, `  \u2718 ${err2.message}`));
            printIdentity(state);
          }
        );
      }
    }
  });
  cmd.addCommand(
    new Command8("status").description("Show current identity status").action(async () => {
      const result = await repo.restoreSession();
      result.match(
        (s) => {
          if (s) {
            printIdentity(s);
          } else {
            console.log(style(forgeTheme.text.muted, "  No identity found. Run: forge login"));
          }
        },
        (err2) => {
          console.error(style(forgeTheme.status.error, `  \u2718 ${err2.message}`));
        }
      );
    })
  );
  cmd.addCommand(
    new Command8("logout").description("Remove stored identity").action(async () => {
      await repo.logout();
      console.log(style(forgeTheme.status.success, "  \u2714 Identity cleared"));
    })
  );
  return cmd;
};

// cli/commands/community.ts
init_session();
init_auth_bridge();
init_core();
init_p2p_direct();
import { Command as Command9 } from "commander";
import * as readline2 from "readline";

// cli/adapters/services.ts
init_auth_bridge();
init_p2p_direct();
init_connections_direct();
import * as path15 from "path";
var started = false;
async function ensureServices() {
  if (started) return;
  started = true;
  const p2pDataDir = path15.join(forgeDataDir, "p2p");
  try {
    const { peerId } = await startP2P(p2pDataDir);
    console.log(`\x1B[2m[p2p] peer: ${peerId.slice(0, 12)}\u2026\x1B[0m`);
  } catch (err2) {
    console.error(`\x1B[2m[p2p] failed to start: ${err2.message}\x1B[0m`);
  }
  try {
    await startConnections(forgeDataDir);
  } catch (err2) {
    console.error(`\x1B[2m[connections] failed to start: ${err2.message}\x1B[0m`);
  }
}
async function shutdownServices() {
  if (!started) return;
  try {
    await stopConnections();
  } catch {
  }
  try {
    await stopP2P();
  } catch {
  }
}

// src/lib/community/types.ts
var CONTRIBUTION_SCHEMA_VERSION = 1;

// cli/commands/community.ts
init_theme();

// src/lib/render/consensus.ts
init_theme();
var voteTally = (up, down) => {
  const upStr = style(forgeTheme.consensus.agree, `\u25B2${up}`);
  const downStr = style(forgeTheme.consensus.disagree, `\u25BC${down}`);
  return `${upStr} ${downStr}`;
};

// cli/commands/community.ts
var repo2 = createSessionRepository(
  () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
);
var isContribution = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload;
  return typeof p.kind === "string" && typeof p.v === "number" && typeof p.title === "string" && ["persona", "insight", "template", "prompt"].includes(p.kind) && typeof p.content === "object";
};
var isReaction = (payload) => {
  if (!payload || typeof payload !== "object") return false;
  const p = payload;
  return p.kind === "reaction" && typeof p.targetId === "string";
};
var shortenDid = (did) => did.length > 24 ? `${did.slice(0, 12)}\u2026${did.slice(-8)}` : did;
var ask2 = (question) => {
  const rl = readline2.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve4) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve4(answer.trim());
    });
  });
};
var createCommunityCommand = () => {
  const cmd = new Command9("community").description("Browse and publish community contributions (P2P)");
  cmd.addCommand(
    new Command9("list").description("List contributions from connected peers").option("-k, --kind <kind>", "Filter by kind (persona|insight|template|prompt)").action(async (opts) => {
      await ensureServices();
      const result = await fetchAll();
      result.match(
        (docs2) => {
          const contribs = docs2.filter((d) => isContribution(d.payload));
          const reactions = docs2.filter((d) => isReaction(d.payload));
          const filtered = opts.kind ? contribs.filter((c) => c.payload.kind === opts.kind) : contribs;
          if (filtered.length === 0) {
            console.log(style(forgeTheme.text.muted, "\n  No contributions found. Be the first: forge community publish\n"));
            return;
          }
          console.log(style(forgeTheme.heading.h1, `
  Community Feed (${filtered.length} contributions)
`));
          for (const c of filtered) {
            const up = reactions.filter(
              (r) => isReaction(r.payload) && r.payload.targetId === c.id && r.payload.vote === "up"
            ).length;
            const down = reactions.filter(
              (r) => isReaction(r.payload) && r.payload.targetId === c.id && r.payload.vote === "down"
            ).length;
            const kindColor = {
              persona: forgeTheme.text.emphasis,
              insight: forgeTheme.status.success,
              template: forgeTheme.status.warning,
              prompt: forgeTheme.status.info
            };
            console.log(
              `  ${style(kindColor[c.payload.kind] ?? forgeTheme.text.primary, `[${c.payload.kind.toUpperCase()}]`)} ${style(forgeTheme.bold, c.payload.title)}  ${voteTally(up, down)}`
            );
            console.log(`  ${style(forgeTheme.text.muted, c.payload.description)}`);
            console.log(`  ${style(forgeTheme.text.muted, `by ${shortenDid(c.did)} \xB7 ${c.id.slice(0, 8)}`)}`);
            console.log("");
          }
        },
        (err2) => {
          console.error(style(forgeTheme.status.error, `  \u2718 ${err2.message}`));
        }
      );
    })
  );
  cmd.addCommand(
    new Command9("publish").description("Publish a new contribution").requiredOption("-k, --kind <kind>", "Contribution kind (persona|insight|template|prompt)").requiredOption("-t, --title <title>", "Title").requiredOption("-d, --description <desc>", "One-line description").option("-b, --body <body>", "Body content (or will prompt)").option("--tags <tags>", "Comma-separated tags").action(async (opts) => {
      await ensureServices();
      const session = await repo2.restoreSession();
      const authState = session.match((s) => s, () => null);
      if (!authState) {
        console.error(style(forgeTheme.status.error, "  \u2718 Not logged in. Run: forge login"));
        return;
      }
      const keypair = repo2.getCurrentKeypair();
      if (!keypair) {
        console.error(style(forgeTheme.status.error, "  \u2718 No keypair loaded"));
        return;
      }
      const body = opts.body || await ask2("  Body: ");
      const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()) : [];
      const kind = opts.kind;
      let content;
      switch (kind) {
        case "persona":
          content = {
            id: opts.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: opts.title,
            role: opts.description,
            background: body,
            personality: []
          };
          break;
        case "insight":
          content = { body };
          break;
        case "template":
          content = { mode: "custom", goal: body, personaIds: [] };
          break;
        case "prompt":
          content = { body };
          break;
        default:
          console.error(style(forgeTheme.status.error, `  \u2718 Unknown kind: ${kind}`));
          return;
      }
      const payload = {
        v: CONTRIBUTION_SCHEMA_VERSION,
        kind,
        title: opts.title,
        description: opts.description,
        tags,
        content
      };
      const result = await publish(keypair, { payload });
      result.match(
        ({ id }) => {
          console.log(style(forgeTheme.status.success, `  \u2714 Published: ${id.slice(0, 12)}\u2026`));
        },
        (err2) => {
          console.error(style(forgeTheme.status.error, `  \u2718 ${err2.message}`));
        }
      );
    })
  );
  cmd.addCommand(
    new Command9("vote").description("Upvote or downvote a contribution").argument("<id>", "Contribution ID (or prefix)").option("--down", "Downvote instead of upvote").action(async (idOrPrefix, opts) => {
      await ensureServices();
      const session = await repo2.restoreSession();
      const authState = session.match((s) => s, () => null);
      if (!authState) {
        console.error(style(forgeTheme.status.error, "  \u2718 Not logged in. Run: forge login"));
        return;
      }
      const keypair = repo2.getCurrentKeypair();
      if (!keypair) return;
      const allResult = await fetchAll();
      const resolvedId = allResult.match(
        (docs2) => {
          const match = docs2.find(
            (d) => isContribution(d.payload) && d.id.startsWith(idOrPrefix)
          );
          return match?.id ?? null;
        },
        () => null
      );
      if (!resolvedId) {
        console.error(style(forgeTheme.status.error, `  \u2718 No contribution matches "${idOrPrefix}"`));
        return;
      }
      const vote = opts.down ? "down" : "up";
      const reaction = {
        v: CONTRIBUTION_SCHEMA_VERSION,
        kind: "reaction",
        targetId: resolvedId,
        vote
      };
      const voteId = `vote:${keypair.did}:${resolvedId}`;
      const result = await publish(keypair, { payload: reaction, id: voteId });
      result.match(
        () => console.log(style(forgeTheme.status.success, `  \u2714 ${vote === "up" ? "\u25B2" : "\u25BC"} Vote cast on ${resolvedId.slice(0, 12)}\u2026`)),
        (err2) => console.error(style(forgeTheme.status.error, `  \u2718 ${err2.message}`))
      );
    })
  );
  return cmd;
};

// cli/index.ts
init_auth_bridge();
init_session();
init_core();
init_theme();
var RESET2 = forgeTheme.reset;
var BOLD = forgeTheme.bold;
var DIM = forgeTheme.dim;
var GREEN = forgeTheme.status.success;
var YELLOW = forgeTheme.status.warning;
var CYAN = forgeTheme.status.info;
var RED = forgeTheme.status.error;
var MAGENTA = forgeTheme.text.emphasis;
var program = new Command10();
program.name("forge").description("Multi-agent deliberation engine - reach consensus through structured debate").version("1.0.0");
program.command("start").description("Start a new debate session").option("-b, --brief <name>", "Brief name to load (from briefs/ directory)").option("-p, --project <name>", "Project name", "New Project").option("-g, --goal <goal>", "Project goal").option("-a, --agents <ids>", "Comma-separated agent IDs (from default or custom personas)").option("-m, --mode <mode>", "Deliberation mode: copywrite, idea-validation, ideation, will-it-work, site-survey, business-plan, gtm-strategy, custom", "copywrite").option("--personas <name>", "Use custom persona set (from personas/ directory)").option("-l, --language <lang>", "Language: hebrew, english, mixed", "hebrew").option("--human", "Enable human participation", true).option("--no-human", "Disable human participation").option("-o, --output <dir>", "Output directory for sessions", "output/sessions").action(async (options) => {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = process.env.ANTHROPIC_API_KEY ? new CLIAgentRunner() : new ClaudeCodeCLIRunner();
  let briefContent = "";
  let projectName = options.project;
  let goal = options.goal || "";
  if (options.brief) {
    const brief = await fsAdapter.readBrief(options.brief);
    if (brief) {
      briefContent = brief;
      const titleMatch = brief.match(/^#\s+(.+)$/m);
      if (titleMatch && projectName === "New Project") {
        projectName = titleMatch[1];
      }
      if (!goal) {
        goal = `Create website copy for ${projectName}`;
      }
    } else {
      console.error(`Brief "${options.brief}" not found in briefs/ directory`);
      process.exit(1);
    }
  }
  if (!goal) {
    goal = `Debate and reach consensus on: ${projectName}`;
  }
  let availablePersonas = AGENT_PERSONAS;
  let domainSkills;
  let personaSetName = options.personas || null;
  if (personaSetName && availablePersonas === AGENT_PERSONAS) {
    const personasPath = path18.join(cwd, "personas", `${personaSetName}.json`);
    try {
      const content = await fs13.readFile(personasPath, "utf-8");
      availablePersonas = JSON.parse(content);
    } catch {
      console.error(`Persona set "${personaSetName}" not found in personas/ directory`);
      process.exit(1);
    }
  }
  if (personaSetName) {
    const skillsPath = path18.join(cwd, "personas", `${personaSetName}.skills.md`);
    try {
      domainSkills = await fs13.readFile(skillsPath, "utf-8");
      console.log(`\u{1F4DA} Loaded domain expertise: ${personaSetName}.skills.md`);
    } catch {
    }
  }
  let validAgents = [];
  if (options.agents) {
    const enabledAgents = options.agents.split(",").map((id) => id.trim());
    validAgents = enabledAgents.filter(
      (id) => availablePersonas.some((a) => a.id === id)
    );
    if (validAgents.length === 0) {
      console.error("No valid agents specified. Available agents:");
      availablePersonas.forEach((a) => console.error(`  - ${a.id}: ${a.name} (${a.role})`));
      process.exit(1);
    }
  } else {
    validAgents = availablePersonas.map((a) => a.id);
  }
  if (personaSetName) {
    registerCustomPersonas(availablePersonas);
  } else {
    clearCustomPersonas();
  }
  const config = {
    id: uuid3(),
    projectName,
    goal,
    enabledAgents: validAgents,
    humanParticipation: options.human,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path18.join(cwd, "context"),
    outputDir: options.output,
    language: options.language,
    mode: options.mode
  };
  const session = {
    id: config.id,
    config,
    messages: [],
    currentPhase: "initialization",
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: /* @__PURE__ */ new Date(),
    status: "running"
  };
  const persistence = new SessionPersistence(fsAdapter, {
    outputDir: options.output
  });
  await persistence.initSession(session);
  const orchestrator = new EDAOrchestrator(
    session,
    void 0,
    // context
    domainSkills,
    // domain-specific skills (or undefined for default copywriting)
    {
      agentRunner,
      fileSystem: fsAdapter,
      autoRunPhaseMachine: !options.human
    }
  );
  orchestrator.on((event) => {
    if (event.type === "agent_message") {
      persistence.updateSession(orchestrator.getSession());
    }
  });
  const authRepo2 = createSessionRepository(
    () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
  );
  const authResult = await authRepo2.restoreSession();
  const authState = authResult.match((s) => s, () => null);
  if (!authState) {
    console.log(`${CYAN}  Creating Forge identity (did:key)\u2026${RESET2}`);
    const createResult = await authRepo2.createIdentity();
    createResult.match(
      (s) => console.log(`${GREEN}  \u2714 Identity: ${s.did.slice(0, 24)}\u2026${RESET2}`),
      (err2) => console.log(`${YELLOW}  \u26A0 Identity creation failed: ${err2.message}${RESET2}`)
    );
  } else {
    console.log(`${GREEN}  \u2714 Identity: ${authState.did.slice(0, 24)}\u2026${RESET2}`);
  }
  const { captureConsoleToFile: captureConsoleToFile2 } = await Promise.resolve().then(() => (init_console_capture(), console_capture_exports));
  const captured = captureConsoleToFile2(persistence.getSessionDir());
  const { Shell: Shell2 } = await Promise.resolve().then(() => (init_Shell(), Shell_exports));
  const { waitUntilExit } = render(
    React8.createElement(Shell2, {
      did: null,
      sessionCount: 0,
      initialWizardSeed: null,
      prebuiltApp: { session, orchestrator, persistence },
      onExit: async () => {
        await persistence.saveFull();
        clearCustomPersonas();
      }
    }),
    { patchConsole: false }
  );
  await waitUntilExit();
  captured.restore();
  console.log(`
\u2705 Session saved to ${persistence.getSessionDir()}`);
  console.log(`   Debug log: ${captured.logPath}`);
});
program.command("briefs").description("List available briefs").action(async () => {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const briefs = await fsAdapter.listBriefs();
  if (briefs.length === 0) {
    console.log("No briefs found in briefs/ directory");
    console.log("Create a .md file in the briefs/ directory to get started.");
    return;
  }
  console.log("Available briefs:\n");
  for (const brief of briefs) {
    const content = await fsAdapter.readBrief(brief);
    const firstLine = content?.split("\n")[0] || "";
    const title = firstLine.replace(/^#+\s*/, "");
    console.log(`  \u2022 ${brief}: ${title}`);
  }
});
program.command("agents").description("List available agents (default personas)").action(() => {
  console.log("Default agents:\n");
  for (const agent of AGENT_PERSONAS) {
    console.log(`  ${agent.id}`);
    console.log(`    Name: ${agent.name} (${agent.nameHe})`);
    console.log(`    Role: ${agent.role}`);
    console.log(`    Strengths: ${agent.strengths.slice(0, 2).join(", ")}`);
    console.log("");
  }
  console.log('\u{1F4A1} Generate custom personas with: forge personas generate --domain "your domain"');
});
program.addCommand(createPersonasCommand());
program.addCommand(createExportCommand());
program.addCommand(createBatchCommand());
program.addCommand(createSessionsCommand());
program.addCommand(createWatchCommand());
program.addCommand(createCompletionsCommand());
program.addCommand(createConfigCommand());
program.addCommand(createLoginCommand());
program.addCommand(createCommunityCommand());
program.action(async () => {
  const cwd = process.cwd();
  const authRepo2 = createSessionRepository(
    () => ResultAsync.fromSafePromise(Promise.resolve(createFileAuthBridge()))
  );
  const authResult = await authRepo2.restoreSession();
  const did = authResult.match((s) => s?.did ?? null, () => null);
  let sessionCount = 0;
  try {
    const sessionsDir = path18.join(cwd, "output", "sessions");
    const dirs = await fs13.readdir(sessionsDir);
    sessionCount = dirs.filter((d) => !d.startsWith(".")).length;
  } catch {
  }
  const { captureConsoleToFile: captureConsoleToFile2 } = await Promise.resolve().then(() => (init_console_capture(), console_capture_exports));
  const captured = captureConsoleToFile2(path18.join(cwd, ".forge"));
  const { Shell: Shell2 } = await Promise.resolve().then(() => (init_Shell(), Shell_exports));
  let exitSignal = false;
  const shellApp = render(
    React8.createElement(Shell2, {
      did,
      sessionCount,
      initialWizardSeed: null,
      prebuiltApp: null,
      onExit: () => {
        exitSignal = true;
        shellApp.unmount();
      }
    }),
    { patchConsole: false }
  );
  await shellApp.waitUntilExit();
  captured.restore();
  void exitSignal;
});
var shutdown = async () => {
  await shutdownServices();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("beforeExit", () => {
  shutdownServices();
});
program.parse();
