# ADR 001: Separate local speech recognition and reasoning

Status: accepted. Date: 2026-09-12.

The user prioritizes a robust hackathon demo and permits separate small STT if Gemma audio is unreliable. Use Whisper tiny.en on CPU/WASM and Gemma 4 E2B text-only on WebGPU, each in its own worker. Audio capture and persistence belong to an offscreen document, not the transient side panel or service worker. This avoids relying on browser speech-recognition APIs with variable remote processing behavior and keeps UI latency independent of inference.

The separate workers can transcribe and summarize concurrently, at the cost of additional memory and CPU/GPU contention. A five-chunk queue limit stops capture visibly under sustained overload. Tab-only capture keeps permissions and device mixing simple; microphone capture and diarization are deferred.

A clearly labeled deterministic sample replay is included for offline product demonstrations. It is never presented as evidence that AI models ran. Real model and capture checks are documented separately.
