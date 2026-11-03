import fs from "node:fs";
const classes = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];
const catalog = {};
for (const edition of ["2014", "2024"]) {
  const { entries } = JSON.parse(
    fs.readFileSync("dist/rules/" + edition + ".json"),
  );
  // PDF columns place two continuation tables under neighboring species.
  // Move them to their actual owners before building the character catalog.
  if (edition === "2024") {
    const speciesEntry = (name) =>
      entries.find(
        (e) => e.title === name && e.sourcePath[2] === "Species Descriptions",
      );
    const human = speciesEntry("Human"),
      tiefling = speciesEntry("Tiefling"),
      gnome = speciesEntry("Gnome"),
      elf = speciesEntry("Elf");
    const fiendish = human.text.indexOf("Fiendish Legacies");
    if (fiendish >= 0) {
      tiefling.text += "\n\n" + human.text.slice(fiendish);
      human.text = human.text.slice(0, fiendish).trim();
    }
    const elfSpells = gnome.text.match(
      /Level 3\tLevel 5\nFaerie Fire\tDarkness\nDetect Magic\tMisty Step\nLongstrider\tPass without Trace/,
    );
    if (elfSpells) {
      gnome.text = gnome.text.replace(elfSpells[0], "").replace(/\n{3,}/g, " ");
      elf.text +=
        "\n\nElven lineage spells\nLineage\tLevel 3\tLevel 5\nDrow\tFaerie Fire\tDarkness\nHigh Elf\tDetect Magic\tMisty Step\nWood Elf\tLongstrider\tPass without Trace";
    }
    const dragon = speciesEntry("Dragonborn");
    dragon.text = dragon.text.replace(
      /Dragon Damage Type\tDragon Damage Type\n((?:[^\n]+\n?){5})/,
      (_, body) => {
        const pairs = body
          .trim()
          .split("\n")
          .flatMap((row) => {
            const c = row.split("\t");
            return [c.slice(0, 2).join("\t"), c.slice(2).join("\t")];
          });
        return "Dragon\tDamage type\n" + pairs.join("\n") + "\n";
      },
    );
    elf.text = elf.text
      .replace(
        /Elven Lineages\n\nLineage\tLevel 1\n[\s\S]*?Intelligence, Wisdom/,
        "Elven Lineages\nLineage\tLevel 1\tLevel 3\tLevel 5\nDrow\t120-ft. Darkvision; Dancing Lights\tFaerie Fire\tDarkness\nHigh Elf\tPrestidigitation; replace with another Wizard cantrip after a Long Rest\tDetect Magic\tMisty Step\nWood Elf\t35-ft. Speed; Druidcraft\tLongstrider\tPass without Trace\n\nIntelligence, Wisdom",
      )
      .replace(/\n\nElven lineage spells[\s\S]*$/, "");
    tiefling.text = tiefling.text
      .replace(
        /\n\nLevel 3\tLevel 5\nRay of Sickness\tHold Person\nFalse Life\tRay of Enfeeblement\nHellish Rebuke\tDarkness/,
        "",
      )
      .replace(
        /Fiendish Legacies[\s\S]*$/,
        "Fiendish Legacies\nLegacy\tLevel 1\tLevel 3\tLevel 5\nAbyssal\tPoison Resistance; Poison Spray\tRay of Sickness\tHold Person\nChthonic\tNecrotic Resistance; Chill Touch\tFalse Life\tRay of Enfeeblement\nInfernal\tFire Resistance; Fire Bolt\tHellish Rebuke\tDarkness",
      );
    const monk = entries.find(
      (e) =>
        e.title === "Level 1: Martial Arts" && e.sourcePath.includes("Monk"),
    );
    if (monk)
      monk.text = monk.text.replace(
        /Martial\tFocus\tUnarmored\nArts\tPoints\tMovement\n([\s\S]*)/,
        (_, rows) =>
          "Monk progression\nLevel\tMartial Arts die\tFocus Points\tExtra movement\n" +
          rows
            .trim()
            .split("\n")
            .map((row, i) => i + 1 + "\t" + row)
            .join("\n"),
      );
  }
  if (edition === "2014") {
    const monkEntry = (title) =>
      entries.find((e) => e.title === title && e.sourcePath[0] === "Monk");
    const martial = monkEntry("Martial Arts"),
      equipment = monkEntry("Equipment"),
      proficiency = monkEntry("Proficiencies");
    const weapons = martial.text.indexOf("Weapons:");
    if (weapons >= 0) {
      proficiency.text += " " + martial.text.slice(weapons);
      martial.text = martial.text.slice(0, weapons).trim();
    }
    const benefits = equipment.text.indexOf("You gain the following benefits");
    if (benefits >= 0) {
      martial.text += "\n\n" + equipment.text.slice(benefits);
      equipment.text = equipment.text.split("\n\nFeatures ")[0].trim();
    }
    martial.text += "\n\nMonk progression\n" + monkEntry("The Monk").text;
  }
  const descendants = (root) =>
    entries.filter(
      (e) =>
        e.sourcePath.length > root.sourcePath.length &&
        root.sourcePath.every((s, i) => e.sourcePath[i] === s),
    );
  const block = (e) => ({
    title: e.title,
    text: e.text,
    page: e.page,
    path: e.sourcePath,
  });
  const classData = classes.map((name) => {
    const root = entries.find(
      (e) =>
        e.title === name &&
        (edition === "2014"
          ? e.sourcePath.length === 1
          : e.sourcePath.join("/") === "Classes/" + name),
    );
    const all = descendants(root);
    const featureRoot = all.find(
      (e) =>
        e.title ===
        (edition === "2014" ? "Class Features" : name + " Class Features"),
    );
    const features = descendants(featureRoot);
    const table = features.find((e) => e.title === "The " + name)?.text || "";
    const levelOf = (e) => {
      if (edition === "2024")
        return Number(e.title.match(/^Level (\d+):/)?.[1] || 1);
      const row = table
        .split("\n")
        .find(
          (line) =>
            /^\d+(st|nd|rd|th)\s/.test(line) &&
            line.toLowerCase().includes(e.title.toLowerCase()),
        );
      return Number(
        row?.match(/^\d+/)?.[0] ||
          e.text
            .slice(0, 180)
            .match(
              /(?:at|starting at|beginning at|reach)\s+(\d+)(?:st|nd|rd|th) level/i,
            )?.[1] ||
          1,
      );
    };
    return {
      name,
      core:
        edition === "2024" ? root.text.split(name + " Features")[0].trim() : "",
      features: features
        .filter((e) => e.text && !/^The /.test(e.title))
        .map((e) => ({
          ...block(e),
          level: Math.max(
            levelOf(e),
            ...features
              .filter(
                (p) =>
                  p.sourcePath.length < e.sourcePath.length &&
                  p.sourcePath.every((s, i) => e.sourcePath[i] === s),
              )
              .map(levelOf),
          ),
        })),
    };
  });
  const speciesRoots = entries.filter((e) =>
    edition === "2014"
      ? e.sourcePath.length === 2 &&
        e.sourcePath[0] === "Races" &&
        e.title !== "Racial Traits"
      : e.sourcePath.length === 4 && e.sourcePath[2] === "Species Descriptions",
  );
  const species = speciesRoots.map((root) => ({
    name: root.title,
    features: [root, ...descendants(root)].filter((e) => e.text).map(block),
  }));
  const feats = entries
    .filter(
      (e) =>
        e.sourcePath.includes("Origin Feats") ||
        e.sourcePath.includes("Fighting Style Feats"),
    )
    .filter((e) => e.text)
    .map(block);
  catalog[edition] = { classes: classData, species, feats };
}
fs.writeFileSync(
  "dist/character-options.js",
  "// Generated from the bundled CC-licensed SRDs. See rules/ATTRIBUTION.txt.\nexport const characterOptions = " +
    JSON.stringify(catalog) +
    ";\n",
);
console.log(
  Object.entries(catalog)
    .map(
      ([e, c]) =>
        e +
        ": " +
        c.classes.length +
        " classes, " +
        c.species.length +
        " species",
    )
    .join("\n"),
);
