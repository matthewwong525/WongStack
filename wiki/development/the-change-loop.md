# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec. The durable handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change** — a folder under `openspec/changes/<name>/` (a `proposal.md` and a `tasks.md`, with optional delta specs) — committed with the code and visible from any clone via `openspec list`.

A plain request — research, an errand, a reminder, a question — is not a change. The agent does it directly, with no verb and no question round, and writes anything [repeatable](../wiki-style.md#repeatable-knowledge) it learns to the wiki. A verb you invoke still works for any work: [non-code work](#verbs-for-any-work) gets a to-do, not a change. A new standalone page or tool takes [the mini-app path](#mini-apps). The full loop is for changing the repo's own code or process.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

Each verb is a WongStack skill using the OpenSpec CLI for planning records and validation. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. The verbs call the CLI directly. Setup initializes it with `openspec init --tools none`, so no generated agent workflow layer is needed. The three *think/draft/implement* verbs (`/explore`, `/plan`, `/apply`) implement no git themselves; the three *git* verbs (`/save`, `/continue`, `/ship`) own every branch, PR, and merge. When `/apply` completes every task, it automatically crosses that boundary by invoking `/save`.

The diagram shows the durable stages, not a command tollbooth. **Every verb whose precondition is missing invokes the verb before it to produce it** — one rule, nested:

```
/ship ─▶ /apply ─▶ /plan ─▶ /explore
```

So you can enter anywhere. `/apply` with no apply-ready change invokes `/plan`, which always invokes `/explore` for its [question round](#asking-before-drafting). `/ship`, on a branch with nothing to ship, invokes `/apply` — one invocation carries a task from idea to merge, whether you named the intent or it is continuing what the session established. Its one exception is a **cold** `/ship`: with no intent and nothing in the session, a lone entry in `openspec list` never starts a merge, and the stop is reported rather than silent. Each durable stage still happens in order and the OpenSpec folder still exists before code is written; only the extra user invocations disappear. Invoke a verb yourself whenever you want to stop and review its output — `/plan` to read the artifacts before implementation, `/explore` to think before either.

Entering late never skips a stop: **no verb merges as a way of stopping.** A paused `/plan`, an `/apply` that ends with tasks pending, or a failing checkpoint inside the chain reports the blocker and stops before the archive. A partial change is never archived or merged.

### Just ask

A person does not need to know the verbs. When they ask for a change to the repo's code or process with no verb, the agent runs the loop and stops twice:

1. **`/plan`**, which ends with the review link and asks *build it now?*
2. On yes, **`/apply`**. Its completion save returns the CI result and the preview, then asks *publish it?*
3. On yes, **`/ship`**, to the merge.

A verb the person types keeps its own reach: `/ship` still runs the whole chain with no stop, and `/apply` plans and builds without one. Every plan, question, and report is written at [the reader's level](../../.agents/skills/explore/references/asking-the-user.md#write-at-the-readers-level), so a non-technical person reviews outcomes, not mechanisms.

### Asking before drafting

`/explore` owns clarification. Standalone, it asks small groups of questions for as long as the thinking needs. At the transition into `/plan`, however planning was invoked, it asks **at most one round**, and only the decisions where a wrong guess makes the artifacts *wrong*, not merely *different*. Later gaps become recorded assumptions. [The exit round](../../.agents/skills/explore/SKILL.md#the-exit-round) is the runbook; `/plan` records the answers in the proposal's Decision log.

## The steps

- **[`/explore`](../../.agents/skills/explore/SKILL.md)** — think a problem through, and own the single [question round](#asking-before-drafting) before planning. It **always runs**: you invoke it, or `/plan` invokes it in a bounded pass. Nothing is written yet.
- **[`/plan`](../../.agents/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, tasks, optional design, optional delta specs, and a `review.html` page: one scrolling document with the proposal's text drawings and its decisions, labeled *asked* or *assumed*. `/plan` draws in the proposal itself, with no second agent and no browser. Still no git. **A change that touches behavior plans its tests**: `tasks.md` carries a task to add or extend test coverage, which `/apply` writes and CI then runs on every push. `/save` never authors tests; coverage grows where the context is richest.
- **[`/apply`](../../.agents/skills/apply/SKILL.md)** — ensure an apply-ready plan, invoking `/plan` first when there is none; then implement the change's `tasks.md` and invoke `/save` once when every task is complete. When `/ship` invoked it, it returns instead, and `/ship` makes the one checkpoint. Where the `/save` boundary falls mid-list is [stated below](#apply-never-saves-to-stop-but-may-save-to-finish-a-task).
- **[`/save`](../../.agents/skills/save/SKILL.md)** — checkpoint, the git stage: commit code and change together, push, open or update a PR whose body **mirrors the change**, wait for CI when present, and return a preview URL. Before committing it **syncs the change** ([the living handoff](#the-change-is-a-living-handoff-not-just-a-plan)) and records the session's **facts** in the [memory store](memory.md) for `/continue`. Skipped `/plan`? `/save` authors the change from your session, so nothing ships without its handoff. After `/ship` archives, the same `/save` checkpoints the archive, so the git, PR, and CI logic exists once.
- **[`/continue`](../../.agents/skills/continue/SKILL.md)** — resume a change by name, by PR, or from a menu that also lists open threads of non-code work: check out its recorded branch, recap the proposal, the tail of its Decision log, and its memory facts, run a counts-only drift check, then hand off to `/apply`. Picks up cold on any machine from a fresh clone.
- **[`/ship`](../../.agents/skills/ship/SKILL.md)** — archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`, invoke `/save` once so the archive commit is pushed and gated, run [`/verify`](#verifying-the-app) once for evidence, then squash-merge on [the gate](#the-gate). On a branch with nothing to ship it invokes `/apply` first, which returns without a checkpoint, so a one-go run has **one** checkpoint and one CI run before the walk. A failed walk is fixed in the same PR. An unfinished change is finished through `/apply`, never archived. A merge script does the merge, the retarget, the branch delete, and the sync.

Loop back any time: invoke `/save` as often as you like while building — each save keeps the plan and Status current and **appends** to the Decision log (it never rewrites history), so the change accumulates the story of the work, not just its latest snapshot. Completing `/apply` invokes the same save workflow automatically. Re-`/plan` if the spec needs to change.

### `/apply` never saves to stop, but may save to finish a task

`/apply` never invokes `/save` to **stop**. Paused, blocked, or unfinished work is reported, and you checkpoint it yourself, so a `/apply` that gives up leaves nothing pushed. The exception is a task whose done needs [the gate](#the-gate) — CI green, a live preview, browser evidence: `/apply` runs `/save` to implement it, marks it on a pass, and stops with it unchecked on a failing or unverifiable result, as [`/verify`](#verifying-the-app) does. `/plan` names `/save` in such a task; when it is the last task, its save is the completion save, not a second one.

### Verbs for any work

A plain request needs no verb. When you invoke one for work that changes no repo file — research, an errand, a message, a change to data in a service — it keeps its stage but drops the git and OpenSpec records:

- **`/plan`** writes a short numbered to-do in the conversation and marks each step that acts outside it.
- **`/apply`** works the to-do. It asks before each outward action — a sent message, a post, a written record, a payment, a deletion — and shows exactly what it will do. Reading and drafting need no prompt.
- **`/save`** keeps the progress as a memory `thread` fact, and **`/continue`** resumes it.
- **`/ship`** is for repo changes only; the work finishes in `/apply`.

The work decides the form; no mode or setting does.

### Mini apps

"Make me a …" builds a small app in `mini-apps/apps/<name>/`, previewed from the agent host and saved [straight to the default branch](#the-prose-allowlist). [Mini apps](../stack/mini-apps.md) owns the layout, the preview, and the save.

### Verifying the app

**[`/verify`](../../.agents/skills/verify/SKILL.md)** sits *beside* the loop rather than in it. It exercises the change's own OpenSpec scenarios against the deployed preview and posts the evidence and a verdict to the PR. It **gates nothing** ([the gate](#the-gate)), which makes it safe to run early and often. [The staging walkthrough](staging-walkthrough.md) explains how and why.

## The gate

This page is where the delivery doctrine is **stated**; every other surface links here rather than
restating it. Two rules, and one carve-out.

**The gate is CI when present, else PR review.** The durable system is pull requests, version
control, OpenSpec, and everything-lives-in-the-repo; GitHub Actions is an optional accelerator,
honored when configured. Where checks exist, push and let CI run — the skills wait and fix failures.
Where they don't, the PR (plus the OpenSpec change and its archive) is the record a human reviews.
Either way, **nothing builds locally as a prerequisite.** A [mini-app](#mini-apps) preview builds the app on the agent host, but it is no exception: it gates nothing and never reaches production.

**The ladder is CI-when-present → merge**, and a skipped rung is never a failure. Nothing else gates
a merge. The app's own test suite is not a separate rung — it runs *inside* CI as an ordinary check,
so a repo that has tests gates on them automatically and one that doesn't is not penalized. The
check finds that suite by its `npm test` script, at the repo root **or in any immediate
subdirectory**, so an app in `app/` is covered with nothing added at the root — no repo receives a
package manifest on WongStack's behalf.

**A branch that leaves the main app untouched skips its suite.** When every path a branch changes,
compared with the default branch, is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`,
the Test and Deploy jobs say so and skip the main app's steps. The skip happens inside each job, so
a required check still reports green. The comparison covers the whole branch, never only the last
commit. A mini-app branch runs the changed apps' own tests instead, and Deploy still deploys the main
app, because its Worker serves the mini apps. A shared file under `mini-apps/` outside
`mini-apps/apps/`, such as `router.mjs`, is main-app code and runs the suite. In the WongStack source repo, the
Payload checks run on every push, because its skill Markdown is the payload.

**The staging walkthrough is not a rung either.** `/ship` runs [`/verify`](#verifying-the-app) once for
evidence, and merges on the gate result whatever the walk says. A walk that cannot run — no
credential, budget spent — never blocks anything. The one place a walk changes what happens is a
`FAILURE`, where `/ship` stops and **asks the user** to fix or merge anyway. That is a decision put
in front of a human, not a condition evaluated by a skill: *merge anyway* is always available.

An **unverifiable** gate is not an absent one. When the check state can't be read, `/save` reports
it as unverified and carries on — it's a checkpoint — while `/ship` consumes that same result as
unmergeable and stops rather than reinterpret or repeat it.

### The prose allowlist

**A prose-only save is a valid save.** Not every session produces a diff that needs reviewing. When
a save's entire diff sits inside the **prose allowlist** — the path prefix `wiki/**` — `/save`
commits it **directly to the default branch**: no change folder, no branch, no PR, no `/ship`.
Explicit wiki-only work takes it, and so does [repeatable knowledge](../wiki-style.md#repeatable-knowledge) written when it is learned. A conversation that produced only understanding needs no route at
all: its facts go to the [memory store](memory.md), and the save makes no commit.

The gate isn't weakened — it applies where behavior does. A wiki page carries none: it is prose
you reviewed in the diff that produced it. The
carve-out is scoped by path and exact; one changed path outside the allowlist and the
normal flow applies to the whole save. It never keys on file extension — markdown under `.agents/`
is the payload and markdown under `openspec/` is the spec, and `AGENTS.md`/`CLAUDE.md`,
`README.md`, `CHANGELOG.md`, `VERSION`, `app/**` and every config file keep the full gate. The
allowlist is closed: a surface that isn't named here gets the gate until someone deliberately adds
it. One exception, in the WongStack source repo only: a `wiki/` page that ships as payload is a
release, so it takes a branch, a PR, and a `VERSION` and `CHANGELOG.md` bump.

**A mini-app save is the second direct route.** When every changed path is inside one app's folder, `/save` runs that app's tests on the agent host and pushes to the default branch; anything else takes the normal route. [Mini apps](../stack/mini-apps.md#save-it-straight-to-production) owns the rules.

## The change is a living handoff, not just a plan

`/save` maintains three surfaces on the change so a cold reader inherits the *why*, not just the *what*:

- **`**Status:**`** — one line under the proposal's H1: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. `/save <note>` sets it (`/save blocked on API key`). It also shows in the `/continue` pick menu, so "what can I pick up?" is answerable at a glance.
- **`## Decision log`** — an **append-only** dated bullet list at the foot of `proposal.md`: what landed, what was decided or ruled out and why, what it's blocked on. Plan sections above it may change; the log never gets rewritten — that's how the journey survives across machines and people.
- **The PR body** — regenerated on every `/save` as a **mirror of the change** (Summary + Status + Tasks + Preview + a `/continue` footer), so a forge alone is a complete handoff surface. It's generated, not curated — reviewers comment rather than editing it.

## Where the plan and record live

The plan is the change folder, saved on the feature branch with the work. `/continue <name>` can find that folder on a fetched remote branch from a fresh clone. The record of what shipped is the **archived change** on the default branch plus the synced `openspec/specs/`. There are no GitHub planning or summary issues; the change *is* the plan and its archive *is* the record.

**The branch and change can have different names.** The OpenSpec folder and the session's facts use the change name. `/save` records the actual feature branch in the proposal's `**Branch:**` line. Each verb selects a change by [the selection rungs](../../.agents/skills/save/references/checkpoint-evidence.md#selection-rungs), and `/ship` will not merge a branch that carries another active change folder.

## Spec deltas are optional

Most changes are `proposal.md` + `tasks.md` only. A change writes delta specs under its `specs/` folder **only** when it formally revises a capability's spec; then `/save` folds them into `openspec/specs/` and `/ship` archives with the specs synced. WongStack adopts OpenSpec as the handoff surface — not to force spec-driven development.

## `/apply` vs `/continue`

Both end up working the change's `tasks.md`, but they enter from different places. **`/apply`** is the live-session implement stage: use it after `/plan`, directly after `/explore`, or with a clear new implementation request. It reuses an applicable ready change or invokes `/plan` first, and finishing every task automatically hands the result to `/save`. **`/continue`** is the *resume* on-ramp: it takes a handle (change name, PR, or the menu), checks out the branch, orients you (Status + Decision-log tail + drift check), then hands off to `/apply` and therefore gets the same completion behavior. Cold on another machine → `/continue`; already here → `/apply`.

Adding a verb of your own is a matter of writing a `SKILL.md` under `.agents/skills/<name>/` and pointing at it from this page — the loop above is a convention, not a hardcoded list.

Part of [working on WongStack](README.md).
