import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInContext } from 'node:vm';
import { JSDOM } from 'jsdom';
import { revealOffset } from '../../.agents/skills/hand-over/scripts/hand-over-page.mjs';
const scripts=new URL('../../.agents/skills/hand-over/scripts/',import.meta.url);
const sourcePath=fileURLToPath(new URL('hand-over-page.mjs',scripts));
// Keep byte offsets and the real filename so V8 records coverage for the browser code exercised.
const source=readFileSync(sourcePath,'utf8').replace(/^export /gm,'       ');
const html=readFileSync(new URL('hand-over-page.html',scripts),'utf8').replace('<script type="module" src="page.mjs"></script>','');
const settle=async()=>{for(let i=0;i<10;i++)await new Promise(done=>setTimeout(done,0));};
function page(t,{stale=false,receipt=null,failedFirst=false,resolveAction,navigationStatus=200,navigationReason=null,width=1024,height=400,pannable=false,metadata=false,horizontal=false,responsive=false,visualViewport=false,fieldX=30,fieldY=20}={}){
  const events=[];const calls=[];const order=[];let socket;let stage=0;let moved=0;let changed=false;let poll;
  const list=()=>({viewport:metadata?(responsive?calls.findLast(c=>c.path==='viewport')?.body:{width:400,height:pannable?720:400}):null,formWidth:metadata?(responsive?calls.findLast(c=>c.path==='viewport')?.body.width:400):0,signature:`page-${stage}-${changed}`,revision:`${stage+1}`,fields:[...(failedFirst ? [{ref:1,form:'f',kind:'text',label:'Email',type:'email',options:[]}] : []),{ref:0,form:'f',kind:'text',label:stage?'Code':'Password',type:stage?'text':'password',autocomplete:'current-password',inputmode:'text',...(metadata?{identity:`field-${stage}`,geometry:{x:fieldX,y:fieldY+moved,width:150,height:24},hit:{x:fieldX-10,y:fieldY-10+moved,width:170,height:44}}:{}),options:[]}],actions:[{ref:`action-${stage}`,form:'f',label:stage?'Verify':'Sign in',disabled:false}]});
  const dom=new JSDOM(html,{url:'https://private.test/#key=secret',runScripts:'outside-only',beforeParse(win){
    Object.defineProperty(win.Document.prototype,'hidden',{get:()=>false});
    win.setInterval=callback=>{poll=callback;return 1;};
    Object.defineProperty(win,'innerWidth',{value:width,writable:true});
    Object.defineProperty(win,'innerHeight',{value:height,writable:true});
    if(visualViewport) Object.defineProperty(win,'visualViewport',{value:Object.assign(new win.EventTarget(),{width,height,scale:1,offsetTop:0,offsetLeft:0})});
    Object.defineProperty(win.HTMLElement.prototype,'clientWidth',{get(){return win.innerWidth < 800 && win.document.querySelector('#page-panel')?.hasAttribute('inert') ? 0 : win.innerWidth < 800 ? win.innerWidth-20 : win.innerWidth-380;}});
    Object.defineProperty(win.HTMLElement.prototype,'clientHeight',{get(){return height;}});
    Object.defineProperty(win.HTMLElement.prototype,'scrollHeight',{get(){return pannable ? 360 : height;}});
    win.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,right:200,bottom:height,width:200,height});
    Object.defineProperty(win.HTMLElement.prototype,'scrollWidth',{get(){return horizontal?470:this.clientWidth;}});
    win.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:horizontal?-win.document.querySelector('#stage').scrollLeft:0,top:pannable?-win.document.querySelector('#stage').scrollTop:0,width:200,height:pannable?360:400});
    win.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
    const captured=new Set();
    win.HTMLElement.prototype.setPointerCapture=id=>captured.add(id);
    win.HTMLElement.prototype.hasPointerCapture=id=>captured.has(id);
    win.HTMLElement.prototype.releasePointerCapture=id=>captured.delete(id);
    win.createImageBitmap=async()=>({width:400,height:pannable?720:400,close(){}});
    win.WebSocket=class {static OPEN=1;readyState=1;constructor(){socket=this;}send(text){const event=JSON.parse(text);events.push(event);order.push(event);}};
    win.fetch=async(path,init={})=>{
      const body=init.body&&JSON.parse(init.body);calls.push({path,body});order.push({path});
      const answer=(status,data)=>({status,ok:status===200,json:async()=>data});
      if(path==='focus' && failedFirst && body.ref===1) return answer(503);
      if(path==='fields')return answer(200,list());
      if(path==='action'){if(resolveAction) return resolveAction(); if(stale)return answer(409);stage=1;return answer(200,{x:50,y:20});}
      if(path==='navigate'){if(navigationStatus===200)stage=1;return answer(navigationStatus,{ok:navigationStatus===200,reason:navigationReason});}
      if(path==='receipt')return answer(receipt?200:202,receipt??{finishing:false});
      return answer(200,{ok:true});
    };
  }});
  runInContext(source,dom.getInternalVMContext(),{filename:sourcePath});
  t.after(()=>dom.window.close());
  return {events,calls,order,$:selector=>dom.window.document.querySelector(selector),window:dom.window,socket:()=>socket,refresh:()=>poll(),move:()=>{moved+=10;},change:()=>{changed=true;}};
}

for(const action of ['start','back','forward'])test(`${action} drains final typing once and follows the destination field list`,async t=>{
  const p=page(t,{width:320});await settle();
  p.$('#fields-tab').click();
  const input=p.$('#f-0');input.value='final!';input.dispatchEvent(new p.window.Event('input'));
  p.$(`[data-navigate="${action}"]`).click();p.$(`[data-navigate="${action}"]`).click();
  assert.equal(p.$('[data-navigate="forward"]').disabled,true);
  await settle();
  assert.equal(p.events.filter(e=>e.eventType==='keyDown').map(e=>e.text).join(''),'final!');
  assert.ok(p.calls.findIndex(c=>c.path==='focus')<p.calls.findIndex(c=>c.path==='navigate'));
  assert.ok(p.order.findLastIndex(e=>e.type==='input_keyboard')<p.order.findIndex(e=>e.path==='navigate'));
  assert.deepEqual(p.calls.filter(c=>c.path==='navigate'),[{path:'navigate',body:{action}}]);
  assert.equal(p.$('#fields label').textContent,'Code');assert.equal(p.$('#f-0').value,'');
  assert.equal(p.window.location.pathname,'/');assert.equal(p.$('[data-navigate="back"]').disabled,false);
});

test('failed navigation is never repeated and closed links disable all navigation',async t=>{
  const p=page(t,{navigationStatus:502,receipt:{result:'cancelled',notification:'not-requested'}});await settle();
  p.$('[data-navigate="reload"]').click();await settle();
  assert.equal(p.calls.filter(c=>c.path==='navigate').length,1);
  assert.match(p.$('#status').textContent,/not repeated/);
  await p.socket().onclose();
  for(const button of p.window.document.querySelectorAll('[data-navigate]'))assert.equal(button.disabled,true);
  p.$('[data-navigate="forward"]').click();await settle();assert.equal(p.calls.filter(c=>c.path==='navigate').length,1);
});

for(const action of ['back','forward','start'])test(`${action} with refused navigation preserves native input, mirrored edits, focus and both preview axes`,async t=>{
  const p=page(t,{navigationStatus:409,navigationReason:action==='start'?'unavailable-start':'no-history',width:320,height:200,pannable:true,horizontal:true,metadata:true});await settle();await giveFrame(p);
  const input=p.$('#targets input'), mirrored=p.$('#f-0'), submit=p.$('[data-submit]');
  input.focus();input.value='keep-private';input.dispatchEvent(new p.window.Event('input'));await settle();
  const stage=p.$('#stage');stage.scrollTop=90;stage.scrollLeft=40;
  const scans=p.calls.filter(c=>c.path==='fields').length;
  p.$(`[data-navigate="${action}"]`).click();await settle();
  assert.equal(p.$('#targets input'),input);assert.equal(p.$('#f-0'),mirrored);assert.equal(p.$('[data-submit]'),submit);
  assert.equal(input.value,'keep-private');assert.equal(mirrored.value,'keep-private');
  assert.equal(p.window.document.activeElement,input);assert.equal(stage.scrollTop,90);assert.equal(stage.scrollLeft,40);
  assert.equal(p.calls.filter(c=>c.path==='fields').length,scans);
  assert.deepEqual(p.calls.filter(c=>c.path==='navigate'),[{path:'navigate',body:{action}}]);
  assert.match(p.$('#status').textContent,action==='start'?/original page is unavailable/:action==='back'?/No previous page.*Return to start/:/No next page.*Return to start/);
  assert.equal(p.$('[data-navigate="start"]').disabled,false);
  // Subsequent edits keep the same private typing target rather than refocusing a cleared field.
  input.value+='!';input.dispatchEvent(new p.window.Event('input'));await settle();
  assert.equal(p.calls.filter(c=>c.path==='focus').length,1);
  assert.equal(p.events.filter(e=>e.eventType==='keyDown').map(e=>e.text).join(''),'keep-private!');
});

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

const pointer=(p,type,x,y,extra={})=>{
  const event=new p.window.Event(type,{bubbles:true,cancelable:true});
  const {target,...props}=extra;
  Object.assign(event,{pointerType:'touch',pointerId:1,clientX:x,clientY:y,...props});
  (target??p.$('#view')).dispatchEvent(event);return event;
};
const giveFrame=async p=>{p.socket().onmessage({data:JSON.stringify({type:'frame',data:'AA=='})});await settle();};

test('phone tabs preserve entered fields, remove inactive focus, and never request a hidden viewport',async t=>{
  const p=page(t,{width:390,height:640});await settle();
  assert.equal(p.$('#fields-panel').hasAttribute('inert'),true);
  assert.equal(p.$('#page-panel').hasAttribute('inert'),false);
  assert.deepEqual(p.calls.find(c=>c.path==='viewport').body,{width:370,height:720});
  p.$('#fields-tab').click();
  const input=p.$('#f-0');input.value='keep-this';input.focus();
  p.$('#page-tab').click();
  assert.equal(p.$('#f-0'),input);assert.equal(input.value,'keep-this');
  assert.notEqual(p.window.document.activeElement,input);
  assert.equal(p.$('#fields-panel').getAttribute('aria-hidden'),'true');
  p.$('#fields-tab').click();
  assert.equal(input.value,'keep-this');
  assert.equal(p.calls.filter(c=>c.path==='viewport').length,1);
  assert.equal(p.$('#type-open'),null); assert.equal(p.$('[data-scroll]'),null);
  p.$('#fields-tab').click(); p.$('#other').open=true;p.$('#type').focus();assert.equal(p.window.document.activeElement,p.$('#type'));
  assert.ok(p.$('.workspace').compareDocumentPosition(p.$('.navigation')) & 4);
});

test('desktop keeps both panels available and uses desktop size despite the narrower page panel',async t=>{
  const p=page(t,{width:900});await settle();
  assert.equal(p.$('#fields-panel').hasAttribute('inert'),false);assert.equal(p.$('#page-panel').hasAttribute('inert'),false);
  assert.deepEqual(p.calls.find(c=>c.path==='viewport').body,{width:1280,height:720});
  p.window.innerWidth=790;p.window.dispatchEvent(new p.window.Event('resize'));await new Promise(done=>setTimeout(done,350));
  assert.equal(p.$('#fields-panel').hasAttribute('inert'),true);
  assert.deepEqual(p.calls.filter(c=>c.path==='viewport').at(-1).body,{width:770,height:720});
  p.window.dispatchEvent(new p.window.Event('resize'));await new Promise(done=>setTimeout(done,350));
  assert.equal(p.calls.filter(c=>c.path==='viewport').length,2,'height-only or repeated resize never changes the remote viewport');
});

test('captured swipe scrolls beyond the canvas using fitted-image scale without clicking',async t=>{
  const p=page(t);await settle();await giveFrame(p);
  pointer(p,'pointerdown',100,200);assert.equal(p.$('#view').hasPointerCapture(1),true);
  assert.equal(pointer(p,'pointermove',100,50).defaultPrevented,true);
  pointer(p,'pointermove',100,-20);pointer(p,'pointerup',100,-20);
  assert.deepEqual(p.events.map(e=>[e.eventType,e.deltaY]),[['mouseWheel',300],['mouseWheel',140]]);
  assert.deepEqual(p.events.map(e=>[e.x,e.y]),[[200,200],[200,200]],'a drag ending outside retains its initial remote container');
  assert.equal(p.$('#view').hasPointerCapture(1),false);
});

for(const cancel of ['pointercancel','lostpointercapture'])test(`${cancel} never turns a touch into a click`,async t=>{
  const p=page(t);await settle();await giveFrame(p);
  pointer(p,'pointerdown',100,200);pointer(p,cancel,100,200);pointer(p,'pointerup',100,200);
  assert.deepEqual(p.events,[]);
});

test('another pointer cannot end a captured gesture and a moved release cannot click',async t=>{
  const p=page(t);await settle();await giveFrame(p);
  pointer(p,'pointerdown',100,200);pointer(p,'pointerup',100,200,{pointerId:2});
  assert.equal(p.$('#view').hasPointerCapture(1),true);
  pointer(p,'pointerup',100,170);assert.deepEqual(p.events,[]);
});

test('phone swipes pan the taller preview before scrolling remotely, and taps map after panning',async t=>{
  const p=page(t,{width:390,height:200,pannable:true});await settle();await giveFrame(p);
  pointer(p,'pointerdown',100,150);pointer(p,'pointermove',100,50);pointer(p,'pointerup',100,50);
  assert.equal(p.$('#stage').scrollTop,100);assert.deepEqual(p.events,[]);
  pointer(p,'pointerdown',100,150);pointer(p,'pointermove',100,50);pointer(p,'pointerup',100,50);
  assert.equal(p.$('#stage').scrollTop,160);
  assert.deepEqual(p.events.map(e=>[e.eventType,e.deltaY,e.y]),[['mouseWheel',80,500]],'remote remainder keeps the gesture starting container');
  pointer(p,'pointerdown',100,80);pointer(p,'pointerup',100,80);
  assert.deepEqual(p.events.slice(1).map(e=>[e.eventType,e.x,e.y]),[['mouseMoved',200,480],['mousePressed',200,480],['mouseReleased',200,480]]);
});

test('phone swipes use visible height, and explicit or streamed navigation resets panning',async t=>{
  const p=page(t,{width:390,height:200,pannable:true});await settle();await giveFrame(p);
  pointer(p,'pointerdown',100,180);pointer(p,'pointermove',100,40);pointer(p,'pointerup',100,40);assert.equal(p.$('#stage').scrollTop,140);assert.deepEqual(p.events,[]);
  pointer(p,'pointerdown',100,40);pointer(p,'pointermove',100,180);pointer(p,'pointerup',100,180);assert.equal(p.$('#stage').scrollTop,0);assert.deepEqual(p.events,[]);
  pointer(p,'pointerdown',100,180);pointer(p,'pointermove',100,40);pointer(p,'pointerup',100,40);
  p.socket().onmessage({data:JSON.stringify({type:'url',url:'https://target.test/next'})});
  assert.equal(p.$('#stage').scrollTop,0);
  pointer(p,'pointerdown',100,180);pointer(p,'pointermove',100,40);pointer(p,'pointerup',100,40);
  p.socket().onmessage({data:JSON.stringify({type:'url',url:'https://target.test/next'})});
  assert.equal(p.$('#stage').scrollTop,140,'repeated address notifications keep the preview position');
  p.$('[data-navigate="reload"]').click();await settle();assert.equal(p.$('#stage').scrollTop,0);
});


test('two-axis preview panning consumes each range before independent remote remainders',async t=>{
  const p=page(t,{width:390,height:200,pannable:true,horizontal:true});await settle();await giveFrame(p);
  pointer(p,'pointerdown',150,180);pointer(p,'pointermove',20,0);pointer(p,'pointerup',20,0);
  assert.equal(p.$('#stage').scrollLeft,100);assert.equal(p.$('#stage').scrollTop,160);
  assert.deepEqual(p.events.map(e=>[e.deltaX,e.deltaY]),[[60,40]]);
  pointer(p,'pointerdown',50,30);pointer(p,'pointerup',50,30);
  assert.deepEqual(p.events.slice(1).map(e=>[e.x,e.y]),[[300,380],[300,380],[300,380]]);
  p.$('[data-navigate="reload"]').click();await settle();assert.equal(p.$('#stage').scrollLeft,0);assert.equal(p.$('#stage').scrollTop,0);
});

test('direct native password tap focuses synchronously without clearing source, shares edits and preserves focus when moved',async t=>{
  const p=page(t,{width:390,metadata:true});await settle();await giveFrame(p);p.refresh();await settle();
  const input=p.$('#targets input');assert.ok(input);assert.equal(input.type,'password');assert.equal(input.autocomplete,'current-password');
  pointer(p,'pointerdown',40,150,{target:input});pointer(p,'pointerup',40,150,{target:input});
  assert.equal(p.window.document.activeElement,input);assert.equal(p.calls.some(c=>c.path==='focus'),false);assert.deepEqual(p.events,[]);
  input.value='private-test';input.dispatchEvent(new p.window.Event('input'));await settle();assert.equal(p.$('#f-0').value,'private-test');
  assert.equal(p.calls.find(c=>c.path==='focus').body.identity,'field-0');
  p.change();p.move();p.refresh();await settle();assert.equal(p.$('#targets input'),input);assert.equal(input.style.top,'10px');assert.equal(p.window.document.activeElement,input);
  p.$('#fields-tab').click();assert.equal(p.$('#f-0').value,'private-test');
  p.$('#f-0').value='shared';p.$('#f-0').dispatchEvent(new p.window.Event('input'));await settle();assert.equal(input.value,'shared');
});

test('swiping over a native field pans without focus or click; remote scrolling suspends stale targets',async t=>{
  const p=page(t,{width:390,height:200,pannable:true,metadata:true});await settle();await giveFrame(p);p.refresh();await settle();
  const input=p.$('#targets input');
  pointer(p,'pointerdown',50,150,{target:input});pointer(p,'pointermove',50,30,{target:input});pointer(p,'pointerup',50,30,{target:input});
  assert.equal(p.$('#stage').scrollTop,120);assert.notEqual(p.window.document.activeElement,input);assert.equal(p.calls.some(c=>c.path==='focus'),false);assert.deepEqual(p.events,[]);
  pointer(p,'pointerdown',50,150,{target:input});pointer(p,'pointermove',50,30,{target:input});pointer(p,'pointerup',50,30,{target:input});
  assert.equal(input.style.pointerEvents,'none');assert.equal(p.events.every(e=>e.eventType==='mouseWheel'),true);
});

test('navigation preserves untouched source fields',async t=>{
  const p=page(t,{width:390,metadata:true});await settle();p.$('[data-navigate="reload"]').click();await settle();assert.equal(p.calls.some(c=>c.path==='focus'),false);
});


test('queued native edits never replay after remote navigation',async t=>{
  const p=page(t,{width:390,metadata:true});await settle();await giveFrame(p);p.refresh();await settle();
  p.socket().onmessage({data:JSON.stringify({type:'url',url:'https://site.test/one'})});
  const input=p.$('#targets input');input.value='do-not-replay';input.dispatchEvent(new p.window.Event('input'));
  p.socket().onmessage({data:JSON.stringify({type:'url',url:'https://site.test/two'})});
  await settle();assert.equal(p.events.some(e=>e.type==='input_keyboard'),false);assert.equal(p.calls.some(c=>c.path==='focus'),false);
});


test('metadata from another viewport cannot grow the requested phone layout',async t=>{
  const p=page(t,{width:390,metadata:true});await settle();await giveFrame(p);p.refresh();await settle();
  assert.deepEqual(p.calls.filter(c=>c.path==='viewport').map(c=>c.body.width),[370]);
});


test('a responsive form keeps the phone width after returning from desktop',async t=>{
  const p=page(t,{width:1440,metadata:true,responsive:true});await settle();
  assert.deepEqual(p.calls.filter(c=>c.path==='viewport').map(c=>c.body.width),[1280]);
  p.window.innerWidth=390;p.window.dispatchEvent(new p.window.Event('resize'));
  await new Promise(done=>setTimeout(done,350));await settle();p.refresh();await settle();
  assert.equal(p.calls.filter(c=>c.path==='viewport').at(-1).body.width,370);
});

const changeViewport=(p,properties,type='resize')=>{
  Object.assign(p.window.visualViewport,properties);
  p.window.visualViewport.dispatchEvent(new p.window.Event(type));
};

test('phone keyboard hides chrome, follows viewport offsets and restores controls while focus stays',async t=>{
  const p=page(t,{width:390,height:740,visualViewport:true,receipt:{result:'done',notification:'notified'}});await settle();
  p.$('#fields-tab').click();const input=p.$('#f-0');input.value='retained';input.focus();
  assert.equal(p.$('.shell').classList.contains('keyboard-open'),false,'hardware keyboard keeps chrome');
  const sizing=p.calls.filter(c=>c.path==='viewport').length;
  changeViewport(p,{height:300,offsetTop:55});await settle();
  assert.equal(p.$('.shell').classList.contains('keyboard-open'),true);
  assert.equal(p.$('.shell').style.height,'300px');assert.equal(p.$('.shell').style.top,'55px');
  assert.equal(p.$('.shell').style.width,'');assert.equal(p.window.document.activeElement,input);
  changeViewport(p,{offsetTop:85},'scroll');assert.equal(p.$('.shell').style.top,'85px');
  changeViewport(p,{height:740,offsetTop:0});await settle();
  assert.equal(p.$('.shell').classList.contains('keyboard-open'),false);
  assert.equal(p.window.document.activeElement,input);assert.equal(input.value,'retained');
  assert.equal(p.calls.filter(c=>c.path==='viewport').length,sizing);
  changeViewport(p,{height:300});assert.equal(p.$('.shell').classList.contains('keyboard-open'),true);
  await p.socket().onclose();assert.equal(p.$('.shell').classList.contains('keyboard-open'),false);
  assert.match(p.$('#status').textContent,/notified/);
});

test('pinch zoom and desktop shrinking do not hide chrome, and orientation uses a fresh height',async t=>{
  const p=page(t,{width:390,height:740,visualViewport:true});await settle();p.$('#fields-tab').click();p.$('#f-0').focus();
  changeViewport(p,{height:300,scale:2});assert.equal(p.$('.shell').classList.contains('keyboard-open'),false);
  p.window.innerWidth=740;p.window.innerHeight=390;changeViewport(p,{width:740,height:390,scale:1});
  assert.equal(p.$('.shell').classList.contains('keyboard-open'),false);
  changeViewport(p,{height:180});assert.equal(p.$('.shell').classList.contains('keyboard-open'),true);
  p.window.innerWidth=900;p.window.dispatchEvent(new p.window.Event('resize'));changeViewport(p,{height:180});
  assert.equal(p.$('.shell').classList.contains('keyboard-open'),false);assert.equal(p.$('.shell').style.height,'');assert.equal(p.$('.shell').style.top,'');
});

function localScroller(p,selector,{width,height}={}){
  const node=p.$(selector), vv=p.window.visualViewport;
  Object.defineProperties(node,{clientWidth:{get:()=>width},clientHeight:{get:()=>vv.height-20},scrollWidth:{get:()=>400},scrollHeight:{get:()=>height}});
  node.getBoundingClientRect=()=>({left:10,top:vv.offsetTop+10,right:width+10,bottom:vv.offsetTop+vv.height-10,width,height:vv.height-20});
  return node;
}

test('keyboard reveal uses actual text geometry, keeps focus and pans only needed axes after layout',async t=>{
  const p=page(t,{width:390,height:740,pannable:true,metadata:true,visualViewport:true,fieldX:230,fieldY:500});await settle();await giveFrame(p);
  const stage=localScroller(p,'#stage',{width:250,height:720});
  p.$('#view').getBoundingClientRect=()=>({left:10-stage.scrollLeft,top:p.window.visualViewport.offsetTop+10-stage.scrollTop,width:400,height:720});
  p.refresh();await settle();const input=p.$('#targets input');input.focus();stage.scrollLeft=10;stage.scrollTop=60;
  const sizing=p.calls.filter(c=>c.path==='viewport').length;
  changeViewport(p,{height:300,offsetTop:40});await settle();
  assert.equal(stage.scrollLeft,140);assert.equal(stage.scrollTop,254,'text bottom is visible, rather than the larger hit outline');
  assert.equal(p.window.document.activeElement,input);assert.equal(p.$('#view').style.width,'100%');
  input.value='right-target';input.dispatchEvent(new p.window.Event('input'));await settle();
  assert.equal(p.calls.find(c=>c.path==='focus').body.identity,'field-0');assert.equal(p.$('#f-0').value,'right-target');
  p.move();p.refresh();await settle();assert.equal(stage.scrollTop,264);assert.equal(p.$('#targets input'),input);
  pointer(p,'pointerdown',150,100,{target:input});pointer(p,'pointermove',150,150,{target:input});pointer(p,'pointerup',150,150,{target:input});
  assert.equal(stage.scrollTop,214);p.move();p.refresh();await settle();
  await new Promise(done=>setTimeout(done,150));assert.equal(stage.scrollTop,214,'metadata and delayed layout work never undo a deliberate pan');
  changeViewport(p,{offsetTop:80},'scroll');await settle();assert.equal(stage.scrollTop,274);
  changeViewport(p,{height:740,offsetTop:0});await settle();
  assert.equal(stage.scrollTop,274);assert.equal(stage.scrollLeft,140);assert.equal(p.window.document.activeElement,input);assert.equal(input.value,'right-target');
  assert.equal(p.calls.filter(c=>c.path==='viewport').length,sizing);
});

test('Fields and Other typing reveal in their own scroller without moving the preview or changing target',async t=>{
  const p=page(t,{width:390,height:740,visualViewport:true});await settle();p.$('#fields-tab').click();
  const panel=localScroller(p,'#fields-panel',{width:370,height:1000});
  const rect=y=>()=>({left:20,top:p.window.visualViewport.offsetTop+10+y-panel.scrollTop,right:350,bottom:p.window.visualViewport.offsetTop+58+y-panel.scrollTop,width:330,height:48});
  p.$('#type').getBoundingClientRect=rect(600);p.$('#f-0').getBoundingClientRect=rect(720);
  panel.scrollTop=20;p.$('#stage').scrollTop=45;p.$('#type').focus();changeViewport(p,{height:300,offsetTop:40});await settle();
  assert.equal(panel.scrollTop,378);assert.equal(p.$('#stage').scrollTop,45);
  p.$('#type').value='other';p.$('#type').dispatchEvent(new p.window.Event('input'));await settle();
  assert.equal(p.events.filter(e=>e.eventType==='keyDown').map(e=>e.text).join(''),'other');assert.equal(p.calls.some(c=>c.path==='focus'),false);
  const input=p.$('#f-0');input.focus();await settle();assert.equal(panel.scrollTop,498);
  input.value='listed';input.dispatchEvent(new p.window.Event('input'));await settle();assert.equal(p.calls.find(c=>c.path==='focus').body.ref,0);
  assert.equal(p.window.document.activeElement,input);assert.equal(p.$('#stage').scrollTop,45);
});

test('fields outside captured pixels are hidden native targets and remain in Fill fields',async t=>{
  const p=page(t,{width:390,pannable:true,metadata:true,fieldY:800});await settle();await giveFrame(p);p.refresh();await settle();
  assert.equal(p.$('#targets input').hidden,true);assert.ok(p.$('#f-0'));
});

test('nearly full-width and oversized fields stay still on repeated reveals',()=>{
  let left=48;
  const first=revealOffset(left,left+368,0,370);assert.equal(first,47);left-=first;
  for(let i=0;i<6;i++) assert.equal(revealOffset(left,left+368,0,370),0);
  assert.equal(revealOffset(-20,440,0,370),0,'an oversized field already spans the view');
  assert.equal(revealOffset(380,840,0,370),380,'an oversized field outside the view aligns its leading edge');
  assert.equal(revealOffset(0,460,0,370),0);
});

 test('navigation uses four distinct SVG icons with accessible labels and tooltips', t=>{
  const p=page(t);const buttons=[...p.window.document.querySelectorAll('[data-navigate]')];
  assert.deepEqual(buttons.map(b=>b.dataset.navigate),['back','forward','reload','start']);
  assert.deepEqual(buttons.map(b=>b.getAttribute('aria-label')),['Back','Forward','Reload','Return to start']);
  for(const button of buttons){assert.equal(button.title,button.getAttribute('aria-label'));assert.equal(button.textContent.trim(),'');assert.equal(button.querySelector('svg').getAttribute('aria-hidden'),'true');}
  assert.equal(new Set(buttons.map(b=>b.querySelector('path').getAttribute('d'))).size,4);
 });
