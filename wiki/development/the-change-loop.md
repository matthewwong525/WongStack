# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec. The durable handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change** — a folder under `openspec/changes/<name>/` (a `proposal.md` and a `tasks.md`, with optional delta specs) — committed with the code and visible from any clone via `openspec list`.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

Each verb is a thin WongStack skill fronting one step of OpenSpec, the planning layer. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. You never have to type `/opsx:*` by hand, though those commands stay available if you want the raw step. The three *think/draft/implement* verbs (`/explore`, `/plan`, `/apply`) implement no git themselves; the three *git* verbs (`/save`, `/continue`, `/ship`) own every branch, PR, and merge. When `/apply` completes every task, it automatically crosses that boundary by invoking `/save`.

## The steps

- **[`/explore`](../../.claude/skills/explore/SKILL.md)** *(optional)* — think a problem through before committing to a shape. Fronts `/opsx:explore`. Nothing is written yet.
- **[`/plan`](../../.claude/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, tasks, optional design, and optional delta specs. Fronts `/opsx:propose`. Still no git.
- **[`/apply`](../../.claude/skills/apply/SKILL.md)** — implement: work the change's `tasks.md`, writing the code and checking off `- [x]` as each task lands. Fronts `/opsx:apply`, then invokes `/save` exactly once when every task is complete. A paused or blocked apply does not auto-save; invoke `/save` yourself only if you want that partial state checkpointed.
- **[`/save`](../../.claude/skills/save/SKILL.md)** — checkpoint, the git stage: commit code + change together, push, open/update a PR whose body **mirrors the change**, wait for CI when present (auto-fixing failures; no checks → PR review is the gate), and return a preview URL. Before committing it **syncs the change** — plan sections update in place, the `**Status:**` header is maintained, a dated entry is **appended** to the `## Decision log`, and delta specs (if any) fold into `openspec/specs/` (`/opsx:sync`). Skipped `/plan`? `/save` authors the change from your session as a fallback, so nothing ships without its handoff. It also writes the **session note** (`notes/<slug>.md`) — the conversation compressed into the repo, which is what lets `/dream` consolidate from another machine.
- **[`/continue`](../../.claude/skills/continue/SKILL.md)** — resume a change by name (= branch), by PR, or from the `openspec list` menu (which shows each change's Status): check out its branch, recap the proposal + the tail of its Decision log + the session note when one exists, run a counts-only drift check, then hand off to `/apply`. Picks up cold on any machine from a fresh clone.
- **[`/ship`](../../.claude/skills/ship/SKILL.md)** — squash-merge the code to the default branch, then archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Fronts `/opsx:archive`. It merges through [the gate](#the-gate) below.

Loop back any time: invoke `/save` as often as you like while building — each save keeps the plan and Status current and **appends** to the Decision log (it never rewrites history), so the change accumulates the story of the work, not just its latest snapshot. Completing `/apply` invokes the same save workflow automatically. Re-`/plan` if the spec needs to change.

### Walking the app

**[`/walk`](../../.claude/skills/walk/SKILL.md)** sits *beside* the loop rather than in it. It invokes `/save`, then drives the change's own OpenSpec scenarios through a real browser against the deployed preview and posts screenshots, video, and a verdict to the PR. Invoke it whenever you want to see the thing working — mid-change, twice in a row, or right before `/ship`.

It **gates nothing**: no verdict blocks a merge, and no other verb consults its result. That's what makes it safe to run early and often. Opt-in per repo and detected from state — see [the runbook](../stack/staging-walkthrough.md).

## The gate

This page is where the delivery doctrine is **stated**; every other surface links here rather than
restating it. Two rules, and one carve-out.

**The gate is CI when present, else PR review.** The durable system is pull requests, version
control, OpenSpec, and everything-lives-in-the-repo; GitHub Actions is an optional accelerator,
honored when configured. Where checks exist, push and let CI run — the skills wait and fix failures.
Where they don't, the PR (plus the OpenSpec change and its archive) is the record a human reviews.
Either way, **nothing builds locally as a prerequisite.**

**The ladder is CI-when-present → merge**, and a skipped rung is never a failure. Nothing else gates
a merge. In particular the [staging walkthrough](../stack/staging-walkthrough.md) does not: it's
reached by invoking [`/walk`](#walking-the-app), and `/ship` neither runs it nor checks whether it
ran.

An **unverifiable** gate is not an absent one. When the check state can't be read, `/save` reports it
as unverified and carries on — it's a checkpoint — while `/ship` stops rather than merge on it.

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

Both end up working the change's `tasks.md`, but they enter from different places. **`/apply`** is the implement stage — use it in a live session, already on the branch, right after `/plan`; finishing every task automatically hands the result to `/save`. **`/continue`** is the *resume* on-ramp: it takes a handle (change name, PR, or the menu), checks out the branch, orients you (Status + Decision-log tail + drift check), then hands off to `/apply` and therefore gets the same completion behavior. Cold on another machine → `/continue`; already here → `/apply`.

See also [Adding a skill](adding-a-skill.md) for how a new verb gets wired through the payload.
