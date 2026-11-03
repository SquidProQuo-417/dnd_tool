# Waypoint workspace shell

The application starts empty and keeps the minimal workspace layout. Characters, Monsters, and Encounter now have functional controls; other tool panels remain blank. No project or character records are seeded.

## Run

Run npm install, then npm run dev. Open http://127.0.0.1:4173. On Windows, use npm.cmd if PowerShell blocks npm.

## Controls

- The green navigation toggle remains visible when the sidebar collapses.
- Open a tool from navigation or Open a tool.
- Drag tabs to reorder, merge, or dock; drag dividers to resize.
- Panel … menus control priority, tab placement, collapse, and hiding.
- Save layout and Layouts save, restore, reset, or recover arrangements.

Create a project, then use Characters to enter a name, HP, AC and ability modifiers. Additional details are editable in dropdown sections. Attach a PDF to view it alongside the fields or open it separately; PDF statistics are entered manually.

Monsters offers custom creation and 626 editable SRD presets across the 2014 and 2024 editions. Using a preset creates a copy. Drag a saved record onto Encounter (its navigation item, tab, or drop area), or use Add to encounter. Participants have independent HP, temporary HP, conditions and stat overrides. Add HP and Damage use the HP amount field; damage consumes temporary HP first and health is bounded by zero and maximum HP.

Layouts use local storage. New records, encounter state and PDF attachments use a separate IndexedDB database, waypoint-actors. Legacy campaigns and preferences remain untouched. These new records are local to this browser; portable export/import for this data store is not implemented yet. Use Save for record edits. HP changes save immediately.

## Verification

Run npm test, npm run check, and npm run test:browser. Browser checks target the current shell and active character/encounter tools using installed Microsoft Edge. Earlier UI tests remain historical. Rebuild monster catalogs with npm run build:monsters. See docs/ACTORS.md for data and source details.

The active entry point is dist/shell.js. No build step is required. Use npm run format for formatting. A hosted deployment has not been published.
