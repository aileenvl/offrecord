# Third-party notices

OffRecord source: MIT, see LICENSE. Dependencies and models retain their respective terms.

- Transformers.js (`@huggingface/transformers`): Apache-2.0. https://github.com/huggingface/transformers.js
- ONNX Runtime Web: MIT. https://github.com/microsoft/onnxruntime
- Hugging Face tokenizers: Apache-2.0. https://github.com/huggingface/tokenizers
- Gemma 4 E2B: Apache-2.0 per the upstream model card. https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX
- Whisper: MIT. https://github.com/openai/whisper ; ONNX conversion: https://huggingface.co/onnx-community/whisper-tiny.en
- esbuild (build tool): MIT. https://github.com/evanw/esbuild
- Prettier (formatter): MIT. https://github.com/prettier/prettier
- Playwright (test tool): Apache-2.0. https://github.com/microsoft/playwright

No model weights are redistributed in the repository or extension ZIP. They are downloaded by the user's browser from pinned upstream revisions during setup. Bundled code retains license comments. The build also copies installed runtime license files into the extension's notices directory.

The sample WAV is a synthetic reading of the included original sample script using a local system voice, not a real meeting recording. UI styling and demo content are original to this project.
