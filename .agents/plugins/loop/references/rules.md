# The loop's rules

These are the rules every loop step follows; each step links the section it needs. The loop runs `/explore → /plan → /apply → /save → /ship`, then `/close`, and `/apply <name>` picks up saved work. Each plan is an [OpenSpec](https://github.com/Fission-AI/OpenSpec) change in `openspec/changes/<name>/`, saved with the code.

- **OpenSpec owns plans; the loop's steps own all git.** `/explore`, `/plan`, and `/apply` run none, but for `/apply`'s [switch to a saved branch](../skills/apply/references/pick-up.md#2-check-out-the-branch); `/save`, `/ship`, and `/close` own branches, pull requests, and merges.
- **A step whose precondition is missing runs the step before it**, nested: `/ship` runs `/apply`, which runs `/plan`, which runs `/explore`.
- **No step merges as a way of stopping.** A paused `/plan`, an `/apply` with tasks pending, or a failing checkpoint reports the blocker and stops before the archive. A partial change is never archived or merged.

## What each step may change

Every chat starts in plan; only the person moves it on. Each step may read, research, run the repo's tests and scripts, and try code in [`.scratch/`](#several-parts-several-workspaces); git-ignored output is no repo change.

| Step | May change in the repo |
|---|---|
| `/explore` | nothing |
| `/plan` | plans and wiki pages; a schedule only after the person's OK |
| `/apply`, `/ship`, any other step the person types | anything |

The person moves it on by typing a step, tapping *Build it* or *Build and publish* on a plan's page, or picking build or publish when asked. A step run inside another, such as `/plan` inside `/ship`, keeps the outer step's reach.

## Fix it or ask

One test decides what an agent fixes alone: **does the plan already settle what is right?** Yes → fix it and report the fix: a broken plan scenario, a failing check, a reviewer's bug the builder accepts. No → ask the person one plain question, recommendation first, when the fix:

1. **goes outside the plan**: a visible change it doesn't name, more scope, a new dependency, or unrelated code;
2. **weakens a check**: turning one off, loosening it, or deleting a test;
3. **can't be undone, or is risky**: keys, logins, access, lost data, or money;
4. **still fails after two fixes**, or a step's own cap;
5. **stays disputed**: builder and reviewer disagree after one exchange.

### Inside `/ship`

In `/ship` and its steps, rules 1 and 5 take a recommendation that stays in the work and can be undone, logged as an `Assumed` line and listed under *Choices I made*. Rules 2–4, an outward action (sends, posts, business records, real data, deletes outside the change, terms) and no clear best answer still ask, as does a step typed alone.

## `/apply` never saves to stop, but may save to finish a task

`/apply` writes the whole change, source and tests, before it checks any of it, and never saves to stop or between parts: a check and each repair cost minutes, so the checks run once, at the end. [The helper brief](../skills/apply/references/build-helper.md) owns how the build does it, and [`/plan`](../skills/plan/SKILL.md#finish) lays the tasks out for it.

Nothing is checked less: deployed acceptance still needs evidence, and only acceptance seen to pass ticks its task. Final checks, fresh preview evidence and the one live look stay; repairs are batched, and every pushed revision takes all required CI jobs.

## Verbs for any work

A verb the person invokes for work that changes no repo file, such as research, a message or a change to data in a service, keeps its stage and drops the git and OpenSpec records:

- **`/plan`** writes a short numbered to-do in the chat, marking each step that acts outside it.
- **`/apply`** works the to-do. Only an outward action, such as a sent message or a payment, asks first, showing exactly what it will do.
- **Progress** stays in the chat. With memory installed, its capture keeps an open thread, and *pick up <the errand>* in a new chat carries on.
- **`/ship`** is for repo changes only; the work finishes in `/apply`.

## The gate

- **The gate is CI when present, else review of the pull request.** Push and let CI run; the steps wait and fix failures. With no checks, a person reviews the pull request. On the local route, the profile's `precheck` runs before the merge, and a failed check stops it.
- **No local run is the gate on GitHub.** The profile's `precheck` runs on this computer first, before the first push and again after the default branch is brought in, and the build repairs what fails; [the build brief](../skills/apply/references/build-helper.md) reads its last line. `/apply`'s preview gates nothing and never reaches production.
- **Every file edit takes the gate**, through a branch and, on GitHub, a pull request. Plans and archives stay with the steps. Only code needs a change record; [`/save`](../skills/save/SKILL.md) decides.
- **The ladder is CI when present, then merge**; a skipped rung is never a failure.
- **The walk is no rung.** `/ship` runs `/verify` and merges on the gate whatever the walk says; a walk that can not run never blocks. A `FAILURE` gets one fix and one more walk; only a second `FAILURE` stops `/ship` to ask: fix more, or merge anyway.
- **An unverifiable gate is not an absent one**: `/save` reports it and goes on; `/ship` stops, never reinterpreting or repeating it.

## The change is a living handoff, not just a plan

`/save` keeps three surfaces on the change, so a cold reader inherits the *why*, not just the *what*:

- **The `**Status:**` line** under the proposal's H1: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. `/apply`'s list of saved work shows it.
- **The append-only, dated `## Decision log`** at the foot of `proposal.md`: what landed, what was decided or ruled out and why, what blocks it. Never rewrite it.
- **The pull request body**, regenerated on every `/save` as a mirror of the change, so the forge alone is a full handoff. Reviewers comment instead of editing it.

## Where the plan and record live

The change folder on the feature branch *is* the plan, and `/apply <name>` finds it from a fresh clone. Its archive on the default branch, with the synced `openspec/specs/`, *is* the record; there are no planning issues.

The branch and the change can have different names. The folder and the session's facts use the change name; `/save` records the branch in the proposal's `**Branch:**` line. Each step selects a change by [the selection rungs](../skills/save/references/checkpoint-evidence.md#selection-rungs), and `/ship` moves another change the branch adds to its own branch first.

## Several parts, several workspaces

When a request has parts each publishable alone, [ask once](../skills/plan/references/new-workspace.md#ask-once) how to split them; each new workspace plans its part and waits. [Open a part in a new workspace](../skills/plan/references/new-workspace.md) owns when the ask returns, parts that build on each other, and the fallbacks.

Before planning, [check for other work](../skills/explore/SKILL.md#check-for-other-work): other workspaces, their plans, and open pull requests. Speak only on an overlap, and ask [where to go on](../skills/plan/references/new-workspace.md#ask-once).

Scratch files go in the git-ignored `.scratch/` at the checkout root, not the system temp folder. They go with their workspace.

## Offer a routine or an app

When a task done by hand, a plain request or non-code work under a step, will clearly come back, offer to make next time easier: one option in [the next-step question](../skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step), beside *stop here*, never a question of its own. Most tasks get none.

- **Only on a clear signal**: the person says it recurs (*every Monday*, *again*), or memory shows they asked before. Never on a hunch: an offer after every task teaches people to skip it.
- **Search once** for a past request or decline, where the project keeps notes.
- **Pick the help by the work.** A scheduled task that needs judgment on each run gets a routine through `/schedule`. Fixed steps get a script, not AI, on an existing clock: code runs the same way each time and costs nothing to run again. Build needed code through this loop.
- **Name the outcome, not the tool**: *do this every Monday at 9*, *a page that splits the bill for you*.
- **A no is final**: record it where the project keeps preferences, naming the task in the person's words, and never offer for it again.
- **A yes starts the usual route**: `/schedule` confirms, or the loop stops at the plan's review.

No offer after a code change you built, or in an unattended run.
