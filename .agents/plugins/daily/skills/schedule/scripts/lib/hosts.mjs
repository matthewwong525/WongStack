// Host receipts and the Paseo adapter, kept to read, pause and remove the schedules Paseo still runs; and the first
// message a scheduled chat opens with. Paseo uses only the public installed CLI.
import { findPaseo, paseo } from '../../../../scripts/lib/paseo.mjs';
import { credentialFree, requireValue, ScheduleError } from './records.mjs';

/** What a schedule may do, in the words the person approved. */
export function mayDo(authority = {}) {
  const leave = authority.actions?.length ? authority.actions.join(', ') : 'read and draft only';
  return `${leave}${authority.minIntervalMs ? `, at most once each ${Math.round(authority.minIntervalMs / 60000)} minutes` : ''}`;
}

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
const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/, RUN = /^[0-9a-f]{32}$/;
// Whole, never cut: the chat saves progress over the stored copy, and the end is approved text.
const oneLine = text => String(text).replace(/\s+/g, ' ').trim();

/** A scheduled chat's first message: the approved instructions word for word, so a leading `/skill` runs, then a
 *  footer naming the run. The caller passes only a schedule whose version it checked against the OK here. */
export function firstMessage({ schedule, run, progress = null }) {
  requireValue(KEY.test(schedule?.key ?? '') && RUN.test(run?.id ?? ''), 'A first message names a schedule key and a run id.');
  const finish = `node .agents/skills/daily/skills/schedule/scripts/schedule.mjs finish --key ${schedule.key} --run ${run.id}`;
  return [
    schedule.instructions,
    '',
    '---',
    // Not the name: the version leaves it out, so it is app text no OK covers.
    `Scheduled run ${run.id} of ${schedule.key}`,
    `May do: ${mayDo(schedule.authority)}; ask before any other step.`,
    ...(schedule.until ? [`Ends when: ${oneLine(schedule.until)}`] : []),
    `Progress: ${progress == null ? 'none yet' : JSON.stringify(progress)}`,
    'How a run works: .agents/skills/daily/skills/schedule/references/run.md',
    `When you stop: ${finish} [--progress <json file>] [--done <proof the end is met>]`,
  ].join('\n');
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

