import { characterOptions } from "./character-options.js";
import { readFeatureChoices } from "./character-features.js";

export function characterFields(r, esc) {
  const edition = r.rulesEdition || "2024";
  const options = characterOptions[edition];
  const choice = (field, label, rows, value) => {
    const custom =
      r[field + "Custom"] || (value && !rows.some((o) => o.name === value));
    return `<label class="field">${label}<select aria-label="${label}" name="${field}Choice" data-character-choice><option value="">Select</option>${rows.map((o) => `<option ${!custom && o.name === value ? "selected" : ""}>${esc(o.name)}</option>`).join("")}<option value="__custom" ${custom ? "selected" : ""}>Custom</option></select></label><label class="field" ${custom ? "" : "hidden"}>Custom ${label.toLowerCase()}<input name="${field}" value="${esc(custom ? value : "")}" maxlength="200"></label>`;
  };
  return `<div class="actor-basic-grid"><label class="field">Rules edition<select aria-label="Rules edition" name="rulesEdition" data-character-choice><option ${edition === "2024" ? "selected" : ""}>2024</option><option ${edition === "2014" ? "selected" : ""}>2014</option></select></label><label class="field">Level<input name="level" type="number" min="1" max="20" step="1" value="${esc(r.level)}" required data-character-choice></label>${choice("className", "Class", options.classes, r.className)}${choice("ancestry", "Species / ancestry", options.species, r.ancestry)}${choice("background", "Background", options.backgrounds || [], r.background || "")}</div>`;
}

export function applyCharacterOptions(r) {
  const options = characterOptions[r.rulesEdition || "2024"];
  const cls =
    !r.classNameCustom && options.classes.find((c) => c.name === r.className);
  const species =
    !r.ancestryCustom && options.species.find((c) => c.name === r.ancestry);
  const sections = [];
  if (cls) {
    if (cls.core) sections.push(cls.name + " — core traits\n" + cls.core);
    sections.push(
      ...cls.features
        .filter((f) => f.level <= r.level)
        .map((f) => f.title + " (p. " + f.page + ")\n" + f.text),
    );
  }
  if (species)
    sections.push(
      ...species.features.map(
        (f) =>
          species.name +
          " traits / options: " +
          f.title +
          " (p. " +
          f.page +
          ")\n" +
          f.text,
      ),
    );
  r.generatedFeatures = sections.join("\n\n");
  return r;
}

export function readCharacterChoices(data, out) {
  if (data.has("rulesEdition")) out.rulesEdition = data.get("rulesEdition");
  for (const key of ["className", "ancestry", "background"]) {
    if (data.has(key + "Choice")) {
      out[key + "Custom"] = data.get(key + "Choice") === "__custom";
      out[key] =
        data.get(key + "Choice") === "__custom"
          ? data.get(key)
          : data.get(key + "Choice");
    }
  }
  readFeatureChoices(data, out);
  return applyCharacterOptions(out);
}

export function bindCharacterChoices(form, record, readForm, changed) {
  form.querySelectorAll("[data-character-choice]").forEach((el) => {
    el.onchange = () => {
      const next = readForm(form, record);
      // Changing editions keeps custom text; unavailable standard species become unselected.
      if (el.name === "rulesEdition") {
        const options = characterOptions[next.rulesEdition];
        if (
          !options.species.some((c) => c.name === next.ancestry) &&
          form.elements.ancestryChoice.value !== "__custom"
        )
          next.ancestry = "";
        if (
          !options.backgrounds?.some((b) => b.name === next.background) &&
          form.elements.backgroundChoice?.value !== "__custom"
        )
          next.background = "";
      }
      applyCharacterOptions(next);
      changed(next);
    };
  });
}
