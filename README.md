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
- Modular character records: attach editable statistics, weapons, ammunition, inventory, spell requirements and notes.
- Multiple group memberships, through checkboxes or drag and drop.
- Scrollable idea canvas, draggable cards, labeled arrow connections and live character references.
- Uploaded raster reference images (3 MB per image), embedded in JSON exports.
- IndexedDB autosave, previous-save recovery and validated imports that create separate campaigns.
- Themes, fonts, text sizes, collapsible navigation/reference panels and a saved visibility layout.
- Dice expressions, install manifest and an offline service worker.

Rules content, combat, initiative, advanced docking, external windows and player mode are later milestones. The current rules page explicitly describes that status. Component values are editable text, not calculated character-sheet fields.

## Files and privacy

Data stays in this browser’s IndexedDB. **Export campaign** downloads a versioned JSON file including all images and DM content. Import creates a separate campaign rather than merging or overwriting. Keep exports before clearing browser data or moving computers. Imports are limited to 25 MB. Uploaded images must be PNG, JPEG, WebP or GIF.

Install support varies by browser/platform. Open once online to cache app files. Localhost and HTTPS support offline/install features. There are no accounts, analytics, remote fonts or runtime dependencies.

## Verification

```sh
npm test
npm run check
npm run test:browser
```

Browser tests default to installed Microsoft Edge on Windows. Change the Playwright `channel` for another installed browser. Tests cover persistence, component editing, memberships, card dragging, uploads, connections, JSON handoff, dice and responsive widths. Generated screenshots and test output are ignored by Git.

See [the project specification](docs/PROJECT.md) for agreed requirements and the milestone order.
