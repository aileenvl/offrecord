// AudioContext resamples input to 16 kHz; batching avoids one message per render quantum.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.used = 0;
    this.stopped = false;
    this.port.onmessage = ({ data }) => {
      if (data === "flush") {
        this.stopped = true;
        if (this.used)
          this.port.postMessage({ audio: this.buffer.slice(0, this.used) });
        this.port.postMessage({ flushed: true });
      }
    };
  }
  process(inputs) {
    if (this.stopped) return false;
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let value = 0;
      for (const channel of channels) value += channel[i];
      this.buffer[this.used++] = value / channels.length;
      if (this.used === this.buffer.length) {
        this.port.postMessage({ audio: this.buffer }, [this.buffer.buffer]);
        this.buffer = new Float32Array(2048);
        this.used = 0;
      }
    }
    return true;
  }
}
registerProcessor("offrecord-pcm", PCMProcessor);
