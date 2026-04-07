/**
 * WhisperService
 * Sends audio chunks to a locally-running faster-whisper-server
 * (OpenAI-compatible /v1/audio/transcriptions endpoint).
 *
 * Includes retry logic with exponential backoff to handle transient
 * timeouts during model cold-start.
 */

const TIMEOUT_MS = 300_000 // 5 minutes — covers cold model load
const MAX_RETRIES = 2

/**
 * Transcribe a single WAV blob.
 * @param {Blob} blob - 16kHz mono WAV
 * @param {string} whisperUrl - full URL to /v1/audio/transcriptions
 * @param {string|null} language - ISO 639-1 code or null for auto-detect
 * @returns {Promise<{ text: string, language: string, segments: Array }>}
 */
export async function transcribeChunk(blob, whisperUrl, language = null) {
  let lastError

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const fd = new FormData()
      fd.append('file', blob, 'chunk.wav')
      fd.append('model', 'whisper-1')
      fd.append('response_format', 'verbose_json')
      fd.append('timestamp_granularities[]', 'segment')
      if (language && language !== 'auto') {
        fd.append('language', language)
      }

      const res = await fetch(whisperUrl, {
        method: 'POST',
        body: fd,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`Whisper ${res.status}: ${body.slice(0, 200)}`)
      }

      return await res.json()
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 3s, 6s
        await new Promise(r => setTimeout(r, (attempt + 1) * 3000))
      }
    }
  }

  throw lastError
}

/**
 * Pre-warm the Whisper model by sending a silent 1-second clip.
 * faster-whisper-server lazy-loads the model on first request (~2 min).
 * Calling this on page load means the model is ready when the user clicks Generate.
 *
 * @param {string} whisperUrl
 * @param {Blob} silentWav - 1-second silent WAV from AudioService.buildSilentWav()
 * @returns {Promise<void>}
 */
export async function prewarmModel(whisperUrl, silentWav) {
  const fd = new FormData()
  fd.append('file', silentWav, 'warmup.wav')
  fd.append('model', 'whisper-1')
  fd.append('response_format', 'verbose_json')

  const res = await fetch(whisperUrl, {
    method: 'POST',
    body: fd,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`Prewarm failed: Whisper ${res.status}`)
  }
}

/**
 * Check if the Whisper server is reachable.
 * Uses no-cors mode to avoid CORS errors on the health endpoint.
 * @param {string} whisperUrl
 * @returns {Promise<boolean>}
 */
export async function checkWhisperHealth(whisperUrl) {
  try {
    const origin = new URL(whisperUrl).origin
    await fetch(`${origin}/health`, {
      method: 'GET',
      mode: 'no-cors',
      signal: AbortSignal.timeout(3000),
    })
    return true
  } catch {
    return false
  }
}

/**
 * Run an array of async task functions with a max concurrency limit.
 * Tasks are functions that return Promises (not the Promises themselves).
 *
 * @param {Array<() => Promise>} tasks
 * @param {number} limit
 */
export async function runWithConcurrency(tasks, limit) {
  const executing = new Set()
  for (const task of tasks) {
    const p = Promise.resolve().then(task).finally(() => executing.delete(p))
    executing.add(p)
    if (executing.size >= limit) await Promise.race(executing)
  }
  await Promise.all(executing)
}
