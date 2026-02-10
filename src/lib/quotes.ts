/**
 * Forge Quotes — witty and inspiring quotes for startup banners and status lines.
 */

export interface Quote {
  text: string;
  author?: string;
}

export const quotes: Quote[] = [
  // Forging / smithing metaphors
  { text: "The best steel is forged in the hottest fire." },
  { text: "Every consensus is hammered out on the anvil of debate." },
  { text: "Strike while the arguments are hot." },
  { text: "Raw ideas go in. Refined decisions come out." },
  { text: "The forge doesn't break metal — it reshapes it." },
  { text: "Sparks fly before the blade is tempered." },
  { text: "You can't forge anything without heat and pressure." },
  { text: "A well-forged plan survives the battlefield." },

  // Debate & consensus
  { text: "Consensus isn't agreement — it's alignment." },
  { text: "The best ideas survive the forge of debate." },
  { text: "Disagreement is the first step toward understanding." },
  { text: "If everyone agrees immediately, nobody's thinking." },
  { text: "Good debate sharpens; bad debate flattens." },
  { text: "Dissent is a feature, not a bug." },
  { text: "The point isn't to win — it's to converge." },
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
  { text: "May your conflicts be constructive." },
];

/**
 * Returns a random quote.
 */
export function getRandomQuote(): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Returns a deterministic quote based on the current date (quote of the day).
 */
export function getQuoteOfTheDay(): Quote {
  const now = new Date();
  const dayIndex = Math.floor(now.getTime() / 86400000); // days since epoch
  return quotes[dayIndex % quotes.length];
}

/**
 * Format a quote for display.
 */
export function formatQuote(quote: Quote): string {
  if (quote.author) {
    return `"${quote.text}" — ${quote.author}`;
  }
  return `"${quote.text}"`;
}
