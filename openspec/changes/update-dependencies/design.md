## Context

See proposal.md. The survey ran `npm outdated` in `app/` and `scripts/tests/`, read each workflow's pinned actions, and checked the machine tools `/update-dependencies` lists.

## Decisions

- **Vitest 5 needs no config change.** Its breaking changes (mocks cleared before each test, unawaited async assertions fail, stricter coverage globs, reports under `.vitest/`) do not touch this suite: every mock is created inside its test, every `.resolves`/`.rejects` is awaited, the coverage globs are explicit paths, and no json, junit, or html reporter is configured. `@stryker-mutator/vitest-runner` 10.0.0 accepts `vitest >=2.0.0`.
- **checkout 5–7 and setup-node 5–7 need no workflow change.** Their breaking changes are the runner minimum (v2.327.1, met by GitHub-hosted runners), automatic caching only for npm or a `packageManager` field (every step already sets `cache: npm`, and no `package.json` has the field), credentials persisted to a separate file (no workflow pushes with them), fork checkout blocked for `pull_request_target`/`workflow_run` (no workflow uses either), and no dummy `NODE_AUTH_TOKEN` (no workflow publishes to npm). The SHAs match the `v7.0.1` and `v7.0.0` tags.
- **Machine tools.** The OpenSpec CLI (1.13.2), git, and node are current. agent-browser moved 0.33.2 → 0.38.1 on this machine; the commands `verify-runner.sh` calls (`open`, `set headers`, `batch --bail --json`, `get url`, `close`, `--session`) remain. `gh` 2.46.0 is the distro's latest; no change. None is a payload file.

## Risks / Trade-offs

- A major can break in a way the notes do not name → CI runs lint, the full suite at 100% coverage, knip, jscpd, and Stryker on every save, and the payload tests run on the new jsdom and oxlint.
