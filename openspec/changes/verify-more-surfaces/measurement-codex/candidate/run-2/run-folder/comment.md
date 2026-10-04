Overall: FAILURE

Practice / simulated walkthrough of reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` against http://127.0.0.1:44819, environment `practice-node`, BROWSER=local. These are practice observations, not GitHub evidence or real delivery. All 20 delta scenarios and one confirmed exports consumer scenario were selected. Failure takes precedence over partial and blocked checks. Build notes claimed all twelve notes scenarios behaved; the observations contradict several promises.

| Scenario | Verdict | Evidence and limits |
| --- | --- | --- |
| The list API counts its notes | pass | GET /api/notes returns count 5 and exactly five records (01-count/01-response.txt). |
| Searching shows only matches | fail | Search plumber renders Groceries for the week as well as matching titles (02-search/02-results.png). |
| Submitting with no title is rejected | fail | Empty submission shows "Title required", not promised "Title is required"; fresh list still has six notes (03-empty-form). |
| A new note stays in the list | fail | Typed Walk typed title 44819 appears initially, but reload reads Walk typed title 4481 (04-create/01-created.png and 02-reloaded.png). |
| Creating without a title answers 422 | fail | POST {} answers 422 and Title is required, but fresh GET grows from five to six records with empty-title id 8 (05-empty-api). |
| Creating with a title answers 201 | partial | POST answers 201 with id 9 and exact title; fresh GET retains it; no deployed job trigger or index readback is documented (06-create-api). |
| A renamed note shows its new title | pass | Saved Walk renamed groceries is shown by a fresh navigation to the list (07-rename/02-list.png). |
| Saving shows a Saved badge | pass | Saved badge is visible after save and a 1000 ms update wait (08-badge/01-badge.png). |
| A rename through the API is logged | partial | PUT id 6 answers 200 with Walk API renamed garden and fresh GET retains it; no deployed audit-log read route is documented (09-audit). |
| Deleting a note lowers the count | fail | Immediate view hides Trip ideas and drops 7 to 6, but fresh API and reopened list retain id 3; Plumber invoice instead disappears (10-delete and 10-delete-readback). |
| An archived note moves to Archived | pass | Retry archives Walk renamed groceries: absent from main list/API and present on fresh Archived page (11-archive-retry); original target was absent after deletion check. |
| Archiving a note emails the owner | partial | Archiving Book club picks drops count 6 to 5 and fresh Archived contains it; no sandbox mail receipt or delivery read route is available (12-email). |
| Looking up notes lists its document | pass | Validated practice capture for reviewed aaaa revision, notes input and practice-node method has stdout naming notes and wiki/notes.md (13-lookup-a). |
| Looking up exports lists its document | fail | Reviewed exports capture exits zero but stdout docs is []; wiki/exports.md is missing (14-lookup-b). |
| A third lookup lists current notes | unverified | Capture subject is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not reviewed aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (15-lookup-c). |
| A fourth lookup lists current notes | unverified | 200 response contains truncated JSON ending at subjectSha; no readable source identity/output can be validated (16-lookup-d). |
| The mapped lookup preserves its result | unverified | Head aaaa output names notes/wiki/notes.md; baseline cccc has a different inputSha256, so identical-input preservation comparison is invalid (17-lookup-e). |
| The note panel displays notes | unverified | /unavailable answers 503 Preview unavailable; deployed panel prerequisite is blocked, so notes rendering cannot be assessed (18-panel). |
| The alpha preference survives reopening | fail | Saved appears for Walk alpha 44819, but fresh reopen and GET read Original alpha (19-alpha). |
| The bravo preference survives reopening | pass | Saved appears and fresh reopen plus GET retain Walk bravo 44819 unchanged (20-bravo). |
| The export view shows note titles | fail | Fresh API title fields have actual titles, while /exports renders undefined for every row (21-exports). |

Written expectations and retained evidence follow. Paths are relative to this retained run folder; screenshots were opened in numbered order while grading. Nothing was published, so there are no hosted picture URLs. Browser command receipts and landed URLs are `evidence/<id>.result.json` and `evidence/<id>.url`; request receipts are numbered response files. Inputs and verbatim expectation metadata are in `completed/`; retry inputs are in `journeys/`. `ledger.json` preserves selection, source, isolation, ownership and limits. Both runs ended WALKED and REDACTED=0; command success was not used as a product verdict.

**The list API counts its notes**

THEN: the response lists the notes with a `count` equal to the number of notes listed

Probe: request; evidence: `evidence/01-count` and corresponding raw receipts. GET /api/notes returns count 5 and exactly five records (01-count/01-response.txt).

**Searching shows only matches**

THEN: only notes whose title contains the word are listed

Probe: browser; evidence: `evidence/02-search` and corresponding raw receipts. Search plumber renders Groceries for the week as well as matching titles (02-search/02-results.png).

**Submitting with no title is rejected**

THEN: the form shows "Title is required" and nothing is saved

Probe: browser; evidence: `evidence/03-empty-form` and corresponding raw receipts. Empty submission shows "Title required", not promised "Title is required"; fresh list still has six notes (03-empty-form).

**A new note stays in the list**

THEN: the note appears in the list with its title as typed, and is still there unchanged after a reload

Probe: browser; evidence: `evidence/04-create` and corresponding raw receipts. Typed Walk typed title 44819 appears initially, but reload reads Walk typed title 4481 (04-create/01-created.png and 02-reloaded.png).

**Creating without a title answers 422**

THEN: the endpoint answers 422, the body names the missing title, and no note is created

Probe: request; evidence: `evidence/05-empty-api` and corresponding raw receipts. POST {} answers 422 and Title is required, but fresh GET grows from five to six records with empty-title id 8 (05-empty-api).

**Creating with a title answers 201**

THEN: the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note

Probe: request; evidence: `evidence/06-create-api` and corresponding raw receipts. POST answers 201 with id 9 and exact title; fresh GET retains it; no deployed job trigger or index readback is documented (06-create-api).

**A renamed note shows its new title**

THEN: the new title shows in the list

Probe: browser; evidence: `evidence/07-rename` and corresponding raw receipts. Saved Walk renamed groceries is shown by a fresh navigation to the list (07-rename/02-list.png).

**Saving shows a Saved badge**

THEN: a "Saved" badge appears on the edit page

Probe: browser; evidence: `evidence/08-badge` and corresponding raw receipts. Saved badge is visible after save and a 1000 ms update wait (08-badge/01-badge.png).

**A rename through the API is logged**

THEN: the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log

Probe: request; evidence: `evidence/09-audit` and corresponding raw receipts. PUT id 6 answers 200 with Walk API renamed garden and fresh GET retains it; no deployed audit-log read route is documented (09-audit).

**Deleting a note lowers the count**

THEN: the note disappears from the list and the count above the list drops by one

Probe: browser; evidence: `evidence/10-delete` and corresponding raw receipts. Immediate view hides Trip ideas and drops 7 to 6, but fresh API and reopened list retain id 3; Plumber invoice instead disappears (10-delete and 10-delete-readback).

**An archived note moves to Archived**

THEN: the note appears on the Archived page and is no longer in the main list

Probe: browser; evidence: `evidence/11-archive` and corresponding raw receipts. Retry archives Walk renamed groceries: absent from main list/API and present on fresh Archived page (11-archive-retry); original target was absent after deletion check.

**Archiving a note emails the owner**

THEN: the count above the list drops by one, and the owner is sent an email naming the note

Probe: browser; evidence: `evidence/12-email` and corresponding raw receipts. Archiving Book club picks drops count 6 to 5 and fresh Archived contains it; no sandbox mail receipt or delivery read route is available (12-email).

**Looking up notes lists its document**

THEN: output names `notes` and `wiki/notes.md`

Probe: ci capture via request; evidence: `evidence/13-lookup-a` and corresponding raw receipts. Validated practice capture for reviewed aaaa revision, notes input and practice-node method has stdout naming notes and wiki/notes.md (13-lookup-a).

**Looking up exports lists its document**

THEN: output names `exports` and `wiki/exports.md`

Probe: ci capture via request; evidence: `evidence/14-lookup-b` and corresponding raw receipts. Reviewed exports capture exits zero but stdout docs is []; wiki/exports.md is missing (14-lookup-b).

**A third lookup lists current notes**

THEN: output names `notes` and `wiki/notes.md`

Probe: ci capture via request; evidence: `evidence/15-lookup-c` and corresponding raw receipts. Capture subject is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not reviewed aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (15-lookup-c).

**A fourth lookup lists current notes**

THEN: output names `notes` and `wiki/notes.md`

Probe: ci capture via request; evidence: `evidence/16-lookup-d` and corresponding raw receipts. 200 response contains truncated JSON ending at subjectSha; no readable source identity/output can be validated (16-lookup-d).

**The mapped lookup preserves its result**

THEN: output still names `notes` and `wiki/notes.md`, preserving the earlier result

Probe: ci capture via request; evidence: `evidence/17-lookup-e` and corresponding raw receipts. Head aaaa output names notes/wiki/notes.md; baseline cccc has a different inputSha256, so identical-input preservation comparison is invalid (17-lookup-e).

**The note panel displays notes**

THEN: the panel displays their notes

Probe: browser; evidence: `evidence/18-panel` and corresponding raw receipts. /unavailable answers 503 Preview unavailable; deployed panel prerequisite is blocked, so notes rendering cannot be assessed (18-panel).

**The alpha preference survives reopening**

THEN: Saved appears and reopening the preference shows the saved title unchanged

Probe: browser; evidence: `evidence/19-alpha` and corresponding raw receipts. Saved appears for Walk alpha 44819, but fresh reopen and GET read Original alpha (19-alpha).

**The bravo preference survives reopening**

THEN: Saved appears and reopening the preference shows the saved title unchanged

Probe: browser; evidence: `evidence/20-bravo` and corresponding raw receipts. Saved appears and fresh reopen plus GET retain Walk bravo 44819 unchanged (20-bravo).

**The export view shows note titles**

THEN: each exported title matches the corresponding `title` from `GET /api/notes`

Probe: browser; evidence: `evidence/21-exports` and corresponding raw receipts. Fresh API title fields have actual titles, while /exports renders undefined for every row (21-exports).

The confirmed consumer relationship is GET /api/notes → /exports through its title contract, owned by wiki/notes-api.md and app/exports.mjs. The consumer source reads note.label, explaining the observed undefined titles. Health /status was excluded because it consumes neither notes nor settings.

Capture identity limits: lookup-a/b/e head name reviewed aaaa source; lookup-c names bbbb. lookup-e baseline names cccc and has input identity e9517b7e1bb335bf4c0824125e8f9920a92464dc28ee77afa23f4a2ed92cbb6b, versus head b4c5906c018690d654656f10033eb9317cec0f1cd19b999a65d3c133a2d69153. Both name method 27ae084b6240d7fa0a346a3c42d783115afa84983667ef6c8b3ab6c12b7b1718 and practice-node, but the input mismatch prevents a preservation verdict despite matching stdout. No captured command was executed locally.

Remaining checks: indexing needs a documented sandbox job trigger and index readback for id 9; audit logging needs an existing sandbox log read naming id 6; email needs a sandbox receipt naming Book club picks, and real delivery remains unproved. These claims are partial because endpoint/visible behavior was observed but the remaining effects have no available route. No invented simulation or real messaging was attempted.

Blocked checks: lookup-c needs a capture bound to reviewed aaaa; lookup-d needs a complete readable capture; lookup-e needs a named baseline with matching input/method/environment identities. The note panel needs its deployed route available, then should render notes. These are unverified, not passes. No ambiguity required a person to select an interpretation; no ask verdict or question was needed.

Original archive attempt bailed before mutation because Plumber invoice was absent. Completed inputs were moved out before the retry to prevent replaying prior mutations. Fresh deletion readback retained the contradiction; the archive retry used Walk renamed groceries and fresh Archived/API reads. No repairs, heals, installs, posting, save workflow, or cleanup that removes evidence were performed. The existing disposable fixture records and synthetic records remain only in the practice site’s in-memory lifetime; browser sessions were closed.
