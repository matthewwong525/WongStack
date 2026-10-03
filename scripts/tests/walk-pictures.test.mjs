// The picture route the app's production Worker serves at /_walk/: the real handler on a fake bucket
// that honors the "only when absent" condition and counts every call it gets.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { handleWalkPictures, WALK_PREFIX } from '../../.agents/skills/verify/worker/walk-pictures.mjs';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const OTHER_PNG = Buffer.concat([PNG, Buffer.from([9])]);
const PICTURE = `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/03-after.png`;
const KEY = 'walks/abc1234/20261003T140000Z/empty-title/03-after.png';
const SERVICE = { kind: 'service' };
const USER = { kind: 'user' };

function fakeBucket(objects = new Map()) {
  const calls = [];
  return {
    calls,
    objects,
    get: async key => { calls.push(`get ${key}`); return objects.has(key) ? { body: new Blob([objects.get(key)]).stream() } : null; },
    put: async (key, value, options) => {
      calls.push(`put ${key}`);
      if (options?.onlyIf?.etagDoesNotMatch === '*' && objects.has(key)) return null;
      objects.set(key, Buffer.from(value));
      return { key };
    },
  };
}
const ask = (path, method = 'GET', body, headers = {}) => new Request(`https://workspace.example.com${path}`, { method, headers, ...(body === undefined ? {} : { body }) });
const bytes = async response => Buffer.from(await response.arrayBuffer());

test('a service PUT then a user GET returns the same bytes with the fixed headers', async () => {
  const bucket = fakeBucket();
  const kept = await handleWalkPictures(ask(PICTURE, 'PUT', PNG), bucket, SERVICE);
  assert.equal(kept.status, 201);
  assert.deepEqual(await kept.json(), { kept: true });
  assert.deepEqual([...bucket.objects.keys()], [KEY]);

  const shown = await handleWalkPictures(ask(PICTURE), bucket, USER);
  assert.equal(shown.status, 200);
  assert.deepEqual(await bytes(shown), PNG);
  assert.equal(shown.headers.get('Content-Type'), 'image/png');
  assert.equal(shown.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(shown.headers.get('Content-Security-Policy'), "default-src 'none'");
  assert.equal(shown.headers.get('Cache-Control'), 'private, max-age=31536000, immutable');
  assert.equal((await handleWalkPictures(ask(PICTURE), bucket, SERVICE)).status, 200);
});

test('a picture never kept is 404, and only GET and PUT are answered', async () => {
  const bucket = fakeBucket();
  assert.equal((await handleWalkPictures(ask(PICTURE), bucket, USER)).status, 404);
  for (const method of ['POST', 'DELETE', 'HEAD']) {
    assert.equal((await handleWalkPictures(ask(PICTURE, method), bucket, SERVICE)).status, 405, method);
  }
  assert.deepEqual(bucket.calls, [`get ${KEY}`]);
});

test('only the walk adds a picture, and a kept one is never replaced', async () => {
  const bucket = fakeBucket();
  const refused = await handleWalkPictures(ask(PICTURE, 'PUT', PNG), bucket, USER);
  assert.equal(refused.status, 403);
  assert.equal(bucket.objects.size, 0);

  assert.equal((await handleWalkPictures(ask(PICTURE, 'PUT', PNG), bucket, SERVICE)).status, 201);
  const second = await handleWalkPictures(ask(PICTURE, 'PUT', OTHER_PNG), bucket, SERVICE);
  assert.equal(second.status, 409);
  assert.deepEqual(bucket.objects.get(KEY), PNG);
});

test('a body that is not a PNG, or is over 10 MB, is not kept', async () => {
  const bucket = fakeBucket();
  for (const body of ['<html><script>alert(1)</script></html>', Buffer.from([0x89, 0x50]), '']) {
    const response = await handleWalkPictures(ask(PICTURE, 'PUT', body), bucket, SERVICE);
    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), { error: 'not_png' });
  }
  const limit = 10 * 1024 * 1024;
  const declared = await handleWalkPictures(ask(PICTURE, 'PUT', PNG, { 'Content-Length': String(limit + 1) }), bucket, SERVICE);
  assert.equal(declared.status, 413);
  const large = Buffer.concat([PNG, Buffer.alloc(limit)]);
  assert.equal((await handleWalkPictures(ask(PICTURE, 'PUT', large), bucket, SERVICE)).status, 413);
  assert.deepEqual(bucket.calls, []);
});

test('no bucket is 404 no_bucket, and no identity is 404 with no_login on a PUT', async () => {
  for (const method of ['GET', 'PUT']) {
    const response = await handleWalkPictures(ask(PICTURE, method, method === 'PUT' ? PNG : undefined), undefined, SERVICE);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'no_bucket' });
  }
  const bucket = fakeBucket(new Map([[KEY, PNG]]));
  const open = await handleWalkPictures(ask(PICTURE), bucket, null);
  assert.equal(open.status, 404);
  assert.equal(await open.text(), 'Not found');
  const put = await handleWalkPictures(ask(PICTURE, 'PUT', PNG), bucket, null);
  assert.equal(put.status, 404);
  assert.deepEqual(await put.json(), { error: 'no_login' });
  // An open site with no bucket says no_login: the login is what is missing first.
  assert.deepEqual(await (await handleWalkPictures(ask(PICTURE, 'PUT', PNG), undefined, null)).json(), { error: 'no_login' });
  assert.deepEqual(bucket.calls, []);
});

test('a transcript asked through the picture address is 404 and the bucket is never read', async () => {
  const transcript = 'sessions/owner@example.com/chat.jsonl';
  const bucket = fakeBucket(new Map([[transcript, Buffer.from('private')], ['walks/secret.txt', Buffer.from('x')]]));
  const paths = [
    `${WALK_PREFIX}${transcript}`,
    `${WALK_PREFIX}sessions%2Fowner%40example.com%2Fchat.jsonl`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/..%2F..%2F..%2F..%2F${transcript}`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/%2e%2e/%2e%2e/%2e%2e/%2e%2e/${transcript}`,
    `${WALK_PREFIX}../${transcript}`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/../../../${transcript}`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/../../../../${transcript}`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/../03-after.png`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/.hidden/03-after.png`,
    `${WALK_PREFIX}secret.txt`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/03-after.txt`,
    `${WALK_PREFIX}ABC1234/20261003T140000Z/empty-title/03-after.png`,
    `${WALK_PREFIX}abc1234/today/empty-title/03-after.png`,
    `${WALK_PREFIX}abc1234/20261003T140000Z/empty-title/03-after.png/extra`,
    WALK_PREFIX,
  ];
  for (const path of paths) {
    for (const [method, identity] of [['GET', USER], ['GET', SERVICE], ['PUT', SERVICE]]) {
      const response = await handleWalkPictures(ask(path, method, method === 'PUT' ? PNG : undefined), bucket, identity);
      assert.equal(response.status, 404, `${method} ${path}`);
      assert.equal(await response.text(), 'Not found');
    }
  }
  assert.deepEqual(bucket.calls, []);
  assert.equal(bucket.objects.size, 2);
});

test('the route module stands alone: it imports nothing from the memory skill or the app', () => {
  const source = readFileSync(new URL('../../.agents/skills/verify/worker/walk-pictures.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^\s*import\b|\bimport\(|\brequire\(/m);
});
