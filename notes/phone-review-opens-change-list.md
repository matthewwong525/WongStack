---
slug: phone-review-opens-change-list
started: 2026-09-17
updated: 2026-09-17
---

# A phone review page opens on the change list

## What the user asked for

> "on mobile view rather than viewing the first change can we have it so that we have it show the
> what's changed tab instead and then they can click into the first view if they want to"

"The what's changed tab" is the phone sheet holding the proposal's **What Changes** list — the panel
that sits beside the stage on a desktop and hides behind the Changes button below 760px. The ask is
about the *opening* route only, not about the sheet itself.

Invoked as a bare `/ship <intent>`, so the whole chain ran in one go: `/ship` → `/apply` → `/plan` →
`/explore`'s question round → implement → save → archive → merge.

## Decisions the user made

Both from the one bounded `/explore` round, both the recommended option:

- **The landing stays behind the open sheet**, with nothing pre-selected. A change 1 loaded behind
  the sheet would be the same "skipped a change they never chose" problem one layer down.
- **`#/` always means "no change chosen" at phone width** — so a back navigation or a closed change
  reopens the sheet, rather than the sheet auto-opening once per page load.

The rationale for both lives in the change's Decision log; it is not repeated here.

## The finding worth keeping: proposal bullets must be one line each

The review critic caught this, and it would have shipped an unusable page.

**`review.html`'s panel parser reads `## What Changes` line by line** — `review-kit.html:596`,
`line.match(/^- (.+)/)`. An anchor that lands on a *continuation* line is never seen, so a
hard-wrapped bullet renders as `no visual`, its `**bold**` prints its asterisks literally, and the
wrapped remainder spills below the list as a loose paragraph. The first draft of this change's
proposal was wrapped at ~95 columns and **every one of its five bullets rendered dead** — the whole
navigation gone, with no error anywhere.

Every archived change happens to write each bullet on one unwrapped line, so the convention is real
but nowhere written down. Nothing detects a violation: `openspec validate` passes, the link checker
passes, and the page renders "fine" — just empty of navigation.

**Open thread:** this belongs in the wiki (it is a general authoring rule, not a fact about this
change) or, better, in the two release check scripts as a detector — the same argument
`.claude/rules/payload.md` already makes for the link check and the config check: *the failure is
invisible by inspection, so a script has to be the detector.* Not done here; wiki edits were not
this task.

## Smaller things that cost time

- **`.claude/` is a symlink to `.agents/`.** `git diff .claude/skills/...` returns *nothing at all*
  — no error, no output — and `git check-ignore` says "beyond a symbolic link". Edits land fine;
  only the git commands need the real path, `.agents/skills/...`.
- **The worktree's branch was renamed under us mid-session**, from `prime-rhino` to
  `mobile-whats-changed-default`. Neither matched the change name, so `/save` renamed it to
  `phone-review-opens-change-list` (zero commits ahead, so the rename was free). `/ship` Step 2
  requires `openspec/changes/$BRANCH/`, so the two names have to agree.
- **agent-browser viewport** is `agent-browser set viewport <w> <h>` — `agent-browser viewport` is
  not a command.

## Judgment call worth flagging

This change's own `review.html` got the same six-line router patch as the kit, so the page a
reviewer opens on a phone demonstrates the behaviour it argues for. The proposal says already-written
review pages keep their own copy of the kit and open as they did before — that is about pages
written *before* this change, not the one drawn during it. If that reads wrong, the patch is the one
`fromHash` hunk and is trivially revertible.
