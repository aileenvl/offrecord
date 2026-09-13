import { build } from "esbuild";
import { cp, mkdir, rm, readdir } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await mkdir("dist/vendor", { recursive: true });
await cp("public", "dist", { recursive: true });
await build({
  entryPoints: [
    "src/background.js",
    "src/offscreen.js",
    "src/panel.js",
    "src/model-worker.js",
    "src/audio-worklet.js",
  ],
  outdir: "dist",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "chrome116",
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  legalComments: "eof",
  define: { "process.env.NODE_ENV": '"production"' },
});
for (const f of await readdir("node_modules/onnxruntime-web/dist"))
  if (/^ort-wasm.*\.(mjs|wasm)$/.test(f))
    await cp(`node_modules/onnxruntime-web/dist/${f}`, `dist/vendor/${f}`);
await mkdir("dist/notices", { recursive: true });
for (const [source, name] of [
  ["LICENSE", "OffRecord.txt"],
  ["THIRD_PARTY_NOTICES.md", "README.md"],
  ["node_modules/@huggingface/transformers/LICENSE", "Transformers.txt"],
  ["node_modules/@huggingface/tokenizers/LICENSE", "Tokenizers.txt"],
  ["public/notices/ONNX-Runtime.txt", "ONNX-Runtime.txt"],
])
  await cp(source, `dist/notices/${name}`);
console.log("Built dist/: load this folder as an unpacked Chrome extension.");
