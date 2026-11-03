# Characters, monsters and encounter records

Projects start without records. Characters have a quick creator with name, maximum HP, AC and ability scores; monsters retain modifier entry. Records expose speed, initiative modifier, saving throws, skills, attacks, features and notes. Characters also have level, class, species/ancestry and background. Edits use Save, with an Unsaved indicator; drafts survive panel rearrangement in the running session.

PDF sheets can be attached (15 MB limit), stored in IndexedDB, viewed beside fields on wide panels, or opened separately. Entry from the PDF is manual; there is no PDF field extraction or OCR yet. Bytes are checked for a PDF header and stored as application/pdf.

## Class and species choices

Creation and editing include edition-specific Class and Species / ancestry dropdowns: all 12 SRD classes and 9 SRD species per edition. Choose Custom to enter homebrew names. Class / species features are grouped into individually expandable cards. Class features update with level or edition. Choices have separate cards with completion counts: class skills, fighting styles, species lineages, size, ancestry, extra languages and Human origin feats. Selecting Skilled or Magic Initiate reveals their additional selections. Custom entries are available; choices without a specialized picker have a labeled text field. Encounter snapshots retain these choices and display them without editing controls.

Custom features, notes, HP and AC remain manually editable. Spell selections and choices without a specialized picker use text entry; this is not a complete character-sheet calculator or prerequisite validator. The class/species reference is regenerated from selections; write custom additions in Features / source stat block. Short species facts are combined into one card; other species group their basic facts together. All collapsed card headers have a consistent height.

## Ability scores and saving throws

New characters start with 27-point buying: base scores 8–15, costs 0/1/2/3/4/5/7/9. Input limits update as points are assigned; increasing a score is capped at what the remaining budget can afford, including the two-point steps to 14 and 15. Background input limits enforce a maximum +2/+1 or three +1 allocation immediately. Changing background or edition clears the previous background allocation. Spending fewer than 27 is allowed. Model validation also rejects invalid allocations on full character saves. Manual scores are available. Each tile shows the final score, its modifier, an editable base and a source breakdown. The modifier is floor((score − 10) / 2).

2014 species and selected SRD subraces apply their fixed increases when Apply species bonuses is enabled; Half-Elf additional increases follow its two selections. In 2024 the selected background allows +2/+1 or three +1 increases among its listed abilities. SRD background coverage is Acolyte in 2014 and Acolyte, Criminal, Sage and Soldier in 2024; custom backgrounds allow choosing abilities manually. Class, feat and other adjustments are read-only until Enter custom homebrew value is pressed. Lock homebrew values protects them again while retaining existing adjustments. Class and feat adjustments are not automated yet; this is stated in the interface. No automatic feat, background skill, armor, HP or attack calculation is implied.

Existing records without score data keep their original modifiers. Their editable manual scores are inferred from those modifiers, with automatic species increases disabled to avoid applying bonuses twice. Choosing Point buy restarts the base scores at 8. Changing class or edition updates automatic saving throw proficiencies. Saves use the current modifier plus the level-based proficiency bonus when proficient, plus explicit additional bonuses. Monk level 14 and Rogue level 15 saving throw proficiencies are included. Custom proficiency selections and additional bonuses cover feats, items, multiclassing and conditional effects. Previous free-text saves remain as notes.

## Equipment and currency

Equipment has separate loaders for class and background. The preview offers 2024 package choices or 2014 equipment alternatives and editable item names, quantities and coins. Open-ended choices such as a musical instrument can be resolved in that preview. Packs remain inventory items; their contents are not unpacked and weapon statistics are not automatically created. Manual Add item, quantity edits and removal are available.

Loading the same source again replaces its tagged inventory and reconciles its previous coin grant, preserving manual items and the other source. If replacing a grant would make a denomination negative, the operation is rejected without changing the record. Equipment and wallet values are saved with the character and copied into encounter snapshots. Currency tracks PP, GP, EP, SP and CP without automatically converting denominations, plus a GP-equivalent total.

Equipment loading and inventory draft changes validate only inventory, currency and grants. An unfinished or invalid ability allocation does not produce an error in the equipment modal. Saving the complete character still validates its scores in the main form.

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
