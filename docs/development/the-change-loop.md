# The change loop

Every change to WongStack — and to any repo that installs it — moves through one loop, from a rough idea to a shipped, archived spec. The durable handoff is an **[OpenSpec](https://github.com/Fission-AI/OpenSpec) change** — a folder under `openspec/changes/<name>/` (a `proposal.md` and a `tasks.md`, with optional delta specs) — committed with the code and visible from any clone via `openspec list`.

```
/explore ─▶ /plan ─▶ /apply ─▶ /save ─▶ /continue ─▶ /ship
 think      draft the  implement  push +    resume →    merge +
 (no git)   change     the tasks  PR +      /apply      archive
            (no git)   (no git)   preview
```

Each verb is a thin WongStack skill fronting one step of OpenSpec, the planning layer. **OpenSpec owns the plan; the WongStack skills own all git** — OpenSpec never runs git itself. You never have to type `/opsx:*` by hand, though those commands stay available if you want the raw step. The three *think/draft/implement* verbs (`/explore`, `/plan`, `/apply`) read and write the `openspec/` folder and the code but touch no git; the three *git* verbs (`/save`, `/continue`, `/ship`) own every branch, PR, and merge.

## The steps

- **[`/explore`](../../.claude/skills/explore/SKILL.md)** *(optional)* — think a problem through before committing to a shape. Fronts `/opsx:explore`. Nothing is written yet.
- **[`/plan`](../../.claude/skills/plan/SKILL.md)** — draft the change: a folder `openspec/changes/<name>/` holding the proposal, tasks, optional design, and optional delta specs. Fronts `/opsx:propose`. Still no git.
- **[`/apply`](../../.claude/skills/apply/SKILL.md)** — implement: work the change's `tasks.md`, writing the code and checking off `- [x]` as each task lands. Fronts `/opsx:apply`. Still no git — checkpoint with `/save` whenever you want it pushed.
- **[`/save`](../../.claude/skills/save/SKILL.md)** — checkpoint, the git stage: commit code + change together, push, open/update a PR whose body **mirrors the change**, wait for CI when present (auto-fixing failures; no checks → PR review is the gate), and return a preview URL. Before committing it **syncs the change** — plan sections update in place, the `**Status:**` header is maintained, a dated entry is **appended** to the `## Decision log`, and delta specs (if any) fold into `openspec/specs/` (`/opsx:sync`). Skipped `/plan`? `/save` authors the change from your session as a fallback, so nothing ships without its handoff.
- **[`/continue`](../../.claude/skills/continue/SKILL.md)** — resume a change by name (= branch), by PR, or from the `openspec list` menu (which shows each change's Status): check out its branch, recap the proposal + the tail of its Decision log, run a counts-only drift check, then hand off to `/apply`. Picks up cold on any machine from a fresh clone.
- **[`/ship`](../../.claude/skills/ship/SKILL.md)** — squash-merge the code to the default branch, then archive the change to `openspec/changes/archive/YYYY-MM-DD-<name>/`. Fronts `/opsx:archive`. CI is the gate when present, else PR review.

Loop back any time: `/save` as often as you like while building — each save keeps the plan and Status current and **appends** to the Decision log (it never rewrites history), so the change accumulates the story of the work, not just its latest snapshot. Re-`/plan` if the spec needs to change.

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

Both end up working the change's `tasks.md`, but they enter from different places. **`/apply`** is the implement stage — use it in a live session, already on the branch, right after `/plan`. **`/continue`** is the *resume* on-ramp: it takes a handle (change name, PR, or the menu), checks out the branch, orients you (Status + Decision-log tail + drift check), then hands off to `/apply`. Cold on another machine → `/continue`; already here → `/apply`.

See also [Adding a skill](adding-a-skill.md) for how a new verb gets wired through the payload.
