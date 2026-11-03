# Calculations and scope

Ability modifiers use `floor((score - 10) / 2)`, consistent with the published tables in the official [2014 Basic Rules](https://www.dndbeyond.com/sources/dnd/basic-rules-2014/using-ability-scores) and [2024 Basic Rules](https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game). This is a calculator, not a reproduction of either full rulebook.

Weapon rolls use the selected ability modifier, an editable proficiency bonus when enabled, and a manual adjustment. Damage uses editable dice, an optional ability modifier, and a manual adjustment. Choose the ability and settings appropriate to the weapon and any relevant features. These are generic calculators, not automatic enforcement of every attack exception. Standard equipment presets will arrive with source-attributed, edition-specific rules data.

The first structured Statistics component on a character supplies the calculated modifiers. Existing free-text statistics do not get silently parsed. A weapon without structured statistics displays a prompt and cannot roll using an unknown ability modifier; choose None to use purely manual adjustments.

Inventory totals are the sum of quantity × weight for that inventory component. Carrying limits are manual. No size multiplier, Strength-derived capacity, optional encumbrance penalties, coin weight, or equipment in other components is inferred. HP and ammunition have manual adjustment controls; weapon rolls never spend ammunition or apply damage. Casting requirements do not consume inventory.

Structured component data is an optional addition to version 1 campaign files. Legacy text is preserved in `value`; new fields live in `data`. Upgrading an old component uses editable defaults rather than attempting to infer statistics from prose. Import validation checks structured data and same-character ammunition references.
