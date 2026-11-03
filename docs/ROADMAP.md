# Waypoint roadmap

## Current direction: shell only

- [x] Empty startup without seeded projects or records.
- [x] Persistent green navigation toggle and a stable expanding workspace.
- [x] Blank tool panels with docking, resizing, priorities and named layouts.
- [x] No decorative copy, campaign sidebar, or content-filled overview.
- [x] Preserve existing records and previous preferences separately.

Content features are on hold. The sections below record previous implementation work and longer-term scope; those features are not loaded by the current shell. Homebrew remains deferred.

This is the shared project to-do list. Status reflects implemented behavior, not just planned screens.

## Completed: preparation foundation

- [x] Local-first campaigns with a 2014/2024 edition setting.
- [x] Searchable notes and custom categories.
- [x] Reusable characters with multiple group memberships.
- [x] Attach and remove character components.
- [x] Movable brainstorming cards, labeled connections, and character references.
- [x] Uploaded portraits and reference images embedded in campaign files.
- [x] JSON export/import, local autosave, and previous-save recovery.
- [x] Themes, fonts, text sizes, panel visibility, and named workspace layouts.
- [x] Dice roller and offline app caching.

## 1. Refine preparation — available, further refinements planned

- [x] Structured statistics and calculated ability modifiers.
- [x] Structured weapons with attack/damage roll buttons and ammunition references.
- [x] Ammunition quantities and manual use/refill controls.
- [x] Inventory quantities, weights, and progress against a manual carrying limit.
- [x] Structured spell casting requirements, without material inventory tracking.
- [x] Preserve existing free-text components and campaign files.
- [ ] Try preparing a real session and refine the workflow from feedback.
- [ ] Richer note formatting.
- [ ] Outline and column views alongside the canvas.
- [ ] More flexible record references and organization.

## 2. Rules library — available, further review planned

- [x] Source-attributed 2014 SRD 5.1 and 2024 SRD 5.2.1 reference text, with original PDFs.
- [x] Searchable, collapsible hierarchy with icons and breadcrumbs.
- [x] Independent edition toggle inside the rules panel, with contextual topic matching and missing-entry notices.
- [x] Bookmarks, recent rules, and related-rule links.
- [x] Alphabetical browsing and offline reference access.
- [ ] Continue reviewing extracted text, table layouts, and navigation quality against source pages.
- [ ] Standard equipment presets with edition-specific data.

## 3. Panel foundation — current milestone

- [x] Open existing tools as tabs and show several tools at once.
- [x] Drag tabs to reorder, move between panels, or dock at an edge.
- [x] Split panels horizontally or vertically and resize with dividers.
- [x] Keyboard tab navigation, resizing, and menu alternatives to drag and drop.
- [x] Collapse panels, hide tools, and restore them without losing campaign content.
- [x] Configurable visibility priorities and automatic collapse when space is limited.
- [x] Named saved layouts, explicit replacement, deletion, reset, and previous-layout recovery.
- [x] Validate stored layouts and recover invalid preferences separately from campaign data.

The next implementation milestone is initiative and combat tracking. Homebrew remains deferred.

## 4. Session tracking

- [ ] Initiative and encounter participants.
- [ ] Encounter-local HP, conditions, spell slots, ammunition, and other resources.
- [ ] Manual control with useful calculations; no automatic combat enforcement.

## 5. Battlefield

- [ ] Square grid, draggable tokens, and character references.
- [ ] Movement measurement.
- [ ] Uploaded background maps.

## 6. Advanced workspace customization — later

- [ ] Freely floating panels inside the app.
- [ ] Detached windows for additional monitors.
- [ ] Expanded mobile layout behavior.

## 7. Player mode

- [ ] Simplified workspace that hides DM tools.
- [ ] Character-creation guidance, class/action questions, and spell explanations.
- [ ] Edition-aware information.
- [ ] Character-build recommendations deferred until requested.

## 8. Later extras

- [ ] Homebrew character, item, and enemy creators.
- [ ] Generators and additional brainstorming tools.
- [ ] Mobile refinements.
- [ ] Battlefield walls, fog of war, and hidden enemies.
- [ ] Optional dice minigame.

## Deferred: homebrew rules

- [ ] Matching rules hierarchy.
- [ ] Additions and replacements linked to standard rules.
- [ ] Replacement indicators in the standard rules browser.

## Distribution

- [x] Commit working milestones to GitHub.
- [ ] Hosted preview: source upload to the separate Sites hosting destination requires authorization.
- [ ] Broader install and cross-browser verification.

No accounts, simultaneous editing, or cloud synchronization are planned for the current scope. Campaign handoff uses exported files.
