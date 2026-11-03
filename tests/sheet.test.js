import { test } from "node:test";
import assert from "node:assert/strict";
import { validateInventory } from "../dist/character-sheet.js";

test("equipment validation is independent of unfinished ability allocations", () => {
  const r = createActor("character", {
    name: "Unfinished",
    background: "Sage",
  });
  r.scoreSetup.background.CON = 2;
  r.scoreSetup.background.INT = 2;
  r.scoreSetup.background.WIS = 2;
  syncScores(r);
  assert.throws(() => validateActor(r), /Background increases/);
  const next = applyEquipment(r, "class", equipmentPlan("Spear, 11 GP"));
  validateInventory(next);
  assert.equal(next.wallet.gp, 11);
  assert.equal(next.inventory[0].name, "Spear");
  assert.equal(next.scoreSetup.background.INT, 2);
  assert.throws(
    () =>
      applyEquipment(r, "class", {
        items: [{ id: "bad-item", name: "Spear", quantity: -1, source: "" }],
        wallet: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 },
      }),
    /Invalid inventory/,
  );
});
import {
  createActor,
  validateActor,
  addParticipant,
  emptyActors,
} from "../dist/actors-model.js";
import {
  scoreAbilities,
  newScoreSetup,
  pointSpend,
  scoreBreakdown,
  syncScores,
  savingThrows,
  equipmentText,
  equipmentPackages,
  equipmentPlan,
  applyEquipment,
} from "../dist/character-sheet.js";

test("point buy costs 27 before source bonuses and rejects overspending", () => {
  const r = createActor("character", { name: "Rowan" });
  r.scoreSetup.base = Object.fromEntries(
    scoreAbilities.map((a, i) => [a, [15, 14, 13, 12, 10, 8][i]]),
  );
  assert.equal(pointSpend(r.scoreSetup), 27);
  syncScores(r);
  validateActor(r);
  assert.equal(r.abilities.STR, 2);
  assert.equal(r.abilities.CHA, -1);
  r.scoreSetup.base.CHA = 9;
  syncScores(r);
  assert.throws(() => validateActor(r), /27 points/);
  r.scoreSetup.base.STR = 16;
  assert.throws(() => validateActor(syncScores(r)), /ability scores/);
});

test("score breakdown separates species, background, class and feat bonuses across editions", () => {
  const r = createActor("character", {
    name: "Rowan",
    rulesEdition: "2014",
    ancestry: "Elf",
  });
  r.featureChoices["2014:species:Elf:subrace"] = ["High Elf"];
  let rows = scoreBreakdown(r);
  assert.equal(rows.DEX.species, 2);
  assert.equal(rows.INT.species, 1);
  r.ancestry = "Half-Elf";
  r.featureChoices["2014:species:Half-Elf:ability-increase"] = [
    "Strength",
    "Wisdom",
  ];
  rows = scoreBreakdown(r);
  assert.equal(rows.CHA.species, 2);
  assert.equal(rows.STR.species, 1);
  assert.equal(rows.WIS.species, 1);
  r.rulesEdition = "2024";
  r.ancestry = "Human";
  r.background = "Sage";
  r.scoreSetup.background.INT = 2;
  r.scoreSetup.background.CON = 1;
  r.scoreSetup.class.INT = 1;
  r.scoreSetup.feat.INT = 1;
  rows = scoreBreakdown(r);
  assert.deepEqual(rows.INT, {
    base: 8,
    species: 0,
    background: 2,
    class: 1,
    feat: 1,
    other: 0,
    total: 12,
    modifier: 1,
  });
  syncScores(r);
  validateActor(r);
  r.scoreSetup.background.WIS = 1;
  syncScores(r);
  assert.throws(() => validateActor(r), /Background increases/);
});

test("saving throws use ability modifiers, level proficiency and explicit overrides", () => {
  const r = createActor("character", { name: "Rowan", className: "Fighter" });
  r.scoreSetup.base.STR = 15;
  syncScores(r);
  assert.equal(savingThrows(r).STR.total, 4);
  assert.equal(savingThrows(r).DEX.total, -1);
  r.level = 5;
  assert.equal(savingThrows(r).STR.total, 5);
  r.saveProficiencies = ["WIS"];
  r.saveBonuses = Object.fromEntries(
    scoreAbilities.map((a) => [a, a === "WIS" ? 1 : 0]),
  );
  assert.equal(savingThrows(r).STR.total, 2);
  assert.equal(savingThrows(r).WIS.total, 3);
  r.saveProficiencies = null;
  r.className = "Monk";
  r.level = 14;
  assert.ok(Object.values(savingThrows(r)).every((s) => s.proficient));
  const legacy = createActor("character", {
    name: "Legacy",
    abilities: Object.fromEntries(scoreAbilities.map((a) => [a, 2])),
    className: "Wizard",
  });
  assert.equal(savingThrows(legacy).INT.total, 4);
  assert.equal(legacy.scoreSetup, undefined);
});

test("equipment packages and coins load once per source, preserve manual items and snapshot independently", () => {
  let r = createActor("character", {
    name: "Rowan",
    className: "Monk",
    background: "Sage",
  });
  const packages = equipmentPackages(equipmentText(r, "class"));
  assert.equal(packages.length, 2);
  const a = equipmentPlan(packages[0].text),
    b = equipmentPlan(packages[1].text);
  assert.equal(a.wallet.gp, 11);
  assert.equal(b.wallet.gp, 50);
  assert.equal(a.items.find((i) => i.name === "Daggers").quantity, 5);
  r = applyEquipment(r, "class", a);
  r = applyEquipment(r, "class", a);
  assert.equal(r.wallet.gp, 11);
  assert.equal(r.inventory.length, a.items.length);
  const background = equipmentPlan(
    equipmentPackages(equipmentText(r, "background"))[0].text,
  );
  r = applyEquipment(r, "background", background);
  assert.equal(r.wallet.gp, 19);
  r.inventory.push({
    id: "custom-item",
    name: "Map",
    quantity: 1,
    source: "manual",
  });
  r = applyEquipment(r, "class", b);
  assert.equal(r.wallet.gp, 58);
  assert.ok(r.inventory.some((i) => i.name === "Map"));
  const participant = addParticipant(emptyActors(), r);
  r.wallet.gp = 0;
  assert.equal(participant.snapshot.wallet.gp, 58);
  const before = structuredClone(r);
  assert.throws(() => applyEquipment(r, "class", a), /Not enough GP/);
  assert.deepEqual(r, before);
  assert.throws(
    () => validateActor({ ...r, wallet: { ...r.wallet, sp: -1 } }),
    /Coin amounts/,
  );
});
