export class Inference {
  constructor(role, onProgress = () => {}) {
    this.role = role;
    this.onProgress = onProgress;
    this.pending = new Map();
    this.ready = false;
  }
  request(type, payload, transfer = []) {
    if (!this.worker) {
      this.worker = new Worker(
        new URL("./model-worker.js", globalThis.location.href),
        { type: "module" },
      );
      this.worker.onmessage = ({ data }) => {
        const job = this.pending.get(data.id);
        if (!job) return;
        if (data.progress) {
          this.onProgress(this.role, data.progress);
          return;
        }
        clearTimeout(job.timer);
        this.pending.delete(data.id);
        data.error ? job.reject(Error(data.error)) : job.resolve(data.result);
      };
      this.worker.onerror = (event) =>
        this.reset(Error(event.message || "Model worker failed"));
    }
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () =>
          this.reset(Error("Local inference timed out. Prepare models again.")),
        type === "prepare" ? 900000 : 180000,
      );
      this.pending.set(id, { resolve, reject, timer });
      this.worker.postMessage({ id, type, payload }, transfer);
    });
  }
  async prepare(download) {
    await this.request("prepare", { role: this.role, download });
    this.ready = true;
  }
  reset(error = Error("Model worker stopped")) {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
}
