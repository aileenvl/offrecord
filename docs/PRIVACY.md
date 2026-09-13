# Privacy and data flow

OffRecord's promise is specific: **the extension does not send meeting audio, transcripts or generated notes to a cloud AI API.** It has no account, server, analytics client or meeting bot. “OffRecord” does not mean secret or consent-free recording; the interface asks users to let participants know.

## Retention is a user decision

Meeting content is temporary by default. Stop ends capture but does not save the meeting. **Save notes on this device** explicitly retains notes and context. **Include transcript in saves and exports** is a separate, unchecked choice. The same rule applies to Markdown/JSON exports. Discard clears the temporary session and pasted-text input; previously saved copies remain until deleted. Closing only the panel does not clear the offscreen session; discarding or closing the browser does.

## What is processed

Only audio emitted by the chosen browser tab. A MediaStream is resampled to mono 16 kHz, batched in memory, and passed to an on-device Whisper model. The recognized text goes to an on-device Gemma model. The user's own microphone is excluded. No video, screen recording, participant roster or contact list is collected.

After the user invokes the extension, title and hostname plus the first visible top-level heading can be read. Only bounded strings are retained. Page content and transcript are treated as untrusted data; the model has no authority to run commands or contact external services.

## Where data lives

| Data | Location | Retention |
|---|---|---|
| Raw audio | Browser process memory | Until processed, discarded, or process ends; no audio recording is saved |
| Temporary transcript and notes | Browser process memory | Until discard, replacement by another session, or browser process ends |
| Explicitly saved notes (and transcript only if selected) | Extension-origin IndexedDB | Until session deletion, extension removal, or browser storage cleanup |
| Title/domain/heading | Same session record | Same as transcript |
| Model assets | Browser Cache Storage | Until eviction or extension/storage removal |
| User exports | User-selected/downloads directory | User-controlled; session deletion does not delete exports |

Local storage is not application-encrypted. OS/browser profile access, malware, device backups, swap and browser internals are outside the application's guarantees. Meeting notes should still be handled according to the user's normal privacy practices.

## When a network connection is used

The developer installs dependencies when building. The extension requests fixed public model assets from Hugging Face and its model-delivery CDN only when the user enables downloads and prepares models. The hosts can see the IP address, model names and ordinary request metadata. No transcript, audio bytes or page metadata are included in request URLs or bodies. After preparation, downloads are disabled in the inference workers. No third-party fonts or remote scripts are loaded.

Unchecking setup downloads prevents network model loading and tests cache-only startup. Missing cache entries produce an error instead of calling a remote inference service. A network-disabled replay is independent of the model cache and exercises fixtures only.

## Permissions

- `activeTab`: temporary access after invocation, for context and capture authorization.
- `tabCapture`: user-started audio capture of the selected tab.
- `sidePanel`: display the meeting workspace beside the meeting.
- `offscreen`: keep local processing alive while the panel is closed.
- `scripting`: optionally retrieve one visible heading from the invoked tab.
- `unlimitedStorage`: support large model caches and locally retained meeting records.
- Hugging Face/CDN host access: download public model files. No all-sites host permission.

The manifest CSP allows local packaged code and WebAssembly, with model-download hosts as the only external connection destinations. The application download guard further limits paths and methods. This is defense in depth for this implementation, not a claim that CSP alone proves privacy.

## Verify it yourself

Run the sample with DevTools Network open or the browser offline. It makes no remote requests. For a real run, finish model setup, then disconnect networking and transcribe the bundled audio. Inspect the offscreen document and model workers from Chrome's extension inspection tools. Explicitly saved sessions remain accessible after reloading; delete a sample, reload again, and verify it is absent.

Removing the extension clears its browser-managed origin storage. To keep the installation but clear model assets, use the extension offscreen DevTools Application panel to clear Cache Storage; deleting individual sessions only removes meeting data. Exported files must be deleted separately by the user.
