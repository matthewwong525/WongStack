# /wong-sync updates itself first and plans its whole run

**Status:** ready-to-ship
**Open questions:** none

## Why

Two gaps remain after v9.10.0. **The skill never runs its own latest version:** `wong-sync` is an ordinary payload file, so an improvement to it lands during the run and takes effect only on the *next* one — every sync executes whatever version happened to be installed. **The run has no single reviewable document:** copied and directly-updated files exist only as working-tree edits plus chat output that scrolls away, and the OpenSpec change is written only when something is `adopt`, so a run that copied eleven files and adopted nothing leaves no plan to review at all.

## What Changes

- **Self-update first.** Immediately after Step 1 refreshes the clone, the run brings the `wong-sync` skill itself current — `SKILL.md` and `references/**` — then **re-reads the updated instructions and follows those for the rest of the run**. Mechanically this is the update-if-untouched rule shipped in v9.10.0, applied to one directory ahead of everything else.
  - At most once per run; the re-read instance is current, so the pass is naturally idempotent.
  - A locally edited `wong-sync` fails the blob proof and is **never** overwritten: the run says plainly it is continuing on the installed version, and Step 3 proposes the adaptation as usual.
  - The refreshed clone is kept — no second fetch — and the report names the self-update and its version span.
- **One OpenSpec plan per run, covering everything.** `openspec/changes/adopt-wongstack-<YYYY-MM-DD>/` is renamed **`sync-wongstack-<YYYY-MM-DD>/`** (the `-2`/`-3` collision rule is unchanged) because it is no longer adopt-only, and it is written on **every run that did or proposes anything**.
  - `proposal.md` enumerates the full changeset: the version span, every file copied, every file updated with its version span, the self-update when it happened, each proposed adoption and what it buys this repo, and a pointer to `.claude/wong-sync-verdicts.md` for everything considered and not adopted.
  - `tasks.md` keeps one task per `adopt`, preceded by a review task when file changes landed — so a no-adopt run is actionable rather than an empty folder.
  - A genuinely no-op run writes **no** folder, exactly as today. The verdict record is still written every run and remains the single store of verdicts.

**Non-goals:** no change to the verdict taxonomy or the adopt-by-default bias, no git in the target repo, no implementing of grafts, no widening of the payload manifest, and no change to the authorship-scoped never-overwrite guarantee — a file with local authorship stays untouchable, `wong-sync` itself included.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `wong-sync`: Step 2 gains a self-update pass that runs before the general file loop and re-reads the skill's own instructions mid-run; the report gains the self-update line.
- `wong-sync-adapt`: the run's change folder is renamed `sync-wongstack-<date>`, is written whenever the run did or proposes anything rather than only on `adopt`, and its proposal enumerates the entire changeset instead of adoptions alone.

## Impact

- `.agents/skills/wong-sync/SKILL.md` — Step 2 (self-update pass), Step 3 (folder contract), Step 5 (report), Hard rules. (`.claude/**` is a symlink to this path.)
- `.agents/skills/wong-sync/references/adapt.md` — the output contract: folder name, when it is written, what `proposal.md` enumerates, and the review task.
- `VERSION`, `CHANGELOG.md` — payload release (minor, from 9.10.0).
- Target repos: the next sync runs upstream's current logic rather than the installed copy, and every run that changes anything leaves one reviewable plan. Repos with a customized `wong-sync` are unaffected by the self-update and keep today's behavior exactly.

## Decision log

- **2026-08-09** — Planned and implemented in one session, on a fresh branch from `main` at v9.10.0 (the adapt-by-default release, PR #61). Both behaviors follow directly from that release: the blob-hash proof is what makes self-updating safe, so this change is mostly a question of *ordering* — run the proof on this skill's own directory before anything else, then re-read. Settled during design: "re-read" means re-run Step 0 (a newer version may consult a manifest key the old one never read) while keeping Step 1's clone (facts about the clone are version-independent, and re-fetching buys nothing); the once-per-run limit is a stated hard rule rather than an inference from the proof, so a version-skew bug can't spin. Ruled out: a sixth `adopt-unshaped`-style verdict was not needed here, and a separate `.claude/wong-sync-last-run.md` run report was rejected because it recreates the two-documents-to-reconcile problem the single-plan ask exists to solve. Landed edits are described in the run plan's proposal rather than written as tasks, because they are already in the working tree and uncommitted — review still precedes anything durable. Implementation found five payload sites naming `adopt-wongstack`; all updated except the deliberate "leave old folders alone" rule. Released as 9.11.0; `check-payload-links.mjs` green. 11/11 tasks complete.
