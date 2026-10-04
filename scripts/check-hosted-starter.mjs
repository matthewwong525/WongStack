#!/usr/bin/env node
// Source maintenance only: test the generated release folder, never deploy it.
import { mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { isMain } from '../.agents/skills/memory/scripts/lib/cli.mjs';
import { prepareStarter, validateHostedConfig } from '../server/hosted/starter.mjs';
import { redirectedConfig } from './lib-wrangler-config.mjs';
import { run } from '../server/install-wongstack.mjs';
export async function checkStarter({exec=run,env=process.env}={}) {
  const root=mkdtempSync(join(tmpdir(),'hosted-starter-check-'));
  const dir=join(root,'release');
  try {
    const record=await prepareStarter(dir,{exec,today:new Date().toISOString().slice(0,10)});
    validateHostedConfig(JSON.parse(readFileSync(join(dir,'app/wrangler.jsonc'),'utf8')),'hosted-starter');
    const app=join(dir,'app');
    const options={cwd:app,env:{...env,WONG_HOSTED_PROJECT:'maintenance-starter',WONG_HOSTED_SHA:record.commit},timeout:20*60_000};
    await exec('npm',['ci','--no-audit','--no-fund'],options);
    await exec('npm',['run','cf-typegen'],options);
    await exec('npm',['test'],options);
    await exec('npm',['run','build'],options);
    const generated=redirectedConfig(join(app,'wrangler.jsonc'));
    if(!generated)throw Error('compiled_configuration');
    const compiled=JSON.parse(readFileSync(generated,'utf8'));
    if(compiled.name!=='hosted-starter'||!compiled.previews||!compiled.assets||['d1_databases','r2_buckets','queues','triggers','durable_objects','workflows','containers'].some(key=>compiled[key]&&JSON.stringify(compiled[key])!=='[]'&&JSON.stringify(compiled[key])!=='{}'))throw Error('compiled_configuration');
    const worker=readFileSync(resolve(dirname(generated),compiled.main),'utf8');
    if(!worker.includes('maintenance-starter')||!worker.includes(record.commit))throw Error('compiled_identity');
    const assets=resolve(dirname(generated),compiled.assets.directory);
    if(!readdirSync(assets).includes('index.html'))throw Error('compiled_assets');
    return {ok:true,sourceCommit:record.commit};
  }finally{rmSync(root,{recursive:true,force:true});}
}
if(isMain(import.meta.url)) {
  if(process.env.GITHUB_ACTIONS!=='true') {console.error('This generated app check runs only in Source maintenance CI.');process.exitCode=2;}
  else {try{console.log(JSON.stringify(await checkStarter()));}catch(error){if(error.stdout)console.error(error.stdout);if(error.stderr)console.error(error.stderr);console.error(error.message);process.exitCode=1;}}
}
