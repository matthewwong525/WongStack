# Open your WongStack app at admin.wongstack.com

**Status:** ready-to-ship

**Branch:** wongos-check-in-schedules

**Open questions:** none

## Why

Your WongStack app (the Inbox, Access, Knowledge and the other admin screens) has only a long Cloudflare address today. You want a short address you can remember and share with your team: admin.wongstack.com.

## What Changes

- **Your app opens at admin.wongstack.com.** When this change goes live, the new address shows the same app, with the same sign-in. Nobody gets in without signing in, as today.
  ```text
  admin.wongstack.com ──────┐   (new)
                            ▼
                      ┌───────────┐
                      │  your app │
                      │  sign-in  │
                      └───────────┘
                            ▲
  old workers.dev ──────────┘   (kept)
  ```
- **The old address keeps working.** This computer's tools, your memory and your schedules keep using it, so nothing needs to sign in again and nothing stops. Previews keep their own addresses.
- **A preview can never take the new address.** Only a published change moves admin.wongstack.com. A check fails if that ever stops being true.
- **The landing page stays at wongstack.com.** The new name is a separate address, so the public site does not change.

**Non-goals:** Moving this computer's tools to the new address. Changing what an install gets: each install picks its own address. Sending the old address on to the new one.

## Capabilities

### New Capabilities

- `admin-address`: this repo's own app answers at `admin.wongstack.com` and keeps its `workers.dev` address; a preview never takes the name.

### Modified Capabilities

None.

## Impact

- `app/wrangler.jsonc`: production gains `routes` for `admin.wongstack.com` as a custom domain and `"workers_dev": true`; `env.staging` and `env.local` gain `"routes": []`.
- `scripts/tests/admin-address.test.mjs`: new guard that pins those facts.
- `wiki/maintaining/admin-address.md`: new page, linked from `wiki/maintaining/README.md`.
- Cloudflare, at publish: the deploy attaches `admin.wongstack.com` to the Worker `wongstack` and makes its DNS record. The name is free today. Access already covers every address of that Worker, so no Access change.
- `.agents/skills/memory/references/areas.json`: a new `admin-address` area names the new spec and page. That file ships, so the change carries a `patch` changelog entry that says installs see no change. Install configs (`app/wrangler*.jsonc`) never ship.

## Decision log

- **2026-11-07** — Asked to make the admin side's Worker answer at admin.wongstack.com → planned it for the Worker `wongstack`, the app in `app/`.
- **2026-11-07** — Assumed: the `workers.dev` address stays on and this computer's tools keep using it, because the recorded memory address in `.agents/.wong-stack.json` is the origin for sign-in, schedules and own-site checks; moving it would make the computer sign in again and stop counting `workers.dev` previews as its own site.
- **2026-11-07** — Assumed: no Access change, because the live app's Access application uses a Worker destination, which covers the Worker's custom domains too ([cloudflare-access](../../../wiki/stack/cloudflare-access.md)). The live check proves it.
- **2026-11-07** — Assumed: the deploy key can attach the name, because the same `CLOUDFLARE_DEPLOY_TOKEN` already attaches `wongstack.com` to the landing site in the same account.
- **2026-11-07** — Assumed: `env.local` also gets `"routes": []`, because an environment inherits top-level routes and a local run must never claim the name.
- **2026-11-07** — Assumed: the live check (admin.wongstack.com asks for sign-in and shows the app; the `workers.dev` address and this computer's memory and schedule calls still work) runs after the merge, as `/ship`'s live look, not as a task, because the name attaches only at publish.
- **2026-11-07** — Assumed: a `patch` changelog entry and an `admin-address` area in `areas.json`, because `scripts/tests/memory-areas.test.mjs` fails on an archived spec that no area names, and `areas.json` ships; the landing page's area (31.0.2) set the same precedent.
- **2026-11-07** — Archive checkpoint: the config, its guard test, the wiki page and the memory area are built; the guard, deploy-guard and landing-site tests and the wiki link check pass. The review's one finding (the publish link and live look use admin.wongstack.com) is on the wiki page. The live check follows the merge.
