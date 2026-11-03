export const ruleCategories = [
  "Core mechanics",
  "Combat",
  "Exploration",
  "Spellcasting",
  "Character options",
  "Equipment",
  "Magic items",
  "Monsters",
  "Rules glossary",
  "Game mastering",
];
export const categoryIcons = {
  "Core mechanics": "⚄",
  Combat: "⚔",
  Exploration: "⌖",
  Spellcasting: "✧",
  "Character options": "♙",
  Equipment: "▣",
  "Magic items": "◇",
  Monsters: "♜",
  "Rules glossary": "▤",
  "Game mastering": "⚑",
};
export const normalizeRule = (s) =>
  s
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\b(actions|reactions|attacks|checks|throws|rests)\b/g, (w) =>
      w.slice(0, -1),
    );
const stopwords = new Set([
  "what",
  "which",
  "can",
  "i",
  "do",
  "as",
  "a",
  "an",
  "the",
  "of",
  "is",
  "are",
  "how",
  "does",
  "my",
  "on",
  "to",
  "in",
  "with",
  "for",
  "and",
  "about",
  "kinds",
  "things",
]);
export function searchRules(entries, query) {
  const normalized = normalizeRule(query),
    tokens = normalized.split(" ").filter((w) => w && !stopwords.has(w));
  if (!tokens.length) return entries.slice();
  return entries
    .map((e) => {
      const title = normalizeRule(e.title),
        body = normalizeRule(e.text),
        path = normalizeRule(e.path.join(" "));
      if (
        !tokens.every(
          (w) => title.includes(w) || body.includes(w) || path.includes(w),
        )
      )
        return null;
      return {
        entry: e,
        score:
          (title === normalized ? 200 : 0) +
          (tokens.every((w) => title.includes(w)) ? 100 : 0) +
          (tokens.some((w) => title.includes(w)) ? 20 : 0) +
          (e.category === "Combat" ? 8 : 0) -
          (e.category === "Monsters" ? 5 : 0),
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title),
    )
    .map((r) => r.entry);
}
export function buildRuleTree(entries) {
  const root = { children: new Map(), entries: [] };
  for (const e of entries) {
    let node = root;
    for (const name of e.path) {
      if (!node.children.has(name))
        node.children.set(name, { name, children: new Map(), entries: [] });
      node = node.children.get(name);
    }
    node.entries.push(e);
  }
  return root;
}
export function findCounterpart(entry, entries) {
  if (!entry) return null;
  const original = entries.find((e) => e.id === entry.id);
  if (original) return original;
  const candidates = entries.filter(
    (e) => e.key === entry.key && e.category === entry.category,
  );
  if (!candidates.length) return null;
  const genericContext = new Set([
    "classes",
    "class features",
    "spells",
    "spellcasting",
    "spell descriptions",
    "monsters",
    "monsters a z",
    "magic items",
    "rules glossary",
    "casting a spell",
    "casting time",
  ]);
  const oldContext = entry.sourcePath
    .slice(0, -1)
    .map(normalizeRule)
    .filter((p) => !genericContext.has(p));
  const ranked = candidates
    .map((e) => ({
      e,
      score: e.sourcePath
        .slice(0, -1)
        .reduce(
          (n, p) => n + (oldContext.includes(normalizeRule(p)) ? 1 : 0),
          0,
        ),
    }))
    .sort(
      (a, b) =>
        b.score - a.score || a.e.sourcePath.length - b.e.sourcePath.length,
    );
  const contextualKeys = new Set([
    "bonus-action",
    "reaction",
    "actions",
    "spellcasting",
    "traits",
    "legendary-actions",
    "lair-actions",
    "equipment",
    "hit-points",
    "proficiencies",
    "extra-attack",
    "ability-score-improvement",
  ]);
  if (
    contextualKeys.has(entry.key) &&
    !["Core mechanics", "Combat", "Exploration", "Rules glossary"].includes(
      entry.category,
    ) &&
    entry.parentId &&
    ranked[0].score === 0
  )
    return null;
  return ranked[0].e;
}
export function childEntries(entry, entries) {
  return entries.filter((e) => e.parentId === entry.id);
}
