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
