import {
  tools,
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
} from "./workspace-model.js";

export class WorkspacePanels {
  constructor({
    prefs,
    savePrefs,
    esc,
    icons,
    render,
    modal,
    notify,
    onFocus,
  }) {
    Object.assign(this, {
      prefs,
      savePrefs,
      esc,
      icons,
      render,
      modal,
      notify,
      onFocus,
    });
    this.size = { width: 1200, height: 800 };
    this.snapshots = new Map();
    this.fitSignature = "";
    this.resizing = false;
    try {
      this.layout = structuredClone(
        validateWorkspace(prefs.workspace || defaultWorkspace()),
      );
    } catch {
      try {
        this.layout = structuredClone(validateWorkspace(prefs.workspaceBackup));
      } catch {
        this.layout = defaultWorkspace();
      }
      this.recovered = true;
    }
    this.named = Array.isArray(prefs.workspaceLayouts)
      ? prefs.workspaceLayouts
          .filter((n) => {
            try {
              return (
                typeof n.name === "string" &&
                n.name.trim() &&
                n.name.length <= 80 &&
                typeof n.id === "string" &&
                /^[A-Za-z0-9_-]+$/.test(n.id) &&
                validateWorkspace(n.layout)
              );
            } catch {
              return false;
            }
          })
          .slice(0, 32)
      : [];
    document.addEventListener("dragend", () => this.endDrag());
  }
  get activeTool() {
    return stacks(this.layout.root).find(
      (s) => s.id === this.layout.focused && !s.collapsed,
    )?.active;
  }
  signature(fit) {
    const ratios = [];
    function visit(n) {
      if (n?.type === "stack")
        ratios.push(n.id + ":" + (n.viewport.width < 750 ? "compact" : "wide"));
      if (n?.type === "split") {
        ratios.push(n.id + ":" + n.ratio.toFixed(4));
        visit(n.first);
        visit(n.second);
      }
    }
    visit(fit.root);
    return [...fit.visible].join(",") + "|" + ratios.join(",");
  }
  persist() {
    this.prefs.workspace = structuredClone(this.layout);
    this.prefs.workspaceLayouts = this.named;
    this.savePrefs();
  }
  commit(next, rerender = true) {
    validateWorkspace(next);
    if (JSON.stringify(next) !== JSON.stringify(this.layout))
      this.prefs.workspaceBackup = structuredClone(this.layout);
    this.layout = next;
    this.persist();
    this.onFocus(this.activeTool || "Workspace");
    if (rerender) this.render();
  }
  route(tool) {
    if (tools.includes(tool)) this.commit(openTool(this.layout, tool), false);
  }
  capture() {
    const active = document.activeElement,
      panel = active?.closest("[data-panel-tool]");
    this.focusSnapshot =
      panel && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)
        ? {
            tool: panel.dataset.panelTool,
            index: [...panel.querySelectorAll("input,textarea,select")].indexOf(
              active,
            ),
            signature:
              active.tagName +
              ":" +
              (active.id ||
                active.dataset.structuredField ||
                active.getAttribute("aria-label") ||
                active.name),
            value: active.value,
            checked: active.checked,
            start: active.selectionStart,
            end: active.selectionEnd,
          }
        : null;
    document.querySelectorAll("[data-panel-tool]").forEach((el) => {
      const positions = { main: [el.scrollLeft, el.scrollTop] };
      for (const selector of [
        ".board-viewport",
        ".rules-navigation",
        ".rule-reader",
        ".record-list",
      ]) {
        const inner = el.querySelector(selector);
        if (inner) positions[selector] = [inner.scrollLeft, inner.scrollTop];
      }
      this.snapshots.set(el.dataset.panelTool, positions);
    });
  }
  restore() {
    document.querySelectorAll("[data-panel-tool]").forEach((el) => {
      const positions = this.snapshots.get(el.dataset.panelTool);
      if (!positions) return;
      for (const [key, [x, y]] of Object.entries(positions)) {
        const target = key === "main" ? el : el.querySelector(key);
        target?.scrollTo(x, y);
      }
    });
    const snapshot = this.focusSnapshot;
    if (snapshot) {
      const panel = [...document.querySelectorAll("[data-panel-tool]")].find(
          (p) => p.dataset.panelTool === snapshot.tool,
        ),
        input = panel?.querySelectorAll("input,textarea,select")[
          snapshot.index
        ];
      if (
        input &&
        input.tagName +
          ":" +
          (input.id ||
            input.dataset.structuredField ||
            input.getAttribute("aria-label") ||
            input.name) ===
          snapshot.signature
      ) {
        input.value = snapshot.value;
        if (input.type === "checkbox") input.checked = snapshot.checked;
        input.focus({ preventScroll: true });
        if (
          (snapshot.start !== null &&
            ["text", "search", "url", "tel", "password"].includes(
              input.type,
            )) ||
          input?.tagName === "TEXTAREA"
        )
          try {
            input.setSelectionRange(snapshot.start, snapshot.end);
          } catch {}
      }
    }
  }
  html(renderTool) {
    const esc = this.esc,
      fit = fitWorkspace(this.layout, this.size.width, this.size.height);
    this.projectedRoot = fit.root;
    this.fitSignature = this.signature(fit);
    const nodeHTML = (node) => {
      if (node.type === "split")
        return `<div class="dock-split axis-${node.axis}" data-split="${node.id}"><div class="dock-child" style="flex:${node.ratio} 1 0">${nodeHTML(node.first)}</div><div class="dock-divider" role="separator" tabindex="0" aria-label="Resize panels" aria-orientation="${node.axis === "row" ? "vertical" : "horizontal"}" aria-valuenow="${Math.round(node.ratio * 100)}" aria-valuemin="10" aria-valuemax="90" data-divider="${node.id}" data-axis="${node.axis}"></div><div class="dock-child" style="flex:${1 - node.ratio} 1 0">${nodeHTML(node.second)}</div></div>`;
      return `<section class="dock-pane ${node.id === this.layout.focused ? "focused" : ""}" data-pane="${node.id}" aria-label="${esc(node.active)} panel"><header class="dock-pane-header"><div class="dock-tabs" role="tablist" aria-label="Panel tools">${node.tabs.map((tool, i) => `<button role="tab" id="tab-${node.id}-${i}" aria-selected="${tool === node.active}" aria-controls="content-${node.id}" tabindex="${tool === node.active ? 0 : -1}" draggable="true" data-dock-tab="${esc(tool)}" data-tab-index="${i}" title="Drag ${esc(tool)} to rearrange"><span aria-hidden="true">${this.icons[tool] || "▤"}</span> ${esc(tool)}</button>`).join("")}</div><div class="dock-pane-actions"><button class="icon-btn" data-split-right="${node.id}" aria-label="Split ${esc(node.active)} panel to the right" title="Split right">◧</button><button class="icon-btn" data-panel-options="${node.id}" aria-label="Panel options for ${esc(node.active)}" title="Move, collapse or hide">⋯</button></div></header><div class="tool-content" role="tabpanel" id="content-${node.id}" aria-labelledby="tab-${node.id}-${node.tabs.indexOf(node.active)}" data-panel-tool="${esc(node.active)}" tabindex="0">${renderTool(node.active, node.viewport)}</div><div class="dock-drop-targets" aria-hidden="true">${[
        ["left", "Dock left"],
        ["right", "Dock right"],
        ["top", "Dock above"],
        ["bottom", "Dock below"],
        ["center", "Add as tab"],
      ]
        .map(
          ([edge, label]) =>
            `<div class="dock-drop dock-${edge}" data-dock-edge="${edge}">${label}</div>`,
        )
        .join("")}</div></section>`;
    };
    return `<div class="dock-toolbar"><span class="eyebrow">WORKSPACE</span><label class="sr-only" for="open-workspace-tool">Open or restore a tool</label><select id="open-workspace-tool"><option value="">＋ Open a tool</option>${tools.map((t) => `<option>${esc(t)}</option>`).join("")}</select><span class="dock-toolbar-spacer"></span><button class="text-btn" id="save-workspace">Save layout</button><button class="secondary" id="manage-workspaces">Layouts</button></div><div class="dock-stage" id="dock-stage">${fit.root ? nodeHTML(fit.root) : '<div class="dock-empty"><span>◇</span><h2>A little room to think.</h2><p>Your tools are tucked away. Open one from the menu or restore a panel below.</p><button class="primary" id="restore-overview">Open overview</button></div>'}</div><div class="dock-rail" aria-label="Collapsed panels">${fit.rail.length ? fit.rail.map((p) => `<button data-restore-pane="${p.id}" title="${esc(p.tabs.join(", "))} · ${p.reason}" aria-label="Restore panel: ${esc(p.active)}"><span>${this.icons[p.active] || "▤"}</span> ${esc(p.active)} <small>${p.reason}</small></button>`).join("") : '<span class="dock-hint">⠿ Drag tabs to move or dock · Resize the dividers · Changes save on this device</span>'}</div>`;
  }
  endDrag() {
    document.body.classList.remove("workspace-dragging");
    document
      .querySelectorAll(".dock-drop.is-over")
      .forEach((el) => el.classList.remove("is-over"));
  }
  bind() {
    cancelAnimationFrame(this.fitFrame);
    this.observer?.disconnect();
    this.resizeCleanup?.();
    const stage = document.querySelector("#dock-stage");
    if (!stage) return;
    this.restore();
    if (this.recovered) {
      this.recovered = false;
      this.notify(
        "An invalid workspace layout was recovered. Campaign data was not changed.",
      );
      this.persist();
    }
    this.observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      this.size = { width, height };
      if (this.resizing) return;
      const fit = fitWorkspace(this.layout, width, height),
        signature = this.signature(fit);
      if (signature !== this.fitSignature) {
        cancelAnimationFrame(this.fitFrame);
        this.fitFrame = requestAnimationFrame(() => this.render());
      }
    });
    this.observer.observe(stage);
    document.querySelector("#open-workspace-tool").onchange = (e) => {
      if (e.target.value) this.commit(openTool(this.layout, e.target.value));
    };
    document.querySelector("#save-workspace").onclick = () => this.saveDialog();
    document.querySelector("#manage-workspaces").onclick = () => this.manager();
    const overview = document.querySelector("#restore-overview");
    if (overview)
      overview.onclick = () => this.commit(openTool(this.layout, "Overview"));
    document.querySelectorAll("[data-restore-pane]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = stacks(this.layout.root).find(
            (p) => p.id === b.dataset.restorePane,
          );
          this.commit(activateTab(this.layout, p.id, p.active));
        }),
    );
    document
      .querySelectorAll("[data-panel-options]")
      .forEach((b) => (b.onclick = () => this.options(b.dataset.panelOptions)));
    document
      .querySelectorAll("[data-split-right]")
      .forEach(
        (b) => (b.onclick = () => this.splitDialog(b.dataset.splitRight)),
      );
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.addEventListener("pointerdown", () => {
        if (this.layout.focused === pane.dataset.pane) return;
        this.layout.focused = pane.dataset.pane;
        this.persist();
        this.onFocus(this.activeTool);
        document
          .querySelectorAll("[data-pane]")
          .forEach((p) => p.classList.toggle("focused", p === pane));
      });
      pane.querySelectorAll("[data-dock-tab]").forEach((tab) => {
        const tool = tab.dataset.dockTab;
        tab.onclick = () =>
          this.commit(activateTab(this.layout, pane.dataset.pane, tool));
        tab.onkeydown = (e) => {
          const list = stacks(this.layout.root).find(
              (p) => p.id === pane.dataset.pane,
            ).tabs,
            index = list.indexOf(tool);
          let next;
          if (e.key === "ArrowRight") next = (index + 1) % list.length;
          else if (e.key === "ArrowLeft")
            next = (index - 1 + list.length) % list.length;
          else if (e.key === "Home") next = 0;
          else if (e.key === "End") next = list.length - 1;
          else return;
          e.preventDefault();
          this.commit(activateTab(this.layout, pane.dataset.pane, list[next]));
          document
            .querySelector(
              `[data-pane="${pane.dataset.pane}"] [aria-selected="true"]`,
            )
            ?.focus();
        };
        tab.ondragstart = (e) => {
          e.dataTransfer.setData("application/waypoint-tab", tool);
          e.dataTransfer.effectAllowed = "move";
          setTimeout(
            () => document.body.classList.add("workspace-dragging"),
            0,
          );
        };
        tab.ondragover = (e) => {
          if (e.dataTransfer.types.includes("application/waypoint-tab")) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
          }
        };
        tab.ondrop = (e) => {
          const moving = e.dataTransfer.getData("application/waypoint-tab");
          if (!tools.includes(moving)) return;
          e.preventDefault();
          e.stopPropagation();
          this.endDrag();
          const source = stacks(this.layout.root).find((p) =>
            p.tabs.includes(moving),
          );
          let index = Number(tab.dataset.tabIndex);
          if (
            source?.id === pane.dataset.pane &&
            source.tabs.indexOf(moving) < index
          )
            index--;
          this.commit(moveTab(this.layout, moving, pane.dataset.pane, index));
        };
      });
      pane.querySelectorAll("[data-dock-edge]").forEach((zone) => {
        zone.ondragover = (e) => {
          if (!e.dataTransfer.types.includes("application/waypoint-tab"))
            return;
          e.preventDefault();
          e.stopPropagation();
          document
            .querySelectorAll(".dock-drop.is-over")
            .forEach((z) => z.classList.remove("is-over"));
          zone.classList.add("is-over");
        };
        zone.ondrop = (e) => {
          const tool = e.dataTransfer.getData("application/waypoint-tab");
          if (!tools.includes(tool)) return;
          e.preventDefault();
          e.stopPropagation();
          this.endDrag();
          this.commit(
            zone.dataset.dockEdge === "center"
              ? moveTab(this.layout, tool, pane.dataset.pane)
              : dockTool(
                  this.layout,
                  tool,
                  pane.dataset.pane,
                  zone.dataset.dockEdge,
                ),
          );
        };
      });
    });
    document
      .querySelectorAll("[data-divider]")
      .forEach((handle) => this.bindDivider(handle));
  }
  bindDivider(handle) {
    const splitId = handle.dataset.divider,
      axis = handle.dataset.axis,
      parent = handle.parentElement;
    const clamp = (ratio) => {
      const total =
          (axis === "row" ? parent.clientWidth : parent.clientHeight) - 8,
        first = minimumSize(this.findNode(splitId)?.first),
        second = minimumSize(this.findNode(splitId)?.second),
        a = (axis === "row" ? first.width : first.height) / total,
        b = (axis === "row" ? second.width : second.height) / total;
      return Math.max(Math.max(0.1, a), Math.min(Math.min(0.9, 1 - b), ratio));
    };
    handle.onkeydown = (e) => {
      const forward = axis === "row" ? "ArrowRight" : "ArrowDown",
        back = axis === "row" ? "ArrowLeft" : "ArrowUp";
      if (![forward, back, "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const current = Number(handle.getAttribute("aria-valuenow")) / 100,
        ratio = clamp(
          e.key === "Home"
            ? 0.1
            : e.key === "End"
              ? 0.9
              : current + (e.key === forward ? 0.05 : -0.05),
        );
      this.commit(setRatio(this.layout, splitId, ratio));
      document.querySelector(`[data-divider="${splitId}"]`)?.focus();
    };
    handle.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.resizing = true;
      document.body.classList.add("workspace-resizing");
      let ratio = Number(handle.getAttribute("aria-valuenow")) / 100;
      const move = (event) => {
        const box = parent.getBoundingClientRect();
        ratio = clamp(
          axis === "row"
            ? (event.clientX - box.left) / (box.width - 8)
            : (event.clientY - box.top) / (box.height - 8),
        );
        parent.firstElementChild.style.flex = `${ratio} 1 0`;
        parent.lastElementChild.style.flex = `${1 - ratio} 1 0`;
        handle.setAttribute("aria-valuenow", Math.round(ratio * 100));
      };
      const cleanup = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", cancel);
        window.removeEventListener("blur", cancel);
        this.resizing = false;
        document.body.classList.remove("workspace-resizing");
        this.resizeCleanup = null;
      };
      const up = () => {
        cleanup();
        this.commit(setRatio(this.layout, splitId, ratio));
      };
      const cancel = () => {
        cleanup();
        this.render();
      };
      this.resizeCleanup = cleanup;
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", cancel);
      window.addEventListener("blur", cancel);
    };
  }
  findNode(id, node = this.projectedRoot || this.layout.root) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.type === "split")
      return this.findNode(id, node.first) || this.findNode(id, node.second);
    return null;
  }
  options(paneId) {
    const pane = stacks(this.layout.root).find((p) => p.id === paneId),
      esc = this.esc;
    this.modal(
      "Panel options",
      `<p class="muted">${esc(pane.tabs.join(" · "))}</p><label class="field">Visibility priority<select name="priority" aria-label="Visibility priority">${[
        [1, "Low"],
        [2, "Normal"],
        [3, "High"],
        [4, "Essential"],
      ]
        .map(
          ([n, label]) =>
            `<option value="${n}" ${pane.priority === n ? "selected" : ""}>${label}</option>`,
        )
        .join(
          "",
        )}</select></label><p class="muted">When space is limited, the focused panel stays open, followed by the highest-priority panels. Others move to the restore bar.</p><label class="field">Move active tab<select name="destination" aria-label="Move active tab"><option value="stay">Keep here</option>${stacks(
        this.layout.root,
      )
        .filter((p) => p.id !== paneId)
        .map(
          (p, i) =>
            `<option value="${p.id}">Panel ${i + 1}: ${esc(p.tabs.join(", "))}</option>`,
        )
        .join(
          "",
        )}${["left", "right", "top", "bottom"].map((edge) => `<option value="edge:${edge}">New panel ${edge === "top" ? "above" : edge === "bottom" ? "below" : "on the " + edge}</option>`).join("")}</select></label><div class="panel-options-actions"><button type="button" class="secondary" id="collapse-workspace-pane">Collapse panel</button><button type="button" class="text-btn danger" id="hide-workspace-tool">Hide ${esc(pane.active)}</button></div>`,
      (data) => {
        let next = this.layout;
        const destination = data.get("destination");
        if (destination.startsWith("tab:")) {
          const index =
            pane.tabs.indexOf(pane.active) +
            (destination === "tab:left" ? -1 : 1);
          next = moveTab(next, pane.active, paneId, index);
        } else if (destination.startsWith("edge:")) {
          if (pane.tabs.length === 1)
            throw Error(
              "Open another tab here first, or use Split right to place another tool beside this panel.",
            );
          next = dockTool(next, pane.active, paneId, destination.slice(5));
        } else if (destination !== "stay")
          next = moveTab(next, pane.active, destination);
        const moved = stacks(next.root).find((p) =>
          p.tabs.includes(pane.active),
        );
        next = setPanel(next, moved.id, {
          priority: Number(data.get("priority")),
        });
        this.commit(next);
      },
    );
    const destinationSelect = document.querySelector(
      '#dialog [name="destination"]',
    );
    for (const [value, label] of [
      ["tab:left", "One tab to the left"],
      ["tab:right", "One tab to the right"],
    ]) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      destinationSelect.append(option);
    }
    document.querySelector("#collapse-workspace-pane").onclick = () => {
      document.querySelector("#dialog").close();
      this.commit(setPanel(this.layout, paneId, { collapsed: true }));
    };
    document.querySelector("#hide-workspace-tool").onclick = () => {
      document.querySelector("#dialog").close();
      this.commit(hideTool(this.layout, pane.active));
    };
  }
  splitDialog(paneId) {
    const pane = stacks(this.layout.root).find((p) => p.id === paneId),
      choices = tools.filter((t) => pane.tabs.length > 1 || t !== pane.active),
      preferred = choices.includes("Rules") ? "Rules" : choices[0];
    this.modal(
      "Split this panel",
      `<label class="field">Tool to place<select name="tool" aria-label="Tool to place">${choices.map((t) => `<option ${t === preferred ? "selected" : ""}>${this.esc(t)}</option>`).join("")}</select></label><label class="field">Dock position<select name="edge" aria-label="Dock position"><option value="right">Right</option><option value="bottom">Below</option><option value="left">Left</option><option value="top">Above</option></select></label><p class="muted">Existing tools move to the new panel. Campaign content is shared, not copied.</p>`,
      (data) =>
        this.commit(
          dockTool(this.layout, data.get("tool"), paneId, data.get("edge")),
        ),
      "Split panel",
    );
  }
  saveDialog() {
    this.modal(
      "Save a workspace layout",
      '<label class="field">Layout name<input name="name" maxlength="80" placeholder="Session prep, running a game…" required></label><label class="check-field"><input type="checkbox" name="replace">Replace a saved layout with the same name</label><p class="muted">Saves tools, tab order, panel sizes and visibility priorities on this device. Campaign content is not included.</p>',
      (data) => {
        const name = data.get("name").trim();
        if (!name) throw Error("Enter a layout name.");
        const existing = this.named.find(
          (n) => n.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing && !data.has("replace"))
          throw Error(
            "That name exists. Choose another name or select Replace.",
          );
        if (!existing && this.named.length >= 32)
          throw Error("Delete a saved layout before adding another.");
        const saved = {
          id: existing?.id || crypto.randomUUID(),
          name,
          layout: structuredClone(this.layout),
        };
        if (existing)
          this.named = this.named.map((n) =>
            n.id === existing.id ? saved : n,
          );
        else this.named.push(saved);
        this.persist();
        this.notify("Layout saved: " + name);
      },
    );
  }
  manager() {
    this.modal(
      "Workspace layouts",
      `<p class="muted">Restore a saved arrangement or recover the previous layout. Your campaign records stay intact.</p><div class="saved-layouts">${this.named.map((n) => `<div><span>${this.esc(n.name)}</span><button type="button" class="secondary" data-load-layout="${n.id}">Load</button><button type="button" class="text-btn danger" data-delete-layout="${n.id}" aria-label="Delete layout ${this.esc(n.name)}">×</button></div>`).join("") || '<p class="muted">No named layouts yet. Use Save layout to create one.</p>'}</div><div class="panel-options-actions"><button type="button" class="secondary" id="recover-workspace">Recover previous layout</button><button type="button" class="secondary" id="reset-workspace">Reset workspace</button></div>`,
      () => {},
      "Done",
    );
    document.querySelectorAll("[data-load-layout]").forEach(
      (b) =>
        (b.onclick = () => {
          const saved = this.named.find((n) => n.id === b.dataset.loadLayout);
          document.querySelector("#dialog").close();
          this.commit(structuredClone(validateWorkspace(saved.layout)));
          this.notify("Layout restored: " + saved.name);
        }),
    );
    document.querySelectorAll("[data-delete-layout]").forEach(
      (b) =>
        (b.onclick = () => {
          this.named = this.named.filter(
            (n) => n.id !== b.dataset.deleteLayout,
          );
          this.persist();
          b.closest(".saved-layouts>div").remove();
        }),
    );
    document.querySelector("#recover-workspace").onclick = () => {
      try {
        const previous = structuredClone(
          validateWorkspace(this.prefs.workspaceBackup),
        );
        document.querySelector("#dialog").close();
        this.commit(previous);
        this.notify("Previous workspace restored.");
      } catch {
        this.notify("No valid previous layout is available.");
      }
    };
    document.querySelector("#reset-workspace").onclick = () => {
      document.querySelector("#dialog").close();
      this.commit(defaultWorkspace());
      this.notify("Workspace reset. Your previous layout is recoverable.");
    };
  }
}
