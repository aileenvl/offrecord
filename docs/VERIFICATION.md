# Verification record

Tests use synthetic meeting content and isolated browser profiles, not personal meetings or logged-in accounts. This is a prototype verification record, not a claim of broad platform or hardware certification.

## Automated core tests

13 passing Node tests cover schema/evidence validation, unknown owners, deduplication, exports, PCM chunk boundaries, short-tail lookahead and final partial flush, queue pressure, stopping, failed model response preservation, corrected notes, and temporary sessions avoiding database writes.

## Browser product tests

5 passing Playwright tests cover sample replay and exact expected notes, evidence navigation, explicit persistence across reload, exports, replay while offline with no remote requests, safe display of pasted markup, deletion, 320/768/1440 px layouts, temporary data not retained, clearing the pasted-text input on import/discard, and notes-only retention excluding the full transcript from storage/exports.

## Actual model execution

Test browser: Chrome for Testing 153 on macOS Apple Silicon. Runtime: Transformers.js 4.2.0, pinned model revisions in `src/models.js`.

- Both Whisper and Gemma loaded in the actual installed Manifest V3 extension, with its CSP and bundled local WASM.
- Gemma 4 generated valid structured decisions/actions/questions from a synthetic typed transcript, including valid evidence IDs.
- After restarting the test browser with network disabled and downloads unchecked, both models loaded from browser cache.
- Real Whisper transcribed the 24.184-second bundled synthetic WAV offline in about 4.97 seconds on this machine, recovering the key names, launch day, action deadlines and open question. This is one sample measurement, not a general performance guarantee.

## Actual offline tab capture → Whisper → Gemma

The final test passed using the installed extension and the bundled 24.184-second synthetic meeting. Chrome's toolbar-action test API granted active-tab access; the extension then used its real tabCapture stream, offscreen document, AudioWorklet, Whisper worker and Gemma worker. Both models were prepared from cache with downloads unchecked. The local sample audio was loaded into a Blob before networking was disabled for the entire capture and inference portion.

- Captured two transcript segments totaling about 24.248 seconds, including a small amount of playback timing overhead.
- Recovered the launch decision, Luis's Thursday task, Maya's demo task and the offline question.
- Produced one decision, two named action items and two question entries, all citing existing transcript segments. No processing warning; both segments analyzed.
- Meeting retention stayed `false`; the test saved synthetic verification evidence separately, not through automatic meeting storage.
- A short-tail regression was fixed with one second of lookahead. The final run did not produce the invented farewell observed when a tiny ending was previously sent to Whisper alone.

**Semantic limitation observed:** Gemma classified “Someone needs to verify the cached model before the presentation” as an open question instead of an unassigned action. It also omitted the statement about keeping audio on-device from its decisions list. Evidence-ID validation does not guarantee complete or correctly categorized notes. The fixed replay has different, curated counts and is never counted as model execution.

[Recorded synthetic result](evidence/capture.json) · [Actual capture screenshot](images/offrecord-live.png).

An earlier standalone whole-WAV → one-paragraph imported transcript → Gemma check timed out waiting for validated notes. It has not been counted as a successful combined test; the final installed-extension capture path above passed with the same cached models and network disabled.

## Dependency and packaging review

The production dependency audit reports zero known vulnerabilities after pinning patched Node-only transitive dependencies `sharp` and `adm-zip`. These Node-only dependencies are not part of the browser bundle. The tested browser inference packages remain unchanged. Code has no meeting upload endpoint, analytics, remote script, HTML interpolation of transcripts or model-executed tools.

The recorded checks do not establish perfect transcription, reliable speaker attribution, resistance to a compromised local device, or support for every web meeting service. A live presentation should use the tested short synthetic sample and rehearse on its actual machine.
