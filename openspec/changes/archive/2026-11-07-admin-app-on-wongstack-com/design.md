# Design: admin.wongstack.com

## Context

- The app Worker `wongstack` (`app/wrangler.jsonc`) has no `routes`; it answers only at `wongstack.matthewwong525.workers.dev`.
- The zone `wongstack.com` is in the same account (`040f…d442`): `site/wrangler.site.jsonc` attaches `wongstack.com` and `www.wongstack.com` to `wongstack-site` with the same `CLOUDFLARE_DEPLOY_TOKEN` the app deploy uses. `admin.wongstack.com` has no DNS record today.
- `.agents/.wong-stack.json` records `components.memory.worker` as the `workers.dev` origin. `memoryOrigin()` turns it into the origin for sign-in (`daily.mjs who`), schedules, and `own-site.mjs`, which treats every host under `matthewwong525.workers.dev` as this install's own site, previews included.
- The deploy guard (`scripts/lib-wrangler-config.mjs`): a preview build that claims a route is refused (line 328); a production build's routes must equal main's top level (line 305). Both hold with this change.
- `app/wrangler*.jsonc` never ship to an install (payload manifest, scaffold rule).

## Decisions

### 1. The config

Top level of `app/wrangler.jsonc`:

```jsonc
// Keep this: with `routes` declared and this key absent, wrangler turns the
// workers.dev address off, and this computer's tools lose their address.
"workers_dev": true,
// admin.wongstack.com is the app's short address: a publish from the default
// branch attaches it, and no environment does. wiki/maintaining/admin-address.md
"routes": [{ "pattern": "admin.wongstack.com", "custom_domain": true }],
```

`env.staging` and `env.local` each add `"routes": []`. An environment inherits top-level routes, so without it a branch preview would take the name from the live app.

`preview_urls` stays unset: it follows `workers_dev`, which stays `true`, so staging's per-version preview links keep working.

### 2. The computer keeps the workers.dev origin

No change to `.agents/.wong-stack.json`. Alternative rejected: moving `components.memory.worker` to `admin.wongstack.com`. It would need a new `cloudflared access` sign-in on every computer, and `own-site.mjs` would stop counting `wongstack-staging.matthewwong525.workers.dev` previews as own site.

### 3. Access

The live Access application targets the Worker by id (`CF_ACCESS_WORKER_ID`), so it follows the Worker to its custom domains. The Worker checks the assertion's audience and issuer, not the host. No Access edit. The first visit to the new name asks for sign-in once, because the Access cookie is per host.

### 4. The guard

`scripts/tests/admin-address.test.mjs`, shaped like the domain guard in `scripts/tests/landing-site.test.mjs`: a `domainProblem(config)` that returns a reason or null, a test on the real config, and tests on mutated copies (staging with no routes, staging with the name, a new environment with none, routes changed, `workers_dev` removed).

## Risks

- [The deploy key can not attach the name] → the publish fails before any switch; nothing is half-moved. Attach it by hand with the host's key after asking the owner, then rerun.
- [Access does not cover the new host] → the live check finds it before anyone shares the address. Fix the Access application's destinations, asking first.
