import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { credential } from '../company-git-credential.mjs';

const HELPER = new URL('../company-git-credential.mjs', import.meta.url).pathname;
const ASKED = 'protocol=https\nhost=business.example.com\npath=api/access/code/git/\n';
const jwt = claims => `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.c2ln`;
const future = () => Math.floor(Date.now() / 1000) + 600;

function helper(t, identity = { email: 'Ada@Example.com', subject: 'ada-1' }) {
  const state = mkdtempSync(join(tmpdir(), 'wong-test-credential-'));
  t.after(() => rmSync(state, { recursive: true, force: true }));
  writeFileSync(join(state, 'target.json'), JSON.stringify({ origin: 'https://business.example.com', identity }));
  const asked = [];
  return (token, input = ASKED) => credential(input, {
    stateOf: origin => { asked.push(origin); return state; },
    run: async args => { asked.push(args); if (token instanceof Error) throw token; return `noise\n${token}\n`; },
  }).then(answer => [answer, asked]);
}

test('answers with the saved sign-in of the person who set the copy up', async t => {
  const token = jwt({ email: 'ada@example.com', sub: 'ada-1', exp: future() });
  const [answer, asked] = await helper(t)(token);
  assert.equal(answer, `username=x-access\npassword=${token}\n`);
  assert.deepEqual(asked, ['https://business.example.com', ['token', '-app=https://business.example.com']]);
});

test('answers nothing for an expired, missing or other person\'s sign-in, or an unknown company', async t => {
  const cases = {
    expired: jwt({ email: 'ada@example.com', sub: 'ada-1', exp: 1 }),
    missing: new Error('no session'),
    'other person': jwt({ email: 'bo@example.com', sub: 'bo-1', exp: future() }),
    'other subject': jwt({ email: 'ada@example.com', sub: 'ada-2', exp: future() }),
  };
  for (const [name, token] of Object.entries(cases)) assert.equal((await helper(t)(token))[0], '', name);
  const token = jwt({ email: 'ada@example.com', sub: 'ada-1', exp: future() });
  assert.equal((await helper(t)(token, 'protocol=http\nhost=business.example.com\n'))[0], '');
});

test('the script answers only `get`: store and erase print nothing and keep nothing', () => {
  for (const verb of ['store', 'erase']) {
    assert.equal(execFileSync(process.execPath, [HELPER, verb], { input: `${ASKED}username=x\npassword=secret\n`, encoding: 'utf8' }), '');
  }
});
