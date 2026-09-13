import { chromium } from "@playwright/test";
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 460, height: 1080 },
    deviceScaleFactor: 2,
  });
  await page.goto("http://127.0.0.1:4173");
  await page.locator("#demo").click();
  await page.waitForFunction(() =>
    document
      .querySelector("#activity")
      .textContent.includes("Session complete"),
  );
  await page.screenshot({
    path: "docs/images/offrecord-sample.png",
    fullPage: true,
  });
} finally {
  await browser.close();
}
