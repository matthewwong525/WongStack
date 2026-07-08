---
name: save
description: Checkpoint the current branch — sync the active OpenSpec change's delta specs into openspec/specs/ (/opsx:sync), commit code + specs, push, open or update a PR, wait for GitHub checks to pass when present (auto-fixing CI failures), and return the preview URL. Does NOT build locally (CI is the gate when present, else PR review) and NEVER merges (that's /ship). Use whenever you want to save/checkpoint/preview in-progress work.
user-invocable: true
---

# /save

Checkpoint runbook. Invoking it authorizes the branch creation, commit, push, and PR — don't re-prompt for those. Confirm anything outside this runbook (force push, hard reset).

`/save` is the **sync** step of the loop (`/explore → /plan → /continue → /save → /ship`): it folds the active change's delta specs into the source-of-truth specs, then checkpoints code + specs and hands back a preview URL. **The `openspec/changes/` change is the plan — there's no GitHub handoff issue.** CI is the gate when the repo has checks; otherwise the PR itself is the checkpoint a reviewer sees. Either way we never build/test locally.

> `main` stands for the repo's default branch — if `git symbolic-ref refs/remotes/origin/HEAD` resolves to something else, substitute it.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD            # current branch
git status --porcelain                      # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null
openspec list                               # active change(s), if any
```

- **Resolve the active change first** — it names the branch and drives Step 2. It's the change whose name matches the current branch (`openspec/changes/<branch>/`), else the sole entry in `openspec list`, else none (a pure-code/docs branch). Ambiguous (several active, none matching the branch) → ask which one you're saving.
- **On the default branch or detached HEAD** → auto-create a feature branch; don't prompt. **Branch name = the active change name** (so `/continue` and `/ship` can find it); no active change → slug the worktree dir:
  ```bash
  git checkout -b "<change-name-or-slug>"
  ```
- Don't commit yet — sync first (Step 2), so the synced specs land in the same commit. Even a **spec-only** save (a freshly proposed change, no code yet) is valid: the untracked change folder makes the tree dirty, so Step 3 commits and pushes it — that's exactly what makes the spec handoff-ready.

## Step 2 — sync the active change's specs (/opsx:sync)

Using the change resolved in Step 1:

- **Active change** → **invoke the `openspec-sync-specs` skill** (via the Skill tool) for that change name. It merges the change's `specs/**` deltas into `openspec/specs/<capability>/spec.md` (agent-driven, idempotent). This is OpenSpec's `/opsx:sync`.
- **No active change** (e.g. a pure-research or docs-only branch) → skip with a one-line note; there's nothing to sync.

## Step 3 — commit + push

- **Clean tree, 0 commits ahead** → nothing to push; report and stop.
- **Otherwise** stage code **and** the `openspec/` changes (the new/updated change dir + any specs the sync touched) by path — never `git add .` on unrelated junk. One-line repo-style message (`feat:`/`fix:` — see `git log -5`) via HEREDOC with a `Co-Authored-By: Claude` trailer, then:
  ```bash
  gh pr view --json number,state,url 2>/dev/null
  ```
  - **OPEN** → `git push`.
  - **None** → `git push -u origin HEAD`, then `gh pr create` (HEREDOC body: Summary + Test plan; repo-style title).
  - **MERGED** → already shipped; skip the CI wait, note there's no live preview.
  - **CLOSED (not merged)** → ask whether to reopen or push a fresh branch; don't silently revive it.

The push triggers CI.

## Step 4 — wait for CI (if any), auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
Read the final `RESULT:` line:
- **SUCCESS** / **NONE** (no checks configured — the PR review is the gate) → Step 5.
- **TIMEOUT** → report checks still running + the PR link; don't block.
- **FAILURE** → read the failing log, fix, commit, push, re-wait. **Cap 3 attempts**; still red → stop with the error + checks link.
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```

## Step 5 — discover the preview URL, then report

```bash
ROOT="$(git rev-parse --show-toplevel)"
PREVIEW_URL=$(bash "$ROOT/.claude/skills/save/scripts/preview-url.sh")
```

Report, briefly:
- Branch + commit pushed; PR number + URL.
- **Specs** — synced (which capabilities) / no active change to sync.
- **CI** — ✅ green / 🔧 auto-fixed in N pushes / ❌ red after 3 / ⏳ running / — none configured.
- **Preview** — a markdown link whose visible text is the full URL (`[https://…](https://…)`); never bare or in a code block. None found → say so (check the PR's deploy comment). Resume later with [`/continue`](../continue/SKILL.md).

## Hard rules
- Never `--force` / `--no-verify`. Never push to the default branch — branch off (Step 1).
- CI is the gate when present, else the PR (for review) is; a CI failure is fixed-and-re-pushed, never a stop (except after 3 attempts). Never build/test locally.
- **Never merge** — that's `/ship`. No GitHub planning issues — the OpenSpec change is the plan.
