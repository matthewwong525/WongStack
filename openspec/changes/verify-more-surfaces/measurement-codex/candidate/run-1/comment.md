Overall: FAILURE

Practice / simulated evidence only. Reviewed source: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`. Live practice site: http://127.0.0.1:42335. Run: `/tmp/wong-verify-eval-run-xyS8t0`. No pull request, save, preflight, repair, install, posting, or publishing was performed.

Eight fail, six pass, three partial, four unverified. FAILURE takes precedence over blocked checks and partial observations. Browser exit codes and HTTP success codes were graded against each written THEN. All numbered screenshots were opened in order within each journey before grading. All three runs reported `REDACTED=0`.

Selected all twenty delta scenarios plus the confirmed exports consumer. `/exports` calls `GET /api/notes` and must render its `title` field (`wiki/notes-api.md`, `app/exports.mjs`). The unrelated `/status` capability has no notes/settings dependency and was excluded. There are no project-owned `.agents/verification/*.json` recipes in this checkout. Practice captures were fetched through the documented deployed evidence endpoints, without running their recorded commands locally.

| Scenario | Verdict | Evidence and limits |
|---|---|---|
| The list API counts its notes | pass | GET returns count 7 and seven records; a later fresh read also returns eight records with count 8. [Evidence](evidence/01/01-response.txt) |
| Searching shows only matches | fail | Searching plumber lists Call the plumber and Plumber invoice, but also Groceries for the week, which does not match. [Evidence](evidence/02/01.png) |
| Submitting with no title is rejected | fail | The form says "Title required", not the promised "Title is required"; before/after API lists remain identical at six records. [Evidence](evidence/03/02.png) |
| A new note stays in the list | fail | Submitted "Walk Synthetic Exact Title" appears initially; fresh load shows "Walk Synthetic Exact Titl", losing the final character. [Evidence](evidence/04/02.png) |
| Creating without a title answers 422 | fail | POST {} returns 422 and {"error":"Title is required"}, but fresh GET adds blank-title note id 10 and raises count 7 to 8. [Evidence](evidence/05/03-response.txt) |
| Creating with a title answers 201 | partial | POST returns 201 with id 11 and "Walk API Synthetic"; fresh GET confirms storage. Nightly re-indexing has no documented trigger or read route. [Evidence](evidence/06/01-response.txt) |
| A renamed note shows its new title | pass | Retry edits owned note id 7 to "Walk Renamed Exact"; returned list and fresh reload both show that exact title. [Evidence](evidence/retry/07/03.png) |
| Saving shows a Saved badge | pass | After saving "Walk Renamed Badge", waiting for visible Saved produces a screenshot with the Saved badge on the edit page. [Evidence](evidence/retry/08/01.png) |
| A rename through the API is logged | partial | PUT owned note id 11 returns 200 with "Walk API Renamed" and fresh GET retains it; no documented audit-log consumer or capture is available. [Evidence](evidence/09/01-response.txt) |
| Deleting a note lowers the count | fail | Delete changes displayed count 9 to 8, but "Walk Renamed Badge" remains in the list and a later fresh API read retains id 7. [Evidence](evidence/retry/10/02.png) |
| An archived note moves to Archived | pass | Archived owned note id 8 disappears from the main list and appears on /archived; its stored title is "Walk Archive Syntheti". [Evidence](evidence/11/03.png) |
| Archiving a note emails the owner | partial | Archiving owned note id 9 reduces count 8 to 7. No mailbox, sandbox delivery capture, or documented email read route proves email naming the note. [Evidence](evidence/12/02.png) |
| Looking up notes lists its document | pass | lookup-a is readable JSON for reviewed aaaa source, practice-node, notes input and recorded method; exit 0 stdout names notes and wiki/notes.md. [Evidence](evidence/13/01-response.txt) |
| Looking up exports lists its document | fail | lookup-b has reviewed source and exports input; exit 0 stdout says area exports with docs [], omitting wiki/exports.md. [Evidence](evidence/14/01-response.txt) |
| A third lookup lists current notes | unverified | lookup-c stdout names the expected document, but subjectSha is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not the reviewed revision. [Evidence](evidence/15/01-response.txt) |
| A fourth lookup lists current notes | unverified | lookup-d response is truncated malformed JSON ending at subjectSha; source identity and readable command output cannot be validated. [Evidence](evidence/16/01-response.txt) |
| The mapped lookup preserves its result | unverified | lookup-e head aaaa names notes/wiki/notes.md, but baseline cccc has a different inputSha256; preservation under identical input is unproved. [Evidence](evidence/17/01-response.txt) |
| The note panel displays notes | unverified | /unavailable returns 503 "Preview unavailable"; the notes panel cannot be observed through its entry point. [Evidence](evidence/22/01-response.txt) |
| The alpha preference survives reopening | fail | Saved appears for "Walk alpha Saved Title", but reopening and fresh GET return "Original alpha"; supplementary POST 200 saved:true also contradicts its fresh GET. [Evidence](evidence/19/02.png) |
| The bravo preference survives reopening | pass | Saved appears for "Walk bravo Saved Title"; reopening and fresh GET preserve that exact value; supplementary POST/readback agree. [Evidence](evidence/20/02.png) |
| The export view shows note titles | fail | Fresh producer GET supplies seven actual titles; /exports renders seven "undefined" values instead. [Evidence](evidence/21/02.png) |

Written expectations and probe details:

**The list API counts its notes** (request; live disposable practice site, or recorded `practice-node` capture).

THEN: the response lists the notes with a `count` equal to the number of notes listed

**Searching shows only matches** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: only notes whose title contains the word are listed

Retained local pictures (practice; not published): [02/01](evidence/02/01.png).

**Submitting with no title is rejected** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the form shows "Title is required" and nothing is saved

Retained local pictures (practice; not published): [03/01](evidence/03/01.png), [03/02](evidence/03/02.png), [03/03](evidence/03/03.png).

**A new note stays in the list** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the note appears in the list with its title as typed, and is still there unchanged after a reload

Retained local pictures (practice; not published): [04/01](evidence/04/01.png), [04/02](evidence/04/02.png).

**Creating without a title answers 422** (request; live disposable practice site, or recorded `practice-node` capture).

THEN: the endpoint answers 422, the body names the missing title, and no note is created

**Creating with a title answers 201** (request; live disposable practice site, or recorded `practice-node` capture).

THEN: the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note

**A renamed note shows its new title** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the new title shows in the list

Retained local pictures (practice; not published): [07/01 retry](evidence/retry/07/01.png), [07/02 retry](evidence/retry/07/02.png), [07/03 retry](evidence/retry/07/03.png).

**Saving shows a Saved badge** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: a "Saved" badge appears on the edit page

Retained local pictures (practice; not published): [08/01 retry](evidence/retry/08/01.png).

**A rename through the API is logged** (request; live disposable practice site, or recorded `practice-node` capture).

THEN: the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log

**Deleting a note lowers the count** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the note disappears from the list and the count above the list drops by one

Retained local pictures (practice; not published): [10/01](evidence/10/01.png), [10/01 retry](evidence/retry/10/01.png), [10/02 retry](evidence/retry/10/02.png).

**An archived note moves to Archived** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the note appears on the Archived page and is no longer in the main list

Retained local pictures (practice; not published): [11/01](evidence/11/01.png), [11/02](evidence/11/02.png), [11/03](evidence/11/03.png).

**Archiving a note emails the owner** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the count above the list drops by one, and the owner is sent an email naming the note

Retained local pictures (practice; not published): [12/01](evidence/12/01.png), [12/02](evidence/12/02.png).

**Looking up notes lists its document** (ci-capture via request; live disposable practice site, or recorded `practice-node` capture).

THEN: output names `notes` and `wiki/notes.md`

**Looking up exports lists its document** (ci-capture via request; live disposable practice site, or recorded `practice-node` capture).

THEN: output names `exports` and `wiki/exports.md`

**A third lookup lists current notes** (ci-capture via request; live disposable practice site, or recorded `practice-node` capture).

THEN: output names `notes` and `wiki/notes.md`

**A fourth lookup lists current notes** (ci-capture via request; live disposable practice site, or recorded `practice-node` capture).

THEN: output names `notes` and `wiki/notes.md`

**The mapped lookup preserves its result** (ci-capture via request; live disposable practice site, or recorded `practice-node` capture).

THEN: output still names `notes` and `wiki/notes.md`, preserving the earlier result

**The note panel displays notes** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: the panel displays their notes

Retained local pictures (practice; not published): [18/01](evidence/18/01.png).

**The alpha preference survives reopening** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: Saved appears and reopening the preference shows the saved title unchanged

Retained local pictures (practice; not published): [19/01](evidence/19/01.png), [19/02](evidence/19/02.png), [19/03](evidence/19/03.png).

**The bravo preference survives reopening** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: Saved appears and reopening the preference shows the saved title unchanged

Retained local pictures (practice; not published): [20/01](evidence/20/01.png), [20/02](evidence/20/02.png), [20/03](evidence/20/03.png).

**The export view shows note titles** (browser; live disposable practice site, or recorded `practice-node` capture).

THEN: each exported title matches the corresponding `title` from `GET /api/notes`

Retained local pictures (practice; not published): [21/01](evidence/21/01.png), [21/02](evidence/21/02.png).

Capture identity and comparison limits:

lookup-a and lookup-b carry reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, their respective notes/exports argv, environment `practice-node`, exit/stdout/stderr, and method digest `27ae084b6240d7fa0a346a3c42d783115afa84983667ef6c8b3ab6c12b7b1718`. Capture identity is the documented lookup endpoint plus these retained record fields; no independent real CI run is asserted. lookup-c belongs to `bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`; lookup-d cannot be parsed. lookup-e head is reviewed `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, baseline is `cccccccccccccccccccccccccccccccccccccccc`. Both stdout values name notes and wiki/notes.md and the methods/environments agree, but head input digest is `b4c5906c018690d654656f10033eb9317cec0f1cd19b999a65d3c133a2d69153` versus baseline `e9517b7e1bb335bf4c0824125e8f9920a92464dc28ee77afa23f4a2ed92cbb6b`. The valid head observation stands; it cannot establish preservation with identical inputs.

Retries and lasting effects:

The first edit/badge/delete attempts could not find the originally typed title because creation changed its persisted value. Completed inputs were moved to `completed-1/` before retrying; retries used the observed stored title and retained separate pictures/results. `completed-2/` retains the second stage. The third stage records panel status and preference initiating responses plus independent readbacks. Browser snapshots, URL receipts, raw requests, submitted inputs and numbered pictures remain under `evidence/`. Retry screenshot paths are nested under `evidence/retry/`, so the driver printed zero screenshots for those retry ids even though their batch results and pictures exist. No mutation was silently replayed.

Remaining limits and needed observations (no questions or permission requests in this practice run):

- Nightly indexing: no documented deployed job trigger/state reader or matching capture. Needed: an existing sandbox job receipt naming created note id 11 after the nightly run. No independent scenario depends on it.
- Audit logging: no documented audit reader or matching capture. Needed: a retained rename entry naming note id 11 for the PUT to "Walk API Renamed". No independent scenario depends on it.
- Email: the disposable archive trigger was simulated safely, but there is no documented mailbox/sandbox integration. Needed: a delivery receipt or human-checkable mailbox message naming archived note id 9; actual sending/delivery and personal experience remain unproved. No real email was sent by this exercise.
- Current lookup captures: needed a readable capture for reviewed aaaa source replacing lookup-c/lookup-d, with matching input/method identities and stdout naming notes/wiki/notes.md.
- Preservation: needed compatible baseline/head captures using the same verified input digest and method/environment. Expected both outputs name notes/wiki/notes.md. Only the comparison is blocked.
- Notes panel: restore its existing practice entry point from 503, then observe rendered notes. This blocks that panel check alone.

No additional safe simulation route is documented for the missing job, audit, or email claims. Synthetic notes and preferences already exercise the supported deployed interfaces; simulation does not establish real CI, production persistence, nightly processing, audit writes or email delivery. No ambiguous product expectation required an ask verdict. Blocked/invalid captures remain unverified, and inherently unobservable subclaims remain partial.

Invocation-owned records observed: id 7 (form-created; later renamed; deletion leaves it present), id 8 (archive fixture), id 9 (email fixture), id 10 (unexpected blank note from rejected API create; later removed by delete behavior), id 11 (API fixture; later renamed). Bravo holds "Walk bravo Saved Title"; alpha still holds "Original alpha". All state is disposable in memory per wiki/practice-captures.md. Browser sessions were closed by the driver. Evidence and state ownership are retained; no cleanup, cache deletion, or site shutdown was performed.
