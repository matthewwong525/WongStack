# The git gate

Every `/save` checkpoint, including `/ship`'s, is one run of [`checkpoint.mjs`](../scripts/checkpoint.mjs) on a feature branch with its files staged.

## The default branch

`main` means the default branch. Assume it; new repos lack `origin/HEAD`. If neither local nor remote `main` exists, substitute the name `gh repo view --json defaultBranchRef` gives.

## 1 — open or update the pull request

The command pushes to an **OPEN** PR, or creates one. A **MERGED** PR gets no push or wait: already shipped, no live preview. A **CLOSED** one stops it: ask, reopen or push to a fresh branch. It refuses nothing to save, the default branch, a credential match and a spent fix cap; a `gh` failure → [the preconditions](preconditions.md).

### The body mirrors the change

The body is regenerated as the [change mirror](../../../../wiki/development/the-change-loop.md#the-change-is-a-living-handoff-not-just-a-plan), replacing manual edits. A rendering failure keeps the old body and stops. With no change, the body is the summary and a footer naming `/ship`.

## 2 — wait for checks, auto-fix on failure

The command waits up to 20 minutes and ends with `SAVE_GATE_RESULT=`; save may finish unverified, ship reads it strictly:

| Result | Meaning | `/save` | `/ship` |
|---|---|---|---|
| **SUCCESS** | checks passed | report | mergeable |
| **NONE** | no checks configured — PR review is the gate | report | mergeable; invoking `/ship` is the approval |
| **FAILURE** | checks failed | auto-fix loop; report when the cap runs out | do not merge |
| **TIMEOUT** | still running past the budget | report with the PR link | do not merge |
| **UNKNOWN** | `gh` couldn't be asked | report as **unverified** | do not merge |

**`UNKNOWN` is never `NONE`**: merging on it lets a red branch into the default branch.

### The auto-fix loop

`FAILURE` lists every failing check with the cause its log shows. Fix all in one push, after rerunning the failed check here where the tools exist: `node .github/scripts/checks.mjs --worktree`, a pre-check, never the gate. A failure outside the diff gets one rerun; still red: stop, no code edit.

**Cap: 3 attempts per `/save` run**, counted by the command; each of [`/verify`](../../verify/SKILL.md)'s two re-walks passes `--new-run` for a fresh cap (budgets nest, never share). Still red → stop with the error and the checks link. Never bypass with `--no-verify` or `--force`.

## Saved revision handoff

`RECEIPT` is a temporary nonsecret file with the saved revision's identity and the waiter's result. Return its path and `SAVE_HEAD` inside a chain; keep `SAVE_GATE_RESULT`. UNKNOWN yields no receipt.

`/verify --checkpoint <receipt>` reuses SUCCESS/NONE only for the same head and newest check/run identity; otherwise it reads the existing gate, without reruns, pushes or record edits. Delete receipts at chain end.
