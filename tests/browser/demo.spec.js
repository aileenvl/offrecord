import { test, expect } from "@playwright/test";
test("offline sample produces evidence-linked notes, persists and exports", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const remote = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1")) remote.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try sample meeting" }).click();
  await expect(page.locator("#mode")).toContainText("SAMPLE REPLAY");
  await expect(page.locator("#activity")).toContainText("Session complete", {
    timeout: 20000,
  });
  await expect(page.locator("#decisions-count")).toHaveText("2");
  await expect(page.locator("#actions-count")).toHaveText("3");
  await expect(page.locator("#questions-count")).toHaveText("1");
  await expect(page.locator("#actions")).toContainText("Owner unknown");
  await page.getByRole("button", { name: "Show source segment 4" }).click();
  await expect(page.locator("#transcript-view")).toBeVisible();
  await expect(page.locator("#segment-4")).toContainText("Luis: I will test");
  await page.locator("#include-transcript").check();
  await page.locator("#retain").click();
  await expect(page.locator("#saved")).toContainText(
    "Notes + transcript saved",
  );
  await page.reload();
  await expect(page.locator("#actions-count")).toHaveText("3");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .md" }).click();
  expect((await download).suggestedFilename()).toMatch(/offrecord-.*\.md/);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Try sample meeting" }).click();
  await expect(page.locator("#activity")).toContainText("Session complete", {
    timeout: 20000,
  });
  expect(remote).toEqual([]);
  expect(errors).toEqual([]);
});
test("import is safe text, validates input, and session deletion persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Bring your own transcript", { exact: true }).click();
  await page.getByRole("button", { name: "Load temporary transcript" }).click();
  await expect(page.locator("#warning")).toContainText("Enter a transcript");
  await page
    .locator("#import-text")
    .fill("<img src=x onerror=alert(1)>\nWe decided to ship Friday.");
  await page.getByRole("button", { name: "Load temporary transcript" }).click();
  await page.getByRole("button", { name: /Transcript 2/ }).click();
  await expect(page.locator("#transcript")).toContainText("<img");
  await expect(page.locator("#transcript img")).toHaveCount(0);
  await page.locator("#retain").click();
  await page.locator("summary").filter({ hasText: "Saved sessions" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete selected session" }).click();
  await expect(page.locator("#history-count")).toHaveText("0");
  await page.reload();
  await expect(page.locator("#meeting-title")).toHaveText("Ready when you are");
});
test("narrow layout stays within viewport", async ({ page }) => {
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("temporary transcript is not persisted without an explicit save", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByText("Bring your own transcript", { exact: true }).click();
  await page.locator("#import-text").fill("Private sample statement");
  await page.locator("#import").click();
  await expect(page.locator("#saved")).toHaveText("Not saved to disk");
  await expect(page.locator("#import-text")).toHaveValue("");
  await page.locator("#import-text").fill("Unsubmitted private draft");
  await page.locator("#discard").click();
  await expect(page.locator("#import-text")).toHaveValue("");
  await expect(page.locator("#segment-count")).toHaveText("0");
  await page.locator("#import-text").fill("Another private sample statement");
  await page.locator("#import").click();
  await page.reload();
  await expect(page.locator("#meeting-title")).toHaveText("Ready when you are");
});
test("saving notes only excludes transcript from the database and default export", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#demo").click();
  await expect(page.locator("#activity")).toContainText("Session complete", {
    timeout: 20000,
  });
  await page.locator("#retain").click();
  await expect(page.locator("#saved")).toContainText("Notes saved");
  await page.reload();
  await expect(page.locator("#actions-count")).toHaveText("3");
  await expect(page.locator("#segment-count")).toHaveText("0");
  await expect(page.locator("#actions")).toContainText(
    "Transcript not retained",
  );
  const downloading = page.waitForEvent("download");
  await page.locator("#json").click();
  const download = await downloading;
  const stream = await download.createReadStream();
  let content = "";
  for await (const chunk of stream) content += chunk;
  const saved = JSON.parse(content);
  expect(saved.segments).toEqual([]);
  expect(saved.notes.actions).toHaveLength(3);
});
