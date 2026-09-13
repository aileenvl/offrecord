import test from "node:test";
import assert from "node:assert/strict";
import {
  parseNotes,
  mergeNotes,
  markdown,
  createSession,
  Chunker,
} from "../src/core.js";
const segments = [
  { id: 1, text: "We decided to launch on Friday.", start: 0, end: 8 },
];
test("notes require existing evidence and valid structure", () => {
  const result = parseNotes(
    '```json\n{"decisions":[{"text":"Launch Friday","evidence":[1]}],"actions":[],"questions":[]}\n```',
    segments,
  );
  assert.equal(result.decisions.length, 1);
  assert.throws(
    () =>
      parseNotes(
        '{"decisions":[{"text":"Invented","evidence":[9]}]}',
        segments,
      ),
    /evidence/,
  );
  assert.throws(() => parseNotes("not json", segments));
});
test("unknown owner and deadline stay unknown; duplicate updates merge", () => {
  const notes = parseNotes(
    JSON.stringify({ actions: [{ text: "Write notes", evidence: [1] }] }),
    segments,
  );
  assert.equal(notes.actions[0].owner, null);
  assert.equal(notes.actions[0].due, null);
  assert.equal(mergeNotes(notes, notes).actions.length, 1);
});
test("exports identify replay and include source transcript", () => {
  const s = createSession({ title: "Planning", domain: "demo.local" }, "demo");
  s.segments = segments;
  assert.match(markdown(s), /Sample replay/);
  assert.match(markdown(s), /We decided to launch/);
});
test("chunker preserves every sample, including final partial chunk", () => {
  const c = new Chunker(4);
  assert.deepEqual(c.push(new Float32Array([1, 2, 3])), []);
  const chunks = c.push(new Float32Array([4, 5, 6, 7, 8, 9]));
  assert.deepEqual(
    chunks.map((x) => Array.from(x)),
    [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
    ],
  );
  assert.deepEqual(Array.from(c.flush()), [9]);
  assert.equal(c.flush(), null);
});
test("invalid model types and oversized evidence are rejected", () => {
  assert.throws(() => parseNotes('{"actions":"send data"}', segments));
  assert.throws(() =>
    parseNotes('{"actions":[{"text":"x","evidence":[]}]}', segments),
  );
});
test("export without transcript clearly labels the omitted source", () => {
  const s = createSession({ title: "Private", domain: "local" });
  assert.match(markdown(s), /Transcript not included/);
});
test("capture lookahead keeps a short ending attached to speech context", () => {
  const c = new Chunker(4, 2);
  const emitted = c.push(new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]));
  assert.deepEqual(
    emitted.map((x) => Array.from(x)),
    [[1, 2, 3, 4]],
  );
  assert.deepEqual(Array.from(c.flush()), [5, 6, 7, 8, 9]);
});
