import LogBox from './LogBox'
import styles from './ProgressPanel.module.css'

const STEP_DEFS = [
  { id: 'extract',    label: 'Extract Audio',        num: 1 },
  { id: 'transcribe', label: 'Transcribe with Whisper', num: 2 },
  { id: 'translate',  label: 'Translate',            num: 3 },
  { id: 'build',      label: 'Build SRT',            num: 4 },
]

/**
 * @param {{ steps: Object, logs: Array, error: string|null }} props
 */
export default function ProgressPanel({ steps, logs, error }) {
  return (
    <div className={styles.wrap}>

      <div>
        <div className={styles.sectionTitle}>Progress</div>
        <div className={styles.steps}>
          {STEP_DEFS.map(def => {
            const step = steps[def.id]
            const cls = [
              styles.step,
              step.state === 'active' ? styles.active : '',
              step.state === 'done'   ? styles.done   : '',
            ].join(' ')

            return (
              <div key={def.id} className={cls}>
                <div className={styles.icon}>
                  {step.state === 'done' ? '✓' : def.num}
                </div>
                <div className={styles.body}>
                  <div className={styles.stepName}>{def.label}</div>
                  <div className={styles.stepDetail}>{step.detail}</div>
                  {step.state === 'active' && (
                    <div className={styles.bar}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <span>⚠</span>
          <div>{error}</div>
        </div>
      )}

      <div>
        <div className={styles.sectionTitle}>Log</div>
        <LogBox lines={logs} />
      </div>

    </div>
  )
}
