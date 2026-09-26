# The git gate

The pull-request and CI runbook **ordinary `/save` performs for every checkpoint**, including the one `/ship` delegates after archiving. `/ship` consumes the result instead of repeating these mechanics.

Everything below assumes a feature branch with commits already on it. `main` stands for the repo's default branch — **assume it**, since every repo `/wong-setup` creates is on `main` and `git symbolic-ref refs/remotes/origin/HEAD` fails on a freshly created one. Only where `main` doesn't exist, resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`.

## 1 — open or update the pull request

```bash
gh pr view --json number,state,url
```

Exit 1 with `no pull requests found` is the **none** row. Any other failure is not "no PR": stop, and fix it with [the preconditions](preconditions.md).

| PR state | Action |
|---|---|
| **OPEN** | `git push`, then regenerate the body (below) |
| **none** | `git push -u origin HEAD`, then `gh pr create` — body file from the renderer, title in repo style |
| **MERGED** | the branch is already shipped — skip the CI wait, and say there's no live preview |
| **CLOSED** (not merged) | stop and ask whether to reopen or push to a fresh branch; never silently revive |

### The body is a mirror of the change, regenerated every time

The change file is the source of truth, so overwriting the body is safe by construction — reviewers comment on the PR, they don't edit the body. It is **generated, not curated**: never try to preserve manual body edits.

Write a short summary from the maintained proposal to an ephemeral file. The agent owns its meaning and credential exclusion; keep no second summary in the repo. Generate the other sections with [the body renderer](../scripts/render-pr-body.mjs):

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "$CHANGE_ROOT" --mode "$HANDOFF_MODE" \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

Set `HANDOFF_MODE` to `active` or `archive`. Pass `--preview-url "$PREVIEW_URL"` only when discovery returned a URL. Set `ROOT` from the repo and `REPO_URL` from `gh repo view --json url`. The renderer reads Status and the exact task checklist; review/preview sections are conditional. Archive mode links the archived path and offers no continue command. Rendering errors preserve the previous body and stop publication; inspect the output file for correctness and credential exclusion before you publish it. A new PR uses `gh pr create --body-file "$BODY_FILE"`. An open PR takes the body through the REST endpoint:

```bash
PR_NUMBER=$(gh pr view --json number --jq .number)
gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE" --silent
```

Not `gh pr edit`: older `gh` releases (2.46, for one) query the retired Projects (classic) API there, fail with a GraphQL error, and leave the old body. Remove temporary files after use. A prose-only PR fallback has no change and supplies its own body file.

## 2 — wait for checks, auto-fix on failure

The push above triggers CI where the repo has it.

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```

Read the final `RESULT:` line. `/save` reports it as `SAVE_GATE_RESULT`; an ordinary checkpoint may finish unverified because it merges nothing, while `/ship` interprets the same result strictly before merging:

| Result | Meaning | `/save` checkpoint | `/ship` interpretation |
|---|---|---|---|
| **SUCCESS** | checks passed | `SAVE_GATE_RESULT=SUCCESS` | mergeable |
| **NONE** | no checks configured — PR review is the gate | `SAVE_GATE_RESULT=NONE` | mergeable; invoking `/ship` is the approval |
| **FAILURE** | checks failed | auto-fix loop below; exhausted cap returns `SAVE_GATE_RESULT=FAILURE` | do not merge |
| **TIMEOUT** | still running past the budget | report the PR link and `SAVE_GATE_RESULT=TIMEOUT` | do not merge |
| **UNKNOWN** | `gh` couldn't be asked | report as **unverified** with `SAVE_GATE_RESULT=UNKNOWN` | do not merge |

**`UNKNOWN` is not `NONE`, ever.** One means the repo has no CI; the other means we failed to find out. The two callers diverge here for one reason: `/save` is a checkpoint and the branch isn't going anywhere, while merging on an unverified gate is exactly how a red branch reaches the default branch. Never report `UNKNOWN` as "no checks configured."

### The auto-fix loop

Read the failing log, fix, commit, push, re-wait:

```bash
RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --log-failed | tail -120
```

**Cap: 3 attempts.** Still red → stop with the error and the checks link. A CI failure is not a stop condition until the cap is reached — fixing and re-pushing *is* the runbook. Never bypass with `--no-verify` or `--force`.

This cap covers the CI fix-and-repush loop only, and it is per `/save` invocation. The one caller with a budget of its own is [`/verify`](../../verify/SKILL.md), which may fix an in-scope failure and re-walk **twice**; each of those attempts invokes `/save`, so each gets its own fresh cap of 3. The budgets nest rather than share — a walk cannot spend `/save`'s attempts, and `/save` never re-walks.

## What each caller keeps

This runbook does **not** own, and each skill states for itself:

- **`/save`** — the preview-URL discovery, staging by path (never `git add .`), the prose fast path, the session facts, and the OpenSpec sync.
- **`/ship`** — the default-branch-CI preflight, OpenSpec archive invocation, strict interpretation of `SAVE_GATE_RESULT`, worktree-safe merge, and remote-branch deletion. The archive commit/push/PR/branch-CI checkpoint belongs to its delegated ordinary `/save` call.
- **`/verify`** — the staging walkthrough, which it runs after invoking `/save`; it gates nothing here.
