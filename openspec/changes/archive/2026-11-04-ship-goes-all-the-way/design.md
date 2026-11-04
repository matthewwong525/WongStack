# Design

## Context

`/ship` already says that invoking it authorizes the whole chain (archive, save, walk, merge). The stops come from the steps it runs, each of which asks on its own terms:

- `/apply`'s build and review helpers return questions by [fix it or ask](../../../wiki/development/the-change-loop.md#fix-it-or-ask), and `/apply` asks the person (`.agents/skills/apply/SKILL.md`, *A question*).
- `ship.mjs prepare` stops with `OTHER_CHANGES=` for every other active change in `openspec list`, even ones `origin/main` already holds (`ship.mjs` near line 312). The spec says *the branch diff*, so this is a bug.
- `/save`'s auto-fix loop stops on a failure outside the diff with no code edit (`save/references/git-gate.md`).
- `/ship` Step 4 asks *fix first / publish anyway* on a walk `FAILURE`.
- `asking-the-user.md` line 40 allows taking the recommendation only where nobody can answer.

A scan of 30 days of Claude Code chats found 59 questions asked after a `/ship`; most had a recommended answer that was inside the work and could be undone. The daily check-in already names this kind of answer an *obvious pick* (`wiki/development/daily.md#check-ins`).

## Goals / Non-Goals

**Goals:**
- One rule, on one page, decides which questions `/ship` takes by itself.
- Every taken choice is logged and reported, so the person can undo it.
- Fix the `OTHER_CHANGES` false stop; make the true one a single command.

**Non-Goals:**
- No change to standalone `/apply`, `/save`, `/verify` or `/plan` asks.
- No change to the closing question after a publish.
- No new setting or flag for the person; typing `/ship` is the switch.

## Decisions

1. **The rule lives in the change loop's *Fix it or ask*.** Add a short *Inside `/ship`* paragraph there: inside `/ship` and the steps it runs, rules 1 and 5 (outside the plan, disputed) are answered with the recommendation when it stays inside the work and can be undone; rules 2–4 (weakens a check; can't be undone or risky: keys, logins, access, money, data loss; still fails after two fixes) still ask, and so does any outward action (sends, posts, business records, real data, deletes outside the change, terms) and a question with no clear best answer. Each taken choice → an `Assumed` Decision-log line, and the ship report's *Choices I made*. *Alternative:* a separate page — rejected, a second copy of the fix-or-ask rules goes stale. The page is at 2,957 of 3,000 words: trim wording on the page, or move a detail its owner already holds, to fit (CI checks the cap).
2. **The steps learn they run inside `/ship` from the caller.** `/ship` already tells `/apply` it runs inside `/ship`; `/apply` passes that to its helpers' prompt. `/save` and `/verify` are invoked by `/ship` the same way. Each skill's ask point gets one clause linking the change-loop paragraph, not a copy of it.
3. **`asking-the-user.md` line 40** widens *only where nobody can answer* to also *inside `/ship`, for a pick the change loop marks safe*, linking it.
4. **`ship.mjs prepare`: other changes come from the branch.** Filter `others` to the names in `checkpointEvidence(...).active` (changes the branch diff or worktree touches). A change only `origin/main` holds no longer stops.
5. **`ship.mjs prepare --move-others`.** For each other change the branch adds: make a branch from `origin/<default>` holding only that change's folder (named after the change, `-plan` added if taken), push it, print `MOVED=<name>:<branch>` at once, then remove the folders from the shipping branch in one commit. A branch on origin whose head already holds exactly that folder is an earlier run's push: it is reused, with no second push, so a rerun after a failed push never makes a `-plan` copy. `NEXT:` on `OTHER_CHANGES` then says to rerun with `--move-others` unless the person asked to ship all (`--allow-others`). It uses a temporary `git worktree` so the current checkout is never switched. The plan is kept, so this can be undone.
6. **Walk `FAILURE` gets one fix.** Step 4: on `FAILURE`, invoke `/apply` once with `prepare`'s `ARCHIVE` path and the failing scenarios (inside `/ship`); given an archive path, `/apply` fixes that archived change with no `/plan` and no new change, logging in its Decision log. Then `/save` with Step 3's same `CHANGE` and `ARCHIVE`, and `/verify` once more. Still `FAILURE`, or the fix needs a stop by the rule → ask as today.
7. **A failure outside the change, inside `/ship`.** `git-gate.md`: after its one re-run, inside `/ship` it gets one fix in the same push loop when the fix keeps the check as strong (no skip, no loosened assertion); the attempt cap is unchanged. Outside `/ship`, unchanged.
8. **Report.** Step 6 adds *Choices I made* beside *Checks loosened*: each `Assumed` line this ship added, one plain line; omit when none. A moved plan is named there too.
9. **Size budget.** Skill text has about 17 bytes of headroom (`measure-context.mjs`). Each added clause needs a cut on the same route: shorten Step 4's ask wording (now shorter), and drop restated text in `ship/SKILL.md` that the change loop owns.

## Risks / Trade-offs

- **A wrong guess ships.** A taken business-fact pick may be wrong → it is listed under *Choices I made* and can be undone by a small change; risky kinds still stop.
- **Safe is a judgment.** The agent may call something safe that is not → the hard-stop list is concrete (keys, logins, access, money, sends, business records, real data, deletes, terms, weakened checks), and the person sees every pick in the report.
- **Fixing an outside failure widens the change.** Bounded to one fix that keeps the check as strong; anything more stops.
- **`--move-others` pushes a branch.** It only adds a branch holding a plan folder, never deletes one; a failed push stops before the folder is removed.
