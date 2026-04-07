import styles from './Toggle.module.css'

/**
 * A labelled toggle switch.
 * @param {{ label: string, sub?: string, checked: boolean, onChange: (v: boolean) => void }} props
 */
export default function Toggle({ label, sub, checked, onChange }) {
  return (
    <div className={styles.row}>
      <div>
        <div className={styles.label}>{label}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
      <label className={styles.switch}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className={styles.slider} />
      </label>
    </div>
  )
}
