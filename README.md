# Waypoint

A local-first Dungeons & Dragons preparation workspace. Built as a dependency-free static web app; Node is needed only for development and tests.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4173. A demo campaign provides editable sample notes, characters and cards. Use **New campaign** for an empty project.

## Included in this milestone

- Campaigns with a 2014/2024 edition setting.
- Searchable notes with custom categories.
- Modular character records: calculated ability modifiers, weapon attack/damage buttons, linked ammunition, inventory weights and manual carrying limits, spell requirements, and notes. Legacy text stays intact when structured fields are added.
- Multiple group memberships, through checkboxes or drag and drop.
- Scrollable idea canvas, draggable cards, labeled arrow connections and live character references.
- Uploaded raster reference images (3 MB per image), embedded in JSON exports.
- IndexedDB autosave, previous-save recovery and validated imports that create separate campaigns.
- Movable tool tabs, docked split panels, resize dividers, visibility priorities, hide/restore controls, and named saved layouts with reset/recovery.
- Themes, fonts, text sizes, and collapsible navigation/reference panels.
- Dice expressions, install manifest and an offline service worker.
- Searchable 2014/2024 SRD rules library with topic hierarchy, edition switching, bookmarks, recent topics, source-page links, and bundled PDFs.

Homebrew overlays, standard equipment presets, combat, initiative, freely floating panels, external windows and player mode are later milestones. The reference includes SRD content rather than every published rulebook. Structured components are generic calculators with manual settings, not a complete character-sheet rules engine.

## Files and privacy

Data stays in this browser’s IndexedDB. **Export campaign** downloads a versioned JSON file including all images and DM content. Import creates a separate campaign rather than merging or overwriting. Keep exports before clearing browser data or moving computers. Imports are limited to 25 MB. Uploaded images must be PNG, JPEG, WebP or GIF.

Install support varies by browser/platform. Open once online to cache app files and both reference editions (roughly 13 MB). Localhost and HTTPS support offline/install features. There are no accounts, analytics, remote fonts or runtime dependencies.

## Verification

```sh
npm test
npm run check
npm run test:browser
```

Browser tests default to installed Microsoft Edge on Windows. Change the Playwright `channel` for another installed browser. Tests cover persistence, component editing, memberships, card dragging, uploads, connections, JSON handoff, dice and responsive widths. Generated screenshots and test output are ignored by Git.

Use `npm run format` to format application sources, documentation, and tests. No build step is required. When changing cached application files for a release, increment the cache version in `dist/sw.js`.

## Hosting status

A private Sites project has been registered, but no source has been uploaded and no version has been published. Hosting synchronization needs separate authorization. The GitHub repository and local development workflow are independent of hosting.

See [the project specification](docs/PROJECT.md) for agreed requirements and the milestone order.

The published [roadmap and to-do list](docs/ROADMAP.md) is also available from **Roadmap** inside the app. See [calculation details](docs/MECHANICS.md) for structured component behavior and rule references.

See [rules-library coverage and maintenance](docs/RULES-LIBRARY.md) for source attribution, extraction limits, and instructions for rebuilding the index.

See [workspace controls](docs/WORKSPACE.md) for docking, tab movement, visibility priorities, named layouts, and layout recovery.
