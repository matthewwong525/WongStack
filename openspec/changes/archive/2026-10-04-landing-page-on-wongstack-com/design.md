# Design

## Context

See proposal.md for why. What shapes the approach, read live on 2026-10-04:

- `wongstack.com` and `www.wongstack.com` are custom domains on the Worker `wongstack-cloud`. The zone is in the same Cloudflare account as `wongstack-site`.
- The landing page publishes through [`.github/workflows/site.yml`](../../../.github/workflows/site.yml): a branch deploys `wongstack-site-staging` and uploads a preview alias; the default branch runs `npx wrangler deploy --config wrangler.site.jsonc`, piped through `tee`.
- The repo's deploy token, `wongstack-deploy`, holds Workers Scripts Write on the account. The old app's deploy token held the same and attached these two names on every deploy.
- The old app can no longer publish: its three workflows are off and its deploy token and GitHub secrets are deleted.
- `support@wongstack.com` is an email routing rule on the zone that forwards to the owner. The catch-all rule is off. Neither depends on a Worker.

## Goals / Non-Goals

**Goals:**

- The switch happens at publish, in one deploy, with no moment where the domain answers nothing.
- No branch deploy can ever move the domain.

**Non-Goals:**

- A redirect from `www` to the apex. The site has no Worker code; a redirect would need a zone rule, which is a separate Cloudflare change.
- Any change to DNS, email, or tokens.

## Decisions

### 1. Routes in the config, attached by the publish run

Add to the top level of `site/wrangler.site.jsonc`:

```jsonc
"routes": [
  { "pattern": "wongstack.com", "custom_domain": true },
  { "pattern": "www.wongstack.com", "custom_domain": true }
]
```

Keep `"workers_dev": true`: with `routes` declared and that key absent, wrangler turns the `workers.dev` address off.

Wrangler publishes the list as the Worker's full set of custom domains. When stdout is not a terminal it sets `override_existing_origin` and `override_existing_dns_record` itself and asks nothing (read in wrangler's `publishCustomDomains`), so the CI deploy takes both names from `wongstack-cloud` in one `PUT`. The workflow's `tee` makes stdout a pipe.

*Over attaching the names by hand through the API:* a hand attach leaves the config saying the site has no domain, and the next person to read it would not know. The config is the record.

### 2. Staging declares `"routes": []`

A wrangler environment inherits top-level `routes`. Without its own empty list, the branch deploy of `wongstack-site-staging` would move `wongstack.com` to staging before the change is even published, on this change's own first push. `env.staging` gets `"routes": []`. The old app's config carried the same guard.

### 3. A guard test pins both

`scripts/tests/landing-site.test.mjs` gains a third guard, reading the parsed config:

- the top-level `routes` are exactly the two names, each with `custom_domain: true`;
- `workers_dev` is `true`;
- every environment under `env` has `routes` equal to `[]`.

It also runs the same check against a config whose staging block has no `routes`, and expects a refusal that names the environment. The file's existing guards follow this shape: the real file passes, a broken copy is refused.

The file's config comment (*No `routes` and no custom domain*) and its opening comment (*Two guards*) are updated to match.

### 4. The wiki says where the page lives

In `wiki/maintaining/landing-page.md`:

- The section *wongstack.com moves only on the owner's word* becomes *wongstack.com is the site's address*: a publish attaches both names; a preview never does, and why staging carries an empty list; the test that fails if it loses it.
- Publish step 3 says the merge puts the site live at wongstack.com, and that it keeps its own `workers.dev` address.

No other page links the old heading's anchor (searched), so no link breaks.

### 5. The live check belongs to `/ship`

Whether `wongstack.com` shows the new page can only be seen after the merge, so it is no task here. `/ship`'s look at the live app checks it: `https://wongstack.com/` and `https://www.wongstack.com/` show the landing page with no *Pricing* or *Log in*, and `https://wongstack-site.matthewwong525.workers.dev/` still answers. The shutdown to-do's step 11 repeats that check before any production removal.

## Risks / Trade-offs

- [The deploy token cannot attach a custom domain] → The publish run fails and the domain stays on the old app: nothing is half-moved, because the attach is one call. Then attach the two names through the API with the host's token, which holds the same Workers Scripts Write and more, after asking the owner.
- [The branch deploy moves the domain early] → Decision 2, pinned by decision 3. The guard runs in the Test job on the same push.
- [Sign-in at wongstack.com ends at publish] → Intended and named in the proposal. Nobody has a subscription or a server, and the live prices are off (read 2026-10-04).
- [www shows the same page at a second address] → Every page's canonical link names `wongstack.com`, so search engines index one.

## Migration Plan

Publish. To turn back while the old app still exists: remove the two routes, publish, and attach both names to `wongstack-cloud` again through the API. After the shutdown removes the old app there is nothing to turn back to.
