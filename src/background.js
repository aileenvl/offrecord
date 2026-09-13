let creating;
async function boot() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (!contexts.length) {
    creating ??= chrome.offscreen
      .createDocument({
        url: "offscreen.html",
        reasons: ["USER_MEDIA", "WORKERS"],
        justification:
          "Process user-started tab audio and local AI while the side panel is closed.",
      })
      .finally(() => (creating = null));
    await creating;
  }
}
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.target !== "background")
    return;
  (async () => {
    await boot();
    if (message.type === "boot") return { ok: true };
    if (message.type !== "capture") throw Error("Unknown command");
    const [tab] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (!tab?.id || !/^https?:/.test(tab.url ?? ""))
      throw Error(
        "Open a meeting web page and click the OffRecord toolbar icon on that tab first.",
      );
    const context = {
      title: (tab.title ?? "Web meeting").slice(0, 200),
      domain: new URL(tab.url).hostname,
    };
    try {
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const el = [
            ...document.querySelectorAll('h1,[role="heading"][aria-level="1"]'),
          ].find((x) => x.getClientRects().length);
          return el?.textContent?.trim().slice(0, 160) ?? "";
        },
      });
      if (result?.result) context.heading = result.result;
    } catch {
      /* Metadata is optional; never request broad page access. */
    }
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tab.id,
    });
    return await chrome.runtime.sendMessage({
      target: "offscreen",
      type: "start",
      payload: { streamId, context },
    });
  })().then(respond, (error) => respond({ error: error.message }));
  return true;
});
