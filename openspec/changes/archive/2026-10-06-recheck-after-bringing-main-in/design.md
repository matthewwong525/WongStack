# Design

## Context

See proposal.md for why. In `.agents/skills/ship/scripts/ship.mjs`, `prepare()`:

- merges `origin/<base>` through `mergeDefault()` when `number-release.mjs` exits 3 (behind) or `--sync` is passed and the branch lacks the default branch, and prints `SYNC=merged origin/<base>`;
- concludes, at its top, a merge an earlier run stopped on (exit 5) once the agent resolved the files;
- then prints `NEXT: invoke ordinary /save once …`.

`finish()`'s recoveries (a taken number, a moved main, a conflict) all send the agent to `prepare --sync`, so each makes one more merge.

`.github/scripts/checks.mjs --worktree` checks the work here against the default branch: exit 0 with `LOCAL_CHECKS=pass`, 1 with `LOCAL_CHECKS=fail (<parts>)` and a `--only` rerun line, 7 with `LOCAL_CHECKS=not run (<reason>)`. It waits its turn through a lock. Today only `/apply`'s build helper and `/save`'s failure `NEXT:` call it, both before any merge of the default branch.

## Goals / Non-Goals

**Goals:**

- A `prepare` that merged the default branch runs the local checks once and prints their `LOCAL_CHECKS=` line.
- A failure changes `NEXT:` to a repair; nothing else about `prepare` changes.

**Non-Goals:**

- A new exit code or a stop on a local failure.
- Any change to `checks.mjs`, `checkpoint.mjs`, `merge.sh`, or `number-release.mjs`.

## Decisions

1. **One flag says a merge came in.** `prepare` sets `broughtIn` when it concludes a leftover merge at its top or calls `mergeDefault()`. Both are merges of the default branch nothing has checked. *Alternative:* compare `HEAD` with the pushed branch for unpushed merge commits. Rejected: it needs the remote branch to exist and adds git reads for a fact the command already has.
2. **The check runs last, on the tree `/save` will commit.** After `markReady()`, when `broughtIn`, `prepare` runs `node <root>/.github/scripts/checks.mjs --worktree --default-branch <base>` once. The archive move, the numbered changelog, and the rebuilt page are then in the tree it checks. The checks' own output goes to stderr unchanged; stdout gains one line, the checks' last `LOCAL_CHECKS=` line, after `REVIEW=`.
3. **A local result never stops `prepare`.** The delivery gate says a local run decides no save. Exit stays 0 and the lines stay; only `NEXT:` differs:
   - `pass` or `not run`: today's `NEXT:`.
   - `fail (<parts>)`: `NEXT: the local checks failed after <base> came in. Repair what fails and rerun only that: node .github/scripts/checks.mjs --worktree --only <parts>, three rounds at most. Then invoke ordinary /save once …` with the same change and archive words as today.
   *Alternative:* a new exit code that stops before `/save`. Rejected: it makes a pre-check a gate, and a rerun of `prepare` would merge nothing, so the check would need a second trigger.
4. **No script, no run.** When `.github/scripts/checks.mjs` is absent, or it exits with no `LOCAL_CHECKS=` line, `prepare` prints `LOCAL_CHECKS=not run (<reason>)` and goes on.
5. **No merge, no line.** With `broughtIn` false, `prepare` calls nothing and prints no `LOCAL_CHECKS=` line, so its output is byte-for-byte today's.
6. **The docs say it once each.** `the-change-loop.md`'s gate paragraph owns the rule; ship's `SKILL.md` Step 3 gains a clause that `prepare` rechecks after a merge and that `NEXT:` carries the repair.

## Risks / Trade-offs

- [`prepare` now waits for a test run, and up to 600 seconds for another chat's turn] → only after a merge; the same wait a CI failure would cost several times over. Step 3 says to allow for it.
- [An agent skips the repair in `NEXT:`] → CI still fails the save, as today; no worse than before.
- [The existing merge tests gain a `LOCAL_CHECKS=not run` line] → their fixtures have no checks script; assert the line there, so the no-script path is pinned by tests that already exist.
- [`the-change-loop.md` is at 2,891 of 3,000 words] → add at most 30 words; `wiki-links.mjs` fails past the limit.
- [Skill text is measured] → `measure-context.mjs --json` shows 1,285 words of room on instructions; keep the `SKILL.md` clause under 30 words and rerun `--check`.
