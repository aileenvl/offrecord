import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.js";
import { createSession } from "../src/core.js";
function engine() {
  const e = new Engine();
  e.session = createSession({ title: "Test", domain: "local" });
  e.persist = async () => {};
  return e;
}
test("starting another session is blocked while stop flushes audio", () => {
  const e = engine();
  e.session.status = "stopping";
  assert.throws(() => e.assertIdle(), /Stop/);
});
test("final accepted chunk is transcribed before stop completes", async () => {
  const e = engine();
  e.speech.request = async () => {
    await new Promise((r) => setTimeout(r, 15));
    return "We decided to ship.";
  };
  e.capture = {
    stop: async () => {
      e.enqueue(new Float32Array(1600).fill(0.1));
    },
  };
  await e.stop();
  assert.equal(e.session.status, "complete");
  assert.equal(e.session.segments.length, 1);
  assert.equal(e.session.segments[0].end, 0.1);
});
test("queue overflow stops capture and leaves an explicit gap warning", async () => {
  const e = engine();
  e.processing = true;
  let stopped = false;
  e.stop = async () => {
    stopped = true;
  };
  for (let i = 0; i < 6; i++) e.enqueue(new Float32Array(160));
  assert.equal(e.queue.length, 5);
  assert.equal(stopped, true);
  assert.match(e.session.warning, /not transcribed/);
});
test("malformed model output preserves the last valid notes", async () => {
  const e = engine();
  e.session.segments = [{ id: 1, text: "Ship Friday" }];
  e.session.notes.decisions = [{ text: "Ship Friday", evidence: [1] }];
  e.reasoner.ready = true;
  e.reasoner.request = async () =>
    '{"decisions":[{"text":"Wrong","evidence":[100]}]}';
  await assert.rejects(e.analyze(), /evidence/);
  assert.equal(e.session.notes.decisions[0].text, "Ship Friday");
  assert.equal(e.analyzing, false);
});
test("reanalysis removes corrected conclusions within the rolling window", async () => {
  const e = engine();
  e.session.segments = [
    { id: 1, text: "Launch Friday" },
    { id: 2, text: "Correction: Monday" },
  ];
  e.session.notes.decisions = [{ text: "Launch Friday", evidence: [1] }];
  e.reasoner.ready = true;
  e.reasoner.request = async () =>
    '{"decisions":[{"text":"Launch Monday","evidence":[2]}]}';
  await e.analyze();
  assert.equal(e.session.notes.decisions.length, 1);
  assert.equal(e.session.notes.decisions[0].text, "Launch Monday");
});
test("meetings are temporary unless the user explicitly chooses to save", async () => {
  const e = new Engine();
  e.session = createSession({ title: "Private", domain: "local" });
  assert.equal(e.session.retained, false);
  await e.persist(); // Node has no IndexedDB: a temporary session must not try to open it.
  assert.equal(e.session.retained, false);
});
