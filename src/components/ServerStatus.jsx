import styles from './ServerStatus.module.css'

const STATUS_LABELS = {
  checking: 'checking…',
  loading:  'loading model…',
  online:   'online',
  offline:  'offline',
}

const DOT_CLASS = {
  checking: '',
  loading:  styles.loading,
  online:   styles.online,
  offline:  styles.offline,
}

/**
 * A single server status pill: coloured dot + label.
 */
function StatusPill({ name, status }) {
  return (
    <div className={styles.pill}>
      <div className={`${styles.dot} ${DOT_CLASS[status] || ''}`} />
      <span>
        {name}: <span className={styles.statusText}>{STATUS_LABELS[status] || status}</span>
      </span>
    </div>
  )
}

/**
 * Footer row showing Whisper and LibreTranslate status.
 */
export default function ServerStatus({ whisperStatus, translateStatus }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.copy}>
        LiveSubs Offline — fully local, no data leaves your machine
      </div>
      <div className={styles.statuses}>
        <StatusPill name="Whisper" status={whisperStatus} />
        <StatusPill name="LibreTranslate" status={translateStatus} />
      </div>
    </footer>
  )
}
