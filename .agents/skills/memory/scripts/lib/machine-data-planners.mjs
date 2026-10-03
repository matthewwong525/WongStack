// Finite inactive capture/deployment statements. No caller-supplied SQL.
export function planDataAttempt(state,input,action,payload,requestHash,auditId,proof = null) {
 const d=state.data.configuration;
 return {sql:`INSERT INTO memory_data_attempts(id,installation_id,action,request_hash,payload_json,expected_json,revision,audit_id,nonce_hash,proof_hash,deadline,created_at)
 SELECT ?,?,?,?,?,?,?,?,?,?,?,unixepoch() FROM memory_data_configuration d JOIN memory_runtime_configuration r USING(installation_id)
 JOIN memory_machine_configuration c USING(installation_id) WHERE d.installation_id=? AND d.revision=? AND d.state='pending'
 AND r.state='pending' AND c.state='pending' AND c.auth_revision=? AND c.pin_revision=? AND r.runtime_revision=?`,
 params:[input.attemptId,d.installation_id,action,requestHash,JSON.stringify(payload),JSON.stringify(input.expected),input.expected.dataRevision,auditId,proof?.nonceHash??null,proof?.proofHash??null,proof?.deadline??null,
 d.installation_id,input.expected.dataRevision,input.expected.authRevision,input.expected.pinRevision,input.expected.runtimeRevision]};
}
export function planDataCapture(input,payload,auditId) {
 const guard=`EXISTS(SELECT 1 FROM memory_data_capture_authority WHERE id=? AND audit_id=? AND payload_json=?)`;
 const tail=[input.attemptId,auditId,JSON.stringify(payload)],result=[];
 const append=(sql,params)=>result.push({sql:`${sql} AND ${guard}`,params:[...params,...tail]});
 for(const tag of payload.newTags) {
  append(`INSERT INTO tags(name,definition,alias_of,created_by,created_at) SELECT ?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM tags WHERE name=?)`,
   [tag.name,tag.definition,tag.aliasOf,payload.machineId,payload.session?.updatedAt??payload.run.finishedAt,tag.name]);
  append(`INSERT INTO memory_data_tag_definitions(attempt_id,name,tag_json) SELECT ?,name,? FROM tags WHERE name=? AND definition=? AND alias_of IS ?`,
   [input.attemptId,JSON.stringify(tag),tag.name,tag.definition,tag.aliasOf]);
 }
 const session=payload.session;
 if(session) {
  append(`INSERT INTO sessions(id,agent,author,machine,status,reason,read_through,updated_at,owner_principal_id,capture_attempt_id,branch,cwd,started_at,ended_at)
   SELECT ?,?,?,?, ?,?,?,?,?,?,?,?,?,? WHERE ? IS NULL AND NOT EXISTS(SELECT 1 FROM sessions WHERE id=?)`,
  [session.id,session.agent,payload.machineId,payload.machineId,session.status,session.reason,session.nextCursor,session.updatedAt,payload.machineId,input.attemptId,session.branch,session.cwd,session.startedAt,session.endedAt,session.previousCursor,session.id]);
  append(`INSERT INTO memory_data_session_owners(session_id,installation_id,repository_id,machine_id)
   SELECT ?,installation_id,?,? FROM memory_data_capture_authority WHERE id=?
   AND NOT EXISTS(SELECT 1 FROM memory_data_session_owners WHERE session_id=?)
   AND EXISTS(SELECT 1 FROM sessions WHERE id=? AND owner_principal_id=? AND author=? AND machine=?)`,
  [session.id,payload.repositoryId,payload.machineId,input.attemptId,session.id,session.id,payload.machineId,payload.machineId,payload.machineId]);
  append(`UPDATE sessions SET status=?,reason=?,read_through=?,updated_at=?,capture_attempt_id=?,branch=?,cwd=?,started_at=?,ended_at=? WHERE id=? AND agent=? AND owner_principal_id=?
   AND read_through IS ? AND EXISTS(SELECT 1 FROM memory_data_session_owners WHERE session_id=? AND machine_id=?)`,
  [session.status,session.reason,session.nextCursor,session.updatedAt,input.attemptId,session.branch,session.cwd,session.startedAt,session.endedAt,session.id,session.agent,payload.machineId,session.previousCursor,session.id,payload.machineId]);
  append(`INSERT INTO memory_data_session_events(attempt_id,session_id,machine_id,previous_cursor,next_cursor,session_json)
   SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sessions WHERE id=? AND agent=? AND owner_principal_id=?
   AND status=? AND reason IS ? AND read_through IS ? AND updated_at=? AND capture_attempt_id=?)`,
  [input.attemptId,session.id,payload.machineId,session.previousCursor,session.nextCursor,JSON.stringify(session),session.id,session.agent,payload.machineId,
   session.status,session.reason,session.nextCursor,session.updatedAt,input.attemptId]);
 }
 for(const [ordinal,fact] of payload.facts.entries()) {
  append(`INSERT INTO facts(slug,type,body,session_id,source,created_at,author,shared,owner_principal_id,capture_attempt_id,capture_ordinal)
   SELECT ?,?, ?,?,?, ?,?,?, ?,?,? WHERE EXISTS(SELECT 1 FROM memory_data_session_events WHERE attempt_id=?)`,
  [fact.slug,fact.type,fact.body,session.id,payload.source,session.updatedAt,payload.machineId,payload.visibility==='shared'&&!['user','feedback'].includes(fact.type)?1:0,payload.machineId,input.attemptId,ordinal,input.attemptId]);
  append(`INSERT INTO memory_data_fact_links(attempt_id,ordinal,fact_id,machine_id,fact_json)
   SELECT ?,?,id,?,? FROM facts WHERE capture_attempt_id=? AND capture_ordinal=? AND owner_principal_id=?`,
  [input.attemptId,ordinal,payload.machineId,JSON.stringify(fact),input.attemptId,ordinal,payload.machineId]);
  for(const tag of fact.tags) {
   append(`INSERT INTO fact_tags(fact_id,tag) SELECT fact_id,? FROM memory_data_fact_links WHERE attempt_id=? AND ordinal=?`,[tag,input.attemptId,ordinal]);
   append(`INSERT INTO memory_data_tag_links(attempt_id,ordinal,tag) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM fact_tags ft
    JOIN memory_data_fact_links l ON l.fact_id=ft.fact_id WHERE l.attempt_id=? AND l.ordinal=? AND ft.tag=?)`,[input.attemptId,ordinal,tag,input.attemptId,ordinal,tag]);
  }
  for(const old of fact.supersedes) {
   append(`UPDATE facts SET superseded_by=(SELECT fact_id FROM memory_data_fact_links WHERE attempt_id=? AND ordinal=?)
    WHERE id=? AND superseded_by IS NULL AND (owner_principal_id=? OR EXISTS(SELECT 1 FROM memory_machine_principals admin
 JOIN memory_machine_principals owner ON owner.id=facts.owner_principal_id AND owner.installation_id=admin.installation_id AND owner.repository_id=admin.repository_id
 WHERE admin.id=? AND admin.status='active' AND admin.scope='memory:read memory:write memory:admin'))
 AND EXISTS(SELECT 1 FROM memory_data_fact_links oldlink JOIN memory_data_attempts oldattempt ON oldattempt.id=oldlink.attempt_id
 JOIN memory_data_capture_authority current ON current.installation_id=oldattempt.installation_id WHERE oldlink.fact_id=? AND current.id=?)`,
   [input.attemptId,ordinal,old,payload.machineId,payload.machineId,old,input.attemptId]);
   append(`INSERT INTO memory_data_supersedes(attempt_id,old_fact_id,ordinal,new_fact_id,machine_id)
    SELECT ?,?,?,l.fact_id,? FROM memory_data_fact_links l JOIN facts old ON old.id=? AND old.superseded_by=l.fact_id
    WHERE l.attempt_id=? AND l.ordinal=? AND (old.owner_principal_id=? OR EXISTS(SELECT 1 FROM memory_machine_principals admin JOIN memory_machine_principals owner
 ON owner.id=old.owner_principal_id AND owner.installation_id=admin.installation_id AND owner.repository_id=admin.repository_id
 WHERE admin.id=? AND admin.status='active' AND admin.scope='memory:read memory:write memory:admin'))`,[input.attemptId,old,ordinal,payload.machineId,old,input.attemptId,ordinal,payload.machineId,payload.machineId]);
  }
 }
 if(payload.run) {
  append(`INSERT INTO runs(kind,host,started_at,finished_at,status,counts,capture_attempt_id)
   SELECT 'capture',?,?,?,'ok',?,? WHERE 1`,[payload.machineId,payload.run.startedAt,payload.run.finishedAt,JSON.stringify(payload.run.counts),input.attemptId]);
  append(`INSERT INTO memory_data_runs(attempt_id,run_id,run_json) SELECT ?,id,? FROM runs WHERE capture_attempt_id=?`,
  [input.attemptId,JSON.stringify(payload.run),input.attemptId]);
 }
 return result;
}
export function planDataDeployment(input,payload,auditId) {
 return [{sql:`INSERT INTO memory_data_deployments(attempt_id,predecessor_id,previous_pin_hash,pin_hash,evidence_json,review_hash,protocol_hash,route_contract_hash,rollback)
 SELECT ?,?,?,?,?,?,?,?,? FROM memory_data_live_attempts WHERE id=? AND audit_id=? AND payload_json=?`,params:[input.attemptId,payload.predecessorId,payload.previousPinHash,payload.pinHash,
 JSON.stringify(payload.evidence),payload.reviewHash,payload.protocolHash,payload.routeContractHash,Number(payload.rollback),input.attemptId,auditId,JSON.stringify(payload)]}];
}
export function planDataCompletion(input,auditId,requestHash,outcome) {
 const json=JSON.stringify(outcome);
 return [{sql:`INSERT INTO memory_data_outcomes(attempt_id,outcome_json) SELECT ?,? FROM memory_data_live_attempts WHERE id=? AND audit_id=? AND request_hash=?`,params:[input.attemptId,json,input.attemptId,auditId,requestHash]},
 {sql:`INSERT INTO memory_data_audit(id,attempt_id,request_hash) SELECT ?,?,? FROM memory_data_outcomes WHERE attempt_id=?`,params:[auditId,input.attemptId,requestHash,input.attemptId]},
 {sql:`INSERT INTO memory_data_completions(attempt_id,request_hash,audit_id,revision,outcome_json) SELECT a.id,a.request_hash,a.audit_id,a.revision+1,o.outcome_json
 FROM memory_data_live_attempts a JOIN memory_data_outcomes o ON o.attempt_id=a.id JOIN memory_data_audit audit ON audit.id=a.audit_id WHERE a.id=? AND a.audit_id=?`,params:[input.attemptId,auditId]}];
}
