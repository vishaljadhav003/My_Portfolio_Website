// Memory: facts the visitor shares ("my name is Asha", "remember that ...") are saved in this browser
// only, shown in the Memory panel, and sent with each question so the assistant can use them.

export const MAX_MEMORY = 20;

const tidy = (value) => value.replace(/\s+/g, " ").replace(/[.\s]+$/, "").trim();

const PATTERNS = [
  { test: /\b(?:my name is|call me|i am called)\s+([\p{L}][\p{L} .'-]{1,40})/iu, make: (m) => `The visitor's name is ${tidy(m[1]).split(/\s+(?:and|but|i)\b/i)[0]}` },
  { test: /\bi(?:'m| am)\s+(?:from|based in|living in)\s+([^.,!?\n]{2,40})/i, make: (m) => `The visitor is from ${tidy(m[1])}` },
  { test: /\bi\s+(?:work|am working)\s+(?:at|for)\s+([^.,!?\n]{2,50})/i, make: (m) => `The visitor works at ${tidy(m[1])}` },
  { test: /\bmy\s+(?:company|business|startup|brand)\s+is(?:\s+called)?\s+([^.,!?\n]{2,50})/i, make: (m) => `The visitor's company is ${tidy(m[1])}` },
  { test: /\bi\s+(?:need|want|am looking for|am planning)\s+((?:a|an|to)\s+[^.!?\n]{4,90})/i, make: (m) => `The visitor is looking for: ${tidy(m[1])}` },
  { test: /\bremember\s+(?:that\s+)?([^\n]{3,160})/i, make: (m) => `The visitor asked to remember: ${tidy(m[1])}` },
];

/** Facts worth saving from one visitor message. */
export function extractMemories(text) {
  const found = [];
  for (const pattern of PATTERNS) {
    const match = pattern.test.exec(text);
    if (match) found.push(pattern.make(match).slice(0, 200));
  }
  return found;
}

/** Adds new notes, drops duplicates, keeps the newest MAX_MEMORY. */
export function mergeMemory(current, additions) {
  const seen = new Set(current.map((item) => item.text.toLowerCase()));
  const added = additions
    .filter((text) => text && !seen.has(text.toLowerCase()))
    .map((text) => ({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, text }));
  return { list: [...current, ...added].slice(-MAX_MEMORY), added };
}
