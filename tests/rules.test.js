import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  searchRules,
  buildRuleTree,
  findCounterpart,
  childEntries,
} from "../dist/rules-model.js";
const editions = Object.fromEntries(
  ["2014", "2024"].map((y) => [
    y,
    JSON.parse(readFileSync(`dist/rules/${y}.json`, "utf8")),
  ]),
);
test("both corpora identify their exact bundled PDF and have navigable unique topics", () => {
  for (const [year, corpus] of Object.entries(editions)) {
    assert.ok(corpus.entries.length > 1500);
    assert.equal(
      corpus.sourceSha256,
      createHash("sha256")
        .update(readFileSync(`dist/rules/srd-${year}.pdf`))
        .digest("hex"),
    );
    const ids = new Set(corpus.entries.map((e) => e.id));
    assert.equal(ids.size, corpus.entries.length);
    for (const e of corpus.entries) {
      assert.ok(e.page >= 1 && e.page <= corpus.pageCount);
      assert.ok(e.path.length > 0);
      assert.ok(e.parentId === null || ids.has(e.parentId));
    }
    const tree = buildRuleTree(corpus.entries);
    assert.ok(tree.children.has("Combat"));
    assert.ok(tree.children.has("Spellcasting"));
    assert.ok(tree.children.has("Monsters"));
  }
});
test("question search ranks the general bonus action rule above individual monster abilities", () => {
  for (const corpus of Object.values(editions)) {
    const result = searchRules(
      corpus.entries,
      "what kinds of things can I do as a bonus action",
    );
    assert.equal(result[0].key, "bonus-action");
    assert.equal(result[0].category, "Combat");
  }
});
test("edition matching preserves the combat topic and never substitutes another category", () => {
  const old = editions[2014].entries.find(
    (e) => e.key === "hide" && e.category === "Combat",
  );
  const newer = findCounterpart(old, editions[2024].entries);
  assert.equal(newer.title, "Hide [Action]");
  assert.notEqual(old.text, newer.text);
  assert.match(newer.text, /DC 15/);
  const spellBonus = editions[2014].entries.find(
    (e) => e.key === "bonus-action" && e.category === "Spellcasting",
  );
  assert.equal(findCounterpart(spellBonus, editions[2024].entries), null);
});
test("condition entries include the low-font exhaustion sidebar in 2014", () => {
  for (const year of ["2014", "2024"]) {
    const e = editions[year].entries.find(
      (e) => e.key === "exhaustion" && e.category === "Combat",
    );
    assert.ok(e);
    assert.ok(e.text.length > 100);
  }
  assert.notEqual(
    editions[2014].entries.find((e) => e.key === "exhaustion").text,
    editions[2024].entries.find((e) => e.key === "exhaustion").text,
  );
});
test("searching and sorting do not mutate source navigation order", () => {
  const entries = editions[2024].entries,
    first = entries[0];
  searchRules(entries, "").sort((a, b) => a.title.localeCompare(b.title));
  assert.equal(entries[0], first);
  const parent = entries.find((e) => e.title === "Playing the Game");
  assert.ok(childEntries(parent, entries).length > 0);
  assert.equal(searchRules(entries, "zxyqnonexistent").length, 0);
});
