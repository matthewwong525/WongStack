Overall: FAILURE

Practice walkthrough of http://127.0.0.1:44805. Reviewed practice source: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (short SHA `aaaaaaa`). These receipts are practice observations, not GitHub or production evidence.

21 selected scenarios: 6 pass, 8 fail, 3 partial, 4 ask. In this report, ask entries appear as unverified to meet the requested table format; verdicts.json retains ask. Failures take precedence over partial coverage and blocks.

Scope: every scenario in the practice-notes change, plus the exports consumer identified by wiki/practice-captures.md and wiki/notes-api.md. app/exports.mjs consumes the notes records but reads label rather than title; the deployed export view corroborates the mismatch. Git has no commits or origin/main, so branch-diff selection is unavailable. The unrelated health scenario The status page shows Ready was not selected: its page reads neither notes nor settings and no available diff connects it to this change.

Probe methods: browser journeys for rendered behavior; HTTP requests for endpoint bodies and captured command output. The five lookup captures ran in practice-node, fetched through the documented deployed evidence endpoint; they were not re-executed locally. Each metadata file retains the verbatim THEN. Numbered screenshots were opened in chat in journey order and browser result JSON was read. All four prescribed run invocations completed with RESULT: WALKED and REDACTED=0; WALKED only confirms capture, not correctness.

No repairs, posting, publishing, installer, cache deletion, preflight, Git save or human questions. All authored artifacts remain in this run folder.

| Scenario | Verdict | Evidence and limits |
|---|---|---|
| The list API counts its notes | pass | GET /api/notes returned count 7 and exactly seven note records. Evidence: [01/01-response.txt](evidence/01/01-response.txt) |
| Searching shows only matches | fail | Search for plumber also rendered Groceries for the week, whose title does not contain the word. Evidence: [02/01.png](evidence/02/01.png); [evidence/02.result.json](evidence/02.result.json) |
| Submitting with no title is rejected | fail | The form displayed Title required rather than the promised Title is required; the exact required message is absent. Evidence: [03/01.png](evidence/03/01.png); [evidence/03.result.json](evidence/03.result.json) |
| A new note stays in the list | fail | Walk UI K86ObN appeared initially but became Walk UI K86Ob after reload; the title did not stay unchanged. Evidence: [04/01.png](evidence/04/01.png); [04/02.png](evidence/04/02.png); [evidence/04.result.json](evidence/04.result.json) |
| Creating without a title answers 422 | fail | POST {} answered 422 with Title is required, but the fresh list grew from seven to eight and added blank-title id8. Evidence: [05/01-response.txt](evidence/05/01-response.txt); [05/02-response.txt](evidence/05/02-response.txt); [05/03-response.txt](evidence/05/03-response.txt) |
| Creating with a title answers 201 | partial | 201 returned note id9 and its typed title, confirmed by fresh GET; nightly re-indexing has no deployed reader or existing state command. Evidence: [06/01-response.txt](evidence/06/01-response.txt); [06/02-response.txt](evidence/06/02-response.txt) |
| A renamed note shows its new title | pass | After editing owned id9, the returned list displayed Walk Renamed K86ObN. Evidence: [07/02.png](evidence/07/02.png); [evidence/07.result.json](evidence/07.result.json) |
| Saving shows a Saved badge | pass | The edit page displayed Saved after waiting for the asynchronous badge; shared journey 07 receipt. Evidence: [07/01.png](evidence/07/01.png); [evidence/07.result.json](evidence/07.result.json) |
| A rename through the API is logged | partial | PUT id9 answered 200 with Walk API Renamed K86ObN, confirmed by GET; no existing deployed audit-log reader is documented. Evidence: [09/01-response.txt](evidence/09/01-response.txt); [09/02-response.txt](evidence/09/02-response.txt) |
| Deleting a note lowers the count | fail | Delete targeted owned id10; count fell 11 to 10 but id10 remained and owned id11 disappeared instead. Evidence: [10/01.png](evidence/10/01.png); [10/02.png](evidence/10/02.png); [evidence/10.result.json](evidence/10.result.json) |
| An archived note moves to Archived | pass | On retry with confirmed owned id9, its title disappeared from the main list and appeared in Archived. Evidence: [11/01.png](evidence/11/01.png); [11/02.png](evidence/11/02.png); [11/03.png](evidence/11/03.png); [evidence/11.result.json](evidence/11.result.json); [evidence/11-attempt-1.result.json](evidence/11-attempt-1.result.json); [23/01-response.txt](evidence/23/01-response.txt); [23/02-response.txt](evidence/23/02-response.txt) |
| Archiving a note emails the owner | partial | Archive reduced count 10 to 9; no sandbox delivery capture or deployed email reader can prove the owner received a named email. Evidence: [11/01.png](evidence/11/01.png); [11/02.png](evidence/11/02.png) |
| Looking up notes lists its document | pass | lookup-a is readable, exit 0, subject aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa, and stdout names notes and wiki/notes.md. Evidence: [13/01-response.txt](evidence/13/01-response.txt) |
| Looking up exports lists its document | fail | lookup-b is current and exit 0, but stdout has area exports and docs [], omitting wiki/exports.md. Evidence: [14/01-response.txt](evidence/14/01-response.txt) |
| A third lookup lists current notes | unverified | lookup-c names the expected document but subjectSha is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb; obtain a capture of reviewed source aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa. Evidence: [15/01-response.txt](evidence/15/01-response.txt) |
| A fourth lookup lists current notes | unverified | lookup-d returns 200 with truncated invalid JSON; its subject, exit code and stdout cannot be read reliably; obtain a complete capture. Evidence: [16/01-response.txt](evidence/16/01-response.txt) |
| The mapped lookup preserves its result | unverified | lookup-e current stdout names the document, but baseline inputSha256 e9517b7e differs from current b4c5906c; same-input preservation is not established. Evidence: [17/01-response.txt](evidence/17/01-response.txt) |
| The note panel displays notes | unverified | /unavailable answers 503 Preview unavailable; restore the deployed panel and repeat its browser check before grading product behavior. Evidence: [18/01.png](evidence/18/01.png); [evidence/18.result.json](evidence/18.result.json); [22/05-response.txt](evidence/22/05-response.txt) |
| The alpha preference survives reopening | fail | Alpha displayed Saved, then reopened as Original alpha; a fresh API GET confirms that the typed title was not stored. Evidence: [19/01.png](evidence/19/01.png); [19/02.png](evidence/19/02.png); [evidence/19.result.json](evidence/19.result.json); [22/03-response.txt](evidence/22/03-response.txt) |
| The bravo preference survives reopening | pass | Bravo displayed Saved and reopened with Walk bravo K86ObN; a fresh API GET returned that same title. Evidence: [20/01.png](evidence/20/01.png); [20/02.png](evidence/20/02.png); [evidence/20.result.json](evidence/20.result.json); [22/04-response.txt](evidence/22/04-response.txt) |
| The export view shows note titles | fail | /exports rendered undefined for every row while fresh GET /api/notes supplied real title fields; the documented consumer contract is contradicted. Evidence: [21/01.png](evidence/21/01.png); [21/01-response.txt](evidence/21/01-response.txt); [21/02-response.txt](evidence/21/02-response.txt); [evidence/21.result.json](evidence/21.result.json) |

Written expectations and execution locations:

- **The list API counts its notes** — request probe at `http://127.0.0.1:44805/api/notes`. THEN: the response lists the notes with a `count` equal to the number of notes listed
- **Searching shows only matches** — browser probe at `http://127.0.0.1:44805/?q=plumber`. THEN: only notes whose title contains the word are listed
- **Submitting with no title is rejected** — browser probe at `http://127.0.0.1:44805/new → POST /notes`. THEN: the form shows "Title is required" and nothing is saved
- **A new note stays in the list** — browser probe at `http://127.0.0.1:44805/new → / → reload`. THEN: the note appears in the list with its title as typed, and is still there unchanged after a reload
- **Creating without a title answers 422** — request probe at `http://127.0.0.1:44805/api/notes`. THEN: the endpoint answers 422, the body names the missing title, and no note is created
- **Creating with a title answers 201** — request probe at `http://127.0.0.1:44805/api/notes`. THEN: the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note
- **A renamed note shows its new title** — browser probe at `http://127.0.0.1:44805/notes/9/edit → /`. THEN: the new title shows in the list
- **Saving shows a Saved badge** — browser probe at `http://127.0.0.1:44805/notes/9/edit`. THEN: a "Saved" badge appears on the edit page
- **A rename through the API is logged** — request probe at `http://127.0.0.1:44805/api/notes/9`. THEN: the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log
- **Deleting a note lowers the count** — browser probe at `http://127.0.0.1:44805/ → /notes/10/delete → /`. THEN: the note disappears from the list and the count above the list drops by one
- **An archived note moves to Archived** — browser probe at `http://127.0.0.1:44805/ → /notes/9/archive → /archived`. THEN: the note appears on the Archived page and is no longer in the main list
- **Archiving a note emails the owner** — browser probe at `http://127.0.0.1:44805/ → /notes/9/archive`. THEN: the count above the list drops by one, and the owner is sent an email naming the note
- **Looking up notes lists its document** — request probe at `http://127.0.0.1:44805/practice/evidence/lookup-a`. THEN: output names `notes` and `wiki/notes.md`
- **Looking up exports lists its document** — request probe at `http://127.0.0.1:44805/practice/evidence/lookup-b`. THEN: output names `exports` and `wiki/exports.md`
- **A third lookup lists current notes** — request probe at `http://127.0.0.1:44805/practice/evidence/lookup-c`. THEN: output names `notes` and `wiki/notes.md`
- **A fourth lookup lists current notes** — request probe at `http://127.0.0.1:44805/practice/evidence/lookup-d`. THEN: output names `notes` and `wiki/notes.md`
- **The mapped lookup preserves its result** — request probe at `http://127.0.0.1:44805/practice/evidence/lookup-e`. THEN: output still names `notes` and `wiki/notes.md`, preserving the earlier result
- **The note panel displays notes** — browser probe at `http://127.0.0.1:44805/unavailable`. THEN: the panel displays their notes
- **The alpha preference survives reopening** — browser probe at `http://127.0.0.1:44805/settings/alpha`. THEN: Saved appears and reopening the preference shows the saved title unchanged
- **The bravo preference survives reopening** — browser probe at `http://127.0.0.1:44805/settings/bravo`. THEN: Saved appears and reopening the preference shows the saved title unchanged
- **The export view shows note titles** — browser probe at `http://127.0.0.1:44805/exports and /api/notes`. THEN: each exported title matches the corresponding `title` from `GET /api/notes`

Remaining checks are recorded, not asked:

- A third lookup lists current notes: obtain lookup-c for reviewed SHA aaaa… with the mapped notes input and the established capture method; expect readable stdout naming notes and wiki/notes.md. Current stale capture cannot prove this revision. No dependent journey.
- A fourth lookup lists current notes: obtain a complete lookup-d receipt with source, method, input, stdout, stderr and exit code; expect the reviewed source and both names. No safe alternate capture exists here. No dependent journey.
- The mapped lookup preserves its result: obtain before/after captures with identical input and method identities. Both must name notes and wiki/notes.md. The current output claim is shown, but the mismatched baseline cannot establish preservation. No dependent journey.
- The note panel displays notes: restore /unavailable in this practice deployment and reopen it; expect the actual notes panel. The 503 blocks direct observation and there is no documented alternate panel. No dependent journey.
- Creating with a title answers 201 (partial): the HTTP response and persisted note are shown. To show the missing nightly claim, run the established sandbox job and inspect its existing indexing consumer for id9; this checkout documents neither trigger nor reader. No safe simulation proves nightly processing.
- A rename through the API is logged (partial): the HTTP response and fresh renamed note are shown. Inspect an established deployed audit reader for a rename entry naming id9; no such reader is provided. No safe simulation proves that entry exists.
- Archiving a note emails the owner (partial): count reduction is shown. Inspect an established sandbox mail capture for an email naming Walk API Renamed K86ObN and addressed to its owner, or confirm the practice owner experience. No sandbox destination or delivery reader is documented, and the invocation sends no real messages. Rendering or a simulated email would not prove delivery.

Owned state: id7 is active with shortened title; id8 is an unexpected blank note; id9 is archived; id10 remains active after the failed delete; id11 was deleted instead. Bravo retains the invocation title, alpha remains Original alpha. See owned-state.json. Further deletion was deferred because the handler removed a different record; the capture guide establishes that stopping this disposable site removes all state. The site was left running and evidence retained.

Retry: the first archive batch could not find id11 because the preceding defective Delete removed it. Its screenshot, URL and command failure are retained as evidence/11-attempt-1*. The retry used independently confirmed owned id9 and passed the archive move/count claims. Completed inputs are in completed-stage-1 through completed-stage-4; metadata/ and ledger.json map the final coverage.

Pictures are retained locally in the linked evidence files. No published picture URLs exist because publication was explicitly skipped. No credentials, missing login, heals or install were involved.
