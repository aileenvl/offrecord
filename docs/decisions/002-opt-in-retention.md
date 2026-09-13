# ADR 002: Temporary meeting content and explicit retention

Status: accepted. Date: 2026-09-12.

The user raised a privacy concern about storing personal meeting content and asked whether local pgvector would be preferable. IndexedDB already resides on the local device; changing database engines does not eliminate the sensitivity of retention or the need for selected-tab audio access.

Meeting sessions now default to memory only. Stopping capture does not persist meeting content. Save notes is an explicit action; a separate unchecked choice controls whether the transcript is included in saves and exports. Saved note copies omit transcript segments by default. The in-memory transcript remains available for evidence review until discarded, replaced, or the browser process ends. Sources are labeled unavailable when opening a notes-only saved copy.

Models remain cached separately; model files contain no user's meeting content. pgvector/archive search is deferred to avoid creating a sensitive searchable history or requiring a local server for this hackathon demo. The app does not claim encryption at rest or protection against a compromised OS/browser profile.
