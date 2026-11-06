import test from 'node:test';
import assert from 'node:assert/strict';
import { hinted, idPart, madeUp, privateFields, scrub, scrubExample } from '../lib-scrub.mjs';

const base = 'https://api.service.test/v1/';

test('each kind of value is kept or made up as the table says', () => {
  const answer = scrub({
    count: 3, amount: 12.5, open: true, gone: null, when: '2026-11-01T10:00:00.000Z', day: '2026-11-01', kind: 'page',
    owner: 'Jane.Doe@acme.com', id: '1a2b3c4d-1111-2222-3333-444455556666', bare: '1a2b3c4d111122223333444455556666',
    customer: 'cus_Nf8a2Kd9sQ', hex: 'deadbeefdeadbeef0123', token: 'Ab12Cd34Ef56Gh78Ij90Kl', mobile: '+44 20 7946 0958',
    self: 'https://api.service.test/v1/pages/1a2b3c4d-1111-2222-3333-444455556666?expand=all', link: 'https://elsewhere.test/a?b=c',
    note: 'Call Jane on Friday', state: 'Done',
  }, { base });
  assert.deepEqual(answer, {
    count: 3, amount: 12.5, open: true, gone: null, when: '2026-11-01T10:00:00.000Z', day: '2026-11-01', kind: 'page',
    owner: 'person1@example.com', id: '00000000-0000-4000-8000-000000000001', bare: '00000000000040008000000000000001',
    customer: 'cus_0000000001', hex: '00000000000000000002', token: '0000000000000000000003', mobile: '+1 555 0101',
    self: 'https://api.service.test/v1/pages/00000000-0000-4000-8000-000000000001', link: 'https://example.com/1',
    note: 'Sample text 1', state: 'Sample text 2',
  });
});

test('a field whose name hints at a person or free text is replaced whatever its form', () => {
  assert.deepEqual(scrub({ name: 'acme', display_name: 'ok', firstName: 'jo', plain_text: 'x', title: [{ text: { content: 'secret' } }], phone: '555 123 4567', type: 'title' }),
    { name: 'Sample text 1', display_name: 'Sample text 2', firstName: 'Sample text 3', plain_text: 'Sample text 4', title: [{ text: { content: 'Sample text 5' } }], phone: '+1 555 0101', type: 'title' });
  assert.equal(hinted('email_address'), true); assert.equal(hinted('username'), false); assert.equal(hinted(3), false);
});

test('the same real value gets the same made-up value across one example, request and answer alike', () => {
  const example = { source: 'live', recorded: '2026-11-06',
    request: { method: 'GET', path: 'pages/1a2b3c4d-1111-2222-3333-444455556666', query: 'owner=jane%40acme.com&page_size=2' },
    answer: { status: 200, contentType: 'application/json', body: { id: '1a2b3c4d-1111-2222-3333-444455556666', email: 'jane@acme.com', other: 'bo@acme.com', text: 'Hello there' } } };
  const clean = scrubExample(example, { base });
  assert.equal(clean.request.path, 'pages/00000000-0000-4000-8000-000000000001');
  assert.equal(clean.request.query, 'owner=person1%40example.com&page_size=2');
  assert.deepEqual(clean.answer.body, { id: '00000000-0000-4000-8000-000000000001', email: 'person1@example.com', other: 'person2@example.com', text: 'Sample text 1' });
  assert.deepEqual([clean.source, clean.recorded, clean.answer.status], ['live', '2026-11-06', 200]);
  const sent = scrubExample({ ...example, request: { method: 'POST', path: 'search', body: { query: 'Acme plan' } } });
  assert.deepEqual(sent.request, { method: 'POST', path: 'search', body: { query: 'Sample text 1' } });
});

test('a second scrub changes nothing, and a field it would change is named', () => {
  const example = { source: 'live', recorded: '2026-11-06', request: { method: 'GET', path: 'users/u_8f7d6c5b4a3e/Weird Part' },
    answer: { status: 200, contentType: 'text/plain', body: 'Dear Jane' } };
  const clean = scrubExample(example, { base });
  assert.deepEqual(scrubExample(clean, { base }), clean);
  assert.deepEqual(privateFields(clean, { base }), []);
  assert.equal(clean.request.path, 'users/u_8f7d6c5b4a3e/sample-1');
  const edited = { ...clean, answer: { ...clean.answer, body: { list: [{ email: 'real@acme.com' }], key: 'ntn_Ab12Cd34Ef56Gh78Ij90', home: 'https://acme.test/x' } } };
  assert.deepEqual(privateFields({ ...edited, request: { method: 'GET', path: 'users/12345' } }, { base }), [
    'request.path: looks private (an ID or value in the address)',
    'answer.body.list[0].email: looks private (an email)', 'answer.body.key: looks private (an ID or token)', 'answer.body.home: looks private (an outside address)']);
});

test('a request keeps its content type, which is never named as private', () => {
  const example = { source: 'live', recorded: '2026-11-06', request: { method: 'POST', path: 'search', contentType: 'application/x-www-form-urlencoded', body: { page_size: 1 } },
    answer: { status: 200, contentType: 'application/json', body: {} } };
  assert.equal(scrubExample(example, { base }).request.contentType, 'application/x-www-form-urlencoded');
  assert.deepEqual(privateFields(example, { base }), []);
});

test('a request the scrub changed is known as made up; one it kept is not', () => {
  const made = request => madeUp(scrubExample({ request, answer: { status: 200, body: {} } }, { base }).request);
  assert.equal(made({ method: 'GET', path: 'pages/1a2b3c4d-1111-2222-3333-444455556666' }), true);
  assert.equal(made({ method: 'GET', path: 'users/12345' }), true);
  assert.equal(made({ method: 'GET', path: 'users/Weird Part' }), true);
  assert.equal(made({ method: 'GET', path: 'users', query: 'owner=jane%40acme.com' }), true);
  assert.equal(made({ method: 'POST', path: 'search', body: { query: 'Acme plan' } }), true);
  assert.equal(made({ method: 'POST', path: 'search', body: { page_size: 1, sort: { direction: 'descending' } } }), false);
  assert.equal(made({ method: 'GET', path: 'users/me', query: 'page_size=2' }), false);
});

test('an ID part of a path is one the scrubber treats as an ID', () => {
  for (const part of ['1a2b3c4d-1111-2222-3333-444455556666', 'cus_Nf8a2Kd9sQ', '12345', 'deadbeefdeadbeef']) assert.equal(idPart(part), true, part);
  for (const part of ['pages', 'v1', 'search']) assert.equal(idPart(part), false, part);
});
