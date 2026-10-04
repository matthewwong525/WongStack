# The git gate

The pull-request and CI runbook for **every `/save` checkpoint**, including the one `/ship` delegates and reads. It assumes a feature branch with commits.

## The default branch

`main` means the repo's default branch. **Assume it**: `git symbolic-ref refs/remotes/origin/HEAD` fails on a new repo. If `main` exists neither locally nor on `origin`, use the name `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name` prints wherever a command says `main`.

## 1 — open or update the pull request

```bash
gh pr view --json number,state,url
```

Exit 1 with `no pull requests found` means **none**; any other failure: stop and fix it with [the preconditions](preconditions.md).

| PR state | Action |
|---|---|
| **OPEN** | `git push`, then regenerate the body |
| **none** | `git push -u origin HEAD`, then `gh pr create` with the rendered body file and a repo-style title |
| **MERGED** | already shipped: skip the CI wait; say there's no live preview |
| **CLOSED** (not merged) | stop and ask: reopen, or push to a fresh branch |

### The body mirrors the change

The body [mirrors the change](../../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan), **regenerated every time**: drop manual edits. Write a short summary of the proposal to a temporary file outside the repo, under [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route). Render the rest with [the renderer](../scripts/render-pr-body.mjs):

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "$CHANGE_ROOT" --mode "$HANDOFF_MODE" \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

`HANDOFF_MODE` is `active` or `archive` (archive links the archived path, no continue command); `ROOT` is the repo; `REPO_URL` comes from `gh repo view --json url`. Add `--preview-url "$PREVIEW_URL"` only when discovery returned a URL. A rendering error keeps the old body and stops publication; before publishing, check the output is correct and holds no excluded value. A new PR takes `gh pr create --body-file "$BODY_FILE"`. An open PR takes the body through REST, not `gh pr edit`, which fails on older `gh` (2.46) and leaves the old body:

```bash
PR_NUMBER=$(gh pr view --json number --jq .number)
gh api -X PATCH "repos/{owner}/{repo}/pulls/$PR_NUMBER" -F "body=@$BODY_FILE" --silent
```

Remove temporary files. A save with no change skips the renderer: its body says the edit in plain words and ends with a footer naming `/ship` to publish it.

## 2 — wait for checks, auto-fix on failure

```bash
ROOT="$(git rev-parse --show-toplevel)"
bash "$ROOT/.claude/skills/save/scripts/wait-for-checks.sh" 20
```

Read the final `RESULT:` line. `/save` reports it as `SAVE_GATE_RESULT=<RESULT>` and may finish unverified; `/ship` reads it strictly before merging:

| Result | Meaning | `/save` | `/ship` |
|---|---|---|---|
| **SUCCESS** | checks passed | report | mergeable |
| **NONE** | no checks configured — PR review is the gate | report | mergeable; invoking `/ship` is the approval |
| **FAILURE** | checks failed | auto-fix loop; report when the cap runs out | do not merge |
| **TIMEOUT** | still running past the budget | report with the PR link | do not merge |
| **UNKNOWN** | `gh` couldn't be asked | report as **unverified** | do not merge |

**`UNKNOWN` is never `NONE`**: merging on it lets a red branch into the default branch.

### The auto-fix loop

List every failing check and the cause its log shows, then fix all in one push. A failure outside the diff gets one `gh run rerun "$RUN_ID" --failed`; still red: stop, no code edit:

```bash
RUN_ID=$(gh run list --branch "$(git rev-parse --abbrev-ref HEAD)" --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --log-failed | tail -120
```

**Cap: 3 attempts per `/save` run**; each of [`/verify`](../../verify/SKILL.md)'s two re-walks gets a fresh cap (budgets nest, never share). Still red → stop with the error and the checks link. Never bypass with `--no-verify` or `--force`.
