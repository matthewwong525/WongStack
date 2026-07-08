# OpenSpec Mode — writing plans as OpenSpec changes

When the audited repo plans with [OpenSpec](https://github.com/Fission-AI/OpenSpec), the advisor's plans should land where the rest of the repo plans. This file defines how Phase 4 (and the plan-consuming variants) operate in that mode. Everything else about the skill — recon, audit, vet, the quality bar — is unchanged.

**Detection**: the repo root contains `openspec/changes/`. That folder is the contract, not the CLI — if the `openspec` CLI happens to be absent, write the change folders directly. No `openspec/changes/` → ignore this file entirely and use `plans/` as the skill describes.

**The write boundary in this mode**: create and modify files only under `openspec/changes/` (never `openspec/changes/archive/`, never `openspec/specs/` — syncing main specs belongs to the repo's own workflow, e.g. WongStack's `/save`). All other Hard Rules apply verbatim, including: no source edits, no git mutations.

---

## One selected finding → one change folder

```
openspec/changes/<slug>/
  proposal.md     ← why this matters, what changes, capabilities touched
  tasks.md        ← the executor-facing plan: steps, verification, scope, STOP conditions
  design.md      ← only when decisions/risk warrant it
  specs/<capability>/spec.md   ← only when spec-level behavior changes
```

Name the change with a kebab-case slug that works as a **git branch name** — in WongStack repos, branch name = change name is how a branch ties to its plan. Don't reuse an active or archived change name.

Every plan-template property carries over; only the container changes. The mapping:

| Plan template section | OpenSpec home |
|---|---|
| Why this matters | `proposal.md` — Why |
| Scope boundaries (in/out), category, priority/effort/risk, "Depends on" | `proposal.md` — What Changes / Impact, plus a `**Depends on:** <other-slug>` line when ordering matters |
| Planned-at SHA + drift check | preamble at the top of `tasks.md` |
| Current state (excerpts from your own reads), conventions + exemplar, commands table | `tasks.md` preamble, inlined — the executor has zero context, same as ever |
| Steps, each with its verification command and expected result | `tasks.md` checklist (`- [ ] N.N ...`, verify command in the task text) |
| Test plan, done criteria | final task group in `tasks.md`, machine-checkable |
| STOP conditions, escape hatches, maintenance notes | end of `tasks.md` (STOP conditions must survive into the executor's view — never omit them) |
| Key decisions, alternatives, risks | `design.md`, only when there's a real decision to record |

Write a **delta spec** (`specs/<capability>/spec.md` with `## ADDED/MODIFIED Requirements`) only when the finding changes what the system *should do* — a new capability, a changed requirement. A pure bugfix that restores already-intended behavior usually needs no delta; say so in the proposal rather than inventing one. Check `openspec/specs/` for existing capability names before naming a new one.

After writing a change, run `openspec validate <slug>` if the CLI is available; fix what it reports before moving to the next finding. Skip silently if the CLI is missing — the folder format above is what matters.

## Index, ordering, and rejections

There is no `plans/README.md` in this mode — `openspec list` is the index and the archive is the DONE record.

- **Ordering/dependencies**: record per-change (`**Depends on:**` in `proposal.md`) and summarize the recommended execution order in your final report.
- **Reconcile-before-write**: instead of reading `plans/README.md`, run `openspec list` (or list `openspec/changes/`) and scan the archive — skip findings already planned or shipped, and flag active changes your new plans depend on.
- **Rejected findings**: report them in the session output with one line each. There is no persistent rejection index; the dedup that matters comes from checking active + archived changes.

## Variants in OpenSpec mode

- **Implementation path**: the natural executor is the repo's own loop — in WongStack, `/continue <slug>` (implement) → `/save` (checkpoint) → `/ship` (merge + archive). Recommend it in your final report.
- **`execute <slug>`** still works where that loop isn't in play: dispatch the executor per [closing-the-loop.md](closing-the-loop.md), but inline the change's `proposal.md` + `design.md` + `tasks.md` into the prompt (worktrees only contain committed files), and on APPROVE tick the completed checkboxes in `tasks.md` instead of updating an index row. The docs variant's no-`execute` rule still applies to docs changes.
- **`reconcile`**: enumerate via `openspec list` + the archive. Archived = DONE (spot-check cheap done criteria on HEAD). Active with unticked tasks = TODO/IN PROGRESS — run the drift check from the `tasks.md` preamble; refresh excerpts and the planned-at SHA on drift, or report "fixed independently" if the finding is gone (leave deleting the change folder to the user).
- **`review-plan <slug>`**: critique the change folder's artifacts against the plan-template quality bar and this file's mapping.
- **`--issues`**: the issue body is `proposal.md` + `tasks.md` concatenated; record the URL in the proposal. All of closing-the-loop's preflight and visibility warnings apply.
