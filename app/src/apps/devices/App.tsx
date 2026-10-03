import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { decide, failureStatus, loadDevices, loadRequest, loadRequests, loadSession, revoke } from './api'
import { canApprove, canManage, canReview, displayDate, reference, scopeLabels, type Device, type RequestDetail, type Session } from './model'
import './Devices.css'

type Data = { session: Session; requests: RequestDetail[]; devices: Device[]; request: RequestDetail | null }
type Page = { status: 'loading' | 'unavailable' | 'failed' } | { status: 'loaded'; data: Data }
type Navigation = { selected: string | null; invalid: boolean }
type Act = (operation: (signal: AbortSignal) => Promise<Data>) => Promise<void>
const terminal = { expired: 'Request expired', denied: 'Denied', revoked: 'Revoked' }
const deviceStatus = { connected: 'Connected', expired: 'Expired', revoked: 'Revoked', reauthorize: 'Approval needed' }

function Permissions({ scopes }: { scopes: RequestDetail['scopes'] }) {
  return <p className="devices-scope">{scopes.map((scope) => scopeLabels[scope]).join(' · ')}</p>
}
function Details() {
  return <details className="devices-details"><summary>Access details</summary><p>Credentials last 30 days. Approve again within 90 days.</p><p>Signing out leaves approved computers connected.</p></details>
}
function PendingSetup({ session, now }: { session: Session; now: number }) {
  if (session.status === 'pending-owner') return <section aria-labelledby="devices-setup"><h2 id="devices-setup">Owner setup pending</h2>
    {session.ownerCandidate && Date.parse(session.ownerCandidate.expiresAt) > now ? <><p className="devices-code">{session.ownerCandidate.code}</p><p>Confirm this code with your installation operator.</p><p className="devices-muted">Until {displayDate(session.ownerCandidate.expiresAt)}</p></> : <p>Ask your installation operator to finish setup.</p>}
  </section>
  return <section><h2>{session.status === 'unlinked' ? 'Login needs review' : 'Memory access removed'}</h2><p>Ask your owner to review your access.</p></section>
}

function RequestView({ data, request, now, busy, act, back, refresh }: {
  data: Data; request: RequestDetail; now: number; busy: boolean; act: Act; back: () => void; refresh: () => void
}) {
  const [matched, setMatched] = useState(false)
  const pending = request.status === 'pending'
  const expired = Date.parse(request.expiresAt) <= now
  const decision = (value: 'approve' | 'deny') => {
    void act(async (signal) => ({ ...data, request: await decide(data.session, request, value, signal) }))
  }
  return <section aria-labelledby="devices-request-title" className="devices-request">
    <button type="button" className="devices-back" onClick={back} disabled={busy}>← All devices</button>
    <h2 id="devices-request-title">{pending && !expired ? `Connect ${request.label}?` : request.label}</h2>
    {request.status === 'pending' ? <>
      {expired ? <><p role="status">Request expired</p><p>Start a new request in chat.</p></> : <>
        <p className="devices-code">{request.code}</p><p>Match this code in chat.</p>
        <Permissions scopes={request.scopes} /><p className="devices-muted">Until {displayDate(request.expiresAt)} · Name supplied by requester</p>
        {canApprove(data.session, request, now) ? <><label className="devices-match"><input type="checkbox" checked={matched} disabled={busy} onChange={(event) => setMatched(event.target.checked)} /> My request; code matches</label>
          <div className="devices-actions"><button type="button" className="devices-primary" disabled={!matched || busy} onClick={() => decision('approve')}>{busy ? 'Confirming…' : 'Approve'}</button><button type="button" disabled={busy} onClick={() => decision('deny')}>Deny</button></div>
        </> : <><p role="status">Approval unavailable. Check your access or refresh.</p>{canReview(data.session, request, now) && <button type="button" disabled={busy} onClick={() => decision('deny')}>Deny</button>}</>}
        <Details />
      </>}
    </> : request.status === 'approved' ? <><p role="status">Waiting for computer</p><button type="button" onClick={refresh} disabled={busy}>Check connection</button></> : request.status === 'claimed' ? <p role="status">Connected</p> : <><p role="status">{terminal[request.status]}</p><p>Start a new request in chat.</p></>}
  </section>
}

function DeviceRow({ data, device, now, busy, act, confirming, setConfirming }: {
  data: Data; device: Device; now: number; busy: boolean; act: Act; confirming: boolean; setConfirming: (value: boolean) => void
}) {
  const confirm = () => {
    void act(async (signal) => {
      const result = await revoke(data.session, device, signal)
      return { ...data, devices: data.devices.map((item) => item.id === result.id ? result : item) }
    })
  }
  return <li className="devices-row">
    <div className="devices-row-heading"><strong>{device.label}</strong><span>{deviceStatus[device.status]}</span></div>
    <p className="devices-muted">{device.lastUsedAt ? `Used ${displayDate(device.lastUsedAt)}` : 'Not used yet'}</p>
    <p className="devices-muted">Approve again by {displayDate(device.reauthorizeAt)}</p>
    <details className="devices-details"><summary>Access details</summary><Permissions scopes={device.scopes} /><p>Credential expires {displayDate(device.expiresAt)}</p></details>
    {device.status === 'connected' && canManage(data.session, now) && (confirming ? <div className="devices-confirm">
      <h3>Revoke {device.label}?</h3><p>Memory access will stop.</p><div className="devices-actions"><button type="button" className="devices-primary" disabled={busy} onClick={confirm}>{busy ? 'Revoking…' : 'Revoke'}</button><button type="button" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button></div>
    </div> : <button type="button" disabled={busy} onClick={() => setConfirming(true)}>Revoke {device.label}</button>)}
    {device.status !== 'connected' && <p>Start a new request in chat.</p>}
  </li>
}

function DeviceList({ data, now, busy, act, choose, copy, copied }: {
  data: Data; now: number; busy: boolean; act: Act; choose: (value: string | null) => void; copy: () => Promise<void>; copied: string
}) {
  const [confirmDevice, setConfirmDevice] = useState<string | null>(null)
  const { devices, requests } = data
  const connectedCount = devices.filter((device) => device.status === 'connected').length
  return <>
    {requests.length > 0 && <section aria-labelledby="devices-pending"><h2 id="devices-pending">Requests</h2><ul className="devices-list">{requests.map((item) => <li key={item.id}><button type="button" onClick={() => choose(item.id)} disabled={busy}>{item.label} · Review</button></li>)}</ul></section>}
    <section aria-labelledby="devices-connected"><h2 id="devices-connected">Your computers</h2>
      {devices.length === 0 ? <p>No computers connected.</p> : <ul className="devices-list">{devices.map((device) => <DeviceRow key={device.id} data={data} device={device} now={now} busy={busy} act={act} confirming={confirmDevice === device.id} setConfirming={(value) => setConfirmDevice(value ? device.id : null)} />)}</ul>}
      {connectedCount >= 10 && <p>Ten computers connected. Revoke one before adding another.</p>}
      <button type="button" className={devices.length === 0 ? 'devices-primary' : undefined} disabled={busy} onClick={() => { void copy() }}>Copy connection request</button><p role="status">{copied}</p>
    </section>
    <Details />
  </>
}

async function loadData({ selected, invalid }: Navigation, signal: AbortSignal): Promise<Data> {
  if (invalid) throw new Error('unavailable')
  const session = await loadSession(signal)
  if (signal.aborted || session.status !== 'active') return { session, requests: [], devices: [], request: null }
  const [requests, devices, request] = await Promise.all([
    loadRequests(session, signal), loadDevices(session, signal), selected ? loadRequest(session, selected, signal) : Promise.resolve(null),
  ])
  return { session, requests, devices, request }
}

function Screen({ selected, invalid, choose, refresh }: Navigation & { choose: (value: string | null) => void; refresh: () => void }) {
  const [page, setPage] = useState<Page>({ status: 'loading' })
  const [now, setNow] = useState(() => Date.now())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [copied, setCopied] = useState('')
  const work = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    work.current = controller
    const load = async () => {
      try {
        const data = await loadData({ selected, invalid }, controller.signal)
        if (!controller.signal.aborted) { setNow(Date.now()); setPage({ status: 'loaded', data }) }
      } catch (error) {
        if (!controller.signal.aborted) setPage({ status: failureStatus(error) })
      }
    }
    void load()
    return () => controller.abort()
  }, [selected, invalid])

  useEffect(() => {
    if (page.status !== 'loaded') return
    const { session, request } = page.data
    const current = Date.now()
    const deadline = Math.min(...[session.csrfExpiresAt, session.ownerCandidate?.expiresAt, request?.expiresAt]
      .flatMap((value) => value && Date.parse(value) > now ? [Date.parse(value)] : []))
    if (!Number.isFinite(deadline)) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(Math.max(deadline - current, 0), 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [page, now])

  const act = async (operation: (signal: AbortSignal) => Promise<Data>) => {
    const controller = work.current!
    setBusy(true)
    setActionError('')
    try {
      const data = await operation(controller.signal)
      if (!controller.signal.aborted) { setNow(Date.now()); setPage({ status: 'loaded', data }) }
    } catch {
      if (!controller.signal.aborted) setActionError('Could not confirm the change. Try again.')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  const copy = async () => {
    const controller = work.current!
    try {
      await navigator.clipboard.writeText(`Connect this computer to memory at ${window.location.origin}. Show me the Devices link and matching code.`)
      if (!controller.signal.aborted) setCopied('Copied. Paste in chat.')
    } catch {
      if (!controller.signal.aborted) setCopied('Could not copy. Ask in chat to connect this computer.')
    }
  }

  const title = <h1 className="devices-title">Devices</h1>
  if (page.status !== 'loaded') return <div className="devices">{title}
    <p role="status">{page.status === 'loading' ? 'Checking devices…' : page.status === 'unavailable' ? 'Devices unavailable here.' : 'Could not load devices.'}</p>
    {page.status === 'unavailable' && <p className="devices-muted">Check your app address and sign-in.</p>}
    {page.status !== 'loading' && <button type="button" onClick={refresh}>Try again</button>}
  </div>
  const { data } = page
  const { session, request } = data
  return <div className="devices">{title}
    <p className="devices-account">As {session.email} <span className="devices-muted">· {session.installationName}</span></p>
    {session.status !== 'active' ? <PendingSetup session={session} now={now} /> : <>
      {request ? <RequestView data={data} request={request} now={now} busy={busy} act={act} back={() => choose(null)} refresh={refresh} /> : <DeviceList data={data} now={now} busy={busy} act={act} choose={choose} copy={copy} copied={copied} />}
      <p className="devices-error" role="alert">{actionError}</p>
      <button type="button" className="devices-refresh" onClick={refresh} disabled={busy}>Refresh</button>
    </>}
  </div>
}

function DevicesNavigation({ selected: initial, invalid }: Navigation) {
  const [selected, setSelected] = useState(initial)
  const [revision, setRevision] = useState(0)
  return <Screen key={`${selected}:${revision}:${invalid}`} selected={selected} invalid={invalid} choose={setSelected} refresh={() => setRevision((value) => value + 1)} />
}

export function App() {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const selected = query.get('request')
  const invalid = (location.pathname !== '/apps/devices/' && location.pathname !== '/apps/devices') ||
    [...query.keys()].some((key) => key !== 'request') || query.getAll('request').length > 1 ||
    (selected !== null && reference(selected) === null) || location.hash !== ''
  // Navigation resets tab-local selection; each load starts with fresh screen state.
  return <DevicesNavigation key={`${location.pathname}${location.search}${location.hash}`} selected={reference(selected)} invalid={invalid} />
}
