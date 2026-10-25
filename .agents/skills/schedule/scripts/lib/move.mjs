// Moves a schedule from Paseo to the app host, one read-back step at a time, so the two are never both active.
// A failed step leaves Paseo paused and the record marked `move` pending; running move again picks up there.
import { checkpoint, ScheduleError, requireValue } from './records.mjs';
import { validateReceipt } from './hosts.mjs';

const verified = (receipt, host, action, nativeId) => {
  try { return validateReceipt(receipt, { host, action, nativeId }).outcome === 'verified'; } catch { return false; }
};
const pending = (step, message) => new ScheduleError(message, 1, { state: 'move-pending', step, paseo: 'paused' });

/** Pause in Paseo, create on the app, record the app binding, then delete in Paseo. */
export async function moveToApp(item, { paseo, app }) {
  let binding = item.binding;
  const from = binding.lifecycle.move?.from ?? binding.execution.nativeId;
  if (binding.execution.host !== 'app') {
    requireValue(binding.execution.host === 'paseo' && from, 'Only a schedule Paseo runs can move to the app.');
    requireValue(item.published && !['cancelled', 'completed', 'superseded'].includes(binding.lifecycle.state), 'Only a live, published schedule can move.');
    if (!verified(await paseo.pause(from), 'paseo', 'pause', from)) throw new ScheduleError('Paseo did not confirm the pause, so nothing moved.', 1, { state: binding.lifecycle.state });
    const resumeTo = binding.lifecycle.move?.resumeTo ?? (binding.lifecycle.state === 'paused' ? 'paused' : 'scheduled');
    item = checkpoint(item, { ...binding, lifecycle: { ...binding.lifecycle, state: 'paused', move: { from, step: 'paused', resumeTo } } });
    binding = item.binding;
    const target = { ...binding, execution: { ...binding.execution, host: 'app', nativeId: binding.key }, lifecycle: { ...binding.lifecycle, state: resumeTo } };
    if (!verified(await app.create(target, `move-${binding.key}`), 'app', 'create', binding.key)) throw pending('create', 'The app did not confirm the new schedule; Paseo stays paused.');
    if (resumeTo === 'paused' && !verified(await app.pause(binding.key), 'app', 'pause', binding.key)) throw pending('pause', 'The app did not confirm the pause; Paseo stays paused.');
    item = checkpoint(item, { ...target, lifecycle: { ...target.lifecycle, move: { from, step: 'created', resumeTo } } });
    binding = item.binding;
  }
  requireValue(binding.lifecycle.move?.from, 'This schedule already runs on the app.');
  if (!verified(await paseo.cancel(from), 'paseo', 'cancel', from)) throw pending('delete', 'The app runs it now, but Paseo did not confirm the delete; it stays paused there.');
  const { move: _done, ...lifecycle } = binding.lifecycle;
  item = checkpoint(item, { ...binding, lifecycle });
  return { state: 'moved', host: 'app', nativeId: binding.key, from };
}
