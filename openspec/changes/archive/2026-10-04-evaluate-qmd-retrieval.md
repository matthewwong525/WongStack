<!-- openspec-archive v1 2026-10-04-evaluate-qmd-retrieval -->
<!-- file proposal.md utf8 10791 -->
# Retrieve useful memory from the wiki and past work

**Status:** ready-to-ship
**Branch:** `rampant-insect`
**Open questions:** none

## Why

Useful knowledge lives in remembered facts, the wiki, and past plans, but the assistant has to search those places separately and can miss an explanation written in different words. Give it one recall tool that finds relevant evidence and shows where it came from.

## What Changes

- **Find remembered facts and relevant documents together.** The assistant can ask a question once and receive useful facts alongside passages from current guidance, with links to their originals. Meaning-based search helps when the question uses different wording.
  ```text
             question
                │
       ┌────────┴────────┐
       ▼                 ▼
  remembered facts   wiki and requirements
       └────────┬────────┘
                ▼
      useful evidence + sources
  ```
- **Make past decisions easy to find without confusing them with current guidance.** Search current guidance by default. Ask explicitly for history or work in progress; every passage shows which kind of source it is.
  ```text
       how does it work? ──▶ current guidance
       why this choice? ──▶ past decisions
       what is planned? ──▶ proposed work
  ```
- **Keep retrieval ready as the project changes.** Provide setup and refresh commands, maintain a separate index for each checkout, and check passages against their current files. When meaning-based search cannot run, return a clearly labelled keyword result.
  ```text
      files change ──▶ refresh the index
                            │
                            ▼
                    verify original files
                            │
                            ▼
                    return current passages
  ```
- **Put the feature into everyday work and verify it.** Teach the assistant to use recall before substantial work. Test useful answers, changed files, older decisions, and privacy; measure speed and context size using the actual implementation.
  ```text
      start a task ──▶ recall ──▶ read sources
                         │
                         ▼
                tested before publishing
  ```

**Non-goals:** Generated summaries or beliefs, OptMem summary trees, putting private facts or transcripts into a document index, a new app screen, or moving memory to another service.

## Capabilities

### New Capabilities

- `document-retrieval`: checkout-scoped QMD retrieval over wiki and OpenSpec, verified source passages, source-role scoping, index lifecycle, setup, and fallback.

### Modified Capabilities

- `memory`: one bounded recall packet combining permitted current facts and local document evidence, plus discoverable read operations.

## Impact

Ship modules under `.agents/skills/memory/scripts/lib/documents/`, extend the memory CLI and installed operation adapter, and update memory/explore guidance and the digest's task-search instruction. Add the owning document-retrieval wiki page and link it from the memory convention. QMD is a pinned host dependency managed outside the checkout; core fact commands remain dependency-free. Add focused tests, a small real acceptance runner and a dedicated remote workflow. Release as `Next (minor)`; verify payload installation coverage and leave version numbering to publication. No Worker, database, ownership, credential, or company HTTP endpoint changes are needed.

## Decision log

- **2026-10-04** — Asked whether to plan the QMD evaluation, keep exploring, or stop → chose `/plan`.
- **2026-10-04** — Asked what to do with the first plan → chose Review the plan, keeping implementation paused.
- **2026-10-04** — Asked through the user's correction to plan implementation rather than only comparison → chose an implementation plan; validation is part of delivering the feature.
- **2026-10-04** — Assumed: replace the previous proposal, design and tasks in the same change, because they are unimplemented and the user is revising their scope.
- **2026-10-04** — Assumed: use one recall entry point for facts and documents, because the goal is better memory retrieval across the wiki and OpenSpec.
- **2026-10-04** — Assumed: search current guidance by default and expose explicit historical/proposed scopes, because an old plan can be relevant without describing what works now.
- **2026-10-04** — Assumed: use code for source selection, indexing, validation, packet budgets and fallback, because those are repeatable processes; QMD supplies semantic ranking.
- **2026-10-04** — Assumed: manage QMD and model downloads on the agent host outside the repo, because its native/model dependencies do not belong in app packages or the private fact store.
- **2026-10-04** — Assumed: setup is an explicit host operation and ordinary lookup never installs dependencies, because installation and model downloads are substantial work; once prepared, lookup maintains its own derived index.
- **2026-10-04** — Assumed: keep private facts behind their existing client and never pass them to QMD, because their visibility is enforced by the store.
- **2026-10-04** — Assumed: use Linux for live semantic acceptance and verify portable fallback on Windows, because semantic support depends on QMD/native capability.
- **2026-10-04** — Assumed: reuse existing lookup helpers without changing their contracts; reconcile shared memory and release files at implementation/save if the separately open ownership work has changed them.
- **2026-10-04** — Asked through the user's `/apply` instruction to build assuming PR #259 will merge → chose implementation on that incoming foundation. PR #259 was still open at inspected head `9abfe989a19ac8403a06842b473c446da97850f8`; preserve its shared checks and hosted-delivery contracts, and reconcile with its actual merged default-branch version before final validation. This instruction does not authorize merging PR #259.
- **2026-10-04** — Observed: PR #259 merged as `c22d448bfd8204994ba92f65b5f722762ce6f052`; implementation now uses that actual merged foundation, preserving its shared checks and hosted delivery.

- **2026-10-04** — Check: retired-name checks allow seven original retired terms only in the frozen copy of the 2026-09-25 memory proposal. Its source hash is recorded in the acceptance fixture; all live source checks remain, so historical retrieval can be tested without rewriting the record.

- **2026-10-04** — Save checkpoint: implementation and focused checks are authored on merged `c22d448`; required remote checks and real CPU semantic acceptance are pending. Preserve unchecked verification tasks until actual runs pass. Session facts skipped because the diff and this handoff already retain the session-specific decisions.

- **2026-10-04** — Check: `.github/workflows/qmd-retrieval.yml` limits the new native/model acceptance job to retrieval-related paths and 30 minutes, with same-repository pull-request duplicates skipped. This keeps model downloads out of unrelated work and avoids duplicate runs; existing test/payload gates stay required, and relevant pushes plus manual runs execute semantic and Windows acceptance.

- **2026-10-04** — First remote run: Windows portable retrieval and the 101 app tests passed; payload lint and the new workflow explanation needed fixes. Native QMD/model setup reached original verification, exposing its managed `?index=wongstack` URI suffix. Corrected that adapter mapping with strict index/manifest checks, preserved control-character validation, and rerun the gates rather than claim semantic acceptance.

- **2026-10-04** — Second remote run: actual QMD CPU setup completed in 75.5 seconds and recovered the persistence paraphrase missed by keyword; source verification, private-source exclusion, changed-file refresh and independent fact failure passed. Critical exact, historical and proposed evidence failed because anchors chose another section or large current passages consumed the packet. Reserve useful passages across source roles and select relevant original sections within located documents; retain the frozen acceptance questions and grading. Fix the duplicate-source test fixture and add the new capability to memory's owning-document map. App and Windows gates passed; payload had 1,186 passing tests and two failures before these fixes, so verification remains pending.

- **2026-10-04** — Third remote run: all 1,191 script tests, release/context checks, app checks and Windows fallback passed. QMD preserved critical publishing, historical and proposed evidence and still recovered the persistence paraphrase. Its only remaining acceptance regression was exact machine-privacy wording: the located file's short general sections ranked above the section containing the literal phrase. Prioritize an exact original phrase within that located document and center long excerpts on its matching line; do not weaken source or grading checks. This is the final automatic repair attempt for this save run.

- **2026-10-04** — Final automatic repair passed: tested implementation `994aa61` has all 1,193 script tests, release/context/app/deployment checks and real QMD CPU plus Windows portable acceptance green. Tasks through 6.2 are checked against those actual results, retained in `evidence.md` and `acceptance.json`. Installed discovery and original-source recall were observed on that same revision; `installed-recall.json` retains only public citations and aggregate fact counts. Finish task 6.3's fresh helper review, then checkpoint the completed handoff without merging. Session facts remain skipped because the handoff retains these decisions.

- **2026-10-04** — Fresh helper completed task 6.3: installed discovery and recall returned six permitted facts and four independently verified original excerpts in 6,071 bytes, with model-free startup/pre-edit dispatch confirmed. All 18 tasks are complete; status is ready-to-ship. Final gate checkpoint retains the reviewed evidence and completed handoff, with no implementation change after tested `994aa61`. Publication remains the user’s next decision.

- **2026-10-04** — Ship archive checkpoint: all 18 tasks are complete, the archive preserves the actual semantic and installed-source evidence, and release 30.5.0 is numbered from merged main 30.4.0. Main requirements already matched the deltas, so archive used the verified skip-specs route. The user invoked `/ship`, authorizing checkpoint, preview verification and merge after the required gate. Session facts skipped because the archived handoff already retains this session's decisions.

<!-- end proposal.md -->
<!-- file design.md utf8 12932 -->
# Design

## Context

See [proposal.md](proposal.md) for the intended outcome. Existing fact search is FTS5 with tags and enforced ownership. `areas` finds owning docs and related archives through explicit mappings and paths. The missing behavior is a shipped entry point that retrieves both session evidence and relevant original Markdown.

Research inspected [QMD](https://github.com/tobi/qmd) at revision `26b703c5daa8037df089a8104cbf7eeab4e51874`, reporting package 2.8.3 and Node >=22. Verify that pinned CLI contract during implementation. QMD supplies collection-scoped lexical/vector search, structured hybrid queries and optional reranking. Semantic ranking needs local models; no live acceptance has run yet.

## Goals / Non-Goals

**Goals:** Deliver document search and combined recall, keep evidence fresh and bounded, make it discoverable to agents, and verify the installed payload.

**Non-Goals:** Follow the proposal. No new HTTP endpoint, generated summaries, private-memory export or whole-repo indexing.

## Decisions

### 1. Extend the existing interface

Implement Node modules under `.agents/skills/memory/scripts/lib/documents/` for corpus, index lifecycle, QMD adapter, fallback and packet rendering. Add these commands to the memory CLI:

| Command | Behavior |
| --- | --- |
| `recall <question>` | Permitted live facts plus document passages |
| `documents <question>` | Document passages only |
| `documents-setup` | Install pinned host dependency, prepare models and index |
| `documents-refresh` | Reconcile files and refresh enabled embeddings |
| `documents-status` | Readiness, index age, version and refresh state |

Reads accept `--scope current|history|active|all`, `--mode auto|keyword|semantic|deep`, `--change <slug>`, `--limit` (1–5 documents), and `--json`. Reject invalid scopes, slugs and queries (maximum 4,000 characters) before launching subprocesses. Fact filters on recall are a documented subset of existing filters (tag/type/slug/date), separately recorded from document scope; exclude superseded facts and automatic admin-wide expansion.

Use existing `readFacts` and original fact metadata, avoiding a second search/brief rendering of the same facts. Document-only commands route before opening the remote store. Return per-source `ok|empty|partial|unavailable|denied` states; failed fact authorization cannot suppress local documents or reveal hidden facts. Partial overall recall exits 0 with explicit state; invalid input exits 2 and no usable backend exits 1.

Keep direct fact reads and pre-edit loading intact. Change the digest's task-search instruction to recall, while digest generation remains free of QMD/model calls. A new hosted service would add hosting and authorization work to a local-file problem.

### 2. Index a defined corpus with explicit source roles

Use four disjoint collections:

| Collection | Included paths | Meaning |
| --- | --- | --- |
| wiki | `wiki/**/*.md`, excluding `wiki/people/**` | Reusable guidance |
| specs | `openspec/specs/**/*.md` | Recorded requirements |
| active | Active changes' proposal/design/tasks/delta specs | Proposed work |
| archive | Archived changes' proposal/design/tasks/delta specs | Historical evidence |

Include eligible unsaved/new Markdown within these paths so work in progress is discoverable; respect ignore rules and reject symlinks/external real paths. Exclude review pages, logs, evidence dumps, agent instructions, code, credentials, caches, transcripts and private store data. Scope derives from paths, not document claims or ranking scores.

`current` searches wiki/specs; `history` adds archive; `active` adds proposed changes; `all` includes all four. `--change` narrows change documents independently of fact filters. Query requested collections independently with bounded candidates so the archive cannot consume a global candidate pool. Deduplicate path/range hits and interleave current wiki/spec evidence before proposed/history results in mixed scopes. Configure fixed collection context descriptions.

Retrieval points the agent to evidence; it still reads owning docs and checks historical claims against current guidance/code. Keep the existing wiki hub and one-owner convention.

### 3. Manage freshness outside version control

Resolve managed state through the existing OS-user state convention, keyed by repository identity plus real current-worktree path. Fact credentials still use the primary checkout; dependency/model caches may be shared across that OS user, but manifests, indexes and refresh locks are worktree-specific.

Maintain a manifest of relative paths, content hashes, source roles, generation and embedding readiness. On lookup, scan the allowlisted corpus for added/deleted/moved or changed files. Index copied snapshots in a managed corpus directory. Publish complete generations atomically; serialize refresh with bounded waiting and recover abandoned-run state.

If the corpus changed, return fresh lexical evidence for changed/new files and verify unchanged indexed candidates. Mark semantic coverage partial and start one detached refresh using prepared dependencies; reads never install packages or download models. Refresh only changed content/vectors, remove moved/deleted sources and retain the last valid generation on failure. Cap background refresh at five minutes and use backoff or explicit refresh after failure. Avoid repeated work for unchanged content.

Map each candidate through the manifest to an allowlisted original file, re-read it and compare hashes before returning text. Withhold stale or vanished candidates. Include role, relative path, heading, line range, source hash and freshness. Stale semantic ranking cannot imply complete recall. Keep credentials and private facts out of the manifest, snapshots and QMD subprocess environment.

### 4. Provide explicit host setup and fallback

Ship a values-free runtime descriptor pinning `@tobilu/qmd@2.8.3`, integrity and model identities, with reproducible installation metadata. `documents-setup` uses npm to install into a private prefix outside the checkout, verifies native/runtime capability, prepares the embedding model/index and checks a real query. Record readiness only after success. Document setup downloads, CPU/GPU behavior and disk use; do not change app packages or globally replace tools.

Ordinary core commands remain Node-only. Linux is the first live semantic acceptance target; unsupported platforms/native capabilities expose clear readiness and portable lexical fallback. Existing installs get working fallback immediately and can prepare semantics through the explicit command. The implementation acceptance environment must prepare QMD and prove semantic retrieval before publication.

Default `auto` uses structured lexical+vector queries without autonomous query expansion or reranking when embeddings are ready. Keyword mode uses no models; `semantic` is vector-only; `deep` explicitly opts into reranking, with its model prepared by setup's deep option. Verify pinned-version support. Construct typed query fields as argument data and reject field injection or shell evaluation. Run only the managed executable/config; never adopt arbitrary global/project QMD config, update hooks or external collection paths.

Missing, unhealthy, stale, malformed or timed-out QMD falls back to an in-process Node lexical matcher over the same corpus, with the same scopes and source checks. Report `backend: lexical-fallback` and the reason. An explicitly requested semantic/deep mode that falls back retains a visible unavailable-mode state. A successful no-match query is not a failure.

QMD processes receive an allowlist of runtime/cache environment variables, without memory or provider secrets. Installation is an explicit operation; local refresh only maintains derived data.

### 5. Produce one bounded original-evidence packet

Recall returns at most eight whole fact entries and five document excerpts within a shared 6,144-byte UTF-8 packet, including metadata/status/footer. Reserve roughly half for each source when both have evidence; reclaim unused space. Document-only reads use the whole budget. State omissions of selected entries without claiming to count every possible match.

Use heading/line boundaries, retain useful qualifications and mark excerpt truncation. No generated conclusions or transcript reads. JSON v1 preserves source status, filters/scope, backend/mode, omissions and evidence metadata under the same byte budget. Agents can read cited originals when excerpts are insufficient.

Enforce a 20-second total recall deadline with time reserved for source verification/fallback. Bound fact reads within that deadline and cancel slow semantic work. Hooks never wait for retrieval models.

### 6. Make the feature part of agent workflows

Describe `memory.documents` and `memory.recall` as installed-client reads in `operations.mjs`, with validated inputs, bounded output schemas, effects, revision and truthful authentication: local checkout for documents, existing memory credential only for facts. Declare local cache effects/readiness. The company helper already imports that registry; no HTTP endpoint is added. Setup/refresh remain explicit local commands, not employee business actions.

Adapt the operation dispatcher so document reads do not require a memory credential and recall cannot widen fact permissions. Keep its existing 30-second timeout above the recall deadline, and return the structured packet without another independent truncation.

Replace relevant retrieval guidance in `memory/SKILL.md`, `explore/SKILL.md`, `AGENTS.md`'s generic block and the digest instruction with task-directed recall. Keep path-area lookup for warnings. Do not add automatic searches to every message or model calls to hooks. Put the repeatable runbook in `wiki/development/document-retrieval.md`, linked from the memory convention/development hub; clarify optional npm/QMD setup in required-tools guidance. Preserve instruction budgets by replacing and compressing relevant text.

### 7. Verify actual shipped behavior

Focused tests cover eligibility and unsaved docs, scope/role labels, worktree isolation, incremental and concurrent refresh, stale/moved/deleted sources, output bounds, source failures, safe arguments and credential isolation. Existing fact and permission regressions remain required.

Create a small source-reviewed acceptance set covering exact wording, paraphrases, historical rationale, obsolete/current conflicts and absent answers. Run the shipped commands, using the existing synthetic fact store rather than production credentials for combined recall. Compare keyword and auto on the same corpus; record deep mode costs separately if enabled. Measure setup/indexing, one-file refresh, cold/warm timing, per-case evidence and packet bytes. Mocks establish protocol behavior only.

Add a dedicated path-triggered remote `qmd-retrieval.yml` workflow with pinned actions, read-only permissions, isolated CPU setup, bounded execution and safe report artifacts; normal payload tests need no models. Use `/save` for remote checks and acceptance.

Done means working commands and agent discovery/guidance, a real semantic paraphrase hit missed by keyword lookup, preserved critical exact/current evidence, correct historical scope, no hidden/private source exposure, successful post-edit refresh, usable fallback and bounded packets. Fix implementation failures; comparison is validation rather than a decision whether to implement later.

## Risks / Trade-offs

- Native/model support and cold CPU latency vary → explicit setup, capability status, deadlines and portable fallback.
- Old records may sound authoritative → current-only default, explicit history and source-role labels.
- Refresh can lag or crash → atomic generations, source validation and fresh fallback with partial status.
- Dependency/model changes may alter ranking → pinned installation metadata and reviewed updates.
- Extra retrieval can fill context → a shared budget, original excerpts and no duplicate reads.

## Migration Plan

Release as a minor payload addition. Verify all modules/descriptor within the memory skill ship through its existing folder inventory; add manifest entries for new wiki pages and any runtime metadata outside that folder. Update the manifest description, changelog and context checks; leave `VERSION` to `/ship`.

Normal sync delivers the commands and guidance. Without prepared QMD, lookup returns keyword fallback with setup guidance. Preparing the host enables meaning-based retrieval. Rollback stops derived refresh workers and restores previous commands/guidance; it does not change the fact store.

The offline page is [review.html](review.html). No new screen needs a UX section.

## Open Questions

None blocking implementation. Host-specific performance is measured and documented during delivery.

<!-- end design.md -->
<!-- file tasks.md utf8 5652 -->
# Tasks

## 1. Document corpus and index lifecycle

- [x] 1.1 Implement the allowlisted corpus/manifest modules under `.agents/skills/memory/scripts/lib/documents/`; add tests for collection roles, current/history/active/all scope, eligible unsaved files, ignored paths, people-page exclusion and symlink/path escapes, with the inclusion rules documented in the owning retrieval page.
- [x] 1.2 Implement worktree-specific state, atomic index generations, serialized incremental refresh and bounded abandoned-run recovery; add tests proving isolation across linked worktrees, changed-only processing, moved/deleted-source removal and valid-state retention after interrupted or concurrent refresh.
- [x] 1.3 Implement fresh source/range/hash validation and live lexical fallback during stale/partial indexing; verify tests with sources edited between candidate retrieval and rendering, and document the difference between verified passages and complete semantic coverage.

## 2. QMD host runtime and search

- [x] 2.1 Add the pinned QMD runtime/model descriptor and reproducible install metadata, plus explicit setup/status commands using a managed host prefix; verify failure-path tests never mark partial setup ready and include real installation/readiness checks in task 6.2.
- [x] 2.2 Implement managed QMD keyword, structured auto hybrid, semantic and opt-in deep adapters with strict argument validation, isolated config/environment and request deadlines; add tests for malformed responses, query injection, absent/native-unsupported runtimes, subprocess cancellation and no secret forwarding.
- [x] 2.3 Implement dependency-free Node keyword fallback and refresh/status dispatch; test that ordinary reads never install/download, requested semantic failure is labelled, successful empty search stays distinct, and portable fallback operates on Windows through remote checks.
- [x] 2.4 Document the exact setup, status, refresh, semantic/deep model preparation and rollback commands in `wiki/development/document-retrieval.md`; verify the remote acceptance job executes the same documented setup and query interface.

## 3. Combined recall and installed operations

- [x] 3.1 Add `documents` and `recall` CLI dispatch using existing permitted fact selection, independent source status and current-only default; add tests for missing/denied/offline fact memory alongside usable documents, and ensure document-only commands do not open the store.
- [x] 3.2 Implement text/JSON v1 evidence packets and the shared 6,144-byte budget, source balancing, whole fact bodies, excerpt boundaries, omissions and twenty-second deadline; test multibyte data, uneven source sizes, partial failures, cancellation and verified source references.
- [x] 3.3 Add `memory.documents` and `memory.recall` operation contracts and route their structured results through the existing installed adapter/helper; test local-read discovery without credentials/company login, member privacy, rejected unsupported input and truthful readiness/authentication labels.

## 4. Agent guidance and payload delivery

- [x] 4.1 Update memory/explore skills, the generic `AGENTS.md` context guidance and digest's task-search instruction to use recall before substantial work while retaining path-area lookup; verify fixture assertions that hooks remain model-free and a representative agent task calls recall then reads a cited source.
- [x] 4.2 Link the new retrieval page from the memory convention and development hub, explain explicit optional npm/QMD setup in required-tools guidance, and update payload manifest coverage/descriptions for the new files; verify installation into a temporary target includes every required module and document without caches/models.
- [x] 4.3 Add `Next (minor)` with plain setup instructions, leave `VERSION` unchanged, and keep skill instruction budgets within the recorded limit; include payload-link, OpenSpec-config and context-budget checks in task 6.1.

## 5. Feature acceptance tooling

- [x] 5.1 Add a small frozen source-reviewed acceptance fixture and runner using the shipped CLI for exact wording, paraphrases, history, obsolete/current conflicts, absent answers and changed-source refresh; add grading tests with planted success/failure evidence and keep synthetic fact fixtures separate from real QMD results.
- [x] 5.2 Add the dedicated path-triggered remote `qmd-retrieval.yml` workflow with pinned setup/actions, bounded CPU execution and safe report artifacts, plus Windows portable-fallback coverage; verify the ordinary suite has no QMD/model-download dependency and document cold/warm timing and packet-byte measurements.

## 6. Complete feature verification

- [x] 6.1 Run `/save` to complete the required remote checks, existing memory permission/search regressions, focused runtime/recall tests, payload installation/link checks and context checks; retain the exact tested revision/run links and repair failures without weakening existing checks.
- [x] 6.2 Through `/save`, complete real host setup and indexed semantic acceptance: a paraphrase hit missed by keyword lookup, preserved critical exact/current evidence, correctly labelled history, changed-file refresh, scoped original passages, deadline behavior and usable fallback; retain the actual report and leave this task pending if semantic execution is unavailable.
- [x] 6.3 Demonstrate installed operation discovery and one representative agent workflow using recall followed by reading the original source; verify startup and first-edit hooks launch no document models, and store the observed evidence with timing/resource limitations in this change's `evidence.md`.

<!-- end tasks.md -->
<!-- file specs/document-retrieval/spec.md utf8 5212 -->
# Document retrieval

## Purpose

Let assistants find relevant original passages in the current checkout's wiki and OpenSpec records, with meaning-based search, clear source roles, fresh evidence and a usable fallback.

## ADDED Requirements

### Requirement: Document search finds local knowledge by words or meaning

The installed retrieval interface SHALL search eligible wiki and OpenSpec Markdown by keywords and, on a prepared supported host, by meaning using QMD. It SHALL return original passages with paths, headings or line ranges, source roles and freshness information, and SHALL support text and structured formats without generated summaries.

#### Scenario: A question uses different words

- **WHEN** a prepared host receives a question whose meaning matches a document without sharing its exact wording
- **THEN** semantic search can return the relevant original passage with a reference the assistant can open

#### Scenario: A keyword search is requested

- **WHEN** the assistant explicitly chooses keyword lookup
- **THEN** it receives original matching evidence without launching semantic models

### Requirement: Current guidance and historical evidence have distinct scopes

Document retrieval SHALL search reusable guidance and current recorded requirements by default. Proposed work and archived changes SHALL require explicit scope and SHALL always be identified as proposed or historical. A search score SHALL NOT establish source authority or change its role.

#### Scenario: An obsolete proposal resembles current guidance

- **WHEN** a current-only question matches an obsolete archived proposal
- **THEN** that proposal is excluded from the current-only result

#### Scenario: The user asks why a choice was made

- **WHEN** historical scope is requested
- **THEN** relevant archived evidence is eligible and identified as historical alongside any current guidance

### Requirement: Indexing stays within the current checkout

The index SHALL derive from allowlisted wiki and OpenSpec paths in the current checkout, including eligible unsaved documents. It SHALL respect ignored paths, reject links escaping the checkout, and exclude private store data, transcripts, credentials and people pages. Separate worktrees SHALL retain separate indexes outside version control.

#### Scenario: A new plan is not yet saved

- **WHEN** an eligible new active-change document exists and active scope is requested
- **THEN** lookup can find it as proposed evidence

#### Scenario: Linked worktrees contain different plans

- **WHEN** two linked worktrees contain different documents
- **THEN** each lookup returns only its own checkout's evidence without combining indexes

### Requirement: Returned passages agree with original files

Retrieval SHALL verify source existence and content before returning indexed passages. Changed, moved or deleted evidence SHALL NOT appear as current unchanged text. Document changes SHALL trigger index reconciliation; concurrent or interrupted refresh SHALL preserve a valid generation. Incomplete semantic coverage SHALL be visible and SHALL allow fresh keyword evidence.

#### Scenario: A source changes before retrieval

- **WHEN** an indexed document changes or disappears
- **THEN** its old passage is withheld, fresh eligible evidence may be returned, and incomplete index coverage is reported until refresh completes

#### Scenario: Refresh is interrupted

- **WHEN** refresh fails before publishing a complete generation
- **THEN** lookup retains its valid state, checks sources and supplies fallback rather than exposing partial index state as complete

### Requirement: Setup and failure have truthful readiness

The interface SHALL provide explicit host setup, refresh and status for pinned QMD dependencies and required models. Reads SHALL NOT install dependencies or download models. Missing, unsupported, failed or timed-out semantics SHALL produce bounded keyword fallback with a visible reason; requested semantic modes SHALL NOT be reported as successful when only fallback ran.

#### Scenario: QMD is not prepared

- **WHEN** ordinary document recall is requested before host setup
- **THEN** it returns useful keyword evidence, fallback status and setup guidance

#### Scenario: Semantic setup succeeds

- **WHEN** setup reports semantic readiness
- **THEN** the required dependency, models, index and a real query have been checked and reads can use semantic retrieval

### Requirement: Document evidence is bounded and traceable

Document search SHALL return at most five excerpts and 6,144 UTF-8 bytes including status and metadata. It SHALL identify omitted or truncated selected evidence, distinguish empty from partial or unavailable retrieval, and provide references to originals for further reading.

#### Scenario: Evidence exceeds the output budget

- **WHEN** selected evidence exceeds the packet limits
- **THEN** results fit those limits, preserve usable source references and report omissions without claiming complete recall

#### Scenario: No document matches

- **WHEN** available scoped backends complete without matching evidence
- **THEN** the response reports empty successful lookup rather than a backend failure

<!-- end specs/document-retrieval/spec.md -->
<!-- file specs/memory/spec.md utf8 2899 -->
# Memory retrieval additions

## ADDED Requirements

### Requirement: Recall combines sources without combining authority

Memory SHALL offer a bounded recall response containing authorized live facts and local document evidence, identified separately and written in their original words. Fact reads SHALL preserve existing permissions, private scope and source access. Fact bodies and transcripts SHALL NOT reach the document index or semantic backend. Documents SHALL remain available independently of fact authorization, with failures reported per source.

#### Scenario: Both sources contribute context

- **WHEN** recall finds an authorized fact and a relevant wiki passage
- **THEN** both appear with their own identifiers or references under a shared budget without duplicate fact rendering

#### Scenario: Fact memory is denied

- **WHEN** fact access is denied but eligible checkout documents are available
- **THEN** recall returns documents and a denied fact-source state without hidden facts, hidden IDs or borrowed credentials

### Requirement: Recall has bounded output and independent readiness

Recall SHALL select at most eight whole facts and five document excerpts within 6,144 UTF-8 bytes including status and metadata, and SHALL complete or return explicit fallback/partial status within twenty seconds. Startup digest generation and pre-edit loading SHALL NOT launch document models. Agents SHALL receive concise task-directed recall guidance while direct fact and area lookups remain available.

#### Scenario: Both sources exceed the budget

- **WHEN** matching facts and documents exceed the shared allowance
- **THEN** recall reserves room for both available source kinds, keeps whole fact bodies, preserves source pointers and identifies omissions

#### Scenario: Semantic retrieval is slow

- **WHEN** semantic work cannot finish within the deadline
- **THEN** it stops and returns verified available fact or keyword evidence with a visible limitation without delaying startup hooks

### Requirement: Document recall is discoverable as installed reads

The installed catalogue SHALL describe document search and recall with validated inputs, truthful outputs, effects, revisions and authentication requirements. Documents SHALL require checkout access; facts SHALL require the existing memory credential. These SHALL remain installed-client reads rather than HTTP endpoints, and company login SHALL grant no extra fact access.

#### Scenario: An agent discovers document retrieval

- **WHEN** an agent lists and describes document retrieval without a memory credential or company login
- **THEN** it can invoke document search under the local contract

#### Scenario: A combined read uses a member credential

- **WHEN** installed recall is called with a member credential
- **THEN** its facts obey member visibility and its documents come only from the allowed checkout

<!-- end specs/memory/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file acceptance.json utf8 95668 fence=~~~ -->
~~~json
{
  "version": 1,
  "kind": "real-QMD-public-document-subset",
  "reviewedOn": "2026-10-04",
  "platform": "linux",
  "architecture": "x64",
  "cpuCount": 4,
  "node": "22.23.3",
  "sourceCount": 10,
  "limitations": [
    "Frozen public source subset, not whole archive throughput.",
    "Separate CLI processes include native cold startup; no facts or transcripts reach QMD.",
    "Semantic neighbors for absent answers are diagnostic, not proof that an answer exists."
  ],
  "cases": [
    {
      "item": {
        "id": "exact-gate",
        "question": "How does save publish changes and wait for checks?",
        "scope": "current",
        "expected": [
          "wiki/development/the-change-loop.md",
          "openspec/specs/delivery-gate/spec.md"
        ],
        "required": true,
        "passageTerms": [
          "CI when present",
          "waits for CI",
          "passing gate"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "How does save publish changes and wait for checks?",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "A loosened check needs a reason",
              "startLine": 119,
              "endLine": 130,
              "text": "### A loosened check needs a reason\n\nEvery check has an escape hatch, and a person who does not read code can not see one used. So the Test check, [`loosened-checks.mjs`](../../.github/scripts/loosened-checks.mjs) on every push, fails when a change loosens a check without saying why. It flags a file when the change adds a line that turns a check off (a skip comment, or a skipped, focused, or to-do test), deletes a test file other than by moving it, or changes a check's settings (a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, the Test workflow, or a script under `.github/scripts/`). Any settings change counts, stricter ones too: a script can not tell stricter from looser.\n\nThe reason is a Decision log bullet that starts with `Check:` and names the file:\n\n```text\n- **2026-09-27** — Check: `app/vitest.config.ts` excludes `src/generated/` from coverage, because that code is generated and has no tests of its own.\n```\n\nOnly a proposal the branch adds or edits counts, archived ones included, so an old reason never excuses a new loosening. The agent fixes a flagged file itself, switching the check back on or writing the reason, and lists every `Check:` bullet in plain words before *publish it?* and in the final report.\n",
              "truncated": false,
              "score": 0,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:119"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Purpose",
              "startLine": 3,
              "endLine": 6,
              "text": "## Purpose\n\nDecide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.\n",
              "truncated": false,
              "score": 0,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:3"
            },
            {
              "path": "wiki/development/browsing.md",
              "role": "wiki",
              "hash": "16805e920b645e4f0883ad557b45f172a2afe52417e2e26551a251f97f2d454e",
              "heading": "Save your passwords",
              "startLine": 80,
              "endLine": 85,
              "text": "## Save your passwords\n\nSay *save my passwords* and the agent sends a private link where you pick the logins it may use; it never sees a password. The screen, where they're kept, and how to change one: [save your passwords](passwords.md).\n\nBack to [development](README.md).\n",
              "truncated": false,
              "score": 0,
              "freshness": "verified",
              "reference": "wiki/development/browsing.md:80"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Save checkpoints and never merges",
              "startLine": 70,
              "endLine": 75,
              "text": "### Requirement: Save checkpoints and never merges\n\nFor GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.\n\nFor a verified managed Artifacts project, `/save` SHALL commit and push the candidate branch, maintain the same change record, wait for its exact Cloudflare gate and report its verified preview without a GitHub PR. On every route `/save` SHALL NOT merge, publish production, force-push or bypass hooks, and live credentials SHALL stay out of tracked content and reports.\n",
              "truncated": false,
              "score": -0.001,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:70"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "When memory loads",
              "startLine": 31,
              "endLine": 34,
              "text": "## When memory loads\n\nWhen a session starts or resumes, the `SessionStart` hook prints a **digest** of what applies to any task: every open thread of the change on your branch first, then one line counting the open threads on other changes by step (`plan 3, save 5; 41 untagged`), then [your people page](../wiki-style.md#people), cut at 1.5 KB with a line naming the page, then the other live facts by type and age. Other changes' threads stay live and searchable; they only leave the digest, so preferences and decisions keep their room. Its first line tells the agent to [recall its task](document-retrieval.md) in its own words before substantial work, then read cited originals. Recall combines permitted facts and original wiki/OpenSpec passages; the agent chooses the question after the task is known. The count line tells a verb to load its own threads when it starts: `memory search --type thread --tag plan` when `/plan` starts. Code builds the digest from one batch of queries, with no model, in under two seconds. It is capped at 40 lines and 6 KB; the last line says how many facts it left out. Offline, the hook prints this machine’s cached digest with its age; an authorization refusal disables private-cache fallback until authorization succeeds. The digest stays the same for the whole session, so the prompt cache holds. A fact written now shows at the next start.\n",
              "truncated": true,
              "score": 0,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:31"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6040,
        "ms": 384,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "How does save publish changes and wait for checks?",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "A loosened check needs a reason",
              "startLine": 119,
              "endLine": 130,
              "text": "### A loosened check needs a reason\n\nEvery check has an escape hatch, and a person who does not read code can not see one used. So the Test check, [`loosened-checks.mjs`](../../.github/scripts/loosened-checks.mjs) on every push, fails when a change loosens a check without saying why. It flags a file when the change adds a line that turns a check off (a skip comment, or a skipped, focused, or to-do test), deletes a test file other than by moving it, or changes a check's settings (a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, the Test workflow, or a script under `.github/scripts/`). Any settings change counts, stricter ones too: a script can not tell stricter from looser.\n\nThe reason is a Decision log bullet that starts with `Check:` and names the file:\n\n```text\n- **2026-09-27** — Check: `app/vitest.config.ts` excludes `src/generated/` from coverage, because that code is generated and has no tests of its own.\n```\n\nOnly a proposal the branch adds or edits counts, archived ones included, so an old reason never excuses a new loosening. The agent fixes a flagged file itself, switching the check back on or writing the reason, and lists every `Check:` bullet in plain words before *publish it?* and in the final report.\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:119"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Purpose",
              "startLine": 3,
              "endLine": 6,
              "text": "## Purpose\n\nDecide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:3"
            },
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "The gate",
              "startLine": 101,
              "endLine": 110,
              "text": "## The gate\n\nThis page owns delivery; other surfaces link here.\n\n**The GitHub gate is CI when present, else PR review**: GitHub Actions is an optional accelerator on pull requests, version control, OpenSpec, and the repo. Where checks exist, push and let CI run; the skills wait and fix failures. Where they don't, a human reviews the PR, with the change and its archive. Either way, **nothing builds locally as a prerequisite**; `/apply`'s host preview gates nothing and never reaches production.\n\n**Every file edit takes the gate**. GitHub uses a branch and pull request; [managed delivery](../stack/hosted-projects.md#delivery-runbook) requires exact Cloudflare checks and approval. Plans and archives stay with the verbs. Only code needs a change record; [`/save`](../../.agents/skills/save/SKILL.md) decides.\n\n**GitHub's ladder is CI-when-present → merge**; a skipped rung is never a failure. [Managed publication](../stack/hosted-projects.md#confirm-publication) requires all three confirmations. The app's test suite runs *inside* CI as an ordinary check, found by its `npm test` script at the repo root **or any immediate subdirectory**, so a repo without tests is not penalized and none receives a package manifest on WongStack's behalf.\n",
              "truncated": true,
              "score": 0.999,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:101"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Save checkpoints and never merges",
              "startLine": 70,
              "endLine": 75,
              "text": "### Requirement: Save checkpoints and never merges\n\nFor GitHub repositories, `/save` SHALL commit, push, open or update the pull request, and wait on the gate, and SHALL NOT merge, force-push, or bypass hooks. The pull request body SHALL show the change's current Status, its exact task checklist, and review and preview links when they exist, and no live credential value SHALL reach a commit, fact, pull request, or report.\n\nFor a verified managed Artifacts project, `/save` SHALL commit and push the candidate branch, maintain the same change record, wait for its exact Cloudflare gate and report its verified preview without a GitHub PR. On every route `/save` SHALL NOT merge, publish production, force-push or bypass hooks, and live credentials SHALL stay out of tracked content and reports.\n",
              "truncated": false,
              "score": 0.999,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:70"
            },
            {
              "path": "wiki/development/browsing.md",
              "role": "wiki",
              "hash": "16805e920b645e4f0883ad557b45f172a2afe52417e2e26551a251f97f2d454e",
              "heading": "Save your passwords",
              "startLine": 80,
              "endLine": 85,
              "text": "## Save your passwords\n\nSay *save my passwords* and the agent sends a private link where you pick the logins it may use; it never sees a password. The screen, where they're kept, and how to change one: [save your passwords](passwords.md).\n\nBack to [development](README.md).\n",
              "truncated": false,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/browsing.md:80"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 5924,
        "ms": 5001,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "exact-machine-privacy",
        "question": "Private memory belongs to the installation",
        "scope": "current",
        "expected": [
          "wiki/development/memory.md"
        ],
        "required": true,
        "passageTerms": [
          "Private memory belongs to the installation"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "Private memory belongs to the installation",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "Who sees what",
              "startLine": 29,
              "endLine": 30,
              "text": "- **Private memory belongs to the installation**, even with one active key. A stable random ID in the OS user’s local data folder is shared across chats and linked worktrees; the repository keeps its own secret. Shared OS accounts share one owner. Historical private rows remain unassigned and admin-readable.\n",
              "truncated": true,
              "score": 0.48,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:29"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "The memory key",
              "startLine": 87,
              "endLine": 90,
              "text": "## The memory key\n\n`CLOUDFLARE_MEMORY_TOKEN` holds your memory key: it opens this repo's store, through your app's production Worker, and nothing else. Its roles, trusted installation, revocation, and automatic website-login labels: [the memory key](memory-key.md).\n",
              "truncated": false,
              "score": 0.479,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:87"
            },
            {
              "path": "wiki/development/required-tools.md",
              "role": "wiki",
              "hash": "080030f4b81b6074fa265c44fe687fe97c888ff48fd0190472e72a3613d9487d",
              "heading": "Required tools",
              "startLine": 17,
              "endLine": 25,
              "text": "| Tool | Why |\n|---|---|\n| `agent-browser` | The browser [`/verify`](../../.agents/skills/verify/SKILL.md) drives for UI journeys, carrying its own Chrome. Setup offers it up front, in its one install question, and the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md) installs it. On any other machine, `/verify` installs it the first time a browser journey needs it, and says so. Its request and state probes ride on `curl` and existing commands, so a walk with no UI journeys needs no browser at all. |\n| `cloudflared` | Cloudflare's free tunnel tool, which puts the agent's browser behind a private link when it [hands you the browser](browsing.md#hand-the-browser-over) on your phone or another computer. Setup offers it up front, in the same question, and the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md) installs it. On any other machine, the agent asks, then [installs it](#installing-cloudflared) the first time such a hand-over needs it. A hand-over at this computer never needs it. |\n\nEach is a **tool, not a toolchain**: nothing is added to your repository — no `package.json`, no dependency entry, no lockfile — which is what lets a Python, Rust, or Go repo walk its own app. A repo that never runs `/verify` or hands the browser over acquires neither, and every other core verb still needs only the five commands above. The browser is available for ordinary work too, not only inside a walk; `/verify` is just the surface that grades what it sees and posts the evidence.\n\n**Paseo is where you chat.** [Paseo](https://paseo.sh) runs Claude Code or Codex on your own computer and reaches it from your phone; [the README's steps](https://github.com/matthewwong525/WongStack#start-in-three-steps) start there, and setup points to it when it's missing ([the check](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/tools.md#paseo-point-to-it-never-install-it)). No verb needs it except two: [`/routine`](../../.agents/skills/routine/SKILL.md) schedules recurring runs through it, and a request with several separate parts can [open a new workspace per part](the-change-loop.md#several-parts-several-workspaces). WongStack still never installs Paseo on your computer, because it is a desktop download with its own window; the one place it installs Paseo is the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md), for a server you give to agents. Without Paseo, `/routine` says so and changes nothing, the parts of a request are done one at a time, and work happens in your main folder. You also lose chatting from your phone, `/close` archiving the workspace, a finished browser hand-over waking the chat (you type *continue* instead), and the session-start tidy-up of idle workspaces. Every other verb works as before. The script uses Paseo's own daemon client, because `paseo schedule create` cannot set worktree isolation. A Paseo update that changes that client makes `/routine` stop and give the steps for the Paseo app.\n",
              "truncated": true,
              "score": 0.42,
              "freshness": "verified",
              "reference": "wiki/development/required-tools.md:17"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 4951,
        "ms": 380,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "Private memory belongs to the installation",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "Who sees what",
              "startLine": 29,
              "endLine": 30,
              "text": "- **Private memory belongs to the installation**, even with one active key. A stable random ID in the OS user’s local data folder is shared across chats and linked worktrees; the repository keeps its own secret. Shared OS accounts share one owner. Historical private rows remain unassigned and admin-readable.\n",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:29"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Git verbs check their preconditions first",
              "startLine": 87,
              "endLine": 110,
              "text": "\nFor GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as \"no PR\".\n\nFor a managed Artifacts project, those verbs SHALL instead verify the private hosted handoff, project identity, authorized remote and applicable Cloudflare status before a mutation; a missing or invalid handoff SHALL stop with reconnect guidance rather than request a GitHub or customer Cloudflare sign-in. An Artifacts origin or committed marker SHALL NOT establish authorization.\n\n#### Scenario: gh is signed out\n\n- **WHEN** `/save` runs and `gh` is not signed in\n- **THEN** it stops before the push and says to run `gh auth login`\n\n#### Scenario: Hosted authority is missing\n\n- **WHEN** a checkout identifies Artifacts but has no valid private hosted handoff\n- **THEN** the verb stops before mutation with reconnect guidance and does not use personal setup\n\n### Requirement: The preview link is the real preview for this commit\n\nPreview discovery SHALL report only a preview URL tied to the head commit, SHALL NOT report a bare provider apex such as `workers.dev` or `vercel.app`, and SHALL NOT construct a URL from a naming convention. When nothing qualifies, it SHALL report no preview.\n\n#### Scenario: A comment links the provider logo first\n\n- **WHEN** a comment naming the head commit links `https://workers.dev` and then `https://feature-app.example.workers.dev`\n- **THEN** discovery reports `https://feature-app.example.workers.dev`\n",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:87"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "The memory key",
              "startLine": 87,
              "endLine": 90,
              "text": "## The memory key\n\n`CLOUDFLARE_MEMORY_TOKEN` holds your memory key: it opens this repo's store, through your app's production Worker, and nothing else. Its roles, trusted installation, revocation, and automatic website-login labels: [the memory key](memory-key.md).\n",
              "truncated": false,
              "score": 0.999,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:87"
            },
            {
              "path": "wiki/development/required-tools.md",
              "role": "wiki",
              "hash": "080030f4b81b6074fa265c44fe687fe97c888ff48fd0190472e72a3613d9487d",
              "heading": "Required tools",
              "startLine": 17,
              "endLine": 21,
              "text": "| Tool | Why |\n|---|---|\n| `agent-browser` | The browser [`/verify`](../../.agents/skills/verify/SKILL.md) drives for UI journeys, carrying its own Chrome. Setup offers it up front, in its one install question, and the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md) installs it. On any other machine, `/verify` installs it the first time a browser journey needs it, and says so. Its request and state probes ride on `curl` and existing commands, so a walk with no UI journeys needs no browser at all. |\n| `cloudflared` | Cloudflare's free tunnel tool, which puts the agent's browser behind a private link when it [hands you the browser](browsing.md#hand-the-browser-over) on your phone or another computer. Setup offers it up front, in the same question, and the [server setup script](https://github.com/matthewwong525/WongStack/blob/main/server/README.md) installs it. On any other machine, the agent asks, then [installs it](#installing-cloudflared) the first time such a hand-over needs it. A hand-over at this computer never needs it. |\n",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/required-tools.md:17"
            },
            {
              "path": "wiki/development/memory-key.md",
              "role": "wiki",
              "hash": "68d9286ce516fb2a195ea771b085d29bb1177c3cdaf3c600890c3ca181398f5c",
              "heading": "Joining through GitHub",
              "startLine": 23,
              "endLine": 32,
              "text": "## Joining through GitHub\n\nThis heading remains for older links. Enrollment through GitHub has been replaced by trusted credential installation. Memory needs no GitHub lookup, person sign-in, account cap, or renewal. Missing credentials are reported by the normal hook; it never auto-enrolls a checkout.\n\nThe admin issues a credential for the recipient's local machine ID into a private transfer file. The recipient installs it with:\n\n```bash\nnode .claude/skills/memory/scripts/memory.mjs join --file <absolute-private-file>\n```\n",
              "truncated": true,
              "score": 0.33,
              "freshness": "verified",
              "reference": "wiki/development/memory-key.md:23"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 5775,
        "ms": 4980,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "paraphrase-persistence",
        "question": "Ephemeral dialogue warrants persistent organizational recollection",
        "scope": "current",
        "expected": [
          "wiki/development/memory.md",
          "wiki/agent-knowledge-center.md"
        ],
        "paraphrase": true,
        "required": true,
        "passageTerms": [
          "A session ends",
          "session's context",
          "short typed",
          "survive the session"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "Ephemeral dialogue warrants persistent organizational recollection",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "empty"
            }
          },
          "facts": [],
          "documents": [],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 393,
        "ms": 376,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": true,
          "passes": false,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "Ephemeral dialogue warrants persistent organizational recollection",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "The change loop",
              "startLine": 1,
              "endLine": 16,
              "text": "# The change loop\n\nRepo changes follow this loop. The handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change**: `openspec/changes/<name>/` holds its proposal, tasks, and optional specs, saved with the code.\n\nA plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb and no question round, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. One that edited a repo file, such as a wiki note, ends by asking *publish it?*, so no edit is left unsaved. Finished work in a Paseo workspace offers to close it: [`/close`](../../.agents/skills/close/SKILL.md) saves what the chat learned, updates the wiki, and closes the workspace. An invoked verb works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. The full loop is for the repo's code or process, and a new standalone page or tool is code: [a mini app](#mini-apps).\n\n```\n/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /ship ─▶ /close\n think      draft the  implement  save +    publish +   wiki +\n (no git)   change     + host     review +  archive   close\n            (no git)   preview    CI\n                          ▲\n            /continue ────┘\n            resume saved work later, on any machine\n```\n",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:1"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "delivery-gate Specification",
              "startLine": 1,
              "endLine": 24,
              "text": "# delivery-gate Specification\n\n## Purpose\n\nDecide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.\n\n## Requirements\n\n### Requirement: The gate is CI when present, else PR review\n\nFor a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.\n\nFor a verified managed Artifacts project, `/ship` SHALL use the mandatory exact-candidate Cloudflare check result and the approved publication contract defined by `cloudflare-hosted-projects`; no GitHub pull request or absent GitHub check SHALL count as its gate. A failed, timed-out or unreadable hosted gate SHALL stop publication.\n\n#### Scenario: Checks fail on the branch\n\n- **WHEN** a pushed commit's checks fail\n- **THEN** the skill reads the failure and pushes a fix, at most three times\n- **AND** `/ship` merges only once the checks pass\n\n#### Scenario: The repo has no checks\n\n- **WHEN** the repo has no CI workflow\n- **THEN** `/save` reports `NONE` and `/ship` merges on PR review",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:1"
            },
            {
              "path": "wiki/development/memory-key.md",
              "role": "wiki",
              "hash": "68d9286ce516fb2a195ea771b085d29bb1177c3cdaf3c600890c3ca181398f5c",
              "heading": "The memory key",
              "startLine": 1,
              "endLine": 4,
              "text": "# The memory key\n\nYour memory key opens this repository's [session memory](memory.md), with private memory owned by this OS-user installation. Repository authorization includes shared memory; trusted setup or the admin installs the secret that proves that authorization to the store. A copied checkout or a chosen machine ID alone grants nothing.\n",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/memory-key.md:1"
            },
            {
              "path": "wiki/agent-knowledge-center.md",
              "role": "wiki",
              "hash": "77fad152226cbac7680ea2930966f03f6ec7607636eed0284f75ddc3a2531dd5",
              "heading": "AI knowledge centers",
              "startLine": 1,
              "endLine": 9,
              "text": "# AI knowledge centers\n\nAn AI knowledge center is a repo where the team's processes, active work, shipped decisions, and reusable lessons are written in forms that humans can review and agents can run.\n\nWongStack is one way to build one — a set of working principles and the files that apply them. Take what fits your team and adapt the rest.\n\n## The principles\n\n1. **Building in-house isn't about saving money.** It's about a faster, better process.",
              "truncated": true,
              "score": 0.33,
              "freshness": "verified",
              "reference": "wiki/agent-knowledge-center.md:1"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "Session memory",
              "startLine": 1,
              "endLine": 6,
              "text": "# Session memory\n\nSession memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.\n\n## What is stored\n",
              "truncated": true,
              "score": 0.25,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:1"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6098,
        "ms": 4979,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "paraphrase-implementation",
        "question": "Repetitive predictable procedures benefit from deterministic automation instead of language inference",
        "scope": "current",
        "expected": [
          "wiki/agent-knowledge-center.md"
        ],
        "paraphrase": true,
        "required": true,
        "passageTerms": [
          "same way every time",
          "same answer twice",
          "Most process improvements shouldn't use AI"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "Repetitive predictable procedures benefit from deterministic automation instead of language inference",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "empty"
            }
          },
          "facts": [],
          "documents": [],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 428,
        "ms": 369,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": true,
          "passes": false,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "Repetitive predictable procedures benefit from deterministic automation instead of language inference",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "The change loop",
              "startLine": 1,
              "endLine": 7,
              "text": "# The change loop\n\nRepo changes follow this loop. The handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change**: `openspec/changes/<name>/` holds its proposal, tasks, and optional specs, saved with the code.\n\nA plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb and no question round, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. One that edited a repo file, such as a wiki note, ends by asking *publish it?*, so no edit is left unsaved. Finished work in a Paseo workspace offers to close it: [`/close`](../../.agents/skills/close/SKILL.md) saves what the chat learned, updates the wiki, and closes the workspace. An invoked verb works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. The full loop is for the repo's code or process, and a new standalone page or tool is code: [a mini app](#mini-apps).\n\n```",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:1"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Nothing builds locally as a gate",
              "startLine": 41,
              "endLine": 62,
              "text": "\n### Requirement: Nothing builds locally as a gate\n\nNo skill SHALL compile, run a test suite, lint, or type-check as a condition of `/save` or `/ship`; test suites run in CI (`ci-tests`). `/apply`'s preview from the agent host SHALL gate nothing and SHALL NOT deploy production.\n\n#### Scenario: A host preview exists\n\n- **WHEN** `/apply` uploaded a preview from the host and the person publishes the change\n- **THEN** `/ship` still saves, waits on the gate, and merges on its result\n- **AND** production deploys from CI on the default branch\n\n### Requirement: The walkthrough is evidence, not a gate\n\n`/ship` SHALL run `/verify` once before the merge and report its verdict (`staging-walkthrough`). A walk that cannot run, or a missing `verify` skill, SHALL NOT block the merge and SHALL NOT be installed; a walk `FAILURE` SHALL stop and ask the person to fix it or merge anyway, and a merge anyway SHALL be recorded in the report.\n\n#### Scenario: The walk fails\n\n- **WHEN** the ship-time walk returns `FAILURE` after its own fix attempts\n- **THEN** `/ship` stops before merging and asks whether to fix first or merge anyway\n\n### Requirement: The gate doctrine has one owner\n",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:41"
            },
            {
              "path": "wiki/development/required-tools.md",
              "role": "wiki",
              "hash": "080030f4b81b6074fa265c44fe687fe97c888ff48fd0190472e72a3613d9487d",
              "heading": "Required tools",
              "startLine": 21,
              "endLine": 23,
              "text": "\nEach is a **tool, not a toolchain**: nothing is added to your repository — no `package.json`, no dependency entry, no lockfile — which is what lets a Python, Rust, or Go repo walk its own app. A repo that never runs `/verify` or hands the browser over acquires neither, and every other core verb still needs only the five commands above. The browser is available for ordinary work too, not only inside a walk; `/verify` is just the surface that grades what it sees and posts the evidence.\n",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/required-tools.md:21"
            },
            {
              "path": "wiki/agent-knowledge-center.md",
              "role": "wiki",
              "hash": "77fad152226cbac7680ea2930966f03f6ec7607636eed0284f75ddc3a2531dd5",
              "heading": "AI knowledge centers",
              "startLine": 2,
              "endLine": 8,
              "text": "\nAn AI knowledge center is a repo where the team's processes, active work, shipped decisions, and reusable lessons are written in forms that humans can review and agents can run.\n\nWongStack is one way to build one — a set of working principles and the files that apply them. Take what fits your team and adapt the rest.\n\n## The principles\n",
              "truncated": true,
              "score": 0.33,
              "freshness": "verified",
              "reference": "wiki/agent-knowledge-center.md:2"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "When to add embeddings",
              "startLine": 94,
              "endLine": 98,
              "text": "\n## When to add embeddings\n\nSearch is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *Concise language please* misses the fixture fact that says *The owner wants short replies in plain words, with no tool names unless they ask*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three, so a change can't quietly break search; a question that should have matched and didn't belongs there first. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.\n",
              "truncated": true,
              "score": 0.25,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:94"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6069,
        "ms": 5028,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": false,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "historical-reason",
        "question": "Why did notes in git not suit a team?",
        "scope": "history",
        "change": "add-memory-store",
        "expected": [
          "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md"
        ],
        "expectedRole": "archive",
        "required": true,
        "passageTerms": [
          "Notes in git also do not suit a team"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "Why did notes in git not suit a team?",
          "scope": "history",
          "mode": "keyword",
          "change": "add-memory-store",
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md",
              "role": "archive",
              "hash": "aebfa3f2e9cce703c5a0e0829e55f41e81ec347bf95fe61337c8f4df70bdcf12",
              "heading": "Why",
              "startLine": 7,
              "endLine": 10,
              "text": "## Why\n\nA session's context enters the repo only when someone runs `/save`, and many sessions end without one, so what they worked out is lost. When context is saved, nothing reads it again: the start of a session loads no memory, only `/continue` reads a note, and no step removes a stale or duplicate note. Notes in git also do not suit a team: every note is public in a public repo, a protected `main` turns each capture into a pull request, and grep is the only search.\n",
              "truncated": false,
              "score": 0.76,
              "freshness": "verified",
              "reference": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md:7"
            },
            {
              "path": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md",
              "role": "archive",
              "hash": "aebfa3f2e9cce703c5a0e0829e55f41e81ec347bf95fe61337c8f4df70bdcf12",
              "heading": "Decision log",
              "startLine": 53,
              "endLine": 75,
              "text": "## Decision log\n\n- **2026-09-25** — Asked how to make memory automatic; the user proposed a session-start subagent. Found that `/dream` did note-to-wiki consolidation until 2026-09-15 and was retired because nobody ran it by hand, so the new design fixes the trigger, not the consolidation.\n- **2026-09-25** — Asked what to consolidate → the user clarified the problem: many sessions end without `/save`, and their context must still reach durable storage. The design became a backfill of missing notes.\n- **2026-09-25** — Asked the consolidation trigger → chose a threshold checked at session start.\n- **2026-09-25** — Asked how the wiki is written → the user chose `/ship` only, from the change's notes.\n- **2026-09-25** — Asked how to make notes searchable → chose a summary and tags plus a query script. Asked where tags come from → chose a curated list that the model may extend with a definition line.\n- **2026-09-25** — Asked whether to migrate existing notes → chose one pass over all 43.\n- **2026-09-25** — Asked hook versus subagent → the hook runs only a fast script and triggers a background subagent that works next to the first prompt, so the first reply is not delayed.\n- **2026-09-25** — Asked about publishing in a public repo → first chose main with an opt-out, then replaced git storage with Cloudflare. The `#private` opt-out remains.\n- **2026-09-25** — Asked how the store relates to `notes/` → chose all in Cloudflare. Asked for one store per team or per repo → chose per repo. Asked what R2 keeps → chose the full raw transcript.\n- **2026-09-25** — Asked what happens without a store → chose Cloudflare as mandatory for setup. Asked about retention → chose forever, in a secure store.\n- **2026-09-25** — Asked about encryption → the user chose plain files in a private bucket. Assumed a dedicated memory token that CI never receives, because the provisioning token is widened and copied into GitHub secrets.\n- **2026-09-25** — Asked the name → chose `memory` for the database and bucket, with a `sessions` table. Asked the model → chose sessions plus notes. Asked about note history → the user chose none, because a new note is created instead of updating one, so notes are append-only and a slug groups them.\n- **2026-09-25** — Assumed: the REST API rather than a Worker, because a Worker adds a service to run. Assumed: known `.env` values are replaced in the raw transcript before upload, and a token-pattern scan blocks a note that contains a match.\n- **2026-09-25** — Assumed: a 1-hour idle threshold, a cap of 5 sessions per run, the `#private` marker, and the `memory` skill name. All are cheap to change in review.\n- **2026-09-25** — Assumed: the local spool, because `/save` must not lose a note when the network or token fails.\n- **2026-09-25** — Assumed: resource ids live in `.claude/.wong-stack.json` and only the token lives in `.env`, because ids are not secrets and `wrangler.jsonc` already commits D1 ids.\n- **2026-09-25** — Assumed: sessions are linked to a repo through a registry that the start hook writes, plus checkouts that currently exist. Older transcripts of deleted worktrees are skipped, because the migration already covers their saved notes.\n- **2026-09-25** — Assumed: `/wong-cloudflare` is the one door to Cloudflare and provisions memory without the stack pack, because the provisioning token can already mint a scoped token.\n- **2026-09-25** — Assumed: Codex uses its start hook if it has one, else an `AGENTS.md` instruction. The implementation verifies this.\n- **2026-09-25** — Asked how to make retrieval and storage better, with research on other systems. Found that the plan had no read side at session start, that only `/continue` read notes, and that nothing revisited a note. Claude Code auto-memory, Codex Memories, and Letta all load a small index at start, freeze it for the session, supersede stale facts, and consolidate offline.\n- **2026-09-25** — Asked whether notes are needed if facts exist → chose facts only. 42 of the 43 notes back an archived change whose Decision log already holds the why, and R2 keeps the raw transcript as the full record, so an authored note adds little. The loss is the connected argument of a design turn, which stays in the Decision log and the transcript.",
              "truncated": true,
              "score": 0.759,
              "freshness": "verified",
              "reference": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md:53"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 5932,
        "ms": 519,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "Why did notes in git not suit a team?",
          "scope": "history",
          "mode": "auto",
          "change": "add-memory-store",
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "The steps",
              "startLine": 64,
              "endLine": 71,
              "text": "## The steps\n\nEach skill owns its own procedure; this list is what each stage is for.\n\n- **[`/explore`](../../.agents/skills/explore/SKILL.md)** thinks a problem through and owns the [questions before a plan](#asking-before-drafting). It **always runs**, except for notes pasted from a review page, and writes nothing.\n- **[`/plan`](../../.agents/skills/plan/SKILL.md)** drafts the change folder and its `review.html` page, with no git. **A change that touches behavior plans its tests**: `tasks.md` carries a coverage task that `/apply` writes and CI runs on every push. `/save` never authors tests; coverage grows where the context is richest.\n- **[`/apply`](../../.agents/skills/apply/SKILL.md)** ensures a plan, works `tasks.md` [in a fresh helper agent](../../.agents/skills/apply/SKILL.md#build-in-a-helper) so the build does not carry the planning talk, and ends with a host preview. It never saves on completion; invoked by `/ship`, it returns with no upload.\n- **[`/save`](../../.agents/skills/save/SKILL.md)** is the git stage: it commits code and [the synced change](#the-change-is-a-living-handoff-not-just-a-plan) together, pushes, opens or updates the PR, waits for CI when present, returns a preview URL, and records the session's facts in the [memory store](memory.md). With no plan, it authors one from the session, so nothing ships without its handoff. `/ship` reuses it for the archive, so the git, PR, and CI logic exists once.",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:64"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Git verbs check their preconditions first",
              "startLine": 86,
              "endLine": 91,
              "text": "### Requirement: Git verbs check their preconditions first\n\nFor GitHub repositories, `/save`, `/continue`, and `/ship` SHALL check that `gh` is signed in, an `origin` remote exists, and the `openspec` CLI runs, before any git or GitHub action. A failed check SHALL stop the verb with the command that fixes it, and a sign-in failure SHALL NOT be read as \"no PR\".\n\nFor a managed Artifacts project, those verbs SHALL instead verify the private hosted handoff, project identity, authorized remote and applicable Cloudflare status before a mutation; a missing or invalid handoff SHALL stop with reconnect guidance rather than request a GitHub or customer Cloudflare sign-in. An Artifacts origin or committed marker SHALL NOT establish authorization.\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:86"
            },
            {
              "path": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md",
              "role": "archive",
              "hash": "aebfa3f2e9cce703c5a0e0829e55f41e81ec347bf95fe61337c8f4df70bdcf12",
              "heading": "Why",
              "startLine": 7,
              "endLine": 10,
              "text": "## Why\n\nA session's context enters the repo only when someone runs `/save`, and many sessions end without one, so what they worked out is lost. When context is saved, nothing reads it again: the start of a session loads no memory, only `/continue` reads a note, and no step removes a stale or duplicate note. Notes in git also do not suit a team: every note is public in a public repo, a protected `main` turns each capture into a pull request, and grep is the only search.\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md:7"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "What is stored",
              "startLine": 6,
              "endLine": 8,
              "text": "\n- **Facts**, in a D1 database named `<repo>-memory`. A fact is at most 400 characters, with a slug (the change name, or a topic), a type, tags, an author, a time, its source session, and a separate machine owner. The types: `user` (who the user is), `feedback` (how they want work done), `project` (decisions and ruled-out options, with reasons), `reference` (pointers to outside resources), and `thread` (an open question). [Writing facts](../../.agents/skills/memory/references/writing-facts.md) owns what a good fact keeps.\n- **Sessions**, one row per transcript: agent, branch, status (`captured` or `skipped`), and how far it was read. A session an earlier version marked `private` keeps that status: nothing of it is uploaded or read.",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:6"
            },
            {
              "path": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md",
              "role": "archive",
              "hash": "aebfa3f2e9cce703c5a0e0829e55f41e81ec347bf95fe61337c8f4df70bdcf12",
              "heading": "Decision log",
              "startLine": 53,
              "endLine": 57,
              "text": "## Decision log\n\n- **2026-09-25** — Asked how to make memory automatic; the user proposed a session-start subagent. Found that `/dream` did note-to-wiki consolidation until 2026-09-15 and was retired because nobody ran it by hand, so the new design fixes the trigger, not the consolidation.\n- **2026-09-25** — Asked what to consolidate → the user clarified the problem: many sessions end without `/save`, and their context must still reach durable storage. The design became a backfill of missing notes.\n- **2026-09-25** — Asked the consolidation trigger → chose a threshold checked at session start.",
              "truncated": true,
              "score": 0.999,
              "freshness": "verified",
              "reference": "openspec/changes/archive/2026-09-25-add-memory-store/proposal.md:53"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6059,
        "ms": 7498,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "obsolete-current-conflict",
        "question": "No Worker SHALL stand in front of the store",
        "scope": "current",
        "forbiddenRoles": [
          "archive",
          "active"
        ],
        "expected": [
          "wiki/development/memory.md"
        ],
        "required": false,
        "passageTerms": [
          "worker",
          "memory"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "No Worker SHALL stand in front of the store",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "empty"
            }
          },
          "facts": [],
          "documents": [],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 370,
        "ms": 373,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": true,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "No Worker SHALL stand in front of the store",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "The memory key",
              "startLine": 87,
              "endLine": 90,
              "text": "## The memory key\n\n`CLOUDFLARE_MEMORY_TOKEN` holds your memory key: it opens this repo's store, through your app's production Worker, and nothing else. Its roles, trusted installation, revocation, and automatic website-login labels: [the memory key](memory-key.md).\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:87"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: The preview link is the real preview for this commit",
              "startLine": 102,
              "endLine": 105,
              "text": "### Requirement: The preview link is the real preview for this commit\n\nPreview discovery SHALL report only a preview URL tied to the head commit, SHALL NOT report a bare provider apex such as `workers.dev` or `vercel.app`, and SHALL NOT construct a URL from a naming convention. When nothing qualifies, it SHALL report no preview.\n",
              "truncated": false,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:102"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "Without R2",
              "startLine": 91,
              "endLine": 94,
              "text": "## Without R2\n\nR2 needs a payment method on file, even inside its free tier. Without it, the store keeps no raw transcripts and a preview check keeps no [pictures](staging-walkthrough.md#what-a-walk-needs), and everything else works: facts, the digest, search, capture, and consolidation. `source <fact-id>` then says that transcripts are not stored. Setup's closing report gives the steps in [the card list](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md#the-card-list). Turn R2 on later and run `/wong-sync`: it plans the bucket, and new sessions are kept from then on.\n",
              "truncated": false,
              "score": 0.999,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:91"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: Ship merges work that needed no change",
              "startLine": 199,
              "endLine": 202,
              "text": "### Requirement: Ship merges work that needed no change\n\nWhen no change record selects for the branch, `/ship` SHALL apply `/save`'s test for authoring one: for code or a plan for code, it SHALL author the change from the session and the diff, as `/save` would, then archive and merge it like any change; anything else SHALL skip the archive and merge on the gate like any change.\n",
              "truncated": false,
              "score": 0.999,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:199"
            },
            {
              "path": "wiki/agent-knowledge-center.md",
              "role": "wiki",
              "hash": "77fad152226cbac7680ea2930966f03f6ec7607636eed0284f75ddc3a2531dd5",
              "heading": "Consolidate the processes and the data in one place you own",
              "startLine": 27,
              "endLine": 47,
              "text": "\nA process written as code is also the record of how the work is done. The business data sits behind that code. When both live in one place you own, an agent can read the process and the records together — that is where it gets its power.\n\nData split across separate tools is a set of disconnected exports, and no agent reasons well across those. The [Cloudflare stack](stack/README.md) that setup installs is one cheap way to own the place where both live: Workers for the code, [D1](stack/d1-pipeline.md) for the data. Any stack works if you own it.\n\n### Using AI shouldn't need a complicated setup\n\nNothing builds locally. [CI is the gate](development/the-change-loop.md#the-gate) when the repo has checks, PR review when it doesn't, and every commit gets a deployed preview — so work continues from any machine, and a new one needs no setup.\n\nKeep the dependencies few. WongStack needs `git`, [`gh`](https://cli.github.com/), [Node.js](https://nodejs.org/), and the [OpenSpec](https://github.com/Fission-AI/OpenSpec) CLI. Fewer moving parts break less often and survive longer.\n\n### Context has to survive the session\n\nA session ends and everything it worked out goes with it, unless a file keeps it. So the work writes its own record: the plan and the decisions behind it, the session's facts in the [memory store](development/memory.md), and any [repeatable knowledge](wiki-style.md#repeatable-knowledge) in the wiki, written when it is learned. A session that ends without `/save` is captured by a background run, and the next session starts with a digest of what the repo remembers.\n\nGive that context by [progressive disclosure](wiki-style.md) — one place to start, each page breaking down into more detail — so an agent reads what the task needs and no more. The wiki grows from use, with the wiki rules loaded for every edit; request an audit with [`/improve`](development/repository-improvement.md). Because it all lives in the repo, the next teammate starts where the last one stopped.\n\n### Give AI as much access as you can, and as little autonomy as it needs\n\nThe more an agent can reach, the more it does for you, and the more damage a wrong step causes. The failure mode is not disobedience: an agent will not refuse your instruction, it will misinterpret it. So keep the access wide and put humans at standard points in the loop:\n",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/agent-knowledge-center.md:27"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 5983,
        "ms": 5027,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "active-proposal",
        "question": "Find remembered facts and relevant documents together",
        "scope": "active",
        "change": "evaluate-qmd-retrieval",
        "expected": [
          "openspec/changes/evaluate-qmd-retrieval/proposal.md"
        ],
        "expectedRole": "active",
        "required": true,
        "passageTerms": [
          "Find remembered facts and relevant documents together"
        ]
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "Find remembered facts and relevant documents together",
          "scope": "active",
          "mode": "keyword",
          "change": "evaluate-qmd-retrieval",
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "openspec/changes/evaluate-qmd-retrieval/proposal.md",
              "role": "active",
              "hash": "4acdcfa9e8304dfd79d21b065dac0a05c512cdd7d2a64498a8f2c7d27c57b4de",
              "heading": "What Changes",
              "startLine": 13,
              "endLine": 40,
              "text": "- **Find remembered facts and relevant documents together.** The assistant can ask a question once and receive useful facts alongside passages from current guidance, with links to their originals. Meaning-based search helps when the question uses different wording.\n  ```text\n             question\n                │\n       ┌────────┴────────┐\n       ▼                 ▼\n  remembered facts   wiki and requirements\n       └────────┬────────┘\n                ▼\n      useful evidence + sources\n  ```\n- **Make past decisions easy to find without confusing them with current guidance.** Search current guidance by default. Ask explicitly for history or work in progress; every passage shows which kind of source it is.\n  ```text\n       how does it work? ──▶ current guidance\n       why this choice? ──▶ past decisions\n       what is planned? ──▶ proposed work\n  ```\n- **Keep retrieval ready as the project changes.** Provide setup and refresh commands, maintain a separate index for each checkout, and check passages against their current files. When meaning-based search cannot run, return a clearly labelled keyword result.\n  ```text\n      files change ──▶ refresh the index\n                            │\n                            ▼\n                    verify original files\n                            │\n                            ▼\n                    return current passages\n  ```\n- **Put the feature into everyday work and verify it.** Teach the assistant to use recall before substantial work. Test useful answers, changed files, older decisions, and privacy; measure speed and context size using the actual implementation.",
              "truncated": true,
              "score": 0.86,
              "freshness": "verified",
              "reference": "openspec/changes/evaluate-qmd-retrieval/proposal.md:13"
            },
            {
              "path": "openspec/changes/evaluate-qmd-retrieval/proposal.md",
              "role": "active",
              "hash": "4acdcfa9e8304dfd79d21b065dac0a05c512cdd7d2a64498a8f2c7d27c57b4de",
              "heading": "Why",
              "startLine": 7,
              "endLine": 10,
              "text": "## Why\n\nUseful knowledge lives in remembered facts, the wiki, and past plans, but the assistant has to search those places separately and can miss an explanation written in different words. Give it one recall tool that finds relevant evidence and shows where it came from.\n",
              "truncated": false,
              "score": 0.859,
              "freshness": "verified",
              "reference": "openspec/changes/evaluate-qmd-retrieval/proposal.md:7"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 3108,
        "ms": 522,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "Find remembered facts and relevant documents together",
          "scope": "active",
          "mode": "auto",
          "change": "evaluate-qmd-retrieval",
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "How facts are captured",
              "startLine": 60,
              "endLine": 62,
              "text": "## How facts are captured\n\n- **`/save`** writes facts from the session so far. Nothing to capture beyond the diff and the Decision log means no facts.",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:60"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "Requirement: The gate is CI when present, else PR review",
              "startLine": 10,
              "endLine": 33,
              "text": "\nFor a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.\n\nFor a verified managed Artifacts project, `/ship` SHALL use the mandatory exact-candidate Cloudflare check result and the approved publication contract defined by `cloudflare-hosted-projects`; no GitHub pull request or absent GitHub check SHALL count as its gate. A failed, timed-out or unreadable hosted gate SHALL stop publication.\n\n#### Scenario: Checks fail on the branch\n\n- **WHEN** a pushed commit's checks fail\n- **THEN** the skill reads the failure and pushes a fix, at most three times\n- **AND** `/ship` merges only once the checks pass\n\n#### Scenario: The repo has no checks\n\n- **WHEN** the repo has no CI workflow\n- **THEN** `/save` reports `NONE` and `/ship` merges on PR review\n\n#### Scenario: Hosted checks are unreadable\n\n- **WHEN** the Cloudflare check result for the approved hosted candidate cannot be read\n- **THEN** publication stops unverified and no GitHub fallback is used\n\n### Requirement: The gate reads the pushed commit\n\nThe check wait on every route SHALL report on the commit just pushed and no other. For the GitHub route it SHALL report `NONE` only when the repo has no workflow files or no check appears within a grace period, and `UNKNOWN` when the check state cannot be read, so `/save` finishes unverified and `/ship` does not merge.",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:10"
            },
            {
              "path": "openspec/changes/evaluate-qmd-retrieval/proposal.md",
              "role": "active",
              "hash": "4acdcfa9e8304dfd79d21b065dac0a05c512cdd7d2a64498a8f2c7d27c57b4de",
              "heading": "What Changes",
              "startLine": 13,
              "endLine": 28,
              "text": "- **Find remembered facts and relevant documents together.** The assistant can ask a question once and receive useful facts alongside passages from current guidance, with links to their originals. Meaning-based search helps when the question uses different wording.\n  ```text\n             question\n                │\n       ┌────────┴────────┐\n       ▼                 ▼\n  remembered facts   wiki and requirements\n       └────────┬────────┘\n                ▼\n      useful evidence + sources\n  ```\n- **Make past decisions easy to find without confusing them with current guidance.** Search current guidance by default. Ask explicitly for history or work in progress; every passage shows which kind of source it is.\n  ```text\n       how does it work? ──▶ current guidance\n       why this choice? ──▶ past decisions\n       what is planned? ──▶ proposed work",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/changes/evaluate-qmd-retrieval/proposal.md:13"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "When to add embeddings",
              "startLine": 95,
              "endLine": 98,
              "text": "## When to add embeddings\n\nSearch is keyword search (FTS5) with tags. It matches a word's other forms through the porter stemmer, so *previews* finds *preview*, and filler words like *how* and *should* never match on their own. It matches forms, not meanings: *Concise language please* misses the fixture fact that says *The owner wants short replies in plain words, with no tool names unless they ask*, so search with the words the fact would use. A shipped set of real-shaped questions, `scripts/tests/fixtures/memory-search-questions.json`, runs in CI, each with the fact it must rank in the top three, so a change can't quietly break search; a question that should have matched and didn't belongs there first. That is enough at hundreds to low thousands of facts, because the write gate asks a model about paraphrases, and consolidation merges what the gate missed. Add embeddings when `memory.mjs stats` reports the trigger as met: more than 2,000 live facts, or merged duplicates growing across three consolidations. Search stays behind the one script, so nothing else changes.\n",
              "truncated": true,
              "score": 0.999,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:95"
            },
            {
              "path": "openspec/changes/evaluate-qmd-retrieval/proposal.md",
              "role": "active",
              "hash": "4acdcfa9e8304dfd79d21b065dac0a05c512cdd7d2a64498a8f2c7d27c57b4de",
              "heading": "Why",
              "startLine": 7,
              "endLine": 10,
              "text": "## Why\n\nUseful knowledge lives in remembered facts, the wiki, and past plans, but the assistant has to search those places separately and can miss an explanation written in different words. Give it one recall tool that finds relevant evidence and shows where it came from.\n",
              "truncated": false,
              "score": 0.999,
              "freshness": "verified",
              "reference": "openspec/changes/evaluate-qmd-retrieval/proposal.md:7"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6144,
        "ms": 7455,
        "grade": {
          "hit": true,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": false
        }
      }
    },
    {
      "item": {
        "id": "absent-answer",
        "question": "zzqxv-antineutrinolattice-99887",
        "scope": "current",
        "absent": true,
        "required": true
      },
      "keyword": {
        "packet": {
          "version": 1,
          "question": "zzqxv-antineutrinolattice-99887",
          "scope": "current",
          "mode": "keyword",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "empty"
            }
          },
          "facts": [],
          "documents": [],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 358,
        "ms": 365,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": true,
          "passes": true,
          "absenceDiagnostic": false
        }
      },
      "auto": {
        "packet": {
          "version": 1,
          "question": "zzqxv-antineutrinolattice-99887",
          "scope": "current",
          "mode": "auto",
          "change": null,
          "documentLimit": 5,
          "backend": "qmd",
          "coverage": "complete",
          "requestedModeState": "ok",
          "filters": {},
          "sources": {
            "facts": {
              "state": "empty",
              "reason": "not requested"
            },
            "documents": {
              "state": "ok"
            }
          },
          "facts": [],
          "documents": [
            {
              "path": "wiki/development/the-change-loop.md",
              "role": "wiki",
              "hash": "2717b10abb743b1da563f803c6bffc7c90ac90f80d14b8232db82b4ec0aec81b",
              "heading": "The change loop",
              "startLine": 1,
              "endLine": 16,
              "text": "# The change loop\n\nRepo changes follow this loop. The handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change**: `openspec/changes/<name>/` holds its proposal, tasks, and optional specs, saved with the code.\n\nA plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb and no question round, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. One that edited a repo file, such as a wiki note, ends by asking *publish it?*, so no edit is left unsaved. Finished work in a Paseo workspace offers to close it: [`/close`](../../.agents/skills/close/SKILL.md) saves what the chat learned, updates the wiki, and closes the workspace. An invoked verb works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. The full loop is for the repo's code or process, and a new standalone page or tool is code: [a mini app](#mini-apps).\n\n```\n/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /ship ─▶ /close\n think      draft the  implement  save +    publish +   wiki +\n (no git)   change     + host     review +  archive   close\n            (no git)   preview    CI\n                          ▲\n            /continue ────┘\n            resume saved work later, on any machine\n```\n",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "wiki/development/the-change-loop.md:1"
            },
            {
              "path": "openspec/specs/delivery-gate/spec.md",
              "role": "specs",
              "hash": "ad4f410c55ca129919074358527a187e6ca044802aea5e461f63c0ec8491c590",
              "heading": "delivery-gate Specification",
              "startLine": 1,
              "endLine": 24,
              "text": "# delivery-gate Specification\n\n## Purpose\n\nDecide when saved work may merge and how it gets there: `/save` checkpoints and waits on CI when the repo has checks, else PR review, with every file edit taking a pull request; and `/ship` finishes, archives, checkpoints once, and merges only on a passing gate, with nothing built locally as a condition.\n\n## Requirements\n\n### Requirement: The gate is CI when present, else PR review\n\nFor a GitHub repository, `/ship` SHALL merge only when `/save`'s gate result is `SUCCESS` (checks passed) or `NONE` (the repo has no checks, so PR review is the gate); `UNKNOWN`, `TIMEOUT`, or `FAILURE` SHALL stop the merge. `/ship` SHALL NOT bypass, repeat, or reinterpret that result, and SHALL NOT start while the default branch's own checks are failing or unreadable.\n\nFor a verified managed Artifacts project, `/ship` SHALL use the mandatory exact-candidate Cloudflare check result and the approved publication contract defined by `cloudflare-hosted-projects`; no GitHub pull request or absent GitHub check SHALL count as its gate. A failed, timed-out or unreadable hosted gate SHALL stop publication.\n\n#### Scenario: Checks fail on the branch\n\n- **WHEN** a pushed commit's checks fail\n- **THEN** the skill reads the failure and pushes a fix, at most three times\n- **AND** `/ship` merges only once the checks pass\n\n#### Scenario: The repo has no checks\n\n- **WHEN** the repo has no CI workflow\n- **THEN** `/save` reports `NONE` and `/ship` merges on PR review",
              "truncated": true,
              "score": 1,
              "freshness": "verified",
              "reference": "openspec/specs/delivery-gate/spec.md:1"
            },
            {
              "path": "wiki/development/memory.md",
              "role": "wiki",
              "hash": "fac96faf13770a6b23df73ad6dd9a27c0cb3dc8ee3716fe876ea17f76d0046a8",
              "heading": "Session memory",
              "startLine": 1,
              "endLine": 6,
              "text": "# Session memory\n\nSession memory is the repo's private store of **facts**: short typed lines that past sessions learned, which the next session reads at start. It lives outside git, in the repo's own Cloudflare account, so a capture needs no commit and a public repo publishes nothing. [The `memory` skill](../../.agents/skills/memory/SKILL.md) is its one door; this page is the convention. It is one of the knowledge surfaces in [the knowledge center](../agent-knowledge-center.md), beside the wiki and OpenSpec.\n\n## What is stored\n",
              "truncated": true,
              "score": 0.5,
              "freshness": "verified",
              "reference": "wiki/development/memory.md:1"
            },
            {
              "path": "wiki/agent-knowledge-center.md",
              "role": "wiki",
              "hash": "77fad152226cbac7680ea2930966f03f6ec7607636eed0284f75ddc3a2531dd5",
              "heading": "AI knowledge centers",
              "startLine": 1,
              "endLine": 10,
              "text": "# AI knowledge centers\n\nAn AI knowledge center is a repo where the team's processes, active work, shipped decisions, and reusable lessons are written in forms that humans can review and agents can run.\n\nWongStack is one way to build one — a set of working principles and the files that apply them. Take what fits your team and adapt the rest.\n\n## The principles\n\n1. **Building in-house isn't about saving money.** It's about a faster, better process.\n2. **Most process improvements shouldn't use AI.** They should just be code.",
              "truncated": true,
              "score": 0.33,
              "freshness": "verified",
              "reference": "wiki/agent-knowledge-center.md:1"
            },
            {
              "path": "wiki/development/browsing.md",
              "role": "wiki",
              "hash": "16805e920b645e4f0883ad557b45f172a2afe52417e2e26551a251f97f2d454e",
              "heading": "Browsing",
              "startLine": 1,
              "endLine": 4,
              "text": "# Browsing\n\nBrowsing is how the agent uses websites as you: it keeps your logins, logs in with the passwords you save for it, shows you what it's doing, moves to Cloudflare's browser when a site blocks its own, and hands you the browser when a step needs you. It works the same for every repo on the computer.\n",
              "truncated": true,
              "score": 0.25,
              "freshness": "verified",
              "reference": "wiki/development/browsing.md:1"
            }
          ],
          "omitted": {
            "facts": 0,
            "documents": 0
          }
        },
        "bytes": 6095,
        "ms": 5026,
        "grade": {
          "hit": false,
          "forbidden": false,
          "verified": true,
          "bounded": true,
          "completeMode": true,
          "absent": false,
          "passes": true,
          "absenceDiagnostic": true
        }
      }
    }
  ],
  "setupMs": 110214,
  "readiness": {
    "version": "2.8.3",
    "semantic": true,
    "deep": false
  },
  "coldQueryMs": 5001,
  "warmQueryMs": 5001,
  "privateSourceExcluded": true,
  "lifecycle": {
    "kind": "synthetic-file-mutation",
    "refreshMs": 2810,
    "beforeFresh": true,
    "afterFresh": true,
    "afterSemantic": true
  },
  "independentFacts": {
    "state": "unavailable",
    "documentsUsable": true
  },
  "summary": {
    "pass": true,
    "semanticRecovery": [
      "paraphrase-persistence"
    ],
    "regressions": [],
    "structuralFailures": []
  },
  "pass": true
}

~~~
<!-- end acceptance.json -->
<!-- file evidence.md utf8 5989 -->
# Retrieval implementation evidence

The implemented code at `994aa61a23171e3d51fc5817439cbaf854698efe` is based on PR #259's actual merged revision, `c22d448bfd8204994ba92f65b5f722762ce6f052`. Validation ran remotely; no local build or test suite was used as the gate. This record describes the implementation before publication.

## Required checks

- [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37214156173): all 1,193 script tests passed, including existing fact permissions/search, document freshness/lifecycle, input/environment isolation, cancellation, installed adapters, packet budgets and payload installation. Lint, shell checks, hosted starter, payload links, retired names, OpenSpec configuration/spec validation and context limits passed. All 36 main specs validated. Skill instructions were 190,731 bytes against the 190,845-byte baseline; startup was 2,200 words against the 2,200-word ceiling.
- [App checks](https://github.com/matthewwong525/WongStack/actions/runs/37214156076): passed, including the existing app suite and explained-check/wiki-link gate.
- [Deployment](https://github.com/matthewwong525/WongStack/actions/runs/37214156101): passed. The save workflow discovers the actual preview for its final checkpoint; this host did not upload a second build.
- [Real QMD and Windows fallback](https://github.com/matthewwong525/WongStack/actions/runs/37214156075): both jobs passed. The original public-source artifact is retained in [acceptance.json](acceptance.json); its fixture contains ten original public wiki/OpenSpec files with frozen hashes and eight reviewed questions. No private facts or transcripts enter the QMD corpus.

## Observed semantic acceptance

The Linux x64 runner used Node 22.23.3 and four CPUs, with explicit `documents-setup --cpu`, pinned QMD 2.8.3 and the shipped lockfile/model descriptor. Real install, embedding, index preparation and readiness verification took **110,214 ms**. The first auto lookup and the later repeated lookup each took **5,001 ms** in separate CLI processes; these measurements include native startup and do not establish a persistent warm-service latency.

The persistence paraphrase missed by keyword search was found by auto hybrid retrieval in an original source passage. Critical publishing and machine-privacy wording, history and active proposals passed without changing the frozen questions or grading. Default-current scope excluded obsolete guidance; roles remained explicit. Changed-source refresh took **2,810 ms**, and original file hashes/ranges/text matched before and after mutation. Private-source exclusion passed; unavailable fact memory still left usable documents. Every measured packet was within 6,144 UTF-8 bytes, with the largest at exactly 6,144 bytes. Auto query times across these cases were approximately 5.0–7.5 seconds.

This is evidence for a small frozen public corpus, not whole-archive throughput or universal recall quality. The second procedure/automation paraphrase remained a miss in both modes. Semantic neighbors for an absent-answer question remain diagnostic; similarity is not evidence that an answer exists. Optional deep reranking and native Windows setup were not live acceptance targets. Peak memory and full-checkout disk usage were not measured. Deadline/cancellation and failure paths passed focused remote tests, rather than a claim that this CPU acceptance intentionally exhausted its deadline.

## Installed operation and agent workflow

The parent exercised `scripts/company-api.mjs list --scope memory --q recall --limit 5`: it discovered `memory.recall` as a read operation with installed-client transport, local checkout plus installed fact credential, and `not_checked` readiness. Company access was `not_requested`; discovery did not require employee login or borrow authority.

The observation in [installed-recall.json](installed-recall.json) records the actual task question, final code revision, packet bytes, elapsed time, source roles/ranges/hashes and independent original-file comparisons. Private fact bodies and identifiers were held only while processing the response and were not retained in this evidence. This host had no prepared QMD runtime; its usable keyword fallback is recorded honestly. Native semantic acceptance is the separate remote run above.

The fresh build-helper review repeated discovery and invoked `scripts/company-api.mjs call memory.recall --file -`, then independently read each cited original. Both source states were `ok`: six permitted facts and four document excerpts in **6,071 bytes**, observed in **1,012 ms** including the helper process and original-file comparisons. All four hashes, ranges and excerpt texts matched; the original observation and this repeat are retained in `installed-recall.json` without private fact bodies or IDs. The originals explain that recall combines separately authorized facts with path-scoped original passages; the agent read those sources before completing this task. This was a real keyword-fallback workflow on the unprepared host, not a semantic timing measurement.

Hook review traced `.agents/settings.json` to `session-start.mjs` and `before-edit.mjs`. Startup calls `loadDigest`/`digestPlan`, which batch fact queries and render recall guidance; it does not execute that guidance. First edit calls `personalFilter` and the fact query for mapped areas. It imports `tagClause` through `memory.mjs`; the CLI dispatcher is guarded by `isMain`, so that import does not dispatch retrieval. Document-module initialization reads the pinned descriptor only; setup, model execution and refresh are function calls outside both hook paths. The passing remote `document-recall.test.mjs` regression checks the guidance and both hook sources; existing startup and pre-edit tests passed in the same 1,193-test gate. This review used those remote checks and source tracing, without executing production capture hooks or claiming a new local test gate.

<!-- end evidence.md -->
<!-- file installed-recall.json utf8 3204 fence=~~~ -->
~~~json
{
  "revision": "994aa61a23171e3d51fc5817439cbaf854698efe",
  "operation": "memory.recall",
  "question": "How does memory recall combine authorized facts with wiki and OpenSpec evidence?",
  "mode": "keyword",
  "backend": "lexical-fallback",
  "sourceStates": {
    "facts": "ok",
    "documents": "ok"
  },
  "factCount": 6,
  "documentCount": 4,
  "packetBytes": 6071,
  "elapsedMs": 1465,
  "sourcesRead": [
    {
      "path": "wiki/development/document-retrieval.md",
      "role": "wiki",
      "startLine": 1,
      "endLine": 4,
      "hash": "43e797fc7c8a834aa5c61ba20194f94bb2386ed41e629d8eb9911c9b94faa48a",
      "originalRead": true,
      "matches": true
    },
    {
      "path": "openspec/specs/memory/spec.md",
      "role": "specs",
      "startLine": 622,
      "endLine": 625,
      "hash": "2f23051c376715664fe228744eb46f10140a4275f20294cda8c7e256976b1998",
      "originalRead": true,
      "matches": true
    },
    {
      "path": "wiki/development/document-retrieval.md",
      "role": "wiki",
      "startLine": 5,
      "endLine": 9,
      "hash": "43e797fc7c8a834aa5c61ba20194f94bb2386ed41e629d8eb9911c9b94faa48a",
      "originalRead": true,
      "matches": true
    },
    {
      "path": "openspec/specs/memory/spec.md",
      "role": "specs",
      "startLine": 626,
      "endLine": 628,
      "hash": "2f23051c376715664fe228744eb46f10140a4275f20294cda8c7e256976b1998",
      "originalRead": true,
      "matches": true
    }
  ],
  "privateFactBodiesRetained": false,
  "freshHelperReview": {
    "observedAt": "2026-10-04T15:52:23.907Z",
    "operation": "memory.recall",
    "interface": "scripts/company-api.mjs call memory.recall --file -",
    "question": "How does memory recall combine authorized facts with wiki and OpenSpec evidence?",
    "mode": "keyword",
    "backend": "lexical-fallback",
    "sourceStates": {
      "facts": "ok",
      "documents": "ok"
    },
    "factCount": 6,
    "documentCount": 4,
    "packetBytes": 6071,
    "elapsedMs": 1012,
    "sourcesRead": [
      {
        "path": "wiki/development/document-retrieval.md",
        "role": "wiki",
        "startLine": 1,
        "endLine": 4,
        "hash": "43e797fc7c8a834aa5c61ba20194f94bb2386ed41e629d8eb9911c9b94faa48a",
        "originalRead": true,
        "matches": true
      },
      {
        "path": "openspec/specs/memory/spec.md",
        "role": "specs",
        "startLine": 622,
        "endLine": 625,
        "hash": "2f23051c376715664fe228744eb46f10140a4275f20294cda8c7e256976b1998",
        "originalRead": true,
        "matches": true
      },
      {
        "path": "wiki/development/document-retrieval.md",
        "role": "wiki",
        "startLine": 5,
        "endLine": 9,
        "hash": "43e797fc7c8a834aa5c61ba20194f94bb2386ed41e629d8eb9911c9b94faa48a",
        "originalRead": true,
        "matches": true
      },
      {
        "path": "openspec/specs/memory/spec.md",
        "role": "specs",
        "startLine": 626,
        "endLine": 628,
        "hash": "2f23051c376715664fe228744eb46f10140a4275f20294cda8c7e256976b1998",
        "originalRead": true,
        "matches": true
      }
    ],
    "privateFactBodiesRetained": false
  }
}

~~~
<!-- end installed-recall.json -->
<!-- file review.html utf8 44908 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-evaluate-qmd-retrieval</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-evaluate-qmd-retrieval">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-evaluate-qmd-retrieval</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Useful knowledge lives in remembered facts, the wiki, and past plans, but the assistant has to search those places separately and can miss an explanation written in different words. Give it one recall tool that finds relevant evidence and shows where it came from.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Find remembered facts and relevant documents together.</b> The assistant can ask a question once and receive useful facts alongside passages from current guidance, with links to their originals. Meaning-based search helps when the question uses different wording.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">           question</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">              │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">     ┌────────┴────────┐</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">     ▼                 ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">remembered facts   wiki and requirements</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">     └────────┬────────┘</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">              ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">    useful evidence + sources</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Make past decisions easy to find without confusing them with current guidance.</b> Search current guidance by default. Ask explicitly for history or work in progress; every passage shows which kind of source it is.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">     how does it work? ──▶ current guidance</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">     why this choice? ──▶ past decisions</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">     what is planned? ──▶ proposed work</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Keep retrieval ready as the project changes.</b> Provide setup and refresh commands, maintain a separate index for each checkout, and check passages against their current files. When meaning-based search cannot run, return a clearly labelled keyword result.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">    files change ──▶ refresh the index</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">                          │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">                          ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">                  verify original files</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                          │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">                          ▼</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">                  return current passages</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Put the feature into everyday work and verify it.</b> Teach the assistant to use recall before substantial work. Test useful answers, changed files, older decisions, and privacy; measure speed and context size using the actual implementation.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">    start a task ──▶ recall ──▶ read sources</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">                       │</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">                       ▼</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">              tested before publishing</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> Generated summaries or beliefs, OptMem summary trees, putting private facts or transcripts into a document index, a new app screen, or moving memory to another service.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to plan the QMD evaluation, keep exploring, or stop → chose <code>/plan</code>.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what to do with the first plan → chose Review the plan, keeping implementation paused.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked through the user's correction to plan implementation rather than only comparison → chose an implementation plan; validation is part of delivering the feature.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: replace the previous proposal, design and tasks in the same change, because they are unimplemented and the user is revising their scope.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use one recall entry point for facts and documents, because the goal is better memory retrieval across the wiki and OpenSpec.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: search current guidance by default and expose explicit historical/proposed scopes, because an old plan can be relevant without describing what works now.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use code for source selection, indexing, validation, packet budgets and fallback, because those are repeatable processes; QMD supplies semantic ranking.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: manage QMD and model downloads on the agent host outside the repo, because its native/model dependencies do not belong in app packages or the private fact store.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: setup is an explicit host operation and ordinary lookup never installs dependencies, because installation and model downloads are substantial work; once prepared, lookup maintains its own derived index.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: keep private facts behind their existing client and never pass them to QMD, because their visibility is enforced by the store.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: use Linux for live semantic acceptance and verify portable fallback on Windows, because semantic support depends on QMD/native capability.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: reuse existing lookup helpers without changing their contracts; reconcile shared memory and release files at implementation/save if the separately open ownership work has changed them.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked through the user's <code>/apply</code> instruction to build assuming PR #259 will merge → chose implementation on that incoming foundation. PR #259 was still open at inspected head <code>9abfe989a19ac8403a06842b473c446da97850f8</code>; preserve its shared checks and hosted-delivery contracts, and reconcile with its actual merged default-branch version before final validation. This instruction does not authorize merging PR #259.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Observed: PR #259 merged as <code>c22d448bfd8204994ba92f65b5f722762ce6f052</code>; implementation now uses that actual merged foundation, preserving its shared checks and hosted delivery.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: retired-name checks allow seven original retired terms only in the frozen copy of the 2026-09-25 memory proposal. Its source hash is recorded in the acceptance fixture; all live source checks remain, so historical retrieval can be tested without rewriting the record.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Save checkpoint: implementation and focused checks are authored on merged <code>c22d448</code>; required remote checks and real CPU semantic acceptance are pending. Preserve unchecked verification tasks until actual runs pass. Session facts skipped because the diff and this handoff already retain the session-specific decisions.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-04</p>Check: <code>.github/workflows/qmd-retrieval.yml</code> limits the new native/model acceptance job to retrieval-related paths and 30 minutes, with same-repository pull-request duplicates skipped. This keeps model downloads out of unrelated work and avoids duplicate runs; existing test/payload gates stay required, and relevant pushes plus manual runs execute semantic and Windows acceptance.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>First remote run: Windows portable retrieval and the 101 app tests passed; payload lint and the new workflow explanation needed fixes. Native QMD/model setup reached original verification, exposing its managed <code>?index=wongstack</code> URI suffix. Corrected that adapter mapping with strict index/manifest checks, preserved control-character validation, and rerun the gates rather than claim semantic acceptance.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Second remote run: actual QMD CPU setup completed in 75.5 seconds and recovered the persistence paraphrase missed by keyword; source verification, private-source exclusion, changed-file refresh and independent fact failure passed. Critical exact, historical and proposed evidence failed because anchors chose another section or large current passages consumed the packet. Reserve useful passages across source roles and select relevant original sections within located documents; retain the frozen acceptance questions and grading. Fix the duplicate-source test fixture and add the new capability to memory's owning-document map. App and Windows gates passed; payload had 1,186 passing tests and two failures before these fixes, so verification remains pending.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Third remote run: all 1,191 script tests, release/context checks, app checks and Windows fallback passed. QMD preserved critical publishing, historical and proposed evidence and still recovered the persistence paraphrase. Its only remaining acceptance regression was exact machine-privacy wording: the located file's short general sections ranked above the section containing the literal phrase. Prioritize an exact original phrase within that located document and center long excerpts on its matching line; do not weaken source or grading checks. This is the final automatic repair attempt for this save run.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Final automatic repair passed: tested implementation <code>994aa61</code> has all 1,193 script tests, release/context/app/deployment checks and real QMD CPU plus Windows portable acceptance green. Tasks through 6.2 are checked against those actual results, retained in <code>evidence.md</code> and <code>acceptance.json</code>. Installed discovery and original-source recall were observed on that same revision; <code>installed-recall.json</code> retains only public citations and aggregate fact counts. Finish task 6.3's fresh helper review, then checkpoint the completed handoff without merging. Session facts remain skipped because the handoff retains these decisions.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Fresh helper completed task 6.3: installed discovery and recall returned six permitted facts and four independently verified original excerpts in 6,071 bytes, with model-free startup/pre-edit dispatch confirmed. All 18 tasks are complete; status is ready-to-ship. Final gate checkpoint retains the reviewed evidence and completed handoff, with no implementation change after tested <code>994aa61</code>. Publication remains the user’s next decision.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Ship archive checkpoint: all 18 tasks are complete, the archive preserves the actual semantic and installed-source evidence, and release 30.5.0 is numbered from merged main 30.4.0. Main requirements already matched the deltas, so archive used the verified skip-specs route. The user invoked <code>/ship</code>, authorizing checkpoint, preview verification and merge after the required gate. Session facts skipped because the archived handoff already retains this session's decisions.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
