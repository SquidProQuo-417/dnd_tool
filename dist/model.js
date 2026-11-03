export const uid = () => globalThis.crypto.randomUUID();
export const categories = [
  "Sessions",
  "Characters",
  "Locations",
  "Factions",
  "Encounters",
  "Ideas",
];
export function createCampaign(
  name = "The Saltwind Chronicle",
  edition = "2024",
  sample = true,
) {
  const captain = uid(),
    scout = uid(),
    crew = uid(),
    island = uid(),
    opening = uid(),
    hook = uid(),
    portrait = uid();
  return {
    format: "waypoint-campaign",
    version: 1,
    id: uid(),
    name,
    edition,
    updatedAt: new Date().toISOString(),
    notes: sample
      ? [
          {
            id: opening,
            title: "Session 01 · A debt to the sea",
            category: "Sessions",
            body: "OPENING SCENE\n\nRain against the windows. A lantern burning blue. Captain Vey has a proposition—and very little time.\n\nThe crew must reach the drowned observatory before the spring tide. Someone else has the same map.\n\nBEFORE THE SESSION\n\n• Decide what the captain is hiding.\n• Give each character a reason to board the ship.\n• Prepare three rumors about the island.",
          },
          {
            id: island,
            title: "The Drowned Observatory",
            category: "Locations",
            body: "An old observatory on a tidal island. At low tide, a narrow causeway emerges.\n\nThe lens still follows a star that no one else can see.\n\nSensory details: salt-white stone, distant bells, wet rope.",
          },
        ]
      : [],
    characters: sample
      ? [
          {
            id: captain,
            name: "Captain Mara Vey",
            role: "Captain · The Saltwind",
            color: "sea",
            groupIds: [crew],
            components: [
              {
                id: uid(),
                type: "Statistics",
                label: "Core statistics",
                value:
                  "AC 14 · HP 32 · Speed 30 ft\nSTR +2 · DEX +3 · CON +1 · INT +1 · WIS +2 · CHA +3",
              },
              {
                id: uid(),
                type: "Weapon",
                label: "Weathered cutlass",
                value: "Attack +5 · Damage 1d6 + 3 slashing",
              },
              {
                id: uid(),
                type: "Notes",
                label: "A private fear",
                value: "She recognizes the signal from the observatory.",
              },
            ],
          },
          {
            id: scout,
            name: "Finch",
            role: "Lookout · The Saltwind",
            color: "moss",
            groupIds: [crew],
            components: [
              {
                id: uid(),
                type: "Ammunition",
                label: "Arrows",
                value: "18 / 20",
              },
              {
                id: uid(),
                type: "Notes",
                label: "First impression",
                value: "Always looking toward the horizon.",
              },
            ],
          },
        ]
      : [],
    groups: sample ? [{ id: crew, name: "The Saltwind crew" }] : [],
    cards: sample
      ? [
          {
            id: hook,
            title: "A lantern burning blue",
            body: "The opening image. Why does its light point out to sea?",
            kind: "Idea",
            x: 70,
            y: 85,
            image: null,
            characterId: null,
          },
          {
            id: portrait,
            title: "An unreliable guide",
            body: "What is the captain willing to risk?",
            kind: "Character",
            x: 450,
            y: 85,
            image: null,
            characterId: captain,
          },
          {
            id: uid(),
            title: "The Drowned Observatory",
            body: "A place that only exists at low tide. Link the arrival to a difficult choice.",
            kind: "Location",
            x: 260,
            y: 400,
            image: null,
            characterId: null,
          },
        ]
      : [],
    connections: [],
  };
}
const string = (v, max = 100000) => typeof v === "string" && v.length <= max;
const list = (v, max = 10000) => Array.isArray(v) && v.length <= max;
const safeId = (v) => typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v);
export function validateCampaign(p) {
  if (!p || p.format !== "waypoint-campaign" || p.version !== 1)
    throw Error("Unsupported campaign format or version.");
  if (
    !safeId(p.id) ||
    !string(p.name, 200) ||
    !p.name.trim() ||
    !["2014", "2024"].includes(p.edition)
  )
    throw Error("Invalid campaign details.");
  for (const k of ["notes", "characters", "groups", "cards", "connections"])
    if (!list(p[k])) throw Error(`Invalid ${k} collection.`);
  const seen = new Set();
  for (const k of ["notes", "characters", "groups", "cards", "connections"])
    for (const r of p[k]) {
      if (!r || !safeId(r.id) || seen.has(r.id))
        throw Error("Records need unique, safe IDs.");
      seen.add(r.id);
    }
  for (const n of p.notes)
    if (!string(n.title, 300) || !string(n.category, 100) || !string(n.body))
      throw Error("Invalid note.");
  const groupIds = new Set(p.groups.map((g) => g.id)),
    charIds = new Set(p.characters.map((c) => c.id)),
    cardIds = new Set(p.cards.map((c) => c.id));
  for (const g of p.groups)
    if (!string(g.name, 200)) throw Error("Invalid group.");
  for (const c of p.characters) {
    if (
      !string(c.name, 200) ||
      !string(c.role, 300) ||
      !list(c.groupIds, 100) ||
      !c.groupIds.every((id) => groupIds.has(id)) ||
      !list(c.components, 200)
    )
      throw Error("Invalid character or group reference.");
    for (const m of c.components) {
      if (
        !safeId(m.id) ||
        seen.has(m.id) ||
        !string(m.type, 100) ||
        !string(m.label, 200) ||
        !string(m.value)
      )
        throw Error("Invalid character component.");
      seen.add(m.id);
    }
  }
  for (const c of p.cards) {
    if (
      !string(c.title, 300) ||
      !string(c.body) ||
      !["Idea", "Character", "Location", "Encounter"].includes(c.kind) ||
      ![c.x, c.y].every((v) => Number.isFinite(v) && v >= 0 && v <= 4000) ||
      (c.characterId && !charIds.has(c.characterId))
    )
      throw Error("Invalid board card.");
    if (
      c.image != null &&
      (!string(c.image, 4500000) ||
        !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
          c.image,
        ))
    )
      throw Error("Invalid image. Use an embedded PNG, JPEG, WebP or GIF.");
  }
  for (const l of p.connections)
    if (
      !cardIds.has(l.from) ||
      !cardIds.has(l.to) ||
      l.from === l.to ||
      !string(l.label, 200)
    )
      throw Error("Invalid board connection.");
  return p;
}
export function importCampaign(text) {
  if (text.length > 25000000)
    throw Error("Campaign exceeds the 25 MB import limit.");
  const p = validateCampaign(JSON.parse(text));
  p.id = uid();
  p.updatedAt = new Date().toISOString();
  return p;
}
export function removeCard(p, id) {
  p.cards = p.cards.filter((c) => c.id !== id);
  p.connections = p.connections.filter((c) => c.from !== id && c.to !== id);
}
export function rollDice(
  expression,
  random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
) {
  const m = /^(\d{1,2})d(4|6|8|10|12|20|100)(?:\s*([+-])\s*(\d{1,3}))?$/i.exec(
    expression.trim(),
  );
  if (!m || +m[1] < 1 || +m[1] > 50)
    throw Error("Use 1–50 dice, such as 2d6+3 or 1d20.");
  const rolls = Array.from(
    { length: +m[1] },
    () => 1 + Math.floor(random() * +m[2]),
  );
  const modifier = (m[3] === "-" ? -1 : 1) * +(m[4] || 0);
  return { rolls, modifier, total: rolls.reduce((a, b) => a + b, modifier) };
}
