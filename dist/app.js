import { WorkspacePanels } from "./workspace-ui.js";
import { RulesPanel } from "./rules-ui.js";
import { makeComponent, componentSummary } from "./components.js";
import { componentEditor, bindStructuredComponents } from "./component-ui.js";
import { roadmap } from "./roadmap.js";
import {
  uid,
  categories,
  createCampaign,
  validateCampaign,
  importCampaign,
  removeCard,
  rollDice,
} from "./model.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
let db,
  projects = [],
  project,
  view = "Overview",
  selectedNote = null,
  selectedCharacter = null,
  filter = "",
  pendingImageCard = null,
  saveChain = Promise.resolve();
let prefs;
try {
  prefs = JSON.parse(localStorage.getItem("waypoint-settings") || "{}");
} catch {
  prefs = {};
}
prefs = {
  theme: "paper",
  font: "sans",
  size: 16,
  inspector: innerWidth > 1350,
  sidebar: innerWidth > 700,
  ...prefs,
};
const icons = {
  Overview: "◈",
  Notes: "▤",
  Characters: "♙",
  "Idea board": "◇",
  Rules: "▥",
  Dice: "⚄",
  Roadmap: "☷",
  Settings: "⚙",
};
const componentOpen = new Map();
let lastDockView = null;
let panelDice = { expression: "1d20", history: [] };
const dock = new WorkspacePanels({
  prefs,
  savePrefs,
  esc,
  icons,
  render,
  modal,
  notify,
  onFocus: (tool) => {
    view = tool;
    lastDockView = tool;
    syncWorkspaceFocus(tool);
  },
});
view = dock.activeTool || "Workspace";
lastDockView = view;
function syncWorkspaceFocus(tool) {
  const crumb = document.querySelector(".breadcrumbs strong");
  if (crumb) crumb.textContent = tool;
  document
    .querySelectorAll("nav [data-view]")
    .forEach((el) => el.classList.toggle("active", el.dataset.view === tool));
}

const rulesPanel = new RulesPanel({ esc, prefs, savePrefs, notify });
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $("#toast").classList.remove("show"), 4000);
}
function store(mode = "readonly") {
  return db.transaction("data", mode).objectStore("data");
}
const read = (key) =>
  new Promise((resolve, reject) => {
    const r = store().get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
function write(key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
async function boot() {
  try {
    db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("waypoint", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("data");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    projects = (await read("campaigns")) || [];
    projects.forEach(validateCampaign);
    if (!projects.length) {
      projects = [createCampaign()];
      await write("campaigns", projects);
    }
    project = projects.find((p) => p.id === prefs.campaign) || projects[0];
    render();
  } catch (e) {
    $("#app").innerHTML =
      `<main class="fatal"><h1>Couldn’t open local storage</h1><p>${esc(e.message)}</p><p>Try opening this app in a browser with IndexedDB enabled. Existing data has not been replaced.</p></main>`;
  }
}
function save() {
  project.updatedAt = new Date().toISOString();
  const snapshot = structuredClone(projects);
  $("#save-state")?.replaceChildren(document.createTextNode("Saving…"));
  saveChain = saveChain
    .catch(() => {})
    .then(async () => {
      const previous = await read("campaigns");
      if (previous) await write("backup", previous);
      await write("campaigns", snapshot);
      $("#save-state")?.replaceChildren(
        document.createTextNode("Saved on this device"),
      );
    })
    .catch((e) => {
      notify("Save failed. Export a backup now. " + e.message);
      $("#save-state")?.replaceChildren(
        document.createTextNode("Not saved — export backup"),
      );
    });
  return saveChain;
}
function savePrefs() {
  try {
    localStorage.setItem("waypoint-settings", JSON.stringify(prefs));
  } catch {
    notify("Could not save appearance settings.");
  }
}
function applyPrefs() {
  document.documentElement.dataset.theme = prefs.theme;
  document.documentElement.dataset.font = prefs.font;
  document.documentElement.style.fontSize = prefs.size + "px";
}
function render() {
  dock.capture();
  if (view !== lastDockView) {
    dock.route(view);
    lastDockView = view;
  }
  document
    .querySelectorAll("details[data-structured]")
    .forEach((el) => componentOpen.set(el.dataset.structured, el.open));
  applyPrefs();
  $("#app").innerHTML =
    `<div class="shell ${prefs.sidebar ? "" : "hide-nav"} ${prefs.inspector ? "" : "hide-inspector"}"><aside class="sidebar"><a class="brand" href="#" data-action="home"><span class="brand-mark">➤</span> waypoint<span class="brand-dot">.</span></a><div class="workspace-label">YOUR WORKSPACE <span>LOCAL</span></div><label class="sr-only" for="campaign-select">Campaign</label><select id="campaign-select">${projects.map((p) => `<option value="${p.id}" ${p.id === project.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button class="new-campaign" data-action="new-campaign">＋ New campaign</button><div class="nav-label">CAMPAIGN</div><nav>${Object.entries(
      icons,
    )
      .map(
        ([name, icon]) =>
          `<button data-view="${name}" class="nav-item ${view === name ? "active" : ""}"><span>${icon}</span>${name}${name === "Idea board" ? "<small>CANVAS</small>" : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="sidebar-bottom"><div class="edition-badge">${project.edition} RULESET <span>DM workspace</span></div><button class="nav-item" data-action="export"><span>↗</span> Export campaign</button><button class="nav-item" data-action="import"><span>↙</span> Import campaign</button><p>Your stories stay yours.<br>No accounts. No cloud required.</p></div></aside><section class="workspace"><header class="topbar"><div class="breadcrumbs"><button class="icon-btn" data-action="sidebar" aria-label="Toggle navigation">☰</button><span>${esc(project.name)}</span><span class="crumb-slash">/</span><strong>${view}</strong></div><div class="top-tools"><span id="save-state" class="save-state">Saved on this device</span><button class="icon-btn" data-action="dice" aria-label="Open dice roller">⚄</button><button class="icon-btn" data-action="inspector" aria-label="Toggle quick reference">▥</button></div></header><main id="main">${dock.html(content)}</main><footer class="statusbar"><span><i></i> LOCAL-FIRST WORKSPACE</span><span>${project.edition} edition <b>·</b> ${project.characters.length} characters <b>·</b> ${project.notes.length} notes</span><button data-action="export">Back up your adventure ↗</button></footer></section><aside class="inspector"><div class="inspector-title">AT YOUR SIDE<button class="icon-btn" data-action="inspector" aria-label="Collapse quick reference">›</button></div><div class="inspector-section"><span class="eyebrow">CAMPAIGN COMPASS</span><h3>Make room for the unexpected.</h3><p>A good session starts with a few strong ideas. Keep the rest within reach.</p></div><div class="inspector-section"><span class="eyebrow">QUICK ROLL</span><form id="quick-dice"><label class="sr-only" for="dice-expression">Dice expression</label><div class="inline"><input id="dice-expression" name="expression" value="1d20" maxlength="20"><button class="primary" type="submit">Roll</button></div></form><div id="dice-result" class="dice-result">⚄<small>Your next possibility.</small></div><div class="dice-presets">${[4, 6, 8, 10, 12, 20].map((d) => `<button data-roll="1d${d}">d${d}</button>`).join("")}</div></div><div class="inspector-section"><span class="eyebrow">YOUR CREW</span>${
      project.characters
        .slice(0, 4)
        .map(
          (c) =>
            `<button class="crew-person" data-character="${c.id}"><span class="avatar ${esc(c.color || "sea")}">${esc(c.name.charAt(0))}</span><span>${esc(c.name)}<small>${esc(c.role || "Character")}</small></span><span>↗</span></button>`,
        )
        .join("") || "<p>Add your first character to keep them close.</p>"
    }</div><div class="quiet-note"><span>✧</span><p>Leave a little space<br>for a better idea.</p></div></aside></div>`;
  bind();
  dock.bind();
  document.querySelectorAll("details[data-structured]").forEach((el) => {
    if (componentOpen.has(el.dataset.structured))
      el.open = componentOpen.get(el.dataset.structured);
  });
}
function heading(eyebrow, title, description, buttons = "") {
  return `<div class="page-heading"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${description}</p></div><div class="heading-actions">${buttons}</div></div>`;
}
function content(tool = view, paneSize = {}) {
  if (tool === "Overview") return overview();
  if (tool === "Notes") return notesView();
  if (tool === "Characters") return charactersView();
  if (tool === "Idea board") return boardView();
  if (tool === "Settings") return settingsView();
  if (tool === "Roadmap") return roadmapView();
  if (tool === "Dice") return diceView();
  return rulesView(paneSize);
}
function diceView() {
  return (
    heading(
      "A POSSIBILITY IN EVERY ROLL",
      "Roll the next possibility.",
      "Manual rolls, within reach of your other tools.",
    ) +
    `<section class="paper-editor dice-panel"><form id="workspace-dice"><label class="field">Dice expression<input id="workspace-dice-expression" name="expression" value="${esc(panelDice.expression)}" placeholder="2d6+3" maxlength="20" required></label><button class="primary" type="submit">Roll dice</button></form><div class="panel-dice-presets">${[4, 6, 8, 10, 12, 20, 100].map((n) => `<button class="secondary" data-panel-roll="1d${n}">d${n}</button>`).join("")}</div><div id="workspace-dice-result" aria-live="polite">${panelDice.history.map((r) => `<div class="panel-roll"><strong>${r.total}</strong><span>${esc(r.expression)}<small>Dice [${r.rolls.join(", ")}]${r.modifier ? " · modifier " + r.modifier : ""}</small></span></div>`).join("") || '<p class="muted">Try 1d20, 2d6+3, or 4d8. Rolls stay in this session.</p>'}</div></section>`
  );
}
function overview() {
  return (
    heading(
      "A LITTLE PREPARATION. A WORLD OF POSSIBILITY.",
      "Your next adventure starts here.",
      "Gather the threads. Give your characters a place to go.",
      '<button class="primary" data-action="new-note">＋ New note</button>',
    ) +
    `<section class="campaign-hero"><div class="hero-content"><span class="pill">CAMPAIGN IN PROGRESS</span><h2>${esc(project.name)}</h2><p>Every great story begins with a few connected ideas.<br>Let’s see where yours lead.</p><button class="hero-button" data-view="Idea board">Open your idea board <span>↗</span></button></div><div class="compass-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="north">N</span><div class="compass-needle">✧</div><span class="east">E</span><span class="south">S</span><span class="west">W</span></div><span class="hero-coordinate">YOUR WORLD. YOUR WAY.</span></section><div class="section-title"><h2>Pick up a thread</h2><span>Small pieces. A bigger story.</span></div><div class="launch-grid"><button class="launch-card" data-view="Notes"><span class="tile-icon clay">▤</span><h3>Campaign notes <span>↗</span></h3><p>Scenes, secrets, and everything<br>you don’t want to forget.</p><small>${project.notes.length} NOTES</small></button><button class="launch-card" data-view="Characters"><span class="tile-icon sea">♙</span><h3>People & parties <span>↗</span></h3><p>Build your cast. Keep their<br>details connected.</p><small>${project.characters.length} CHARACTERS · ${project.groups.length} GROUPS</small></button><button class="launch-card" data-view="Idea board"><span class="tile-icon gold">◇</span><h3>Room to imagine <span>↗</span></h3><p>Follow an idea. Connect it<br>to something unexpected.</p><small>${project.cards.length} CARDS</small></button></div><div class="section-title"><h2>On your writing desk</h2><button class="text-btn" data-view="Notes">All notes →</button></div><div class="recent-list">${
      project.notes
        .slice(0, 3)
        .map(
          (n) =>
            `<button data-note="${n.id}" class="recent-note"><span class="note-symbol ${n.category === "Locations" ? "sea" : "clay"}">${n.category === "Locations" ? "⌖" : "▤"}</span><span><strong>${esc(n.title)}</strong><small>${esc(n.category)} <b>·</b> ${esc(n.body.split("\n").find((l) => l.trim()) || "An unwritten possibility")}</small></span><span class="recent-arrow">↗</span></button>`,
        )
        .join("") ||
      '<div class="empty">A blank page is a good beginning. Create your first note.</div>'
    }</div>`
  );
}
function notesView() {
  let n = project.notes.find((n) => n.id === selectedNote) || project.notes[0];
  selectedNote = n?.id;
  const cats = [
    ...new Set([...categories, ...project.notes.map((n) => n.category)]),
  ];
  return (
    heading(
      "YOUR CAMPAIGN NOTEBOOK",
      "A place for every thread.",
      "Keep scenes, places, and secrets close at hand.",
      '<button class="primary" data-action="new-note">＋ New note</button>',
    ) +
    `<div class="editor-layout"><section class="record-list"><label class="search-label">⌕ <input id="note-search" placeholder="Find a note…" value="${esc(filter)}" aria-label="Find a note"></label><div id="note-tree">${noteTree(cats)}</div></section><section class="paper-editor">${n ? `<div class="editor-toolbar"><span class="eyebrow">NOTE</span><button class="danger text-btn" data-action="delete-note">Delete note</button></div><input class="title-input" id="note-title" value="${esc(n.title)}" aria-label="Note title"><label class="field compact">Category<input id="note-category" value="${esc(n.category)}" list="categories" maxlength="100"><datalist id="categories">${cats.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></label><textarea id="note-body" class="note-body" placeholder="Start with an image, a question, a secret…" aria-label="Note text">${esc(n.body)}</textarea><small class="muted">Plain text · Saves as you write · Custom categories welcome</small>` : '<div class="empty">Create a note to begin.</div>'}</section></div>`
  );
}
function noteTree(cats) {
  return (
    cats
      .map((cat) => {
        const entries = project.notes.filter(
          (n) =>
            n.category === cat &&
            `${n.title} ${n.body}`.toLowerCase().includes(filter.toLowerCase()),
        );
        return entries.length
          ? `<details open><summary>▱ ${esc(cat)} <small>${entries.length}</small></summary>${entries.map((n) => `<button data-note="${n.id}" class="tree-note ${selectedNote === n.id ? "selected" : ""}">${esc(n.title)}</button>`).join("")}</details>`
          : "";
      })
      .join("") || '<p class="empty">No matching notes.</p>'
  );
}
function charactersView() {
  let c =
    project.characters.find((c) => c.id === selectedCharacter) ||
    project.characters[0];
  selectedCharacter = c?.id;
  return (
    heading(
      "THE PEOPLE WHO MAKE YOUR WORLD",
      "Every character has layers.",
      "Attach components. Link groups. Keep one shared record.",
      '<button class="secondary" data-action="new-group">＋ Group</button><button class="primary" data-action="new-character">＋ Character</button>',
    ) +
    `<div class="editor-layout"><section class="record-list"><span class="eyebrow">CHARACTERS</span>${project.characters.map((p) => `<button draggable="true" data-drag-character="${p.id}" data-character="${p.id}" class="character-row ${p.id === c?.id ? "selected" : ""}"><span class="avatar ${esc(p.color || "sea")}">${esc(p.name[0])}</span><span>${esc(p.name)}<small>${esc(p.role)}</small></span></button>`).join("")}<div class="group-list"><span class="eyebrow">GROUPS · DROP A CHARACTER HERE</span>${project.groups
      .map(
        (g) =>
          `<div class="group-drop" data-group="${g.id}"><strong>▱ ${esc(g.name)}</strong>${
            project.characters
              .filter((c) => c.groupIds.includes(g.id))
              .map(
                (c) =>
                  `<button data-character="${c.id}">${esc(c.name)} ↗</button>`,
              )
              .join("") || "<small>No members yet</small>"
          }</div>`,
      )
      .join(
        "",
      )}</div></section><section class="paper-editor">${c ? `<div class="editor-toolbar"><span class="eyebrow">MODULAR CHARACTER RECORD</span><button class="text-btn danger" data-action="delete-character">Delete</button></div><input id="character-name" class="title-input" aria-label="Character name" value="${esc(c.name)}"><input id="character-role" class="subtitle-input" aria-label="Character role" placeholder="Role, affiliation, first impression…" value="${esc(c.role)}"><div class="memberships"><span class="eyebrow">BELONGS TO</span>${project.groups.map((g) => `<label><input type="checkbox" data-membership="${g.id}" ${c.groupIds.includes(g.id) ? "checked" : ""}>${esc(g.name)}</label>`).join("") || "<small>Create a group to link this character.</small>"}</div><div class="component-palette"><span class="eyebrow">ATTACH A COMPONENT · CLICK OR DRAG BELOW</span><div>${["Statistics", "Weapon", "Ammunition", "Inventory", "Spell requirements", "Notes"].map((t) => `<button draggable="true" data-component="${t}">＋ ${t}</button>`).join("")}</div></div><div id="component-drop" class="components">${c.components.map((m) => componentEditor(m, c, esc)).join("") || '<div class="empty">Drop a component here to build this character.</div>'}</div>` : '<div class="empty">Add a character to begin.</div>'}</section></div>`
  );
}
function boardView() {
  return (
    heading(
      "FOLLOW THE CONNECTIONS",
      "Give your ideas room.",
      "Drag cards by their handles. Connect ideas. Drop characters onto the canvas.",
      '<button class="secondary" data-action="connect">↗ Connect cards</button><button class="primary" data-action="new-card">＋ Add card</button>',
    ) +
    `<div class="board-people">${project.characters.map((c) => `<span draggable="true" data-drag-character="${c.id}" class="character-chip">♙ ${esc(c.name)} <span>⠿</span></span>`).join("")}<span class="muted">Drag onto the board to reference</span></div><div class="board-viewport" tabindex="0" aria-label="Scrollable brainstorming board"><div id="board" class="board"><svg class="connections" width="4400" height="4400" aria-hidden="true"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="var(--line-color)"/></marker></defs>${project.connections
      .map((l) => {
        const a = project.cards.find((c) => c.id === l.from),
          b = project.cards.find((c) => c.id === l.to);
        return `<path d="M${a.x + 145},${a.y + 100} L${b.x + 145},${b.y + 100}" marker-end="url(#arrow)"/><text x="${(a.x + b.x) / 2 + 145}" y="${(a.y + b.y) / 2 + 88}">${esc(l.label)}</text>`;
      })
      .join(
        "",
      )}</svg>${project.cards.map(cardHTML).join("")}</div></div><div class="board-footer"><span>⠿ Drag to arrange · Scroll to explore · Changes save automatically</span><button class="text-btn" data-action="manage-connections">Manage connections (${project.connections.length})</button></div>`
  );
}
function cardHTML(c) {
  const char = project.characters.find((p) => p.id === c.characterId);
  return `<article class="idea-card ${c.kind.toLowerCase()}" style="left:${c.x}px;top:${c.y}px" data-card="${c.id}"><div class="card-handle" data-handle="${c.id}"><span>${esc(c.kind.toUpperCase())}</span><span>⠿</span></div>${c.image ? `<img class="card-image" src="${esc(c.image)}" alt="Reference for ${esc(c.title)}">` : ""}<button class="card-content" data-edit-card="${c.id}"><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></button>${char ? `<details class="card-character"><summary>♙ ${esc(char.name)} <span>⌄</span></summary>${char.components.map((m) => `<div><strong>${esc(m.label)}</strong><p>${esc(componentSummary(char, m))}</p></div>`).join("") || "<p>No components yet.</p>"}<button class="text-btn" data-character="${char.id}">Open original ↗</button></details>` : ""}<div class="card-tools"><button data-upload="${c.id}">${c.image ? "Replace image" : "＋ Image"}</button><button data-edit-card="${c.id}">Edit ↗</button></div></article>`;
}
function rulesView(paneSize = {}) {
  return (
    heading(
      "A REFERENCE WITHIN REACH",
      "Find the rule. Keep the story moving.",
      "Search the bundled SRDs, follow a topic, or switch editions without changing your campaign.",
    ) + rulesPanel.html(project, render, { compact: paneSize.width < 750 })
  );
}
function settingsView() {
  return (
    heading(
      "MAKE YOURSELF AT HOME",
      "Your workspace, your way.",
      "Appearance stays on this device. Campaign content travels with your export.",
    ) +
    `<section class="settings-grid"><div class="paper-editor"><h2>Appearance</h2><label class="field">Color theme<select id="theme">${[
      ["paper", "Warm paper"],
      ["night", "Midnight"],
      ["forest", "Forest"],
    ]
      .map(
        ([v, n]) =>
          `<option value="${v}" ${prefs.theme === v ? "selected" : ""}>${n}</option>`,
      )
      .join(
        "",
      )}</select></label><label class="field">Font<select id="font"><option value="sans" ${prefs.font === "sans" ? "selected" : ""}>System sans serif</option><option value="serif" ${prefs.font === "serif" ? "selected" : ""}>Literary serif</option><option value="mono" ${prefs.font === "mono" ? "selected" : ""}>Monospace</option></select></label><label class="field">Text size<select id="size">${[14, 16, 18, 20].map((v) => `<option ${prefs.size === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><h2>Layout</h2><p class="muted">Drag tabs between panels or dock them at an edge. Panel options set visibility priority. Narrow windows move lower-priority panels into the restore bar.</p><button class="secondary" data-action="save-layout">Save current layout</button> <button class="secondary" data-action="restore-layout">Manage saved layouts</button><p><button class="text-btn" data-action="reset-layout">Reset appearance</button></p></div><div class="paper-editor"><h2>Campaign settings</h2><label class="field">Campaign name<input id="campaign-name" value="${esc(project.name)}" maxlength="200"></label><label class="field">Default rules edition<select id="campaign-edition"><option ${project.edition === "2014" ? "selected" : ""}>2014</option><option ${project.edition === "2024" ? "selected" : ""}>2024</option></select></label><h2>Your files</h2><p class="muted">Exports include all notes, characters, board connections, and uploaded images. They may contain DM secrets.</p><button class="primary" data-action="export">Export backup</button> <button class="secondary" data-action="import">Import as new campaign</button><p><button class="text-btn" data-action="recover">Recover previous local save</button></p><p class="muted">This browser stores your work locally. Export before switching devices, clearing browser data, or handing off your campaign.</p><h2>Install & offline</h2><p class="muted">On supported browsers, use the browser’s install option. Open once online to cache the application for offline use.</p></div></section>`
  );
}
function modal(title, body, onSubmit, label = "Save") {
  const dialog = $("#dialog");
  dialog.innerHTML = `<form method="dialog"><div class="modal-heading"><h2>${esc(title)}</h2><button type="button" class="icon-btn" id="close-dialog" aria-label="Close dialog">×</button></div>${body}<div id="form-error" role="alert"></div><div class="modal-actions"><button type="button" class="secondary" id="cancel-dialog">Cancel</button><button class="primary" type="submit">${label}</button></div></form>`;
  $("#close-dialog").onclick = $("#cancel-dialog").onclick = () =>
    dialog.close();
  dialog.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await onSubmit(new FormData(e.target));
      if (result !== false) dialog.close();
    } catch (error) {
      $("#form-error").textContent = error.message;
    }
  };
  dialog
    .querySelectorAll("label select")
    .forEach((el) =>
      el.setAttribute(
        "aria-label",
        el.parentElement.firstChild.textContent.trim(),
      ),
    );
  dialog.showModal();
}
function confirmAction(title, text, action) {
  modal(title, `<p>${esc(text)}</p>`, action, "Confirm");
}
function field(label, name, value = "", type = "input") {
  return `<label class="field">${label}${type === "textarea" ? `<textarea name="${name}">${esc(value)}</textarea>` : `<input name="${name}" value="${esc(value)}" maxlength="200" required>`}</label>`;
}
function newNote(category = "Sessions") {
  modal(
    "A new thread",
    field("Title", "title") + field("Category", "category", category),
    (data) => {
      const n = {
        id: uid(),
        title: data.get("title").trim(),
        category: data.get("category").trim(),
        body: "",
      };
      if (!n.title || !n.category) throw Error("Add a title and category.");
      project.notes.push(n);
      selectedNote = n.id;
      view = "Notes";
      save();
      render();
    },
    "Create note",
  );
}
function editCard(id) {
  const c = project.cards.find((c) => c.id === id);
  modal(
    "Edit idea",
    field("Title", "title", c.title) +
      field("Text", "body", c.body, "textarea") +
      `<label class="field">Kind<select name="kind">${["Idea", "Location", "Character", "Encounter"].map((k) => `<option ${k === c.kind ? "selected" : ""}>${k}</option>`).join("")}</select></label><label class="field">Character reference<select name="characterId"><option value="">No linked character</option>${project.characters.map((p) => `<option value="${p.id}" ${p.id === c.characterId ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><button type="button" class="text-btn danger" id="delete-card">Delete card</button> ${c.image ? '<button type="button" class="text-btn" id="remove-image">Remove image</button>' : ""}`,
    (data) => {
      const title = data.get("title").trim();
      if (!title) throw Error("Add a title.");
      Object.assign(c, {
        title,
        body: data.get("body"),
        kind: data.get("kind"),
        characterId: data.get("characterId") || null,
      });
      save();
      render();
    },
  );
  $("#delete-card").onclick = () => {
    $("#dialog").close();
    confirmAction(
      "Delete this card?",
      "Its connections will also be removed.",
      () => {
        removeCard(project, id);
        save();
        render();
      },
    );
  };
  if ($("#remove-image"))
    $("#remove-image").onclick = () => {
      c.image = null;
      save();
      $("#dialog").close();
      render();
    };
}
const actions = {
  home: () => {
    view = "Overview";
    render();
  },
  sidebar: () => {
    prefs.sidebar = !prefs.sidebar;
    savePrefs();
    render();
  },
  inspector: () => {
    prefs.inspector = !prefs.inspector;
    savePrefs();
    render();
  },
  "new-note": () => newNote(),
  "house-note": () => newNote("House rules"),
  export: () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download =
      project.name.replace(/[^\p{L}\p{N} _-]/gu, "").slice(0, 80) +
      ".waypoint.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Campaign exported, including embedded images.");
  },
  import: () => $("#import-file").click(),
  "new-campaign": () =>
    modal(
      "Start an adventure",
      field("Campaign name", "name") +
        '<label class="field">Rules edition<select name="edition"><option>2024</option><option>2014</option></select></label>',
      (data) => {
        if (!data.get("name").trim()) throw Error("Add a name.");
        project = createCampaign(
          data.get("name").trim(),
          data.get("edition"),
          false,
        );
        projects.push(project);
        prefs.campaign = project.id;
        savePrefs();
        view = "Overview";
        selectedNote = selectedCharacter = null;
        save();
        render();
      },
      "Create campaign",
    ),
  "new-character": () =>
    modal(
      "Introduce a character",
      field("Name", "name") +
        '<label class="field">Role<input name="role" placeholder="Captain, rival, wandering scholar…" maxlength="300"></label>',
      (data) => {
        if (!data.get("name").trim()) throw Error("Add a name.");
        const c = {
          id: uid(),
          name: data.get("name").trim(),
          role: data.get("role"),
          groupIds: [],
          components: [],
          color: "sea",
        };
        project.characters.push(c);
        selectedCharacter = c.id;
        view = "Characters";
        save();
        render();
      },
      "Create character",
    ),
  "new-group": () =>
    modal("Create a group", field("Group name", "name"), (data) => {
      if (!data.get("name").trim()) throw Error("Add a name.");
      project.groups.push({ id: uid(), name: data.get("name").trim() });
      save();
      render();
    }),
  "delete-note": () =>
    confirmAction(
      "Delete note?",
      "This removes the selected note. Export a backup if you want to keep a copy.",
      () => {
        project.notes = project.notes.filter((n) => n.id !== selectedNote);
        selectedNote = null;
        save();
        render();
      },
    ),
  "delete-character": () =>
    confirmAction(
      "Delete character?",
      "Linked board cards remain, but their character references will be removed.",
      () => {
        project.characters = project.characters.filter(
          (c) => c.id !== selectedCharacter,
        );
        project.cards.forEach((c) => {
          if (c.characterId === selectedCharacter) c.characterId = null;
        });
        selectedCharacter = null;
        save();
        render();
      },
    ),
  "new-card": () =>
    modal(
      "Follow an idea",
      field("Title", "title") + field("Text", "body", "", "textarea"),
      (data) => {
        if (!data.get("title").trim()) throw Error("Add a title.");
        project.cards.push({
          id: uid(),
          title: data.get("title").trim(),
          body: data.get("body"),
          kind: "Idea",
          x: 60 + (project.cards.length % 4) * 70,
          y: 60 + (project.cards.length % 4) * 60,
          image: null,
          characterId: null,
        });
        save();
        render();
      },
      "Add card",
    ),
  connect: () => {
    if (project.cards.length < 2)
      return notify("Add at least two cards to connect them.");
    const opts = project.cards
      .map((c) => `<option value="${c.id}">${esc(c.title)}</option>`)
      .join("");
    modal(
      "Connect two ideas",
      `<label class="field">From<select name="from">${opts}</select></label><label class="field">To<select name="to">${opts}</select></label><label class="field">Connection label<input name="label" maxlength="200" placeholder="leads to, knows, threatens…"></label>`,
      (data) => {
        if (data.get("from") === data.get("to"))
          throw Error("Choose two different cards.");
        project.connections.push({
          id: uid(),
          from: data.get("from"),
          to: data.get("to"),
          label: data.get("label"),
        });
        save();
        render();
      },
      "Connect",
    );
  },
  "manage-connections": () => {
    modal(
      "Board connections",
      project.connections
        .map(
          (l) =>
            `<label class="connection-row"><input type="checkbox" name="remove" value="${l.id}"><span>${esc(project.cards.find((c) => c.id === l.from).title)} → ${esc(project.cards.find((c) => c.id === l.to).title)}<small>${esc(l.label)}</small></span></label>`,
        )
        .join("") || "<p>No connections yet.</p>",
      (data) => {
        const ids = data.getAll("remove");
        project.connections = project.connections.filter(
          (l) => !ids.includes(l.id),
        );
        save();
        render();
      },
      "Remove selected",
    );
  },
  "save-layout": () => dock.saveDialog(),
  "restore-layout": () => dock.manager(),
  "reset-layout": () => {
    Object.assign(prefs, {
      theme: "paper",
      font: "sans",
      size: 16,
      sidebar: true,
      inspector: true,
    });
    savePrefs();
    render();
  },
  recover: async () => {
    const backup = await read("backup");
    if (!backup) return notify("No recovery snapshot is available yet.");
    confirmAction(
      "Recover previous save?",
      "This creates a separate recovered campaign from the previous local save.",
      () => {
        const old = backup.find((p) => p.id === project.id);
        if (!old) throw Error("This campaign is not in the recovery snapshot.");
        project = importCampaign(JSON.stringify(old));
        project.name += " · recovered";
        projects.push(project);
        save();
        render();
      },
    );
  },
  dice: () => {
    modal(
      "Roll a possibility",
      '<label class="field">Dice expression<input name="expression" value="1d20" required></label><p id="modal-roll-result" class="roll-output">Try 2d6+3, 1d20, or 4d8.</p>',
      (data) => {
        const r = rollDice(data.get("expression"));
        $("#modal-roll-result").textContent =
          `${r.total} · [${r.rolls.join(", ")}]${r.modifier ? " modifier " + r.modifier : ""}`;
        return false;
      },
      "Roll",
    );
  },
};
function addComponent(type) {
  const c = project.characters.find((c) => c.id === selectedCharacter);
  if (!c) return;
  c.components.push(makeComponent(type));
  save();
  render();
}
function bind() {
  const diceForm = document.querySelector("#workspace-dice");
  const doPanelRoll = (expression) => {
    try {
      const result = rollDice(expression);
      panelDice.expression = expression;
      panelDice.history.unshift({ ...result, expression });
      panelDice.history = panelDice.history.slice(0, 10);
      render();
    } catch (e) {
      notify(e.message);
    }
  };
  if (diceForm) {
    diceForm.onsubmit = (e) => {
      e.preventDefault();
      doPanelRoll(new FormData(diceForm).get("expression"));
    };
    document.querySelector("#workspace-dice-expression").oninput = (e) =>
      (panelDice.expression = e.target.value);
  }
  document
    .querySelectorAll("[data-panel-roll]")
    .forEach((b) => (b.onclick = () => doPanelRoll(b.dataset.panelRoll)));

  if (
    document.querySelector(".rules-workspace") ||
    document.querySelector("#retry-rules")
  )
    rulesPanel.bind(project, render);
  bindStructuredComponents({
    character: project.characters.find((c) => c.id === selectedCharacter),
    save,
    render,
    notify,
  });
  document
    .querySelectorAll("nav [data-view]")
    .forEach((el) => el.setAttribute("aria-label", el.dataset.view));
  document
    .querySelectorAll("[data-action]")
    .forEach((b) => (b.onclick = () => actions[b.dataset.action]?.()));
  document.querySelectorAll("[data-view]").forEach(
    (b) =>
      (b.onclick = () => {
        view = b.dataset.view;
        filter = "";
        render();
      }),
  );
  document.querySelectorAll("[data-note]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedNote = b.dataset.note;
        view = "Notes";
        render();
      }),
  );
  document.querySelectorAll("[data-character]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedCharacter = b.dataset.character;
        view = "Characters";
        render();
      }),
  );
  $("#campaign-select").onchange = (e) => {
    project = projects.find((p) => p.id === e.target.value);
    prefs.campaign = project.id;
    savePrefs();
    selectedNote = selectedCharacter = null;
    filter = "";
    render();
  };
  const n = project.notes.find((n) => n.id === selectedNote),
    c = project.characters.find((c) => c.id === selectedCharacter);
  const input = (selector, fn, event = "input") => {
    const el = $(selector);
    if (el)
      el.addEventListener(event, (e) => {
        fn(e.target.value);
        save();
      });
  };
  input("#note-title", (v) => (n.title = v));
  input(
    "#note-category",
    (v) => {
      n.category = v || "Ideas";
    },
    "change",
  );
  input("#note-body", (v) => (n.body = v));
  if ($("#note-search"))
    $("#note-search").oninput = (e) => {
      filter = e.target.value;
      $("#note-tree").innerHTML = noteTree([
        ...new Set([...categories, ...project.notes.map((n) => n.category)]),
      ]);
      $("#note-tree")
        .querySelectorAll("[data-note]")
        .forEach(
          (b) =>
            (b.onclick = () => {
              selectedNote = b.dataset.note;
              render();
            }),
        );
    };
  input("#character-name", (v) => (c.name = v));
  input("#character-role", (v) => (c.role = v));
  document.querySelectorAll("[data-membership]").forEach(
    (el) =>
      (el.onchange = () => {
        c.groupIds = el.checked
          ? [...new Set([...c.groupIds, el.dataset.membership])]
          : c.groupIds.filter((id) => id !== el.dataset.membership);
        save();
        render();
      }),
  );
  document.querySelectorAll("[data-component]").forEach((el) => {
    el.onclick = () => addComponent(el.dataset.component);
    el.ondragstart = (e) =>
      e.dataTransfer.setData(
        "application/waypoint-component",
        el.dataset.component,
      );
  });
  document.querySelectorAll("[data-component-label]").forEach(
    (el) =>
      (el.oninput = () => {
        c.components.find((m) => m.id === el.dataset.componentLabel).label =
          el.value;
        save();
      }),
  );
  document.querySelectorAll("[data-component-value]").forEach(
    (el) =>
      (el.oninput = () => {
        c.components.find((m) => m.id === el.dataset.componentValue).value =
          el.value;
        save();
      }),
  );
  document.querySelectorAll("[data-remove-component]").forEach(
    (el) =>
      (el.onclick = () => {
        c.components = c.components.filter(
          (m) => m.id !== el.dataset.removeComponent,
        );
        c.components.forEach((m) => {
          if (
            m.type === "Weapon" &&
            m.data?.ammoId === el.dataset.removeComponent
          )
            m.data.ammoId = null;
        });
        save();
        render();
      }),
  );
  const drop = $("#component-drop");
  if (drop) {
    drop.ondragover = (e) => e.preventDefault();
    drop.ondrop = (e) => {
      e.preventDefault();
      const t = e.dataTransfer.getData("application/waypoint-component");
      if (
        [
          "Statistics",
          "Weapon",
          "Ammunition",
          "Inventory",
          "Spell requirements",
          "Notes",
        ].includes(t)
      )
        addComponent(t);
    };
  }
  document
    .querySelectorAll("[data-drag-character]")
    .forEach(
      (el) =>
        (el.ondragstart = (e) =>
          e.dataTransfer.setData(
            "application/waypoint-character",
            el.dataset.dragCharacter,
          )),
    );
  document.querySelectorAll("[data-group]").forEach((el) => {
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add("drag-over");
    };
    el.ondragleave = () => el.classList.remove("drag-over");
    el.ondrop = (e) => {
      e.preventDefault();
      const ch = project.characters.find(
        (c) =>
          c.id === e.dataTransfer.getData("application/waypoint-character"),
      );
      if (ch) {
        ch.groupIds = [...new Set([...ch.groupIds, el.dataset.group])];
        save();
        render();
      }
    };
  });
  document
    .querySelectorAll("[data-edit-card]")
    .forEach((el) => (el.onclick = () => editCard(el.dataset.editCard)));
  document.querySelectorAll("[data-upload]").forEach(
    (el) =>
      (el.onclick = () => {
        pendingImageCard = el.dataset.upload;
        $("#image-file").click();
      }),
  );
  bindBoard();
  for (const key of ["theme", "font", "size"])
    if ($("#" + key))
      $("#" + key).onchange = (e) => {
        prefs[key] = key === "size" ? +e.target.value : e.target.value;
        savePrefs();
        render();
      };
  input(
    "#campaign-name",
    (v) => {
      if (v.trim()) project.name = v.trim();
    },
    "change",
  );
  input("#campaign-edition", (v) => (project.edition = v), "change");
  if ($("#quick-dice"))
    $("#quick-dice").onsubmit = (e) => {
      e.preventDefault();
      quickRoll($("#dice-expression").value);
    };
  document
    .querySelectorAll("[data-roll]")
    .forEach((el) => (el.onclick = () => quickRoll(el.dataset.roll)));
}
function quickRoll(expr) {
  try {
    const r = rollDice(expr);
    $("#dice-expression").value = expr;
    $("#dice-result").innerHTML =
      `${r.total}<small>${esc(expr)} · [${r.rolls.join(", ")}]${r.modifier ? " " + (r.modifier > 0 ? "+" : "") + r.modifier : ""}</small>`;
  } catch (e) {
    notify(e.message);
  }
}
function bindBoard() {
  const board = $("#board");
  if (!board) return;
  board.ondragover = (e) => e.preventDefault();
  board.ondrop = (e) => {
    e.preventDefault();
    const c = project.characters.find(
      (c) => c.id === e.dataTransfer.getData("application/waypoint-character"),
    );
    if (!c) return;
    const rect = board.getBoundingClientRect();
    project.cards.push({
      id: uid(),
      title: c.name,
      body: c.role,
      kind: "Character",
      characterId: c.id,
      image: null,
      x: Math.max(0, Math.min(4000, e.clientX - rect.left)),
      y: Math.max(0, Math.min(4000, e.clientY - rect.top)),
    });
    save();
    render();
  };
  document.querySelectorAll("[data-handle]").forEach((handle) => {
    handle.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const card = project.cards.find((c) => c.id === handle.dataset.handle),
        el = handle.closest(".idea-card"),
        startX = e.clientX,
        startY = e.clientY,
        x = card.x,
        y = card.y;
      handle.setPointerCapture(e.pointerId);
      handle.onpointermove = (event) => {
        card.x = Math.max(0, Math.min(4000, x + event.clientX - startX));
        card.y = Math.max(0, Math.min(4000, y + event.clientY - startY));
        el.style.left = card.x + "px";
        el.style.top = card.y + "px";
      };
      handle.onpointerup = () => {
        handle.onpointermove = null;
        save();
        const viewport = $(".board-viewport"),
          sx = viewport.scrollLeft,
          sy = viewport.scrollTop;
        render();
        $(".board-viewport").scrollTo(sx, sy);
      };
      handle.onpointercancel = () => {
        handle.onpointermove = null;
        save();
        render();
      };
    };
  });
}
$("#import-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (file.size > 25000000)
      throw Error("Campaign exceeds the 25 MB import limit.");
    const imported = importCampaign(await file.text());
    project = imported;
    projects.push(project);
    prefs.campaign = project.id;
    savePrefs();
    selectedNote = selectedCharacter = null;
    view = "Overview";
    await save();
    render();
    notify("Imported as a new campaign. Existing campaigns are unchanged.");
  } catch (err) {
    notify("Import failed: " + err.message);
  }
  e.target.value = "";
};
$("#image-file").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    )
      throw Error("Choose a PNG, JPEG, WebP, or GIF.");
    if (file.size > 3000000) throw Error("Choose an image smaller than 3 MB.");
    const target = project.cards.find((c) => c.id === pendingImageCard);
    if (!target) throw Error("Card no longer exists.");
    const image = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(Error("Could not read image."));
      r.readAsDataURL(file);
    });
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = () => reject(Error("This file is not a readable image."));
      img.src = image;
    });
    const previousImage = target.image;
    target.image = image;
    if (new Blob([JSON.stringify(project)]).size > 24000000) {
      target.image = previousImage;
      throw Error(
        "This image would exceed the portable campaign size limit. Use a smaller image or remove an existing one.",
      );
    }
    await save();
    render();
    notify("Image added and included in campaign exports.");
  } catch (err) {
    notify(err.message);
  }
  e.target.value = "";
};
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() =>
      notify("Offline cache unavailable. The app still works online."),
    );
boot();

function roadmapView() {
  return (
    heading(
      "THE SHARED PROJECT PLAN",
      "Where we go from here.",
      "A published checklist of the work ahead. Current features are separate from future milestones.",
    ) +
    '<div class="roadmap-grid">' +
    roadmap
      .map(
        (step, i) =>
          '<section class="roadmap-step ' +
          (step.status === "Complete" ? "complete" : "") +
          '"><div class="roadmap-step-heading"><span class="step-number">' +
          (i + 1) +
          '</span><span class="pill">' +
          esc(step.status) +
          "</span></div><h2>" +
          esc(step.title) +
          "</h2><ul>" +
          step.items.map((item) => "<li>" + esc(item) + "</li>").join("") +
          "</ul></section>",
      )
      .join("") +
    '</div><p class="muted">No accounts or simultaneous editing are planned. Campaign sharing uses file handoff. Hosting remains unpublished; this roadmap travels with the application and is also tracked in GitHub.</p>'
  );
}
