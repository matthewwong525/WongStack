---
slug: bare-ship-continues
started: 2026-09-15
updated: 2026-09-15
---

# A bare `/ship` finishes the thread

## What the user asked for

Started as a fix for the open thread in `notes/remove-improve-dream.md:11`, carried over from the
#79 worktree. The user then stated the rule in their own words:

> "i feel like ship -> apply -> plan -> explore. like if i run a ship command and tell it to do
> something it should take it from start to finish same as if i finish explore and i call ship it
> should see if it can finish it"

Two readings in one sentence, both wanted: `/ship <intent>` already works; bare `/ship` after an
`/explore` should pick up what the session established. "See if it can finish it" is the operative
phrase — `/ship` attempts resolution and reports when it can't, rather than doing nothing.

## The distinction that made it safe

The original decision (`notes/ship-in-one-go.md:36`) was *explicit argument only, so nobody merges
by accident*. That guard was written against a **cold** bare `/ship`, where inferring intent means
grabbing whatever `openspec list` shows. A **warm** one is a different act: the intent is in the
conversation, and `/apply` already reads it. Splitting those two cases is what let the guard relax
without losing the property it was protecting.

`/ship` still resolves nothing itself. It asks one question — *which item of `/apply`'s written
resolve order applies?* — so the resolver stays in one place.

## Ruled out, and why

- **Full parity** (bare `/ship` always chains) — hands the merge decision to `/apply`'s item-4
  sole-active-change fallback. The counterexample is real: the `improve-openspec-plans` scaffold sat
  active in this repo for days, unrelated to anything being worked on.
- **A second resolver inside `/ship`** — two resolvers drift; one owner per job.
- **Confirming the inferred intent before chaining** — restores the tap the user asked to remove,
  and `/explore`'s exit round already put the forks in front of them minutes earlier.
- **Editing `openspec-archive-change` to block on unchecked tasks** — generated skills stay pristine
  per the payload rule. The guard lives in `/ship` instead.

## Two errors the critic pass caught

Both were in the assistant's own first-draft artifacts, and both were load-bearing:

1. **`/apply`'s resolve order was misquoted.** Item 3 is *an active change whose name matches the
   current branch*, not "an explicit implementation request" (that is the separate no-change-exists
   branch). Item 3 is exactly what covers a planned-but-unimplemented change sitting on its own
   branch — the `notes/add-html-wireframes.md:86` thread the change also closes.
2. **`openspec-archive-change` does not merely warn** on unchecked tasks (`SKILL.md:83-87`) — it
   warns **and asks the user to confirm**. So the hole was never in the generated skill: `/ship`'s
   own opening line authorizes the archive and says *don't re-prompt*, which answers that
   confirmation before the user sees it. The fix narrows that authorization to a **complete** change
   and adds the `tasks.md` guard.

The design-then-critic subagent pair earned its keep here. Worth keeping the habit of having the
critic check quoted source text character-for-character.

## Process notes

- **The harness assigned the branch `fix-ship-explore-intent-79`**, which did not match the change
  name. Renamed at ship time (unpushed, 0 commits ahead) to restore branch = change = note. This is
  the third recorded instance — `ship-in-one-go` and `slim-claude-md-into-rules` were the others —
  so it is a standing friction with harness-assigned branch names, not a one-off.
- **PR #80 merged mid-session.** The user interrupted to say it was about to merge; it already had.
  Dropped the `openspec/config.yaml` parse fix from scope (#80 made it, plus
  `scripts/check-openspec-config.mjs`) and fast-forwarded the worktree onto `6943d84` so the plan was
  drawn against the fixed review kit and a config whose per-artifact rules actually load.
- **`CLAUDE.md` → `AGENTS.md` and `.claude/` → `.agents/` are symlinks.** Edits made through the
  `.claude` path show up in `git status` under `.agents`. Worth knowing before comparing a file list
  to a PR diff.
- **This ship ran the new behaviour before it existed.** Bare `/ship` was invoked on a dirty branch
  with a planned-but-unimplemented change; today's runbook would have fallen through to Step 2 and
  archived it at 0/15. `/apply` was pulled in on the user's stated instruction instead — which is
  precisely the guard this change installs.

## Open threads

- **`/ship <intent>` still has never run end to end** as a single invocation. Recorded as open in
  `notes/ship-in-one-go.md` and still true; this session exercised the verbs one at a time.
- **The cold-stop test is a judgment an agent makes.** It is bound to `/apply`'s written order rather
  than left to feel, but only real use will show whether "which item applies" is unambiguous enough
  in practice.
