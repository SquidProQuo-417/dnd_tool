import { test, expect } from "@playwright/test";
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
  await dialog.getByText("Ability modifiers", { exact: true }).click();
  await dialog.getByLabel("STR", { exact: true }).fill("3");
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
