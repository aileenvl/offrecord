import { Engine } from "./engine.js";
import { listSessions } from "./storage.js";
import { markdown, timestamp } from "./core.js";
const $ = (id) => document.getElementById(id);
const extension = !!globalThis.chrome?.runtime?.id;
let lastSessionId;
let state = {},
  local,
  historyVersion = "";
function notice(error) {
  $("warning").textContent = error.message ?? String(error);
  $("warning").hidden = false;
}
async function command(type, payload = {}) {
  if (extension) {
    const response = await chrome.runtime.sendMessage({
      target: type === "capture" ? "background" : "offscreen",
      type,
      payload,
    });
    if (response?.error) throw Error(response.error);
    if (response?.state) render(response.state);
    return;
  }
  if (type === "prepare") {
    void local.prepare(payload.download);
  } else if (type === "demo") await local.demo();
  else if (type === "stop") {
    void local.stop().catch(notice);
  } else if (type === "analyze") {
    void local.analyze().catch(notice);
  } else if (type === "import") await local.importText(payload.text);
  else if (type === "retain") await local.retain(payload.includeTranscript);
  else if (type === "discard") await local.discard();
  else if (type === "select") await local.select(payload.id);
  else if (type === "delete") await local.remove(payload.id);
}
function bind(id, fn) {
  $(id).addEventListener("click", () =>
    Promise.resolve().then(fn).catch(notice),
  );
}
function showView(notes) {
  $("notes-view").hidden = !notes;
  $("transcript-view").hidden = notes;
  $("notes-tab").setAttribute("aria-pressed", String(notes));
  $("transcript-tab").setAttribute("aria-pressed", String(!notes));
}
function node(tag, text, className) {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}
function render(next) {
  state = next;
  const s = state.session;
  if (s?.id !== lastSessionId) {
    lastSessionId = s?.id;
    $("import-text").value = "";
    $("include-transcript").checked = false;
    $("retain").textContent = "Save notes on this device";
  }
  const active = state.recording || s?.status === "stopping";
  const locked = active || state.busy || state.processing || state.analyzing;
  $("activity").textContent =
    state.activity + (state.queued ? ` · ${state.queued} chunks waiting` : "");
  $("meeting-title").textContent = s?.context.title ?? "Ready when you are";
  $("context").textContent = s
    ? `${s.context.domain}${s.context.heading ? " · " + s.context.heading : ""}`
    : extension
      ? "Open OffRecord from the tab you want to capture."
      : "Browser preview · install the extension for tab audio capture.";
  $("mode").textContent =
    s?.mode === "demo"
      ? "SAMPLE REPLAY · NO AI"
      : s?.mode === "text"
        ? "LOCAL TRANSCRIPT"
        : active
          ? "CAPTURING TAB AUDIO"
          : "PRIVATE BY DESIGN";
  $("duration").textContent = timestamp(s?.segments.at(-1)?.end ?? 0);
  document.body.classList.toggle("active", !!state.recording);
  $("warning").hidden = !s?.warning;
  $("warning").textContent = s?.warning ?? "";
  $("stop").hidden = !active;
  $("stop").disabled = s?.status === "stopping";
  $("capture").hidden = active;
  $("capture").disabled = !extension || !state.speechReady || locked;
  $("demo").disabled = locked;
  $("prepare").disabled = locked;
  $("download").disabled = locked;
  $("analyze").disabled =
    locked || !state.notesReady || !s?.segments.length || s?.mode === "demo";
  for (const id of ["import", "history", "delete"]) $(id).disabled = locked;
  for (const id of ["retain", "discard"]) $(id).disabled = locked || !s;
  for (const id of ["export", "json"]) $(id).disabled = !s;
  $("readiness").textContent =
    `Speech: ${state.speechReady ? "ready" : "not loaded"} · Gemma: ${state.notesReady ? "ready" : "not loaded"}`;
  $("model-indicator").textContent = state.busy
    ? "Preparing…"
    : state.notesReady && state.speechReady
      ? "Ready · local"
      : "Setup required";
  $("prepare").textContent = state.busy
    ? "Preparing models…"
    : "Prepare local models";
  $("segment-count").textContent = s?.segments.length ?? 0;
  for (const key of ["decisions", "actions", "questions"]) {
    const items = s?.notes[key] ?? [];
    $(key + "-count").textContent = items.length;
    $(key).replaceChildren();
    if (!items.length)
      $(key).append(
        node(
          "p",
          {
            decisions: "Decisions will find a home here.",
            actions: "The next steps, and who owns them.",
            questions: "Keep the loose ends in sight.",
          }[key],
          "empty",
        ),
      );
    for (const item of items) {
      const box = node("article", "", "note");
      box.append(node("p", item.text));
      const meta = node("div", "", "note-meta");
      if (key === "actions") {
        meta.append(
          node("span", item.owner ?? "Owner unknown", "owner"),
          node("span", item.due ?? "No deadline stated", "owner"),
        );
      }
      for (const id of item.evidence) {
        const segment = s.segments.find((x) => x.id === id);
        const button = node(
          "button",
          `↳ ${timestamp(segment?.start ?? 0)} · #${id}`,
          "evidence",
        );
        if (!segment) {
          button.textContent = "Transcript not retained";
          button.disabled = true;
        }
        button.setAttribute("aria-label", `Show source segment ${id}`);
        button.onclick = () => {
          showView(false);
          const target = $("segment-" + id);
          target?.scrollIntoView({ block: "center" });
          target?.focus();
        };
        meta.append(button);
      }
      box.append(meta);
      $(key).append(box);
    }
  }
  const transcript = $("transcript");
  transcript.replaceChildren();
  if (!s?.segments.length)
    transcript.append(
      node("p", "Your transcript appears here as audio is processed.", "empty"),
    );
  for (const seg of s?.segments ?? []) {
    const row = node("article", "", "segment");
    row.id = `segment-${seg.id}`;
    row.tabIndex = -1;
    row.append(
      node(
        "span",
        `${timestamp(seg.start)} — ${timestamp(seg.end)} · #${seg.id}`,
        "mono",
      ),
      node("p", seg.text),
    );
    transcript.append(row);
  }
  $("saved").textContent =
    s?.retained === "full"
      ? "Notes + transcript saved"
      : s?.retained === "notes"
        ? "Notes saved; transcript temporary"
        : "Not saved to disk";
  const version = `${s?.id}/${s?.status}/${s?.retained}`;
  if (version !== historyVersion) {
    historyVersion = version;
    void refreshHistory().catch(notice);
  }
}
async function refreshHistory() {
  const sessions = await listSessions();
  $("history-count").textContent = sessions.length;
  $("history").replaceChildren();
  if (!sessions.length)
    $("history").append(new Option("No saved meetings", ""));
  for (const s of sessions)
    $("history").append(
      new Option(
        `${s.mode === "demo" ? "[Sample] " : ""}${s.context.title} · ${new Date(s.createdAt).toLocaleTimeString()}`,
        s.id,
      ),
    );
  $("history").value = state.session?.id ?? "";
}
function download(kind) {
  if (!state.session) return;
  const s = structuredClone(state.session);
  if (!$("include-transcript").checked) s.segments = [];
  const blob = new Blob(
    [kind === "md" ? markdown(s) : JSON.stringify(s, null, 2)],
    { type: kind === "md" ? "text/markdown" : "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `offrecord-${s.id.slice(0, 8)}.${kind}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
bind("notes-tab", () => showView(true));
bind("transcript-tab", () => showView(false));
bind("retain", () =>
  command("retain", { includeTranscript: $("include-transcript").checked }),
);
bind("discard", () => command("discard"));
bind("demo", () => command("demo"));
bind("capture", () => command("capture"));
bind("stop", () => command("stop"));
bind("prepare", () => command("prepare", { download: $("download").checked }));
bind("analyze", () => command("analyze"));
bind("import", () => command("import", { text: $("import-text").value }));
bind("export", () => download("md"));
bind("json", () => download("json"));
bind("delete", async () => {
  const id = $("history").value;
  if (
    id &&
    confirm(
      "Delete this session and its transcript from this browser? Export first if you need a copy.",
    )
  ) {
    await command("delete", { id });
    await refreshHistory();
  }
});
$("history").onchange = () =>
  command("select", { id: $("history").value }).catch(notice);
try {
  if (extension) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.target === "panel" && message.type === "state")
        render(message.state);
    });
    const response = await chrome.runtime.sendMessage({
      target: "background",
      type: "boot",
    });
    if (response?.error) throw Error(response.error);
    await command("state");
  } else {
    local = new Engine(render);
    await local.init();
  }
  await refreshHistory();
} catch (error) {
  notice(error);
}
$("include-transcript").addEventListener("change", () => {
  $("retain").textContent = $("include-transcript").checked
    ? "Save notes + transcript on this device"
    : "Save notes on this device";
});
