export const need = (condition, message, status = 409) => { if (!condition) throw Object.assign(new Error(message), { status }); };
export const shaOK = value => /^[a-f0-9]{40}$/.test(value || '');
export const uuidOK = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value || '');
export function refName(value) {
  need(typeof value === 'string' && /^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._/-]{0,180}$/.test(value) && !value.includes('..') && !value.endsWith('/') && !value.includes('//'), 'Invalid branch');
  return value.slice(11);
}
export function https(value) {
  const url = new URL(value);
  need(url.protocol === 'https:' && !url.username && !url.password && !url.hash && !url.search, 'Invalid HTTPS endpoint');
  return url.href.replace(/\/$/, '');
}
export const randomToken = () => 'wongh_' + Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
export async function digest(value) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
export const from64 = text => { need(typeof text === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text), 'Invalid base64'); return Uint8Array.from(atob(text), x => x.charCodeAt(0)); };
export const to64 = bytes => { let out = ''; for (let i = 0; i < bytes.length; i += 8192) out += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(out); };
export function safePath(path) {
  need(typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') && path.length < 4096 && !/[\\\u0000-\u001f]/.test(path), 'Invalid site path', 400);
  const decoded = decodeURIComponent(path.split('?')[0]);
  need(!decoded.includes('..') && !decoded.startsWith('//') && !decoded.includes('\\') && !decoded.startsWith('/_memory/') && !decoded.startsWith('/__wongstack/'), 'Restricted site path', 400);
  return path;
}
export function siteHeaders(input = {}) {
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'if-none-match', 'if-modified-since', 'range']) {
    const value = input[name];
    if (typeof value === 'string' && value.length <= 2048 && !/[\r\n]/.test(value)) headers.set(name, value);
  }
  return headers;
}
export function publicCandidate(c) {
  return { sha: c.sha, ref: c.ref, status: c.status, checks: c.checks, previewUrl: c.previewUrl, attempts: c.attempts, failure: c.failure };
}
export const reply = (value, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
