# Proposal

**Status:** in-progress
**Branch:** sulky-gorilla
**Open questions:** none

## Why

A Cloudflare security check found two places where a secret can reach the wrong website. Anyone who can comment on a pull request can post a hidden link that `/verify` treats as the preview, and `/verify` then sends that site the key that opens your private app. Separately, a saved password is typed into whatever page the browser shows, so a look-alike site, or a page that jumps to another site, gets your password. Both rest today on the assistant noticing; neither has a code check.

## What Changes

- **A saved password is typed only on its own site.** Before typing a saved login, the browser checks that the page is on the site the login was saved for: the same host, or one sitting under the other, as `login.netflix.com` sits under `netflix.com`. It checks again right before the password, so a page that moves after the email step is caught. On any other site it types nothing and says *wrong site*; the assistant then treats the page as having no saved login.
  ```mermaid
  flowchart TD
    same{"saved site?"} -->|yes| email["type email"] --> again{"still there?"}
    again -->|yes| pw["type password"]
    same -->|no| wrong["wrong site"]
    again -->|no| wrong
  ```

- **`/verify` sends the access key only to this install's own addresses.** The key goes only to a secure (`https`) address on your own app's site: the live app's address, and the staging and preview addresses Cloudflare gives your own account. Any other address is checked without the key, and the report says the key was not sent. A login wall there is reported as *not your site*, and no new key is made for it.
  ```mermaid
  flowchart TD
    own{"your own https site?"} -->|yes| key["walk with key"]
    own -->|no| nokey["walk without key"]
    nokey --> wall{"login wall?"}
    wall -->|yes| stop["not your site"]
  ```

- **The key rides only to the preview itself, not to other sites a page loads.** Today the test browser adds the key to every request, fonts and other sites included, and a request check naming a full address gets it too. Now the browser adds it only for the preview's own address, and a request check to another address goes without it.
  | Request during a check | Today | After |
  |-|-|-|
  | The preview's own pages | key | key |
  | A font or script from another site | key | none |
  | A request check naming another address | key | none |

- **A preview link from a comment counts only when a deploy app posted it.** Finding the preview from pull request comments now reads only comments posted by an installed app, such as Cloudflare's or Vercel's deploy bot, never a person's. Every way of finding the preview now takes only a secure (`https`) address.
  ```mermaid
  flowchart TD
    bot{"posted by an app?"}
    bot -->|yes| https{"https?"}
    https -->|yes| use["the preview"]
    bot -->|no| skip["ignored"]
    https -->|no| skip
  ```

**Non-goals:** a login box inside an embedded frame from another site, whose host the page reading can't tell. Narrowing *one sits under the other* for sites where anyone can get their own subdomain. The other parts of the security check, each in its own workspace: staging apart from production, the deploy key, teammate branches, the memory store's guards, and a removed person's access.

## Capabilities

### New Capabilities

### Modified Capabilities

- `browser-logins`: a saved login is typed only when the tab's host matches the saved login's host, checked before each typed value; a mismatch types nothing and reports `wrong-site`.
- `staging-walkthrough`: the Access service-token pair goes only to an `https` walk address on the install's own site, and only to that address's origin; a walled walk without the pair skips the heal.
- `delivery-gate`: preview discovery takes PR comments only from GitHub App (bot) authors, and takes only `https` addresses from every source.

## Impact

- `.agents/skills/browser/scripts/browse.mjs` (`login`), `wiki/development/browsing.md`, `scripts/tests/browse.test.mjs`.
- New `.agents/skills/verify/scripts/own-site.mjs` (the own-site rule and its CLI); `.agents/skills/verify/scripts/verify-runner.sh` (origin-scoped browser headers, same-origin curl headers, the guard); `.agents/skills/verify/scripts/verify-staging.sh` (`run` reports a withheld key and `BLOCK=not-own-site`); `.agents/skills/verify/SKILL.md` (no heal on `BLOCK=not-own-site`); `wiki/development/staging-walkthrough.md`.
- `.agents/skills/save/scripts/preview-url.sh` (bot-only comments, `https` only).
- Tests: `scripts/tests/verify-scripts.test.mjs`, `scripts/tests/verify-journeys.test.mjs`, `scripts/tests/preview-url.test.mjs`, and a new `scripts/tests/own-site.test.mjs`.
- `CHANGELOG.md`: one `## Next (patch)` entry. No setup step for installs; an install with no recorded memory store keeps walking, without the key.
- Overlaps workspace "Improve web browsing speed" (its hide-typed-secrets change also edits `login()`); a shared file is no reason to wait.

## Decision log

- **2026-10-21** — Assumed: the findings are settled as confirmed (the security check's own brief), so this plan fixes both and adds a regression test for each, with no question about whether they are real.
- **2026-10-21** — Assumed: "this install's own site" is the live app's origin recorded as the memory store's Worker, plus every host on its `<account>.workers.dev` subdomain, or, for a custom domain, that domain and its subdomains, because setup always records `https://<worker>.<account>.workers.dev/_memory`, Cloudflare gives each account subdomain to one account only, and `pictures` and `publish` already trust that same origin.
- **2026-10-21** — Assumed: an address that is not the install's own is walked without the key, and said so, rather than refused, because an install on another host (Vercel, Netlify) never had a key to send and still deserves its walk.
- **2026-10-21** — Assumed: no recorded memory store means no own site, so the key is never sent, because an empty origin must never widen the match to every host.
- **2026-10-21** — Assumed: the guard lives in `verify-runner.sh`, the one place that sends the key, so both callers (`verify-staging.sh run` and a kept-check replay) get it without a second copy.
- **2026-10-21** — Assumed: the browser gets the key through `agent-browser open <url> --headers`, which agent-browser scopes to that address's origin, instead of `set headers`, which sends it to every host; found while checking the sink, and fixed here because it is the same leak.
- **2026-10-21** — Assumed: comment discovery reads only comments whose author is a GitHub App (`user.type` `Bot`), not repository members, because deploy previews are posted by apps, and the sink guard already covers any address that slips through.
- **2026-10-21** — Assumed: every preview source takes only `https`, because a real preview is never plain `http`, and the reproduction used `http://preview.localhost`.
- **2026-10-21** — Assumed: a `wrong-site` login is handled like *no match* in the browsing steps, so the person gets the password link for the page's real site, and sees its name and picture before typing anything.
- **2026-10-21** — Assumed: refusing a login box inside a frame from another site, and narrowing the subdomain rule, stay out, because the report names both as separate from this finding and the page reading carries no frame host.
- **2026-10-21** — Built: `verify-journeys.mjs` runs the runner from the checkout's root, so `own-site.mjs` finds the install's recorded live address from a journey replay too.
- **2026-10-21** — Built: the added `/verify` and walkthrough words were offset by trimming nearby wording, to stay inside the instruction budget and the wiki page's 3,000-word cap.
- **2026-10-21** — Built: the second look found a backslash bypass (`host\@evil` reads as the own host to Node and as userinfo to curl); `own-site.mjs` now requires the written address to start with the parsed origin, and `preview-url.sh` refuses a backslash. Reviewed again: fixed. Saved for CI as final acceptance (tasks 5.2, 5.3).
