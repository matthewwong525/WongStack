# Fix four bugs a repo audit found

**Status:** planned
**Branch:** discrepancies-elegance
**Open questions:** none

## Why

A read-through of the repo on 2026-09-29 found four real bugs among its loose ends. One could let a test branch change the live app's data. One could put a mini app's test file on the public site. The other two break a step for anyone who reaches it. Each fix is small, so fixing them now costs little.

## What Changes

- **A test branch can never touch the live app's data.** If a setup mistake points the test copy of the app at the live database, every test-copy step now stops before it touches it. That covers each branch push, each test deploy, each preview, and each staging reset. Today only the preview and the reset check, and only by name: a copied entry with a new name but the same database gets past all of them.
  ```text
  push a branch
        │
        ▼
  same name or id as live database? ──▶ stop
        │ no
        ▼
  migrate staging, build, deploy
  ```
- **A mini app's test files stay private.** One rule now decides what counts as a test file. CI runs the tests it names, the build leaves them off the site, the app refuses to serve them, and the check for switched-off tests reads them. Today a file named like `foo_test.mjs` runs as a test and is also published under `/apps/`.
- **`/verify`'s staging reset runs.** After a failed check, `/verify` resets staging with a command that fails, because it looks for the app's settings in the wrong folder. It now runs the reset script directly.
- **Setup keeps your keys in the right place.** When setup can't find the main copy of the repo, it now stops and says why. Today it saves the keys in whatever folder it runs from, which may be a temporary copy that gets deleted.

Non-goals: the audit's other findings, being planned in their own workspaces ("Docs that disagree", "Tidy the code", "Reshape the wiki").

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: every staging step refuses a staging D1 entry that names production's database by `database_name` or `database_id`, before any wrangler call.
- `mini-apps`: one shared rule names a mini app's test files, for the CI run, the build copy, the Worker's refusal, and the loosened-check guard.

## Impact

- `scripts/lib-wrangler-config.mjs`: a `stagingDatabase` check and CLI command; `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`, `scripts/reset-staging-d1.mjs` call it.
- New `mini-apps/is-test-file.mjs`, used by `mini-apps/router.mjs`, `scripts/mini-dashboard.mjs`, `.github/scripts/loosened-checks.mjs`, and `.github/workflows/test.yml`; listed in `payload-files.json`.
- `.agents/skills/verify/SKILL.md` step 6; `.agents/skills/wong-setup/scripts/provision.mjs` `durableEnv`.
- Tests: `scripts/tests/wrangler-config.test.mjs`, `mini-apps.test.mjs`, `loosened-checks.test.mjs`, `provision.test.mjs`.
- A payload change: a patch `## Next` CHANGELOG entry.

## Decision log

- **2026-09-29** — Asked which audit findings to take on → chose all four groups: real bugs, docs that disagree, tidying the code, reshaping the wiki.
- **2026-09-29** — Asked how to split them → chose the bugs here and a new workspace for each other group; opened "Docs that disagree", "Tidy the code", and "Reshape the wiki".
- **2026-09-29** — Asked how to handle the overlap with "Team memory segmentation" → it had shipped, so this workspace moved to the latest main (v27.0.0) first.
- **2026-09-29** — Assumed: staging counts as production's database when either its `database_name` or its `database_id` matches, because a copied entry renamed by hand keeps production's id, and that is the case today's name check misses.
- **2026-09-29** — Assumed: the check also runs in `cf-deploy.sh`, because a staging Worker bound to production's database writes real data even when the build migrated nothing.
- **2026-09-29** — Assumed: the one test-file rule is the union of Node's default test patterns (what `node --test` runs, `test/` folders included) and the `.spec.` and `test_` names the loosened-check guard already reads, so no file any runner treats as a test is published or escapes the guard.
- **2026-09-29** — Assumed: the rule lives in a new `mini-apps/is-test-file.mjs`, beside the router that enforces it; every install takes the scaffold, so the core `test.yml` and `loosened-checks.mjs` can import it. A reviewer can move it cheaply.
- **2026-09-29** — Assumed: `/verify` runs `node "$ROOT/scripts/reset-staging-d1.mjs"` rather than `npm --prefix app run db:reset:staging`, because the script finds its config itself and works wherever the app folder lives.
- **2026-09-29** — Assumed: setup uses the shared `primaryRoot()` and stops when it fails, because the secrets spec already requires that and every other script works this way; no spec change is needed.
- **2026-09-29** — Check: `.github/scripts/loosened-checks.mjs` now reads test files by the shared rule in `mini-apps/is-test-file.mjs`, because that rule is wider than its old one (it adds `foo_test.mjs`, `test-foo.mjs`, and `test/` folders), so more skipped tests get caught, not fewer.
- **2026-09-29** — Check: `.github/workflows/test.yml` lists a mini app's tests with `mini-apps/is-test-file.mjs` and runs exactly those, because its old `find` and Node's default patterns missed `.spec.` and `test_` files the rule names; no test that ran before is dropped.
- **2026-09-29** — Check: `.github/workflows/payload.yml` lints the new `mini-apps/is-test-file.mjs` beside `router.mjs` and `routes.mjs`, because the Worker bundles it; this adds a check and removes none.
- **2026-09-29** — Assumed: the test-file CLI prints the files it finds and CI passes them to `node --test`, because Node's default patterns skip `.spec.` and `test_` names, and the spec says CI runs every file the rule names.
- **2026-09-29** — Assumed: the rule's file is named `is-test-file.mjs`, not `test-files.mjs`, because a `test-` name matches the rule itself, so the loosened-check guard and `node --test` would treat it as a test.
- **2026-09-29** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
