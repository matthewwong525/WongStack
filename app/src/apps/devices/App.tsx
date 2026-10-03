import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { decide, failureStatus, loadDevices, loadRequest, loadRequests, loadSession, revoke } from './api'
import { canApprove, canManage, canReview, displayDate, reference, scopeLabels, type Device, type RequestDetail, type Session } from './model'
import './Devices.css'

type Data = { session: Session; requests: RequestDetail[]; devices: Device[]; request: RequestDetail | null }
type Page = { status: 'loading' | 'unavailable' | 'failed' } | { status: 'loaded'; data: Data }
const terminal = { expired: 'Request expired', denied: 'Denied', revoked: 'Revoked' }
const deviceStatus = { connected: 'Connected', expired: 'Expired', revoked: 'Revoked', reauthorize: 'Approval needed' }

function Permissions({ scopes }: { scopes: RequestDetail['scopes'] }) {
  return <p className="devices-scope">{scopes.map((scope) => scopeLabels[scope]).join(' · ')}</p>
}
function Details() {
  return <details className="devices-details"><summary>Access details</summary><p>Credentials last 30 days. Approve again within 90 days.</p><p>Signing out leaves approved computers connected.</p></details>
}
function PendingSetup({ session }: { session: Session }) {
  if (session.status === 'pending-owner') return <section aria-labelledby="devices-setup"><h2 id="devices-setup">Owner setup pending</h2>
    {session.ownerCandidate && Date.parse(session.ownerCandidate.expiresAt) > Date.now() ? <><p className="devices-code">{session.ownerCandidate.code}</p><p>Confirm this code with your installation operator.</p><p className="devices-muted">Until {displayDate(session.ownerCandidate.expiresAt)}</p></> : <p>Ask your installation operator to finish setup.</p>}
  </section>
  return <section><h2>{session.status === 'unlinked' ? 'Login needs review' : 'Memory access removed'}</h2><p>Ask your owner to review your access.</p></section>
}

export function App() {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const initialReference = query.get('request')
  const invalidNavigation = (location.pathname !== '/apps/devices/' && location.pathname !== '/apps/devices') ||
    [...query.keys()].some((key) => key !== 'request') || query.getAll('request').length > 1 ||
    (initialReference !== null && reference(initialReference) === null) || location.hash !== ''
  // A safe request reference is tab-local. Never persist login or CSRF material.
  const [selection, setSelection] = useState({ navigation: initialReference, selected: reference(initialReference) })
  const selected = selection.navigation === initialReference ? selection.selected : reference(initialReference)
  const setSelected = (value: string | null) => setSelection({ navigation: initialReference, selected: value })
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState<Page>({ status: 'loading' })
  const [matched, setMatched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [confirmDevice, setConfirmDevice] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const [clockRevision, setClockRevision] = useState(0)
  const work = useRef<AbortController | null>(null)

  useEffect(() => {
    if (page.status !== 'loaded') return
    const { session, request } = page.data
    const now = Date.now()
    const deadline = Math.min(...[session.csrfExpiresAt, session.ownerCandidate?.expiresAt, request?.expiresAt]
      .flatMap((value) => value && Date.parse(value) > now ? [Date.parse(value)] : []))
    if (!Number.isFinite(deadline)) return
    // Cap timers at the browser's supported delay.
    const timer = window.setTimeout(() => setClockRevision((value) => value + 1), Math.min(deadline - now, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [page, clockRevision])

  useEffect(() => {
    const controller = new AbortController()
    work.current = controller
    setPage({ status: 'loading' })
    setMatched(false)
    setBusy(false)
    setActionError('')
    setConfirmDevice(null)
    setCopied('')
    const load = async () => {
      try {
        if (invalidNavigation) throw new Error('unavailable')
        const session = await loadSession(controller.signal)
        if (controller.signal.aborted) return
        let data: Data = { session, requests: [], devices: [], request: null }
        if (session.status === 'active') {
          const [requests, devices, request] = await Promise.all([
            loadRequests(session, controller.signal), loadDevices(session, controller.signal),
            selected ? loadRequest(session, selected, controller.signal) : Promise.resolve(null),
          ])
          data = { session, requests, devices, request }
        }
        if (!controller.signal.aborted) setPage({ status: 'loaded', data })
      } catch (error) {
        if (!controller.signal.aborted) setPage({ status: failureStatus(error) })
      }
    }
    void load()
    return () => controller.abort()
  }, [selected, revision, invalidNavigation])

  const refresh = () => setRevision((value) => value + 1)
  const act = async (operation: (signal: AbortSignal) => Promise<Data>) => {
    const controller = work.current!
    setBusy(true)
    setActionError('')
    try {
      const data = await operation(controller.signal)
      if (!controller.signal.aborted) { setPage({ status: 'loaded', data }); setConfirmDevice(null); setMatched(false) }
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
  const { session, request, devices, requests } = data
  const choose = (item: RequestDetail) => { setSelected(item.id) }
  const connectedCount = devices.filter((device) => device.status === 'connected').length
  const approveAllowed = request !== null && canApprove(session, request)
  const decision = (item: RequestDetail, value: 'approve' | 'deny') => {
    void act(async (signal) => ({ ...data, request: await decide(session, item, value, signal) }))
  }

  return <div className="devices">{title}
    <p className="devices-account">As {session.email} <span className="devices-muted">· {session.installationName}</span></p>
    {session.status !== 'active' ? <PendingSetup session={session} /> : <>
      {request ? <section aria-labelledby="devices-request-title" className="devices-request">
        <button type="button" className="devices-back" onClick={() => setSelected(null)} disabled={busy}>← All devices</button>
        <h2 id="devices-request-title">{request.status === 'pending' && Date.parse(request.expiresAt) > Date.now() ? `Connect ${request.label}?` : request.label}</h2>
        {request.status === 'pending' ? <>
          {Date.parse(request.expiresAt) <= Date.now() ? <><p role="status">Request expired</p><p>Start a new request in chat.</p></> : <>
            <p className="devices-code">{request.code}</p><p>Match this code in chat.</p>
            <Permissions scopes={request.scopes} /><p className="devices-muted">Until {displayDate(request.expiresAt)} · Name supplied by requester</p>
            {approveAllowed ? <><label className="devices-match"><input type="checkbox" checked={matched} disabled={busy} onChange={(event) => setMatched(event.target.checked)} /> My request; code matches</label>
              <div className="devices-actions"><button type="button" className="devices-primary" disabled={!matched || busy} onClick={() => decision(request, 'approve')}>{busy ? 'Confirming…' : 'Approve'}</button><button type="button" disabled={busy} onClick={() => decision(request, 'deny')}>Deny</button></div>
            </> : <><p role="status">Approval unavailable. Check your access or refresh.</p>{canReview(session, request) && <button type="button" disabled={busy} onClick={() => decision(request, 'deny')}>Deny</button>}</>}
            <Details />
          </>}
        </> : request.status === 'approved' ? <><p role="status">Waiting for computer</p><button type="button" onClick={refresh} disabled={busy}>Check connection</button></> : request.status === 'claimed' ? <p role="status">Connected</p> : <><p role="status">{terminal[request.status]}</p><p>Start a new request in chat.</p></>}
      </section> : <>
        {requests.length > 0 && <section aria-labelledby="devices-pending"><h2 id="devices-pending">Requests</h2><ul className="devices-list">{requests.map((item) => <li key={item.id}><button type="button" onClick={() => choose(item)}>{item.label} · Review</button></li>)}</ul></section>}
        <section aria-labelledby="devices-connected"><h2 id="devices-connected">Your computers</h2>
          {devices.length === 0 ? <p>No computers connected.</p> : <ul className="devices-list">{devices.map((device) => <li key={device.id} className="devices-row">
            <div className="devices-row-heading"><strong>{device.label}</strong><span>{deviceStatus[device.status]}</span></div>
            <p className="devices-muted">{device.lastUsedAt ? `Used ${displayDate(device.lastUsedAt)}` : 'Not used yet'}</p>
            <p className="devices-muted">Approve again by {displayDate(device.reauthorizeAt)}</p>
            <details className="devices-details"><summary>Access details</summary><Permissions scopes={device.scopes} /><p>Credential expires {displayDate(device.expiresAt)}</p></details>
            {device.status === 'connected' && canManage(session) && (confirmDevice === device.id ? <div className="devices-confirm">
              <h3>Revoke {device.label}?</h3><p>Memory access will stop.</p><div className="devices-actions"><button type="button" className="devices-primary" disabled={busy} onClick={() => { void act(async (signal) => { const result = await revoke(session, device, signal); return { ...data, devices: devices.map((item) => item.id === result.id ? result : item) } }) }}>{busy ? 'Revoking…' : 'Revoke'}</button><button type="button" disabled={busy} onClick={() => setConfirmDevice(null)}>Cancel</button></div>
            </div> : <button type="button" disabled={busy} onClick={() => setConfirmDevice(device.id)}>Revoke {device.label}</button>)}
            {device.status !== 'connected' && <p>Start a new request in chat.</p>}
          </li>)}</ul>}
          {connectedCount >= 10 && <p>Ten computers connected. Revoke one before adding another.</p>}
          <button type="button" className={devices.length === 0 ? 'devices-primary' : undefined} disabled={busy} onClick={() => { void copy() }}>Copy connection request</button><p role="status">{copied}</p>
        </section>
        <Details />
      </>}
      <p className="devices-error" role="alert">{actionError}</p>
      <button type="button" className="devices-refresh" onClick={refresh} disabled={busy}>Refresh</button>
    </>}
  </div>
}
