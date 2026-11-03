import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
