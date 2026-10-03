# Use cf for Cloudflare management

**Status:** ready-to-ship
**Branch:** gorgeous-crocodile
**Open questions:** none

## Why

Cloudflare's new management tool lets the assistant find account commands and read their results consistently. WongStack can use it for hosting questions and one-off account work while keeping the publishing flow people already use.

## What Changes

- **Use cf for Cloudflare account work.** Give the assistant one guide for finding the right command, checking its inputs, and reporting the result in plain words. The guide distinguishes account management from the existing automated setup and publishing steps.
  ```text
  Cloudflare task
        │
        ├── account work ──▶ cf
        │
        └── publish app ──▶ existing flow
  ```
- **Add it when needed.** Treat cf as an optional tool on the assistant's computer. Reuse the account credentials already supplied to WongStack, and explain any missing tool or permission at the point of need.
- **Make the guidance easy to find.** Link it from the hosting overview and required-tools page, and deliver it to existing installations through the normal update.

Non-goals: changing the app's configuration, rewriting setup or publishing scripts, moving checks to a different service, or adopting the new branch-preview system.

## Capabilities

### New Capabilities

None. This is documentation and agent guidance; `skip_specs: true` applies.

### Modified Capabilities

None. Existing setup, credential, deployment, and core-tool promises remain in force.

## Impact

- Add `wiki/stack/cloudflare-cli.md`; update `wiki/stack/README.md` and `wiki/development/required-tools.md`.
- `wiki/stack/` already ships as a directory, so no payload-manifest edit is needed.
- Optional host tool: Cloudflare's npm package `cf`; no project dependency, lockfile, workflow, or server-installer change.
- Add a `## Next (minor)` release entry in `CHANGELOG.md` during implementation; leave `VERSION` unchanged for `/ship`.
- No production resource changes are part of implementing or verifying this guidance.

## Status

Guidance implemented. Publishing was approved; the archived release checkpoint is awaiting its final checks and merge.

## Decision log

- **2026-10-03** — Asked whether to turn the first step, using cf for Cloudflare management while preserving the current publishing flow, into a reviewable plan → chose “Plan it (Recommended) — adopt cf in a small first change.”
- **2026-10-03** — Assumed: begin with account-management guidance, because Cloudflare supports resource commands alongside Wrangler projects and a full migration would change configuration and deployment behavior.
- **2026-10-03** — Assumed: install cf only when account work needs it, because ordinary WongStack verbs and automated provisioning already work without it.
- **2026-10-03** — Assumed: retain one dedicated management page, because the hosting overview and required-tools page should link to the procedure rather than duplicate it.
- **2026-10-03** — Assumed: preserve existing credential handling and action authorization, because adopting a tool adds neither account permissions nor approval for unrelated work.
- **2026-10-03** — Assumed: scope verification to documentation checks and command discovery or dry runs, because this change adds no executable behavior and should need no live account mutation.
- **2026-10-03** — Asked whether to build the cf adoption plan → chose “Build it now (Recommended) — prepare the change for review before publishing.”
- **2026-10-03** — Asked whether cf should remain after comparing it with direct API calls → chose to keep cf and check merge readiness. The checkpoint preserves optional account-management guidance and existing API-based automation; publishing remains a separate decision.
- **2026-10-03** — Asked whether to merge and publish the cf management guidance → chose “Publish it (Recommended) — finish the release and merge after its final checks.” Archived the completed change for the release checkpoint; its publishing checks run on that checkpoint's exact commit.

## Verification

- **2026-10-03 — Tool availability:** `command -v cf` and `command -v cloudflare` found neither executable; Node is v22.23.3. No tool was installed for this documentation task. Version, discovery, schema inspection, and dry-run commands were therefore not executed. No account call or mutation was made, and no credential was loaded or printed.
- **Command examples:** checked `cf --version`, the npm package and executable alias, `cf cli search "create D1 database"`, `cf schema d1 create`, `cf d1 create --help`, and `cf d1 create --name example-database --dry-run` against Cloudflare's current [installation](https://developers.cloudflare.com/cf/get-started/) and [coding-agent](https://developers.cloudflare.com/cf/agents/) docs. The local-prefix install adapts npm's global prefix; the Node pipeline uses the documented search JSON shape and built-in JSON parsing. These are documentation checks, not evidence from an installed cf version.
- **Delivered scope:** the new management page and additive hub/optional-tool links pass the wiki and payload link checks; the existing `wiki/stack` payload directory includes the page. The parent verified an empty diff for `VERSION`, setup scripts, pipeline scripts, workflows, and app dependency files. One `Next (minor)` entry carries the no-migration updating note. No app preview is needed for this documentation change; the existing publishing gate still applies.
- **Plan checks:** `node scripts/check-openspec-config.mjs` passed; `openspec validate adopt-cf-management --strict --no-interactive` passed with the documented `skip_specs` condition; the review builder with `--require-current` reported the page current and unchanged. The delivered guidance follows the recorded optional-install, existing-credentials, dedicated-page, and no-migration decisions.
