// Stands in for the app's inbox in a script run as a child: with inboxEnv() in its environment, the company helper
// resolves to a client that logs each inbox call to FAKE_INBOX_LOG and answers it, never reaching an app.
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { register } from 'node:module';
import { isMainThread } from 'node:worker_threads';

if (isMainThread && process.env.FAKE_INBOX_LOG) register(import.meta.url);

/** The loader hook: `scripts/company-api.mjs` resolves to this file. */
export async function resolve(specifier, context, next) {
  return specifier.endsWith('/scripts/company-api.mjs') ? { url: import.meta.url, shortCircuit: true } : next(specifier, context);
}

/** A client whose every call succeeds; FAKE_INBOX_STATUS answers each with that status instead, and FAKE_INBOX_HANG
 * holds the call open until the real helper's 20 s limit, as a stalled app does. */
export function companyClient() {
  return {
    target: () => 'https://app.example.com',
    http: async (path, init) => {
      appendFileSync(process.env.FAKE_INBOX_LOG, `${JSON.stringify({ route: path.replace('/apps/inbox/api/', ''), body: JSON.parse(init.body ?? 'null') })}\n`);
      if (process.env.FAKE_INBOX_HANG) return new Promise((_, fail) => setTimeout(fail, 20_000, new Error('timed out')));
      const status = Number(process.env.FAKE_INBOX_STATUS) || 200;
      return { status, value: status === 200 ? { items: [], taps: [] } : null };
    },
  };
}

/** The environment that fakes the inbox for a child, logging to `log`. */
export const inboxEnv = (log, { hang = false, status } = {}) => ({ NODE_OPTIONS: `--import=${import.meta.url}`, FAKE_INBOX_LOG: log,
  FAKE_INBOX_HANG: hang ? '1' : '', FAKE_INBOX_STATUS: status ? String(status) : '' });
/** Each inbox call the children made, oldest first. */
export const inboxCalls = log => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
