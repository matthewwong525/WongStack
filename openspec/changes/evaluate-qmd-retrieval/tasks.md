# Tasks

## 1. Document corpus and index lifecycle

- [ ] 1.1 Implement the allowlisted corpus/manifest modules under `.agents/skills/memory/scripts/lib/documents/`; add tests for collection roles, current/history/active/all scope, eligible unsaved files, ignored paths, people-page exclusion and symlink/path escapes, with the inclusion rules documented in the owning retrieval page.
- [ ] 1.2 Implement worktree-specific state, atomic index generations, serialized incremental refresh and bounded abandoned-run recovery; add tests proving isolation across linked worktrees, changed-only processing, moved/deleted-source removal and valid-state retention after interrupted or concurrent refresh.
- [ ] 1.3 Implement fresh source/range/hash validation and live lexical fallback during stale/partial indexing; verify tests with sources edited between candidate retrieval and rendering, and document the difference between verified passages and complete semantic coverage.

## 2. QMD host runtime and search

- [ ] 2.1 Add the pinned QMD runtime/model descriptor and reproducible install metadata, plus explicit setup/status commands using a managed host prefix; verify failure-path tests never mark partial setup ready and include real installation/readiness checks in task 6.2.
- [ ] 2.2 Implement managed QMD keyword, structured auto hybrid, semantic and opt-in deep adapters with strict argument validation, isolated config/environment and request deadlines; add tests for malformed responses, query injection, absent/native-unsupported runtimes, subprocess cancellation and no secret forwarding.
- [ ] 2.3 Implement dependency-free Node keyword fallback and refresh/status dispatch; test that ordinary reads never install/download, requested semantic failure is labelled, successful empty search stays distinct, and portable fallback operates on Windows through remote checks.
- [ ] 2.4 Document the exact setup, status, refresh, semantic/deep model preparation and rollback commands in `wiki/development/document-retrieval.md`; verify the remote acceptance job executes the same documented setup and query interface.

## 3. Combined recall and installed operations

- [ ] 3.1 Add `documents` and `recall` CLI dispatch using existing permitted fact selection, independent source status and current-only default; add tests for missing/denied/offline fact memory alongside usable documents, and ensure document-only commands do not open the store.
- [ ] 3.2 Implement text/JSON v1 evidence packets and the shared 6,144-byte budget, source balancing, whole fact bodies, excerpt boundaries, omissions and twenty-second deadline; test multibyte data, uneven source sizes, partial failures, cancellation and verified source references.
- [ ] 3.3 Add `memory.documents` and `memory.recall` operation contracts and route their structured results through the existing installed adapter/helper; test local-read discovery without credentials/company login, member privacy, rejected unsupported input and truthful readiness/authentication labels.

## 4. Agent guidance and payload delivery

- [ ] 4.1 Update memory/explore skills, the generic `AGENTS.md` context guidance and digest's task-search instruction to use recall before substantial work while retaining path-area lookup; verify fixture assertions that hooks remain model-free and a representative agent task calls recall then reads a cited source.
- [ ] 4.2 Link the new retrieval page from the memory convention and development hub, explain explicit optional npm/QMD setup in required-tools guidance, and update payload manifest coverage/descriptions for the new files; verify installation into a temporary target includes every required module and document without caches/models.
- [ ] 4.3 Add `Next (minor)` with plain setup instructions, leave `VERSION` unchanged, and keep skill instruction budgets within the recorded limit; include payload-link, OpenSpec-config and context-budget checks in task 6.1.

## 5. Feature acceptance tooling

- [ ] 5.1 Add a small frozen source-reviewed acceptance fixture and runner using the shipped CLI for exact wording, paraphrases, history, obsolete/current conflicts, absent answers and changed-source refresh; add grading tests with planted success/failure evidence and keep synthetic fact fixtures separate from real QMD results.
- [ ] 5.2 Add the dedicated path-triggered remote `qmd-retrieval.yml` workflow with pinned setup/actions, bounded CPU execution and safe report artifacts, plus Windows portable-fallback coverage; verify the ordinary suite has no QMD/model-download dependency and document cold/warm timing and packet-byte measurements.

## 6. Complete feature verification

- [ ] 6.1 Run `/save` to complete the required remote checks, existing memory permission/search regressions, focused runtime/recall tests, payload installation/link checks and context checks; retain the exact tested revision/run links and repair failures without weakening existing checks.
- [ ] 6.2 Through `/save`, complete real host setup and indexed semantic acceptance: a paraphrase hit missed by keyword lookup, preserved critical exact/current evidence, correctly labelled history, changed-file refresh, scoped original passages, deadline behavior and usable fallback; retain the actual report and leave this task pending if semantic execution is unavailable.
- [ ] 6.3 Demonstrate installed operation discovery and one representative agent workflow using recall followed by reading the original source; verify startup and first-edit hooks launch no document models, and store the observed evidence with timing/resource limitations in this change's `evidence.md`.
