import { Engine } from "./engine.js";
const engine = new Engine((state) =>
  chrome.runtime
    .sendMessage({ target: "panel", type: "state", state })
    .catch(() => {}),
);
const ready = engine.init();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.target !== "offscreen") return;
  (async () => {
    await ready;
    const { type, payload = {} } = message;
    if (type === "state") return engine.state();
    if (type === "prepare") {
      engine.assertIdle();
      void engine.prepare(!!payload.download);
      return engine.state();
    }
    if (type === "demo") await engine.demo();
    else if (type === "start")
      await engine.start(payload.streamId, payload.context);
    else if (type === "stop") {
      void engine.stop().catch((e) => engine.fail(e));
    } else if (type === "analyze") {
      void engine.analyze().catch((e) => engine.fail(e));
    } else if (type === "import") await engine.importText(payload.text);
    else if (type === "retain")
      await engine.retain(!!payload.includeTranscript);
    else if (type === "discard") await engine.discard();
    else if (type === "select") await engine.select(payload.id);
    else if (type === "delete") await engine.remove(payload.id);
    else if (type !== "stop" && type !== "analyze")
      throw Error("Unknown command");
    return engine.state();
  })().then(
    (state) => respond({ state }),
    (error) => respond({ error: error.message }),
  );
  return true;
});
