# OffRecord build contract

User-authorized scope: self-contained Chrome MV3 extension; no server, account, telemetry or cloud inference. Desktop Chrome 116+ APIs, current Chrome recommended. English-first STT; tab audio only. Optional first-run public model downloads, never meeting uploads.

## Capability map and order
| Module | Responsibility | Depends on |
|---|---|---|
| memory | Validated evidence-linked notes, local persistence, export | — |
| inference | Whisper WASM STT, Gemma 4 WebGPU text reasoning | memory |
| capture | User-started tab capture, PCM chunks, bounded processing | inference |
| panel | Session controls, transcript, notes, sample replay | memory, capture |

## Acceptance
Start capture only after explicit user action. Audio remains audible. Stop releases tracks and drains accepted chunks; errors visible; no silent buffer loss. Closing panel does not stop offscreen capture. User privacy clarification: meeting content is temporary by default. Store notes in IndexedDB only after explicit Save; full transcript retention/export is a separate unchecked choice. Reopening recovers explicitly saved copies. Raw audio is transient. Notes cite transcript segments; unknown owners/deadlines remain unknown. Downloadable Markdown/JSON. Explicit deletion. Demo is labeled fixture replay, no claim of AI execution. Inference can be prewarmed and restricted to cache for offline use.

## Structure and commands
src/: extension and pure core; public/: bundled pages; tests/: Node unit and Playwright browser integration; docs/: architecture/privacy/demo/submission; tasks/: execution record.
`npm ci`, `npm test`, `npm run build`, `npm run test:e2e`, `npm run dev`.

## Style and quality bar
Plain ES modules, small explicit functions, native DOM, textContent for untrusted data. Example: `const note = { text, evidence: [segment.id], owner: null };`. No eval, remote code, API keys, HTML rendering of transcripts, or automatic outbound actions. Lock dependencies; ship local WASM. Tests cover note validation, chunk handling and queue pressure, persistence/export/replay and browser errors. Live model/capture validation reported separately from replay tests. Never hide failing tests or claim unperformed verification. Routine implementation and reversible local testing are authorized by the build request. Public publishing is outside this task.
