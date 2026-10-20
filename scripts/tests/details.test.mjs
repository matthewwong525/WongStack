import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { hintOf, keepSet, readDetails, writeDetails } from '../../.agents/skills/hand-over/scripts/details.mjs';

const SCRIPT = fileURLToPath(new URL('../../.agents/skills/hand-over/scripts/details.mjs', import.meta.url));
const CARD = [{ kind: 'cc-number', label: 'Card number', value: '4242 4242 4242 4242' }, { kind: 'cc-exp-month', label: 'Expiry month', value: '3' }, { kind: 'cc-exp-year', label: 'Expiry year', value: '28' }];

/** A home of its own, so nothing touches the real saved details; `run` calls the CLI there. */
function home(t) {
  const dir = mkdtempSync(join(tmpdir(), 'details-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, '.wong-stack', 'details.json');
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env: { ...process.env, HOME: dir } });
  return { dir, file, run, sets: () => JSON.parse(readFileSync(file, 'utf8')) };
}

test('the file is read as a list, written whole for its owner alone, and a bad file is named without quoting it', t => {
  const h = home(t);
  assert.deepEqual(readDetails(h.file), [], 'nothing saved yet');
  writeDetails([{ name: 'a' }], h.file);
  assert.deepEqual(readDetails(h.file), [{ name: 'a' }]);
  assert.equal(statSync(h.file).mode & 0o777, 0o600);
  assert.equal(statSync(join(h.dir, '.wong-stack')).mode & 0o777, 0o700);
  assert.deepEqual(readdirSync(join(h.dir, '.wong-stack')), ['details.json'], 'no half-written file is left beside it');
  for (const bad of ['{"name": "4242 secret"}', 'not json 4242']) {
    writeFileSync(h.file, bad);
    assert.throws(() => readDetails(h.file), error => error.message === 'the saved details file can not be read');
  }
});

test('a set is hinted by its labels', () => {
  assert.equal(hintOf([{ kind: 'email', label: 'Email' }, { kind: 'tel', label: 'Phone' }]), 'Email, Phone');
});

test('a card saved by an earlier version is dropped from disk on the next read, and everyday answers stay', t => {
  const h = home(t);
  const everyday = { name: 'home', hint: 'email', fields: [{ kind: 'email', label: 'email', value: 'me@x.com' }] };
  writeDetails([{ name: 'pay-city-of-markham', hint: 'card ending 4242', private: true, fields: CARD }, { ...everyday, private: false }], h.file);
  assert.deepEqual(readDetails(h.file), [{ ...everyday, private: false }]);
  assert.doesNotMatch(readFileSync(h.file, 'utf8'), /4242|cc-/, 'the card is gone from disk');
  assert.equal(statSync(h.file).mode & 0o777, 0o600);
  const list = h.run('list');
  assert.equal(list.stdout, 'DETAILS_SETS=1\nhome\temail\temail\n  email=me@x.com\n');
  writeDetails([{ name: 'pay', private: true, fields: CARD }], h.file);
  assert.equal(h.run('list').stdout, 'DETAILS_SETS=0\n', 'list alone deletes a card');
  assert.deepEqual(h.sets(), []);
});

test('list names each set and shows its values', t => {
  const h = home(t);
  assert.deepEqual([h.run('list').status, h.run('list').stdout], [0, 'DETAILS_SETS=0\n']);
  assert.equal(h.run('save', '--name', 'home', '--field', 'email=me@x.com', '--field', 'street-address=1 Main St').status, 0);
  keepSet({ name: 'work', fields: [{ kind: 'tel', label: 'Phone', value: '555' }] }, h.file);
  const out = h.run('list');
  assert.equal(out.status, 0);
  assert.equal(out.stdout, 'DETAILS_SETS=2\nhome\temail, street-address\temail,street-address\n  email=me@x.com\n  street-address=1 Main St\nwork\tPhone\ttel\n  tel=555\n');
});

test('save keeps an everyday answer from the chat, and refuses a card, a password, a code, or a bad name', t => {
  const h = home(t);
  const saved = h.run('save', '--name', 'home', '--field', 'email=me@x.com');
  assert.deepEqual([saved.status, saved.stdout], [0, 'DETAILS_SAVED=home\n']);
  assert.deepEqual(h.sets(), [{ name: 'home', hint: 'email', fields: [{ kind: 'email', label: 'email', value: 'me@x.com' }] }]);
  assert.equal(h.run('save', '--name', 'home', '--field', 'tel=555').status, 0);
  assert.deepEqual(h.sets().map(set => set.fields[0].kind), ['tel'], 'saved again, replaced');
  for (const args of [['--field', 'cc-number=4242424242424242'], ['--field', 'cc-csc=737'], ['--field', 'current-password=pw'], ['--field', 'new-password=pw'], ['--field', 'one-time-code=1'], ['--field', 'cc-name=Me'], ['--field', 'favourite=blue'], ['--field', 'email='], ['--field', 'email=a', '--field', 'email=b'], []]) {
    const out = h.run('save', '--name', 'card', ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.doesNotMatch(out.stdout + out.stderr, /4242424242424242|737|=pw/, 'a refused value is not echoed');
  }
  for (const name of ['Home', '-home', 'a b', '']) assert.equal(h.run('save', '--name', name, '--field', 'email=x').status, 2, name);
  assert.deepEqual(h.sets().map(set => set.name), ['home'], 'nothing refused was saved');
});

test('forget deletes one set by name or all of them, and a bad file is reported, not shown', t => {
  const h = home(t);
  for (const name of ['a', 'b', 'c']) keepSet({ name, fields: [{ kind: 'email', label: 'email', value: `${name}@x.com` }] }, h.file);
  assert.equal(h.run('forget', 'b').stdout, 'DETAILS_FORGOT=b\n');
  assert.deepEqual(h.sets().map(set => set.name), ['a', 'c']);
  assert.equal(h.run('forget', 'nobody').stdout, 'DETAILS_FORGOT=\n');
  assert.equal(h.run('forget', '--all').stdout, 'DETAILS_FORGOT=a,c\n');
  assert.deepEqual(h.sets(), []);
  for (const args of [['forget'], ['forget', 'a', '--all'], ['forget', 'a', 'b'], ['list', 'x'], ['nope'], []]) assert.equal(h.run(...args).status, 2, args.join(' '));
  writeFileSync(h.file, '{"secret": "4242"}');
  const bad = h.run('list');
  assert.deepEqual([bad.status, bad.stdout], [1, 'DETAILS_ERROR=the saved details file can not be read\n']);
  assert.ok(existsSync(h.file), 'a file it can not read is left alone');
});
