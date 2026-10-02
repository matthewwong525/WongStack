import { need, shaOK } from './security.mjs';
const ZERO = '0'.repeat(40);
const encoder = new TextEncoder();
export const packet = text => (encoder.encode(text).length + 4).toString(16).padStart(4, '0') + text;
export function packets(bytes) {
  const text = typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes);
  need(text.length <= 65536, 'Git protocol response exceeds bound');
  const rows = []; let offset = 0;
  while (offset < text.length) {
    const header = text.slice(offset, offset + 4);
    need(/^[a-f0-9]{4}$/.test(header), 'Unreadable Git packet length');
    const length = parseInt(header, 16); offset += 4;
    if (length === 0) continue;
    need(length >= 4 && offset + length - 4 <= text.length, 'Truncated Git packet');
    rows.push(text.slice(offset, offset + length - 4)); offset += length - 4;
  }
  return rows;
}
export async function proveAncestry(provider, project, base, sha) {
  need(shaOK(sha) && (base === null || shaOK(base)), 'Exact Git ancestry identities required');
  // Use linked parent evidence, never date/topological ordering from the history listing.
  const queue = [sha], visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    need(visited.size < 512, 'Git ancestry exceeds finite history bound; operator review required');
    visited.add(current);
    const commit = await provider.request(provider.artifact(`${provider.repo(project)}/commit/${current}`));
    need(commit?.hash === current && Array.isArray(commit.parents) && commit.parents.every(shaOK), 'Git commit parent evidence unreadable');
    if (base === null || current === base) return;
    for (const parent of commit.parents) if (!visited.has(parent) && !queue.includes(parent)) queue.push(parent);
    need(queue.length + visited.size <= 512, 'Git ancestry exceeds finite history bound; operator review required');
  }
  throw new Error('Approved commit is not a fast-forward from main');
}
export async function advanceDefault(provider, state, sha, base, checkpoint) {
  const current = await provider.mainHead(state);
  if (current === sha) return { defaultRef: 'refs/heads/main', defaultSha: sha };
  need(current === base, 'Default branch changed during publication');
  await proveAncestry(provider, state, base, sha);
  const credential = await provider.gitToken(state, 'write');
  state.publication.gitCredential = { id: credential.id, expiresAt: credential.expiresAt, revoked: false }; await checkpoint();
  try {
    const headers = { Authorization: `Bearer ${credential.token}` };
    const advertised = await provider.fetcher(`${state.gitUrl}/info/refs?service=git-receive-pack`, { headers, redirect: 'manual' });
    need(advertised.ok && advertised.headers.get('Content-Type')?.startsWith('application/x-git-receive-pack-advertisement'), 'Git push advertisement unreadable');
    const rows = packets(await advertised.text());
    need(rows[0] === '# service=git-receive-pack\n' && rows.some(row => row.includes('\0') && row.split('\0')[1].split(/\s+/).includes('report-status')), 'Git server has no report-status capability');
    const main = rows.find(row => /^[a-f0-9]{40} refs\/heads\/main(?:\0|\n|$)/.test(row));
    need((main ? main.slice(0, 40) : null) === base, 'Default branch advertisement changed');
    const command = encoder.encode(packet(`${base || ZERO} ${sha} refs/heads/main\0report-status\n`) + '0000');
    const emptyPack = Uint8Array.from([80, 65, 67, 75, 0, 0, 0, 2, 0, 0, 0, 0]);
    const checksum = new Uint8Array(await crypto.subtle.digest('SHA-1', emptyPack));
    const body = new Uint8Array(command.length + emptyPack.length + checksum.length);
    body.set(command); body.set(emptyPack, command.length); body.set(checksum, command.length + emptyPack.length);
    const response = await provider.fetcher(`${state.gitUrl}/git-receive-pack`, { method: 'POST', redirect: 'manual', headers: { ...headers, 'Content-Type': 'application/x-git-receive-pack-request', Accept: 'application/x-git-receive-pack-result' }, body });
    need(response.ok && response.headers.get('Content-Type')?.startsWith('application/x-git-receive-pack-result'), 'Git update acknowledgment unreadable; reservation retained');
    const result = packets(await response.text());
    need(result.includes('unpack ok\n') && result.includes('ok refs/heads/main\n') && !result.some(row => row.startsWith('ng ') || row.startsWith('ERR ')), 'Default branch update refused; reservation retained');
    need(await provider.mainHead(state) === sha, 'Default branch readback does not match approved commit');
    return { defaultRef: 'refs/heads/main', defaultSha: sha };
  } finally {
    await provider.revoke(state, credential.id);
    state.publication.gitCredential.revoked = true; await checkpoint();
  }
}
