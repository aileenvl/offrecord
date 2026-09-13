# Sample meeting

Use consenting participants in a web call or the bundled synthetic WAV at `/meeting.html`. The WAV is a local synthetic voice reading of the script below, generated for this repository. It contains no real meeting audio.

## Spoken script, about 24 seconds

“We decided to launch the Chrome extension on Friday. All meeting audio stays on this device. Luis will test tab audio capture by Thursday. Maya will record the two minute demo tomorrow. Can the model work offline on a smaller laptop? We still need to test that. Someone needs to verify the cached model before the presentation. Let us review the notes before we share them.”

## Expected meaning, not exact model wording

- Decision: launch the Chrome extension Friday.
- Action: Luis tests tab audio by Thursday.
- Action: Maya records the demo tomorrow.
- Action: verify the cache; owner is unknown.
- Open question: can the model work offline on a smaller laptop?

No automatic speaker diarization is expected. The voice says names explicitly, making action ownership recoverable. Whisper may alter punctuation or miss a word at a chunk boundary. Gemma must be reviewed against the transcript.

## Built-in replay

The separate **Try sample meeting** fixture is a longer product sync by Maya, Luis and Sam, compressed into roughly nine seconds. It yields exactly 2 decisions, 3 action items, and 1 open question. Transcript rows and structured note fixtures are in `src/demo.js`. This path does not play audio or run either model. Use its visible **SAMPLE REPLAY · NO AI** label in recordings.
