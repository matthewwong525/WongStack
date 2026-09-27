## 1. Dependencies

- [x] 1.1 Update `app/` dependencies to Latest (except `@types/node`, and `vitest` with `@vitest/coverage-v8`, held at 4 for stryker-js #6210) and refresh `app/package-lock.json`.
- [x] 1.2 Update `scripts/tests/` jsdom and oxlint to their exact latest versions and refresh its lockfile.
- [x] 1.3 Move `actions/checkout` to v7.0.1 and `actions/setup-node` to v7.0.0 in every workflow, pinned by SHA.
- [x] 1.4 Update agent-browser on this machine and confirm the commands `/verify` uses remain.

## 2. Release

- [x] 2.1 Bump `VERSION` to 25.9.0 and add the `CHANGELOG.md` entry.
- [x] 2.2 Run the payload link, OpenSpec config, and retired-name checks, and the loosened-check scan.
- [ ] 2.3 Pass CI through `/save`.
- [ ] 2.4 After merge, confirm Dependabot closed the eight PRs this change includes (#110 and #112 stay open), and close any it left open.
