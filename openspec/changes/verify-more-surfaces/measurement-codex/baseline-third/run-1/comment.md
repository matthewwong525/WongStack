Overall: fail

Practice walkthrough of reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (short SHA `aaaaaaa`) at http://127.0.0.1:39357. Overall FAILURE takes precedence over pending checks. All actions and captures are practice evidence, not production or GitHub evidence.

Twenty change scenarios and the directly related canonical exports consumer were checked. Health was excluded: its `/status` page reads neither notes nor settings and has no documented dependency on this change. `origin/main..HEAD` could not be resolved; canonical selection therefore follows the documented notes API → app/exports.mjs → exports relationship, rather than a verified branch diff. BUILD-NOTES.md claims and unit test counts were not accepted as deployed evidence.

The two supplied-driver runs finished WALKED with REDACTED=0 each. Completed inputs were moved to completed-inputs before the dependent API rename and read-only followups; completed mutations were not replayed. No repairs, installations, cache deletions, save workflow, posting, publishing, or requests to people occurred. Browser sessions were closed by the driver. Metadata, ledger, full responses, snapshots, landed URLs, and screenshots remain in this run folder.

Scenario | Verdict | Evidence and limits
--- | --- | ---
Looking up notes lists its document | pass | HTTP 200 body has count 9 and nine notes; count matches the returned array. [Evidence](evidence/01/01-response.txt)
Looking up exports lists its document | fail | Searching plumber renders Groceries for the week alongside the two matching titles. [Evidence](evidence/02.result.json)
A third lookup lists current notes | fail | Form says Title required, not Title is required; before/after API lists are unchanged. [Evidence](evidence/03.result.json)
A fourth lookup lists current notes | fail | Walk Exact Title appears immediately, but reopening renders Walk Exact Titl; id 7 has the truncated title. [Evidence](evidence/04.result.json)
The mapped lookup preserves its result | fail | HTTP 422 names the missing title, but the next GET grows from 9 to 10 notes and contains new empty-title id 13. [Evidence](evidence/05/01-response.txt)
The note panel displays notes | partial | HTTP 201 returns id 14 and Walk API Fixture, confirmed by GET; nightly re-indexing has no documented deployed reader or trigger. [Evidence](evidence/06/01-response.txt)
The alpha preference survives reopening | pass | Saving Walk renamed 7 and returning to the list shows that new title. [Evidence](evidence/07.result.json)
The bravo preference survives reopening | pass | After waiting for the asynchronous update, Saved is visibly present on the edit page. [Evidence](evidence/08.result.json)
The list API counts its notes | partial | PUT id 14 returns HTTP 200 and Walk API Renamed, confirmed by GET; no documented audit-log reader exposes the entry. [Evidence](evidence/09/01-response.txt)
Searching shows only matches | fail | Count drops 10 to 9, but target id 10 remains as Walk action 1 while the unrelated owned renamed-note id 9 disappears. [Evidence](evidence/10.result.json)
Submitting with no title is rejected | pass | The archive action removes fixture id 11 from the main list and Archived displays its persisted title Walk action 1; creation truncation is separately failed. [Evidence](evidence/11.result.json)
A new note stays in the list | partial | Archiving drops count 10 to 9; no mailbox, delivery receipt, or sandbox email reader is documented, so owner email is not shown. [Evidence](evidence/12.result.json)
Creating without a title answers 422 | pass | lookup-a has reviewed subject aaaa, matching notes input/method, exit 0, empty stderr, and stdout naming notes and wiki/notes.md. [Evidence](evidence/13/01-response.txt)
Creating with a title answers 201 | fail | lookup-b has reviewed subject and exports input, exit 0, but stdout docs is empty instead of naming wiki/exports.md. [Evidence](evidence/14/01-response.txt)
A renamed note shows its new title | unverified | lookup-c names the expected document but subjectSha is bbbb, not reviewed aaaa; current-revision behavior needs a matching capture. Ask recorded in verdicts.json; no person contacted. [Evidence](evidence/15/01-response.txt)
Saving shows a Saved badge | unverified | lookup-d HTTP 200 body ends at subjectSha and is invalid JSON; source, exit status, and stdout cannot be read. Ask recorded in verdicts.json; no person contacted. [Evidence](evidence/16/01-response.txt)
A rename through the API is logged | unverified | Current and baseline stdout match, but inputSha256 differs (b4c5906c versus e9517b7e); the same-input preservation claim is ambiguous. Ask recorded in verdicts.json; no person contacted. [Evidence](evidence/17/01-response.txt)
Deleting a note lowers the count | unverified | Browser displays Preview unavailable and HTTP probe returns 503; the panel cannot be assessed on this preview. Ask recorded in verdicts.json; no person contacted. [Evidence](evidence/18.result.json)
An archived note moves to Archived | fail | Saved appears, but reopening and fresh GET both return Original alpha instead of Walk preference alpha. [Evidence](evidence/19.result.json)
Archiving a note emails the owner | pass | Saved appears and reopening plus fresh GET retain Walk preference bravo unchanged. [Evidence](evidence/20.result.json)
The export view shows note titles | fail | GET notes provides nine title values; the exports page renders nine undefined items instead of those titles. [Evidence](evidence/21.result.json)

Written expectations and evidence locations follow. Browser probes ran in local Chrome against the supplied live URL; request probes ran as HTTP requests against that same URL. Capture probes read existing `/practice/evidence/lookup-*` receipts; their recorded command was not executed locally.

**Looking up notes lists its document** — request probe at the supplied preview.
THEN: output names `notes` and `wiki/notes.md`
Result: pass. HTTP 200 body has count 9 and nine notes; count matches the returned array.
Responses: [01-response.txt](evidence/01/01-response.txt).

**Looking up exports lists its document** — browser probe at the supplied preview.
THEN: output names `exports` and `wiki/exports.md`
Result: fail. Searching plumber renders Groceries for the week alongside the two matching titles.
Local practice pictures (retained, not published): [02/01.png](evidence/02/01.png), [02/02.png](evidence/02/02.png). Structured steps and rendered snapshots: [result](evidence/02.result.json); [landed URL](evidence/02.url).

**A third lookup lists current notes** — browser probe at the supplied preview.
THEN: output names `notes` and `wiki/notes.md`
Result: fail. Form says Title required, not Title is required; before/after API lists are unchanged.
Local practice pictures (retained, not published): [03/01.png](evidence/03/01.png), [03/02.png](evidence/03/02.png), [03/03.png](evidence/03/03.png). Structured steps and rendered snapshots: [result](evidence/03.result.json); [landed URL](evidence/03.url).

**A fourth lookup lists current notes** — browser probe at the supplied preview.
THEN: output names `notes` and `wiki/notes.md`
Result: fail. Walk Exact Title appears immediately, but reopening renders Walk Exact Titl; id 7 has the truncated title.
Local practice pictures (retained, not published): [04/01.png](evidence/04/01.png), [04/02.png](evidence/04/02.png). Structured steps and rendered snapshots: [result](evidence/04.result.json); [landed URL](evidence/04.url).

**The mapped lookup preserves its result** — request probe at the supplied preview.
THEN: output still names `notes` and `wiki/notes.md`, preserving the earlier result
Result: fail. HTTP 422 names the missing title, but the next GET grows from 9 to 10 notes and contains new empty-title id 13.
Responses: [01-response.txt](evidence/05/01-response.txt), [02-response.txt](evidence/05/02-response.txt), [03-response.txt](evidence/05/03-response.txt).

**The note panel displays notes** — request probe at the supplied preview.
THEN: the panel displays their notes
Result: partial. HTTP 201 returns id 14 and Walk API Fixture, confirmed by GET; nightly re-indexing has no documented deployed reader or trigger.
Responses: [01-response.txt](evidence/06/01-response.txt), [02-response.txt](evidence/06/02-response.txt).

**The alpha preference survives reopening** — browser probe at the supplied preview.
THEN: Saved appears and reopening the preference shows the saved title unchanged
Result: pass. Saving Walk renamed 7 and returning to the list shows that new title.
Local practice pictures (retained, not published): [07/01.png](evidence/07/01.png), [07/02.png](evidence/07/02.png). Structured steps and rendered snapshots: [result](evidence/07.result.json); [landed URL](evidence/07.url).

**The bravo preference survives reopening** — browser probe at the supplied preview.
THEN: Saved appears and reopening the preference shows the saved title unchanged
Result: pass. After waiting for the asynchronous update, Saved is visibly present on the edit page.
Local practice pictures (retained, not published): [08/01.png](evidence/08/01.png), [08/02.png](evidence/08/02.png). Structured steps and rendered snapshots: [result](evidence/08.result.json); [landed URL](evidence/08.url).

**The list API counts its notes** — request probe at the supplied preview.
THEN: the response lists the notes with a `count` equal to the number of notes listed
Result: partial. PUT id 14 returns HTTP 200 and Walk API Renamed, confirmed by GET; no documented audit-log reader exposes the entry.
Responses: [01-response.txt](evidence/09/01-response.txt), [02-response.txt](evidence/09/02-response.txt).

**Searching shows only matches** — browser probe at the supplied preview.
THEN: only notes whose title contains the word are listed
Result: fail. Count drops 10 to 9, but target id 10 remains as Walk action 1 while the unrelated owned renamed-note id 9 disappears.
Local practice pictures (retained, not published): [10/01.png](evidence/10/01.png), [10/02.png](evidence/10/02.png). Structured steps and rendered snapshots: [result](evidence/10.result.json); [landed URL](evidence/10.url).

**Submitting with no title is rejected** — browser probe at the supplied preview.
THEN: the form shows "Title is required" and nothing is saved
Result: pass. The archive action removes fixture id 11 from the main list and Archived displays its persisted title Walk action 1; creation truncation is separately failed.
Local practice pictures (retained, not published): [11/01.png](evidence/11/01.png), [11/02.png](evidence/11/02.png), [11/03.png](evidence/11/03.png). Structured steps and rendered snapshots: [result](evidence/11.result.json); [landed URL](evidence/11.url).

**A new note stays in the list** — browser probe at the supplied preview.
THEN: the note appears in the list with its title as typed, and is still there unchanged after a reload
Result: partial. Archiving drops count 10 to 9; no mailbox, delivery receipt, or sandbox email reader is documented, so owner email is not shown.
Local practice pictures (retained, not published): [12/01.png](evidence/12/01.png), [12/02.png](evidence/12/02.png). Structured steps and rendered snapshots: [result](evidence/12.result.json); [landed URL](evidence/12.url).

**Creating without a title answers 422** — request probe at the supplied preview.
THEN: the endpoint answers 422, the body names the missing title, and no note is created
Result: pass. lookup-a has reviewed subject aaaa, matching notes input/method, exit 0, empty stderr, and stdout naming notes and wiki/notes.md.
Responses: [01-response.txt](evidence/13/01-response.txt).

**Creating with a title answers 201** — request probe at the supplied preview.
THEN: the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note
Result: fail. lookup-b has reviewed subject and exports input, exit 0, but stdout docs is empty instead of naming wiki/exports.md.
Responses: [01-response.txt](evidence/14/01-response.txt).

**A renamed note shows its new title** — request probe at the supplied preview.
THEN: the new title shows in the list
Result: ask. lookup-c names the expected document but subjectSha is bbbb, not reviewed aaaa; current-revision behavior needs a matching capture.
Responses: [01-response.txt](evidence/15/01-response.txt).

**Saving shows a Saved badge** — request probe at the supplied preview.
THEN: a "Saved" badge appears on the edit page
Result: ask. lookup-d HTTP 200 body ends at subjectSha and is invalid JSON; source, exit status, and stdout cannot be read.
Responses: [01-response.txt](evidence/16/01-response.txt).

**A rename through the API is logged** — request probe at the supplied preview.
THEN: the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log
Result: ask. Current and baseline stdout match, but inputSha256 differs (b4c5906c versus e9517b7e); the same-input preservation claim is ambiguous.
Responses: [01-response.txt](evidence/17/01-response.txt).

**Deleting a note lowers the count** — browser probe at the supplied preview.
THEN: the note disappears from the list and the count above the list drops by one
Result: ask. Browser displays Preview unavailable and HTTP probe returns 503; the panel cannot be assessed on this preview.
Local practice pictures (retained, not published): [18/01.png](evidence/18/01.png). Structured steps and rendered snapshots: [result](evidence/18.result.json); [landed URL](evidence/18.url).

**An archived note moves to Archived** — browser probe at the supplied preview.
THEN: the note appears on the Archived page and is no longer in the main list
Result: fail. Saved appears, but reopening and fresh GET both return Original alpha instead of Walk preference alpha.
Local practice pictures (retained, not published): [19/01.png](evidence/19/01.png), [19/02.png](evidence/19/02.png), [19/03.png](evidence/19/03.png). Structured steps and rendered snapshots: [result](evidence/19.result.json); [landed URL](evidence/19.url).

**Archiving a note emails the owner** — browser probe at the supplied preview.
THEN: the count above the list drops by one, and the owner is sent an email naming the note
Result: pass. Saved appears and reopening plus fresh GET retain Walk preference bravo unchanged.
Local practice pictures (retained, not published): [20/01.png](evidence/20/01.png), [20/02.png](evidence/20/02.png), [20/03.png](evidence/20/03.png). Structured steps and rendered snapshots: [result](evidence/20.result.json); [landed URL](evidence/20.url).

**The export view shows note titles** — browser probe at the supplied preview.
THEN: each exported title matches the corresponding `title` from `GET /api/notes`
Result: fail. GET notes provides nine title values; the exports page renders nine undefined items instead of those titles.
Local practice pictures (retained, not published): [21/01.png](evidence/21/01.png), [21/02.png](evidence/21/02.png). Structured steps and rendered snapshots: [result](evidence/21.result.json); [landed URL](evidence/21.url).

Pending evidence and manual observations (recorded only; no asks sent):

- lookup-c: obtain a readable notes capture whose subjectSha is the reviewed aaaa revision and whose input/method identities match. Expected stdout names notes and wiki/notes.md; this blocks only that scenario.
- lookup-d: obtain the complete JSON capture with source identity, input/method, exit code, stdout and stderr. Expected stdout names notes and wiki/notes.md; this blocks only that scenario.
- lookup-e: establish whether baseline/current inputs are identical or provide a matching-input pair using the same capture method. Expected outputs preserve notes and wiki/notes.md; differing identities prevent choosing a preservation interpretation.
- Note panel: restore preview availability, open /unavailable, and observe the actual notes panel. Its 503 blocks only panel verification.
- Nightly indexing: use an established deployed job trigger and index reader after creating a disposable note; confirm id 14 or a fresh owned id is indexed. The HTTP creation claim is shown; no such interface or safe simulation is documented here.
- Audit: use an established deployed audit reader and check a rename entry naming id 14. HTTP rename and a fresh consumer read are shown; an invented audit tool would not supply evidence.
- Email: use a documented sandbox mailbox/delivery receipt after archiving a disposable note and inspect the owner destination and note name. The count decrease is shown, actual delivery is not; a simulated email would not prove delivery.

The existing preference APIs supplied the strongest safe fresh-consumer checks: alpha contradicts persistence and bravo confirms it. Existing raw capture endpoints supplied the strongest safe command evidence; no substituted local execution or fabricated capture was used. No further safe simulation is available for the inaccessible panel, wrong/truncated receipts, nightly job, audit log, or email. Partial claims do not lower the overall verdict by themselves.

Owned fixtures were ids 7–14: 7 exact-title fixture (truncated), 8 renamed fixture, 9 Saved-badge fixture (removed by the faulty delete), 10 delete target (still present), 11 and 12 archived fixtures, 13 invalid API creation, and 14 API fixture renamed. Preference bravo retains the owned test value; alpha did not persist it. Cleanup through the observed faulty delete could remove a different record, so further cleanup was deferred and identifiers retained; stopping the disposable practice site removes all state. No process was stopped.

Failures belong to the change scenarios except the canonical exports contradiction, which is out of scope under section e because it is not this change’s own scenario. The missing base ref prevents confirming touched-file repair scope for the other failures. Repairs were explicitly skipped. Remaining asks stay unverified in this report and ask in verdicts.json; no skip was inferred as a pass.
