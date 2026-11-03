import { newScoreSetup, syncScores, validateSheet } from "./character-sheet.js";
export const abilityNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
export const emptyActors = () => ({
  version: 1,
  characters: [],
  monsters: [],
  participants: [],
});
export function createActor(kind, values = {}) {
  const actor = {
    id: crypto.randomUUID(),
    kind,
    name: "",
    ac: 10,
    maxHp: 1,
    speed: "30 ft.",
    initiative: 0,
    level: 1,
    rulesEdition: "2024",
    generatedFeatures: "",
    featureChoices: {},
    className: "",
    ancestry: "",
    abilities: Object.fromEntries(abilityNames.map((a) => [a, 0])),
    saves: "",
    skills: "",
    attacks: "",
    features: "",
    notes: "",
    sheetId: null,
    source: null,
    ...values,
  };
  if (kind === "character" && !values.abilities && !values.scoreSetup)
    actor.scoreSetup = newScoreSetup();
  return syncScores(actor);
}
const integer = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const text = (v, max = 100000) => typeof v === "string" && v.length <= max;
const safeId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v);
export function validateActor(r) {
  if (
    !r ||
    !safeId(r.id) ||
    !["character", "monster"].includes(r.kind) ||
    !text(r.name, 200) ||
    !r.name.trim() ||
    !integer(r.ac, 0, 100) ||
    !integer(r.maxHp, 1, 1000000) ||
    !integer(r.initiative, -100, 100) ||
    !integer(r.level, 1, 30) ||
    !r.abilities ||
    !abilityNames.every((a) => integer(r.abilities[a], -20, 30))
  )
    throw Error("Check name, HP, AC and ability modifiers.");
  for (const field of [
    "speed",
    "className",
    "ancestry",
    "saves",
    "skills",
    "attacks",
    "features",
    "notes",
  ])
    if (!text(r[field])) throw Error("Invalid character details.");
  if (
    r.rulesEdition !== undefined &&
    !["2014", "2024"].includes(r.rulesEdition)
  )
    throw Error("Invalid rules edition.");
  if (r.generatedFeatures !== undefined && !text(r.generatedFeatures, 500000))
    throw Error("Invalid generated features.");
  if (r.featureChoices !== undefined) {
    if (
      !r.featureChoices ||
      Array.isArray(r.featureChoices) ||
      typeof r.featureChoices !== "object" ||
      Object.keys(r.featureChoices).length > 500
    )
      throw Error("Invalid feature choices.");
    for (const [key, values] of Object.entries(r.featureChoices)) {
      if (
        !text(key, 300) ||
        !Array.isArray(values) ||
        values.length > 20 ||
        !values.every((v) => text(v, 207))
      )
        throw Error("Invalid feature choices.");
      const selected = values.filter((v) => v && v !== "custom:");
      if (new Set(selected).size !== selected.length)
        throw Error("Choose different options for each selection.");
    }
  }
  if (r.sheetId !== null && !safeId(r.sheetId))
    throw Error("Invalid PDF reference.");
  if (
    r.source !== null &&
    (!["2014", "2024"].includes(r.source.edition) ||
      !integer(r.source.page, 1, 1000) ||
      !text(r.source.name, 200))
  )
    throw Error("Invalid preset reference.");
  validateSheet(r);
  return r;
}
export function validateActors(data) {
  if (
    !data ||
    data.version !== 1 ||
    !["characters", "monsters", "participants"].every(
      (k) => Array.isArray(data[k]) && data[k].length <= 10000,
    )
  )
    throw Error("Invalid character library.");
  const ids = new Set();
  for (const [key, kind] of [
    ["characters", "character"],
    ["monsters", "monster"],
  ])
    for (const r of data[key]) {
      validateActor(r);
      if (r.kind !== kind || ids.has(r.id))
        throw Error("Invalid library record.");
      ids.add(r.id);
    }
  for (const p of data.participants) {
    if (
      !p ||
      !safeId(p.id) ||
      ids.has(p.id) ||
      !text(p.name, 200) ||
      !safeId(p.recordId) ||
      !["character", "monster"].includes(p.kind) ||
      !integer(p.maxHp, 1, 1000000) ||
      !integer(p.hp, 0, p.maxHp) ||
      !integer(p.tempHp, 0, 1000000) ||
      !integer(p.ac, 0, 100) ||
      !integer(p.initiative, -100, 100) ||
      !text(p.conditions, 1000)
    )
      throw Error("Invalid encounter participant.");
    validateActor(p.snapshot);
    if (p.snapshot.id !== p.recordId || p.snapshot.kind !== p.kind)
      throw Error("Invalid encounter source.");
    ids.add(p.id);
  }
  return data;
}
export function addParticipant(data, record) {
  validateActor(record);
  const number =
    data.participants
      .filter((p) => p.recordId === record.id)
      .reduce((n, p) => Math.max(n, p.instance || 0), 0) + 1;
  const p = {
    id: crypto.randomUUID(),
    recordId: record.id,
    kind: record.kind,
    name: record.name,
    instance: number,
    maxHp: record.maxHp,
    hp: record.maxHp,
    tempHp: 0,
    ac: record.ac,
    initiative: record.initiative,
    conditions: "",
    snapshot: structuredClone(record),
  };
  data.participants.push(p);
  return p;
}
export function adjustHealth(participant, amount, operation) {
  if (!integer(amount, 0, 1000000) || !["heal", "damage"].includes(operation))
    throw Error("Enter a whole, nonnegative HP amount.");
  if (operation === "heal")
    participant.hp = Math.min(participant.maxHp, participant.hp + amount);
  else {
    const absorbed = Math.min(participant.tempHp, amount);
    participant.tempHp -= absorbed;
    participant.hp = Math.max(0, participant.hp - (amount - absorbed));
  }
  return participant;
}
export function fromPreset(preset) {
  return createActor("monster", {
    ...structuredClone(preset),
    id: crypto.randomUUID(),
    kind: "monster",
    sheetId: null,
  });
}
