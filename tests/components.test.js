import { test } from "node:test";
import assert from "node:assert/strict";
import {
  makeComponent,
  modifier,
  weaponSummary,
  inventorySummary,
  componentSummary,
  validateComponentData,
} from "../dist/components.js";
import {
  createCampaign,
  validateCampaign,
  importCampaign,
} from "../dist/model.js";
test("ability modifiers round down including below average scores", () => {
  assert.equal(modifier(9), -1);
  assert.equal(modifier(10), 0);
  assert.equal(modifier(17), 3);
  assert.equal(modifier(30), 10);
});
test("weapons derive ability and proficiency and resolve ammunition by ID", () => {
  const stats = makeComponent("Statistics"),
    weapon = makeComponent("Weapon"),
    ammo = makeComponent("Ammunition");
  stats.data.scores.STR = 16;
  weapon.data.ammoId = ammo.id;
  const c = { components: [stats, weapon, ammo] };
  assert.deepEqual(weaponSummary(c, weapon), {
    hasStats: true,
    attack: 5,
    damage: 3,
  });
  weapon.data.proficient = false;
  weapon.data.attackBonus = 1;
  assert.equal(weaponSummary(c, weapon).attack, 4);
  weapon.data.addAbility = false;
  assert.equal(weaponSummary(c, weapon).damage, 0);
  ammo.data.current = 7;
  assert.match(componentSummary(c, weapon), /7\/20/);
});
test("inventory sums quantity times weight and reports excess without clamping the total", () => {
  const m = makeComponent("Inventory");
  m.data.limit = 10;
  m.data.items = [
    { id: crypto.randomUUID(), name: "Rope", quantity: 2, weight: 5.5 },
  ];
  assert.deepEqual(inventorySummary(m), {
    weight: 11,
    limit: 10,
    remaining: -1,
    percent: 100,
    over: true,
  });
  m.data.limit = 0;
  assert.equal(inventorySummary(m).percent, 100);
});
test("structured data survives campaign handoff while legacy components stay intact", () => {
  const p = createCampaign();
  const old = p.characters[0].components[0].value;
  const stats = makeComponent("Statistics"),
    ammo = makeComponent("Ammunition"),
    weapon = makeComponent("Weapon");
  weapon.data.ammoId = ammo.id;
  p.characters[0].components.push(stats, ammo, weapon);
  const copy = importCampaign(JSON.stringify(p));
  assert.equal(copy.characters[0].components[0].value, old);
  assert.equal(copy.characters[0].components.at(-1).data.ammoId, ammo.id);
});
test("imports reject broken ammo references, impossible resource counts and malformed dice", () => {
  for (const mutate of [
    (m) => (m.data.current = -1),
    (m) => (m.data.maximum = 1),
  ]) {
    const m = makeComponent("Ammunition");
    mutate(m);
    assert.throws(() => validateComponentData(m));
  }
  const p = createCampaign();
  const w = makeComponent("Weapon");
  w.data.ammoId = "missing";
  p.characters[0].components.push(w);
  assert.throws(() => validateCampaign(p));
  w.data.ammoId = null;
  w.data.damageDice = "1000d20";
  assert.throws(() => validateCampaign(p));
});
test("each structured type starts with valid data", () => {
  for (const type of [
    "Statistics",
    "Weapon",
    "Inventory",
    "Ammunition",
    "Spell requirements",
    "Notes",
  ])
    validateComponentData(makeComponent(type));
});
