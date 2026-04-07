import styles from './SrtResult.module.css'

function fmtDuration(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  return h ? `${h}h ${m}m ${s}s` : m ? `${m}m ${s}s` : `${s}s`
}

/**
 * Renders a syntax-highlighted SRT preview with download button and stats.
 * @param {{ result: Object, onDownload: () => void }} props
 */
export default function SrtResult({ result, onDownload }) {
  if (!result) return null

  const lines = result.srt.split('\n')

  return (
    <div className={styles.wrap}>
      <div>
        <div className={styles.sectionTitle}>Result</div>
        <div className={styles.header}>
          <div className={styles.stats}>
            <div>Segments: <span className={styles.val}>{result.segmentCount}</span></div>
            <div>Duration: <span className={styles.val}>{fmtDuration(result.duration)}</span></div>
            <div>Language: <span className={styles.val}>{result.lang}</span></div>
          </div>
          <button className={styles.dlBtn} onClick={onDownload}>
            ⬇ Download .srt
          </button>
        </div>
      </div>

      <div className={styles.preview}>
        {lines.map((line, i) => {
          let cls = styles.textLine
          if (/^\d+$/.test(line.trim())) cls = styles.indexLine
          else if (/-->/.test(line)) cls = styles.timeLine
          return (
            <span key={i} className={cls}>
              {line}{'\n'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
