// Strict readback projections, not a provider runner or proof of live closure.
import { exactKeys, requireValue, opaqueId, digest, MemoryOperatorError } from './installation-validation.mjs';
import { canonicalMemoryValue } from './installation-resources.mjs';
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && !value.includes('\0');
const commit = value => digest(JSON.stringify(canonicalMemoryValue(value)));
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every(value => b.includes(value));
export const LEGACY_PROJECTION_BYTES = 128 * 1024;
const safeCodes = new Set(['invalid-input', 'operator-denied', 'provider-unavailable', 'target-mismatch', 'schema-unsupported',
 'installation-conflict', 'machine-operation-incomplete', 'machine-context-denied', 'machine-proof-denied', 'machine-store-unavailable',
 'machine-query-budget', 'capture-payload-too-large', 'migration-bundle-invalid', 'unreviewed-deployment',
 'legacy-read-unavailable', 'legacy-source-unavailable', 'legacy-history-unavailable', 'legacy-raw-unavailable',
 'legacy-destination-unavailable', 'legacy-closure-unavailable', 'legacy-readback-unavailable']);
export async function legacyReadback(call, code) {
 try { return await call(); } catch (error) {
  if (error instanceof MemoryOperatorError && safeCodes.has(error.code)) throw new MemoryOperatorError(error.code, error.retryable === true);
  throw new MemoryOperatorError(safeCodes.has(code) ? code : 'legacy-readback-unavailable');
 }
}
export function boundLegacyProjection(value) {
 let serialized;
 try { serialized = JSON.stringify(value); } catch { throw new MemoryOperatorError('legacy-projection-invalid'); }
 requireValue(typeof serialized === 'string' && new TextEncoder().encode(serialized).length <= LEGACY_PROJECTION_BYTES, 'legacy-projection-too-large');
}
export function validateLegacySource(source) {
 boundLegacyProjection(source);
 requireValue(Array.isArray(source.serving) && source.serving.length > 0 && source.serving.length <= 100
  && Array.isArray(source.credentials) && source.credentials.length <= 1000, 'legacy-closure-incomplete');
 for (const row of source.serving) {
  exactKeys(row, ['id', 'url', 'workerId', 'versionId', 'kind', 'bindingHash', 'methods', 'expectedClosure', 'replacementSourceHash']);
  requireValue(text(row.id) && /^[a-f0-9]{32}$/.test(row.workerId) && /^[a-f0-9-]{36}$/.test(row.versionId)
   && ['canonical', 'alias', 'preview', 'version'].includes(row.kind) && hash(row.bindingHash), 'legacy-closure-incomplete');
  requireValue(Array.isArray(row.methods) && row.methods.length > 0 && row.methods.length <= 4 && new Set(row.methods).size === row.methods.length
   && row.methods.every(method => ['GET', 'POST', 'PUT', 'DELETE'].includes(method))
   && ['route-disabled', 'closed-handler'].includes(row.expectedClosure)
   && (row.expectedClosure === 'closed-handler' ? hash(row.replacementSourceHash) : row.replacementSourceHash === null), 'legacy-closure-incomplete');
  let url; try { url = new URL(row.url); } catch { requireValue(false, 'legacy-closure-incomplete'); }
  requireValue(typeof row.url === 'string' && row.url.length <= 2048 && url.protocol === 'https:' && !url.username && !url.password
   && !url.search && !url.hash && !url.port && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'legacy-closure-incomplete');
 }
 for (const row of source.credentials) {
  exactKeys(row, ['id', 'kind', 'scopeHash', 'retirement', 'businessPermissionsHash']);
  requireValue(text(row.id) && ['memory-key', 'legacy-device', 'direct-provider', 'service-token'].includes(row.kind)
   && hash(row.scopeHash) && ['remove-key', 'revoke-token', 'replace-shared', 'revoke-device'].includes(row.retirement)
   && (row.businessPermissionsHash === null || hash(row.businessPermissionsHash)), 'legacy-closure-incomplete');
  requireValue(row.kind !== 'memory-key' || (hash(row.id) && row.retirement === 'remove-key'), 'legacy-closure-incomplete');
  requireValue(row.kind !== 'legacy-device' || (hash(row.id) && row.retirement === 'revoke-device'), 'legacy-closure-incomplete');
  requireValue(!['direct-provider', 'service-token'].includes(row.kind) || ['revoke-token', 'replace-shared'].includes(row.retirement), 'legacy-closure-incomplete');
  requireValue(row.retirement !== 'replace-shared' || row.businessPermissionsHash !== null, 'legacy-closure-incomplete');
 }
 requireValue(new Set(source.serving.map(row => row.id)).size === source.serving.length
  && new Set(source.serving.map(row => row.url)).size === source.serving.length
  && new Set(source.credentials.map(row => row.id)).size === source.credentials.length, 'legacy-closure-incomplete');
 if (source.bucket !== null) {
  exactKeys(source.bucket, ['name', 'publicAccessEnabled', 'publicOrigins', 'accessHash']);
  requireValue(text(source.bucket.name) && typeof source.bucket.publicAccessEnabled === 'boolean' && hash(source.bucket.accessHash)
   && Array.isArray(source.bucket.publicOrigins) && source.bucket.publicOrigins.length <= 100
   && new Set(source.bucket.publicOrigins).size === source.bucket.publicOrigins.length
   && (!source.bucket.publicAccessEnabled || source.bucket.publicOrigins.length > 0), 'legacy-bucket-unproven');
  for (const origin of source.bucket.publicOrigins) {
   let url; try { url = new URL(origin); } catch { requireValue(false, 'legacy-bucket-unproven'); }
   requireValue(typeof origin === 'string' && origin.length <= 200 && url.origin === origin && url.protocol === 'https:' && !url.port
    && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'legacy-bucket-unproven');
  }
 }
}
export async function inspectLegacyClosure(adapter, inventory, now = Math.floor(Date.now() / 1000)) {
 requireValue(typeof adapter?.inspectClosure === 'function', 'legacy-closure-adapter-required');
 requireValue(inventory && hash(inventory.inventoryHash) && hash(inventory.targetHash) && inventory.source && inventory.target, 'legacy-inventory-unproven');
 const readback = await legacyReadback(() => adapter.inspectClosure({ target: inventory.target, inventoryHash: inventory.inventoryHash }), 'legacy-closure-unavailable');
 boundLegacyProjection(readback);
 exactKeys(readback, ['targetHash', 'inventoryHash', 'observationId', 'observedAt', 'revisionHash', 'coverage', 'serving', 'credentials', 'bucket', 'probes']);
 requireValue(readback.targetHash === inventory.targetHash && readback.inventoryHash === inventory.inventoryHash && opaqueId(readback.observationId)
  && hash(readback.revisionHash) && Number.isSafeInteger(now) && Number.isSafeInteger(readback.observedAt)
  && readback.observedAt <= now && now - readback.observedAt <= 120, 'legacy-closure-stale');
 exactKeys(readback.coverage, ['workers', 'versions', 'routes', 'credentials', 'bucketOrigins']);
 for (const [kind, coverage] of Object.entries(readback.coverage)) {
  exactKeys(coverage, ['accountId', 'queryHash', 'pages', 'ids']);
  requireValue(coverage.accountId === inventory.target.accountId && hash(coverage.queryHash) && Array.isArray(coverage.ids)
   && coverage.ids.length <= 1000 && coverage.ids.every(text) && new Set(coverage.ids).size === coverage.ids.length
   && Array.isArray(coverage.pages) && coverage.pages.length > 0 && coverage.pages.length <= 100, 'legacy-closure-incomplete');
  let count = 0;
  for (const [index, page] of coverage.pages.entries()) {
   exactKeys(page, ['page', 'count', 'readbackHash', 'nextPage']);
   requireValue(page.page === index + 1 && Number.isSafeInteger(page.count) && page.count >= 0 && page.count <= 1000 && hash(page.readbackHash)
    && page.nextPage === (index + 1 === coverage.pages.length ? null : index + 2), 'legacy-closure-incomplete'); count += page.count;
  }
  requireValue(count === coverage.ids.length, 'legacy-closure-incomplete');
  const expectedIds = kind === 'workers' ? [...new Set(inventory.source.serving.map(row => row.workerId))]
   : kind === 'versions' ? [...new Set(inventory.source.serving.map(row => row.workerId + ':' + row.versionId))]
    : kind === 'routes' ? inventory.source.serving.map(row => row.id) : kind === 'credentials' ? inventory.source.credentials.map(row => row.id)
     : inventory.source.bucket?.publicOrigins ?? [];
  requireValue(sameSet(coverage.ids, expectedIds), 'legacy-closure-incomplete');
 }
 for (const name of ['serving', 'credentials', 'probes']) requireValue(Array.isArray(readback[name]) && readback[name].length <= 1000, 'legacy-closure-incomplete');
 requireValue(sameSet(readback.serving.map(row => row.id), inventory.source.serving.map(row => row.id))
  && sameSet(readback.credentials.map(row => row.id), inventory.source.credentials.map(row => row.id)), 'legacy-closure-incomplete');
 for (const row of readback.serving) {
  exactKeys(row, ['id', 'inventoryBindingHash', 'closedBindingHash', 'revisionHash', 'readbackHash', 'closureKind', 'routeEnabled', 'legacyServing', 'handlerSourceHash']);
  const original = inventory.source.serving.find(value => value.id === row.id);
  requireValue(row.inventoryBindingHash === original.bindingHash && hash(row.closedBindingHash) && hash(row.readbackHash)
   && row.revisionHash === readback.revisionHash && row.closureKind === original.expectedClosure && row.legacyServing === false
   && (row.closureKind === 'route-disabled' ? row.routeEnabled === false && row.handlerSourceHash === null
    : row.routeEnabled === true && row.handlerSourceHash === original.replacementSourceHash), 'legacy-closure-incomplete');
 }
 for (const row of readback.credentials) {
  exactKeys(row, ['id', 'originalScopeHash', 'state', 'readbackHash', 'replacementPermissionsHash', 'directMemoryStatus', 'directMemoryProbeHash']);
  const original = inventory.source.credentials.find(value => value.id === row.id);
  requireValue(row.originalScopeHash === original.scopeHash && row.state === 'retired' && hash(row.readbackHash)
   && row.replacementPermissionsHash === original.businessPermissionsHash
   && (original.kind === 'direct-provider' ? [401, 403, 404].includes(row.directMemoryStatus) && hash(row.directMemoryProbeHash)
    : row.directMemoryStatus === null && row.directMemoryProbeHash === null), 'legacy-closure-incomplete');
 }
 if (inventory.source.bucket === null) requireValue(readback.bucket === null, 'legacy-bucket-unproven');
 else {
  exactKeys(readback.bucket, ['name', 'originalAccessHash', 'publicAccessEnabled', 'closedOrigins', 'readbackHash', 'revisionHash']);
  requireValue(readback.bucket.name === inventory.target.bucketName && readback.bucket.originalAccessHash === inventory.source.bucket.accessHash
   && readback.bucket.publicAccessEnabled === false && hash(readback.bucket.readbackHash) && readback.bucket.revisionHash === readback.revisionHash
   && Array.isArray(readback.bucket.closedOrigins) && sameSet(readback.bucket.closedOrigins, inventory.source.bucket.publicOrigins), 'legacy-bucket-unproven');
 }
 // Every exact former credential identity, method and endpoint is covered;
 // one sampled credential cannot stand in for another. Secrets stay in the adapter.
 const credentials = ['anonymous', ...inventory.source.credentials.map(row => row.id)];
 const expected = [...inventory.source.serving.flatMap(row => row.methods.flatMap(method => credentials.map(credentialId => JSON.stringify([row.id, method, credentialId])))),
  ...(inventory.source.bucket?.publicOrigins ?? []).map(origin => JSON.stringify([origin, 'GET', 'anonymous']))];
 requireValue(expected.length <= 1000 && sameSet(readback.probes.map(row => JSON.stringify([row.endpointId, row.method, row.credentialId])), expected), 'legacy-closure-incomplete');
 for (const row of readback.probes) {
  exactKeys(row, ['endpointId', 'method', 'credentialId', 'status', 'redirected', 'memoryReturned', 'requestHash', 'responseHash', 'revisionHash']);
  requireValue([401, 403, 404].includes(row.status) && row.redirected === false && row.memoryReturned === false
   && hash(row.requestHash) && hash(row.responseHash) && row.revisionHash === readback.revisionHash, 'legacy-closure-incomplete');
 }
 return { status: 'review-only', inventoryHash: inventory.inventoryHash, closureHash: await commit(readback),
  observationId: readback.observationId, observedAt: readback.observedAt, revisionHash: readback.revisionHash };
}
