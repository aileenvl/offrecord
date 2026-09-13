import { createSession, parseNotes, mergeNotes, emptyNotes } from "./core.js";
import { saveSession, listSessions, deleteSession } from "./storage.js";
import { Inference } from "./inference.js";
import { captureTab } from "./capture.js";
import { DEMO, DEMO_CONTEXT } from "./demo.js";
export class Engine {
  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.session = null;
    this.activity = "Ready";
    this.busy = false;
    this.queue = [];
    this.processing = false;
    this.analyzing = false;
    this.elapsed = 0;
    this.saves = Promise.resolve();
    const progress = (role, p) => {
      this.activity = `Preparing ${role === "notes" ? "Gemma 4" : "Whisper"}${p.file ? ` · ${p.file.split("/").at(-1)}` : ""}${Number.isFinite(p.progress) ? ` · ${Math.round(p.progress)}%` : ""}`;
      this.emit();
    };
    this.speech = new Inference("speech", progress);
    this.reasoner = new Inference("notes", progress);
  }
  state() {
    return {
      session: this.session,
      activity: this.activity,
      busy: this.busy,
      recording: !!this.capture || !!this.timer,
      processing: this.processing,
      analyzing: this.analyzing,
      speechReady: this.speech.ready,
      notesReady: this.reasoner.ready,
      queued: this.queue.length,
    };
  }
  emit() {
    this.onChange(structuredClone(this.state()));
  }
  async persist() {
    if (!this.session?.retained) {
      this.emit();
      return;
    }
    const snapshot = structuredClone(this.session);
    if (snapshot.retained === "notes") snapshot.segments = [];
    this.saves = this.saves.catch(() => {}).then(() => saveSession(snapshot));
    try {
      await this.saves;
    } catch (error) {
      this.activity = "Could not save locally. Export before closing.";
      this.session.warning = error.message;
      throw error;
    } finally {
      this.emit();
    }
  }
  async init() {
    this.session = (await listSessions())[0] ?? null;
    if (
      this.session &&
      ["recording", "stopping", "replaying"].includes(this.session.status)
    ) {
      this.session.status = "interrupted";
      this.session.warning =
        "Browser processing ended before this session was stopped. Saved text recovered; unfinished audio is unavailable.";
      await this.persist();
    }
    this.emit();
    return this.state();
  }
  assertIdle() {
    if (
      this.capture ||
      this.timer ||
      this.busy ||
      this.processing ||
      this.analyzing ||
      this.stopping ||
      ["replaying", "stopping"].includes(this.session?.status)
    )
      throw Error(
        "Stop the current session and wait for local processing to finish first.",
      );
  }
  async prepare(download) {
    this.assertIdle();
    this.busy = true;
    this.emit();
    try {
      await this.speech.prepare(download);
      this.emit();
      await this.reasoner.prepare(download);
      this.activity = "Models ready · network locked";
    } catch (error) {
      this.activity = error.message;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  async start(streamId, context) {
    this.assertIdle();
    if (!this.speech.ready)
      throw Error("Prepare local speech recognition first.");
    this.busy = true;
    try {
      this.session = createSession(context);
      this.elapsed = 0;
      await this.persist();
      this.capture = await captureTab(
        streamId,
        (audio) => this.enqueue(audio),
        () => this.stop().catch((e) => this.fail(e)),
      );
      this.session.status = "recording";
      this.activity = "Listening to this tab · microphone excluded";
      await this.persist();
    } catch (error) {
      await this.capture?.stop();
      this.capture = null;
      throw error;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  enqueue(audio) {
    const start = this.elapsed;
    this.elapsed += audio.length / 16000;
    // One minute of queued audio is the hard limit. Stop rather than silently discard speech.
    if (this.queue.length >= 5) {
      this.session.warning =
        "Processing fell behind. Capture stopped; audio after the queue limit was not transcribed.";
      void this.stop().catch((e) => this.fail(e));
      return;
    }
    this.queue.push({ audio, start, end: this.elapsed });
    this.emit();
    void this.drain();
  }
  async drain() {
    if (this.processing) return;
    this.processing = true;
    this.emit();
    try {
      while (this.queue.length) {
        const item = this.queue.shift();
        const text = await this.speech.request(
          "transcribe",
          { audio: item.audio },
          [item.audio.buffer],
        );
        if (text) {
          this.session.segments.push({
            id: this.session.segments.length + 1,
            text,
            start: item.start,
            end: item.end,
          });
          await this.persist();
        }
        if (
          this.reasoner.ready &&
          this.session.segments.length - this.session.analyzedThrough >= 3
        )
          void this.analyze().catch((e) => this.fail(e));
      }
    } catch (error) {
      this.session.warning = `Transcription interrupted: ${error.message}`;
      this.queue = [];
      void this.stop().catch((e) => this.fail(e));
    } finally {
      this.processing = false;
      this.emit();
    }
  }
  async analyze() {
    if (this.analyzing || !this.session?.segments.length) return;
    if (!this.reasoner.ready) throw Error("Prepare Gemma 4 to generate notes.");
    this.analyzing = true;
    this.activity = "Gemma is updating notes locally…";
    this.emit();
    const segments = this.session.segments.slice(-24);
    const through = segments.at(-1).id;
    try {
      const raw = await this.reasoner.request("analyze", {
        context: this.session.context,
        segments,
      });
      const fresh = parseNotes(raw, segments);
      const windowIds = new Set(segments.map((s) => s.id));
      // Replace notes grounded in this window so corrections can remove old conclusions.
      const retained = Object.fromEntries(
        Object.entries(this.session.notes).map(([key, items]) => [
          key,
          items.filter((n) => n.evidence.every((id) => !windowIds.has(id))),
        ]),
      );
      this.session.notes = mergeNotes(retained, fresh);
      this.session.analyzedThrough = through;
      this.activity = "Notes updated locally · review the evidence";
      await this.persist();
    } finally {
      this.analyzing = false;
      this.emit();
    }
  }
  async stop() {
    if (this.stopping) return this.stopping;
    this.stopping = this.finish().finally(() => {
      this.stopping = null;
    });
    return this.stopping;
  }
  async finish() {
    clearInterval(this.timer);
    this.timer = null;
    if (!this.session) return;
    this.session.status = "stopping";
    this.activity = "Finishing the local transcript and notes…";
    this.emit();
    const capture = this.capture;
    this.capture = null;
    await capture?.stop();
    while (this.processing || this.analyzing)
      await new Promise((r) => setTimeout(r, 50));
    if (
      this.reasoner.ready &&
      this.session.mode !== "demo" &&
      this.session.segments.length > this.session.analyzedThrough
    ) {
      try {
        await this.analyze();
      } catch (e) {
        this.session.warning = `Notes incomplete: ${e.message}`;
      }
    }
    this.session.status = "complete";
    this.activity = this.session.retained
      ? "Session saved on this device"
      : "Session complete · temporary until you save";
    await this.persist();
  }
  async demo() {
    this.assertIdle();
    this.session = createSession(DEMO_CONTEXT, "demo");
    this.session.status = "replaying";
    this.activity = "Sample replay · no AI inference";
    await this.persist();
    let index = 0;
    this.timer = setInterval(() => {
      const row = DEMO[index];
      const id = index + 1;
      this.session.segments.push({
        id,
        text: row.text,
        start: index * 12,
        end: (index + 1) * 12,
      });
      if (row.kind) {
        const notes = emptyNotes();
        notes[row.kind] = [
          {
            text: row.note,
            evidence: [id],
            owner: row.owner ?? null,
            due: row.due ?? null,
          },
        ];
        this.session.notes = mergeNotes(this.session.notes, notes);
      }
      index++;
      void this.persist().catch((e) => this.fail(e));
      if (index === DEMO.length) void this.stop().catch((e) => this.fail(e));
    }, 1100);
    this.emit();
    return this.state();
  }
  async importText(text) {
    this.assertIdle();
    if (typeof text !== "string" || !text.trim() || text.length > 30000)
      throw Error("Enter a transcript between 1 and 30,000 characters.");
    this.session = createSession(
      { title: "Imported meeting transcript", domain: "Local text" },
      "text",
    );
    this.session.segments = text
      .trim()
      .split(/\n+/)
      .flatMap((line) => line.match(/.{1,1200}(?:\s|$)|.{1,1200}/g) ?? [])
      .map((text, i) => ({ id: i + 1, text, start: 0, end: 0 }));
    this.session.status = "complete";
    this.activity = "Temporary transcript · ready for local Gemma analysis";
    await this.persist();
  }
  async retain(includeTranscript) {
    this.assertIdle();
    if (!this.session) return;
    const previousRetention = this.session.retained;
    this.busy = true;
    this.activity = "Saving your chosen copy on this device…";
    this.emit();
    this.session.retained = includeTranscript ? "full" : "notes";
    try {
      await this.persist();
      this.activity = includeTranscript
        ? "Notes and transcript saved on this device"
        : "Notes saved · transcript remains temporary";
    } catch (error) {
      this.session.retained = previousRetention;
      throw error;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  async discard() {
    this.assertIdle();
    this.session = null;
    this.activity = "Temporary session discarded";
    this.emit();
  }
  async select(id) {
    this.assertIdle();
    this.session = (await listSessions()).find((s) => s.id === id) ?? null;
    this.emit();
  }
  async remove(id) {
    this.assertIdle();
    await this.saves;
    await deleteSession(id);
    if (this.session?.id === id)
      this.session = (await listSessions())[0] ?? null;
    this.emit();
  }
  fail(error) {
    this.activity = error.message;
    this.emit();
  }
}
