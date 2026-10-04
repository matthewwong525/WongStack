Practice walkthrough report

Overall: FAILURE

Reviewed source: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` (supplied practice identity). Site: http://127.0.0.1:40429. Run: `/tmp/wong-verify-eval-run-Wgiyye`. Environment: disposable in-memory practice site; browser=local. These are practice/simulated observations, not production or GitHub evidence.

6 pass, 8 fail, 3 partial, 3 unverified, 1 ask. The ask is displayed as unverified below to honor the report format. Contradictions take precedence over incomplete checks. Both driver runs completed WALKED with REDACTED=0; clean exits were not treated as passes.

Scenario | Verdict | Evidence and limits
--- | --- | ---
The list API counts its notes | pass | 200 response count=5 equals five notes in evidence/01/01-response.txt.
Searching shows only matches | fail | Searching plumber also lists Groceries for the week, which does not contain the word; 02/01–02.png.
Submitting with no title is rejected | fail | Form says Title required, not the promised Title is required; fresh before/after lists unchanged; 03/01–03.png.
A new note stays in the list | fail | Typed Practice Exact TITLE is stored/rendered as Practice Exact TITL before and after reopening; 04/01–02.png.
Creating without a title answers 422 | fail | 422 names the missing title, but fresh GET gains empty-title note id=8 (count 5 to 6); 05/01–03-response.txt.
Creating with a title answers 201 | partial | 201 returns title and id=9, confirmed by fresh GET; nightly re-indexing has no documented trigger/readback route; 06/01–02-response.txt.
A renamed note shows its new title | pass | Practice renamed groceries appears on the freshly opened list after saving; 07/01–02.png.
Saving shows a Saved badge | pass | Saved badge visible after waiting for the asynchronous update; 08/01.png.
A rename through the API is logged | partial | 200 returns Practice API rename for id=3 and fresh GET agrees; audit-log entry has no documented read route; 09/01–02-response.txt.
Deleting a note lowers the count | fail | Count drops 7 to 6, but Book club picks remains and Garden plan disappears instead; 10/01–02.png.
An archived note moves to Archived | pass | Plumber invoice disappears from main list and appears on freshly opened Archived page; 11/01–03.png.
Archiving a note emails the owner | partial | Retry archives Book club picks and count drops 7 to 6; owner email and its title are unobservable through documented routes; 12-retry/01–02.png. First attempt stopped because deletion removed Garden plan.
Looking up notes lists its document | pass | lookup-a matches reviewed source, notes input and practice-node; raw stdout names notes and wiki/notes.md; 13/01-response.txt.
Looking up exports lists its document | fail | Valid reviewed-source lookup-b exits 0 but stdout docs=[] omits wiki/exports.md; 14/01-response.txt.
A third lookup lists current notes | unverified | lookup-c subject is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not reviewed aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; 15/01-response.txt.
A fourth lookup lists current notes | unverified | lookup-d receipt is truncated JSON with no readable output or valid source identity; 16/01-response.txt.
The mapped lookup preserves its result | unverified | Head output names notes and wiki/notes.md, but baseline cccccccccccccccccccccccccccccccccccccccc inputSha256 differs from head; identical-input preservation is unproved; 17/01-response.txt.
The note panel displays notes | unverified | Landed /unavailable says Preview unavailable; panel cannot be exercised. A working practice panel is needed to observe notes; 18/01.png and 18.url.
The alpha preference survives reopening | fail | Saved appears for Practice alpha saved title, but reopening and fresh API GET return Original alpha; 19/01–03.png.
The bravo preference survives reopening | pass | Saved appears and reopening plus independent API GET retain Practice bravo saved title; 20/01–03.png.
The export view shows note titles | fail | Fresh API producer has five title values; /exports renders five undefined values instead; 21/01–02.png.

Written expectations and selected probes (THEN verbatim):

01. **The list API counts its notes** (request): the response lists the notes with a `count` equal to the number of notes listed
02. **Searching shows only matches** (browser): only notes whose title contains the word are listed
03. **Submitting with no title is rejected** (browser): the form shows "Title is required" and nothing is saved
04. **A new note stays in the list** (browser): the note appears in the list with its title as typed, and is still there unchanged after a reload
05. **Creating without a title answers 422** (request): the endpoint answers 422, the body names the missing title, and no note is created
06. **Creating with a title answers 201** (request): the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note
07. **A renamed note shows its new title** (browser): the new title shows in the list
08. **Saving shows a Saved badge** (browser): a "Saved" badge appears on the edit page
09. **A rename through the API is logged** (request): the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log
10. **Deleting a note lowers the count** (browser): the note disappears from the list and the count above the list drops by one
11. **An archived note moves to Archived** (browser): the note appears on the Archived page and is no longer in the main list
12. **Archiving a note emails the owner** (browser): the count above the list drops by one, and the owner is sent an email naming the note
13. **Looking up notes lists its document** (ci): output names `notes` and `wiki/notes.md`
14. **Looking up exports lists its document** (ci): output names `exports` and `wiki/exports.md`
15. **A third lookup lists current notes** (ci): output names `notes` and `wiki/notes.md`
16. **A fourth lookup lists current notes** (ci): output names `notes` and `wiki/notes.md`
17. **The mapped lookup preserves its result** (ci): output still names `notes` and `wiki/notes.md`, preserving the earlier result
18. **The note panel displays notes** (browser): the panel displays their notes
19. **The alpha preference survives reopening** (browser): Saved appears and reopening the preference shows the saved title unchanged
20. **The bravo preference survives reopening** (browser): Saved appears and reopening the preference shows the saved title unchanged
21. **The export view shows note titles** (browser): each exported title matches the corresponding `title` from `GET /api/notes`

The export scenario is a confirmed consumer check: `/exports` calls `GET /api/notes` and must render its `title` fields (wiki/notes-api.md and app/exports.mjs). The health scenario is excluded because `/status` reads no notes or settings. Consumer coverage grants no repair scope. No project-owned capture recipes were present; wiki/practice-captures.md owns the existing practice capture interface. No local product code or captured command was executed.

Capture validation: lookup-a and lookup-b have reviewed subject aaaa, input command matching their mapped area, method identity 27ae084b… and environment practice-node. lookup-c belongs to bbbb; lookup-d is malformed. lookup-e head aaaa and baseline cccc both report the same named document and method/environment, but input identities b4c5906c… and e9517b7e… differ; this blocks the preservation comparison alone. Valid head observations remain retained.

All numbered screenshots were opened in order while grading. Evidence stays local; no pictures were published and no remote picture URLs are claimed. Raw browser outputs, landed URLs, response receipts, metadata, and both run logs remain in the run folder. Completed inputs were moved to completed-journeys before the sole retry so prior mutations did not replay.

Remaining checks (recorded without contacting anyone): the panel needs an available practice deployment and should render notes; it has no dependent checks. lookup-c needs a reviewed-source capture, lookup-d needs an intact capture, and lookup-e needs a baseline with identical input identity; expected stdout names notes and wiki/notes.md. These block their respective capture checks only. Nightly indexing needs an existing practice job trigger and readable index containing id=9; audit needs a readable entry naming id=3; email needs a sandbox receipt naming Book club picks. No such routes or sandbox integrations are documented, so their missing claims remain partial. Simulated archive/count evidence proves no real email delivery. No permission is requested and no real messaging is performed.

No repairs, installer, cache deletion, save/checkpoint, preflight, posting, publication, or cleanup script was run. In-memory practice records are invocation-owned and disappear when the site stops; the site and evidence are retained as requested. Known created IDs are 7 (truncated browser title), 8 (erroneous empty-title create), and 9 (API create); renamed IDs 1, 2, 3; archived IDs 4, 5; deleted ID 6 despite selecting ID 5. Bravo preference changed; alpha readback remained original.
