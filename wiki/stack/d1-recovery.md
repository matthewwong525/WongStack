# Fix a broken production database

This page is the runbook for when the production database breaks on the [Cloudflare stack](README.md): undo a bad migration, keep schema changes out of hand edits, and repair the migration ledger. The [deploy and data pipeline](d1-pipeline.md) explains how migrations reach production in the first place.

## A bad migration reached production

Migrations are forward-only and auto-applied on merge. If one breaks production, restore with **D1 Time Travel** — point-in-time restore, no down script needed:

```bash
# Find a bookmark from before the bad migration ran (timestamps in UTC):
npx wrangler d1 time-travel info <db-name>

# Restore to it:
npx wrangler d1 time-travel restore <db-name> --bookmark <bookmark>
```

The default Time Travel window is 30 days on the standard plan — confirm your retention before relying on it for a non-trivial recovery. Then revert the offending migration in git and write a corrected one; the next merge applies it.

## Never hand-apply schema to production

**The build script is the only thing that should run DDL against production.** It replays `schema/migrations/` through `wrangler d1 migrations apply`, which records each file it ran in the `d1_migrations` ledger. Run an `ALTER TABLE` / `CREATE TABLE` against production by hand and you change the schema **without** recording anything in that ledger. The next deploy re-runs the migration file that "owns" that change and fails — `duplicate column name`, `table already exists` — turning the default branch red and blocking *every* deploy until it's reconciled. (This is not hypothetical: a hand-applied column once kept a production branch red for 8 commits.)

So ship every schema change as a migration through the normal flow: [`/save`](../../.agents/skills/save/SKILL.md) exercises it on staging, the merge applies it to production. If a genuine emergency forces a hand-apply, record it in the ledger **in the same session** so history matches reality:

```bash
npx wrangler d1 execute <db-name> --remote \
  --command "INSERT INTO d1_migrations (name) VALUES ('<the-migration-filename>.sql')"
```

## Production schema drifted from `d1_migrations`

**Symptom:** the deploy is red with `duplicate column name: X` or `table X already exists`, yet `wrangler d1 migrations list <db-name> --remote` still shows that migration as **pending**. Production's schema already has the change, but the ledger doesn't record the file that introduces it — a hand-apply, or a migration that errored *after* its DDL ran but *before* it was recorded.

**Fix — reconcile the ledger to reality; don't edit the migration file:**

```bash
# 1. Confirm the change is genuinely already in production:
npx wrangler d1 execute <db-name> --remote \
  --command "SELECT sql FROM sqlite_master WHERE name='<table>'"

# 2. Mark the migration applied so the next deploy skips it:
npx wrangler d1 execute <db-name> --remote \
  --command "INSERT INTO d1_migrations (name) VALUES ('<the-migration-filename>.sql')"

# 3. Verify it (and only it) dropped off the pending list:
npx wrangler d1 migrations list <db-name> --remote
```

Leave the migration **file unchanged** — fresh databases and staging still need it to add the change normally; only production's *recorded history* was out of sync. The build goes green on the next deploy.

## Next

- How migrations reach production: the [deploy and data pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
