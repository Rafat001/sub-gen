import { useState } from 'react'
import Header from './components/Header'
import ConfigPanel from './components/ConfigPanel'
import ProgressPanel from './components/ProgressPanel'
import SrtResult from './components/SrtResult'
import EmptyState from './components/EmptyState'
import ServerStatus from './components/ServerStatus'
import { useServerStatus } from './hooks/useServerStatus'
import { usePipeline } from './hooks/usePipeline'
import { DEFAULT_SETTINGS } from './constants/languages'
import styles from './App.module.css'

export default function App() {
  const [file, setFile]         = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const { whisperStatus, translateStatus } = useServerStatus({
    whisperUrl:   settings.whisperUrl,
    translateUrl: settings.translateUrl,
  })

  const { running, steps, logs, error, result, started, run, download } = usePipeline()

  function handleRun() {
    if (!file || running) return
    run(file, settings)
  }

  return (
    <>
      <Header />

      <div className={styles.layout}>
        {/* Left — config */}
        <ConfigPanel
          file={file}
          settings={settings}
          onFile={setFile}
          onChange={setSettings}
          onRun={handleRun}
          running={running}
        />

        {/* Right — output */}
        <section className={styles.outputPanel}>
          {!started && !running && (
            <EmptyState />
          )}

          {(started || running) && (
            <ProgressPanel
              steps={steps}
              logs={logs}
              error={error}
            />
          )}

          {result && (
            <SrtResult result={result} onDownload={download} />
          )}
        </section>
      </div>

      <ServerStatus
        whisperStatus={whisperStatus}
        translateStatus={translateStatus}
      />
    </>
  )
}
