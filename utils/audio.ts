export async function webmBlobToWav(blob: Blob, targetSampleRate = 16000): Promise<ArrayBuffer> {
  // Note: Despite the name, this function accepts ANY audio Blob that the
  // browser can decode (webm/opus, mp4/aac, wav, etc.). Safari iOS typically
  // records as audio/mp4, while Chrome uses audio/webm. We simply feed the raw
  // bytes into decodeAudioData and resample to mono PCM16 WAV.
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error('Web Audio API not supported');
  const ctx = new AudioCtx();
  try {
    const decoded: AudioBuffer = await new Promise((resolve, reject) => {
      // Some Safari builds are finicky with the promise form; prefer callback.
      try {
        (ctx as any).decodeAudioData(arrayBuffer, (buf: AudioBuffer) => resolve(buf), (err: any) => reject(err));
      } catch {
        ctx.decodeAudioData(arrayBuffer).then(resolve).catch(reject);
      }
    });
    const duration = decoded.duration;
    const offline = new (window as any).OfflineAudioContext(1, Math.ceil(duration * targetSampleRate), targetSampleRate);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start(0);
    const rendered = await offline.startRendering();
    const chData = rendered.getChannelData(0);
    // PCM16 WAV encoding
    const wavBuffer = encodeWavPCM16(chData, targetSampleRate);
    return wavBuffer;
  } finally {
    try { ctx.close(); } catch {}
  }
}

function encodeWavPCM16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * 1;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // format = 1 (PCM)
  view.setUint16(22, 1, true); // channels = 1
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits per sample

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}


