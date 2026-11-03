/** Rebuild the local reference from the two unmodified, CC-BY-4.0 source PDFs. */
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
const normalize = (s) =>
  s
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
const slug = (s) =>
  normalize(s)
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const sources = {
  2014: {
    name: "SRD 5.1",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.1/SRD_CC_v5.1.pdf",
    skip: 2,
  },
  2024: {
    name: "SRD 5.2.1",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    skip: 4,
  },
};
const aliases = {
  "bonus-actions": "bonus-action",
  reactions: "reaction",
  "your-turn": "your-turn",
  "the-order-of-combat": "turn-order",
  "order-of-combat": "turn-order",
  initiative: "initiative",
  "ability-checks": "ability-check",
  "saving-throws": "saving-throw",
  "opportunity-attacks": "opportunity-attack",
  spellcasting: "spellcasting",
  "casting-a-spell": "casting-a-spell",
  "short-rests": "short-rest",
  "long-rests": "long-rest",
};
function categorize(path, title) {
  const root = path[0] || "",
    key = slug(title),
    full = path.join(" ").toLowerCase();
  let group = /magic items/i.test(root)
    ? "Magic items"
    : /monster|creature|animals/i.test(root)
      ? "Monsters"
      : /spell/i.test(root)
        ? "Spellcasting"
        : /equipment/i.test(root)
          ? "Equipment"
          : /race|class|character|feat|background|beyond 1st|^(Barbarian|Bard|Cleric|Druid|Fighter|Monk|Paladin|Ranger|Rogue|Sorcerer|Warlock|Wizard)$/i.test(
                root,
              )
            ? "Character options"
            : /combat|conditions/i.test(root)
              ? "Combat"
              : /adventur/i.test(root)
                ? "Exploration"
                : /ability|abilities/i.test(root)
                  ? "Core mechanics"
                  : /glossary/i.test(root)
                    ? "Rules glossary"
                    : /gameplay|game master|running|appendix/i.test(root)
                      ? "Game mastering"
                      : "Core mechanics";
  let route = path.slice(0, -1);
  if (route[0]?.toLowerCase() === group.toLowerCase()) route.shift();
  const turn = {
    "bonus-action": ["Turn order", "Your turn", "Actions"],
    "bonus-actions": ["Turn order", "Your turn", "Actions"],
    reaction: ["Turn order", "Reactions"],
    reactions: ["Turn order", "Reactions"],
    "your-turn": ["Turn order"],
    initiative: ["Turn order"],
    "the-order-of-combat": ["Turn order"],
    "order-of-combat": ["Turn order"],
  };
  if (
    turn[key] &&
    ["Combat", "Core mechanics", "Rules glossary"].includes(group)
  ) {
    group = "Combat";
    route = turn[key];
  } else if (
    /^(attack|dash|disengage|dodge|help|hide|ready|search|study|influence|utilize|magic|cast-a-spell|actions|actions-in-combat)$/.test(
      key,
    ) &&
    ["Combat", "Core mechanics", "Rules glossary"].includes(group)
  ) {
    group = "Combat";
    route = ["Turn order", "Your turn", "Actions"];
  } else if (
    /^(blinded|charmed|deafened|exhaustion|frightened|grappled|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)$/.test(
      key,
    )
  ) {
    group = "Combat";
    route = ["Conditions"];
  } else if (root === "Playing the Game") {
    if (/combat|attacks|damage|movement/i.test(full)) {
      group = "Combat";
      route = path.slice(1, -1);
    } else if (/exploration|rest|travel|vision|light/i.test(full)) {
      group = "Exploration";
      route = path.slice(1, -1);
    } else {
      group = "Core mechanics";
      route = path.slice(1, -1);
    }
  }
  return {
    category: group,
    path: [group, ...route].filter((x, i, a) => i === 0 || x !== a[i - 1]),
  };
}
for (const [edition, source] of Object.entries(sources)) {
  const bytes = readFileSync(`dist/rules/srd-${edition}.pdf`),
    task = getDocument({
      data: new Uint8Array(bytes),
      useSystemFonts: true,
      cMapUrl: path.resolve("node_modules/pdfjs-dist/cmaps") + "/",
      standardFontDataUrl:
        path.resolve("node_modules/pdfjs-dist/standard_fonts") + "/",
    });
  const doc = await task.promise;
  const entries = [],
    stack = [];
  let current = null;
  function append(line) {
    if (!current) return;
    const previous = current._last;
    const table = line.text.includes("\t"),
      newParagraph =
        !previous ||
        (line.page === previous.page &&
          line.col === previous.col &&
          previous.y - line.y > 18) ||
        /^[•●]/.test(line.text) ||
        table ||
        previous.table;
    const text = line.text.trim();
    if (!text) return;
    if (
      current.text &&
      table &&
      previous?.table &&
      line.page === previous.page &&
      line.col === previous.col
    )
      current.text += "\n";
    else if (current.text && newParagraph) current.text += "\n\n";
    else if (current.text && !current.text.endsWith("-")) current.text += " ";
    else if (current.text.endsWith("-"))
      current.text = current.text.slice(0, -1);
    current.text += text;
    current._last = { ...line, table };
  }
  for (
    let pageNumber = source.skip + 1;
    pageNumber <= doc.numPages;
    pageNumber++
  ) {
    if (edition === "2014" && [84, 90].includes(pageNumber)) {
      const title = pageNumber === 84 ? "Adventuring" : "Combat",
        id = `${edition}-${entries.length + 1}-${slug(title)}`;
      stack.length = 0;
      stack.push({ title, level: 1, id });
      current = {
        id,
        title,
        key: slug(title),
        sourcePath: [title],
        parentId: null,
        text: "",
        page: pageNumber,
        level: 1,
        ...categorize([title], title),
      };
      entries.push(current);
    }
    const page = await doc.getPage(pageNumber),
      content = await page.getTextContent(),
      width = page.getViewport({ scale: 1 }).width;
    const columns = [[], []];
    for (const item of content.items) {
      if (!item.str?.trim() || !item.transform) continue;
      const x = item.transform[4],
        y = item.transform[5];
      if (y < 45 || y > page.getViewport({ scale: 1 }).height - 35) continue;
      const col = x < width / 2 ? 0 : 1;
      let line = columns[col].find((l) => Math.abs(l.y - y) < 2);
      if (!line) {
        line = { x, y, col, page: pageNumber, items: [] };
        columns[col].push(line);
      }
      line.items.push(item);
    }
    for (const lines of columns) {
      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.items.sort((a, b) => a.transform[4] - b.transform[4]);
        let end = null,
          text = "";
        for (const item of line.items) {
          const x = item.transform[4],
            gap = end === null ? 0 : x - end;
          if (text && !text.endsWith(" ") && gap > 1)
            text += gap > 9 ? "\t" : " ";
          text += item.str;
          end = x + item.width;
        }
        line.text = text
          .normalize("NFKC")
          .replace(/\u00ad/g, "")
          .trim();
        const h = Math.max(...line.items.map((i) => i.height)),
          exhaustionSidebar =
            edition === "2014" &&
            pageNumber === 358 &&
            line.text === "Exhaustion",
          heading =
            (h >= 11.8 || exhaustionSidebar) &&
            (h >= 24 || line.x < 100 || (line.x > 300 && line.x < 355)) &&
            line.text.length < 130 &&
            !line.text.includes("\t");
        if (heading) {
          const title = normalize(line.text),
            level = exhaustionSidebar
              ? 2
              : h >= 24
                ? 1
                : h >= 17
                  ? 2
                  : h >= 13
                    ? 3
                    : 4;
          if (
            current &&
            current._headingLevel === level &&
            current._headingPage === pageNumber &&
            current._headingCol === line.col &&
            !current.text &&
            current._headingY - line.y < h * 1.55
          ) {
            current.title += " " + title;
            stack[stack.length - 1].title = current.title;
            current._headingY = line.y;
            continue;
          }
          while (stack.length && stack.at(-1).level >= level) stack.pop();
          const sourcePath = [...stack.map((s) => s.title), title];
          const id = `${edition}-${entries.length + 1}-${slug(title).slice(0, 70)}`;
          current = {
            id,
            title,
            key: aliases[slug(title)] || slug(title),
            sourcePath,
            parentId: stack.at(-1)?.id || null,
            text: "",
            page: pageNumber,
            level,
            ...categorize(sourcePath, title),
            _headingLevel: level,
            _headingY: line.y,
            _headingPage: pageNumber,
            _headingCol: line.col,
          };
          entries.push(current);
          stack.push({ title, level, id });
        } else append(line);
      }
    }
  }
  for (const e of entries) {
    for (const k of Object.keys(e)) if (k.startsWith("_")) delete e[k];
    e.text = e.text.replace(/\n{3,}/g, "\n\n").trim();
  }
  // Include child text when reading a parent topic, without duplicating it in the data.
  const result = {
    edition,
    source: source.name,
    sourceUrl: source.url,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    pageCount: doc.numPages,
    entries,
  };
  writeFileSync(`dist/rules/${edition}.json`, JSON.stringify(result));
  console.log(
    `${edition}: ${entries.length} topics, ${doc.numPages} pages, ${Math.round(JSON.stringify(result).length / 1024)} KB`,
  );
  console.log(
    "Main sections:",
    entries
      .filter((e) => e.level === 1)
      .map((e) => e.title)
      .join(" | "),
  );
  await task.destroy();
}
