import {
  ruleCategories,
  categoryIcons,
  buildRuleTree,
  searchRules,
  findCounterpart,
  childEntries,
} from "./rules-model.js";
const attribution2014 =
  "This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.";
const attribution2024 =
  "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.";
export class RulesPanel {
  constructor({ esc, prefs, savePrefs, notify }) {
    Object.assign(this, { esc, prefs, savePrefs, notify });
    this.data = {};
    this.loading = {};
    this.errors = {};
    this.campaignId = null;
    this.edition = "2024";
    this.selectedId = null;
    this.missing = null;
    this.query = "";
    this.mode = "hierarchy";
    this.limit = 100;
    this.open = new Map();
    this.treeVisible = true;
  }
  bookmarks() {
    return this.prefs.ruleBookmarks?.[this.edition] || [];
  }
  recent() {
    return this.prefs.ruleRecent?.[this.edition] || [];
  }
  ensure(edition, render) {
    if (this.data[edition] || this.loading[edition] || this.errors[edition])
      return;
    this.loading[edition] = true;
    fetch(`./rules/${edition}.json`)
      .then((r) => {
        if (!r.ok) throw Error("Could not load this edition.");
        return r.json();
      })
      .then((data) => {
        this.data[edition] = data;
        this.index?.clear?.();
      })
      .catch((e) => (this.errors[edition] = e.message))
      .finally(() => {
        this.loading[edition] = false;
        render();
      });
  }
  html(project, render) {
    const esc = this.esc;
    if (this.campaignId !== project.id) {
      this.campaignId = project.id;
      this.edition = project.edition;
      this.selectedId = null;
      this.missing = null;
      this.query = "";
      this.contextEntry = null;
    }
    this.ensure(this.edition, render);
    const data = this.data[this.edition];
    if (!data)
      return `<section class="paper-editor"><h2>${this.errors[this.edition] ? "Reference unavailable" : "Opening the rules…"}</h2><p class="muted">${esc(this.errors[this.edition] || "Loading the locally bundled SRD reference.")}</p>${this.errors[this.edition] ? '<button class="secondary" id="retry-rules">Try again</button>' : ""}</section>`;
    if (!this.selectedId && !this.missing)
      this.selectedId = (
        data.entries.find(
          (e) => e.key === "bonus-action" && e.category === "Combat",
        ) || data.entries[0]
      ).id;
    const active = data.entries.find((e) => e.id === this.selectedId);
    if (active) this.contextEntry = active;
    return `<section class="rules-workspace ${this.treeVisible ? "" : "rules-tree-hidden"}"><div class="rules-toolbar"><div class="edition-control" role="group" aria-label="Rules browsing edition">${["2014", "2024"].map((y) => `<button data-rule-edition="${y}" aria-pressed="${this.edition === y}">${y}${y === "2024" ? " · revised" : ""}</button>`).join("")}</div><span class="muted">Campaign: ${project.edition} · Browsing ${data.source}</span><button class="icon-btn" id="toggle-rule-tree" aria-label="Toggle rules navigation" aria-expanded="${this.treeVisible}">☷</button></div>${project.edition !== this.edition ? '<div class="edition-notice">You are browsing a different edition. Your campaign’s default has not changed.</div>' : ""}<div class="rules-columns"><aside class="rules-navigation"><label class="search-label">⌕ <input id="rule-search" type="search" value="${esc(this.query)}" placeholder="Find a rule or ask a question…" aria-label="Search rules"></label><label class="sr-only" for="rule-view">Rules navigation view</label><select id="rule-view"><option value="hierarchy" ${this.mode === "hierarchy" ? "selected" : ""}>Browse by topic</option><option value="alphabetical" ${this.mode === "alphabetical" ? "selected" : ""}>Alphabetical</option><option value="bookmarks" ${this.mode === "bookmarks" ? "selected" : ""}>Bookmarks (${this.bookmarks().length})</option><option value="recent" ${this.mode === "recent" ? "selected" : ""}>Recently opened</option></select><div id="rule-results">${this.navigation(data.entries)}</div></aside><article class="rule-reader">${active ? this.article(active, data) : `<div class="empty"><h2>No matching entry in ${this.edition}</h2><p>“${esc(this.missing?.title || "This topic")}” has no direct match in this SRD edition. Choose a topic from the navigation or search.</p></div>`}</article></div><details class="rules-attribution"><summary>Sources, coverage & attribution</summary><p>${esc(attribution2014)}</p><p>${esc(attribution2024)}</p><p>Text has been automatically extracted, reflowed and organized into topics. This library covers the bundled SRDs, not every published book. Tables and complex layouts are best read in the original PDF. Topic names and organization may differ between editions.</p><p><a href="./rules/srd-2014.pdf" target="_blank" rel="noopener">2014 SRD PDF ↗</a> · <a href="./rules/srd-2024.pdf" target="_blank" rel="noopener">2024 SRD PDF ↗</a> · <a href="https://creativecommons.org/licenses/by/4.0/legalcode" target="_blank" rel="noopener">CC BY 4.0 ↗</a></p></details></section>`;
  }
  navigation(entries) {
    const esc = this.esc;
    let results = searchRules(entries, this.query);
    if (this.mode === "bookmarks")
      results = results.filter((e) => this.bookmarks().includes(e.id));
    if (this.mode === "recent")
      results = this.recent()
        .map((id) => results.find((e) => e.id === id))
        .filter(Boolean);
    if (this.query || this.mode !== "hierarchy") {
      if (this.mode === "alphabetical")
        results.sort((a, b) => a.title.localeCompare(b.title));
      return `<p class="rule-result-count" role="status">${results.length} matching topics</p><div class="rule-results-list">${
        results
          .slice(0, this.limit)
          .map((e) => this.leaf(e, true))
          .join("") ||
        '<p class="empty">No matching topics. Try fewer words or another view.</p>'
      }</div>${results.length > this.limit ? `<button class="secondary" id="more-rule-results">Show more (${results.length - this.limit} remaining)</button>` : ""}`;
    }
    const tree = buildRuleTree(entries);
    const activePath =
      entries.find((e) => e.id === this.selectedId)?.path.join("/") || "";
    const branch = (node, path = []) => {
      const key = [...path, node.name].join("/"),
        open = this.open.has(key)
          ? this.open.get(key)
          : activePath === key || activePath.startsWith(key + "/");
      return `<details data-rule-branch="${esc(key)}" ${open ? "open" : ""}><summary>${categoryIcons[node.name] || "▱"} ${esc(node.name)}</summary>${[...node.children.values()].map((child) => branch(child, [...path, node.name])).join("")}${node.entries.map((e) => this.leaf(e)).join("")}</details>`;
    };
    return `<p class="rule-result-count">${entries.length.toLocaleString()} indexed topics · ${this.data[this.edition].pageCount} source pages</p>${[
      ...tree.children.values(),
    ]
      .sort(
        (a, b) =>
          ruleCategories.indexOf(a.name) - ruleCategories.indexOf(b.name),
      )
      .map((n) => branch(n))
      .join("")}`;
  }
  leaf(e, context = false) {
    return `<button data-rule-id="${e.id}" class="rule-leaf ${e.id === this.selectedId ? "selected" : ""}" ${e.id === this.selectedId ? 'aria-current="true"' : ""}><span>${this.bookmarks().includes(e.id) ? "★" : "▤"} ${this.esc(e.title)}</span>${context ? `<small>${this.esc(e.path.join(" › "))} · p. ${e.page}</small>` : ""}</button>`;
  }
  article(e, data) {
    const esc = this.esc,
      children = childEntries(e, data.entries),
      siblings = data.entries
        .filter(
          (r) =>
            r.id !== e.id &&
            r.category === e.category &&
            ((r.parentId === e.parentId && e.parentId) ||
              [
                "bonus-action",
                "reaction",
                "your-turn",
                "ready",
                "concentration",
              ].includes(r.key)),
        )
        .slice(0, 6);
    return `<div class="rule-breadcrumbs">${e.path.map((p) => esc(p)).join(" <span>›</span> ")}</div><div class="rule-title-row"><h2>${esc(e.title)}</h2><button id="bookmark-rule" class="icon-btn" aria-label="${this.bookmarks().includes(e.id) ? "Remove bookmark" : "Bookmark rule"}" aria-pressed="${this.bookmarks().includes(e.id)}">${this.bookmarks().includes(e.id) ? "★" : "☆"}</button></div><div class="rule-source"><span class="pill">${this.edition} · ${data.source}</span><a href="./rules/srd-${this.edition}.pdf#page=${e.page}" target="_blank" rel="noopener">Read source page ${e.page} ↗</a></div>${
      e.text
        ? e.text
            .split(/\n\n/)
            .map((p) =>
              p.includes("\t")
                ? `<pre class="rule-table" tabindex="0">${esc(p.replace(/\t/g, "    "))}</pre>`
                : `<p class="rule-paragraph">${esc(p)}</p>`,
            )
            .join("")
        : '<p class="muted">This is a section heading. Choose a subtopic below to read its rules.</p>'
    }${children.length ? `<section class="rule-subtopics"><h3>In this section</h3>${children.map((c) => `<button class="text-btn" data-rule-id="${c.id}">${esc(c.title)} →</button>`).join("")}</section>` : ""}${siblings.length ? `<section class="rule-subtopics"><h3>Related topics</h3>${siblings.map((c) => `<button class="text-btn" data-rule-id="${c.id}">${esc(c.title)} →</button>`).join("")}</section>` : ""}<p class="rule-extraction-note">Reflowed reference text · Use the source page for original tables and formatting.</p>`;
  }
  select(id, render) {
    this.selectedId = id;
    this.missing = null;
    this.prefs.ruleRecent ??= {};
    this.prefs.ruleRecent[this.edition] = [
      id,
      ...this.recent().filter((x) => x !== id),
    ].slice(0, 12);
    this.savePrefs();
    render();
    document.querySelector(".rule-reader")?.scrollTo(0, 0);
  }
  bind(project, render) {
    const scope = document.querySelector(".rules-workspace");
    const retry = document.querySelector("#retry-rules");
    if (retry)
      retry.onclick = () => {
        delete this.errors[this.edition];
        render();
      };
    if (!scope) return;
    const bindResults = () => {
      scope
        .querySelectorAll("[data-rule-id]")
        .forEach(
          (b) => (b.onclick = () => this.select(b.dataset.ruleId, render)),
        );
      scope
        .querySelectorAll("[data-rule-branch]")
        .forEach(
          (d) =>
            (d.ontoggle = () => this.open.set(d.dataset.ruleBranch, d.open)),
        );
      const more = scope.querySelector("#more-rule-results");
      if (more)
        more.onclick = () => {
          this.limit += 100;
          refresh();
        };
    };
    const refresh = () => {
      if (!scope.isConnected) return;
      scope.querySelector("#rule-results").innerHTML = this.navigation(
        this.data[this.edition].entries,
      );
      bindResults();
    };
    bindResults();
    scope.querySelector("#rule-search").oninput = (e) => {
      this.query = e.target.value;
      this.limit = 100;
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(refresh, 120);
    };
    scope.querySelector("#rule-view").onchange = (e) => {
      this.mode = e.target.value;
      this.limit = 100;
      refresh();
    };
    scope.querySelectorAll("[data-rule-edition]").forEach(
      (b) =>
        (b.onclick = async () => {
          const edition = b.dataset.ruleEdition;
          if (edition === this.edition) return;
          const current =
            this.data[this.edition]?.entries.find(
              (e) => e.id === this.selectedId,
            ) || this.contextEntry;
          const campaignId = this.campaignId;
          this.edition = edition;
          this.selectedId = null;
          this.missing = current ? { title: current.title } : null;
          this.ensure(edition, () => {
            if (this.edition !== edition || this.campaignId !== campaignId) {
              render();
              return;
            }
            const match =
              current && this.data[edition]
                ? findCounterpart(current, this.data[edition].entries)
                : null;
            if (match) {
              this.selectedId = match.id;
              this.missing = null;
            }
            render();
          });
          if (this.data[edition]) {
            const match = findCounterpart(current, this.data[edition].entries);
            this.selectedId = match?.id || null;
            this.missing = match
              ? null
              : current
                ? { title: current.title }
                : null;
          }
          render();
        }),
    );
    const bookmark = scope.querySelector("#bookmark-rule");
    if (bookmark)
      bookmark.onclick = () => {
        this.prefs.ruleBookmarks ??= {};
        const ids = this.bookmarks();
        this.prefs.ruleBookmarks[this.edition] = ids.includes(this.selectedId)
          ? ids.filter((id) => id !== this.selectedId)
          : [...ids, this.selectedId];
        this.savePrefs();
        render();
      };
    scope.querySelector("#toggle-rule-tree").onclick = () => {
      this.treeVisible = !this.treeVisible;
      render();
    };
  }
}
