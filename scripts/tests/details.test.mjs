import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { choiceFor, hintOf, keepForm, keepSet, nameOf, normalise, readDetails, valuesFor, writeDetails } from '../../.agents/skills/hand-over/scripts/details.mjs';

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

test('a set is named from the form\'s title and hinted by its card\'s last four or its labels', () => {
  assert.deepEqual([nameOf('Pay City of Markham'), nameOf('  Book: A Table!  '), nameOf('€€€'), nameOf('a'.repeat(59) + ' b')], ['pay-city-of-markham', 'book-a-table', 'details', 'a'.repeat(59)]);
  assert.equal(hintOf(CARD), 'card ending 4242');
  assert.equal(hintOf([{ kind: 'email', label: 'Email' }, { kind: 'tel', label: 'Phone' }]), 'Email, Phone');
});

test('a private form keeps only the boxes that may be kept, and a set saved again replaces the old one', t => {
  const h = home(t);
  const form = { title: 'Pay City of Markham', fields: [{ label: 'Card number', kind: 'cc-number' }, { label: 'Security code', kind: 'cc-csc' }, { label: 'Code', kind: 'one-time-code' }, { label: 'Password', kind: 'current-password' }, { label: 'Note' }] };
  const kept = keepForm(form, ['4111 1111 1111 1111', '737', '123456', 'pw', 'hi'], h.file);
  assert.deepEqual(kept, { name: 'pay-city-of-markham', hint: 'card ending 1111', private: true, fields: [{ kind: 'cc-number', label: 'Card number', value: '4111 1111 1111 1111' }, { kind: 'cc-csc', label: 'Security code', value: '737' }] });
  keepForm(form, ['4242 4242 4242 4242', '123', '', '', ''], h.file);
  assert.deepEqual(h.sets().map(set => set.hint), ['card ending 4242'], 'replaced, never beside it');
  assert.equal(keepForm({ title: 'Sign in', fields: [{ label: 'Code', kind: 'one-time-code' }, { label: 'Note' }] }, ['1', '2'], h.file), null);
  keepSet({ name: 'home', private: false, fields: [{ kind: 'email', label: 'email', value: 'me@x.com' }] }, h.file);
  assert.deepEqual(h.sets().map(set => set.name), ['pay-city-of-markham', 'home']);
});

test('a dropdown keeps its visible choice beside the site\'s value, so another site\'s same value never picks the wrong month', t => {
  const h = home(t);
  const siteA = { title: 'Pay A', fields: [{ label: 'Month', kind: 'cc-exp-month', options: [{ value: '2', text: 'March' }, { value: '1', text: 'February' }] }, { label: 'Year', kind: 'cc-exp-year', options: [{ value: '2028' }] }] };
  const kept = keepForm(siteA, ['2', '2028'], h.file);
  assert.deepEqual(kept.fields, [{ kind: 'cc-exp-month', label: 'Month', value: '2', text: 'March' }, { kind: 'cc-exp-year', label: 'Year', value: '2028', text: '2028' }]);
  const siteB = { kind: 'cc-exp-month', options: [{ value: '02', text: '02 - February' }, { value: '03', text: '03 - March' }] };
  assert.equal(choiceFor('2', siteB), '02', 'the value alone fits February: the fault this guards');
  assert.equal(choiceFor('2', siteB, 'March'), null, 'value and text point at different months: refused');
  assert.equal(valuesFor({ fields: [{ label: 'Month', ...siteB }] }, kept).missing, 'Month');
  assert.equal(choiceFor('mar', siteB, 'March'), '03', 'the visible choice alone picks one');
  assert.equal(choiceFor('3', { kind: 'cc-exp-month', options: [{ value: '03', text: '03 - March' }, { value: '04', text: '04 - April' }] }, 'March'), '03', 'value and text agree');
  assert.equal(choiceFor('3', { kind: 'cc-exp-month', options: [{ value: '03', text: '03' }] }, 'March'), null, 'nothing shows March: refused');
  assert.equal(choiceFor('28', { kind: 'cc-exp-year', options: [{ value: '2028', text: '2028' }, { value: '2029', text: '2029' }] }, '28'), '2028');
  const list = h.run('list');
  assert.doesNotMatch(list.stdout, /March|2028/, 'a private visible choice never prints');
});

test('a saved value meets a dropdown\'s choice by value or text, by number, and by an expiry year\'s last two digits', () => {
  assert.deepEqual([normalise(' March ', 'cc-exp-month'), normalise('03', 'cc-exp-month'), normalise('2028', 'cc-exp-year'), normalise('28', 'cc-exp-year'), normalise('2028', 'postal-code')], ['march', '3', '28', '28', '2028']);
  const month = { kind: 'cc-exp-month', options: [{ value: '03', text: '03 - March' }, { value: '04', text: '04' }] };
  assert.deepEqual([choiceFor('3', month), choiceFor('03', month), choiceFor('03 - march', month), choiceFor('5', month)], ['03', '03', '03', null]);
  assert.equal(choiceFor('2028', { kind: 'cc-exp-year', options: [{ value: '28' }] }), '28');
  assert.equal(choiceFor('3', { kind: 'cc-exp-month', options: [{ value: '3', text: 'March' }, { value: 'mar', text: '03' }] }), null, 'two choices fit: none is picked');
});

test('a form is filled from a set by kind, or names the first box the set can not fill', () => {
  const form = { fields: [{ label: 'Card number', kind: 'cc-number' }, { label: 'Expiry month', kind: 'cc-exp-month', options: [{ value: '03', text: 'March' }] }, { label: 'Expiry year', kind: 'cc-exp-year', options: [{ value: '2028', text: '2028' }] }] };
  const set = { fields: CARD };
  assert.deepEqual(valuesFor(form, set), { values: ['4242 4242 4242 4242', '03', '2028'] });
  assert.deepEqual(valuesFor({ fields: [...form.fields, { label: 'Security code', kind: 'cc-csc' }] }, set), { missing: 'Security code' });
  assert.deepEqual(valuesFor({ fields: [{ label: 'Note' }] }, set), { missing: 'Note' }, 'a box with no kind');
  assert.deepEqual(valuesFor({ fields: [{ label: 'Expiry month', kind: 'cc-exp-month', options: [{ value: '04', text: 'April' }] }] }, set), { missing: 'Expiry month' });
});

test('list names each set and shows only an everyday set\'s values', t => {
  const h = home(t);
  assert.deepEqual([h.run('list').status, h.run('list').stdout], [0, 'DETAILS_SETS=0\n']);
  keepSet({ name: 'pay-city-of-markham', private: true, fields: CARD }, h.file);
  assert.equal(h.run('save', '--name', 'home', '--field', 'email=me@x.com', '--field', 'street-address=1 Main St').status, 0);
  const out = h.run('list');
  assert.equal(out.status, 0);
  assert.equal(out.stdout, 'DETAILS_SETS=2\npay-city-of-markham\tcard ending 4242\tcc-number,cc-exp-month,cc-exp-year\nhome\temail, street-address\temail,street-address\n  email=me@x.com\n  street-address=1 Main St\n');
  assert.doesNotMatch(out.stdout + out.stderr, /4242 4242|\t3\b|=28/, 'a private value never prints');
});

test('save keeps an everyday answer from the chat, and refuses a card, a password, a bad name, or a private set\'s name', t => {
  const h = home(t);
  const saved = h.run('save', '--name', 'home', '--field', 'email=me@x.com');
  assert.deepEqual([saved.status, saved.stdout], [0, 'DETAILS_SAVED=home\n']);
  assert.deepEqual(h.sets(), [{ name: 'home', hint: 'email', private: false, fields: [{ kind: 'email', label: 'email', value: 'me@x.com' }] }]);
  assert.equal(h.run('save', '--name', 'home', '--field', 'tel=555').status, 0);
  assert.deepEqual(h.sets().map(set => set.fields[0].kind), ['tel'], 'saved again, replaced');
  for (const args of [['--field', 'cc-number=4242424242424242'], ['--field', 'cc-csc=737'], ['--field', 'current-password=pw'], ['--field', 'new-password=pw'], ['--field', 'one-time-code=1'], ['--field', 'favourite=blue'], ['--field', 'email='], ['--field', 'email=a', '--field', 'email=b'], []]) {
    const out = h.run('save', '--name', 'card', ...args);
    assert.equal(out.status, 2, args.join(' '));
    assert.doesNotMatch(out.stdout + out.stderr, /4242424242424242|737|=pw/, 'a refused value is not echoed');
  }
  for (const name of ['Home', '-home', 'a b', '']) assert.equal(h.run('save', '--name', name, '--field', 'email=x').status, 2, name);
  keepSet({ name: 'pay', private: true, fields: CARD }, h.file);
  const clash = h.run('save', '--name', 'pay', '--field', 'email=x');
  assert.equal(clash.status, 1);
  assert.match(clash.stderr, /came from a private form/);
  assert.equal(h.sets().find(set => set.name === 'pay').private, true, 'the card is untouched');
});

test('forget deletes one set by name or all of them, and a bad file is reported, not shown', t => {
  const h = home(t);
  for (const name of ['a', 'b', 'c']) keepSet({ name, private: false, fields: [{ kind: 'email', label: 'email', value: `${name}@x.com` }] }, h.file);
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
