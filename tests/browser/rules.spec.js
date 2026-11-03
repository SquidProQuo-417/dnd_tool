import { test, expect } from "@playwright/test";
async function openRules(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Actions");
}
test("rules search, edition switching and source references leave the campaign unchanged", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openRules(page);
  await expect(page.locator(".rules-navigation")).toContainText(
    "indexed topics",
  );
  await page.getByRole("searchbox", { name: "Search rules" }).fill("hide");
  await page
    .locator("#rule-results [data-rule-id]")
    .filter({ hasText: "Hide [Action]" })
    .first()
    .click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Hide [Action]");
  await expect(page.locator(".rule-reader")).toContainText("DC 15");
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Hide");
  await expect(page.locator(".edition-notice")).toBeVisible();
  await expect(page.locator(".rule-reader .rule-source a")).toHaveAttribute(
    "href",
    /srd-2014.pdf#page=/,
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("#campaign-edition")).toHaveValue("2024");
  expect(errors).toEqual([]);
});
test("bookmarks persist and recent rules can be reopened", async ({ page }) => {
  await openRules(page);
  await page
    .getByRole("button", { name: "Bookmark rule", exact: true })
    .click();
  await page.getByLabel("Rules navigation view").selectOption("bookmarks");
  await expect(page.locator("#rule-results")).toContainText("Bonus Actions");
  await page.reload();
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove bookmark", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Rules navigation view").selectOption("bookmarks");
  await page.locator("#rule-results [data-rule-id]").first().click();
  await page.getByLabel("Rules navigation view").selectOption("recent");
  await expect(page.locator("#rule-results")).toContainText("Bonus Actions");
  await page.getByRole("button", { name: "Toggle rules navigation" }).click();
  await expect(
    page.getByRole("searchbox", { name: "Search rules" }),
  ).toBeHidden();
  await expect(page.locator(".rule-reader h2")).toBeVisible();
});
test("missing edition entries are explained rather than substituted", async ({
  page,
}) => {
  await openRules(page);
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Actions");
  await page
    .getByRole("searchbox", { name: "Search rules" })
    .fill("bonus action");
  const rule = page
    .locator("#rule-results [data-rule-id]")
    .filter({ hasText: "Spellcasting" });
  await rule.first().click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Action");
  await page
    .getByRole("button", { name: "2024 · revised", exact: true })
    .click();
  await expect(page.locator(".rule-reader h2")).toHaveText(
    "No matching entry in 2024",
  );
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Action");
});
test("both editions and original source PDFs remain available offline", async ({
  page,
  context,
}) => {
  await openRules(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Actions");
  await page.getByRole("button", { name: "2014", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Actions");
  const status = await page.evaluate(async () => {
    const r = await fetch("./rules/srd-2014.pdf");
    return {
      ok: r.ok,
      type: r.headers.get("content-type"),
      length: (await r.arrayBuffer()).byteLength,
    };
  });
  expect(status.ok).toBe(true);
  expect(status.type).toContain("application/pdf");
  expect(status.length).toBeGreaterThan(3000000);
  await context.setOffline(false);
});
test("rules navigation fits laptop widths and the reference can be read", async ({
  page,
}) => {
  await openRules(page);
  for (const width of [1920, 1366, 1024, 390]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      `page overflow at ${width}`,
    ).toBe(false);
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.screenshot({
    path: "artifacts/rules-library.png",
    fullPage: true,
  });
});
