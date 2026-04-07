/**
 * SrtService
 * Converts transcription segments into a valid .srt file string,
 * and filters out Whisper hallucinations (repeated chars, silence artifacts).
 */

/**
 * Format seconds as SRT timestamp: HH:MM:SS,mmm
 * @param {number} sec
 * @returns {string}
 */
export function formatSrtTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec - Math.floor(sec)) * 1000)
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`
}

function pad(n, d = 2) {
  return String(n).padStart(d, '0')
}

/**
 * Detect Whisper hallucinations:
 * - All-comma / punctuation-only output (silence artifact)
 * - Single character repeated (e.g. "నిని నిని నిని..." on wrong language)
 * - Filler word spam (no, no, no...)
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isHallucination(text) {
  const t = text.trim()
  if (!t) return true

  // All punctuation / commas
  if (/^[\s,،。、·\-_]+$/.test(t)) return true

  // Single/double character repeated — unique chars ≤ 2 across long string
  const uniqueChars = new Set(t.replace(/\s/g, '')).size
  if (uniqueChars <= 2 && t.replace(/\s/g, '').length > 10) return true

  // Filler word spam
  if (/^(\s*(no|yes|ok|mm+|uh+|ah+|oh|ha)\s*,?\s*){5,}$/i.test(t)) return true

  return false
}

/**
 * Build a complete .srt string from an array of segments.
 * @param {Array<{ start: number, end: number, text: string, original?: string }>} segments
 * @param {boolean} showOriginal - include original (pre-translation) text as second line
 * @returns {string}
 */
export function buildSrt(segments, showOriginal = false) {
  return segments
    .map((seg, i) => {
      const lines = [
        i + 1,
        `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}`,
        seg.text.trim(),
      ]
      if (showOriginal && seg.original && seg.original !== seg.text) {
        lines.push(`[${seg.original.trim()}]`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

/**
 * Trigger a browser download of the generated SRT content.
 * @param {string} srtContent
 * @param {string} filename
 */
export function downloadSrt(srtContent, filename) {
  const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
