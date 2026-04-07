import { useState, useRef } from 'react'
import styles from './DropZone.module.css'

function fmtBytes(b) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return (b / 1e3).toFixed(0) + ' KB'
}

/**
 * File drop zone. Calls onFile(File) when a file is selected or dropped.
 * Shows file info below when a file is loaded.
 */
export default function DropZone({ onFile, selectedFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer?.files?.[0]
    if (f) onFile(f)
  }

  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }

  return (
    <div>
      <div
        className={`${styles.zone} ${dragging ? styles.dragging : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,audio/*"
          className={styles.input}
          onChange={handleChange}
        />
        <span className={styles.icon}>🎬</span>
        <div className={styles.label}>
          <strong>Drop file or click to browse</strong>
          Any video or audio file from your computer
        </div>
        <div className={styles.formats}>
          MP4 · MKV · MOV · AVI · WEBM · MP3 · WAV · M4A
        </div>
      </div>

      {selectedFile && (
        <div className={styles.fileInfo}>
          <div className={styles.fileName}>{selectedFile.name}</div>
          <div className={styles.fileMeta}>
            {fmtBytes(selectedFile.size)} · {selectedFile.type || 'unknown type'}
          </div>
        </div>
      )}
    </div>
  )
}
