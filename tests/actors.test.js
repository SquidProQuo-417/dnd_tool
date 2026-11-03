import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { characterOptions } from "../dist/character-options.js";
import { applyCharacterOptions } from "../dist/character-builder.js";
import {
  featureChoices,
  characterFeatureCards,
  readFeatureChoices,
} from "../dist/character-features.js";
import { referenceBlocks, renderReference } from "../dist/rule-content.js";

test("feature cards keep species data separate and cover all catalog options", () => {
  const human = characterOptions["2024"].species.find(
    (s) => s.name === "Human",
  );
  const gnome = characterOptions["2024"].species.find(
    (s) => s.name === "Gnome",
  );
  assert.doesNotMatch(JSON.stringify(human), /Fiendish|Poison Spray/);
  assert.doesNotMatch(JSON.stringify(gnome), /Faerie Fire|Pass without Trace/);
  assert.match(
    JSON.stringify(
      characterOptions["2024"].species.find((s) => s.name === "Elf"),
    ),
    /Faerie Fire/,
  );
  assert.match(
    JSON.stringify(
      characterOptions["2024"].species.find((s) => s.name === "Tiefling"),
    ),
    /Chthonic/,
  );
  for (const edition of ["2014", "2024"])
    for (const cls of characterOptions[edition].classes)
      for (const species of characterOptions[edition].species) {
        const r = createActor("character", {
          name: "Test",
          rulesEdition: edition,
          className: cls.name,
          ancestry: species.name,
          level: 20,
        });
        assert.ok(characterFeatureCards(r).length);
        const choices = featureChoices(r);
        assert.equal(new Set(choices.map((c) => c.key)).size, choices.length);
        assert.ok(
          choices.every(
            (c) =>
              c.count >= 1 &&
              c.count <= 20 &&
              new Set(c.options).size === c.options.length,
          ),
        );
      }
});

test("parent-dependent choices read in one save and remain independent in encounters", () => {
  const r = createActor("character", { name: "Test", ancestry: "Human" });
  const data = new FormData();
  const origin = "2024:species:Human:origin-feat",
    skilled = "2024:species:Human:skilled-options";
  data.set("feature-choice:" + origin + ":0", "Skilled");
  ["Arcana", "Nature", "__custom"].forEach((v, i) =>
    data.set("feature-choice:" + skilled + ":" + i, v),
  );
  data.set("feature-custom:" + skilled + ":2", "Smith’s tools");
  readFeatureChoices(data, r);
  assert.deepEqual(r.featureChoices[skilled], [
    "Arcana",
    "Nature",
    "custom:Smith’s tools",
  ]);
  validateActor(r);
  const d = emptyActors(),
    p = addParticipant(d, r);
  r.featureChoices[skilled][0] = "History";
  assert.equal(p.snapshot.featureChoices[skilled][0], "Arcana");
  r.featureChoices[skilled] = ["Arcana", "Arcana"];
  assert.throws(() => validateActor(r), /different options/);
});

test("reference tables have semantic headers and ambiguous extraction uses a source link", () => {
  const blocks = referenceBlocks(
    "Lineage\tBenefit\nDrow\tDarkvision\nHigh Elf\tCantrip",
  );
  assert.deepEqual(blocks[0].headers, ["Lineage", "Benefit"]);
  assert.equal(blocks[0].rows.length, 2);
  const esc = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  const html = renderReference(
    "Name\tBenefit\nA\t<script>alert(1)</script>",
    esc,
  );
  assert.match(html, /<th scope="col">Name/);
  assert.doesNotMatch(html, /<script>/);
  const malformed = renderReference("Name\tA\tB\nOops\tUnknown", esc, {
    edition: "2014",
    page: 10,
  });
  assert.match(malformed, /View source table/);
  assert.doesNotMatch(malformed, /Oops/);
});

test("edition-specific character options gate features by level without changing custom stats", () => {
  for (const edition of ["2014", "2024"]) {
    const options = characterOptions[edition];
    assert.equal(options.classes.length, 12);
    assert.equal(options.species.length, 9);
    for (const cls of options.classes) {
      assert.ok(cls.features.length > 0);
      assert.ok(
        cls.features.every((f) => f.level >= 1 && f.level <= 20 && f.page > 0),
      );
    }
    const r = createActor("character", {
      name: "Mira",
      rulesEdition: edition,
      className: "Fighter",
      ancestry: "Elf",
      maxHp: 37,
      ac: 18,
      features: "Custom feature",
    });
    applyCharacterOptions(r);
    assert.match(r.generatedFeatures, /Second Wind/);
    assert.match(r.generatedFeatures, /Darkvision/);
    assert.doesNotMatch(r.generatedFeatures, /Action Surge/);
    r.level = 2;
    applyCharacterOptions(r);
    assert.match(r.generatedFeatures, /Action Surge/);
    r.level = 1;
    applyCharacterOptions(r);
    assert.doesNotMatch(r.generatedFeatures, /Action Surge/);
    assert.equal(r.maxHp, 37);
    assert.equal(r.ac, 18);
    assert.equal(r.features, "Custom feature");
    validateActor(r);
    r.classNameCustom = true;
    r.ancestryCustom = true;
    applyCharacterOptions(r);
    assert.equal(r.generatedFeatures, "");
  }
  assert.ok(
    characterOptions["2014"].species.some((s) => s.name === "Half-Elf"),
  );
  assert.ok(
    !characterOptions["2024"].species.some((s) => s.name === "Half-Elf"),
  );
});
import {
  createActor,
  validateActor,
  emptyActors,
  addParticipant,
  adjustHealth,
  fromPreset,
  validateActors,
} from "../dist/actors-model.js";
test("damage spends temporary HP first and healing stays within maximum", () => {
  const d = emptyActors(),
    r = createActor("character", { name: "Asha", maxHp: 30 }),
    p = addParticipant(d, r);
  p.tempHp = 5;
  adjustHealth(p, 8, "damage");
  assert.equal(p.hp, 27);
  assert.equal(p.tempHp, 0);
  adjustHealth(p, 100, "heal");
  assert.equal(p.hp, 30);
  adjustHealth(p, 100, "damage");
  assert.equal(p.hp, 0);
  assert.equal(r.maxHp, 30);
  for (const amount of [-1, 1.5, NaN, Infinity])
    assert.throws(() => adjustHealth(p, amount, "damage"));
});
test("instances are independent and retain original details after library removal", () => {
  const d = emptyActors(),
    r = createActor("monster", { name: "Wolf", maxHp: 11, ac: 12 });
  d.monsters.push(r);
  const a = addParticipant(d, r),
    b = addParticipant(d, r);
  adjustHealth(a, 4, "damage");
  assert.equal(a.hp, 7);
  assert.equal(b.hp, 11);
  r.abilities.STR = 9;
  assert.equal(a.snapshot.abilities.STR, 0);
  d.monsters = [];
  validateActors(d);
});
test("both catalogs contain valid records and preset copies never modify their source", () => {
  for (const edition of ["2014", "2024"]) {
    const data = JSON.parse(
      readFileSync(`dist/presets/monsters-${edition}.json`),
    );
    assert.ok(data.presets.length >= 290);
    assert.equal(data.skipped, 0);
    for (const r of data.presets) validateActor(r);
    const wolf = data.presets.find((r) => r.name === "Wolf");
    assert.ok(wolf);
    const copy = fromPreset(wolf);
    copy.maxHp = 999;
    assert.notEqual(copy.id, wolf.id);
    assert.notEqual(wolf.maxHp, 999);
    assert.ok(wolf.features.length > 100);
  }
});
test("actor and encounter validation rejects invalid health and malformed records", () => {
  assert.throws(() => validateActor(createActor("character")));
  for (const values of [
    { maxHp: 0 },
    { ac: -1 },
    { initiative: 200 },
    { abilities: { STR: 0 } },
  ])
    assert.throws(() =>
      validateActor(createActor("character", { name: "A", ...values })),
    );
  const d = emptyActors(),
    r = createActor("character", { name: "A" }),
    p = addParticipant(d, r);
  p.hp = 2;
  assert.throws(() => validateActors(d));
});
