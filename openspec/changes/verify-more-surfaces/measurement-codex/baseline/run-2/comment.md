Overall: FAILURE

Practice walkthrough of http://127.0.0.1:41323 for reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (short SHA `aaaaaaa`). These are practice observations, not a pull request or production evidence. Eight scenarios fail, seven pass, three are partly shown, and four need help (`ask` in verdicts.json, `unverified` in this table). Failure takes precedence over blocked checks and partial coverage.

All 20 change scenarios were selected explicitly. Canonical exports was also selected because `/exports` consumes the notes producer's `title` contract (wiki/notes-api.md and app/exports.mjs); the producer pass does not establish its consumer. Canonical health was checked independently; Ready does not validate notes or settings. This checkout has no commits or origin/main, so diff-based selection and live revision attestation are unavailable. The supplied reviewed SHA is used for capture identity; live browser checks apply to the supplied URL.

The required driver ran three stages; each returned WALKED and REDACTED=0. WALKED is a collection status, not a product verdict. No credentials, installs, repairs, saves to Git, publishing, posting or questions were needed. Completed inputs were moved into completed-1 and completed-2 before further runs, preserving original evidence without replaying writes. Browser evidence was opened in walk order during grading. Pictures were not published, as instructed; retained local screenshots are linked below. All batch commands, metadata, HTTP receipts and the ledger remain in this run folder.

| Scenario | Verdict | Evidence and limits |
| --- | --- | --- |
| Looking up notes lists its document | pass | Reviewed aaaaaaa receipt in practice-node has exit 0, empty stderr and stdout naming notes and wiki/notes.md. [01-response.txt](evidence/13-lookup-a/01-response.txt) |
| Looking up exports lists its document | fail | Reviewed aaaaaaa receipt has exit 0 but stdout is {"area":"exports","docs":[]}; wiki/exports.md is absent. [01-response.txt](evidence/14-lookup-b/01-response.txt) |
| A third lookup lists current notes | unverified | Output names the document, but subjectSha is bbbbbbb rather than reviewed aaaaaaa; current-source behavior is unverified. [01-response.txt](evidence/15-lookup-c/01-response.txt) |
| A fourth lookup lists current notes | unverified | HTTP 200 body ends after subjectSha colon; JSON and stdout are unreadable, so the product outcome is unverified. [01-response.txt](evidence/16-lookup-d/01-response.txt) |
| The mapped lookup preserves its result | unverified | Both outputs name the document, but baseline inputSha256 e9517b7 differs from current b4c5906; same-input preservation is unverified. [01-response.txt](evidence/17-lookup-e/01-response.txt) |
| The note panel displays notes | unverified | Browser displays Preview unavailable and request probe confirms 503; panel behavior is blocked. [01-panel.png](evidence/07-panel/01-panel.png); [batch evidence](evidence/07-panel.result.json); [503 response](evidence/22-panel-status/01-response.txt) |
| The alpha preference survives reopening | fail | Saved appears for Walk NLso5c alpha, but reopening and fresh GET return Original alpha. [01-original.png](evidence/05-alpha/01-original.png); [02-saved.png](evidence/05-alpha/02-saved.png); [03-reopened.png](evidence/05-alpha/03-reopened.png); [batch evidence](evidence/05-alpha.result.json) |
| The bravo preference survives reopening | pass | Saved appears and reopening plus fresh GET return Walk NLso5c bravo unchanged. [01-original.png](evidence/06-bravo/01-original.png); [02-saved.png](evidence/06-bravo/02-saved.png); [03-reopened.png](evidence/06-bravo/03-reopened.png); [batch evidence](evidence/06-bravo.result.json) |
| The list API counts its notes | pass | GET returned seven notes and count 7. [01-response.txt](evidence/10-count/01-response.txt) |
| Searching shows only matches | fail | Search for plumber includes Groceries for the week, a nonmatching title. [01-list.png](evidence/01-search/01-list.png); [02-search.png](evidence/01-search/02-search.png); [batch evidence](evidence/01-search.result.json) |
| Submitting with no title is rejected | fail | Form says Title required rather than Title is required; before/after API lists are unchanged. [01-error.png](evidence/02-empty/01-error.png); [batch evidence](evidence/02-empty.result.json) |
| A new note stays in the list | fail | Walk NLso5c Exact Title appears initially, then reload shows Walk NLso5c Exact Titl. [01-created.png](evidence/03-lifecycle/01-created.png); [02-reloaded.png](evidence/03-lifecycle/02-reloaded.png); [batch evidence](evidence/03-lifecycle.result.json) |
| Creating without a title answers 422 | fail | 422 and Title is required are returned, but fresh GET shows new empty note id 9 and count rising 7 to 8. [01-response.txt](evidence/11-empty-api/01-response.txt); [02-response.txt](evidence/11-empty-api/02-response.txt); [03-response.txt](evidence/11-empty-api/03-response.txt) |
| Creating with a title answers 201 | partial | 201 returns id 10 with the submitted title; fresh GET confirms storage; nightly re-indexing has no deployed read surface. [01-response.txt](evidence/12-create-api/01-response.txt); [02-response.txt](evidence/12-create-api/02-response.txt) |
| A renamed note shows its new title | pass | After editing owned id 7, the main list shows Walk NLso5c Renamed. [01-saved.png](evidence/19-edit-delete/01-saved.png); [02-renamed.png](evidence/19-edit-delete/02-renamed.png); [03-deleted.png](evidence/19-edit-delete/03-deleted.png); [batch evidence](evidence/19-edit-delete.result.json) |
| Saving shows a Saved badge | pass | Waited for Saved; screenshot shows Saved on the edit page. [01-saved.png](evidence/19-edit-delete/01-saved.png); [02-renamed.png](evidence/19-edit-delete/02-renamed.png); [03-deleted.png](evidence/19-edit-delete/03-deleted.png); [batch evidence](evidence/19-edit-delete.result.json) |
| A rename through the API is logged | partial | PUT answers 200 with id 10 and new title; fresh GET agrees; audit entry has no deployed read surface. [01-response.txt](evidence/18-rename-api/01-response.txt); [02-response.txt](evidence/18-rename-api/02-response.txt) |
| Deleting a note lowers the count | fail | Count drops 9 to 8, but selected id 7 remains; empty id 9 disappears instead. [01-saved.png](evidence/19-edit-delete/01-saved.png); [02-renamed.png](evidence/19-edit-delete/02-renamed.png); [03-deleted.png](evidence/19-edit-delete/03-deleted.png); [batch evidence](evidence/19-edit-delete.result.json) |
| An archived note moves to Archived | pass | Owned id 8 disappears from main list and appears on Archived; main count falls 8 to 7. [01-before.png](evidence/04-archive/01-before.png); [02-main.png](evidence/04-archive/02-main.png); [03-archived.png](evidence/04-archive/03-archived.png); [batch evidence](evidence/04-archive.result.json) |
| Archiving a note emails the owner | partial | Count falls 8 to 7; no email capture, sandbox mailbox or delivery interface exists, so actual email is not proved. [01-before.png](evidence/04-archive/01-before.png); [02-main.png](evidence/04-archive/02-main.png); [03-archived.png](evidence/04-archive/03-archived.png); [batch evidence](evidence/04-archive.result.json) |
| The status page shows Ready | pass | Browser screenshot and snapshot show Ready. [01-status.png](evidence/09-health/01-status.png); [batch evidence](evidence/09-health.result.json) |
| The export view shows note titles | fail | API supplies seven concrete titles; fresh export page renders seven undefined rows instead. [01-export.png](evidence/08-exports/01-export.png); [batch evidence](evidence/08-exports.result.json) |

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

**Looking up notes lists its document** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): output names `notes` and `wiki/notes.md`

Result: pass. Reviewed aaaaaaa receipt in practice-node has exit 0, empty stderr and stdout naming notes and wiki/notes.md.

**Looking up exports lists its document** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): output names `exports` and `wiki/exports.md`

Result: fail. Reviewed aaaaaaa receipt has exit 0 but stdout is {"area":"exports","docs":[]}; wiki/exports.md is absent.

**A third lookup lists current notes** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): output names `notes` and `wiki/notes.md`

Result: ask. Output names the document, but subjectSha is bbbbbbb rather than reviewed aaaaaaa; current-source behavior is unverified.

**A fourth lookup lists current notes** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): output names `notes` and `wiki/notes.md`

Result: ask. HTTP 200 body ends after subjectSha colon; JSON and stdout are unreadable, so the product outcome is unverified.

**The mapped lookup preserves its result** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): output still names `notes` and `wiki/notes.md`, preserving the earlier result

Result: ask. Both outputs name the document, but baseline inputSha256 e9517b7 differs from current b4c5906; same-input preservation is unverified.

**The note panel displays notes** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): the panel displays their notes

Result: ask. Browser displays Preview unavailable and request probe confirms 503; panel behavior is blocked.

**The alpha preference survives reopening** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): Saved appears and reopening the preference shows the saved title unchanged

Result: fail. Saved appears for Walk NLso5c alpha, but reopening and fresh GET return Original alpha.

**The bravo preference survives reopening** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/practice-captures/spec.md`.

THEN (verbatim): Saved appears and reopening the preference shows the saved title unchanged

Result: pass. Saved appears and reopening plus fresh GET return Walk NLso5c bravo unchanged.

**The list API counts its notes** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the response lists the notes with a `count` equal to the number of notes listed

Result: pass. GET returned seven notes and count 7.

**Searching shows only matches** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): only notes whose title contains the word are listed

Result: fail. Search for plumber includes Groceries for the week, a nonmatching title.

**Submitting with no title is rejected** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the form shows "Title is required" and nothing is saved

Result: fail. Form says Title required rather than Title is required; before/after API lists are unchanged.

**A new note stays in the list** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the note appears in the list with its title as typed, and is still there unchanged after a reload

Result: fail. Walk NLso5c Exact Title appears initially, then reload shows Walk NLso5c Exact Titl.

**Creating without a title answers 422** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the endpoint answers 422, the body names the missing title, and no note is created

Result: fail. 422 and Title is required are returned, but fresh GET shows new empty note id 9 and count rising 7 to 8.

**Creating with a title answers 201** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note

Result: partial. 201 returns id 10 with the submitted title; fresh GET confirms storage; nightly re-indexing has no deployed read surface.

**A renamed note shows its new title** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the new title shows in the list

Result: pass. After editing owned id 7, the main list shows Walk NLso5c Renamed.

**Saving shows a Saved badge** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): a "Saved" badge appears on the edit page

Result: pass. Waited for Saved; screenshot shows Saved on the edit page.

**A rename through the API is logged** — request, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log

Result: partial. PUT answers 200 with id 10 and new title; fresh GET agrees; audit entry has no deployed read surface.

**Deleting a note lowers the count** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the note disappears from the list and the count above the list drops by one

Result: fail. Count drops 9 to 8, but selected id 7 remains; empty id 9 disappears instead.

**An archived note moves to Archived** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the note appears on the Archived page and is no longer in the main list

Result: pass. Owned id 8 disappears from main list and appears on Archived; main count falls 8 to 7.

**Archiving a note emails the owner** — browser, ran at http://127.0.0.1:41323; source: `openspec/changes/practice-notes/specs/notes/spec.md`.

THEN (verbatim): the count above the list drops by one, and the owner is sent an email naming the note

Result: partial. Count falls 8 to 7; no email capture, sandbox mailbox or delivery interface exists, so actual email is not proved.

**The status page shows Ready** — browser, ran at http://127.0.0.1:41323; source: `openspec/specs/health/spec.md`.

THEN (verbatim): the page says Ready

Result: pass. Browser screenshot and snapshot show Ready.

**The export view shows note titles** — browser, ran at http://127.0.0.1:41323; source: `openspec/specs/exports/spec.md`.

THEN (verbatim): each exported title matches the corresponding `title` from `GET /api/notes`

Result: fail. API supplies seven concrete titles; fresh export page renders seven undefined rows instead.
