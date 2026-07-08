---
name: save
description: The end-to-end checkpoint skill — the git stage of the change loop. Commits and pushes the current branch (auto-creating it + auto-committing a dirty tree), opens or updates a PR whose body mirrors the change, waits for CI when present (auto-fixing failures; no checks → PR review is the gate), and returns the per-commit preview URL. Before committing it syncs the OpenSpec change under openspec/changes/<branch>/ — updating the plan, maintaining its Status header, APPENDING a dated Decision-log entry, and folding delta specs into openspec/specs/ (/opsx:sync); when the session skipped /plan it authors the change via the same OpenSpec artifact process /plan uses. Accepts an optional trailing note (/save <note>) that sets the status and seeds the log entry. Does NOT implement tasks (that's /apply), does NOT build locally, and NEVER merges (that's /ship). Use whenever you want to save/checkpoint/snapshot the thread, push the work up, or get a shareable preview URL of in-progress work.
user-invocable: true
---

# /save

The single checkpoint runbook. Invoking it authorizes the branch creation, commit, push, PR creation + body regeneration, spec sync, and OpenSpec change authoring — don't re-prompt for those. **Confirm** anything outside this runbook (force push, hard reset, amending merged commits).

**Input:** `/save [note]` — anything after the command is an optional **checkpoint note**, e.g. `/save blocked on API key from ops`, `/save ready to ship`. The note sets the change's `**Status:**` line (when it reads as a state — blocked / ready / parked) and seeds today's Decision-log entry. Most calls are bare.

`/save` is the **git + sync** stage of the loop (`/explore → /plan → /apply → /save → /continue → /ship`). It delivers two things:

1. A pushed branch + PR with a per-commit **preview URL** (auto-discovered) and a **PR body that mirrors the change**, so a forge alone is a complete handoff surface — no clone or CLI needed to read the plan. This is `/save`'s headline job: the git mechanics of the loop (drafting is `/plan`, implementing is `/apply`).
2. A durable **OpenSpec change** under `openspec/changes/<branch>/` whose `proposal.md` *is* the current plan **plus its history**: a `**Status:**` header, the plan sections (kept current), and an append-only `## Decision log` (what happened along the way), with a `tasks.md` checklist — so a fresh session (another machine, no scrollback) can resume cold with `/continue` and know not just *what* to do but *why* it's shaped that way. Normally `/plan` drafted it and `/apply` checked off its tasks; `/save` **syncs** it. When the session skipped `/plan`, `/save` **authors it as a fallback via the same OpenSpec artifact process `/plan` uses**, so nothing gets pushed without its handoff. **The change is the plan — there is no GitHub handoff issue.**

**CI is the gate when the repo has checks; otherwise the PR itself is the checkpoint a reviewer sees.** Either way we never build or test locally. Because the change lives *in the repo*, we author it **before** the commit so it ships in the same commit; the push then triggers CI, which we wait on in Step 6.

If a step other than CI fails, stop and surface the exact error. Never bypass with `--no-verify` or `--force`. A *CI* failure is not a stop — it's the auto-fix loop's job (Step 6).

**Assume the reader is on a different machine with no access to this one** — a fresh clone, no working tree, no scrollback. The durable surface is the repo: the change's `proposal.md` (the plan + its log) and a pushed PR (whose body mirrors it). Everything the plan relies on must be pushed, and the proposal must be self-contained — reference repo files by **repo-relative path** (`src/routes/auth.ts`), never an absolute worktree path.

> **OpenSpec never runs git — this skill owns all of it.** `openspec` only reads/writes the `openspec/` folder; every `git`/`gh` action is here.
>
> `main` stands for the repo's default branch — if `git symbolic-ref refs/remotes/origin/HEAD` resolves to something else, substitute it.

## Step 1 — preflight (read-only)

```bash
git fetch origin main 2>/dev/null                # never diff against a stale origin/main
git rev-parse --abbrev-ref HEAD                   # current branch
git status --porcelain                            # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null   # commits ahead of main
openspec list                                     # active change(s), if any
```

**Don't create a branch or commit yet.** The plan comes first (Step 2), the branch is *named from it* (Step 3), and the change is authored (Step 4) so it lands in the same commit as the code. Even a **plan-only** save (a freshly authored change, no code yet) is valid: the untracked change folder makes the tree dirty, so Step 5 commits and pushes it — that's exactly what makes the plan handoff-ready.

## Step 2 — establish the current plan

The change's `proposal.md` *is* the plan — not a status report. The most concise, complete statement of what we're doing and how, so a cold reader can act.

- **Session used plan mode** → the plan is the **most recent** one you presented (the latest `ExitPlanMode` plan), updated for anything that changed since it was approved.
- **Session never used plan mode** → synthesize a concise plan from the conversation + the diff: what this work is, and the steps to finish it. This skill is authorized to run non-interactively, so don't block on a plan-mode round-trip — write the plan directly. (Only pause if you genuinely can't tell what the work is. If the session is empty — nothing learned, decided, or done — say so and skip the change.)

Keep the plan in its own shape — whatever headings it has. If a fact it relies on lived only in local scratch state or terminal output, inline it so the cold reader has it.

## Step 3 — resolve the change name + ensure the branch

**Branch name = change name** — the tie `/continue` and `/ship` rely on.

**Already on a feature branch** (not `main`, not detached) → the change name is the branch name. Resolve which change tracks it, in priority order:

1. **`openspec/changes/<branch>/` exists** → you're **updating** it.
2. **This conversation already ran `/plan`/`/apply`/`/save`/`/continue`** → you know the change name. Use it.
3. **A single active `openspec list` entry** → use it.
4. **None** → you're **creating new**; the change name is the branch name.

**On `main` or detached `HEAD`** → auto-create the feature branch now — do not prompt. **Name it from the plan**, not the machine: derive a short, descriptive kebab-case slug from the Step 2 plan's topic (a plan "add search to the receiving page" → `add-po-search`) — the slug becomes the change name, the branch, the PR, and the archive entry, so it must describe the *work*. Fall back to the worktree directory name **only** when the session is genuinely unreadable. If the slug already exists as a branch locally or on the remote, append `-<short-sha>`:

```bash
git checkout -b "$SLUG"
git rev-parse --abbrev-ref HEAD   # refresh the branch variable before continuing
```

## Step 4 — sync the OpenSpec change (append, never rewrite)

If `/plan` already drafted the change and `/apply` has been checking off tasks, this is a light **sync**. Full authoring (4b) is the **fallback** for sessions that skipped `/plan`. Either way the shape is the same — and the prime directive is: **plan sections update in place; Status is maintained; the Decision log only ever appends.**

### 4a. The change's living surfaces

- **`**Status:**` + `**Open questions:**`** — two lines directly under the H1 of `proposal.md`. Maintain them every save. Status vocabulary: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. A `/save <note>` that reads as a state sets Status; open questions are the decisions only the user can make (empty = `none`).
- **Plan sections** (Why / What Changes / Impact, or whatever shape the plan has) — update **in place** to the latest plan from Step 2. These are the *current* intent; they're allowed to change.
- **`## Decision log`** — the last section of `proposal.md`, **append-only**. Each save appends one dated bullet: `- **YYYY-MM-DD** — <what landed, what was decided or discovered and why, what was ruled out, what it's blocked on>`. Fold the `/save <note>` in. **Never rewrite, reorder, or delete prior entries** — the log is how a cold reader (or another team) gets the journey, not just the destination.
- **`tasks.md`** — make the checklist reflect reality: check off `- [x]` what's done, add tasks the plan grew, group by the surface each touches.

### 4b. Creating the change fresh (the skipped-`/plan` fallback)

Author it **via the same OpenSpec artifact process `/plan` uses** — don't freehand the shape:

```bash
NAME=$(git rev-parse --abbrev-ref HEAD)
[ -d "openspec/changes/$NAME" ] || openspec new change "$NAME"
openspec status --change "$NAME" --json          # artifact build order
openspec instructions proposal --change "$NAME"  # exact sections + config context
```

Then write the artifacts (OpenSpec never runs git; you write the files):

- **`proposal.md`** — the plan per the instructions' sections, self-contained, repo-relative paths, led by **what changes and why** — plus the Status/Open-questions header and an initial Decision-log entry (4a).
- **`tasks.md`** — the `- [ ]` checklist per 4a, with already-done work checked off.
- **`design.md`** — only when the change warrants it (cross-cutting, new pattern, real trade-offs) — same bar `/plan` applies.

### 4c. Sync delta specs, if any

- **The change carries delta specs** (`openspec/changes/<name>/specs/**`, written because it formally revises a capability's spec) → **invoke the `openspec-sync-specs` skill** (via the Skill tool) for `<name>` to fold them into `openspec/specs/`. This is OpenSpec's `/opsx:sync`.
- **No delta specs** → skip; **most changes have none** — proposal + tasks are the whole plan.

Sanity-check with `openspec list` (it should show the change + task progress). **Only run `openspec validate "$NAME"` when the change carries delta specs** — `validate` errors with "must have at least one delta" for a proposal-only change, which is *expected*, not a failure; don't gate the save on it.

## Step 5 — commit (code + change) + push + PR (body mirrors the change)

Stage the code **and** the `openspec/` change **by path** (never `git add .`) so they land in one commit:

```bash
git add -u
git add openspec/changes/"$NAME" <relevant new source/doc/config files by path>
```

- **Clean tree, 0 commits ahead of `origin/main`** → nothing to push; report the change you authored and stop (a pure research/decision session is a valid `/save` with no PR).
- **Otherwise** commit with a one-line repo-style message (`feat: <topic> — <details>` / `fix: <topic> — <details>`; see `git log -5`), via HEREDOC with a `Co-Authored-By: Claude` trailer.

**Discover the preview URL** (best-effort — the PR body links it):

```bash
ROOT="$(git rev-parse --show-toplevel)"
PREVIEW_URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh")
```

Then:

```bash
gh pr view --json number,state,url 2>/dev/null
```

- **PR is OPEN** → `git push`, then **regenerate the body**: `gh pr edit --body` with the template below.
- **No PR** → `git push -u origin HEAD`, then `gh pr create` (HEREDOC body = the template below; title in repo style).
- **PR is MERGED** → the branch is already shipped — skip the CI wait and note there's no live preview.
- **PR is CLOSED (not merged)** → ask whether to reopen or push to a fresh branch. Don't silently revive a closed PR.

**The PR body is a mirror of the change, regenerated on every save** — the change file is the source of truth, so overwriting the body is safe by construction (reviewers comment on the PR; they don't edit the body). Template:

```markdown
## Summary

**Status:** <Status line from proposal.md>

<the proposal's Why / What Changes, condensed to a few readable lines>

## Tasks

<the tasks.md checklist verbatim, current checkbox state>

## Preview

[<PREVIEW_URL>](<PREVIEW_URL>)   ← omit this whole section if no preview URL was found

---
_Handoff: `openspec/changes/<name>/` — resume with `/continue <name>`. This body is regenerated by every `/save`; comment rather than editing it._
```

**The push above triggers CI** (where the repo has it). Go to Step 6 and wait on it.

## Step 6 — wait for CI (if any), auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
Read the final `RESULT:` line:
- **SUCCESS** / **NONE** (no checks configured — the PR review is the gate) → Step 7.
- **TIMEOUT** → report checks still running + the PR link; don't block.
- **FAILURE** → read the failing log, fix, commit, push, re-wait. **Cap 3 attempts**; still red → stop with the error + checks link.
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```

## Step 7 — report

Keep it short — the user invoked this to get a URL + a saved change, not a wall of text:

- Branch + commit pushed (`git log -1 --oneline`); PR number + URL, noting the body mirrors the change.
- **Change** — synced or authored at `openspec/changes/<name>/`, its current **Status**, and the Decision-log entry appended (name the capability specs synced, if any). Resumable with `/continue <name>`.
- **CI** — ✅ green / 🔧 auto-fixed in N pushes / ❌ red after 3 (with the error) / ⏳ still running / — none configured (PR review is the gate).
- **Preview** — a markdown link whose visible text *is* the full URL (`[https://…](https://…)`); never bare or in a code block. None found → say so (check the PR's deploy comment).

## Hard rules
- Never `git push --force`. Never `--no-verify`. Never push to the default branch — branch off (Step 3).
- **Never build/test locally as a gate.** CI is the gate when present, else PR review; a CI failure is fixed-and-re-pushed, never a stop (except after 3 attempts).
- **Never merge** — that's `/ship` (which also archives the change).
- **The Decision log is append-only.** Never rewrite, reorder, or delete prior entries; plan sections may change, history may not.
- **The PR body is generated, not curated** — regenerate it from the change every save; never try to preserve manual body edits (reviewers comment instead).
- **One change per line of work** — update the branch's existing `openspec/changes/<branch>/` rather than spawning duplicates. No GitHub handoff issues — the OpenSpec change is the plan.
