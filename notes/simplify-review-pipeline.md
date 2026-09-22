---
slug: simplify-review-pipeline
started: 2026-09-22
updated: 2026-09-22
---

The session started from "why are sessions slow" and narrowed to `/plan`'s review-page
pipeline — the one cost that recurs on every change. The measurement that drove the whole
change: the last six plans in this repo spent 8 to 15 minutes each on design subagent →
critic subagent → revision round, all serial on the main thread. Reading the critic's
findings showed they were anchor mechanics the deterministic checker already reports, plus
cosmetic wording. That is what made the critic removable rather than merely expensive.

The branch is named `explore/session-slowness` — the investigation it began as — while the
change is `simplify-review-pipeline`. They stay independent by design; the proposal records
the real branch.

## Release numbering collided at ship time

`/ship` found `origin/main` already at 16.5.0: PR #96 (`add-structured-asks`) had merged
while this branch was open, and both branches had independently claimed 16.5.0. Resolved by
merging `origin/main` into the branch and renumbering this release to **16.6.0** above main's
entry, rather than renumbering main's shipped release. `VERSION` followed.

This is a standing hazard of the release ritual, not a one-off: every payload change bumps
`VERSION` and adds a newest-first `CHANGELOG.md` entry, so any two branches open at once pick
the same number, and `VERSION` merges clean (identical content, no conflict) while only
`CHANGELOG.md` conflicts. The version file agreeing is the misleading part — check `VERSION`
against `origin/main` at ship time even when git reports no conflict.

`.claude/skills/plan/SKILL.md` was the one file both branches edited. It auto-merged
correctly: main's `asking-the-user` convention link and this change's rewritten "Build the
review page" section are both present.

## Verified at the checkpoint

`check-openspec-config.mjs`, `check-payload-links.mjs` (no dead links), and
`measure-context.mjs --check` all pass after the merge. The context measurement shows the
intended drop — `visual-author` 6035 → 1181 words, `new-plan-save` 18248 → 10118 — and no
route reports an unexplained increase. Nothing builds locally; CI is the gate.

Unrelated: `notes/simplify-review-opening.md` is a different change (PR #82, the review
toolbar) despite the similar name.
