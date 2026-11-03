import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCampaign,
  validateCampaign,
  importCampaign,
  removeCard,
  rollDice,
} from "../dist/model.js";
test("round trip preserves references and embedded images", () => {
  const p = createCampaign();
  p.cards[0].image = "data:image/png;base64,aGVsbG8=";
  const copy = importCampaign(JSON.stringify(p));
  assert.notEqual(copy.id, p.id);
  assert.equal(copy.cards[1].characterId, copy.characters[0].id);
  assert.equal(copy.characters[0].groupIds[0], copy.groups[0].id);
  assert.equal(copy.cards[0].image, p.cards[0].image);
});
test("reject unsupported versions, broken references and active images", () => {
  for (const mutate of [
    (p) => (p.version = 2),
    (p) => (p.characters[0].groupIds = ["missing"]),
    (p) => (p.cards[0].characterId = "missing"),
    (p) => (p.cards[0].image = "data:image/svg+xml;base64,aGVsbG8="),
    (p) => (p.cards[0].x = Infinity),
    (p) => (p.cards[0].id = p.notes[0].id),
  ]) {
    const p = createCampaign();
    mutate(p);
    assert.throws(() => validateCampaign(p));
  }
});
test("deleting card cleans connections and retains original characters", () => {
  const p = createCampaign();
  p.connections.push({
    id: crypto.randomUUID(),
    from: p.cards[0].id,
    to: p.cards[1].id,
    label: "knows",
  });
  removeCard(p, p.cards[1].id);
  assert.equal(p.connections.length, 0);
  assert.equal(p.characters.length, 2);
  validateCampaign(p);
});
test("bounded dice expressions support modifiers", () => {
  assert.deepEqual(
    rollDice("2d6+3", () => 0),
    { rolls: [1, 1], modifier: 3, total: 5 },
  );
  assert.equal(rollDice("1d20-2", () => 0.999999).total, 18);
  for (const expr of ["0d6", "51d6", "1d3", "Infinity", "1d20<script>"])
    assert.throws(() => rollDice(expr));
});
test("imports reject IDs that could escape HTML attributes", () => {
  const p = createCampaign();
  p.cards[0].id = 'x" onclick="alert(1)';
  assert.throws(() => importCampaign(JSON.stringify(p)));
});
