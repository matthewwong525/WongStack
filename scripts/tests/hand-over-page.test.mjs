import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { JSDOM } from 'jsdom';
const scripts=new URL('../../.agents/skills/verify/scripts/',import.meta.url);
const source=readFileSync(new URL('hand-over-page.mjs',scripts),'utf8').replace(/^export /gm,'');
const html=readFileSync(new URL('hand-over-page.html',scripts),'utf8').replace('<script type="module" src="page.mjs"></script>',()=>`<script>${source}</script>`);
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(done=>setTimeout(done,0));};
function page(t,{stale=false,receipt=null,failedFirst=false,resolveAction}={}){
  const events=[];const calls=[];let socket;let stage=0;
  const list=()=>({signature:`page-${stage}`,revision:`${stage+1}`,fields:[...(failedFirst ? [{ref:1,form:'f',kind:'text',label:'Email',type:'email',options:[]}] : []),{ref:0,form:'f',kind:'text',label:stage?'Code':'Password',type:stage?'text':'password',options:[]}],actions:[{ref:`action-${stage}`,form:'f',label:stage?'Verify':'Sign in',disabled:false}]});
  const dom=new JSDOM(html,{url:'https://private.test/#key=secret',runScripts:'dangerously',beforeParse(win){
    win.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
    win.WebSocket=class {static OPEN=1;readyState=1;constructor(){socket=this;}send(text){events.push(JSON.parse(text));}};
    win.fetch=async(path,init={})=>{
      const body=init.body&&JSON.parse(init.body);calls.push({path,body});
      const answer=(status,data)=>({status,ok:status===200,json:async()=>data});
      if(path==='focus' && failedFirst && body.ref===1) return answer(503);
      if(path==='fields')return answer(200,list());
      if(path==='action'){if(resolveAction) return resolveAction(); if(stale)return answer(409);stage=1;return answer(200,{x:50,y:20});}
      if(path==='receipt')return answer(receipt?200:202,receipt??{finishing:false});
      return answer(200,{ok:true});
    };
  }});
  t.after(()=>dom.window.close());
  return {events,calls,$:selector=>dom.window.document.querySelector(selector),window:dom.window,socket:()=>socket};
}

test('mirrored submit drains immediate final character before one ordered click and follows code step',async t=>{
  const p=page(t);await settle();const input=p.$('#f-0');input.value='last-character!';input.dispatchEvent(new p.window.Event('input'));
  const button=p.$('[data-submit]');button.click();button.click();await settle();
  const keys=p.events.filter(e=>e.type==='input_keyboard'&&e.eventType==='keyDown').map(e=>e.text).join('');
  assert.equal(keys,'last-character!');
  const firstMouse=p.events.findIndex(e=>e.type==='input_mouse');
  assert.ok(p.events.slice(0,firstMouse).some(e=>e.text==='!'));
  assert.deepEqual(p.events.slice(firstMouse).map(e=>e.eventType),['mouseMoved','mousePressed','mouseReleased']);
  assert.equal(p.calls.filter(c=>c.path==='action').length,1);
  assert.equal(p.$('[data-submit]').textContent,'Verify');assert.equal(p.$('#fields label').textContent,'Code');
  assert.equal(p.calls.some(c=>c.path==='done'||c.path==='continue'),false,'website submission alone never finishes hand-over');
});

test('stale mirrored submit offers preview fallback and never clicks or resubmits',async t=>{
  const p=page(t,{stale:true});await settle();p.$('[data-submit]').click();await settle();
  assert.equal(p.events.some(e=>e.type==='input_mouse'),false);assert.equal(p.calls.filter(c=>c.path==='action').length,1);
  assert.match(p.$('#status').textContent,/Tap the button on the page/);
});

for(const notification of ['notified','unconfirmed'])test(`automatic stream closure polls receipt and shows ${notification}`,async t=>{
  const p=page(t,{receipt:{result:'done',notification}});await settle();await p.socket().onclose();
  assert.ok(p.calls.some(c=>c.path==='receipt'));assert.equal(p.$('#type').disabled,true);
  assert.match(p.$('#status').textContent,notification==='notified'?/^Your assistant was notified/:/Return to chat and say continue/);
});


test('a failed first field stays unresolved after another field succeeds and blocks mirrored click',async t=>{
  const p=page(t,{failedFirst:true});await settle();
  const email=p.$('#f-1');email.value='me@example.test';email.dispatchEvent(new p.window.Event('input'));await settle();
  const password=p.$('#f-0');password.value='private';password.dispatchEvent(new p.window.Event('input'));await settle();
  p.$('[data-submit]').click();await settle();
  assert.equal(p.events.some(e=>e.type==='input_mouse'),false);
  assert.equal(p.calls.some(c=>c.path==='action'),false);
  assert.match(p.$('#status').textContent,/Tap the button on the page/);
});

test('receipt received during action resolution leaves all controls disabled',async t=>{
  let finish;const p=page(t,{receipt:{result:'done',notification:'notified'},resolveAction:()=>new Promise(done=>{finish=done;})});await settle();
  p.$('[data-submit]').click();await settle();await p.socket().onclose();
  finish({status:200,ok:true,json:async()=>({x:50,y:20})});await settle();
  assert.match(p.$('#status').textContent,/notified/);
  for(const control of p.window.document.querySelector('#fields').elements) assert.equal(control.disabled,true);
  assert.equal(p.events.some(e=>e.type==='input_mouse'),false);
});
