import { test, expect } from "@playwright/test";
async function split(page, panel, tool, edge = "right") {
  await page
    .getByRole("button", {
      name: `Split ${panel} panel to the right`,
      exact: true,
    })
    .click();
  await page.getByLabel("Tool to place", { exact: true }).selectOption(tool);
  await page.getByLabel("Dock position", { exact: true }).selectOption(edge);
  await page.getByRole("button", { name: "Split panel", exact: true }).click();
}
async function priority(page, tool, value) {
  await page
    .getByRole("button", { name: `Panel options for ${tool}`, exact: true })
    .click();
  await page
    .getByLabel("Visibility priority", { exact: true })
    .selectOption(String(value));
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
}
async function drag(page, source, target) {
  const box = await source.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 3,
    { steps: 5 },
  );
  await expect(page.locator("body")).toHaveClass(/workspace-dragging/);
  const dest = await target.boundingBox();
  await page.mouse.move(dest.x + dest.width / 2, dest.y + dest.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
}
test("notes, rules and dice work together; named layouts and resized dividers survive reload", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page
    .getByLabel("Note text")
    .fill("Panel prep: the captain needs a map.");
  await split(page, "Notes", "Rules");
  await expect(page.locator(".rule-reader h2")).toHaveText("Bonus Actions");
  await split(page, "Rules", "Dice", "bottom");
  await expect(page.locator("[data-pane]")).toHaveCount(3);
  await page.locator("#workspace-dice-expression").fill("2d6+3");
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(page.locator("#workspace-dice-result")).toContainText("2d6+3");
  await expect(page.getByLabel("Note text")).toHaveValue(
    "Panel prep: the captain needs a map.",
  );
  const divider = page.locator('[data-divider][data-axis="row"]');
  const before = Number(await divider.getAttribute("aria-valuenow"));
  const handleBox = await divider.boundingBox();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 45, handleBox.y + handleBox.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
  await divider.focus();
  await divider.press("ArrowRight");
  await expect
    .poll(async () => Number(await divider.getAttribute("aria-valuenow")))
    .toBeGreaterThan(before);
  await page.getByRole("button", { name: "Save layout", exact: true }).click();
  await page.getByLabel("Layout name", { exact: true }).fill("Session desk");
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("[data-pane]")).toHaveCount(3);
  await expect(page.getByLabel("Note text")).toHaveValue(
    "Panel prep: the captain needs a map.",
  );
  await expect
    .poll(async () =>
      Number(
        await page
          .locator('[data-divider][data-axis="row"]')
          .getAttribute("aria-valuenow"),
      ),
    )
    .toBeGreaterThan(before);
  await page
    .getByRole("button", { name: "Panel options for Dice", exact: true })
    .click();
  await page.getByRole("button", { name: "Hide Dice", exact: true }).click();
  await expect(page.locator("[data-pane]")).toHaveCount(2);
  await page.getByRole("button", { name: "Layouts", exact: true }).click();
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Load", exact: true })
    .click();
  await expect(page.locator("[data-pane]")).toHaveCount(3);
  await page.screenshot({
    path: "artifacts/panel-workspace.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("background tool updates retain the active editor and caret", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await split(page, "Notes", "Dice");
  const editor = page.getByLabel("Note text");
  await editor.fill("A quiet harbor");
  await editor.evaluate((el) => {
    el.focus();
    el.setSelectionRange(2, 2);
  });
  await page.locator('[data-panel-roll="1d20"]').evaluate((el) => el.click());
  await expect(editor).toBeFocused();
  expect(await editor.evaluate((el) => el.selectionStart)).toBe(2);
  await editor.press("!");
  await expect(editor).toHaveValue("A !quiet harbor");
  await expect(page.locator("#workspace-dice-result")).toContainText("1d20");
});
test("native tab drag docks, merges and prunes panels; keyboard move reorders tabs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByRole("button", { name: "Rules", exact: true }).click();
  await expect(page.locator(".rule-reader h2")).toBeVisible();
  const target = page.locator('[data-dock-edge="left"]');
  await drag(
    page,
    page.getByRole("tab", { name: "Notes", exact: false }),
    target,
  );
  await expect(page.locator("[data-pane]")).toHaveCount(2);
  const destination = page
    .locator("[data-pane]")
    .filter({ has: page.locator('[data-panel-tool="Rules"]') })
    .locator('[data-dock-edge="center"]');
  await drag(
    page,
    page.getByRole("tab", { name: "Notes", exact: false }),
    destination,
  );
  await expect(page.locator("[data-pane]")).toHaveCount(1);
  await expect(page.getByRole("tab")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Panel options for Notes", exact: true })
    .click();
  await page
    .getByLabel("Move active tab", { exact: true })
    .selectOption("tab:left");
  await page
    .locator("#dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByRole("tab").nth(1)).toContainText("Notes");
  await page.getByRole("tab").nth(1).focus();
  await page.getByRole("tab").nth(1).press("ArrowRight");
  await expect(page.getByRole("tab").last()).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
test("priorities collapse panels for space, restore focus and preserve manual collapse", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Toggle quick reference", exact: true })
    .click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await split(page, "Notes", "Rules");
  await split(page, "Rules", "Dice");
  await priority(page, "Notes", 4);
  await priority(page, "Rules", 1);
  await page.getByRole("tab", { name: "Dice", exact: false }).click();
  await expect(page.locator("[data-pane]")).toHaveCount(3);
  await page.setViewportSize({ width: 1150, height: 1000 });
  await expect(
    page.getByRole("button", { name: "Restore panel: Rules", exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-pane]")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Restore panel: Rules", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore panel: Dice", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1000 });
  await expect(page.locator("[data-pane]")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Panel options for Notes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Collapse panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restore panel: Notes", exact: true }),
  ).toContainText("Collapsed");
  await page.setViewportSize({ width: 2200, height: 1000 });
  await expect(
    page.getByRole("button", { name: "Restore panel: Notes", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(page.locator("[data-pane]")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await expect(page.locator("html")).toHaveCSS("font-size", "16px");
});
test("all tools can be hidden, restored and recovered without touching campaign records", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Panel options for Overview", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Hide Overview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A little room to think." }),
  ).toBeVisible();
  await page.getByLabel("Open or restore a tool").selectOption("Notes");
  await expect(page.getByLabel("Note text")).toBeVisible();
  await page
    .getByLabel("Note text")
    .fill("Keep this note through layout recovery.");
  await expect(page.locator("#save-state")).toHaveText("Saved on this device");
  await page.evaluate(() => {
    const prefs = JSON.parse(localStorage.getItem("waypoint-settings"));
    prefs.workspace = { version: 99, root: null };
    localStorage.setItem("waypoint-settings", JSON.stringify(prefs));
  });
  await page.reload();
  await expect(page.locator("#toast")).toContainText("recovered");
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await expect(page.getByLabel("Note text")).toHaveValue(
    "Keep this note through layout recovery.",
  );
});
