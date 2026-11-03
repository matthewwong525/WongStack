import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isMeta, moveLogins, oldLogins } from '../../.agents/skills/browser/scripts/login-move.mjs';

// Made-up fixture data only: no real profile is read.
const cookie = (domain, name) => ({ name, value: `${name}-value`, domain, path: '/', expires: 2_000_000_000, httpOnly: true, secure: true, sameSite: 'Lax', partitionKey: 'x' });
const STATE_A = {
  cookies: [cookie('.shop.example.com', 'session'), cookie('admin.example.com', 'admin'), cookie('.facebook.com', 'c_user'), cookie('www.messenger.com', 'xs')],
  origins: [
    { origin: 'https://admin.example.com', localStorage: [{ name: 'theme', value: 'dark' }] },
    { origin: 'https://www.instagram.com', localStorage: [{ name: 'ig', value: '1' }] },
  ],
};
const STATE_B = { cookies: [cookie('static.xx.fbcdn.net', 'cdn'), cookie('.google.com', 'SID')], origins: [{ origin: 'https://www.facebook.com', localStorage: [{ name: 'fb', value: '1' }] }] };

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'login-move-test-'));
  for (const [name, state] of [['a', STATE_A], ['b', STATE_B], ['broken', null]]) {
    mkdirSync(join(dir, 'profiles', name), { recursive: true });
    writeFileSync(join(dir, 'profiles', name, 'storage-state.json'), state ? JSON.stringify(state) : '{not json');
  }
  return { dir, profilesDir: join(dir, 'profiles'), marker: join(dir, 'migrated'), done: () => rmSync(dir, { recursive: true, force: true }) };
}

/** A browser context that records cookies, and the site storage each origin's page sets. */
function fakeContext() {
  const cookies = [];
  const storage = {};
  return {
    cookies,
    storage,
    addCookies: async list => { cookies.push(...list); },
    newPage: async () => {
      let at = null;
      return {
        route: async () => {},
        goto: async origin => { at = origin; },
        evaluate: async (_, items) => { storage[at] = items; },
        close: async () => {},
      };
    },
  };
}

test("Meta's sites match by host, under any subdomain", () => {
  for (const host of ['.facebook.com', 'www.messenger.com', 'instagram.com', 'static.xx.fbcdn.net', 'web.whatsapp.com', 'threads.net']) assert.equal(isMeta(host), true, host);
  for (const host of ['admin.example.com', 'notfacebook.com', 'facebook.com.example.test', '']) assert.equal(isMeta(host), false, host);
});

test('the first start copies cookies and storage, leaves Meta out, and the second copies nothing', async () => {
  const { profilesDir, marker, done } = setup();
  try {
    const context = fakeContext();
    assert.deepEqual(await moveLogins(context, { profilesDir, marker }), { cookies: 3, origins: 1 });
    assert.deepEqual(context.cookies.map(({ domain, name }) => `${domain} ${name}`).sort(), ['.google.com SID', '.shop.example.com session', 'admin.example.com admin']);
    assert.ok(context.cookies.every(saved => !('partitionKey' in saved)), 'only the fields the browser takes');
    assert.deepEqual(context.storage, { 'https://admin.example.com': [{ name: 'theme', value: 'dark' }] });
    assert.ok(existsSync(marker));
    assert.equal(statSync(marker).mode & 0o777, 0o600);
    assert.ok(!readFileSync(marker, 'utf8').includes('value'), 'the marker holds counts, not cookies');
    const again = fakeContext();
    assert.equal(await moveLogins(again, { profilesDir, marker }), null);
    assert.deepEqual(again.cookies, []);
  } finally {
    done();
  }
});

test('a cookie the browser refuses costs only that cookie', async () => {
  const { profilesDir, marker, done } = setup();
  try {
    const kept = [];
    const context = { ...fakeContext(), addCookies: async list => { if (list.some(saved => saved.name === 'admin')) throw new Error('refused'); kept.push(...list); } };
    await moveLogins(context, { profilesDir, marker });
    assert.deepEqual(kept.map(saved => saved.name).sort(), ['SID', 'session']);
  } finally {
    done();
  }
});

test('no old browser gives an empty move', () => {
  assert.deepEqual(oldLogins(join(tmpdir(), 'no-such-camofox-profiles')), { cookies: [], origins: [] });
});
