// Render extracted reference text as paragraphs, lists and bounded tables.
export function referenceBlocks(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .replace(/([a-z])-\s+([a-z])/g, "$1$2")
    .split("\n");
  const blocks = [];
  for (let i = 0; i < lines.length;) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }
    if (line.includes("\t")) {
      const rows = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) {
          i++;
          if (!lines[i]?.includes("\t")) break;
          continue;
        }
        if (!current.includes("\t")) break;
        const cells = current.split(/\t+/).map((s) => s.trim());
        if (cells.at(-1)?.includes(" ") && /^[\d—− ]+$/.test(cells.at(-1)))
          cells.splice(-1, 1, ...cells.at(-1).split(/\s+/));
        rows.push(cells);
        i++;
      }
      const width = Math.max(...rows.map((r) => r.length));
      if (
        rows.length > 1 &&
        rows.every((r) => r.length === width) &&
        width > 1
      ) {
        const hasHeader = rows[0].every((c) => !/^[-+−—\d]/.test(c));
        const headers = hasHeader ? rows.shift() : null;
        if (headers && rows.length === 20 && !/^Level$/i.test(headers[0])) {
          headers.unshift("Level");
          rows.forEach((row, i) => row.unshift(String(i + 1)));
        }
        blocks.push({ type: "table", headers, rows });
      } else blocks.push({ type: "source-table" });
      continue;
    }
    if (/^[•●]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[•●]\s/.test(lines[i].trim()))
        items.push(lines[i++].trim().replace(/^[•●]\s*/, ""));
      blocks.push({ type: "list", items });
      continue;
    }
    blocks.push({ type: "paragraph", text: line });
    i++;
  }
  return blocks;
}

export function renderReference(
  text,
  esc,
  { edition = "2024", page = 1, level } = {},
) {
  text = String(text || "")
    .replace(
      /(?<=[.!?])\s+(?=(?:Bonus Unarmed Strike|Martial Arts Die|Dexterous Attacks|Cantrips|Prepared Spells of Level 1\+|Spellcasting Ability|Spellcasting Focus|Spell Slots|Preparing and Casting Spells|Ritual Casting|Regaining Expended Uses|Prerequisites|Repeatable)\.\s)/g,
      "\n\n",
    )
    .replace(
      /property You gain the following/,
      "property.\n\nYou gain the following",
    );
  const source = `<a class="reference-source" href="./rules/srd-${edition}.pdf#page=${page}" target="_blank" rel="noopener">View source table ↗</a>`;
  if (/^Core \w+ Traits/.test(text)) {
    const normalized = text
      .replace(/([a-z])-\s+([a-z])/g, "$1$2")
      .replace(
        /Saving Throw\s*([^]*?)\s*Proficiencies/,
        "Saving throw proficiencies $1",
      )
      .replace(/\s+/g, " ");
    const labels = [
      "Primary Ability",
      "Hit Point Die",
      "Saving throw proficiencies",
      "Skill Proficiencies",
      "Weapon Proficiencies",
      "Tool Proficiencies",
      "Armor Training",
      "Starting Equipment",
    ];
    const positions = labels
      .map((label) => ({ label, index: normalized.indexOf(label) }))
      .filter((p) => p.index >= 0)
      .sort((a, b) => a.index - b.index);
    return `<dl class="reference-facts">${positions.map((p, i) => `<div><dt>${esc(p.label)}</dt><dd>${esc(normalized.slice(p.index + p.label.length, positions[i + 1]?.index || normalized.length).trim())}</dd></div>`).join("")}</dl>`;
  }
  return `<div class="rule-content">${referenceBlocks(text)
    .map((b) => {
      if (b.type === "table") {
        const table = (rows) =>
          `<div class="reference-table-scroll" tabindex="0" role="region" aria-label="Reference table"><table>${b.headers ? `<thead><tr>${b.headers.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
        const current =
          b.headers?.[0] === "Level" && b.rows.length === 20 && level
            ? b.rows.find((row) => parseInt(row[0], 10) === level)
            : null;
        return current
          ? table([current]) +
              `<details class="reference-full-table"><summary>All levels</summary>${table(b.rows)}</details>`
          : table(b.rows);
      }
      if (b.type === "list")
        return `<ul>${b.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
      if (b.type === "source-table") return source;
      const heading = b.text.match(
        /^([A-Z][\w’'-]*(?: [A-Z][\w’'+-]*){0,5})\.\s+/,
      );
      return heading
        ? `<p><strong>${esc(heading[1])}.</strong> ${esc(b.text.slice(heading[0].length))}</p>`
        : `<p>${esc(b.text)}</p>`;
    })
    .join("")}</div>`;
}
