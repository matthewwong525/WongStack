---
slug: ship-in-one-go
started: 2026-09-13
updated: 2026-09-14
consolidated:
---

# Ask up front, then ship in one go

## What the user asked for

Two things, brought together in one `/explore`:

1. `/plan` should ask "a handful of 80/20 questions if there is any" before it drafts, through
   AskUserQuestion, "so simple for user to answer."
2. `/ship` should "actually do the whole cycle of /plan /apply then /ship so we can finish a task in
   one go."

Then, after the first shape was proposed, the user redirected: *"Maybe instead we do explore asks the
ask user question thing and we always run explore before the plan apply ship thing."* That redirect
is the change's actual shape.

## Why the round moved from `/plan` to `/explore`

The first proposed shape put a question preflight inside `/plan`. Ruled out on the user's redirect,
and the reason holds up independently: finding the forks worth asking about requires investigating
the codebase, which is exactly what `/explore` exists to do. Putting the round in `/plan` would
duplicate the verb before it.

Placing the round at `/explore`'s **exit** is what lets one rule serve both modes. Standalone, the
exit is when the user says "plan it." Bounded, the exit is after the investigation. Same round.

## Decisions the user made or confirmed

- **Explore always runs**, invoked by `/plan` when skipped. Not optional any more, in the skill, the
  change loop page, or the `WONG-STACK` block.
- **`/ship <intent>` triggers the full cycle; bare `/ship` does not.** Explicit argument only, so
  nobody merges by accident. The argument passes to `/apply` verbatim — `/ship` resolves nothing.
- **One change, not two.** Both features touch the same three skills, the same wiki page, and share
  one version bump.

## Ruled out, and why

- **A new verb (`/go`)** — a seventh verb would have to be added to `CLAUDE.md`, the loop diagram,
  and the payload manifest. The pull-in reuses the `/apply` → `/plan` pattern instead, so the loop
  gains a uniform rule rather than a special case.
- **A flag (`/ship --all`)** — flags are foreign to the WongStack verbs, which all read intent from
  their argument.
- **A `--no-questions` escape hatch** — unnecessary. AskUserQuestion always offers "Other," so the
  user can type "just pick defaults."
- **Detecting "the conversation already explored" and skipping the bounded pass** — too fuzzy. The
  pass runs always; after a real exploration it investigates nothing and asks nothing, which costs
  little and keeps the rule uniform.
- **Merging the two checkpoints of a one-go run into one.** Both "exactly once" rules (apply's
  completion save, ship's archive save) are load-bearing. Collapsing them would touch `/save`. Left
  as a separate change if ever wanted.

## The non-interactive problem

AskUserQuestion blocks when nobody can answer, which would hang a scheduled or remote run — and this
very session was non-interactive, so it is not hypothetical. The fallback: take the recommended
option, and have `/plan` record it as **assumed** rather than **chosen** in the Decision log. The
distinction is what lets a reviewer tell a default from a decision.

## Open threads

- **The stray scaffold `openspec/changes/improve-openspec-plans/`** holds only `.openspec.yaml` — no
  artifacts, 1 day old, unrelated to this work. It still shows in `openspec list`, which matters more
  now that `/apply` can select a sole active change. Deliberately left alone; someone should finish
  or delete it.
- **The chain has never run end to end.** `/ship <intent>` was authored this session but not
  exercised — this change itself was shipped with the verbs invoked by hand, because the pull-in did
  not exist yet when the work started. First real one-go run is still owed.
- **A bounded explore pass could drift** back into open-ended thinking and not return. Mitigated by
  stating the four bounded steps and naming the summary as the return signal, but only real use will
  show whether that is enough.

## Process detail worth keeping

The harness assigned the branch name `plan-clarifications-ship-full-cycle`, which did not match the
change name `ship-in-one-go`. Renamed the branch at checkpoint time (unpushed, zero commits ahead) to
restore branch = change = note. The same thing happened on the `slim-claude-md-into-rules` change and
was handled the same way, so it is a recurring friction with harness-assigned branch names rather
than a one-off.

A bare `/ship` was invoked mid-session while the change was still unimplemented. It correctly stopped
at Step 2: the branch name did not match a change folder, and the task list read 0 of 20. That was
today's `/ship` behaving right, and it is precisely the gap this change closes.
