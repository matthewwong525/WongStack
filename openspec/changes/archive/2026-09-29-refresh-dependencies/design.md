# Design

## Context

See `proposal.md` for motivation and scope. The updater completed both package stages; no OpenSpec pins or global npm tools changed. The app manifest and lockfile ship to installed repositories, while `scripts/tests/` is meta-only.

## Goals / Non-Goals

**Goals:** Refresh compatible dependency sets and retain the scaffold's existing absolute quality gates.

**Non-Goals:** Add a new test suite, change coverage thresholds, or change runtime APIs.

## Decisions

- Use the existing update script's latest-version plan for both manifests. Vitest and `@vitest/coverage-v8` move from 4.1.11 to 5.0.2 in one install, satisfying their exact peer constraints; separate upgrades reproduce the open bot updates' mismatch.
- App updates: Cloudflare Vite plugin 1.60.2 → 1.62.1, Wrangler 4.141.0 → 4.144.0, jscpd 5.3.2 → 5.3.3, and oxlint 1.85.0 → 1.86.0. The script-test oxlint pin also moves to 1.86.0. The refreshed app lock resolves Undici 7.29.1.
- Review [Vitest's v5 migration guide](https://github.com/vitest-dev/vitest/blob/v5.0.2/docs/guide/migration/index.md) against existing tests and config. The configured Node 22 major and Vite 8 meet the new prerequisites. There are no projects, hoisted mocks, benchmarks, custom reporters, worker-id consumers, removed entrypoints, or browser-runner integrations. Tests install their fetch mocks per case and reset state; the new `clearMocks` default needs no compatibility override. Coverage patterns are already relative and explicit. Preserve the 100% floor and let CI confirm the file set and results.
- Leave OpenSpec 1.13.2 pinned: no version migration or contract adaptation is needed. The updater reports the contract test skipped; the ordinary payload checks still test the shared CLI contract.
- Save a pending patch release without editing `VERSION`; `/ship` assigns the release number at publication. No capability promise changes, so this change opts out of delta specs.

## Risks / Trade-offs

- Vitest 5 changes mock defaults and coverage matching → review applicable migration notes, keep all thresholds, and inspect the CI test/coverage results.
- A transitive dependency refresh may change more lock entries than the direct updates → review the lock diff and validate reproducible installs and deploy in CI.
- The original host tools trailed upstream → after the user's consent, install Node's official distribution alongside OS packages and upgrade GitHub CLI through its signed apt repository. CI installs Node from `.nvmrc`.

## Migration Plan

Save the manifests, locks, release entry, and handoff through `/save`; wait for app Test, Deploy, and Payload checks. Fix any migration failure in the same change. The user has now authorized `/ship` and the separate host installation. A rollback restores both dependency manifests and lockfiles together. The default Node runtime is an official distribution under `/opt`, linked from `/usr/local/bin`; the original distro packages remain installed. GitHub CLI uses its signed apt repository.
