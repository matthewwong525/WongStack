---
name: ship
description: Ship the current branch — distill any reusable process from the conversation into docs/, record a GitHub issue summarizing the conversation (created/updated like /save), open or update a PR, wait for all GitHub checks to pass (auto-fixing CI failures), then squash-merge to the default branch (which closes the summary issue). Does NOT build locally — GitHub Actions is the gate. Stops after merge. Use when you're done iterating on a branch and want it shipped.
user-invocable: true
---

# /ship

Ship runbook. Invoking it authorizes the push + merge in Steps 4–6 — don't re-prompt. Confirm anything outside this runbook (force push, hard reset, amending merged commits).

`/ship` **records two things via parallel subagents** (Step 3) and then **merges the PR itself once CI is green** (Step 6):
1. A **GitHub summary issue** for the conversation — changes in the body, a conversation summary as a comment. It closes on the squash-merge (via `Closes #N`), so closed summary issues are the project's conversation log.
2. Any **reusable process**, distilled into `docs/`.

**GitHub Actions is the only gate** — no local build. We push, wait, and on red read-fix-repush until green (Step 5), then merge. A non-CI failure stops and surfaces the error; never use `--no-verify`/`--force` or skip a check.

> Throughout, `main` stands in for **the repo's default branch** — if `git symbolic-ref refs/remotes/origin/HEAD` resolves to something else, substitute it.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```
- On the default branch, or 0 commits ahead → **stop** (`/ship` runs on a feature branch with commits).
- Default branch's CI is `failure` → **stop**; it's already broken, fix it first (`ok`/empty = proceed).
- Dirty tree → auto-commit, don't prompt (`git add -u` + new files by path, never `git add .`; repo-style message + `Co-Authored-By: Claude`).

## Step 2 — prepare the briefing

The Step 3 subagents don't share this conversation — you do. Compose one briefing from the conversation + the finished diff:
```bash
git diff origin/main...HEAD --stat        # files touched
git log origin/main..HEAD --oneline        # commits being shipped
```
Fields:
- **Topic** — a concise title (becomes the issue title / `feat:`/`fix:`/`docs:` line).
- **Changes shipped** *(→ issue body)* — the actual change from the diff (key files + behavior), plus follow-ups (a flag to flip, a manual step, a secret to set).
- **Conversation summary** *(→ issue comment)* — the goal, the decisions and *why*, the notable back-and-forth. The context the diff doesn't carry; be generous.
- **Reusable process?** — **you** decide (needs the conversation): did this establish a **general, repeatable process** for a *different* situation later? "How we add a module of this kind," "our release checklist" → yes. "Fixed a typo," "bumped a dep" → no. When in doubt, **no**. If yes, describe it for the docs agent.
- **Existing issue** — reuse this session's handoff issue (`/save`/`/preview`/`/continue`) or the PR body's `Closes #N`, so the summary agent updates it instead of duplicating.

## Step 3 — record the summary issue + docs (parallel subagents)

Launch in parallel — one message, both Agent/Task calls. They touch independent surfaces (issues vs. `docs/`).

### 3a. Summary-issue agent — always

> Record a durable GitHub issue for a shipped conversation via `gh` (repo = whatever `gh` resolves here). **Issue surface only — touch no files, don't commit or merge.**
>
> Briefing:
> - Topic: <topic>
> - Changes (for the body): <changes + follow-ups>
> - Conversation summary (for the comment): <goal, decisions and why, back-and-forth>
>
> **Body** (what changed, not a forward plan):
> ```markdown
> ## Changes
> <3–5 skimmable sentences: what shipped + follow-ups>
>
> ---
> **Links**
> - PR: <url or "see Closes ref">
> - Branch: `<branch>`
> ```
> **Comment** (posted right after the body):
> ```markdown
> ## Conversation summary (via /ship)
> <goal, key decisions and why, the discussion that shaped the change>
> ```
> - **Existing issue # given** → `gh issue edit <N> --body <Changes>` then `gh issue comment <N> --body <Conversation summary>`. Don't close it; the merge does (via `Closes #N`).
> - **Otherwise** → `gh issue create --title "<topic>" --body <Changes>`, then add the comment. Add a type label if it exists (`gh label list`): `fix:`→`bug`, `feat:`→`enhancement`, `docs:`→`documentation`; skip silently if absent.
> - Return: the issue number, URL, and created-or-updated.

Capture the issue number — Step 4 cross-links the PR with `Closes #N`.

### 3b. Docs agent — only if a reusable process emerged

If **Reusable process?** is no, skip it (report "no reusable process — nothing to document"). Otherwise spawn it in the same parallel batch:

> Capture one reusable process in the `docs/` progressive-disclosure wiki. **Only touch `docs/` — don't commit, push, or merge.**
>
> Process: <description from the briefing>
>
> 1. **Read the rulebook first** — the repo's `docs/wiki-style.md`, or `.claude/skills/document/references/progressive-disclosure.md` (via `$(git rev-parse --show-toplevel)`). Atomic one-topic pages, stand-alone openers, topic titles (never "Step N"), generous up/down/sideways links.
> 2. **Prefer extending the page that already owns this topic** (search `docs/`); match its tone, no changelog notes.
> 3. **New page only as the exception** — topic title + strong opener, right layer, linked up/down/sideways, added to its section README.
> 4. **General, reusable process only** — specifics live in the summary issue, not the wiki.
> - Return: the page created/extended (repo-relative path) + a one-line note, or "nothing reusable — no doc change".

## Step 4 — commit docs + open/update the PR (cross-linked to the issue)

If the docs agent changed files, commit them alone (markdown — doesn't affect CI):
```bash
git add docs/ && git commit -m "$(printf 'docs: <what changed>\n\nCo-Authored-By: Claude <noreply@anthropic.com>')"
```
Then the PR:
```bash
gh pr view --json number,state,url 2>/dev/null
```
- OPEN → `git push`. None → `git push -u origin HEAD` + `gh pr create` (Summary + Test plan). MERGED/CLOSED → stop and ask.

Ensure the PR body opens with `Closes #<summary-issue>` (idempotent) so the merge closes it:
```bash
gh pr edit <pr> --body "$(printf 'Closes #%s\n\n%s' "<issue>" "<existing body>")"
```

## Step 5 — wait for CI green (auto-fix on failure)

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```
- **SUCCESS** / **NONE** → Step 6.
- **FAILURE** → read the log, fix, re-push, re-wait (**cap 3; never ship red**):
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
- **TIMEOUT** → don't merge; report checks still running and stop.

## Step 6 — merge (worktree-safe)

Merge via the API, then delete the **remote** branch explicitly. **Never `gh pr merge --delete-branch`** — it switches the local checkout to delete the local branch, which fails in a worktree where the default branch is checked out elsewhere.
```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash
git push origin --delete "$BRANCH"
```
The squash-merge closes the summary issue.

On **conflict**: `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked); resolve each file as the **union of intent** from both sides; `git add` → `git commit` → `git push` → re-run Step 5 → retry once green. Other failure (branch protection, draft) → surface the exact `gh` error.

## Step 7 — report

- PR number + URL, **merged (squash)** to the default branch.
- **Summary issue** — markdown link (`[#42 feat: …](url)`); changes in the body, conversation summary as a comment, **closed on merge**.
- **Docs** — page updated (which process) / new page created + linked / no reusable process.
- **CI** — green (note N auto-fix pushes if any), and any follow-ups (a flag, a manual step, a secret).

## Hard rules
- Never ship onto a red default branch. Never `--force`/`--no-verify`. Never `git reset --hard` / `checkout .` without confirmation.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete`, never `--delete-branch`.
- Subagents stay surface-isolated (issues vs. `docs/`); neither commits, pushes, or merges — Steps 4–6 do.
