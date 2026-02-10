#!/usr/bin/env node

// cli/index.ts
import { Command as Command8 } from "commander";
import { render } from "ink";
import React4 from "react";
import { v4 as uuid2 } from "uuid";
import * as path9 from "path";
import * as fs8 from "fs/promises";
import * as readline from "readline";

// cli/app/App.tsx
import { useState as useState3, useEffect as useEffect2, useCallback } from "react";
import { Box as Box5, Text as Text5, useApp, useInput as useInput2 } from "ink";

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
import Spinner from "ink-spinner";
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
function AgentList({ agents, currentSpeaker }) {
  return /* @__PURE__ */ jsxs2(
    Box2,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "gray",
      paddingX: 1,
      width: 24,
      children: [
        /* @__PURE__ */ jsx2(Text2, { bold: true, underline: true, children: "Agents" }),
        /* @__PURE__ */ jsx2(Text2, { children: " " }),
        agents.map((agent) => {
          const isSpeaking = agent.id === currentSpeaker;
          const color = AGENT_COLORS[agent.id] || "white";
          const stateIcon = STATE_ICONS[agent.state] || "\u2022";
          return /* @__PURE__ */ jsxs2(Box2, { flexDirection: "row", children: [
            isSpeaking ? /* @__PURE__ */ jsx2(Text2, { color: "green", children: /* @__PURE__ */ jsx2(Spinner, { type: "dots" }) }) : /* @__PURE__ */ jsx2(Text2, { children: stateIcon }),
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
import { Box as Box3, Text as Text3 } from "ink";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
var AGENT_COLORS2 = {
  ronit: "magenta",
  avi: "blue",
  dana: "red",
  yossi: "green",
  michal: "yellow",
  system: "gray",
  human: "white"
};
var TYPE_BADGES = {
  argument: "[ARG]",
  question: "[Q]",
  proposal: "[PROP]",
  agreement: "[+1]",
  disagreement: "[-1]",
  synthesis: "[SYN]",
  system: "",
  human_input: "[YOU]",
  research_result: "[\u{1F50D}]"
};
function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function truncateContent(content, maxLines = 8) {
  const lines = content.split("\n");
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join("\n") + "\n...";
}
function MessageItem({ message }) {
  const color = AGENT_COLORS2[message.agentId] || "white";
  const badge = TYPE_BADGES[message.type] || "";
  const time = formatTime(message.timestamp);
  const content = truncateContent(message.content);
  if (message.agentId === "system") {
    return /* @__PURE__ */ jsx3(Box3, { flexDirection: "column", marginBottom: 1, children: /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: content }) });
  }
  return /* @__PURE__ */ jsxs3(Box3, { flexDirection: "column", marginBottom: 1, children: [
    /* @__PURE__ */ jsxs3(Box3, { children: [
      /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
        time,
        " "
      ] }),
      /* @__PURE__ */ jsx3(Text3, { color, bold: true, children: message.agentId }),
      badge && /* @__PURE__ */ jsxs3(Text3, { dimColor: true, children: [
        " ",
        badge
      ] })
    ] }),
    /* @__PURE__ */ jsx3(Box3, { marginLeft: 2, children: /* @__PURE__ */ jsx3(Text3, { wrap: "wrap", children: content }) })
  ] });
}
function ChatPane({ messages, maxHeight = 20 }) {
  const visibleMessages = messages.slice(-maxHeight);
  return /* @__PURE__ */ jsx3(
    Box3,
    {
      flexDirection: "column",
      borderStyle: "single",
      borderColor: "gray",
      paddingX: 1,
      flexGrow: 1,
      overflow: "hidden",
      children: visibleMessages.length === 0 ? /* @__PURE__ */ jsx3(Text3, { dimColor: true, children: "No messages yet..." }) : visibleMessages.map((msg) => /* @__PURE__ */ jsx3(MessageItem, { message: msg }, msg.id))
    }
  );
}

// cli/app/InputPane.tsx
import { useState as useState2 } from "react";
import { Box as Box4, Text as Text4, useInput } from "ink";
import TextInput from "ink-text-input";
import { jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
function InputPane({
  onSubmit,
  onCommand,
  placeholder = "Type a message or /command...",
  disabled = false
}) {
  const [value, setValue] = useState2("");
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
  return /* @__PURE__ */ jsxs4(
    Box4,
    {
      borderStyle: "single",
      borderColor: "cyan",
      paddingX: 1,
      children: [
        /* @__PURE__ */ jsx4(Text4, { color: "cyan", children: "> " }),
        disabled ? /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "Waiting for agents..." }) : /* @__PURE__ */ jsx4(
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
  return /* @__PURE__ */ jsxs4(Box4, { flexDirection: "column", paddingX: 1, children: [
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "Commands:" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /pause     - Pause debate" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /resume    - Resume debate" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /status    - Show status" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /synthesize - Move to synthesis" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /export    - Export transcript" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  /quit      - Save and exit" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  Ctrl+S     - Quick synthesize" }),
    /* @__PURE__ */ jsx4(Text4, { dimColor: true, children: "  Ctrl+E     - Quick export" })
  ] });
}

// src/agents/personas.ts
var AGENT_PERSONAS = [
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
var RESEARCHER_AGENTS = [
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
var customPersonas = null;
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
async function generatePersonas(projectName, goal, count = 5, apiKey) {
  try {
    const Anthropic4 = (await import("@anthropic-ai/sdk")).default;
    const client2 = new Anthropic4(apiKey ? { apiKey } : void 0);
    const prompt = `Generate debate personas for this project:

**Project:** ${projectName}
**Goal:** ${goal}

Create ${count} personas that would be valuable stakeholders in debating and making decisions for this project. Include diverse perspectives that will create productive tension.`;
    const response = await client2.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an expert at creating debate personas for multi-agent deliberation systems.

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
- color: One of: pink, green, purple, orange, blue, cyan, yellow, red`,
      messages: [{ role: "user", content: prompt }]
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[generatePersonas] Failed to parse response");
      return null;
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const personas = parsed.personas || parsed;
    const expertise = parsed.expertise;
    return { personas, expertise };
  } catch (error) {
    console.error("[generatePersonas] Error:", error.message);
    return null;
  }
}

// cli/app/App.tsx
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function App({ orchestrator, persistence, session, onExit }) {
  const { exit } = useApp();
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
  useEffect2(() => {
    const unsubscribe = orchestrator.on((event) => {
      switch (event.type) {
        case "phase_change":
          setPhase(event.data.phase);
          break;
        case "agent_message":
          setMessages(orchestrator.getMessages());
          const status = orchestrator.getConsensusStatus();
          setContributions(status.agentParticipation);
          setConsensusPoints(status.consensusPoints);
          setConflictPoints(status.conflictPoints);
          break;
        case "agent_typing":
          const typingData = event.data;
          if (typingData.typing) {
            setCurrentSpeaker(typingData.agentId);
          }
          break;
        case "floor_status":
          const floorData = event.data;
          setCurrentSpeaker(floorData.current);
          const floorStatus = orchestrator.getFloorStatus();
          setQueued(floorStatus.queued);
          break;
        case "synthesis":
          setStatusMessage("Synthesis complete");
          setTimeout(() => setStatusMessage(null), 3e3);
          break;
        case "error":
          setStatusMessage(`Error: ${event.data.message}`);
          break;
      }
      setAgentStates(new Map(orchestrator.getAgentStates()));
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
        const status = orchestrator.getConsensusStatus();
        setStatusMessage(status.recommendation);
        break;
      case "synthesize":
        const force = args.includes("force");
        const result = await orchestrator.transitionToSynthesis(force);
        setStatusMessage(result.message);
        break;
      case "export":
        await persistence.saveFull();
        const dir = persistence.getSessionDir();
        setStatusMessage(`Exported to ${dir}`);
        break;
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
    setTimeout(() => setStatusMessage(null), 5e3);
  }, [orchestrator, persistence, onExit, exit, showHelp]);
  useInput2((input, key) => {
    if (key.ctrl && input === "c") {
      handleCommand("quit", []);
    }
    if (input === "?") {
      setShowHelp(!showHelp);
    }
  });
  return /* @__PURE__ */ jsxs5(Box5, { flexDirection: "column", height: "100%", children: [
    /* @__PURE__ */ jsx5(Box5, { paddingX: 1, marginBottom: 1, children: /* @__PURE__ */ jsxs5(Text5, { bold: true, color: "cyan", children: [
      "\u{1F525} Forge: ",
      session.config.projectName
    ] }) }),
    /* @__PURE__ */ jsx5(
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
    /* @__PURE__ */ jsxs5(Box5, { flexDirection: "row", flexGrow: 1, children: [
      /* @__PURE__ */ jsx5(ChatPane, { messages }),
      /* @__PURE__ */ jsx5(AgentList, { agents, currentSpeaker })
    ] }),
    statusMessage && /* @__PURE__ */ jsx5(Box5, { paddingX: 1, children: /* @__PURE__ */ jsx5(Text5, { color: "yellow", children: statusMessage }) }),
    showHelp && /* @__PURE__ */ jsx5(CommandHelp, {}),
    /* @__PURE__ */ jsx5(
      InputPane,
      {
        onSubmit: handleSubmit,
        onCommand: handleCommand,
        placeholder: "Type message or /help for commands..."
      }
    ),
    /* @__PURE__ */ jsx5(Box5, { paddingX: 1, children: /* @__PURE__ */ jsx5(Text5, { dimColor: true, children: "Press ? for help | Ctrl+C to quit" }) })
  ] });
}

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
        model: "claude-3-5-haiku-20241022",
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

// cli/adapters/FileSystemAdapter.ts
import * as fs from "fs/promises";
import * as path from "path";
import { glob as globLib } from "glob";
var FileSystemAdapter = class {
  cwd;
  constructor(cwd) {
    this.cwd = cwd || process.cwd();
  }
  async readDir(dirPath) {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      return entries.map((entry) => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        path: path.join(fullPath, entry.name)
      }));
    } catch {
      return [];
    }
  }
  async readFile(filePath) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      return await fs.readFile(fullPath, "utf-8");
    } catch {
      return null;
    }
  }
  async writeFile(filePath, content) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await this.ensureDir(path.dirname(fullPath));
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
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
  async loadContext(contextDir) {
    const fullPath = path.isAbsolute(contextDir) ? contextDir : path.join(this.cwd, contextDir);
    const result = {
      brand: null,
      audience: null,
      research: [],
      examples: [],
      competitors: []
    };
    const brandPath = path.join(fullPath, "brand.md");
    result.brand = await this.readFile(brandPath);
    const audiencePath = path.join(fullPath, "audience.md");
    result.audience = await this.readFile(audiencePath);
    const researchFiles = await this.glob("research/*.md", { cwd: fullPath });
    for (const file of researchFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.research.push({ file: path.basename(file), content });
      }
    }
    const exampleFiles = await this.glob("examples/*.md", { cwd: fullPath });
    for (const file of exampleFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.examples.push({ file: path.basename(file), content });
      }
    }
    const competitorFiles = await this.glob("competitors/*.md", { cwd: fullPath });
    for (const file of competitorFiles) {
      const content = await this.readFile(file);
      if (content) {
        result.competitors.push({ file: path.basename(file), content });
      }
    }
    return result;
  }
  async readBrief(briefName) {
    const withExt = briefName.endsWith(".md") ? briefName : `${briefName}.md`;
    const briefPath = path.join(this.cwd, "briefs", withExt);
    return this.readFile(briefPath);
  }
  async listBriefs() {
    const briefsDir = path.join(this.cwd, "briefs");
    const files = await this.glob("*.md", { cwd: briefsDir });
    return files.map((f) => path.basename(f, ".md"));
  }
  async ensureDir(dirPath) {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
  }
  async appendFile(filePath, content) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.cwd, filePath);
      await this.ensureDir(path.dirname(fullPath));
      await fs.appendFile(fullPath, content, "utf-8");
      return true;
    } catch {
      return false;
    }
  }
  async listDir(dirPath) {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.cwd, dirPath);
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
import * as path2 from "path";
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
  constructor(fs9, config = {}) {
    this.fs = fs9;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  /**
   * Initialize session directory for a new session
   */
  async initSession(session) {
    this.session = session;
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const sessionName = `${session.config.projectName.replace(/\s+/g, "-")}-${timestamp}`;
    this.sessionDir = path2.join(this.config.outputDir, sessionName);
    await this.fs.ensureDir(this.sessionDir);
    const metadata = {
      id: session.id,
      projectName: session.config.projectName,
      goal: session.config.goal,
      enabledAgents: session.config.enabledAgents,
      startedAt: session.startedAt.toISOString()
    };
    await this.fs.writeFile(
      path2.join(this.sessionDir, "session.json"),
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
    const jsonlPath = path2.join(this.sessionDir, "messages.jsonl");
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
      path2.join(this.sessionDir, "session.json"),
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
      path2.join(this.sessionDir, "transcript.md"),
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
      path2.join(this.sessionDir, "draft.md"),
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
      return `**${agent.name}** (${agent.nameHe})`;
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
      path2.join(this.sessionDir, "session.json"),
      JSON.stringify(metadata, null, 2)
    );
    if (sessionWithMemory.memoryState) {
      await this.fs.writeFile(
        path2.join(this.sessionDir, "memory.json"),
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
  updateProposalStatus(proposalId, status) {
    const proposal = this.proposals.find((p) => p.id === proposalId);
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
    console.log(`[MessageBus] ${event}`, payload);
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
    this.memory.processMessage(message, this.messageHistory).catch((err) => {
      console.error("[MessageBus] Memory processing error:", err);
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
        console.log(`[AgentListener:${this.id}] Paused (research/halt)`);
      }, this.id)
    );
    this.unsubscribers.push(
      this.bus.subscribe("session:resume", () => {
        console.log(`[AgentListener:${this.id}] Resumed`);
        if (this.messagesSinceSpoke > 0 && this.state === "listening") {
          this.pendingEvaluation = setTimeout(() => {
            this.evaluateAndReact();
          }, this.config.evaluationDebounce + Math.random() * 500);
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

// src/lib/claude.ts
import Anthropic2 from "@anthropic-ai/sdk";

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

// src/lib/eda/EDAOrchestrator.ts
var COPY_SECTIONS = [
  { id: "hero", name: "Hero Section", nameHe: "\u05DB\u05D5\u05EA\u05E8\u05EA \u05E8\u05D0\u05E9\u05D9\u05EA" },
  { id: "problem", name: "Problem Statement", nameHe: "\u05D1\u05E2\u05D9\u05D4" },
  { id: "solution", name: "Solution/Benefits", nameHe: "\u05E4\u05EA\u05E8\u05D5\u05DF \u05D5\u05D9\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA" },
  { id: "social-proof", name: "Social Proof", nameHe: "\u05D4\u05D5\u05DB\u05D7\u05D4 \u05D7\u05D1\u05E8\u05EA\u05D9\u05EA" },
  { id: "cta", name: "Call to Action", nameHe: "\u05E7\u05E8\u05D9\u05D0\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4" }
];
var EDAOrchestrator = class {
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
      let briefContent = "";
      try {
        const brief = await this.readBrief("taru");
        if (brief) {
          briefContent = `

**\u{1F4CB} Project Brief:**
${brief.slice(0, 1500)}...`;
        }
      } catch {
      }
      const promptMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `\u{1F4E2} **DISCUSSION STARTS NOW**

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
          evaluationDebounce: 800 + Math.random() * 400
          // Stagger evaluations
        },
        this.agentRunner
        // Pass injected runner
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
      console.log(`[EDAOrchestrator] Mode intervention: ${intervention.type} (${intervention.priority})`);
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
      content: `\u{1F50D} **\u05D4\u05D3\u05D9\u05D5\u05DF \u05E0\u05E2\u05E6\u05E8 \u05DC\u05E6\u05D5\u05E8\u05DA \u05DE\u05D7\u05E7\u05E8**

**\u05D7\u05D5\u05E7\u05E8:** ${researcher.name}
**\u05D1\u05E7\u05E9\u05D4:** "${query}"
**\u05DE\u05D1\u05E7\u05E9:** ${this.getAgentName(requestedBy)}

\u23F3 \u05DE\u05D7\u05E4\u05E9 \u05DE\u05D9\u05D3\u05E2... \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05DE\u05DE\u05EA\u05D9\u05E0\u05D9\u05DD.`
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
        content: `\u2705 **\u05DE\u05D7\u05E7\u05E8 \u05D4\u05D5\u05E9\u05DC\u05DD - \u05D4\u05D3\u05D9\u05D5\u05DF \u05DE\u05DE\u05E9\u05D9\u05DA**

\u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D9\u05DB\u05D5\u05DC\u05D9\u05DD \u05DB\u05E2\u05EA \u05DC\u05D4\u05EA\u05D9\u05D9\u05D7\u05E1 \u05DC\u05DE\u05DE\u05E6\u05D0\u05D9\u05DD.`
      };
      this.bus.addMessage(resumeMessage, "system");
    } catch (error) {
      console.error("[EDAOrchestrator] Research error:", error);
      const errorMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `\u274C **\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05E7\u05E8:** ${error}

\u05D4\u05D3\u05D9\u05D5\u05DF \u05DE\u05DE\u05E9\u05D9\u05DA \u05DC\u05DC\u05D0 \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05D4\u05DE\u05D7\u05E7\u05E8.`
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
    const status = this.getConsensusStatus();
    if (!status.allAgentsSpoke) {
      return {
        success: false,
        message: `\u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05DB\u05DC \u05D4\u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05D3\u05D9\u05D1\u05E8\u05D5. \u05D4\u05DE\u05EA\u05DF \u05DC\u05EA\u05D2\u05D5\u05D1\u05D5\u05EA \u05DE: ${this.session.config.enabledAgents.filter((id) => !status.agentParticipation.has(id)).join(", ")}`
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
    const status = this.getConsensusStatus();
    if (!status.ready && !force) {
      const warningMessage = {
        id: crypto.randomUUID(),
        timestamp: /* @__PURE__ */ new Date(),
        agentId: "system",
        type: "system",
        content: `\u26A0\uFE0F **\u05D0\u05D6\u05D4\u05E8\u05D4: \u05D4\u05D3\u05D9\u05D5\u05DF \u05E2\u05D3\u05D9\u05D9\u05DF \u05DC\u05D0 \u05D1\u05E9\u05DC \u05DC\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4**

${status.recommendation}

**\u05E1\u05D8\u05D8\u05D5\u05E1 \u05E0\u05D5\u05DB\u05D7\u05D9:**
- \u05E1\u05D5\u05DB\u05E0\u05D9\u05DD \u05E9\u05D3\u05D9\u05D1\u05E8\u05D5: ${status.agentParticipation.size}/${this.session.config.enabledAgents.length}
- \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4: ${status.consensusPoints}
- \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05E4\u05EA\u05D5\u05D7\u05D5\u05EA: ${status.conflictPoints}

\u05DB\u05D3\u05D9 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05D1\u05DB\u05DC \u05D6\u05D0\u05EA, \u05D4\u05E7\u05DC\u05D3 \`synthesize force\``
      };
      this.bus.addMessage(warningMessage, "system");
      return { success: false, message: status.recommendation };
    }
    this.currentPhase = "synthesis";
    this.emit("phase_change", { phase: "synthesis" });
    const participationList = Array.from(status.agentParticipation.entries()).map(([id, count]) => `  - ${this.getAgentName(id)}: ${count} \u05EA\u05D2\u05D5\u05D1\u05D5\u05EA`).join("\n");
    const transitionMessage = {
      id: crypto.randomUUID(),
      timestamp: /* @__PURE__ */ new Date(),
      agentId: "system",
      type: "system",
      content: `\u{1F4CA} **PHASE: SYNTHESIS**

\u05D4\u05D3\u05D9\u05D5\u05DF \u05E2\u05D5\u05D1\u05E8 \u05DC\u05E9\u05DC\u05D1 \u05D4\u05E1\u05D9\u05E0\u05EA\u05D6\u05D4.

**\u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05D3\u05D9\u05D5\u05DF:**
- \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05D4\u05E1\u05DB\u05DE\u05D4: ${status.consensusPoints}
- \u05DE\u05D7\u05DC\u05D5\u05E7\u05D5\u05EA \u05E9\u05E0\u05D5\u05EA\u05E8\u05D5: ${status.conflictPoints}

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
    this.copySections = COPY_SECTIONS.map((section, index) => ({
      ...section,
      status: "pending",
      assignedAgent: this.assignAgentToSection(index)
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
    return agent ? `${agent.name} (${agent.nameHe})` : agentId;
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
  /**
   * Force an agent to speak (bypass normal floor request)
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

// cli/commands/personas.ts
import { Command } from "commander";
import * as path3 from "path";
import * as fs2 from "fs/promises";
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
      const briefPath = path3.join(cwd, "briefs", `${options.brief}.md`);
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
      const outputDir = path3.join(cwd, options.output);
      await fs2.mkdir(outputDir, { recursive: true });
      const personasFile = path3.join(outputDir, `${options.name}.json`);
      await fs2.writeFile(personasFile, JSON.stringify(personas2, null, 2));
      if (expertise) {
        const skillsFile = path3.join(outputDir, `${options.name}.skills.md`);
        await fs2.writeFile(skillsFile, expertise);
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
    const personasDir = path3.join(cwd, options.dir);
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
        const name = path3.basename(file, ".json");
        const content = await fs2.readFile(path3.join(personasDir, file), "utf-8");
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
    const filePath = path3.join(cwd, options.dir, `${name}.json`);
    try {
      const content = await fs2.readFile(filePath, "utf-8");
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
import { Command as Command2 } from "commander";
import * as path4 from "path";
import * as fs3 from "fs/promises";
function createExportCommand() {
  const exportCmd = new Command2("export").description("Export session data").option("-s, --session <dir>", "Session directory to export").option("-f, --format <fmt>", "Export format: md, json, html", "md").option("-t, --type <type>", "Export type: transcript, draft, summary, messages, all", "transcript").option("-o, --output <file>", "Output file path").option("-l, --latest", "Use the latest session", false).action(async (options) => {
    const cwd = process.cwd();
    let sessionDir = options.session;
    if (!sessionDir || options.latest) {
      const outputDir = path4.join(cwd, "output/sessions");
      try {
        const dirs = await fs3.readdir(outputDir, { withFileTypes: true });
        const sessionDirs = dirs.filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse();
        if (sessionDirs.length === 0) {
          console.error('No sessions found. Run "forge start" first.');
          process.exit(1);
        }
        sessionDir = path4.join(outputDir, sessionDirs[0]);
        console.log(`Using session: ${sessionDirs[0]}
`);
      } catch {
        console.error("No sessions directory found.");
        process.exit(1);
      }
    }
    const metadataPath = path4.join(sessionDir, "session.json");
    const messagesPath = path4.join(sessionDir, "messages.jsonl");
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
          const typeFile = options.output ? path4.join(path4.dirname(options.output), `${t}.${options.format}`) : path4.join(sessionDir, `export-${t}.${options.format}`);
          await fs3.writeFile(typeFile, typeOutput);
          console.log(`\u2705 Exported ${t} to ${typeFile}`);
        }
        return;
      default:
        console.error(`Unknown export type: ${options.type}`);
        process.exit(1);
    }
    const outputPath = options.output || path4.join(sessionDir, `export-${filename}`);
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
import * as path5 from "path";
import * as fs4 from "fs/promises";
import { glob } from "glob";
import { v4 as uuid } from "uuid";
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
  const outputDir = path5.resolve(cwd, options.output || "output/batch");
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
      brief: path5.relative(cwd, p),
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
    toProcess = briefPaths.filter((p) => !processed.has(path5.basename(p, ".md")));
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
  const briefName = path5.basename(briefPath, ".md");
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
      contextDir: path5.join(opts.cwd, "context"),
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
      outputDir: path5.join(opts.outputDir, briefName)
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
          await fs4.access(path5.join(outputDir, entry.name, "session.json"));
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
import * as path6 from "path";
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
  const sessionsDir = path6.resolve(cwd, options.output || "output/sessions");
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
      const meta = await loadSessionMeta(path6.join(sessionsDir, dir.name));
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
  const sessionsDir = path6.resolve(cwd, options.output || "output/sessions");
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
    const sessionPath = path6.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path6.join(sessionDir, "messages.jsonl");
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
  const sessionsDir = path6.resolve(cwd, options.output || "output/sessions");
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
      rl.question(`Delete session "${path6.basename(sessionDir)}"? [y/N]: `, (answer) => {
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
    console.log(chalk.green(`Deleted: ${path6.basename(sessionDir)}`));
  } catch (error) {
    console.error(`Error deleting session: ${error.message}`);
    process.exit(1);
  }
}
async function exportSession(name, options) {
  const cwd = process.cwd();
  const sessionsDir = path6.resolve(cwd, options.output || "output/sessions");
  const format = options.format || "md";
  const sessionDir = await findSession(sessionsDir, name);
  if (!sessionDir) {
    console.error(`Session not found: ${name}`);
    process.exit(1);
  }
  try {
    const sessionPath = path6.join(sessionDir, "session.json");
    const sessionData = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messages = [];
    try {
      const messagesPath = path6.join(sessionDir, "messages.jsonl");
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
    const destPath = options.dest || path6.join(sessionDir, `export.${ext}`);
    await fs5.writeFile(destPath, content);
    console.log(chalk.green(`Exported to: ${destPath}`));
  } catch (error) {
    console.error(`Error exporting session: ${error.message}`);
    process.exit(1);
  }
}
async function cleanSessions(options) {
  const cwd = process.cwd();
  const sessionsDir = path6.resolve(cwd, options.output || "output/sessions");
  const days = parseInt(options.days || "30", 10);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1e3;
  try {
    const entries = await fs5.readdir(sessionsDir, { withFileTypes: true });
    const sessionDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith("."));
    const toDelete = [];
    for (const dir of sessionDirs) {
      const dirPath = path6.join(sessionsDir, dir.name);
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
      await fs5.rm(path6.join(sessionsDir, name), { recursive: true });
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
    const sessionPath = path6.join(sessionDir, "session.json");
    const data = JSON.parse(await fs5.readFile(sessionPath, "utf-8"));
    let messageCount = 0;
    try {
      const messagesPath = path6.join(sessionDir, "messages.jsonl");
      const content = await fs5.readFile(messagesPath, "utf-8");
      messageCount = content.trim().split("\n").filter((l) => l).length;
    } catch {
    }
    return {
      id: data.id,
      projectName: data.projectName || data.config?.projectName || path6.basename(sessionDir),
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
      return path6.join(sessionsDir, sessionDirs[index - 1]);
    }
    const match = sessionDirs.find((d) => d.includes(nameOrIndex));
    if (match) {
      return path6.join(sessionsDir, match);
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
import * as path7 from "path";
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
  const contextDir = path7.resolve(cwd, options.context || "context");
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
    const relativePath = path7.relative(cwd, filePath);
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
        handleChange(path7.join(dir, filename), eventType);
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
import * as path8 from "path";
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
  return path8.join(home, CONFIG_FILENAME);
}
function getLocalConfigPath() {
  return path8.join(process.cwd(), CONFIG_FILENAME);
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

// cli/index.ts
var RESET = "\x1B[0m";
var BOLD = "\x1B[1m";
var DIM = "\x1B[2m";
var GREEN = "\x1B[32m";
var YELLOW = "\x1B[33m";
var CYAN = "\x1B[36m";
var RED = "\x1B[31m";
var MAGENTA = "\x1B[35m";
var program = new Command8();
async function generatePersonasForGoal(cwd, goal, projectName) {
  console.log("\n\u{1F525} Generating personas for your project...\n");
  try {
    const result = await generatePersonas(projectName, goal, 5);
    if (!result) {
      console.error("Failed to generate personas");
      return null;
    }
    const { personas, expertise: skills } = result;
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const personasDir = path9.join(cwd, "personas");
    await fs8.mkdir(personasDir, { recursive: true });
    await fs8.writeFile(
      path9.join(personasDir, `${safeName}.json`),
      JSON.stringify(personas, null, 2)
    );
    if (skills) {
      await fs8.writeFile(
        path9.join(personasDir, `${safeName}.skills.md`),
        skills
      );
    }
    console.log(`\u2705 Generated ${personas.length} personas:
`);
    for (const p of personas) {
      console.log(`  \u2022 ${p.name} - ${p.role}`);
    }
    console.log(`
\u{1F4C1} Saved to: personas/${safeName}.json`);
    return { name: safeName, personas, skills };
  } catch (error) {
    console.error("Error generating personas:", error);
    return null;
  }
}
async function selectAgentsInteractively(personas) {
  const selectedIds = new Set(personas.map((p) => p.id));
  const showMenu = () => {
    console.log("\n\u{1F4CB} Select agents (toggle with number):\n");
    console.log("  \x1B[33m[g]\x1B[0m \u{1F525} Generate new personas");
    console.log("  \x1B[33m[d]\x1B[0m Use default personas");
    console.log("");
    personas.forEach((agent, index) => {
      const isSelected = selectedIds.has(agent.id);
      const checkbox = isSelected ? "\x1B[32m[\u2713]\x1B[0m" : "\x1B[2m[ ]\x1B[0m";
      const name = isSelected ? `\x1B[1m${agent.name}\x1B[0m` : `\x1B[2m${agent.name}\x1B[0m`;
      console.log(`  ${checkbox} ${index + 1}. ${name} (${agent.nameHe}) - ${agent.role}`);
    });
    console.log("");
    console.log(`\x1B[2mSelected: ${selectedIds.size}/${personas.length} agents\x1B[0m`);
    console.log('\x1B[2mType number to toggle, "g" generate, "d" defaults, "a" all, "n" none\x1B[0m');
    console.log('\x1B[2mType "done" when ready to continue\x1B[0m\n');
  };
  return new Promise((resolve4) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const prompt = () => {
      showMenu();
      rl.question("> ", (answer) => {
        const input = answer.trim().toLowerCase();
        if (input === "") {
          prompt();
          return;
        }
        if (input === "done" || input === "ok" || input === "y" || input === "yes") {
          rl.close();
          if (selectedIds.size === 0) {
            console.log("\x1B[33mNo agents selected, using all.\x1B[0m");
            resolve4(personas.map((p) => p.id));
          } else {
            resolve4(Array.from(selectedIds));
          }
          return;
        }
        if (input === "g" || input === "generate") {
          rl.close();
          resolve4("generate");
          return;
        }
        if (input === "d" || input === "defaults") {
          rl.close();
          resolve4("defaults");
          return;
        }
        if (input === "a" || input === "all") {
          personas.forEach((p) => selectedIds.add(p.id));
          prompt();
          return;
        }
        if (input === "n" || input === "none") {
          selectedIds.clear();
          prompt();
          return;
        }
        const num = parseInt(input, 10);
        if (!isNaN(num) && num >= 1 && num <= personas.length) {
          const agent = personas[num - 1];
          if (selectedIds.has(agent.id)) {
            selectedIds.delete(agent.id);
            console.log(`\x1B[31m\u2717 Removed: ${agent.name}\x1B[0m`);
          } else {
            selectedIds.add(agent.id);
            console.log(`\x1B[32m\u2713 Added: ${agent.name}\x1B[0m`);
          }
          prompt();
          return;
        }
        const agentById = personas.find((a) => a.id === input || a.name.toLowerCase() === input);
        if (agentById) {
          if (selectedIds.has(agentById.id)) {
            selectedIds.delete(agentById.id);
            console.log(`\x1B[31m\u2717 Removed: ${agentById.name}\x1B[0m`);
          } else {
            selectedIds.add(agentById.id);
            console.log(`\x1B[32m\u2713 Added: ${agentById.name}\x1B[0m`);
          }
          prompt();
          return;
        }
        console.log('\x1B[33mUnknown command. Use number, "g" generate, "d" defaults, "a" all, "n" none, Enter to continue.\x1B[0m');
        prompt();
      });
    };
    prompt();
  });
}
async function selectPersonas(cwd, goal, projectName) {
  const personasDir = path9.join(cwd, "personas");
  let files = [];
  try {
    const allFiles = await fs8.readdir(personasDir);
    files = allFiles.filter((f) => f.endsWith(".json") && !f.includes(".skills"));
  } catch {
  }
  const options = [];
  for (const file of files) {
    const name = path9.basename(file, ".json");
    try {
      const content = await fs8.readFile(path9.join(personasDir, file), "utf-8");
      const personas = JSON.parse(content);
      const description = personas.map((p) => p.name).join(", ");
      options.push({ name, file, personas, description });
    } catch {
    }
  }
  console.log("\n\u{1F4CB} Persona options:\n");
  console.log("  0. Use default personas (copywriting experts)");
  console.log("  G. Generate new personas for this project");
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.name}`);
    console.log(`     Agents: ${opt.description}`);
  });
  console.log("");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve4) => {
    rl.question("Select option [G]: ", async (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "g" || a === "") {
        const result = await generatePersonasForGoal(cwd, goal || "General debate", projectName || "New Project");
        resolve4(result);
      } else if (a === "0") {
        resolve4(null);
      } else {
        const selection = parseInt(a, 10);
        if (selection > 0 && selection <= options.length) {
          const selected = options[selection - 1];
          let skills;
          try {
            skills = await fs8.readFile(
              path9.join(personasDir, `${selected.name}.skills.md`),
              "utf-8"
            );
          } catch {
          }
          resolve4({ name: selected.name, personas: selected.personas, skills });
        } else {
          console.log("Invalid selection, generating new personas...");
          const result = await generatePersonasForGoal(cwd, goal || "General debate", projectName || "New Project");
          resolve4(result);
        }
      }
    });
  });
}
program.name("forge").description("Multi-agent deliberation engine - reach consensus through structured debate").version("1.0.0");
program.command("start").description("Start a new debate session").option("-b, --brief <name>", "Brief name to load (from briefs/ directory)").option("-p, --project <name>", "Project name", "New Project").option("-g, --goal <goal>", "Project goal").option("-a, --agents <ids>", "Comma-separated agent IDs (from default or custom personas)").option("--personas <name>", "Use custom persona set (from personas/ directory)").option("-l, --language <lang>", "Language: hebrew, english, mixed", "hebrew").option("--human", "Enable human participation", true).option("--no-human", "Disable human participation").option("-o, --output <dir>", "Output directory for sessions", "output/sessions").action(async (options) => {
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
  if (!personaSetName) {
    const selection = await selectPersonas(cwd, goal, projectName);
    if (selection) {
      personaSetName = selection.name;
      availablePersonas = selection.personas;
      if (selection.skills) {
        domainSkills = selection.skills;
      }
      console.log(`
\u{1F4CB} Using persona set: ${personaSetName}`);
    } else {
      console.log("\n\u{1F4CB} Using default personas (copywriting experts)");
    }
  }
  if (personaSetName && availablePersonas === AGENT_PERSONAS) {
    const personasPath = path9.join(cwd, "personas", `${personaSetName}.json`);
    try {
      const content = await fs8.readFile(personasPath, "utf-8");
      availablePersonas = JSON.parse(content);
    } catch {
      console.error(`Persona set "${personaSetName}" not found in personas/ directory`);
      process.exit(1);
    }
  }
  if (personaSetName) {
    const skillsPath = path9.join(cwd, "personas", `${personaSetName}.skills.md`);
    try {
      domainSkills = await fs8.readFile(skillsPath, "utf-8");
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
    let selecting = true;
    while (selecting) {
      const result = await selectAgentsInteractively(availablePersonas);
      if (result === "generate") {
        const generated = await generatePersonasForGoal(cwd, goal, projectName);
        if (generated) {
          availablePersonas = generated.personas;
          domainSkills = generated.skills;
          personaSetName = generated.name;
        }
      } else if (result === "defaults") {
        availablePersonas = AGENT_PERSONAS;
        domainSkills = void 0;
        personaSetName = null;
        clearCustomPersonas();
        console.log("\n\u{1F4CB} Using default personas (copywriting experts)");
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
    id: uuid2(),
    projectName,
    goal,
    enabledAgents: validAgents,
    humanParticipation: options.human,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: getDefaultMethodology(),
    contextDir: path9.join(cwd, "context"),
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
    // context
    domainSkills,
    // domain-specific skills (or undefined for default copywriting)
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
  console.log(`
\u{1F525} Starting Forge: ${projectName}`);
  console.log(`\u{1F4CB} Goal: ${goal}`);
  console.log(`\u{1F465} Agents: ${validAgents.join(", ")}`);
  if (personaSetName) {
    console.log(`\u{1F4C2} Persona set: ${personaSetName}`);
  }
  console.log(`\u{1F4C1} Output: ${persistence.getSessionDir()}
`);
  const { waitUntilExit } = render(
    React4.createElement(App, {
      orchestrator,
      persistence,
      session,
      onExit: async () => {
        await persistence.saveFull();
        clearCustomPersonas();
        console.log(`
\u2705 Session saved to ${persistence.getSessionDir()}`);
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
program.action(async () => {
  const cwd = process.cwd();
  const fsAdapter = new FileSystemAdapter(cwd);
  const agentRunner = new CLIAgentRunner();
  console.log("");
  console.log("\x1B[36m\x1B[1m\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\x1B[0m");
  console.log("\x1B[36m\x1B[1m\u2551\x1B[0m  \x1B[35m\x1B[1m\u{1F525} FORGE\x1B[0m                                            \x1B[36m\x1B[1m\u2551\x1B[0m");
  console.log("\x1B[36m\x1B[1m\u2551\x1B[0m  \x1B[2mMulti-Agent Deliberation Engine\x1B[0m                      \x1B[36m\x1B[1m\u2551\x1B[0m");
  console.log("\x1B[36m\x1B[1m\u2551\x1B[0m  \x1B[2mReach consensus through structured debate\x1B[0m            \x1B[36m\x1B[1m\u2551\x1B[0m");
  console.log("\x1B[36m\x1B[1m\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\x1B[0m");
  console.log(`  \x1B[2m\x1B[3m${formatQuote(getRandomQuote())}\x1B[0m`);
  console.log("");
  const sessionsDir = path9.join(cwd, "output", "sessions");
  let savedSessions = [];
  try {
    const dirs = await fs8.readdir(sessionsDir);
    savedSessions = dirs.filter((d) => !d.startsWith("."));
  } catch {
  }
  if (savedSessions.length > 0) {
    console.log(`\x1B[2m${savedSessions.length} saved session(s) available. Type 'sessions' to view.\x1B[0m`);
    console.log("");
  }
  console.log(`${YELLOW}${BOLD}COMMANDS${RESET}`);
  console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
  console.log(`  ${GREEN}new${RESET}           - Start new session configuration`);
  console.log(`  ${GREEN}start${RESET}         - Start configured session`);
  console.log(`  ${GREEN}sessions${RESET}      - List saved sessions`);
  console.log(`  ${GREEN}load <name>${RESET}   - Load a saved session`);
  console.log(`  ${GREEN}token [key]${RESET}   - Set/show API key`);
  console.log(`  ${GREEN}test${RESET}          - Test API connection`);
  console.log(`  ${GREEN}agents${RESET}        - List available agents`);
  console.log(`  ${GREEN}help${RESET}          - Show all commands`);
  console.log(`  ${GREEN}exit${RESET}          - Exit`);
  console.log("");
  let currentPersonas = AGENT_PERSONAS;
  let selectedAgentIds = /* @__PURE__ */ new Set();
  let sessionConfig = { language: "hebrew" };
  let configStep = -1;
  let currentSession = null;
  let orchestrator = null;
  let persistence = null;
  let domainSkills;
  let isPaused = false;
  sessionConfig.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  const prompt = () => {
    const prefix = currentSession ? "\x1B[32m\u25CF\x1B[0m" : "\x1B[2m\u25CB\x1B[0m";
    rl.question(`${prefix} forge> `, async (input) => {
      await handleCommand(input.trim());
    });
  };
  const showAgentSelection = () => {
    if (selectedAgentIds.size === 0) {
      currentPersonas.forEach((a) => selectedAgentIds.add(a.id));
    }
    console.log("");
    console.log("\x1B[36m\x1B[1mPERSONA OPTIONS:\x1B[0m");
    console.log("  \x1B[33mg\x1B[0m - \u{1F525} Generate new personas for this project");
    console.log("  \x1B[33md\x1B[0m - Use default personas (copywriting experts)");
    console.log("");
    console.log("\x1B[36mSelect agents (toggle with number):\x1B[0m");
    currentPersonas.forEach((agent, index) => {
      const isSelected = selectedAgentIds.has(agent.id);
      const checkbox = isSelected ? "\x1B[32m[\u2713]\x1B[0m" : "\x1B[2m[ ]\x1B[0m";
      const num = `\x1B[1m${index + 1}\x1B[0m`;
      const name = isSelected ? `\x1B[1m${agent.name}\x1B[0m` : `\x1B[2m${agent.name}\x1B[0m`;
      console.log(`  ${checkbox} ${num}. ${name} (${agent.nameHe}) - ${agent.role}`);
    });
    console.log("");
    console.log(`\x1B[2mSelected: ${selectedAgentIds.size}/${currentPersonas.length} agents\x1B[0m`);
    console.log(`\x1B[2mType number to toggle, 'g' generate, 'd' defaults, 'done' to continue\x1B[0m`);
  };
  const handleCommand = async (input) => {
    const [cmd, ...args] = input.split(" ");
    const cmdLower = cmd.toLowerCase();
    if (configStep >= 0) {
      await handleConfigInput(input);
      return;
    }
    if (currentSession && orchestrator) {
      switch (cmdLower) {
        case "stop":
        case "exit":
          if (persistence) {
            const sessionWithMemory = {
              ...orchestrator.getSession(),
              memoryState: messageBus.getMemoryState()
            };
            await persistence.saveSessionWithMemory(sessionWithMemory);
            console.log(`${GREEN}Session saved.${RESET}`);
          }
          orchestrator.stop();
          currentSession = null;
          orchestrator = null;
          persistence = null;
          isPaused = false;
          console.log(`${YELLOW}Session ended.${RESET}`);
          prompt();
          return;
        case "status":
          showSessionStatus();
          prompt();
          return;
        case "memory":
        case "context":
          showMemoryStats();
          prompt();
          return;
        case "recall":
          showRecall(args[0]);
          prompt();
          return;
        case "pause":
          if (!isPaused) {
            messageBus.pause("user requested");
            isPaused = true;
            console.log(`${YELLOW}Session paused. Type 'resume' to continue.${RESET}`);
          } else {
            console.log(`${DIM}Already paused.${RESET}`);
          }
          prompt();
          return;
        case "resume":
          if (isPaused) {
            messageBus.resume();
            isPaused = false;
            console.log(`${GREEN}Session resumed.${RESET}`);
          } else {
            console.log(`${DIM}Not paused.${RESET}`);
          }
          prompt();
          return;
        case "synthesize":
        case "syn":
          await transitionToSynthesis(orchestrator, args[0]?.toLowerCase() === "force");
          prompt();
          return;
        case "consensus":
        case "ready":
          showConsensusStatus(orchestrator);
          prompt();
          return;
        case "draft":
        case "write":
          await transitionToDraft(orchestrator);
          prompt();
          return;
        case "save":
          if (persistence) {
            const sessionWithMemory = {
              ...orchestrator.getSession(),
              memoryState: messageBus.getMemoryState()
            };
            await persistence.saveSessionWithMemory(sessionWithMemory);
            console.log(`${GREEN}Session saved to ${persistence.getSessionDir()}${RESET}`);
          }
          prompt();
          return;
        case "export":
          await exportSession2(orchestrator, args[0] || "md");
          prompt();
          return;
        case "agents":
          showActiveAgents();
          prompt();
          return;
        case "help":
        case "?":
          showSessionHelp();
          prompt();
          return;
        case "clear":
        case "cls":
          console.clear();
          prompt();
          return;
        default:
          if (input && !input.startsWith("/")) {
            if (isPaused) {
              console.log(`${YELLOW}Session is paused. Type 'resume' first.${RESET}`);
            } else {
              await orchestrator.addHumanMessage(input);
            }
          } else if (input) {
            console.log(`${RED}Unknown command: ${cmd}${RESET}`);
            console.log(`${DIM}Type 'help' for available commands.${RESET}`);
          }
          prompt();
          return;
      }
    }
    switch (cmdLower) {
      case "new":
      case "init":
        configStep = 0;
        sessionConfig = { language: "hebrew", apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY };
        selectedAgentIds.clear();
        currentPersonas = AGENT_PERSONAS;
        domainSkills = void 0;
        console.log("");
        console.log(`${MAGENTA}${BOLD}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
        console.log(`${MAGENTA}${BOLD}  NEW SESSION CONFIGURATION${RESET}`);
        console.log(`${MAGENTA}${BOLD}\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550${RESET}`);
        console.log("");
        console.log(`${CYAN}Enter project name:${RESET}`);
        break;
      case "start":
        if (sessionConfig.projectName && sessionConfig.agents && sessionConfig.agents.length > 0) {
          await startSession();
        } else {
          console.log(`${YELLOW}No session configured. Run 'new' first.${RESET}`);
        }
        break;
      case "sessions":
      case "ls":
        await listSessions2();
        break;
      case "load":
        if (args.length > 0) {
          await loadSession(args.join(" "));
        } else {
          console.log(`${YELLOW}Usage: load <session-name or number>${RESET}`);
          console.log(`${DIM}Use 'sessions' to see available sessions.${RESET}`);
        }
        break;
      case "token":
      case "apikey":
      case "setkey":
        if (args.length > 0) {
          sessionConfig.apiKey = args[0];
          process.env.ANTHROPIC_API_KEY = args[0];
          console.log(`${GREEN}API key set.${RESET}`);
        } else {
          if (sessionConfig.apiKey) {
            console.log(`${GREEN}API key is set (${sessionConfig.apiKey.slice(0, 10)}...)${RESET}`);
          } else {
            console.log(`${YELLOW}No API key set. Use: token <your-key>${RESET}`);
            console.log(`${DIM}Or set ANTHROPIC_API_KEY environment variable.${RESET}`);
          }
        }
        break;
      case "test":
        await testApiConnection();
        break;
      case "agents":
        console.log("");
        console.log(`${CYAN}${BOLD}AVAILABLE AGENTS${RESET}`);
        console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
        for (const agent of AGENT_PERSONAS) {
          console.log(`${BOLD}${agent.name}${RESET} (${agent.nameHe})`);
          console.log(`  ${DIM}${agent.role}${RESET}`);
        }
        console.log("");
        break;
      case "help":
      case "?":
        showFullHelp();
        break;
      case "clear":
      case "cls":
        console.clear();
        break;
      case "exit":
      case "quit":
        console.log(`${DIM}Goodbye.${RESET}`);
        rl.close();
        process.exit(0);
      case "":
        break;
      default:
        console.log(`${RED}Unknown command: ${cmd}${RESET}`);
        console.log(`${DIM}Type 'help' for available commands.${RESET}`);
    }
    prompt();
  };
  const handleConfigInput = async (input) => {
    const inputLower = input.toLowerCase().trim();
    switch (configStep) {
      case 0:
        sessionConfig.projectName = input || "Untitled Project";
        console.log(`\x1B[32mProject: ${sessionConfig.projectName}\x1B[0m`);
        configStep = 1;
        console.log("\x1B[36mEnter project goal:\x1B[0m");
        break;
      case 1:
        sessionConfig.goal = input || "Create effective content";
        console.log(`\x1B[32mGoal: ${sessionConfig.goal}\x1B[0m`);
        configStep = 2;
        showAgentSelection();
        break;
      case 2:
        if (inputLower === "g" || inputLower === "generate") {
          console.log("");
          console.log("\x1B[35m\x1B[1m\u{1F525} Generating personas...\x1B[0m");
          const result = await generatePersonasForGoal(cwd, sessionConfig.goal || "", sessionConfig.projectName || "");
          if (result) {
            currentPersonas = result.personas;
            registerCustomPersonas(result.personas);
            selectedAgentIds.clear();
          }
          showAgentSelection();
          break;
        }
        if (inputLower === "d" || inputLower === "defaults") {
          currentPersonas = AGENT_PERSONAS;
          clearCustomPersonas();
          selectedAgentIds.clear();
          console.log("\x1B[32mUsing default personas\x1B[0m");
          showAgentSelection();
          break;
        }
        if (inputLower === "done" || inputLower === "ok" || inputLower === "y") {
          if (selectedAgentIds.size === 0) {
            currentPersonas.forEach((a) => selectedAgentIds.add(a.id));
          }
          sessionConfig.agents = Array.from(selectedAgentIds);
          console.log(`\x1B[32mAgents: ${sessionConfig.agents.join(", ")}\x1B[0m`);
          configStep = 3;
          console.log("");
          console.log("\x1B[36mSelect language:\x1B[0m");
          console.log("  \x1B[1m1\x1B[0m - Hebrew (\u05E2\u05D1\u05E8\u05D9\u05EA) - default");
          console.log("  \x1B[1m2\x1B[0m - English");
          console.log("  \x1B[1m3\x1B[0m - Mixed");
          break;
        }
        if (inputLower === "a" || inputLower === "all") {
          currentPersonas.forEach((a) => selectedAgentIds.add(a.id));
          showAgentSelection();
          break;
        }
        if (inputLower === "n" || inputLower === "none") {
          selectedAgentIds.clear();
          showAgentSelection();
          break;
        }
        const num = parseInt(inputLower, 10);
        if (!isNaN(num) && num >= 1 && num <= currentPersonas.length) {
          const agent = currentPersonas[num - 1];
          if (selectedAgentIds.has(agent.id)) {
            selectedAgentIds.delete(agent.id);
            console.log(`\x1B[31m\u2717 Removed: ${agent.name}\x1B[0m`);
          } else {
            selectedAgentIds.add(agent.id);
            console.log(`\x1B[32m\u2713 Added: ${agent.name}\x1B[0m`);
          }
          showAgentSelection();
          break;
        }
        if (inputLower === "") {
          break;
        }
        console.log("\x1B[33mType number to toggle, g/d/done\x1B[0m");
        break;
      case 3:
        if (inputLower === "1" || inputLower === "hebrew" || inputLower === "") {
          sessionConfig.language = "hebrew";
        } else if (inputLower === "2" || inputLower === "english") {
          sessionConfig.language = "english";
        } else if (inputLower === "3" || inputLower === "mixed") {
          sessionConfig.language = "mixed";
        }
        console.log(`\x1B[32mLanguage: ${sessionConfig.language}\x1B[0m`);
        configStep = -1;
        console.log("");
        console.log("\x1B[32m\x1B[1mConfiguration complete!\x1B[0m");
        console.log(`\x1B[2mType 'start' to begin the session.\x1B[0m`);
        break;
    }
    prompt();
  };
  const listSessions2 = async () => {
    console.log("");
    console.log("\x1B[36m\x1B[1mSAVED SESSIONS\x1B[0m");
    console.log("\x1B[2m\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\x1B[0m");
    try {
      const dirs = await fs8.readdir(sessionsDir);
      const sessions = dirs.filter((d) => !d.startsWith("."));
      if (sessions.length === 0) {
        console.log("\x1B[2mNo saved sessions found.\x1B[0m");
        console.log("");
        return;
      }
      for (let i = 0; i < sessions.length; i++) {
        const sessionDir = path9.join(sessionsDir, sessions[i]);
        let meta = null;
        try {
          const metaPath = path9.join(sessionDir, "session.json");
          meta = JSON.parse(await fs8.readFile(metaPath, "utf-8"));
        } catch {
          try {
            const metaPath = path9.join(sessionDir, "metadata.json");
            meta = JSON.parse(await fs8.readFile(metaPath, "utf-8"));
          } catch {
          }
        }
        if (meta) {
          console.log(`  ${BOLD}${i + 1}${RESET}. ${GREEN}${meta.projectName || sessions[i]}${RESET}`);
          console.log(`     ${DIM}${new Date(meta.startedAt).toLocaleDateString()} \u2022 ${meta.goal?.slice(0, 40) || ""}${RESET}`);
        } else {
          console.log(`  ${BOLD}${i + 1}${RESET}. ${sessions[i]}`);
        }
      }
      console.log("");
      console.log(`\x1B[2mUse 'load <number>' to restore a session.\x1B[0m`);
      console.log("");
    } catch {
      console.log("\x1B[2mNo sessions directory found.\x1B[0m");
      console.log("");
    }
  };
  const loadSession = async (nameOrIndex) => {
    console.log(`${CYAN}Loading session...${RESET}`);
    try {
      const dirs = await fs8.readdir(sessionsDir);
      const sessions = dirs.filter((d) => !d.startsWith(".")).sort().reverse();
      if (sessions.length === 0) {
        console.log(`${RED}No saved sessions found.${RESET}`);
        return;
      }
      let sessionName = nameOrIndex;
      const index = parseInt(nameOrIndex, 10);
      if (!isNaN(index) && index >= 1 && index <= sessions.length) {
        sessionName = sessions[index - 1];
      }
      const matchingSession = sessions.find((s) => s === sessionName || s.includes(sessionName));
      if (!matchingSession) {
        console.log(`${RED}Session not found: ${nameOrIndex}${RESET}`);
        return;
      }
      const sessionDir = path9.join(sessionsDir, matchingSession);
      let metadata = {};
      try {
        const metaPath = path9.join(sessionDir, "session.json");
        metadata = JSON.parse(await fs8.readFile(metaPath, "utf-8"));
      } catch {
        try {
          const metaPath = path9.join(sessionDir, "metadata.json");
          metadata = JSON.parse(await fs8.readFile(metaPath, "utf-8"));
        } catch {
          console.log(`${YELLOW}Warning: Could not load session metadata.${RESET}`);
        }
      }
      let messages = [];
      try {
        const messagesPath = path9.join(sessionDir, "messages.jsonl");
        const content = await fs8.readFile(messagesPath, "utf-8");
        messages = content.trim().split("\n").filter((line) => line.trim()).map((line) => JSON.parse(line));
      } catch {
        console.log(`${DIM}No messages file found.${RESET}`);
      }
      let memoryState = null;
      try {
        const memoryPath = path9.join(sessionDir, "memory.json");
        memoryState = JSON.parse(await fs8.readFile(memoryPath, "utf-8"));
      } catch {
      }
      if (metadata.enabledAgents) {
        try {
          const personasPath = path9.join(cwd, "personas", `${matchingSession}.json`);
          const personasContent = await fs8.readFile(personasPath, "utf-8");
          currentPersonas = JSON.parse(personasContent);
          registerCustomPersonas(currentPersonas);
          try {
            const skillsPath = path9.join(cwd, "personas", `${matchingSession}.skills.md`);
            domainSkills = await fs8.readFile(skillsPath, "utf-8");
          } catch {
          }
        } catch {
          currentPersonas = AGENT_PERSONAS;
        }
      }
      sessionConfig.projectName = metadata.projectName;
      sessionConfig.goal = metadata.goal;
      sessionConfig.agents = metadata.enabledAgents || [];
      selectedAgentIds = new Set(sessionConfig.agents);
      if (memoryState) {
        messageBus.restoreMemory(memoryState);
        console.log(`${DIM}Conversation memory restored.${RESET}`);
      }
      console.log("");
      console.log(`${GREEN}${BOLD}\u2713 Session loaded!${RESET}`);
      console.log(`${DIM}Project: ${metadata.projectName}${RESET}`);
      console.log(`${DIM}Goal: ${metadata.goal}${RESET}`);
      console.log(`${DIM}Agents: ${(metadata.enabledAgents || []).join(", ")}${RESET}`);
      console.log(`${DIM}Messages: ${messages.length}${RESET}`);
      console.log("");
      console.log(`${YELLOW}Type 'start' to continue this session.${RESET}`);
      console.log("");
    } catch (error) {
      console.log(`${RED}Error loading session: ${error}${RESET}`);
    }
  };
  const startSession = async () => {
    if (!sessionConfig.projectName || !sessionConfig.agents || sessionConfig.agents.length === 0) {
      console.log(`${YELLOW}Session not configured. Run 'new' first.${RESET}`);
      return;
    }
    if (currentPersonas !== AGENT_PERSONAS) {
      registerCustomPersonas(currentPersonas);
    }
    const config = {
      id: uuid2(),
      projectName: sessionConfig.projectName,
      goal: sessionConfig.goal || "Reach consensus",
      enabledAgents: sessionConfig.agents,
      humanParticipation: true,
      maxRounds: 10,
      consensusThreshold: 0.6,
      methodology: getDefaultMethodology(),
      contextDir: path9.join(cwd, "context"),
      outputDir: path9.join(cwd, "output", "sessions"),
      language: sessionConfig.language,
      apiKey: sessionConfig.apiKey
    };
    currentSession = {
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
    persistence = new SessionPersistence(fsAdapter, {
      outputDir: config.outputDir
    });
    await persistence.initSession(currentSession);
    messageBus.setAgentRunner(agentRunner);
    orchestrator = new EDAOrchestrator(
      currentSession,
      void 0,
      domainSkills,
      {
        agentRunner,
        fileSystem: fsAdapter
      }
    );
    orchestrator.on((event) => {
      if (event.type === "agent_message" && persistence && orchestrator) {
        persistence.updateSession(orchestrator.getSession());
      }
    });
    console.log("");
    console.log(`${GREEN}${BOLD}\u{1F525} Session started: ${sessionConfig.projectName}${RESET}`);
    console.log(`${DIM}Goal: ${sessionConfig.goal}${RESET}`);
    console.log(`${DIM}Agents: ${sessionConfig.agents.join(", ")}${RESET}`);
    console.log(`${DIM}Output: ${persistence.getSessionDir()}${RESET}`);
    console.log("");
    console.log(`${DIM}Type your message to join the debate. Type 'help' for commands.${RESET}`);
    console.log("");
    orchestrator.start();
    isPaused = false;
  };
  const showSessionStatus = () => {
    if (!orchestrator || !currentSession) return;
    const status = orchestrator.getConsensusStatus();
    const memStats = messageBus.getMemoryStats();
    console.log("");
    console.log(`${CYAN}${BOLD}SESSION STATUS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`Project: ${currentSession.config.projectName}`);
    console.log(`Phase: ${currentSession.currentPhase}${isPaused ? ` ${YELLOW}(PAUSED)${RESET}` : ""}`);
    console.log(`Messages: ${currentSession.messages.length}`);
    console.log("");
    console.log(`${CYAN}${BOLD}CONSENSUS${RESET}`);
    console.log(`Ready: ${status.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
    console.log(`Points: ${status.consensusPoints} consensus, ${status.conflictPoints} conflicts`);
    if (status.recommendation) {
      console.log(`Recommendation: ${status.recommendation}`);
    }
    console.log("");
    console.log(`${CYAN}${BOLD}MEMORY${RESET}`);
    console.log(`Summaries: ${memStats.summaryCount}, Decisions: ${memStats.decisionCount}`);
    console.log("");
  };
  const showMemoryStats = () => {
    const stats = messageBus.getMemoryStats();
    console.log("");
    console.log(`${CYAN}${BOLD}CONVERSATION MEMORY${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`Summaries: ${stats.summaryCount}`);
    console.log(`Key Decisions: ${stats.decisionCount}`);
    console.log(`Active Proposals: ${stats.proposalCount}`);
    console.log(`Tracked Agents: ${stats.agentCount}`);
    console.log("");
    if (stats.summaryCount > 0) {
      console.log(`${DIM}Memory is active - agents can recall earlier conversation.${RESET}`);
      console.log(`${DIM}Use 'recall [agent-id]' to test what an agent remembers.${RESET}`);
    } else {
      console.log(`${DIM}Memory will build as conversation progresses (~12 messages per summary).${RESET}`);
    }
    console.log("");
  };
  const showRecall = (agentId) => {
    const memoryContext = messageBus.getMemoryContext(agentId);
    const stats = messageBus.getMemoryStats();
    console.log("");
    console.log(`${CYAN}${BOLD}AGENT MEMORY TEST${agentId ? ` (${agentId})` : ""}${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    if (stats.summaryCount === 0) {
      console.log(`${YELLOW}No memory built yet.${RESET}`);
      console.log(`${DIM}Memory builds after ~12 messages.${RESET}`);
      const allMessages = messageBus.getAllMessages();
      console.log(`${DIM}Messages so far: ${allMessages.length}${RESET}`);
      if (allMessages.length > 0) {
        console.log("");
        console.log(`${DIM}Recent topics:${RESET}`);
        allMessages.slice(-5).forEach((m) => {
          const preview = m.content.slice(0, 80).replace(/\n/g, " ");
          console.log(`${DIM}  [${m.agentId}]: ${preview}...${RESET}`);
        });
      }
    } else {
      console.log(`${GREEN}Memory context an agent would receive:${RESET}`);
      console.log("");
      memoryContext.split("\n").forEach((line) => {
        console.log(`${DIM}  ${line}${RESET}`);
      });
    }
    console.log("");
  };
  const showConsensusStatus = (orch) => {
    const status = orch.getConsensusStatus();
    console.log("");
    console.log(`${CYAN}${BOLD}CONSENSUS STATUS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`Ready for synthesis: ${status.ready ? `${GREEN}YES${RESET}` : `${YELLOW}NO${RESET}`}`);
    console.log(`Consensus points: ${status.consensusPoints}`);
    console.log(`Conflict points: ${status.conflictPoints}`);
    if (status.recommendation) {
      console.log("");
      console.log(`${BOLD}Recommendation:${RESET} ${status.recommendation}`);
    }
    console.log("");
    if (!status.ready) {
      console.log(`${DIM}Use 'synthesize force' to force synthesis anyway.${RESET}`);
    }
    console.log("");
  };
  const transitionToSynthesis = async (orch, force) => {
    console.log(`${CYAN}Transitioning to synthesis phase...${RESET}`);
    try {
      const result = await orch.transitionToSynthesis(force);
      if (result && result.success) {
        console.log(`${GREEN}${result.message}${RESET}`);
      } else if (result) {
        console.log(`${YELLOW}${result.message}${RESET}`);
      }
    } catch (error) {
      console.log(`${RED}Error: ${error}${RESET}`);
    }
  };
  const transitionToDraft = async (orch) => {
    console.log(`${CYAN}Transitioning to drafting phase...${RESET}`);
    try {
      const result = await orch.transitionToDrafting();
      if (result && result.success) {
        console.log(`${GREEN}${result.message}${RESET}`);
      } else if (result) {
        console.log(`${YELLOW}${result.message}${RESET}`);
      }
    } catch (error) {
      console.log(`${RED}Error: ${error}${RESET}`);
    }
  };
  const exportSession2 = async (orch, format) => {
    if (!persistence) {
      console.log(`${RED}No session to export.${RESET}`);
      return;
    }
    try {
      const session = orch.getSession();
      const filename = `export-${Date.now()}.${format}`;
      const filepath = path9.join(persistence.getSessionDir(), filename);
      if (format === "json") {
        await fs8.writeFile(filepath, JSON.stringify(session, null, 2));
      } else if (format === "md") {
        const lines = [];
        lines.push(`# ${session.config.projectName} - Transcript`);
        lines.push("");
        lines.push(`**Goal:** ${session.config.goal}`);
        lines.push(`**Date:** ${session.startedAt}`);
        lines.push("");
        lines.push("---");
        lines.push("");
        for (const msg of session.messages) {
          const sender = msg.agentId === "human" ? "Human" : msg.agentId;
          lines.push(`### ${sender}`);
          lines.push("");
          lines.push(msg.content);
          lines.push("");
          lines.push("---");
          lines.push("");
        }
        await fs8.writeFile(filepath, lines.join("\n"));
      }
      console.log(`${GREEN}Exported to: ${filepath}${RESET}`);
    } catch (error) {
      console.log(`${RED}Export failed: ${error}${RESET}`);
    }
  };
  const showActiveAgents = () => {
    const personas = getActivePersonas();
    console.log("");
    console.log(`${CYAN}${BOLD}ACTIVE AGENTS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    for (const agent of personas) {
      const isEnabled = sessionConfig.agents?.includes(agent.id);
      const marker = isEnabled ? `${GREEN}\u25CF${RESET}` : `${DIM}\u25CB${RESET}`;
      console.log(`${marker} ${BOLD}${agent.name}${RESET} (${agent.nameHe})`);
      console.log(`  ${DIM}${agent.role}${RESET}`);
    }
    console.log("");
  };
  const testApiConnection = async () => {
    console.log(`${CYAN}Testing API connection...${RESET}`);
    try {
      const Anthropic4 = (await import("@anthropic-ai/sdk")).default;
      const client2 = new Anthropic4();
      const response = await client2.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 10,
        messages: [{ role: "user", content: 'Say "OK"' }]
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      console.log(`${GREEN}\u2713 API connection successful: ${text}${RESET}`);
    } catch (error) {
      console.log(`${RED}\u2717 API connection failed: ${error.message}${RESET}`);
      console.log(`${DIM}Make sure ANTHROPIC_API_KEY is set or use 'token <key>'.${RESET}`);
    }
  };
  const showSessionHelp = () => {
    console.log("");
    console.log(`${YELLOW}${BOLD}SESSION COMMANDS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}<text>${RESET}        - Send message to debate`);
    console.log(`  ${GREEN}status${RESET}        - Show session status`);
    console.log(`  ${GREEN}memory${RESET}        - Show conversation memory stats`);
    console.log(`  ${GREEN}recall [id]${RESET}   - Test what agent remembers`);
    console.log(`  ${GREEN}agents${RESET}        - List active agents`);
    console.log(`  ${GREEN}pause${RESET}         - Pause session`);
    console.log(`  ${GREEN}resume${RESET}        - Resume paused session`);
    console.log("");
    console.log(`${YELLOW}${BOLD}PHASE CONTROLS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}consensus${RESET}     - Check consensus status`);
    console.log(`  ${GREEN}synthesize${RESET}    - Move to synthesis phase`);
    console.log(`  ${GREEN}draft${RESET}         - Move to drafting phase`);
    console.log("");
    console.log(`${YELLOW}${BOLD}SESSION MANAGEMENT${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}save${RESET}          - Save session`);
    console.log(`  ${GREEN}export [fmt]${RESET}  - Export session (md, json)`);
    console.log(`  ${GREEN}stop${RESET}          - End session`);
    console.log(`  ${GREEN}clear${RESET}         - Clear screen`);
    console.log(`  ${GREEN}help${RESET}          - Show this help`);
    console.log("");
  };
  const showFullHelp = () => {
    console.log("");
    console.log(`${YELLOW}${BOLD}COMMANDS${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}new, init${RESET}     - Start new session configuration`);
    console.log(`  ${GREEN}start${RESET}         - Start configured session`);
    console.log(`  ${GREEN}token [key]${RESET}   - Set/show Claude API key`);
    console.log(`  ${GREEN}test${RESET}          - Test Claude API connection`);
    console.log("");
    console.log(`${YELLOW}${BOLD}SESSION MANAGEMENT${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}sessions, ls${RESET}  - List saved sessions`);
    console.log(`  ${GREEN}load <name>${RESET}   - Load a saved session`);
    console.log(`  ${GREEN}agents${RESET}        - List available agents`);
    console.log("");
    console.log(`${YELLOW}${BOLD}DURING SESSION${RESET}`);
    console.log(`${DIM}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${RESET}`);
    console.log(`  ${GREEN}<text>${RESET}        - Send message to debate`);
    console.log(`  ${GREEN}status${RESET}        - Show session status`);
    console.log(`  ${GREEN}memory${RESET}        - Show conversation memory`);
    console.log(`  ${GREEN}recall [id]${RESET}   - Test agent memory`);
    console.log(`  ${GREEN}pause/resume${RESET}  - Pause/resume session`);
    console.log(`  ${GREEN}synthesize${RESET}    - Move to synthesis phase`);
    console.log(`  ${GREEN}consensus${RESET}     - Check consensus status`);
    console.log(`  ${GREEN}draft${RESET}         - Move to drafting phase`);
    console.log(`  ${GREEN}save${RESET}          - Save session`);
    console.log(`  ${GREEN}export [fmt]${RESET}  - Export (md, json)`);
    console.log(`  ${GREEN}stop${RESET}          - End session`);
    console.log("");
    console.log(`  ${GREEN}clear${RESET}         - Clear screen`);
    console.log(`  ${GREEN}help${RESET}          - Show this help`);
    console.log(`  ${GREEN}exit${RESET}          - Exit`);
    console.log("");
  };
  prompt();
});
program.parse();
