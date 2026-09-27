# Tasks

## 1. Release labels (meta-only script and workflow)

- [x] 1.1 Write `scripts/tag-releases.mjs`: parse `CHANGELOG.md` versions (stop at `## Before 19.0.0`), map each to the first first-parent `main` commit whose `VERSION` holds it, create a missing tag and Release with `gh release create` (title `<version> — <title>`, body from the entry, `--latest` only on the highest), skip existing Releases, keep an existing tag where it is, exit 1 naming any version with no `VERSION` commit, and support `--dry-run`
- [x] 1.2 Add `scripts/tests/tag-releases.test.mjs` with a temp git repo and a fake `gh`: backfill of several versions, skip of existing Releases, a commit title naming the wrong version, an existing tag reused, a changelog version with no commit, and `--dry-run` creating nothing
- [x] 1.3 Add `.github/workflows/release.yml`: push to `main`, `contents: write`, a non-cancelling `release` concurrency group, checkout and setup-node pinned to the same SHAs as `payload.yml`, `fetch-depth: 0`, `GH_TOKEN` from `github.token`, run the script
- [x] 1.4 Run `node scripts/tag-releases.mjs --dry-run` here and record in the Decision log the versions and commits it would label (expect 19.0.1 through 25.4.1 minus 20.2.0: 23 versions)
- [x] 1.5 Confirm `release.yml` and `tag-releases.mjs` are absent from `.agents/skills/wong-sync/references/payload-files.json`

## 2. One primary-worktree lookup (payload scripts)

- [x] 2.1 Add `.agents/skills/memory/scripts/lib/primary-root.mjs`: `primaryRoot(cwd)` returns `{ root, primary, linked, commonDir }` or throws `PrimaryRootError`, following `verify-staging.sh`'s checks; a CLI mode prints the primary path or exits 1
- [x] 2.2 Add `scripts/tests/primary-root.test.mjs`: a normal checkout, a linked worktree, a linked worktree of a bare repo (fails), outside a repo (fails), and the CLI's output and exit code
- [x] 2.3 Move `.agents/skills/memory/scripts/lib/store.mjs` to the module; keep `stateDir` on `commonDir`
- [x] 2.4 Move `.agents/skills/ship/scripts/worktree-secrets.mjs` to the module; keep its error message
- [x] 2.5 Move `.agents/skills/routine/scripts/routine.mjs` to the module; drop `primaryFromPorcelain` and move its test cases in `scripts/tests/routine.test.mjs` to the shared module's test
- [x] 2.6 Move `scripts/cf-secrets.mjs` to the module through a dynamic import from the repo root; keep the fallback to the current worktree
- [x] 2.7 Move `.agents/skills/verify/scripts/verify-staging.sh`'s `resolve_primary_root` to the CLI; keep `return 1` on failure; add a linked-worktree case to `scripts/tests/verify-scripts.test.mjs`
- [x] 2.8 Run the existing `cf-secrets`, `worktree-secrets`, `routine`, `verify-scripts`, and memory tests and confirm they pass unchanged

## 3. Test hygiene

- [x] 3.1 `scripts/tests/wait-for-checks.test.mjs`: give "UNKNOWN after the grace period" `WAIT_FOR_CHECKS_GRACE: '3'`
- [x] 3.2 Run lint, shellcheck, and the c8-wrapped script tests the way `payload.yml` does, and confirm they pass

## 4. Docs (wiki and skill references)

- [x] 4.1 Write `wiki/stack/api-keys.md` per the `cloudflare-access-guide` delta, in [voice](../../../wiki/voice.md) and [wiki style](../../../wiki/wiki-style.md), for a non-technical reader
- [x] 4.2 Link it from `wiki/stack/README.md` and `wiki/stack/getting-started.md`, and from `wiki/development/secrets.md` for readers who want the plain version
- [x] 4.3 `wiki/development/secrets.md`: replace the unchecked `dirname` snippet with the shared CLI call; `.agents/skills/save/references/named-secrets.md` and `.agents/skills/wong-setup/references/cloudflare.md`: link the secrets page instead of restating the lookup

## 5. Release

- [x] 5.1 `VERSION` 25.5.0 → 25.6.0 and a `CHANGELOG.md` entry, with an **Updating** note: nothing to do by hand; a renamed memory skill now breaks the worktree lookup
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `openspec validate --specs --strict --no-interactive`, and `node scripts/measure-context.mjs --check`
