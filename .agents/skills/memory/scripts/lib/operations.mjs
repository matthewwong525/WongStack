// Dependency-free serializable operation envelopes shared by discovery clients.
export const MAX_SUMMARIES = 50;
export function selectOperations(operations, { q = '', app, limit = 20, offset = 0 } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SUMMARIES || !Number.isInteger(offset) || offset < 0 || q.length > 200) throw new Error('Invalid catalogue filter');
  const ids = new Set();
  for (const operation of operations) {
    if (ids.has(operation.operationId)) throw new Error('Operation ID collision');
    ids.add(operation.operationId);
  }
  const matches = operations.filter(item => (!app || item.app === app) && `${item.operationId} ${item.summary} ${item.description || ''}`.toLowerCase().includes(q.toLowerCase()));
  return { total: matches.length, offset, next: offset + limit < matches.length ? offset + limit : null,
    actions: matches.slice(offset, offset + limit).map(({ operationId, summary, effect, readiness, revision, source, transport, authentication, app }) =>
      ({ operationId, summary, effect, readiness, revision, source, transport, authentication, app })) };
}

// Do not fetch a reference supplied by a remote document. Local definitions are inline.
export function refuseExternalReferences(value) {
  if (Array.isArray(value)) { for (const item of value) refuseExternalReferences(item); }
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && (typeof item !== 'string' || !item.startsWith('#/'))) throw new Error('Untrusted operation description');
    refuseExternalReferences(item);
  }
  return value;
}

export function parseOperationInput(text) {
  try { return JSON.parse(text); } catch { throw new Error('Invalid JSON input; use a JSON file or stdin'); }
}
