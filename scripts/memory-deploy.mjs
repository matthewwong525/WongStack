#!/usr/bin/env node
import { appendFileSync } from 'node:fs';
import { isMain } from './lib-cli.mjs';
import { findWranglerConfig,parseConfig } from './lib-wrangler-config.mjs';
export async function memoryDeploy(args,env=process.env) {
 if(args[0]==='configured'||(args[0]!=='published'&&!parseConfig(findWranglerConfig()).vars?.MEMORY_INSTALLATION)){const result={configured:!!parseConfig(findWranglerConfig()).vars?.MEMORY_INSTALLATION};if(args[0]==='configured'&&env.GITHUB_OUTPUT)appendFileSync(env.GITHUB_OUTPUT,`configured=${result.configured}\n`);return result;}
 const {pipelineContext,runPublicationPhase,bindArtifact,restorePublication,publishedObservation}=await import('./memory-deploy-pipeline.mjs');
 const p=await pipelineContext(env),[phase,...rest]=args;
 let result;
 if(phase==='bind'){await bindArtifact(p,...rest);result={configured:!!p.installation};}
 else if(phase==='restore'){await restorePublication(p,rest[0]);result={configured:!!p.installation};}
 else if(phase==='published')result=await publishedObservation(p);
 else result=await runPublicationPhase(p,phase);
 if(env.GITHUB_OUTPUT)for(const [key,value] of Object.entries(result))appendFileSync(env.GITHUB_OUTPUT,`${key}=${value}\n`);
 return result;
}
if(isMain(import.meta.url))memoryDeploy(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(`memory-deploy: ${e.code??e.message}; publication remains unconfirmed`);process.exitCode=1;});
