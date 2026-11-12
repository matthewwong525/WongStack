import { expect, test } from 'vitest';
import { servicesRoute } from './services.mjs';

// Stripe is used directly and has a guide, the bank key is not, Docs is a public service with no key, and Project
// code is the server's own key, never listed.
const registry = {
  stripe: { title: 'Stripe', purpose: 'Payments and refunds', docs: 'https://docs.stripe.example/api', secrets: ['STRIPE_SECRET_KEY'],
    forward: { base: 'https://api.stripe.example/', secret: 'STRIPE_SECRET_KEY', header: 'Authorization', prefix: 'Bearer ' } },
  bank: { title: 'Bank', purpose: 'Balances and transfers', secrets: ['BANK_SECRET'], levels: ['read'] },
  docs: { title: 'Docs', purpose: 'Public docs', docs: 'https://docs.example/', secrets: [], forward: { base: 'https://docs.example/api/' } },
  code: { title: 'Project code', purpose: "This project's own code", secrets: ['WONG_CODE_READ'], alone: true },
};
const owner = { email: 'owner@example.com', subject: 'owner' };
const values = { STRIPE_SECRET_KEY: 'stripe-secret-value' };
const list = ({ caller = owner, query = '', policy = { state: 'not_started', role: 'owner' }, saved = values, headers = {}, method = 'GET', refusal = null, leaks } = {}) =>
  servicesRoute({ request: new Request(`https://app.example/api/services${query}`, { method, headers }), caller, policy, refusal, registry,
    secret: name => saved[name], leaks });
const held = keys => ({ state: 'current', role: 'member', keys: new Map(Object.entries(keys)) });

test('lists each key the caller holds a level for, with what it is for and whether it is saved, and counts the rest', async () => {
  const listed = await (await list()).json();
  expect(listed).toEqual({ revision: expect.stringMatching(/^[0-9a-f]{64}$/), needAccess: 0, services: [
    { id: 'bank', name: 'Bank', purpose: 'Balances and transfers', ready: false, level: 'read', direct: false },
    { id: 'docs', name: 'Docs', purpose: 'Public docs', docs: 'https://docs.example/', ready: true, level: 'write', direct: true },
    { id: 'stripe', name: 'Stripe', purpose: 'Payments and refunds', docs: 'https://docs.stripe.example/api', ready: true, level: 'write', direct: true },
  ] });
  expect(JSON.stringify(listed)).not.toMatch(/Project code|stripe-secret-value/);
  expect(await (await list({ policy: { state: 'not_started', role: 'member' } })).json()).toMatchObject({ services: [], needAccess: 3 });
  expect(await (await list({ policy: held({ stripe: 'read' }) })).json()).toMatchObject({ services: [{ id: 'stripe', level: 'read' }], needAccess: 2 });
  expect(await (await list({ policy: { state: 'current', keys: null } })).json()).toMatchObject({ services: [], needAccess: 3 });
  expect((await (await list({ policy: held({ stripe: 'read' }), query: '?all=1' })).json()).services.map(row => [row.id, row.level]))
    .toEqual([['bank', null], ['docs', null], ['stripe', 'read']]);
});

test('answers only a signed-in person, passes on a refusal, and holds back a list that would show a secret', async () => {
  const signedOut = await list({ caller: null });
  expect([signedOut.status, (await signedOut.json()).error.code]).toEqual([401, 'authentication_required']);
  expect((await list({ method: 'POST' })).status).toBe(404);
  expect((await list({ refusal: new Response(null, { status: 403 }) })).status).toBe(403);
  expect((await list({ saved: { ...values, BANK_SECRET: 'Balances and transfers' } })).status).toBe(500);
  expect((await list({ leaks: value => JSON.stringify(value).includes('Payments') })).status).toBe(500);
  expect((await servicesRoute({ request: new Request('https://app.example/api/services'), caller: owner, policy: { state: 'not_started', role: 'owner' }, refusal: null,
    registry: { tok: { title: 'Tok', purpose: 'sk-abcdefghijklmnopqrstuvwxyz', secrets: [] } } })).status).toBe(500);
});

test('names a revision, answers 304 while nothing the caller sees has changed, and moves on a level or a saved key', async () => {
  const first = await list({ policy: held({ stripe: 'read' }) });
  expect(first.headers.get('cache-control')).toBe('private, no-cache');
  const etag = first.headers.get('etag');
  expect((await list({ policy: held({ stripe: 'read' }), headers: { 'If-None-Match': etag } })).status).toBe(304);
  expect((await list({ policy: held({ stripe: 'write' }), headers: { 'If-None-Match': etag } })).status).toBe(200);
  expect((await list({ policy: held({ stripe: 'read' }), saved: {}, headers: { 'If-None-Match': etag } })).status).toBe(200);
  expect((await list({ caller: { email: 'sam@example.com' }, policy: held({ stripe: 'read' }) })).headers.get('etag')).not.toBe(etag);
});
