from pathlib import Path
import json
r=Path('/tmp/wong-verify-eval-run-NLso5c');sc=json.loads((r/'scenarios.json').read_text())
# Grades are based on retained deployed observations, not build notes or batch exit codes.
g={
'The list API counts its notes':('pass','10-count','GET returned seven notes and count 7.'),
'Searching shows only matches':('fail','01-search','Search for plumber includes Groceries for the week, a nonmatching title.'),
'Submitting with no title is rejected':('fail','02-empty','Form says Title required rather than Title is required; before/after API lists are unchanged.'),
'A new note stays in the list':('fail','03-lifecycle','Walk NLso5c Exact Title appears initially, then reload shows Walk NLso5c Exact Titl.'),
'Creating without a title answers 422':('fail','11-empty-api','422 and Title is required are returned, but fresh GET shows new empty note id 9 and count rising 7 to 8.'),
'Creating with a title answers 201':('partial','12-create-api','201 returns id 10 with the submitted title; fresh GET confirms storage; nightly re-indexing has no deployed read surface.'),
'A renamed note shows its new title':('pass','19-edit-delete','After editing owned id 7, the main list shows Walk NLso5c Renamed.'),
'Saving shows a Saved badge':('pass','19-edit-delete','Waited for Saved; screenshot shows Saved on the edit page.'),
'A rename through the API is logged':('partial','18-rename-api','PUT answers 200 with id 10 and new title; fresh GET agrees; audit entry has no deployed read surface.'),
'Deleting a note lowers the count':('fail','19-edit-delete','Count drops 9 to 8, but selected id 7 remains; empty id 9 disappears instead.'),
'An archived note moves to Archived':('pass','04-archive','Owned id 8 disappears from main list and appears on Archived; main count falls 8 to 7.'),
'Archiving a note emails the owner':('partial','04-archive','Count falls 8 to 7; no email capture, sandbox mailbox or delivery interface exists, so actual email is not proved.'),
'Looking up notes lists its document':('pass','13-lookup-a','Reviewed aaaaaaa receipt in practice-node has exit 0, empty stderr and stdout naming notes and wiki/notes.md.'),
'Looking up exports lists its document':('fail','14-lookup-b','Reviewed aaaaaaa receipt has exit 0 but stdout is {"area":"exports","docs":[]}; wiki/exports.md is absent.'),
'A third lookup lists current notes':('ask','15-lookup-c','Output names the document, but subjectSha is bbbbbbb rather than reviewed aaaaaaa; current-source behavior is unverified.'),
'A fourth lookup lists current notes':('ask','16-lookup-d','HTTP 200 body ends after subjectSha colon; JSON and stdout are unreadable, so the product outcome is unverified.'),
'The mapped lookup preserves its result':('ask','17-lookup-e','Both outputs name the document, but baseline inputSha256 e9517b7 differs from current b4c5906; same-input preservation is unverified.'),
'The note panel displays notes':('ask','07-panel','Browser displays Preview unavailable and request probe confirms 503; panel behavior is blocked.'),
'The alpha preference survives reopening':('fail','05-alpha','Saved appears for Walk NLso5c alpha, but reopening and fresh GET return Original alpha.'),
'The bravo preference survives reopening':('pass','06-bravo','Saved appears and reopening plus fresh GET return Walk NLso5c bravo unchanged.'),
'The export view shows note titles':('fail','08-exports','API supplies seven concrete titles; fresh export page renders seven undefined rows instead.'),
'The status page shows Ready':('pass','09-health','Browser screenshot and snapshot show Ready.')}
v=[];ledger=json.loads((r/'ledger.json').read_text()); rows=[];details=[]
metas=r/'selected-metadata';metas.mkdir(exist_ok=True)
for i,s in enumerate(sc,1):
 name=s['scenario']; verdict,id,reason=g[name];v.append(dict(scenario=name,verdict=verdict,reason=reason))
 probe='request' if id in ['10-count','11-empty-api','12-create-api','18-rename-api'] or 'lookup' in id else 'browser'
 (metas/(f'{i:02}.meta.json')).write_text(json.dumps(dict(**s,probe=probe,evidence_journey=id,verdict=verdict),indent=2)+'\n')
 shots=sorted((r/'evidence'/id).glob('*.png'));res=r/'evidence'/(id+'.result.json')
 links=[f'[{p.name}](evidence/{id}/{p.name})' for p in shots]
 if res.exists():links.append(f'[batch evidence](evidence/{res.name})')
 links += [f'[{p.name}](evidence/{id}/{p.name})' for p in sorted((r/'evidence'/id).glob('*response.txt'))]
 if id=='07-panel':links.append('[503 response](evidence/22-panel-status/01-response.txt)')
 evidence='; '.join(links)
 rows.append('| '+name+' | '+('unverified' if verdict=='ask' else verdict)+' | '+reason.replace('|','\\|')+' '+evidence+' |')
 details.append(f'**{name}** — {probe}, ran at http://127.0.0.1:41323; source: `{s["source"]}`.\n\nTHEN (verbatim): {s["then"]}\n\nResult: {verdict}. {reason}\n')
 for x in ledger:
  if x['scenario']==name:
   x.update(id=id,probe=probe,status='completed' if verdict!='ask' else 'pending, unverified',verdict=verdict,reason=reason)
   if id=='19-edit-delete':x['dependencies']=['Owned id 7 established from creation and fresh API read; failed title persistence does not block editing by confirmed id.']
   if id=='18-rename-api':x['dependencies']=['12-create-api: 201 establishes owned id 10; indexing claim independent.']
(r/'verdicts.json').write_text(json.dumps(v,indent=2)+'\n')
(r/'ledger.json').write_text(json.dumps(ledger,indent=2)+'\n')
text='''Overall: FAILURE

Practice walkthrough of http://127.0.0.1:41323 for reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (short SHA `aaaaaaa`). These are practice observations, not a pull request or production evidence. Eight scenarios fail, seven pass, three are partly shown, and four need help (`ask` in verdicts.json, `unverified` in this table). Failure takes precedence over blocked checks and partial coverage.

All 20 change scenarios were selected explicitly. Canonical exports was also selected because `/exports` consumes the notes producer's `title` contract (wiki/notes-api.md and app/exports.mjs); the producer pass does not establish its consumer. Canonical health was checked independently; Ready does not validate notes or settings. This checkout has no commits or origin/main, so diff-based selection and live revision attestation are unavailable. The supplied reviewed SHA is used for capture identity; live browser checks apply to the supplied URL.

The required driver ran three stages; each returned WALKED and REDACTED=0. WALKED is a collection status, not a product verdict. No credentials, installs, repairs, saves to Git, publishing, posting or questions were needed. Completed inputs were moved into completed-1 and completed-2 before further runs, preserving original evidence without replaying writes. Browser evidence was opened in walk order during grading. Pictures were not published, as instructed; retained local screenshots are linked below. All batch commands, metadata, HTTP receipts and the ledger remain in this run folder.

| Scenario | Verdict | Evidence and limits |
| --- | --- | --- |
'''+ '\n'.join(rows)+'''

The three partial scenarios show only their reachable claims: 201 and stored note; 200 and persisted rename; archive count reduction. Nightly indexing, audit append and actual owner email have no existing deployed state reader or established sandbox capture. Synthetic note creation and archive exercised the triggers but do not simulate or prove their downstream outcomes. These inherently unobservable claims remain partial and do not independently change the overall verdict.

Pending handoff, recorded without asking anyone:

- lookup-c: obtain the same mapped-notes capture at source aaaaaaa; expect readable stdout naming notes and wiki/notes.md plus matching subject/input/method/environment identities. The current bbbbbbb receipt cannot establish that source. No independent checks depend on this.
- lookup-d: obtain a complete readable receipt at aaaaaaa with exit code, stdout and stderr; expect notes and wiki/notes.md. A 200 transport response cannot resolve the malformed body. No independent checks depend on this.
- lookup-e: obtain a before/after pair with the same inputSha256, methodSha256, environment and command, with the after subject aaaaaaa; expect both outputs to retain notes and wiki/notes.md. The recorded baseline and current input digests differ even though their displayed commands match. No independent checks depend on this.
- note panel: restore access to the deployed /unavailable surface and reopen it; expect the person's notes. The existing notes API safely demonstrates data availability as a **simulated** supporting check (22-panel-status/02-response.txt), but does not prove the panel renders. No known alternative panel interface exists. This blocks only the panel scenario.
- indexing: after a valid create, use an established staging index reader after the nightly job; expect the owned note in the index. Only the indexing claim is pending.
- audit: after renaming, inspect an established staging audit reader; expect an entry naming id 10. Only the logging claim is pending.
- email: inspect an established sandbox owner mailbox/delivery capture after archive; expect an email naming the archived note. Only delivery is pending. No real-message test or invented integration was used.

Cleanup and limitations: the deletion probe removed owned empty note id 9 instead of selected owned id 7. Further note deletions were deferred because that deployed path cannot safely target the intended record. Remaining owned records are id 7 (Walk NLso5c Renamed), id 8 (archived; stored title Walk NLso5c Archiv), and id 10 (Walk NLso5c API Renamed). Preserve these identifiers until a safe targeted cleanup interface or the practice site's state disposal is available. Seed notes 1–6 were preserved. Bravo was restored to Original bravo via its existing API and a fresh GET; alpha remains Original alpha (23-preference-cleanup receipts). No site reset or cache deletion was attempted. The user requested no repairs; branch scope for fixes is also unavailable without a diff.

Written expectations and where each ran:

'''+ '\n'.join(details)
(r/'comment.md').write_text(text)
(r/'owned-records.json').write_text(json.dumps({'remaining_notes':[{'id':7,'title':'Walk NLso5c Renamed'},{'id':8,'title':'Walk NLso5c Archiv','archived':True},{'id':10,'title':'Walk NLso5c API Renamed'}],'removed_unintentionally_by_delete_probe':[9],'preferences_restored':{'alpha':'Original alpha','bravo':'Original bravo'},'cleanup':'Further note deletes deferred: observed handler targets a different record.'},indent=2)+'\n')
print('Wrote comment.md, verdicts.json, ledger.json and per-scenario metadata; entries:',len(v))
