// Optional metadata from the app's already verified login. A marker authorizes
// association only, and is consumed atomically by the authenticated app branch.
import { hashKey } from './memory-worker.mjs';

const MARKER = /^wongl_[A-Za-z0-9_-]{43}$/;
const timestamp = () => new Date().toISOString();
const json = (status, result) => new Response(JSON.stringify({ success: status === 200, result }), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export function loginMarker() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `wongl_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export async function issueLoginLink(db, grant, request) {
  const marker = loginMarker();
  const expires = new Date(Date.now() + 24 * 3600000).toISOString();
  const row = await db.prepare('UPDATE memory_keys SET login_link_hash = ?, login_link_expires_at = ? WHERE hash = ? AND (expires_at IS NULL OR expires_at > ?) RETURNING machine_id')
    .bind(await hashKey(marker), expires, grant.hash, timestamp()).first();
  if (!row) return json(401, null);
  const url = new URL('/', request.url);
  url.searchParams.set('memory_login_link', marker);
  return json(200, { url: url.href });
}

export async function associateLogin(db, marker, identity) {
  if (!db || !MARKER.test(marker || '') || identity?.kind !== 'user') return false;
  const { iss, sub, email } = identity.claims || {};
  if (typeof iss !== 'string' || !iss || typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) return false;
  const hash = await hashKey(marker);
  const linked = JSON.stringify({ issuer: iss, subject: sub, email, linkedAt: timestamp() });
  // Only the verified same subject may revisit a link. Expiry, revocation and
  // one-use consumption are part of this write, including concurrent returns.
  const row = await db.prepare(`UPDATE memory_keys SET login_identity = ?, login_link_hash = NULL, login_link_expires_at = NULL
    WHERE login_link_hash = ? AND machine_id IS NOT NULL AND login_link_expires_at > ?
      AND (expires_at IS NULL OR expires_at > ?)
      AND (login_identity IS NULL OR (json_extract(login_identity, '$.issuer') = ? AND json_extract(login_identity, '$.subject') = ?))
    RETURNING machine_id`).bind(linked, hash, timestamp(), timestamp(), iss, sub).first();
  return Boolean(row);
}
