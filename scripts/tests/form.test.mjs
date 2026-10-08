import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { AUTOFILL_TOKENS, boxFor, checkForm, checkValues, describeForm, formRoutes, LIMITS, sendForm } from '../../.agents/skills/hand-over/scripts/form.mjs';

const CARD = {
  title: 'Pay City of Markham',
  note: '$45.00 · ticket P0178390',
  fields: [
    { label: 'Card number', kind: 'cc-number', target: '@e12' },
    { label: 'Expiry month', kind: 'cc-exp-month', target: '@e13', options: [{ value: '03', text: '03 - March' }, { value: '04' }] },
    { label: 'Expiry year', kind: 'cc-exp-year', target: '@e14', options: [{ value: '2028' }] },
    { label: 'Security code', kind: 'cc-csc', target: 'iframe#pay >> input[name="cvc"]' },
  ],
  submit: { label: 'Pay $45.00', target: '@e31' },
};
const NUMBER = '4242 4242 4242 4242';
const VALUES = [NUMBER, '03', '2028', '737'];
const CVC = CARD.fields[3].target;

test('checkForm accepts a card form, a lone backup-code box, and each optional part left out', () => {
  assert.deepEqual(checkForm(CARD), { form: CARD });
  const backup = { title: 'Backup code for GitHub', fields: [{ label: 'Backup code', target: '#otp' }], submit: { label: 'Verify', target: 'button[type=submit]' } };
  assert.deepEqual(checkForm(backup), { form: backup });
  const full = { ...CARD, fields: Array.from({ length: LIMITS.fields }, (_, index) => ({ label: `Box ${index}`, target: `@e${index}` })) };
  assert.deepEqual(checkForm(full), { form: full });
  for (const kind of ['cc-number', 'one-time-code', 'current-password', 'postal-code']) assert.ok(AUTOFILL_TOKENS.has(kind), kind);
});

test('checkForm refuses each bad shape, naming where and why', () => {
  const long = most => 'x'.repeat(most + 1);
  const box = CARD.fields[0];
  const whole = {
    'takes only': [{ ...CARD, html: '<b>' }],
    'title takes': [{ ...CARD, title: undefined }, { ...CARD, title: '' }, { ...CARD, title: long(LIMITS.title) }, { ...CARD, title: 'two\nlines' }, { ...CARD, title: 7 }],
    'note takes': [{ ...CARD, note: '' }, { ...CARD, note: long(LIMITS.note) }, { ...CARD, note: ['a'] }],
    'fields takes 1 to 12 boxes': [{ ...CARD, fields: [] }, { ...CARD, fields: undefined }, { ...CARD, fields: 'card' }, { ...CARD, fields: Array(LIMITS.fields + 1).fill(box) }],
    'submit takes': [{ ...CARD, submit: undefined }, { ...CARD, submit: 'Pay' }, { ...CARD, submit: { label: 'Pay' } }, { ...CARD, submit: { label: '', target: '@e31' } }, { ...CARD, submit: { label: 'Pay', target: '--help' } }, { ...CARD, submit: { label: 'Pay', target: '@e31', value: 'x' } }],
  };
  for (const [reason, forms] of Object.entries(whole)) for (const form of forms) {
    const { fault } = checkForm(form);
    assert.ok(fault?.startsWith(`form: ${reason}`), `${JSON.stringify(form).slice(0, 80)} → ${fault}`);
  }
  const boxes = {
    'takes an object': ['Card number', null, [box]],
    'takes only': [{ ...box, value: '4242' }, { ...box, selector: '#card' }],
    'label takes': [{ ...box, label: undefined }, { ...box, label: ' ' }, { ...box, label: long(LIMITS.label) }, { ...box, label: 'Card\nnumber' }],
    'kind takes an autofill name': [{ ...box, kind: 'card' }, { ...box, kind: '' }, { ...box, kind: 7 }, { ...box, kind: 'off' }],
    'target takes a snapshot ref, like e12, or a selector': [{ ...box, target: undefined }, { ...box, target: '' }, { ...box, target: '-rf' }, { ...box, target: '--session=other' }, { ...box, target: '@card' }, { ...box, target: ' #card' }, { ...box, target: long(LIMITS.target) }, { ...box, target: '#a\n#b' }, { ...box, target: 12 }],
    'options takes': [{ ...box, options: [] }, { ...box, options: 'March' }, { ...box, options: ['03'] }, { ...box, options: [{ text: 'March' }] }, { ...box, options: [{ value: '' }] }, { ...box, options: [{ value: '-1' }] }, { ...box, options: [{ value: '03', text: '' }] }, { ...box, options: [{ value: '03', selected: true }] }, { ...box, options: [{ value: long(LIMITS.option) }] }, { ...box, options: Array(LIMITS.options + 1).fill({ value: '03' }) }],
  };
  for (const [reason, bad] of Object.entries(boxes)) for (const each of bad) {
    const { fault, form } = checkForm({ ...CARD, fields: [box, each] });
    assert.equal(form, undefined);
    assert.ok(fault.startsWith(`fields[1]: ${reason}`), `${JSON.stringify(each)?.slice(0, 80)} → ${fault}`);
  }
  for (const not of [null, [], 'text', 7]) assert.equal(checkForm(not).fault, 'form: takes a JSON object');
});

test('describeForm gives the page labels, autofill names, and choices, never a target', () => {
  const view = describeForm(CARD);
  assert.deepEqual(view, {
    title: 'Pay City of Markham',
    note: '$45.00 · ticket P0178390',
    fields: [
      { label: 'Card number', autocomplete: 'cc-number', type: 'text', inputmode: 'numeric' },
      { label: 'Expiry month', autocomplete: 'cc-exp-month', type: 'text', inputmode: '', options: [{ value: '03', text: '03 - March' }, { value: '04', text: '04' }] },
      { label: 'Expiry year', autocomplete: 'cc-exp-year', type: 'text', inputmode: '', options: [{ value: '2028', text: '2028' }] },
      { label: 'Security code', autocomplete: 'cc-csc', type: 'text', inputmode: 'numeric' },
    ],
    submit: 'Pay $45.00',
  });
  assert.doesNotMatch(JSON.stringify(view), /@e\d|iframe|target/);
  assert.equal('note' in describeForm({ ...CARD, note: undefined }), false);
  assert.deepEqual(boxFor(), { autocomplete: '', type: 'text', inputmode: '' }, 'a box with no kind, such as a backup code');
  assert.deepEqual(boxFor('one-time-code'), { autocomplete: 'one-time-code', type: 'text', inputmode: 'numeric' });
  assert.deepEqual(boxFor('current-password'), { autocomplete: 'current-password', type: 'password', inputmode: '' });
  assert.deepEqual(boxFor('email'), { autocomplete: 'email', type: 'email', inputmode: '' });
  assert.deepEqual(boxFor('tel'), { autocomplete: 'tel', type: 'tel', inputmode: '' });
  assert.deepEqual(boxFor('postal-code'), { autocomplete: 'postal-code', type: 'text', inputmode: '' }, 'a Canadian postal code has letters');
});

test('checkValues takes one value per field: text on one line, a dropdown\'s own choice', () => {
  assert.deepEqual(checkValues({ values: VALUES }, CARD), VALUES);
  assert.deepEqual(checkValues({ values: [' 4242 ', '04', '2028', 'x'.repeat(LIMITS.value)] }, CARD), [' 4242 ', '04', '2028', 'x'.repeat(LIMITS.value)], 'text is sent as typed');
  for (const values of [undefined, 'x', [], VALUES.slice(1), [...VALUES, 'extra'], [NUMBER, '13', '2028', '737'], [NUMBER, '03', '2028', ''], [NUMBER, '03', '2028', '  '], [NUMBER, '03', '2028', 737], ['42\n42', '03', '2028', '737'], [NUMBER, '03', '2028', 'x'.repeat(LIMITS.value + 1)]]) {
    assert.equal(checkValues({ values }, CARD), 400, JSON.stringify(values)?.slice(0, 60));
  }
  assert.equal(checkValues(null, CARD), 400);
});

/**
 * A browser client that logs everything a send does, in order. `fail(step, target)` makes a step throw;
 * each dropdown shows `was` before the person's pick.
 */
function tools({ fail = () => false, reached = async () => true, was = 'Choose' } = {}) {
  const log = [];
  const step = name => async (target, value) => {
    log.push(value === undefined ? [name, target] : [name, target, value]);
    if (fail(name, target)) throw new Error(`${name} failed`);
    return name === 'value' ? was : undefined;
  };
  return { log, browser: { type: step('type'), select: step('select'), value: step('value'), click: step('click') }, reached: async () => { log.push('reached?'); return reached(); } };
}

const FILLED = [['type', '@e12', NUMBER], ['value', '@e13'], ['select', '@e13', '03'], ['value', '@e14'], ['select', '@e14', '2028'], ['type', CVC, '737']];
const PUT_BACK = [['type', '@e12', ''], ['select', '@e13', 'Choose'], ['select', '@e14', 'Choose'], ['type', CVC, '']];

test('sendForm types each text box, reads then picks each dropdown, presses once, then asks the finish', async () => {
  const t = tools();
  assert.equal(await sendForm(CARD, VALUES, t), 'done');
  assert.deepEqual(t.log, [...FILLED, ['click', '@e31'], 'reached?']);
  assert.equal(t.log.filter(step => step[0] === 'click').length, 1);
});

test('sendForm empties each typed box and puts each dropdown back when the site does not move on, and never presses twice', async () => {
  const t = tools({ reached: async () => false });
  assert.equal(await sendForm(CARD, VALUES, t), 'not-accepted');
  assert.deepEqual(t.log, [...FILLED, ['click', '@e31'], 'reached?', ...PUT_BACK]);
  assert.equal(t.log.filter(step => step[0] === 'click').length, 1);
});

test('sendForm takes a ref in either spelling and a selector, passing each target on as written', async () => {
  const form = { ...CARD, fields: [{ label: 'Card number', target: 'e12' }, { label: 'Name', target: '@e13' }, { label: 'Code', target: '#cvv' }], submit: { label: 'Pay', target: 'e31' } };
  assert.deepEqual(checkForm(form), { form });
  const t = tools();
  assert.equal(await sendForm(form, ['4242', 'Jo', '737'], t), 'done');
  assert.deepEqual(t.log, [['type', 'e12', '4242'], ['type', '@e13', 'Jo'], ['type', '#cvv', '737'], ['click', 'e31'], 'reached?']);
});

test('sendForm presses nothing when a step fails, and puts back only what it changed', async () => {
  const stale = tools({ fail: (step, target) => step === 'select' && target === '@e14' });
  assert.equal(await sendForm(CARD, VALUES, stale), 'not-accepted');
  assert.deepEqual(stale.log, [...FILLED.slice(0, 5), ...PUT_BACK.slice(0, 2)], 'a stale ref on the year: no press, no finish asked');

  const unread = tools({ fail: step => step === 'value' });
  assert.equal(await sendForm(CARD, VALUES, unread), 'not-accepted');
  assert.deepEqual(unread.log, [...FILLED.slice(0, 2), PUT_BACK[0]], 'a dropdown whose own choice can not be read is not picked');

  const untyped = tools({ fail: (step, target) => step === 'type' && target === CVC });
  assert.equal(await sendForm(CARD, VALUES, untyped), 'not-accepted');
  assert.deepEqual(untyped.log, [...FILLED, ...PUT_BACK], 'a box that failed mid-value is emptied too, though emptying it fails again');
});

test('sendForm leaves a dropdown that showed no choice as it is', async () => {
  const t = tools({ was: '', reached: async () => false });
  assert.equal(await sendForm(CARD, VALUES, t), 'not-accepted');
  assert.deepEqual(t.log.slice(-2), [PUT_BACK[0], PUT_BACK[3]], 'only the text boxes are emptied');
});

test('sendForm still asks the finish after a press whose step failed, and a finish that throws is not accepted', async () => {
  const t = tools({ fail: step => step === 'click' });
  assert.equal(await sendForm(CARD, VALUES, t), 'done', 'the site may have taken the press');
  assert.deepEqual(t.log.slice(-2), [['click', '@e31'], 'reached?']);

  const thrown = tools({ reached: async () => { throw new Error('the browser vanished'); } });
  assert.equal(await sendForm(CARD, VALUES, thrown), 'not-accepted');
  assert.deepEqual(thrown.log.slice(-4), PUT_BACK);
});

/** Mounts the form routes for CARD on a server of their own; resolves to a caller and what the hooks heard. */
async function mounted(t, hooks = {}) {
  const heard = { sends: [], cancels: 0 };
  const routes = formRoutes(CARD, { closesAt: 1234, onSend: async values => { heard.sends.push(values); return { result: 'done', notification: 'notified' }; }, onCancel: () => { heard.cancels++; }, ...hooks });
  const server = createServer((request, response) => routes(new URL(request.url, 'http://page').pathname, request, response));
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => server.close());
  const call = async (path, body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${path}`, { method: body === undefined ? 'GET' : 'POST', body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  };
  return { call, heard };
}

test('GET /form describes the form with the watcher\'s clock, and each route takes only its own method', async t => {
  const { call, heard } = await mounted(t);
  const { status, json } = await call('form');
  assert.equal(status, 200);
  assert.equal(json.closesAt, 1234);
  assert.ok(Math.abs(json.now - Date.now()) < 5000);
  assert.deepEqual({ ...json, closesAt: undefined, now: undefined }, { ...describeForm(CARD), closesAt: undefined, now: undefined });
  assert.equal((await call('form', {})).status, 405);
  assert.equal((await call('send')).status, 405);
  assert.equal((await call('done')).status, 405);
  assert.deepEqual(heard, { sends: [], cancels: 0 });
});

test('POST /send runs the one send and refuses every later one, a second tap included', async t => {
  let finish;
  const { call, heard } = await mounted(t, { onSend: values => new Promise(done => { finish = () => done({ result: 'not-accepted', values: values.length }); }) });
  for (const body of ['{', {}, { values: VALUES.slice(1) }, { values: [NUMBER, '13', '2028', '737'] }]) assert.equal((await call('send', body)).status, 400, 'a bad send does not use the one send');
  assert.equal((await call('send', { values: VALUES, pad: 'x'.repeat(LIMITS.body) })).status, 413);
  const first = call('send', { values: VALUES });
  while (!finish) await new Promise(done => setTimeout(done, 5));
  const second = await call('send', { values: VALUES });
  assert.equal(second.status, 409, 'a second tap while the first is under way');
  assert.equal((await call('done', {})).status, 409, 'a send can not be cancelled');
  finish();
  assert.deepEqual(await first, { status: 200, json: { receipt: { result: 'not-accepted', values: 4 } } });
  assert.equal((await call('send', { values: VALUES })).status, 409, 'not accepted is never sent again');
  assert.equal(heard.cancels, 0);
});

test('POST /done cancels once, and a closed link refuses a send', async t => {
  const { call, heard } = await mounted(t);
  assert.deepEqual(await call('done', {}), { status: 200, json: { ok: true } });
  assert.equal((await call('send', { values: VALUES })).status, 409);
  assert.equal((await call('done', {})).status, 409);
  assert.deepEqual(heard, { sends: [], cancels: 1 });

  const closed = await mounted(t, { isOpen: () => false });
  assert.equal((await closed.call('send', { values: VALUES })).status, 410);
  assert.equal((await closed.call('done', {})).status, 410);
  assert.deepEqual(closed.heard, { sends: [], cancels: 0 });
});
