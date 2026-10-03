// Test-only inactivity diagnostic. It never keeps a finished test process alive.
import { writeSync } from 'node:fs';
import { basename } from 'node:path';
import { beforeEach,afterEach } from 'node:test';

const safeLabel=value=>String(value).replace(/[^a-zA-Z0-9 .,'():-]/g,' ').slice(0,240);
const file=safeLabel(basename(process.argv[1]||'test-process'));
const children=new Map();
let last={file,test:'test-process',phase:'fixture-import'},timer;
function arm() {
 clearTimeout(timer);
 timer=setTimeout(()=>{
  const diagnostic={...last,pid:process.pid,status:'inactivity',children:[...children.values()],resources:process.getActiveResourcesInfo().map(safeLabel)};
  try{writeSync(2,'memory fixture inactivity: '+JSON.stringify(diagnostic)+'\n');}finally{process.exit(1);}
 },180000);
 timer.unref();
}
// Callers supply fixed phases and copied test names, never test contexts or data.
export function fixtureProgress(phase,test=last.test) {
 last={file,test:safeLabel(test),phase};arm();
}
export function trackFixtureChild(child) {
 const pid=child.pid??null,test=last.test;
 const record=status=>{if(pid!==null)children.set(pid,{file,test,pid,status});fixtureProgress('child-'+status);};
 record('start');
 child.once('exit',()=>record('exit'));
 child.once('error',()=>record('error'));
 child.once('close',()=>{if(pid!==null)children.delete(pid);fixtureProgress('child-close');});
}
beforeEach(t=>fixtureProgress('test-start',t.name));
afterEach(t=>fixtureProgress('test-teardown-complete',t.name));
arm();
