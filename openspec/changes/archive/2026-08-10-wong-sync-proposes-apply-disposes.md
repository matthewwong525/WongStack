<!-- openspec-archive v1 2026-08-10-wong-sync-proposes-apply-disposes -->
<!-- file proposal.md utf8 9240 -->
# /wong-sync proposes, /apply disposes

**Status:** ready-to-ship (archived 2026-08-10)
**Open questions:** none

## Why

`/wong-sync` states a hard rule — *"It proposes; it never implements"* — and then breaks it: Step 2 copies and updates files before any analysis runs, and `references/adapt.md` requires those file changes be described **as landed, never as tasks**. So the one document a person reads to decide arrives after the repo already changed, and it reads as a changeset rather than a destination. Nobody ever sees what their repo will *become*, what they *gain*, or — the column that does not exist today — what they *lose* when a graft supersedes something they wrote.

## What Changes

- **BREAKING — `/wong-sync` writes no repo changes.** It analyses, writes one OpenSpec change, and stops. `/apply` does the work and `/save` checkpoints it. The gate becomes the repo's own loop (review the plan → `/apply`), not a new interactive prompt, so the run stays non-interactive **and** gates — the trade `adapt.md` currently accepts is now won rather than conceded.
- **BREAKING — `proposal.md` becomes an after-picture, not a changeset list.** Four regions: **After** (how this repo works once this lands, in its own terms), **Gain** (capabilities grouped by what the repo will be able to *do*, each naming what it replaces here), **Lose** (superseded local mechanisms, new obligations, lost optionality), **Resolution** (which parts are sharp and which are *shape it with `/plan`*).
- **BREAKING — the self-update pass is retired.** Two conflated things separate: *which instructions this run follows* is a read of the already-fetched, read-only clone and needs no write; *which instructions are installed here* becomes an ordinary proposed change. The same blob-hash proof still governs the read — a locally edited `wong-sync` keeps running under its local text — and the disclosure discipline is kept: the run says which version's logic it followed and why.
- **Fresh install still copies first.** A **seed manifest** (`version` and `commit` both null) means the bulk copy *is* the install, so gating it buys nothing: copy the payload, then analyse and plan as normal. An **absent** manifest still stops and points at `/wong-setup` — unchanged.
- **The manifest write becomes the last task, not a step**, so `version`/`commit` advance only when the work is actually applied. An unapplied plan must never make the next run believe this repo is current and skip the changelog walk.
- **Task granularity splits.** File moves group into one coarse task; each graft stays one task at the existing concreteness bar. The old *"review the N files this sync landed"* task disappears — nothing lands unreviewed.
- **Duplicate plans are accepted.** A repo may sit with an unapplied sync plan; a later run writes a new one rather than deduping. A changed situation deserves a changed plan. Date-collision suffixing (`-2`, `-3`) and never-overwrite are kept.
- **A clarification stage runs before the plan.** Between the subagent reports and verdict assignment, the skill may ask what the evidence cannot settle because the missing fact is intent: is this local difference deliberate, is this unmet assumption a gap or a choice, which shape should this graft take. There is no fixed count — each question must change the plan to be worth asking, and they arrive in one batch ordered by impact. It never asks whether you want a capability and never asks for approval; that stays the review. Unanswered — a skipped question or any non-interactive run — resolves toward `adopt`, so a run always completes without an answer.
- **`present` gains an evidence bar** — its reason line must name where this repo expresses the capability — as a cheap backstop under the after-picture.

**Non-goals:** no change to the two-subagent analysis, the five verdicts,
the approval path (which stays the plan review, never a prompt), the capability unit, the verdict record's format or its tick-to-overrule surface, the payload manifest, the never-overwrite-local-authorship guarantee, or the read-only clone.

## Capabilities

### New Capabilities
- `wong-sync-after-picture`: the destination narrative a sync produces — its four regions, the grouping rule that keeps it readable at first-sync scale, and the honesty requirement that it state its own resolution.

### Modified Capabilities
- `wong-sync`: the run writes no repo files except on a seed manifest; the self-update pass is replaced by reading the clone's instructions; the manifest rewrite moves out of the run and into the plan's last task.
- `wong-sync-adapt`: copies and updates become tasks rather than landed edits; the proposal's contract changes to the after-picture; the review-what-landed task is removed; `present` requires named evidence.

## Impact

- `.claude/skills/wong-sync/SKILL.md` — Steps 2, 3 and 4 restructure; the self-update section is rewritten; the hard rules change.
- `.claude/skills/wong-sync/references/adapt.md` — the output contract, the task shapes, the `present` bar, and the non-interactive rationale.
- Payload release per `CLAUDE.md`: **major** `VERSION` bump (11.0.0), a newest-first `CHANGELOG.md` entry, and `node scripts/check-payload-links.mjs`.
- No target repo is broken by an older installed copy: an out-of-date `wong-sync` proposes its own update through the ordinary path.

## Decision log

- **2026-08-10** — Shipped as v11.0.0. Started from a narrower question — *is `/wong-sync` already biased toward adapting?* It is (`adapt.md`'s "Justify not adopting, not adopting", shipped v9.10.0), but three leaks were found: `present` had no evidence bar where `divergent` did, the `assumes` check ran as a pre-filter *ahead* of the bias, and no verdict expressed *partially* present. Rather than patch the taxonomy three times, the fix became structural — a destination-first proposal forces partial coverage into the open, because you cannot write "here is your repo after this" without confronting it. `present` still got an evidence bar as a cheap backstop.
  - **The gate is the loop, not a prompt.** Rejected an interactive yes/no gate and a `--apply` flag. A plan is reviewable when the reader has time, editable before it runs, and visible in the PR diff; a terminal prompt is worse on all three and needs a mechanism the repo doesn't otherwise have. This is what let the run stay non-interactive *and* gain a gate, so `adapt.md`'s old trade was rewritten as won rather than deleted.
  - **Self-update: following ≠ installing.** The exemption was initially defended (you need the new logic to draw the right picture) and then dropped as wrong — the clone is already fetched and readable, so the run reads its instructions and the *install* becomes an ordinary task. This removes the one write nobody could gate: the skill rewriting its own decision procedure before the user saw anything. The at-most-once guard went with it — no write, nothing to loop on.
  - **Soft declines → tick the `adopt` line.** Rejected `/apply` reporting back what it skipped (couples a generic verb to one skill's bookkeeping, and can't tell "not wanted" from "not done yet") and a not-wanted marker in `tasks.md` (puts a verdict outside the record, breaking the one-store rule). Making every group a checkbox reuses the existing tick surface and makes `declined` reachable for the first time.
  - **Manifest = payload state.** `version`/`commit` mean which release the *files* were brought to, so the rewrite is the plan's last file task. Partial acceptance then needs no rule: files are tracked by the manifest, capability adoption by the verdict record, which recomputes everything except `declined` every run.
  - **Clarification stage added late, then unbounded.** Scoped to the three question kinds the evidence genuinely cannot settle, because the missing fact is intent. The initial cap of three was removed on review — a fixed number is wrong at both ends, and since unanswered already resolves toward `adopt`, the user is the real cap. Replaced with a per-question admission test plus one impact-ordered batch.
  - **Found during apply:** `wong-setup` linked the retired `#step-4--rewrite-the-manifest-always-last` anchor; the shipped `WONG-STACK` block still described the run as copying and updating; and `wiki/stack/d1-pipeline.md` carried one stale sentence. All three fixed as task group 4. Note `.claude` → `.agents` and `CLAUDE.md` → `AGENTS.md` are symlinks in this repo, so edits land in the tracked files directly.
  - **Not verifiable here.** The payload is prose and `/wong-sync` refuses to run against its own source, so nothing in this repo exercises the change. `node scripts/check-payload-links.mjs` passes in all four install shapes with no dead links; real verification is a target repo on 11.0.0.
- **2026-08-10** — Archived by `/ship` and checkpointed. Delta specs were already folded into `openspec/specs/` during the preceding `/save`, so the archive re-applied nothing; the sync-state check confirmed both ADDED requirements, the REMOVED one, the RENAMED one, and the new `wong-sync-after-picture` spec all present. Merging squashes this record onto the default branch.

<!-- end proposal.md -->
<!-- file design.md utf8 14601 -->
## Context

`/wong-sync` today runs **apply-then-propose**: Step 2 copies absent payload files and updates provably unmodified ones, and only then does Step 3 analyse capabilities and write a plan. `references/adapt.md` makes this explicit — landed files are to be described "as landed, never as tasks", followed by a task telling you to review what already happened.

That ordering has three consequences:

1. `SKILL.md`'s hard rule *"It proposes; it never implements"* is false of the run as a whole.
2. The plan is a **changeset list**, not a destination. A reader assembles the picture of their repo from N reason lines and a file inventory.
3. There is no place to state what a sync **costs**. The never-overwrite guarantee covers the file copy, so losses look like zero — but the real losses live in the grafts: a superseded local mechanism, a new obligation, a convention you can no longer do your own way.

Constraints that do not move: the payload is prose, so nothing here is testable by a suite; the clone stays read-only; local authorship is never overwritten; verdicts keep one store.

## Goals / Non-Goals

**Goals:**
- Make `/wong-sync` write no repo changes, so its own hard rule is true and the review gate is the repo's existing loop.
- Give the adopter one document that says what their repo becomes, what they gain, and what they lose.
- Remove the self-update exemption without losing the "run under the newest logic" property.
- Keep the run non-interactive.

**Non-Goals:**
- The two-subagent analysis, the capability unit, the five verdicts, and the verdict record's format and tick surface all stay as they are.
- No change to the payload manifest, `/wong-setup`, or `/apply`'s own contract.
- No deduplication of sync plans, and no detection of an unapplied one.

## Decisions

### 1. The gate is the loop, not a prompt

`/wong-sync` writes exactly two things: `.claude/wong-sync-verdicts.md` and one `openspec/changes/sync-wongstack-<date>/`. Everything it wants done is a task.

**Why not an interactive gate.** A yes/no prompt in a terminal is worse on every axis than the loop already in this repo: a plan is reviewable when the reader has time, editable before it runs, and travels in a PR diff. It also needs no new mechanism. `adapt.md`'s existing rationale — that avoiding a per-capability prompt wall is worth the loss of a gate — survives, but its framing inverts: the gate is now the loop, so nothing is traded away. **The approval decision is never a prompt.** That is distinct from asking a bounded number of clarifying questions before the plan exists, which Decision 8 permits.

**Rejected:** `/wong-sync` gaining an `--apply` flag. It restores the contradiction for the sake of one saved command.

### 2. Following the clone's instructions is a read, not a write

The self-update pass conflated two things:

| | today | now |
|---|---|---|
| which instructions **this run** follows | requires writing the file first | read `$WS/.claude/skills/wong-sync/**` — no write |
| which instructions are **installed here** | happens before the gate | an ordinary task in the plan |

The blob-hash proof still decides the first: only when the local copy is provably unmodified does the run adopt the clone's text — a locally edited `wong-sync` was changed on purpose and keeps running under its own instructions, with the adaptation proposed as usual. The re-read discipline is unchanged (discard the loaded text, re-run Step 0 against the new one, never refresh the clone twice). The "at most once" rule is no longer needed to stop a loop, because there is no write to loop on, but the never-re-fetch rule stays.

Disclosure is kept and strengthened: the run states which version's logic it followed and why, because a run that behaved like a version other than the installed one is exactly when a reader needs to know which text to consult.

### 3. The after-picture is the proposal

`proposal.md` gets four regions in a fixed order:

```
 After       how this repo works once this lands, in its own terms
 Gain        grouped by what the repo will be able to DO
              └─ each group names what it replaces here
 Lose        superseded mechanisms · new obligations · lost optionality
 Resolution  which parts are sharp · which are "shape it with /plan"
```

**Grouping, not enumeration.** A first sync lands ~60 files. Flat, that is a wall nobody finishes reading, and the Gain region degrades into a file inventory. Grouping by capability keeps the same shape readable at both scales, and it is what the cartographer already produces.

**Resolution is the honesty valve.** `adapt.md` already concedes some grafts cannot be described concretely and become a *shape it with `/plan`* task. A destination narrative invites confident invention, and a picture sharper than the truth is worse than a task list, because it gets approved. So the picture states its own resolution rather than smoothing it.

**Why this dissolves the `present` leak.** The bias toward `adopt` already exists, but `divergent` was given an earned bar and `present` was not, and no verdict expresses *partially* present. You cannot write "here is your repo after this" without confronting partial coverage, because the After region is concrete and in the repo's own terms. As a cheap backstop, a `present` reason line must now **name where this repo expresses the capability**; unattributable, it is `adopt`, exactly as an unattributable difference is already `adopt` rather than `divergent`.

### 4. Seed manifest copies first

A seed manifest (`version` and `commit` both null) means `/wong-setup` just handed off and every payload file is absent — the bulk copy *is* the install, and there is no existing repo state for it to supersede. Gating it buys nothing and costs a round trip at the least convenient moment.

So on that one path the files land first and the after-picture describes them as landed, exactly as `adapt.md` does today; the plan's tasks are the grafts only. Every other run is plan-first. An **absent** manifest is unchanged: stop, point at `/wong-setup`.

### 5. Declining is a tick on the record, not a deleted task

The plan-first flow makes `declined` genuinely reachable for the first time — but only if refusal has somewhere to go. Deleting a task, or simply never running `/apply`, tells the record nothing, and the capability is re-proposed forever.

**Decision: make the `adopt` lines checkboxes too.** Every other group in `.claude/wong-sync-verdicts.md` is already a checkbox, and the file's whole interactive surface is already *tick a box to overrule the verdict*. Extending it to the one group that lacks one makes the surface uniform and the semantics symmetric:

- tick a **non-`adopt`** line → force it to `adopt` next run (unchanged)
- tick an **`adopt`** line → record it `declined` next run, judged against the current clone commit

**Rejected: `/apply` reports back what it skipped.** It couples a generic verb to one skill's bookkeeping, and it cannot distinguish "not wanted" from "not done yet".

**Rejected: a not-wanted marker in `tasks.md`.** It would put a verdict outside the record, breaking the one-store rule, and would require scanning change folders including archived ones.

An unapplied plan therefore stays re-proposed — which is correct. Not yet done is not a refusal.

### 6. The manifest records payload state, not what was examined

`version`/`commit` mean **which upstream release this repo's payload files were brought to**. That is a file-level fact, so the manifest write groups with the file-landing tasks and is the last of them. No files landed → no manifest write, and the next run walks the same changelog span again.

Partial acceptance needs no special rule, because the two facts have separate stores: files are tracked by the manifest, capability adoption by the verdict record — which recomputes every verdict except `declined` on every run. Take the files and three of four grafts, and the fourth is recomputed and re-proposed next run whether or not the version advanced. Nothing hides.

### 7. Task granularity

One coarse task for the file moves (*copy the N files listed in `proposal.md`*, and the same for updates), because sixty tasks is a wall and because a model hand-copying files is slower and less reliable than the scripted operation it replaces. Each graft stays one task at the existing concreteness bar — capability id named, described in this repo's terms.

The *"review the N files this sync landed"* task is removed. It existed because files landed before review; nothing lands unreviewed now.

### 8. A bounded clarification stage, before the plan

Between the subagent reports and verdict assignment — the only point where the run knows what is ambiguous and has committed to nothing — the skill MAY ask the user a small number of questions.

**What this is not.** It is not approval, and it is not per-capability. *"Do you want capability X?"* is never asked: that is what the plan is for, and the review is the answer. Asking it would rebuild the prompt wall Decision 1 exists to avoid.

**The scope is narrow by construction.** The adopt-bias already resolves uncertainty about *evidence* — in doubt means `adopt`, because a wrong `adopt` costs seconds in review. Asking must not erode that, so a question is only permitted where no amount of reading the repo could settle it, because the missing fact is the **user's intent**:

| question | why the bias can't settle it |
|---|---|
| Is this local difference deliberate? | `divergent` needs a *deliberate* alternative; the skill can see the mechanism but not the intent |
| Is this unmet `assumes` a gap or a choice? | `not-applicable` turns on whether the repo *wants* the assumption met |
| Which of two shapes should this graft take here? | otherwise it degrades to a *shape it with `/plan`* task |

The first two are the leaks found in `/explore`: `divergent` attribution, and the `assumes` check acting as a pre-filter ahead of the bias.

**Bounds are a test, not a quota.** A fixed cap is wrong at both ends: three is an interview for a one-file update and far too few for a first sync over the whole payload, where genuine ambiguity scales with what is being adopted. So each question must earn its place on its own:

1. **The answer changes the plan** — a different verdict, or a concrete graft where the alternative was a *shape it with `/plan`* task. A question whose answers all produce the same plan is not asked.
2. **The repo cannot answer it.** Anything the surveyor could establish by reading is read, not asked.
3. **It is about intent**, per the table above.

Questions are asked in one batch, grouped, ordered by how much the answer changes — so the user can answer the top few and stop. Every question states what happens if it goes unanswered.

**The user is the real cap.** Because an unanswered question resolves toward `adopt`, stopping partway is a supported way to answer: the rest fall to the bias and the plan is still written. That is what makes an unbounded count safe, and it is why no number is specified.

**Unanswered means the bias.** In a non-interactive context — cron, headless, a piped run — or when the user skips, the run proceeds and each unanswered question resolves toward `adopt`. The property from Decision 1 therefore holds unconditionally: a run that is never answered still completes and still writes a plan. Questions improve the plan's inputs; they are never load-bearing for it.

**Answers are durable, in the store that already exists.** An answer becomes the reason line of the verdict it produced, marked as the user's word rather than the skill's reading — the same *who decided* axis the taxonomy already splits on. A question is not re-asked while the clone commit it was answered against is unchanged, exactly as a `declined` is not re-pitched until upstream moves. The verdict itself still recomputes every run; only the question is suppressed. No new file, no second store.

**Rejected:** asking during the file classification. Copy-if-absent and update-if-untouched are proofs, not judgments — there is nothing to ask.

## Risks / Trade-offs

- **Every sync now needs a second command.** A one-file update that used to land in the working tree now needs `/apply`. → The plan for such a run is one coarse task, and `/apply` is one command; the run's report names the folder and says so.
- **The run must faithfully follow instructions it read but did not install.** → Identical to the discipline the current self-update pass already requires ("discard the text you were running under"); the only change is that no write accompanies it.
- **Stale sync plans can accumulate**, since duplicates are accepted by design. → The report names any existing `sync-wongstack-*` folder it did not write, so an unapplied one is visible rather than quietly superseded.
- **The after-picture can overstate.** A narrative reads as more certain than a task list, and it is the thing being approved. → The Resolution region is mandatory, and a graft that cannot be described concretely must appear there rather than be smoothed into the After region.
- **A repo on an old installed `wong-sync` behaves like the old version.** → Expected and already handled: it proposes its own update through the ordinary path, and its report says which version's logic ran.
- **Questions could erode the adopt-bias**, turning "in doubt, propose" into "in doubt, ask" and making the run feel like an interview. → The permitted kinds are enumerated rather than described, each question must pass the changes-the-plan test, they arrive in one ordered batch the user can abandon partway, and every unanswered one resolves toward `adopt` — so the bias is the default rather than the exception.
- **Seed-manifest copy-first is a documented exception to the headline rule.** → It is stated in `SKILL.md`'s hard rules rather than buried in a step, so "writes nothing" is never read as unconditional.

## Migration Plan

Payload-only, so there is no runtime migration. Per `CLAUDE.md`: major `VERSION` bump to `11.0.0`, a newest-first `CHANGELOG.md` entry marking the breaking items, and `node scripts/check-payload-links.mjs`. Target repos need no action — an installed copy keeps working and proposes its own update on the next run. Existing `sync-wongstack-*` and `adopt-wongstack-*` folders are left alone.

## Open Questions

None. The two carried from `/explore` — soft declines and partial acceptance — are settled in Decisions 5 and 6.

<!-- end design.md -->
<!-- file tasks.md utf8 5042 -->
## 1. `wong-sync` SKILL.md — the run writes nothing

- [x] 1.1 Rewrite the opening flow diagram and the "Updating is adaptation, not replication" paragraph: the run analyses, writes one plan, and stops; `/apply` performs it and `/save` checkpoints. Keep the copy-if-absent / update-if-untouched / adapt-if-authored *classification* — only the writing moves.
- [x] 1.2 Rewrite the three rules under the diagram: the write scope becomes `.claude/wong-sync-verdicts.md` plus one change folder, with the seed-manifest copy named as the single exception. Keep never-overwrite-local-authorship, no-git-here, and read-only-clone intact.
- [x] 1.3 Replace "The self-update pass: first, and once" with the follow-without-installing rule: same blob-hash proof, read `SKILL.md` + `references/**` from `$WS`, discard the loaded text, re-run Step 0 against it, never re-fetch the clone, and install as an ordinary task. Drop the at-most-once rule and say why it is no longer needed. Keep the version-skew disclosure.
- [x] 1.4 Restructure Step 2 into classification-without-writing, and state the seed-manifest exception (`version` and `commit` both null → copy first, because the copy is the install). Keep the absent-manifest behaviour — stop, point at `/wong-setup` — unchanged.
- [x] 1.5 Fold Step 4's manifest rewrite into the plan as its last file task, and restate `version`/`commit` as payload state — which release this repo's files were brought to — per design.md decision 6.
- [x] 1.6 Update Step 3's summary to name the clarification stage, and update Step 5's report: which version's logic ran and why, any questions asked and how each resolved, the planned copies and updates, the change folder to review and `/apply`, and any pre-existing unapplied `sync-wongstack-*` folder.
- [x] 1.7 Rewrite the Hard rules block to match, adding the writes-nothing rule with its seed-manifest exception stated in the same place.

## 2. `wong-sync` references/adapt.md — the after-picture

- [x] 2.1 Rewrite "The output" so `proposal.md`'s contract is the four regions — After, Gain, Lose, Resolution — with the version span, file lists, and verdict-record pointer subordinate to them. Include the grouping rule (by capability, never a flat file list) and the empty-Lose justification rule.
- [x] 2.2 Rewrite the `tasks.md` contract: coarse tasks for copies, updates, self-install, then the manifest task ordered last among them, then one task per `adopt`. Remove the "review the N files this sync landed" task and say why it is gone.
- [x] 2.3 Rewrite the folder-writing trigger from "did or proposes anything" to "has anything to do", and add that an existing unapplied sync folder never suppresses a new one — the report names it instead.
- [x] 2.4 Add the `present` evidence bar to the gap-analysis rules, mirroring the `divergent` paragraph: name where this repo expresses it, or the verdict is `adopt`.
- [x] 2.5 Extend the verdict record's shape and Promotion section: every group is checkboxes including `adopt`; ticking a non-`adopt` line promotes, ticking an `adopt` line records `declined` with the clone commit. State that a deleted or unapplied task is not a refusal.
- [x] 2.6 Add the clarification stage to the gap-analysis section, positioned between the subagent reports and verdict assignment, per design.md decision 8: the three permitted question kinds, the forbidden ones (never "do you want X", never approval), the per-question admission test (changes the plan, unreadable from the repo, about intent) in place of any fixed count, one impact-ordered batch the user may abandon partway, unanswered-resolves-to-`adopt`, and answers recorded as the user's word with the clone commit so they are not re-asked.
- [x] 2.7 Rewrite the non-interactive rationale (currently framed as a trade against a per-capability prompt wall) as a trade now won: the run stays non-interactive *and* gates, because the gate is the repo's loop.
- [x] 2.8 Update the report format section for the new run shape, and correct every "landed" / "already in the working tree" phrasing left elsewhere in the file.

## 3. Release

- [x] 3.1 Bump `VERSION` to `11.0.0`.
- [x] 3.2 Add the newest-first `CHANGELOG.md` entry, marking the three breaking items (the run writes nothing, the proposal becomes an after-picture, the self-update pass is retired) and what a target repo must do — nothing.
- [x] 3.3 Run `node scripts/check-payload-links.mjs` and fix any dead link it reports.

## 4. Consistency sweep (found during apply)

- [x] 4.1 Repoint `wong-setup`'s manifest-schema link from the retired `#step-4--rewrite-the-manifest-always-last` anchor to the new manifest section.
- [x] 4.2 Update the `WONG-STACK` block's "Stay in sync" rule and the two source-repo preamble sentences in `AGENTS.md` (`CLAUDE.md` is a symlink to it) — the block ships, so its description of the run had to stop saying it copies and updates during the run.
- [x] 4.3 Correct the one stale "copies in what's missing" sentence in `wiki/stack/d1-pipeline.md`.

<!-- end tasks.md -->
<!-- file specs/wong-sync-adapt/spec.md utf8 19162 -->
# wong-sync-adapt Specification (delta)

## RENAMED Requirements

- FROM: `### Requirement: The user can overrule any non-adopt verdict by ticking a box`
- TO: `### Requirement: The user can overrule any verdict by ticking a box`

## ADDED Requirements

### Requirement: A bounded clarification stage precedes verdict assignment

After the subagent reports return and before verdicts are assigned, `/wong-sync` MAY ask the user clarifying questions. The stage SHALL be bounded as follows.

**Permitted questions** are only those the evidence cannot settle because the missing fact is the user's intent:

- whether a local difference the skill can see is **deliberate**, which is what `divergent` requires and what the repo cannot show;
- whether an unmet `assumes` is a **gap or a choice**, which decides `not-applicable`;
- **which of two materially different shapes** a graft should take in this repo, where the alternative is a task that says to shape it with `/plan`.

**Forbidden questions.** The skill SHALL NOT ask whether the user wants a capability, SHALL NOT ask for approval of the plan or of any part of it, and SHALL NOT ask anything answerable by reading the repo. Approval SHALL remain the review of the written change.

**Bounds.** There SHALL NOT be a fixed limit on the number of questions, because genuine ambiguity scales with what is being adopted: a one-file update and a first sync over the whole payload do not warrant the same count. Each question SHALL instead qualify on its own by meeting all three of:

1. its answer changes the plan — a different verdict, or a concrete graft where the alternative is a task saying to shape it with `/plan`;
2. the repo cannot answer it by being read;
3. it concerns intent, per the permitted kinds above.

Questions SHALL be asked in one batch rather than serially, ordered by how much the answer changes, so that answering the first few and stopping is a supported outcome. Each SHALL state what happens if it is not answered.

**Unanswered resolves toward `adopt`.** Where the run is non-interactive, or the user declines to answer, the run SHALL proceed and each unanswered question SHALL resolve to the verdict the adopt-bias would give. A run SHALL always complete and write its plan without any answer.

**Answers are durable and attributed.** An answer SHALL become the reason line of the verdict it produced, recorded as the user's word rather than the skill's reading, carrying the clone commit it was answered against. The same question SHALL NOT be asked again while that commit is unchanged; if the capability's upstream expression has since changed, it MAY be asked again. The verdict itself SHALL still be recomputed every run, per the re-evaluation rule.

#### Scenario: A deliberate local alternative is confirmed

- **WHEN** the skill finds a local mechanism that may cover a capability but cannot tell whether it is deliberate
- **THEN** it may ask, and a confirming answer yields `divergent` with the mechanism named and attributed to the user

#### Scenario: An unmet assumption is a gap, not a choice

- **WHEN** a capability assumes CI checks and the repo has none
- **THEN** the skill may ask whether that is deliberate
- **AND** an answer that it is not yields `adopt` rather than `not-applicable`

#### Scenario: Approval is never asked

- **WHEN** the clarification stage runs
- **THEN** no question asks whether the user wants a capability, or whether to proceed
- **AND** the plan is written and reviewed regardless of the answers

#### Scenario: A non-interactive run completes

- **WHEN** `/wong-sync` runs where no user can answer
- **THEN** it asks nothing, resolves every open question toward `adopt`, and writes its plan

#### Scenario: A large sync asks more than a small one

- **WHEN** a first sync over the whole payload raises many qualifying ambiguities
- **THEN** each qualifying question is asked, in one ordered batch
- **AND** no fixed limit truncates them

#### Scenario: A question that would not change the plan is not asked

- **WHEN** every possible answer to an ambiguity produces the same verdict and the same task
- **THEN** the question is not asked and the analysis proceeds

#### Scenario: The user answers some and stops

- **WHEN** the user answers the first questions in the batch and leaves the rest
- **THEN** the answered ones inform their verdicts and the unanswered ones resolve toward `adopt`
- **AND** the plan is written

#### Scenario: An answered question is not re-asked

- **WHEN** a later run reaches the same ambiguity and the capability's upstream expression is unchanged since the answer
- **THEN** the question is not asked again and the recorded answer stands as the reason
- **AND** the verdict is still recomputed

## MODIFIED Requirements

### Requirement: Capability adaptation is the default and only analysis path

Every `/wong-sync` run SHALL, after refreshing the clone and classifying the payload files, run the capability analysis over the payload files that already exist locally. The skill SHALL take no arguments and SHALL expose no alternative mode. The analysis SHALL NOT modify any existing file in the target and SHALL NOT run any git command in the target.

On a **seed manifest** the payload files are copied before the analysis, so the analysis has nothing present to weigh them against. On every other run nothing has been written when the analysis runs, so the classification of each file — copy, update, or adapt — is an input to the plan rather than a description of what already happened.

#### Scenario: An ordinary run analyses rather than diffs

- **WHEN** the user runs `/wong-sync` in an installed repo
- **THEN** no three-way diff is performed and no file is overwritten
- **AND** the capability analysis runs over the payload surfaces the repo already has

#### Scenario: A fully-absent repo needs no analysis of what it lacks

- **WHEN** every payload file is missing locally (a seed manifest)
- **THEN** the files are copied directly and the analysis has nothing present to weigh them against

#### Scenario: The analysis runs before anything has changed

- **WHEN** a run on an installed repo reaches the analysis
- **THEN** no payload file has been written yet, and the planned copies and updates are inputs to the proposal

#### Scenario: No manifest at all

- **WHEN** `/wong-sync` runs in a repo with no `.claude/.wong-stack.json`
- **THEN** it stops and points at `/wong-setup`

### Requirement: The analysis proposes and never implements

The analysis SHALL write exactly two kinds of artifact and nothing else:

1. `.claude/wong-sync-verdicts.md` — the durable verdict record, specified below.
2. An OpenSpec change folder at `openspec/changes/sync-wongstack-<YYYY-MM-DD>/`, written whenever the run **has anything to do** — that is, when it plans a copy or an update, plans to install its own newer version, or verdicts at least one capability `adopt`.

The folder SHALL contain a proposal and a tasks list:

- **`proposal.md`** SHALL be the after-picture specified by the `wong-sync-after-picture` capability — After, Gain, Lose, Resolution — carrying the version span synced, the files to be copied and updated, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted. Because nothing has landed when it is written, planned file changes SHALL be described as tasks rather than as landed — **except on a seed manifest**, where the copy has already happened and is described as landed.
- **`tasks.md`** SHALL carry the file work as **coarse tasks** — one for the copies, one for the updates, one for installing a newer `wong-sync`, and one, ordered last among them, to rewrite the manifest to reflect the files that actually landed — followed by **one task per `adopt` capability**. There SHALL NOT be a task to review files the sync landed, because no file lands unreviewed.

The folder SHALL NOT be written when the run plans no file change and has no `adopt`. The work is performed later through the normal loop (`/apply` → `/save` → `/ship`). Each adoption task SHALL name its capability id and describe the graft in this repo's terms — which file or convention it touches and what done looks like.

Change folders written under the earlier `adopt-wongstack-<YYYY-MM-DD>` name SHALL be left as they are; no rename or migration of existing folders is performed. An existing unapplied sync folder SHALL NOT suppress a new one — a changed situation deserves a changed plan — and the report SHALL name any `sync-wongstack-*` folder the run did not write, so an unapplied plan is visible rather than quietly superseded.

#### Scenario: Nothing else is touched

- **WHEN** a run completes on an installed repo
- **THEN** the only paths written are `.claude/wong-sync-verdicts.md` and the change folder
- **AND** the user is directed to review the change and run `/apply`

#### Scenario: A file-only run still produces a plan

- **WHEN** a run plans copies or updates but verdicts nothing `adopt`
- **THEN** the change folder is written, its proposal is the after-picture, and its tasks carry the coarse file work
- **AND** there is no task asking the user to review files that landed

#### Scenario: File work is coarse, grafts are not

- **WHEN** a run plans sixty file copies and two adoptions
- **THEN** the copies are one task naming the proposal's file list, and each adoption is its own task at the concreteness bar

#### Scenario: The manifest task is last among the file tasks

- **WHEN** the tasks list is written
- **THEN** the manifest rewrite is ordered after the copy, update, and self-install tasks, so it records what actually landed

#### Scenario: Existing sync change is never overwritten

- **WHEN** a change folder for today's date already exists
- **THEN** a suffixed sibling (`-2`, `-3`) is created and the existing folder is left untouched

#### Scenario: An unapplied plan does not block a new one

- **WHEN** a previous run's sync folder exists and was never applied
- **THEN** this run writes its own plan anyway
- **AND** the report names the older folder so it is visible

#### Scenario: Tasks are concrete

- **WHEN** a task is written for an `adopt` capability
- **THEN** it names the capability id and states what changes in this repo, not merely the upstream feature's name

#### Scenario: A no-op run writes no folder

- **WHEN** a run plans no file change and verdicts nothing `adopt`
- **THEN** no change folder is created
- **AND** `.claude/wong-sync-verdicts.md` is still written, and the report says the repo is current and points at it

#### Scenario: Prior adopt-named folders are left alone

- **WHEN** the target contains folders named `adopt-wongstack-<date>` from earlier versions
- **THEN** they are neither renamed nor rewritten, and new runs use the `sync-wongstack-<date>` name

#### Scenario: Target without OpenSpec

- **WHEN** the target has no `openspec/changes/` directory
- **THEN** the verdict record is still written and the report explains that the change could not be written

### Requirement: The user can overrule any verdict by ticking a box

In `.claude/wong-sync-verdicts.md`, **every** capability SHALL be written as an unticked Markdown checkbox line carrying its capability id, in every verdict group including `adopt`. Ticking a box SHALL be the supported way to overrule the skill's verdict, and SHALL be the only edit to the file the skill honors.

Before regenerating the file, each run SHALL read the existing one and collect every ticked capability id. Ticking SHALL be interpreted by the group the line was in:

- A ticked capability **not** verdicted `adopt` SHALL be force-verdicted `adopt` for that run and written as a task in the change folder, regardless of what the analysis would otherwise have assigned. Where it was previously `declined`, that prior refusal SHALL cease to suppress it — asking for the capability is how a previous refusal is reversed.
- A ticked capability verdicted `adopt` SHALL be recorded `declined` for that run, carrying the clone commit it was judged against, and SHALL NOT be written as a task. This is the supported way to refuse an adoption, and it is what makes `declined` reachable: deleting a task, or simply never running `/apply`, SHALL NOT be read as a refusal, because not yet done is not a refusal.

The regenerated file SHALL show each capability under the group its tick moved it to, so a tick is visibly acted on rather than silently consumed. The run's report SHALL name every capability promoted and every capability declined this way.

#### Scenario: Ticking promotes a not-applicable capability

- **WHEN** the user ticks a `not-applicable` entry and runs `/wong-sync` again
- **THEN** that capability is verdicted `adopt` and gets a task in the change folder

#### Scenario: Ticking reverses a decline

- **WHEN** the user ticks a `declined` entry and runs `/wong-sync` again
- **THEN** the capability is verdicted `adopt`, its prior refusal no longer suppresses it, and the regenerated record shows it as adopted

#### Scenario: Ticking an adopt records a decline

- **WHEN** the user ticks an `adopt` entry and runs `/wong-sync` again
- **THEN** the capability is recorded `declined` with the clone commit it was judged against, gets no task, and is named in the report

#### Scenario: An unapplied task is not a refusal

- **WHEN** a plan's adoption task is deleted or simply never applied, with no box ticked
- **THEN** no capability is recorded `declined`
- **AND** the capability is recomputed and re-proposed on the next run

#### Scenario: A tick is visibly acted on

- **WHEN** a ticked capability has been promoted or declined
- **THEN** it appears under its new group in the regenerated file and is named in the report

#### Scenario: Untouched file changes nothing

- **WHEN** the user ticks nothing between runs
- **THEN** no verdict is overruled and the analysis's own verdicts stand

### Requirement: One verdict per capability

The main thread SHALL assign every mapped capability exactly one verdict:

- **present** — the repo already has it, current, through a named local expression.
- **divergent** — the repo solves it differently through a named, deliberate local alternative; no graft is proposed.
- **adopt** — missing, stale, or otherwise wanted here.
- **not-applicable** — the skill judged that it does not fit: an `assumes` this repo does not meet.
- **declined** — the user said no.

The taxonomy SHALL be split by **who decided**. `not-applicable` SHALL be the only verdict the skill may assign on its own judgment of poor fit, and `declined` SHALL be written **only** from a decision the user actually made — a ticked `adopt` line, or a refusal the user stated — never from the skill's own inference.

**The bias SHALL point toward `adopt`.** When the evidence supports both `adopt` and any other verdict, the verdict SHALL be `adopt` — an `adopt` is reviewed downstream in the proposed change, while every other verdict is effectively final until someone reads the record, so the costs of a wrong call are asymmetric.

**`divergent` SHALL require a named, deliberate local alternative.** Its reason line MUST name the local mechanism — a file, convention, or tool — that covers the capability. A difference the skill cannot attribute to a local decision SHALL be verdicted `adopt`, not `divergent`.

**`present` SHALL require named local evidence.** Its reason line MUST name where this repo expresses the capability — a path, a convention, or a tool. A capability the skill believes present but cannot attribute to anything in this repo SHALL be verdicted `adopt`, on the same reasoning that governs `divergent`.

**A graft that cannot yet be described concretely SHALL be verdicted `adopt`**, with a task that says to shape the graft with the repo's own `/plan`, and SHALL be named in the proposal's Resolution region. It SHALL NOT be demoted to `not-applicable` — that verdict is reserved for an unmet `assumes`, a fit failure, and MUST NOT be used to record the skill's inability to express a graft.

Every verdict SHALL carry a one-line reason. Only `adopt` verdicts SHALL become tasks. `divergent` and `not-applicable` findings SHALL be listed one line each in the durable verdict record and SHALL NOT be proposed as work.

A payload file that exists locally, is behind upstream, and is **not** provably unmodified (per the `wong-sync` capability's update-if-untouched rule — e.g. a copy from a fork or an edited lineage) SHALL be verdicted `adopt` with a task instructing that the upstream version be taken verbatim. A provably unmodified stale file is planned as a direct update and does not reach this analysis as stale. There SHALL NOT be a separate verdict for either case — the distinction lives in the task text, not the taxonomy.

#### Scenario: A capability solved deliberately differently is left alone

- **WHEN** the repo achieves a capability through its own mechanism and the skill can name that mechanism
- **THEN** the verdict is `divergent`, the local form is named in the reason, and no adoption task is written

#### Scenario: An unattributable difference is adopted, not excused

- **WHEN** the repo's form of a capability differs from upstream and the skill cannot point at a deliberate local alternative
- **THEN** the verdict is `adopt`, not `divergent`

#### Scenario: An unattributable present is adopted

- **WHEN** the skill judges a capability present but cannot name the local path, convention, or tool that expresses it
- **THEN** the verdict is `adopt`, not `present`

#### Scenario: In doubt means adopt

- **WHEN** the evidence for a capability supports both `adopt` and another verdict
- **THEN** the verdict is `adopt` and the gap surfaces in the reviewable proposal

#### Scenario: An unmet assumption is the skill's call, not the user's

- **WHEN** a capability assumes CI checks and the repo has no forge checks
- **THEN** the verdict is `not-applicable` with the assumption named
- **AND** it is not recorded as `declined`

#### Scenario: A graft that cannot be made concrete is still proposed

- **WHEN** the main thread cannot describe a graft in this repo's terms
- **THEN** the verdict is `adopt`, its task says to shape the graft with `/plan`, and it is named in the proposal's Resolution region
- **AND** it is not verdicted `not-applicable`

#### Scenario: Declined requires an actual refusal

- **WHEN** a run completes without the user having ticked an `adopt` line or refused anything
- **THEN** no capability is newly verdicted `declined`

#### Scenario: Stale file that is not provably unmodified

- **WHEN** a payload file is behind upstream and its content matches no historical upstream version
- **THEN** the verdict is `adopt` and its task says to replace the file with the upstream version verbatim
- **AND** the file is not overwritten by the sync itself

#### Scenario: Only adopt becomes work

- **WHEN** verdicts are assigned
- **THEN** the proposed change contains one task per `adopt` capability, plus the coarse file tasks, and no task for any other verdict

<!-- end specs/wong-sync-adapt/spec.md -->
<!-- file specs/wong-sync-after-picture/spec.md utf8 5654 -->
# wong-sync-after-picture Specification

## Purpose

The destination narrative a `/wong-sync` run produces instead of a changeset list: what this repo becomes, what it gains, what it loses, and how sharp the picture actually is.

## ADDED Requirements

### Requirement: The proposal is an after-picture, in four regions

The `proposal.md` of a sync change SHALL be written as a destination narrative with four regions, in this order:

1. **After** — how this repo works once the change lands, described in the repo's own terms rather than upstream's.
2. **Gain** — what the repo will be able to do, each item naming what it replaces here.
3. **Lose** — what adopting costs, in three classes: **superseded local mechanisms**, **new obligations**, and **lost optionality**.
4. **Resolution** — which parts of the picture are sharp and which are not yet shaped.

The version span synced, the files involved, and a pointer to `.claude/wong-sync-verdicts.md` SHALL still appear, subordinate to these regions rather than as the document's structure.

#### Scenario: A reader learns what their repo becomes

- **WHEN** a sync change is written
- **THEN** its proposal opens with how this repo works after the change, in this repo's terms
- **AND** a reader can answer "what will my repo be" without assembling it from a file list

#### Scenario: The regions are not optional

- **WHEN** a sync change is written
- **THEN** all four regions are present, and a region with no content says so explicitly rather than being omitted

### Requirement: Gain is grouped by capability, never enumerated by file

The **Gain** region SHALL group by what the repo will be able to **do**, with files subordinate to the group they serve. It SHALL NOT be written as a flat list of files or of skill names.

This keeps one format readable at both scales: an incremental sync of two files and a first sync of the whole payload produce the same shape, differing in length rather than in kind.

#### Scenario: A first sync stays readable

- **WHEN** a sync involves the whole payload
- **THEN** the Gain region is grouped by capability, with file detail subordinate
- **AND** it is not a flat inventory of every file

#### Scenario: A one-file sync uses the same shape

- **WHEN** a sync involves a single updated file
- **THEN** the proposal has the same four regions, shorter, rather than a different format

### Requirement: The Lose region states what adopting costs

The **Lose** region SHALL state what the repo gives up, drawn from the grafts rather than from the file copy. It SHALL cover, where each applies:

- **superseded local mechanisms** — a local file, convention, or tool that the graft replaces as the way things are done here;
- **new obligations** — process the repo must now follow that it did not before;
- **lost optionality** — a choice the repo can no longer make its own way without diverging.

An empty Lose region SHALL be justified rather than left blank: the never-overwrite guarantee covers the *file copy* only, so "nothing is overwritten" SHALL NOT be offered as evidence that a sync costs nothing.

#### Scenario: A graft that replaces a local mechanism

- **WHEN** an adopted capability supersedes a convention the repo already had
- **THEN** the Lose region names that local mechanism and says it stops being the way things are done here

#### Scenario: A graft that adds process

- **WHEN** an adopted capability requires work to pass through a branch, a pull request, or a CI gate that the repo did not use
- **THEN** the Lose region records that obligation

#### Scenario: Nothing is lost

- **WHEN** a sync genuinely supersedes nothing and adds no obligation
- **THEN** the Lose region says so and gives the reason, rather than being omitted or left empty

### Requirement: The picture states its own resolution

The **Resolution** region SHALL distinguish the parts of the After picture that are concrete from those that are not yet shaped. A capability verdicted `adopt` whose graft cannot be described in this repo's terms SHALL appear here, named, as work to be shaped with the repo's own `/plan` — and SHALL NOT be written into the After region as though it were settled.

A narrative reads as more certain than a task list and it is the artifact being approved, so overstatement is the failure this region exists to prevent.

#### Scenario: An unshaped graft is disclosed

- **WHEN** an adopted capability's graft cannot yet be described concretely
- **THEN** it is named in the Resolution region as needing `/plan`
- **AND** the After region does not describe its outcome as settled

#### Scenario: A fully concrete run says so

- **WHEN** every adopted capability has a concrete graft
- **THEN** the Resolution region states that the picture is sharp throughout

### Requirement: Present verdicts name their local evidence

A capability verdicted `present` SHALL have a reason line naming **where this repo expresses it** — a path, a convention, or a tool. A capability the skill believes is present but cannot attribute to anything in this repo SHALL be verdicted `adopt`.

This mirrors the bar already carried by `divergent`, and backs up the after-picture: a region claiming the repo already does something must be able to point at where.

#### Scenario: A present verdict points at the repo

- **WHEN** a capability is verdicted `present`
- **THEN** its reason line names the local path, convention, or tool that expresses it

#### Scenario: An unattributable present becomes adopt

- **WHEN** the skill judges a capability present but cannot name where this repo expresses it
- **THEN** the verdict is `adopt`

<!-- end specs/wong-sync-after-picture/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 15310 -->
# wong-sync Specification (delta)

## ADDED Requirements

### Requirement: A sync run writes no repo files

`/wong-sync` SHALL write exactly two paths in the target: `.claude/wong-sync-verdicts.md` and one OpenSpec change folder. Every other change it wants — copying an absent payload file, updating a provably unmodified one, inserting the `WONG-STACK` block, installing its own newer version, rewriting the manifest — SHALL be written as a task in that change and performed later by `/apply`.

This makes the skill's stated rule — *it proposes; it never implements* — true of the whole run rather than of one step, and makes the review gate the repo's own change loop rather than a prompt inside the skill. The run SHALL remain non-interactive.

**One exception, by name:** a **seed manifest** (`version` and `commit` both null, meaning `/wong-setup` has just handed off) SHALL cause the payload files to be copied before the analysis, because on that path the bulk copy *is* the install and there is no existing repo state for it to supersede. An **absent** manifest is unchanged: the run stops and points at `/wong-setup`.

#### Scenario: An ordinary run changes no file

- **WHEN** `/wong-sync` runs in an installed repo with payload files absent, stale, or both
- **THEN** no payload file is written, and the intended copies and updates appear as tasks in the change folder
- **AND** the only paths written are the verdict record and the change folder

#### Scenario: The gate is the loop

- **WHEN** a run finishes with a plan to review
- **THEN** the user reviews, edits, or discards the change, and `/apply` performs it
- **AND** the skill asks no interactive question during the run

#### Scenario: Seed manifest copies first

- **WHEN** the manifest's `version` and `commit` are both null
- **THEN** every payload file is copied in as the install before the analysis runs
- **AND** the proposal describes those files as landed rather than as tasks

#### Scenario: The exception is stated where the rule is

- **WHEN** a reader consults the skill's hard rules
- **THEN** the seed-manifest exception is stated alongside the writes-nothing rule, so the rule is never read as unconditional

### Requirement: The run follows upstream's instructions without installing them

Following the newest instructions and installing them SHALL be separate acts. After the clone is refreshed, `/wong-sync` SHALL apply the provably-unmodified proof to its own skill directory — `SKILL.md` and `references/**` under the local `wong-sync` path — and:

- **Provably unmodified and stale** → the run SHALL read `SKILL.md` and `references/**` **from the clone**, discard the instructions it was running under, re-run the manifest-resolution step against the newer text, and follow it for the remainder of the run. It SHALL NOT write those files; installing them SHALL be an ordinary task in the change folder.
- **Not provably unmodified** → the run SHALL continue under the installed text and SHALL NOT read the clone's version in its place. A locally edited `wong-sync` was changed deliberately, and the adaptation SHALL be proposed through the ordinary `adopt` path.

The refreshed clone and everything derived from it SHALL be reused; the clone SHALL NOT be fetched or reset a second time.

The report SHALL name which version's logic the run followed and why — including the version span when it followed the clone's, and the installed version plus the reason when it did not.

#### Scenario: An untouched skill runs upstream's newest logic

- **WHEN** the local `wong-sync` files are byte-identical to an earlier upstream release and upstream has since changed them
- **THEN** the run follows the clone's instructions for the remainder of the run
- **AND** the local files are not written, and their installation is a task in the change folder

#### Scenario: A customized skill keeps its own logic

- **WHEN** the local `wong-sync` differs from every historical upstream version
- **THEN** the run continues under the installed text, does not read the clone's version in its place, and does not modify the local files
- **AND** the capability analysis proposes the adaptation as an ordinary `adopt`

#### Scenario: No self-modifying decision procedure

- **WHEN** any run completes
- **THEN** the skill that decided what to propose was never rewritten by the run that used it

#### Scenario: Version skew is reported

- **WHEN** a run followed instructions other than the installed ones
- **THEN** the report names the version span it followed and states that the run's decisions came from the newer text

## MODIFIED Requirements

### Requirement: No git in the target; full git in the clone

`/wong-sync` SHALL NOT run any git command that mutates the target repo (no add, commit, branch, push): the verdict record and the proposed change folder — and, on a seed manifest only, the copied payload files — land in the working tree for the user to review and `/save`. The clone SHALL be treated as **read-only** — the skill fetches, checks out, and resets it to the upstream default branch, and SHALL NOT create branches, commits, or pushes there. A dirty clone MUST NOT be reset without warning and confirmation. Reading the clone's history to prove that a local file is unmodified, and reading the clone's own `wong-sync` instructions to run under them, SHALL NOT count as mutating it.

#### Scenario: A run finishes

- **WHEN** the analysis has completed and a change folder has been written
- **THEN** the verdict record and the change folder exist only as working-tree edits and the skill directs the user to review and `/save`, having made no target-side commits

#### Scenario: Clone is never written to

- **WHEN** any `/wong-sync` run completes
- **THEN** the clone is on the upstream default branch with no branch, commit, or push created by the skill

#### Scenario: Reading the clone's instructions is not a mutation

- **WHEN** the run follows the clone's `wong-sync` instructions instead of the installed ones
- **THEN** nothing is written to the clone and nothing is written to the local skill directory

### Requirement: Absent payload files are copied directly

For each file in the payload manifest, `/wong-sync` SHALL classify per file on three cases: **absent** → plan to copy it in verbatim; **present and provably unmodified but stale** → plan to update it to upstream's current version per the update-if-untouched rule; **present otherwise** → leave it byte-identical and hand it to the capability analysis. The threshold is per file, not per repo: a fresh install is simply the case where every manifest file is absent, and SHALL NOT be a distinct mode.

Classification SHALL NOT write anything. The planned copies and updates SHALL be carried into the change folder as tasks and performed by `/apply` — except on a **seed manifest**, where they are performed during the run because the copy is the install.

For `CLAUDE.md`, the unit is the `WONG-STACK` block rather than the file: absent markers (or an absent file) SHALL cause the block to be planned for insertion with its markers, creating the file if needed and leaving all other content byte-identical; present markers SHALL send the block to the analysis and SHALL NOT be rewritten in place. The block SHALL be excluded from update-if-untouched.

#### Scenario: New upstream skill arrives

- **WHEN** upstream ships a payload skill the target does not have
- **THEN** it is planned as a copy task, with no analysis needed to decide
- **AND** it is not written during the run

#### Scenario: Edited file is never copied over

- **WHEN** a payload file exists locally and differs from every historical upstream version of its path
- **THEN** it is neither copied nor updated, and is handed to the capability analysis

#### Scenario: Fresh install falls out of the general rule

- **WHEN** `/wong-sync` runs on a seed manifest, where no payload file exists yet
- **THEN** every manifest file is copied in as the install, with no separate fresh-mode branch beyond the seed-manifest exception

#### Scenario: CLAUDE.md with the user's own content and no markers

- **WHEN** the target's `CLAUDE.md` has content but no `WONG-STACK` markers
- **THEN** a task is written to insert the block with its markers, leaving everything outside them byte-identical

### Requirement: Provably unmodified payload files are updated directly

For a payload file that exists locally, `/wong-sync` SHALL determine whether it is **provably unmodified**: its git blob hash equals the blob hash of some version of that path in the clone's default-branch history. History SHALL be looked up under the upstream path (using the manifest's skills mapping where a skill was installed under a different local name) and the write SHALL target the local path.

- Local blob equals the current upstream blob → the file is current; nothing is planned.
- Local blob equals a historical upstream blob but not the current one → the file is provably unmodified and stale; the skill SHALL plan to replace it with upstream's current version, as a task in the change folder rather than a write during the run.
- Local blob matches no historical upstream blob → the file SHALL NOT be touched and SHALL be handed to the capability analysis.

The `WONG-STACK` block of `CLAUDE.md` SHALL be excluded from this rule. Opt-in categories (stack pack, app scaffold) participate only when their manifest gates already place them in the file list — this rule SHALL NOT widen what is in scope.

Every file planned this way SHALL appear under an **Updated** heading in the proposal, one line per file naming the version span, distinct from the **Copied** list, so each intended write is visible before it happens.

#### Scenario: Stale unmodified skill is planned, not written

- **WHEN** a repo's copy of a payload skill is byte-identical to the version an earlier release shipped and upstream has since changed it
- **THEN** the sync plans its replacement as a task and does not write the file during the run
- **AND** the file appears under the proposal's Updated heading with its version span

#### Scenario: Deliberately pinned-but-unedited file is visible before it changes

- **WHEN** a repo kept an old upstream version of a payload file without editing it
- **THEN** the update is planned like any provably unmodified stale file and named in the proposal, and the plan review is where a wrong update is caught — before the file changes

#### Scenario: Renamed skill is proven against its upstream path

- **WHEN** a payload skill was installed under a different local name recorded in `components.skills` and its content is byte-identical to a historical upstream version
- **THEN** the proof runs against the upstream path's history and the planned task targets the local path

#### Scenario: Current files are untouched

- **WHEN** a local payload file already equals upstream's current version
- **THEN** nothing is planned and nothing is reported for it beyond its ordinary verdict

### Requirement: Manifest schema, lazily migrated

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, and `components`. It SHALL record **install state only** — what is installed here, from where, and as of when. It SHALL NOT carry verdicts, reasons, or judgment commits; those live solely in `.claude/wong-sync-verdicts.md`, specified by the `wong-sync-adapt` capability.

`version` and `commit` SHALL record **which upstream release this repo's payload files were brought to** — a fact about files, not about what a run examined. Because the manifest is written by a task, it SHALL NOT be rewritten by a run that only plans: an unapplied plan leaves the manifest untouched, so the next run walks the same changelog span again rather than believing the repo is current. Capability adoption SHALL NOT be tracked here; the verdict record recomputes every verdict except `declined` on every run, so a partly applied plan re-proposes what was not taken regardless of the recorded version.

The schema SHALL be stated in exactly one payload place — the `wong-sync` skill, its writer of record. `wong-setup` SHALL reference that statement for the seed manifest rather than carry its own copy, so the `components.skills` list and every other field exist once.

Old manifests remain valid: missing keys are filled in by the manifest task and written last among the file tasks. A manifest carrying a `capabilities` map from an earlier version SHALL have it folded into the verdict record and then dropped, per the `wong-sync-adapt` capability. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the change folder carries a task to write `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** every payload file is copied during the run and the real `version` and `commit` are filled in

#### Scenario: An unapplied plan does not advance the version

- **WHEN** a run writes a plan and the user does not run `/apply`
- **THEN** the manifest is unchanged
- **AND** the next run walks the same changelog span rather than treating the repo as current

#### Scenario: A partly applied plan hides nothing

- **WHEN** the file tasks are applied but some adoption tasks are not
- **THEN** the manifest records the payload state that landed
- **AND** the unapplied capabilities are recomputed and re-proposed on the next run

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

#### Scenario: Manifest carrying a capability ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** the rewritten manifest omits that key, and the entries survive in `.claude/wong-sync-verdicts.md`

#### Scenario: The manifest is read for install state

- **WHEN** a reader or a later run opens `.claude/.wong-stack.json`
- **THEN** it answers what is installed, from where, and as of when
- **AND** it answers nothing about what was judged, which the verdict record owns

## REMOVED Requirements

### Requirement: The skill updates itself before the run proceeds

**Reason**: The pass conflated *following* upstream's newest instructions with *installing* them, which made the skill rewrite its own decision procedure before the user could review anything — the one write that could never be gated. Following is a read of the already-fetched clone and needs no write at all.

**Migration**: Replaced by *The run follows upstream's instructions without installing them* (ADDED above). The blob-hash proof, the discard-and-re-read discipline, the never-refresh-the-clone-twice rule, and the version-skew disclosure all carry over unchanged; only the write is removed, and installing the newer files becomes an ordinary task in the change folder. The at-most-once rule is dropped as unnecessary — with no write there is nothing to loop on.

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-09

~~~
<!-- end .openspec.yaml -->
