# Characters, monsters and encounter records

Projects start without records. Characters and Monsters have quick creators with name, maximum HP, AC and ability modifiers. Records expose speed, initiative modifier, saving throws, skills, attacks, features and notes. Characters also have level, class and species/ancestry. Edits use Save, with an Unsaved indicator; drafts survive panel rearrangement in the running session.

PDF sheets can be attached (15 MB limit), stored in IndexedDB, viewed beside fields on wide panels, or opened separately. Entry from the PDF is manual; there is no PDF field extraction or OCR yet. Bytes are checked for a PDF header and stored as application/pdf.

## Class and species choices

Creation and editing include edition-specific Class and Species / ancestry dropdowns: all 12 SRD classes and 9 SRD species per edition. Choose Custom to enter homebrew names. Standard choices automatically populate a separate, collapsible Class / species features reference, including class proficiencies and traits. Class features update when level or edition changes; species text includes options such as lineages and subraces for the DM to choose. This reference is included in encounter snapshots.

Custom features, notes, HP, AC and ability modifiers remain manually editable and are not overwritten by these choices. Skill selections, backgrounds, subclasses, spells, ability-score increases and optional lineage benefits are not automatically chosen or applied to numeric stats. This is a feature reference, not complete character-sheet calculation. The class/species reference is regenerated from selections; write custom additions in Features / source stat block.

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
