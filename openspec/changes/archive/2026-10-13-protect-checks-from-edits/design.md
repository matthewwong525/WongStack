# Design

## Context

See proposal.md — Why. Read on 2026-10-13:

- `.github/scripts/loosened-checks.mjs` flags skip markers, deleted tests and settings changes; `check-settings.mjs` owns the settings list, shared with `checks.mjs`. Neither names `.agents/verification/journeys/` or `.github/actions/` (memory fact #646 left the second as is on 2026-09-29).
- `test.yml` checks out the pushed commit and runs `node .github/scripts/checks.mjs`, so the workflow, `checks.mjs` and the guard are all the branch's copy. A branch that edits the guard is flagged only by its own edited guard.
- The `main` rule set requires the `test` and `payload` checks and a pull request. `/ship` stops on any failing check `gh pr checks` lists.
- Ten commits on `main` have modified or deleted files under `.agents/verification/journeys/`. Whether any was wrong was not checked.
- A kept check holds `scenario` (`capability`, `requirement`, `scenario`), `thenDigest`, `steps`, `expect`, and recording details (`recordedAt`, `sourcePaths`). `verify-journeys.mjs` already has `promiseDigest` and `ownRequirements`.

## Goals / Non-Goals

**Goals:** a kept check weakened or removed with no reason turns CI red; a pull request is judged by a guard copy it can not change.

**Non-Goals:** changing how a fresh walk is graded; a secret hash of the script, as the post used; protecting the non-GitHub route; adding the new check to the required checks.

## Decisions

1. **A fourth kind in the guard: `kept`, "changes or removes a kept check".** For each changed path under `.agents/verification/journeys/` ending `.json`:
   - status `A`, or a rename whose steps and expectations are equal: not flagged.
   - status `M` or a rename: flagged when `JSON.stringify` of `steps` or of `expect` differs between base and head. Unreadable JSON on either side counts as differing.
   - status `D`: flagged.
   - exempt in every case when the promise moved: the scenario's promise digest in `openspec/specs/<capability>/spec.md` differs between base and head (rewritten or gone), or a delta spec in the diff under `openspec/changes/**/specs/<capability>/spec.md` lists its requirement as MODIFIED or REMOVED. The second covers the pre-check on this computer, before `/save` reconciles deltas.

   Export the spec reader and digest from `verify-journeys.mjs` (or move them to a small shared module beside it) and import them, as the guard already imports `cli.mjs` from the memory skill; no second parser. Alternative considered: put the folder in `isSettings`. Rejected: every new kept check at every publish would need a reason, and `checks.mjs` would rerun the "prove it still fails" pass for each.

2. **`.github/actions/` joins `isSettings`.** One line in `check-settings.mjs`. `checks.mjs` shares that list, so an action edit also triggers its prove-it-fails pass; that is the intended reading of "a check's settings".

3. **A second run from the default branch: `.github/workflows/guard.yml`.** Trigger `pull_request_target` (opened, synchronize, reopened), which always uses the default branch's workflow file. One job, `guard`, `permissions: contents: read`:
   - check out the default branch into `guard/`;
   - check out the pull request's head into `pr/` with full history and `persist-credentials: false`;
   - find the base as `git merge-base` of the head and the base ref, inside `pr/`;
   - `cd pr && node ../guard/.github/scripts/loosened-checks.mjs --base <sha>`, writing the report to the job summary.

   The script already `chdir`s to the top level of the folder it is run from and resolves its imports beside itself, so it reads `pr/` as data and runs only `guard/` code. Nothing from `pr/` is installed or executed, which is what makes `pull_request_target` safe here, forks included; say so in the workflow's header comment. `setup-node` reads `.nvmrc` from `guard/`. Pin actions by commit like the other workflows.

   Alternatives considered. *Have `checks.mjs` fetch the default branch's guard*: `checks.mjs` and `test.yml` are the branch's own, so the change could remove the fetch. *A hash of the guard compared with a stored secret* (the post's fix): it stops edits outright, so every honest guard change needs a secret rotated by hand; the default-branch copy needs no secret and lets a guard change through with a reason. *Replace the in-branch run*: it also serves `--worktree` and the Artifacts route.

4. **The reason is written where kept checks change.** `/ship` archives before `/verify` § g installs kept checks, and `explainedPaths` accepts an archived proposal the diff touches. § g gains one clause: a replaced or removed kept check gets its `Check:` bullet in the archived proposal before the save. `keep --install` prints one `REPLACED=<path>` or `REMOVED=<path>` line per kept file whose steps or expectations it changed or that it deleted, so the clause has a list to follow. The words come out of the same file to hold the context budget.

5. **First landing.** `pull_request_target` reads the default branch, so `guard.yml` does not run on its own pull request; the in-branch guard does, and flags `guard.yml`, both scripts and nothing else. The proposal's two `Check:` bullets explain them. After the merge, the next pull request is the first real run.

## Risks / Trade-offs

- [More lines under *Checks loosened*: a renamed button re-records a kept check and now needs a reason] → that line is the point; decision 1 keeps re-keeps with unchanged steps silent.
- [`/save` reads checks right after opening the pull request, before the `guard` run is listed] → confirm in task 4.2 how `/save`'s wait treats a check that appears late; if it can miss one, wait for `guard` by name when `guard.yml` exists on the default branch.
- [The check is not required by the rule set, so a person merging by hand on GitHub can pass a red `guard`] → `/ship` stops on it; the changelog offers adding `guard` to the required checks as a hand step.
- [The Artifacts route and `--worktree` still run the branch's copy] → named in the gate page as the limit.
- [A guard bug on the default branch blocks every pull request, and its fix is judged by the buggy copy] → the fix needs only a `Check:` bullet naming the guard file, which the buggy copy's explained-path logic already accepts; a broken explained-path reader is the one case needing a hand merge.

## Migration Plan

Ships as a minor release. Installs receive `guard.yml` and the two scripts through `/wong-sync`; nothing to migrate. Roll back by reverting the commit; the in-branch guard keeps working alone.
