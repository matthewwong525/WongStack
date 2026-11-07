# The app's admin address

This repo's own app, the Worker `wongstack` in [`app/`](../../app/), answers at `admin.wongstack.com` and at its own `workers.dev` address. It is **meta-only**: an install picks its own address, and no install receives [`app/wrangler.jsonc`](../../app/wrangler.jsonc).

## Two addresses, one app

- **`admin.wongstack.com`** is the short address to remember and share with the team. It is the top-level `routes` in `app/wrangler.jsonc`, as a custom domain, so every publish from the default branch attaches it and makes its DNS record.
- **`wongstack.matthewwong525.workers.dev`** stays on: `"workers_dev": true` keeps it. With `routes` declared and that key absent, wrangler turns the `workers.dev` address off.

Both addresses ask for the same Access sign-in before any page, asset, or API. The Access application targets the Worker by id (`CF_ACCESS_WORKER_ID`), so it covers every address of that Worker ([Cloudflare Access](../stack/cloudflare-access.md)). The first visit to a new address asks for sign-in once, because the Access cookie is per address.

## The computer keeps workers.dev

This computer's tools keep the `workers.dev` address: `components.memory.worker` in `.agents/.wong-stack.json` still names it. That address is the origin for sign-in, schedules, and the own-site check. Moving it to `admin.wongstack.com` would make each computer sign in again, and the own-site check would stop counting the `wongstack-staging` previews on `workers.dev` as this install's own site.

The publish link is the exception. Wrangler's deploy log names the custom domain first, so the production deployment's link on GitHub, and `/ship`'s live look that reads it, use `admin.wongstack.com` ([`wong_production_url`](../../scripts/lib-wrangler-config.sh)).

## No environment takes the name

An environment inherits the top-level `routes`, so `env.staging` and `env.local` each declare `"routes": []`. Without that list, a branch's preview would move `admin.wongstack.com` to the staging app. The deploy guard refuses a preview build that claims a route, and holds a production build's routes to the default branch's own ([where the deploy key is](../stack/github-actions.md#where-the-deploy-key-is)).

[The guard test](../../scripts/tests/admin-address.test.mjs) fails when an environment loses its empty list, when the top-level name changes, or when `"workers_dev": true` goes.

## The config is the record

Never attach `admin.wongstack.com` by hand in the Cloudflare dashboard. A publish attaches what the config names; a name attached by hand is not in the record, and the next change can not see it. To change the address, change `app/wrangler.jsonc` and the guard test in the same change.

The landing page keeps `wongstack.com` and `www.wongstack.com` on its own Worker ([the landing page](landing-page.md#wongstackcom-is-the-sites-address)).

Part of [Maintaining WongStack](README.md).
