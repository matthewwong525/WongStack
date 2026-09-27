# Skip npm's security check when installing

**Status:** ready-to-ship
**Branch:** fix-slow-install
**Open questions:** none

## Why

Every check run installs the app's building blocks first. That normally takes 7 to 9 seconds. On one run it took 5 minutes, because the installer also sends a security check to npm's servers and waited for an answer. npm is shutting that service down, so the wait can happen again in any repo. Nothing reads that check's result, so skipping it loses nothing.

## What Changes

- **Installs skip the security check.** Each place WongStack installs the app's building blocks — the test check, the deploy, and the preview you run from this machine — stops calling npm's retiring service. It also skips npm's "looking for funding" notice. A slow day at npm can no longer add minutes to a check.
  ```text
  before
  install ──▶ packages (8 s)
          └─▶ npm security check
              (once waited 5 min)

  after
  install ──▶ packages (8 s)
  ```

**Non-goals:** No replacement security scan. Dependabot already proposes package updates. Installing by hand keeps npm's defaults.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ci-tests`: every `npm ci` WongStack runs passes `--no-audit --no-fund`.

## Impact

- `.github/workflows/test.yml` (core payload) and `.github/workflows/deploy.yml` (pack payload): the `Install` step runs `npm ci --no-audit --no-fund`.
- `scripts/cf-preview.sh` (pack payload): the first-run install uses the same flags; `scripts/tests/mini-apps.test.mjs` expects the new command.
- `.github/workflows/payload.yml` (meta-only): its `scripts/tests` install uses the same flags.
- `VERSION` 25.4.0 → 25.4.1 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-27** — Asked to fix the slow install found after 25.3.0 shipped → chose `--no-audit` on the install; CI run 36283461754's `npm ci` took 5m and printed npm's "This endpoint is being retired" notice, while runs 36293312277 and 36293250621 took 9 s and 7 s.
- **2026-09-27** — Assumed: every `npm ci` WongStack runs gets the flags, not only `test.yml`'s, because `deploy.yml`, `payload.yml`, and `cf-preview.sh` call the same endpoint and can stall the same way.
- **2026-09-27** — Assumed: `--no-fund` rides along, because it is another notice nobody reads and costs nothing to drop.
- **2026-09-27** — Assumed: the flags go on each command rather than in an `.npmrc`, because a new file in `app/` would also change installs people run by hand, and a flag on the line shows what the step does.
- **2026-09-27** — Assumed: no replacement audit step, because nothing reads the audit output today and Dependabot already proposes package updates.
- **2026-09-27** — Assumed: a patch release (25.4.1), because no one's workflow or output changes except the missing audit summary.
- **2026-09-27** — Assumed: no wiki edit at ship, because the change and its branch have no live facts in memory and the flag rule is enforced by a payload test (no repeatable fact).
- **2026-09-27** — Archive checkpoint on `fix-slow-install`: all 8 tasks done, `ci-tests` synced into `openspec/specs/`; local mini-apps and downstream-contract tests pass, and the new guard failed with `--no-fund` removed from `deploy.yml`.
