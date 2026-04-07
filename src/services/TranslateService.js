/**
 * TranslateService
 * Sends text to a locally-running LibreTranslate instance.
 *
 * Uses source='auto' when no language is specified, which is more
 * robust than trusting Whisper's language label (which can be wrong
 * for similar South Asian scripts).
 */

/**
 * Translate a single text string.
 * @param {string} text
 * @param {string} translateUrl - full URL to /translate
 * @param {string|null} sourceLang - ISO 639-1 code, or null for auto-detect
 * @param {string} targetLang - ISO 639-1 code
 * @returns {Promise<string>} translated text
 */
export async function translateText(text, translateUrl, sourceLang, targetLang) {
  if (!text.trim()) return text

  const res = await fetch(translateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: sourceLang || 'auto',
      target: targetLang,
      format: 'text',
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`LibreTranslate ${res.status}: ${body.slice(0, 120)}`)
  }

  const data = await res.json()
  return data.translatedText || text
}

/**
 * Check if the LibreTranslate server is reachable.
 * @param {string} translateUrl - e.g. http://localhost:5050/translate
 * @returns {Promise<boolean>}
 */
export async function checkTranslateHealth(translateUrl) {
  try {
    const origin = new URL(translateUrl).origin
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
