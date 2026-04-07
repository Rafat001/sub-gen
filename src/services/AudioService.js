/**
 * AudioService
 * Extracts audio from a video/audio File using the Web Audio API,
 * resamples to 16kHz mono WAV (what Whisper expects), and splits
 * the result into fixed-duration chunks.
 *
 * No ffmpeg or server-side processing needed — runs entirely in browser.
 */

const SAMPLE_RATE = 16000 // Whisper expects 16kHz mono

/**
 * Encode a Float32Array of PCM samples into a WAV Blob.
 */
function encodeWav(float32, sampleRate) {
  const data = new Int16Array(float32.length)
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]))
    data[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const buf = new ArrayBuffer(44 + data.byteLength)
  const v = new DataView(buf)
  const ws = (offset, str) =>
    [...str].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)))

  ws(0, 'RIFF'); v.setUint32(4, 36 + data.byteLength, true)
  ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true)
  v.setUint16(20, 1, true);  v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true);  v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, data.byteLength, true)
  new Int16Array(buf, 44).set(data)

  return new Blob([buf], { type: 'audio/wav' })
}

/**
 * Decode a video/audio File and resample to a 16kHz mono WAV Blob.
 * @param {File} file
 * @param {(pct: number) => void} onProgress - called with 0-100
 * @returns {{ wavBlob: Blob, duration: number }}
 */
export async function extractAudio(file, onProgress = () => {}) {
  onProgress(10)
  const arrayBuf = await file.arrayBuffer()
  onProgress(30)

  const tmpCtx = new AudioContext()
  let decoded
  try {
    decoded = await tmpCtx.decodeAudioData(arrayBuf)
  } finally {
    await tmpCtx.close()
  }
  onProgress(60)

  // Resample to SAMPLE_RATE mono via OfflineAudioContext
  const targetLength = Math.ceil(decoded.duration * SAMPLE_RATE)
  const offCtx = new OfflineAudioContext(1, targetLength, SAMPLE_RATE)
  const src = offCtx.createBufferSource()
  src.buffer = decoded
  src.connect(offCtx.destination)
  src.start(0)

  const resampled = await offCtx.startRendering()
  onProgress(90)

  const wavBlob = encodeWav(resampled.getChannelData(0), SAMPLE_RATE)
  onProgress(100)

  return { wavBlob, duration: decoded.duration }
}

/**
 * Split a 16kHz mono WAV Blob into fixed-duration chunks.
 * @param {Blob} wavBlob
 * @param {number} chunkSec - max seconds per chunk
 * @returns {{ chunks: Array<{ blob: Blob, startTime: number, duration: number }> }}
 */
export async function splitWav(wavBlob, chunkSec) {
  const ab = await wavBlob.arrayBuffer()
  const samplesPerChunk = chunkSec * SAMPLE_RATE
  const bytesPerChunk = samplesPerChunk * 2 // Int16 = 2 bytes per sample
  const dataStart = 44 // WAV header size

  const chunks = []
  let offset = dataStart
  let timeOffset = 0

  while (offset < ab.byteLength) {
    const sliceBytes = Math.min(bytesPerChunk, ab.byteLength - offset)
    const sliceSamples = sliceBytes / 2
    const sliceDuration = sliceSamples / SAMPLE_RATE

    // Build a valid WAV header for this slice
    const chunkBuf = new ArrayBuffer(44 + sliceBytes)
    const v = new DataView(chunkBuf)
    const ws = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))

    ws(0, 'RIFF'); v.setUint32(4, 36 + sliceBytes, true)
    ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true)
    v.setUint16(20, 1, true); v.setUint16(22, 1, true)
    v.setUint32(24, SAMPLE_RATE, true); v.setUint32(28, SAMPLE_RATE * 2, true)
    v.setUint16(32, 2, true); v.setUint16(34, 16, true)
    ws(36, 'data'); v.setUint32(40, sliceBytes, true)
    new Uint8Array(chunkBuf, 44).set(new Uint8Array(ab, offset, sliceBytes))

    chunks.push({
      blob: new Blob([chunkBuf], { type: 'audio/wav' }),
      startTime: timeOffset,
      duration: sliceDuration,
    })

    offset += sliceBytes
    timeOffset += sliceDuration
  }

  return { chunks }
}

/**
 * Build a 1-second silent WAV — used to pre-warm the Whisper model on page load.
 */
export function buildSilentWav() {
  return encodeWav(new Float32Array(SAMPLE_RATE), SAMPLE_RATE)
}
