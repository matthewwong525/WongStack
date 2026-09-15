---
name: plan
description: Draft an OpenSpec change — proposal, specs, design, and tasks — in one step, ready to implement. Every change also gets review.html, a page whose What Changes list is the navigation: click a change, see a picture of it (a wireframe screen, a flow, a diff, a file tree), annotate it, and copy the notes back as a /continue command. WongStack's name for OpenSpec's /opsx:propose. Use when you want to plan or spec out what to build before writing code, or to mock up a UX before building it; pairs with /apply to implement and /ship to archive.
user-invocable: true
---

# /plan

`/plan` is WongStack's name for OpenSpec's **propose** step — it drafts a complete change under `openspec/changes/<name>/` (proposal, delta specs, design, tasks) so you have a spec to build against.

`/explore → /plan → /apply → /save → /continue → /ship` — the [change loop](../../../wiki/development/the-change-loop.md), which owns what each verb does and where the git boundary falls.

## Explore first, always

**Invoke the [`explore` skill](../explore/SKILL.md) in bounded mode before you draft anything** — whether `/plan` was invoked by the user, by [`/apply`](../apply/SKILL.md), or through [`/ship`](../ship/SKILL.md). It reads the conversation, investigates only what the conversation doesn't answer, then runs its **exit round**: one question set, at most four questions, recommended option first. A fork the conversation already settled is never asked, so a `/plan` that follows a thorough `/explore` session asks nothing and costs a short pass.

Then invoke the propose step with the intent **and the answers**.

**Record every answer in the proposal's `## Decision log`** — `asked X → chose Y`, or `asked X → assumed Y (non-interactive)` where nobody could answer and `/explore` took the recommended option. Keep the two distinguishable: a reviewer must be able to tell a decision from a default.

`/plan` asks no clarification questions of its own. `/explore` owns the round; the single exception is the [UX layout fork](#ux-stage-ui-bearing-changes-only) below, which can only be seen after the design is drafted.

**Invoke the `openspec-propose` skill** (via the Skill tool) and follow it verbatim — that skill is OpenSpec's `/opsx:propose` and owns the actual behavior (naming the change, generating artifacts in dependency order, validating), subject to the apply handoff below.

## When `/apply` invokes `/plan`

`/apply` may invoke this skill to make its selected line of work apply-ready before implementation. Treat the change name or implementation intent it passes as the user's chosen input, and return the exact resulting change name to `/apply`.

- **No matching change exists** → create it through the ordinary `openspec-propose` artifact process.
- **`/apply` explicitly selected an existing incomplete change** → complete that same change's missing artifacts in dependency order. The user's `/apply` request already answers the generated skill's “continue it or create new?” guardrail: continue it, and never create a duplicate.
- **The required intent is unclear or artifact creation blocks** → pause and return the blocker; `/apply` will not start implementation.

**The bounded [`/explore`](#explore-first-always) pass still runs on this path**, so the questions reach the user before any code is written — that's the whole point of asking at the front of the chain rather than in review.

This handoff changes no standalone behavior: `/plan` invoked by itself creates the apply-ready artifacts and stops for review. It never invokes `/apply` automatically.

## Review stage (every change)

After design.md's first draft and **before tasks.md**, draw the change. This stage writes **`openspec/changes/<name>/review.html`** — the reviewer's page for this change, filled from [the review kit](references/review-kit.html). The proposal's What Changes list is its navigation: a reviewer clicks a change and sees a picture of *that* change, annotates it in place, and copies the notes back as a `/continue` command.

**Every change gets one**, not only UI-bearing ones — most bullets in most changes are not screens, and a bullet that changes a rule or a runbook is exactly as hard to picture from a sentence. The kit has four kinds:

| Kind | For |
|---|---|
| `screen` | a UI screen, with its empty, loading, and error states — the wireframe as before |
| `flow` | a sequence of steps, with a today lane and an after lane |
| `diff` | before-and-after text: a rule, a config value, a template, prose |
| `tree` | files added, edited, removed |

A bullet with nothing to draw needs no visual — it opens a text stage on its own, so a click is never dead. Two bullets may share one visual.

**A change that adds or meaningfully restructures a screen** (a page or component — not merely touching a UI file) *also* gets the `## UX` section of design.md, in the shape defined by [`wiki/ux-principles.md`](../../../wiki/ux-principles.md) (which the `openspec/config.yaml` `design` rule also enforces for any author outside this skill). A worker-only, CLI, library, or prose change writes no `## UX` section and no `screen` visual — it still gets the page.

1. **Design subagent.** Spawn a subagent (Agent tool) that reads: the change's proposal.md + draft design.md, [the review kit](references/review-kit.html), and — when the change touches a screen — `wiki/ux-principles.md`, your repo's UI/component conventions doc if it has one, and the 1–2 closest analogous existing screens (name them in the prompt — design by mirroring, not by inventing). It does two things:
   - **Writes `openspec/changes/<name>/review.html`** — a copy of the kit with one visual per What Changes bullet that has something to show, each of the four kinds used where it fits, `data-mark` on the elements each bullet changes, and a numbered callout per choice that matters with its matching notes line. A `screen` visual carries every screen in the flow with the states the design names and one primary action per state wired with `data-go`. It follows the kit's fill rules, which forbid new CSS, colour, fonts, and any network load, and it leaves the machine-filled proposal block alone. This is the **one file it writes**.
   - **Returns the bullet-to-anchor map** — for each What Changes bullet, the `review.html#/<visual>[/<state>][/<mark>]` anchor it should carry, or "no visual" — **and**, for a screen-bearing change, the `## UX` section text: use-case brief with stated frequency assumptions, flow from intent to done, hierarchy map (the one primary action per screen), component inventory, and a `### Review` subsection that **links `review.html` and lists its screens and states by anchor** rather than sketching them.

   **The brief decides the phone.** When the use-case brief says the job is done on a phone, the screen is drawn phone-first, using the kit's `phone-only` and `desktop-only` helpers to carry both layouts in one screen. A reviewer walks either through the chrome's View toggle.

2. **Critic subagent.** Spawn a second subagent with the written `review.html`, the anchor map, the proposal, and — for a screen-bearing change — the draft `## UX` section and `wiki/ux-principles.md`. It answers: *does every visual actually show what its bullet claims?* and, where there are screens, *does every screen serve the stated job, and where does this violate ux-principles.md?* The fixed kit makes much of that mechanical — flag:
   - a bullet anchor that resolves to no visual, state, or mark, and a visual or mark no bullet references;
   - a mark that shares a name with one of its visual's states (the router reads it as the state and highlights nothing);
   - more than one `.btn.primary` visible in a single state (markup outside the state blocks shows in all of them, so a header button plus an inline empty-state button is two);
   - a state named in `data-states` with no matching `.state-<name>` block;
   - a screen nothing navigates to;
   - any state that overflows at phone width, when the brief says phone;
   - any style, colour, or network reference added to the kit.

   Feed its findings into a single revision round (rerun the design subagent with the critique). One round only — don't loop.

3. **Anchor the bullets + surface forks.** The revision round rewrites the file as well as the text. The main thread then **confirms `review.html` exists**, **appends each bullet's anchor to its What Changes bullet in `proposal.md`** as a trailing `(review.html#/…)`, runs the sync script so the page's panel matches the proposal —

   ```bash
   ROOT="$(git rev-parse --show-toplevel)"
   node "$ROOT/.claude/skills/save/scripts/sync-review-proposal.mjs" "openspec/changes/<name>"
   ```

   — and appends the `## UX` section to design.md when there is one. If the critique exposed a genuine layout fork (e.g. table-with-drawer vs master-detail), surface it to the user as one AskUserQuestion before writing tasks.md; otherwise default to mirroring the named existing screen.

4. **Tasks reference what they build.** When drafting tasks.md, a task that builds or edits something a visual shows points at it (per the `openspec/config.yaml` `tasks` rule), e.g. `- [ ] 3.2 Build the list view per review.html#/list/default`.

The file is committed with the change and moves into `openspec/changes/archive/` with it, so it stays the record of what was planned. It is self-contained, so a reviewer opens it straight from a clone with no server, on a laptop or a phone — a forge shows it as source rather than rendering it.

## Ask whether it should be code

Before the tasks are written, weigh a deterministic script against a step that calls a model every run. A process that repeats belongs in `tasks.md` as a script to write once, not as a task that asks an agent to redo the same judgment every time. [The principles](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai) own the rule; `/explore` raises it first when the session starts there.

## Tasks include their tests

When the change touches **behavior a test can exercise**, `tasks.md` carries a task to add or extend that coverage — grouped with the surface it tests, not bolted on at the end. A prose-only change (wiki, notes, skill text) gets no such task.

The tests are written by `/apply`, while it implements — the moment the context is richest. They are *not* written at checkpoint time: `/save` is a pure checkpoint and never authors tests. From then on the app's suite runs as an ordinary CI check on every push, so coverage ratchets up and nothing has to re-argue it.

## A task that needs the gate says so

Some work can only be verified by pushing — a build that must pass, a preview that must deploy,
browser evidence that must land on the PR. Nothing builds locally, so write such a task so it names
`/save` as how the verification happens (e.g. `- [ ] 4.2 Confirm the migration runs on the preview
— verified via /save`). That tells the implementer the task is completed by a checkpoint rather
than a local command; `/apply` treats [that save as implementation, not as an
exit](../../../wiki/development/the-change-loop.md#apply-never-saves-to-stop-but-may-save-to-finish-a-task).

Don't add one by reflex. Most changes need no gate result before their later tasks can proceed, and
the automatic checkpoint at the end of `/apply` already covers them.

**Convention:** the change name *is* the branch name — when you start implementing, work happens on a branch named after the change. Once the proposal reads right, implement it with [`/apply`](../apply/SKILL.md) (which fronts `/opsx:apply` and automatically hands completed work to `/save`), checkpoint partial work at any time with [`/save`](../save/SKILL.md), and resume with [`/continue`](../continue/SKILL.md).
