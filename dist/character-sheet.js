import { characterOptions } from "./character-options.js";

export const scoreAbilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const abilityLabels = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
];
export const pointCosts = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};
export const zeroScores = () =>
  Object.fromEntries(scoreAbilities.map((a) => [a, 0]));
export const coins = ["pp", "gp", "ep", "sp", "cp"];
export const coinValues = { pp: 1000, gp: 100, ep: 50, sp: 10, cp: 1 };
export const classSaves = {
  Barbarian: ["STR", "CON"],
  Bard: ["DEX", "CHA"],
  Cleric: ["WIS", "CHA"],
  Druid: ["INT", "WIS"],
  Fighter: ["STR", "CON"],
  Monk: ["STR", "DEX"],
  Paladin: ["WIS", "CHA"],
  Ranger: ["STR", "DEX"],
  Rogue: ["DEX", "INT"],
  Sorcerer: ["CON", "CHA"],
  Warlock: ["WIS", "CHA"],
  Wizard: ["INT", "WIS"],
};
export const signed = (n) => (n >= 0 ? "+" + n : String(n));
export function newScoreSetup() {
  return {
    mode: "point-buy",
    base: Object.fromEntries(scoreAbilities.map((a) => [a, 8])),
    applySpecies: true,
    background: zeroScores(),
    class: zeroScores(),
    feat: zeroScores(),
    other: zeroScores(),
  };
}
export function scoreSetup(r) {
  return (
    r.scoreSetup || {
      mode: "manual",
      base: Object.fromEntries(
        scoreAbilities.map((a) => [a, 10 + 2 * r.abilities[a]]),
      ),
      applySpecies: false,
      background: zeroScores(),
      class: zeroScores(),
      feat: zeroScores(),
      other: zeroScores(),
    }
  );
}
export function pointSpend(setup) {
  return scoreAbilities.reduce(
    (n, a) => n + (pointCosts[setup.base[a]] ?? Infinity),
    0,
  );
}
export function scoreInputMaximum(r, source, ability) {
  const setup = scoreSetup(r);
  if (source === "base") {
    if (setup.mode !== "point-buy") return 60;
    const others = scoreAbilities
      .filter((a) => a !== ability)
      .reduce((n, a) => n + (pointCosts[setup.base[a]] ?? 0), 0);
    return Math.max(
      8,
      ...Object.keys(pointCosts)
        .map(Number)
        .filter((v) => pointCosts[v] + others <= 27),
    );
  }
  if (source === "background") {
    const others = backgroundAbilities(r)
      .filter((a) => a !== ability)
      .map((a) => setup.background[a]);
    return Math.max(
      0,
      Math.min(
        others.includes(2) ? 1 : 2,
        3 - others.reduce((n, v) => n + v, 0),
      ),
    );
  }
  return 30;
}
export function backgroundDefinition(r) {
  return (
    !r.backgroundCustom &&
    characterOptions[r.rulesEdition || "2024"].backgrounds?.find(
      (b) => b.name === r.background,
    )
  );
}
export function backgroundAbilities(r) {
  const text =
    backgroundDefinition(r)?.text.match(
      /Ability Scores: ([\s\S]*?) Feat:/,
    )?.[1] || "";
  return r.backgroundCustom
    ? scoreAbilities
    : scoreAbilities.filter((a, i) => text.includes(abilityLabels[i]));
}
export function speciesBonuses(r) {
  const result = zeroScores();
  if (
    (r.rulesEdition || "2024") !== "2014" ||
    r.ancestryCustom ||
    !scoreSetup(r).applySpecies
  )
    return result;
  const species = characterOptions["2014"].species.find(
    (s) => s.name === r.ancestry,
  );
  if (!species) return result;
  const subrace =
    r.featureChoices?.[
      ["2014", "species", r.ancestry, "subrace"].join(":")
    ]?.[0];
  const text = species.features
    .filter((f) => /Traits/.test(f.title) || f.title === subrace)
    .map((f) => f.text)
    .join(" ");
  if (r.ancestry === "Human")
    return Object.fromEntries(scoreAbilities.map((a) => [a, 1]));
  for (const match of text.matchAll(
    /(?:your\s+)?(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score increases by (\d+)/gi,
  ))
    result[
      scoreAbilities[
        abilityLabels.findIndex(
          (a) => a.toLowerCase() === match[1].toLowerCase(),
        )
      ]
    ] += Number(match[2]);
  if (r.ancestry === "Half-Elf")
    for (const value of r.featureChoices?.[
      "2014:species:Half-Elf:ability-increase"
    ] || []) {
      const a = scoreAbilities[abilityLabels.indexOf(value)];
      if (a && a !== "CHA") result[a] += 1;
    }
  return result;
}
export function scoreBreakdown(r) {
  const setup = scoreSetup(r),
    species = speciesBonuses(r),
    allowed = backgroundAbilities(r);
  return Object.fromEntries(
    scoreAbilities.map((a) => {
      const row = {
        base: setup.base[a],
        species: species[a],
        background:
          (r.rulesEdition || "2024") === "2024" && allowed.includes(a)
            ? setup.background[a]
            : 0,
        class: setup.class[a],
        feat: setup.feat[a],
        other: setup.other[a],
      };
      row.total = Object.values(row).reduce((n, v) => n + v, 0);
      row.modifier = Math.floor((row.total - 10) / 2);
      return [a, row];
    }),
  );
}
export function proficiencyBonus(level) {
  return 2 + Math.floor((Math.min(level, 20) - 1) / 4);
}
export function savingThrows(r) {
  const defaults = !r.classNameCustom
    ? [...(classSaves[r.className] || [])]
    : [];
  if (!r.classNameCustom && r.className === "Monk" && r.level >= 14)
    defaults.push(...scoreAbilities);
  if (!r.classNameCustom && r.className === "Rogue" && r.level >= 15)
    defaults.push("WIS", ...(r.rulesEdition === "2024" ? ["CHA"] : []));
  const profs = r.saveProficiencies ?? defaults,
    pb = proficiencyBonus(r.level);
  const modifiers = r.scoreSetup
    ? Object.fromEntries(
        Object.entries(scoreBreakdown(r)).map(([a, v]) => [a, v.modifier]),
      )
    : r.abilities;
  return Object.fromEntries(
    scoreAbilities.map((a) => [
      a,
      {
        modifier: modifiers[a],
        proficient: profs.includes(a),
        proficiency: profs.includes(a) ? pb : 0,
        bonus: r.saveBonuses?.[a] || 0,
        total:
          modifiers[a] +
          (profs.includes(a) ? pb : 0) +
          (r.saveBonuses?.[a] || 0),
      },
    ]),
  );
}
export function syncScores(r) {
  if (r.scoreSetup)
    r.abilities = Object.fromEntries(
      Object.entries(scoreBreakdown(r)).map(([a, v]) => [a, v.modifier]),
    );
  return r;
}
export function validateSheet(r) {
  const map = (v, min, max) =>
    v &&
    scoreAbilities.every(
      (a) => Number.isInteger(v[a]) && v[a] >= min && v[a] <= max,
    );
  if (r.scoreSetup) {
    const s = r.scoreSetup;
    if (
      !["point-buy", "manual"].includes(s.mode) ||
      typeof s.applySpecies !== "boolean" ||
      (s.homebrewEnabled !== undefined &&
        typeof s.homebrewEnabled !== "boolean") ||
      !map(
        s.base,
        s.mode === "point-buy" ? 8 : 1,
        s.mode === "point-buy" ? 15 : 60,
      ) ||
      !["background", "class", "feat", "other"].every((k) =>
        map(s[k], k === "background" ? 0 : -30, k === "background" ? 2 : 30),
      )
    )
      throw Error("Check ability scores and score bonuses.");
    if (s.mode === "point-buy" && pointSpend(s) > 27)
      throw Error("Point buy exceeds 27 points.");
    if (
      Object.values(scoreBreakdown(r)).some((v) => v.total < 1 || v.total > 60)
    )
      throw Error("Final ability scores must be between 1 and 60.");
    if (r.rulesEdition === "2024") {
      const allowed = backgroundAbilities(r),
        active = allowed.map((a) => s.background[a]);
      if (
        active.reduce((n, v) => n + v, 0) > 3 ||
        active.filter((v) => v === 2).length > 1
      )
        throw Error("Background increases allow +2/+1 or three +1 bonuses.");
    }
    if (
      scoreAbilities.some(
        (a) => r.abilities[a] !== scoreBreakdown(r)[a].modifier,
      )
    )
      throw Error("Ability modifiers do not match their scores.");
  }
  if (
    r.saveProficiencies !== undefined &&
    r.saveProficiencies !== null &&
    (!Array.isArray(r.saveProficiencies) ||
      new Set(r.saveProficiencies).size !== r.saveProficiencies.length ||
      !r.saveProficiencies.every((a) => scoreAbilities.includes(a)))
  )
    throw Error("Invalid saving throw proficiencies.");
  if (r.saveBonuses !== undefined && !map(r.saveBonuses, -100, 100))
    throw Error("Invalid saving throw bonuses.");
  validateInventory(r);
  if (
    r.background !== undefined &&
    (typeof r.background !== "string" || r.background.length > 200)
  )
    throw Error("Invalid background.");
  return r;
}
export function validateInventory(r) {
  if (
    r.wallet !== undefined &&
    (!r.wallet ||
      !coins.every(
        (c) =>
          Number.isInteger(r.wallet[c]) &&
          r.wallet[c] >= 0 &&
          r.wallet[c] <= 1000000000,
      ))
  )
    throw Error("Coin amounts must be whole, nonnegative numbers.");
  if (
    r.inventory !== undefined &&
    (!Array.isArray(r.inventory) ||
      r.inventory.length > 1000 ||
      !r.inventory.every(
        (i) =>
          i &&
          typeof i.id === "string" &&
          /^[a-zA-Z0-9_-]{1,100}$/.test(i.id) &&
          typeof i.name === "string" &&
          i.name.length > 0 &&
          i.name.length <= 500 &&
          Number.isInteger(i.quantity) &&
          i.quantity >= 0 &&
          i.quantity <= 1000000 &&
          typeof i.source === "string" &&
          i.source.length <= 100,
      ))
  )
    throw Error("Invalid inventory.");
  if (
    r.equipmentGrants !== undefined &&
    (!r.equipmentGrants ||
      typeof r.equipmentGrants !== "object" ||
      Array.isArray(r.equipmentGrants) ||
      Object.keys(r.equipmentGrants).some(
        (k) => !["class", "background"].includes(k),
      ) ||
      Object.values(r.equipmentGrants).some(
        (g) =>
          !g ||
          !coins.every(
            (c) => Number.isInteger(g[c]) && g[c] >= 0 && g[c] <= 1000000000,
          ),
      ))
  )
    throw Error("Invalid starting equipment grant.");
  return r;
}

export function equipmentText(r, source) {
  if (source === "background")
    return backgroundDefinition(r)?.text.split(/Equipment:\s*/)[1] || "";
  if (r.classNameCustom) return "";
  const cls = characterOptions[r.rulesEdition || "2024"].classes.find(
    (c) => c.name === r.className,
  );
  return (r.rulesEdition || "2024") === "2024"
    ? cls?.core
        .split(/Starting Equipment\s*/)[1]
        ?.replace(/([a-z])-\s+([a-z])/g, "$1$2")
        .replace(/\s+/g, " ") || ""
    : cls?.features.find((f) => f.title === "Equipment")?.text || "";
}
export function equipmentPackages(text) {
  const matches = [...text.matchAll(/\(([ABC])\)\s*/g)];
  return matches.map((m, i) => ({
    name: "Option " + m[1],
    text: text
      .slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length)
      .replace(/;?\s*or\s*$/, "")
      .replace(/[;\s]+$/, "")
      .trim(),
  }));
}
export function splitItems(text) {
  return text
    .split(/,(?![^()]*\))|;|\n|\s+and\s+/)
    .map((v) => v.trim().replace(/^(?:and|or)\s+/, ""))
    .filter(Boolean);
}
export function equipmentPlan(text) {
  const wallet = Object.fromEntries(coins.map((c) => [c, 0]));
  text = text.replace(/\b(\d+)\s*(PP|GP|EP|SP|CP)\b/gi, (_, amount, c) => {
    wallet[c.toLowerCase()] += Number(amount);
    return "";
  });
  text = text
    .replace(/(?:a )?quiver of (\d+) arrows/gi, "Quiver, $1 Arrows")
    .replace(/\b(?:a )?pouch containing\s*(?=,|$)/gi, "Pouch");
  const words = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const items = splitItems(text)
    .map((name) => {
      name = name
        .replace(/^(?:a|an|the)\s+/i, "")
        .replace(
          /^(one|two|three|four|five|six|seven|eight|nine|ten)\s+/i,
          (_, word) => words[word.toLowerCase()] + " ",
        );
      const m = name.match(/^(\d+)\s+(.+)$/);
      return {
        id: crypto.randomUUID(),
        name: m ? m[2] : name,
        quantity: m ? Number(m[1]) : 1,
        source: "",
      };
    })
    .filter((i) => i.name);
  return { items, wallet };
}
export function applyEquipment(r, source, plan) {
  if (!["class", "background"].includes(source))
    throw Error("Invalid equipment source.");
  const wallet = {
      ...Object.fromEntries(coins.map((c) => [c, 0])),
      ...r.wallet,
    },
    previous = r.equipmentGrants?.[source] || {};
  for (const c of coins) {
    wallet[c] += plan.wallet[c] - (previous[c] || 0);
    if (wallet[c] < 0)
      throw Error(
        "Not enough " +
          c.toUpperCase() +
          " to replace the previous grant. Adjust currency first.",
      );
  }
  const next = {
    ...r,
    wallet,
    inventory: [
      ...(r.inventory || []).filter((i) => i.source !== "starting-" + source),
      ...plan.items.map((i) => ({ ...i, source: "starting-" + source })),
    ],
    equipmentGrants: { ...r.equipmentGrants, [source]: { ...plan.wallet } },
  };
  validateInventory(next);
  return next;
}
