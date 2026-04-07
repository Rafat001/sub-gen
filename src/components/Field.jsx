import styles from './Field.module.css'

/**
 * A labeled form field wrapper with optional hint text.
 * Children should be an <input>, <select>, or similar.
 */
export default function Field({ label, hint, children }) {
  return (
    <div className={styles.field}>
      {label && <label className={styles.label}>{label}</label>}
      {children}
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
