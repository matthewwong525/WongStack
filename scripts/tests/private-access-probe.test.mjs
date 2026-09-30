import assert from 'node:assert/strict';
import { test } from 'node:test';
import { probePrivateAccess } from '../probe-private-access.mjs';

const credentials = { CF_ACCESS_CLIENT_ID: 'machine-id', CF_ACCESS_CLIENT_SECRET: 'machine-secret' };

test('verification keeps anonymous and machine requests separate and returns only safe status metadata', async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    return options.headers['CF-Access-Client-Secret']
      ? new Response('secret business content')
      : new Response(null, { status: 302, headers: { location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login?token=private' } });
  };
  const result = await probePrivateAccess('https://app.example.com/assets/style.css', credentials, fetch);
  assert.equal(result.closed, true);
  assert.equal(result.machineVerified, true);
  assert.equal(result.humanLogin, 'unverified');
  assert.deepEqual(calls[0].headers, {});
  assert.equal(calls[1].headers['CF-Access-Client-Secret'], credentials.CF_ACCESS_CLIENT_SECRET);
  assert.equal(calls[0].redirect, 'manual');
  for (const secret of ['machine-secret', 'secret business content', 'token=private']) assert.ok(!JSON.stringify(result).includes(secret));
});

test('public content, unrelated redirects, and unavailable machine auth fail verification', async () => {
  for (const response of [new Response('public'), new Response(null, { status: 302, headers: { location: 'https://unrelated.example.com' } }), new Response(null, { status: 503 })]) {
    const report = await probePrivateAccess('https://app.example.com/', credentials, async () => response);
    assert.equal(report.closed, false);
  }
  const result = await probePrivateAccess('https://app.example.com/', credentials, async () => new Response(null, { status: 401 }));
  assert.equal(result.closed, true);
  assert.equal(result.machineVerified, false);
  for (const url of ['http://app.example.com/', 'https://user:secret@app.example.com/', 'https://app.example.com/?key=secret']) await assert.rejects(probePrivateAccess(url, credentials), /plain HTTPS/);
  await assert.rejects(probePrivateAccess('https://app.example.com/', {}), /credentials are missing/);
});
