import {
  abilities,
  defaultData,
  modifier,
  signed,
  weaponSummary,
  inventorySummary,
  componentSummary,
  validateComponentData,
} from "./components.js";
import { rollDice, uid } from "./model.js";

export function componentEditor(m, character, esc) {
  const d = m.data;
  const number = (key, label, value, min = 0, max = 100000, step = 1) =>
    `<label class="field">${label}<input type="number" data-structured-field="${key}" value="${value}" min="${min}" max="${max}" step="${step}" required></label>`;
  const check = (key, label, value) =>
    `<label class="check-field"><input type="checkbox" data-structured-field="${key}" ${value ? "checked" : ""}>${label}</label>`;
  const text = (key, label, value, max = 200) =>
    `<label class="field">${label}<input data-structured-field="${key}" value="${esc(value)}" maxlength="${max}"></label>`;
  let fields = "";
  if (d)
    switch (m.type) {
      case "Statistics":
        fields = `<div class="ability-grid">${abilities.map((a) => `<label class="ability-field">${a}<input type="number" data-structured-field="scores.${a}" value="${d.scores[a]}" min="1" max="30" required><output>${signed(modifier(d.scores[a]))}</output></label>`).join("")}</div><div class="structured-grid">${number("ac", "Armor class", d.ac, 0, 100)}${number("hp", "Current HP", d.hp)}${number("maxHp", "Maximum HP", d.maxHp, 1)}${number("speed", "Speed (ft)", d.speed, 0, 10000)}${number("proficiency", "Proficiency bonus", d.proficiency, 0, 20)}</div><p class="muted">Modifiers update from ability scores. Weapons use the first structured Statistics component on this character.</p>`;
        break;
      case "Weapon": {
        const w = weaponSummary(character, m),
          ammo = character.components.filter(
            (a) => a.type === "Ammunition" && a.data,
          );
        fields = `<div class="structured-grid"><label class="field">Attack ability<select data-structured-field="ability" aria-label="Attack ability">${[...abilities, "None"].map((a) => `<option ${a === d.ability ? "selected" : ""}>${a}</option>`).join("")}</select></label>${number("attackBonus", "Other attack bonus", d.attackBonus, -100, 100)}${text("damageDice", "Damage dice", d.damageDice, 8)}${number("damageBonus", "Other damage bonus", d.damageBonus, -100, 100)}${text("damageType", "Damage type", d.damageType, 100)}<label class="field">Ammunition source<select data-structured-field="ammoId" aria-label="Ammunition source"><option value="">None</option>${ammo.map((a) => `<option value="${a.id}" ${a.id === d.ammoId ? "selected" : ""}>${esc(a.label)}</option>`).join("")}</select></label></div><div class="check-row">${check("proficient", "Add proficiency to attack", d.proficient)}${check("addAbility", "Add ability modifier to damage", d.addAbility)}</div>${text("properties", "Properties / reminders", d.properties, 1000)}<div class="derived-summary">${esc(componentSummary(character, m))}</div>${!w.hasStats ? '<p class="muted">Add a structured Statistics component, or choose None for an attack without an ability modifier.</p>' : ""}<div class="roll-actions"><button class="secondary" data-weapon-roll="attack" ${!w.hasStats ? "disabled" : ""}>Roll attack ${signed(w.attack)}</button><button class="secondary" data-weapon-roll="damage" ${!w.hasStats ? "disabled" : ""}>Roll damage</button></div><output class="component-roll" aria-live="polite">Rolls do not spend ammunition or apply damage.</output>`;
        break;
      }
      case "Ammunition":
        fields = `<div class="structured-grid">${number("current", "Remaining", d.current)}${number("maximum", "Maximum / refill target", d.maximum)}</div><div class="resource-actions"><button class="secondary" data-ammo-change="-1" ${d.current === 0 ? "disabled" : ""}>Use 1</button><button class="secondary" data-ammo-change="1" ${d.current === d.maximum ? "disabled" : ""}>Recover 1</button><button class="text-btn" data-ammo-refill>Refill to ${d.maximum}</button><strong>${d.current} / ${d.maximum}</strong></div>`;
        break;
      case "Inventory": {
        const s = inventorySummary(m);
        fields = `${number("limit", "Manual carrying limit (lb)", d.limit, 0, 1000000, 0.01)}<p class="muted">Set this limit for your creature and house rules. This tracks listed inventory only; it does not infer variant encumbrance or include other components automatically.</p><div class="inventory-items">${d.items.map((i) => `<div class="inventory-item" data-item="${i.id}"><label class="field">Item<input data-item-field="name" value="${esc(i.name)}" maxlength="200"></label><label class="field">Quantity<input type="number" data-item-field="quantity" min="0" max="100000" step="1" value="${i.quantity}" required></label><label class="field">Each (lb)<input type="number" data-item-field="weight" min="0" max="100000" step=".01" value="${i.weight}" required></label><button class="text-btn danger" data-remove-item="${i.id}" aria-label="Remove ${esc(i.name || "item")}">×</button></div>`).join("")}</div><button class="secondary" data-add-item>＋ Inventory item</button><div class="weight-summary ${s.over ? "over-limit" : ""}"><div><strong>${s.weight} / ${s.limit} lb</strong><span>${s.over ? Math.abs(s.remaining) + " lb over limit" : s.remaining + " lb available"}</span></div><progress value="${s.percent}" max="100" aria-label="Carrying limit used">${s.percent}%</progress></div>`;
        break;
      }
      case "Spell requirements":
        fields = `<div class="check-row">${check("verbal", "Verbal (V)", d.verbal)}${check("somatic", "Somatic (S)", d.somatic)}${check("material", "Material (M)", d.material)}</div>${text("description", "Material requirement / casting reminder", d.description, 1000)}<p class="muted">Casting reference only. Materials are not counted or consumed.</p>`;
        break;
    }
  return `<details open class="component" data-structured="${m.id}"><summary>${esc(m.type)}<span>⌄</span></summary><div><input data-component-label="${m.id}" aria-label="Component label" value="${esc(m.label)}" maxlength="200">${fields}${!d && defaultData(m.type) ? '<button class="secondary upgrade-component" data-upgrade-component>Add structured fields</button><p class="muted">Existing text stays intact. New fields start with editable defaults.</p>' : ""}<label class="field">${d ? "Additional notes" : "Details"}<textarea data-component-value="${m.id}" aria-label="${esc(m.type)} details" placeholder="Add details…" maxlength="100000">${esc(m.value)}</textarea></label><button class="text-btn danger" data-remove-component="${m.id}">Remove component</button></div></details>`;
}

export function bindStructuredComponents({ character, save, render, notify }) {
  if (!character) return;
  document.querySelectorAll("[data-structured]").forEach((root) => {
    root
      .querySelectorAll(".ability-field input")
      .forEach((el) =>
        el.setAttribute("aria-label", el.dataset.structuredField.split(".")[1]),
      );
    const component = character.components.find(
      (m) => m.id === root.dataset.structured,
    );
    const commit = (mutate) => {
      const previous = structuredClone(component.data);
      try {
        mutate();
        validateComponentData(component);
        save();
        render();
      } catch (e) {
        component.data = previous;
        notify(e.message);
        render();
      }
    };
    root.querySelectorAll("[data-structured-field]").forEach(
      (el) =>
        (el.onchange = () => {
          if (!el.checkValidity()) {
            el.reportValidity();
            return;
          }
          commit(() => {
            const parts = el.dataset.structuredField.split("."),
              key = parts.pop();
            let target = component.data;
            for (const part of parts) target = target[part];
            target[key] =
              el.type === "checkbox"
                ? el.checked
                : el.type === "number"
                  ? Number(el.value)
                  : key === "ammoId"
                    ? el.value || null
                    : el.value;
            if (component.type === "Ammunition" && key === "maximum")
              target.current = Math.min(target.current, target.maximum);
            if (component.type === "Statistics" && key === "maxHp")
              target.hp = Math.min(target.hp, target.maxHp);
          });
        }),
    );
    root.querySelectorAll("[data-weapon-roll]").forEach(
      (button) =>
        (button.onclick = () => {
          try {
            const w = weaponSummary(character, component),
              attack = button.dataset.weaponRoll === "attack",
              bonus = attack ? w.attack : w.damage,
              expression =
                (attack ? "1d20" : component.data.damageDice) +
                (bonus ? signed(bonus) : "");
            const r = rollDice(expression);
            root.querySelector(".component-roll").textContent =
              `${attack ? "Attack" : "Damage"}: ${r.total} · ${expression} · dice [${r.rolls.join(", ")}]${!attack && component.data.damageType ? " " + component.data.damageType : ""}`;
          } catch (e) {
            notify(e.message);
          }
        }),
    );
    root
      .querySelectorAll("[data-ammo-change]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            commit(
              () =>
                (component.data.current = Math.max(
                  0,
                  Math.min(
                    component.data.maximum,
                    component.data.current + Number(b.dataset.ammoChange),
                  ),
                )),
            )),
      );
    const refill = root.querySelector("[data-ammo-refill]");
    if (refill)
      refill.onclick = () =>
        commit(() => (component.data.current = component.data.maximum));
    const upgrade = root.querySelector("[data-upgrade-component]");
    if (upgrade)
      upgrade.onclick = () =>
        commit(() => (component.data = defaultData(component.type)));
    const add = root.querySelector("[data-add-item]");
    if (add)
      add.onclick = () =>
        commit(() =>
          component.data.items.push({
            id: uid(),
            name: "New item",
            quantity: 1,
            weight: 0,
          }),
        );
    root
      .querySelectorAll("[data-remove-item]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            commit(
              () =>
                (component.data.items = component.data.items.filter(
                  (i) => i.id !== b.dataset.removeItem,
                )),
            )),
      );
    root.querySelectorAll("[data-item-field]").forEach(
      (el) =>
        (el.onchange = () => {
          if (!el.checkValidity()) {
            el.reportValidity();
            return;
          }
          commit(() => {
            const item = component.data.items.find(
              (i) => i.id === el.closest("[data-item]").dataset.item,
            );
            item[el.dataset.itemField] =
              el.type === "number" ? Number(el.value) : el.value;
          });
        }),
    );
  });
}
