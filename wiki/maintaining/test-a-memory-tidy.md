# Test a memory tidy on unmerged code

You run one real [daily memory tidy](../development/wiki-dream.md) from a branch that is not on `main` yet, against this computer's real memory, and publish nothing.

The tidy works in a throwaway copy of the branch that `origin/HEAD` names ([`run.mjs`](../../.agents/plugins/memory/scripts/run.mjs)), so a run from your own worktree still tidies `main`'s code. Point it at your branch instead:

1. **Clone the repo to `/tmp`**, not inside a checkout, and check out your branch there.
2. **Point `origin/HEAD` at the branch:** `git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/<branch>`.
3. **Use a wrapper profile with no publish.** Write a profile file outside the clone whose default export copies the clone's `.agents/memory/profile.mjs` default, and its `tidy` parts, with `tidy.publish` set to `undefined`. Name it in `WONG_MEMORY_PROFILE` ([`store.mjs`](../../.agents/plugins/memory/scripts/lib/store.mjs) reads it). With no publish, the run keeps its edits in the copy.
4. **Read the real store:** set `WONG_MEMORY_STATE_DIR` to the real state folder, the primary checkout's `.git/wong-memory`, so the clone uses this computer's key and records.
5. **Start it from the clone:** `node .agents/plugins/memory/scripts/run.mjs --daily --force`. `--force` runs it even when today's tidy already ran.

Remove the clone when you are done.

Part of [maintaining WongStack](README.md).
