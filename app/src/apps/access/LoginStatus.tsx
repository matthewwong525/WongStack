import type { Status } from '../../lib/access'
import { CopyText } from '../../components/CopyText'

export const privateInstructions = `Finish Access setup using your own business app login and an independently verified owner record. Follow wiki/stack/employee-access.md in the installed project. Configure the private owner pins and a separate Access-only login-management credential through the private key link, never chat. Run employee-owner-setup identity, activate, prepare, connect and reviewed rollout as that guide describes. Repository access and memory setup remain separate. Do not change production authority from a preview.`
export function LoginStatus({ status, pending, onRetry, onConnect }: { status: Status; pending: boolean; onRetry: () => void; onConnect: () => void }) {
  const connection = status.connections[0]
  return <section aria-label="Login management">
    <h2>Login management</h2>
    <p>App permissions: {status.policyEnabled ? 'Enabled' : 'Owner setup required'}</p>
    <p>Connection: {connection?.status ?? 'Not connected'}</p>
    <ul>{status.work.map(work => <li key={work.kind}>
      {work.kind === 'policy' ? 'Email policy' : 'Session removal'}: {work.status}{work.outcome && ` · ${work.outcome}`}{work.error_code && ' · Retry needed'}
    </li>)}</ul>
    {status.policyWrites.some(write => write.status !== 'completed') && <p>A previous login-policy change has an uncertain outcome. Ask the operator to verify it before calling removal complete.</p>}
    <div className="access-actions">
      <button type="button" disabled={pending} onClick={onRetry}>Retry login changes</button>
      <button type="button" disabled={pending} onClick={onConnect}>Connect login management</button>
    </div>
    <CopyText text={privateInstructions} label="Copy private setup instructions" />
    <p>{status.limits}</p>
  </section>
}
