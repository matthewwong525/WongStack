## Context

`scripts/cf-secrets.mjs` finds the wrangler config (root first, then each immediate subfolder) and reads `.dev.vars`, `.dev.vars.staging`, and `.dev.vars.example` from that config's folder, which is `app/` in the shipped layout. The payload lists `.dev.vars.example` at the repo root under the `pack` category, so the file and the script disagree. The script resolves `repoRoot` from its own location, so a push in a linked worktree only looks in that worktree.

`paseo.json`'s worktree setup copies the source checkout's `.env` into each new worktree once, and nothing copies it back. The memory store already resolves the primary worktree from `git rev-parse --git-common-dir` (`.agents/skills/memory/scripts/lib/store.mjs`). `/save`'s [named-secret step](../../../.agents/skills/save/references/named-secrets.md) writes supplied values to the primary and reports any other regular live file in the worktree as a duplicate.

## Goals / Non-Goals

**Goals:**
- Each live secrets file has one role and one location, and every surface names the same location.
- A branch works on its own copy of each live file. `main` sees an add or rotation at once and a deletion only after the merge.
- `secrets:push` works from a linked worktree whether or not it was seeded.

**Non-Goals:**
- No hook. The helper runs from worktree setup, `/ship`, and by hand.
- No change to `secrets:check`, which compares Worker to Worker and reads no local values.
- No undo of a promote. The primary file is ignored and has no history; a promote edits only named lines.

## Decisions

- **Move the example; keep the script's lookup.** The script already reads the config folder, so moving `.dev.vars.example` into `app/` fixes the disagreement with no change to the lookup. The alternative, making the script also read the root, keeps two valid places.
- **The payload lists the example as `app/.dev.vars.example` under `pack`.** The pack owns the secrets model. If the link check reports a double listing with the `app` scaffold folder, drop it from `pack` and let the scaffold carry it.
- **One helper, three commands, in the `ship` skill folder.** `worktree-secrets.mjs seed|status|promote`. It uses Node built-ins and `git` only. It finds live files the way the pack finds the wrangler config: repo root, then each immediate subfolder, skipping `node_modules` and dot folders. It matches `.env`, `.env.*`, `.dev.vars`, and `.dev.vars.*`, and never a `*.example` file. The skill folder ships whole, so targets get it with no manifest change.
- **Three-way compare against a hash baseline.** `seed` writes `<git-dir>/wongstack-secrets-base.json`: for each repo-relative file, a map of key → SHA-256 of the value. `<git-dir>` is the worktree's own `git rev-parse --git-dir`, which Git never tracks and which `git worktree remove` deletes. For each key, compare worktree (W), primary (P), and base (B):
  - W = P → nothing.
  - In B, gone from W, P = B → the branch deleted it → remove from P.
  - In B, W ≠ B, P = B → the branch changed it → set P to W.
  - Not in B, in W, not in P → a branch add that missed the primary → add to P.
  - Not in B, in P, not in W → added elsewhere → keep.
  - W ≠ B and P ≠ B and W ≠ P → conflict → skip and name.
  - No baseline → apply only "in W, not in P" adds, and list the rest as unresolved.
  A two-file compare was rejected: it would delete keys that other branches added to the primary and revert rotations made there.
- **Line edits, not rewrites.** Parse `KEY=VALUE` lines, ignoring comments and blanks. A removal deletes that one line. A change replaces that one line with the worktree's line. An add appends the worktree's line. Comments, order, and other keys are kept. Before any write, `git -C <primary> check-ignore -q <path>` must pass, or that file is skipped with a reason.
- **`promote` refreshes the baseline.** After a successful promote, the baseline for the promoted files is rewritten from the new primary, so a second run is a no-op.
- **`/ship` runs `promote` in Step 6, after the fast-forward sync, with the same skip-with-one-line rule.** Output is JSON of paths and key names (`promoted`, `skipped`, `unresolved`). `/ship` puts it in the report. No prompt: the merge is the approval for a deferred edit.
- **`seed` is idempotent and never overwrites.** An existing worktree file is kept. A baseline is written only for files that `seed` copied, or for files with no baseline yet whose content equals the primary. A file that differs and has no baseline stays unseeded, and gets report-only behavior.
- **`paseo.json` calls `seed` rather than `cp`.** The command runs from the new worktree, so `seed` resolves the primary from Git. A target repo wires `seed` into its own worktree tool. The secrets page shows the one command.
- **Primary-worktree fallback in `cf-secrets.mjs` resolves by relative path.** Compute the config folder relative to the active repo root (`app`), resolve the primary root as the parent of `git rev-parse --path-format=absolute --git-common-dir`, and look for `<primary>/app/.dev.vars`. Use it only when the local file is missing and no explicit file argument was given. If `git` fails, keep today's "no `.dev.vars`" error. Import nothing new from `lib-wrangler-config.mjs`, which older installs do not update.
- **The rule, not a hook, carries the edit-time instruction.** Path-scoped rules already load when an agent touches `.env*` or `**/.dev.vars*`.
- **`wiki/stack/d1-pipeline.md` owns the "which file" table; `wiki/development/secrets.md` owns the branch-copy lifecycle.** The rule, the other pages, and both example headers link to them. `secrets.md` stays stack-neutral: it names `.env` as the default and the stack's runtime file only through a link.

## Risks / Trade-offs

- [An installed repo kept a root `.dev.vars`] → The push stops with "no `.dev.vars` next to the wrangler config (`app`)". The changelog tells installed repos to move it. `seed` still copies the root file, because it matches the name.
- [Value hashes of weak values can be guessed] → Only the hash is stored, and only in the local `.git` folder that already sits beside the live files in plain text. It adds no new exposure.
- [An agent writes a deletion straight to the primary] → The rule says not to. If it happens, `promote` sees W = P and does nothing, so the only harm is the one the rule exists to prevent.
- [The merge happens outside `/ship`, for example in the GitHub UI] → Nothing promotes. `status` shows the pending keys, and the secrets page says to run `promote` by hand after such a merge.
- [Tests need `git` and a real linked worktree] → Build a temp repo with `git init` and `git worktree add`. `cf-secrets` push tests use a fake `npx` on `PATH`, as `cf-deploy.test.mjs` does.

## Migration Plan

None. Every install starts from an empty folder (Decision log). This worktree was created by the old `cp` setup, so it has no baseline. Its `promote` at ship time is report-only, which is the designed fallback. Rollback is reverting the commit.
