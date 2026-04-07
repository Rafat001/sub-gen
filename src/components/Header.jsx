import styles from './Header.module.css'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        LiveSubs<span className={styles.dim}>.offline</span>
      </div>
      <div className={styles.badge}>SRT Generator</div>
    </header>
  )
}
