import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const output = resolve(
  process.env.OFFRECORD_TEST_OUTPUT ?? "test-results/model-verification",
);
const server = spawn(process.execPath, ["scripts/serve.mjs"], {
  stdio: "inherit",
});
const extension = resolve("dist");
const context = await chromium.launchPersistentContext(
  resolve(output, "profile"),
  {
    channel: "chromium",
    headless: false,
    args: [
      "--enable-unsafe-extension-debugging",
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 1000, height: 850 },
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${id}/sidepanel.html`);
  await panel.locator("#setup").click();
  await panel.locator("#download").uncheck();
  await panel.locator("#prepare").click();
  await panel.waitForFunction(
    () =>
      document.querySelector("#readiness").textContent.includes("Gemma: ready"),
    null,
    { timeout: 300000 },
  );
  const meeting = await context.newPage();
  await meeting.goto("http://127.0.0.1:4173/meeting.html");
  await meeting.locator("audio").evaluate(async (el) => {
    const response = await fetch(el.src);
    el.src = URL.createObjectURL(await response.blob());
    el.load();
  });
  await context.setOffline(true);
  await meeting.bringToFront();
  // Chrome's test API invokes the actual toolbar action and grants activeTab.
  // https://chromedevtools.github.io/devtools-protocol/tot/Extensions/#method-triggerAction
  const browserCdp = await context.browser().newBrowserCDPSession();
  const { targetInfos } = await browserCdp.send("Target.getTargets", {
    filter: [{ type: "tab", exclude: false }],
  });
  const targetInfo = targetInfos.find(
    (t) => t.url === "http://127.0.0.1:4173/meeting.html",
  );
  if (!targetInfo)
    throw Error(
      "Could not find the synthetic meeting tab target: " +
        JSON.stringify(targetInfos),
    );
  await browserCdp.send("Extensions.triggerAction", {
    id,
    targetId: targetInfo.targetId,
  });
  const start = await panel.evaluate(() =>
    chrome.runtime.sendMessage({ target: "background", type: "capture" }),
  );
  console.log("CAPTURE START:", JSON.stringify(start));
  if (start.error) throw Error(start.error);
  await meeting.locator("audio").evaluate((el) => el.play());
  await meeting.waitForFunction(
    () => document.querySelector("audio").ended,
    null,
    { timeout: 60000 },
  );
  await panel.evaluate(() =>
    chrome.runtime.sendMessage({ target: "offscreen", type: "stop" }),
  );
  await panel.waitForFunction(
    () =>
      document
        .querySelector("#activity")
        .textContent.includes("Session complete"),
    null,
    { timeout: 240000 },
  );
  const result = await panel.evaluate(() =>
    chrome.runtime.sendMessage({ target: "offscreen", type: "state" }),
  );
  result.verification = {
    offlineDuringCaptureAndInference: true,
    syntheticAudio: true,
  };
  console.log("REAL CAPTURE:", JSON.stringify(result.state.session));
  if (!result.state.session.segments.length)
    throw Error("Capture produced no transcript");
  if (
    !result.state.session.analyzedThrough ||
    !result.state.session.notes.decisions.length
  )
    throw Error(
      "Capture did not yield validated Gemma decisions: " +
        result.state.session.warning,
    );
  await writeFile(
    resolve(output, "capture.json"),
    JSON.stringify(result, null, 2),
  );
  await panel.screenshot({
    path: resolve(output, "capture.png"),
    fullPage: true,
  });
} finally {
  await context.close();
  server.kill();
}
