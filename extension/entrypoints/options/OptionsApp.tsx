import * as React from "react"

import { TrackerMark } from "../../components/TrackerMark"
import { disconnectTracker, requestTracker } from "../../lib/messaging"
import { connectionStorage, diagnosticsStorage, normalizeTrackerUrl } from "../../lib/storage"
import type { DiagnosticEvent } from "../../lib/types"

const DEFAULT_TRACKER_URL = "https://way2more.vercel.app"

export function OptionsApp() {
  const [trackerUrl, setTrackerUrl] = React.useState(DEFAULT_TRACKER_URL)
  const [token, setToken] = React.useState("")
  const [connectedName, setConnectedName] = React.useState("")
  const [diagnostics, setDiagnostics] = React.useState<DiagnosticEvent[]>([])
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    void Promise.all([connectionStorage.getValue(), diagnosticsStorage.getValue()]).then(([connection, events]) => {
      if (connection) {
        setTrackerUrl(connection.trackerUrl)
        setToken(connection.token)
        setConnectedName("Connected")
      }
      setDiagnostics(events)
    })
  }, [])

  async function testAndSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const connection = { trackerUrl: normalizeTrackerUrl(trackerUrl), token: token.trim() }
      if (!/^wat_[A-Za-z0-9_-]{40,}$/.test(connection.token)) {
        throw new Error("Paste a valid extension access token from Tracker Settings.")
      }
      const result = await requestTracker({ type: "test" }, connection)
      if (result.status !== "connected") throw new Error("The tracker did not confirm the connection.")
      await connectionStorage.setValue(connection)
      setTrackerUrl(connection.trackerUrl)
      setConnectedName(result.tokenName)
    } catch (caught) {
      setConnectedName("")
      setError(caught instanceof Error ? caught.message : "Could not connect to the tracker.")
    } finally {
      setPending(false)
    }
  }

  async function disconnect() {
    await disconnectTracker()
    setTrackerUrl(DEFAULT_TRACKER_URL)
    setToken("")
    setConnectedName("")
    setDiagnostics([])
    setError("")
  }

  async function clearDiagnostics() {
    await diagnosticsStorage.removeValue()
    setDiagnostics([])
  }

  async function copyDiagnostics() {
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2))
  }

  return (
    <main className="page">
      <div className="brand">
        <span className="brand-mark"><TrackerMark /></span>
        <div><p>Way2More</p><h1>LinkedIn Capture</h1></div>
      </div>
      <p className="lead">
        Connect this Chrome profile to your application tracker. The token stays in device-local extension storage and is sent only to the configured tracker URL.
      </p>

      <section className="card" aria-labelledby="connection-title">
        <h2 id="connection-title">Connect Tracker</h2>
        <p>Create a named extension token in Way2More Settings, then test it before saving.</p>
        <form className="form" onSubmit={testAndSave}>
          <label className="field">
            <span>Tracker URL</span>
            <input type="url" required value={trackerUrl} onChange={(event) => setTrackerUrl(event.target.value)} />
          </label>
          <label className="field">
            <span>Extension access token</span>
            <input type="password" required autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="wat_…" />
          </label>
          <div className="actions">
            <button type="submit" className="button" disabled={pending}>{pending ? "Testing…" : "Test connection and save"}</button>
            <a className="button secondary" href={`${trackerUrl || DEFAULT_TRACKER_URL}/app/settings`} target="_blank" rel="noreferrer">Open Tracker Settings</a>
            {connectedName ? <button type="button" className="button secondary danger" onClick={() => void disconnect()}>Disconnect</button> : null}
          </div>
        </form>
        {connectedName ? <p role="status" className="status">Connected as “{connectedName}”. You can start capturing LinkedIn jobs.</p> : null}
        {error ? <p role="alert" className="error">{error}</p> : null}
      </section>

      <section className="card" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Permissions and privacy</h2>
        <p>
          The extension reads only LinkedIn job pages after you open them. It sends a reviewed capture only when you press Add to Tracker and never reads LinkedIn messages, contacts, credentials, or unrelated browsing.
        </p>
        <p className="small">Disconnecting clears the stored tracker connection and diagnostics from this Chrome profile. Revoke the named token in Tracker Settings as well.</p>
      </section>

      <section className="card" aria-labelledby="diagnostics-title">
        <h2 id="diagnostics-title">Local diagnostics</h2>
        <p>Up to 100 sanitized events are kept for seven days. Job descriptions and tokens are never logged.</p>
        <pre className="diagnostics">{diagnostics.length ? JSON.stringify(diagnostics, null, 2) : "No diagnostic events."}</pre>
        <div className="actions">
          <button type="button" className="button secondary" disabled={!diagnostics.length} onClick={() => void copyDiagnostics()}>Copy diagnostics</button>
          <button type="button" className="button secondary" disabled={!diagnostics.length} onClick={() => void clearDiagnostics()}>Clear diagnostics</button>
        </div>
      </section>
    </main>
  )
}
