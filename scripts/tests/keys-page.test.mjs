import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
import { heldLabel, httpsHost, timeLeft } from '../../.agents/skills/hand-over/scripts/keys-page.mjs';

const scripts = new URL('../../.agents/skills/hand-over/scripts/', import.meta.url);
const source = readFileSync(new URL('keys-page.mjs', scripts), 'utf8').replace(/^export /gm, '');
const html = readFileSync(new URL('keys-page.html', scripts), 'utf8').replace('<script type="module" src="page.mjs"></script>', () => `<script>${source}</script>`);
const settle = async () => { for(let i=0;i<8;i++) await new Promise(done=>setTimeout(done,0)); };
const TWO=[{name:'FIRST',hint:'First key'},{name:'SECOND',hint:'Second key'}];
// `respond` answers each save; `keys`, `closesAt`, and `now` are what `GET /keys` gives, and `clipboard` the browser's own.
function page(t, respond, {keys=TWO,closesAt,now,clipboard}={}) {
  const calls=[];
  const answer=(status,body)=>({status,ok:status===200,json:async()=>body});
  const dom=new JSDOM(html,{url:'https://private.test/#key=secret',runScripts:'dangerously',beforeParse(win){
    if(clipboard) Object.defineProperty(win.navigator,'clipboard',{value:clipboard});
    win.fetch=async(path,init={})=>{
    calls.push({path,body:init.body&&JSON.parse(init.body)});
    if(path==='keys') return answer(200,{keys,closesAt,now});
    if(path==='done') return answer(200,{ok:true});
    if(path==='page.mjs') return answer(404);
    return respond(JSON.parse(init.body),answer);
  };}});
  t.after(()=>dom.window.close());
  const $=selector=>dom.window.document.querySelector(selector);
  const fill=(name,value)=>{const input=$(`[name=${name}]`);input.value=value;input.dispatchEvent(new dom.window.Event('input'));};
  const submit=()=>$('#keys-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  const button=text=>[...dom.window.document.querySelectorAll('button')].find(each=>each.textContent===text&&!each.hidden);
  return {$,fill,submit,calls,button,window:dom.window,text:()=>dom.window.document.body.textContent};
}

test('keys page keeps partial success locked and required missing rows editable',async t=>{
  const p=page(t,(_body,answer)=>answer(200,{saved:['FIRST'],failed:[],refused:[],checked:{FIRST:'untested'},missing:['SECOND'],ready:false}));
  await settle();assert.equal(p.$('#save').disabled,true);
  p.fill('FIRST','secret');assert.equal(p.$('#save').disabled,false);p.submit();await settle();
  assert.equal(p.$('[name=FIRST]').disabled,true);assert.equal(p.$('[name=FIRST]').value,'');
  assert.equal(p.$('[name=SECOND]').disabled,false);assert.match(p.$('#keys').textContent,/Paste this key/);
  assert.deepEqual(p.calls.find(c=>c.path==='continue').body,{keys:{FIRST:'secret'}});
});

for(const notification of ['notified','unconfirmed']) test(`keys receipt honestly reports ${notification}`,async t=>{
  const p=page(t,(_body,answer)=>answer(200,{saved:['FIRST','SECOND'],failed:[],missing:[],ready:true,receipt:{notification}}));
  await settle();p.fill('FIRST','one');p.fill('SECOND','two');p.submit();await settle();
  assert.equal(p.$('#form').hidden,true);assert.equal(p.$('[name=FIRST]').value,'');
  assert.match(p.$('#closed h1').textContent,notification==='notified'?/notified/:/return to your chat/);
});

test('keys saving blocks competing close/show/save actions and rejects double submit',async t=>{
  let finish;const p=page(t,()=>new Promise(done=>{finish=done;}));await settle();p.fill('FIRST','one');p.submit();await settle();
  assert.equal(p.$('#done').disabled,true);assert.equal(p.$('[name=FIRST]').disabled,true);
  assert.equal(p.$('#keys button').disabled,true);p.submit();p.$('#done').click();
  assert.equal(p.calls.filter(c=>c.path==='continue').length,1);assert.equal(p.calls.some(c=>c.path==='done'),false);
  finish({status:200,ok:true,json:async()=>({saved:[],failed:['FIRST'],missing:['FIRST','SECOND'],ready:false})});await settle();
  assert.equal(p.$('[name=FIRST]').disabled,false);assert.match(p.$('#keys').textContent,/Couldn't save/);
});

test('expired key link clears entered values and shows closed-link fallback',async t=>{
  const p=page(t,(_body,answer)=>answer(410));await settle();p.fill('FIRST','private');p.submit();await settle();
  assert.equal(p.$('#closed').hidden,false);assert.equal(p.$('[name=FIRST]').value,'');
});

// ---------------------------------------------------------------------------
// The guided layout, paste and files, the time left, and the test results

const STRIPE = { name: 'STRIPE_SECRET_KEY', hint: 'Secret key for the payments provider.', title: 'Stripe key', url: 'https://dashboard.stripe.com/apikeys', open: "Open Stripe's keys", steps: ['Tap Create restricted key', 'Tick Read charges', 'Copy the key'], checkHost: 'api.stripe.com' };
const never = () => { throw new Error('nothing should be saved'); };
const saved = (verdict, receipt = { notification: 'notified' }, name = STRIPE.name) => (_body, answer) => answer(200, { saved: [name], failed: [], refused: [], checked: { [name]: verdict }, missing: [], ready: true, receipt });

test('a guided key shows its title, an Open link in a new tab with its host, and numbered steps', async t => {
  const p = page(t, never, { keys: [STRIPE] });
  await settle();
  assert.equal(p.$('#form h1').textContent, 'Stripe key');
  assert.equal(p.window.document.title, 'Stripe key');
  const items = [...p.$('#keys ol.steps').children];
  assert.deepEqual(items.map(item => item.textContent), ["Open Stripe's keysdashboard.stripe.com", ...STRIPE.steps]);
  const link = items[0].querySelector('a');
  assert.deepEqual([link.href, link.target, link.rel, link.textContent], [STRIPE.url, '_blank', 'noopener noreferrer', "Open Stripe's keys"]);
  assert.equal(p.$('[name=STRIPE_SECRET_KEY]').getAttribute('aria-label'), 'Stripe key');
  assert.equal(p.$('[name=STRIPE_SECRET_KEY]').type, 'password');
  assert.doesNotMatch(p.text(), /STRIPE_SECRET_KEY|payments provider/, 'the guide replaces the code name and hint');
  assert.match(p.text(), /Saving tests this key once at api\.stripe\.com\./, 'the test host is named before anything is sent');
});

test('with no guide a key shows its code name and hint, and several keys keep the page\'s own heading', async t => {
  const p = page(t, never, { keys: [{ name: 'MAPS_API_KEY', hint: 'The Maps key.', set: true }, STRIPE] });
  await settle();
  assert.equal(p.$('#form h1').textContent, 'Keys for your assistant');
  const [maps, stripe] = [...p.$('#keys').children];
  assert.equal(maps.querySelector('label').textContent, 'MAPS_API_KEY');
  assert.deepEqual([...maps.querySelectorAll('.hint')].map(hint => hint.textContent), ['The Maps key.', 'This replaces the one saved now.']);
  assert.equal(maps.querySelector('ol, a'), null);
  assert.equal(stripe.querySelector('label').textContent, 'Stripe key');
  assert.equal(stripe.querySelectorAll('ol.steps li').length, 4);
});

test('guide text is set as text, never markup, and only an https address becomes a link', async t => {
  const markup = '<img src=x onerror="document.title=1"><b>bold</b>';
  const p = page(t, never, { keys: [{ name: 'A', hint: '', title: markup, url: 'https://ok.example.com/keys', open: markup, steps: [markup] }, { name: 'B', hint: markup, url: 'javascript:alert(1)', open: 'Open' }, { name: 'C', hint: '', url: 'http://plain.example.com/', steps: ['One'] }] });
  await settle();
  assert.equal(p.$('#keys img, #keys b, #keys script'), null);
  const [a, b, c] = [...p.$('#keys').children];
  assert.equal(a.querySelector('label').textContent, markup);
  assert.equal(a.querySelector('a').textContent, markup);
  assert.equal(a.querySelectorAll('li')[1].textContent, markup);
  assert.equal(b.querySelector('a, ol'), null, 'a script address is no link');
  assert.equal(b.querySelector('.hint').textContent, markup);
  assert.equal(c.querySelector('a'), null);
  assert.deepEqual([...c.querySelectorAll('ol li')].map(item => item.textContent), ['One']);
  assert.deepEqual([httpsHost('https://a.example.com:8443/x'), httpsHost('http://a.example.com'), httpsHost('nope')], ['a.example.com:8443', null, null]);
});

test('Paste fills the box from the clipboard, and is absent where the browser has none', async t => {
  const p = page(t, (_body, answer) => answer(200, { saved: ['FIRST'], failed: [], refused: [], checked: { FIRST: 'untested' }, missing: ['SECOND'], ready: false }), { clipboard: { readText: async () => '  sk_live_1 \n' } });
  await settle();
  assert.equal(p.$('#save').disabled, true);
  p.$('#keys .row button').click();
  await settle();
  assert.equal(p.$('#keys .row button').textContent, 'Paste');
  assert.equal(p.$('[name=FIRST]').value, 'sk_live_1');
  assert.equal(p.$('#save').disabled, false);
  p.submit();
  await settle();
  assert.deepEqual(p.calls.find(call => call.path === 'continue').body, { keys: { FIRST: 'sk_live_1' } });
  assert.equal(p.$('#keys .row button').disabled, true, 'a saved row\'s Paste is locked');

  const none = page(t, never);
  await settle();
  assert.equal(none.$('#keys .row button'), null);
  assert.equal(none.button('Paste'), undefined);
});

test('a refused or empty clipboard says to paste by hand', async t => {
  for (const readText of [async () => { throw new Error('NotAllowedError'); }, async () => '']) {
    const p = page(t, never, { clipboard: { readText } });
    await settle();
    p.$('#keys .row button').click();
    await settle();
    assert.match(p.$('#keys li').textContent, /Tap and hold the box to paste\./);
    assert.equal(p.$('[name=FIRST]').value, '');
  }
});

const PEM = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY-----';

test('a multi-line paste is caught, held out of sight with its line breaks, and sent whole', async t => {
  const p = page(t, (_body, answer) => answer(200, { saved: ['FIRST'], failed: [], refused: [], checked: { FIRST: 'untested' }, missing: ['SECOND'], ready: false }));
  await settle();
  const input = p.$('[name=FIRST]');
  const paste = text => {
    const event = new p.window.Event('paste', { cancelable: true });
    event.clipboardData = { getData: () => text };
    input.dispatchEvent(event);
    return event.defaultPrevented;
  };
  assert.equal(paste('one-line-key'), false, 'a single line goes into the box as usual');
  assert.equal(p.$('#keys .held').hidden, true);
  assert.equal(paste(`${PEM}\r\n`), true);
  assert.equal(p.$('#keys .held').textContent, 'Pasted key · 3 lines');
  assert.equal(p.$('#keys .row').hidden, true);
  assert.equal(input.value, '');
  assert.doesNotMatch(p.text(), /MIIEvQ/, 'the key is never shown');
  assert.equal(p.$('#save').disabled, false);

  p.button('Remove').click();
  assert.equal(p.$('#keys .row').hidden, false);
  assert.equal(p.$('#save').disabled, true, 'removed, so nothing to save');
  paste(PEM);
  p.submit();
  await settle();
  assert.deepEqual(p.calls.find(call => call.path === 'continue').body, { keys: { FIRST: PEM } });
  assert.equal(p.$('#keys .held').hidden, true, 'a saved key is let go');
  assert.equal(heldLabel('key.txt', 'one\n'), 'key.txt · 1 line');
});

/** Picks `file` in the first key's hidden file box, as the device's picker would. */
async function pick(p, file) {
  const input = p.$('#keys input[type=file]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new p.window.Event('change'));
  await settle();
}

test('a picked key file is read on the device and shown as its name and line count only', async t => {
  const p = page(t, saved('untested', undefined, 'GOOGLE_SERVICE_KEY'), { keys: [{ name: 'GOOGLE_SERVICE_KEY', hint: '', title: 'Google key file' }] });
  await settle();
  const content = JSON.stringify({ type: 'service_account', private_key: 'MIIEvQ-secret', a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9 }, null, 2);
  await pick(p, new p.window.File([content], 'google-key.json', { type: 'application/json' }));
  assert.equal(p.$('#keys .held').textContent, 'google-key.json · 13 lines');
  assert.ok(p.button('Pick another file'));
  assert.equal(p.$('#keys .row').hidden, true);
  assert.equal(p.$('[name=GOOGLE_SERVICE_KEY]').value, '');
  assert.doesNotMatch(p.text(), /MIIEvQ-secret|service_account/);
  assert.equal(p.calls.some(call => call.path !== 'keys'), false, 'nothing is sent until Save');
  p.submit();
  await settle();
  assert.deepEqual(p.calls.find(call => call.path === 'continue').body, { keys: { GOOGLE_SERVICE_KEY: content } });
  assert.equal(p.$('#closed').hidden, false);
});

test('a file over 16 KB is refused before it is read or sent, and an empty one says so', async t => {
  const p = page(t, never);
  await settle();
  const big = new p.window.File(['x'.repeat(16 * 1024 + 1)], 'backup.zip');
  big.text = () => { throw new Error('a too-big file was read'); };
  await pick(p, big);
  assert.match(p.$('#keys li').textContent, /That file is too big to be a key\./);
  assert.equal(p.$('#keys .held').hidden, true);
  assert.equal(p.$('#save').disabled, true);
  await pick(p, new p.window.File(['  \n'], 'empty.txt'));
  assert.match(p.$('#keys li').textContent, /That file is empty\./);
  await pick(p, new p.window.File(['x'.repeat(16 * 1024)], 'just-fits.txt'));
  assert.equal(p.$('#keys .held').textContent, 'just-fits.txt · 1 line');
  assert.equal(p.calls.some(call => call.path === 'continue'), false);
});

test('the time left shows in whole minutes on the watcher\'s clock, and the page closes at the limit', async t => {
  assert.equal(timeLeft(1_800_000, 0), 'Closes in 30 min');
  assert.equal(timeLeft(1_800_000, 359_999), 'Closes in 25 min', 'a part minute rounds up');
  assert.equal(timeLeft(1_800_000, 1_799_999), 'Closes in 1 min');
  assert.equal(timeLeft(1_800_000, 1_800_000), null);

  const now = Date.now();
  const p = page(t, never, { closesAt: now + 24 * 60_000 - 5000, now });
  await settle();
  assert.equal(p.$('#time').textContent, 'Closes in 24 min');
  assert.equal(p.$('#closed').hidden, true);

  const skewed = page(t, never, { closesAt: 10 * 60_000, now: 1 });
  await settle();
  assert.equal(skewed.$('#time').textContent, 'Closes in 10 min', 'a device clock that is off does not close the page');

  const ending = page(t, never, { closesAt: Date.now() + 150, now: Date.now() });
  await settle();
  ending.fill('FIRST', 'private');
  assert.equal(ending.$('#closed').hidden, true);
  await new Promise(done => setTimeout(done, 250));
  assert.equal(ending.$('#closed').hidden, false);
  assert.equal(ending.$('#form').hidden, true);
  assert.equal(ending.$('[name=FIRST]').value, '');
  assert.match(ending.$('#closed').textContent, /This link has closed/);

  const untimed = page(t, never);
  await settle();
  assert.equal(untimed.$('#time').textContent, '');
});

test('a tested key says Testing…, then Works beside its name once the link ends', async t => {
  let finish;
  const p = page(t, () => new Promise(done => { finish = done; }), { keys: [STRIPE] });
  await settle();
  p.fill(STRIPE.name, 'sk_live_1');
  p.submit();
  await settle();
  assert.equal(p.$('#save').textContent, 'Testing…');
  assert.equal(p.$('#status').textContent, 'Testing…');
  finish({ status: 200, ok: true, json: async () => ({ saved: [STRIPE.name], failed: [], refused: [], checked: { [STRIPE.name]: 'works' }, missing: [], ready: true, receipt: { notification: 'notified' } }) });
  await settle();
  assert.equal(p.$('#closed').hidden, false);
  assert.deepEqual([...p.$('#results').children].map(line => line.textContent), ['Stripe key: Works']);
  assert.match(p.$('#closed h1').textContent, /notified/);
});

test('an untested key says Saved, not tested, in its row and once the link ends', async t => {
  const p = page(t, (_body, answer) => answer(200, { saved: ['FIRST'], failed: [], refused: [], checked: { FIRST: 'untested' }, missing: ['SECOND'], ready: false }));
  await settle();
  p.fill('FIRST', 'one');
  p.submit();
  assert.equal(p.$('#save').textContent, 'Saving…', 'no test, so no Testing…');
  await settle();
  assert.match(p.$('#keys li').textContent, /Saved, not tested/);
  assert.equal(p.$('#closed').hidden, true);

  const done = page(t, saved('untested', { notification: 'unconfirmed' }), { keys: [STRIPE] });
  await settle();
  done.fill(STRIPE.name, 'sk_live_1');
  done.submit();
  await settle();
  assert.deepEqual([...done.$('#results').children].map(line => line.textContent), ['Stripe key: Saved, not tested']);
});

test('a refused key stays editable with the test host and Save anyway, and the page stays open', async t => {
  const replies = [
    { saved: [], failed: [], refused: [STRIPE.name], checked: {}, missing: [STRIPE.name], ready: false },
    { saved: [STRIPE.name], failed: [], refused: [], checked: { [STRIPE.name]: 'untested' }, missing: [], ready: true, receipt: { notification: 'notified' } },
  ];
  const p = page(t, (_body, answer) => answer(200, replies.shift()), { keys: [STRIPE] });
  await settle();
  assert.equal(p.button('Save anyway'), undefined, 'not offered before a refusal');
  const input = p.$(`[name=${STRIPE.name}]`);
  p.fill(STRIPE.name, 'sk_live_half');
  p.submit();
  await settle();
  assert.match(p.$('#keys li').textContent, /api\.stripe\.com refused this key\. Copy it again, or save it anyway\./);
  assert.doesNotMatch(p.$('#keys li').textContent, /Paste this key before continuing/);
  assert.equal(input.disabled, false);
  assert.equal(input.value, 'sk_live_half', 'the key stays in its box');
  assert.equal(p.$('#form').hidden, false);
  assert.equal(p.$('#closed').hidden, true);
  assert.equal(p.$('#save').disabled, false);

  p.fill(STRIPE.name, 'sk_live_other');
  assert.equal(p.button('Save anyway'), undefined, 'a changed key is tested again, not forced');
  replies.unshift({ saved: [], failed: [], refused: [STRIPE.name], checked: {}, missing: [STRIPE.name], ready: false });
  p.submit();
  await settle();
  p.button('Save anyway').click();
  await settle();
  assert.deepEqual(p.calls.filter(call => call.path === 'continue').map(call => call.body), [{ keys: { [STRIPE.name]: 'sk_live_half' } }, { keys: { [STRIPE.name]: 'sk_live_other' } }, { keys: { [STRIPE.name]: 'sk_live_other' }, force: [STRIPE.name] }]);
  assert.equal(p.$('#closed').hidden, false);
  assert.deepEqual([...p.$('#results').children].map(line => line.textContent), ['Stripe key: Saved, not tested']);
});
