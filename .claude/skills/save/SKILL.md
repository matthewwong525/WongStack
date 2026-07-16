---
name: save
description: Checkpoint the current branch — maintain the active OpenSpec change's handoff surface (a Status header + append-only Decision log on proposal.md), sync its delta specs into openspec/specs/ (/opsx:sync), commit code + specs, push, open or update a PR whose body MIRRORS the change, wait for GitHub checks to pass when present (auto-fixing CI failures), and return the preview URL. Accepts an optional trailing note (/save <note>) that sets the status and seeds the log entry. Does NOT build locally (CI is the gate when present, else PR review) and NEVER merges (that's /ship). Use whenever you want to save/checkpoint/preview in-progress work.
user-invocable: true
---

# /save

Checkpoint runbook. Invoking it authorizes the branch creation, commit, push, PR creation + body regeneration, and change-surface maintenance — don't re-prompt for those. Confirm anything outside this runbook (force push, hard reset).

`/save` is the **sync + checkpoint** step of the loop (`/explore → /plan → /apply → /save → /continue → /ship`). Two deliverables:

1. A pushed branch + PR whose **body mirrors the change**, with a preview URL — so GitHub alone is a complete handoff surface (no clone needed to read the plan).
2. A durable **change** at `openspec/changes/<branch>/` whose `proposal.md` *is* the current plan **plus its history** — a `**Status:**` header, the plan sections (kept current), and an append-only `## Decision log` — so a fresh session on any machine can resume cold with `/continue` and know not just *what* to do but *why*.

**The `openspec/changes/` change is the plan — there's no GitHub handoff issue.** CI is the gate when the repo has checks; otherwise the PR itself is the checkpoint a reviewer sees. Either way we never build/test locally.

**Input:** `/save [note]` — anything after the command is an optional **checkpoint note** (e.g. `/save blocked on API key`, `/save ready to ship`). A note that reads as a state sets the change's `**Status:**`; it also seeds today's Decision-log entry. Most calls are bare.

> `main` stands for the repo's default branch — if `git symbolic-ref refs/remotes/origin/HEAD` resolves to something else, substitute it.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD            # current branch
git status --porcelain                      # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null
openspec list                               # active change(s), if any
```

- **Resolve the active change first** — it names the branch and drives Steps 2–3. It's the change whose name matches the current branch (`openspec/changes/<branch>/`), else the sole entry in `openspec list`, else none (a pure-code/docs branch). Ambiguous (several active, none matching the branch) → ask which one you're saving.
- **On the default branch or detached HEAD** → auto-create a feature branch; don't prompt. **Branch name = the active change name** (so `/continue` and `/ship` can find it); no active change → slug the worktree dir:
  ```bash
  git checkout -b "<change-name-or-slug>"
  ```
- Don't commit yet — maintain the change surface (Step 2) and sync (Step 3) first, so both land in the same commit. Even a **plan-only** save (a freshly proposed change, no code yet) is valid: the untracked change folder makes the tree dirty, so Step 4 commits and pushes it — that's what makes the plan handoff-ready.

## Step 2 — maintain the change's handoff surface (append, never rewrite)

Using the change resolved in Step 1. **The prime directive: plan sections update in place; Status is maintained; the Decision log only ever appends.** Three living surfaces on `proposal.md`:

- **`**Status:**` + `**Open questions:**`** — two lines directly under the H1. Maintain them every save. Status vocabulary: `in-progress` | `blocked (<on what>)` | `ready-to-ship` | `parked`. A `/save <note>` that reads as a state sets Status; open questions are the decisions only the user can make (`none` when empty).
- **Plan sections** (Why / What Changes / Impact, or whatever shape the plan has) — update **in place** to the latest intent. These are allowed to change.
- **`## Decision log`** — the last section of `proposal.md`, **append-only**. Each save appends one dated bullet: `- **YYYY-MM-DD** — <what landed, what was decided or discovered and why, what was ruled out, what it's blocked on>`. Fold in the `/save <note>`. **Never rewrite, reorder, or delete prior entries** — the log is how a cold reader gets the journey, not just the destination.

Also make `tasks.md` reflect reality: check off `- [x]` what's done; add tasks the plan grew.

**No active change on this branch** (a session that skipped `/plan`) → author one now via the same OpenSpec artifact process `/plan` uses, so nothing ships without its handoff:

```bash
NAME=$(git rev-parse --abbrev-ref HEAD)
[ -d "openspec/changes/$NAME" ] || openspec new change "$NAME"
openspec instructions proposal --change "$NAME" --json   # exact sections + config context
```

Write `proposal.md` (plan + the Status/Open-questions header + an initial Decision-log entry) and `tasks.md` (checklist, already-done work checked off) per those instructions. A truly empty session (nothing learned, decided, or done) → say so and skip the change.

## Step 3 — sync the active change's specs (/opsx:sync)

- **Active change with delta specs** → **invoke the `openspec-sync-specs` skill** (via the Skill tool) for that change name. It merges the change's `specs/**` deltas into `openspec/specs/<capability>/spec.md` (agent-driven, idempotent). This is OpenSpec's `/opsx:sync`.
- **No delta specs** (a proposal-only change, or a pure docs branch) → skip with a one-line note; there's nothing to sync. (Most changes are proposal + tasks only.)

## Step 4 — commit + push + PR (body mirrors the change)

Stage code **and** the `openspec/` change (the new/updated change dir + any specs the sync touched) **by path** — never `git add .` on unrelated junk.

- **Clean tree, 0 commits ahead** → nothing to push; report the change you maintained and stop (a pure decision/research save is valid with no PR).
- **Otherwise** commit with a one-line repo-style message (`feat:`/`fix:` — see `git log -5`) via HEREDOC with a `Co-Authored-By: Claude` trailer, then:
  ```bash
  gh pr view --json number,state,url 2>/dev/null
  ```
  - **OPEN** → `git push`, then **regenerate the body** (`gh pr edit --body`, template below).
  - **None** → `git push -u origin HEAD`, then `gh pr create` (HEREDOC body = the template below; repo-style title).
  - **MERGED** → already shipped; skip the CI wait, note there's no live preview.
  - **CLOSED (not merged)** → ask whether to reopen or push a fresh branch; don't silently revive it.

**The PR body is a mirror of the change, regenerated on every save** — the change file is the source of truth, so overwriting the body is safe by construction (reviewers comment on the PR; they don't edit the body). Template:

```markdown
## Summary

**Status:** <Status line from proposal.md>

<the proposal's Why / What Changes, condensed to a few readable lines>

## Tasks

<the tasks.md checklist verbatim, current checkbox state>

---
_Handoff: `openspec/changes/<name>/` — resume with `/continue <name>`. This body is regenerated by every `/save`; comment rather than editing it._
```

The push triggers CI.

## Step 5 — wait for CI (if any), auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
Read the final `RESULT:` line:
- **SUCCESS** / **NONE** (no checks configured — the PR review is the gate) → Step 6.
- **TIMEOUT** → report checks still running + the PR link; don't block.
- **FAILURE** → read the failing log, fix, commit, push, re-wait. **Cap 3 attempts**; still red → stop with the error + checks link.
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```

## Step 6 — discover the preview URL, then report

```bash
ROOT="$(git rev-parse --show-toplevel)"
PREVIEW_URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh")
```

Report, briefly:
- Branch + commit pushed; PR number + URL (note the body mirrors the change).
- **Change** — its current **Status** and the Decision-log entry appended; specs synced (which capabilities) / none to sync. Resumable with `/continue <name>`.
- **CI** — ✅ green / 🔧 auto-fixed in N pushes / ❌ red after 3 / ⏳ running / — none configured.
- **Preview** — a markdown link whose visible text is the full URL (`[https://…](https://…)`); never bare or in a code block. None found → say so (check the PR's deploy comment).

## Hard rules
- Never `--force` / `--no-verify`. Never push to the default branch — branch off (Step 1).
- CI is the gate when present, else the PR (for review) is; a CI failure is fixed-and-re-pushed, never a stop (except after 3 attempts). Never build/test locally.
- **The Decision log is append-only.** Never rewrite, reorder, or delete prior entries; plan sections may change, history may not.
- **The PR body is generated, not curated** — regenerate it from the change every save; never preserve manual body edits (reviewers comment instead).
- **Never merge** — that's `/ship`. No GitHub planning issues — the OpenSpec change is the plan.
