## 1. Workflows and scripts

- [x] 1.1 In `.github/workflows/test.yml` and `.github/workflows/deploy.yml`, change the `Install` step to `run: npm ci --no-audit --no-fund`.
- [x] 1.2 In `.github/workflows/payload.yml`, change the `scripts/tests` install to `npm ci --no-audit --no-fund`.
- [x] 1.3 In `scripts/cf-preview.sh`, change the first-run install to `npm ci --no-audit --no-fund`.

## 2. Tests

- [x] 2.1 In `scripts/tests/mini-apps.test.mjs`, expect `npm ci --no-audit --no-fund` as the preview's first call, and check the second run makes no `npm ci` call.
- [x] 2.2 In `scripts/tests/downstream-contract.test.mjs`, add a test that scans `.github/workflows/*.yml` and the files under `scripts/` (not `scripts/tests/`) and fails on any `npm ci` command without both `--no-audit` and `--no-fund`; comments do not count. Confirm it fails with one flag removed, then restore it.

## 3. Release

- [x] 3.1 Bump `VERSION` to 25.4.1 and add a `CHANGELOG.md` entry: installs skip npm's retiring audit endpoint, which stalled one run for 5 minutes; `/wong-sync` brings the new lines.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, `node --test scripts/tests/mini-apps.test.mjs scripts/tests/downstream-contract.test.mjs`, and `openspec validate skip-npm-audit --strict --no-interactive`.
- [x] 3.3 Gate through `/ship`'s one `/save` checkpoint, and confirm in its CI log that the `Install` step shows no audit line.
