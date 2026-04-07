import { useEffect, useRef } from 'react'
import styles from './LogBox.module.css'

/**
 * Scrolling terminal-style log panel.
 * @param {{ lines: Array<{ msg: string, type: string, time: string }> }} props
 */
export default function LogBox({ lines }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className={styles.box}>
      {lines.map((line, i) => (
        <div key={i} className={`${styles.line} ${styles[line.type] || ''}`}>
          <span className={styles.time}>{line.time}</span>
          <span className={styles.msg}>{line.msg}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
