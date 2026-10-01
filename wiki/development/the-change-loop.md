# The change loop

Every change to WongStack, and to any repo that installs it, moves through one loop from a rough idea to a shipped, archived spec. The durable handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change**: a folder `openspec/changes/<name>/` with a `proposal.md`, a `tasks.md`, and optional delta specs, committed with the code and listed in any clone by `openspec list`.

A plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb and no question round, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. One that edited a repo file, such as a wiki note, ends by asking *publish it?*, so no edit is left unsaved. Finished work in a Paseo workspace offers to close it: [`/close`](../../.agents/skills/close/SKILL.md) saves what the chat learned, updates the wiki, and closes the workspace. An invoked verb works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. The full loop is for the repo's code or process, and a new standalone page or tool is code: [a mini app](#mini-apps).

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /ship ─▶ /close
 think      draft the  implement  push +    merge +   wiki +
 (no git)   change     + host     PR +      archive   close
            (no git)   preview    CI
                          ▲
            /continue ────┘
            resume saved work later, on any machine
```

Each verb is a WongStack skill that calls the OpenSpec CLI directly (setup runs `openspec init --tools none`). **OpenSpec owns the plan; the WongStack skills own all git**, and OpenSpec never runs git: `/explore`, `/plan`, and `/apply` run none, while `/save`, `/continue`, `/ship`, and `/close` own every branch, PR, and merge. A finished `/apply` [uploads a preview from the agent host](../../.agents/skills/apply/SKILL.md#finish-with-a-preview) and asks whether to publish; the work stays in the working tree until then.

**A verb whose precondition is missing invokes the verb before it**, nested, so you can enter anywhere:

```
/ship ─▶ /apply ─▶ /plan ─▶ /explore
```

`/plan` always invokes `/explore` for its [questions](#asking-before-drafting), except for [notes pasted from a review page](../../.agents/skills/plan/SKILL.md#review-notes). One `/ship` carries a task from idea to merge, whether you named the intent or the session established it; a **cold** `/ship`, with no intent and nothing in the session, never merges a lone entry in `openspec list` and reports the stop. The stages still run in order, the OpenSpec folder before any code. Invoke a verb yourself to stop and review its output.

Entering late never skips a stop: **no verb merges as a way of stopping.** A paused `/plan`, an `/apply` with tasks pending, or a failing checkpoint in the chain reports the blocker and stops before the archive; a partial change is never archived or merged.

### Just ask

A person need not know the verbs. Asked for a change to the repo's code or process with no verb, the agent runs the loop and stops twice:

1. **`/plan`** ends with the review link and [the finished-plan question](../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step). Picking *Build and publish* runs `/ship` instead, with no stop at the preview; picking *Review the plan* prints the link again and waits.
2. On yes, **`/apply`** builds, uploads a preview from the agent host, and asks *publish it?* A change that leaves the app untouched gets no preview; the agent says so and still asks.
3. On yes, **`/ship`**: one save, CI, the walk, and the merge.

A verb the person types keeps its own reach: `/ship` runs the whole chain with no stop, and `/apply` plans and builds without one. Every plan, question, and report is in [plain words](../../.agents/skills/explore/references/asking-the-user.md#write-in-plain-words), so the person reviews outcomes, not mechanisms.

### Offer a routine or an app

When a task done by hand — a plain request, or non-code work under a verb — will clearly come back, offer to make next time easier: one option in [the next-step question](../../.agents/skills/explore/references/asking-the-user.md#end-every-reply-with-the-next-step), beside *stop here*, never a question of its own. Most tasks get none.

- **Only on a clear signal**: the person says it recurs ("every Monday", "again"), or memory shows they asked before. Never on a hunch: an offer after every task teaches people to skip it.
- **Search memory once**: `memory.mjs search` on the task's key terms finds a past request and a past decline.
- **Pick the help by the work.** A scheduled task that needs judgment on each run gets a routine through [`/routine`](../../.agents/skills/routine/SKILL.md). Fixed steps get a [mini app](../stack/mini-apps.md), even on a schedule: [most process improvements shouldn't use AI](../agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai).
- **Name the outcome, not the tool**: *do this every Monday at 9*, *a page that splits the bill for you*.
- **A no is final**: record a `feedback` fact through [the write gate](../../.agents/skills/memory/SKILL.md#write), naming the task in the person's words, and never offer for it again.
- **A yes starts the usual route**: `/routine`'s own confirmation, or the change loop stopping at the plan's review.

No offer after a code change you built, in an unattended run, or for a routine when `paseo` is not installed.

### Several parts, several workspaces

One workspace holds one change. When a request has parts that could each be published alone, the agent asks once how to split them, [with these options](../../.agents/skills/plan/references/new-workspace.md#ask-once); each new [Paseo](https://paseo.sh) workspace plans its part and waits at its review link. [Open a part in a new workspace](../../.agents/skills/plan/references/new-workspace.md) owns when the ask returns, parts that build on each other, and the one-at-a-time fallback when Paseo is missing or nobody can answer.

Before planning, the agent [checks for other work](../../.agents/skills/explore/SKILL.md#check-for-other-work): this repo's other workspaces, their plans, and open pull requests. It speaks only when one overlaps, and asks [where to go on](../../.agents/skills/plan/references/new-workspace.md#ask-once).

**Scratch files** go in the git-ignored `.scratch/` at the checkout root that [`tidy.mjs scratch`](../../.agents/skills/routine/scripts/tidy.mjs) makes and prints, not the system temp folder. It goes away with its workspace; in the main checkout, each session's tidy-up deletes scratch files older than a day.

### Asking before drafting

`/explore` owns clarification. Standalone, it asks small groups of questions as long as the thinking needs. Moving into `/plan`, however planning was invoked, it asks only where a wrong guess makes the artifacts *wrong*, not merely *different*, and asks a follow-up group when an answer opens another such choice. Minor gaps become recorded assumptions. [The exit round](../../.agents/skills/explore/SKILL.md#the-exit-round) is the runbook; `/plan` logs the answers in the Decision log.

## The steps

Each skill owns its own procedure; this list is what each stage is for.

- **[`/explore`](../../.agents/skills/explore/SKILL.md)** thinks a problem through and owns the [questions before a plan](#asking-before-drafting). It **always runs**, except for notes pasted from a review page, and writes nothing.
- **[`/plan`](../../.agents/skills/plan/SKILL.md)** drafts the change folder and its `review.html` page, with no git. **A change that touches behavior plans its tests**: `tasks.md` carries a coverage task that `/apply` writes and CI runs on every push. `/save` never authors tests; coverage grows where the context is richest.
- **[`/apply`](../../.agents/skills/apply/SKILL.md)** ensures a plan, works `tasks.md` [in a fresh helper agent](../../.agents/skills/apply/SKILL.md#build-in-a-helper) so the build does not carry the planning talk, and ends with a host preview. It never saves on completion; invoked by `/ship`, it returns with no upload.
- **[`/save`](../../.agents/skills/save/SKILL.md)** is the git stage: it commits code and [the synced change](#the-change-is-a-living-handoff-not-just-a-plan) together, pushes, opens or updates the PR, waits for CI when present, returns a preview URL, and records the session's facts in the [memory store](memory.md). With no plan, it authors one from the session, so nothing ships without its handoff. `/ship` reuses it for the archive, so the git, PR, and CI logic exists once.
- **[`/continue`](../../.agents/skills/continue/SKILL.md)** resumes a change or an open non-code thread, cold, on any machine, and hands off to `/apply`.
- **[`/ship`](../../.agents/skills/ship/SKILL.md)** archives the change, invokes `/save` once, runs [`/verify`](#verifying-the-app) once, and squash-merges on [the gate](#the-gate): one checkpoint and one CI run before the walk. A failed walk is fixed in the same PR; an unfinished change is finished through `/apply`, never archived. It only puts code live; it writes no wiki.
- **[`/close`](../../.agents/skills/close/SKILL.md)** wraps up any finished chat, with no question. It records what the chat set out to do and what is left, keeps unfinished work saved on GitHub (or throws it away when asked), and moves the chat's and its change's repeatable facts into the wiki in their own pull request. Then it closes the Paseo workspace. A workspace closed any other way gets no wiki update; its facts stay in memory.

Loop back any time: each `/save` keeps the plan and Status current and **appends** to the Decision log, never rewriting it, so the change holds the story of the work. Re-`/plan` if the spec needs to change.

### `/apply` never saves to stop, but may save to finish a task

`/apply` never invokes `/save` to **stop**, nor on completion: finished work ends with a host preview, and paused, blocked, or unfinished work is reported for you to checkpoint, so an `/apply` that gives up leaves nothing pushed. The exception is a task whose done needs [the gate](#the-gate) — CI green, a CI-published preview, browser evidence. `/apply` runs `/save` to implement it, ticks it on a pass, and stops with it unticked on a failing or unverifiable result, as [`/verify`](#verifying-the-app) does. When it is the final task, its save already published a CI preview, and `/apply` reports that instead of uploading another. `/plan` names `/save` in such a task; most changes have none.

### Verbs for any work

A verb you invoke for work that changes no repo file — research, an errand, a message, a change to data in a service — keeps its stage and drops the git and OpenSpec records:

- **`/plan`** writes a short numbered to-do in the conversation, marking each step that acts outside it.
- **`/apply`** works the to-do. Before each outward action — a sent message, a post, a written record, a payment, a deletion — it shows exactly what it will do and asks. Reading and drafting need no prompt.
- **`/save`** keeps the progress as a memory `thread` fact, and **`/continue`** resumes it.
- **`/ship`** is for repo changes only; the work finishes in `/apply`.

The work decides the form; no mode or setting does.

### Mini apps

"Make me a …" builds a small app inside the main app, at `/apps/<name>/`, through this same loop and its stops: a plan, a host preview, then *publish it?* [Mini apps](../stack/mini-apps.md) owns the layout and rules.

### Verifying the app

**[`/verify`](../../.agents/skills/verify/SKILL.md)** sits *beside* the loop: it exercises the change's OpenSpec scenarios against the deployed preview and posts evidence and a verdict to the PR. It **gates nothing**, so it is safe to run early and often. [The staging walkthrough](staging-walkthrough.md) explains how and why.

## The gate

This page **states** the delivery doctrine; every other surface links here instead of restating it.

**The gate is CI when present, else PR review**: GitHub Actions is an optional accelerator on pull requests, version control, OpenSpec, and the repo. Where checks exist, push and let CI run; the skills wait and fix failures. Where they don't, a human reviews the PR, with the change and its archive. Either way, **nothing builds locally as a prerequisite**; `/apply`'s host preview gates nothing and never reaches production.

**Every file edit takes the gate**, whatever its path: a branch, a pull request, then `/ship`. Only code needs a change record; [`/save`](../../.agents/skills/save/SKILL.md) decides, and anything else gets a pull request that says what changed.

**The ladder is CI-when-present → merge**; a skipped rung is never a failure, and nothing else gates a merge. The app's test suite runs *inside* CI as an ordinary check, found by its `npm test` script at the repo root **or any immediate subdirectory**, so a repo without tests is not penalized and none receives a package manifest on WongStack's behalf.

**A branch that leaves the main app untouched skips its suite**: when every path the whole branch changes against the default branch is under `wiki/` or `openspec/`, or ends in `.md`. The Test and Deploy jobs skip inside the job and say so, so a required check still reports green. A [mini app](../stack/mini-apps.md) is main-app code, so a change to one runs the suite and deploys. The WongStack source repo's Payload checks run on every push, since skill Markdown is the payload; only a branch entirely under `wiki/` or `openspec/` skips their script tests.

**The staging walkthrough is no rung either.** `/ship` runs [`/verify`](#verifying-the-app) once and merges on the gate whatever the walk says; a walk that cannot run (no credential, budget spent) never blocks. Only a `FAILURE` stops `/ship`, to **ask the user** to fix or merge anyway: a human decision, with *merge anyway* always available.

An **unverifiable** gate is not an absent one: `/save` reports it and carries on, since it is a checkpoint, while `/ship` treats it as unmergeable and stops, never reinterpreting or repeating it.

### A loosened check needs a reason

Every check has an escape hatch, and a person who does not read code can not see one used. So the Test check, [`loosened-checks.mjs`](../../.github/scripts/loosened-checks.mjs) on every push, fails when a change loosens a check without saying why. It flags a file when the change adds a line that turns a check off (a skip comment, or a skipped, focused, or to-do test), deletes a test file other than by moving it, or changes a check's settings (a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, the Test workflow, or a script under `.github/scripts/`). Any settings change counts, stricter ones too: a script can not tell stricter from looser.

The reason is a Decision log bullet that starts with `Check:` and names the file:

```text
- **2026-09-27** — Check: `app/vitest.config.ts` excludes `src/generated/` from coverage, because that code is generated and has no tests of its own.
```

Only a proposal the branch adds or edits counts, archived ones included, so an old reason never excuses a new loosening. The agent fixes a flagged file itself, switching the check back on or writing the reason, and lists every `Check:` bullet in plain words before *publish it?* and in the final report.

## The change is a living handoff, not just a plan

`/save` keeps three surfaces on the change, so a cold reader inherits the *why*, not just the *what*: the **`**Status:**`** line under the proposal's H1 (`in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`), which the `/continue` menu shows; the **append-only** dated **`## Decision log`** at the foot of `proposal.md` — what landed, what was decided or ruled out and why, what blocks it — which survives across machines and people because it is never rewritten; and **the PR body**, regenerated on every `/save` as a **mirror of the change**, so a forge alone is a full handoff. Reviewers comment instead of editing it.

## Where the plan and record live

The change folder on the feature branch *is* the plan, and `/continue <name>` finds it from a fresh clone. Its **archive** on the default branch, with the synced `openspec/specs/`, *is* the record; there are no GitHub planning issues.

**The branch and change can have different names.** The folder and the session's facts use the change name; `/save` records the branch in the proposal's `**Branch:**` line. Each verb selects a change by [the selection rungs](../../.agents/skills/save/references/checkpoint-evidence.md#selection-rungs), and `/ship` will not merge a branch that carries another active change.

## Spec deltas are optional

Most changes are `proposal.md` and `tasks.md` only. A change writes delta specs **only** when it formally revises a capability's spec; `/save` folds them into `openspec/specs/`, and `/ship` archives with the specs synced. OpenSpec is the handoff surface, not a push to spec-driven development.

## `/apply` vs `/continue`

Both work `tasks.md` and end the same way; `/continue` orients you first and hands off to `/apply`. Cold on another machine → `/continue`; already in the session → `/apply`.

To add a verb of your own, write a `SKILL.md` under `.agents/skills/<name>/` and point to it from this page: the loop is a convention, not a hardcoded list.

Part of [development](README.md).
