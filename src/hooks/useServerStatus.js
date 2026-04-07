import { useState, useEffect, useCallback, useRef } from 'react'
import { checkWhisperHealth } from '../services/WhisperService'
import { checkTranslateHealth } from '../services/TranslateService'
import { buildSilentWav } from '../services/AudioService'
import { prewarmModel } from '../services/WhisperService'

const POLL_INTERVAL_MS = 15_000

/**
 * Polls Whisper and LibreTranslate health endpoints every 15 seconds.
 * Also kicks off Whisper model pre-warm on mount so it's loaded
 * before the user clicks Generate.
 *
 * @param {{ whisperUrl: string, translateUrl: string }} urls
 * @returns {{ whisper: 'checking'|'loading'|'online'|'offline', translate: 'checking'|'online'|'offline' }}
 */
export function useServerStatus({ whisperUrl, translateUrl }) {
  const [whisperStatus, setWhisperStatus]     = useState('checking')
  const [translateStatus, setTranslateStatus] = useState('checking')
  const prewarmDone = useRef(false)

  const checkHealth = useCallback(async () => {
    const [wOk, tOk] = await Promise.all([
      checkWhisperHealth(whisperUrl),
      checkTranslateHealth(translateUrl),
    ])
    // Don't overwrite 'loading' state set by prewarm
    setWhisperStatus(prev => {
      if (prev === 'loading') return prev
      return wOk ? 'online' : 'offline'
    })
    setTranslateStatus(tOk ? 'online' : 'offline')
  }, [whisperUrl, translateUrl])

  // Prewarm Whisper model on mount (runs once)
  useEffect(() => {
    if (prewarmDone.current) return
    prewarmDone.current = true

    const run = async () => {
      try {
        const silentWav = buildSilentWav()
        setWhisperStatus('loading')
        await prewarmModel(whisperUrl, silentWav)
        setWhisperStatus('online')
      } catch {
        setWhisperStatus('offline')
      }
    }

    // Short delay so encodeWav dependencies are ready
    const t = setTimeout(run, 800)
    return () => clearTimeout(t)
  }, [whisperUrl])

  // Poll health every 15s
  useEffect(() => {
    checkHealth()
    const id = setInterval(checkHealth, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [checkHealth])

  return { whisperStatus, translateStatus }
}
