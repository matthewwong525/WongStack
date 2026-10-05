# Finish the Cloudflare key step when the preview app can't take the key

**Status:** ready-to-ship

**Branch:** record-cloudflare-read-key

**Open questions:** none

## Why

Release 33.0.0 added a setup step that makes a read-only Cloudflare key and stores it in the live app and the preview app. Cloudflare refuses to store a key in the preview app whenever a newer preview has been uploaded than the one deployed, which is the preview app's normal state. So the step stops with an error after the live app already has its key, and the publish check then fails because the two apps differ. It happened on this repo's own live app on 2026-10-05.

## What Changes

- **The step finishes with the live app alone.** It stores the key in the live app, says in one line that the preview app is waiting, and completes its record. When Cloudflare does accept the preview copy, it is stored too. Running the step again reuses the key when the live app holds it.
  ```text
  make key ─▶ live app ─▶ preview app ─▶ record
                              │ refused
                              ▼
                       say it is waiting ─▶ record
  ```
- **The publish check accepts that difference.** For this one key, which setup makes itself, the live app may hold it while the preview app does not. Every other key must still match in both.
- **Access on a preview says so.** In the Keys view on a preview, Cloudflare reads *Not on previews yet*, with no request to copy, because no setup step can finish it there.
- **If your update to 33.0.0 reported an error from this step,** the assistant runs it again after this update and it completes.

**Non-goals:** Making previews hold the key. Any change to key levels, roles, or what the Cloudflare key can read.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: the read-only Cloudflare key is required in the live app only; a refused preview copy never fails setup or the parity check.

## Impact

- Setup: `.agents/skills/wong-setup/scripts/private-access.mjs`, `provision.mjs`, tests in `scripts/tests/provision.test.mjs` and `scripts/tests/fixtures/cloudflare.mjs`.
- Tooling: `scripts/cf-secrets.mjs` and `scripts/tests/cf-secrets.test.mjs`.
- Screens: `app/src/apps/access/` (the Keys view's line for a setup-made key on a preview), `app/worker/employee-access/` if the status needs to say so.
- Docs: `wiki/stack/employee-access.md`, `wiki/stack/staging-bindings.md`, `wiki/stack/cloudflare-credentials.md`.
- Payload release: `CHANGELOG.md` entry, patch.
- After publishing: run the step for this repo's live app and save its record, with the owner's confirm.

## Decision log

- **2026-10-05** — Asked how to fix the preview-app step → chose to finish without the preview copy: the live app holds the key, the preview is reported as waiting.
- **2026-10-05** — Assumed: the step still tries the preview app and keeps the copy when Cloudflare accepts it, because a preview that holds the key is closer to the live app and costs nothing.
- **2026-10-05** — Assumed: a rerun reuses the key when the live app holds it and does not replace it to try the preview again, because replacing a working key on every run would be churn for no gain.
- **2026-10-05** — Assumed: only this one setup-made key may differ between the two apps in the publish check, because the check exists to catch every other difference.
- **2026-10-05** — Assumed: the plan is filed in the archive and numbered 33.1.1 for publishing, because every task is done and the checks pass on this computer after bringing in 33.1.0.
