# Retrieve useful memory from the wiki and past work

**Status:** in-progress
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
