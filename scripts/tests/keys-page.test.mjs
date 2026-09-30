import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const scripts = new URL('../../.agents/skills/hand-over/scripts/', import.meta.url);
const source = readFileSync(new URL('keys-page.mjs', scripts), 'utf8').replace(/^export /gm, '');
const html = readFileSync(new URL('keys-page.html', scripts), 'utf8').replace('<script type="module" src="page.mjs"></script>', () => `<script>${source}</script>`);
const settle = async () => { for(let i=0;i<8;i++) await new Promise(done=>setTimeout(done,0)); };
function page(t, respond) {
  const calls=[];
  const answer=(status,body)=>({status,ok:status===200,json:async()=>body});
  const dom=new JSDOM(html,{url:'https://private.test/#key=secret',runScripts:'dangerously',beforeParse(win){win.fetch=async(path,init={})=>{
    calls.push({path,body:init.body&&JSON.parse(init.body)});
    if(path==='keys') return answer(200,{keys:[{name:'FIRST',hint:'First key'},{name:'SECOND',hint:'Second key'}]});
    if(path==='done') return answer(200,{ok:true});
    if(path==='page.mjs') return answer(404);
    return respond(JSON.parse(init.body),answer);
  };}});
  t.after(()=>dom.window.close());
  const $=selector=>dom.window.document.querySelector(selector);
  const fill=(name,value)=>{const input=$(`[name=${name}]`);input.value=value;input.dispatchEvent(new dom.window.Event('input'));};
  const submit=()=>$('#keys-form').dispatchEvent(new dom.window.Event('submit',{cancelable:true}));
  return {$,fill,submit,calls};
}

test('keys page keeps partial success locked and required missing rows editable',async t=>{
  const p=page(t,(_body,answer)=>answer(200,{saved:['FIRST'],failed:[],missing:['SECOND'],ready:false}));
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
