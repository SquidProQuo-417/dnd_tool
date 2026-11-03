import { characterOptions } from "./character-options.js";
import { renderReference } from "./rule-content.js";

const skills = [
  "Acrobatics",
  "Animal Handling",
  "Arcana",
  "Athletics",
  "Deception",
  "History",
  "Insight",
  "Intimidation",
  "Investigation",
  "Medicine",
  "Nature",
  "Perception",
  "Performance",
  "Persuasion",
  "Religion",
  "Sleight of Hand",
  "Stealth",
  "Survival",
];
const abilities = [
  "Strength",
  "Dexterity",
  "Constitution",
  "Intelligence",
  "Wisdom",
  "Charisma",
];
const headings = [
  "Ability Score Increase",
  "Creature Type",
  "Age",
  "Alignment",
  "Size",
  "Speed",
  "Darkvision",
  "Dwarven Resilience",
  "Dwarven Combat Training",
  "Tool Proficiency",
  "Stonecunning",
  "Dwarven Toughness",
  "Dwarven Toughness",
  "Fey Ancestry",
  "Keen Senses",
  "Trance",
  "Elf Weapon Training",
  "Cantrip",
  "Extra Language",
  "Lucky",
  "Brave",
  "Halfling Nimbleness",
  "Naturally Stealthy",
  "Draconic Ancestry",
  "Breath Weapon",
  "Damage Resistance",
  "Draconic Flight",
  "Gnomish Cunning",
  "Gnomish Lineage",
  "Artificer’s Lore",
  "Tinker",
  "Skill Versatility",
  "Menacing",
  "Relentless Endurance",
  "Savage Attacks",
  "Hellish Resistance",
  "Infernal Legacy",
  "Languages",
  "Elven Lineage",
  "Giant Ancestry",
  "Large Form",
  "Powerful Build",
  "Resourceful",
  "Skillful",
  "Versatile",
  "Adrenaline Rush",
  "Fiendish Legacy",
  "Otherworldly Presence",
  "Druidic",
  "Dwarven Resilience",
  "Dwarven Toughness",
  "Stonecunning",
  "Halfling Nimbleness",
  "Naturally Stealthy",
  "Bonus Unarmed Strike",
  "Martial Arts Die",
  "Dexterous Attacks",
  "Cantrips",
  "Prepared Spells of Level 1+",
  "Spellcasting Ability",
  "Spellcasting Focus",
];
const escapeRE = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function splitTraits(text) {
  text = text.replace(/\s+(Size|Speed):/g, ". $1:");
  const expression = new RegExp(
    "(?:^|(?<=[.?!])\\s+)(" +
      [...new Set(headings)].map(escapeRE).join("|") +
      ")[:.]\\s+",
    "g",
  );
  const matches = [...text.matchAll(expression)];
  if (!matches.length) return [{ title: "Traits", text }];
  const result = [];
  const intro = text.slice(0, matches[0].index).trim();
  if (intro) result.push({ title: "Overview", text: intro });
  matches.forEach((m, i) =>
    result.push({
      title: m[1],
      text: text
        .slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length)
        .trim(),
    }),
  );
  return result;
}
function sources(r) {
  const catalog = characterOptions[r.rulesEdition || "2024"];
  return {
    catalog,
    cls:
      !r.classNameCustom && catalog.classes.find((c) => c.name === r.className),
    species:
      !r.ancestryCustom && catalog.species.find((c) => c.name === r.ancestry),
  };
}
const plainTitle = (s) => s.replace(/^Level \d+: /, "");
const clean = (s) =>
  s.replace(/([a-z])-\s+([a-z])/g, "$1$2").replace(/\s+/g, " ");

export function featureChoices(r) {
  const { catalog, cls, species } = sources(r),
    definitions = [];
  const add = (scope, id, label, options = [], count = 1, detail = {}) =>
    definitions.push({
      key: [
        r.rulesEdition || "2024",
        scope,
        scope === "class" ? r.className : r.ancestry,
        id,
      ].join(":"),
      scope,
      id,
      label,
      options,
      count,
      ...detail,
    });
  if (cls) {
    const proficiency = clean(
      cls.core ||
        cls.features
          .filter((f) => /Proficiencies|Martial Arts/.test(f.title))
          .map((f) => f.text)
          .join(" "),
    );
    const segment = proficiency.match(
      /(?:Skill Proficiencies|Skills):?\s*Choose\s+(\d+|one|two|three|four)([\s\S]*?)(?:Weapon Proficiencies|Armor Training|Starting Equipment|$)/i,
    );
    if (segment) {
      const number =
        Number(segment[1]) ||
        { one: 1, two: 2, three: 3, four: 4 }[segment[1].toLowerCase()];
      const available = /any/.test(segment[2])
        ? skills
        : skills.filter((s) => segment[2].includes(s));
      add("class", "skills", "Class skills", available, number);
    }
    if (/(?:Tool Proficiencies\s+|Tools:\s*)Choose/i.test(proficiency)) {
      const count =
        Number(
          proficiency.match(/Tool Proficiencies\s+Choose\s+(\d+)/i)?.[1],
        ) || 1;
      add("class", "tools", "Tool / instrument", [], count, { free: true });
    }
    if (
      cls.features.some((f) => f.title === "Equipment") ||
      /Starting Equipment/.test(cls.core)
    )
      add("class", "equipment", "Starting equipment", [], 1, { free: true });
    for (const f of cls.features.filter((f) => f.level <= r.level)) {
      const title = plainTitle(f.title);
      if (title === "Fighting Style" || title === "Additional Fighting Style") {
        const rows =
          (r.rulesEdition || "2024") === "2024"
            ? catalog.feats.filter((f) =>
                f.path.includes("Fighting Style Feats"),
              )
            : cls.features.filter((x) => x.path?.at(-2) === "Fighting Style");
        add(
          "class",
          title,
          title,
          rows.map((x) => x.title),
          1,
          { details: rows },
        );
      } else if (title === "Divine Order")
        add("class", title, title, ["Protector", "Thaumaturge"]);
      else if (title === "Primal Order")
        add("class", title, title, ["Magician", "Warden"]);
      else if (
        /choice|choose|select/i.test(f.text) &&
        !["Equipment", "Proficiencies"].includes(title) &&
        !f.path?.includes("Fighting Style")
      ) {
        // Record choices not yet modeled as a specialized picker without silently choosing a benefit.
        add("class", title, title + " selections", [], 1, { free: true });
      }
    }
  }
  if (species) {
    const ed = r.rulesEdition || "2024",
      name = species.name;
    if (ed === "2024") {
      if (name === "Elf") {
        add("species", "lineage", "Elven lineage", [
          "Drow",
          "High Elf",
          "Wood Elf",
        ]);
        add("species", "keen-senses", "Keen Senses skill", [
          "Insight",
          "Perception",
          "Survival",
        ]);
      }
      if (name === "Gnome")
        add("species", "lineage", "Gnomish lineage", [
          "Forest Gnome",
          "Rock Gnome",
        ]);
      if (name === "Tiefling")
        add("species", "lineage", "Fiendish legacy", [
          "Abyssal",
          "Chthonic",
          "Infernal",
        ]);
      if (["Elf", "Gnome", "Tiefling"].includes(name))
        add("species", "spell-ability", "Lineage spellcasting ability", [
          "Intelligence",
          "Wisdom",
          "Charisma",
        ]);
      if (name === "Goliath")
        add("species", "giant", "Giant ancestry", [
          "Cloud’s Jaunt (Cloud Giant)",
          "Fire’s Burn (Fire Giant)",
          "Frost’s Chill (Frost Giant)",
          "Hill’s Tumble (Hill Giant)",
          "Stone’s Endurance (Stone Giant)",
          "Storm’s Thunder (Storm Giant)",
        ]);
      if (["Human", "Tiefling"].includes(name))
        add("species", "size", "Size", ["Small", "Medium"]);
      if (name === "Human") {
        add("species", "skill", "Skillful", skills);
        add(
          "species",
          "origin-feat",
          "Origin feat",
          catalog.feats
            .filter((f) => f.path.includes("Origin Feats"))
            .map((f) => f.title),
          1,
          {
            details: catalog.feats.filter((f) =>
              f.path.includes("Origin Feats"),
            ),
          },
        );
        const origin =
          r.featureChoices?.[
            [ed, "species", name, "origin-feat"].join(":")
          ]?.[0];
        if (origin === "Skilled")
          add("species", "skilled-options", "Skilled proficiency", skills, 3);
        if (origin === "Magic Initiate") {
          add("species", "initiate-list", "Magic Initiate spell list", [
            "Cleric",
            "Druid",
            "Wizard",
          ]);
          add(
            "species",
            "initiate-ability",
            "Magic Initiate spellcasting ability",
            ["Intelligence", "Wisdom", "Charisma"],
          );
          add("species", "initiate-cantrips", "Magic Initiate cantrip", [], 2, {
            free: true,
          });
          add(
            "species",
            "initiate-spell",
            "Magic Initiate level 1 spell",
            [],
            1,
            { free: true },
          );
        }
      }
    } else {
      const subraces = species.features.filter(
        (f) =>
          f.path?.length === 3 && !/Traits|Draconic Ancestry/.test(f.title),
      );
      if (subraces.length)
        add(
          "species",
          "subrace",
          "Subrace",
          subraces.map((f) => f.title),
          1,
          { details: subraces },
        );
      if (name === "Half-Elf") {
        add(
          "species",
          "ability-increase",
          "Additional ability increases",
          abilities.filter((a) => a !== "Charisma"),
          2,
        );
        add("species", "skills", "Skill Versatility", skills, 2);
      }
      if (["Human", "Half-Elf", "Elf"].includes(name))
        add("species", "language", "Extra language", [], 1, { free: true });
    }
    if (name === "Dragonborn")
      add("species", "dragon", "Draconic ancestry", [
        "Black",
        "Blue",
        "Brass",
        "Bronze",
        "Copper",
        "Gold",
        "Green",
        "Red",
        "Silver",
        "White",
      ]);
  }
  return definitions;
}

function choiceHTML(def, r, esc, readonly) {
  const values = r.featureChoices?.[def.key] || [];
  return `<div class="feature-choice" data-feature-choice="${esc(def.key)}">${Array.from(
    { length: def.count },
    (_, i) => {
      const value = values[i] || "",
        label = def.label + (def.count > 1 ? " " + (i + 1) : "");
      if (readonly)
        return `<div class="choice-value"><span>${esc(label)}</span><strong>${esc(value.replace(/^custom:/, "")) || "Not selected"}</strong></div>`;
      if (def.free)
        return `<label class="field">${esc(label)}<input name="feature-choice:${esc(def.key)}:${i}" value="${esc(value)}" maxlength="200" data-feature-choice-input></label>`;
      const custom = value.startsWith("custom:");
      return `<label class="field">${esc(label)}<select aria-label="${esc(label)}" name="feature-choice:${esc(def.key)}:${i}" data-feature-choice-input><option value="">Select</option>${def.options.map((o) => `<option value="${esc(o)}" ${value === o ? "selected" : ""} ${values.includes(o) && value !== o ? "disabled" : ""}>${esc(o)}</option>`).join("")}<option value="__custom" ${custom ? "selected" : ""}>Custom</option></select></label>${custom ? `<label class="field">Custom ${esc(label.toLowerCase())}<input name="feature-custom:${esc(def.key)}:${i}" value="${esc(value.slice(7))}" maxlength="200" data-feature-choice-input></label>` : ""}`;
    },
  ).join("")}${values
    .map((v) => def.details?.find((d) => d.title === v))
    .filter(Boolean)
    .map((d) =>
      renderReference(d.text, esc, {
        edition: r.rulesEdition || "2024",
        page: d.page,
      }),
    )
    .join("")}</div>`;
}

export function characterFeatureCards(r) {
  const { cls, species } = sources(r),
    cards = [];
  if (cls) {
    if (cls.core)
      cards.push({
        scope: "class",
        title: "Core traits",
        text: cls.core,
        page: cls.features[0]?.page || 1,
      });
    cards.push(
      ...cls.features
        .filter(
          (f) => f.level <= r.level && !f.path?.includes("Fighting Style", 1),
        )
        .map((f) => ({ ...f, scope: "class" })),
    );
  }
  if (species)
    for (const feature of species.features) {
      // Subrace traits belong to the corresponding choice, not to every member of the species.
      if (
        (r.rulesEdition || "2024") === "2014" &&
        feature.path?.length === 3 &&
        !/Traits|Draconic Ancestry/.test(feature.title)
      )
        continue;
      const traits = splitTraits(feature.text);
      cards.push(
        ...traits.map((t) => ({ ...t, scope: "species", page: feature.page })),
      );
    }
  return cards;
}

export function renderCharacterFeatures(r, esc, { readonly = false } = {}) {
  const definitions = featureChoices(r),
    cards = characterFeatureCards(r);
  if (!cards.length) return "";
  const card = (title, body, id, meta = "") =>
    `<details class="feature-card" data-feature-id="${esc(id)}"><summary><span>${esc(title)}</span>${meta ? `<small>${esc(meta)}</small>` : ""}</summary><div class="feature-card-body">${body}</div></details>`;
  return `<div class="character-features" data-character-features>${
    definitions.length
      ? `<div class="feature-group"><h3>Choices</h3>${definitions
          .map((d) => {
            const done = (r.featureChoices?.[d.key] || []).filter(
              (v) => v && v !== "custom:",
            ).length;
            return card(
              d.label,
              choiceHTML(d, r, esc, readonly),
              d.key,
              done + "/" + d.count,
            );
          })
          .join("")}</div>`
      : ""
  }${["class", "species"]
    .map((scope) => {
      const list = cards.filter((c) => c.scope === scope);
      return list.length
        ? `<div class="feature-group"><h3>${esc(scope === "class" ? r.className : r.ancestry)}</h3>${list.map((f, i) => card(f.title, renderReference(f.text, esc, { edition: r.rulesEdition || "2024", page: f.page, level: r.level }) + `<a class="reference-source" href="./rules/srd-${r.rulesEdition || "2024"}.pdf#page=${f.page}" target="_blank" rel="noopener">Source · p. ${f.page} ↗</a>`, scope + ":" + i, f.level ? "Level " + f.level : "")).join("")}</div>`
        : "";
    })
    .join("")}</div>`;
}

export function readFeatureChoices(data, r) {
  r.featureChoices = { ...(r.featureChoices || {}) };
  // Parent choices (such as an Origin feat) can reveal another set of inputs.
  for (let pass = 0; pass < 2; pass++)
    for (const def of featureChoices(r)) {
      if (!data.has("feature-choice:" + def.key + ":0")) continue;
      r.featureChoices[def.key] = Array.from({ length: def.count }, (_, i) => {
        const value = data.get("feature-choice:" + def.key + ":" + i) || "";
        return value === "__custom"
          ? "custom:" + (data.get("feature-custom:" + def.key + ":" + i) || "")
          : value;
      });
    }
  return r;
}
