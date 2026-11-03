import { test, expect } from "@playwright/test";

test("features use compact cards, saved choices and readable current-level tables", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await project(page);
  await page.locator('[data-open-tool="Characters"]').click();
  await page.locator('[data-create-actor="character"]').click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Rowan");
  await dialog.getByLabel("Class", { exact: true }).selectOption("Monk");
  await dialog
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("Human");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  const form = page.locator("[data-edit-actor]");
  const features = form.locator("[data-feature-section]");
  await features.locator(":scope > summary").click();
  await expect(features.locator(".feature-card-body:visible")).toHaveCount(0);
  await expect(features).not.toContainText("Fiendish");
  const card = (name) =>
    features.locator(".feature-card").filter({
      has: page.locator(":scope > summary > span", {
        hasText: new RegExp("^" + name + "$"),
      }),
    });
  await card("Class skills").locator(":scope > summary").click();
  await features
    .getByLabel("Class skills 1", { exact: true })
    .selectOption("Acrobatics");
  await features
    .getByLabel("Class skills 2", { exact: true })
    .selectOption("Athletics");
  await expect(
    features
      .getByLabel("Class skills 2", { exact: true })
      .locator("option[value=Acrobatics]"),
  ).toHaveAttribute("disabled", "");
  await card("Origin feat").locator(":scope > summary").click();
  await features
    .getByLabel("Origin feat", { exact: true })
    .selectOption("Skilled");
  await card("Skilled proficiency").locator(":scope > summary").click();
  await features
    .getByLabel("Skilled proficiency 1", { exact: true })
    .selectOption("Deception");
  await features
    .getByLabel("Skilled proficiency 2", { exact: true })
    .selectOption("History");
  await features
    .getByLabel("Skilled proficiency 3", { exact: true })
    .selectOption("__custom");
  await features
    .getByLabel("Custom skilled proficiency 3", { exact: true })
    .fill("Cartographer’s tools");
  await features
    .getByLabel("Custom skilled proficiency 3", { exact: true })
    .press("Tab");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await features.locator(":scope > summary").click();
  await card("Class skills").locator(":scope > summary").click();
  await expect(
    features.getByLabel("Class skills 1", { exact: true }),
  ).toHaveValue("Acrobatics");
  await card("Skilled proficiency").locator(":scope > summary").click();
  await expect(
    features.getByLabel("Custom skilled proficiency 3", { exact: true }),
  ).toHaveValue("Cartographer’s tools");
  const martial = card("Level 1: Martial Arts");
  await martial.locator(":scope > summary").click();
  await expect(martial.locator("table").first().locator("th")).toHaveText([
    "Level",
    "Martial Arts die",
    "Focus Points",
    "Extra movement",
  ]);
  await expect(
    martial.locator("table").first().locator("tbody tr"),
  ).toHaveCount(1);
  await expect(martial.locator("table").first()).toContainText("1d6");
  await martial.getByText("All levels", { exact: true }).click();
  await expect(martial.locator("table").nth(1).locator("tbody tr")).toHaveCount(
    20,
  );
  await martial.getByText("All levels", { exact: true }).click();
  await page.screenshot({
    path: "artifacts/character-feature-cards.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await form
    .getByRole("button", { name: "Add to encounter", exact: true })
    .click();
  await page.getByText("Character / monster details", { exact: true }).click();
  await page
    .locator(".participant-editor .feature-card")
    .filter({
      has: page.locator(":scope > summary > span", {
        hasText: /^Class skills$/,
      }),
    })
    .locator(":scope > summary")
    .click();
  await expect(page.locator(".participant-editor .choice-value")).toContainText(
    ["Class skills 1Acrobatics", "Class skills 2Athletics"],
  );
  await expect(
    page.locator(".participant-editor [data-feature-choice-input]"),
  ).toHaveCount(0);
});

test("class and species choices fill level-aware features, preserve notes and allow homebrew", async ({
  page,
}) => {
  await page.goto("/");
  await project(page);
  await page.locator('[data-open-tool="Characters"]').click();
  await page.locator('[data-create-actor="character"]').click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Mira");
  await dialog.getByLabel("Class", { exact: true }).selectOption("Fighter");
  await dialog
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("Elf");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  const form = page.locator("[data-edit-actor]");
  const generated = form.locator("details").filter({
    has: page.locator("summary", { hasText: /^Class \/ species features$/ }),
  });
  await generated.locator(":scope > summary").click();
  await expect(generated).toContainText("Second Wind");
  await expect(generated).toContainText("Darkvision");
  await expect(generated).not.toContainText("Level 2: Action Surge");
  await form
    .locator("summary")
    .filter({ hasText: /^Features \/ source stat block$/ })
    .click();
  await form.locator("textarea[name=features]").fill("Custom feature");
  await form.getByLabel("Level", { exact: true }).fill("2");
  await form.getByLabel("Level", { exact: true }).press("Tab");
  await expect(generated).toContainText("Level 2: Action Surge");
  await expect(form.locator("textarea[name=features]")).toHaveValue(
    "Custom feature",
  );
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(form.getByLabel("Class", { exact: true })).toHaveValue(
    "Fighter",
  );
  await expect(
    form.getByLabel("Species / ancestry", { exact: true }),
  ).toHaveValue("Elf");
  await expect(generated).toContainText("Level 2: Action Surge");
  await form.getByLabel("Rules edition", { exact: true }).selectOption("2014");
  await expect(generated).not.toContainText("Weapon Mastery");
  await form
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("Half-Elf");
  await form.getByLabel("Rules edition", { exact: true }).selectOption("2024");
  await expect(
    form.getByLabel("Species / ancestry", { exact: true }),
  ).toHaveValue("");
  await form.getByLabel("Class", { exact: true }).selectOption("__custom");
  await expect(form.getByLabel("Custom class", { exact: true })).toBeVisible();
  await form.getByLabel("Custom class", { exact: true }).fill("Star Weaver");
  await form
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("__custom");
  await form
    .getByLabel("Custom species / ancestry", { exact: true })
    .fill("Moonkin");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(form.getByLabel("Custom class", { exact: true })).toHaveValue(
    "Star Weaver",
  );
  await expect(
    form.getByLabel("Custom species / ancestry", { exact: true }),
  ).toHaveValue("Moonkin");
  await expect(form.locator("textarea[name=features]")).toHaveValue(
    "Custom feature",
  );
  await expect(generated).toHaveCount(0);
});
async function project(page, name = "Test project") {
  await page
    .getByRole("button", { name: "New project", exact: false })
    .first()
    .click();
  await page.getByLabel("Project name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Create", exact: true }).click();
}
async function character(page) {
  await page.locator('[data-open-tool="Characters"]').click();
  await page.getByRole("button", { name: "＋ Character", exact: true }).click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Asha");
  await dialog.getByLabel("Maximum HP", { exact: true }).fill("30");
  await dialog.getByLabel("AC", { exact: true }).fill("16");
  await dialog
    .getByLabel("Score method", { exact: true })
    .selectOption("manual");
  await dialog.getByLabel("STR base score", { exact: true }).fill("16");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.locator(".actor-list")).toContainText("Asha");
}
test("character builder, edited stats and encounter health persist independently", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await project(page);
  await character(page);
  const form = page.locator("[data-edit-actor]");
  await form.getByLabel("AC", { exact: true }).fill("18");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".actor-save-state")).toHaveText("Saved");
  await page
    .getByRole("button", { name: "Add to encounter", exact: true })
    .click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "30 / 30",
  );
  await page.getByLabel("HP amount", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "23 / 30",
  );
  await page.getByLabel("HP amount", { exact: true }).fill("4");
  await page.getByRole("button", { name: "Add HP", exact: true }).click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "27 / 30",
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "23 / 30",
  );
  await page.reload();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "23 / 30",
  );
  await page.locator('[data-open-tool="Characters"]').click();
  await expect(
    page.locator("[data-edit-actor]").getByLabel("Maximum HP", { exact: true }),
  ).toHaveValue("30");
  await expect(
    page.locator("[data-edit-actor]").getByLabel("AC", { exact: true }),
  ).toHaveValue("18");
  expect(errors).toEqual([]);
});
test("SRD presets can be customized, dragged into an encounter and used more than once", async ({
  page,
}) => {
  await page.goto("/");
  await project(page);
  await page.locator('[data-open-tool="Monsters"]').click();
  await page.getByRole("button", { name: "Presets", exact: true }).click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Search presets", { exact: true }).fill("Wolf");
  await dialog
    .getByLabel("Monster preset", { exact: true })
    .selectOption({ label: "Wolf · CR 1/4" });
  await expect(dialog.getByLabel("Maximum HP", { exact: true })).toHaveValue(
    "11",
  );
  await dialog.getByLabel("Maximum HP", { exact: true }).fill("25");
  await dialog.getByLabel("AC", { exact: true }).fill("13");
  await dialog.getByRole("button", { name: "Use preset", exact: true }).click();
  await expect(page.locator(".actor-list")).toContainText("Wolf");
  await page
    .locator("[data-actor-id]")
    .dragTo(page.locator('[data-open-tool="Encounter"]'));
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "25 / 25",
  );
  await page.locator('[data-open-tool="Monsters"]').click();
  await page
    .getByRole("button", { name: "Add to encounter", exact: true })
    .click();
  await expect(page.locator(".participant-row")).toHaveCount(2);
  await page.locator(".participant-row").first().click();
  await page.getByLabel("HP amount", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "16 / 25",
  );
  await page.locator(".participant-row").last().click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "25 / 25",
  );
  await page.locator('[data-open-tool="Monsters"]').click();
  await expect(
    page.locator("[data-edit-actor]").getByLabel("Maximum HP", { exact: true }),
  ).toHaveValue("25");
  await page.getByRole("button", { name: "Presets", exact: true }).click();
  await dialog.getByLabel("Search presets", { exact: true }).fill("Wolf");
  await dialog
    .getByLabel("Monster preset", { exact: true })
    .selectOption({ label: "Wolf · CR 1/4" });
  await expect(dialog.getByLabel("Maximum HP", { exact: true })).toHaveValue(
    "11",
  );
  await dialog
    .getByLabel("Preset edition", { exact: true })
    .selectOption("2014");
  await expect(
    dialog.getByLabel("Monster preset", { exact: true }),
  ).toContainText("Wolf");
});
test("PDF sheets remain attached locally and project records stay separate", async ({
  page,
}) => {
  await page.goto("/");
  await project(page, "First");
  await character(page);
  await page
    .locator("[data-pdf-file]")
    .setInputFiles("dist/rules/srd-2014.pdf");
  await expect(
    page.getByRole("link", { name: "Open PDF", exact: false }),
  ).toHaveAttribute("href", /^blob:/);
  await expect(
    page.locator('iframe[title="Character sheet PDF"]'),
  ).toHaveAttribute("src", /^blob:/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "View PDF", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View PDF", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open PDF", exact: false }),
  ).toHaveAttribute("href", /^blob:/);
  const first = await page.locator("#shell-project").inputValue();
  await project(page, "Second");
  await page.locator('[data-open-tool="Characters"]').click();
  await expect(
    page.getByRole("button", { name: "＋ Character", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".actor-list-item")).toHaveCount(0);
  await page.locator("#shell-project").selectOption(first);
  await expect(page.locator(".actor-list")).toContainText("Asha");
});
test("encounter temporary HP and manual overrides do not shrink text on a narrow panel", async ({
  page,
}) => {
  await page.goto("/");
  await project(page);
  await character(page);
  await page
    .getByRole("button", { name: "Add to encounter", exact: true })
    .click();
  await page.getByText("Combat stats", { exact: true }).click();
  const form = page.locator("[data-participant-stats]");
  await form.getByLabel("Temporary HP", { exact: true }).fill("5");
  await form.getByRole("button", { name: "Save stats", exact: true }).click();
  await page.getByLabel("HP amount", { exact: true }).fill("8");
  await page.getByRole("button", { name: "Damage", exact: true }).click();
  await expect(page.getByLabel("Current health", { exact: true })).toHaveText(
    "27 / 30",
  );
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(page.locator("html")).toHaveCSS("font-size", "16px");
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.screenshot({
    path: "artifacts/encounter-health.png",
    fullPage: true,
  });
});
