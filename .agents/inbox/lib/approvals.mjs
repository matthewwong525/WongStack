// This computer's OKs: which version of each schedule a person approved here. Only schedule.mjs writes it, after the
// person's OK in a chat; the app is never asked what is approved. wiki/stack/host-schedules.md
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { helperFiles } from '../../skills/reply-link/scripts/lib/computer.mjs';
import { signIn } from '../../memory/d1/connect.mjs';

const VERSION = /^[a-f0-9]{64}$/;

/** `~/.wong-stack/helper/approved.json`, beside the helper's run ledger. */
export const approvalsFile = (env = process.env) => join(helperFiles(env).dir, 'approved.json');

/** One approval's name: the app, the person and the schedule, so two people on one computer never share an OK. */
export function approvalKey({ origin, email, key }) {
  if (!origin || !email || !key) throw new Error('An approval needs the app, the person and the schedule.');
  return `${new URL(origin).origin}:${String(email).trim().toLowerCase()}:${key}`;
}

/** Every approval on this computer; an unreadable file counts as none, so nothing runs. */
export function readApprovals(env = process.env) {
  try {
    const kept = JSON.parse(readFileSync(approvalsFile(env), 'utf8'));
    return kept && typeof kept === 'object' && !Array.isArray(kept) ? kept : {};
  } catch { return {}; }
}

/** The version this person approved for this schedule here, or null. */
export function approvedVersion(who, env = process.env) {
  const kept = readApprovals(env)[approvalKey(who)];
  return VERSION.test(kept?.version ?? '') ? kept.version : null;
}

/** Notes `version` as approved for this person and schedule: written whole to a new file, then moved in place. */
export function approve({ origin, email, key, version, now = Date.now() }, env = process.env) {
  if (!VERSION.test(version ?? '')) throw new Error('An approval needs the schedule version it approves.');
  const file = approvalsFile(env), kept = readApprovals(env);
  kept[approvalKey({ origin, email, key })] = { version, at: new Date(now).toISOString() };
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const draft = `${file}.${process.pid}.tmp`;
  writeFileSync(draft, `${JSON.stringify(kept, null, 2)}\n`, { mode: 0o600 });
  renameSync(draft, file);
  return kept[approvalKey({ origin, email, key })];
}

/** The email the company sign-in for `origin` names, lowercased, or null: never an email the app's answer gives. */
export function signedInAs(origin, read = signIn) {
  const found = read(origin);
  return found?.email && ['valid', 'near'].includes(found.state) ? found.email.trim().toLowerCase() : null;
}
