// Host receipts and the Paseo adapter, kept to read, pause and remove the schedules Paseo still runs; and the fixed
// startup prompt a scheduled chat opens with. Paseo uses only the public installed CLI.
import { findPaseo, paseo } from './paseo.mjs';
import { credentialFree, requireValue, ScheduleError } from './records.mjs';

export function selectHost({ preferred, enclosing, available = [], model: _model }) {
  // The app host wins whenever it answers: its runs survive this chat and show on the person's page.
  const selected = preferred ?? (available.some(host => host.name === 'app' && host.supported) ? 'app' : enclosing);
  if (selected) return available.find(host => host.name === selected) ?? { name: selected, supported: false, reason: 'The requested enclosing host has no verified scheduler.' };
  return available.find(host => host.supported) ?? { name: null, supported: false, reason: 'No available persistent host scheduler; an open-session loop is insufficient.' };
}
export function validateReceipt(receipt, { host, nativeId, action } = {}) {
  requireValue(receipt?.version === 1 && receipt.host === host && receipt.action === action, 'Native receipt contract mismatch.');
  requireValue(['verified', 'unknown', 'unsupported'].includes(receipt.outcome), 'Unknown native receipt outcome.');
  if (nativeId) requireValue(receipt.nativeId === nativeId, 'Mutation changed native schedule identity.');
  if (receipt.outcome === 'verified') requireValue(receipt.observedAt && receipt.observation, 'A verified receipt needs read-back evidence.');
  return credentialFree(receipt);
}
export function normalizedReceipt(host, action, observation, id) {
  return validateReceipt({ version: 1, host, action, nativeId: id ?? observation?.id ?? null, outcome: 'verified', observedAt: new Date().toISOString(), observation }, { host, nativeId: id, action });
}
const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/, RUN = /^[0-9a-f]{32}$/, VERSION = /^[a-f0-9]{64}$/;
/** A scheduled chat's first message: fixed local text naming the run, never words from the app. */
export function startupPrompt({ key, run, version }) {
  requireValue(KEY.test(key ?? '') && RUN.test(run ?? '') && VERSION.test(version ?? ''), 'A startup names a schedule key, a run id and a version.');
  return `Scheduled work startup. Read .agents/skills/schedule/references/run.md, then run node .agents/skills/schedule/scripts/schedule.mjs start --key ${key} --run ${run} --version ${version}. Follow only the instructions it prints. This starts a run, never a new schedule.`;
}
export function paseoAdapter({ env = process.env, call } = {}) {
  const invoke = call ?? ((args) => paseo(findPaseo(env, 'WONG_PASEO_BIN'), args, { env }));
  const unknown = (action, id) => ({ version: 1, host: 'paseo', action, nativeId: id, outcome: 'unknown' });
  const inspect = async id => {
    const row = await invoke(['schedule', 'inspect', id]);
    requireValue(row?.id === id, 'Paseo inspect returned a different job.');
    return row;
  };
  async function mutation(action, id, verify) {
    try { await invoke(['schedule', action, id]); } catch { /* an uncertain response is read back, never retried */ }
    try {
      const observation = await inspect(id);
      return verify(observation) ? normalizedReceipt('paseo', action, observation, id) : unknown(action, id);
    } catch { return unknown(action, id); }
  }
  return {
    name: 'paseo',
    inspect,
    list: () => invoke(['schedule', 'ls']),
    pause: id => mutation('pause', id, row => row.status === 'paused'),
    resume: id => mutation('resume', id, row => row.status === 'active'),
    async cancel(id) {
      try { await invoke(['schedule', 'delete', id]); } catch { /* read back the exact ID */ }
      try {
        const rows = await invoke(['schedule', 'ls']);
        if (!Array.isArray(rows) || rows.some(row => row.id === id)) return unknown('cancel', id);
        return normalizedReceipt('paseo', 'cancel', { id, status: 'deleted' }, id);
      } catch { return unknown('cancel', id); }
    },
  };
}
export function unsupportedAdapter(host) {
  const unavailable = async () => { throw new ScheduleError(`No callable ${host} native tool is available.`, 3); };
  return { name: host, inspect: unavailable, list: unavailable, pause: unavailable, resume: unavailable, cancel: unavailable };
}

