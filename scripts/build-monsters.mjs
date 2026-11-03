import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const names = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const signed = (s) => Number(s.replace(/−/g, "-"));
mkdirSync("dist/presets", { recursive: true });
for (const edition of ["2014", "2024"]) {
  const corpus = JSON.parse(readFileSync(`dist/rules/${edition}.json`, "utf8")),
    byParent = new Map();
  for (const e of corpus.entries) {
    if (!byParent.has(e.parentId)) byParent.set(e.parentId, []);
    byParent.get(e.parentId).push(e);
  }
  const presets = [];
  let skipped = 0;
  const statBlock = (t) => {
    const ac = t.match(
        edition === "2014" ? /Armor Class\s+(\d+)/ : /\bAC\s+(\d+)/,
      ),
      hp = t.match(edition === "2014" ? /Hit Points\s+(\d+)/ : /\bHP\s+(\d+)/);
    return ac && hp && ac.index < 200 && hp.index < 250;
  };
  for (const e of corpus.entries) {
    if (e.category !== "Monsters") continue;
    const t = e.text,
      ac = t.match(edition === "2014" ? /Armor Class\s+(\d+)/ : /\bAC\s+(\d+)/),
      hp = t.match(edition === "2014" ? /Hit Points\s+(\d+)/ : /\bHP\s+(\d+)/);
    if (!statBlock(t)) continue;
    const abilities = {},
      saves = [];
    if (edition === "2014") {
      const block =
          t.match(/STR\s+DEX\s+CON\s+INT\s+WIS\s+CHA([\s\S]*)/i)?.[1] || "",
        values = [...block.matchAll(/\d+\s*\(([+−-]?\d+)\)/g)].slice(0, 6);
      values.forEach((v, i) => (abilities[names[i]] = signed(v[1])));
    } else
      for (const a of names) {
        const m = t.match(
          new RegExp(`${a}\\s*\\d+\\s+([+−-]\\d+)\\s+([+−-]?\\d+)`, "i"),
        );
        if (m) {
          abilities[a] = signed(m[1]);
          saves.push(
            `${a} ${/^[+−-]/.test(m[2]) ? m[2].replace(/−/g, "-") : "check source"}`,
          );
        }
      }
    if (Object.keys(abilities).length !== 6) {
      skipped++;
      continue;
    }
    const descendants = [];
    function walk(id) {
      for (const c of byParent.get(id) || []) {
        if (statBlock(c.text)) continue;
        descendants.push(c);
        walk(c.id);
      }
    }
    walk(e.id);
    const details = descendants
      .map((c) => `${c.title}\n${c.text}`)
      .join("\n\n");
    const initiative = t.match(/Initiative\s+([+−-]\d+)/);
    const preset = {
      id: `preset-${e.id}`,
      kind: "monster",
      name: e.title,
      ac: Number(ac[1]),
      maxHp: Number(hp[1]),
      speed: (
        t.match(
          /Speed\s+([^\n]+?)(?=\s*(?:STR|MOD SAVE|Saving Throws|Skills|Senses|Languages|Challenge|CR)|$)/im,
        )?.[1] || ""
      ).trim(),
      initiative: initiative ? signed(initiative[1]) : abilities.DEX,
      level: 1,
      className: "",
      ancestry: "",
      abilities,
      saves:
        edition === "2014"
          ? (
              t.match(
                /Saving Throws\s+(.+?)(?=Skills|Damage|Condition|Senses|Languages|Challenge)/s,
              )?.[1] || ""
            ).trim()
          : saves.join(", "),
      skills: (
        t.match(
          /Skills\s+(.+?)(?=Gear|Resistances|Immunities|Damage|Condition|Senses|Languages|Challenge|CR)/s,
        )?.[1] || ""
      ).trim(),
      attacks: "",
      features: t + (details ? "\n\n" + details : ""),
      notes: "",
      sheetId: null,
      source: { edition, page: e.page, name: corpus.source },
      challenge: t.match(/\b(?:CR|Challenge)\s+([\d/]+)/)?.[1] || "",
    };
    presets.push(preset);
  }
  presets.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(
    `dist/presets/monsters-${edition}.json`,
    JSON.stringify({
      edition,
      source: corpus.source,
      sourceSha256: corpus.sourceSha256,
      presets,
      skipped,
    }),
  );
  console.log(
    edition,
    presets.length,
    "presets;",
    skipped,
    "unparsed stat blocks omitted",
  );
}
