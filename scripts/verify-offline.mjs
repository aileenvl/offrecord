import { chromium } from "@playwright/test";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
const output = resolve(
  process.env.OFFRECORD_TEST_OUTPUT ?? "test-results/model-verification",
);
await mkdir(output, { recursive: true });
const extension = resolve("dist");
const context = await chromium.launchPersistentContext(
  resolve(output, "profile"),
  {
    channel: "chromium",
    headless: false,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 480, height: 1050 },
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await context.setOffline(true);
  await page.goto(`chrome-extension://${id}/sidepanel.html`);
  await page.locator("#setup").click();
  await page.locator("#download").uncheck();
  await page.locator("#prepare").click();
  let prior = "";
  const start = Date.now();
  while (Date.now() - start < 300000) {
    const status = await page.locator("#activity").textContent();
    if (status !== prior) {
      console.log(status);
      prior = status;
    }
    if (!(await page.locator("#prepare").isDisabled())) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (
    !(await page.locator("#readiness").textContent()).includes("Gemma: ready")
  )
    throw Error(await page.locator("#activity").textContent());
  console.log("Offline startup: both models ready from cache.");
  const speech = await page.evaluate(async () => {
    const response = await fetch(chrome.runtime.getURL("sample-meeting.wav"));
    const ac = new AudioContext({ sampleRate: 16000 });
    const decoded = await ac.decodeAudioData(await response.arrayBuffer());
    const pcm = decoded.getChannelData(0).slice();
    await ac.close();
    const worker = new Worker(chrome.runtime.getURL("model-worker.js"), {
      type: "module",
    });
    let counter = 0;
    const requests = new Map();
    worker.onmessage = ({ data }) => {
      if (data.progress) return;
      const r = requests.get(data.id);
      requests.delete(data.id);
      data.error ? r.reject(Error(data.error)) : r.resolve(data.result);
    };
    const ask = (type, payload) =>
      new Promise((resolve, reject) => {
        const id = ++counter;
        requests.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
      });
    await ask("prepare", { role: "speech", download: false });
    const started = performance.now();
    const text = await ask("transcribe", { audio: pcm });
    worker.terminate();
    return {
      text,
      seconds: pcm.length / 16000,
      inferenceSeconds: (performance.now() - started) / 1000,
    };
  });
  console.log("REAL OFFLINE STT:", JSON.stringify(speech));
  if (!/Friday/i.test(speech.text) || !/Luis/i.test(speech.text))
    throw Error("Speech recognition did not recover expected meeting facts.");
  await page.getByText("Bring your own transcript", { exact: true }).click();
  await page.locator("#import-text").fill(speech.text);
  await page.locator("#import").click();
  await page.locator("#analyze").click();
  let result;
  const analysisStart = Date.now();
  do {
    result = await page.evaluate(() =>
      chrome.runtime.sendMessage({ target: "offscreen", type: "state" }),
    );
    console.log(
      "Analysis:",
      result.state.activity,
      "busy:",
      result.state.analyzing,
    );
    if (!result.state.analyzing) break;
    await new Promise((r) => setTimeout(r, 3000));
  } while (Date.now() - analysisStart < 190000);
  await writeFile(
    resolve(output, "offline.json"),
    JSON.stringify({ speech, session: result.state.session }, null, 2),
  );
  if (!result.state.session.analyzedThrough) throw Error(result.state.activity);
  await page.screenshot({
    path: resolve(output, "offline.png"),
    fullPage: true,
  });
  console.log(
    "REAL OFFLINE NOTES:",
    JSON.stringify(result.state.session.notes),
  );
} finally {
  await context.close();
}
