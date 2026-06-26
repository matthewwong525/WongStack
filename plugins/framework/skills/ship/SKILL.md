---
name: ship
description: Ship the current branch — distill any reusable process from the conversation into docs/, append a daily note summarizing the conversation to daily/YYYY-MM-DD.md, open or update a PR, wait for all GitHub checks to pass (auto-fixing CI failures), then squash-merge to the default branch. Does NOT build locally — GitHub Actions is the gate. Stops after merge. Use when you're done iterating on a branch and want it shipped.
---

# /ship

End-to-end "ship" runbook. Invoking `/ship` authorizes the push + merge in Steps 4–5 — don't re-prompt for those. Do confirm anything outside this runbook (force push, hard reset, amending merged commits).

**`/ship` merges the PR itself, once CI is green** (Step 5). The green checks are the only merge gate. When it returns, the PR is merged.

**No local build gate.** `/ship` does not run a build/test locally as a prerequisite — the repo's **GitHub Actions** are the gate. We push, wait for every check, and **if any fails we read the error, fix it, re-push, and loop until green** (Step 4). We only merge once everything is green.

If a step other than CI fails, stop and surface the exact error. Never bypass with `--no-verify`, `--force`, or by skipping a check.

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD
git status
git log origin/main..HEAD --oneline        # use the repo's default branch if not main
# the default branch's own CI must be green before we add to it:
gh api repos/:owner/:repo/commits/main/check-runs \
  --jq '[.check_runs[]] | map(.conclusion) | (if (index("failure") or index("cancelled")) then "failure" else "ok" end)'
```

- On the default branch (`main`/`master`): stop — `/ship` runs on a feature branch.
- 0 commits ahead of the default branch: stop — nothing to ship.
- **The default branch's latest CI is `failure`: stop.** A red default branch means it's already broken — merging on top just stacks onto the breakage. Fix it first, then ship. (`ok`/empty = proceed.)
- Dirty tree: **auto-commit, don't prompt.** `git add -u` plus untracked files by explicit path (never `git add .`). One-line repo-style message via HEREDOC with a `Co-Authored-By: Claude` trailer.

## Step 2 — capture reusable process into `docs/`

This is the one moment with both the **full conversation** and the **finished diff** in hand — so it's where durable knowledge gets written down. Ask one question:

> Did this work establish or change a **general, repeatable process** — something a person (or agent) would follow again in a *different* situation?

**Document only the general and reusable. Never the specific.** "How we add a new background job," "our release checklist," "how to wire up a new webhook" → yes, document. "Fixed the typo on the pricing page," "bumped the Stripe key" → no, that's a daily note (Step 3), not a process. Most sessions change nothing general — when in doubt, don't manufacture a process; skip to Step 3.

If a reusable process *did* emerge:

1. **Read the rulebook.** Use the repo's own `docs/wiki-style.md` if it exists; otherwise read `${CLAUDE_PLUGIN_ROOT}/skills/document/references/progressive-disclosure.md`. The docs are a **progressive-disclosure tree** — atomic pages, one topic per page, link generously. (Or just invoke the `framework:document` skill, which carries the same rules.)
2. **Prefer extending an existing page** over adding one. Search `docs/` for the page that already owns this topic and update it in place; match its structure and tone, no changelog-style notes.
3. **A new page only as the exception** — when genuinely nothing can host it. Give it a **topic** title (never "Step N"), a strong opening sentence, place it at the right layer (a subfolder only for a deep branch), link it **up** to its hub / **down** to what it references / **sideways** to siblings, and add it to its section README so it's reachable. Restate nothing — link instead.
4. **Commit the doc edits on their own** so they're cleanly attributable:
   ```bash
   git add docs/
   git commit -m "$(cat <<'EOF'
docs: <what process changed>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
   ```

Markdown-only — it lands before the push and doesn't affect CI.

## Step 3 — append the daily note

Every `/ship` records what this conversation did, in a dated daily log. Append to today's file:

```bash
DAY=$(date +%F)            # local date, e.g. 2026-06-26
mkdir -p daily
ls "daily/$DAY.md" 2>/dev/null
```

`daily/<YYYY-MM-DD>.md` holds one **H1 section per conversation**, each with a short summary below it. Append a new section (don't overwrite the file):

```markdown
# <concise topic of this conversation>

<3–6 sentences: what this conversation set out to do, the key decisions made,
what actually shipped, and any follow-ups. Keep it skimmable — a teammate
reading the day's log should understand what happened without the diff.>
```

- If the file doesn't exist, create it with this first section (no date heading at the top — the **filename** is the date).
- If a section for **this same conversation** already exists today (you shipped it earlier), update that section instead of adding a duplicate.
- Use Read + Edit/Write to append cleanly; never clobber other conversations' sections.

Commit it (with the doc edits from Step 2, or on its own if there were none):
```bash
git add daily/
git commit -m "$(cat <<'EOF'
docs: daily note — <topic>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

## Step 4 — push + open/update PR, then wait for CI green (auto-fix on failure)

```bash
gh pr view --json number,state,url,mergeable 2>/dev/null
```
- OPEN PR → `git push`.
- No PR → `git push -u origin HEAD`, then `gh pr create` (HEREDOC body: Summary + Test plan).
- MERGED/CLOSED → stop and ask; may be shipped or intentionally abandoned.

Then wait for every check and auto-fix failures (same gate as `/save`):
```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/save/scripts/wait-for-checks.sh" 20
```
- **SUCCESS** / **NONE** → proceed to Step 5.
- **FAILURE** → read the failing run's log, fix, re-push, re-wait (cap 3 attempts; **never ship red**):
  ```bash
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
- **TIMEOUT** → don't merge; report that checks are still running and stop.

## Step 5 — merge (worktree-safe; resolve conflicts if needed)

The build is green, so merge. Merge via the API, then delete the **remote** branch explicitly. **Don't use `gh pr merge --delete-branch`** — it switches the local checkout to the default branch to delete the local branch, which **fails in a git worktree** where the default branch is checked out elsewhere. Leave the local branch — it's removed when the worktree is torn down.

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
gh pr merge --squash              # API merge only — no local checkout switch
git push origin --delete "$BRANCH"
```

On merge **conflict**:
1. `git fetch origin main` → `git merge origin/main` (merge, not rebase, unless asked) — use the repo's default branch.
2. Resolve each conflicted file as the **union of intent** from both sides — never discard a side without understanding why it changed.
3. `git add` resolved files → `git commit` (no `--no-verify`) → `git push` → re-run Step 4 → retry the merge once green.

Other failure (branch protection, draft) → surface the exact `gh` error; don't paper over it.

## Step 6 — report

- PR number + URL, and that it's **merged (squash)** to the default branch — done in-session.
- Docs: the process page **updated** (and what process it reflects) / **new page created + linked** / "no reusable process — nothing to document."
- Daily note: the `daily/<date>.md` section appended.
- CI: green (note if it took N auto-fix pushes).
- Follow-ups the user should know (a flag to flip, a manual data step, a secret to set).

## Hard rules
- **Never ship onto a red default branch** (Step 1).
- Never `git push --force` to the default branch. Never `--no-verify`.
- Don't build/test locally as a gate — GitHub Actions is the gate (Step 4). Merge only when green; a CI failure is fixed-and-re-pushed, not shipped red.
- **Merge worktree-safely:** `gh pr merge --squash` then `git push origin --delete "$BRANCH"` — never `gh pr merge --delete-branch`.
- Document **general, reusable processes only** — specifics go in the daily note, not the wiki.
- Never `git reset --hard` / `git checkout .` on the branch without explicit confirmation.
