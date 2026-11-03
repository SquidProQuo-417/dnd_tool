import { test, expect } from "@playwright/test";

test("roadmap is available inside the workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Roadmap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Where we go from here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rules library", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Current milestone", { exact: true }),
  ).toBeVisible();
});

test("structured stats, ammo, weapon rolls and linked board summaries persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  const legacy = page.locator(".component").first();
  const text = await legacy.locator("textarea").inputValue();
  await legacy.getByRole("button", { name: "Add structured fields" }).click();
  await expect(
    page.locator(".component").first().locator("textarea"),
  ).toHaveValue(text);
  let stats = page.locator(".component").first();
  await stats.getByLabel("STR", { exact: true }).fill("16");
  await stats.getByLabel("STR", { exact: true }).press("Tab");
  await expect(
    page.locator(".ability-field").first().locator("output"),
  ).toHaveText("+3");
  await page
    .getByRole("button", { name: "＋ Ammunition", exact: true })
    .click();
  let ammo = page.locator(".component").last();
  await ammo.getByLabel("Component label").fill("Crossbow bolts");
  await ammo.getByLabel("Remaining", { exact: true }).fill("7");
  await ammo.getByLabel("Remaining", { exact: true }).press("Tab");
  await page.getByRole("button", { name: "＋ Weapon", exact: true }).click();
  let weapon = page.locator(".component").last();
  await weapon
    .getByLabel("Ammunition source", { exact: true })
    .selectOption({ label: "Crossbow bolts" });
  await expect(
    page
      .locator(".component")
      .last()
      .getByRole("button", { name: "Roll attack +5", exact: true }),
  ).toBeVisible();
  await page
    .locator(".component")
    .last()
    .getByRole("button", { name: "Roll attack +5", exact: true })
    .click();
  await expect(page.locator(".component-roll")).toContainText("Attack:");
  ammo = page
    .locator(".component")
    .filter({ has: page.getByLabel("Remaining", { exact: true }) });
  await ammo.getByRole("button", { name: "Use 1", exact: true }).click();
  await expect(page.getByLabel("Remaining", { exact: true })).toHaveValue("6");
  await expect(page.locator("#save-state")).toHaveText("Saved on this device");
  await page.reload();
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await expect(page.getByLabel("Remaining", { exact: true })).toHaveValue("6");
  await page.getByRole("button", { name: "Idea board", exact: true }).click();
  await page.locator(".card-character summary").click();
  await expect(page.locator(".card-character")).toContainText("STR 16 (+3)");
  await expect(page.locator(".card-character")).toContainText(
    "Crossbow bolts 6/20",
  );
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page
    .locator(".component")
    .filter({ has: page.getByLabel("Remaining", { exact: true }) })
    .getByRole("button", { name: "Remove component", exact: true })
    .click();
  await expect(
    page.getByLabel("Ammunition source", { exact: true }),
  ).toHaveValue("");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Recover previous local save" })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator("#campaign-select option")).toHaveCount(2);
});

test("inventory totals update and resource controls stay bounded", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Characters", exact: true }).click();
  await page.getByRole("button", { name: "＋ Inventory", exact: true }).click();
  await page.getByLabel("Manual carrying limit (lb)").fill("10");
  await page.getByLabel("Manual carrying limit (lb)").press("Tab");
  await page
    .getByRole("button", { name: "＋ Inventory item", exact: true })
    .click();
  await page.getByLabel("Quantity", { exact: true }).fill("2");
  await page.getByLabel("Quantity", { exact: true }).press("Tab");
  await page.getByLabel("Each (lb)").fill("6");
  await page.getByLabel("Each (lb)").press("Tab");
  await expect(page.locator(".weight-summary")).toContainText("12 / 10 lb");
  await expect(page.locator(".weight-summary")).toContainText(
    "2 lb over limit",
  );
  await page
    .getByRole("button", { name: "＋ Ammunition", exact: true })
    .click();
  await page.getByLabel("Remaining", { exact: true }).fill("0");
  await page.getByLabel("Remaining", { exact: true }).press("Tab");
  await expect(
    page.getByRole("button", { name: "Use 1", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Refill to 20", exact: true }).click();
  await expect(page.getByLabel("Remaining", { exact: true })).toHaveValue("20");
  await expect(
    page.getByRole("button", { name: "Recover 1", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 1024, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.screenshot({
    path: "artifacts/structured-character.png",
    fullPage: true,
  });
});
