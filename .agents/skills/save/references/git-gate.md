# The git gate

Every `/save` checkpoint, including `/ship`'s, uses this runbook on a committed feature branch.

## The default branch

`main` means the default branch. Assume it; new repos lack `origin/HEAD`. If neither local nor remote `main` exists, substitute `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`.

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

Regenerate the [change mirror](../../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan), replacing manual body edits. Write its summary outside the repo under [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route); use [the renderer](../scripts/render-pr-body.mjs):

```bash
node "$ROOT/.claude/skills/save/scripts/render-pr-body.mjs" \
  --change-root "$CHANGE_ROOT" --mode "$HANDOFF_MODE" \
  --repo-url "$REPO_URL" --branch "$BRANCH" \
  --summary-file "$SUMMARY_FILE" --output "$BODY_FILE"
```

`HANDOFF_MODE`: `active` or `archive` (archived links, no continue command). `ROOT`: repo; `REPO_URL`: `gh repo view --json url`. Add `--preview-url "$PREVIEW_URL"` only for a discovered URL. Check correctness and credential exclusion before publication. Rendering failure preserves the old body and stops. Create with `gh pr create --body-file "$BODY_FILE"`; update through REST because older `gh pr edit` fails:

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

Return the final `RESULT:` as `SAVE_GATE_RESULT=<RESULT>`; save may finish unverified, ship reads it strictly:

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

**Cap: 3 attempts per `/save` run**; each of [`/verify`](../../verify/SKILL.md)'s two re-walks gets a fresh cap (budgets nest, never share). Still red → stop with the error and the checks link.

## Saved revision handoff

After the waiter, run `node "$ROOT/.claude/skills/save/scripts/saved-revision.mjs"`. SAVED: put `repository`, `branch`, `headSha`, `gateIdentity` and actual waiter `gateResult` in temporary nonsecret JSON. Return its path and `SAVE_HEAD=<headSha>` inside a chain; keep `SAVE_GATE_RESULT`. UNKNOWN yields no receipt.

`/verify --checkpoint <receipt>` reuses SUCCESS/NONE only for matching local/remote head and newest check/run identity. New attempts invalidate it. Otherwise SAVED reads the existing waiter or verified hosted gate, without reruns, pushes or record edits. Hosted candidate/generation/base and mandatory checks remain required. Delete receipts at chain end.
