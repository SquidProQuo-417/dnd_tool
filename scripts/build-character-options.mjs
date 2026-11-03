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
  const descendants = (root) =>
    entries.filter(
      (e) =>
        e.sourcePath.length > root.sourcePath.length &&
        root.sourcePath.every((s, i) => e.sourcePath[i] === s),
    );
  const block = (e) => ({ title: e.title, text: e.text, page: e.page });
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
      core: edition === "2024" ? root.text.split(name + " Features")[0].trim() : "",
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
  catalog[edition] = { classes: classData, species };
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
