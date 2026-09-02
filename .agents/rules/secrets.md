---
paths: [".env*", "**/.env.example", "**/.dev.vars*"]
---

# Touch env files carefully

Real values live only in the git-ignored `.env` at the primary worktree; `.env.example` is the committed, values-blank map of every variable. Before you add, move, or rename a variable, read [the secrets convention](../../wiki/development/secrets.md) — it owns worktree resolution, duplicate reconciliation, and what `/save` must exclude. Never write a credential value into a committed file, note, plan, or output.
