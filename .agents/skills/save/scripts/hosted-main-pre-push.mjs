// Trusted pre-push validation only. Git performs the ordinary non-force update.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { artifactsRemote } from '../../wong-sync/scripts/hosted-context.mjs';
import { checkedSelection, hostedDelivery } from './hosted-delivery.mjs';

const fail = () => { throw Error('Repository acknowledgment is incomplete. Read publication status before retrying.'); };
export function validateMainUpdate(result, updates, ancestor) {
  const publication=result?.publication,selection=result?.candidate;
  if(result?.repositoryAckNeeded !== true || publication?.status !== 'deployed-awaiting-confirmation'
    || !publication.provider || !publication.live || publication.repository
    || publication.headSha !== selection?.headSha || publication.baseSha !== selection?.baseSha) fail();
  const lines=updates.trim().split('\n');
  if(lines.length !== 1) fail();
  const parts=lines[0].trim().split(/\s+/);
  if(parts.length !== 4) fail();
  const [,localSha,remoteRef,advertisedOldSha]=parts;
  if(localSha !== publication.headSha || remoteRef !== 'refs/heads/main' || advertisedOldSha !== publication.baseSha
    || !ancestor(publication.baseSha,publication.headSha)) fail();
  return {expectedMainSha:publication.baseSha,approvedSha:publication.headSha};
}
export async function guardMainPush({dir,remote,input,updates,ancestor,fetch,home,uid,origin}) {
  try {
    const selection=checkedSelection(input.selection);
    if(typeof input.publicationId !== 'string') fail();
    artifactsRemote(remote);
    const result=await hostedDelivery('publication',{selection,publicationId:input.publicationId},{dir,remote,fetch,home,uid,origin});
    return validateMainUpdate(result,updates,ancestor);
  } catch { fail(); }
}
if(isMain(import.meta.url)) {
  const usage='usage: hosted-main-pre-push.mjs <remote-name> <remote-url> (WONG_HOSTED_ACK_REPO and WONG_HOSTED_ACK_REQUEST required)';
  const {positionals}=parseCli({usage,allowPositionals:true});
  if(positionals.length !== 2 || !process.env.WONG_HOSTED_ACK_REPO || !process.env.WONG_HOSTED_ACK_REQUEST) usageError(usage);
  try {
    const dir=resolve(process.env.WONG_HOSTED_ACK_REPO),remote=positionals[1];
    const input=JSON.parse(readFileSync(process.env.WONG_HOSTED_ACK_REQUEST,'utf8'));
    let updates='';for await(const chunk of process.stdin){updates+=chunk;if(updates.length>4096)fail();}
    const ancestor=(base,head)=>{
      try { execFileSync('git',['--no-replace-objects','-C',dir,'merge-base','--is-ancestor',base,head],{stdio:'ignore'});return true; }
      catch { return false; }
    };
    await guardMainPush({dir,remote,input,updates,ancestor});
  } catch {
    console.error('Repository acknowledgment is incomplete. Read publication status before retrying.');process.exitCode=1;
  }
}
