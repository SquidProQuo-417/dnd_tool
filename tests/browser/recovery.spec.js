import { test, expect } from "@playwright/test";
test("invalid imports preserve the current campaign and are explained", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#campaign-select option")).toHaveCount(1);
  await page.locator("#import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({ format: "waypoint-campaign", version: 99 }),
    ),
  });
  await expect(page.locator("#toast")).toContainText("Import failed");
  await expect(page.locator("#campaign-select option")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "The Saltwind Chronicle" }),
  ).toBeVisible();
});
test("previous local save recovers into a separate campaign", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  const body = page.getByLabel("Note text");
  await body.fill("First revision");
  await expect(page.locator("#save-state")).toHaveText("Saved on this device");
  await body.fill("Second revision");
  await expect(page.locator("#save-state")).toHaveText("Saved on this device");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Recover previous local save" })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.locator("#campaign-select option")).toHaveCount(2);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Note text")).toHaveValue("First revision");
});
test("cached application opens offline", async ({ page, context }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your next adventure starts here." }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your next adventure starts here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Note text")).toBeVisible();
  await context.setOffline(false);
});
