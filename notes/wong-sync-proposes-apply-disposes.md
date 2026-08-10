---
slug: wong-sync-proposes-apply-disposes
started: 2026-08-09
updated: 2026-08-10
consolidated:
---

# /wong-sync proposes, /apply disposes

Started as "can we hard bias `/wong-sync` toward adapt? not sure if we're already doing that."
Ended as a breaking rewrite of how the skill runs. The plan and its rationale live in
`openspec/changes/wong-sync-proposes-apply-disposes/`; this note holds what surrounds it.

## What the user asked for, in their own words

Recorded because the phrasing drove the design more than any analysis did:

- *"make a plan on how the whole repo is going to look based on the updates... present to it with the
  new features you're going to have and what you're going to lose so the person adopting this is
  clear on what's going to happen and what they're going to gain."* — the origin of the after-picture
  and, specifically, of the **Lose** region.
- *"might need to change the whole flow of how it works"* — explicit permission for a breaking change,
  given before the cost was known.
- *"why is self-update exempt from gate, like it should write a plan first following openspec /plan
  based on what changes it's going to make... then after the plan is approved it'll make the update"*
  — the correction that produced the whole plan-first inversion. Worth keeping: the user got to the
  right structure from an anomaly (one exempt write) that I had already defended.
- *"it's ok if it applies the same thing it probably needs a diff plan if plans changed"* — duplicate
  sync plans accepted, deliberately, rather than deduped.
- *"ask as many as long as it's reasonable"* — killed a fixed cap of 3 on the clarification stage.

## Preferences this session revealed

- **Prefers a standard over a magic number.** The cap of 3 was rejected not as too low but as the
  wrong kind of rule. The replacement — a per-question admission test — was accepted immediately.
  Reach for a qualifying condition before a quota.
- **Wants gates at decision points, but not prompts.** Asked for a hard decision gate, then accepted
  a plan-review gate once it was clear it dominates a terminal prompt on every axis. The objection
  was never to interactivity; it was to *changes landing before a human saw them*.
- **Tolerant of breaking changes when the contract is wrong.** No hesitation about a major bump.

## Things learned about this repo that aren't in its docs

- **`.claude` is a symlink to `.agents`, and `CLAUDE.md` a symlink to `AGENTS.md`.** Only `.agents/`
  and `AGENTS.md` are tracked (42 files vs 0 under `.claude/`). Editing through the `.claude` path
  works and lands in the tracked file — but `git show HEAD:.claude/...` fails, which is how this
  surfaced. Don't attempt to mirror edits into both; there is only one file.
- **`scripts/check-payload-links.mjs` does not cover `wong-setup`.** It resolves links against the
  file set a *target* receives, and `wong-setup` is source-repo-only. So a broken anchor from
  `wong-setup` into `wong-sync` passes the check — exactly what happened here with the retired
  `#step-4--rewrite-the-manifest-always-last`. When a payload heading is renamed, grep `wong-setup`
  by hand.
- **Renaming a payload heading is a link-breaking change**, because other skills deep-link to
  anchors. Worth checking before rewording an `##` line.
- **`openspec validate --change` does not exist** — it's `openspec validate <name> --strict`.

## Open threads

- **The clarification stage has no way to be exercised here.** `/wong-sync` refuses to run in its own
  source, so the question-quality bar (does this answer actually change the plan?) is untested. First
  real target-repo run on 11.0.0 is where it gets judged; expect to tune what qualifies.
- **The `assumes` pre-filter fix is indirect.** It's now handled by the clarification stage plus a
  softened rule, rather than by a taxonomy change. If runs still bury adoptable capabilities under
  `not-applicable`, the next move is a structural one — possibly splitting `assumes` into
  "structurally can't" vs "doesn't yet, could".
- **`improve-openspec-plans` is an unrelated active change with no tasks**, sitting in `openspec list`
  since before this session. Not touched here.
