# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec:

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
(optional)
```

Each verb is a thin WongStack skill fronting one step of [OpenSpec](https://github.com/Fission-AI/OpenSpec), the planning layer. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. You never have to type `/opsx:*` by hand, though those commands stay available if you want the raw step.

## The steps

- **[`/explore`](../../.claude/skills/explore/SKILL.md)** *(optional)* — think a problem through before committing to a shape. Fronts `/opsx:explore`. Nothing is written yet.
- **[`/plan`](../../.claude/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, delta specs, design, and tasks. Fronts `/opsx:propose`.
- **[`/apply`](../../.claude/skills/apply/SKILL.md)** — implement the tasks: read the proposal/specs/design, work the `tasks.md` checklist, check off `- [x]` as each lands. No git. Fronts `/opsx:apply`.
- **[`/save`](../../.claude/skills/save/SKILL.md)** — checkpoint: maintain the change's [handoff surface](#the-handoff-surface), sync its delta specs into `openspec/specs/`, commit code + specs, push, open/update a PR whose body mirrors the change, wait for CI when present (auto-fixing failures; no checks → PR review is the gate), and return a preview URL. Fronts `/opsx:sync`.
- **[`/continue`](../../.claude/skills/continue/SKILL.md)** — resume a change on **any machine** by name (or PR, or the `openspec list` menu): check out its branch, recap the plan + the last Decision-log entries (so you inherit the *why*), run a counts-only drift check, then hand off to `/apply`.
- **[`/ship`](../../.claude/skills/ship/SKILL.md)** — run a parallel quality gate (tests + integration + docs), squash-merge the code to the default branch, then archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Fronts `/opsx:archive`.

Loop back any time: `/save` as often as you like while building; re-`/plan` if the spec needs to change.

## `/apply` vs `/continue`

Both end in the same place — working the tasks — but they start differently:

- **`/apply`** is the plain **implement** verb. Use it in a live session (right after `/plan`, or any time you're already on the change's branch). It writes code and checks off tasks; it runs no git.
- **`/continue`** is **cold-resume**. Use it when you're picking a change back up — a fresh clone, another machine, a new session. It checks out the branch, recaps the change and its Decision log, checks for drift, *then* hands off to `/apply`. It's `/apply` plus the "get me back to where I was" front matter.

So: already here and building → `/apply`. Coming back to it → `/continue`.

## The handoff surface

`/save` keeps a change resumable **cold** — from a machine with no scrollback — by maintaining three things on `proposal.md`, plus the PR:

- **`**Status:**`** — one of `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`, under the H1, alongside `**Open questions:**`. A `/save <note>` that reads as a state sets it.
- **`## Decision log`** — an **append-only**, dated record of what happened and *why* (decisions made, dead ends ruled out, what it's blocked on). Plan sections above it may change; the log never rewrites. This is what `/continue` reads back so a resumer inherits the journey, not just the destination.
- **The PR body mirrors the change** — regenerated on every `/save` from the change file (Status + plan + task checklist), so GitHub alone is a complete handoff (reviewers comment; they don't edit the body).

## The ship quality gate

A green build proves the code *compiles*; it doesn't prove the logic is *right* or that it doesn't break a caller. [`/ship`](../../.claude/skills/ship/SKILL.md) closes that gap with three subagents it launches in parallel (their briefs live in [`.claude/skills/ship/agents/`](../../.claude/skills/ship/agents/)), collected before the merge:

- **test-runner** — discovers the repo's test command, runs the suite, and writes the tests the change should have had. A real regression or a test that finds a bug is a **blocker** (it stops the merge); risky-but-untestable logic is reported as a *gap*.
- **integration-reviewer** — reads the diff for a named downstream caller that would misbehave. A concrete break is a **blocker**; duplication and missed-reuse are **advisory** (reported, never gated).
- **doc-finder** — judges whether a *reusable process* changed and finds the page to extend. Docs are captured here, at `/ship`, because it's the one moment with both the full conversation and the finished diff — which is also why we don't touch `docs/` mid-task.

Blockers stop the merge; advisory findings ride along in the ship report. This gate is stack-agnostic — it asserts nothing about the toolchain — and layers on top of the CI-when-present gate, never replacing it.

## Where the plan and record live

The plan is the change folder, on the default branch's history once shipped — `openspec list` shows every active change from a fresh clone, so there's no branch-hunting to find what someone is building. The record of what shipped is the **archived change** plus the synced `openspec/specs/`. There are no GitHub planning or summary issues; the change *is* the plan and its archive *is* the record.

**Branch name = change name.** That convention is the whole tie between a plan and its code: `/save` cuts the branch from the change name, and `/continue` and `/ship` find the branch from it.

## `/continue` is not `/opsx:continue`

WongStack's `/continue` **resumes a change and implements it** — it loads context and hands to `/apply` so you can pick work back up on any machine. OpenSpec's own step-by-step drafting stepper is a different thing; don't reach for it expecting to resume implementation. When you want to build from scratch, `/apply`; when you want to pick a change back up, `/continue`.

See also [Adding a skill](adding-a-skill.md) for how a new verb gets wired through the payload.
