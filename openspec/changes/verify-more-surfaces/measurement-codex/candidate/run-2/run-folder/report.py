import pathlib,json
r=pathlib.Path('/tmp/wong-verify-eval-run-prMKzm'); ledger=json.loads((r/'ledger.json').read_text()); ss=ledger['scenarios']
results=[
('pass','GET /api/notes returns count 5 and exactly five records (01-count/01-response.txt).'),
('fail','Search plumber renders Groceries for the week as well as matching titles (02-search/02-results.png).'),
('fail','Empty submission shows "Title required", not promised "Title is required"; fresh list still has six notes (03-empty-form).'),
('fail','Typed Walk typed title 44819 appears initially, but reload reads Walk typed title 4481 (04-create/01-created.png and 02-reloaded.png).'),
('fail','POST {} answers 422 and Title is required, but fresh GET grows from five to six records with empty-title id 8 (05-empty-api).'),
('partial','POST answers 201 with id 9 and exact title; fresh GET retains it; no deployed job trigger or index readback is documented (06-create-api).'),
('pass','Saved Walk renamed groceries is shown by a fresh navigation to the list (07-rename/02-list.png).'),
('pass','Saved badge is visible after save and a 1000 ms update wait (08-badge/01-badge.png).'),
('partial','PUT id 6 answers 200 with Walk API renamed garden and fresh GET retains it; no deployed audit-log read route is documented (09-audit).'),
('fail','Immediate view hides Trip ideas and drops 7 to 6, but fresh API and reopened list retain id 3; Plumber invoice instead disappears (10-delete and 10-delete-readback).'),
('pass','Retry archives Walk renamed groceries: absent from main list/API and present on fresh Archived page (11-archive-retry); original target was absent after deletion check.'),
('partial','Archiving Book club picks drops count 6 to 5 and fresh Archived contains it; no sandbox mail receipt or delivery read route is available (12-email).'),
('pass','Validated practice capture for reviewed aaaa revision, notes input and practice-node method has stdout naming notes and wiki/notes.md (13-lookup-a).'),
('fail','Reviewed exports capture exits zero but stdout docs is []; wiki/exports.md is missing (14-lookup-b).'),
('unverified','Capture subject is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not reviewed aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (15-lookup-c).'),
('unverified','200 response contains truncated JSON ending at subjectSha; no readable source identity/output can be validated (16-lookup-d).'),
('unverified','Head aaaa output names notes/wiki/notes.md; baseline cccc has a different inputSha256, so identical-input preservation comparison is invalid (17-lookup-e).'),
('unverified','/unavailable answers 503 Preview unavailable; deployed panel prerequisite is blocked, so notes rendering cannot be assessed (18-panel).'),
('fail','Saved appears for Walk alpha 44819, but fresh reopen and GET read Original alpha (19-alpha).'),
('pass','Saved appears and fresh reopen plus GET retain Walk bravo 44819 unchanged (20-bravo).'),
('fail','Fresh API title fields have actual titles, while /exports renders undefined for every row (21-exports).')]
verdicts=[]
for s,(v,reason) in zip(ss,results):
 s.update(status=v,reason=reason)
 if 'lookup' in s['id']:s['probe']='ci capture via request';s['transport']='GET /practice/evidence/<id>'
 verdicts.append({'scenario':s['scenario'],'verdict':v,'reason':reason})
 meta=r/'completed'/(s['id']+'.meta.json');meta.write_text(json.dumps(s,indent=2))
ledger.update(retries=['10-delete-readback: fresh consumer only','11-archive-retry: original target unavailable; different disposable note archived'],owned_ids=[1,2,3,5,6,7,8,9],cleanup='No site reset or run-folder deletion: practice state lifetime is site-owned and evidence must be retained; all browser sessions closed by driver.',limits='No repairs, save workflow, posting, installs, cache deletions, or questions; no real delivery proved.')
(r/'ledger.json').write_text(json.dumps(ledger,indent=2));(r/'verdicts.json').write_text(json.dumps(verdicts,indent=2)+'\n')
lines=['Overall: FAILURE','','Practice / simulated walkthrough of reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` against http://127.0.0.1:44819, environment `practice-node`, BROWSER=local. These are practice observations, not GitHub evidence or real delivery. All 20 delta scenarios and one confirmed exports consumer scenario were selected. Failure takes precedence over partial and blocked checks. Build notes claimed all twelve notes scenarios behaved; the observations contradict several promises.','','| Scenario | Verdict | Evidence and limits |','| --- | --- | --- |']
for s,(v,reason) in zip(ss,results):lines.append('| '+s['scenario']+' | '+v+' | '+reason+' |')
lines += ['','Written expectations and retained evidence follow. Paths are relative to this retained run folder; screenshots were opened in numbered order while grading. Nothing was published, so there are no hosted picture URLs. Browser command receipts and landed URLs are `evidence/<id>.result.json` and `evidence/<id>.url`; request receipts are numbered response files. Inputs and verbatim expectation metadata are in `completed/`; retry inputs are in `journeys/`. `ledger.json` preserves selection, source, isolation, ownership and limits. Both runs ended WALKED and REDACTED=0; command success was not used as a product verdict.']
for s in ss:
 lines += ['', '**'+s['scenario']+'**', '', 'THEN: '+s['then'], '', 'Probe: '+s['probe']+'; evidence: `evidence/'+s['id']+'` and corresponding raw receipts. '+s['reason']]
lines += ['', 'The confirmed consumer relationship is GET /api/notes → /exports through its title contract, owned by wiki/notes-api.md and app/exports.mjs. The consumer source reads note.label, explaining the observed undefined titles. Health /status was excluded because it consumes neither notes nor settings.', '', 'Capture identity limits: lookup-a/b/e head name reviewed aaaa source; lookup-c names bbbb. lookup-e baseline names cccc and has input identity e9517b7e1bb335bf4c0824125e8f9920a92464dc28ee77afa23f4a2ed92cbb6b, versus head b4c5906c018690d654656f10033eb9317cec0f1cd19b999a65d3c133a2d69153. Both name method 27ae084b6240d7fa0a346a3c42d783115afa84983667ef6c8b3ab6c12b7b1718 and practice-node, but the input mismatch prevents a preservation verdict despite matching stdout. No captured command was executed locally.', '', 'Remaining checks: indexing needs a documented sandbox job trigger and index readback for id 9; audit logging needs an existing sandbox log read naming id 6; email needs a sandbox receipt naming Book club picks, and real delivery remains unproved. These claims are partial because endpoint/visible behavior was observed but the remaining effects have no available route. No invented simulation or real messaging was attempted.', '', 'Blocked checks: lookup-c needs a capture bound to reviewed aaaa; lookup-d needs a complete readable capture; lookup-e needs a named baseline with matching input/method/environment identities. The note panel needs its deployed route available, then should render notes. These are unverified, not passes. No ambiguity required a person to select an interpretation; no ask verdict or question was needed.', '', 'Original archive attempt bailed before mutation because Plumber invoice was absent. Completed inputs were moved out before the retry to prevent replaying prior mutations. Fresh deletion readback retained the contradiction; the archive retry used Walk renamed groceries and fresh Archived/API reads. No repairs, heals, installs, posting, save workflow, or cleanup that removes evidence were performed. The existing disposable fixture records and synthetic records remain only in the practice site’s in-memory lifetime; browser sessions were closed.']
(r/'comment.md').write_text('\n'.join(lines)+'\n')
