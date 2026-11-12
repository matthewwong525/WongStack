# The change loop

Repo changes follow this loop. The handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change**: `openspec/changes/<name>/` holds its proposal, tasks, and optional specs, saved with the code.

A plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb or questions, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. A repo edit ends by asking *publish it?*; a [knowledge](../stack/company-knowledge.md) page saves at once. A verb works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. The full loop is for the repo's code or process, and a new standalone page or tool is code: [a mini app](#mini-apps).

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /ship ─▶ /close
 think      draft the  implement  save +    publish +   wiki +
 (no git)   change     + host     review +  archive   close
            (no git)   preview    CI
                          ▲
            /continue ────┘
            resume saved work later, on any machine
```

Each [loop](../../.agents/plugins/loop/README.md) skill calls the OpenSpec CLI. **OpenSpec owns plans; WongStack skills own all git**: `/explore`, `/plan`, and `/apply` run none; `/save`, `/continue`, `/ship`, and `/close` own branches, PRs, and merges.

**A verb whose precondition is missing invokes the verb before it**, nested, so you can enter anywhere:

```
/ship ─▶ /apply ─▶ /plan ─▶ /explore
```

`/plan` always invokes `/explore` for its [questions](#asking-before-drafting), except for [notes pasted from a review page](../../.agents/plugins/loop/skills/plan/SKILL.md#review-notes). One `/ship` carries a task from idea to merge, whether you named the intent or the session established it; a **cold** `/ship`, with no intent and nothing in the session, never merges a lone entry in `openspec list` and reports the stop. The stages still run in order, the OpenSpec folder before any code. Invoke a verb yourself to stop and review its output.

Entering late never skips a stop: **no verb merges as a way of stopping.** A paused `/plan`, an `/apply` with tasks pending, or a failing checkpoint in the chain reports the blocker and stops before the archive; a partial change is never archived or merged.

### Just ask

A person need not know the verbs. *Go test X* is research, run and reported before any plan. Asked for a change to the repo's code or process with no verb, the agent starts at `/plan` and stops twice:

1. **`/plan`** asks only what it must and ends on [the plan's link](../../.agents/plugins/loop/skills/explore/references/asking-the-user.md#print-the-plans-link), never a question. Tap *Build it* on the page, or *Build and publish* to run `/ship` with no stop at the preview. A chat message asking to change the waiting plan updates it.
2. On yes, **`/apply`** builds, uploads a preview from the agent host, and asks *publish it?* A change that leaves the app untouched gets no preview; the agent says so and still asks.
3. On yes, **`/ship`**: one save, CI, the walk, and the merge.

**A teammate working in [a copy installed through the app](../stack/employee-project.md#save-a-change-through-the-app) saves and does not publish.** Their loop ends at the save: the reply says the change is saved and that the owner or an Admin publishes it, in place of *publish it?*

A verb the person types keeps its own reach: `/ship` runs the whole chain with no stop, and `/apply` plans and builds without one.

A skill whose page fixes a small change's shape, such as [connecting tools](../stack/connect-your-tools.md), records and builds it when you ask and stops only at *publish it?*.

### Offer a routine or an app

When a task done by hand will clearly come back, the agent offers once to make next time easier, as one choice in its closing question: [the loop's rules](../../.agents/plugins/loop/references/rules.md#offer-a-routine-or-an-app) say when and how. In WongStack, the help can also be a [mini app](../stack/mini-apps.md), because [most process improvements shouldn't use AI](../agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai).

### One task, one workspace

A [Paseo](https://paseo.sh) workspace holds one task. Done, the agent asks *Close this chat?*, any [offer](#offer-a-routine-or-an-app) beside it; only a yes runs [`/close`](../../.agents/plugins/loop/skills/close/SKILL.md); never at a plan's review, mid-build, or on a blocker, failed check, declined publish or open question. A new task opens [a new workspace](../../.agents/plugins/loop/skills/plan/references/new-workspace.md#new-task-in-this-chat), unless it is a question on this task or the person says *do it here*. Any chat [closes a finished chat](daily.md#close-finished-chats) you pick.

### Several parts, several workspaces

A request with parts each publishable alone gets one workspace a part, after one question: [the loop's rules](../../.agents/plugins/loop/references/rules.md#several-parts-several-workspaces) own it, and the check for other work before a plan.

Scratch files go in the git-ignored `.scratch/` at the checkout root, which [`tidy.mjs scratch`](../../.agents/plugins/daily/schedule/scripts/tidy.mjs) makes and prints. In the main checkout, each session's tidy-up deletes day-old scratch files.

### Asking before drafting

[`/explore`](../../.agents/plugins/loop/skills/explore/SKILL.md) owns investigation and clarification: [ground the recommendation](../../.agents/plugins/loop/skills/explore/SKILL.md#investigate-the-relevant-flow), then [resolve material choices before handoff](../../.agents/plugins/loop/skills/explore/SKILL.md#the-exit-round). It changes no repo file; `/plan` records the answers and assumptions in the Decision log.

## The steps

Each skill owns its procedure; this list says what each stage is for.

- **[`/explore`](../../.agents/plugins/loop/skills/explore/SKILL.md)** thinks a problem through, owns the [questions before a plan](#asking-before-drafting), and changes no repo file.
- **[`/plan`](../../.agents/plugins/loop/skills/plan/SKILL.md)** drafts the change folder and its `review.html` page. **A behavior change plans test authoring beside source**, and its checks at the end ([why](#apply-never-saves-to-stop-but-may-save-to-finish-a-task)). `/save` never authors tests; coverage grows where the context is richest.
- **[`/apply`](../../.agents/plugins/loop/skills/apply/SKILL.md)** ensures a plan, works `tasks.md` [in a fresh helper agent](../../.agents/plugins/loop/skills/apply/SKILL.md#build-in-a-helper), free of the planning talk, has [a second agent review it](../../.agents/plugins/loop/skills/apply/SKILL.md#a-second-look), and ends with [the local pre-check](#the-gate) and a host preview. It never saves on completion; invoked by `/ship`, it returns with no upload.
- **[`/save`](../../.agents/plugins/loop/skills/save/SKILL.md)** is the git stage: it commits code and [the synced change](#the-change-is-a-living-handoff-not-just-a-plan) together, pushes, opens or updates the PR, waits for CI when present, and returns a preview URL. The chat's facts go to the [memory store](memory.md) through memory capture, not `/save`. With no plan, it authors one from the session, so nothing ships without its handoff. `/ship` reuses it for the archive, so git, PR, and CI logic exists once.
- **[`/continue`](../../.agents/plugins/loop/skills/continue/SKILL.md)** resumes a change or an open non-code thread, cold, on any machine, and hands off to `/apply`. Work new to this computer is shown and asked about first.
- **[`/ship`](../../.agents/plugins/loop/skills/ship/SKILL.md)** archives the change, runs `/save` and [`/verify`](#verifying-the-app) once each, plus once more after a failed walk's one fix, squash-merges on [the gate](#the-gate), then [looks at the live app](staging-walkthrough.md#what-it-is-not). An unfinished change goes through `/apply` first. The walk replays [kept checks](kept-checks.md#when-it-replays) and saves new ones. A check only possible after publishing is a Decision-log line: it refuses unticked tasks.
- **[`/close`](../../.agents/plugins/loop/skills/close/SKILL.md)** wraps up a chat you chose to close, with no question. It keeps unfinished work saved, reads the chat for repeatable facts and moves them to the wiki in their own pull request, and closes the workspace. Memory capture keeps the rest. A workspace closed another way leaves its facts to [the daily tidy](wiki-dream.md#the-daily-tidy), which memory starts at the first chat of the next day.

Loop back any time: re-`/plan` if the spec needs to change.

### What each step may change

Every chat starts in plan; only you move it on, by typing a step, tapping *Build it* or *Build and publish*, or picking build or publish when asked. [The loop's rules](../../.agents/plugins/loop/references/rules.md#what-each-step-may-change) list what each step may change. In WongStack, `/improve-code` plans as `/plan` does, and a [schedule](../stack/host-schedules.md) goes to the app after your OK. Add your own step as `.agents/skills/<name>/SKILL.md`, linked from this page.

**A chat's name starts with the step at work**: `EXPLORE: `, `PLAN: `, `APPLY: `, `SHIP: `, or `DONE: `, then its task. It moves as each step starts; a chat that starts none, such as a question, keeps its name. A typed command shows at once: `/plan` as `PLAN`, `/verify` as `VERIFY`; `/apply`, `/continue` and `/ship` wait for their step. Each step names the work at that time, a plan's title once there is a plan: any name Paseo made gives way, and a name you give in Paseo stays. [`step-title.mjs`](../../.agents/loop/step-title.mjs) writes it, at once in Paseo and Codex; in Claude Code alone, a later step shows at your next message. The Daily chat, routines and helpers keep theirs.

### Fix it or ask

An agent fixes alone what the plan already settles, and asks you the rest, recommendation first: [the loop's rules](../../.agents/plugins/loop/references/rules.md#fix-it-or-ask) list the five cases that ask. A fix that weakens a check is [caught after the fact too](#a-loosened-check-needs-a-reason).

#### Inside `/ship`

In `/ship`, a safe choice that stays in the work is made and listed under *Choices I made*, not asked: [the loop's rules](../../.agents/plugins/loop/references/rules.md#inside-ship) say which.

### `/apply` never saves to stop, but may save to finish a task

`/apply` writes the whole change before it checks any of it, so the slow checks run once, at the end. Nothing is checked less: [the loop's rules](../../.agents/plugins/loop/references/rules.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task) own it.

### Verbs for any work

A verb works for work that changes no repo file too, such as research or a message: it keeps its stage and drops the git and OpenSpec records, by [the loop's rules](../../.agents/plugins/loop/references/rules.md#verbs-for-any-work).

### Mini apps

"Make me a …" builds a small app inside the main app, at `/apps/<name>/`, through this loop and its stops: a plan, a host preview, then *publish it?* [Mini apps](../stack/mini-apps.md) owns the layout and rules.

### Verifying the app

**[`/verify`](../../.agents/plugins/loop/skills/verify/SKILL.md)** sits *beside* the loop: it exercises the change's OpenSpec scenarios against the deployed preview and posts evidence and a verdict to the PR. It **gates nothing**, so run it early and often. [The staging walkthrough](staging-walkthrough.md) explains it.

## The gate

**The gate is CI when present, else PR review; no local run is the gate.** [The loop's rules](../../.agents/plugins/loop/references/rules.md#the-gate) own the rules every route shares. WongStack adds these:

- **A finished build is checked on this computer first** by [`checks.mjs --worktree`](../../.github/scripts/checks.mjs), which runs CI's checks for the changed files. It is the loop's `precheck`. [Artifacts](../stack/artifacts-route.md) runs CI in Cloudflare.
- **The app's suite runs inside CI as an ordinary check**, found by an `npm test` script at the repo root **or any immediate subdirectory**; a repo without tests passes, and gets no package manifest.
- **A branch that leaves the main app untouched skips its suite**: when every path it changes against the default branch is under `wiki/` or `openspec/`, or ends in `.md`. The Test and Deploy jobs skip inside the job, saying so; a required check still reports green. A [mini app](../stack/mini-apps.md) is main-app code: changing one runs the suite and deploys. The WongStack source repo's Payload checks run on every push, since skill Markdown is the payload; only a branch entirely under `wiki/` or `openspec/` skips their script tests. The Test job skips its wiki check when the branch changes no Markdown file and removes or moves none, since no link can break. Passed code skips too ([`already-passed.sh`](../../.github/scripts/already-passed.sh)): a merge identical to a passed branch head, or a push of only docs since a passed commit, named in the summary. Any doubt runs it.

[`checks.mjs`](../../.github/scripts/checks.mjs) owns discovery, tests and quality reports on both routes, and on this computer with `--worktree`.

### A loosened check needs a reason

Every check has an escape hatch, and a person who does not read code can not see one used. So the Test check, [`loosened-checks.mjs`](../../.github/scripts/loosened-checks.mjs) on every push, fails when a change loosens a check without saying why: it turns a check off on a line, deletes a test, changes a check's settings, or weakens a [kept check](kept-checks.md). [Loosened checks](loosened-checks.md) lists what is flagged. On GitHub a second check, `guard`, runs [the default branch's copy of the guard](loosened-checks.md#the-guard-a-pull-request-can-not-edit), so a change can not edit the guard that judges it; off GitHub the branch's copy runs alone.

The reason is a Decision log bullet that starts with `Check:` and names the file:

```text
- **2026-09-27** — Check: `app/vitest.config.ts` excludes `src/generated/` from coverage, because that code is generated and has no tests of its own.
```

Only a proposal the branch adds or edits counts, archived ones included, so an old reason never excuses a new loosening. The agent fixes a flagged file itself, switching the check back on, or writing the reason when the plan settles the loosening; otherwise it [asks](#fix-it-or-ask). It lists every `Check:` bullet in plain words before *publish it?* and in the final report.

## The change is a living handoff, not just a plan

`/save` keeps the change's Status line, its append-only Decision log, and the PR body in step, so a cold reader inherits the *why*, not just the *what*: [the loop's rules](../../.agents/plugins/loop/references/rules.md#the-change-is-a-living-handoff-not-just-a-plan) say how.

## Where the plan and record live

The change folder on the feature branch is the plan; its archive on the default branch is the record. There are no GitHub planning issues: [the loop's rules](../../.agents/plugins/loop/references/rules.md#where-the-plan-and-record-live) own it.

## Spec deltas are optional

Most changes are `proposal.md` and `tasks.md` only. A change writes delta specs **only** when it formally revises a capability's spec; `/save` folds them into `openspec/specs/`, and `/ship` archives with the specs synced.

Part of [development](README.md).
