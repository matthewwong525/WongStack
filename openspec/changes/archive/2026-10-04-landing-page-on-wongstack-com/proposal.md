# Show the new landing page at wongstack.com

**Status:** ready-to-ship

**Branch:** organic-shrimp

**Open questions:** none

## Why

The new landing page is live, but only at its own address. wongstack.com still shows the old app, with its sign-in and pricing pages, and that app is being shut down. The old app can not be removed until wongstack.com shows the new page.

## What Changes

- **wongstack.com and www.wongstack.com show the new landing page.** The switch happens when this change is published, with no gap: one moment a visitor gets the old app, the next the new page. From then on nobody can sign in at wongstack.com. The old app keeps running at its own address until the shutdown removes it, so the switch can be turned back until then.
  ```text
       BEFORE                AFTER
  wongstack.com         wongstack.com
        │                     │
        ▼                     ▼
  ┌───────────┐         ┌───────────┐
  │  old app  │         │ +new page │
  │  sign-in  │         │ no sign-in│
  └───────────┘         └───────────┘
  ```
- **A preview can never take the domain.** Only a published change moves wongstack.com. A preview of a later landing page change stays at its own preview address, and a check fails if that ever stops being true.
- **The new page keeps its own address too**, so there is always a second way to reach it.
- **Mail to support@wongstack.com keeps arriving.** The domain receives it, not the app, so the switch does not touch it.
- **The notes for whoever maintains the page say where it now lives**: at wongstack.com, published by every landing page change.

**Non-goals:** Removing the old app, its database, or its keys (the shutdown to-do in this workspace, each step asked first). Changing what the landing page says. Sending www.wongstack.com visitors on to wongstack.com: both names show the same page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-site`: the requirement *The public domain moves only on the owner's word* is replaced by *wongstack.com shows the landing page*: the published site answers at `wongstack.com` and `www.wongstack.com`, and a preview never takes either name.

## Impact

- `site/wrangler.site.jsonc`: production gains `routes` for `wongstack.com` and `www.wongstack.com` as custom domains; `env.staging` gains `"routes": []`, because an environment inherits top-level routes.
- `scripts/tests/landing-site.test.mjs`: a third guard pins those two facts.
- `wiki/maintaining/landing-page.md`: the domain section and the publish step.
- `openspec/specs/landing-site/spec.md`: the replaced requirement.
- Cloudflare, at publish: the two custom domains move from the Worker `wongstack-cloud` to `wongstack-site`. No DNS, email, or key change.
- Meta-only: no install receives any of these files, so there is no release entry.
- Other work: the shutdown to-do in this workspace waits on this change; its production removals start only after wongstack.com shows the new page. The `electric-fox` workspace edits `site/src/install.ts` and the README, not these files.

## Decision log

- **2026-10-04** — Asked who switches wongstack.com and www.wongstack.com to the new landing page → chose to do it in this workspace, not the landing page's.
- **2026-10-04** — Assumed: the switch happens when this change is published, with no separate step by hand, because the publish run attaches the two names itself and takes them from the old app without asking.
- **2026-10-04** — Assumed: publishing this change is the owner's word for the switch, because the earlier plan kept the domain back only until he had seen the site live at its own address and said to switch.
- **2026-10-04** — Assumed: www.wongstack.com shows the same page and does not send visitors on to wongstack.com, because the site runs no code to redirect and every page already names wongstack.com as the address to index.
- **2026-10-04** — Assumed: the privacy page needs no new line, because the old app had no customer: its only sign-up besides a test placeholder is the owner's own address, with no payment ever taken.
- **2026-10-04** — Assumed: nothing can take the domain back, because the old app's publishing was turned off and its publish key deleted earlier today.
- **2026-10-04** — Assumed: the two comments in `.github/workflows/site.yml` that say the publish attaches no domain are rewritten in this change, because they stop being true when it is published. Comments only: no step changes.
- **2026-10-04** — Check: `.github/workflows/site.yml` has two comments rewritten to say the publish now attaches wongstack.com and www.wongstack.com, because the old comments said it attaches no domain. No step, trigger, or check in the workflow changes.
- **2026-10-04** — Archive checkpoint: the config, its guard test, and the wiki section are built and the guard tests and wiki link check pass. The live check of wongstack.com follows the merge.
