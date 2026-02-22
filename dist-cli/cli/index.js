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
function getAgentColor(id) {
  const agent = getAgentById(id);
  if (agent) return agent.color;
  if (id === "human") return "orange";
  if (id === "system") return "gray";
  return "gray";
}
function getAgentDisplayName(id, hebrew = false) {
  if (id === "human") return hebrew ? "\u05D0\u05EA\u05D4" : "You";
  if (id === "system") return hebrew ? "\u05DE\u05E2\u05E8\u05DB\u05EA" : "System";
  const agent = getAgentById(id);
  if (agent) return hebrew ? agent.nameHe : agent.name;
  const researcher = getResearcherById(id);
  if (researcher) return researcher.name;
  return id;
}
async function generatePersonas(projectName, goal, count = 5, _apiKey) {
  let content = "";
  try {
    const { query: claudeQuery4 } = await import("@anthropic-ai/claude-agent-sdk");
    const os6 = await import("os");
    const path18 = await import("path");
    const CLAUDE_CODE_PATH4 = path18.join(os6.homedir(), ".local", "bin", "claude");
    const systemPrompt = `You are an expert at creating debate personas for multi-agent deliberation systems.

Your task is to generate a set of personas that will engage in productive debate about a specific domain or project.

## Output Format
Return a JSON object with TWO fields:

### 1. "expertise" field
A markdown string containing domain-specific knowledge ALL personas should have.

### 2. "personas" field
An array of ${count} personas. Each persona must have:
- id: lowercase, no spaces (e.g., "skeptical-engineer")
- name: A realistic first name
- nameHe: Hebrew version of the name
- role: Short role description
- age: Realistic age
- background: 2-3 sentence background
- personality: Array of 4-5 traits
- biases: Array of 3-4 biases
- strengths: Array of 3-4 strengths
- weaknesses: Array of 2 weaknesses
- speakingStyle: How they communicate
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red`;
    const contextPrompt = `Generate debate personas for this project:

**Project:** ${projectName}
**Goal:** ${goal}

Create ${count} personas that would be valuable stakeholders in debating and making decisions for this project. Include diverse perspectives that will create productive tension.`;
    const q = claudeQuery4({
      prompt: contextPrompt,
      options: {
        systemPrompt,
        model: "claude-sonnet-4-20250514",
        tools: [],
        permissionMode: "dontAsk",
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH4,
        stderr: (data) => process.stderr.write(`[persona-gen] ${data}`)
      }
    });
    for await (const message of q) {
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "text") {
            content += block.text;
          }
        }
      }
    }
  } catch (error) {
    if (!content) {
      console.error("[generatePersonas] Error:", error.message);
      return null;
    }
  }
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[generatePersonas] Failed to parse response");
    return null;
  }
  const parsed = JSON.parse(jsonMatch[0]);
  const personas = parsed.personas || parsed;
  const expertise = parsed.expertise;
  return { personas, expertise };
}
var AGENT_PERSONAS, RESEARCHER_AGENTS, customPersonas;
var init_personas = __esm({
  "src/agents/personas.ts"() {
    "use strict";
    AGENT_PERSONAS = [
      {
        id: "ronit",
        name: "Ronit",
        nameHe: "\u05E8\u05D5\u05E0\u05D9\u05EA",
        role: "The Overwhelmed Decision-Maker",
        age: 42,
        background: `Mother of three, works full-time as a project manager. Has 4 minutes to understand
    if something is worth her time. Has been burned by products that promised much and delivered
    little. Represents the time-poor, trust-scarce audience segment.`,
        personality: [
          'Impatient with fluff - "get to the point"',
          "Highly skeptical of marketing speak",
          "Makes decisions based on clear value proposition",
          "Appreciates transparency about limitations",
          "Values testimonials from people like her"
        ],
        biases: [
          "Dismisses anything that feels like hype",
          "Trusts peer recommendations over brand claims",
          "Prefers practical benefits over emotional appeals",
          'Suspicious of "too good to be true"'
        ],
        strengths: [
          "Ruthless at cutting unnecessary copy",
          "Excellent at identifying unclear value props",
          "Knows what busy people actually read",
          "Champions accessibility and scannability"
        ],
        weaknesses: [
          "May undervalue emotional storytelling",
          "Can be too aggressive with cuts"
        ],
        speakingStyle: 'Direct, no-nonsense, asks "so what?" frequently. Uses Hebrew primarily with English marketing terms.',
        color: "pink"
      },
      {
        id: "yossi",
        name: "Yossi",
        nameHe: "\u05D9\u05D5\u05E1\u05D9",
        role: "The Burned Veteran",
        age: 58,
        background: `Retired IDF officer, now runs a small consulting business. Has seen every sales
    tactic in the book. Represents the experienced, cynical audience who needs proof, not promises.
    Will fact-check everything.`,
        personality: [
          "Demands evidence for every claim",
          "Respects straightforward communication",
          "Values institutional credibility",
          "Appreciates when brands admit limitations",
          "Loyal once trust is established"
        ],
        biases: [
          "Distrusts startups and new brands",
          "Prefers established, proven solutions",
          "Skeptical of user-generated content",
          "Values certifications and official backing"
        ],
        strengths: [
          "Identifies claims that need backing",
          "Excellent at trust-building copy",
          "Knows how to handle objections",
          "Champions credibility signals"
        ],
        weaknesses: [
          "May over-emphasize proof at expense of emotion",
          "Can make copy feel defensive"
        ],
        speakingStyle: "Measured, evidence-based, often references military precision. Mix of Hebrew with English when citing research.",
        color: "green"
      },
      {
        id: "noa",
        name: "Noa",
        nameHe: "\u05E0\u05D5\u05E2\u05D4",
        role: "The Digital Native Skeptic",
        age: 27,
        background: `UX designer at a tech company. Grew up with the internet, can smell inauthenticity
    instantly. Represents the younger audience who values genuine voice over polished corporate speak.
    Shares everything on social media.`,
        personality: [
          "Allergic to corporate jargon",
          "Values authenticity and transparency",
          "Appreciates humor and self-awareness",
          "Expects mobile-first experience",
          "Influenced by social proof from peers"
        ],
        biases: [
          'Dismisses anything that feels "boomer"',
          "Trusts influencer reviews over brand content",
          "Prefers brands with personality",
          "Suspicious of overly polished messaging"
        ],
        strengths: [
          "Excellent at authentic voice and tone",
          "Knows current trends and references",
          "Champions mobile and social optimization",
          "Great at microcopy and personality"
        ],
        weaknesses: [
          "May sacrifice clarity for coolness",
          "Can alienate older audiences"
        ],
        speakingStyle: "Casual, uses slang naturally, references current trends. Heavy Hebrew with English tech/internet terms.",
        color: "purple"
      },
      {
        id: "avi",
        name: "Avi",
        nameHe: "\u05D0\u05D1\u05D9",
        role: "The Practical Calculator",
        age: 45,
        background: `Owns a chain of small retail stores. Every decision is ROI-based. Represents the
    practical business-minded audience who needs to justify every expense. Spreadsheets are his
    love language.`,
        personality: [
          "Numbers-driven decision maker",
          "Appreciates clear pricing and comparisons",
          "Values time-to-value metrics",
          "Needs to justify to stakeholders",
          "Respects honest cost breakdowns"
        ],
        biases: [
          "Distrusts emotional appeals without data",
          "Prefers concrete examples over abstractions",
          "Values case studies with real numbers",
          "Suspicious of hidden costs"
        ],
        strengths: [
          "Excellent at value proposition clarity",
          "Champions ROI messaging",
          "Knows how to handle pricing objections",
          "Great at comparison and competitive positioning"
        ],
        weaknesses: [
          "May undervalue brand and emotional elements",
          "Can make copy feel transactional"
        ],
        speakingStyle: 'Practical, numbers-focused, often asks "what does this cost me?". Hebrew with English business terms.',
        color: "orange"
      },
      {
        id: "michal",
        name: "Michal",
        nameHe: "\u05DE\u05D9\u05DB\u05DC",
        role: "The Values-Driven Advocate",
        age: 35,
        background: `Non-profit director and community organizer. Every purchase is a vote for the world
    she wants. Represents the audience that cares about impact, ethics, and community. Will research
    a company's values before buying.`,
        personality: [
          "Mission and values matter deeply",
          "Appreciates transparency about impact",
          "Values community and belonging",
          "Wants to feel good about her choices",
          "Shares brands she believes in"
        ],
        biases: [
          "Distrusts purely profit-driven messaging",
          "Prefers brands with clear social mission",
          "Values environmental and social responsibility",
          "Suspicious of greenwashing"
        ],
        strengths: [
          "Excellent at emotional storytelling",
          "Champions purpose-driven messaging",
          "Knows how to build community connection",
          'Great at "why we exist" copy'
        ],
        weaknesses: [
          "May over-emphasize values at expense of practical info",
          "Can make copy feel preachy"
        ],
        speakingStyle: 'Passionate, community-focused, asks "why does this matter?". Hebrew with occasional English impact terms.',
        color: "blue"
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
        id: "local-context",
        name: "Local Context",
        specialty: "Israeli market and cultural context",
        capabilities: [
          "Understand Israeli consumer behavior",
          "Identify cultural nuances",
          "Find Hebrew language patterns",
          "Locate local success stories"
        ],
        searchDomains: ["Israeli media", "local forums", "Hebrew content"]
      }
    ];
    customPersonas = null;
  }
});

// cli/lib/wireframe.ts
function node(type, label, opts) {
  return {
    id: `${type}-${label.toLowerCase().replace(/\s+/g, "-")}`,
    type,
    label,
    direction: opts?.direction ?? (type === "navbar" || type === "grid" || type === "footer" ? "row" : "column"),
    children: opts?.children ?? [],
    content: opts?.content,
    status: opts?.status ?? "pending",
    widthPercent: opts?.widthPercent
  };
}
function parseWireframe(text3) {
  const match = text3.match(/\[WIREFRAME\]([\s\S]*?)\[\/WIREFRAME\]/i);
  if (!match) return null;
  const lines = match[1].trim().split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const page = node("page", "Page");
  const mainChildren = [];
  let sidebarLeft = null;
  let sidebarRight = null;
  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      mainChildren.push(node("section", line.trim()));
      continue;
    }
    const prefix = line.slice(0, colonIdx).trim().toLowerCase();
    const body = line.slice(colonIdx + 1).trim();
    const columns = body.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
    if (prefix === "navbar") {
      const navChildren = columns.map((col) => {
        const { label: lbl, width: w } = parseColumnSpec(col);
        return node("component", lbl, { widthPercent: w });
      });
      page.children.push(node("navbar", "Navbar", { children: navChildren }));
    } else if (prefix === "footer") {
      const footerChildren = columns.map((col) => {
        const { label: lbl, width: w } = parseColumnSpec(col);
        return node("column", lbl, { widthPercent: w });
      });
      page.children.push(node("footer", "Footer", { children: footerChildren }));
    } else if (prefix === "sidebar-left" || prefix === "sidebar") {
      const { label: lbl, width: w } = parseColumnSpec(columns[0] || "Sidebar");
      sidebarLeft = node("sidebar", lbl, { widthPercent: w || 25 });
    } else if (prefix === "sidebar-right") {
      const { label: lbl, width: w } = parseColumnSpec(columns[0] || "Sidebar");
      sidebarRight = node("sidebar", lbl, { widthPercent: w || 25 });
    } else {
      if (columns.length === 1) {
        mainChildren.push(node("section", columns[0]));
      } else {
        const gridChildren = columns.map((col) => {
          const { label: lbl, width: w } = parseColumnSpec(col);
          return node("column", lbl, { widthPercent: w });
        });
        mainChildren.push(node("section", capitalize(prefix), { direction: "row", children: gridChildren }));
      }
    }
  }
  const bodyRow = node("main", "Body", { direction: "row" });
  if (sidebarLeft) bodyRow.children.push(sidebarLeft);
  const mainNode = node("main", "Main", { children: mainChildren });
  bodyRow.children.push(mainNode);
  if (sidebarRight) bodyRow.children.push(sidebarRight);
  const footerIdx = page.children.findIndex((c) => c.type === "footer");
  if (footerIdx >= 0) {
    page.children.splice(footerIdx, 0, bodyRow);
  } else {
    page.children.push(bodyRow);
  }
  return page;
}
function parseColumnSpec(spec) {
  const widthMatch = spec.match(/\((\d+)%?\)/);
  const width = widthMatch ? parseInt(widthMatch[1], 10) : void 0;
  const label = spec.replace(/\(\d+%?\)/, "").trim();
  return { label, width };
}
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}
function extractWireframe(messageContent) {
  return parseWireframe(messageContent);
}
function getLeafSections(root) {
  if (root.children.length === 0 && root.type !== "page") {
    return [root];
  }
  const leaves = [];
  for (const child of root.children) {
    if (child.type === "section" && child.children.length === 0) {
      leaves.push(child);
    } else if (child.type === "section" && child.direction === "row") {
      for (const col of child.children) {
        leaves.push(col);
      }
    } else {
      leaves.push(...getLeafSections(child));
    }
  }
  return leaves;
}
function getDefaultWireframe() {
  return node("page", "Page", {
    children: [
      node("navbar", "Navbar", {
        children: [
          node("component", "Logo"),
          node("component", "Navigation"),
          node("component", "CTA")
        ]
      }),
      node("main", "Body", {
        direction: "row",
        children: [
          node("main", "Main", {
            children: [
              node("section", "Hero"),
              node("section", "Content"),
              node("section", "Features")
            ]
          })
        ]
      }),
      node("footer", "Footer", {
        children: [
          node("column", "Info"),
          node("column", "Links"),
          node("column", "Contact")
        ]
      })
    ]
  });
}
var init_wireframe = __esm({
  "cli/lib/wireframe.ts"() {
    "use strict";
  }
});

// cli/lib/suggestions.ts
function detectMessageType(message) {
  const content = message.content.toLowerCase();
  if (message.type === "synthesis" || content.includes("synthesis") || content.includes("summary")) {
    return "synthesis";
  }
  if (content.includes("i propose") || content.includes("i suggest") || content.includes("we should") || content.includes("my proposal")) {
    return "proposal";
  }
  if (content.includes("i disagree") || content.includes("however") || content.includes("but i think") || content.includes("on the contrary")) {
    return "disagreement";
  }
  if (content.endsWith("?") || content.includes("what do you think") || content.includes("how about")) {
    return "question";
  }
  return "other";
}
function getQuickReplies(phase, messages, consensusPoints, conflictPoints) {
  const phaseSugg = PHASE_SUGGESTIONS[phase];
  if (!phaseSugg) return [];
  const replies = [];
  for (const cmd of phaseSugg.commands.slice(0, 2)) {
    replies.push({ label: cmd, value: cmd, isCommand: true });
  }
  let lastAgentMsg;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].agentId !== "human" && messages[i].agentId !== "system") {
      lastAgentMsg = messages[i];
      break;
    }
  }
  if (lastAgentMsg) {
    const msgType = detectMessageType(lastAgentMsg);
    switch (msgType) {
      case "proposal":
        replies.push({ label: "Support this", value: "I support this proposal", isCommand: false });
        replies.push({ label: "Ask for evidence", value: "Can you provide evidence for this?", isCommand: false });
        break;
      case "disagreement":
        replies.push({ label: "Mediate", value: "Let me offer a middle ground here", isCommand: false });
        replies.push({ label: "Agree with concern", value: "That's a valid concern, let's address it", isCommand: false });
        break;
      case "synthesis":
        replies.push({ label: "Approve", value: "I approve this synthesis", isCommand: false });
        replies.push({ label: "Request revision", value: "This needs revision in the following areas:", isCommand: false });
        break;
      case "question":
        replies.push({ label: "Answer this", value: "To answer that question:", isCommand: false });
        break;
      default:
        if (phaseSugg.prompts.length > 0) {
          replies.push({ label: phaseSugg.prompts[0], value: phaseSugg.prompts[0], isCommand: false });
        }
        break;
    }
  }
  if (conflictPoints > consensusPoints + 2) {
    replies.push({ label: "Call for compromise", value: "I think we need to find a compromise here", isCommand: false });
  }
  return replies.slice(0, 4);
}
function getPhaseHint(phase) {
  return PHASE_SUGGESTIONS[phase]?.hint || "Type a message";
}
function detectAgentSuggestion(messages, phase, consensusPoints, conflictPoints, prevCount) {
  if (messages.length === 0 || messages.length === prevCount) return null;
  const latest = messages[messages.length - 1];
  if (!latest || latest.agentId === "human" || latest.agentId === "system") return null;
  const msgType = detectMessageType(latest);
  if (msgType === "proposal") {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: "Share your thoughts on this proposal",
      trigger: "proposal"
    };
  }
  if (conflictPoints > consensusPoints + 2 && msgType === "disagreement") {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: "Consider mediating this disagreement",
      trigger: "conflict"
    };
  }
  if (messages.length % 8 === 0 && consensusPoints === 0 && messages.length > 0) {
    return {
      agentId: latest.agentId,
      agentName: latest.agentId,
      suggestion: "The debate may be stalling \u2014 try /synthesize or set direction",
      trigger: "stall"
    };
  }
  return null;
}
var PHASE_SUGGESTIONS;
var init_suggestions = __esm({
  "cli/lib/suggestions.ts"() {
    "use strict";
    PHASE_SUGGESTIONS = {
      initialization: {
        commands: ["/status", "/help"],
        prompts: ["Set the agenda", "Define constraints"],
        hint: "Session starting..."
      },
      context_loading: {
        commands: ["/status"],
        prompts: ["Add context", "Clarify the scope"],
        hint: "Loading context..."
      },
      research: {
        commands: ["/status", "/pause"],
        prompts: ["Share a reference", "What do we know?"],
        hint: "Research phase \u2014 share knowledge"
      },
      brainstorming: {
        commands: ["/status", "/synthesize"],
        prompts: ["New idea:", "What if we...", "Build on that"],
        hint: "Brainstorming \u2014 share ideas freely"
      },
      argumentation: {
        commands: ["/status", "/synthesize"],
        prompts: ["I agree because...", "I disagree because...", "Consider this angle"],
        hint: "Debate in progress"
      },
      synthesis: {
        commands: ["/status", "/export"],
        prompts: ["Approve synthesis", "Request revision"],
        hint: "Synthesis in progress"
      },
      drafting: {
        commands: ["/status", "/export"],
        prompts: ["Looks good", "Revise section..."],
        hint: "Drafting document"
      },
      review: {
        commands: ["/status", "/synthesize"],
        prompts: ["Approve", "Needs changes"],
        hint: "Review phase"
      },
      consensus: {
        commands: ["/status", "/export"],
        prompts: ["Confirm consensus", "Raise objection"],
        hint: "Building consensus"
      },
      finalization: {
        commands: ["/export", "/build", "/quit"],
        prompts: ["Finalize", "Build websites"],
        hint: "Type /build to generate 3 website variants"
      },
      building: {
        commands: ["/urls", "/quit"],
        prompts: [],
        hint: "Building 3 website variants..."
      },
      picking: {
        commands: ["/pick mika", "/pick dani", "/pick shai", "/urls", "/quit"],
        prompts: ["Pick a winner"],
        hint: "Review sites and /pick a winner"
      }
    };
  }
});

// cli/dashboard/screen.ts
import blessed from "blessed";
function createScreen() {
  process.stdin.setMaxListeners(25);
  process.stdout.setMaxListeners(25);
  const screen = blessed.screen({
    smartCSR: true,
    title: "Forge \u2014 Multi-Agent Deliberation",
    fullUnicode: true,
    forceUnicode: true,
    fastCSR: true,
    mouse: false,
    cursor: {
      artificial: true,
      shape: "line",
      blink: true,
      color: "cyan"
    }
  });
  return screen;
}
function scheduleRender(screen) {
  if (renderScheduled) return;
  renderScheduled = true;
  setImmediate(() => {
    renderScheduled = false;
    screen.render();
  });
}
var renderScheduled;
var init_screen = __esm({
  "cli/dashboard/screen.ts"() {
    "use strict";
    renderScheduled = false;
  }
});

// cli/dashboard/layout.ts
import contrib from "blessed-contrib";
import blessed2 from "blessed";
function createLayout(screen) {
  const grid = new contrib.grid({
    rows: 12,
    cols: 12,
    screen
  });
  const header = grid.set(0, 0, 1, 12, blessed2.box, {
    tags: true,
    style: {
      fg: "white",
      bg: "default",
      border: { fg: "gray" }
    },
    border: { type: "line" }
  });
  const breadcrumbs = grid.set(1, 0, 1, 12, blessed2.box, {
    tags: true,
    style: {
      fg: "white",
      bg: "default",
      border: { fg: "gray" }
    },
    border: { type: "line" }
  });
  const chatLog = grid.set(2, 0, 7, 5, contrib.log, {
    tags: true,
    fg: "white",
    label: " Chat ",
    border: { type: "line", fg: "gray" },
    style: {
      fg: "white",
      border: { fg: "gray" },
      focus: { border: { fg: "cyan" } }
    },
    scrollbar: {
      fg: "cyan",
      ch: "\u2503"
      // ┃
    },
    scrollable: true,
    mouse: false,
    keys: true,
    vi: true,
    interactive: true,
    bufferLength: 2e3
  });
  const canvas = grid.set(2, 5, 7, 3, blessed2.box, {
    tags: true,
    label: " Wireframe ",
    border: { type: "line" },
    style: {
      fg: "white",
      border: { fg: "cyan" }
    },
    scrollable: true
  });
  const agentPanel = grid.set(2, 8, 3, 4, blessed2.box, {
    tags: true,
    label: " Agents ",
    border: { type: "line" },
    style: {
      fg: "white",
      border: { fg: "gray" }
    },
    scrollable: true
  });
  const consensusChart = grid.set(5, 8, 2, 4, contrib.line, {
    label: " Consensus Trend ",
    showLegend: true,
    legend: { width: 14 },
    minY: 0,
    style: {
      line: "green",
      text: "white",
      baseline: "black",
      border: { fg: "gray" }
    },
    border: { type: "line" },
    xLabelPadding: 1,
    xPadding: 2,
    wholeNumbersOnly: true
  });
  const phaseTimeline = grid.set(7, 8, 2, 4, blessed2.box, {
    tags: true,
    label: " Phase Progress ",
    border: { type: "line" },
    style: {
      fg: "white",
      border: { fg: "gray" }
    }
  });
  const quickReplies = grid.set(9, 0, 1, 12, blessed2.box, {
    tags: true,
    style: {
      fg: "white",
      border: { fg: "gray" }
    },
    border: { type: "line" }
  });
  const suggestion = grid.set(9, 0, 1, 12, blessed2.box, {
    tags: true,
    hidden: true,
    style: {
      fg: "yellow",
      bg: "default",
      border: { fg: "yellow" }
    },
    border: { type: "line" }
  });
  const input = grid.set(10, 0, 1, 12, blessed2.textbox, {
    label: " > ",
    border: { type: "line" },
    style: {
      fg: "white",
      bg: "default",
      border: { fg: "cyan" },
      focus: { border: { fg: "cyan" } }
    },
    inputOnFocus: false,
    mouse: false,
    keys: true
  });
  const statusBar = grid.set(11, 0, 1, 12, blessed2.box, {
    tags: true,
    style: {
      fg: "gray",
      bg: "default",
      border: { fg: "gray" }
    },
    border: { type: "line" }
  });
  return {
    header,
    breadcrumbs,
    chatLog,
    canvas,
    agentPanel,
    consensusChart,
    phaseTimeline,
    quickReplies,
    suggestion,
    input,
    statusBar
  };
}
var init_layout = __esm({
  "cli/dashboard/layout.ts"() {
    "use strict";
  }
});

// src/agents/build-personas.ts
function getBuildPersonaById(id) {
  return BUILD_PERSONAS.find((p4) => p4.id === id);
}
function getBuildPersonaByName(name) {
  return BUILD_PERSONAS.find((p4) => p4.name.toLowerCase() === name.toLowerCase());
}
var BUILD_PERSONAS;
var init_build_personas = __esm({
  "src/agents/build-personas.ts"() {
    "use strict";
    BUILD_PERSONAS = [
      {
        id: "architect-mika",
        name: "Mika",
        designPhilosophy: "Minimalist & Clean \u2014 less is more. Every element must earn its place. Generous whitespace, restrained palette, typographic hierarchy does the heavy lifting.",
        colorPreference: "Monochrome base (white/off-white backgrounds, near-black text) with a single accent color (electric blue #2563EB or similar). No gradients.",
        layoutStyle: "Centered single-column, generous whitespace, max-width 720px for text. Hero is just a headline + subheadline + CTA. Sections breathe with 6-8rem vertical padding.",
        typographyApproach: "System font stack or Inter. Large heading sizes (clamp 2.5rem\u20134rem), generous line-height (1.6\u20131.8 for body). All caps for small labels.",
        animationLevel: "minimal",
        specialties: [
          "Whitespace as a design element",
          "Typographic hierarchy",
          "Single-page scrolling experiences",
          "Micro-interactions on hover only"
        ],
        port: 5173,
        color: "cyan"
      },
      {
        id: "architect-dani",
        name: "Dani",
        designPhilosophy: "Bold & Expressive \u2014 dark backgrounds, vivid neon gradients, strong visual impact. The site should feel like a premium product launch. Maximalist energy.",
        colorPreference: "Dark theme (#0a0a0a base). Neon gradient accents: magenta\u2192cyan (#ec4899\u2192#06b6d4). Glowing text effects. Gradient borders on cards.",
        layoutStyle: "Full-bleed sections, asymmetric grid layouts, overlapping elements. Hero takes full viewport with large background gradient mesh. Cards with glassmorphism.",
        typographyApproach: "Bold sans-serif (Space Grotesk or similar). Extra-large hero text (5rem+). Gradient text for headlines. Tight letter-spacing on headings.",
        animationLevel: "heavy",
        specialties: [
          "Gradient mesh backgrounds",
          "Glassmorphism cards",
          "Scroll-triggered animations",
          "Animated counters and reveals",
          "Particle or glow effects via CSS"
        ],
        port: 5174,
        color: "magenta"
      },
      {
        id: "architect-shai",
        name: "Shai",
        designPhilosophy: "Warm Editorial \u2014 feels like a beautifully designed magazine. Earthy tones, elegant typography, content-first layout. Approachable and trustworthy.",
        colorPreference: "Warm palette: cream background (#FFFBF5), terracotta accent (#C2591A), sage green (#6B8F71), charcoal text (#2D2D2D). Subtle texture overlays.",
        layoutStyle: "Two-column editorial grid, alternating full-width and split sections. Card-based feature blocks with soft shadows. Pull-quotes for emphasis.",
        typographyApproach: "Serif headings (Playfair Display or similar) paired with clean sans-serif body (Lato). Moderate sizes, elegant spacing. Italic for emphasis.",
        animationLevel: "moderate",
        specialties: [
          "Editorial grid layouts",
          "Card-based content sections",
          "Testimonial carousels",
          "Subtle fade-in-up on scroll",
          "Warm color harmonies"
        ],
        port: 5175,
        color: "yellow"
      }
    ];
  }
});

// cli/adapters/BuildAgentRunner.ts
import { query as claudeQuery3 } from "@anthropic-ai/claude-agent-sdk";
import * as os4 from "os";
import * as path14 from "path";
function generateBuildSystemPrompt(persona, draftCopy, projectName) {
  return `You are ${persona.name}, an expert front-end engineer and designer.

## YOUR DESIGN IDENTITY
- **Philosophy**: ${persona.designPhilosophy}
- **Color Palette**: ${persona.colorPreference}
- **Layout Style**: ${persona.layoutStyle}
- **Typography**: ${persona.typographyApproach}
- **Animation Level**: ${persona.animationLevel}
- **Specialties**: ${persona.specialties.join(", ")}

## YOUR TASK
Build a complete SvelteKit landing page for **${projectName}** using the copy below.
You MUST use the copy VERBATIM \u2014 do not rewrite, paraphrase, or change any wording.
Your creative freedom is in layout, colors, typography, spacing, and animations ONLY.

## TECHNICAL REQUIREMENTS
1. Create a new SvelteKit project: \`npx sv create ${projectName.toLowerCase().replace(/[^a-z0-9]/g, "-")} --template minimal --types ts --no-add-ons --no-install\`
2. Install dependencies: \`cd <project-dir> && npm install\`
3. Install Tailwind CSS v4: \`npx sv add tailwindcss --no-install && npm install\`
4. Build a single landing page in \`src/routes/+page.svelte\`
5. Each copy section becomes a distinct visual section on the page
6. Make it fully responsive (mobile-first)
7. Add a shared layout in \`src/routes/+layout.svelte\` with Google Fonts if needed
8. DO NOT start a dev server \u2014 that's handled externally

## COPY TO USE (VERBATIM)

${draftCopy}

## SECTION MAPPING
Parse the copy above. Each ## heading = one page section.
Create distinct visual treatments per section following your design philosophy.

## QUALITY CHECKLIST
- [ ] All copy text appears verbatim on the page
- [ ] Responsive on mobile, tablet, desktop
- [ ] Consistent with your design philosophy
- [ ] Tailwind CSS classes used throughout
- [ ] No broken imports or missing files
- [ ] Page loads without errors

Build the site now. Work methodically: scaffold \u2192 install \u2192 layout \u2192 page \u2192 verify.`;
}
async function buildSite(persona, draftCopy, projectName, outputDir, onProgress) {
  const systemPrompt = generateBuildSystemPrompt(persona, draftCopy, projectName);
  const buildPrompt = `Build the SvelteKit landing page now. Your working directory is: ${outputDir}

Create the project inside this directory. Follow all instructions from your system prompt.`;
  try {
    const q = claudeQuery3({
      prompt: buildPrompt,
      options: {
        systemPrompt,
        model: "claude-sonnet-4-20250514",
        tools: { type: "preset", preset: "claude_code" },
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        persistSession: false,
        maxTurns: 30,
        cwd: outputDir,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH3,
        stderr: () => {
        }
      }
    });
    for await (const message of q) {
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "text" && onProgress) {
            const lines = block.text.split("\n").filter((l) => l.trim());
            const summary = lines[0]?.slice(0, 120) || "Working...";
            onProgress(persona.id, summary);
          }
        }
      }
      if (message.type === "result") {
        onProgress?.(persona.id, "Build complete");
      }
    }
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown build error";
    onProgress?.(persona.id, `Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
var CLAUDE_CODE_PATH3;
var init_BuildAgentRunner = __esm({
  "cli/adapters/BuildAgentRunner.ts"() {
    "use strict";
    CLAUDE_CODE_PATH3 = path14.join(os4.homedir(), ".local", "bin", "claude");
  }
});

// src/lib/build/BuildOrchestrator.ts
import { spawn } from "child_process";
import * as fs11 from "fs";
import * as path15 from "path";
var BuildOrchestrator;
var init_BuildOrchestrator = __esm({
  "src/lib/build/BuildOrchestrator.ts"() {
    "use strict";
    init_build_personas();
    init_BuildAgentRunner();
    BuildOrchestrator = class {
      results = /* @__PURE__ */ new Map();
      devServers = /* @__PURE__ */ new Map();
      callbacks = [];
      sessionDir;
      draftCopy;
      projectName;
      constructor(sessionDir, draftCopy, projectName) {
        this.sessionDir = sessionDir;
        this.draftCopy = draftCopy;
        this.projectName = projectName;
        for (const persona of BUILD_PERSONAS) {
          this.results.set(persona.id, {
            agentId: persona.id,
            siteDir: path15.join(sessionDir, "builds", persona.id),
            port: persona.port,
            status: "pending"
          });
        }
      }
      /**
       * Subscribe to build events
       */
      on(callback) {
        this.callbacks.push(callback);
        return () => {
          this.callbacks = this.callbacks.filter((cb) => cb !== callback);
        };
      }
      emit(event) {
        for (const cb of this.callbacks) {
          try {
            cb(event);
          } catch {
          }
        }
      }
      /**
       * Create build directories and launch all 3 agents in parallel
       */
      async startBuilds() {
        const buildsDir = path15.join(this.sessionDir, "builds");
        fs11.mkdirSync(buildsDir, { recursive: true });
        this.emit({ type: "build_started", data: { agents: BUILD_PERSONAS.map((p4) => p4.id) } });
        const buildPromises = BUILD_PERSONAS.map(async (persona) => {
          const result = this.results.get(persona.id);
          result.status = "building";
          result.startedAt = /* @__PURE__ */ new Date();
          fs11.mkdirSync(result.siteDir, { recursive: true });
          this.emit({
            type: "build_progress",
            data: { agentId: persona.id, message: `${persona.name} starting build...` }
          });
          const buildResult = await buildSite(
            persona,
            this.draftCopy,
            this.projectName,
            result.siteDir,
            (agentId, message) => {
              this.emit({ type: "build_progress", data: { agentId, message } });
            }
          );
          result.completedAt = /* @__PURE__ */ new Date();
          if (buildResult.success) {
            this.emit({ type: "build_complete", data: { agentId: persona.id } });
          } else {
            result.status = "error";
            result.error = buildResult.error;
            this.emit({ type: "build_error", data: { agentId: persona.id, error: buildResult.error } });
          }
          return { persona, buildResult };
        });
        const settled = await Promise.allSettled(buildPromises);
        for (const result of settled) {
          if (result.status === "fulfilled" && result.value.buildResult.success) {
            const buildResult = this.results.get(result.value.persona.id);
            buildResult.status = "running";
          }
        }
      }
      /**
       * Start dev servers for all successfully built projects
       */
      async startDevServers() {
        const serverPromises = [];
        for (const persona of BUILD_PERSONAS) {
          const result = this.results.get(persona.id);
          if (result.status !== "running" && result.status !== "building") continue;
          const projectDir = this.findProjectDir(result.siteDir);
          if (!projectDir) {
            result.status = "error";
            result.error = "No package.json found in build output";
            this.emit({ type: "build_error", data: { agentId: persona.id, error: result.error } });
            continue;
          }
          serverPromises.push(this.startDevServer(persona, projectDir));
        }
        await Promise.allSettled(serverPromises);
        const running = [...this.results.values()].filter((r) => r.status === "running");
        if (running.length > 0) {
          this.emit({ type: "all_servers_ready", data: { urls: this.getUrls() } });
        }
      }
      /**
       * Find the directory containing package.json (may be nested one level)
       */
      findProjectDir(baseDir) {
        if (fs11.existsSync(path15.join(baseDir, "package.json"))) {
          return baseDir;
        }
        try {
          const entries = fs11.readdirSync(baseDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const nested = path15.join(baseDir, entry.name);
              if (fs11.existsSync(path15.join(nested, "package.json"))) {
                return nested;
              }
            }
          }
        } catch {
        }
        return null;
      }
      /**
       * Start a single dev server
       */
      startDevServer(persona, projectDir) {
        return new Promise((resolve4) => {
          const result = this.results.get(persona.id);
          const child = spawn("npm", ["run", "dev", "--", "--port", String(persona.port)], {
            cwd: projectDir,
            stdio: ["ignore", "pipe", "pipe"],
            detached: false
          });
          this.devServers.set(persona.id, child);
          result.devServerPid = child.pid;
          let resolved = false;
          const timeout = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              result.status = "running";
              this.emit({
                type: "server_started",
                data: { agentId: persona.id, port: persona.port, url: `http://localhost:${persona.port}` }
              });
              resolve4();
            }
          }, 3e4);
          child.stdout?.on("data", (data) => {
            const output = data.toString();
            if (!resolved && (output.includes("localhost:") || output.includes("Local:"))) {
              resolved = true;
              clearTimeout(timeout);
              result.status = "running";
              this.emit({
                type: "server_started",
                data: { agentId: persona.id, port: persona.port, url: `http://localhost:${persona.port}` }
              });
              resolve4();
            }
          });
          child.on("error", (err) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              result.status = "error";
              result.error = `Dev server failed: ${err.message}`;
              this.emit({ type: "build_error", data: { agentId: persona.id, error: result.error } });
              resolve4();
            }
          });
          child.on("exit", (code) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              if (code !== 0) {
                result.status = "error";
                result.error = `Dev server exited with code ${code}`;
                this.emit({ type: "build_error", data: { agentId: persona.id, error: result.error } });
              }
              resolve4();
            }
          });
        });
      }
      /**
       * Stop all dev servers
       */
      async stopDevServers() {
        for (const [agentId, child] of this.devServers) {
          try {
            child.kill("SIGTERM");
            await new Promise((resolve4) => setTimeout(resolve4, 500));
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          } catch {
          }
          this.devServers.delete(agentId);
        }
      }
      /**
       * Pick a winner — stop other dev servers, keep winner running
       */
      async pickWinner(nameOrId) {
        const persona = getBuildPersonaById(nameOrId) || getBuildPersonaByName(nameOrId);
        if (!persona) {
          return { success: false, error: `Unknown agent: ${nameOrId}. Use: mika, dani, or shai` };
        }
        const result = this.results.get(persona.id);
        if (!result || result.status !== "running") {
          return { success: false, error: `${persona.name}'s site is not running` };
        }
        for (const [agentId, child] of this.devServers) {
          if (agentId !== persona.id) {
            try {
              child.kill("SIGTERM");
            } catch {
            }
            this.devServers.delete(agentId);
          }
        }
        this.emit({ type: "user_pick", data: { agentId: persona.id, name: persona.name } });
        return { success: true, agentId: persona.id };
      }
      /**
       * Request changes to a specific agent's build — re-runs the build with feedback
       */
      async requestChanges(nameOrId, feedback) {
        const persona = getBuildPersonaById(nameOrId) || getBuildPersonaByName(nameOrId);
        if (!persona) {
          return { success: false, error: `Unknown agent: ${nameOrId}. Use: mika, dani, or shai` };
        }
        const result = this.results.get(persona.id);
        const existingServer = this.devServers.get(persona.id);
        if (existingServer) {
          try {
            existingServer.kill("SIGTERM");
          } catch {
          }
          this.devServers.delete(persona.id);
        }
        result.status = "building";
        this.emit({
          type: "build_progress",
          data: { agentId: persona.id, message: `${persona.name} rebuilding with feedback...` }
        });
        const feedbackCopy = `${this.draftCopy}

## REVISION FEEDBACK
The user reviewed your previous build and wants these changes:
${feedback}

Please update the existing SvelteKit project in this directory to address the feedback.`;
        const buildResult = await buildSite(
          persona,
          feedbackCopy,
          this.projectName,
          result.siteDir,
          (agentId, message) => {
            this.emit({ type: "build_progress", data: { agentId, message } });
          }
        );
        if (buildResult.success) {
          result.status = "running";
          result.completedAt = /* @__PURE__ */ new Date();
          this.emit({ type: "build_complete", data: { agentId: persona.id } });
          const projectDir = this.findProjectDir(result.siteDir);
          if (projectDir) {
            await this.startDevServer(persona, projectDir);
          }
        } else {
          result.status = "error";
          result.error = buildResult.error;
          this.emit({ type: "build_error", data: { agentId: persona.id, error: buildResult.error } });
        }
        return { success: buildResult.success, error: buildResult.error };
      }
      /**
       * Get URLs for all running dev servers
       */
      getUrls() {
        return BUILD_PERSONAS.filter((p4) => {
          const r = this.results.get(p4.id);
          return r && r.status === "running";
        }).map((p4) => ({
          agentId: p4.id,
          name: p4.name,
          url: `http://localhost:${p4.port}`,
          port: p4.port
        }));
      }
      /**
       * Get all build results
       */
      getResults() {
        return this.results;
      }
    };
  }
});

// cli/dashboard/theme.ts
var PHASE_COLORS2, PHASE_EMOJI2, PHASE_LABELS, ALL_PHASES, STATE_ICONS2, TYPE_BADGES2, SPINNER_FRAMES, BAR_CHAR, BAR_EMPTY, DOT_DONE, DOT_CURRENT, DOT_FUTURE, DOT_LINE, RESONANCE_COLORS, RESONANCE_TREND_ICONS, LOGO_GRADIENT;
var init_theme = __esm({
  "cli/dashboard/theme.ts"() {
    "use strict";
    PHASE_COLORS2 = {
      initialization: "gray",
      context_loading: "blue",
      research: "cyan",
      brainstorming: "cyan",
      argumentation: "yellow",
      synthesis: "magenta",
      drafting: "green",
      review: "blue",
      consensus: "green",
      finalization: "yellow",
      building: "cyan",
      picking: "green"
    };
    PHASE_EMOJI2 = {
      initialization: "\u{1F680}",
      // 🚀
      context_loading: "\u{1F4C2}",
      // 📂
      research: "\u{1F50D}",
      // 🔍
      brainstorming: "\u{1F4AD}",
      // 💭
      argumentation: "\u2696\uFE0F",
      // ⚖️
      synthesis: "\u{1F4CA}",
      // 📊
      drafting: "\u270D\uFE0F",
      // ✍️
      review: "\u{1F441}\uFE0F",
      // 👁️
      consensus: "\u{1F91D}",
      // 🤝
      finalization: "\u{1F389}",
      // 🎉
      building: "\u{1F528}",
      // 🔨
      picking: "\u{1F3C6}"
      // 🏆
    };
    PHASE_LABELS = {
      initialization: "IN",
      context_loading: "CX",
      research: "RS",
      brainstorming: "BR",
      argumentation: "AR",
      synthesis: "SY",
      drafting: "DR",
      review: "RV",
      consensus: "CN",
      finalization: "FN",
      building: "BU",
      picking: "PK"
    };
    ALL_PHASES = [
      "initialization",
      "brainstorming",
      "argumentation",
      "synthesis",
      "drafting",
      "finalization"
    ];
    STATE_ICONS2 = {
      listening: "\u{1F442}",
      // 👂
      thinking: "\u{1F914}",
      // 🤔
      speaking: "\u{1F4AC}",
      // 💬
      waiting: "\u23F3"
      // ⏳
    };
    TYPE_BADGES2 = {
      argument: "[ARG]",
      question: "[Q]",
      proposal: "[PROP]",
      agreement: "[+1]",
      disagreement: "[-1]",
      synthesis: "[SYN]",
      system: "",
      human_input: "[YOU]",
      research_result: "[RES]",
      tool_result: "[TOOL]"
    };
    SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
    BAR_CHAR = "\u2588";
    BAR_EMPTY = "\u2591";
    DOT_DONE = "\u25CF";
    DOT_CURRENT = "\u25C9";
    DOT_FUTURE = "\u25CB";
    DOT_LINE = "\u2500\u2500";
    RESONANCE_COLORS = { high: "green", medium: "yellow", low: "red" };
    RESONANCE_TREND_ICONS = { rising: "^", stable: "-", falling: "v" };
    LOGO_GRADIENT = [
      [255, 100, 50],
      // F - orange-red
      [255, 140, 30],
      // O - orange
      [200, 200, 50],
      // R - yellow-green
      [50, 200, 100],
      // G - green
      [50, 200, 200]
      // E - cyan
    ];
  }
});

// cli/dashboard/widgets/HeaderWidget.ts
import chalk9 from "chalk";
function buildGradientLogo() {
  let logo = "";
  const colorIdx = [0, 0, 1, 1, 2, 2, 3, 3, 4];
  for (let i = 0; i < FORGE_LETTERS.length; i++) {
    const [r, g, b] = LOGO_GRADIENT[colorIdx[i]];
    logo += chalk9.rgb(r, g, b).bold(FORGE_LETTERS[i]);
  }
  return logo;
}
function getResonanceColor(score) {
  if (score >= 60) return RESONANCE_COLORS.high;
  if (score >= 30) return RESONANCE_COLORS.medium;
  return RESONANCE_COLORS.low;
}
function updateHeader(widget, phase, currentSpeaker, messageCount, consensusPoints, conflictPoints, resonanceGlobal) {
  const logo = buildGradientLogo();
  const phaseEmoji = PHASE_EMOJI2[phase] || "";
  const phaseName = phase.replace(/_/g, " ").toUpperCase();
  const floor = currentSpeaker ? `Floor: {green-fg}${currentSpeaker}{/green-fg}` : "Floor: {gray-fg}open{/gray-fg}";
  let stats = `Msgs:{bold}${messageCount}{/bold} {green-fg}\u2713${consensusPoints}{/green-fg} {red-fg}\u2717${conflictPoints}{/red-fg}`;
  if (resonanceGlobal !== void 0) {
    const rColor = getResonanceColor(resonanceGlobal);
    stats += ` {${rColor}-fg}R:${resonanceGlobal}{/${rColor}-fg}`;
  }
  const content = `${logo}  {gray-fg}\u2502{/gray-fg}  ${phaseEmoji} {bold}${phaseName}{/bold}  {gray-fg}\u2502{/gray-fg}  ${floor}  {gray-fg}\u2502{/gray-fg}  ${stats}`;
  widget.setContent(content);
}
var FORGE_LETTERS;
var init_HeaderWidget = __esm({
  "cli/dashboard/widgets/HeaderWidget.ts"() {
    "use strict";
    init_theme();
    FORGE_LETTERS = ["F", " ", "O", " ", "R", " ", "G", " ", "E"];
  }
});

// cli/dashboard/widgets/BreadcrumbWidget.ts
function updateBreadcrumbs(widget, projectName, phase) {
  const phaseEmoji = PHASE_EMOJI2[phase] || "";
  const phaseName = phase.replace(/_/g, " ").toUpperCase();
  const phaseColor = PHASE_COLORS2[phase] || "white";
  const content = `{cyan-fg}{bold}\u{1F525} Forge{/bold}{/cyan-fg} {gray-fg}>{/gray-fg} ${projectName} {gray-fg}>{/gray-fg} {${phaseColor}-fg}{bold}${phaseEmoji} ${phaseName}{/bold}{/${phaseColor}-fg}`;
  widget.setContent(content);
}
var init_BreadcrumbWidget = __esm({
  "cli/dashboard/widgets/BreadcrumbWidget.ts"() {
    "use strict";
    init_theme();
  }
});

// cli/dashboard/widgets/CanvasWidget.ts
function tag(color, text3) {
  return `{${color}-fg}${text3}{/${color}-fg}`;
}
function bold(text3) {
  return `{bold}${text3}{/bold}`;
}
function trunc(s, max) {
  if (max <= 0) return "";
  const clean = s.split("\n")[0] || s;
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + "\u2026";
}
function centerText(s, width) {
  if (s.length >= width) return s.slice(0, width);
  const pad = Math.floor((width - s.length) / 2);
  return " ".repeat(pad) + s + " ".repeat(width - s.length - pad);
}
function padRight(s, width) {
  if (s.length >= width) return s.slice(0, width);
  return s + " ".repeat(width - s.length);
}
function statusIcon2(status) {
  if (status === "complete") return "\u25CF";
  if (status === "in_progress") return "\u25D0";
  return "\u25CB";
}
function statusColor2(status) {
  if (status === "complete") return "green";
  if (status === "in_progress") return "yellow";
  return "gray";
}
function distributeColumnWidths(children, totalWidth) {
  const n = children.length;
  if (n === 0) return [];
  if (n === 1) return [totalWidth];
  const available = totalWidth - (n - 1);
  if (available < n) {
    const widths2 = new Array(n).fill(1);
    widths2[n - 1] = Math.max(1, available - (n - 1));
    return widths2;
  }
  const totalPercent = children.reduce((sum, c) => sum + (c.widthPercent || 0), 0);
  if (totalPercent > 0) {
    const widths2 = children.map((c) => {
      const pct = c.widthPercent || 100 / n;
      return Math.max(1, Math.floor(pct / 100 * available));
    });
    const used = widths2.reduce((a, b) => a + b, 0);
    widths2[n - 1] += available - used;
    return widths2;
  }
  const base = Math.floor(available / n);
  const widths = new Array(n).fill(base);
  widths[n - 1] += available - base * n;
  return widths;
}
function labelColor(type) {
  if (type === "navbar") return "blue";
  if (type === "footer") return "gray";
  if (type === "sidebar") return "magenta";
  return "white";
}
function topBorder(W) {
  return tag(FRAME_COLOR, BOX.TL + BOX.H.repeat(W) + BOX.TR);
}
function bottomBorder(W) {
  return tag(FRAME_COLOR, BOX.BL + BOX.H.repeat(W) + BOX.BR);
}
function strongDivider(W) {
  return tag(FRAME_COLOR, BOX.SL + BOX.SH.repeat(W) + BOX.SR);
}
function thinDivider(W) {
  return tag(FRAME_COLOR, BOX.THL) + tag(THIN_COLOR, BOX.THH.repeat(W)) + tag(FRAME_COLOR, BOX.THR);
}
function framedLine(content, W) {
  return tag(FRAME_COLOR, BOX.V) + padRight(content, W) + tag(FRAME_COLOR, BOX.V);
}
function renderNavbarOrFooter(node2, W) {
  const children = node2.children;
  if (children.length === 0) {
    const lbl = trunc(node2.label, W - 2);
    const color2 = labelColor(node2.type);
    return [framedLine(" " + tag(color2, bold(centerText(lbl, W - 2))) + " ", W)];
  }
  const widths = distributeColumnWidths(children, W);
  const color = labelColor(node2.type);
  let line = "";
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cw = widths[i];
    const lbl = trunc(child.label, cw - 2);
    const centered = centerText(lbl, cw);
    line += tag(color, centered);
    if (i < children.length - 1) {
      line += tag(THIN_COLOR, BOX.COL);
    }
  }
  return [framedLine(line, W)];
}
function renderSidebar(node2, W) {
  const lbl = trunc(node2.label, W - 8);
  const si = statusIcon2(node2.status);
  const sc = statusColor2(node2.status);
  const content = "\u25C4 " + tag("magenta", lbl) + " " + tag(sc, si) + " \u25BA";
  return [framedLine(centerText(content, W), W)];
}
function renderSingleSection(section, W) {
  const si = statusIcon2(section.status);
  const sc = statusColor2(section.status);
  if (section.children.length === 0 || section.direction !== "row") {
    const lbl = trunc(section.label, W - 6);
    const content = centerText(tag("white", lbl) + " " + tag(sc, si), W);
    return [framedLine(content, W)];
  }
  const children = section.children;
  const widths = distributeColumnWidths(children, W);
  let line = "";
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const cw = widths[i];
    const childSi = statusIcon2(child.status);
    const childSc = statusColor2(child.status);
    const lbl = trunc(child.label, cw - 4);
    const cell = lbl + " " + tag(childSc, childSi);
    line += centerText(cell, cw);
    if (i < children.length - 1) {
      line += tag(THIN_COLOR, BOX.COL);
    }
  }
  return [framedLine(line, W)];
}
function renderMainSections(sections, W) {
  const lines = [];
  for (let i = 0; i < sections.length; i++) {
    lines.push(...renderSingleSection(sections[i], W));
    if (i < sections.length - 1) {
      lines.push(thinDivider(W));
    }
  }
  return lines;
}
function decomposePage(page) {
  let navbar = null;
  let footer = null;
  let sidebar = null;
  const sections = [];
  function walk(node2) {
    if (node2.type === "navbar") {
      navbar = node2;
      return;
    }
    if (node2.type === "footer") {
      footer = node2;
      return;
    }
    if (node2.type === "sidebar") {
      sidebar = node2;
      return;
    }
    if (node2.type === "page" || node2.type === "main") {
      for (const child of node2.children) walk(child);
      return;
    }
    sections.push(node2);
  }
  walk(page);
  return { navbar, footer, sidebar, sections };
}
function renderAsciiWireframe(page, contentWidth) {
  const W = Math.max(10, contentWidth);
  const { navbar, footer, sidebar, sections } = decomposePage(page);
  const lines = [];
  lines.push(topBorder(W));
  if (navbar) {
    lines.push(...renderNavbarOrFooter(navbar, W));
    lines.push(strongDivider(W));
  }
  if (sidebar) {
    lines.push(...renderSidebar(sidebar, W));
    lines.push(thinDivider(W));
  }
  if (sections.length > 0) {
    lines.push(...renderMainSections(sections, W));
  } else {
    lines.push(framedLine(centerText(tag("gray", "(empty)"), W), W));
  }
  if (footer) {
    lines.push(strongDivider(W));
    lines.push(...renderNavbarOrFooter(footer, W));
  }
  lines.push(bottomBorder(W));
  return lines;
}
function updateCanvas(widget, wireframe, mode, proposalCount, canvasPhase) {
  const lines = [];
  if (mode) {
    if (mode.type === "consensus") {
      const phaseStr = canvasPhase && canvasPhase !== "idle" ? ` (${canvasPhase})` : "";
      lines.push(`{cyan-fg}{bold}>>> Wireframe(All)${phaseStr} <<<{/bold}{/cyan-fg}`);
    } else if (mode.type === "agent" && mode.agentName) {
      const colorMap = { pink: "magenta", orange: "yellow", purple: "magenta" };
      const color = colorMap[mode.agentColor || ""] || mode.agentColor || "white";
      lines.push(`{${color}-fg}{bold}>>> Wireframe(${mode.agentName}) <<<{/bold}{/${color}-fg}`);
    }
    lines.push("");
  }
  const widgetWidth = widget.width;
  const contentWidth = typeof widgetWidth === "number" ? widgetWidth - 2 : 28;
  lines.push(...renderAsciiWireframe(wireframe, contentWidth));
  if (proposalCount && proposalCount > 0) {
    lines.push("");
    lines.push("{gray-fg}F2/F3 cycle views{/gray-fg}");
  }
  widget.setContent(lines.join("\n"));
}
var BOX, FRAME_COLOR, THIN_COLOR;
var init_CanvasWidget = __esm({
  "cli/dashboard/widgets/CanvasWidget.ts"() {
    "use strict";
    BOX = {
      TL: "\u2554",
      TR: "\u2557",
      BL: "\u255A",
      BR: "\u255D",
      H: "\u2550",
      V: "\u2551",
      // Strong horizontal divider (double-line)
      SL: "\u2560",
      SR: "\u2563",
      SH: "\u2550",
      // Thin horizontal divider (single-line)
      THL: "\u255F",
      THR: "\u2562",
      THH: "\u2500",
      // Column separator
      COL: "\u2502"
    };
    FRAME_COLOR = "cyan";
    THIN_COLOR = "gray";
  }
});

// cli/dashboard/formatters/markdownRenderer.ts
function renderMarkdown(text3) {
  let result = text3;
  result = result.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```\w*\n?/g, "").replace(/```$/g, "");
    return `{cyan-fg}${code}{/cyan-fg}`;
  });
  result = result.replace(/`([^`]+)`/g, "{cyan-fg}$1{/cyan-fg}");
  result = result.replace(/\*\*([^*]+)\*\*/g, "{bold}$1{/bold}");
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "{italic}$1{/italic}");
  result = result.replace(/^(#{1,3})\s+(.+)$/gm, "{bold}{yellow-fg}$2{/yellow-fg}{/bold}");
  result = result.replace(/^[-*]\s+/gm, "  \u2022 ");
  result = result.replace(/^(\d+)\.\s+/gm, "  $1. ");
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "{underline}$1{/underline}");
  result = result.replace(/^-{3,}$/gm, "\u2500".repeat(40));
  return result;
}
var init_markdownRenderer = __esm({
  "cli/dashboard/formatters/markdownRenderer.ts"() {
    "use strict";
  }
});

// cli/dashboard/formatters/messageFormatter.ts
function formatTime2(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function truncateContent2(content, maxLines = 20) {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + "\n  {gray-fg}...{/gray-fg}";
}
function toBlessedColor(color) {
  const colorMap = {
    pink: "magenta",
    orange: "yellow",
    purple: "magenta"
  };
  return colorMap[color] || color;
}
function formatMessage(message) {
  const lines = [];
  const time = formatTime2(message.timestamp);
  const badge = TYPE_BADGES2[message.type] || "";
  const content = truncateContent2(message.content);
  const rendered = renderMarkdown(content);
  if (message.agentId === "system") {
    lines.push(`{gray-fg}${rendered}{/gray-fg}`);
    lines.push("");
    return lines;
  }
  if (message.agentId === "human" || message.type === "human_input") {
    lines.push(`{gray-fg}${time}{/gray-fg} {green-fg}{bold}You{/bold}{/green-fg} {gray-fg}[YOU]{/gray-fg}`);
    lines.push(`{green-fg}\u250C${"\u2500".repeat(50)}\u2510{/green-fg}`);
    for (const line of rendered.split("\n")) {
      lines.push(`{green-fg}\u2502{/green-fg} {green-fg}${line}{/green-fg}`);
    }
    lines.push(`{green-fg}\u2514${"\u2500".repeat(50)}\u2518{/green-fg}`);
    lines.push("");
    return lines;
  }
  const agentColor = toBlessedColor(getAgentColor(message.agentId));
  const displayName = getAgentDisplayName(message.agentId);
  lines.push(`{gray-fg}${time}{/gray-fg} {${agentColor}-fg}{bold}${displayName}{/bold}{/${agentColor}-fg} {gray-fg}${badge}{/gray-fg}`);
  for (const line of rendered.split("\n")) {
    lines.push(`  ${line}`);
  }
  lines.push("");
  return lines;
}
function formatTypingIndicator(agentId, spinnerFrame) {
  const agentColor = toBlessedColor(getAgentColor(agentId));
  const displayName = getAgentDisplayName(agentId);
  return `{${agentColor}-fg}${spinnerFrame} ${displayName} is thinking...{/${agentColor}-fg}`;
}
var init_messageFormatter = __esm({
  "cli/dashboard/formatters/messageFormatter.ts"() {
    "use strict";
    init_personas();
    init_markdownRenderer();
    init_theme();
  }
});

// cli/dashboard/widgets/ChatLogWidget.ts
function appendMessages(widget, messages) {
  const newMessages = messages.slice(lastLoggedCount);
  for (const msg of newMessages) {
    const lines = formatMessage(msg);
    for (const line of lines) {
      widget.log(line);
    }
  }
  lastLoggedCount = messages.length;
}
function updateTypingIndicator(widget, currentSpeaker, screen) {
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
  if (!currentSpeaker) return;
  let frameIdx = 0;
  typingInterval = setInterval(() => {
    const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
    const line = formatTypingIndicator(currentSpeaker, frame);
    if (frameIdx === 0) {
      widget.log(line);
    }
    frameIdx++;
    if (frameIdx >= SPINNER_FRAMES.length) {
      frameIdx = 0;
    }
  }, 100);
  setTimeout(() => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  }, 500);
}
function resetChatLog() {
  lastLoggedCount = 0;
  if (typingInterval) {
    clearInterval(typingInterval);
    typingInterval = null;
  }
}
var lastLoggedCount, typingInterval;
var init_ChatLogWidget = __esm({
  "cli/dashboard/widgets/ChatLogWidget.ts"() {
    "use strict";
    init_messageFormatter();
    init_theme();
    lastLoggedCount = 0;
    typingInterval = null;
  }
});

// cli/dashboard/widgets/AgentPanelWidget.ts
function toBlessedColor2(color) {
  const colorMap = {
    pink: "magenta",
    orange: "yellow",
    purple: "magenta"
  };
  return colorMap[color] || color;
}
function buildBar(count, maxCount, width) {
  if (maxCount === 0) return BAR_EMPTY.repeat(width);
  const filled = Math.round(count / maxCount * width);
  return BAR_CHAR.repeat(filled) + BAR_EMPTY.repeat(width - filled);
}
function getResonanceColor2(score) {
  if (score >= 60) return RESONANCE_COLORS.high;
  if (score >= 30) return RESONANCE_COLORS.medium;
  return RESONANCE_COLORS.low;
}
function getResonanceTrendIcon(trend) {
  if (!trend) return "";
  return RESONANCE_TREND_ICONS[trend];
}
function updateAgentPanel(widget, agents, currentSpeaker) {
  const maxContributions = Math.max(1, ...agents.map((a) => a.contributions));
  const barWidth = 6;
  const lines = [];
  for (const agent of agents) {
    const isSpeaking = agent.id === currentSpeaker;
    const stateIcon = isSpeaking ? "\u{1F4AC}" : STATE_ICONS2[agent.state] || "\u2022";
    const color = toBlessedColor2(agent.color);
    const bar = buildBar(agent.contributions, maxContributions, barWidth);
    const boldStart = isSpeaking ? "{bold}" : "";
    const boldEnd = isSpeaking ? "{/bold}" : "";
    const wireframeIcon = agent.hasWireframe ? " \u{1F5BC}" : "";
    let resonanceStr = "";
    if (agent.resonance !== void 0) {
      const rColor = getResonanceColor2(agent.resonance);
      const trendIcon = getResonanceTrendIcon(agent.resonanceTrend);
      resonanceStr = ` {${rColor}-fg}R:${agent.resonance}${trendIcon}{/${rColor}-fg}`;
    }
    const roleStr = agent.role ? ` {gray-fg}(${agent.role.slice(0, 15)}){/gray-fg}` : "";
    lines.push(
      `${stateIcon} ${boldStart}{${color}-fg}${agent.name.padEnd(10)}{/${color}-fg}${boldEnd}${roleStr}${wireframeIcon} {cyan-fg}${bar}{/cyan-fg} ${agent.contributions}${resonanceStr}`
    );
    const detail = agent.currentStance || agent.latestArgument;
    if (detail) {
      const truncated = detail.length > 38 ? detail.slice(0, 37) + "\u2026" : detail;
      lines.push(`   {gray-fg}${truncated}{/gray-fg}`);
    }
  }
  widget.setContent(lines.join("\n"));
}
var init_AgentPanelWidget = __esm({
  "cli/dashboard/widgets/AgentPanelWidget.ts"() {
    "use strict";
    init_theme();
  }
});

// cli/dashboard/widgets/ConsensusChartWidget.ts
function updateConsensusChart(widget, consensusHistory, conflictHistory, resonanceHistory) {
  const consensus = consensusHistory.slice(-MAX_DATA_POINTS);
  const conflict = conflictHistory.slice(-MAX_DATA_POINTS);
  const resonance = resonanceHistory?.slice(-MAX_DATA_POINTS) ?? [];
  const maxLen = Math.max(consensus.length, conflict.length, resonance.length, 1);
  const xLabels = Array.from({ length: maxLen }, (_, i) => String(i + 1));
  const data = [
    {
      title: "\u2713 Consensus",
      x: xLabels,
      y: consensus.length > 0 ? consensus : [0],
      style: { line: "green" }
    },
    {
      title: "\u2717 Conflict",
      x: xLabels.length > 0 ? xLabels : ["1"],
      y: conflict.length > 0 ? conflict : [0],
      style: { line: "red" }
    }
  ];
  if (resonance.length > 0) {
    data.push({
      title: "\u2661 Resonance",
      x: xLabels,
      y: resonance,
      style: { line: "cyan" }
    });
  }
  widget.setData(data);
}
var MAX_DATA_POINTS;
var init_ConsensusChartWidget = __esm({
  "cli/dashboard/widgets/ConsensusChartWidget.ts"() {
    "use strict";
    MAX_DATA_POINTS = 20;
  }
});

// cli/dashboard/widgets/PhaseTimelineWidget.ts
function buildGauge(percent, width) {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)));
  return `{green-fg}${BAR_CHAR.repeat(filled)}{/green-fg}{gray-fg}${BAR_EMPTY.repeat(width - filled)}{/gray-fg} ${percent}%`;
}
function updatePhaseTimeline(widget, currentPhase, phaseMessageCount, phaseThreshold) {
  const currentIdx = ALL_PHASES.indexOf(currentPhase);
  const lines = [];
  let timeline = "";
  for (let i = 0; i < ALL_PHASES.length; i++) {
    const phaseColor = PHASE_COLORS2[ALL_PHASES[i]] || "white";
    const label = PHASE_LABELS[ALL_PHASES[i]];
    let dot;
    let labelColor2;
    if (i < currentIdx) {
      dot = `{green-fg}${DOT_DONE}{/green-fg}`;
      labelColor2 = "green";
    } else if (i === currentIdx) {
      dot = `{${phaseColor}-fg}${DOT_CURRENT}{/${phaseColor}-fg}`;
      labelColor2 = phaseColor;
    } else {
      dot = `{gray-fg}${DOT_FUTURE}{/gray-fg}`;
      labelColor2 = "gray";
    }
    timeline += `${dot}{${labelColor2}-fg}${label}{/${labelColor2}-fg}`;
    if (i < ALL_PHASES.length - 1) {
      if (i < currentIdx) {
        timeline += `{green-fg}${DOT_LINE}{/green-fg}`;
      } else {
        timeline += `{gray-fg}${DOT_LINE}{/gray-fg}`;
      }
    }
  }
  lines.push(timeline);
  const percent = phaseThreshold > 0 ? Math.max(0, Math.min(100, Math.round(phaseMessageCount / phaseThreshold * 100))) : 0;
  lines.push("");
  lines.push(`Progress: ${buildGauge(percent, 15)}`);
  widget.setContent(lines.join("\n"));
}
var init_PhaseTimelineWidget = __esm({
  "cli/dashboard/widgets/PhaseTimelineWidget.ts"() {
    "use strict";
    init_theme();
  }
});

// cli/dashboard/widgets/QuickRepliesWidget.ts
function updateQuickReplies(widget, replies) {
  if (replies.length === 0) {
    widget.setContent("{gray-fg}No suggestions{/gray-fg}");
    return;
  }
  const pills = replies.map((reply, i) => {
    const color = reply.isCommand ? "yellow" : "white";
    return `{gray-fg}[{/gray-fg}{cyan-fg}{bold}${i + 1}{/bold}{/cyan-fg}{gray-fg}]{/gray-fg} {${color}-fg}${reply.label}{/${color}-fg}`;
  });
  widget.setContent(pills.join("  ") + "  {gray-fg}Press 1-" + replies.length + " to select{/gray-fg}");
}
var init_QuickRepliesWidget = __esm({
  "cli/dashboard/widgets/QuickRepliesWidget.ts"() {
    "use strict";
  }
});

// cli/dashboard/widgets/SuggestionWidget.ts
function showSuggestion(widget, quickRepliesWidget, suggestion, screen) {
  if (dismissTimer) clearTimeout(dismissTimer);
  const content = `{yellow-fg}\u{1F4A1} ${suggestion.agentName} suggests:{/yellow-fg} ${suggestion.suggestion}`;
  widget.setContent(content);
  widget.show();
  quickRepliesWidget.hide();
  scheduleRender(screen);
  dismissTimer = setTimeout(() => {
    hideSuggestion(widget, quickRepliesWidget, screen);
  }, 8e3);
}
function hideSuggestion(widget, quickRepliesWidget, screen) {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  widget.hide();
  quickRepliesWidget.show();
  scheduleRender(screen);
}
var dismissTimer;
var init_SuggestionWidget = __esm({
  "cli/dashboard/widgets/SuggestionWidget.ts"() {
    "use strict";
    init_screen();
    dismissTimer = null;
  }
});

// cli/dashboard/widgets/StatusBarWidget.ts
function updateStatusBar(widget, statusMessage) {
  if (statusMessage) {
    widget.setContent(`{yellow-fg}${statusMessage}{/yellow-fg}`);
    return;
  }
  const shortcuts = [
    "{gray-fg}F1{/gray-fg}:Help",
    "{gray-fg}F5{/gray-fg}:Synth",
    "{gray-fg}F9{/gray-fg}:Export",
    "{gray-fg}1-4{/gray-fg}:Quick",
    "{gray-fg}j/k{/gray-fg}:Scroll",
    "{gray-fg}Tab{/gray-fg}:Focus",
    "{gray-fg}Ctrl+C{/gray-fg}:Quit"
  ];
  widget.setContent(shortcuts.join("  "));
}
var init_StatusBarWidget = __esm({
  "cli/dashboard/widgets/StatusBarWidget.ts"() {
    "use strict";
  }
});

// cli/dashboard/widgets/InputWidget.ts
function activateInput(widget, screen) {
  widget.focus();
  screen.program.showCursor();
  scheduleRender(screen);
}
function setupInput(widget, screen, handlers) {
  let inputValue = "";
  screen.on("keypress", (ch, key) => {
    if (screen.focused !== widget) return;
    if (!key) return;
    if (key.name === "enter") {
      const trimmed = inputValue.trim();
      if (!trimmed) return;
      if (trimmed.startsWith("/")) {
        const parts = trimmed.slice(1).split(/\s+/);
        handlers.onCommand(parts[0], parts.slice(1));
      } else {
        handlers.onSubmit(trimmed);
      }
      inputValue = "";
      widget.setValue("");
      scheduleRender(screen);
      return;
    }
    if (key.name === "escape") {
      inputValue = "";
      widget.setValue("");
      scheduleRender(screen);
      return;
    }
    if (key.ctrl || key.meta) return;
    if (key.name === "tab") return;
    if (key.name === "f1" || key.name === "f2" || key.name === "f3" || key.name === "f5" || key.name === "f9") return;
    if (key.name === "pageup" || key.name === "pagedown") return;
    if (key.name === "up" || key.name === "down") return;
    if (key.name === "backspace") {
      if (inputValue.length > 0) {
        inputValue = inputValue.slice(0, -1);
        widget.setValue(inputValue);
        scheduleRender(screen);
      }
      return;
    }
    if (ch && !/^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/.test(ch)) {
      inputValue += ch;
      widget.setValue(inputValue);
      scheduleRender(screen);
    }
  });
}
var init_InputWidget = __esm({
  "cli/dashboard/widgets/InputWidget.ts"() {
    "use strict";
    init_screen();
  }
});

// cli/dashboard/DashboardController.ts
import { v4 as uuid3 } from "uuid";
var PHASE_THRESHOLDS, DashboardController;
var init_DashboardController = __esm({
  "cli/dashboard/DashboardController.ts"() {
    "use strict";
    init_suggestions();
    init_personas();
    init_wireframe();
    init_BuildOrchestrator();
    init_build_personas();
    init_screen();
    init_HeaderWidget();
    init_BreadcrumbWidget();
    init_CanvasWidget();
    init_ChatLogWidget();
    init_AgentPanelWidget();
    init_ConsensusChartWidget();
    init_PhaseTimelineWidget();
    init_QuickRepliesWidget();
    init_SuggestionWidget();
    init_StatusBarWidget();
    init_InputWidget();
    PHASE_THRESHOLDS = {
      brainstorming: 36,
      argumentation: 25,
      synthesis: 15,
      drafting: 20
    };
    DashboardController = class {
      screen;
      widgets;
      orchestrator;
      persistence;
      session;
      toolRunner;
      onExit;
      // Internal state
      state = {
        messages: [],
        phase: "initialization",
        currentSpeaker: null,
        queued: [],
        agentStates: /* @__PURE__ */ new Map(),
        contributions: /* @__PURE__ */ new Map(),
        consensusPoints: 0,
        conflictPoints: 0,
        consensusHistory: [],
        conflictHistory: [],
        statusMessage: null,
        agentSuggestion: null,
        quickReplies: [],
        canvasMode: "consensus",
        selectedCanvasAgent: null,
        wireframeProposals: /* @__PURE__ */ new Map(),
        canvasConsensusPhase: "idle",
        resonanceGlobal: 50,
        resonancePerAgent: /* @__PURE__ */ new Map(),
        resonanceHistory: [],
        resonanceTarget: [50, 70]
      };
      prevMessageCount = 0;
      phaseStartMessageIndex = 0;
      wireframe = getDefaultWireframe();
      canvasViewOrder = ["consensus"];
      canvasViewIndex = 0;
      unsubscribe = null;
      statusTimer = null;
      focusableWidgets = [];
      focusIndex = 0;
      buildOrchestrator = null;
      pendingDraft = null;
      constructor(screen, widgets, orchestrator, persistence, session, toolRunner, onExit) {
        this.screen = screen;
        this.widgets = widgets;
        this.orchestrator = orchestrator;
        this.persistence = persistence;
        this.session = session;
        this.toolRunner = toolRunner;
        this.onExit = onExit;
        this.focusableWidgets = [widgets.input, widgets.chatLog, widgets.quickReplies];
      }
      /**
       * Initialize: subscribe to events, set up input, render initial state, start orchestrator
       */
      async start() {
        setupInput(this.widgets.input, this.screen, {
          onSubmit: (text3) => this.handleSubmit(text3),
          onCommand: (command, args) => this.handleCommand(command, args)
        });
        this.setupKeys();
        this.widgets.chatLog.interactive = true;
        this.unsubscribe = this.orchestrator.on((event) => {
          this.handleEvent(event);
        });
        this.renderAll();
        activateInput(this.widgets.input, this.screen);
        this.screen.render();
        await this.orchestrator.start();
      }
      /**
       * Clean up subscriptions and timers
       */
      destroy() {
        if (this.unsubscribe) {
          this.unsubscribe();
          this.unsubscribe = null;
        }
        if (this.statusTimer) {
          clearTimeout(this.statusTimer);
          this.statusTimer = null;
        }
        resetChatLog();
      }
      // ─── Event Handling ─────────────────────────────────────────────────
      handleEvent(event) {
        switch (event.type) {
          case "phase_change":
            this.handlePhaseChange(event);
            break;
          case "agent_message":
            this.handleAgentMessage(event);
            break;
          case "agent_typing":
            this.handleAgentTyping(event);
            break;
          case "floor_status":
            this.handleFloorStatus(event);
            break;
          case "synthesis":
            this.setStatusMessage("Synthesis complete");
            break;
          case "error":
            this.setStatusMessage(`Error: ${event.data.message}`);
            break;
          case "canvas_update": {
            this.state.canvasConsensusPhase = this.orchestrator.getCanvasConsensusPhase();
            const proposals = this.orchestrator.getWireframeProposals();
            this.state.wireframeProposals = proposals;
            this.canvasViewOrder = ["consensus", ...Array.from(proposals.keys())];
            this.updateCanvas();
            this.updateAgentPanel();
            break;
          }
          case "resonance_update": {
            const resData = event.data;
            this.state.resonanceGlobal = resData.globalScore;
            this.state.resonanceTarget = resData.phaseTarget;
            this.state.resonanceHistory.push(resData.globalScore);
            if (this.state.resonanceHistory.length > 20) {
              this.state.resonanceHistory = this.state.resonanceHistory.slice(-20);
            }
            for (const [id, info] of Object.entries(resData.agents)) {
              this.state.resonancePerAgent.set(id, info.score);
            }
            this.updateHeader();
            this.updateAgentPanel();
            this.updateConsensusChart();
            break;
          }
        }
        scheduleRender(this.screen);
      }
      handlePhaseChange(event) {
        const data = event.data;
        this.state.phase = data.phase;
        this.phaseStartMessageIndex = this.state.messages.length;
        if (data.phase === "finalization" && data.buildReady && data.draftMarkdown) {
          this.pendingDraft = data.draftMarkdown;
        }
        this.updateHeader();
        this.updateBreadcrumbs();
        this.updatePhaseTimeline();
        this.updateQuickReplies();
      }
      handleAgentMessage(_event) {
        const allMessages = this.orchestrator.getMessages();
        this.state.messages = allMessages;
        const status = this.orchestrator.getConsensusStatus();
        this.state.contributions = status.agentParticipation;
        this.state.consensusPoints = status.consensusPoints;
        this.state.conflictPoints = status.conflictPoints;
        this.state.agentStates = new Map(this.orchestrator.getAgentStates());
        this.state.consensusHistory.push(status.consensusPoints);
        this.state.conflictHistory.push(status.conflictPoints);
        if (this.toolRunner && this.toolRunner.getAvailableTools().length > 0) {
          const latest = allMessages[allMessages.length - 1];
          if (latest && latest.agentId !== "system") {
            const toolMatch = latest.content.match(/\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/);
            if (toolMatch) {
              const toolName = toolMatch[1];
              const toolPrompt = toolMatch[2].trim();
              const outputDir = this.persistence.getSessionDir();
              this.toolRunner.runTool(toolName, { prompt: toolPrompt, description: toolPrompt }, outputDir).then((result) => {
                const toolMsg = {
                  id: uuid3(),
                  timestamp: /* @__PURE__ */ new Date(),
                  agentId: "system",
                  type: "tool_result",
                  content: result.success ? `Tool "${toolName}" completed: ${result.description || result.outputPath || "done"}` : `Tool "${toolName}" failed: ${result.error}`,
                  metadata: result.outputPath ? { outputPath: result.outputPath } : void 0
                };
                this.state.messages.push(toolMsg);
                appendMessages(this.widgets.chatLog, this.state.messages);
                scheduleRender(this.screen);
              });
            }
          }
        }
        const lastMsg = allMessages[allMessages.length - 1];
        if (lastMsg && lastMsg.agentId !== "system" && lastMsg.agentId !== "human") {
          const proposed = extractWireframe(lastMsg.content);
          if (proposed) {
            const agent = getAgentById(lastMsg.agentId);
            this.state.wireframeProposals.set(lastMsg.agentId, {
              agentId: lastMsg.agentId,
              agentName: agent?.name || lastMsg.agentId,
              wireframe: proposed,
              timestamp: Date.now(),
              messageIndex: allMessages.length - 1
            });
            this.wireframe = proposed;
            this.canvasViewOrder = ["consensus", ...Array.from(this.state.wireframeProposals.keys())];
            this.updateCanvas();
          }
        }
        const suggestionData = detectAgentSuggestion(
          allMessages,
          this.state.phase,
          this.state.consensusPoints,
          this.state.conflictPoints,
          this.prevMessageCount
        );
        if (suggestionData) {
          const agent = getAgentById(suggestionData.agentId);
          if (agent) suggestionData.agentName = agent.name;
          this.state.agentSuggestion = suggestionData;
          showSuggestion(this.widgets.suggestion, this.widgets.quickReplies, suggestionData, this.screen);
        }
        this.prevMessageCount = allMessages.length;
        appendMessages(this.widgets.chatLog, allMessages);
        this.updateHeader();
        this.updateAgentPanel();
        this.updateConsensusChart();
        this.updatePhaseTimeline();
        this.updateQuickReplies();
      }
      handleAgentTyping(event) {
        const { agentId, typing } = event.data;
        if (typing) {
          this.state.currentSpeaker = agentId;
        }
        this.state.agentStates = new Map(this.orchestrator.getAgentStates());
        updateTypingIndicator(this.widgets.chatLog, typing ? agentId : null, this.screen);
        this.updateHeader();
        this.updateAgentPanel();
      }
      handleFloorStatus(event) {
        const { current } = event.data;
        this.state.currentSpeaker = current;
        const floorStatus = this.orchestrator.getFloorStatus();
        this.state.queued = floorStatus.queued;
        this.updateHeader();
        this.updateAgentPanel();
      }
      // ─── Human Input ────────────────────────────────────────────────────
      async handleSubmit(text3) {
        await this.orchestrator.addHumanMessage(text3);
        const allMessages = this.orchestrator.getMessages();
        this.state.messages = allMessages;
        appendMessages(this.widgets.chatLog, allMessages);
        scheduleRender(this.screen);
      }
      async handleCommand(command, args) {
        switch (command.toLowerCase()) {
          case "pause":
            this.orchestrator.pause();
            this.setStatusMessage("\u23F8 Debate paused");
            break;
          case "resume":
            this.orchestrator.resume();
            this.setStatusMessage("\u25B6 Debate resumed");
            break;
          case "status": {
            const status = this.orchestrator.getConsensusStatus();
            this.setStatusMessage(`\u{1F4CA} ${status.recommendation}`);
            break;
          }
          case "synthesize": {
            const force = args.includes("force");
            this.setStatusMessage("\u23F3 Transitioning to synthesis...");
            const result = await this.orchestrator.transitionToSynthesis(force);
            this.setStatusMessage(result.success ? `\u2705 ${result.message}` : `\u26A0 ${result.message}`);
            break;
          }
          case "export": {
            this.setStatusMessage("\u23F3 Exporting...");
            await this.persistence.saveFull();
            const dir = this.persistence.getSessionDir();
            this.setStatusMessage(`\u2705 Exported to ${dir}`);
            break;
          }
          case "build":
            await this.startBuildPhase();
            break;
          case "pick": {
            if (!this.buildOrchestrator) {
              this.setStatusMessage("\u274C No build in progress. Use /build first.");
              break;
            }
            const pickName = args[0];
            if (!pickName) {
              this.setStatusMessage("\u274C Usage: /pick <name> (mika, dani, or shai)");
              break;
            }
            const pickResult = await this.buildOrchestrator.pickWinner(pickName);
            if (pickResult.success) {
              this.setStatusMessage(`\u{1F3C6} Winner: ${pickName}! Other servers stopped.`);
              this.appendSystemMessage(`\u{1F3C6} **Winner picked: ${pickName}!** Other dev servers have been stopped.`);
            } else {
              this.setStatusMessage(`\u274C ${pickResult.error}`);
            }
            break;
          }
          case "changes": {
            if (!this.buildOrchestrator) {
              this.setStatusMessage("\u274C No build in progress. Use /build first.");
              break;
            }
            const changeName = args[0];
            const feedback = args.slice(1).join(" ");
            if (!changeName || !feedback) {
              this.setStatusMessage("\u274C Usage: /changes <name> <feedback>");
              break;
            }
            this.setStatusMessage(`\u23F3 Requesting changes from ${changeName}...`);
            this.appendSystemMessage(`\u{1F504} Rebuilding ${changeName}'s site with feedback: "${feedback}"`);
            const changesResult = await this.buildOrchestrator.requestChanges(changeName, feedback);
            if (changesResult.success) {
              this.setStatusMessage(`\u2705 ${changeName}'s site rebuilt successfully`);
            } else {
              this.setStatusMessage(`\u274C Rebuild failed: ${changesResult.error}`);
            }
            break;
          }
          case "urls": {
            if (!this.buildOrchestrator) {
              this.setStatusMessage("\u274C No build in progress.");
              break;
            }
            const urls = this.buildOrchestrator.getUrls();
            if (urls.length === 0) {
              this.setStatusMessage("\u274C No dev servers running.");
            } else {
              const urlList = urls.map((u) => `  ${u.name}: ${u.url}`).join("\n");
              this.appendSystemMessage(`\u{1F310} **Dev Server URLs:**
${urlList}`);
            }
            break;
          }
          case "help":
            this.showHelp();
            break;
          case "quit":
          case "exit":
            await this.gracefulExit();
            break;
          default:
            this.setStatusMessage(`\u274C Unknown command: /${command}. Type /help for available commands.`);
        }
      }
      async gracefulExit() {
        await this.buildOrchestrator?.stopDevServers();
        await this.persistence.saveFull();
        this.orchestrator.stop();
        this.onExit();
        this.destroy();
        this.screen.destroy();
      }
      /**
       * Start the build phase — stop copy agents, launch 3 parallel website builds
       */
      async startBuildPhase() {
        if (!this.pendingDraft) {
          this.setStatusMessage("\u274C No draft ready. Wait for finalization before /build.");
          return;
        }
        if (this.buildOrchestrator) {
          this.setStatusMessage("\u274C Build already in progress.");
          return;
        }
        this.orchestrator.pause();
        const sessionDir = this.persistence.getSessionDir();
        this.buildOrchestrator = new BuildOrchestrator(
          sessionDir,
          this.pendingDraft,
          this.session.config.projectName
        );
        this.buildOrchestrator.on((event) => this.handleBuildEvent(event));
        this.state.phase = "building";
        this.state.buildPhase = "building";
        this.updateHeader();
        this.updateBreadcrumbs();
        this.updatePhaseTimeline();
        this.updateQuickReplies();
        this.appendSystemMessage("\u{1F528} **BUILD PHASE STARTED** \u2014 3 engineering agents are building SvelteKit websites from your copy...\n\n" + BUILD_PERSONAS.map((p4) => `  {${p4.color}-fg}${p4.name}{/${p4.color}-fg}: ${p4.designPhilosophy.split("\u2014")[0].trim()}`).join("\n"));
        try {
          await this.buildOrchestrator.startBuilds();
          await this.buildOrchestrator.startDevServers();
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          this.setStatusMessage(`\u274C Build failed: ${msg}`);
        }
      }
      /**
       * Handle events from BuildOrchestrator
       */
      handleBuildEvent(event) {
        const data = event.data;
        switch (event.type) {
          case "build_progress": {
            const agentId = data.agentId;
            const message = data.message;
            const persona = BUILD_PERSONAS.find((p4) => p4.id === agentId);
            const color = persona?.color || "gray";
            const name = persona?.name || agentId;
            this.appendSystemMessage(`{${color}-fg}[${name}]{/${color}-fg} ${message}`);
            break;
          }
          case "build_complete": {
            const agentId = data.agentId;
            const persona = BUILD_PERSONAS.find((p4) => p4.id === agentId);
            this.appendSystemMessage(`\u2705 **${persona?.name || agentId}** build complete!`);
            this.updateAgentPanel();
            break;
          }
          case "build_error": {
            const agentId = data.agentId;
            const error = data.error;
            const persona = BUILD_PERSONAS.find((p4) => p4.id === agentId);
            this.appendSystemMessage(`\u274C **${persona?.name || agentId}** error: ${error}`);
            this.updateAgentPanel();
            break;
          }
          case "server_started": {
            const agentId = data.agentId;
            const url = data.url;
            const persona = BUILD_PERSONAS.find((p4) => p4.id === agentId);
            this.appendSystemMessage(`\u{1F310} **${persona?.name || agentId}** dev server: ${url}`);
            this.updateAgentPanel();
            break;
          }
          case "all_servers_ready": {
            this.state.phase = "picking";
            this.state.buildPhase = "picking";
            const urls = this.buildOrchestrator.getUrls();
            this.state.buildUrls = urls;
            const urlList = urls.map((u) => `  \u{1F310} **${u.name}**: ${u.url}`).join("\n");
            this.appendSystemMessage(`
\u{1F3C6} **ALL SITES READY!**

${urlList}

Open in your browser, then:
  \`/pick <name>\` \u2014 choose winner
  \`/changes <name> <feedback>\` \u2014 request revisions`);
            this.updateHeader();
            this.updateBreadcrumbs();
            this.updatePhaseTimeline();
            this.updateQuickReplies();
            this.updateAgentPanel();
            break;
          }
        }
        scheduleRender(this.screen);
      }
      /**
       * Append a system message to the chat log
       */
      appendSystemMessage(content) {
        const msg = {
          id: crypto.randomUUID(),
          timestamp: /* @__PURE__ */ new Date(),
          agentId: "system",
          type: "system",
          content
        };
        this.state.messages.push(msg);
        appendMessages(this.widgets.chatLog, this.state.messages);
        scheduleRender(this.screen);
      }
      // ─── Widget Update Helpers ──────────────────────────────────────────
      getAgentResonanceTrend(agentId) {
        const monitor = this.orchestrator.getResonanceMonitor();
        const resonance = monitor.getAgentResonance(agentId);
        return resonance?.trend;
      }
      updateHeader() {
        updateHeader(
          this.widgets.header,
          this.state.phase,
          this.state.currentSpeaker,
          this.state.messages.length,
          this.state.consensusPoints,
          this.state.conflictPoints,
          this.state.resonanceGlobal
        );
      }
      updateBreadcrumbs() {
        updateBreadcrumbs(
          this.widgets.breadcrumbs,
          this.session.config.projectName,
          this.state.phase
        );
      }
      updateCanvas() {
        const view = this.canvasViewOrder[this.canvasViewIndex] || "consensus";
        if (view === "consensus") {
          const label = this.state.wireframeProposals.size > 0 ? ` Wireframe(All) ` : ` Wireframe `;
          this.widgets.canvas.setLabel(label);
          updateCanvas(this.widgets.canvas, this.wireframe, {
            type: "consensus"
          }, this.state.wireframeProposals.size, this.state.canvasConsensusPhase);
        } else {
          const proposal = this.state.wireframeProposals.get(view);
          if (proposal) {
            const agent = getAgentById(view);
            this.widgets.canvas.setLabel(` Wireframe(${proposal.agentName}) `);
            updateCanvas(this.widgets.canvas, proposal.wireframe, {
              type: "agent",
              agentName: proposal.agentName,
              agentColor: agent?.color
            }, this.state.wireframeProposals.size, this.state.canvasConsensusPhase);
          } else {
            this.widgets.canvas.setLabel(` Wireframe `);
            updateCanvas(this.widgets.canvas, this.wireframe, { type: "consensus" });
          }
        }
      }
      applyCanvasView() {
        this.updateCanvas();
        scheduleRender(this.screen);
      }
      updateAgentPanel() {
        if (this.buildOrchestrator && (this.state.phase === "building" || this.state.phase === "picking")) {
          const buildResults = this.buildOrchestrator.getResults();
          const agents2 = BUILD_PERSONAS.map((persona) => {
            const result = buildResults.get(persona.id);
            let state = "waiting";
            let latestArgument;
            if (result) {
              switch (result.status) {
                case "building":
                  state = "thinking";
                  latestArgument = "Building...";
                  break;
                case "running":
                  state = "speaking";
                  latestArgument = `http://localhost:${persona.port}`;
                  break;
                case "error":
                  state = "listening";
                  latestArgument = result.error?.slice(0, 50);
                  break;
                default:
                  state = "waiting";
              }
            }
            return {
              id: persona.id,
              name: persona.name,
              nameHe: "",
              color: persona.color,
              state,
              contributions: 0,
              role: persona.designPhilosophy.split("\u2014")[0].trim(),
              latestArgument
            };
          });
          updateAgentPanel(this.widgets.agentPanel, agents2, null);
          return;
        }
        const agents = this.session.config.enabledAgents.map((id) => {
          const agent = getAgentById(id);
          const memoryState = this.orchestrator.getAgentMemoryState(id);
          const agentMessages = this.state.messages.filter((m) => m.agentId === id);
          const lastMessage = agentMessages[agentMessages.length - 1];
          const latestArgument = lastMessage ? lastMessage.content.replace(/\[.*?\]/g, "").trim().slice(0, 50) : void 0;
          return {
            id,
            name: agent?.name || id,
            nameHe: agent?.nameHe || "",
            color: agent?.color || "gray",
            state: this.state.agentStates.get(id) || "listening",
            contributions: this.state.contributions.get(id) || 0,
            role: agent?.role,
            currentStance: memoryState?.positions?.[memoryState.positions.length - 1],
            latestArgument,
            hasWireframe: this.state.wireframeProposals.has(id),
            resonance: this.state.resonancePerAgent.get(id),
            resonanceTrend: this.getAgentResonanceTrend(id)
          };
        });
        updateAgentPanel(this.widgets.agentPanel, agents, this.state.currentSpeaker);
      }
      updateConsensusChart() {
        updateConsensusChart(
          this.widgets.consensusChart,
          this.state.consensusHistory,
          this.state.conflictHistory,
          this.state.resonanceHistory
        );
      }
      updatePhaseTimeline() {
        const phaseMessageCount = this.state.messages.length - this.phaseStartMessageIndex;
        const threshold = PHASE_THRESHOLDS[this.state.phase] || 10;
        updatePhaseTimeline(this.widgets.phaseTimeline, this.state.phase, phaseMessageCount, threshold);
      }
      updateQuickReplies() {
        this.state.quickReplies = getQuickReplies(
          this.state.phase,
          this.state.messages,
          this.state.consensusPoints,
          this.state.conflictPoints
        );
        updateQuickReplies(this.widgets.quickReplies, this.state.quickReplies);
      }
      setStatusMessage(msg) {
        this.state.statusMessage = msg;
        updateStatusBar(this.widgets.statusBar, msg);
        scheduleRender(this.screen);
        if (this.statusTimer) clearTimeout(this.statusTimer);
        this.statusTimer = setTimeout(() => {
          this.state.statusMessage = null;
          updateStatusBar(this.widgets.statusBar, null);
          scheduleRender(this.screen);
        }, 8e3);
      }
      showHelp() {
        const helpLines = [
          "{bold}Commands:{/bold}",
          "  /pause      - Pause debate",
          "  /resume     - Resume debate",
          "  /status     - Show consensus status",
          "  /synthesize - Move to synthesis phase",
          "  /export     - Export transcript",
          "  /quit       - Save and exit",
          "",
          "{bold}Shortcuts:{/bold}",
          "  Ctrl+C     - Save and exit",
          "  Ctrl+S     - Quick synthesize",
          "  Ctrl+E     - Quick export",
          "  PgUp/PgDn  - Scroll chat",
          "  F2 / F3    - Cycle wireframe views",
          "  Tab        - Cycle focus",
          "  Esc        - Focus input",
          "  F1         - This help"
        ];
        this.widgets.chatLog.log("{yellow-fg}" + helpLines.join("\n") + "{/yellow-fg}");
        scheduleRender(this.screen);
      }
      /**
       * Render all widgets with current state
       */
      renderAll() {
        this.updateHeader();
        this.updateBreadcrumbs();
        appendMessages(this.widgets.chatLog, this.state.messages);
        this.updateCanvas();
        this.updateAgentPanel();
        this.updateConsensusChart();
        this.updatePhaseTimeline();
        this.updateQuickReplies();
        updateStatusBar(this.widgets.statusBar, null);
      }
      // ─── Keyboard Navigation ───────────────────────────────────────────
      setFocus(index) {
        if (index === 0) {
          activateInput(this.widgets.input, this.screen);
        } else {
          this.screen.program.hideCursor();
          this.focusableWidgets[index].focus();
        }
        scheduleRender(this.screen);
      }
      setupKeys() {
        this.screen.key(["C-c"], () => {
          this.handleCommand("quit", []);
        });
        this.screen.key(["tab"], () => {
          this.focusIndex = (this.focusIndex + 1) % this.focusableWidgets.length;
          this.setFocus(this.focusIndex);
        });
        this.screen.key(["S-tab"], () => {
          this.focusIndex = (this.focusIndex - 1 + this.focusableWidgets.length) % this.focusableWidgets.length;
          this.setFocus(this.focusIndex);
        });
        this.screen.key(["escape"], () => {
          this.focusIndex = 0;
          activateInput(this.widgets.input, this.screen);
          scheduleRender(this.screen);
        });
        this.screen.key(["f1"], () => {
          this.showHelp();
        });
        this.screen.key(["f5"], () => {
          this.handleCommand("synthesize", []);
        });
        this.screen.key(["f9"], () => {
          this.handleCommand("export", []);
        });
        this.screen.key(["C-s"], () => {
          this.handleCommand("synthesize", []);
        });
        this.screen.key(["C-e"], () => {
          this.handleCommand("export", []);
        });
        for (let i = 1; i <= 4; i++) {
          this.screen.key([String(i)], () => {
            if (this.focusIndex !== 0) {
              const reply = this.state.quickReplies[i - 1];
              if (reply) {
                if (reply.isCommand) {
                  const parts = reply.value.slice(1).split(/\s+/);
                  this.handleCommand(parts[0], parts.slice(1));
                } else {
                  this.handleSubmit(reply.value);
                }
              }
            }
          });
        }
        this.screen.key(["C-up"], () => {
          this.widgets.chatLog.scroll(-3);
          scheduleRender(this.screen);
        });
        this.screen.key(["C-down"], () => {
          this.widgets.chatLog.scroll(3);
          scheduleRender(this.screen);
        });
        this.screen.key(["f2"], () => {
          if (this.canvasViewOrder.length > 1) {
            this.canvasViewIndex = (this.canvasViewIndex - 1 + this.canvasViewOrder.length) % this.canvasViewOrder.length;
            this.applyCanvasView();
          }
        });
        this.screen.key(["f3"], () => {
          if (this.canvasViewOrder.length > 1) {
            this.canvasViewIndex = (this.canvasViewIndex + 1) % this.canvasViewOrder.length;
            this.applyCanvasView();
          }
        });
        this.screen.key(["C-left"], () => {
          if (this.canvasViewOrder.length > 1) {
            this.canvasViewIndex = (this.canvasViewIndex - 1 + this.canvasViewOrder.length) % this.canvasViewOrder.length;
            this.applyCanvasView();
          }
        });
        this.screen.key(["C-right"], () => {
          if (this.canvasViewOrder.length > 1) {
            this.canvasViewIndex = (this.canvasViewIndex + 1) % this.canvasViewOrder.length;
            this.applyCanvasView();
          }
        });
        this.screen.key(["pageup"], () => {
          this.widgets.chatLog.scroll(-10);
          scheduleRender(this.screen);
        });
        this.screen.key(["pagedown"], () => {
          this.widgets.chatLog.scroll(10);
          scheduleRender(this.screen);
        });
      }
    };
  }
});

// cli/dashboard/index.ts
var dashboard_exports = {};
__export(dashboard_exports, {
  createDashboard: () => createDashboard
});
async function createDashboard(options) {
  const { orchestrator, persistence, session, toolRunner, onExit } = options;
  const screen = createScreen();
  const widgets = createLayout(screen);
  const controller = new DashboardController(
    screen,
    widgets,
    orchestrator,
    persistence,
    session,
    toolRunner,
    onExit
  );
  return new Promise((resolve4) => {
    screen.on("destroy", () => {
      controller.destroy();
      resolve4();
    });
    controller.start().catch((err) => {
      screen.destroy();
      console.error("Dashboard error:", err);
      resolve4();
    });
  });
}
var init_dashboard = __esm({
  "cli/dashboard/index.ts"() {
    "use strict";
    init_screen();
    init_layout();
    init_DashboardController();
  }
});

// cli/index.ts
import { Command as Command8 } from "commander";
import { render } from "ink";
import React6 from "react";
import { v4 as uuid5 } from "uuid";
import * as path17 from "path";
import * as fs13 from "fs/promises";
import * as p3 from "@clack/prompts";
import chalk11 from "chalk";

// cli/app/App.tsx
import { useState as useState3, useEffect as useEffect3, useCallback, useMemo, useRef as useRef2 } from "react";
import { Box as Box9, Text as Text9, useApp, useInput as useInput2 } from "ink";

// cli/app/StatusBar.tsx
import { useState, useEffect } from "react";
import { Box, Text } from "ink";

// src/lib/quotes.ts
var quotes = [
  // Forging / smithing metaphors
  { text: "The best steel is forged in the hottest fire." },
  { text: "Every consensus is hammered out on the anvil of debate." },
  { text: "Strike while the arguments are hot." },
  { text: "Raw ideas go in. Refined decisions come out." },
  { text: "The forge doesn't break metal \u2014 it reshapes it." },
  { text: "Sparks fly before the blade is tempered." },
  { text: "You can't forge anything without heat and pressure." },
  { text: "A well-forged plan survives the battlefield." },
  // Debate & consensus
  { text: "Consensus isn't agreement \u2014 it's alignment." },
  { text: "The best ideas survive the forge of debate." },
  { text: "Disagreement is the first step toward understanding." },
  { text: "If everyone agrees immediately, nobody's thinking." },
  { text: "Good debate sharpens; bad debate flattens." },
  { text: "Dissent is a feature, not a bug." },
  { text: "The point isn't to win \u2014 it's to converge." },
  { text: "Tension is where the interesting stuff happens." },
  // AI collaboration & collective intelligence
  { text: "Three agents walk into a debate..." },
  { text: "One model's ceiling is another model's floor." },
  { text: "Collective intelligence beats individual brilliance." },
  { text: "More perspectives, fewer blind spots." },
  { text: "The swarm is smarter than the bee." },
  { text: "Deliberation at machine speed." },
  { text: "N heads are better than one. Especially at scale." },
  // Real quotes from thinkers
  { text: "The test of a first-rate intelligence is the ability to hold two opposing ideas in mind.", author: "F. Scott Fitzgerald" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "It is the mark of an educated mind to entertain a thought without accepting it.", author: "Aristotle" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Iron sharpens iron, and one person sharpens another.", author: "Proverbs 27:17" },
  { text: "The clash of ideas is the sound of freedom.", author: "Lady Bird Johnson" },
  { text: "Where all think alike, no one thinks very much.", author: "Walter Lippmann" },
  // Witty / fun
  { text: "Arguing productively since v1.0.0." },
  { text: "Your agents have opinions. Let them cook." },
  { text: "Democracy, but faster." },
  { text: "Strongly held opinions, loosely held agents." },
  { text: "Consensus achieved. No agents were harmed." },
  { text: "Debate is just collaborative thinking with spice." },
  { text: "May your conflicts be constructive." }
];
function getRandomQuote() {
  return quotes[Math.floor(Math.random() * quotes.length)];
}
function formatQuote(quote) {
  if (quote.author) {
    return `"${quote.text}" \u2014 ${quote.author}`;
  }
  return `"${quote.text}"`;
}

// cli/app/StatusBar.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var PHASE_EMOJI = {
  initialization: "\u{1F680}",
  context_loading: "\u{1F4C2}",
  research: "\u{1F50D}",
  brainstorming: "\u{1F4AD}",
  argumentation: "\u2696\uFE0F",
  synthesis: "\u{1F4CA}",
  drafting: "\u270D\uFE0F",
  review: "\u{1F441}\uFE0F",
  consensus: "\u{1F91D}",
  finalization: "\u{1F389}"
};
var PHASE_COLORS = {
  initialization: "gray",
  context_loading: "blue",
  research: "cyan",
  brainstorming: "cyan",
  argumentation: "yellow",
  synthesis: "magenta",
  drafting: "green",
  review: "blue",
  consensus: "green",
  finalization: "yellow"
};
function StatusBar({
  phase,
  currentSpeaker,
  queued,
  messageCount,
  consensusPoints,
  conflictPoints
}) {
  const phaseColor = PHASE_COLORS[phase] || "white";
  const phaseEmoji = PHASE_EMOJI[phase] || "\u{1F4CD}";
  const [quote, setQuote] = useState(() => formatQuote(getRandomQuote()));
  useEffect(() => {
    const timer = setInterval(() => setQuote(formatQuote(getRandomQuote())), 6e4);
    return () => clearInterval(timer);
  }, []);
  return /* @__PURE__ */ jsxs(
    Box,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "gray",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsxs(Box, { flexDirection: "row", justifyContent: "space-between", children: [
          /* @__PURE__ */ jsx(Box, { children: /* @__PURE__ */ jsxs(Text, { color: phaseColor, bold: true, children: [
            phaseEmoji,
            " ",
            phase.toUpperCase()
          ] }) }),
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Floor: " }),
            currentSpeaker ? /* @__PURE__ */ jsxs(Text, { color: "green", children: [
              currentSpeaker,
              " speaking"
            ] }) : /* @__PURE__ */ jsx(Text, { color: "gray", children: "open" }),
            queued.length > 0 && /* @__PURE__ */ jsxs(Text, { dimColor: true, children: [
              " (",
              queued.length,
              " waiting)"
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Box, { children: [
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: "Messages: " }),
            /* @__PURE__ */ jsx(Text, { children: messageCount }),
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: " | " }),
            /* @__PURE__ */ jsxs(Text, { color: "green", children: [
              "\u2713",
              consensusPoints
            ] }),
            /* @__PURE__ */ jsx(Text, { dimColor: true, children: " / " }),
            /* @__PURE__ */ jsxs(Text, { color: "red", children: [
              "\u2717",
              conflictPoints
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Box, { justifyContent: "center", children: /* @__PURE__ */ jsx(Text, { dimColor: true, italic: true, children: quote }) })
      ]
    }
  );
}

// cli/app/AgentList.tsx
import { Box as Box2, Text as Text2 } from "ink";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var STATE_ICONS = {
  listening: "\u{1F442}",
  thinking: "\u{1F914}",
  speaking: "\u{1F4AC}",
  waiting: "\u23F3"
};
var AGENT_COLORS = {
  ronit: "magenta",
  avi: "blue",
  dana: "red",
  yossi: "green",
  michal: "yellow"
};
function AgentList({ agents, currentSpeaker, width = 24, height }) {
  return /* @__PURE__ */ jsxs2(
    Box2,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "gray",
      paddingX: 1,
      width,
      height,
      children: [
        /* @__PURE__ */ jsx2(Text2, { bold: true, underline: true, children: "Agents" }),
        /* @__PURE__ */ jsx2(Text2, { children: " " }),
        agents.map((agent) => {
          const isSpeaking = agent.id === currentSpeaker;
          const color = AGENT_COLORS[agent.id] || "white";
          const stateIcon = STATE_ICONS[agent.state] || "\u2022";
          return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "row", children: [
            /* @__PURE__ */ jsx2(Text2, { children: isSpeaking ? "\u{1F4AC}" : stateIcon }),
            /* @__PURE__ */ jsx2(Text2, { children: " " }),
            /* @__PURE__ */ jsx2(Text2, { color, bold: isSpeaking, children: agent.name }),
            /* @__PURE__ */ jsxs2(Text2, { dimColor: true, children: [
              " (",
              agent.contributions,
              ")"
            ] })
          ] }, agent.id);
        })
      ]
    }
  );
}

// cli/app/ChatPane.tsx
init_personas();
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var TYPE_BADGES = {
  argument: "[ARG]",
  question: "[Q]",
  proposal: "[PROP]",
  agreement: "[+1]",
  disagreement: "[-1]",
  synthesis: "[SYN]",
  system: "",
  human_input: "[YOU]",
  research_result: "[RES]",
  tool_result: "[IMG]"
};
function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function truncateContent(content, maxLines = 20) {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + "\n  ...";
}
function estimateMessageRows(content, wrapWidth) {
  const truncated = truncateContent(content);
  let rows = 1;
  for (const line of truncated.split("\n")) {
    rows += Math.max(1, Math.ceil((line.length + 1) / Math.max(wrapWidth, 20)));
  }
  rows += 1;
  return rows;
}
function MessageItem({ message }) {
  const color = getAgentColor(message.agentId);
  const badge = TYPE_BADGES[message.type] || "";
  const time = formatTime(message.timestamp);
  const content = truncateContent(message.content);
  const displayName = getAgentDisplayName(message.agentId);
  if (message.agentId === "system") {
    return /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", marginBottom: 1, children: /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: content }) });
  }
  if (message.agentId === "human" || message.type === "human_input") {
    return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginBottom: 1, children: [
      /* @__PURE__ */ jsxs3(Box3, { children: [
        /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
          time,
          " "
        ] }),
        /* @__PURE__ */ jsx3(Text3, { color: "green", bold: true, children: "You" }),
        /* @__PURE__ */ jsx3(Text3, { color: "green", dimColor: true, children: " [YOU]" })
      ] }),
      /* @__PURE__ */ jsx3(Box3, { marginLeft: 2, borderStyle: "round", borderColor: "green", paddingX: 1, children: /* @__PURE__ */ jsx3(Text3, { wrap: "wrap", color: "greenBright", children: content }) })
    ] });
  }
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsxs3(Box3, { children: [
      /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
        time,
        " "
      ] }),
      /* @__PURE__ */ jsx3(Text3, { color, bold: true, children: displayName }),
      badge && /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
        " ",
        badge
      ] })
    ] }),
    /* @__PURE__ */ jsx3(Box3, { marginLeft: 2, children: /* @__PURE__ */ jsx3(Text3, { wrap: "wrap", children: content }) })
  ] });
}
function buildScrollbar(trackHeight, totalMessages, visibleCount, scrollOffset) {
  if (totalMessages <= visibleCount || trackHeight < 3) {
    return Array(trackHeight).fill("\u2502");
  }
  const track = [];
  const thumbSize = Math.max(1, Math.round(visibleCount / totalMessages * trackHeight));
  const maxOffset = totalMessages - visibleCount;
  const scrollFraction = maxOffset > 0 ? scrollOffset / maxOffset : 0;
  const thumbTop = Math.round(scrollFraction * (trackHeight - thumbSize));
  for (let i = 0; i < trackHeight; i++) {
    if (i >= thumbTop && i < thumbTop + thumbSize) {
      track.push("\u2503");
    } else {
      track.push("\u254E");
    }
  }
  return track;
}
function ChatPane({ messages, maxHeight = 20, currentSpeaker, scrollOffset = 0, height }) {
  const innerHeight = Math.max(4, (height || maxHeight + 2) - 4);
  const wrapWidth = Math.max(30, Math.floor((process.stdout.columns || 80) * 0.4));
  const endIndex = scrollOffset > 0 ? messages.length - scrollOffset : messages.length;
  let rowBudget = innerHeight;
  let startIndex = endIndex;
  for (let i = endIndex - 1; i >= 0 && rowBudget > 0; i--) {
    const est = estimateMessageRows(messages[i].content, wrapWidth);
    if (rowBudget - est < 0 && startIndex < endIndex) break;
    rowBudget -= est;
    startIndex = i;
  }
  const visibleMessages = messages.slice(startIndex, endIndex);
  const hiddenAbove = startIndex;
  const hiddenBelow = messages.length - endIndex;
  const trackHeight = Math.max(3, (height || maxHeight + 2) - 2);
  const scrollbar = buildScrollbar(trackHeight, messages.length, visibleMessages.length || 1, scrollOffset);
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "row", flexGrow: 1, height, children: [
    /* @__PURE__ */ jsxs3(
      Box3,
      {
        flexDirection: "column",
        borderStyle: "single",
        borderColor: "gray",
        paddingX: 1,
        flexGrow: 1,
        height,
        overflow: "hidden",
        children: [
          hiddenAbove > 0 && /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
            "  \u2191 ",
            hiddenAbove,
            " more"
          ] }),
          visibleMessages.length === 0 ? /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "No messages yet..." }) : visibleMessages.map((msg) => /* @__PURE__ */ jsx3(MessageItem, { message: msg }, msg.id)),
          hiddenBelow > 0 && /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
            "  \u2193 ",
            hiddenBelow,
            " more"
          ] }),
          currentSpeaker && /* @__PURE__ */ jsx3(Box3, { children: /* @__PURE__ */ jsxs3(Text3, { color: getAgentColor(currentSpeaker), children: [
            "... ",
            getAgentDisplayName(currentSpeaker),
            " is thinking..."
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", width: 1, overflow: "hidden", height, children: scrollbar.map((ch, i) => /* @__PURE__ */ jsx3(Text3, { color: ch === "\u2503" ? "cyan" : "gray", children: ch }, i)) })
  ] });
}

// cli/app/CanvasPane.tsx
import { Box as Box4, Text as Text4 } from "ink";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var TYPE_COLORS = {
  navbar: "blue",
  footer: "gray",
  sidebar: "magenta",
  section: "white",
  column: "white",
  component: "cyan",
  grid: "white",
  main: "white",
  page: "cyan"
};
var TYPE_ICONS = {
  navbar: "\u2550",
  footer: "\u2500",
  sidebar: "\u2502",
  section: "\u25AA",
  column: "\u25AB",
  component: "\xB7"
};
function statusIcon(status) {
  if (status === "complete") return "\u25CF";
  if (status === "in_progress") return "\u25D0";
  return "\u25CB";
}
function statusColor(status) {
  if (status === "complete") return "green";
  if (status === "in_progress") return "yellow";
  return "gray";
}
function WireframeNodeView({
  node: node2,
  availableWidth,
  depth
}) {
  const color = TYPE_COLORS[node2.type] || "white";
  const icon = TYPE_ICONS[node2.type] || "\u25AA";
  const sColor = statusColor(node2.status);
  if (node2.type === "page") {
    return /* @__PURE__ */ jsx4(Box4, { flexDirection: "column", width: "100%", children: node2.children.map((child) => /* @__PURE__ */ jsx4(WireframeNodeView, { node: child, availableWidth, depth }, child.id)) });
  }
  if (node2.children.length === 0) {
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", borderStyle: "single", borderColor: sColor, width: "100%", children: [
      /* @__PURE__ */ jsxs4(Box4, { children: [
        /* @__PURE__ */ jsxs4(Text4, { color, bold: true, children: [
          icon,
          " "
        ] }),
        /* @__PURE__ */ jsx4(Text4, { color: sColor, children: truncate(node2.label, availableWidth - 6) }),
        /* @__PURE__ */ jsxs4(Text4, { dimColor: true, children: [
          " ",
          statusIcon(node2.status)
        ] })
      ] }),
      node2.content && /* @__PURE__ */ jsx4(Text4, { wrap: "wrap", dimColor: true, children: truncate(node2.content, availableWidth * 2) })
    ] });
  }
  if (node2.direction === "row") {
    const totalPercent = node2.children.reduce((sum, c) => sum + (c.widthPercent || 0), 0);
    const unsetCount = node2.children.filter((c) => !c.widthPercent).length;
    const remainingPercent = Math.max(0, 100 - totalPercent);
    const defaultPercent = unsetCount > 0 ? remainingPercent / unsetCount : 0;
    return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", width: "100%", children: [
      node2.type !== "main" && /* @__PURE__ */ jsxs4(Box4, { children: [
        /* @__PURE__ */ jsxs4(Text4, { color, bold: true, children: [
          icon,
          " "
        ] }),
        /* @__PURE__ */ jsx4(Text4, { color, children: truncate(node2.label, availableWidth - 4) })
      ] }),
      /* @__PURE__ */ jsx4(Box4, { flexDirection: "row", width: "100%", children: node2.children.map((child) => {
        const pct = child.widthPercent || defaultPercent;
        const childWidth = Math.max(4, Math.floor(availableWidth * pct / 100));
        return /* @__PURE__ */ jsx4(WireframeNodeView, { node: child, availableWidth: childWidth, depth: depth + 1 }, child.id);
      }) })
    ] });
  }
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", width: "100%", children: [
    node2.type !== "main" && /* @__PURE__ */ jsxs4(Box4, { children: [
      /* @__PURE__ */ jsxs4(Text4, { color, bold: true, children: [
        icon,
        " "
      ] }),
      /* @__PURE__ */ jsx4(Text4, { color, children: truncate(node2.label, availableWidth - 4) })
    ] }),
    node2.children.map((child) => /* @__PURE__ */ jsx4(WireframeNodeView, { node: child, availableWidth, depth: depth + 1 }, child.id))
  ] });
}
function truncate(text3, max) {
  if (max <= 0) return "";
  const firstLine = text3.split("\n")[0] || text3;
  if (firstLine.length <= max) return firstLine;
  return firstLine.slice(0, max - 1) + "\u2026";
}
function CanvasPane({
  wireframe,
  height,
  width
}) {
  const innerWidth = Math.max(6, (width || 24) - 2);
  return /* @__PURE__ */ jsxs4(
    Box4,
    {
      flexDirection: "column",
      borderStyle: "double",
      borderColor: "cyan",
      width,
      height,
      children: [
        /* @__PURE__ */ jsx4(Box4, { justifyContent: "center", children: /* @__PURE__ */ jsx4(Text4, { bold: true, color: "cyan", children: " WIREFRAME " }) }),
        /* @__PURE__ */ jsx4(WireframeNodeView, { node: wireframe, availableWidth: innerWidth, depth: 0 })
      ]
    }
  );
}

// cli/app/App.tsx
init_wireframe();

// cli/app/InputPane.tsx
import { useState as useState2 } from "react";
import { Box as Box5, Text as Text5, useInput } from "ink";
import TextInput from "ink-text-input";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
var COMMANDS = [
  { name: "pause", description: "Pause debate" },
  { name: "resume", description: "Resume debate" },
  { name: "status", description: "Show status" },
  { name: "synthesize", description: "Move to synthesis" },
  { name: "synthesize force", description: "Force synthesis" },
  { name: "export", description: "Export transcript" },
  { name: "help", description: "Toggle help" },
  { name: "quit", description: "Save and exit" }
];
function InputPane({
  onSubmit,
  onCommand,
  placeholder = "Type a message or /command...",
  disabled = false,
  onInputChange
}) {
  const [value, setValue] = useState2("");
  const [hint, setHint] = useState2("");
  const handleChange = (newValue) => {
    setValue(newValue);
    onInputChange?.(newValue);
    if (newValue.startsWith("/") && newValue.length > 1) {
      const partial = newValue.slice(1).toLowerCase();
      const match = COMMANDS.find((c) => c.name.startsWith(partial) && c.name !== partial);
      setHint(match ? `/${match.name} \u2014 ${match.description}` : "");
    } else {
      setHint("");
    }
  };
  const handleSubmit = (text3) => {
    const trimmed = text3.trim();
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
    setHint("");
  };
  useInput((input, key) => {
    if (key.ctrl && input === "s") {
      onCommand("synthesize", []);
    }
    if (key.ctrl && input === "e") {
      onCommand("export", []);
    }
    if (key.tab && value.startsWith("/") && value.length > 1) {
      const partial = value.slice(1).toLowerCase();
      const match = COMMANDS.find((c) => c.name.startsWith(partial));
      if (match) {
        const completed = `/${match.name}`;
        setValue(completed);
        setHint("");
        onInputChange?.(completed);
      }
    }
  });
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", children: [
    hint && /* @__PURE__ */ jsx5(Box5, { paddingX: 2, children: /* @__PURE__ */ jsxs5(Text5, { dimColor: true, children: [
      "  Tab: ",
      hint
    ] }) }),
    /* @__PURE__ */ jsxs5(
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
              onChange: handleChange,
              onSubmit: handleSubmit,
              placeholder
            }
          )
        ]
      }
    )
  ] });
}
function CommandHelp() {
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "Commands:" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /pause     - Pause debate" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /resume    - Resume debate" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /status    - Show status" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /synthesize - Move to synthesis" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /export    - Export transcript" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  /quit      - Save and exit" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  Ctrl+S     - Quick synthesize" }),
    /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "  Ctrl+E     - Quick export" })
  ] });
}

// cli/app/Breadcrumbs.tsx
import React3 from "react";
import { Box as Box6, Text as Text6 } from "ink";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
function Breadcrumbs({ segments, phaseColor }) {
  return /* @__PURE__ */ jsx6(Box6, { paddingX: 1, marginBottom: 1, children: segments.map((segment, i) => {
    const isFirst = i === 0;
    const isLast = i === segments.length - 1;
    const color = isLast && phaseColor ? phaseColor : isFirst ? "cyan" : void 0;
    return /* @__PURE__ */ jsxs6(React3.Fragment, { children: [
      i > 0 && /* @__PURE__ */ jsxs6(Text6, { dimColor: true, children: [
        " ",
        ">",
        " "
      ] }),
      /* @__PURE__ */ jsx6(Text6, { bold: isFirst || isLast, color, dimColor: !isFirst && !isLast, children: segment })
    ] }, i);
  }) });
}

// cli/app/QuickReplies.tsx
import { Box as Box7, Text as Text7 } from "ink";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
function QuickReplies({ replies, onSelect: _onSelect }) {
  if (replies.length === 0) return null;
  return /* @__PURE__ */ jsxs7(Box7, { paddingX: 1, flexDirection: "row", gap: 1, children: [
    replies.map((reply, i) => /* @__PURE__ */ jsxs7(Box7, { children: [
      /* @__PURE__ */ jsx7(Text7, { color: "gray", children: "[" }),
      /* @__PURE__ */ jsx7(Text7, { color: "cyan", bold: true, children: i + 1 }),
      /* @__PURE__ */ jsx7(Text7, { color: "gray", children: "]" }),
      /* @__PURE__ */ jsx7(Text7, { children: " " }),
      /* @__PURE__ */ jsx7(Text7, { color: reply.isCommand ? "yellow" : "white", children: reply.label })
    ] }, i)),
    /* @__PURE__ */ jsx7(Box7, { marginLeft: 1, children: /* @__PURE__ */ jsxs7(Text7, { dimColor: true, children: [
      "Press 1-",
      replies.length,
      " to select"
    ] }) })
  ] });
}

// cli/app/AgentSuggestion.tsx
import { useEffect as useEffect2, useRef } from "react";
import { Box as Box8, Text as Text8 } from "ink";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
function AgentSuggestion({
  agentName,
  agentColor,
  suggestion,
  onDismiss
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  useEffect2(() => {
    const timer = setTimeout(() => onDismissRef.current(), 1e4);
    return () => clearTimeout(timer);
  }, []);
  return /* @__PURE__ */ jsxs8(
    Box8,
    {
      borderStyle: "round",
      borderColor: agentColor,
      paddingX: 1,
      marginX: 1,
      children: [
        /* @__PURE__ */ jsxs8(Text8, { color: agentColor, bold: true, children: [
          "\u{1F4A1} ",
          agentName
        ] }),
        /* @__PURE__ */ jsx8(Text8, { children: " suggests: " }),
        /* @__PURE__ */ jsx8(Text8, { children: suggestion })
      ]
    }
  );
}

// cli/app/App.tsx
init_suggestions();
init_personas();
import { v4 as uuid } from "uuid";
import { jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
function App({ orchestrator, persistence, session, toolRunner, onExit }) {
  const { exit } = useApp();
  const [termRows, setTermRows] = useState3(process.stdout.rows || 24);
  useEffect3(() => {
    const onResize = () => setTermRows(process.stdout.rows || 24);
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);
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
  const [agentSuggestion, setAgentSuggestion] = useState3(null);
  const [inputEmpty, setInputEmpty] = useState3(true);
  const [scrollOffset, setScrollOffset] = useState3(0);
  const [wireframe, setWireframe] = useState3(getDefaultWireframe());
  const prevMessageCount = useRef2(0);
  const agents = session.config.enabledAgents.map((id) => {
    const agent = getAgentById(id);
    return {
      id,
      name: agent?.name || id,
      nameHe: agent?.nameHe || "",
      state: agentStates.get(id) || "listening",
      contributions: contributions.get(id) || 0
    };
  });
  useEffect3(() => {
    const unsubscribe = orchestrator.on((event) => {
      switch (event.type) {
        case "phase_change":
          setPhase(event.data.phase);
          break;
        case "agent_message": {
          const allMessages = orchestrator.getMessages();
          setMessages(allMessages);
          const status = orchestrator.getConsensusStatus();
          setContributions(status.agentParticipation);
          setConsensusPoints(status.consensusPoints);
          setConflictPoints(status.conflictPoints);
          setAgentStates(new Map(orchestrator.getAgentStates()));
          if (toolRunner && toolRunner.getAvailableTools().length > 0) {
            const latest = allMessages[allMessages.length - 1];
            if (latest && latest.agentId !== "system") {
              const toolMatch = latest.content.match(/\[TOOL:\s*(\S+)\]\s*([\s\S]*?)\[\/TOOL\]/);
              if (toolMatch) {
                const toolName = toolMatch[1];
                const toolPrompt = toolMatch[2].trim();
                const outputDir = persistence.getSessionDir();
                toolRunner.runTool(toolName, { prompt: toolPrompt, description: toolPrompt }, outputDir).then((result) => {
                  const toolMsg = {
                    id: uuid(),
                    timestamp: /* @__PURE__ */ new Date(),
                    agentId: "system",
                    type: "tool_result",
                    content: result.success ? `Tool "${toolName}" completed: ${result.description || result.outputPath || "done"}` : `Tool "${toolName}" failed: ${result.error}`,
                    metadata: result.outputPath ? { outputPath: result.outputPath } : void 0
                  };
                  setMessages((prev) => [...prev, toolMsg]);
                });
              }
            }
          }
          const lastMsg = allMessages[allMessages.length - 1];
          if (lastMsg && lastMsg.agentId !== "system") {
            const proposed = extractWireframe(lastMsg.content);
            if (proposed) {
              setWireframe(proposed);
            }
          }
          const suggestionData = detectAgentSuggestion(
            allMessages,
            phase,
            status.consensusPoints,
            status.conflictPoints,
            prevMessageCount.current
          );
          if (suggestionData) {
            const agent = getAgentById(suggestionData.agentId);
            if (agent) {
              suggestionData.agentName = agent.name;
            }
            setAgentSuggestion(suggestionData);
          }
          prevMessageCount.current = allMessages.length;
          break;
        }
        case "agent_typing": {
          const typingData = event.data;
          if (typingData.typing) {
            setCurrentSpeaker(typingData.agentId);
          }
          setAgentStates(new Map(orchestrator.getAgentStates()));
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
    });
    orchestrator.start();
    return () => {
      unsubscribe();
    };
  }, [orchestrator]);
  const handleSubmit = useCallback(async (text3) => {
    await orchestrator.addHumanMessage(text3);
    setMessages(orchestrator.getMessages());
  }, [orchestrator]);
  const handleCommand = useCallback(async (command, args) => {
    switch (command.toLowerCase()) {
      case "pause":
        orchestrator.pause();
        setStatusMessage("\u23F8 Debate paused");
        break;
      case "resume":
        orchestrator.resume();
        setStatusMessage("\u25B6 Debate resumed");
        break;
      case "status": {
        const status = orchestrator.getConsensusStatus();
        setStatusMessage(`\u{1F4CA} ${status.recommendation}`);
        break;
      }
      case "synthesize": {
        const force = args.includes("force");
        setStatusMessage("\u23F3 Transitioning to synthesis...");
        const result = await orchestrator.transitionToSynthesis(force);
        setStatusMessage(result.success ? `\u2705 ${result.message}` : `\u26A0 ${result.message}`);
        break;
      }
      case "export": {
        setStatusMessage("\u23F3 Exporting...");
        await persistence.saveFull();
        const dir = persistence.getSessionDir();
        setStatusMessage(`\u2705 Exported to ${dir}`);
        break;
      }
      case "help":
        setShowHelp((prev) => !prev);
        break;
      case "quit":
      case "exit":
        await persistence.saveFull();
        orchestrator.stop();
        onExit();
        exit();
        break;
      default:
        setStatusMessage(`\u274C Unknown command: /${command}. Type /help for available commands.`);
    }
    setTimeout(() => setStatusMessage(null), 8e3);
  }, [orchestrator, persistence, onExit, exit]);
  const quickReplies = useMemo(
    () => getQuickReplies(phase, messages, consensusPoints, conflictPoints),
    [phase, messages.length, consensusPoints, conflictPoints]
  );
  const dismissSuggestion = useCallback(() => setAgentSuggestion(null), []);
  const handleInputChange = useCallback((val) => setInputEmpty(val.length === 0), []);
  const handleQuickReply = useCallback((reply) => {
    if (reply.isCommand) {
      const parts = reply.value.slice(1).split(/\s+/);
      handleCommand(parts[0], parts.slice(1));
    } else {
      handleSubmit(reply.value);
    }
  }, [handleCommand, handleSubmit]);
  useEffect3(() => {
    if (scrollOffset === 0) return;
  }, [messages.length]);
  useEffect3(() => {
    if (scrollOffset <= 1) {
      setScrollOffset(0);
    }
  }, [messages.length]);
  useInput2((_input, key) => {
    if (key.ctrl && _input === "c") {
      handleCommand("quit", []);
    }
    if (key.upArrow && !key.shift) {
      setScrollOffset((prev) => Math.min(prev + 1, Math.max(0, messages.length - 5)));
    }
    if (key.downArrow && !key.shift) {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    }
    if (key.upArrow && key.shift) {
      setScrollOffset((prev) => Math.min(prev + 10, Math.max(0, messages.length - 5)));
    }
    if (key.downArrow && key.shift) {
      setScrollOffset((prev) => Math.max(0, prev - 10));
    }
  });
  const termCols = process.stdout.columns || 80;
  let chromeRows = 11;
  if (statusMessage) chromeRows += 1;
  if (showHelp) chromeRows += 10;
  if (agentSuggestion) chromeRows += 3;
  const mainContentHeight = Math.max(8, termRows - chromeRows);
  const sidebarWidth = Math.max(16, Math.floor(termCols * 0.2));
  const canvasWidth = Math.max(20, Math.floor(termCols * 0.35));
  return /* @__PURE__ */ jsxs9(Box9, { flexDirection: "column", height: termRows, children: [
    /* @__PURE__ */ jsx9(
      Breadcrumbs,
      {
        segments: ["\u{1F525} Forge", session.config.projectName, `${PHASE_EMOJI[phase] || ""} ${phase.replace(/_/g, " ").toUpperCase()}`],
        phaseColor: PHASE_COLORS[phase]
      }
    ),
    /* @__PURE__ */ jsx9(
      StatusBar,
      {
        phase,
        currentSpeaker,
        queued,
        messageCount: messages.length,
        consensusPoints,
        conflictPoints
      }
    ),
    /* @__PURE__ */ jsxs9(Box9, { flexDirection: "row", height: mainContentHeight, width: "100%", children: [
      /* @__PURE__ */ jsx9(ChatPane, { messages, maxHeight: mainContentHeight - 2, currentSpeaker, scrollOffset, height: mainContentHeight }),
      /* @__PURE__ */ jsx9(
        CanvasPane,
        {
          wireframe,
          height: mainContentHeight,
          width: canvasWidth
        }
      ),
      /* @__PURE__ */ jsx9(AgentList, { agents, currentSpeaker, width: sidebarWidth, height: mainContentHeight })
    ] }),
    statusMessage && /* @__PURE__ */ jsx9(Box9, { paddingX: 1, children: /* @__PURE__ */ jsx9(Text9, { color: "yellow", children: statusMessage }) }),
    showHelp && /* @__PURE__ */ jsx9(CommandHelp, {}),
    agentSuggestion && /* @__PURE__ */ jsx9(
      AgentSuggestion,
      {
        agentName: agentSuggestion.agentName,
        agentColor: PHASE_COLORS[phase] || "cyan",
        suggestion: agentSuggestion.suggestion,
        onDismiss: dismissSuggestion
      }
    ),
    /* @__PURE__ */ jsx9(QuickReplies, { replies: quickReplies, onSelect: handleQuickReply }),
    /* @__PURE__ */ jsx9(
      InputPane,
      {
        onSubmit: handleSubmit,
        onCommand: handleCommand,
        placeholder: `${getPhaseHint(phase)} | Type message or /help...`,
        onInputChange: handleInputChange
      }
    ),
    /* @__PURE__ */ jsx9(Box9, { paddingX: 1, children: /* @__PURE__ */ jsxs9(Text9, { dimColor: true, children: [
      termCols,
      "x",
      termRows,
      " | /help | Arrows scroll | Ctrl+C quit"
    ] }) })
  ] });
}

// cli/adapters/CLIAgentRunner.ts
import { query as claudeQuery } from "@anthropic-ai/claude-agent-sdk";
import * as os from "os";
import * as path from "path";
var CLAUDE_CODE_PATH = path.join(os.homedir(), ".local", "bin", "claude");
var CLIAgentRunner = class {
  defaultModel;
  constructor(_apiKey, defaultModel = "claude-sonnet-4-20250514") {
    this.defaultModel = defaultModel;
  }
  async query(params) {
    let content = "";
    let usage = null;
    try {
      const q = claudeQuery({
        prompt: params.prompt,
        options: {
          systemPrompt: params.systemPrompt || void 0,
          model: params.model || this.defaultModel,
          tools: [],
          permissionMode: "dontAsk",
          persistSession: false,
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
          stderr: () => {
          }
        }
      });
      for await (const message of q) {
        if (message.type === "assistant" && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === "text") {
              content += block.text;
            }
          }
        }
        if (message.type === "result" && message.usage) {
          usage = {
            inputTokens: message.usage.input_tokens || 0,
            outputTokens: message.usage.output_tokens || 0,
            costUsd: message.total_cost_usd || 0
          };
        }
      }
    } catch (error) {
      if (!content) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    return {
      success: true,
      content,
      usage: usage || { inputTokens: 0, outputTokens: 0, costUsd: 0 }
    };
  }
  async evaluate(params) {
    let content = "";
    try {
      const q = claudeQuery({
        prompt: params.evalPrompt,
        options: {
          systemPrompt: "You are evaluating whether to speak in a discussion. Respond only with JSON.",
          model: "claude-3-5-haiku-20241022",
          tools: [],
          permissionMode: "dontAsk",
          persistSession: false,
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH,
          stderr: () => {
          }
        }
      });
      for await (const message of q) {
        if (message.type === "assistant" && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === "text") {
              content += block.text;
            }
          }
        }
      }
    } catch (error) {
      if (!content) {
        return {
          success: false,
          urgency: "pass",
          reason: error instanceof Error ? error.message : "Unknown error",
          responseType: ""
        };
      }
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: true, urgency: "pass", reason: "Listening", responseType: "" };
    }
    const result = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      urgency: result.urgency || "pass",
      reason: result.reason || "",
      responseType: result.responseType || ""
    };
  }
};

// cli/adapters/FileSystemAdapter.ts
import * as fs from "fs/promises";
import * as path2 from "path";
import { glob as globLib } from "glob";
var FileSystemAdapter = class {
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

// cli/adapters/SessionPersistence.ts
init_personas();
import * as path3 from "path";
var DEFAULT_CONFIG = {
  outputDir: "output/sessions",
  autoSaveInterval: 3e4
  // 30 seconds
};
var SessionPersistence = class {
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
   * Resume into an existing session directory (no new dir created)
   */
  async resumeSession(session, existingDir) {
    this.session = session;
    this.sessionDir = existingDir;
    this.lastSavedMessageCount = session.messages.length;
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
      return `**${agent.name}**`;
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
   * Update session reference (for live updates)
   */
  updateSession(session) {
    this.session = session;
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

// src/lib/eda/ConversationMemory.ts
var DEFAULT_MEMORY_CONFIG = {
  maxSummaries: 20,
  maxDecisions: 50,
  maxProposals: 30,
  maxAgentKeyPoints: 20,
  maxAgentPositions: 15,
  pruneThreshold: 0.9
  // Prune when at 90% capacity
};
var SUMMARY_INTERVAL = 12;
var DECISION_PATTERNS = [
  /we('ve)?\s+(agreed|decided|concluded)/i,
  /consensus\s+(is|reached)/i,
  /let's\s+go\s+with/i,
  /final\s+(decision|answer)/i,
  /\[CONSENSUS\]/i,
  /\[DECISION\]/i
];
var PROPOSAL_PATTERNS = [
  /I\s+propose/i,
  /what\s+if\s+we/i,
  /let's\s+consider/i,
  /my\s+suggestion/i,
  /\[PROPOSAL\]/i
];
var REACTION_PATTERNS = {
  support: [/I\s+agree/i, /great\s+idea/i, /let's\s+do\s+it/i, /מסכים/i, /רעיון מצוין/i],
  oppose: [/I\s+disagree/i, /won't\s+work/i, /problem\s+with/i, /לא מסכים/i, /בעיה עם/i],
  neutral: [/not\s+sure/i, /need\s+more\s+info/i, /לא בטוח/i]
};
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
var ConversationMemory = class _ConversationMemory {
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
      const active = this.proposals.filter((p4) => p4.status === "active");
      const resolved = this.proposals.filter((p4) => p4.status !== "active");
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
    const isProposal = message.type === "proposal" || PROPOSAL_PATTERNS.some((p4) => p4.test(content));
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
    const isDecision = DECISION_PATTERNS.some((p4) => p4.test(content));
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
        model: "claude-3-5-haiku-20241022"
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
      this.proposals.slice(-5).forEach((p4) => {
        parts.push(`- [${p4.agentId}] ${p4.content}`);
      });
    }
    if (forAgentId && this.agentStates.has(forAgentId)) {
      const state = this.agentStates.get(forAgentId);
      parts.push(`
## Your Previous Contributions (${forAgentId})`);
      if (state.keyPoints.length > 0) {
        parts.push("Key points you made:");
        state.keyPoints.slice(-3).forEach((p4) => parts.push(`- ${p4}`));
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
  updateProposalStatus(proposalId, status) {
    const proposal = this.proposals.find((p4) => p4.id === proposalId);
    if (proposal) {
      proposal.status = status;
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
    const proposal = this.proposals.find((p4) => p4.id === proposalId);
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
    return this.proposals.find((p4) => p4.id === proposalId);
  }
  /**
   * Get all active proposals
   * @returns Array of proposals with status 'active'
   */
  getActiveProposals() {
    return this.proposals.filter((p4) => p4.status === "active");
  }
  /**
   * Get the most recent proposal for reaction tracking
   * @returns The most recent proposal, or undefined if none exist
   */
  getLatestProposal() {
    return this.proposals.length > 0 ? this.proposals[this.proposals.length - 1] : void 0;
  }
  /**
   * Get summaries covering messages after given index (for phase handoff briefs)
   */
  getSummariesSince(messageIndex) {
    return this.summaries.filter((s) => {
      if (!s.messageRange) return false;
      return s.messageRange[1] > messageIndex;
    });
  }
  /**
   * Get decisions made after given message index (for phase handoff briefs)
   */
  getDecisionsSince(messageIndex) {
    return this.decisions.filter((d) => {
      if (!d.messageRange) return false;
      return d.messageRange[1] > messageIndex;
    });
  }
  /**
   * Get all proposals (not just active)
   */
  getAllProposals() {
    return [...this.proposals];
  }
  /**
   * Get all agent memory states (for phase handoff briefs)
   */
  getAllAgentStates() {
    return new Map(this.agentStates);
  }
  getAgentState(agentId) {
    return this.agentStates.get(agentId);
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

// src/lib/eda/MessageBus.ts
var DEFAULT_BUS_CONFIG = {
  maxMessages: 500,
  maxMessagesForContext: 50,
  virtualScrollWindow: 100,
  pruneThreshold: 0.9
};
var MessageBus = class {
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
    const relevantSubs = this.subscriptions.filter((s) => s.event === event);
    for (const sub of relevantSubs) {
      try {
        setTimeout(() => sub.callback(payload), 0);
      } catch {
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
    this.memory.processMessage(message, this.messageHistory).catch((err) => {
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
   * Get active proposals (for phase handoff briefs)
   */
  getActiveProposals() {
    return this.memory.getActiveProposals();
  }
  /**
   * Get summaries since a message index (for phase handoff briefs)
   */
  getSummariesSince(messageIndex) {
    return this.memory.getSummariesSince(messageIndex);
  }
  /**
   * Get decisions since a message index (for phase handoff briefs)
   */
  getDecisionsSince(messageIndex) {
    return this.memory.getDecisionsSince(messageIndex);
  }
  /**
   * Get all agent memory states (for phase handoff briefs)
   */
  getAllAgentStates() {
    return this.memory.getAllAgentStates();
  }
  getAgentMemoryState(agentId) {
    return this.memory.getAgentState(agentId);
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
   * Preload messages from a previous session (no events emitted).
   * Must be called after start() to seed history for resumed sessions.
   */
  preloadMessages(messages) {
    this.messageHistory.push(...messages);
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
   * Stop the bus
   */
  stop(reason) {
    this.isActive = false;
    this.emit("session:end", { reason });
    this.subscriptions = [];
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
var messageBus = new MessageBus();

// src/lib/eda/FloorManager.ts
var FloorManager = class {
  bus;
  currentSpeaker = null;
  requestQueue = [];
  speakerHistory = [];
  isProcessing = false;
  // Configuration
  maxQueueSize = 10;
  speakerCooldown = 2e3;
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
    this.bus.emit("floor:granted", {
      agentId: nextRequest.agentId,
      reason: nextRequest.reason
    });
    this.floorTimeoutId = setTimeout(() => {
      if (this.currentSpeaker === nextRequest.agentId) {
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

// src/lib/claude-code-agent.ts
function generateAgentSystemPrompt(agent, config, context, skills) {
  const languageInstruction = getLanguageInstruction(config.language);
  const isHebrew = config.language === "hebrew" || config.language === "mixed";
  const nameDisplay = isHebrew && agent.nameHe ? `${agent.name} (${agent.nameHe})` : agent.name;
  return `# You are ${nameDisplay}

## Your Identity
- **Role**: ${agent.role}
- **Age**: ${agent.age}
- **Background**: ${agent.background}
- **Speaking Style**: ${agent.speakingStyle}

## Your Personality Traits
${agent.personality.map((p4) => `- ${p4}`).join("\n")}

## Your Known Biases (be aware of these)
${agent.biases.map((b) => `- ${b}`).join("\n")}

## Your Strengths
${agent.strengths.map((s) => `- ${s}`).join("\n")}

## Your Weaknesses (work around these)
${agent.weaknesses.map((w) => `- ${w}`).join("\n")}

## Current Project
- **Project Name**: ${config.projectName}
- **Goal**: ${config.goal}
${isHebrew && config.goalHe ? `- **Goal (Hebrew)**: ${config.goalHe}` : ""}

## Language Instructions
${languageInstruction}

## Your Core Expertise

You are an expert across multiple disciplines. Apply ALL of these in every response:

### Copywriting Mastery
- Direct response copywriting (AIDA, PAS, BAB frameworks)
- Headline formulas: curiosity gaps, benefit-driven, urgency, specificity
- Conversion copy: CTAs, value propositions, objection handling, social proof
- Brand voice and tone consistency across all touchpoints
- Microcopy: buttons, tooltips, error messages, empty states, onboarding
- SEO copywriting: search intent, keyword integration without sacrificing readability

### Frontend & UI/UX Design
- Information architecture: content hierarchy, user flows, navigation patterns
- Visual hierarchy: F-pattern, Z-pattern, inverted pyramid for scanning
- Responsive design principles: mobile-first, breakpoints, touch targets
- Component thinking: design systems, reusable patterns, atomic design
- Accessibility (WCAG): contrast, focus states, screen reader text, alt text
- Performance: above-the-fold content, lazy loading considerations, CLS
- Modern web patterns: sticky nav, infinite scroll, skeleton loaders, modals
- Layout systems: CSS Grid/Flexbox thinking \u2014 columns, gaps, alignment

### Conversion & UX Psychology
- Hick's law (fewer choices = faster decisions)
- Fitts's law (CTA size and placement)
- Von Restorff effect (make the key element stand out)
- Social proof patterns: testimonials, logos, counters, case studies
- Trust signals: badges, guarantees, security indicators
- Urgency and scarcity (when appropriate and ethical)
- Progressive disclosure: reveal complexity gradually
- Cognitive load reduction: chunking, whitespace, clear grouping

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

## THE CANVAS \u2014 Live Wireframe System

You have access to a **live wireframe canvas** that renders in the terminal alongside the discussion.
When you include a [WIREFRAME] block in your response, the canvas updates instantly for everyone to see.

### Canvas Dimensions & Scale
- The canvas panel is **~25% of terminal width** (typically 28-38 characters wide)
- It renders **full terminal height** (typically 25-40 rows)
- Each section occupies 2-4 rows depending on content
- Columns within a section share the width proportionally
- The canvas uses box-drawing characters (borders, grids) \u2014 keep labels **under 12 chars**

### What the Canvas Shows
- **Navbar** at top (horizontal bar with logo, nav, CTA)
- **Sidebar** left or right (vertical panel, 20-30% width)
- **Main content** with stacked sections
- **Grid rows** with 2-4 columns side by side (features, pricing, etc.)
- **Footer** at bottom (horizontal bar with column layout)
- Each section shows: icon, label, status (\u25CB pending / \u25D0 in progress / \u25CF done)
- During drafting, actual copy content fills into the sections

### How to Use the Canvas
Include a [WIREFRAME] block in your message. The canvas updates live.

**Full syntax:**
\`\`\`
[WIREFRAME]
navbar: Logo | Nav Links (50%) | CTA Button (20%)
hero: Headline + Subline (60%) | Hero Image (40%)
social-proof: Client Logos
features: Feature 1 (33%) | Feature 2 (33%) | Feature 3 (33%)
sidebar-left: Filters (25%)
how-it-works: Step 1 (33%) | Step 2 (33%) | Step 3 (33%)
testimonials: Customer Stories
pricing: Basic (33%) | Pro (33%) | Enterprise (33%)
cta: Final Call to Action
faq: Questions & Answers
footer: Company (25%) | Product (25%) | Resources (25%) | Legal (25%)
[/WIREFRAME]
\`\`\`

**Syntax rules:**
- Each line = one section. Prefix before \`:\` = section name (keep short, ~15 chars max)
- \`|\` splits into columns (renders as horizontal grid)
- \`(N%)\` sets column width. Without %, columns share equally.
- Special prefixes: \`navbar:\`, \`footer:\`, \`sidebar-left:\`, \`sidebar-right:\`
- Max ~15 sections fit comfortably. Prioritize.

### When to Propose a Wireframe
- **Early in brainstorming** \u2014 propose an initial structure based on the project goal
- **After key decisions** \u2014 update the wireframe when the team agrees on structure changes
- **When challenging structure** \u2014 propose an alternative layout to compare
- **During synthesis** \u2014 consolidate agreed structure into a final wireframe
- Each agent's [WIREFRAME] block is tracked separately under their name.
- During the Canvas Round, all agents propose wireframes, then review each other's layouts.
- Use [CANVAS_CRITIQUE:KEEP], [CANVAS_CRITIQUE:REMOVE], [CANVAS_CRITIQUE:MODIFY] tags during review.
- The consensus wireframe is built from sections that a majority of agents agree on.

### Canvas Critique Tags
When reviewing other agents' wireframes during the Canvas Round, use these tags:
- \`[CANVAS_CRITIQUE:KEEP] SectionName - why it should stay\`
- \`[CANVAS_CRITIQUE:REMOVE] SectionName - why it should go\`
- \`[CANVAS_CRITIQUE:MODIFY] SectionName - what to change\`

Each critique tag should be on its own line with the section name and a reason after the dash.

### Design Thinking for the Wireframe
When proposing structure, think about:
- **User journey**: What's the narrative flow from top to bottom?
- **Above the fold**: Hero + primary CTA must be immediately visible
- **Content rhythm**: Alternate wide sections with grid sections for visual variety
- **Social proof placement**: After claims, before CTAs
- **CTA repetition**: Primary CTA in hero AND near bottom (bookend pattern)
- **Sidebar**: Only if the page needs persistent navigation/filters (e.g. docs, e-commerce)
- **Mobile consideration**: Multi-column grids should make sense stacked vertically too

## REQUESTING RESEARCH (IMPORTANT!)
When you need data, statistics, competitor insights, or audience research, you MUST request it.
**The discussion will HALT until research is complete.**

**Available Researchers:**
- @stats-finder - Industry statistics, data points, research studies
- @competitor-analyst - Competitor messaging, positioning, gaps
- @audience-insight - Audience discussions, objections, language patterns
- @copy-explorer - Successful copy examples, proven patterns
${isHebrew ? "- @local-context - Israeli market, Hebrew patterns, local insights" : ""}

**How to Request:**
Simply mention the researcher with your query:
${isHebrew ? `@stats-finder: \u05DE\u05D4 \u05D0\u05D7\u05D5\u05D6 \u05D4\u05D9\u05E9\u05E8\u05D0\u05DC\u05D9\u05DD \u05E9\u05DE\u05E9\u05EA\u05EA\u05E4\u05D9\u05DD \u05D1\u05D1\u05D7\u05D9\u05E8\u05D5\u05EA \u05DE\u05E7\u05D5\u05DE\u05D9\u05D5\u05EA?
@competitor-analyst: \u05D0\u05D9\u05DA \u05D4\u05DE\u05EA\u05D7\u05E8\u05D9\u05DD \u05DE\u05E6\u05D9\u05D2\u05D9\u05DD \u05D0\u05EA \u05D4-value prop \u05E9\u05DC\u05D4\u05DD?` : `@stats-finder: What percentage of users convert after seeing social proof?
@competitor-analyst: How do competitors position their value prop?`}

Or use the block format:
${isHebrew ? `[RESEARCH: audience-insight]
\u05DE\u05D4 \u05D4\u05D4\u05EA\u05E0\u05D2\u05D3\u05D5\u05D9\u05D5\u05EA \u05D4\u05E0\u05E4\u05D5\u05E6\u05D5\u05EA \u05D1\u05D9\u05D5\u05EA\u05E8 \u05DC\u05D0\u05E4\u05DC\u05D9\u05E7\u05E6\u05D9\u05D5\u05EA \u05D4\u05E6\u05D1\u05E2\u05D4?
[/RESEARCH]` : `[RESEARCH: audience-insight]
What are the most common objections to this product category?
[/RESEARCH]`}

**When to Request Research:**
- You're making a claim that needs data to back it up
- You want to see how competitors handle something
- You need specific audience language or objections
- You want examples of effective copy patterns
${isHebrew ? "- You need Israeli market context" : ""}

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
    case "hebrew":
      return "Write primarily in Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA). Use natural Hebrew copywriting style.";
    case "mixed":
      return "Write primarily in Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA), but include English translations for key terms in parentheses.";
    default:
      return "Write in English only.";
  }
}
var ElectronAgentRunner = class {
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
var ClaudeCodeAgent = class {
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

// src/lib/eda/AgentListener.ts
init_personas();
var DEFAULT_CONFIG2 = {
  reactivityThreshold: 0.5,
  minSilenceBeforeReact: 1,
  evaluationDebounce: 500,
  maxEvaluationMessages: 8,
  // Messages used when evaluating whether to respond
  maxResponseMessages: 15
  // Messages used when generating actual response
};
var AgentListener = class {
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
      }, this.id)
    );
    this.unsubscribers.push(
      this.bus.subscribe("session:resume", () => {
        if (this.messagesSinceSpoke > 0 && this.state === "listening") {
          this.pendingEvaluation = setTimeout(() => {
            this.evaluateAndReact();
          }, this.config.evaluationDebounce + Math.random() * 500);
        }
      }, this.id)
    );
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
      } else {
        this.state = "listening";
      }
    } catch (error) {
      this.state = "listening";
    }
  }
  /**
   * Called when granted the floor
   */
  async onFloorGranted(reason) {
    if (!this.sessionConfig || !this.claudeAgent) return;
    this.state = "speaking";
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
      this.bus.emit("floor:released", { agentId: this.id });
      this.state = "listening";
    }
  }
  /**
   * Called when floor request is denied
   */
  onFloorDenied(reason) {
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

// src/lib/eda/EDAOrchestrator.ts
init_personas();

// src/lib/claude.ts
init_personas();
import Anthropic from "@anthropic-ai/sdk";

// src/methodologies/index.ts
var VISUAL_DECISION_RULES = [
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
var STRUCTURE_DECISION_RULES = [
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
var DEFAULT_PHASES = [
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
var DEFAULT_METHODOLOGY = {
  argumentationStyle: "mixed",
  consensusMethod: "consent",
  visualDecisionRules: VISUAL_DECISION_RULES,
  structureDecisionRules: STRUCTURE_DECISION_RULES,
  phases: DEFAULT_PHASES
};
function getDefaultMethodology() {
  return { ...DEFAULT_METHODOLOGY };
}

// src/lib/claude.ts
var client = null;
function initializeClient(apiKey) {
  if (!client || apiKey) {
    client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY || "",
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

// src/lib/modes/index.ts
var COPYWRITE_MODE = {
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
var IDEA_VALIDATION_MODE = {
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
var IDEATION_MODE = {
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
var WILL_IT_WORK_MODE = {
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
var SITE_SURVEY_MODE = {
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
var BUSINESS_PLAN_MODE = {
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
var GTM_STRATEGY_MODE = {
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
var CUSTOM_MODE = {
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
var SESSION_MODES = {
  "copywrite": COPYWRITE_MODE,
  "idea-validation": IDEA_VALIDATION_MODE,
  "ideation": IDEATION_MODE,
  "will-it-work": WILL_IT_WORK_MODE,
  "site-survey": SITE_SURVEY_MODE,
  "business-plan": BUSINESS_PLAN_MODE,
  "gtm-strategy": GTM_STRATEGY_MODE,
  "custom": CUSTOM_MODE
};
function getModeById(id) {
  return SESSION_MODES[id];
}
function getDefaultMode() {
  return COPYWRITE_MODE;
}

// src/lib/modes/ModeController.ts
var ModeController = class _ModeController {
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
    return message.type === "research_request" || content.includes("@stats-finder") || content.includes("@competitor-analyst") || content.includes("@audience-insight") || content.includes("@copy-explorer") || content.includes("@local-context") || content.includes("[research:");
  }
  /**
   * Track research request and topic
   */
  trackResearchRequest(message) {
    this.progress.researchRequests++;
    const content = message.content.toLowerCase();
    const topicMatch = content.match(/@(\w+-\w+)|(\[research:\s*(\w+)\])/);
    if (topicMatch) {
      const topic = topicMatch[1] || topicMatch[3] || "general";
      const count = this.progress.researchByTopic.get(topic) || 0;
      this.progress.researchByTopic.set(topic, count + 1);
    }
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
    const currentPhaseConfig = this.mode.phases.find((p4) => p4.id === this.progress.currentPhase);
    if (!currentPhaseConfig) return null;
    if (!currentPhaseConfig.autoTransition) return null;
    const maxMessagesReached = this.progress.messagesInPhase >= currentPhaseConfig.maxMessages;
    const exitCriteriaMet = this.checkExitCriteria(currentPhaseConfig.exitCriteria);
    if (maxMessagesReached || exitCriteriaMet.met) {
      const nextPhase = this.mode.phases.find((p4) => p4.order === currentPhaseConfig.order + 1);
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

At least ${required} research requests needed before synthesis.
Completed so far: ${completed}

**Action required:** Agents need to request more information from researchers before proceeding.

**Available researchers:**
- @stats-finder - Data and statistics
- @competitor-analyst - Competitor analysis
- @audience-insight - Audience insights
- @copy-explorer - Copy examples`
      };
    }
    return {
      allowed: true,
      message: `\u2705 Research requirements met (${completed}/${required})`
    };
  }
  /**
   * Check if we should force synthesis
   */
  shouldForceSynthesis() {
    const maxMessages = this.mode.successCriteria.maxMessages;
    const atLimit = this.progress.totalMessages >= maxMessages;
    const neverSynthesized = !this.mode.phases.some(
      (p4) => p4.id === "synthesis" && this.progress.currentPhase === "synthesis"
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
   * Detect outputs produced (copy sections, verdicts, etc.)
   */
  detectOutputs(message) {
    const content = message.content.toLowerCase();
    if (content.includes("## hero") || content.includes("hero:") || content.includes("headline:")) {
      this.progress.outputsProduced.add("hero");
    }
    if (content.includes("value prop") || content.includes("## benefits") || content.includes("## value")) {
      this.progress.outputsProduced.add("value_proposition");
    }
    if (content.includes("cta") || content.includes("call to action") || content.includes("## cta")) {
      this.progress.outputsProduced.add("cta");
    }
    if (content.includes("verdict:") || content.includes("our verdict") || content.includes("final decision")) {
      this.progress.outputsProduced.add("verdict");
    }
    if (content.includes("next steps") || content.includes("## next")) {
      this.progress.outputsProduced.add("next_steps");
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
    const phase = this.mode.phases.find((p4) => p4.id === phaseId);
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
    return this.mode.phases.find((p4) => p4.id === this.progress.currentPhase);
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

// src/lib/eda/EDAOrchestrator.ts
init_wireframe();

// src/lib/eda/ResonanceMonitor.ts
var PHASE_TARGETS = {
  initialization: { min: 50, max: 70, label: "Curious & Ready" },
  brainstorming: { min: 60, max: 90, label: "Excited & Generative" },
  argumentation: { min: 40, max: 70, label: "Challenged & Engaged" },
  synthesis: { min: 55, max: 85, label: "Satisfied & Aligned" },
  drafting: { min: 60, max: 90, label: "Confident & Focused" },
  finalization: { min: 70, max: 95, label: "Proud & Complete" }
};
var PERSONA_KEYWORDS = {
  ronit: { positive: ["clear", "concise", "value"], negative: ["fluff", "vague"] },
  yossi: { positive: ["evidence", "data", "research"], negative: ["unproven", "claims"] },
  noa: { positive: ["authentic", "mobile", "social"], negative: ["corporate", "jargon"] },
  avi: { positive: ["roi", "cost", "numbers"], negative: ["emotional", "vague"] },
  michal: { positive: ["impact", "community", "values"], negative: ["profit-driven"] }
};
var MAX_HISTORY = 20;
var LLM_CHECK_INTERVAL = 8;
var HEURISTIC_WEIGHT = 0.7;
var LLM_WEIGHT = 0.3;
function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
function computeTrend(history) {
  if (history.length < 3) return "stable";
  const recent = history.slice(-3);
  const diff = recent[recent.length - 1] - recent[0];
  if (diff > 5) return "rising";
  if (diff < -5) return "falling";
  return "stable";
}
var ResonanceMonitor = class {
  agents = /* @__PURE__ */ new Map();
  enabledAgentIds;
  messagesSinceLLMCheck = 0;
  llmScores = /* @__PURE__ */ new Map();
  currentPhase = "initialization";
  constructor(enabledAgentIds) {
    this.enabledAgentIds = enabledAgentIds;
    for (const id of enabledAgentIds) {
      this.agents.set(id, {
        agentId: id,
        score: 50,
        dimensions: { creatorPride: 50, userDelight: 50, discussionQuality: 50 },
        trend: "stable",
        lastUpdated: Date.now(),
        history: [50]
      });
    }
  }
  // ─── Public API ─────────────────────────────────────────────────────────
  /**
   * Process an incoming message and return an optional intervention.
   */
  processMessage(message, allMessages, agentMemoryStates, consensusPoints, conflictPoints) {
    if (message.agentId === "system") return null;
    for (const agentId of this.enabledAgentIds) {
      const memState = agentMemoryStates.get(agentId);
      const heuristic = this.computeHeuristic(agentId, memState, allMessages, consensusPoints, conflictPoints);
      const existing = this.agents.get(agentId);
      const llmDims = this.llmScores.get(agentId);
      let dims;
      if (llmDims) {
        dims = {
          creatorPride: heuristic.creatorPride * HEURISTIC_WEIGHT + llmDims.creatorPride * LLM_WEIGHT,
          userDelight: heuristic.userDelight * HEURISTIC_WEIGHT + llmDims.userDelight * LLM_WEIGHT,
          discussionQuality: heuristic.discussionQuality * HEURISTIC_WEIGHT + llmDims.discussionQuality * LLM_WEIGHT
        };
      } else {
        dims = heuristic;
      }
      const score = clamp(Math.round(
        dims.creatorPride * 0.35 + dims.userDelight * 0.35 + dims.discussionQuality * 0.3
      ));
      const history = [...existing.history, score].slice(-MAX_HISTORY);
      const trend = computeTrend(history);
      this.agents.set(agentId, {
        agentId,
        score,
        dimensions: dims,
        trend,
        lastUpdated: Date.now(),
        history
      });
    }
    this.messagesSinceLLMCheck++;
    return this.checkInterventions();
  }
  /**
   * Update the LLM-derived scores (called externally after haiku feelings check).
   */
  setLLMScores(scores) {
    this.llmScores = scores;
  }
  /**
   * Check if it's time for an LLM feelings check.
   */
  shouldRunLLMCheck() {
    return this.messagesSinceLLMCheck >= LLM_CHECK_INTERVAL;
  }
  /**
   * Reset the LLM check counter after running a check.
   */
  resetLLMCheckCounter() {
    this.messagesSinceLLMCheck = 0;
  }
  setPhase(phase) {
    this.currentPhase = phase;
  }
  getAgentResonance(agentId) {
    return this.agents.get(agentId);
  }
  getGlobalResonance() {
    if (this.agents.size === 0) return 50;
    let total = 0;
    for (const agent of this.agents.values()) {
      total += agent.score;
    }
    return Math.round(total / this.agents.size);
  }
  getGlobalHistory() {
    if (this.agents.size === 0) return [50];
    const agentHistories = Array.from(this.agents.values()).map((a) => a.history);
    const maxLen = Math.max(...agentHistories.map((h) => h.length));
    const globalHistory = [];
    for (let i = 0; i < maxLen; i++) {
      let sum = 0;
      let count = 0;
      for (const h of agentHistories) {
        if (i < h.length) {
          sum += h[i];
          count++;
        }
      }
      globalHistory.push(Math.round(sum / count));
    }
    return globalHistory.slice(-MAX_HISTORY);
  }
  getPhaseTarget() {
    const target = PHASE_TARGETS[this.currentPhase];
    return target ? [target.min, target.max] : [50, 70];
  }
  getPhaseTargetLabel() {
    const target = PHASE_TARGETS[this.currentPhase];
    return target?.label || "Engaged";
  }
  getAllAgentResonances() {
    return new Map(this.agents);
  }
  // ─── Heuristic Scoring ──────────────────────────────────────────────────
  computeHeuristic(agentId, memState, allMessages, consensusPoints, conflictPoints) {
    const agreements = memState?.agreements.length ?? 0;
    const disagreements = memState?.disagreements.length ?? 0;
    const contributed = (memState?.messageCount ?? 0) > 0;
    const hasProposal = allMessages.some(
      (m) => m.agentId === agentId && /\[PROPOSAL\]/i.test(m.content)
    );
    let pride = 50;
    pride += agreements * 5;
    pride -= disagreements * 3;
    if (contributed) pride += 10;
    if (hasProposal) pride += 15;
    let delight = 50;
    delight += consensusPoints * 4;
    delight -= conflictPoints * 2;
    delight += this.computeKeywordBonus(agentId, allMessages);
    let quality = 50;
    const participatingAgents = new Set(allMessages.filter((m) => m.agentId !== "system" && m.agentId !== "human").map((m) => m.agentId));
    if (this.enabledAgentIds.every((id) => participatingAgents.has(id))) {
      quality += 15;
    }
    if (this.isBalanced(allMessages)) {
      quality += 10;
    }
    if (this.detectLoop(allMessages)) {
      quality -= 20;
    }
    return {
      creatorPride: clamp(Math.round(pride)),
      userDelight: clamp(Math.round(delight)),
      discussionQuality: clamp(Math.round(quality))
    };
  }
  computeKeywordBonus(agentId, allMessages) {
    const keywords = PERSONA_KEYWORDS[agentId];
    if (!keywords) return 0;
    let bonus = 0;
    const recent = allMessages.slice(-10);
    const recentText = recent.map((m) => m.content.toLowerCase()).join(" ");
    for (const word of keywords.positive) {
      if (recentText.includes(word)) bonus += 5;
    }
    for (const word of keywords.negative) {
      if (recentText.includes(word)) bonus -= 5;
    }
    return clamp(bonus, -15, 15);
  }
  isBalanced(allMessages) {
    const counts = /* @__PURE__ */ new Map();
    for (const msg of allMessages) {
      if (msg.agentId !== "system" && msg.agentId !== "human") {
        counts.set(msg.agentId, (counts.get(msg.agentId) || 0) + 1);
      }
    }
    if (counts.size < 2) return false;
    const values = Array.from(counts.values());
    const max = Math.max(...values);
    const min = Math.min(...values);
    return max <= min * 3;
  }
  detectLoop(allMessages) {
    if (allMessages.length < 6) return false;
    const last6 = allMessages.slice(-6);
    const speakers = last6.map((m) => m.agentId);
    const unique = new Set(speakers.filter((s) => s !== "system" && s !== "human"));
    if (unique.size <= 2 && last6.length >= 6) {
      const contents = last6.map((m) => m.content.slice(0, 50).toLowerCase());
      const uniqueContents = new Set(contents);
      return uniqueContents.size <= 3;
    }
    return false;
  }
  // ─── Interventions ──────────────────────────────────────────────────────
  checkInterventions() {
    const global = this.getGlobalResonance();
    const [_targetMin, _targetMax] = this.getPhaseTarget();
    if (this.currentPhase === "argumentation" && global >= 40 && global <= 70) {
      return null;
    }
    if (global < 30) {
      return {
        type: "mode_intervention",
        message: `[RESONANCE] Team energy is critically low (${global}/100). Let's pause and reflect: what's not working? What would make this discussion more productive?`,
        priority: "high"
      };
    }
    for (const agent of this.agents.values()) {
      if (agent.score < 20) {
        return {
          type: "agent_rotation",
          message: `[RESONANCE] ${agent.agentId} seems disengaged (resonance: ${agent.score}/100). Let's hear their perspective \u2014 what matters most to you here?`,
          priority: "medium",
          targetAgent: agent.agentId
        };
      }
    }
    const lowAgents = Array.from(this.agents.values()).filter((a) => a.score >= 30 && a.score <= 45);
    if (lowAgents.length >= 2) {
      return {
        type: "discussion_prompt",
        message: `[RESONANCE] Energy is low across the team (global: ${global}/100). Let's refocus on what excites us about this project.`,
        priority: "medium"
      };
    }
    if (global > 80 && Array.from(this.agents.values()).every((a) => a.score > 70)) {
      const lastHistory = this.getGlobalHistory();
      const prevGlobal = lastHistory.length >= 2 ? lastHistory[lastHistory.length - 2] : 0;
      if (prevGlobal <= 80) {
        return {
          type: "celebration",
          message: `[RESONANCE] The team is aligned and energized! (${global}/100) Great momentum \u2014 keep building on this.`,
          priority: "low"
        };
      }
    }
    return null;
  }
  // ─── Serialization ──────────────────────────────────────────────────────
  toJSON() {
    const agents = {};
    for (const [id, resonance] of this.agents) {
      agents[id] = resonance;
    }
    return {
      agents,
      globalScore: this.getGlobalResonance(),
      globalHistory: this.getGlobalHistory()
    };
  }
  fromJSON(state) {
    this.agents.clear();
    for (const [id, resonance] of Object.entries(state.agents)) {
      this.agents.set(id, resonance);
    }
  }
};

// src/lib/eda/EDAOrchestrator.ts
var COPY_SECTIONS = [
  { id: "hero", name: "Hero Section", nameHe: "\u05DB\u05D5\u05EA\u05E8\u05EA \u05E8\u05D0\u05E9\u05D9\u05EA" },
  { id: "problem", name: "Problem Statement", nameHe: "\u05D1\u05E2\u05D9\u05D4" },
  { id: "solution", name: "Solution/Benefits", nameHe: "\u05E4\u05EA\u05E8\u05D5\u05DF \u05D5\u05D9\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA" },
  { id: "social-proof", name: "Social Proof", nameHe: "\u05D4\u05D5\u05DB\u05D7\u05D4 \u05D7\u05D1\u05E8\u05EA\u05D9\u05EA" },
  { id: "cta", name: "Call to Action", nameHe: "\u05E7\u05E8\u05D9\u05D0\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4" }
];
var EDAOrchestrator = class _EDAOrchestrator {
  session;
  context;
  skills;
  bus;
  floorManager;
  agentListeners = /* @__PURE__ */ new Map();
  eventCallbacks = [];
  isRunning = false;
  messageCount = 0;
  synthesisInterval = null;
  unsubscribers = [];
  // Phase management
  currentPhase = "initialization";
  phaseStartMessageIndex = 0;
  // Track when current phase started
  copySections = [];
  // Consensus tracking
  agentContributions = /* @__PURE__ */ new Map();
  keyInsights = /* @__PURE__ */ new Map();
  consensusThreshold = 0.6;
  // 60% agreement needed
  // Auto-moderator: message count thresholds per phase
  autoModeratorEnabled = true;
  moderatorNudgeSent = false;
  // Track if we already nudged in this phase
  static BRAINSTORMING_MAX = 36;
  // Max messages before auto-transition to argumentation
  static ARGUMENTATION_NUDGE = 15;
  // Nudge toward synthesis after this many messages
  static ARGUMENTATION_FORCE = 25;
  // Force synthesis after this many messages
  static SYNTHESIS_MAX = 15;
  // Max messages before auto-transition to drafting
  static DRAFTING_MAX = 20;
  // Max messages before auto-finalization
  // Research state (used for tracking pending research)
  researchPending = false;
  // Canvas consensus state (per-agent wireframe tracking)
  wireframeProposals = /* @__PURE__ */ new Map();
  canvasConsensusPhase = "idle";
  wireframeProposalPromptSent = false;
  critiqueStartIndex = 0;
  canvasCritiques = /* @__PURE__ */ new Map();
  // Dependency injection
  agentRunner;
  fileSystem;
  // Mode controller for goal anchoring and loop detection
  modeController;
  resonanceMonitor;
  constructor(session, context, skills, options) {
    this.session = session;
    this.context = context;
    this.skills = skills;
    this.bus = messageBus;
    this.floorManager = new FloorManager(this.bus);
    this.agentRunner = options?.agentRunner;
    this.fileSystem = options?.fileSystem;
    const mode = getModeById(session.config.mode || "copywrite") || getDefaultMode();
    this.modeController = new ModeController(mode);
    this.resonanceMonitor = new ResonanceMonitor(session.config.enabledAgents);
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
      let briefContent = "";
      try {
        const brief = await this.readBrief("taru");
        if (brief) {
          briefContent = `

**Project Brief:**
${brief.slice(0, 1500)}...`;
        }
      } catch {
      }
      if (this.fileSystem) {
        try {
          const mod = await import("../../cli/adapters/CrossSessionMemory");
          const crossMemory = new mod.CrossSessionMemory(this.fileSystem);
          const pastContext = await crossMemory.getRelevantPastContext(
            this.session.config.projectName,
            this.session.config.goal
          );
          if (pastContext) {
            const pastContextMsg = {
              id: crypto.randomUUID(),
              timestamp: /* @__PURE__ */ new Date(),
              agentId: "system",
              type: "system",
              content: pastContext.summary,
              metadata: { source: "cross-session-memory" }
            };
            this.bus.addMessage(pastContextMsg, "system");
          }
        } catch {
        }
      }
      const promptMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `**DISCUSSION STARTS NOW**

Goal: ${this.session.config.goal}
${briefContent}

**Each agent MUST respond with their initial reaction:**
- What's your FIRST instinct about this project?
- What concerns you from YOUR persona's perspective?
- What opportunity do you see?

Ronit - you're up first. Share your initial reaction.`
      };
      this.bus.addMessage(promptMessage, "system");
      setTimeout(() => {
        this.forceAgentToSpeak("ronit", "Opening the discussion as requested");
      }, 2e3);
    }, 1e3);
    this.synthesisInterval = setInterval(() => {
      this.checkForSynthesis();
    }, 3e4);
    if (this.session.config.humanParticipation) {
      setTimeout(() => {
        this.promptHuman("The floor is open. Add your thoughts anytime.");
      }, 5e3);
    }
    this.currentPhase = "brainstorming";
    this.session.currentPhase = "brainstorming";
    this.phaseStartMessageIndex = this.session.messages.length;
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
          this.trackWireframeFromMessage(payload.fromAgent, payload.message);
        }
        const agent = getAgentById(payload.fromAgent);
        if (agent) {
          this.emit("agent_typing", { agentId: payload.fromAgent, typing: false });
        }
        this.emit("agent_message", { agentId: payload.fromAgent, message: payload.message });
        if (payload.fromAgent !== "system") {
          this.checkForResearchRequests(payload.message);
          this.processModeInterventions(payload.message);
          this.processResonance(payload.message);
          if (this.currentPhase === "drafting") {
            this.autoCompleteDraftSection(payload.fromAgent, payload.message);
          }
          this.checkAutoTransition();
        }
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
      }, "orchestrator")
    );
  }
  /**
   * Create agent listeners for all enabled agents
   */
  createAgentListeners() {
    for (const agentId of this.session.config.enabledAgents) {
      const agent = getAgentById(agentId);
      if (!agent) {
        continue;
      }
      const listener = new AgentListener(
        agent,
        this.bus,
        {
          reactivityThreshold: 0.6,
          minSilenceBeforeReact: 1,
          evaluationDebounce: 800 + Math.random() * 400
          // Stagger evaluations
        },
        this.agentRunner
        // Pass injected runner
      );
      this.agentListeners.set(agentId, listener);
    }
  }
  /**
   * Track agent contribution and consensus signals
   */
  trackAgentContribution(agentId, message) {
    const count = this.agentContributions.get(agentId) || 0;
    this.agentContributions.set(agentId, count + 1);
    const content = message.content;
    const typeMatch = content.match(/\[(ARGUMENT|QUESTION|PROPOSAL|AGREEMENT|DISAGREEMENT|SYNTHESIS)\]/i);
    let responseType = typeMatch ? typeMatch[1].toUpperCase() : null;
    if (!responseType) {
      const lower = content.toLowerCase();
      const agreeSignals = ["i agree", "great point", "exactly", "well said", "support this", "builds on", "+1", "absolutely", "i second"];
      const disagreeSignals = ["i disagree", "however", "but i think", "on the contrary", "i challenge", "pushback", "not sure about", "counterpoint"];
      const proposalSignals = ["i propose", "i suggest", "how about", "what if we", "my recommendation", "let's consider"];
      if (agreeSignals.some((s) => lower.includes(s))) responseType = "AGREEMENT";
      else if (disagreeSignals.some((s) => lower.includes(s))) responseType = "DISAGREEMENT";
      else if (proposalSignals.some((s) => lower.includes(s))) responseType = "PROPOSAL";
    }
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
   * Track wireframe proposals per agent and parse canvas critique tags
   */
  trackWireframeFromMessage(agentId, message) {
    const content = message.content;
    const proposed = extractWireframe(content);
    if (proposed) {
      const agent = getAgentById(agentId);
      this.wireframeProposals.set(agentId, {
        agentId,
        agentName: agent?.name || agentId,
        wireframe: proposed,
        timestamp: Date.now(),
        messageIndex: this.session.messages.length - 1
      });
      this.emit("canvas_update", {
        agentId,
        phase: this.canvasConsensusPhase,
        proposalCount: this.wireframeProposals.size
      });
    }
    const critiquePattern = /\[CANVAS_CRITIQUE:(KEEP|REMOVE|MODIFY)\]\s*(\S+(?:\s+\S+)*?)\s*[-—]\s*(.+)/gi;
    let match;
    const critiques = [];
    while ((match = critiquePattern.exec(content)) !== null) {
      critiques.push({
        action: match[1].toUpperCase(),
        section: match[2].trim(),
        reason: match[3].trim()
      });
    }
    if (critiques.length > 0) {
      this.canvasCritiques.set(agentId, critiques);
    }
  }
  /**
   * Step 1: Ask all agents to propose wireframes
   */
  triggerWireframeProposals() {
    this.canvasConsensusPhase = "proposing";
    this.wireframeProposalPromptSent = true;
    const proposalMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `\u{1F3A8} **CANVAS ROUND: Wireframe Proposals**

Each agent should now propose a page structure using a [WIREFRAME] block.

**Guidelines:**
- Include all sections you think the page needs
- Use the standard wireframe syntax (navbar, sections, footer, etc.)
- Think about user journey from top to bottom
- Consider mobile stacking order

**Every agent must include a [WIREFRAME] block in their next response.**`
    };
    this.bus.addMessage(proposalMessage, "system");
    this.emit("canvas_update", { phase: "proposing", proposalCount: 0 });
    const enabledAgents = this.session.config.enabledAgents;
    enabledAgents.forEach((agentId, index) => {
      setTimeout(() => {
        this.forceAgentToSpeak(agentId, "Canvas Round: propose your wireframe layout");
      }, 2e3 + index * 1500);
    });
  }
  /**
   * Step 2: Show all proposals and ask for critique
   */
  triggerWireframeCritique() {
    this.canvasConsensusPhase = "critiquing";
    this.critiqueStartIndex = this.session.messages.length;
    const proposalSummary = Array.from(this.wireframeProposals.entries()).map(([agentId, proposal]) => {
      const sections = getLeafSections(proposal.wireframe).map((s) => s.label).join(", ");
      return `**${proposal.agentName}**: ${sections}`;
    }).join("\n");
    const critiqueMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `\u{1F50D} **CANVAS ROUND: Critique Phase**

All agents have proposed wireframes. Here are the structures:

${proposalSummary}

**Now review each other's layouts.** Use these tags:
- \`[CANVAS_CRITIQUE:KEEP] SectionName - reason\`
- \`[CANVAS_CRITIQUE:REMOVE] SectionName - reason\`
- \`[CANVAS_CRITIQUE:MODIFY] SectionName - suggestion\`

Focus on what should stay, what's redundant, and what needs changing.`
    };
    this.bus.addMessage(critiqueMessage, "system");
    this.emit("canvas_update", { phase: "critiquing", proposalCount: this.wireframeProposals.size });
    const enabledAgents = this.session.config.enabledAgents;
    enabledAgents.forEach((agentId, index) => {
      setTimeout(() => {
        this.forceAgentToSpeak(agentId, "Canvas Round: critique the proposed wireframes");
      }, 2e3 + index * 2e3);
    });
  }
  /**
   * Step 3: Compute consensus wireframe from proposals + critiques
   * Uses section-level majority voting: sections in >50% of proposals are included
   */
  computeCanvasConsensus() {
    this.canvasConsensusPhase = "converged";
    const sectionVotes = /* @__PURE__ */ new Map();
    const totalProposals = this.wireframeProposals.size;
    for (const proposal of this.wireframeProposals.values()) {
      const leaves = getLeafSections(proposal.wireframe);
      for (const leaf of leaves) {
        const key = leaf.label.toLowerCase().replace(/\s+/g, "-");
        const existing = sectionVotes.get(key);
        if (existing) {
          existing.count++;
        } else {
          sectionVotes.set(key, { count: 1, label: leaf.label, node: leaf });
        }
      }
    }
    for (const critiques of this.canvasCritiques.values()) {
      for (const critique of critiques) {
        const key = critique.section.toLowerCase().replace(/\s+/g, "-");
        const existing = sectionVotes.get(key);
        if (existing) {
          if (critique.action === "REMOVE") {
            existing.count = Math.max(0, existing.count - 1);
          } else if (critique.action === "KEEP") {
            existing.count++;
          }
        }
      }
    }
    const threshold = totalProposals * 0.5;
    const consensusSections = Array.from(sectionVotes.values()).filter((v) => v.count > threshold).map((v) => v.label);
    const templateProposal = this.wireframeProposals.values().next().value;
    const consensusWireframeText = consensusSections.length > 0 ? `[WIREFRAME]
${consensusSections.map((s) => `${s.toLowerCase().replace(/\s+/g, "-")}: ${s}`).join("\n")}
[/WIREFRAME]` : null;
    const consensusWireframe = consensusWireframeText ? extractWireframe(consensusWireframeText) : templateProposal?.wireframe;
    const consensusMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `\u2705 **CANVAS ROUND: Consensus Reached**

The group has converged on a wireframe structure with **${consensusSections.length} sections**:
${consensusSections.map((s) => `- ${s}`).join("\n")}

${consensusSections.length > 0 ? `[WIREFRAME]
${consensusSections.map((s) => `${s.toLowerCase().replace(/\\s+/g, "-")}: ${s}`).join("\n")}
[/WIREFRAME]` : "Using first proposal as baseline."}

The discussion will now continue toward argumentation.`
    };
    this.bus.addMessage(consensusMessage, "system");
    this.emit("canvas_update", {
      phase: "converged",
      proposalCount: this.wireframeProposals.size,
      consensusSections
    });
  }
  /**
   * Get all wireframe proposals (for dashboard)
   */
  getWireframeProposals() {
    return new Map(this.wireframeProposals);
  }
  /**
   * Get current canvas consensus phase (for dashboard)
   */
  getCanvasConsensusPhase() {
    return this.canvasConsensusPhase;
  }
  /**
   * Get agent memory states (for dashboard — exposes positions, stances)
   */
  getAgentMemoryStates() {
    return this.bus.getAllAgentStates();
  }
  /**
   * Get single agent's memory state
   */
  getAgentMemoryState(agentId) {
    return this.bus.getAgentMemoryState(agentId);
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
      recommendation = "Waiting for research results...";
    } else if (!allAgentsSpoke) {
      const silent = enabledAgents.filter((id) => !agentsWhoSpoke.has(id));
      recommendation = `Not all agents have spoken yet. Missing: ${silent.join(", ")}`;
    } else if (totalContributions < minContributions) {
      recommendation = `Discussion still too short (${totalContributions}/${minContributions} contributions)`;
    } else if (conflictPoints > consensusPoints) {
      recommendation = `More conflicts than agreements (${conflictPoints} conflicts, ${consensusPoints} agreements). Keep discussing.`;
    } else if (consensusPoints === 0 && totalContributions < minContributions * 2) {
      recommendation = "No consensus points yet. Agents need to respond to each other.";
    } else if (consensusPoints === 0 && totalContributions >= minContributions * 2) {
      ready = true;
      recommendation = `Discussion mature (${totalContributions} contributions). Ready for synthesis.`;
    } else {
      ready = true;
      recommendation = `Ready for synthesis! ${consensusPoints} consensus points, ${conflictPoints} open conflicts.`;
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
   * Process mode interventions (goal reminders, loop detection, phase transitions)
   */
  processModeInterventions(message) {
    const interventions = this.modeController.processMessage(message, this.session.messages);
    for (const intervention of interventions) {
      let content = intervention.message;
      if (content.includes("{goal}")) {
        content = content.replace("{goal}", this.session.config.goal);
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
      this.emit("intervention", {
        type: intervention.type,
        message: content,
        priority: intervention.priority,
        action: intervention.action
      });
      setTimeout(() => {
        this.bus.addMessage(interventionMessage, "system");
      }, 500);
    }
  }
  /**
   * Process resonance metrics for the current message and emit update events.
   * If an intervention is triggered, inject a system message.
   */
  processResonance(message) {
    this.resonanceMonitor.setPhase(this.currentPhase);
    const agentMemoryStates = this.bus.getAllAgentStates();
    const status = this.getConsensusStatus();
    const intervention = this.resonanceMonitor.processMessage(
      message,
      this.session.messages,
      agentMemoryStates,
      status.consensusPoints,
      status.conflictPoints
    );
    this.emit("resonance_update", {
      globalScore: this.resonanceMonitor.getGlobalResonance(),
      globalHistory: this.resonanceMonitor.getGlobalHistory(),
      agents: Object.fromEntries(
        Array.from(this.resonanceMonitor.getAllAgentResonances()).map(([id, r]) => [id, {
          score: r.score,
          trend: r.trend
        }])
      ),
      phaseTarget: this.resonanceMonitor.getPhaseTarget()
    });
    if (intervention) {
      const interventionMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: intervention.message,
        metadata: {
          interventionType: intervention.type,
          priority: intervention.priority,
          resonanceIntervention: true
        }
      };
      setTimeout(() => {
        this.bus.addMessage(interventionMessage, "system");
      }, 500);
    }
  }
  /**
   * Check for research requests in message
   */
  checkForResearchRequests(message) {
    const content = message.content;
    const mentionPattern = /@(stats-finder|competitor-analyst|audience-insight|copy-explorer|local-context)[:\s]+["']?([^"'\n]+)["']?/gi;
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      const researcherId = match[1].toLowerCase();
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
   * Process a research request - HALTS discussion until complete
   */
  async processResearchRequest(researcherId, query, requestedBy) {
    const researcher = getResearcherById(researcherId);
    if (!researcher) return;
    this.researchPending = true;
    this.bus.pause("Research in progress");
    this.emit("research_halt", { researcherId, query, requestedBy });
    this.bus.emit("message:research", { request: { researcherId, query }, fromAgent: requestedBy });
    const announceMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `\u{1F50D} **Discussion paused for research**

**Researcher:** ${researcher.name}
**Query:** "${query}"
**Requested by:** ${this.getAgentName(requestedBy)}

\u23F3 Searching... Agents are waiting.`
    };
    this.bus.addMessage(announceMessage, "system");
    try {
      const result = await this.runResearchWithWebSearch(researcher, query);
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
        content: `\u2705 **Research complete \u2014 discussion resumes**

Agents can now reference the findings.`
      };
      this.bus.addMessage(resumeMessage, "system");
    } catch (error) {
      const errorMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `\u274C **Research error:** ${error}

Discussion continues without research results.`
      };
      this.bus.addMessage(errorMessage, "system");
    }
    this.researchPending = false;
    this.bus.resume();
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
2. Find specific numbers, statistics, and facts
3. Verify information from multiple sources when possible

## OUTPUT FORMAT

**\u{1F50D} Key Findings:**
- [bullet points of main discoveries]

**\u{1F4CA} Specific Data:**
- [specific numbers, stats that can be used in copy]

**\u{1F4A1} Implications for Copy:**
- [how this should influence the website copy]

**\u{1F4DA} Sources:**
- [note sources and reliability]`;
    if (this.agentRunner) {
      const result = await this.agentRunner.query({
        prompt: `Research request: ${query}

Search the web for current, accurate information.`,
        systemPrompt,
        model: "claude-sonnet-4-20250514"
      });
      if (!result.success) {
        throw new Error(result.error || "Research query failed");
      }
      return result.content || "No results found";
    }
    if (typeof window !== "undefined" && window.electronAPI?.claudeAgentQuery) {
      const result = await window.electronAPI.claudeAgentQuery({
        prompt: `Research request: ${query}

Search the web for current, accurate information.`,
        systemPrompt,
        model: "claude-sonnet-4-20250514"
      });
      if (!result || !result.success) {
        throw new Error(result?.error || "Research query failed");
      }
      return result.content || "No results found";
    }
    throw new Error("No agent runner available");
  }
  /**
   * Check if synthesis is needed and auto-transition phases
   */
  async checkForSynthesis() {
    if (!this.isRunning) return;
    await this.checkAutoTransition();
    if (this.messageCount > 0 && this.messageCount % 10 === 0) {
      await this.runSynthesis();
    }
  }
  /**
   * Auto-transition between phases when conditions are met.
   * Uses both consensus tracking AND message count fallbacks.
   */
  async checkAutoTransition() {
    const status = this.getConsensusStatus();
    const phaseMessages = this.session.messages.slice(this.phaseStartMessageIndex).filter((m) => m.agentId !== "system");
    const phaseMessageCount = phaseMessages.length;
    switch (this.currentPhase) {
      case "brainstorming": {
        const minContributions = this.session.config.enabledAgents.length * 2;
        const totalContributions = Array.from(this.agentContributions.values()).reduce((a, b) => a + b, 0);
        const enabledAgents = this.session.config.enabledAgents;
        if (this.canvasConsensusPhase === "idle" && status.allAgentsSpoke && !this.wireframeProposalPromptSent) {
          this.triggerWireframeProposals();
        } else if (this.canvasConsensusPhase === "proposing") {
          const allProposed = enabledAgents.every((id) => this.wireframeProposals.has(id));
          if (allProposed) {
            this.triggerWireframeCritique();
          }
        } else if (this.canvasConsensusPhase === "critiquing") {
          const critiqueMessages = this.session.messages.slice(this.critiqueStartIndex).filter((m) => m.agentId !== "system" && m.agentId !== "human");
          const critiqueAgents = new Set(critiqueMessages.map((m) => m.agentId));
          const allCritiqued = enabledAgents.every((id) => critiqueAgents.has(id));
          if (allCritiqued) {
            this.computeCanvasConsensus();
          }
        }
        const canvasReady = this.canvasConsensusPhase === "converged" || this.canvasConsensusPhase === "idle";
        if (status.allAgentsSpoke && totalContributions >= minContributions && canvasReady || this.autoModeratorEnabled && phaseMessageCount >= _EDAOrchestrator.BRAINSTORMING_MAX) {
          await this.transitionToArgumentation();
        }
        break;
      }
      case "argumentation": {
        if (status.ready) {
          await this.transitionToSynthesis(false);
        } else if (this.autoModeratorEnabled) {
          if (phaseMessageCount >= _EDAOrchestrator.ARGUMENTATION_NUDGE && !this.moderatorNudgeSent) {
            this.moderatorNudgeSent = true;
            const nudgeMessage = {
              id: crypto.randomUUID(),
              timestamp: /* @__PURE__ */ new Date(),
              agentId: "system",
              type: "system",
              content: `\u{1F916} **Moderator:** The discussion has been going for ${phaseMessageCount} messages.

**Current status:** ${status.consensusPoints} agreements, ${status.conflictPoints} conflicts.

Let's start wrapping up. Agents \u2014 please:
1. State your final position clearly
2. Use [AGREEMENT] or [DISAGREEMENT] tags to signal your stance
3. Propose any final compromises

The discussion will move to synthesis shortly.`
            };
            this.bus.addMessage(nudgeMessage, "system");
          }
          if (phaseMessageCount >= _EDAOrchestrator.ARGUMENTATION_FORCE) {
            await this.transitionToSynthesis(true);
          }
        }
        break;
      }
      case "synthesis": {
        const synthMessages = this.session.messages.slice(this.phaseStartMessageIndex).filter((m) => m.agentId !== "system" && m.agentId !== "human");
        const synthAgents = new Set(synthMessages.map((m) => m.agentId));
        const threshold = Math.max(2, Math.floor(this.session.config.enabledAgents.length * 0.6));
        if (synthAgents.size >= threshold || this.autoModeratorEnabled && phaseMessageCount >= _EDAOrchestrator.SYNTHESIS_MAX) {
          await this.transitionToDrafting();
        }
        break;
      }
      case "drafting": {
        const allSectionsComplete = this.copySections.length > 0 && this.copySections.every((s) => s.status === "complete");
        if (allSectionsComplete || this.autoModeratorEnabled && phaseMessageCount >= _EDAOrchestrator.DRAFTING_MAX) {
          await this.finalizeDrafting();
        }
        break;
      }
    }
  }
  /**
   * Run synthesis checkpoint
   */
  async runSynthesis() {
    const recentMessages = this.bus.getRecentMessages(10);
    if (recentMessages.length < 5) return;
    try {
      let synthesis;
      if (this.agentRunner) {
        const conversationHistory = recentMessages.map((msg) => {
          const sender = msg.agentId === "human" ? "Human" : msg.agentId === "system" ? "System" : msg.agentId;
          return `[${sender}]: ${msg.content}`;
        }).join("\n\n");
        const roundNumber = Math.floor(this.messageCount / 10);
        const result = await this.agentRunner.query({
          prompt: `Round ${roundNumber} complete. Project: ${this.session.config.projectName}

Here's what was said:

${conversationHistory}

Provide a Devil's Kitchen synthesis for this round.`,
          systemPrompt: `You are the Devil's Kitchen - the synthesis voice of the Recursive Thought Committee (RTC).

Your role after each round:
1. **Surface Agreements** - What points are multiple agents aligning on?
2. **Name Tensions** - What unresolved disagreements need addressing?
3. **Track Progress** - Are we moving toward consensus or diverging?
4. **Prompt Next Round** - What question should the next round address?

Be BRIEF and STRUCTURED. This is a quick checkpoint, not a full synthesis.

Write in Hebrew with English terms where appropriate.
Use emojis sparingly for visual scanning: \u2705 agreements, \u26A1 tensions, \u{1F3AF} focus`,
          model: "claude-sonnet-4-20250514"
        });
        synthesis = result.content || "";
      } else {
        synthesis = await generateRoundSynthesis(
          this.session.config,
          recentMessages,
          Math.floor(this.messageCount / 10),
          this.context
        );
      }
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
      return { success: false, message: `Cannot transition to argumentation from ${this.currentPhase}` };
    }
    const status = this.getConsensusStatus();
    if (!status.allAgentsSpoke) {
      return {
        success: false,
        message: `Not all agents have spoken yet. Waiting for: ${this.session.config.enabledAgents.filter((id) => !status.agentParticipation.has(id)).join(", ")}`
      };
    }
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);
    this.currentPhase = "argumentation";
    this.session.currentPhase = "argumentation";
    this.phaseStartMessageIndex = this.session.messages.length;
    this.moderatorNudgeSent = false;
    this.emit("phase_change", { phase: "argumentation", brief });
    const transitionMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `${brief}
---

\u2694\uFE0F **PHASE: ARGUMENTATION**

Time to critically examine the ideas.

**Phase goal:**
- Raise counter-arguments to proposed ideas
- Challenge core assumptions
- Identify weaknesses and risks
- Defend good ideas with evidence

**Discussion rules:**
- Each agent must raise at least one argument against a proposed idea
- Use tags: [ARGUMENT], [COUNTER], [DEFENSE]
- Don't agree too quickly \u2014 examine ideas in depth

**Let's go!** ${this.getNextSpeakerForArgumentation()} \u2014 open with a critical argument about one of the ideas.`
    };
    this.bus.addMessage(transitionMessage, "system");
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForArgumentation();
      this.forceAgentToSpeak(firstAgent, "Opening argumentation with critical analysis");
    }, 2e3);
    return { success: true, message: "Transitioning to argumentation phase" };
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
      return { success: false, message: `Cannot transition to synthesis from ${this.currentPhase}` };
    }
    const status = this.getConsensusStatus();
    if (!status.ready && !force) {
      const warningMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `\u26A0\uFE0F **Warning: Discussion not yet ready for synthesis**

${status.recommendation}

**Current status:**
- Agents who spoke: ${status.agentParticipation.size}/${this.session.config.enabledAgents.length}
- Consensus points: ${status.consensusPoints}
- Open conflicts: ${status.conflictPoints}

To proceed anyway, type \`synthesize force\``
      };
      this.bus.addMessage(warningMessage, "system");
      return { success: false, message: status.recommendation };
    }
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);
    this.currentPhase = "synthesis";
    this.session.currentPhase = "synthesis";
    this.phaseStartMessageIndex = this.session.messages.length;
    this.moderatorNudgeSent = false;
    this.emit("phase_change", { phase: "synthesis", brief });
    const participationList = Array.from(status.agentParticipation.entries()).map(([id, count]) => `  - ${this.getAgentName(id)}: ${count} contributions`).join("\n");
    const transitionMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `${brief}
---

\u{1F4CA} **PHASE: SYNTHESIS**

Moving to synthesis phase.

**Discussion summary:**
- Consensus points: ${status.consensusPoints}
- Remaining conflicts: ${status.conflictPoints}

**Participation:**
${participationList}

**Task for all agents:**
1. Summarize the key insights from the discussion
2. Identify consensus points and disagreements
3. Define the core messages that must appear in the copy

**Next up:** ${this.getNextSpeakerForSynthesis()} \u2014 summarize the discussion from your perspective.`
    };
    this.bus.addMessage(transitionMessage, "system");
    setTimeout(() => {
      const firstAgent = this.getNextSpeakerForSynthesis();
      this.forceAgentToSpeak(firstAgent, "Synthesizing discussion insights");
    }, 2e3);
    return { success: true, message: "Transitioning to synthesis phase" };
  }
  /**
   * Transition to drafting phase - agents write actual copy sections
   */
  async transitionToDrafting() {
    if (this.currentPhase !== "synthesis" && this.currentPhase !== "brainstorming") {
      return;
    }
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);
    this.currentPhase = "drafting";
    this.session.currentPhase = "drafting";
    this.phaseStartMessageIndex = this.session.messages.length;
    this.emit("phase_change", { phase: "drafting", brief });
    this.copySections = COPY_SECTIONS.map((section, index) => ({
      ...section,
      status: "pending",
      assignedAgent: this.assignAgentToSection(index)
    }));
    const assignments = this.copySections.map((s) => `- **${s.name}**: ${this.getAgentName(s.assignedAgent)}`).join("\n");
    const transitionMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `${brief}
---

\u270D\uFE0F **PHASE: DRAFTING**

Time to write the actual copy!

**Task assignments:**
${assignments}

**Guidelines:**
- Write a first draft for your assigned section
- Build on insights from the discussion
- Maintain consistency in tone and voice
- After each draft, other agents can respond and improve

**Let's go!** ${this.getAgentName(this.copySections[0].assignedAgent)} \u2014 write the ${this.copySections[0].name}.`
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
    const sections = this.copySections.filter((s) => s.content).map((s) => `## ${s.name}

${s.content}`).join("\n\n---\n\n");
    return `# ${this.session.config.projectName} - Draft Copy

${sections}`;
  }
  /**
   * Public accessor for draft copy — used by BuildOrchestrator
   */
  async getCopySectionsDraft() {
    return this.getConsolidatedDraft();
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
    return agent ? agent.name : agentId;
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
    this.forceAgentToSpeak(section.assignedAgent, `Writing ${section.name}`);
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
      content: `\u2705 **${section.name}** complete!

---

${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`
    };
    this.bus.addMessage(completeMessage, "system");
    setTimeout(() => {
      this.startDraftingSection(sectionIndex + 1);
    }, 3e3);
  }
  /**
   * Auto-complete a draft section when the assigned agent sends a message.
   * During drafting, any substantive message from an assigned agent counts as their draft.
   */
  autoCompleteDraftSection(agentId, message) {
    const sectionIndex = this.copySections.findIndex(
      (s) => s.assignedAgent === agentId && s.status === "in_progress"
    );
    if (sectionIndex !== -1 && message.content.length > 50) {
      this.copySections[sectionIndex].content = message.content;
      this.copySections[sectionIndex].status = "complete";
      const nextPending = this.copySections.findIndex((s) => s.status === "pending");
      if (nextPending !== -1) {
        setTimeout(() => this.startDraftingSection(nextPending), 2e3);
      }
      return;
    }
  }
  /**
   * Finalize drafting phase
   */
  async finalizeDrafting() {
    const brief = this.generatePhaseHandoffBrief(this.currentPhase);
    this.currentPhase = "finalization";
    this.session.currentPhase = "finalization";
    const draft = await this.getConsolidatedDraft();
    this.emit("phase_change", { phase: "finalization", brief, buildReady: true, draftMarkdown: draft });
    const finalMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `${brief}
---

\u{1F389} **DRAFTING COMPLETE!**

All sections written. Full copy:

${draft}

**What's next?**
- Type \`/build\` to generate 3 website variants from this copy
- Agents can provide final feedback
- Copy is ready for export`
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
  /**
   * Force an agent to speak (bypass normal floor request)
   */
  forceAgentToSpeak(agentId, reason) {
    const listener = this.agentListeners.get(agentId);
    if (!listener) {
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
    this.bus.emit("floor:request", request);
  }
  /**
   * Generate a structured brief summarizing what happened in the current phase
   * Used at phase transitions so agents don't lose context
   */
  generatePhaseHandoffBrief(fromPhase) {
    const parts = [];
    parts.push(`## Handoff from ${fromPhase.toUpperCase()} Phase
`);
    const summaries = this.bus.getSummariesSince(this.phaseStartMessageIndex);
    if (summaries.length > 0) {
      parts.push("### Key Discussion Points");
      for (const s of summaries.slice(-3)) {
        parts.push(`- ${s.content.slice(0, 200)}`);
      }
      parts.push("");
    }
    const decisions = this.bus.getDecisionsSince(this.phaseStartMessageIndex);
    if (decisions.length > 0) {
      parts.push("### Decisions Made");
      for (const d of decisions.slice(-5)) {
        parts.push(`- ${d.content}`);
      }
      parts.push("");
    }
    const activeProposals = this.bus.getActiveProposals();
    if (activeProposals.length > 0) {
      parts.push("### Active Proposals");
      for (const p4 of activeProposals.slice(-5)) {
        const reactions = p4.reactions || [];
        const supports = reactions.filter((r) => r.reaction === "support").length;
        const opposes = reactions.filter((r) => r.reaction === "oppose").length;
        const agentName = p4.agentId ? this.getAgentName(p4.agentId) : "Unknown";
        parts.push(`- [${agentName}] ${p4.content.slice(0, 150)} (${supports} support, ${opposes} oppose)`);
      }
      parts.push("");
    }
    const agentStates = this.bus.getAllAgentStates();
    if (agentStates.size > 0) {
      parts.push("### Agent Positions");
      for (const [agentId, state] of agentStates) {
        if (state.messageCount === 0) continue;
        const name = this.getAgentName(agentId);
        const lastPosition = state.positions.length > 0 ? state.positions[state.positions.length - 1] : null;
        const agreements = state.agreements.length;
        const disagreements = state.disagreements.length;
        let line = `- **${name}**: ${state.messageCount} msgs`;
        if (agreements > 0 || disagreements > 0) line += ` (${agreements} agreements, ${disagreements} disagreements)`;
        if (lastPosition) line += ` \u2014 last stance: "${lastPosition.slice(0, 80)}"`;
        parts.push(line);
      }
      parts.push("");
    }
    const status = this.getConsensusStatus();
    if (status.consensusPoints > 0 || status.conflictPoints > 0) {
      parts.push(`### Status: ${status.consensusPoints} consensus points, ${status.conflictPoints} open conflicts`);
      parts.push("");
    }
    if (parts.length <= 1) {
      parts.push("_No structured data captured yet from this phase._\n");
    }
    return parts.join("\n");
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
  getResonanceState() {
    return this.resonanceMonitor.toJSON();
  }
  getResonanceMonitor() {
    return this.resonanceMonitor;
  }
  /**
   * Get messages from the bus
   */
  getMessages() {
    return this.bus.getAllMessages();
  }
};

// cli/index.ts
init_personas();

// cli/commands/personas.ts
import { Command } from "commander";
import * as path4 from "path";
import * as os2 from "os";
import * as fs2 from "fs/promises";
import { query as claudeQuery2 } from "@anthropic-ai/claude-agent-sdk";
var CLAUDE_CODE_PATH2 = path4.join(os2.homedir(), ".local", "bin", "claude");
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
      const briefPath = path4.join(cwd, "briefs", `${options.brief}.md`);
      try {
        const briefContent = await fs2.readFile(briefPath, "utf-8");
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
    let text3 = "";
    try {
      const q = claudeQuery2({
        prompt: contextPrompt,
        options: {
          systemPrompt: PERSONA_GENERATION_PROMPT,
          model: "claude-sonnet-4-20250514",
          tools: [],
          permissionMode: "dontAsk",
          persistSession: false,
          maxTurns: 1,
          pathToClaudeCodeExecutable: CLAUDE_CODE_PATH2,
          stderr: (data) => process.stderr.write(`[persona-gen] ${data}`)
        }
      });
      for await (const message of q) {
        if (message.type === "assistant" && message.message?.content) {
          for (const block of message.message.content) {
            if (block.type === "text") {
              text3 += block.text;
            }
          }
        }
      }
    } catch (error) {
      if (!text3) {
        console.error("Error generating personas:", error.message);
        process.exit(1);
      }
    }
    try {
      const jsonMatch = text3.match(/\{[\s\S]*\}/) || text3.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.error("Failed to parse personas from response");
        console.log("Raw response:", text3);
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
      for (const p4 of personas2) {
        if (!p4.id || !p4.name || !p4.role) {
          console.error("Invalid persona structure:", p4);
          process.exit(1);
        }
      }
      const outputDir = path4.join(cwd, options.output);
      await fs2.mkdir(outputDir, { recursive: true });
      const personasFile = path4.join(outputDir, `${options.name}.json`);
      await fs2.writeFile(personasFile, JSON.stringify(personas2, null, 2));
      if (expertise) {
        const skillsFile = path4.join(outputDir, `${options.name}.skills.md`);
        await fs2.writeFile(skillsFile, expertise);
        console.log(`\u{1F4DA} Domain expertise saved to: ${skillsFile}`);
      }
      console.log(`\u2705 Generated ${personas2.length} personas:
`);
      for (const p4 of personas2) {
        console.log(`  \u2022 ${p4.name} (${p4.nameHe}) - ${p4.role}`);
        console.log(`    ${p4.background.slice(0, 80)}...`);
        if (p4.expertise) {
          console.log(`    Expertise: ${p4.expertise.slice(0, 3).join(", ")}`);
        }
        console.log("");
      }
      console.log(`\u{1F4C1} Personas saved to: ${personasFile}`);
      console.log(`
Use with: forge start --personas ${options.name}`);
    } catch (error) {
      console.error("Error processing personas:", error);
      process.exit(1);
    }
  });
  personas.command("list").description("List available persona sets").option("-d, --dir <dir>", "Personas directory", "personas").action(async (options) => {
    const cwd = process.cwd();
    const personasDir = path4.join(cwd, options.dir);
    try {
      const files = await fs2.readdir(personasDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));
      if (jsonFiles.length === 0) {
        console.log("No persona sets found.");
        console.log('Generate some with: forge personas generate --domain "your domain"');
        return;
      }
      console.log("Available persona sets:\n");
      for (const file of jsonFiles) {
        const name = path4.basename(file, ".json");
        const content = await fs2.readFile(path4.join(personasDir, file), "utf-8");
        const personas2 = JSON.parse(content);
        console.log(`  \u2022 ${name} (${personas2.length} personas)`);
        for (const p4 of personas2) {
          console.log(`    - ${p4.name}: ${p4.role}`);
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
    const filePath = path4.join(cwd, options.dir, `${name}.json`);
    try {
      const content = await fs2.readFile(filePath, "utf-8");
      const personas2 = JSON.parse(content);
      console.log(`
\u{1F4CB} Persona Set: ${name}
`);
      console.log("\u2500".repeat(60));
      for (const p4 of personas2) {
        console.log(`
### ${p4.name} (${p4.nameHe}) - ${p4.role}`);
        console.log(`Age: ${p4.age} | Color: ${p4.color}`);
        console.log(`
Background:
${p4.background}`);
        console.log(`
Personality:`);
        p4.personality.forEach((t) => console.log(`  \u2022 ${t}`));
        console.log(`
Biases:`);
        p4.biases.forEach((b) => console.log(`  \u2022 ${b}`));
        console.log(`
Strengths:`);
        p4.strengths.forEach((s) => console.log(`  \u2022 ${s}`));
        console.log(`
Weaknesses:`);
        p4.weaknesses.forEach((w) => console.log(`  \u2022 ${w}`));
        console.log(`
Speaking Style: ${p4.speakingStyle}`);
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
import * as path5 from "path";
import * as fs3 from "fs/promises";
function createExportCommand() {
  const exportCmd = new Command2("export").description("Export session data").option("-s, --session <dir>", "Session directory to export").option("-f, --format <fmt>", "Export format: md, json, html", "md").option("-t, --type <type>", "Export type: transcript, draft, summary, messages, all", "transcript").option("-o, --output <file>", "Output file path").option("-l, --latest", "Use the latest session", false).action(async (options) => {
    const cwd = process.cwd();
    let sessionDir = options.session;
    if (!sessionDir || options.latest) {
      const outputDir = path5.join(cwd, "output/sessions");
      try {
        const dirs = await fs3.readdir(outputDir, { withFileTypes: true });
        const sessionDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
        if (sessionDirs.length === 0) {
          console.error('No sessions found. Run "forge start" first.');
          process.exit(1);
        }
        sessionDir = path5.join(outputDir, sessionDirs[0]);
        console.log(`Using session: ${sessionDirs[0]}
`);
      } catch {
        console.error("No sessions directory found.");
        process.exit(1);
      }
    }
    const metadataPath = path5.join(sessionDir, "session.json");
    const messagesPath = path5.join(sessionDir, "messages.jsonl");
    let metadata = null;
    let messages = [];
    try {
      const metaContent = await fs3.readFile(metadataPath, "utf-8");
      metadata = JSON.parse(metaContent);
    } catch {
      console.warn("Warning: Could not load session metadata");
    }
    try {
      const msgContent = await fs3.readFile(messagesPath, "utf-8");
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
          const typeFile = options.output ? path5.join(path5.dirname(options.output), `${t}.${options.format}`) : path5.join(sessionDir, `export-${t}.${options.format}`);
          await fs3.writeFile(typeFile, typeOutput);
          console.log(`\u2705 Exported ${t} to ${typeFile}`);
        }
        return;
      default:
        console.error(`Unknown export type: ${options.type}`);
        process.exit(1);
    }
    const outputPath = options.output || path5.join(sessionDir, `export-${filename}`);
    await fs3.writeFile(outputPath, output);
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
    for (const p4 of summary.keyMoments.topProposals) {
      lines.push(`### From ${p4.from}`);
      lines.push(p4.preview + "...");
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
function escapeHtml(text3) {
  return text3.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;").replace(/\n/g, "<br>");
}

// cli/commands/batch.ts
import { Command as Command3 } from "commander";
import * as path6 from "path";
import * as fs4 from "fs/promises";
import { glob } from "glob";
import { v4 as uuid2 } from "uuid";
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
  const outputDir = path6.resolve(cwd, options.output || "output/batch");
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
    const dryRunResults = briefPaths.map((p4) => ({
      brief: path6.relative(cwd, p4),
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
  await fs4.mkdir(outputDir, { recursive: true });
  let toProcess = briefPaths;
  if (options.resume) {
    const processed = await getProcessedBriefs(outputDir);
    toProcess = briefPaths.filter((p4) => !processed.has(path6.basename(p4, ".md")));
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
  const briefName = path6.basename(briefPath, ".md");
  const startTime = Date.now();
  if (!opts.json) {
    console.log(`  \u{1F4C4} ${briefName}...`);
  }
  try {
    const fsAdapter = new FileSystemAdapter(opts.cwd);
    const agentRunner = new CLIAgentRunner();
    const briefContent = await fs4.readFile(briefPath, "utf-8");
    const titleMatch = briefContent.match(/^#\s+(.+)$/m);
    const projectName = titleMatch ? titleMatch[1] : briefName;
    const goal = `Create content for ${projectName}`;
    const config = {
      id: uuid2(),
      projectName,
      goal,
      enabledAgents: opts.enabledAgents,
      humanParticipation: false,
      // Batch mode = no human
      maxRounds: 5,
      // Shorter for batch
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path6.join(opts.cwd, "context"),
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
      outputDir: path6.join(opts.outputDir, briefName)
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
    const entries = await fs4.readdir(outputDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        try {
          await fs4.access(path6.join(outputDir, entry.name, "session.json"));
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
import * as path7 from "path";
import * as fs5 from "fs/promises";
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
  const sessionsDir = path7.resolve(cwd, options.output || "output/sessions");
  try {
    const entries = await fs5.readdir(sessionsDir, { withFileTypes: true });
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
      const meta = await loadSessionMeta(path7.join(sessionsDir, dir.name));
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
        const status = s.status === "completed" ? chalk.green("\u2713") : chalk.yellow("\u25CF");
        console.log(`${chalk.bold(String(i + 1))}. ${status} ${chalk.green(s.projectName)}`);
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
  const sessionsDir = path7.resolve(cwd, options.output || "output/sessions");
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
    const sessionPath = path7.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path7.join(sessionDir, "messages.jsonl");
      const content = await fs5.readFile(messagesPath, "utf-8");
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
  const sessionsDir = path7.resolve(cwd, options.output || "output/sessions");
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }
  if (!options.force) {
    const readline2 = await import("readline");
    const rl = readline2.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const confirmed = await new Promise((resolve4) => {
      rl.question(`Delete session "${path7.basename(sessionDir)}"? [y/N]: `, (answer) => {
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
    await fs5.rm(sessionDir, { recursive: true });
    console.log(chalk.green(`Deleted: ${path7.basename(sessionDir)}`));
  } catch (error) {
    console.error(`Error deleting session: ${error.message}`);
    process.exit(1);
  }
}
async function exportSession(name, options) {
  const cwd = process.cwd();
  const sessionsDir = path7.resolve(cwd, options.output || "output/sessions");
  const format = options.format || "md";
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }
  try {
    const sessionPath = path7.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path7.join(sessionDir, "messages.jsonl");
      const content2 = await fs5.readFile(messagesPath, "utf-8");
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
    const destPath = options.dest || path7.join(sessionDir, `export.${ext}`);
    await fs5.writeFile(destPath, content);
    console.log(chalk.green(`Exported to: ${destPath}`));
  } catch (error) {
    console.error(`Error exporting session: ${error.message}`);
    process.exit(1);
  }
}
async function cleanSessions(options) {
  const cwd = process.cwd();
  const sessionsDir = path7.resolve(cwd, options.output || "output/sessions");
  const days = parseInt(options.days || "30", 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1e3;
  try {
    const entries = await fs5.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const toDelete = [];
    for (const dir of sessionDirs) {
      const dirPath = path7.join(sessionsDir, dir.name);
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
      await fs5.rm(path7.join(sessionsDir, name), { recursive: true });
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
    const sessionPath = path7.join(sessionDir, "session.json");
    const data = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messageCount = 0;
    try {
      const messagesPath = path7.join(sessionDir, "messages.jsonl");
      const content = await fs5.readFile(messagesPath, "utf-8");
      messageCount = content.trim().split("\n").filter((l) => l).length;
    } catch {
    }
    return {
      id: data.id,
      projectName: data.projectName || data.config?.projectName || path7.basename(sessionDir),
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
    const entries = await fs5.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith(".")).map((e) => e.name);
    sessionDirs.sort().reverse();
    const index = parseInt(nameOrIndex, 10);
    if (!isNaN(index) && index >= 1 && index <= sessionDirs.length) {
      return path7.join(sessionsDir, sessionDirs[index - 1]);
    }
    const match = sessionDirs.find((d) => d.includes(nameOrIndex));
    if (match) {
      return path7.join(sessionsDir, match);
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
function escapeHtml2(text3) {
  return text3.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// cli/commands/watch.ts
import { Command as Command5 } from "commander";
import * as path8 from "path";
import * as fs6 from "fs/promises";
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
  const contextDir = path8.resolve(cwd, options.context || "context");
  const debounceMs = parseInt(options.debounce || "1000", 10);
  if (options.brief) {
    try {
      await fs6.access(options.brief);
    } catch {
      console.error(chalk2.red(`Brief file not found: ${options.brief}`));
      process.exit(1);
    }
  }
  try {
    await fs6.access(contextDir);
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
    const relativePath = path8.relative(cwd, filePath);
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
        handleChange(path8.join(dir, filename), eventType);
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
import * as path9 from "path";
import * as fs7 from "fs/promises";
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
  return path9.join(home, CONFIG_FILENAME);
}
function getLocalConfigPath() {
  return path9.join(process.cwd(), CONFIG_FILENAME);
}
async function loadConfig(configPath) {
  try {
    const content = await fs7.readFile(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
async function saveConfig(configPath, config) {
  await fs7.writeFile(configPath, JSON.stringify(config, null, 2) + "\n");
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
    await fs7.access(configPath);
  } catch {
    await saveConfig(configPath, {});
  }
  const editor = process.env.EDITOR || process.env.VISUAL || "vi";
  const { spawn: spawn2 } = await import("child_process");
  console.log(`Opening ${configPath} with ${editor}...`);
  const child = spawn2(editor, [configPath], {
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
    await fs7.access(configPath);
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

// cli/prompts/wizards.ts
init_personas();
import * as p from "@clack/prompts";
import * as path10 from "path";
import * as fs8 from "fs/promises";
import chalk7 from "chalk";

// cli/lib/menuBreadcrumbs.ts
import chalk5 from "chalk";
var MenuBreadcrumbs = class {
  stack = ["Main Menu"];
  push(segment) {
    this.stack.push(segment);
  }
  pop() {
    if (this.stack.length > 1) {
      this.stack.pop();
    }
  }
  reset() {
    this.stack = ["Main Menu"];
  }
  toString() {
    if (this.stack.length === 0) return "";
    const segments = this.stack.map((seg, i) => {
      if (i === this.stack.length - 1) {
        return chalk5.bold.cyan(seg);
      }
      return chalk5.dim(seg);
    });
    return segments.join(chalk5.dim(" > "));
  }
};
var menuBreadcrumbs = new MenuBreadcrumbs();

// cli/lib/multilineText.ts
import * as readline from "readline";
import chalk6 from "chalk";
var S_BAR = chalk6.gray("\u2502");
var S_STEP_SUBMIT = chalk6.green("\u25C7");
var S_STEP_CANCEL = chalk6.red("\u25A0");
var S_STEP_ACTIVE = chalk6.cyan("\u25C6");
async function multilineText(opts) {
  const { message, placeholder, defaultValue } = opts;
  process.stdout.write(`${S_STEP_ACTIVE}  ${message}
`);
  process.stdout.write(`${S_BAR}  ${chalk6.dim("Enter for new line, Ctrl+D to submit")}
`);
  if (placeholder) {
    process.stdout.write(`${S_BAR}  ${chalk6.dim(placeholder)}
`);
  }
  const lines = defaultValue ? defaultValue.split("\n") : [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${S_BAR}  `,
    terminal: true
  });
  return new Promise((resolve4) => {
    let cancelled = false;
    rl.prompt();
    rl.on("line", (line) => {
      lines.push(line);
      rl.prompt();
    });
    rl.on("close", () => {
      if (cancelled) return;
      const value = lines.join("\n").trim();
      if (opts.validate) {
        const error = opts.validate(value);
        if (error) {
          process.stdout.write(`${S_BAR}  ${chalk6.red(error)}
`);
          const rl2 = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: `${S_BAR}  `,
            terminal: true
          });
          lines.length = 0;
          rl2.prompt();
          rl2.on("line", (l) => {
            lines.push(l);
            rl2.prompt();
          });
          rl2.on("close", () => {
            const val2 = lines.join("\n").trim();
            process.stdout.write(`${S_STEP_SUBMIT}  ${message}
`);
            process.stdout.write(`${S_BAR}  ${chalk6.dim(val2.split("\n")[0])}${val2.includes("\n") ? chalk6.dim(` (+${val2.split("\n").length - 1} lines)`) : ""}
`);
            resolve4(val2);
          });
          rl2.on("SIGINT", () => {
            cancelled = true;
            rl2.close();
            resolve4(/* @__PURE__ */ Symbol.for("clack:cancel"));
          });
          return;
        }
      }
      const preview = value.split("\n")[0].slice(0, 60);
      const lineCount = value.split("\n").length;
      process.stdout.write(`${S_STEP_SUBMIT}  ${message}
`);
      process.stdout.write(`${S_BAR}  ${chalk6.dim(preview)}${lineCount > 1 ? chalk6.dim(` (+${lineCount - 1} more lines)`) : ""}
`);
      resolve4(value);
    });
    rl.on("SIGINT", () => {
      cancelled = true;
      rl.close();
      process.stdout.write(`${S_STEP_CANCEL}  ${chalk6.strikethrough(chalk6.dim(message))}
`);
      resolve4(/* @__PURE__ */ Symbol.for("clack:cancel"));
    });
  });
}

// cli/prompts/wizards.ts
async function generatePersonasForGoal(cwd, goal, projectName) {
  const s = p.spinner();
  s.start("Generating personas for your project...");
  try {
    const result = await generatePersonas(projectName, goal, 5);
    if (!result) {
      s.stop("Failed to generate personas");
      return null;
    }
    const { personas, expertise: skills } = result;
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const personasDir = path10.join(cwd, "personas");
    await fs8.mkdir(personasDir, { recursive: true });
    await fs8.writeFile(
      path10.join(personasDir, `${safeName}.json`),
      JSON.stringify(personas, null, 2)
    );
    if (skills) {
      await fs8.writeFile(
        path10.join(personasDir, `${safeName}.skills.md`),
        skills
      );
    }
    s.stop(`Generated ${personas.length} personas`);
    const summary = personas.map((pe) => `  ${chalk7.bold(pe.name)} - ${pe.role}`).join("\n");
    p.note(summary, "Generated Personas");
    p.log.info(`Saved to: personas/${safeName}.json`);
    return { name: safeName, personas, skills };
  } catch (error) {
    s.stop("Error generating personas");
    p.log.error(`${error}`);
    return null;
  }
}
async function selectPersonasFlow(cwd, goal, projectName) {
  const personasDir = path10.join(cwd, "personas");
  const savedSets = [];
  try {
    const allFiles = await fs8.readdir(personasDir);
    const jsonFiles = allFiles.filter((f) => f.endsWith(".json") && !f.includes(".skills"));
    for (const file of jsonFiles) {
      const name = path10.basename(file, ".json");
      try {
        const content = await fs8.readFile(path10.join(personasDir, file), "utf-8");
        const personas = JSON.parse(content);
        savedSets.push({ name, personas, description: personas.map((pe) => pe.name).join(", ") });
      } catch {
      }
    }
  } catch {
  }
  const options = [
    { value: "generate", label: "Generate new personas", hint: "AI-powered for this project" },
    { value: "defaults", label: "Default personas", hint: "built-in experts" }
  ];
  for (const set2 of savedSets) {
    options.push({ value: `saved:${set2.name}`, label: set2.name, hint: set2.description });
  }
  const choice = await p.select({
    message: "Which personas should debate?",
    options
  });
  if (p.isCancel(choice)) {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }
  if (choice === "generate") {
    const result = await generatePersonasForGoal(cwd, goal, projectName);
    if (result) {
      return { personas: result.personas, personaSetName: result.name, domainSkills: result.skills };
    }
    p.log.warn("Generation failed, falling back to defaults");
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }
  if (choice === "defaults") {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }
  const setName = choice.replace("saved:", "");
  const set = savedSets.find((s) => s.name === setName);
  if (!set) {
    return { personas: AGENT_PERSONAS, personaSetName: null };
  }
  let domainSkills;
  try {
    domainSkills = await fs8.readFile(path10.join(personasDir, `${setName}.skills.md`), "utf-8");
  } catch {
  }
  return { personas: set.personas, personaSetName: setName, domainSkills };
}
async function selectAgentsFlow(personas) {
  const options = personas.map((agent) => ({
    value: agent.id,
    label: `${agent.name} (${agent.nameHe})`,
    hint: agent.role
  }));
  const specialChoice = await p.select({
    message: "Agent selection",
    options: [
      { value: "pick", label: "Pick agents from list" },
      { value: "all", label: "Use all agents", hint: `${personas.length} agents` },
      { value: "generate", label: "Generate new personas", hint: "AI-powered" },
      { value: "defaults", label: "Switch to default personas" }
    ]
  });
  if (p.isCancel(specialChoice)) {
    return personas.map((a) => a.id);
  }
  if (specialChoice === "generate") return "generate";
  if (specialChoice === "defaults") return "defaults";
  if (specialChoice === "all") return personas.map((a) => a.id);
  const selected = await p.multiselect({
    message: "Select agents for the debate",
    options,
    initialValues: personas.map((a) => a.id),
    required: true
  });
  if (p.isCancel(selected)) {
    return personas.map((a) => a.id);
  }
  return selected;
}
async function runConfigWizard(cwd) {
  p.intro(chalk7.magenta.bold("NEW SESSION"));
  menuBreadcrumbs.push("Project Details");
  const projectNameResult = await p.text({
    message: "Project name",
    placeholder: "My Project",
    defaultValue: "Untitled Project"
  });
  if (p.isCancel(projectNameResult)) {
    p.cancel("Configuration cancelled");
    menuBreadcrumbs.pop();
    return null;
  }
  const projectName = projectNameResult;
  const goalResult = await multilineText({
    message: "Project goal & description",
    placeholder: "Describe your project goal in detail...",
    defaultValue: "Create effective content"
  });
  if (typeof goalResult === "symbol") {
    p.cancel("Configuration cancelled");
    menuBreadcrumbs.pop();
    return null;
  }
  const goal = goalResult;
  menuBreadcrumbs.pop();
  let personas = AGENT_PERSONAS;
  let personaSetName = null;
  let domainSkills;
  menuBreadcrumbs.push("Persona Selection");
  const personaResult = await selectPersonasFlow(cwd, goal, projectName);
  menuBreadcrumbs.pop();
  personas = personaResult.personas;
  personaSetName = personaResult.personaSetName;
  domainSkills = personaResult.domainSkills;
  if (personaSetName) {
    registerCustomPersonas(personas);
  } else {
    clearCustomPersonas();
  }
  menuBreadcrumbs.push("Agent Selection");
  let agents = [];
  let selecting = true;
  while (selecting) {
    const result = await selectAgentsFlow(personas);
    if (result === "generate") {
      const generated = await generatePersonasForGoal(cwd, goal, projectName);
      if (generated) {
        personas = generated.personas;
        domainSkills = generated.skills;
        personaSetName = generated.name;
        registerCustomPersonas(personas);
      }
    } else if (result === "defaults") {
      personas = AGENT_PERSONAS;
      domainSkills = void 0;
      personaSetName = null;
      clearCustomPersonas();
      p.log.info("Using built-in personas");
    } else {
      agents = result;
      selecting = false;
    }
  }
  menuBreadcrumbs.pop();
  menuBreadcrumbs.push("Language");
  const language = await p.select({
    message: "Debate language",
    options: [
      { value: "english", label: "English" },
      { value: "hebrew", label: "Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA)" },
      { value: "mixed", label: "Mixed" }
    ]
  });
  menuBreadcrumbs.pop();
  if (p.isCancel(language)) return null;
  menuBreadcrumbs.push("Tools");
  const tools = await p.multiselect({
    message: "Enable tools for this session?",
    options: [
      { value: "gemini-image", label: "Image Generation (Gemini)", hint: "agents can create images" },
      { value: "gemini-graph", label: "Graph Generation (Gemini)", hint: "agents can create charts" }
    ],
    required: false
  });
  menuBreadcrumbs.pop();
  const enabledTools = p.isCancel(tools) ? void 0 : tools;
  p.outro(chalk7.green("Configuration complete!"));
  return {
    projectName,
    goal,
    agents,
    language,
    personas,
    domainSkills,
    personaSetName,
    enabledTools
  };
}

// cli/prompts/idle.ts
import * as p2 from "@clack/prompts";
import * as path16 from "path";
import * as fs12 from "fs/promises";
import * as os5 from "os";
import chalk10 from "chalk";
import { v4 as uuid4 } from "uuid";
init_personas();

// cli/prompts/banner.ts
import chalk8 from "chalk";
var PAINTING_LINES = [
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
var gold = chalk8.hex("#D4A017");
var darkGold = chalk8.hex("#B8860B");
var amber = chalk8.hex("#FFBF00");
var warmWhite = chalk8.hex("#F5E6C8");
var brown = chalk8.hex("#8B4513");
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
    chalk8.dim('           "Where great minds converge, renaissance begins"')
  );
  console.log("");
  if (savedCount && savedCount > 0) {
    console.log(chalk8.dim(`              ${savedCount} saved session(s) available`));
    console.log("");
  }
}

// cli/preferences.ts
import * as fs9 from "fs/promises";
import * as path11 from "path";
import * as os3 from "os";
var PREFS_DIR = path11.join(os3.homedir(), ".forge");
var PREFS_FILE = path11.join(PREFS_DIR, "preferences.json");
async function loadPreferences() {
  try {
    const content = await fs9.readFile(PREFS_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}
async function savePreferences(partial) {
  const current = await loadPreferences();
  const merged = { ...current, ...partial };
  await fs9.mkdir(PREFS_DIR, { recursive: true });
  await fs9.writeFile(PREFS_FILE, JSON.stringify(merged, null, 2));
}

// cli/tools/ToolRunner.ts
import * as path13 from "path";

// cli/tools/GeminiTool.ts
import { GoogleGenAI } from "@google/genai";
import * as fs10 from "fs/promises";
import * as path12 from "path";
var GeminiTool = class {
  ai;
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
  }
  /**
   * Generate an image from a text prompt using Gemini's multimodal output
   */
  async generateImage(prompt, outputPath) {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseModalities: ["TEXT", "IMAGE"] }
    });
    let description = "";
    let imageSaved = false;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          description += part.text;
        }
        if (part.inlineData?.data && !imageSaved) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          await fs10.mkdir(path12.dirname(outputPath), { recursive: true });
          await fs10.writeFile(outputPath, buffer);
          imageSaved = true;
        }
      }
    }
    if (!imageSaved) {
      throw new Error("Gemini did not return an image");
    }
    return `Image saved to ${outputPath}${description ? `
${description}` : ""}`;
  }
  /**
   * Generate a chart/graph visualization from data using Gemini
   */
  async generateGraph(data, description, outputPath) {
    const prompt = `Create a clear, professional chart or graph visualization for the following data. ${description}

Data:
${data}`;
    const response = await this.ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseModalities: ["TEXT", "IMAGE"] }
    });
    let explanation = "";
    let imageSaved = false;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          explanation += part.text;
        }
        if (part.inlineData?.data && !imageSaved) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          await fs10.mkdir(path12.dirname(outputPath), { recursive: true });
          await fs10.writeFile(outputPath, buffer);
          imageSaved = true;
        }
      }
    }
    if (!imageSaved) {
      throw new Error("Gemini did not return a graph image");
    }
    return `Graph saved to ${outputPath}${explanation ? `
${explanation}` : ""}`;
  }
};

// cli/tools/ToolRunner.ts
var ToolRunner = class {
  tools = {};
  counter = 0;
  enableGemini(apiKey) {
    this.tools.gemini = new GeminiTool(apiKey);
  }
  getAvailableTools() {
    const available = [];
    if (this.tools.gemini) {
      available.push("image-generation", "graph-generation");
    }
    return available;
  }
  async runTool(name, args, outputDir) {
    this.counter++;
    const timestamp = Date.now();
    try {
      switch (name) {
        case "image-generation": {
          if (!this.tools.gemini) return { success: false, error: "Gemini not configured" };
          const outputPath = path13.join(outputDir, `image-${timestamp}-${this.counter}.png`);
          const description = await this.tools.gemini.generateImage(
            args.prompt || args.description || "Generate an image",
            outputPath
          );
          return { success: true, outputPath, description };
        }
        case "graph-generation": {
          if (!this.tools.gemini) return { success: false, error: "Gemini not configured" };
          const outputPath = path13.join(outputDir, `graph-${timestamp}-${this.counter}.png`);
          const description = await this.tools.gemini.generateGraph(
            args.data || "",
            args.description || "Generate a chart",
            outputPath
          );
          return { success: true, outputPath, description };
        }
        default:
          return { success: false, error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// cli/prompts/idle.ts
async function handleQuickStart(state) {
  menuBreadcrumbs.push("Goal");
  const goal = await multilineText({
    message: `${menuBreadcrumbs.toString()}
What should we debate?`,
    placeholder: "e.g. Design a new landing page for our product",
    validate: (val) => {
      if (!val || val.trim().length === 0) return "Please enter a goal";
    }
  });
  menuBreadcrumbs.pop();
  if (typeof goal === "symbol") return;
  const goalStr = goal.trim();
  const projectName = goalStr.slice(0, 40).replace(/[^a-zA-Z0-9\u0590-\u05FF\s-]/g, "").trim() || "Quick Session";
  const prefs = await loadPreferences();
  let language = prefs.language;
  if (!language) {
    menuBreadcrumbs.push("Language");
    const langChoice = await p2.select({
      message: `${menuBreadcrumbs.toString()}
Debate language`,
      options: [
        { value: "english", label: "English" },
        { value: "hebrew", label: "Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA)" },
        { value: "mixed", label: "Mixed" }
      ]
    });
    menuBreadcrumbs.pop();
    if (p2.isCancel(langChoice)) return;
    language = langChoice;
  }
  menuBreadcrumbs.push("Personas");
  const personaChoice = await p2.select({
    message: `${menuBreadcrumbs.toString()}
Which personas should debate?`,
    options: [
      { value: "generate", label: "Generate for this topic", hint: "AI-powered" },
      { value: "current", label: "Use current personas", hint: `${getActivePersonas().length} available` }
    ]
  });
  menuBreadcrumbs.pop();
  if (p2.isCancel(personaChoice)) return;
  let personas = getActivePersonas();
  let personaSetName = null;
  let domainSkills;
  if (personaChoice === "generate") {
    const result = await generatePersonasForGoal(state.cwd, goalStr, projectName);
    if (result) {
      personas = result.personas;
      personaSetName = result.name;
      domainSkills = result.skills;
      registerCustomPersonas(personas);
    } else {
      p2.log.warn("Generation failed, using current personas");
    }
  }
  menuBreadcrumbs.push("Tools");
  const tools = await p2.multiselect({
    message: `${menuBreadcrumbs.toString()}
Enable tools for this session?`,
    options: [
      { value: "gemini-image", label: "Image Generation (Gemini)", hint: "agents can create images" },
      { value: "gemini-graph", label: "Graph Generation (Gemini)", hint: "agents can create charts" }
    ],
    required: false
  });
  menuBreadcrumbs.pop();
  const enabledTools = p2.isCancel(tools) ? void 0 : tools;
  state.config = {
    projectName,
    goal: goalStr,
    agents: personas.map((a) => a.id),
    language,
    personas,
    domainSkills,
    personaSetName,
    enabledTools
  };
  await startSessionFromConfig(state);
}
async function runIdleMode() {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();
  const sessionsDir = path16.join(cwd, "output", "sessions");
  const initPrefs = await loadPreferences();
  let apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  let hasSetupToken = false;
  try {
    const credPath = path16.join(os5.homedir(), ".claude", "credentials.json");
    const credData = JSON.parse(await fs12.readFile(credPath, "utf-8"));
    const token = credData?.claudeAiOauth?.accessToken;
    if (token) {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = token;
      hasSetupToken = true;
    }
  } catch {
  }
  const state = {
    cwd,
    fsAdapter,
    agentRunner,
    sessionsDir,
    apiKey,
    geminiApiKey: initPrefs.geminiApiKey || process.env.GEMINI_API_KEY,
    config: null
  };
  let savedCount = 0;
  try {
    const dirs = await fs12.readdir(sessionsDir);
    savedCount = dirs.filter((d) => !d.startsWith(".")).length;
  } catch {
  }
  showBanner(savedCount);
  while (true) {
    const configLabel = state.config ? chalk10.dim(` (${state.config.projectName})`) : "";
    menuBreadcrumbs.reset();
    const action = await p2.select({
      message: `${menuBreadcrumbs.toString()}
What would you like to do?${configLabel}`,
      options: [
        { value: "quick", label: "Quick start", hint: "jump straight into a session" },
        { value: "new", label: "New session", hint: "configure project, personas, agents" },
        ...state.config ? [{ value: "start", label: "Start session", hint: state.config.projectName }] : [],
        { value: "sessions", label: "Saved sessions", hint: `${savedCount} available` },
        { value: "agents", label: "List agents" },
        { value: "test", label: "Test Claude connection" },
        { value: "setup-token", label: "Set setup token", hint: hasSetupToken ? "configured" : "not set" },
        { value: "gemini-key", label: "Set Gemini API key", hint: state.geminiApiKey ? "configured" : "not set" },
        { value: "prefs", label: "Preferences", hint: "set default language" },
        { value: "help", label: "Help" },
        { value: "exit", label: "Exit" }
      ]
    });
    if (p2.isCancel(action) || action === "exit") {
      p2.outro(chalk10.dim("Goodbye."));
      process.exit(0);
    }
    switch (action) {
      case "quick":
        menuBreadcrumbs.push("Quick Start");
        try {
          await handleQuickStart(state);
        } finally {
          menuBreadcrumbs.pop();
        }
        break;
      case "new":
        menuBreadcrumbs.push("New Session");
        try {
          state.config = await runConfigWizard(cwd);
        } finally {
          menuBreadcrumbs.pop();
        }
        break;
      case "start":
        if (state.config) {
          menuBreadcrumbs.push("Session");
          try {
            await startSessionFromConfig(state);
          } finally {
            menuBreadcrumbs.pop();
          }
        } else {
          p2.log.warn('No session configured. Choose "New session" first.');
        }
        break;
      case "sessions":
        menuBreadcrumbs.push("Saved Sessions");
        try {
          await handleSessionsMenu(state);
        } finally {
          menuBreadcrumbs.pop();
        }
        break;
      case "agents":
        showAgentsNote();
        break;
      case "test":
        await handleApiTest();
        break;
      case "setup-token":
        hasSetupToken = await handleSetupToken();
        break;
      case "gemini-key":
        menuBreadcrumbs.push("Gemini Key");
        try {
          await handleGeminiKeyFlow(state);
        } finally {
          menuBreadcrumbs.pop();
        }
        break;
      case "prefs":
        menuBreadcrumbs.push("Preferences");
        try {
          await handlePreferences();
        } finally {
          menuBreadcrumbs.pop();
        }
        break;
      case "help":
        showHelpNote();
        break;
    }
  }
}
async function handleSessionsMenu(state) {
  try {
    const dirs = await fs12.readdir(state.sessionsDir);
    const sessions = dirs.filter((d) => !d.startsWith(".")).sort().reverse();
    if (sessions.length === 0) {
      p2.log.info("No saved sessions found.");
      return;
    }
    const options = [];
    for (const sessionName of sessions) {
      const sessionDir = path16.join(state.sessionsDir, sessionName);
      let meta = null;
      try {
        meta = JSON.parse(await fs12.readFile(path16.join(sessionDir, "session.json"), "utf-8"));
      } catch {
        try {
          meta = JSON.parse(await fs12.readFile(path16.join(sessionDir, "metadata.json"), "utf-8"));
        } catch {
        }
      }
      if (meta) {
        const date = new Date(meta.startedAt).toLocaleDateString();
        options.push({
          value: sessionName,
          label: meta.projectName || sessionName,
          hint: `${date} - ${(meta.goal || "").slice(0, 40)}`
        });
      } else {
        options.push({ value: sessionName, label: sessionName });
      }
    }
    options.push({ value: "__delete", label: "Delete a session", hint: "remove saved sessions" });
    options.push({ value: "__back", label: "Back to menu" });
    const choice = await p2.select({
      message: "Select a session to load",
      options
    });
    if (p2.isCancel(choice) || choice === "__back") return;
    if (choice === "__delete") {
      await handleDeleteSession(state, sessions);
      return;
    }
    await loadSession(state, choice);
  } catch {
    p2.log.info("No sessions directory found.");
  }
}
async function handleDeleteSession(state, sessions) {
  const options = sessions.map((name) => ({ value: name, label: name }));
  options.push({ value: "__back", label: "Cancel" });
  const toDelete = await p2.select({
    message: "Which session do you want to delete?",
    options
  });
  if (p2.isCancel(toDelete) || toDelete === "__back") return;
  const confirm2 = await p2.confirm({
    message: `Delete session "${toDelete}"? This cannot be undone.`
  });
  if (p2.isCancel(confirm2) || !confirm2) {
    p2.log.info("Cancelled.");
    return;
  }
  const sessionDir = path16.join(state.sessionsDir, toDelete);
  await fs12.rm(sessionDir, { recursive: true, force: true });
  p2.log.success(`Deleted session: ${toDelete}`);
}
async function loadSession(state, sessionName) {
  const s = p2.spinner();
  s.start("Loading session...");
  try {
    const sessionDir = path16.join(state.sessionsDir, sessionName);
    let metadata = {};
    try {
      metadata = JSON.parse(await fs12.readFile(path16.join(sessionDir, "session.json"), "utf-8"));
    } catch {
      try {
        metadata = JSON.parse(await fs12.readFile(path16.join(sessionDir, "metadata.json"), "utf-8"));
      } catch {
      }
    }
    let messageCount = 0;
    try {
      const content = await fs12.readFile(path16.join(sessionDir, "messages.jsonl"), "utf-8");
      messageCount = content.trim().split("\n").filter((l) => l.trim()).length;
    } catch {
    }
    let hasMemory = false;
    try {
      const memoryState = JSON.parse(await fs12.readFile(path16.join(sessionDir, "memory.json"), "utf-8"));
      messageBus.restoreMemory(memoryState);
      hasMemory = true;
    } catch {
    }
    let personas = AGENT_PERSONAS;
    let domainSkills;
    let personaSetName = null;
    if (metadata.enabledAgents) {
      const defaultIds = AGENT_PERSONAS.map((a) => a.id);
      const isCustom = metadata.enabledAgents.some((id) => !defaultIds.includes(id));
      if (isCustom) {
        const projectSlug = (metadata.projectName || "").replace(/\s+/g, "-").toLowerCase();
        const candidatePaths = [
          path16.join(sessionDir, "personas.json"),
          path16.join(state.cwd, "personas", `${sessionName}.json`),
          path16.join(state.cwd, "personas", `${projectSlug}.json`),
          path16.join(state.cwd, "personas", `${metadata.projectName || ""}.json`)
        ];
        for (const candidatePath of candidatePaths) {
          try {
            const personasContent = await fs12.readFile(candidatePath, "utf-8");
            personas = JSON.parse(personasContent);
            personaSetName = sessionName;
            registerCustomPersonas(personas);
            const skillsPath = candidatePath.replace(/\.json$/, ".skills.md").replace("personas.skills.md", "skills.md");
            try {
              domainSkills = await fs12.readFile(skillsPath, "utf-8");
            } catch {
            }
            break;
          } catch {
          }
        }
        if (!personaSetName) {
          p2.log.warn("Custom personas not found for this session. Agents may not load correctly.");
        }
      }
    }
    s.stop("Session loaded");
    const info = [
      `Project: ${metadata.projectName || sessionName}`,
      `Goal: ${metadata.goal || ""}`,
      `Agents: ${(metadata.enabledAgents || []).join(", ")}`,
      `Messages: ${messageCount}`,
      ...hasMemory ? ["Memory: restored"] : []
    ].join("\n");
    p2.note(info, "Loaded Session");
    let resumeMessages = [];
    try {
      const content = await fs12.readFile(path16.join(sessionDir, "messages.jsonl"), "utf-8");
      resumeMessages = content.trim().split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
    } catch {
    }
    state.config = {
      projectName: metadata.projectName || sessionName,
      goal: metadata.goal || "",
      agents: metadata.enabledAgents || [],
      language: metadata.language || "english",
      personas,
      domainSkills,
      personaSetName,
      resumeSessionDir: sessionDir,
      resumeMessages,
      resumePhase: metadata.currentPhase
    };
    p2.log.success(`Loaded ${resumeMessages.length} messages. Type "Start session" to continue.`);
  } catch (error) {
    s.stop("Failed to load session");
    p2.log.error(`${error}`);
  }
}
async function handleSetupToken() {
  const credPath = path16.join(os5.homedir(), ".claude", "credentials.json");
  let current = null;
  try {
    const credData = JSON.parse(await fs12.readFile(credPath, "utf-8"));
    current = credData?.claudeAiOauth?.accessToken;
  } catch {
  }
  if (current) {
    p2.log.info(`Current token: ${current.slice(0, 20)}...`);
  }
  const token = await p2.text({
    message: "Paste your Claude setup token (from claude.ai/settings)",
    placeholder: "sk-ant-oat01-...",
    validate: (val) => {
      if (!val || !val.trim()) return "Token is required";
    }
  });
  if (p2.isCancel(token)) return !!current;
  const tokenStr = token.trim();
  try {
    const claudeDir = path16.join(os5.homedir(), ".claude");
    await fs12.mkdir(claudeDir, { recursive: true });
    let credData = {};
    try {
      credData = JSON.parse(await fs12.readFile(credPath, "utf-8"));
    } catch {
    }
    credData.claudeAiOauth = { accessToken: tokenStr };
    await fs12.writeFile(credPath, JSON.stringify(credData, null, 2));
    process.env.CLAUDE_CODE_OAUTH_TOKEN = tokenStr;
    p2.log.success("Setup token saved and activated.");
    return true;
  } catch (error) {
    p2.log.error(`Failed to save token: ${error.message}`);
    return !!current;
  }
}
async function handleApiTest() {
  const s = p2.spinner();
  s.start("Testing Claude connection...");
  let content = "";
  try {
    const { query: claudeQuery4 } = await import("@anthropic-ai/claude-agent-sdk");
    const CLAUDE_CODE_PATH4 = path16.join(os5.homedir(), ".local", "bin", "claude");
    const q = claudeQuery4({
      prompt: 'Say "OK"',
      options: {
        model: "claude-3-5-haiku-20241022",
        tools: [],
        permissionMode: "dontAsk",
        persistSession: false,
        maxTurns: 1,
        pathToClaudeCodeExecutable: CLAUDE_CODE_PATH4,
        stderr: () => {
        }
      }
    });
    for await (const message of q) {
      if (message.type === "assistant" && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === "text") {
            content += block.text;
          }
        }
      }
    }
    s.stop(chalk10.green(`Claude connection successful: ${content.trim()}`));
  } catch (error) {
    if (content) {
      s.stop(chalk10.green(`Claude connection successful: ${content.trim()}`));
    } else {
      s.stop(chalk10.red(`Claude connection failed: ${error.message}`));
      p2.log.info('Make sure Claude Code is set up: run "claude" and complete setup.');
    }
  }
}
async function handleGeminiKeyFlow(state) {
  if (state.geminiApiKey) {
    p2.log.info(`Current Gemini key: ${state.geminiApiKey.slice(0, 10)}...`);
  }
  const key = await p2.text({
    message: "Enter your Gemini API key",
    placeholder: "AIza...",
    validate: (val) => {
      if (!val) return "API key is required";
    }
  });
  if (p2.isCancel(key)) return;
  state.geminiApiKey = key;
  process.env.GEMINI_API_KEY = key;
  await savePreferences({ geminiApiKey: key });
  p2.log.success("Gemini API key set and saved.");
}
async function handlePreferences() {
  const prefs = await loadPreferences();
  const language = await p2.select({
    message: `Default language${prefs.language ? ` (current: ${prefs.language})` : ""}`,
    options: [
      { value: "english", label: "English" },
      { value: "hebrew", label: "Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA)" },
      { value: "mixed", label: "Mixed" }
    ]
  });
  if (p2.isCancel(language)) return;
  await savePreferences({ language });
  p2.log.success(`Default language set to: ${language}`);
}
function showHelpNote() {
  const help = [
    `${chalk10.green("New session")}     - Configure project, personas, agents`,
    `${chalk10.green("Start session")}   - Launch the configured debate`,
    `${chalk10.green("Saved sessions")}  - Browse and load previous sessions`,
    `${chalk10.green("List agents")}     - Show available agent personas`,
    `${chalk10.green("Test connection")}  - Verify Claude setup token works`,
    `${chalk10.green("Set setup token")} - Update your Claude setup token`,
    "",
    `${chalk10.yellow("During a session:")}`,
    `  Type messages to join the debate`,
    `  Use /help, /status, /pause, /resume, /synthesize, /draft`,
    `  Press Ctrl+C to end the session`
  ].join("\n");
  p2.note(help, "Forge Commands");
}
function showAgentsNote() {
  const personas = getActivePersonas();
  const lines = personas.map(
    (a) => `${chalk10.bold(a.name)} (${a.nameHe})
  ${chalk10.dim(a.role)}
  ${chalk10.dim(a.strengths.slice(0, 2).join(", "))}`
  ).join("\n\n");
  p2.note(lines, "Available Agents");
  p2.log.info('Generate custom personas with: forge personas generate --domain "your domain"');
}
async function startSessionFromConfig(state) {
  const cfg = state.config;
  if (!cfg.agents || cfg.agents.length === 0) {
    p2.log.warn('No agents selected. Run "New session" first.');
    return;
  }
  if (cfg.personaSetName) {
    registerCustomPersonas(cfg.personas);
  } else {
    clearCustomPersonas();
  }
  const geminiKey = state.geminiApiKey || process.env.GEMINI_API_KEY;
  const isResume = !!(cfg.resumeSessionDir && cfg.resumeMessages?.length);
  const config = {
    id: isResume ? path16.basename(cfg.resumeSessionDir) : uuid4(),
    projectName: cfg.projectName,
    goal: cfg.goal || "Reach consensus",
    enabledAgents: cfg.agents,
    humanParticipation: true,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path16.join(state.cwd, "context"),
    outputDir: path16.join(state.cwd, "output", "sessions"),
    language: cfg.language,
    apiKey: state.apiKey,
    enabledTools: cfg.enabledTools,
    geminiApiKey: geminiKey
  };
  const toolRunner = new ToolRunner();
  if (cfg.enabledTools?.some((t) => t.startsWith("gemini")) && geminiKey) {
    toolRunner.enableGemini(geminiKey);
  }
  const resumedMessages = isResume ? cfg.resumeMessages.map((m) => ({
    ...m,
    timestamp: new Date(m.timestamp)
  })) : [];
  const session = {
    id: config.id,
    config,
    messages: resumedMessages,
    currentPhase: isResume && cfg.resumePhase || "initialization",
    currentRound: 0,
    decisions: [],
    drafts: [],
    startedAt: isResume ? new Date(resumedMessages[0]?.timestamp || /* @__PURE__ */ new Date()) : /* @__PURE__ */ new Date(),
    status: "running"
  };
  const persistence = new SessionPersistence(state.fsAdapter, {
    outputDir: config.outputDir
  });
  if (isResume) {
    await persistence.resumeSession(session, cfg.resumeSessionDir);
    p2.log.info(chalk10.dim(`Resuming session with ${resumedMessages.length} messages`));
  } else {
    await persistence.initSession(session);
    if (cfg.personaSetName && cfg.personas) {
      const sessionDir = persistence.getSessionDir();
      if (sessionDir) {
        await state.fsAdapter.writeFile(
          path16.join(sessionDir, "personas.json"),
          JSON.stringify(cfg.personas, null, 2)
        );
        if (cfg.domainSkills) {
          await state.fsAdapter.writeFile(
            path16.join(sessionDir, "skills.md"),
            cfg.domainSkills
          );
        }
      }
    }
  }
  messageBus.setAgentRunner(state.agentRunner);
  const orchestrator = new EDAOrchestrator(
    session,
    void 0,
    cfg.domainSkills,
    {
      agentRunner: state.agentRunner,
      fileSystem: state.fsAdapter
    }
  );
  if (isResume && resumedMessages.length > 0) {
    const origStart = orchestrator.start.bind(orchestrator);
    orchestrator.start = async () => {
      await origStart();
      messageBus.preloadMessages(resumedMessages);
    };
  }
  orchestrator.on((event) => {
    if (event.type === "agent_message") {
      persistence.updateSession(orchestrator.getSession());
    }
  });
  p2.log.step(`Starting: ${chalk10.bold(cfg.projectName)}`);
  p2.log.info(chalk10.dim(`Goal: ${cfg.goal}`));
  p2.log.info(chalk10.dim(`Agents: ${cfg.agents.join(", ")}`));
  p2.log.info(chalk10.dim(`Output: ${persistence.getSessionDir()}`));
  const { createDashboard: createDashboard2 } = await Promise.resolve().then(() => (init_dashboard(), dashboard_exports));
  await createDashboard2({
    orchestrator,
    persistence,
    session,
    toolRunner,
    onExit: async () => {
      await persistence.saveFull();
      clearCustomPersonas();
    }
  });
  p2.log.success("Session ended. Returning to menu.");
}

// cli/index.ts
var program = new Command8();
program.name("forge").description("Multi-agent deliberation engine - reach consensus through structured debate").version("1.0.0");
program.command("start").description("Start a new debate session").option("-b, --brief <name>", "Brief name to load (from briefs/ directory)").option("-p, --project <name>", "Project name", "New Project").option("-g, --goal <goal>", "Project goal").option("-a, --agents <ids>", "Comma-separated agent IDs (from default or custom personas)").option("--personas <name>", "Use custom persona set (from personas/ directory)").option("-l, --language <lang>", "Language: english, hebrew, mixed").option("--human", "Enable human participation", true).option("--no-human", "Disable human participation").option("-o, --output <dir>", "Output directory for sessions", "output/sessions").action(async (options) => {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();
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
      p3.log.error(`Brief "${options.brief}" not found in briefs/ directory`);
      process.exit(1);
    }
  }
  if (!goal) {
    goal = `Debate and reach consensus on: ${projectName}`;
  }
  if (!options.language) {
    const prefs = await loadPreferences();
    if (prefs.language) {
      options.language = prefs.language;
    } else {
      const langChoice = await p3.select({
        message: "Debate language",
        options: [
          { value: "english", label: "English" },
          { value: "hebrew", label: "Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA)" },
          { value: "mixed", label: "Mixed" }
        ]
      });
      if (p3.isCancel(langChoice)) process.exit(0);
      options.language = langChoice;
    }
  }
  let availablePersonas = AGENT_PERSONAS;
  let domainSkills;
  let personaSetName = options.personas || null;
  if (!personaSetName && !options.agents) {
    const selection = await selectPersonasFlow(cwd, goal, projectName);
    availablePersonas = selection.personas;
    personaSetName = selection.personaSetName;
    domainSkills = selection.domainSkills;
    if (personaSetName) {
      p3.log.info(`Using persona set: ${personaSetName}`);
    } else {
      p3.log.info("Using built-in personas");
    }
  }
  if (personaSetName && availablePersonas === AGENT_PERSONAS) {
    const personasPath = path17.join(cwd, "personas", `${personaSetName}.json`);
    try {
      const content = await fs13.readFile(personasPath, "utf-8");
      availablePersonas = JSON.parse(content);
    } catch {
      p3.log.error(`Persona set "${personaSetName}" not found in personas/ directory`);
      process.exit(1);
    }
  }
  if (personaSetName && !domainSkills) {
    const skillsPath = path17.join(cwd, "personas", `${personaSetName}.skills.md`);
    try {
      domainSkills = await fs13.readFile(skillsPath, "utf-8");
      p3.log.info(`Loaded domain expertise: ${personaSetName}.skills.md`);
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
      p3.log.error("No valid agents specified. Available agents:");
      availablePersonas.forEach((a) => p3.log.info(`  - ${a.id}: ${a.name} (${a.role})`));
      process.exit(1);
    }
  } else {
    let selecting = true;
    while (selecting) {
      const result = await selectAgentsFlow(availablePersonas);
      if (result === "generate") {
        const selection = await selectPersonasFlow(cwd, goal, projectName);
        availablePersonas = selection.personas;
        domainSkills = selection.domainSkills;
        personaSetName = selection.personaSetName;
      } else if (result === "defaults") {
        availablePersonas = AGENT_PERSONAS;
        domainSkills = void 0;
        personaSetName = null;
        clearCustomPersonas();
        p3.log.info("Using built-in personas");
      } else {
        validAgents = result;
        selecting = false;
      }
    }
  }
  if (personaSetName) {
    registerCustomPersonas(availablePersonas);
  } else {
    clearCustomPersonas();
  }
  const config = {
    id: uuid5(),
    projectName,
    goal,
    enabledAgents: validAgents,
    humanParticipation: options.human,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path17.join(cwd, "context"),
    outputDir: options.output,
    language: options.language
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
    domainSkills,
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
  p3.log.step(`Starting Forge: ${chalk11.bold(projectName)}`);
  p3.log.info(chalk11.dim(`Goal: ${goal}`));
  p3.log.info(chalk11.dim(`Agents: ${validAgents.join(", ")}`));
  if (personaSetName) {
    p3.log.info(chalk11.dim(`Persona set: ${personaSetName}`));
  }
  p3.log.info(chalk11.dim(`Output: ${persistence.getSessionDir()}`));
  const { waitUntilExit } = render(
    React6.createElement(App, {
      orchestrator,
      persistence,
      session,
      onExit: async () => {
        await persistence.saveFull();
        clearCustomPersonas();
        console.log(`
Session saved to ${persistence.getSessionDir()}`);
      }
    })
  );
  await waitUntilExit();
});
program.command("briefs").description("List available briefs").action(async () => {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const briefs = await fsAdapter.listBriefs();
  if (briefs.length === 0) {
    p3.log.info("No briefs found in briefs/ directory");
    p3.log.info("Create a .md file in the briefs/ directory to get started.");
    return;
  }
  const lines = [];
  for (const brief of briefs) {
    const content = await fsAdapter.readBrief(brief);
    const firstLine = content?.split("\n")[0] || "";
    const title = firstLine.replace(/^#+\s*/, "");
    lines.push(`${chalk11.bold(brief)}: ${title}`);
  }
  p3.note(lines.join("\n"), "Available Briefs");
});
program.command("agents").description("List available agents (default personas)").action(() => {
  const personas = getActivePersonas();
  const lines = personas.map(
    (a) => `${chalk11.bold(a.id)}
  Name: ${a.name} (${a.nameHe})
  Role: ${a.role}
  Strengths: ${a.strengths.slice(0, 2).join(", ")}`
  ).join("\n\n");
  p3.note(lines, "Default Agents");
  p3.log.info('Generate custom personas with: forge personas generate --domain "your domain"');
});
program.addCommand(createPersonasCommand());
program.addCommand(createExportCommand());
program.addCommand(createBatchCommand());
program.addCommand(createSessionsCommand());
program.addCommand(createWatchCommand());
program.addCommand(createCompletionsCommand());
program.addCommand(createConfigCommand());
program.action(async () => {
  await runIdleMode();
});
program.parse();
