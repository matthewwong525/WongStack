Overall: SUCCESS — the revised verification behavior’s final integration checks passed, with the partial coverage below.

Saved implementation: `9f87a05ca1d87f9af1d9a2255b3dd4b515acbd41`. [Required checks and captures](https://github.com/matthewwong525/WongStack/actions/runs/37184710803), push attempt 1, all required checks successful. Workflow `.github/workflows/payload.yml`, repository `matthewwong525/WongStack`; capture source, actual GitHub run and attempt match. Artifacts are retained for 14 days. Digests establish byte integrity; written expectations decide acceptance.

Preview discovered for this revision: https://heroic-eagle-wongstack-staging.matthewwong525.workers.dev. Chrome / agent-browser 0.38.1. Default preflight returned READY, exit 0. CI-only preflight independently returned READY, exit 0 with an empty URL and BROWSER=none, using `--no-preview --no-browser`. No preview was invented; downloaded evidence was read, never executed on this host. No repair, browser installation, Access heal or credential mint was needed during this final walk.

Pictures (log in to open): [1. Unknown address shows Page not found and Go home](https://wongstack.matthewwong525.workers.dev/_walk/9f87a05/20261004T071547Z/01-ordinary-preview/01-not-found.png).

### Ordinary preview without a recipe

- **An unknown address — pass.** THEN: “they see a "page not found" message with a link home, not the home page”. Opened `/nothing-here`; landed URL agrees, screenshot and snapshot show “Page not found”, “Nothing lives at this address.” and “Go home”.
- **The health route — pass.** THEN: “the Worker answers 200 with `{ "ok": true }`, and `GET /api/nothing` answers 404”. Actual GET `/api/health` returned HTTP 200 and `{"ok":true}`; GET `/api/nothing` returned HTTP 404 and `{"error":"Not found"}`. Access response cookies were redacted in two captures.

### Actual command-line evidence and selected baseline

Node v22.23.3, Linux x64, C.UTF-8; actual `memory.mjs areas` source executed only in CI, against an isolated Git fixture with neither `.env` nor installation record. Recipe entry points, canonical scenario references and prerequisites validate. Selected merge-base `932439bf1109066faaf2aec85cf653db3941ff4b` versus saved head `9f87a05ca1d87f9af1d9a2255b3dd4b515acbd41`: all three observations are comparable, same fixture input/method/environment, exit 0 on both, byte-identical stdout. Both fixture and baseline source cleanup are retained; fixture before/after digests match.

| Scenario and verbatim THEN | Actual observation | Result |
| --- | --- | --- |
| No mapped folder: “the command says no area matched and prints no facts” | `No mapped area for these paths.`, exit 0; no facts. | Pass |
| The store is unreachable: “it says memory was not loaded and exits without failing” | `Memory was not loaded (no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it); go on without it.`, exit 0. | ◐ Unconfigured-store fallback shown; configured network outage unproved. |
| A mini-app file: “it prints `mini-apps` and `worker`, both docs, that change among its past changes, the pages linking to the file, then the `mini-apps` and `worker` facts” | Both areas/docs, seeded archived change and backlink precede unavailable-memory warning; exit 0. | ◐ Local document traversal shown; actual configured facts unproved. |

This comparison shows preserved local lookup behavior, not a memory repair or configured-service connection. Service/fact coverage needs an isolated configured store and observed facts; a real outage needs that store’s failure response. Neither was safely available in this deliberately unconfigured pilot. Full setup and assistant conversations have no capture route in this change and remain unverified follow-up surfaces.

### Practical retained regression

THEN: “`/verify` safely restores its disposable test data, fixes, saves, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported”.

The same focused check, `default preflight still discovers the preview and checks its browser`, SHA-256 `e7a1f5ff98e7a57988ab6681681f399ff250c0f09a8dcef5846ce04e37fd2dcc`, ran with identical argv and disposable mocked inputs on actual earlier source `ab27e29989bbf4074b8949210d1c7cae2f64ae25` and repaired saved head 9f87a05. Before: READY but shell exit 1; `ERR_ASSERTION`, `1 !== 0`, test pass 0/fail 1. After: READY, shell exit 0, test pass 1/fail 0. Both source digests match Git blobs; all retained streams’ bytes/digests match. Source directory and registration were removed. The whole repaired-head suite still passes; no failing product checkpoint or weaker gate was introduced. Fixture identity is separate from the two Git source revisions. This is exact-source practice proof with mocked preview/browser, not a live-preview failure claim.

Impractical-harness and out-of-scope paths were separately exercised as labelled manual decision simulations: retain the available initiating reproduction and missing delivery proof without creating a receiver/framework; preserve shared data and report an unrelated consumer failure without fixing it. These decisions prove no actual delivery or consumer mutation. The two-repair bound remains unchanged; exhausting two repairs was not needed here.

### Final mixed practice walk — deliberately planted defects

The current saved walkthrough, including the repair rule, was exercised once through the existing by-hand measurement exception. Pinned Codex 0.159.2, gpt-6.1-sol, builder framing, same fixed inputs/scorer. This is not a second before/after experiment. All five original browser defects and three mixed defects were caught, zero false passes or false alarms; both healthy mixed controls passed, unrelated status page excluded. The frozen report parser records 0/9 rows and zero named gaps because this valid Markdown table lacks optional outer pipes; its lexical consumer-reason flag is also false. Human inspection confirms all nine rows, four gaps and explicit confirmed relationship. Scores were not changed afterward. Runtime 4.745 minutes, native reported 64,775 tokens; dollar cost unavailable. No statistical or cost improvement is claimed.

The practice walker correctly reports FAILURE because the supplied practice site intentionally contains defects. That verdict applies to its planted product behavior, not to this change’s implementation. Initiating/readback evidence: alpha wrote `Practice alpha saved` at 07:08:19.701 UTC, but fresh GET at 07:08:20.971 returned `Original alpha`; bravo wrote `Practice bravo saved` at 07:08:25.533 and fresh GET at 07:08:26.806 retained the exact value. Fresh exports consumed `GET /api/notes.title` but rendered six undefined rows. All temporary practice data belonged to a disposable in-memory site, which was stopped afterward; no production writes occurred.

The complete practice report follows; relative receipt links have been omitted here because all essential observations are inline. Raw observations, report, ledger, requests, screenshots and native trace are retained under the change’s measurement evidence for the publishing checkpoint.

Overall: FAILURE

Practice walkthrough of reviewed source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` at http://127.0.0.1:35689. All site actions and captures are disposable practice evidence, not a pull request review or real delivery evidence. BUILD-NOTES.md claims were not used as expected results. No repairs, installs, cache deletion, publishing, posting, or human questions. Both runs completed with REDACTED=0.

21 scenarios selected: 20 delta scenarios plus the confirmed exports consumer. `/exports` calls GET /api/notes and consumes its title contract (wiki/notes-api.md and app/exports.mjs). `/status` is excluded because it reads neither notes nor settings. No additional canonical expectations were found.

Scenario | Verdict | Evidence and limits
--- | --- | ---
The list API counts its notes | pass | HTTP 200 lists five notes and count 5.
Searching shows only matches | fail | Search plumber also lists Groceries for the week at /?q=plumber.
Submitting with no title is rejected | fail | Empty submission shows Title required rather than Title is required; list remains at six notes.
A new note stays in the list | fail | Submitted Practice Exact Title appears as Practice Exact Titl immediately and after reopening.
Creating without a title answers 422 | fail | 422 names the missing title, but fresh GET grows from 5 to 6 and adds id 8 with an empty title.
Creating with a title answers 201 | partial | 201 returns id 9 and Practice API create; fresh GET retains it; nightly re-indexing has no supplied observation route.
A renamed note shows its new title | pass | Practice renamed appears in the list and on a freshly reopened edit page.
Saving shows a Saved badge | pass | Saved appears after saving Practice badge, with stored title confirmed by reopening.
A rename through the API is logged | partial | PUT id 6 returns 200 and Practice API rename; fresh GET agrees; audit-log entry has no supplied read route.
Deleting a note lowers the count | fail | Delete Call the plumber lowers count 7 to 6 but leaves that note and removes Trip ideas instead.
An archived note moves to Archived | pass | Retry archives Plumber invoice: absent from main list, present on Archived; initial target Trip ideas was already removed by Delete.
Archiving a note emails the owner | partial | Archiving Book club picks lowers count 6 to 5 and moves it to Archived; email naming the note cannot be observed through supplied routes.
Looking up notes lists its document | pass | Current-source lookup-a stdout names notes and wiki/notes.md; exit 0, valid input identity and practice-node capture.
Looking up exports lists its document | fail | Current-source lookup-b stdout names exports but docs is empty; exit 0 does not supply wiki/exports.md.
A third lookup lists current notes | unverified | lookup-c names the expected document but subjectSha is bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb, not the reviewed source.
A fourth lookup lists current notes | unverified | lookup-d response is truncated malformed JSON; source identity and readable captured output cannot be validated.
The mapped lookup preserves its result | unverified | lookup-e head output matches, but baseline cccccccccccccccccccccccccccccccccccccccc has a different inputSha256; preservation comparison is incompatible.
The note panel displays notes | unverified | Panel returns 503 Preview unavailable; restoring the deployed panel is needed before notes can be observed; no person was asked.
The alpha preference survives reopening | fail | Alpha shows Saved for Practice alpha saved but reopening and independent GET both return Original alpha.
The bravo preference survives reopening | pass | Bravo shows Saved and reopening plus independent GET retain Practice bravo saved unchanged.
The export view shows note titles | fail | Fresh /exports renders six undefined rows while corresponding fresh API records contain title values; confirmed title-contract consumer contradicts the promise.

Written expectations and retained receipts:

**The list API counts its notes** (request; live disposable site or practice-node capture).

> the response lists the notes with a `count` equal to the number of notes listed


**Searching shows only matches** (browser; live disposable site or practice-node capture).

> only notes whose title contains the word are listed


**Submitting with no title is rejected** (browser; live disposable site or practice-node capture).

> the form shows "Title is required" and nothing is saved


**A new note stays in the list** (browser; live disposable site or practice-node capture).

> the note appears in the list with its title as typed, and is still there unchanged after a reload


**Creating without a title answers 422** (request; live disposable site or practice-node capture).

> the endpoint answers 422, the body names the missing title, and no note is created


**Creating with a title answers 201** (request; live disposable site or practice-node capture).

> the endpoint answers 201 with the note and its id, and the nightly job re-indexes the note


**A renamed note shows its new title** (browser; live disposable site or practice-node capture).

> the new title shows in the list


**Saving shows a Saved badge** (browser; live disposable site or practice-node capture).

> a "Saved" badge appears on the edit page


**A rename through the API is logged** (request; live disposable site or practice-node capture).

> the endpoint answers 200 with the new title, and an entry naming the note is written to the audit log


**Deleting a note lowers the count** (browser; live disposable site or practice-node capture).

> the note disappears from the list and the count above the list drops by one


**An archived note moves to Archived** (browser; live disposable site or practice-node capture).

> the note appears on the Archived page and is no longer in the main list


**Archiving a note emails the owner** (browser; live disposable site or practice-node capture).

> the count above the list drops by one, and the owner is sent an email naming the note


**Looking up notes lists its document** (request; live disposable site or practice-node capture).

> output names `notes` and `wiki/notes.md`


**Looking up exports lists its document** (request; live disposable site or practice-node capture).

> output names `exports` and `wiki/exports.md`


**A third lookup lists current notes** (request; live disposable site or practice-node capture).

> output names `notes` and `wiki/notes.md`


**A fourth lookup lists current notes** (request; live disposable site or practice-node capture).

> output names `notes` and `wiki/notes.md`


**The mapped lookup preserves its result** (request; live disposable site or practice-node capture).

> output still names `notes` and `wiki/notes.md`, preserving the earlier result


**The note panel displays notes** (browser; live disposable site or practice-node capture).

> the panel displays their notes


**The alpha preference survives reopening** (browser; live disposable site or practice-node capture).

> Saved appears and reopening the preference shows the saved title unchanged


**The bravo preference survives reopening** (browser; live disposable site or practice-node capture).

> Saved appears and reopening the preference shows the saved title unchanged


**The export view shows note titles** (browser; live disposable site or practice-node capture).

> each exported title matches the corresponding `title` from `GET /api/notes`


Capture limits: lookup-a and lookup-b match reviewed source, command input digests, practice-node environment and supplied method identity; raw stdout/stderr/exit are retained. No project-owned .agents/verification recipes exist; the project practice guide owns these captures. lookup-c is stale; lookup-d cannot be parsed. lookup-e valid head observation stands, but its baseline input digest differs (e9517b7e… versus b4c5906c…); identical stdout and method/environment do not establish preservation. There is no compatible earlier revision comparison.

Remaining checks, without requesting help: nightly re-indexing needs an existing job execution/index readback showing id 9; audit logging needs an existing log read showing rename id 6; email needs a sandbox receipt naming Book club picks and its owner. These three are partial, not passes; the supplied practice interfaces expose no safe simulation or readback for those claims, and real delivery remains unproved. Panel is ask in verdicts.json and unverified in the required report table: restore /unavailable, then observe its notes. Independent checks completed despite that block. Current-source captures are needed for lookup-c/d; a compatible baseline with identical input/method/environment is needed for lookup-e. No dependent mutation remains queued.

The initial Archive journey stopped because the Delete defect removed its intended target. Its receipts are retained; retry uses Plumber invoice and passes. Fresh exports were captured after API mutations to compare stable producer and consumer values. Completed inputs are retained in completed-journeys/ so mutations did not replay. Journeys contain no assertions. Numbered screenshots were opened in order while grading. Practice pictures were not published; their raw copies are retained separately.

Browser sessions were closed by the runner; its temporary owned profiles were removed. Invocation-owned in-memory records remain with the practice site and disappear when the site stops, per wiki/practice-captures.md. No cleanup through the defective Delete handler was attempted. Report, metadata, ledger, and receipts are retained as requested.


Final evidence was scrubbed before posting. Owned run folders are removed after retaining observations; no blocked real-preview check remains. The partial service/setup/conversation claims above remain partial or unverified, not passes.
