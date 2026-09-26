---
paths: [".env*", "**/.env.example", "**/.dev.vars*"]
---

# Touch env files carefully

Two live files, one role each ([which file holds what](../../wiki/stack/d1-pipeline.md#env-and-devvars-are-not-interchangeable)):

- **Root `.env`** — what you and the scripts use to reach Cloudflare. It never reaches a Worker.
- **`app/.dev.vars`** — the secrets the Worker reads at runtime.

Each has a committed, values-blank `.example` beside it. Real values live in the git-ignored file of the primary worktree. A linked worktree has its own branch copy at the same path. Route each edit by its kind:

- **Add a key, or rotate a value** — write it to the worktree copy **and** the primary copy now.
- **Delete a key, or set a value only this branch needs** — write the worktree copy only. `/ship` promotes it to the primary after the merge.

Before you add, move, or rename a variable, read [the secrets convention](../../wiki/development/secrets.md). It owns worktree resolution, the branch-copy lifecycle, and what `/save` must exclude. Never write a credential value into a committed file, note, plan, or output.
