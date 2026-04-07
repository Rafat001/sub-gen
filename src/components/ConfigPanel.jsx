import DropZone from './DropZone'
import Field from './Field'
import Toggle from './Toggle'
import { SOURCE_LANGUAGES, TARGET_LANGUAGES } from '../constants/languages'
import styles from './ConfigPanel.module.css'

/**
 * Left sidebar: file picker + all pipeline settings + run button.
 */
export default function ConfigPanel({ file, settings, onFile, onChange, onRun, running }) {
  const set = (key, val) => onChange({ ...settings, [key]: val })

  return (
    <aside className={styles.panel}>

      {/* File */}
      <section>
        <div className={styles.sectionTitle}>Video / Audio File</div>
        <DropZone onFile={onFile} selectedFile={file} />
      </section>

      {/* Whisper */}
      <section>
        <div className={styles.sectionTitle}>Transcription — Whisper</div>

        <Field label="Source Language" hint="Set explicitly when you know the language. Auto-detect can mis-identify similar scripts.">
          <select value={settings.srcLang} onChange={e => set('srcLang', e.target.value)}>
            {SOURCE_LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Whisper Server URL">
          <input
            type="text"
            value={settings.whisperUrl}
            onChange={e => set('whisperUrl', e.target.value)}
          />
        </Field>

        <Field label="Chunk Size (seconds)" hint="Larger = more accurate but slower per chunk. 30s recommended.">
          <input
            type="number"
            value={settings.chunkSec}
            min={5} max={120} step={5}
            onChange={e => set('chunkSec', parseInt(e.target.value) || 30)}
          />
        </Field>

        <Field label="Parallel Workers" hint="Keep at 1 on CPU. Whisper is single-threaded — more workers cause timeouts.">
          <input
            type="number"
            value={settings.concurrency}
            min={1} max={8} step={1}
            onChange={e => set('concurrency', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </Field>
      </section>

      {/* Translation */}
      <section>
        <div className={styles.sectionTitle}>Translation — LibreTranslate</div>

        <Toggle
          label="Translate subtitles"
          sub="Uses local LibreTranslate"
          checked={settings.doTranslate}
          onChange={v => set('doTranslate', v)}
        />

        {settings.doTranslate && (
          <div className={styles.translateFields}>
            <Field label="LibreTranslate URL">
              <input
                type="text"
                value={settings.translateUrl}
                onChange={e => set('translateUrl', e.target.value)}
              />
            </Field>

            <Field label="Target Language">
              <select value={settings.tgtLang} onChange={e => set('tgtLang', e.target.value)}>
                {TARGET_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </section>

      {/* SRT Options */}
      <section>
        <div className={styles.sectionTitle}>SRT Options</div>
        <Toggle
          label="Show original text"
          sub="Adds pre-translation text in [brackets]"
          checked={settings.showOriginal}
          onChange={v => set('showOriginal', v)}
        />
      </section>

      <button
        className={styles.runBtn}
        disabled={!file || running}
        onClick={onRun}
      >
        {running ? '⏳ Processing…' : '▶ Generate SRT'}
      </button>

    </aside>
  )
}
