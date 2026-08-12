import * as React from "react"
import { browser } from "wxt/browser"

import { TrackerMark } from "../../components/TrackerMark"
import { openCaptureInTab } from "../../lib/messaging"
import { connectionStorage } from "../../lib/storage"
import type { TrackerConnection } from "../../lib/types"

export function PopupApp() {
  const [connection, setConnection] = React.useState<TrackerConnection | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    void connectionStorage.getValue().then((value) => {
      setConnection(value)
      setLoading(false)
    })
  }, [])

  async function captureCurrentJob() {
    setError("")
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url?.startsWith("https://www.linkedin.com/jobs/")) {
      setError("Open a LinkedIn job page or job-search result first.")
      return
    }
    try {
      await openCaptureInTab(tab.id)
      window.close()
    } catch {
      setError("Reload the LinkedIn tab, then try again.")
    }
  }

  return (
    <main className="popup">
      <div className="brand">
        <span className="brand-mark"><TrackerMark /></span>
        <div><p>Way2More</p><h1>LinkedIn Capture</h1></div>
      </div>

      {loading ? <p className="lead">Loading connection…</p> : connection ? (
        <>
          <div className="connection"><span className="dot" />Connected to {new URL(connection.trackerUrl).host}</div>
          <div className="actions">
            <button type="button" className="button" onClick={() => void captureCurrentJob()}>Capture current LinkedIn job</button>
            <a className="button secondary" href={`${connection.trackerUrl}/app/applications`} target="_blank" rel="noreferrer">Open applications</a>
            <button type="button" className="button secondary" onClick={() => void browser.runtime.openOptionsPage()}>Extension settings</button>
          </div>
        </>
      ) : (
        <>
          <p className="lead">Connect this extension to Way2More before capturing a job.</p>
          <button type="button" className="button" onClick={() => void browser.runtime.openOptionsPage()}>Connect Tracker</button>
        </>
      )}
      {error ? <p role="alert" className="error">{error}</p> : null}
    </main>
  )
}
