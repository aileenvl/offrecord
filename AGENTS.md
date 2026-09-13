# OffRecord contributor notes

Use the pinned dependencies and current SPEC.md. Keep the extension self-contained and browser-local. Never add cloud inference, telemetry, remote scripts, account handling or automatic meeting retention. Meeting content is memory-only until the user explicitly saves; full transcript retention and export require a separate choice.

Run `npm test`, `npm run build`, and `npm run test:e2e` for functional changes. Real-model checks are separate opt-in scripts and use synthetic content in an isolated profile. Never present fixture replay as AI execution. Update docs/VERIFICATION.md with honest evidence and remaining limits. Do not put model caches, user recordings, test profiles or exports into git.
