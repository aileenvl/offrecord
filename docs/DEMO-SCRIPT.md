# Two-minute demo script

## Before recording

Load the extension, prepare both models, keep them warm, and use a short consenting call or the bundled local audio page. Verify offline behavior on the demo machine. Pick a quiet browser profile and close unrelated tabs. Use the sample replay if model/hardware checks fail, and explicitly label that portion as replay. Record the real AI portion separately only if it has actually run.

## 0:00–0:15 · The problem

Show a browser meeting with OffRecord open beside it.

“Meeting assistants often need a bot in the call and another copy of our conversation in the cloud. OffRecord lives in the browser tab where the meeting already happens.”

## 0:15–0:30 · The promise and context

Show the meeting title/domain, readiness status and Start button.

“Your meeting. Kept yours. Whisper turns tab audio into text on this machine, and Gemma 4 turns that text into useful meeting memory on the GPU. No account. No bot joins.”

## 0:30–0:58 · Actual audio

Start tab capture, then play the 24-second local audio sample. Switch briefly to Transcript when its first chunk arrives.

“This is a bundled synthetic meeting, so we can test the real pipeline without recording anyone. The transcript appears as local audio chunks finish processing. This version captures the tab's sound, not my own microphone.”

## 0:58–1:20 · Useful memory

Click Stop capture and show notes when generation completes. If the computer is slow, use a clearly marked time cut; do not imply instantaneous processing.

“Here's what we decided, what people committed to, and what is still unresolved. Where nobody took ownership, OffRecord keeps it unknown.”

## 1:20–1:40 · Evidence and privacy

Click a source timestamp and show the related transcript text. Show network disconnected, if the actual run was tested that way.

“Every note has a source. The conversation is temporary unless I choose to keep it, and only model files are cached automatically. After setup, the processing can run without a network connection.”

## 1:40–1:55 · Local handoff

Export Markdown, or reopen a saved session.

“You decide what leaves the browser. Save or export just the notes, explicitly include the transcript if you need it, or discard the temporary session.”

## 1:55–2:00 · Close

“OffRecord. An agent inside the meeting workflow. Your meeting, kept yours.”

## Replay fallback wording

If showing **Try sample meeting**, replace the actual-audio narration with: “This is a labeled sample replay demonstrating the interaction, local memory, and evidence links. The separate local model path uses Whisper and Gemma 4.” Do not describe fixture notes as freshly generated AI output.
