# Design

## Context

- **Releases.** Only `v19.0.0` and `v20.2.0` exist, both made by hand. `CHANGELOG.md` keeps entries from 19.0.0 on (`## X.Y.Z — Title`, then a `## Before 19.0.0` pointer). PRs squash-merge, so each version is one first-parent commit on `main`. Commit titles are not reliable: `d9b348e` says `(v24.0.3)` but sets `VERSION` to 25.2.1, and `76723dd` says `(v23.1.0)` but sets 23.2.0.
- **Primary-worktree lookups.** Six copies, four methods:
  - `verify-staging.sh:71-84`: complete. It compares absolute git and common dirs, confirms with `--show-toplevel`, and fails closed.
  - `worktree-secrets.mjs:43-53`: complete for linked worktrees only.
  - `store.mjs:39-50`: `dirname(commonDir)` with no check.
  - `cf-secrets.mjs:231-243`: `dirname(commonDir)` with no check; falls back quietly.
  - `routine.mjs:82-86,196-200`: the first `worktree` line of `git worktree list --porcelain`. For a bare repo it returns the bare directory.
  - Prose copies: `wiki/development/secrets.md:13-14` (the unchecked form), `wong-setup/references/cloudflare.md:50-65`, `save/references/named-secrets.md:7`.
- **Sharing code between skills.** Skills are copied whole and may be renamed, so no skill imports another statically. `verify-staging.sh:105` already loads memory's `store.mjs` at run time from `$active_root/.claude/skills/memory/...`.
- **Temp folders.** Fixed on `main` in 25.3.0: the memory harness's `tempDir(t, prefix)` removes each folder when its test ends. The 4,299 folders on this host predate that fix. Out of this change.
- **CI checks since 25.3.0.** `payload.yml` runs oxlint on `scripts` and `.agents/skills/*/scripts`, shellcheck at warning severity, and c8 with a floor of 85% lines and 81% branches over `scripts/*.mjs` and `.agents/skills/*/scripts/**/*.mjs`. New scripts must pass all three.
- **Flaky test.** `wait-for-checks.test.mjs` "UNKNOWN after the grace period" sets `WAIT_FOR_CHECKS_GRACE=1` with a 0.2 s interval, then asserts more than one `pr checks` poll. The script's deadline is `$(date +%s) + GRACE` in whole seconds. The real window is therefore 0–1 s, and it shrinks further when each fake `gh` spawn is slow under load. One poll then passes the deadline.

## Goals / Non-Goals

**Goals:** close the four remaining loose ends with no change to everyday behavior; make the release history complete and self-healing.

**Non-Goals:** Dependabot PRs #106–#116; shortening skills; slimming specs; tagging versions before 19.0.0; changing `wait-for-checks.sh` itself.

## Decisions

### Releases: one idempotent script, run on every `main` push

`scripts/tag-releases.mjs` (meta-only, not in `payload-files.json`):

1. Parse `CHANGELOG.md` into `{version, title, body}` from each `## X.Y.Z — Title` heading to the next `## ` heading. Stop at `## Before 19.0.0`.
2. Map each version to its commit. Walk `git log --first-parent --reverse --format=%H <default> -- VERSION`, read `git show <sha>:VERSION` for each, and keep the first commit per value.
3. List existing Releases with `gh release list --json tagName --limit 1000`, and existing tags with `git tag`.
4. For each changelog version with no Release: write the body to a temp file. Run `gh release create v<version> --target <sha> --title "<version> — <title>" --notes-file <file> --verify-tag=false`, or use `--verify-tag` when the tag already exists. Mark only the highest version `--latest`; mark all others `--latest=false`.
5. Collect versions with no `VERSION` commit, and exit 1 naming them after the loop.

`--dry-run` reads the Release list and prints the plan, and creates nothing. The script takes `gh` and `git` from `PATH`, so tests use fakes (as `wait-for-checks.test.mjs` does).

`.github/workflows/release.yml`: `on: push: branches: [main]`; `permissions: contents: write`; `concurrency: release` (no cancel); `actions/checkout` pinned like the others, with `fetch-depth: 0`; `setup-node` from `.nvmrc`; then `node scripts/tag-releases.mjs`, with `GH_TOKEN: ${{ github.token }}`. It needs no npm install. A release made with `GITHUB_TOKEN` starts no other workflow, which is what we want.

*Alternatives:* a `/ship` step (the user chose automatic; manual merges would skip it); a third-party release action (another pinned dependency, and it can't backfill by `VERSION` history).

### Primary worktree: one module in the memory skill

`.agents/skills/memory/scripts/lib/primary-root.mjs` exports `primaryRoot(cwd)`, which returns `{ root, primary, linked, commonDir }` or throws `PrimaryRootError`. It also runs as a CLI: `node primary-root.mjs [dir]` prints the primary path, or exits 1 with a message. The rules follow `verify-staging.sh` exactly.

Callers:

| Caller | How it loads | On failure |
|---|---|---|
| `store.mjs` | same-dir import | `primaryRoot` is `null`: `.env` reads use this checkout only, and `memory members add --env` stops before it makes a key |
| `worktree-secrets.mjs` | relative import `../../memory/scripts/lib/primary-root.mjs` | throws (unchanged) |
| `routine.mjs` | relative import | `RoutineError(EXIT.input, …)` (unchanged) |
| `cf-secrets.mjs` | static import `../.claude/skills/memory/scripts/lib/primary-root.mjs` | falls back to `appDir` (unchanged) |
| `verify-staging.sh` | `node "$active_root/.claude/skills/memory/scripts/lib/primary-root.mjs"` | `return 1` (unchanged) |

`routine.mjs` loses `primaryFromPorcelain`, and its unit test moves to the shared module's test. Prose: `secrets.md` shows the CLI call. `named-secrets.md` and `wong-setup/references/cloudflare.md` link `secrets.md#the-two-files` instead of restating the algorithm.

*Alternatives:*
- `scripts/lib-git.mjs`: that folder is the pack, and core skills should not depend on it.
- Keeping the copies and adding a CI equality check: that keeps the drift surface.
- A shell copy for `verify-staging.sh`: two languages means two copies.

The relative import assumes default skill folder names. `verify-staging.sh` already assumes this for memory, and a renamed skill fails loudly on load rather than silently.

### Flaky test

That one test sets `WAIT_FOR_CHECKS_GRACE: '3'`, giving a guaranteed window of at least 2 s, or ten polls at 0.2 s. The assertion stays. The script is unchanged, because its whole-second deadline is fine at its real 60 s default.

### API key page

`wiki/stack/api-keys.md`, titled "API keys". Its sections:

- what a key is
- get it
- paste it into the chat and say what it's for
- what the assistant does with it: saves it in the same session to the private `.env`, or to `app/.dev.vars` plus the hosting service when the live site needs it
- if a key leaks
- keys vs website logins, linking [saved browser logins](../../../wiki/development/home.md#saved-browser-logins)

It links `development/secrets.md` and `cloudflare-credentials.md` for the how, per the one-topic-one-page rule. `wiki/stack/README.md` lists it. `getting-started.md` links it where the key step ends. `wiki/stack/` already ships as a whole directory, so the manifest is unchanged.

## Risks / Trade-offs

- **First run makes 26 Releases at once (25 past versions and 25.7.0).** That is expected. Watchers get one notification each, and only the newest is marked Latest.
- **`--target` on an old commit.** `gh` creates the tag there. If a tag exists on a different commit, the script leaves it alone and creates the Release on the existing tag, rather than moving a published tag.
- **A write-scoped token on `main` pushes.** It is limited to `contents: write`, in a job with no third-party action beyond the pinned checkout and setup-node.
- **Cross-skill import.** A target that renamed the memory skill breaks these callers. That is a loud failure, and the same assumption `verify-staging.sh` already makes.
