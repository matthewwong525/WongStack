## Context

See [proposal.md](proposal.md) — Why. The constraint that shapes the whole design: the step runs **after** the merge, so it can never be a gate, and it writes to a checkout that another session may be standing in.

`/ship` Step 5 already ends with `git push origin --delete "$BRANCH"`. That leaves three refs stale everywhere: `origin/<branch>` (now `[gone]`), `origin/main` (behind the squash), and the local `main` of whatever checkout owns it. All three are fixed by the same short block.

## Goals / Non-Goals

**Goals:**

- One block, no branching on "am I in a worktree" — the question that actually decides the command is *which checkout has the default branch*.
- Offline after one fetch: worktrees share the object store and the ref namespace, so a single `git fetch` in the active worktree already updates `origin/main` for every sibling.
- Every failure mode is a one-line report, never a stop.

**Non-Goals:**

- Cleaning up the `[gone]` local branches. `git branch -vv` in this repo lists dozens; pruning them is its own change with its own safety question.
- Any behavior when the ship stops early. A run that never merged has nothing to sync.

## Decisions

**Scan the worktrees instead of testing for one.** The naive shape is `if in a worktree → primary root, else → local ref`. It gets the common case right and the interesting case wrong: a primary checkout sitting on some *other* feature branch is neither, and the naive shape would either skip it or try to fast-forward a branch that is not checked out there. Ask the question that determines the command instead:

```bash
git fetch origin --prune                  # refresh origin/main; drop the deleted branch's ref
MAIN_WT=$(git worktree list --porcelain \
  | awk '/^worktree /{p=$2} /^branch refs\/heads\/main$/{print p}')
```

- `$MAIN_WT` set → some checkout has `main` out; fast-forward it there.
- `$MAIN_WT` empty → nothing has it; advance the ref in place with `git fetch origin main:main`.

A plain single checkout on a feature branch takes the second path, and a linked-worktree session with a clean primary takes the first — the two shapes the proposal names, without either being special-cased. `git worktree list` prints one entry in a plain checkout, so the scan costs nothing there.

**Require a clean tree before touching another checkout.** `git merge --ff-only` aborts only when it would *clobber* a local change; unrelated modified files fast-forward right underneath whoever is editing them. That is exactly the surprise this step must not cause, so gate on `git -C "$MAIN_WT" status --porcelain` being empty and skip otherwise. The cost is skipping some syncs that would have been harmless; the alternative is moving files under a concurrent session.

**`merge --ff-only origin/main`, not `pull`.** The fetch already happened, the refs are shared, and `pull` in another worktree would open a second network round trip and could merge rather than fast-forward. Alternatives ruled out: `git pull --ff-only` (redundant fetch), `git update-ref` (skips the working-tree update entirely — the ref would move while the files did not).

**No `PRIMARY_ROOT` resolution.** [The secrets convention](../../../wiki/development/secrets.md) resolves the primary worktree from Git's common directory because it needs *the durable file location*. This step needs *the checkout holding a branch*, which `git worktree list` answers directly and more precisely. Naming the convention and then not using its snippet would be the confusing outcome; the proposal's reference to it is dropped in favor of the scan.

**Placement: a new Step 6, report becomes Step 7.** It has to follow the branch delete (that is what makes the prune meaningful) and precede the report (which names its outcome).

## Risks / Trade-offs

- **The step writes outside the active worktree — the only place `/ship` does.** → Fast-forward only, clean-tree precondition, no checkout/switch/stash/reset, no local-branch deletion. The worst case is that nothing moves.
- **A concurrent session commits to the primary `main` between the merge and the fetch, so the fast-forward is refused.** → Reported as a skip; the next `git pull` there resolves it. This is the pre-existing status quo, not a regression.
- **`awk` on `git worktree list --porcelain`.** → The porcelain format is a stability contract, unlike the human-readable form the old `git worktree list` output would need parsing from.
- **Repos whose default branch is not `main`.** → The runbook's existing "`main` stands for the repo's default branch — assume it" note already covers every command in the file, including these.
