// Node-free operator primitives: provider errors and private inputs never enter result messages.
export class MemoryOperatorError extends Error {
  constructor(code, retryable = false) {
    super(code);
    this.name = 'MemoryOperatorError';
    this.code = code;
    this.retryable = retryable;
  }
}
export function requireValue(condition, code = 'invalid-input') {
  if (!condition) throw new MemoryOperatorError(code);
}
export function exactKeys(value, keys) {
  requireValue(value && typeof value === 'object' && !Array.isArray(value));
  requireValue(Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key)));
}
const named = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
export const opaqueId = value => named(value) && value.length >= 32;
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export function canonicalOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new MemoryOperatorError('invalid-input'); }
  requireValue(typeof value === 'string' && url.protocol === 'https:' && url.origin === value && !url.username && !url.password && !url.port);
  requireValue(!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  return value;
}
export function resourceTarget(input, pinned = false) {
  const keys = ['accountId', 'databaseId', 'bucketName', 'appWorkerName', 'memoryWorkerName', 'appUrl', 'memoryOrigin'];
  exactKeys(input, pinned ? [...keys, 'installationId', 'repositoryId'] : keys);
  requireValue(typeof input.accountId === 'string' && /^[a-f0-9]{32}$/.test(input.accountId) && uuid(input.databaseId));
  requireValue(input.bucketName === null || (typeof input.bucketName === 'string' && /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(input.bucketName)));
  for (const key of ['appWorkerName', 'memoryWorkerName']) requireValue(typeof input[key] === 'string' && /^[a-z0-9][a-z0-9-]{0,62}$/.test(input[key]));
  canonicalOrigin(input.appUrl); canonicalOrigin(input.memoryOrigin);
  if (input.appUrl === input.memoryOrigin) requireValue(input.appWorkerName === input.memoryWorkerName);
  if (pinned) requireValue(opaqueId(input.installationId) && opaqueId(input.repositoryId));
  return Object.fromEntries(keys.map(key => [key, input[key]]));
}
export function accessConfiguration(value) {
  if (value === null) return null;
  exactKeys(value, ['providerConfigurationId', 'issuer', 'audience', 'appApplicationId', 'memoryApplicationId']);
  requireValue(named(value.providerConfigurationId) && named(value.audience) && named(value.appApplicationId) && named(value.memoryApplicationId));
  requireValue(typeof value.issuer === 'string' && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(value.issuer));
  return Object.fromEntries(['providerConfigurationId', 'issuer', 'audience', 'appApplicationId', 'memoryApplicationId'].map(key => [key, value[key]]));
}
export function ownerEmail(value) {
  requireValue(typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
  return value.trim().toLowerCase();
}
export async function digest(value) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function providerCall(operator, method, path, body) {
  requireValue(typeof operator?.cloudflare === 'function');
  try { return await operator.cloudflare(method, path, body); }
  catch (error) {
    if ([401, 403].includes(error?.status)) throw new MemoryOperatorError('operator-denied');
    if (error?.status === 404) throw new MemoryOperatorError('target-mismatch');
    throw new MemoryOperatorError('provider-unavailable', true);
  }
}
export async function query(operator, target, statements) {
  const result = await providerCall(operator, 'POST', `/accounts/${target.accountId}/d1/database/${target.databaseId}/query`,
    Array.isArray(statements) ? { batch: statements } : statements);
  requireValue(Array.isArray(result) && result.length > 0 && result.every(row => row?.success === true), 'provider-unavailable');
  return result;
}
export async function rows(operator, target, sql, params = []) {
  const result = await query(operator, target, { sql, params });
  requireValue(result.length === 1 && Array.isArray(result[0].results) &&
    result[0].results.every(row => row && typeof row === 'object' && !Array.isArray(row)), 'provider-unavailable');
  return result[0].results;
}
