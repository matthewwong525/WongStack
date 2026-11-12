import { beforeEach, expect, test } from 'vitest';
import { boundedJson, reply } from './errors.mjs';
import { keysRoute, pasted, waitingKeys } from './sealed.mjs';

// Stripe is a project key; Ledger covers two secrets; setup makes the look-up key and Maps; Project code is the
// server's own; Shop is a tool that trades an ID and a secret.
const registry = {
  stripe: { title: 'Stripe', purpose: 'Payments', secrets: ['STRIPE_SECRET_KEY'] },
  ledger: { title: 'Ledger', purpose: 'Books', secrets: ['LEDGER_ID', 'LEDGER_KEY'] },
  cloudflare: { title: 'Cloudflare', purpose: 'Look-ups', secrets: ['WONG_CLOUDFLARE_READ'], levels: ['read'], setup: true },
  maps: { title: 'Maps', purpose: 'Maps', secrets: ['MAPS_KEY'], setup: true },
  code: { title: 'Project code', purpose: 'Code', secrets: ['WONG_CODE_READ'], alone: true },
  shop: { title: 'Shop', purpose: 'Store orders', secrets: ['TOOL_SHOP', 'TOOL_SHOP_ID'], chat: true },
};
const PUBLIC = 'made-up-public-key';
const sealed = { v: 1, wrapped: 'd3JhcHBlZA==', iv: 'aXY=', data: 'ZGF0YQ==' };
let store;
const send = (path, value = { sealed, ends: '9f2c' }, { method = 'PUT', live = true, sealing = { publicKey: PUBLIC } } = {}) => {
  const request = new Request(`https://app.example/api/access/keys/${path}`, { method, ...(method === 'PUT' && { body: JSON.stringify(value) }) });
  return keysRoute({ request, path: `keys/${path}`, pass: { actor: 'admin@example.com', live }, store, registry: Promise.resolve(registry),
    slots: { sealing }, json: limit => boundedJson(request, limit), reply, refuse: (code, status) => reply({ error: { code } }, status) });
};
const refusal = async response => [response.status, (await response.json()).error.code];

beforeEach(() => {
  const rows = new Map();
  store = { rows, async sealed() { return new Map([...rows].map(([name, row]) => [name, row.ends])); },
    async saveSealed(row) { if (store.broken) throw new Error('no table'); rows.set(row.name, row); } };
});

test('serves the public key, or says the app has no pair yet; no route reads a sent key back', async () => {
  expect(await (await send('seal', undefined, { method: 'GET' })).json()).toEqual({ publicKey: PUBLIC });
  expect(await refusal(await send('seal', undefined, { method: 'GET', sealing: null }))).toEqual([409, 'no_seal']);
  for (const method of ['GET', 'DELETE']) expect(await refusal(await send('STRIPE_SECRET_KEY', undefined, { method }))).toEqual([404, 'not_found']);
});

test('keeps only the sealed key, its last four and who sent it; a newer key replaces a waiting one', async () => {
  expect(await (await send('STRIPE_SECRET_KEY')).json()).toEqual({ name: 'STRIPE_SECRET_KEY', ends: '9f2c', waiting: true });
  expect(store.rows.get('STRIPE_SECRET_KEY')).toEqual({ name: 'STRIPE_SECRET_KEY', sealed: JSON.stringify(sealed), ends: '9f2c', actor: 'admin@example.com' });
  // A key named by its id and its place.
  expect(await (await send('stripe/0', { sealed, ends: 'ab12' })).json()).toEqual({ name: 'STRIPE_SECRET_KEY', ends: 'ab12', waiting: true });
  expect((await send('ledger/1')).status).toBe(200);
  expect((await send('TOOL_SHOP_ID')).status).toBe(200);
  expect(await waitingKeys(store)).toEqual(new Map([['STRIPE_SECRET_KEY', 'ab12'], ['LEDGER_KEY', '9f2c'], ['TOOL_SHOP_ID', '9f2c']]));
});

test('refuses a preview, an app with no pair, and any name but a key\'s own', async () => {
  expect(await refusal(await send('STRIPE_SECRET_KEY', undefined, { live: false }))).toEqual([409, 'live_only']);
  expect(await refusal(await send('STRIPE_SECRET_KEY', undefined, { sealing: null }))).toEqual([409, 'no_seal']);
  for (const path of ['WONG_CLOUDFLARE_READ', 'WONG_CODE_READ', 'CLOUDFLARE_API_TOKEN', 'MAPS_KEY', 'OTHER_KEY', 'stripe_secret_key',
    'maps/0', 'cloudflare/0', 'stripe/1', 'nobody/0', 'constructor/0', 'stripe/x']) {
    expect(await refusal(await send(path)), path).toEqual([400, 'bad_name']);
  }
  expect(store.rows.size).toBe(0);
});

test('refuses a body that is not one sealed key with its last four', async () => {
  for (const value of [{ sealed: 'plain-key-value', ends: 'alue' }, { sealed: { ...sealed, v: 2 }, ends: '9f2c' }, { sealed: { ...sealed, extra: 'x' }, ends: '9f2c' },
    { sealed: { ...sealed, data: 'not base64!' }, ends: '9f2c' }, { sealed, ends: '12345' }, { sealed, ends: '' }, { sealed, ends: '9f2c', value: 'x' }, null]) {
    expect(await refusal(await send('STRIPE_SECRET_KEY', value)), JSON.stringify(value)).toEqual([400, 'bad_key']);
  }
  expect(await refusal(await send('STRIPE_SECRET_KEY', { sealed: { ...sealed, data: 'A'.repeat(17_000) }, ends: '9f2c' }))).toEqual([413, 'json_body_too_large']);
  store.broken = true;
  expect(await refusal(await send('STRIPE_SECRET_KEY'))).toEqual([503, 'access_unavailable']);
});

test('a person sends a key\'s secrets unless setup makes it or the server\'s own route uses it', () => {
  expect([registry.stripe, registry.cloudflare, registry.code].map(pasted)).toEqual([true, false, false]);
});
