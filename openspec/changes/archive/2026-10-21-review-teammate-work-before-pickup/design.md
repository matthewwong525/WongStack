# Design

## Context

The finding (`continue-checkout:agents-hooks:branch-controlled-hook-scripts`, Cloudflare security check run 1, reproduced at 08f9788e) traces this path, all still true on the current `main`:

- `/continue` step 3 runs `git checkout "$BRANCH"` or `gh pr checkout <N>` once the tree is clean, with no look at who wrote the branch ([`continue/SKILL.md`](../../../.agents/skills/continue/SKILL.md) lines 63–64), and step 4 then invokes `/apply` unasked (line 92).
- Every project hook runs a script from the checked-out tree: `$CLAUDE_PROJECT_DIR/.claude/skills/...` in [`.agents/settings.json`](../../../.agents/settings.json), `$(git rev-parse --show-toplevel)/.claude/skills/...` in [`.agents/hooks.json`](../../../.agents/hooks.json). All four hook scripts import `.agents/skills/memory/scripts/lib/cli.mjs` or `store.mjs`, so a one-file library edit reaches every hook while the command strings stay the same.
- The new-workspace route, `workspace.mjs open --checkout <branch>`, passes `--worktree-mode checkout-branch` to Paseo. Paseo 0.12.0 (`utils/worktree.js`, `ensureLocalBranch`) uses an existing local branch as it is, else fetches `origin <branch>:<branch>`; it then runs the new worktree's own `paseo.json` setup without asking (`runSetup` defaults to true), which runs the branch's `worktree-secrets.mjs seed` and copies `.env` in.
- The app's git proxy refuses no path other than `.github/workflows/`, and checks no commit author (`app/worker/employee-access/code.ts`), so an author email on a teammate's commit can be anything.

## Goals / Non-Goals

**Goals:**
- No commit this computer has never had reaches a working tree through `/continue` or its new-workspace route until the person has seen its file list and said yes, and only the commit they saw.
- The check is a script, so the skill calls one command to switch and can't switch past it by forgetting a step.

**Non-Goals:**
- Hook pinning (see Decisions).
- Switches made by hand, or by tools other than `/continue` and `workspace.mjs`.
- The new workspace's permission mode and the environment `checks.mjs --worktree` passes to tests: separate hardening notes.

## Decisions

### The pickup check is the boundary, not hook pinning

Pinning the hooks to a copy of `main` (a launcher under the git common dir, refreshed when `main` moves) was weighed and dropped:

- **It doesn't close the hole.** The branch also carries `.agents/settings.json` and `hooks.json`. Claude Code snapshots hook commands at session start, so a mid-session checkout can't swap them, but the next fresh session in that checkout reads the branch's own commands. A new workspace on the branch is exactly that fresh session.
- **Hooks aren't the only runner.** After checkout, `/apply` reads the branch's `SKILL.md` files as instructions and runs `npm ci` and `npm test` from it. Only a review before checkout covers those.
- **It costs the meta-repo.** Hook and memory-library edits on a branch would stop running there until published, and every hook script resolves the repo from its own file path, so each would need rework.

So the check before the working tree changes is the one boundary; the hooks keep reading the checkout.

### "Known" is reachability, not authorship

A commit is known when it is reachable from any local branch (`refs/heads/*`, shared by every worktree) or from the remote default branch (`origin/<default>`, which only the owner, an Admin, or a publish-tick holder moves, after the checks). The commits to review are `git rev-list <tip> --not --branches origin/<default>`. Authorship is ignored because the proxy doesn't check it. A teammate can't put commits into the owner's local refs, so the test can't be faked. The cost: the owner's own work from another computer or a cloud run asks once (Decision log).

### One script switches, and refuses to switch past unseen work

New [`continue/scripts/pickup.mjs`](../../../.agents/skills/continue/scripts/pickup.mjs) in the pinned, already-checked-out copy (it runs before anything from the branch lands):

```text
pickup.mjs <branch> [--reviewed <commit>] [--dry-run]
```

1. Refuses a dirty tree (exit 2). Fetches `origin <branch>`; a branch missing on `origin` exits 2 (a PR from a fork is out of scope: say so and switch nothing).
2. Lists the unknown commits from the remote tip. With none, it switches; `--dry-run` only reports.
3. With some, and `--reviewed` absent or not equal to the tip, it switches nothing and exits 3 with JSON: `tip`, `commits` (sha, author as written, subject) and `files`. Files come from `git log --cc --name-only <tip> --not <known>`, so a merge of `main` lists only what the merger changed. Each file is labelled `code`, or `words` under `openspec/` or `wiki/`, with code first.
4. With `--reviewed` equal to the tip, it switches: it creates the local branch at that commit tracking `origin/<branch>`, or fast-forwards an existing local branch to it (refusing if that isn't a fast-forward). It then checks `HEAD` equals the reviewed commit.
5. A branch checked out in another worktree exits 4 with that path, as step 3 says today.

The skill's step 3 calls `pickup.mjs` instead of `git checkout`/`gh pr checkout`. On exit 3 it shows the code files and a short read of what they do (read with `git diff`/`git show`, which run nothing), then asks [the shared way](../../../.agents/skills/explore/references/asking-the-user.md): *Switch to it* (its code then runs on this computer, with your keys) / *Show the code in full* / *Leave it*. On *Switch*, it reruns with `--reviewed <tip>`. If the teammate saved again meanwhile, the tip has moved, exit 3 comes back with the new commits, and the ask repeats.

### After a reviewed switch, step 4 asks before building

A switch that needed `--reviewed` ends step 4 with the recap and a next-step ask (*Build it* / *Stop here*), never an automatic `/apply` or `checks.mjs`. An explicit instruction in the `/continue` call doesn't skip this: the person gave it before seeing the files.

### The new-workspace route reuses the same check and pins the branch

`/continue`'s busy-workspace ask runs `pickup.mjs <branch> --dry-run` first, so the review comes before the choice of where to open it. `workspace.mjs open --checkout <branch>` imports the same review function. With unknown commits it requires `--reviewed <commit>` equal to the fetched tip, else exits 2 with the review JSON. Before calling Paseo it creates or fast-forwards the local branch to that commit in the primary, so Paseo's `ensureLocalBranch` uses it and fetches nothing. After Paseo returns, it compares the new worktree's `HEAD` to the commit and reports a mismatch as an error. A teammate's later push can't slip into setup, because Paseo never fetches a branch that exists locally.

## Risks / Trade-offs

- [Asks on the owner's own work from another computer or a cloud run] → One ask, then that branch is local and known. Accepted in the Decision log.
- [The agent runs a raw `git checkout` despite the skill] → The skill names no other checkout command, and a test asserts it. Defence in depth for hand switches was weighed above and dropped.
- [Text labelled `words` can still steer the agent] → Every unknown file is listed and asked about; the label only orders the list.
- [Paseo changes how `checkout-branch` resolves a branch] → The post-open `HEAD` check catches it and reports an error. The workspace test pins the argument shape.
- [Skill text grows past the `measure-context` baseline] → Offset by moving step 3's checkout detail into the script's usage line and trimming the step.

## Migration Plan

No data migration. Branches already checked out before this ships are local and count as known, as if accepted. Rollback is a revert.

## Follow-ups

The security check rejected seven findings as covered by this one (`REPORT.md` line 457: `cf-preview.sh` host token, the primary fast-forward syncs, `tidy.mjs sweepScratch`, `digest.mjs personPage`, `worktree-secrets.mjs promote`). Each needs a branch the owner checks out; once this ships, re-check them against a reviewed pickup. They belong to their own parts, not this change.

The second look also found that `workspace.mjs`'s own `defaultBranch` (the base for a new workspace), `checkpoint.mjs`'s, and `/continue` step 4's drift count still prefer `main` whenever it exists. On a repo that publishes another branch, a plain new workspace could start from a teammate's `main`. `pickup.mjs` now reads `origin/HEAD`; the others are a separate fix.
