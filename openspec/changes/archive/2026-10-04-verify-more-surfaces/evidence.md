# Verification evidence

Raw evidence paths below are archive-relative: see `raw-evidence.md`. All original bytes are retained in `raw-verification-evidence.tar.gz`; the final combined report also remains readable in `integration-report.md`.

## First real command-line pilot — 2026-10-04

Source/capture head: `c43f71eb37a1153616c39f9ef65642c94805f827`. Repository: `matthewwong525/WongStack`. Workflow: `.github/workflows/payload.yml`. [Push run 37176178657](https://github.com/matthewwong525/WongStack/actions/runs/37176178657), attempt 1, completed successfully. Downloaded artifact: `verify-memory-areas`, ID `11292858098`, 14-day retention. GitHub server identity matched the manifest repository, workflow, head, actual subject revision, run and attempt. Every retained stream matched its SHA-256 digest. The complete required gate passed; script coverage was 91.82% lines and 88.58% branches, with existing thresholds unchanged.

| Canonical memory scenario | Observed raw output and state | Coverage |
|---|---|---|
| A fact names the code area it concerns / No mapped folder | `No mapped area for these paths.`, exit 0, no facts | Shown |
| A fact names the code area it concerns / The store is unreachable | `Memory was not loaded (no memory store is recorded in .claude/.wong-stack.json; run /wong-sync to plan it); go on without it.`, exit 0 | Graceful unconfigured-store behavior shown; configured service network outage not exercised |
| One lookup shows everything linked to a path or topic / A mini-app file | `mini-apps` and `worker`, both named docs, seeded archived change and backlink precede unavailable-memory warning, exit 0 | Partly shown: the promised actual memory facts require a real configured service |

The isolated repo had neither `.env` nor an installation record. Before/after fixture file digests matched for all three calls. Cleanup removed the temporary fixture, while stdout, stderr and the manifest survived outside it. This is an actual current-source CLI observation, not practice-site or forged evidence. It establishes no service connectivity, network outage, configured facts, full setup, or conversation behavior. No before/after repair claim is made by this head-only pilot.

Producer tests exercised real nonzero output (exit 7), unavailable executable, source mismatch/missing source, scrub-before-digest and output retention. Product command failure remains captured evidence; inability to start remains a capture gap. No repository implementation ran locally to supply missing evidence.

`/save`: branch `heroic-eagle`, [PR #261](https://github.com/matthewwong525/WongStack/pull/261), gate SUCCESS. CI-discovered preview: https://heroic-eagle-wongstack-staging.matthewwong525.workers.dev. Session facts were skipped because this checkout has no registered session; the living proposal and this evidence file retain the handoff.

## Remaining evidence

All planned build and integration evidence is complete below. Publication remains pending. Configured memory-service connectivity/facts/network outage, full setup and assistant conversation behavior remain explicitly outside the proven coverage; they are not silently passed.

## Recipe and collector compatibility — 2026-10-04

The project-owned recipe resolves both current memory entry-point files, the capture guide, existing workflow and all three requirement-qualified canonical scenarios. The collector's read-only validator accepted the downloaded historical pilot from `/tmp/wong-verify-pilot-c43f71e` against the server identity recorded above: three records, intact stream digests and retained cleanup observations. This validates compatibility with actual artifact bytes; it is not fresh evidence for the collector implementation. No memory implementation executed on the host.

At this historical checkpoint, the collector and its rejection tests awaited the next gate; the fresh-head result follows below. Fixed-name artifact upload now replaces the previous attempt's artifact, so a rerun can retain its newest attempt; no previous passing attempt is substituted when that capture is missing or invalid.

## Collector fresh-head proof — 2026-10-04

Source/capture head `21d54b7f940f16feff144a758c4408c8a64964d3`, [push run 37177221220](https://github.com/matthewwong525/WongStack/actions/runs/37177221220), attempt 1: all required checks passed. The collector itself queried GitHub, chose this exact-head workflow run, downloaded `verify-memory-areas`, validated its repository/workflow/source/run/attempt, stream sizes/digests and safe paths, rechecked the attempt, and returned `state: collected` with all three captured exit-0 observations. The original local-document/service gaps remain unchanged. No code from the artifact executed locally. CI-discovered preview remains the recorded branch preview.

Three CI repairs preserved the gate and assertions: malformed `then` is represented as JSON protocol data to satisfy the thenable lint rule; receipt scenarios are copied independently from the recipe so invalid-evidence mutations cannot change the oracle. The resulting suite passed. Shared collector behavior tests cover wrong revisions/attempts, qualified scenario mismatch, missing/duplicate records, malformed JSON, digest/size mismatch, traversal/symlinks and interrupted-download cleanup.

## Real paired observations — 2026-10-04

Source/capture head `6a9c0fb642a73743c21377c15b5589d1053df715`; expressly selected merge-base `f0b91f8c76f65de5c883abdb9c707c299f32d1f5`. [Push run 37177883089](https://github.com/matthewwong525/WongStack/actions/runs/37177883089), attempt 1: complete gate SUCCESS. Collector `compare` downloaded and validated the actual paired artifact. Both manifests matched the same repository/workflow/capture-head/run/attempt; each subject matched its distinct source checkout. All three cases were `comparable`, with identical fixture-input/driver digests and Node/platform/architecture/locale. Before and after each exited 0 and had byte-identical retained stdout. Baseline source directory and its Git registration were both removed; both fixture cleanups retained the evidence.

This proves the comparison route and local-lookup preservation, not a memory repair or configured facts. The service/fact limits from the initial pilot remain. Tests reject changed input, method or environment; missing/malformed baseline and same-as-head selection preserve valid head observations while leaving comparison unavailable. The full suite ran once.

## Worked collector reference — 2026-10-04

Head `ab27e29989bbf4074b8949210d1c7cae2f64ae25`, [push run 37178397291](https://github.com/matthewwong525/WongStack/actions/runs/37178397291), complete gate SUCCESS. The documented `check` example ran against the actual project recipe and validated its source files, owning capture guide, existing workflow and all current qualified scenarios. Payload links/config and the existing context ceiling passed. This checkpoint proved the conditional reference before its measured adoption below.

## Independent preparation — 2026-10-04

Head `55ea5fd77f653611194a12466f60916b633a65df`, [push run 37178977750](https://github.com/matthewwong525/WongStack/actions/runs/37178977750): complete gate SUCCESS. Six preparation tests confirmed CI-only allocation without preview lookup/browser installation, preserved default behavior, invalid-flag rejection, missing-preview isolation and no allocation without a saved revision. The default preparation test also protects a corrected success exit status after READY.

## Imported evidence lifecycle — 2026-10-04

Head `bebf74aae91c93771682815d0aba8303796b683c`, [push run 37179485579](https://github.com/matthewwong525/WongStack/actions/runs/37179485579): complete gate SUCCESS. Integration tests imported validated synthetic receipts, removed credential text from streams/manifest/report before a locally captured posting handoff, and preserved independent evidence until owned cleanup on UNKNOWN/TIMEOUT. Partial downloads left no temporary download folder. These tests posted nothing to GitHub; actual pilot provenance remains separate. Instruction ceiling passed with eight bytes remaining before main integration.

## Mixed exercise proof — 2026-10-04

Head `9f43213608e84b63886881d371c5aa7b01f1b759`, [push run 37180228742](https://github.com/matthewwong525/WongStack/actions/runs/37180228742): complete gate SUCCESS. The unchanged legacy exercise and additive mixed exercise/scorer tests passed. Credit requires actual submitted/stored values, producer/rendered consumer values, current raw command output or observed invalid-capture gaps, selected checks and final report rows. A locally captured fake-agent run verifies harness/scorer mechanics only; this checkpoint alone establishes no paid measurement or skill adoption. The subsequent real sessions are recorded below. The walking checkout excludes the answer key and server/producer implementation.

## Initial instruction measurement blocked — 2026-10-04

At this historical attempt, task 4.2 remained pending. The live reference was frozen as `walkthrough-baseline.md`; the full candidate is `walkthrough-candidate.md` (11,143 bytes versus 12,081 baseline). Design §8's keep rule and the exercise/scorer were fixed before these attempts. Both variants used the identical mixed exercise, builder framing and command:

```sh
claude -p --model opus --output-format json --allowedTools "Bash,Read,Write,Edit,Glob,Grep"
```

Two requested runs per variant immediately failed before inference: every raw CLI result had `api_error_status: 429`, `terminal_reason: api_error`, `is_error: true`, and `You've hit your weekly limit · resets 2pm (UTC)`. All reported zero input/output tokens and $0 cost; no model identity, verdicts, journeys, readbacks or final report were produced. Combined elapsed time was under 0.2 minutes. `measurement-blocked/{baseline,candidate}/` retains the four raw error records and harness results. Harness zero-catch counts describe absent output, **not valid behavioral measurements**; these invalid attempts support no comparison or keep-rule conclusion.

No live instructions changed during these invalid attempts. The authorized existing Codex CLI supplied the subsequent measurement below, with the frozen candidate, cases and keep rule unchanged. Raw quota failures remain retained as history, not skill scores.


## Frozen instruction measurement — 2026-10-04

The existing Codex CLI replaced the quota-blocked CLI without changing the reference, practice cases, scorer or design §8 rule. Two valid runs per variant used `--exercise mixed --framing builder`; a third per variant followed differing report/selection scores. Codex v0.159.2 startup traces identify `gpt-6.1-sol`, reasoning effort `none`, in every valid session. The harness's `model: not reported` means its Claude-JSON parser cannot read Codex stdout; it does not override the retained startup identity. Every variant used this identical command:

```sh
codex exec --ephemeral --sandbox danger-full-access --model gpt-6.1-sol --add-dir "$RUN_DIR" --add-dir /root/.agent-browser - 2>"$RUN_DIR/codex-trace.txt"
```

An initial workspace-write attempt reached inference but could not open sockets (`curl: (7) failed to open socket: Operation not permitted`) while the same host URL answered 200. It was stopped before a second run and is retained in `measurement-codex/environment-blocked/` as invalid environment evidence. All six scored sessions used the host's unrestricted sandbox identically, retaining the original owned-file/disposable-data/no-post/no-save/no-cache-deletion prompt boundaries. No dependencies or answer-key access were added.

| Variant/run | Browser catches / false alarms / partial claims | Mixed catches / false passes / valid controls | Fixed report rows / named gaps | Unrelated selections | Minutes | CLI-reported tokens |
|---|---|---|---|---|---|---|
| Baseline 1 | 5/5 / 0 / 3/3 | 3/3 / 0 / 2/2 | 8/9 / 3/4 | 0 | 6.39 | 91,395 |
| Baseline 2 | 5/5 / 0 / 3/3 | 3/3 / 0 / 2/2 | 8/9 / 3/4 | 1 | 7.43 | 89,689 |
| Baseline 3 | 1/5 / 2 / 0/3 | 2/3 / 1 / 2/2 | 0/9 / 0/4 | 0 | 4.44 | 67,264 |
| Candidate 1 | 5/5 / 0 / 3/3 | 3/3 / 0 / 2/2 | 9/9 / 4/4 | 0 | 6.70 | 71,982 |
| Candidate 2 | 5/5 / 0 / 3/3 | 3/3 / 0 / 2/2 | 8/9 / 3/4 | 0 | 4.81 | 62,402 |
| Candidate 3 | 5/5 / 0 / 3/3 | 3/3 / 0 / 2/2 | 0/9 / 0/4 | 0 | 5.05 | 115,413 |

Dollar cost is unavailable: Codex reported token counts but no billing dollars, and its stdout has no `total_cost_usd`/`modelUsage`. The six valid runs took 34.83 minutes in total (baseline 18.26, candidate 16.57) and reported 498,145 tokens (248,348 and 249,797 respectively). These observations establish no dollar-cost saving.

Keep the candidate under the unchanged §8 rule: all three candidate runs judged the current CLI success and exit-zero contradiction correctly, failed alpha after its real fresh readback, passed healthy bravo, and failed the confirmed exports consumer. Actual server observations retain each submitted/stored value and time, rendered exports titles and a fresh notes API read. All three excluded unrelated health, named missing/stale/malformed/incompatible evidence, preserved all five browser catches without false alarms and retained three partial browser claims. Reports identify practice source `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` and the notes API → exports → title contract. No practice capture is claimed as real GitHub evidence.

**Fixed scoring limits remain visible.** The stale rows in baseline 1/2 and candidate 2 correctly reject the different source but omit the scorer's literal `stale|revision` words; those scores are lexical table-row misses, not missed stale judgments. Candidate 3 uses a valid Markdown table without optional outer pipes; the frozen parser cannot read its rows, yielding 0/9 despite correctly associated raw report rows. All candidate `consumerReasoned` flags are false because the rows say API/fresh producer rather than notes; each full report separately names `GET /api/notes` → `/exports` and `title` with source/contract references. No case, parser or scoring rule was changed after results.

Baseline 3 has a different, real report defect: correct observations are assigned to wrong scenario names after a case-order mismatch. Its JSON falsely passes alpha despite retained lost-value readbacks and falsely passes the blank-title API; the comment pairs lookup names with browser observations. Its unparsed outer-pipe-free table is an additional format limit. This is a small-sample report-reliability result, not a broad model-quality or statistical detection claim. Baseline's first two runs already detected every planted defect; the experiment demonstrates no improvement in those catches. Raw stdout, full startup/tool/token traces, selected ledgers, verdicts, comments, observations and screenshots remain in `measurement-codex/{baseline,candidate,baseline-third,candidate-third}/`. Live adoption preserves the 11,143-byte measured walkthrough exactly; its fresh-head delivery gate remains next.

## Candidate surface integration — 2026-10-04

CI-only preparation and collection were exercised against actual saved source `9f43213608e84b63886881d371c5aa7b01f1b759`, independently of a preview: `preflight --no-preview --no-browser` returned READY, exit 0, that exact SHA, empty URL and BROWSER=none. Collector `compare` selected newest [push run 37180228742](https://github.com/matthewwong525/WongStack/actions/runs/37180228742), attempt 1, matched actual subject/head identity, and validated three comparable cases against expressly selected baseline `f0b91f8c76f65de5c883abdb9c707c299f32d1f5`. Both sides exited 0, used the same inputs/method/environment, retained raw output and complete fixture/source cleanup. The retained `measurement-codex/ci-only-9f43213.json` contains the validated result. Local-document output is shown; unconfigured memory does not show service connectivity, configured facts or a real network outage.

The three candidate practice reports supply the mixed blocked-panel, stale-capture and incompatible-baseline observations: the unavailable panel does not erase independent current CLI evidence; stale/malformed captures cannot pass; differing baseline input blocks comparison while valid head output remains. Each report retains alpha's initiating Saved response plus lost-value readback, healthy bravo's matching readback, the confirmed cross-capability consumer and explicit remaining gaps. These practice checks establish the candidate's routing/judgment behavior; only the actual CLI artifact above establishes real current-source memory behavior. Nothing in this evidence proves a full setup, assistant conversation or configured memory-service connection.


## Working-tree adoption — 2026-10-04

Adopted the measured walkthrough byte-for-byte after applying the fixed keep rule and inspecting all three candidate reports. The skill now selects read-only recipes/confirmed consumers, prepares surfaces independently, checks fresh lasting effects and requires renewed evidence after a head change. It retains plain checks, screenshots, linked headings, five verdicts, staging safeguards, scope and the two-attempt bound. The CI reference labels its example as source-repo-only and names the minimal required recipe fields. Concise skill wording offsets reference/main-integration costs without changing the frozen walkthrough or increasing the context ceiling. Task 5.1 remains unticked until `/save` proves the changed head and required checks.


Static adoption checks passed: payload paths/heading anchors/symlink links, OpenSpec configuration, and the unchanged context ceiling. Instructions measure 189,279 bytes against 190,845 (1,566 free before main integration; the previously observed 959-byte main addition would leave 607). The collector is explicitly authorized as a bundled helper; only new probe runtimes ask first. Fresh-head CI is still the task 5.1 gate.

## Measured adoption gate — 2026-10-04

Saved head `e1769eb92ef8883ce2ae1970d31504b83eef3403` integrates main `932439bf1109066faaf2aec85cf653db3941ff4b`. [Push run 37183208097](https://github.com/matthewwong525/WongStack/actions/runs/37183208097) and all required app checks passed. The script suite reports 92.10% lines and 89.06% branches with existing floors unchanged; links/config/retired names and canonical specs passed. Combined instructions are 190,238/190,845 bytes, startup 2,190/2,200 words. The measured walkthrough is unchanged; concise surrounding instructions preserve the ceiling. CI discovered the recorded preview through deployment 6837773829. Measurement caches were excluded, while 207 raw trace/response/log files match staged bytes exactly under scoped binary attributes. Actual earlier observations remain historical, not evidence for this new head. Task 5.1 is complete; practical regression and final-head verification remain pending. Session facts remain skipped because no current session is registered.

## Repair-decision simulations — 2026-10-04

Applied the new repair rule to both labelled inputs in `scripts/fixtures/verify-receipts/preflight-regression.md`. These are manual decision simulations, not product, delivery or red/green observations.

- Impractical harness: given the stipulated failure in this change's own expectation and touched handler, a bounded repair is in scope after independent checks and safe cleanup. Retain the available initiating-request reproduction, require ordinary head checks, and name missing failing-before and delivery readback. Add no receiver/framework and weaken no gate; an initiating success alone proves no delivery. No request or delivery was attempted by this simulation.
- Out of scope: the consumer's failed expectation belongs to another capability and its handler is untouched. Report the failed observation and scope reason, preserve shared data, finish independent checks, and make no consumer fix or regression-test change. Checking that consumer supplies no repair authorization. No consumer mutation occurred.

The exact-source preflight artifact remains required separately before task 5.2 can be ticked.

## Retained regression proof — 2026-10-04

Saved head `27db0ffcf33c2af286e5f35bdf451df290264d02`, [push run 37184030139](https://github.com/matthewwong525/WongStack/actions/runs/37184030139), attempt 1: complete required gate SUCCESS. Actual GitHub repository/workflow/head/event/ref/attempt match the downloaded `verify-preflight-regression` manifest. Same focused check and argv on earlier `ab27e29989bbf4074b8949210d1c7cae2f64ae25` and saved head; check SHA-256 `e7a1f5ff98e7a57988ab6681681f399ff250c0f09a8dcef5846ce04e37fd2dcc`. Before: READY, shell exit 1, `ERR_ASSERTION`, `1 !== 0`, test pass 0/fail 1. After: READY, shell exit 0, test pass 1/fail 0. Both source digests match their Git blobs; every stream size/digest validates. Source directory/registration removed, output retained in `regression-proof-27db0ff/`. The disposable fixture Git head is separate from both observed source revisions. This is real exact-source practice evidence with mocked preview/browser inputs, not a live-preview claim. The full repaired-head suite remains required; no red checkpoint or product defect was introduced.

Producer tests use disposable Git history and provenance-labelled immutable old bytes, so squash merging does not strand future checkouts. An unavailable earlier Git source is a named diagnostic gap while the repaired-head check still must pass; tests confirm missing baseline cannot hide a failing head. The current run supplied actual ab27 proof, so no missing-baseline fallback was used here. Task 5.2 is complete, including the separately labelled decision simulations above.

## Walkthrough wiki update — 2026-10-04

The walkthrough wiki now explains pilot-first capture adoption, the small project-owned recipe, exact-source/newest-attempt evidence, independent preparation, comparable revisions, confirmed consumers, fresh lasting-effect readbacks and practical retained regression checks. Capture commands remain in the CI reference; project-specific details remain in the pilot's guide. Existing wiki headings are preserved, and obsolete preview-only and no-retained-coverage claims are removed.

Local payload path/anchor/symlink checks and the wiki graph/3,000-word check pass. The unchanged context check passes at 190,661/190,845 instruction bytes, 25,962/27,084 words, and 2,190/2,200 startup words. These are static checks, not fresh CI behavior evidence. Task 5.3 remains unticked until the parent runs `/save` and proves the final saved links/checks.

## Release packaging — 2026-10-04

The payload list copies the existing verify skill directory, including collector/reference and the existing shared memory CLI library. It excludes both meta capture producers, their fixtures/tests/evaluator, `.github/workflows/payload.yml` and the project-owned recipe. There is one Next minor entry; VERSION matches main and the installed test workflow is unchanged. The updating note identifies GitHub Actions as the supported capture host. Task 6.1 packaging is checked; the final gate and exact-head verification remain pending.


## Final saved gate and verification — 2026-10-04

Saved implementation `9f87a05ca1d87f9af1d9a2255b3dd4b515acbd41`, [push run 37184710803](https://github.com/matthewwong525/WongStack/actions/runs/37184710803), attempt 1: complete required gate SUCCESS. Wiki/shipped paths and anchors, strict OpenSpec, payload links/config/retired names and the unchanged context ceiling pass. Instructions: 190,661/190,845 bytes, 25,962/27,084 words; startup: 2,190/2,200 words. VERSION and installed-repo workflow match main; meta producers/fixtures/evaluator/recipe remain excluded from the payload. No checks were loosened. Tasks 5.3 and 6.2 are complete.

Fresh CI-only preparation returned READY/exit 0, no URL and BROWSER=none. The collector selected the newest exact-head push attempt, validated repository/workflow/source/run/attempt and all streams, then compared selected merge-base `932439bf1109066faaf2aec85cf653db3941ff4b` against saved head. All three memory lookups have comparable inputs/method/environment, both exit 0 and byte-identical stdout. Both fixture digests and cleanup observations agree. This proves the same local lookup behavior and unconfigured-store fallback; actual configured facts/service connectivity and network outage remain unproved.

The independent final-head regression artifact retains the same focused check SHA-256 `e7a1f5ff98e7a57988ab6681681f399ff250c0f09a8dcef5846ce04e37fd2dcc`. Earlier actual source `ab27e29989bbf4074b8949210d1c7cae2f64ae25`: READY, shell exit 1, intended assertion `1 !== 0`, test pass 0/fail 1. Saved repaired source 9f87a05: READY, shell exit 0, test pass 1/fail 0. Same argv/fixture, real source digests match Git blobs, every stream size/digest matches; source directory/registration were removed. Mocked browser/preview inputs are labelled exact-source practice evidence. The repaired-head suite still passes.

Default preparation independently discovered the current CI preview and returned READY/exit 0 with installed Chrome/agent-browser 0.38.1. Ordinary preview checks needed no recipe: `/nothing-here` lands on “Page not found” with “Go home”; actual `/api/health` returns 200 and `{"ok":true}`, `/api/nothing` returns 404 and `{"error":"Not found"}`. Screenshot was inspected before grading. Two response-cookie captures were scrubbed. No repair, browser install, Access heal or credential mint was needed during this final walk.

The current saved walkthrough, including its practical-repair paragraph, also completed one final mixed practice smoke run under the existing by-hand measurement exception. Pinned Codex 0.159.2 / gpt-6.1-sol, same builder framing/inputs/frozen scorer: all five original and three mixed defects caught, zero false alarms/false passes; both healthy mixed controls passed. Alpha submitted `Practice alpha saved` at 07:08:19.701 UTC, but independent GET at 07:08:20.971 returned `Original alpha`; bravo submitted `Practice bravo saved` at 07:08:25.533 and GET at 07:08:26.806 retained the exact value. The confirmed consumer `/exports` calls `GET /api/notes`, reads its title contract, and renders six undefined rows despite fresh API title values; unrelated `/status` was excluded. Stale/malformed captures and incompatible baseline stay unverified; the 503 panel does not erase independent valid CLI evidence.

The frozen parser reports 0/9 mixed report rows and zero named gaps because the valid Markdown table lacks optional outer pipes; the lexical consumer-reason flag is also false. Human inspection confirms all nine correctly associated rows, the four named gaps and an explicit caller/data-contract reason. The raw score is retained unchanged. This one-run smoke result is separate from the frozen before/after study and makes no statistical, broad-quality or dollar-cost improvement claim. Time: 4.745 minutes; native trace: 64,775 tokens; dollar cost unavailable. Overall FAILURE in the practice report correctly describes planted defects, not failures in this change’s implementation. No production data was written; the disposable practice site stopped after the exercise.

Raw results, observations, ledger, initiating requests, readbacks, screenshots, native trace, CI comparison and same-check regression streams are retained in `measurement-codex/final-integration/`. [One combined report](https://github.com/matthewwong525/WongStack/pull/261#issuecomment-5977635251) records saved identity, verbatim expectations, observations and limits; its screenshot is stored privately behind the production site’s login. Handled credentials were silently excluded from all retained final files and the posted comment. Owned walkthrough folders were cleaned after retaining evidence.

Task 6.3 is complete: ordinary preview, CI-only capture, actual confirmed practice consumer, contradictory durable readback and exact-source practical regression proof are recorded together. Full setup and assistant conversations remain follow-up surfaces; the unconfigured pilot does not prove service access/facts/outage. No blocked real-preview check remains. All tasks are complete; only completion/evidence/review metadata remains in the working tree for the publishing checkpoint. It changes no verified implementation and is not presented as a new saved revision. The person has not authorized publication yet.


## Compact evidence packaging — 2026-10-04

Responding to the concern about review size, bundled all raw measurement/CI proof files into one compressed archive and retained the concise result record plus one readable integration report. Each original file’s SHA-256 matches the corresponding archived bytes. This changes evidence packaging only: no tests, implementation, frozen inputs, scores or recorded observations changed. The archive is meta-only; routine `/verify` does not reproduce this development experiment or create a broad new test suite. Practical regression coverage remains focused on a discovered in-scope defect that the existing harness can reproduce cheaply. The archive hash and extraction instructions are retained beside it. Publication is still pending.
