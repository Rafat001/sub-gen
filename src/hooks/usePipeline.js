import { useState, useCallback } from 'react'
import { extractAudio, splitWav } from '../services/AudioService'
import { transcribeChunk, runWithConcurrency } from '../services/WhisperService'
import { translateText } from '../services/TranslateService'
import { buildSrt, isHallucination, downloadSrt } from '../services/SrtService'

/**
 * Pipeline state shape
 * @typedef {{ id: string, state: 'idle'|'active'|'done', detail: string, progress: number }} StepState
 * @typedef {{ lines: Array<{ msg: string, type: string, time: string }> }} LogState
 */

const STEP_IDS = ['extract', 'transcribe', 'translate', 'build']

function makeSteps() {
  return Object.fromEntries(
    STEP_IDS.map(id => [id, { state: 'idle', detail: 'Waiting…', progress: 0 }])
  )
}

function nowTime() {
  return new Date().toLocaleTimeString('en', { hour12: false })
}

/**
 * Orchestrates the full audio → transcription → translation → SRT pipeline.
 * All state is managed here and passed down to UI components.
 */
export function usePipeline() {
  const [running, setRunning]   = useState(false)
  const [steps, setSteps]       = useState(makeSteps())
  const [logs, setLogs]         = useState([])
  const [error, setError]       = useState(null)
  const [result, setResult]     = useState(null) // { srt, filename, segments, duration, lang }
  const [started, setStarted]   = useState(false)

  const updateStep = useCallback((id, patch) => {
    setSteps(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }, [])

  const addLog = useCallback((msg, type = '') => {
    setLogs(prev => [...prev, { msg, type, time: nowTime() }])
  }, [])

  const reset = useCallback(() => {
    setSteps(makeSteps())
    setLogs([])
    setError(null)
    setResult(null)
    setStarted(true)
  }, [])

  const run = useCallback(async (file, settings) => {
    const {
      whisperUrl,
      translateUrl,
      srcLang,
      tgtLang,
      chunkSec,
      concurrency,
      doTranslate,
      showOriginal,
    } = settings

    reset()
    setRunning(true)

    try {
      // ── Step 1: Extract audio ──────────────────────────────────────────────
      updateStep('extract', { state: 'active', detail: 'Decoding media…' })
      addLog(`Extracting audio from ${file.name}…`)

      let wavBlob, audioDuration
      try {
        const res = await extractAudio(file, pct => {
          updateStep('extract', { progress: pct, detail: `${pct}% — decoding…` })
        })
        wavBlob = res.wavBlob
        audioDuration = res.duration
      } catch (e) {
        throw new Error(`Audio extraction failed: ${e.message}`)
      }

      const fmt = sec => {
        const h = Math.floor(sec / 3600)
        const m = Math.floor((sec % 3600) / 60)
        const s = Math.floor(sec % 60)
        return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`
      }

      updateStep('extract', { state: 'done', detail: `${fmt(audioDuration)} extracted`, progress: 100 })
      addLog(`Audio ready: ${fmt(audioDuration)}, 16kHz mono`, 'ok')

      // ── Step 2: Split + Transcribe ─────────────────────────────────────────
      updateStep('transcribe', { state: 'active', detail: 'Splitting into chunks…' })
      const { chunks } = await splitWav(wavBlob, chunkSec)
      addLog(`Split into ${chunks.length} chunk(s) · ${concurrency} worker(s)`)

      const results = new Array(chunks.length).fill(null)
      let detectedLang = srcLang !== 'auto' ? srcLang : null
      let doneCnt = 0
      let errCnt = 0

      updateStep('transcribe', { detail: `0/${chunks.length} chunks done`, progress: 0 })

      const tasks = chunks.map((chunk, i) => async () => {
        try {
          const data = await transcribeChunk(chunk.blob, whisperUrl, srcLang === 'auto' ? null : srcLang)
          results[i] = { chunk, data }
          if (!detectedLang && data.language) detectedLang = data.language
        } catch (e) {
          errCnt++
          addLog(`⚠ Chunk ${i + 1} failed: ${e.message}`, 'err')
          results[i] = { chunk, data: null }
        } finally {
          doneCnt++
          const pct = Math.round((doneCnt / chunks.length) * 100)
          updateStep('transcribe', {
            progress: pct,
            detail: `${doneCnt}/${chunks.length} chunks done`,
          })
          if (doneCnt <= 3 || doneCnt % 5 === 0) {
            addLog(`Chunk ${doneCnt}/${chunks.length} complete`)
          }
        }
      })

      await runWithConcurrency(tasks, concurrency)

      // Flatten in order, preserving chunk timestamps
      const allSegments = []
      for (const r of results) {
        if (!r?.data) continue
        const { chunk, data } = r
        if (data.segments?.length > 0) {
          data.segments.forEach(seg => {
            if (!seg.text?.trim()) return
            allSegments.push({
              start: chunk.startTime + seg.start,
              end: chunk.startTime + seg.end,
              text: seg.text.trim(),
              language: data.language || detectedLang || 'en',
            })
          })
        } else if (data.text?.trim()) {
          allSegments.push({
            start: chunk.startTime,
            end: chunk.startTime + chunk.duration,
            text: data.text.trim(),
            language: data.language || detectedLang || 'en',
          })
        }
      }

      // Filter hallucinations
      const clean = allSegments.filter(s => !isHallucination(s.text))
      const filtered = allSegments.length - clean.length
      if (filtered > 0) addLog(`Filtered ${filtered} hallucinated segments`, 'err')

      const errNote = errCnt > 0 ? ` (${errCnt} chunks failed)` : ''
      const filterNote = filtered > 0 ? `, ${filtered} hallucinations removed` : ''
      updateStep('transcribe', {
        state: 'done',
        detail: `${clean.length} segments${errNote}${filterNote}`,
        progress: 100,
      })
      addLog(`Transcription done: ${clean.length} segments${errNote}`, 'ok')

      // ── Step 3: Translate ──────────────────────────────────────────────────
      // Use explicit source lang if set; otherwise let LibreTranslate auto-detect
      const transSource = srcLang !== 'auto' ? srcLang : null
      const needsTranslation = doTranslate && clean.length > 0 && tgtLang !== transSource

      if (needsTranslation) {
        updateStep('translate', {
          state: 'active',
          detail: `${transSource || 'auto'} → ${tgtLang}…`,
          progress: 0,
        })
        addLog(`Translating ${clean.length} segments…`)

        let tDone = 0
        const transLimit = Math.min(concurrency * 2, 12)

        const transTasks = clean.map((seg, i) => async () => {
          try {
            const translated = await translateText(seg.text, translateUrl, transSource, tgtLang)
            seg.original = seg.text
            seg.text = translated
          } catch (e) {
            addLog(`Translation warning on seg ${i + 1}: ${e.message}`, 'err')
          } finally {
            tDone++
            updateStep('translate', {
              progress: Math.round((tDone / clean.length) * 100),
              detail: `${tDone}/${clean.length} segments`,
            })
          }
        })

        await runWithConcurrency(transTasks, transLimit)
        updateStep('translate', { state: 'done', detail: `${clean.length} segments translated`, progress: 100 })
        addLog('Translation complete', 'ok')
      } else {
        updateStep('translate', {
          state: 'done',
          detail: doTranslate ? 'Skipped (same language)' : 'Skipped (disabled)',
          progress: 100,
        })
      }

      // ── Step 4: Build SRT ──────────────────────────────────────────────────
      updateStep('build', { state: 'active', detail: 'Building SRT…', progress: 50 })
      const srt = buildSrt(clean, showOriginal)
      const filename = file.name.replace(/\.[^.]+$/, '') + '.srt'

      updateStep('build', { state: 'done', detail: `${clean.length} entries`, progress: 100 })
      addLog(`SRT built: ${clean.length} entries`, 'ok')

      setResult({
        srt,
        filename,
        segmentCount: clean.length,
        duration: audioDuration,
        lang: detectedLang
          ? needsTranslation ? `${detectedLang} → ${tgtLang}` : detectedLang
          : tgtLang,
      })
    } catch (err) {
      setError(err.message)
      addLog(`Error: ${err.message}`, 'err')
      console.error(err)
    } finally {
      setRunning(false)
    }
  }, [reset, updateStep, addLog])

  const download = useCallback(() => {
    if (!result) return
    downloadSrt(result.srt, result.filename)
    addLog(`Downloaded: ${result.filename}`, 'ok')
  }, [result, addLog])

  return { running, steps, logs, error, result, started, run, download }
}
