import {
  characterFields,
  readCharacterChoices,
  bindCharacterChoices,
} from "./character-builder.js";
import { ActorStore } from "./actors-store.js";
import { renderCharacterFeatures } from "./character-features.js";
import { renderReference } from "./rule-content.js";
import {
  abilityNames,
  createActor,
  validateActor,
  addParticipant,
  adjustHealth,
  fromPreset,
} from "./actors-model.js";
export class ActorsUI {
  constructor({ esc, modal, notify, render, projectId, openTool, newProject }) {
    Object.assign(this, {
      esc,
      modal,
      notify,
      render,
      projectId,
      openTool,
      newProject,
    });
    this.store = new ActorStore();
    this.cache = new Map();
    this.pending = new Map();
    this.errors = new Map();
    this.selected = new Map();
    this.drafts = new Map();
    this.search = { character: "", monster: "" };
    this.presetData = {};
    this.pdfs = new Map();
    this.preview = new Set();
    this.undo = new Map();
    this.amounts = new Map();
  }
  data() {
    const id = this.projectId();
    if (!id) return null;
    if (!this.cache.has(id) && !this.pending.has(id) && !this.errors.has(id)) {
      const p = this.store
        .get(id)
        .then((data) => this.cache.set(id, data))
        .catch((e) => this.errors.set(id, e.message))
        .finally(() => {
          this.pending.delete(id);
          this.render();
        });
      this.pending.set(id, p);
    }
    return this.cache.get(id);
  }
  save(projectId = this.projectId()) {
    const data = this.cache.get(projectId);
    if (!data) throw Error("Library is not loaded.");
    return this.store.put(projectId, data).catch((e) => {
      this.notify("Not saved: " + e.message);
      throw e;
    });
  }
  selectedKey(kind) {
    return this.projectId() + ":" + kind;
  }
  records(kind) {
    return (
      this.data()?.[kind === "character" ? "characters" : "monsters"] || []
    );
  }
  html(tool) {
    const kind = tool === "Characters" ? "character" : "monster",
      data = this.data(),
      esc = this.esc;
    if (!this.projectId())
      return '<div class="actor-toolbar"><button class="primary" data-actor-project>New project</button></div>';
    if (this.errors.has(this.projectId()))
      return `<div class="actor-toolbar"><span role="alert">${esc(this.errors.get(this.projectId()))}</span></div>`;
    if (!data) return '<div class="actor-toolbar" role="status">Loading</div>';
    if (tool === "Encounter") return this.encounter(data);
    const records = this.records(kind),
      selected =
        records.find(
          (r) => r.id === this.selected.get(this.selectedKey(kind)),
        ) || records[0];
    if (selected) this.selected.set(this.selectedKey(kind), selected.id);
    return `<section class="actor-library" data-actor-library="${kind}"><div class="actor-toolbar"><button class="primary" data-create-actor="${kind}">＋ ${kind === "character" ? "Character" : "Monster"}</button>${kind === "monster" ? '<button class="secondary" data-monster-presets>Presets</button>' : ""}<label class="actor-search"><span class="sr-only">Search ${kind === "character" ? "characters" : "monsters"}</span><input type="search" data-actor-search="${kind}" value="${esc(this.search[kind])}" placeholder="Search"></label></div><div class="actor-columns"><div class="actor-list">${this.list(kind)}</div><div class="actor-editor">${selected ? this.editor(selected) : ""}</div></div></section>`;
  }
  list(kind) {
    return this.records(kind)
      .filter((r) =>
        r.name.toLowerCase().includes(this.search[kind].toLowerCase()),
      )
      .map(
        (r) =>
          `<button class="actor-list-item ${this.selected.get(this.selectedKey(kind)) === r.id ? "selected" : ""}" draggable="true" data-actor-id="${r.id}" data-actor-kind="${kind}"><span>${this.esc(r.name)}</span><small>HP ${r.maxHp} · AC ${r.ac}</small><span class="actor-grip" aria-hidden="true">⠿</span></button>`,
      )
      .join("");
  }
  input(name, label, value, type = "text", min = 0, max = 1000000) {
    return `<label class="field">${label}<input name="${name}" type="${type}" value="${this.esc(value)}" ${type === "number" ? `min="${min}" max="${max}" step="1" required` : 'maxlength="200"'}></label>`;
  }
  abilities(values) {
    return `<div class="actor-abilities">${abilityNames.map((a) => this.input("ability-" + a, a, values[a], "number", -20, 30)).join("")}</div>`;
  }
  editor(record) {
    const r = { ...record, ...(this.drafts.get(record.id) || {}) },
      esc = this.esc,
      pdf = this.pdfs.get(record.sheetId);
    if (record.sheetId && this.preview.has(record.id) && !pdf)
      this.loadPdf(record);
    return `<form class="actor-form" data-edit-actor="${record.id}" data-edit-kind="${record.kind}"><div class="actor-editor-toolbar"><button class="primary" type="submit">Save</button><span class="actor-save-state" role="status">${this.drafts.has(record.id) ? "Unsaved" : "Saved"}</span><button class="secondary" type="button" data-add-actor="${record.id}">Add to encounter</button><button class="text-btn danger" type="button" data-delete-actor="${record.id}">Delete</button></div>${this.input("name", "Name", r.name)}<div class="actor-basic-grid">${this.input("maxHp", "Maximum HP", r.maxHp, "number", 1)}${this.input("ac", "AC", r.ac, "number", 0, 100)}${this.input("initiative", "Initiative modifier", r.initiative, "number", -100, 100)}${this.input("speed", "Speed", r.speed)}</div>${record.kind === "character" ? `<details class="actor-section" open><summary>Character</summary>${characterFields(r, esc)}</details>` : ""}${record.kind === "character" && renderCharacterFeatures(r, esc) ? `<details class="actor-section" data-feature-section><summary>Class / species features</summary>${renderCharacterFeatures(r, esc)}</details>` : ""}<details class="actor-section" open><summary>Ability modifiers</summary>${this.abilities(r.abilities)}</details>${[
      ["saves", "Saving throws"],
      ["skills", "Skills"],
      ["attacks", "Weapons / attacks"],
      ["features", "Features / source stat block"],
      ["notes", "Notes"],
    ]
      .map(
        ([field, label]) =>
          `<details class="actor-section"><summary>${label}</summary><label class="field"><span class="sr-only">${label}</span><textarea name="${field}" maxlength="100000" rows="4">${esc(r[field])}</textarea></label></details>`,
      )
      .join(
        "",
      )}<div class="actor-file-controls"><button type="button" class="secondary" data-attach-pdf="${record.id}">${record.sheetId ? "Replace PDF" : "Attach PDF"}</button><input type="file" accept="application/pdf,.pdf" data-pdf-file="${record.id}" hidden>${record.sheetId ? `<button type="button" class="text-btn" data-view-pdf="${record.id}">${this.preview.has(record.id) ? "Hide PDF" : "View PDF"}</button>` : ""}${r.source ? `<a class="text-btn" href="./rules/srd-${r.source.edition}.pdf#page=${r.source.page}" target="_blank" rel="noopener">${esc(r.source.name)} · p. ${r.source.page} ↗</a>` : ""}</div>${record.sheetId && this.preview.has(record.id) ? (pdf?.url ? `<div class="actor-pdf"><a href="${pdf.url}" target="_blank" rel="noopener">Open PDF ↗</a><iframe title="Character sheet PDF" src="${pdf.url}"></iframe></div>` : '<div class="muted" role="status">Loading PDF</div>') : ""}</form>`;
  }
  readForm(form, record) {
    const d = new FormData(form),
      out = { ...record };
    for (const key of [
      "name",
      "speed",
      "className",
      "ancestry",
      "saves",
      "skills",
      "attacks",
      "features",
      "notes",
    ])
      if (d.has(key)) out[key] = d.get(key);
    for (const key of ["maxHp", "ac", "initiative", "level"])
      if (d.has(key)) out[key] = d.get(key) === "" ? NaN : Number(d.get(key));
    out.abilities = { ...record.abilities };
    for (const a of abilityNames)
      if (d.has("ability-" + a))
        out.abilities[a] =
          d.get("ability-" + a) === "" ? NaN : Number(d.get("ability-" + a));
    if (out.kind === "character") readCharacterChoices(d, out);
    return out;
  }
  find(id) {
    const d = this.data();
    return [...(d?.characters || []), ...(d?.monsters || [])].find(
      (r) => r.id === id,
    );
  }
  async commitDraft(id) {
    const projectId = this.projectId();
    const record = this.find(id);
    if (!record) throw Error("Record not found.");
    const updated = validateActor({
      ...record,
      ...(this.drafts.get(id) || {}),
    });
    Object.assign(record, updated);
    await this.save(projectId);
    this.drafts.delete(id);
    return record;
  }
  create(kind) {
    if (!this.data()) return this.notify("Create a project first.");
    const defaults = createActor(kind);
    this.modal(
      kind === "character" ? "New character" : "New monster",
      this.input("name", "Name", "") +
        (kind === "character"
          ? `<div data-create-character-options>${characterFields(defaults, this.esc)}</div>`
          : "") +
        `<div class="actor-basic-grid">${this.input("maxHp", "Maximum HP", defaults.maxHp, "number", 1)}${this.input("ac", "AC", defaults.ac, "number", 0, 100)}</div><details class="actor-section"><summary>Ability modifiers</summary>${this.abilities(defaults.abilities)}</details>`,
      async (data) => {
        const abilities = Object.fromEntries(
          abilityNames.map((a) => [a, Number(data.get("ability-" + a))]),
        );
        const r = validateActor(
          createActor(kind, {
            name: data.get("name").trim(),
            maxHp: Number(data.get("maxHp")),
            ac: Number(data.get("ac")),
            abilities,
          }),
        );
        if (kind === "character") {
          r.level = Number(data.get("level"));
          readCharacterChoices(data, r);
          validateActor(r);
        }
        this.records(kind).push(r);
        await this.save();
        this.selected.set(this.selectedKey(kind), r.id);
        this.render();
      },
      "Create",
    );
    if (kind === "character") {
      const form = document.querySelector("#dialog form");
      const bind = () =>
        bindCharacterChoices(
          form,
          defaults,
          this.readForm.bind(this),
          (next) => {
            form.querySelector("[data-create-character-options]").innerHTML =
              characterFields(next, this.esc);
            bind();
          },
        );
      bind();
    }
  }
  async presets(edition) {
    if (this.presetData[edition]) return this.presetData[edition];
    const r = await fetch(`./presets/monsters-${edition}.json`);
    if (!r.ok) throw Error("Presets unavailable.");
    const data = await r.json();
    data.presets.forEach(validateActor);
    this.presetData[edition] = data;
    return data;
  }
  presetDialog() {
    let data = null,
      selected = null,
      request = 0;
    this.modal(
      "Monster presets",
      '<div class="actor-basic-grid"><label class="field">Edition<select name="edition" aria-label="Preset edition"><option>2024</option><option>2014</option></select></label><label class="field">Search<input type="search" name="query" aria-label="Search presets"></label></div><label class="field">Monster<select name="preset" size="8" aria-label="Monster preset"></select></label><div class="actor-basic-grid">' +
        this.input("maxHp", "Maximum HP", 1, "number", 1) +
        this.input("ac", "AC", 10, "number", 0, 100) +
        '</div><div class="preset-status" role="status"></div><a class="text-btn" href="./rules/ATTRIBUTION.txt" target="_blank" rel="noopener">SRD sources ↗</a>',
      async (fields) => {
        if (!data || !selected) throw Error("Select a monster.");
        if (!this.data()) throw Error("Create a project first.");
        const record = validateActor(
          fromPreset({
            ...selected,
            maxHp: Number(fields.get("maxHp")),
            ac: Number(fields.get("ac")),
          }),
        );
        this.records("monster").push(record);
        await this.save();
        this.selected.set(this.selectedKey("monster"), record.id);
        this.render();
      },
      "Use preset",
    );
    const dialog = document.querySelector("#dialog"),
      list = dialog.querySelector("[name=preset]"),
      search = dialog.querySelector("[name=query]"),
      edition = dialog.querySelector("[name=edition]");
    const select = () => {
      selected = data?.presets.find((p) => p.id === list.value) || null;
      if (selected) {
        dialog.querySelector("[name=maxHp]").value = selected.maxHp;
        dialog.querySelector("[name=ac]").value = selected.ac;
      }
    };
    const filter = () => {
      const rows =
        data?.presets.filter((p) =>
          (p.name + " " + p.challenge)
            .toLowerCase()
            .includes(search.value.toLowerCase()),
        ) || [];
      list.innerHTML = rows
        .map(
          (p) =>
            `<option value="${p.id}">${this.esc(p.name)} · CR ${this.esc(p.challenge)}</option>`,
        )
        .join("");
      if (rows.length) list.value = rows[0].id;
      select();
      dialog.querySelector(".preset-status").textContent =
        rows.length + " presets";
    };
    const load = async () => {
      const token = ++request;
      data = null;
      selected = null;
      list.innerHTML = "";
      dialog.querySelector(".preset-status").textContent = "Loading";
      try {
        const result = await this.presets(edition.value);
        if (token !== request || !dialog.open) return;
        data = result;
        filter();
      } catch (e) {
        dialog.querySelector(".preset-status").textContent = e.message;
      }
    };
    edition.onchange = load;
    search.oninput = filter;
    list.onchange = select;
    load();
  }
  async loadPdf(record) {
    const projectId = this.projectId();
    if (this.pdfs.has(record.sheetId)) return;
    const id = record.sheetId;
    this.pdfs.set(id, { loading: true });
    try {
      const sheet = await this.store.getSheet(id);
      if (
        !sheet ||
        sheet.projectId !== projectId ||
        sheet.recordId !== record.id
      )
        throw Error("PDF unavailable.");
      this.pdfs.set(id, {
        url: URL.createObjectURL(sheet.blob),
        name: sheet.name,
      });
      this.render();
    } catch (e) {
      this.pdfs.delete(id);
      this.preview.delete(record.id);
      this.notify(e.message);
      this.render();
    }
  }
  async add(id) {
    try {
      const projectId = this.projectId(),
        data = this.data();
      const record = await this.commitDraft(id);
      const p = addParticipant(data, record);
      this.selectedParticipant = p.id;
      await this.save(projectId);
      if (this.projectId() === projectId) this.openTool("Encounter");
    } catch (e) {
      this.notify(e.message);
    }
  }
  encounter(data) {
    const esc = this.esc,
      selected =
        data.participants.find((p) => p.id === this.selectedParticipant) ||
        data.participants[0];
    if (selected) this.selectedParticipant = selected.id;
    return `<section class="encounter-panel"><div class="actor-toolbar"><button class="primary" data-pick-participant>＋ Participant</button></div><div class="encounter-drop" data-encounter-drop><span>Drop characters / monsters</span></div><div class="encounter-columns"><div class="participant-list">${data.participants.map((p) => `<button class="participant-row ${p.id === selected?.id ? "selected" : ""}" data-participant="${p.id}"><span>${esc(p.name)} <small>#${p.instance}</small></span><strong>${p.hp} / ${p.maxHp}</strong></button>`).join("")}</div><div class="participant-editor">${
      selected
        ? `<div class="participant-heading"><h2>${esc(selected.name)} <small>#${selected.instance}</small></h2><button class="text-btn danger" data-remove-participant="${selected.id}">Remove</button></div><div class="health-display ${selected.hp === 0 ? "zero-hp" : ""}"><output aria-label="Current health">${selected.hp} / ${selected.maxHp}</output>${selected.tempHp ? `<span>Temp ${selected.tempHp}</span>` : ""}</div><div class="health-controls"><label class="field">HP amount<input type="number" data-hp-amount="${selected.id}" min="0" max="1000000" step="1" value="${this.amounts.get(selected.id) ?? 1}" required></label><button class="secondary" data-health="heal">Add HP</button><button class="primary" data-health="damage">Damage</button>${this.undo.has(selected.id) ? '<button class="text-btn" data-undo-health>Undo</button>' : ""}</div><form data-participant-stats="${selected.id}"><details class="actor-section"><summary>Combat stats</summary><div class="actor-basic-grid">${this.input("hp", "Current HP", selected.hp, "number")}${this.input("maxHp", "Maximum HP", selected.maxHp, "number", 1)}${this.input("tempHp", "Temporary HP", selected.tempHp, "number")}${this.input("ac", "AC", selected.ac, "number", 0, 100)}${this.input("initiative", "Initiative", selected.initiative, "number", -100, 100)}</div>${this.input("conditions", "Conditions", selected.conditions)}<button type="submit" class="secondary">Save stats</button></details></form><details class="actor-section"><summary>Character / monster details</summary><div class="participant-modifiers">${abilityNames.map((a) => `<span>${a} ${selected.snapshot.abilities[a] >= 0 ? "+" : ""}${selected.snapshot.abilities[a]}</span>`).join("")}</div>${[
            ["Saving throws", selected.snapshot.saves],
            ["Skills", selected.snapshot.skills],
            ["Weapons / attacks", selected.snapshot.attacks],

            ["Features", selected.snapshot.features],
          ]
            .filter(([, value]) => value)
            .map(
              ([label, value]) =>
                `<details class="actor-section"><summary>${label}</summary><div class="actor-text">${renderReference(value, esc, selected.snapshot.source || {})}</div></details>`,
            )
            .join(
              "",
            )}${selected.snapshot.kind === "character" ? renderCharacterFeatures(selected.snapshot, esc, { readonly: true }) : ""}</details>`
        : ""
    }</div></div></section>`;
  }
  bind() {
    document
      .querySelectorAll("[data-actor-project]")
      .forEach((b) => (b.onclick = this.newProject));
    document
      .querySelectorAll("[data-create-actor]")
      .forEach((b) => (b.onclick = () => this.create(b.dataset.createActor)));
    document
      .querySelectorAll("[data-monster-presets]")
      .forEach((b) => (b.onclick = () => this.presetDialog()));
    const bindList = (root) =>
      root.querySelectorAll("[data-actor-id]").forEach((b) => {
        b.onclick = () => {
          this.selected.set(
            this.selectedKey(b.dataset.actorKind),
            b.dataset.actorId,
          );
          this.render();
        };
        b.ondragstart = (e) => {
          const record = this.find(b.dataset.actorId);
          try {
            if (this.drafts.has(record.id))
              throw Error("Save the record before dragging.");
            e.dataTransfer.setData(
              "application/waypoint-record",
              JSON.stringify({ id: record.id, projectId: this.projectId() }),
            );
            e.dataTransfer.effectAllowed = "copy";
          } catch (error) {
            e.preventDefault();
            this.notify(error.message);
          }
        };
      });
    document.querySelectorAll("[data-actor-library]").forEach((root) => {
      bindList(root);
      root.querySelector("[data-actor-search]").oninput = (e) => {
        this.search[root.dataset.actorLibrary] = e.target.value;
        root.querySelector(".actor-list").innerHTML = this.list(
          root.dataset.actorLibrary,
        );
        bindList(root);
      };
    });
    document.querySelectorAll("[data-edit-actor]").forEach((form) => {
      const record = this.find(form.dataset.editActor);
      form.oninput = () => {
        this.drafts.set(record.id, this.readForm(form, record));
        form.querySelector(".actor-save-state").textContent = "Unsaved";
      };
      if (record.kind === "character")
        bindCharacterChoices(form, record, this.readForm.bind(this), (next) => {
          this.drafts.set(record.id, next);
          this.render();
        });
      const bindFeatures = () => {
        form
          .querySelectorAll("[data-feature-choice-input]")
          .forEach((input) => {
            const update = () => {
              const open = new Set(
                [...form.querySelectorAll("[data-feature-id][open]")].map(
                  (d) => d.dataset.featureId,
                ),
              );
              const next = this.readForm(form, record);
              this.drafts.set(record.id, next);
              const host = form.querySelector("[data-character-features]");
              if (host)
                host.outerHTML = renderCharacterFeatures(next, this.esc);
              form
                .querySelectorAll("[data-feature-id]")
                .forEach((d) => (d.open = open.has(d.dataset.featureId)));
              form.querySelector(".actor-save-state").textContent = "Unsaved";
              bindFeatures();
            };
            input.onchange = update;
          });
      };
      bindFeatures();
      form.onsubmit = async (e) => {
        e.preventDefault();
        try {
          this.drafts.set(record.id, this.readForm(form, record));
          await this.commitDraft(record.id);
          this.render();
        } catch (error) {
          this.notify(error.message);
        }
      };
    });
    document
      .querySelectorAll("[data-add-actor]")
      .forEach((b) => (b.onclick = () => this.add(b.dataset.addActor)));
    document.querySelectorAll("[data-delete-actor]").forEach(
      (b) =>
        (b.onclick = () => {
          const r = this.find(b.dataset.deleteActor);
          this.modal(
            "Delete " + r.name,
            "",
            async () => {
              const data = this.data(),
                key = r.kind === "character" ? "characters" : "monsters";
              data[key] = data[key].filter((a) => a.id !== r.id);
              this.drafts.delete(r.id);
              await this.save();
              this.render();
            },
            "Delete",
          );
        }),
    );
    document
      .querySelectorAll("[data-attach-pdf]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            b.closest("form").querySelector("[data-pdf-file]").click()),
      );
    document.querySelectorAll("[data-pdf-file]").forEach(
      (input) =>
        (input.onchange = async () => {
          const file = input.files[0];
          if (!file) return;
          const record = this.find(input.dataset.pdfFile),
            projectId = this.projectId();
          try {
            const id = await this.store.putSheet(projectId, record.id, file);
            record.sheetId = id;
            if (this.drafts.has(record.id))
              this.drafts.get(record.id).sheetId = id;
            await this.save(projectId);
            this.preview.add(record.id);
            this.render();
          } catch (e) {
            this.notify(e.message);
          }
          input.value = "";
        }),
    );
    document.querySelectorAll("[data-view-pdf]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.viewPdf;
          this.preview.has(id) ? this.preview.delete(id) : this.preview.add(id);
          this.render();
        }),
    );
    document.querySelectorAll("[data-participant]").forEach(
      (b) =>
        (b.onclick = () => {
          this.selectedParticipant = b.dataset.participant;
          this.render();
        }),
    );
    document
      .querySelectorAll("[data-hp-amount]")
      .forEach(
        (el) =>
          (el.oninput = () => this.amounts.set(el.dataset.hpAmount, el.value)),
      );
    document.querySelectorAll("[data-health]").forEach(
      (b) =>
        (b.onclick = async () => {
          const input = document.querySelector("[data-hp-amount]");
          if (!input.checkValidity()) return input.reportValidity();
          const participant = this.data()?.participants.find(
            (p) => p.id === input.dataset.hpAmount,
          );
          try {
            this.undo.set(participant.id, {
              hp: participant.hp,
              tempHp: participant.tempHp,
            });
            adjustHealth(participant, Number(input.value), b.dataset.health);
            await this.save();
            this.render();
          } catch (e) {
            this.notify(e.message);
          }
        }),
    );
    const undo = document.querySelector("[data-undo-health]");
    if (undo)
      undo.onclick = async () => {
        const p = this.data().participants.find(
          (p) => p.id === this.selectedParticipant,
        );
        Object.assign(p, this.undo.get(p.id));
        p.hp = Math.min(p.hp, p.maxHp);
        this.undo.delete(p.id);
        await this.save();
        this.render();
      };
    document.querySelectorAll("[data-participant-stats]").forEach(
      (form) =>
        (form.onsubmit = async (e) => {
          e.preventDefault();
          const p = this.data().participants.find(
              (p) => p.id === form.dataset.participantStats,
            ),
            values = new FormData(form),
            before = structuredClone(p);
          try {
            for (const key of ["hp", "maxHp", "tempHp", "ac", "initiative"])
              p[key] = Number(values.get(key));
            p.hp = Math.min(p.hp, p.maxHp);
            p.conditions = values.get("conditions");
            await this.save();
            this.undo.delete(p.id);
            this.render();
          } catch (error) {
            Object.assign(p, before);
            this.notify(error.message);
          }
        }),
    );
    document.querySelectorAll("[data-remove-participant]").forEach(
      (b) =>
        (b.onclick = async () => {
          this.data().participants = this.data().participants.filter(
            (p) => p.id !== b.dataset.removeParticipant,
          );
          await this.save();
          this.render();
        }),
    );
    const pick = document.querySelector("[data-pick-participant]");
    if (pick)
      pick.onclick = () => {
        const records = [
          ...this.records("character"),
          ...this.records("monster"),
        ];
        this.modal(
          "Add participant",
          `<label class="field">Character / monster<select name="record" aria-label="Character / monster">${records.map((r) => `<option value="${r.id}">${this.esc(r.name)}</option>`).join("")}</select></label>`,
          async (data) => {
            if (!data.get("record"))
              throw Error("Create a character or monster first.");
            await this.add(data.get("record"));
          },
          "Add",
        );
      };
    document
      .querySelectorAll(
        '[data-encounter-drop],[data-open-tool="Encounter"],[data-dock-tab="Encounter"]',
      )
      .forEach((target) => {
        target.addEventListener("dragover", (e) => {
          if (e.dataTransfer.types.includes("application/waypoint-record")) {
            e.preventDefault();
            target.classList.add("record-drag-over");
          }
        });
        target.addEventListener("dragleave", () =>
          target.classList.remove("record-drag-over"),
        );
        target.addEventListener(
          "drop",
          (e) => {
            const raw = e.dataTransfer.getData("application/waypoint-record");
            if (!raw) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            target.classList.remove("record-drag-over");
            try {
              const payload = JSON.parse(raw);
              if (payload.projectId !== this.projectId())
                throw Error("Choose a record from this project.");
              this.add(payload.id);
            } catch (error) {
              this.notify(error.message);
            }
          },
          true,
        );
      });
  }
}
