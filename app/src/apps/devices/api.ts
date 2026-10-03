import { belongsTo, canApprove, canManage, canReview, parseDevice, parseList, parseRequest, parseSession, reference, type Device, type RequestDetail, type Session } from './model'

const root = '/api/memory-auth/'
export function failureStatus(error: unknown): 'unavailable' | 'failed' {
  return error instanceof Error && error.message === 'unavailable' ? 'unavailable' : 'failed'
}
// All responses, including mutations, must be canonical no-store JSON projections.
// No public machine endpoints are called from the browser. CSRF stays in memory.
async function send(path: string, signal: AbortSignal, session?: Session, body?: object): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(root + path, {
      method: session ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      redirect: 'error', referrerPolicy: 'no-referrer', signal,
      headers: session ? { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken! } : { Accept: 'application/json' },
      ...(session ? { body: JSON.stringify(body) } : {}),
    })
  } catch { throw new Error('failed') }
  if ([401, 403, 404, 405, 410, 503].includes(response.status)) throw new Error('unavailable')
  if (!response.ok) throw new Error('failed')
  if (response.redirected || response.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json' || !response.headers.get('Cache-Control')?.split(',').map((part) => part.trim()).includes('no-store')) throw new Error('unavailable')
  try { return await response.json() } catch { throw new Error('unavailable') }
}
function checkedObject<T extends RequestDetail | Device>(session: Session, value: T): T {
  if (!belongsTo(session, value)) throw new Error('unavailable')
  return value
}
function sameScopes(first: RequestDetail['scopes'], second: RequestDetail['scopes']): boolean {
  return first.length === second.length && first.every((scope) => second.includes(scope))
}
export async function loadSession(signal: AbortSignal): Promise<Session> {
  return parseSession(await send('session', signal))
}
export async function loadRequests(session: Session, signal: AbortSignal): Promise<RequestDetail[]> {
  return parseList(await send('requests', signal), parseRequest).map((item) => {
    if (item.principalId !== session.principalId) throw new Error('unavailable')
    return checkedObject(session, item)
  })
}
export async function loadDevices(session: Session, signal: AbortSignal): Promise<Device[]> {
  return parseList(await send('devices', signal), parseDevice).map((item) => checkedObject(session, item))
}
export async function loadRequest(session: Session, id: string, signal: AbortSignal): Promise<RequestDetail> {
  if (!reference(id)) throw new Error('unavailable')
  const result = checkedObject(session, parseRequest(await send(`requests/${id}`, signal)))
  if (result.id !== id) throw new Error('unavailable')
  return result
}
export async function decide(session: Session, request: RequestDetail, decision: 'approve' | 'deny', signal: AbortSignal): Promise<RequestDetail> {
  if (!(decision === 'approve' ? canApprove(session, request) : canReview(session, request))) throw new Error('unavailable')
  const result = checkedObject(session, parseRequest(await send(`requests/${request.id}/${decision}`, signal, session,
    { code: request.code, scopes: request.scopes })))
  if (result.id !== request.id || result.code !== request.code || !sameScopes(result.scopes, request.scopes) ||
    (decision === 'approve' ? result.status !== 'approved' && result.status !== 'claimed' : result.status !== 'denied')) throw new Error('unavailable')
  return result
}
export async function revoke(session: Session, device: Device, signal: AbortSignal): Promise<Device> {
  if (!canManage(session) || !belongsTo(session, device) || device.status !== 'connected') throw new Error('unavailable')
  const result = checkedObject(session, parseDevice(await send(`devices/${device.id}/revoke`, signal, session, {})))
  if (result.id !== device.id || !sameScopes(result.scopes, device.scopes) || result.status !== 'revoked') throw new Error('unavailable')
  return result
}
