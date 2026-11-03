# Waypoint · project specification

## Current scope: minimal workspace and record tools

The entry point starts empty with no demo project or seeded records. Characters, Monsters and Encounter now provide user-requested creation, editable SRD presets, PDF viewing and independent encounter health controls. Other tool panels stay blank. Promotional wording and onboarding are not displayed. Existing legacy campaigns and preferences remain intact. Broader requirements below remain future scope.

A local-first, installable D&D preparation workspace. DM preparation is the first milestone. No accounts, simultaneous editing, or automatic combat enforcement.

## Agreed requirements

- Campaigns select 2014 or 2024 rules. A rules panel can browse another edition without changing that setting.
- Modular characters own component records (weapons, ammunition, statistics, inventory, spell requirements, notes). Characters can reference multiple parent groups. References resolve to one original record.
- Preparation combines hierarchical notes, structured records, uploaded images, and a movable card canvas with labeled connections and character references.
- JSON handoff includes images. Local recovery snapshots and schema validation protect data. Personal layout preferences are separate from campaign files.
- Customization order: saved layouts, panel placement, visibility priority, themes, fonts and size. Desktop/laptop first; mobile later. External panel windows later.
- Combat: manual initiative, HP, conditions and resource adjustments, then grid, tokens, distance and background maps. Walls, fog and hidden enemies later.
- Spell components display casting requirements only. Player build advice is deferred.
- Homebrew mirrors the rules hierarchy, can add or replace entries, and flags replacements in standard rules. Creators later.

## Milestones

1. Preparation foundation: campaigns, portable project files, notes, reusable modular characters, image cards, connected board, local persistence and recovery.
2. Rules: curated permitted content with source attribution, hierarchy, search, homebrew, independent edition selection. Never present a partial library as a complete rulebook.
3. Workspace foundation (moved ahead of combat): tabs, docked splits, resizing, panel priorities, hide/restore, named layouts and recovery.
4. Session: initiative, encounter-local resource state, manual combat, then the battlefield grid. Freely floating panels and external windows follow later.
5. Player reference, more board views, generators, custom creators, mobile improvements; optional dice minigame last. Homebrew rules are explicitly deferred for now.

## Data and behavior

Project format `waypoint-campaign`, version 1. Records have stable IDs. Notes, groups, characters, components, cards and connections live in a project. Card references store character IDs, not copied character data. Group membership is many-to-many. Encounter state will be separate from character templates.

Browser storage is local to an origin and browser. Export files are the portable source of truth for handoff. Imported files create a new local campaign; they do not overwrite an existing campaign. Images are embedded raster data URLs. Exports include private DM content; no player-safe sharing is implemented yet.

## First-release limits

The current implementation is a preparation foundation with optional structured character components, not a complete rules library, player sheet or virtual tabletop. Boards and notes use plain text, with more editing formats planned. Weapon and inventory calculators use manual settings; ammunition spending is explicit. Real-time sharing, automated combat and player build recommendations are out of scope.
