# The cloud can run WongStack's server installer

**Status:** ready-to-ship
**Branch:** chatty-cheetah
**Open questions:** none

## Why

The hosted cloud still installs WongStack with its own old copy of the server installer. It wants to run WongStack's installer instead, from the same WongStack version it already pins for server setup. Three gaps stop it: our installer can give up too early right after it widens the person's Cloudflare token, it doesn't say which Cloudflare step failed, and it lacks one piece the cloud's server program reads from it.

## What Changes

- **A new token gets a minute to start working.** Right after the installer widens a token, Cloudflare can refuse calls for a few seconds with a different answer than we expected. It now waits that out, as it already did for the other answer. `/wong-setup` shares the same Cloudflare steps, so setup gets the fix too.
  ```text
  widen the token
        │
        ▼
  try ──▶ refused? ──▶ wait 2, 4, 8,
   ▲       (either      15, 30 s
   │        answer)         │
   └────────────────────────┘
        │ works
        ▼
  carry on installing
  ```
- **A failed install names the Cloudflare step.** When Cloudflare refuses a call, the installer's output names that call and Cloudflare's error codes, just before the one-word reason. The cloud shows this line to the person. It never holds a token or a search term.
  ```text
  Cloudflare PUT /user/tokens/abc: HTTP 403 9109
  cloudflare
  ```
- **The cloud can drop its own copy.** The installer offers every piece the cloud's server program uses from it today, including the pattern that checks that failure line. The installer's contract page says all of this.

Non-goals: the cloud's own switch to this installer, which its own chat plans and ships. Retrying calls later in the install, beyond the check right after the widen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: the post-widen propagation retry covers `401` as well as `403`.
- `install-onboarding`: the server installer's host contract adds the refused-call line before the reason word, and the exports a host imports.

## Impact

- Changed: `.agents/skills/wong-setup/scripts/provision.mjs` (retry on `401` or `403`), `server/install-wongstack.mjs` (the refused-call line; exports `CLOUDFLARE_CALL`), `server/README.md` (the host contract), `.agents/skills/wong-setup/references/permission-groups.md` (the propagation note), `CHANGELOG.md`.
- Tests: `scripts/tests/provision.test.mjs`, `scripts/tests/server-install.test.mjs`, and the fake in `scripts/tests/fixtures/cloudflare.mjs`.
- Source-only: `server/` and `wong-setup` never reach an installed repo, so `/wong-sync` brings nothing new to targets.
- Downstream: wongstack-cloud drops `vm/install-wongstack.mjs` and pins the commit that ships this, in its own change (workspace regular-goat).

## Decision log

- **2026-09-27** — Asked where server install changes belong → chose WongStack: wongstack-cloud drops its `vm/install-wongstack.mjs` and runs `server/install-wongstack.mjs` from a WongStack clone at the commit it pins for `server/setup.sh` (settled before this plan).
- **2026-09-27** — Assumed: the propagation retry treats `401` and `403` alike, only on the probe after the widen, because that is where the 401-then-200 was seen (2.8 s), and wongstack-cloud's installer after its PR #17 does the same. A bad token still fails fast: `/user/tokens/verify` runs before the widen and is not retried.
- **2026-09-27** — Assumed: the installer prints the refused-call line only when it matches wongstack-cloud's `CLOUDFLARE_CALL` pattern, and exports that pattern, because the host already imports it and the Worker checks the same shape. An unreachable Cloudflare, or any other stop, prints the reason alone.
- **2026-09-27** — Assumed: the host relies on `run`, `jobFolder`, `repoFolder`, and `CLOUDFLARE_CALL` and nothing else, from reading `vm/agent.mjs` on `test-end-to-end-workflow`. Upstream's `run` already takes `input` and `timeout` and rejects with `stdout` on the error, which the host reads.
- **2026-09-27** — Assumed: a patch release, because it fixes source-only scripts and adds one line to the installer's output without changing its last line.
- **2026-09-27** — Assumed: no real-server test in this change, because the fake Cloudflare covers each fix, and wongstack-cloud's switch runs the installer end to end on a real server before it ships.
- **2026-09-27** — Built tasks 1.1–3.4 in a helper. The two test files pass (50/50), as do the other tests that read these files (115 in all), `check-payload-links`, `check-openspec-config`, and `check-retired-names`. The plan had said the pattern refuses `_`; it allows it, so a refused `/user/tokens/permission_groups` call prints its line too. The wording here and in the design is corrected.
- **2026-09-27** — Distilled: no fact on the change in memory; the one repeatable fact, that a widen's propagation refuses with `401` or `403`, is in `.agents/skills/wong-setup/references/permission-groups.md` from task 3.2. No wiki page changed.
- **2026-09-27** — Archive checkpoint for 26.16.1: archived by `/ship`, which synced both spec deltas into `openspec/specs/`.
