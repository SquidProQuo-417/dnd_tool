# Characters, monsters and encounter records

Projects start without records. Characters and Monsters have quick creators with name, maximum HP, AC and ability modifiers. Records expose speed, initiative modifier, saving throws, skills, attacks, features and notes. Characters also have level, class and species/ancestry. Edits use Save, with an Unsaved indicator; drafts survive panel rearrangement in the running session.

PDF sheets can be attached (15 MB limit), stored in IndexedDB, viewed beside fields on wide panels, or opened separately. Entry from the PDF is manual; there is no PDF field extraction or OCR yet. Bytes are checked for a PDF header and stored as application/pdf.

## Class and species choices

Creation and editing include edition-specific Class and Species / ancestry dropdowns: all 12 SRD classes and 9 SRD species per edition. Choose Custom to enter homebrew names. Class / species features are grouped into individually expandable cards. Class features update with level or edition. Choices have separate cards with completion counts: class skills, fighting styles, species lineages, size, ancestry, extra languages and Human origin feats. Selecting Skilled or Magic Initiate reveals their additional selections. Custom entries are available; choices without a specialized picker have a labeled text field. Encounter snapshots retain these choices and display them without editing controls.

Custom features, notes, HP, AC and ability modifiers remain manually editable and are not overwritten by these choices. Selections are recorded, not applied to numeric stats. Spell selections and choices without a specialized picker use text entry; this is not a complete character-sheet calculator or prerequisite validator. The class/species reference is regenerated from selections; write custom additions in Features / source stat block.

Tables use headers, separated rows and horizontal scrolling within their cards. Twenty-level progression tables show the current level first, with All levels to expand the complete table. Core class traits use labeled facts instead of extracted tab-separated text. Ambiguous tables link to the source PDF instead of displaying misaligned rows. Generator corrections relocate the 2024 Tiefling legacy table from Human and Elf spells from Gnome, normalize the lineage and Monk progression tables, and reunite the 2014 Monk proficiencies and Martial Arts text split across PDF columns.

Run npm run build:characters to rebuild the option catalog from the bundled CC-licensed SRD indexes. Source pages appear with each feature; attribution is linked from the reference. Non-SRD books are outside the catalog.

## Monster presets

The catalogs contain 296 SRD 5.1 monsters for 2014 and 330 SRD 5.2.1 monsters for 2024. This is SRD coverage, not every published book. Attribution is in dist/rules/ATTRIBUTION.txt, linked from the chooser. Copies retain their source edition and PDF page. HP and AC can be overridden during copying, and all fields remain editable afterward.

Run npm run build:monsters to rebuild catalogs from the bundled rules indexes. AC, HP and modifiers are extracted; source text and child sections are retained as reference. Ambiguous saving throws are marked check source. Source PDFs remain the authoritative layout. The generator excludes actions/traits mentioning object AC and HP from the catalog.

## Encounter behavior

Drag a saved record onto the Encounter navigation item, tab, or drop area. Add to encounter and the participant chooser provide alternatives. Dropping focuses Encounter and selects the participant. Instances have independent health and combat overrides.

Each participant stores a snapshot. Changes to HP, temporary HP, AC, initiative or conditions do not modify the original or other instances. Add HP caps at maximum. Damage consumes temporary HP and then HP, stopping at zero. Undo reverses the most recent health operation in the session. No automatic death, resistance, healing restriction, or turn-order enforcement is applied. Deleting a library record leaves its existing participants usable.

## Storage

The waypoint-actors IndexedDB database holds project-keyed collections and PDF blobs. Writes are serialized. Legacy waypoint campaigns and shell preferences are not overwritten. New records are browser-local; JSON handoff and attachment export for this store remain outstanding. Legacy campaign exports do not include these records.

Other tools remain blank. Startup has no demo project, party, or automatic preset insertion.
