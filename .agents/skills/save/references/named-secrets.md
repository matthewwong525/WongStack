# Preserve explicitly named secrets

Preserve each credential **explicitly supplied or rotated under a known name**. Never pattern-match tokens, guess opaque names, or classify every pasted string as a credential. If setup already saved it, verify that durable copy. [The secrets convention](../../../../wiki/development/secrets.md) owns file locations. For each:

1. Resolve `PRIMARY_ROOT` with [the shared lookup](../../../../wiki/development/secrets.md#the-two-files). A non-zero exit stops the save before writing; never fall back to a linked checkout.
2. Pick the live file holding the variable's role — the root `.env` for credentials tools use, the stack's runtime file (`app/.dev.vars`) for secrets the app reads — and its declared example (`.env.example` by default). Prove from the primary worktree that the live file is ignored. If the committed ignore rule exists only on the active branch, the repository-common `info/exclude` may take the same wildcard/negation pair as immediate protection; re-check, and stop if still not ignored.
3. No live file → create it from the **active branch's** example. Replace only the exact `KEY=` line or append that one line; never regenerate the file or print the value.
4. In a linked worktree, `worktree-secrets.mjs status` (in [`ship`'s scripts](../../ship/scripts/worktree-secrets.mjs)) lists a seeded [branch copy](../../../../wiki/development/secrets.md#worktrees-and-branch-copies) under `seeded`: give it the same one-line edit. Preserve any other, [unseeded](../../../../wiki/development/secrets.md#unseeded-linked-worktree-copies) live file and report only that it needs reconciling. Never print or compare values, delete a file, or bulk-merge.
5. A new variable adds a blank `KEY=` to the active branch's example, saying what it is and where to get it; a value-only rotation makes no example diff.

Return to save. Keep handled values only in memory for [credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route), never in durable records.
