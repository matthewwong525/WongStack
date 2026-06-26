---
name: save
description: End-to-end checkpoint for any GitHub repo. Pushes the current branch (auto-creating it + auto-committing a dirty tree), opens or updates a PR, snapshots the session into a durable GitHub handoff issue (the current plan, resumable with /continue), waits for all GitHub checks to pass — fixing CI failures automatically — and returns the auto-discovered preview URL plus the issue link. Does NOT build locally (GitHub Actions is the gate) and NEVER merges (that's /ship). /preview is an alias. Use whenever you want to save/checkpoint/snapshot the thread or get a shareable preview URL of in-progress work.
user-invocable: true
---

# /save

Checkpoint runbook; `/preview` is an alias. Invoking it authorizes the branch creation, push, PR creation, and handoff-issue creation — don't re-prompt for those. Confirm anything outside this runbook (force push, hard reset, amending merged commits).

**Delivers two things:** a durable **handoff issue** whose body *is* the resumable plan (a cold session on another machine rebuilds from it via `/continue`), and a per-commit **preview URL** on a branch that passed CI. **GitHub Actions is the gate — we never build/test locally.** The push kicks off CI; file the issue during that wait, then read the result.

Write the plan for a **cold reader on another machine**: self-contained, repo files referenced by repo-relative path (`src/app/routes.ts`), everything it relies on pushed. A non-CI failure stops and surfaces the error — never bypass with `--no-verify`/`--force`. A CI failure is not a stop; it's Step 4's auto-fix loop.

> Throughout, `main` stands in for **the repo's default branch** — if `git symbolic-ref refs/remotes/origin/HEAD` resolves to something else, substitute it.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD            # current branch
git status --porcelain                      # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null  # commits ahead of the default branch
```

- **On the default branch or detached HEAD** → auto-create a feature branch from the current commit; don't prompt. (Work doesn't belong on the default branch; previews run for branch pushes, not it.) Name it from the repo/worktree dir, falling back to `<slug>-<short-sha>` if it exists:
  ```bash
  RAW=$(basename "$(git rev-parse --show-toplevel)")
  SLUG=$(echo "$RAW" | sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-+//; s/-+$//' | tr '[:upper:]' '[:lower:]')
  git checkout -b "$SLUG"
  ```
- **0 commits ahead + clean tree** → nothing to push; skip to Step 3 and just snapshot the plan (a pure research session is a valid `/save` with no PR).
- **Dirty tree** → auto-commit; don't prompt. Stage tracked changes (`git add -u`) and relevant new files by path (never `git add .`). One-line repo-style message (`feat:`/`fix:` — see `git log -5`) via HEREDOC with a `Co-Authored-By: Claude` trailer.

## Step 2 — push and open or update the PR

```bash
gh pr view --json number,state,url,body 2>/dev/null
```
- **OPEN** → `git push`.
- **None** → `git push -u origin HEAD`, then `gh pr create` (HEREDOC body: Summary + Test plan; repo-style title).
- **MERGED** → already shipped; update the issue (Step 3) but skip the CI wait and note there's no live preview.
- **CLOSED (not merged)** → ask whether to reopen or push to a fresh branch; don't silently revive it.

The push triggers CI — don't wait now; go file the issue.

## Step 3 — snapshot the session into a handoff issue (while CI runs)

The issue body *is* the plan — the most concise, complete statement of what we're doing and how, so a cold reader can act.

1. **Establish the plan.** Plan-mode session → the latest `ExitPlanMode` plan, updated for anything since. No plan mode → synthesize one from the conversation + diff. Inline any fact that lived only in scratch/terminal state. Empty session (nothing decided/done) → say so and skip the issue.
2. **Detect an existing handoff issue** — reuse this session's if `/save`/`/continue`/`/preview` already ran, or the one in the PR body's `Closes #N`. Found → update; else → create.
3. **Compose body** = the plan + a footer:
   ```markdown
   <the current plan>

   ---
   **Links**
   - PR: <url, or "none yet">
   - Preview: <url, or "pending">
   - Branch: `<branch>`
   ```
   Title in repo convention (`feat:`/`fix:`/`docs:` prefix), from the plan's subject.
4. **Create or update:**
   ```bash
   gh issue create --title "<title>" --body "$(cat <<'EOF'
   <plan + footer>
   EOF
   )"
   # updating instead:
   gh issue edit <N> --body "<latest plan + footer>"
   gh issue comment <N> --body "Updated via /save — <what changed since last save>"
   ```
   Optionally add labels that exist in the repo (`gh label list`): a **type** label (`fix:`→`bug`, `feat:`→`enhancement`, `docs:`→`documentation`) and one **size** label by blast-radius/reversibility — `S` one area/easily reversed · `M` self-contained feature · `L` multi-layer, a new integration, or a shared-infra change · `XL` a whole new subsystem. Missing label → skip (never fail the save over it); between two sizes pick the larger.
5. **Cross-link** the PR to the issue so it closes on merge and `/continue` can resolve either way (idempotent — leave it if present):
   ```bash
   gh pr edit <pr> --body "$(printf 'Closes #%s\n\n%s' "<issue>" "<existing body>")"
   ```

## Step 4 — wait for CI, auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
Read the final `RESULT:` line:
- **SUCCESS** / **NONE** (no checks configured) → Step 5.
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
Got one → write it into the issue footer (replacing "pending") and lead the report with it. None → say so plainly (PR is still pushed + green; check the PR's deploy/bot comment).

Report, briefly:
- Branch + commit pushed; PR number + URL (noting `Closes #N`).
- **Handoff issue** — created/updated, as a clickable markdown link (`[#42 feat: …](url)`), resumable with `/continue`.
- **CI** — ✅ green / 🔧 auto-fixed in N pushes / ❌ red after 3 / ⏳ running / — none configured.
- **Preview** — a markdown link whose visible text is the full URL (`[https://…](https://…)`); never bare or in a code block.

## Hard rules
- Never `--force` / `--no-verify`. Never push to the default branch — branch off (Step 1).
- GitHub Actions is the only gate; a CI failure is fixed-and-re-pushed, never a stop (except after 3 attempts).
- **Never merge** — that's `/ship`. One issue per line of work: update the existing handoff issue, don't spawn duplicates.
