import { test, expect } from "@playwright/test";

test("2014 species bonuses and equipment choices keep the point-buy budget separate", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "New project", exact: false })
    .first()
    .click();
  await page.getByLabel("Project name", { exact: true }).fill("2014 test");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.locator('[data-open-tool="Characters"]').click();
  await page.locator('[data-create-actor="character"]').click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Elara");
  await dialog
    .getByLabel("Rules edition", { exact: true })
    .selectOption("2014");
  await dialog.getByLabel("Class", { exact: true }).selectOption("Wizard");
  await dialog
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("Elf");
  await dialog
    .getByLabel("Background", { exact: true })
    .selectOption("Acolyte");
  for (const a of ["STR", "DEX", "CON", "INT", "WIS", "CHA"])
    await dialog.getByLabel(a + " base score", { exact: true }).fill("15");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  await expect(dialog.locator("#form-error")).toContainText("27 points");
  for (const [a, n] of Object.entries({
    STR: 8,
    DEX: 15,
    CON: 13,
    INT: 14,
    WIS: 12,
    CHA: 10,
  }))
    await dialog.getByLabel(a + " base score", { exact: true }).fill(String(n));
  await expect(dialog.locator("[data-score-total=DEX]")).toHaveText("17");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  const form = page.locator("[data-edit-actor]");
  await form.locator("[data-feature-section] > summary").click();
  const subrace = form
    .locator(".feature-card")
    .filter({
      has: page.locator(":scope > summary > span", { hasText: /^Subrace$/ }),
    });
  await subrace.locator(":scope > summary").click();
  await form.getByLabel("Subrace", { exact: true }).selectOption("High Elf");
  await expect(form.locator("[data-score-total=INT]")).toHaveText("15");
  await expect(form.locator("[data-point-budget]")).toHaveText(
    "27 / 27 points",
  );
  await form.locator("[data-equipment-section] > summary").click();
  await form.locator("[data-load-equipment=class]").click();
  await expect(
    dialog.getByLabel("Equipment choice 1", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByLabel("Equipment choice 1", { exact: true })
    .selectOption("1");
  await dialog.getByRole("button", { name: "Load", exact: true }).click();
  expect(
    await form
      .locator('[aria-label="Item name"]')
      .evaluateAll((nodes) => nodes.some((n) => /dagger/i.test(n.value))),
  ).toBeTruthy();
  await form.locator("[data-load-equipment=background]").click();
  await dialog.getByRole("button", { name: "Load", exact: true }).click();
  await expect(form.locator("[name=coin-gp]")).toHaveValue("15");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(form.locator("[data-score-total=DEX]")).toHaveText("17");
  await expect(form.locator("[data-score-total=INT]")).toHaveText("15");
});

test("point buy, source bonuses, saves, equipment and currency persist together", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "New project", exact: false })
    .first()
    .click();
  await page.getByLabel("Project name", { exact: true }).fill("Sheet test");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.locator('[data-open-tool="Characters"]').click();
  await page.locator('[data-create-actor="character"]').click();
  const dialog = page.locator("#dialog");
  await dialog.getByLabel("Name", { exact: true }).fill("Iris");
  await dialog.getByLabel("Class", { exact: true }).selectOption("Wizard");
  await dialog
    .getByLabel("Species / ancestry", { exact: true })
    .selectOption("Human");
  await dialog.getByLabel("Background", { exact: true }).selectOption("Sage");
  const abilities = ["STR", "DEX", "CON", "INT", "WIS", "CHA"],
    values = [8, 14, 13, 15, 12, 10];
  for (let i = 0; i < 6; i++)
    await dialog
      .getByLabel(abilities[i] + " base score", { exact: true })
      .fill(String(values[i]));
  await expect(dialog.locator("[data-point-budget]")).toHaveText(
    "27 / 27 points",
  );
  await dialog.getByText("Score bonuses", { exact: true }).click();
  await dialog.getByLabel("background INT bonus", { exact: true }).fill("2");
  await dialog.getByLabel("background CON bonus", { exact: true }).fill("1");
  await dialog.getByLabel("feat INT bonus", { exact: true }).fill("1");
  await expect(dialog.locator("[data-score-total=INT]")).toHaveText("18");
  await expect(dialog.locator("[data-score-modifier=INT]")).toHaveText("+4");
  await dialog.getByRole("button", { name: "Create", exact: true }).click();
  const form = page.locator("[data-edit-actor]");
  await form.locator("[data-saves-section] > summary").click();
  await expect(form.locator("[data-save-total=INT]")).toHaveText("+6");
  await expect(form.locator("[data-save-total=WIS]")).toHaveText("+3");
  await expect(form.locator("[data-save-total=STR]")).toHaveText("-1");
  await form.getByLabel("Level", { exact: true }).fill("5");
  await form.getByLabel("Level", { exact: true }).press("Tab");
  await expect(form.locator("[data-save-total=INT]")).toHaveText("+7");
  await form.locator("[data-equipment-section] > summary").click();
  async function load(source) {
    await form.locator('[data-load-equipment="' + source + '"]').click();
    await dialog.getByRole("button", { name: "Load", exact: true }).click();
  }
  await load("class");
  await load("background");
  await expect(form.locator("[name=coin-gp]")).toHaveValue("13");
  const count = await form.locator("[data-inventory-row]").count();
  expect(count).toBeGreaterThan(4);
  await load("class");
  await expect(form.locator("[name=coin-gp]")).toHaveValue("13");
  await expect(form.locator("[data-inventory-row]")).toHaveCount(count);
  await form.getByText("Currency", { exact: true }).click();
  for (const [c, n] of Object.entries({ pp: 2, gp: 3, ep: 1, sp: 4, cp: 5 }))
    await form.locator("[name=coin-" + c + "]").fill(String(n));
  await expect(form.locator("[data-currency-total]")).toHaveText(
    "23.95 GP total",
  );
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(form.locator("[data-score-total=INT]")).toHaveText("18");
  await expect(form.locator("[name=coin-pp]")).toHaveValue("2");
  await expect(form.locator("[data-inventory-row]")).toHaveCount(count);
  await form.locator("[data-feature-section] > summary").click();
  const heights = await form
    .locator(".feature-card > summary")
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.5);
  const human = form
    .locator(".feature-card")
    .filter({
      has: page.locator(":scope > summary > span", {
        hasText: /^Human traits$/,
      }),
    });
  await expect(human).toHaveCount(1);
  await expect(human).toContainText("Resourceful");
  await expect(human).toContainText("Skillful");
  await expect(human).not.toContainText("As a Human");
  await form.locator("[data-score-section]").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/point-buy-sheet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await form
    .getByRole("button", { name: "Add to encounter", exact: true })
    .click();
  await page.getByText("Character / monster details", { exact: true }).click();
  await expect(page.locator(".participant-editor")).toContainText("INT +7");
  await expect(page.locator(".participant-editor")).toContainText("2 PP");
  expect(errors).toEqual([]);
});
