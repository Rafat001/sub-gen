import styles from './EmptyState.module.css'

export default function EmptyState() {
  return (
    <div className={styles.wrap}>
      <div className={styles.icon}>🎙</div>
      <div className={styles.title}>No file selected</div>
      <div className={styles.sub}>
        Drop a video or audio file on the left, configure your settings,
        then click Generate SRT.
      </div>
    </div>
  )
}
