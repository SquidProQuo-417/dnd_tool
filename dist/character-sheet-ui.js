import {
  scoreAbilities,
  scoreSetup,
  scoreBreakdown,
  pointSpend,
  backgroundAbilities,
  savingThrows,
  proficiencyBonus,
  signed,
  coins,
  coinValues,
  syncScores,
  scoreInputMaximum,
} from "./character-sheet.js";

export function renderScores(r, esc) {
  const setup = scoreSetup(r),
    breakdown = scoreBreakdown(r),
    spent = pointSpend(setup),
    allowed = backgroundAbilities(r);
  return `<div data-score-editor><input type="hidden" name="score-homebrew" value="${setup.homebrewEnabled ? 1 : 0}"><div class="score-toolbar"><label class="field">Score method<select name="score-mode" aria-label="Score method" data-sheet-refresh><option value="point-buy" ${setup.mode === "point-buy" ? "selected" : ""}>Point buy · 27 points</option><option value="manual" ${setup.mode === "manual" ? "selected" : ""}>Manual scores</option></select></label><output data-point-budget ${setup.mode === "point-buy" ? "" : "hidden"}>${Number.isFinite(spent) ? spent : 0} / 27 points</output></div>${!r.scoreSetup ? '<small class="score-hint">Existing scores inferred from saved modifiers.</small>' : ""}<div class="score-grid">${scoreAbilities
    .map((a) => {
      const row = breakdown[a];
      return `<div class="score-card"><span class="score-name">${a}</span><output class="score-total" data-score-total="${a}">${row.total}</output><output class="score-modifier" data-score-modifier="${a}">${signed(row.modifier)}</output><label class="field">Base<input name="score-base-${a}" aria-label="${a} base score" type="number" min="${setup.mode === "point-buy" ? 8 : 1}" max="${setup.mode === "point-buy" ? 15 : 60}" step="1" value="${setup.base[a]}" required data-sheet-live></label><details class="score-breakdown"><summary>Breakdown</summary><dl data-score-breakdown="${a}">${breakdownRows(row)}</dl></details></div>`;
    })
    .join(
      "",
    )}</div><details class="score-bonuses"><summary>Score bonuses</summary>${r.rulesEdition === "2014" ? `<label class="sheet-check"><input type="checkbox" name="score-species" ${setup.applySpecies ? "checked" : ""} data-sheet-live>Apply species bonuses</label>` : ""}${r.rulesEdition === "2024" ? `<div class="score-bonus-group"><h4>Background · +2/+1 or three +1</h4>${allowed.length ? `<div class="score-bonus-grid">${allowed.map((a) => bonusInput("background", a, setup.background[a], 0, 2)).join("")}</div>` : '<span class="score-hint">Select a background to assign its increases.</span>'}</div>` : ""}<button type="button" class="secondary" data-homebrew-scores>${setup.homebrewEnabled ? "Lock homebrew values" : "Enter custom homebrew value"}</button><small class="score-hint">Class and feat adjustments are not automated yet.</small>${["class", "feat", "other"].map((source) => `<div class="score-bonus-group"><h4>${source === "class" ? "Class" : source === "feat" ? "Feat" : "Other"}</h4><div class="score-bonus-grid">${scoreAbilities.map((a) => bonusInput(source, a, setup[source][a], -30, 30, !setup.homebrewEnabled)).join("")}</div></div>`).join("")}</details></div>`;
}
function bonusInput(source, a, value, min, max, locked = false) {
  return `<label class="field">${a}<input aria-label="${source} ${a} bonus" name="score-${source}-${a}" type="number" min="${min}" max="${max}" step="1" value="${value}" ${locked ? 'readonly aria-readonly="true"' : ""} required data-sheet-live></label>`;
}
function breakdownRows(row) {
  return ["base", "species", "background", "class", "feat", "other"]
    .map(
      (k) =>
        `<div><dt>${k[0].toUpperCase() + k.slice(1)}</dt><dd>${k === "base" ? row[k] : signed(row[k])}</dd></div>`,
    )
    .join("");
}
export function renderSaves(r, esc) {
  const saves = savingThrows(r);
  return `<div data-save-editor><div class="score-toolbar"><span>Proficiency ${signed(proficiencyBonus(r.level))}</span><label class="field">Save proficiencies<select name="save-mode" aria-label="Save proficiencies" data-sheet-refresh><option value="class" ${r.saveProficiencies == null ? "selected" : ""}>From class</option><option value="custom" ${r.saveProficiencies != null ? "selected" : ""}>Custom</option></select></label></div><div class="save-grid">${scoreAbilities.map((a) => `<div class="save-card"><span>${a}</span><output data-save-total="${a}">${signed(saves[a].total)}</output><label class="sheet-check"><input type="checkbox" name="save-prof-${a}" ${saves[a].proficient ? "checked" : ""} ${r.saveProficiencies == null ? "disabled" : ""} data-sheet-live>Proficient</label><small data-save-formula="${a}">${saveFormula(saves[a])}</small></div>`).join("")}</div><details><summary>Additional save bonuses</summary><div class="score-bonus-grid">${scoreAbilities.map((a) => `<label class="field">${a}<input name="save-bonus-${a}" aria-label="${a} additional save bonus" type="number" min="-100" max="100" step="1" value="${r.saveBonuses?.[a] || 0}" data-sheet-live required></label>`).join("")}</div></details><label class="field">Saving throw notes<textarea name="saves" maxlength="100000" rows="2">${esc(r.saves)}</textarea></label></div>`;
}
function saveFormula(s) {
  return (
    signed(s.modifier) +
    " ability" +
    (s.proficient ? " + " + s.proficiency + " proficiency" : "") +
    (s.bonus ? " " + signed(s.bonus) + " other" : "")
  );
}
export function renderCurrency(r) {
  const labels = {
      pp: "Platinum",
      gp: "Gold",
      ep: "Electrum",
      sp: "Silver",
      cp: "Copper",
    },
    wallet = r.wallet || {};
  return `<div class="currency-grid">${coins.map((c) => `<label class="field">${labels[c]} (${c.toUpperCase()})<input type="number" min="0" max="1000000000" step="1" name="coin-${c}" value="${wallet[c] || 0}" required data-sheet-live></label>`).join("")}</div><output data-currency-total>${coins.reduce((n, c) => n + (wallet[c] || 0) * coinValues[c], 0) / 100} GP total</output>`;
}
export function renderInventory(r, esc) {
  return `<div class="actor-toolbar"><button type="button" class="secondary" data-load-equipment="class">Load class equipment</button><button type="button" class="secondary" data-load-equipment="background">Load background equipment</button><button type="button" class="text-btn" data-add-inventory>Add item</button></div><div class="inventory-rows">${(r.inventory || []).map((i) => `<div class="inventory-row" data-inventory-row="${i.id}"><label class="field"><span class="sr-only">Item</span><input name="item-name-${i.id}" aria-label="Item name" maxlength="500" value="${esc(i.name)}" required></label><label class="field">Qty<input type="number" name="item-qty-${i.id}" aria-label="Item quantity" min="0" max="1000000" step="1" value="${i.quantity}" required></label><button type="button" class="text-btn danger" data-remove-inventory="${i.id}" aria-label="Remove ${esc(i.name)}">Remove</button></div>`).join("")}</div>`;
}
export function readSheet(form, r) {
  const d = new FormData(form);
  if (d.has("score-mode")) {
    const setup = structuredClone(scoreSetup(r));
    setup.mode = d.get("score-mode");
    setup.homebrewEnabled = d.get("score-homebrew") === "1";
    for (const a of scoreAbilities) {
      setup.base[a] = Number(d.get("score-base-" + a));
      for (const source of ["background", "class", "feat", "other"])
        if (d.has("score-" + source + "-" + a))
          setup[source][a] = Number(d.get("score-" + source + "-" + a));
    }
    if (form.elements["score-species"])
      setup.applySpecies = d.has("score-species");
    r.scoreSetup = setup;
    syncScores(r);
  }
  if (d.has("save-mode")) {
    r.saveProficiencies =
      d.get("save-mode") === "class"
        ? null
        : scoreAbilities.filter(
            (a) => form.elements["save-prof-" + a]?.checked,
          );
    r.saveBonuses = Object.fromEntries(
      scoreAbilities.map((a) => [a, Number(d.get("save-bonus-" + a) || 0)]),
    );
  }
  if (d.has("coin-gp"))
    r.wallet = Object.fromEntries(
      coins.map((c) => [c, Number(d.get("coin-" + c))]),
    );
  if (r.inventory)
    r.inventory = r.inventory.map((i) =>
      d.has("item-name-" + i.id)
        ? {
            ...i,
            name: String(d.get("item-name-" + i.id)).trim(),
            quantity: Number(d.get("item-qty-" + i.id)),
          }
        : i,
    );
  return r;
}
export function updateSheetOutputs(form, r) {
  const breakdown = scoreBreakdown(r);
  for (const a of scoreAbilities) {
    const set = (selector, value) =>
      form.querySelector(selector) &&
      (form.querySelector(selector).textContent = value);
    set(
      '[data-score-total="' + a + '"]',
      Number.isFinite(breakdown[a].total) ? breakdown[a].total : "—",
    );
    set(
      '[data-score-modifier="' + a + '"]',
      Number.isFinite(breakdown[a].modifier)
        ? signed(breakdown[a].modifier)
        : "—",
    );
    const dl = form.querySelector('[data-score-breakdown="' + a + '"]');
    if (dl) dl.innerHTML = breakdownRows(breakdown[a]);
    const save = savingThrows(r)[a];
    set('[data-save-total="' + a + '"]', signed(save.total));
    set('[data-save-formula="' + a + '"]', saveFormula(save));
  }
  const budget = form.querySelector("[data-point-budget]");
  if (budget) {
    const spent = pointSpend(scoreSetup(r));
    budget.textContent =
      (Number.isFinite(spent) ? spent : "—") + " / 27 points";
    budget.classList.remove("over-budget");
  }
  for (const a of scoreAbilities)
    for (const source of ["base", "background"]) {
      const input = form.elements["score-" + source + "-" + a];
      if (input) input.max = scoreInputMaximum(r, source, a);
    }
  const currency = form.querySelector("[data-currency-total]");
  if (currency)
    currency.textContent =
      coins.reduce((n, c) => n + (r.wallet?.[c] || 0) * coinValues[c], 0) /
        100 +
      " GP total";
}
export function constrainScoreInput(form, input, r) {
  const match = input.name.match(/^score-(base|background)-([A-Z]{3})$/);
  if (!match || input.value === "") return;
  const [, source, a] = match,
    value = Number(input.value),
    minimum =
      source === "base" ? (scoreSetup(r).mode === "point-buy" ? 8 : 1) : 0;
  if (!Number.isFinite(value)) return;
  // Allow a partial first digit while typing a two-digit base score.
  if (source === "base" && value < minimum && value >= 0) return;
  input.value = String(
    Math.max(
      minimum,
      Math.min(Math.trunc(value), scoreInputMaximum(r, source, a)),
    ),
  );
}
