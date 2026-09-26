# Update OpenSpec to 1.13.2

**Status:** ready-to-ship
**Branch:** update-openspec
**Open questions:** none

## Why

The repo pinned OpenSpec 1.8.0, five releases behind. Newer versions catch mistakes 1.8.0 lets through. One is a record whose purpose line was never written: two of ours still say "TBD", and 1.8.0's strictest check passed them.

## What Changes

- **OpenSpec 1.13.2 everywhere.** Setup, the checks, and the contributing guide install 1.13.2 instead of 1.8.0. Every command the assistant uses behaves the same; the new version only adds one field.
- **The two unfinished records get a purpose.** The publishing record and the secrets record now say what they are for.
- **The checks now test every record.** Each check run validates all records strictly, so a record left unfinished fails the check instead of slipping through.
  ```text
  change ──▶ checks ──▶ every record
                         strict?
                     no ─┴─ yes
                     fail   pass
  ```

**Non-goals:** No other tool or app dependency is updated. The pending cleanup plan is a separate change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The Purpose lines of `delivery-gate` and `secrets-convention` are edited in `openspec/specs/` directly, because a delta cannot change a Purpose.

## Impact

- `.github/workflows/payload.yml`: installs 1.13.2 and runs `openspec validate --specs --strict --no-interactive` in the release checks.
- `.agents/skills/save/references/preconditions.md`, `.agents/skills/plan/references/openspec-cli.md`, `.agents/skills/save/references/spec-sync.md`, `.github/CONTRIBUTING.md`, `README.md`: the version.
- `openspec/specs/delivery-gate/spec.md`, `openspec/specs/secrets-convention/spec.md`: Purpose.
- `VERSION` 24.0.1 → 24.0.2 and a `CHANGELOG.md` entry.

## Decision log

- **2026-09-26** — Asked to update OpenSpec, after finding that the leftover "TBD" check was fixed upstream in 1.11.0 (Fission-AI/OpenSpec#1671) → updated 1.8.0 → 1.13.2 on its own branch, apart from `consolidate-and-simplify`.
- **2026-09-26** — Checked the CLI contract on a throwaway repo under 1.8.0 and 1.13.2: `init --tools none`, `context`, `list`, `new change`, `status`, `instructions` (proposal, specs, design, tasks, apply, archive), `validate --strict`, and `archive --yes` with `--skip-specs` and `--no-validate`. The JSON keys match; 1.13.2 adds `taskTrackingConfigured` to `instructions apply`. No sync command exists in 1.13.2.
- **2026-09-26** — Under 1.13.2, `openspec validate --specs --strict` failed `delivery-gate` and `secrets-convention` on their placeholder Purpose. Both got a real Purpose, and all 50 specs pass. `node --test` on the six OpenSpec-facing test files: 37 pass.
- **2026-09-26** — Assumed: CI runs `openspec validate --specs --strict` from now on, because the user asked how to keep records from drifting, and this check is free and deterministic. It covers live specs only, so an in-progress change on a branch is not blocked by it.
- **2026-09-26** — Assumed: a patch release, 24.0.2, because no command's behavior changes.
- **2026-09-26** — Saved all 9 tasks for CI as ready to ship. `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `openspec validate --specs --strict` pass locally under 1.13.2.
