# Final submission copy

## Title

OffRecord

## Tagline

Your meeting. Kept yours.

## One sentence

A private browser meeting agent that turns tab audio into a local transcript, decisions, action items and open questions—without a meeting bot or cloud AI.

## Written description

The meeting is already in your browser. Your assistant should be there too.

OffRecord is a Chrome extension that listens to audio from the meeting tab you choose, transcribes it on your device with Whisper, and uses Gemma 4 through WebGPU to maintain Decisions, Action Items and Open Questions in a side panel. It uses the tab's title, domain and a visible heading for context, so your meeting memory stays connected to the place where the conversation happened.

No bot joins the call. No account is required. Meeting audio and transcripts are not sent to a cloud AI service. Public model files download during setup and are cached locally; meeting content stays temporary until you choose to keep it. Save or export notes, separately opt into including the transcript, or discard the session. Saved copies remain local.

Each note links to transcript evidence. Missing owners or deadlines stay unknown. OffRecord helps people leave a meeting with clearer next steps while keeping them in control of the conversation's data.

The hackathon prototype includes a real browser-local audio/model pipeline, a bundled synthetic meeting for repeatable testing, and a visibly labeled no-download sample replay. It focuses on short English meetings, tab audio, and useful meeting memory. Microphone capture, speaker diarization and automatic follow-up messages are future work.

## Why it belongs here

OffRecord belongs inside the browser meeting workflow: it can access the selected tab's audio and context, keep notes beside the conversation, and maintain a local record without moving the user into a separate chat. Its useful action is maintaining evidence-linked meeting memory as the conversation progresses. It does not autonomously assign external tasks or send messages.

## Technology

Chrome Manifest V3; tabCapture; sidePanel; offscreen document; AudioWorklet; Web Workers; Transformers.js 4.2.0; Whisper tiny.en ONNX on WASM; Gemma 4 E2B ONNX q4f16 on WebGPU; IndexedDB and Cache Storage; plain JavaScript/CSS; esbuild; Node tests and Playwright.

## Social post

Meet OffRecord: your meeting, kept yours. 🎙️

A Chrome extension that turns meeting-tab audio into a local transcript, decisions, action items and open questions—with Whisper + Gemma 4 running on your device.

No meeting bot. No cloud AI. An agent right where the conversation happens.

Built for Agents, Everywhere. #WebAI #Gemma #Hackathon

## Submission checklist

- [x] Implement extension source and reproducible build.
- [x] Include local-only storage, evidence links, export and deletion.
- [x] Include no-download sample replay and local synthetic audio demo.
- [x] Write README, architecture, privacy explanation and sample script.
- [x] Write final title, tagline, description, demo script and social post.
- [ ] Read the exact live-model/capture results in `docs/VERIFICATION.md`.
- [ ] Rehearse actual capture and cached/offline model startup on the presentation machine.
- [ ] Record the two-minute video; label replay and any time cuts honestly.
- [ ] Create the public repository, push source, and verify clean-clone instructions.
- [ ] Add the real repository and video URLs to the hackathon portal.
- [ ] Confirm current portal fields, eligibility and any sponsor requirements.
- [ ] Submit before the organizer's deadline and save confirmation.

Confirm the organizer's current deadline in the submission portal. This package does not claim a portal submission, public repository publication or recorded video.
