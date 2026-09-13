import { Chunker } from './core.js';
export async function captureTab(streamId,onChunk,onEnded) {
  const media=await navigator.mediaDevices.getUserMedia({audio:{mandatory:{chromeMediaSource:'tab',chromeMediaSourceId:streamId}},video:false});
  let context, node, stopped=false; const chunks=new Chunker(16000*12);
  try {
    context=new AudioContext({sampleRate:16000});
    await context.audioWorklet.addModule(new URL('./audio-worklet.js',globalThis.location.href));
    const source=context.createMediaStreamSource(media);
    source.connect(context.destination); // Chrome mutes captured tab; restore playback exactly once.
    node=new AudioWorkletNode(context,'offrecord-pcm');
    const muted=context.createGain(); muted.gain.value=0;
    source.connect(node); node.connect(muted); muted.connect(context.destination);
    let flushed;
    node.port.onmessage=({data})=>{
      if(data.audio) for(const chunk of chunks.push(data.audio)) onChunk(chunk);
      if(data.flushed) flushed?.();
    };
    await context.resume();
    for(const track of media.getTracks()) track.onended=()=>{if(!stopped) onEnded();};
    return {async stop(){
      if(stopped)return; stopped=true;
      await new Promise(resolve=>{const timer=setTimeout(resolve,500);flushed=()=>{clearTimeout(timer);resolve();};node.port.postMessage('flush');});
      for(const track of media.getTracks()) track.stop();
      node.disconnect(); await context.close();
      const tail=chunks.flush(); if(tail)onChunk(tail);
    }};
  } catch(error){for(const track of media.getTracks())track.stop();await context?.close();throw error;}
}
