# The git gate

The pull-request and CI runbook **ordinary `/save` performs for every checkpoint**, including the one `/ship` delegates; `/ship` consumes the result. It assumes a feature branch with commits.

## The default branch

`main` stands for the repo's default branch. **Assume it**; `git symbolic-ref refs/remotes/origin/HEAD` fails on a new repo. If `main` exists neither locally nor on `origin`, resolve the real name with `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` and use it wherever a command says `main`.

## 1 — open or update the pull request

```bash
gh pr view --json number,state,url
```

Exit 1 with `no pull requests found` means **none**. Any other failure is not "no PR": stop and fix it with [the preconditions](preconditions.md).

| PR state | Action |
|---|---|
| **OPEN** | `git push`, then regenerate the body (below) |
| **none** | `git push -u origin HEAD`, then `gh pr create` with the rendered body file and a repo-style title |
| **MERGED** | already shipped: skip the CI wait and say there's no live preview |
| **CLOSED** (not merged) | stop and ask: reopen, or push to a fresh branch; never silently revive |

### The body is a mirror of the change, regenerated every time

The body is **generated, not curated**: the change is the source of truth, so never preserve manual edits.

Write a short summary of the maintained proposal to an ephemeral file, under [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route), never to the repo. Render the rest with [the renderer](../scripts/render-pr-body.mjs):

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "$CHANGE_ROOT" --mode "$HANDOFF_MODE" \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

Set `HANDOFF_MODE` to `active` or `archive`, `ROOT` from the repo, and `REPO_URL` from `gh repo view --json url`. Pass `--preview-url "$PREVIEW_URL"` only when discovery returned a URL. Archive mode links the archived path, with no continue command. A rendering error keeps the old body and stops publication; check the output's correctness and excluded values before publishing. A new PR uses `gh pr create --body-file "$BODY_FILE"`; an open PR takes the body through REST:

```bash
PR_NUMBER=$(gh pr view --json number --jq .number)
gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE" --silent
```

Not `gh pr edit`, which fails on older `gh` (2.46) and leaves the old body. Remove temporary files. A save with no change supplies its own plain body file, per [save's normal route](../SKILL.md#2-maintain-the-handoff-and-capture-context).

## 2 — wait for checks, auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```

Read the final `RESULT:` line; `/save` reports it as `SAVE_GATE_RESULT=<RESULT>` and may finish unverified. `/ship` reads it strictly before merging:

| Result | Meaning | `/save` | `/ship` |
|---|---|---|---|
| **SUCCESS** | checks passed | report | mergeable |
| **NONE** | no checks configured — PR review is the gate | report | mergeable; invoking `/ship` is the approval |
| **FAILURE** | checks failed | auto-fix loop; report when the cap runs out | do not merge |
| **TIMEOUT** | still running past the budget | report with the PR link | do not merge |
| **UNKNOWN** | `gh` couldn't be asked | report as **unverified** | do not merge |

**`UNKNOWN` is not `NONE`, ever.** `UNKNOWN` means we failed to find out; merging on it lets a red branch reach the default branch. Never report `UNKNOWN` as "no checks configured."

### The auto-fix loop

Read the failing log, fix, commit, push, re-wait:

```bash
RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --log-failed | tail -120
```

**Cap: 3 attempts.** Still red → stop with the error and the checks link. Below the cap, fixing and re-pushing *is* the runbook, not a stop. Never bypass with `--no-verify` or `--force`.

The cap is per `/save` invocation: each of [`/verify`](../../verify/SKILL.md)'s two re-walks gets a fresh one; budgets nest, never share.

## What each caller keeps

`/save` keeps preview discovery, staging by path, facts, and spec sync; `/ship` the default-branch CI preflight, archive, strict gate reading, merge, and branch deletion; `/verify` the walkthrough after `/save`.
