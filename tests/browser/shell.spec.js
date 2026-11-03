import { test, expect } from "@playwright/test";
test("fresh shell contains no project, sample content or populated tool panels", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  await expect(page.getByLabel("Empty workspace")).toBeVisible();
  await expect(page.locator("[data-pane]")).toHaveCount(0);
  await expect(page.locator("#shell-project option")).toHaveCount(1);
  await expect(page.locator("body")).not.toContainText("Saltwind");
  await expect(page.locator("body")).not.toContainText("Your next adventure");
  await expect(page.locator(".inspector")).toHaveCount(0);
  await expect(page.locator("footer")).toHaveCount(0);
  for (const tool of ["Notes", "Idea board", "Rules", "Dice"]) {
    await page.locator(`[data-open-tool="${tool}"]`).click();
    await expect(page.locator("[data-panel-tool]")).toHaveText("");
  }
  expect(
    requests.filter((url) => /\/rules\/|\/model.js|\/app.js/.test(url)),
  ).toEqual([]);
});
test("sidebar toggle stays green and collapsed navigation expands the main area at all widths", async ({
  page,
}) => {
  await page.goto("/");
  for (const width of [3440, 2560, 1920, 1366, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const toggle = page.getByRole("button", {
      name: "Toggle navigation",
      exact: true,
    });
    if ((await toggle.getAttribute("aria-expanded")) === "false")
      await toggle.click();
    const before = await page.locator(".shell-workspace").boundingBox();
    await toggle.click();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.mouse.move(100, 200);
    await expect(toggle).toHaveCSS("background-color", "rgb(45, 73, 62)");
    const after = await page.locator(".shell-workspace").boundingBox();
    expect(after.width).toBeGreaterThan(before.width);
    expect(after.width).toBeGreaterThan(width - 60);
    await expect(page.locator("#navigation-menu")).toBeHidden();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await toggle.click();
    await expect(page.locator("#navigation-menu")).toBeVisible();
  }
  await page.setViewportSize({ width: 2560, height: 1100 });
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/empty-shell.png", fullPage: true });
});
test("creating a project keeps content empty and layouts can still split, save and reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New project", exact: false }).click();
  await page.getByLabel("Project name", { exact: true }).fill("My project");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByLabel("Empty workspace")).toBeVisible();
  await page.locator('[data-open-tool="Notes"]').click();
  await page
    .getByRole("button", {
      name: "Split Notes panel to the right",
      exact: true,
    })
    .click();
  await page.getByLabel("Tool to place", { exact: true }).selectOption("Rules");
  await page.getByRole("button", { name: "Split panel", exact: true }).click();
  await expect(page.locator("[data-pane]")).toHaveCount(2);
  for (const panel of await page.locator("[data-panel-tool]").all())
    await expect(panel).toHaveText("");
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await page.getByLabel("Layout name", { exact: true }).fill("Blank split");
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("[data-pane]")).toHaveCount(2);
  await expect(page.locator("#shell-project")).toHaveValue(/./);
  await expect(page.locator("#shell-project option:checked")).toHaveText(
    "My project",
  );
  await page.getByRole("button", { name: "Layouts", exact: true }).click();
  await expect(page.locator(".saved-layouts")).toContainText("Blank split");
});
test("existing campaign storage and previous preferences remain intact", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.setItem(
      "waypoint-settings",
      JSON.stringify({
        marker: "preserve",
        workspace: { version: 1, root: null, focused: null },
      }),
    );
    await new Promise((resolve, reject) => {
      const r = indexedDB.open("waypoint", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("data");
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("data", "readwrite");
        tx.objectStore("data").put(
          [
            {
              id: "existing",
              name: "Existing campaign",
              notes: [{ body: "Keep my notes" }],
            },
          ],
          "campaigns",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = reject;
      };
      r.onerror = reject;
    });
  });
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("waypoint-settings")).marker,
    ),
  ).toBe("preserve");
  const records = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open("waypoint", 1);
        r.onsuccess = () => {
          const db = r.result,
            get = db.transaction("data").objectStore("data").get("campaigns");
          get.onsuccess = () => {
            resolve(get.result);
            db.close();
          };
        };
      }),
  );
  expect(records[0].notes[0].body).toBe("Keep my notes");
  await expect(page.locator("body")).not.toContainText("Keep my notes");
});
test("empty shell works offline without loading campaign features", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Empty workspace")).toBeVisible();
  await page.locator('[data-open-tool="Notes"]').click();
  await expect(page.locator('[data-panel-tool="Notes"]')).toHaveText("");
  await context.setOffline(false);
});
