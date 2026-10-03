// Separate D1 and trusted-provider capabilities. Neither context is a public result.
import { resourceTarget, requireValue, MemoryOperatorError } from '../scripts/lib/installation-validation.mjs';
const contexts = new WeakMap();
export function publicMachineContext(db, installation) {
  const target = resourceTarget(installation, true);
  requireValue(typeof db?.prepare === 'function' && typeof db?.batch === 'function', 'machine-context-denied');
  const context = Object.freeze({ kind: 'machine-d1' });
  contexts.set(context, { target, installation: Object.freeze({ ...installation }),
    read: async (sql, params = []) => {
      try {
        const result = await db.prepare(sql).bind(...params).all();
        requireValue(result?.success === true && Array.isArray(result.results), 'machine-store-unavailable');
        return result.results;
      } catch { throw new MemoryOperatorError('machine-store-unavailable'); }
    },
    write: async statements => {
      try {
        const result = await db.batch(statements.map(row => db.prepare(row.sql).bind(...row.params)));
        requireValue(Array.isArray(result) && result.length === statements.length && result.every(row => row?.success === true), 'machine-store-unavailable');
      } catch { throw new MemoryOperatorError('machine-store-unavailable'); }
    } });
  return context;
}
// Only the trusted operator module supplies this separately verified in-process capability.
export function providerMachineContext(installation, read, write, inspectPins, readMigration) {
  const target = resourceTarget(installation, true);
  requireValue([read, write, inspectPins, readMigration].every(value => typeof value === 'function'), 'machine-context-denied');
  const context = Object.freeze({ kind: 'trusted-machine-operator' });
  contexts.set(context, { target, installation: Object.freeze({ ...installation }), read, write, inspectPins, readMigration });
  return context;
}
export function runtimeContext(context, privileged = false) {
  const value = contexts.get(context);
  requireValue(value && (!privileged || context.kind === 'trusted-machine-operator'), 'machine-context-denied');
  return value;
}
