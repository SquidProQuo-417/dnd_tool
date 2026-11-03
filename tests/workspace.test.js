import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultWorkspace,
  validateWorkspace,
  stacks,
  openTool,
  activateTab,
  moveTab,
  dockTool,
  hideTool,
  setPanel,
  setRatio,
  fitWorkspace,
  minimumSize,
} from "../dist/workspace-model.js";
test("tools open once, activate existing panes and reorder without duplicates", () => {
  let l = defaultWorkspace(),
    pane = l.root.id;
  l = openTool(l, "Notes");
  l = openTool(l, "Rules");
  l = moveTab(l, "Rules", pane, 0);
  assert.deepEqual(l.root.tabs, ["Rules", "Overview", "Notes"]);
  l = dockTool(l, "Rules", pane, "right");
  const rules = stacks(l.root).find((p) => p.active === "Rules");
  l = openTool(l, "Rules", pane);
  assert.equal(l.focused, rules.id);
  assert.equal(
    stacks(l.root)
      .flatMap((p) => p.tabs)
      .filter((t) => t === "Rules").length,
    1,
  );
});
test("docking each edge and hiding last tabs prunes empty containers", () => {
  for (const edge of ["left", "right", "top", "bottom"]) {
    let l = defaultWorkspace(),
      initial = l.root.id;
    l = dockTool(l, "Notes", initial, edge);
    assert.equal(
      l.root.axis,
      ["left", "right"].includes(edge) ? "row" : "column",
    );
    assert.equal(stacks(l.root).length, 2);
    l = hideTool(l, "Overview");
    assert.equal(l.root.type, "stack");
    assert.deepEqual(l.root.tabs, ["Notes"]);
    l = hideTool(l, "Notes");
    assert.equal(l.root, null);
    l = openTool(l, "Rules");
    assert.equal(l.root.active, "Rules");
    validateWorkspace(l);
  }
});
test("moving the sole tab merges and removes its old split", () => {
  let l = defaultWorkspace(),
    original = l.root.id;
  l = dockTool(l, "Rules", original, "bottom");
  l = moveTab(l, "Rules", original);
  assert.equal(l.root.type, "stack");
  assert.deepEqual(l.root.tabs, ["Overview", "Rules"]);
});
test("priority fitting collapses low priority, preserves focused pane and restores on widening", () => {
  let l = defaultWorkspace(),
    overview = l.root.id;
  l = dockTool(l, "Notes", overview, "right");
  const notes = stacks(l.root).find((s) => s.active === "Notes").id;
  l = dockTool(l, "Rules", notes, "right");
  const rules = stacks(l.root).find((s) => s.active === "Rules").id;
  l = setPanel(l, overview, { priority: 1 });
  l = setPanel(l, notes, { priority: 4 });
  l = activateTab(l, rules, "Rules");
  const fit = fitWorkspace(l, 750, 700);
  assert.deepEqual(new Set(fit.visible), new Set([notes, rules]));
  assert.equal(fit.rail[0].reason, "For space");
  assert.equal(fitWorkspace(l, 400, 700).visible.size, 1);
  assert.equal(fitWorkspace(l, 1600, 700).visible.size, 3);
  assert.equal(stacks(l.root).length, 3);
});
test("manual collapse survives widening and never removes tools", () => {
  let l = defaultWorkspace(),
    initial = l.root.id;
  l = dockTool(l, "Rules", initial, "right");
  l = setPanel(l, initial, { collapsed: true });
  assert.equal(fitWorkspace(l, 2000, 1000).rail[0].reason, "Collapsed");
  l = activateTab(l, initial, "Overview");
  assert.equal(fitWorkspace(l, 2000, 1000).rail.length, 0);
});
test("ratios adapt to minimum sizes without overwriting saved proportions", () => {
  let l = defaultWorkspace();
  l = dockTool(l, "Rules", l.root.id, "right");
  l = setRatio(l, l.root.id, 0.1);
  const fit = fitWorkspace(l, 1000, 800);
  assert.ok(fit.root.ratio >= 350 / 992);
  assert.equal(l.root.ratio, 0.1);
  assert.deepEqual(minimumSize(fit.root), { width: 708, height: 240 });
});
test("invalid layout data is rejected before reaching the DOM", () => {
  for (const mutate of [
    (l) => l.root.tabs.push("Unknown"),
    (l) => l.root.tabs.push("Overview"),
    (l) => (l.root.priority = 7),
    (l) => (l.root.id = 'x" onclick="bad'),
    (l) => (l.focused = "missing"),
  ]) {
    const l = defaultWorkspace();
    mutate(l);
    assert.throws(() => validateWorkspace(l));
  }
  const l = defaultWorkspace();
  l.root = {
    type: "split",
    id: "s",
    axis: "row",
    ratio: NaN,
    first: l.root,
    second: l.root,
  };
  assert.throws(() => validateWorkspace(l));
});
test("layout operations leave input snapshots unchanged and contain no campaign state", () => {
  const original = defaultWorkspace(),
    before = JSON.stringify(original);
  let l = openTool(original, "Characters");
  assert.equal(JSON.stringify(original), before);
  l = dockTool(l, "Notes", l.root.id, "right");
  assert.equal(l.version, 1);
  assert.equal("characters" in l, false);
  validateWorkspace(JSON.parse(JSON.stringify(l)));
});
