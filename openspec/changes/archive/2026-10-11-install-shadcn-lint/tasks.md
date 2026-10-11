# Tasks

## 1. App tooling

- [x] 1.1 Install `@shadcn/lint` in `app/` as a development dependency and register it in `app/.oxlintrc.json`; review the lockfile and confirm existing scripts and rules remain intact.

## 2. Documentation and release

- [x] 2.1 Document `npm run lint`, the plugin configuration, and no newly enabled design rules in `wiki/stack/testing.md`; review the documented paths and commands.
- [x] 2.2 Add a `Next (minor)` entry with an Updating note to `CHANGELOG.md`; review the entry and leave `VERSION` alone.

## 3. Final verification

- [x] 3.1 Run `npm run lint` in `app/` to verify plugin loading, then `node .github/scripts/checks.mjs --worktree` for the required local checks; record actual results and repair integration failures.

`npm run lint` passes. The local run passed the app suite (361 tests, 100% coverage), six runtime cases, every bad-sample gate, the install-shaped app, wiki, skill and payload checks. The check-settings guard initially required a reason for plugin registration; after recording it in the proposal, `node .github/scripts/checks.mjs --worktree --only loosened` passed with `LOCAL_CHECKS=pass`. Shellcheck is unavailable here and remains a CI check.
