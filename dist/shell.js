import { WorkspacePanels } from "./workspace-ui.js";
import { ActorsUI } from "./actors-ui.js";
import { tools, validateWorkspace } from "./workspace-model.js";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const blank = () => ({ version: 1, root: null, focused: null });
const key = "waypoint-shell-settings";
let prefs;
try {
  prefs = JSON.parse(localStorage.getItem(key) || "{}");
} catch {
  prefs = {};
}
if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) prefs = {};
prefs.sidebar = prefs.sidebar ?? true;
prefs.workspace ??= blank();
prefs.projects = Array.isArray(prefs.projects)
  ? prefs.projects.filter(
      (p) => p && typeof p.id === "string" && typeof p.name === "string",
    )
  : [];
const icons = {
  Overview: "◈",
  Notes: "▤",
  Characters: "♙",
  Monsters: "♜",
  Encounter: "⚔",
  "Idea board": "◇",
  Rules: "▥",
  Dice: "⚄",
  Roadmap: "☷",
  Settings: "⚙",
};
function notify(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
}
function savePrefs() {
  const project = prefs.projects.find((p) => p.id === prefs.projectId);
  if (project) project.workspace = structuredClone(prefs.workspace);
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    notify("Layout not saved.");
  }
}
function modal(title, body, onSubmit, label = "Save") {
  const dialog = $("#dialog");
  dialog.innerHTML = `<form method="dialog"><div class="modal-heading"><h2>${esc(title)}</h2><button type="button" class="icon-btn" id="close-dialog" aria-label="Close dialog">×</button></div>${body}<div id="form-error" role="alert"></div><div class="modal-actions"><button type="button" class="secondary" id="cancel-dialog">Cancel</button><button type="submit" class="primary">${esc(label)}</button></div></form>`;
  dialog.querySelectorAll("p").forEach((p) => p.remove());
  dialog
    .querySelectorAll("[placeholder]")
    .forEach((el) => el.removeAttribute("placeholder"));
  $("#close-dialog").onclick = $("#cancel-dialog").onclick = () =>
    dialog.close();
  dialog.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    try {
      if ((await onSubmit(new FormData(e.target))) !== false) dialog.close();
    } catch (error) {
      $("#form-error").textContent = error.message;
    }
  };
  dialog.showModal();
}
const dock = new WorkspacePanels({
  prefs,
  savePrefs,
  esc,
  icons,
  render,
  modal,
  notify,
  onFocus: () => {},
});
const actors = new ActorsUI({
  esc,
  modal,
  notify,
  render,
  projectId: () => prefs.projectId,
  openTool: (tool) => {
    dock.route(tool);
    render();
  },
  newProject: () => $("#new-project").click(),
});
function render() {
  dock.capture();
  const project = prefs.projects.find((p) => p.id === prefs.projectId);
  const workspace = dock
    .html((tool) =>
      ["Characters", "Monsters", "Encounter"].includes(tool)
        ? actors.html(tool)
        : '<div class="empty-tool"></div>',
    )
    .replace(
      /<div class="dock-empty">[\s\S]*?<\/div>/,
      '<div class="empty-workspace" aria-label="Empty workspace"></div>',
    )
    .replace(/<span class="dock-hint">[\s\S]*?<\/span>/, "");
  $("#app").innerHTML =
    `<div class="app-shell ${prefs.sidebar ? "nav-expanded" : "nav-collapsed"}"><aside class="shell-navigation" aria-label="Workspace navigation"><div class="shell-navigation-header"><button class="navigation-toggle" id="navigation-toggle" aria-label="Toggle navigation" aria-expanded="${prefs.sidebar}" aria-controls="navigation-menu">☰</button>${prefs.sidebar ? "<span>Workspace</span>" : ""}</div><div class="shell-menu" id="navigation-menu" ${prefs.sidebar ? "" : "hidden"}><label class="sr-only" for="shell-project">Project</label><select id="shell-project" ${prefs.projects.length ? "" : "disabled"}><option value="" ${project ? "" : "selected"} disabled>Projects</option>${prefs.projects.map((p) => `<option value="${esc(p.id)}" ${p.id === project?.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select><button class="shell-new-project" id="new-project">＋ New project</button><nav>${tools.map((tool) => `<button class="shell-tool" data-open-tool="${esc(tool)}"><span aria-hidden="true">${icons[tool]}</span>${esc(tool)}</button>`).join("")}</nav></div></aside><section class="shell-workspace"><main id="main">${workspace}</main></section></div>`;
  $("#navigation-toggle").onclick = () => {
    prefs.sidebar = !prefs.sidebar;
    savePrefs();
    render();
  };
  document.querySelectorAll("[data-open-tool]").forEach(
    (b) =>
      (b.onclick = () => {
        dock.route(b.dataset.openTool);
        render();
      }),
  );
  $("#new-project").onclick = () =>
    modal(
      "New project",
      '<label class="field">Project name<input name="name" maxlength="200" required></label>',
      (data) => {
        const name = data.get("name").trim();
        if (!name) throw Error("Enter a project name.");
        const project = { id: crypto.randomUUID(), name, workspace: blank() };
        prefs.projects.push(project);
        prefs.projectId = project.id;
        dock.commit(blank());
      },
      "Create",
    );
  $("#shell-project").onchange = (e) => {
    savePrefs();
    prefs.projectId = e.target.value;
    const project = prefs.projects.find((p) => p.id === prefs.projectId);
    let layout;
    try {
      layout = structuredClone(validateWorkspace(project.workspace));
    } catch {
      layout = blank();
    }
    dock.commit(layout);
  };
  dock.bind();
  actors.bind();
  const manage = $("#manage-workspaces"),
    openManager = manage.onclick;
  manage.onclick = () => {
    openManager();
    const reset = $("#reset-workspace");
    reset.onclick = () => {
      $("#dialog").close();
      dock.commit(blank());
    };
  };
}
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .then((reg) => reg.update())
    .catch(() => {});
render();
