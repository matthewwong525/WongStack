# Design

## Context

See [proposal.md](proposal.md). `workerKey()` in `private-access.mjs` mints an account key, then `PUT`s it as a secret on each Worker in `workers`. Cloudflare answers `PUT /workers/scripts/<staging>/secrets` with HTTP 400, code `10215`, when the script's latest version is not the deployed one. Every pull request uploads a preview version after its staging deploy (`scripts/cf-deploy.sh`), so that is staging's usual state. `cf-secrets.mjs check`, run by `deploy.yml`, reports any secret production holds and staging lacks as drift.

## Decisions

### 1. The first Worker is required, the rest are best effort

`workers[0]` is the production Worker for both keys. A `CloudflareError` whose `codes` include `10215` on any later Worker adds that Worker's name to `waiting` and the loop goes on; on the first Worker it still throws. The result is `{ status: 'ready', id, waiting?: [names] }`, the note says where it is stored and which Worker is waiting, and the caller records it as today. Any other error still throws.

Why not add the key as a new Worker version, which Cloudflare accepts: it means re-uploading the latest version's code with one more binding, a larger change the owner deferred.

### 2. Reuse follows the first Worker

`held` is true when the first Worker lists the secret. A staging Worker without it no longer forces a roll, so a rerun on an install whose preview is waiting changes nothing and says `reused`.

### 3. The parity check allows the setup-made key on production alone

In `cf-secrets.mjs check`, `SETUP_MADE` set on production and missing from staging is not a problem; the check prints one line saying the preview is waiting. Staging holding it without production stays a problem. `push` keeps refusing the name in any file.

### 4. Access on a preview

On the practice environment a setup-made key that is not saved reads *Not on previews yet*, and the one-step-left card with *Copy that request* is not shown. On the live app nothing changes.

## Risks / Trade-offs

- Previews can not exercise a real Cloudflare look-up → said on the screen and in the docs; the later change that makes previews hold the key removes it.
- Matching on Cloudflare's code `10215` → any other refusal still fails loudly, so a changed code shows up as the old error, not as silence.

## Migration Plan

Publish, then run `provision.mjs access` for this repo's live app with the owner's confirm: the recorded state marks the key pending, so that run replaces its value, stores it in the live app and writes the record, which is saved through the change loop.
