# Preserve explicitly named secrets

Save is the universal checkpoint for credentials the user **explicitly supplied or rotated with a known variable name** this session. Never pattern-match token-shaped strings, guess a name for an opaque value, or treat every pasted string as a credential. An earlier producer, such as setup, may already have saved it; verify that durable copy rather than creating another.

For each explicitly named secret:

1. Resolve `PRIMARY_ROOT` with the shared lookup the [secrets convention](../../../../wiki/development/secrets.md#the-two-files) names. A non-zero exit stops the save before writing; never fall back to a linked checkout.
2. Use the repo's declared live/example pair (`.env` / `.env.example` by default). Prove from the primary worktree that the live destination is ignored. If the committed ignore rule exists only on the active branch, the repository-common `info/exclude` may take the same wildcard/negation pair as immediate protection; re-check, and stop if still not ignored.
3. Create the durable live file from the **active branch's** example when absent. Replace only the exact `KEY=` line or append that one line; never regenerate the file or print the value. The live file is the one holding the variable's role: the root `.env` for credentials tools use, or the stack's runtime file (`app/.dev.vars`) for secrets the app reads.
4. In a linked worktree, `worktree-secrets.mjs status` (in the [`ship` skill's scripts](../../ship/scripts/worktree-secrets.mjs)) lists a seeded [branch copy](../../../../wiki/development/secrets.md#worktrees-and-branch-copies) under `seeded`; give it the same one-line edit. Preserve any other, [unseeded](../../../../wiki/development/secrets.md#unseeded-linked-worktree-copies) live file and report only that reconciliation is needed. Never print or compare values, delete a file, or bulk-merge.
5. For a new variable, add a blank `KEY=` declaration to the active branch's example, saying what it is and where to get it; a value-only rotation makes no example diff.

Keep handled values only in working memory for the leak check, never on a durable surface ([credential exclusion](../SKILL.md#1-protect-credentials-and-select-the-route)). Then return to the main procedure; its exclusion check still runs.
