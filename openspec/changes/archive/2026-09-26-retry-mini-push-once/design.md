## Context

`save/references/mini-app-save.md` runs the app's tests, commits, and pushes `HEAD:main`; any rejected push falls back to a pull request. `main` moves often in this repo (four releases landed during one afternoon), so a save that takes longer than a few seconds meets a moved `main`.

## Goals / Non-Goals

**Goals:** a moved `main` costs one rebase, not a pull request; the retry is deterministic and tested.

**Non-Goals:** more than one retry; the prose route; a push refused by rules.

## Decisions

- **`save/scripts/mini-app-push.sh <name> [default-branch]`.** It checks that every commit ahead of `origin/<default>` touches only `mini-apps/apps/<name>/`, runs `node --test` in that folder when it has a test file, and pushes `HEAD:<default>`. It prints `key=value` lines: `pushed`, `rebased`, `reason`.
- **Exit codes.** 0: pushed (maybe after one rebase). 1: the first test run failed; nothing pushed. 2: usage. 3: fall back to a pull request, with `reason=outside|refused|rebase-conflict|tests-after-rebase|second-push`.
- **Which rejection is a moved branch.** Git prints `(fetch first)` or `(non-fast-forward)` for a remote that moved. Any other rejection, such as a hook or branch-rule refusal, is `refused` and is not retried.
- **A failed rebase is aborted,** so the fallback starts from a clean tree with the save's own commit.
- **Tests use real git:** a bare origin, the saver's clone, and a second clone that moves `main`. A pre-receive hook in the bare origin stands in for branch rules.

## Risks / Trade-offs

- **A rebase rewrites the save's local commit.** → It is unpushed and only touches one app's folder; the push is never forced.
- **Tests after the rebase run against newer `main`.** → They run only the app's own tests, which depend only on the app's folder; a failure falls back to a pull request so CI and a person see it.
