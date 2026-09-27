# Tidy loose ends for people installing WongStack

**Status:** ready-to-ship
**Branch:** explore/repo-improvements
**Open questions:** none

## Why

People who install WongStack can't see what changed between versions: the last labelled release on GitHub is 20.2.0, but the current version is 25.4.1. A few quieter problems also add up. The key guides assume a developer. Six scripts each work out where the main copy of the repo lives, in four different ways. And one test fails now and then for no real reason.

## What Changes

- **Every version gets a labelled release, automatically.** When a new version lands, GitHub labels it and posts its notes from the changelog. Nobody has to remember. The first run fills in the 24 versions that were never labelled, so the list is complete from 19.0.0 on.
  ```text
  new version lands
        │
        ▼
  already labelled? ── yes ──▶ skip
        │ no
        ▼
  label + release notes
  from the changelog
  ```
- **A plain guide to API keys.** A new page for people who aren't developers. It says what a key is, where to get one, and to paste it straight into the chat. It also says what the assistant does with a key, and what to do if one leaks. It links to the existing developer page for the details.
  ```text
  Adding an API key
  ─────────────────
  1. Get the key from the service
  2. Paste it into the chat
  3. The assistant saves it privately
     and tells you where
  If a key leaks: make a new one,
  paste it, delete the old one.
  ```
- **One way to find the main copy of the repo.** The six scripts that work this out share one careful version. It checks its answer and stops cleanly when something looks wrong. Everyday use doesn't change.
- **The unreliable test becomes reliable.** One test counted on a one-second window; a busy machine could miss it. It now gets a wider window.

**Non-goals:** the 8 waiting update requests (a separate change through `/update-dependencies`), shorter instructions, and slimmer spec files. Each is its own change after this one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `open-source-release`: "Each release is tagged" now names a workflow on `main` that creates missing tags and Releases, and fills in past versions.
- `secrets-convention`: adds one shared resolver for the primary worktree that checks its result and fails closed.
- `cloudflare-access-guide`: adds a plain-language API-key page to `wiki/stack/`.

## Impact

- New, meta-only: `.github/workflows/release.yml`, `scripts/tag-releases.mjs`, `scripts/tests/tag-releases.test.mjs`.
- New, payload: `.agents/skills/memory/scripts/lib/primary-root.mjs`; `wiki/stack/api-keys.md`.
- Callers moved to the shared resolver: `.agents/skills/memory/scripts/lib/store.mjs`, `.agents/skills/verify/scripts/verify-staging.sh`, `scripts/cf-secrets.mjs`, `.agents/skills/ship/scripts/worktree-secrets.mjs`, `.agents/skills/routine/scripts/routine.mjs`. Prose: `wiki/development/secrets.md`, `.agents/skills/wong-setup/references/cloudflare.md`, `.agents/skills/save/references/named-secrets.md`.
- Tests: `scripts/tests/wait-for-checks.test.mjs`, and a new `scripts/tests/primary-root.test.mjs`.
- Hubs: `wiki/stack/README.md`, `wiki/stack/getting-started.md`.
- `VERSION` 25.5.0 → 25.6.0 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked what "better" means → chose all four: tidy loose ends, leaner instructions, settle the spec question, better for new users.
- **2026-09-27** — Asked who the repo is mainly for over the next month → chose other people installing it.
- **2026-09-27** — Asked how big a change → chose a batch of small fixes.
- **2026-09-27** — Asked how leaner instructions and the spec question fit with the batch → chose batch first, then those as later changes.
- **2026-09-27** — Asked which way to take the spec files → chose keep them, but thinner (a later change).
- **2026-09-27** — Asked which new-user rough edges matter most → chose an API key setup guide and clear release notes.
- **2026-09-27** — Asked how release labels get made → chose automatically on each release.
- **2026-09-27** — Asked what to do about past versions with no label → chose to label them all.
- **2026-09-27** — Asked what happens to the 8 waiting update requests → chose a separate change after this batch; they stay open until then.
- **2026-09-27** — Assumed: the backfill covers 19.0.1 onward, because `CHANGELOG.md` keeps entries from 19.0.0 only, and older versions have no notes to post.
- **2026-09-27** — Assumed: one idempotent script both backfills and labels new versions, because a missing-label check on every `main` push does both, and a failed run heals on the next push.
- **2026-09-27** — Assumed: a version's commit is the first commit on `main` whose `VERSION` file holds it, not the commit title, because titles drift (`d9b348e` says v24.0.3 but ships 25.2.1).
- **2026-09-27** — Assumed: the release workflow is meta-only, because installed repos have their own versions and no WongStack changelog.
- **2026-09-27** — Assumed: the API key guide is a new page in `wiki/stack/`, linked from the developer secrets page, not a rewrite of it, because installers need the plain path and developers still need the details.
- **2026-09-27** — Assumed: the shared resolver lives in the memory skill and follows `verify-staging.sh`'s checks, because skills are copied whole and cannot import from each other statically, `verify-staging.sh` already loads memory's library at run time, and its version is the only complete one.
- **2026-09-27** — Assumed: each caller keeps its own reaction to a failed lookup (`cf-secrets.mjs` falls back to the current worktree; the others stop), so only the lookup is shared and no caller's behavior changes.
- **2026-09-27** — Assumed: a minor release, because the change adds a wiki page and a shared helper to the payload.
- **2026-09-27** — Assumed: `/ship` caught the branch up to `main` 25.4.1 (`165b257`) before building, and the plan follows it. 25.3.0 already made the memory tests remove their temp folders (a `tempDir(t, …)` helper in the harness), so that fix leaves this change. The release is 25.5.0, and the backfill covers 23 versions, because 25.3.0 through 25.4.1 also have no Release.
- **2026-09-27** — Assumed: new scripts meet the checks 25.3.0 added (oxlint, shellcheck, and the c8 coverage floor of 85% lines and 81% branches), because CI now fails without them.
- **2026-09-27** — `node scripts/tag-releases.mjs --dry-run` here listed 23 versions to label, 19.0.1 (`27ccaa4`) through 25.4.1 (`165b257`), all but 20.2.0, each on the commit that first set `VERSION` to it. 25.2.1 goes on `d9b348e`, whose title says v24.0.3.
- **2026-09-27** — Assumed: `store.mjs` keeps `primaryRoot` as `null` when the lookup fails, rather than throwing, because every memory call and the session-start hook build that context. Reads fall back to the current checkout. `memory members add --env` is the one write, and it stops before making a key.
- **2026-09-27** — Assumed: `cf-secrets.mjs` imports the lookup statically, not dynamically, because its callers are synchronous and every install has the memory skill. The pack test harness copies the lookup into its throwaway repos.
- **2026-09-27** — Assumed: the lookup's CLI follows the `--help` and exit-2 convention, and `cli-conventions.test.mjs` lists it and `tag-releases.mjs`, because that test holds every script to it.
- **2026-09-27** — Assumed: CI and the post-merge release check are `/ship`'s checkpoint and report, not tasks, because a task must be done before the archive. After the merge, `gh release list` should show 19.0.0 through 25.5.0, with 25.5.0 marked Latest.
- **2026-09-27** — Local checks: 287 script tests pass and 9 skip (296 total, 0 fail); c8 reports 85.95% lines and 81.39% branches, above the 85/81 floor. oxlint, the payload link check, the OpenSpec config check, the retired-names check, strict spec validation (48 specs), and the context check all pass. shellcheck is not installed on this host, so CI runs it.
- **2026-09-27** — Distilled facts before the archive: no repeatable fact; the memory store had no facts for this change or its branch.
- **2026-09-27** — Archived by `/ship` and saved as one checkpoint on `explore/repo-improvements`; the specs synced `open-source-release` (1 modified), `secrets-convention` (1 added), and `cloudflare-access-guide` (1 added).
- **2026-09-27** — At the checkpoint, `main` had shipped its own 25.5.0 (`970ccee`, memory access from GitHub). Merged it in: `store.mjs` keeps both new imports. This change becomes 25.6.0, and the backfill covers 24 versions. Its new `join.mjs` saves a memory key through `writeEnvKey`, so the stop moved into `envKeyFile`. `join` and `members add --env` both call it before a key is made.
