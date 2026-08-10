# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec. The durable handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change** — a folder under `openspec/changes/<name>/` (a `proposal.md` and a `tasks.md`, with optional delta specs) — committed with the code and visible from any clone via `openspec list`.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

Each verb is a thin WongStack skill fronting one step of OpenSpec, the planning layer. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. You never invoke the OpenSpec layer directly — `openspec init` generates six `openspec-*` skills, which these verbs call for you, and no `/opsx:*` slash commands. The three *think/draft/implement* verbs (`/explore`, `/plan`, `/apply`) implement no git themselves; the three *git* verbs (`/save`, `/continue`, `/ship`) own every branch, PR, and merge. When `/apply` completes every task, it automatically crosses that boundary by invoking `/save`.

The diagram shows the durable stages, not a command tollbooth. In a live session you can go straight from `/explore` to `/apply`: when the current work has no apply-ready change, `/apply` invokes `/plan` first, then implements the exact change that planning produced. The OpenSpec folder still exists before code is written; only the extra user invocation disappears. Invoke `/plan` yourself when you want to stop and review the artifacts before implementation.

## The steps

- **[`/explore`](../../.claude/skills/explore/SKILL.md)** *(optional)* — think a problem through before committing to a shape. Fronts the `openspec-explore` skill. Nothing is written yet.
- **[`/plan`](../../.claude/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, tasks, optional design, and optional delta specs. Fronts the `openspec-propose` skill. Still no git. **A change that touches behavior plans its tests**: `tasks.md` carries a task to add or extend the app's test coverage, which `/apply` writes while implementing and CI then runs on every push forever. Prose-only changes get no such task, and `/save` never authors tests — coverage grows where the context is richest, not at the checkpoint.
- **[`/apply`](../../.claude/skills/apply/SKILL.md)** — ensure the current work has an apply-ready plan, invoking `/plan` first when it does not; then implement the exact change's `tasks.md`, writing the code and checking off `- [x]` as each task lands. Fronts the `openspec-apply-change` skill for implementation, then invokes `/save` exactly once when every task is complete. Where the `/save` boundary falls mid-list is [one distinction](#apply-never-saves-to-stop-but-may-save-to-finish-a-task), stated below.
- **[`/save`](../../.claude/skills/save/SKILL.md)** — checkpoint, the git stage: preserve explicitly named session secrets in the primary worktree while excluding their values from every durable surface; commit code + change together; push; open/update a PR whose body **mirrors the change**; wait for CI when present (auto-fixing failures; no checks → PR review is the gate); and return a preview URL. Before committing it **syncs the change** — plan sections update in place, the `**Status:**` header is maintained, a dated entry is **appended** to the `## Decision log`, and delta specs (if any) fold into `openspec/specs/` (the `openspec-sync-specs` skill). Skipped `/plan`? `/save` authors the change from your session as a fallback, so nothing ships without its handoff. It also writes the credential-redacted **session note** (`notes/<slug>.md`) — the conversation compressed into the repo, which is what lets `/dream` consolidate from another machine. After `/ship` archives, ordinary `/save` recognizes that branch's archive and checkpoints it, so the git/PR/CI logic exists once.
- **[`/continue`](../../.claude/skills/continue/SKILL.md)** — resume a change by name (= branch), by PR, or from the `openspec list` menu (which shows each change's Status): check out its branch, recap the proposal + the tail of its Decision log + the session note when one exists, run a counts-only drift check, then hand off to `/apply`. Picks up cold on any machine from a fresh clone.
- **[`/ship`](../../.claude/skills/ship/SKILL.md)** — verify the feature/default branches, archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/` through `openspec-archive-change`, invoke ordinary `/save` exactly once so that exact archive commit is pushed and gated, run [`/walk`](#walking-the-app) once for evidence, then squash-merge and delete the remote branch worktree-safely. It owns no duplicate commit, PR, or branch-CI implementation. The walk is evidence, not a rung: every verdict but `FAILURE` reports and the merge proceeds on the gate result, and a `FAILURE` asks you whether to fix or merge anyway.

Loop back any time: invoke `/save` as often as you like while building — each save keeps the plan and Status current and **appends** to the Decision log (it never rewrites history), so the change accumulates the story of the work, not just its latest snapshot. Completing `/apply` invokes the same save workflow automatically. Re-`/plan` if the spec needs to change.

### `/apply` never saves to stop, but may save to finish a task

`/apply` never invokes `/save` as a way of **stopping**. Work that is paused, blocked, interrupted,
or failed — or that simply ends with tasks still pending — is reported to you, and you checkpoint it
deliberately. That is the property worth keeping: a `/apply` that gives up leaves nothing pushed.

But when a task's own definition of done needs the gate — CI green, a live preview, browser evidence
— invoking `/save` **is** how that task gets implemented, because `/apply` owns no git and
[nothing builds locally](#the-gate). `/apply` runs it, reads the result, marks the task, and carries
on down the list. One automatic save still closes the change when the last task lands.

So the boundary is **exit versus implementation**, not complete versus incomplete. A task-driven
save is unbounded — `tasks.md` bounds it — while "exactly once" qualifies the completion handoff
alone; when the final task is itself gate-requiring, its save already checkpointed that state and no
second one follows. A task-driven save that comes back failing or unverifiable is the ordinary
blocked path: the task stays unchecked, `/apply` reports and stops, and adds no exit checkpoint on
top. [`/walk`](#walking-the-app) has always worked this way — it invokes `/save` mid-change and
gates nothing — and this is the same rule, stated for the whole loop.

`/plan` writes such a task so it says so, naming `/save` as how the verification happens. Most
changes have none: the completion handoff covers them.

### Walking the app

**[`/walk`](../../.claude/skills/walk/SKILL.md)** sits *beside* the loop rather than in it. It scouts the change's own OpenSpec scenarios, and when any of them is browser-observable it invokes `/save`, drives them through a real browser against the deployed preview, and posts screenshots, video, and a verdict to the PR. A change with nothing to see costs nothing — the scout answers `NONE` before anything is pushed. Invoke it whenever you want to see the thing working — mid-change, twice in a row, or right before `/ship`.

It **gates nothing**, which is what makes it safe to run early and often. `/ship` runs it once as an evidence step and merges on the CI gate regardless of the verdict; the single exception is a `FAILURE`, which stops to ask you whether to fix or merge anyway — a decision surfaced, not a rung applied. No verdict blocks a merge on its own, and no other verb consults its result. It works in any repo on any stack — its browser is a standalone CLI installed on the machine, never a dependency added to your project — and [`staging-walkthrough.md`](staging-walkthrough.md) is its runbook.

## The gate

This page is where the delivery doctrine is **stated**; every other surface links here rather than
restating it. Two rules, and one carve-out.

**The gate is CI when present, else PR review.** The durable system is pull requests, version
control, OpenSpec, and everything-lives-in-the-repo; GitHub Actions is an optional accelerator,
honored when configured. Where checks exist, push and let CI run — the skills wait and fix failures.
Where they don't, the PR (plus the OpenSpec change and its archive) is the record a human reviews.
Either way, **nothing builds locally as a prerequisite.**

**The ladder is CI-when-present → merge**, and a skipped rung is never a failure. Nothing else gates
a merge. The app's own test suite is not a separate rung — it runs *inside* CI as an ordinary check,
so a repo that has tests gates on them automatically and one that doesn't is not penalized. The
check finds that suite by its `npm test` script, at the repo root **or in any immediate
subdirectory**, so an app in `app/` is covered with nothing added at the root — no repo receives a
package manifest on WongStack's behalf.

**The staging walkthrough is not a rung either.** `/ship` runs [`/walk`](#walking-the-app) once for
evidence, and merges on the gate result whatever the walk says. A walk that cannot run — not adopted,
no credential, budget spent — never blocks anything; that property is exactly what the old
walk-as-gate lacked, and why it was removed. The one place a walk changes what happens is a
`FAILURE`, where `/ship` stops and **asks the user** to fix or merge anyway. That is a decision put
in front of a human, not a condition evaluated by a skill: *merge anyway* is always available.

An **unverifiable** gate is not an absent one. When the check state can't be read, `/save` reports
it as unverified and carries on — it's a checkpoint — while `/ship` consumes that same result as
unmergeable and stops rather than reinterpret or repeat it.

### The prose allowlist

**A prose-only save is a valid save.** Not every session produces a diff that needs reviewing. When
a save's entire diff sits inside the **prose allowlist** — the two path prefixes `notes/**` and
`wiki/**` — `/save` commits it **directly to the default branch**: no change folder, no branch, no
PR, no `/ship`. A conversation that produced only understanding takes it (just `notes/<slug>.md`),
and so does a `/dream` run (wiki pages plus the `consolidated:` stamps).

The gate isn't weakened — it applies where behavior does. Neither surface carries any: a note is raw
and non-canonical, and a wiki page is prose you already reviewed in-session on the diff `/dream`
produced. The carve-out is scoped by path and exact; one changed path outside the allowlist and the
normal flow applies to the whole save. It never keys on file extension — markdown under `.claude/`
is the payload and markdown under `openspec/` is the spec, and `AGENTS.md`/`CLAUDE.md`,
`README.md`, `CHANGELOG.md`, `VERSION`, `app/**` and every config file keep the full gate. The
allowlist is closed: a surface that isn't named here gets the gate until someone deliberately adds
it. See [`notes/README.md`](../../notes/README.md).

## The change is a living handoff, not just a plan

`/save` maintains three surfaces on the change so a cold reader inherits the *why*, not just the *what*:

- **`**Status:**`** — one line under the proposal's H1: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. `/save <note>` sets it (`/save blocked on API key`). It also shows in the `/continue` pick menu, so "what can I pick up?" is answerable at a glance.
- **`## Decision log`** — an **append-only** dated bullet list at the foot of `proposal.md`: what landed, what was decided or ruled out and why, what it's blocked on. Plan sections above it may change; the log never gets rewritten — that's how the journey survives across machines and people.
- **The PR body** — regenerated on every `/save` as a **mirror of the change** (Summary + Status + Tasks + Preview + a `/continue` footer), so a forge alone is a complete handoff surface. It's generated, not curated — reviewers comment rather than editing it.

## Where the plan and record live

The plan is the change folder, on the default branch's history once shipped — `openspec list` shows every active change from a fresh clone, so there's no branch-hunting to find what someone is building. The record of what shipped is the **archived change** plus the synced `openspec/specs/`. There are no GitHub planning or summary issues; the change *is* the plan and its archive *is* the record.

**Branch name = change name.** That convention is the whole tie between a plan and its code: `/save` cuts the branch from the change name, and `/continue` and `/ship` find the branch from it.

## Spec deltas are optional

Most changes are `proposal.md` + `tasks.md` only. A change writes delta specs under its `specs/` folder **only** when it formally revises a capability's spec; then `/save` folds them into `openspec/specs/` and `/ship` archives with the specs synced. WongStack adopts OpenSpec as the handoff surface — not to force spec-driven development.

## `/apply` vs `/continue`

Both end up working the change's `tasks.md`, but they enter from different places. **`/apply`** is the live-session implement stage: use it after `/plan`, directly after `/explore`, or with a clear new implementation request. It reuses an applicable ready change or invokes `/plan` first, and finishing every task automatically hands the result to `/save`. **`/continue`** is the *resume* on-ramp: it takes a handle (change name, PR, or the menu), checks out the branch, orients you (Status + Decision-log tail + drift check), then hands off to `/apply` and therefore gets the same completion behavior. Cold on another machine → `/continue`; already here → `/apply`.

Adding a verb of your own is a matter of writing a `SKILL.md` under `.claude/skills/<name>/` and pointing at it from this page — the loop above is a convention, not a hardcoded list.
