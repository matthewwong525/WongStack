---
name: save
description: End-to-end checkpoint for any GitHub repo. Pushes the current branch (auto-creating it + auto-committing a dirty tree), opens or updates a PR, snapshots the session into a durable GitHub handoff issue (the current plan, resumable with /continue), waits for all GitHub checks to pass — reading and fixing CI failures automatically — and returns the auto-discovered per-commit preview URL plus the issue link. Does NOT build locally (GitHub Actions is the gate) and NEVER merges (that's /ship). /preview is an alias. Use whenever you want to save/checkpoint/snapshot the thread or get a shareable preview URL of in-progress work.
user-invocable: true
---

# /save

The single checkpoint runbook. `/preview` is an alias that calls this. Invoking it authorizes the branch creation, push, PR creation, and handoff-issue creation — do **not** re-prompt for those. DO confirm before anything outside this runbook (force push, hard reset, amending merged commits).

**Two deliverables:**

1. A durable **GitHub handoff issue** whose body *is* the current plan, so a fresh session (another computer, no scrollback) can resume cold with `/continue`.
2. A per-commit **preview URL** for a branch that **actually passes CI** — verified by waiting for every GitHub check to go green, with an auto-fix loop on failure.

We do **not** build or test locally. The repo's own **GitHub Actions** (tests + the preview deploy) are the gate. The timing trick: **the push kicks off CI, which takes a few minutes; we use that wait to compose and file the issue, then read the result.** So the issue work is effectively free.

If a step other than CI fails, stop and surface the exact error. Never bypass with `--no-verify` or `--force`. A *CI* failure is not a stop — it's the auto-fix loop's job (Step 4).

**Assume the reader is on a different computer** — a fresh clone, no working tree, no scrollback. The only durable surface is GitHub: the **issue body** (the plan) and the **pushed PR**. Everything the plan relies on must be pushed, and the plan must be self-contained — reference repo files by **repo-relative path** (`src/server/routes.ts`), never an absolute path.

---

## Step 1 — preflight

```bash
git rev-parse --abbrev-ref HEAD            # current branch
git status --porcelain                      # working-tree state (incl. ?? untracked)
git log origin/main..HEAD --oneline 2>/dev/null  # commits ahead of main (use the repo's default branch)
```

- If branch is `main`/`master` OR `HEAD` (detached): **auto-create a feature branch from the current commit and continue — do not prompt.** Preview deploys don't run for the default branch (that's production), and detached HEAD has nothing to push. Derive the name from the worktree directory:
  ```bash
  RAW=$(basename "$(git rev-parse --show-toplevel)")
  SLUG=$(echo "$RAW" | sed -E 's/[^a-zA-Z0-9]+/-/g; s/^-+//; s/-+$//' | tr '[:upper:]' '[:lower:]')
  ```
  If `$SLUG` already exists locally or remotely, fall back to `<slug>-<short-sha>`. Then `git checkout -b "$SLUG"` and refresh the branch variable.
- If 0 commits ahead of the default branch AND the tree is clean: nothing to push. Skip to Step 3 and just snapshot the plan (a pure research/decision session is a valid `/save` with no PR).
- If the tree is dirty: **auto-commit and continue — do not prompt.** Stage tracked modifications (`git add -u`) and untracked files individually by path (never `git add .`, to avoid sweeping in anything `.gitignore` should catch — but DO stage relevant new source/doc/config files). One-line message in repo style — `feat: <topic> — <details>` / `fix: <topic> — <details>` (see `git log -5`). Use a HEREDOC with a `Co-Authored-By: Claude` trailer. Then continue.

## Step 2 — push and open or update the PR

```bash
gh pr view --json number,state,url,body 2>/dev/null
```

- **PR exists and is OPEN**: `git push` to update it.
- **No PR**: `git push -u origin HEAD`, then `gh pr create` with a HEREDOC body (Summary + Test plan). Title in repo style.
- **PR is MERGED**: the branch is already shipped — no preview deploy for merged branches. Update the issue (Step 3) but skip the CI wait and note there's no live preview.
- **PR is CLOSED (not merged)**: ask whether to reopen or push to a fresh branch. Don't silently revive a closed PR.

**The push triggers CI.** Don't wait on it now — go to Step 3 and use the time to file the issue.

## Step 3 — snapshot the session into a handoff issue (while CI runs)

The issue body *is* the plan — not a status report. The most concise, complete statement of what we're doing and how, so a cold reader can act.

### 3a. Establish the current plan
- **Session used plan mode** → the plan is the **most recent** one you presented (latest `ExitPlanMode`), updated for anything that changed since.
- **No plan mode** → synthesize a concise plan from the conversation + diff: what this work is, and the steps to finish it. Write it directly (this skill runs non-interactively). If the session is empty (nothing learned/decided/done), say so and skip the issue.

Keep the plan in its own shape. If a fact it relies on lived only in local scratch state or terminal output, inline it so the cold reader has it.

### 3b. Detect any existing handoff issue
1. **This conversation** — if `/save`, `/continue`, or `/preview` already ran this session, reuse that issue number.
2. **The PR body** — it may already open with `Closes #N` (the cross-link this skill writes): `gh pr view --json body`.

Found one → you're **updating**; otherwise **creating new**.

### 3c. Compose the body: plan + footer

```markdown
<the current plan — kept current>

---
**Links**
- PR: <url, or "none yet">
- Preview: <preview URL, or "pending" — filled in Step 4>
- Branch: `<branch name>`
```

Title — repo commit/PR convention (`feat:` / `fix:` / `docs:` / `chore:` prefix, short scope, summary), derived from the plan's subject.

### 3d. Create or update

**Creating new:**
```bash
gh issue create --title "<title>" --body "$(cat <<'EOF'
<plan + footer>
EOF
)"
```
Optionally add labels if they exist in the repo (`gh label list`): a **type** label from the title prefix (`fix:`→`bug`, `feat:`→`enhancement`, `docs:`→`documentation`) and **exactly one size** label (`size: S/M/L/XL`) judged by **blast radius and reversibility**, not hours:

| Size | Meaning | Signals |
| --- | --- | --- |
| `size: S` | Minimal consequences, easily reversed | One surface; bug fix or copy change; docs-only; no data migration; no new integration |
| `size: M` | Self-contained feature | A few files front + back; reuses existing patterns; ≤1 migration; stays in one area |
| `size: L` | Substantial feature or shared-infra change | New persistence + service + UI together, **or** a new external integration, **or** a structural change to shared infra (app shell, routing, layout) |
| `size: XL` | Fundamental system change | A whole new domain/subsystem; multiple migrations + many modules |

If a label doesn't exist, just skip it — never fail the save over a missing label. Between two sizes, pick the larger.

**Updating existing** — rewrite the body to the *latest* plan, then a short changelog comment:
```bash
gh issue edit <N> --body "$(cat <<'EOF'
<latest plan + footer>
EOF
)"
gh issue comment <N> --body "Updated via /save — <one line: what changed since last save>"
```

### 3e. Cross-link the PR → issue
Make the PR body **open with `Closes #N`** (idempotent — leave it if already there) so `/continue` can resolve one from the other and the issue closes when the work ships:
```bash
gh pr edit <pr-number> --body "$(cat <<'EOF'
Closes #<issue-number>

<existing PR body>
EOF
)"
```

## Step 4 — wait for CI to pass (auto-fix on failure)

By now CI (from the Step 2 push) has had the issue-filing time to make progress. Wait for **every** check to settle, then read the verdict. We do not run a build/test locally as a prerequisite — GitHub Actions is the gate.

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/save/scripts/wait-for-checks.sh" 20
```

Read the final `RESULT:` line:

- **SUCCESS** or **NONE** → proceed to Step 5 (NONE = the repo has no checks configured; that's fine, there's just nothing to wait for).
- **TIMEOUT** → report that checks are still running and give the PR link; don't block forever.
- **FAILURE** → read the failing run's log and fix it:
  ```bash
  # The script printed the failing check + its link. Get the run id and read only the failed steps:
  RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
  gh run view "$RUN_ID" --log-failed | tail -120
  ```
  Fix the error in the code, commit (repo-style message), `git push`, then **re-run the wait script**. **Cap at 3 fix attempts.** Still red after 3 → stop and surface the latest error + the PR checks link.

## Step 5 — discover the preview URL, then report

```bash
PREVIEW_URL=$(bash "${CLAUDE_PLUGIN_ROOT}/skills/save/scripts/preview-url.sh")
```

If a URL came back, put it in the issue footer (edit the issue if you filed it in Step 3 with "pending") and lead the report with it. If none was found, say so plainly — the PR is still pushed and green; the preview just couldn't be auto-detected (check the PR's deployment/bot comment).

Then tell the user, in order:
- Branch + commit pushed (`git log -1 --oneline`)
- PR number + URL (created or updated), noting `Closes #N`
- **Handoff issue** — created or updated, as a markdown link so it stays clickable (`[#42 feat: …](https://github.com/...)`). Mention it's resumable with `/continue`.
- CI status: ✅ all checks green / 🔧 failed then auto-fixed in N pushes / ❌ still red after 3 attempts (with the error) / ⏳ still running / — no checks configured
- **Preview link** — render as a markdown link whose **visible text is the full URL** (so it's clickable and readable when the terminal wraps): `[https://…](https://…)`. Never bare, never in a code block.

Keep it short — the user invoked this for a URL + a saved issue, not a wall of text.

---

## Hard rules
- Never `git push --force`. Never `--no-verify`.
- Don't build/test locally as a gate — GitHub Actions is the gate (Step 4). A CI failure isn't a stop; read it and fix it. The only stop is after 3 failed fix attempts.
- **Never merge the PR.** That's `/ship`'s job.
- Never push directly to the default branch — branch off first (Step 1).
- One issue per line of work: prefer updating the thread's existing handoff issue over spawning duplicates.
