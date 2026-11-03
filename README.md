# Waypoint workspace shell

The current application is intentionally empty. It provides navigation, projects by name, blank tool tabs, docking, resizing, visibility priorities, and named layouts. No campaigns, notes, characters, rules, or other content are seeded or displayed.

## Run

Run npm install, then npm run dev. Open http://127.0.0.1:4173. On Windows, use npm.cmd if PowerShell blocks npm.

## Controls

- The green navigation toggle remains visible when the sidebar collapses.
- Open a blank tool from navigation or Open a tool.
- Drag tabs to reorder, merge, or dock; drag dividers to resize.
- Panel … menus control priority, tab placement, collapse, and hiding.
- Save layout and Layouts save, restore, reset, or recover arrangements.

The shell uses a separate local-storage namespace. Existing campaign data and previous preferences remain untouched. Previous feature modules remain in the repository but are not loaded by the shell entry point.

## Verification

Run npm test, npm run check, and npm run test:browser. Browser checks target the current shell and use installed Microsoft Edge. Earlier feature UI tests are retained as historical tests and are not the active browser suite. Pure model tests remain available.

The active entry point is dist/shell.js. No build step is required. Use npm run format for formatting. A hosted deployment has not been published.
