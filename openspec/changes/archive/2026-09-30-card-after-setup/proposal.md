# Card after setup

**Status:** ready-to-ship

**Branch:** zero-trust-credit-card

**Open questions:** none

## Why

Cloudflare turns on the private email login and full chat transcripts only once a card is on file. Today setup stops cold when the card is missing and has to be run again. Its last step also asks for email-code sign-ins on every site. A new person should reach a working site in one pass, then choose whether to add the card.

## What Changes

- **Setup never stops for a card.** On your own computer, when Cloudflare needs a card for the private login, setup finishes anyway. Your site goes live without the email login, and memory stays private behind its own key.
  ```text
  BEFORE
  token ──▶ tools ──▶ private login?
                        │ needs a card
                        ▼
                   stop, run again

  AFTER
  token ──▶ tools ──▶ private login?
                        │ needs a card
                        ▼
              site live, open to
              anyone with the link
                        │
                        ▼
              closing: add a card?
  ```
- **Adding the card is an optional last step.** The closing message gives one short list of links to open in your own browser: add a card, turn on file storage, pick the free private-login plan. It says plainly what you miss without it: anyone with the link can see your site, and memory keeps no full chat transcripts. When you say done, the assistant turns both on and publishes the change.
  ```text
  ┌──────────────────────────────────────┐
  │ Your site is live:                   │
  │ https://recipe-box.you.workers.dev   │
  │                                      │
  │ Optional: add a card to Cloudflare   │
  │ Free plans; light use costs nothing. │
  │ Without it, anyone with the link can │
  │ see your site, and memory keeps no   │
  │ full chat transcripts.               │
  │ 1. Add a card        <link>          │
  │ 2. Turn on storage   <link>          │
  │ 3. Pick Free plan    <link>          │
  │ Tell me when it's done.              │
  └──────────────────────────────────────┘
  ```
- **The final checks run themselves.** The assistant checks the live site with its own machine key instead of signing in by email code on each site. When you open the link and see your app, that counts as the human check.
- **Everything else stays.** The checks at the start stay as they are. A site that already has the private login keeps it. The server installer still stops until the private login is on.

Non-goals: entering the card for the person; a public choice when the card is already on file; changing the server installer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: private-by-default gains an explicit open-until-login state for an account whose Zero Trust onboarding needs a card; the closing report recommends the card as optional; setup's final check is the automatic machine probe, with the person's own visit as the human check.
- `install-onboarding`: interactive setup no longer stops on Zero Trust onboarding; the server installer keeps stopping.

## Impact

`.agents/skills/wong-setup/scripts/provision.mjs` and `private-access.mjs` (an `--open-without-login` path and a later switch to private), the app Worker (`app/worker/index.ts`), `scripts/check-private-access.mjs` (accept only an explicit open mode), the stack-pack wrangler fragment, `references/cloudflare.md` Steps 4 and 5, `wiki/stack/cloudflare-access.md`, `wiki/development/memory.md`, their tests, and a CHANGELOG entry. A minor payload release. The server installer and existing private installs are unchanged.

## Decision log

- **2026-09-30** — Asked which setup checks feel like too much → chose the login checks at the end; they should run with the machine key, and the person seeing their app is enough. The start-of-setup checks stay.
- **2026-09-30** — Asked how the person adds the card → chose their own browser, from a short list of links.
- **2026-09-30** — Asked what the site does until the card is added → chose to make the card an optional recommendation after setup, saying what the person loses without it; the site goes live without the email login.
- **2026-09-30** — Assumed: Only the Zero Trust onboarding failure opens the site; overlapping apps, ownership conflicts, and other Access errors still stop setup, because only the card is the person's optional choice.
- **2026-09-30** — Assumed: Open mode is written in the committed app config, never a secret, and the Worker honors it only while no Access IDs are set, because a reviewable switch can't silently weaken a private site.
- **2026-09-30** — Assumed: Adding the card later reruns `provision`, which turns on Access and R2 and rewrites the config for `/save` to publish, because the rerun already adds a missing bucket.
- **2026-09-30** — Assumed: The server installer keeps stopping on onboarding, because the person isn't there to read the warning.
- **2026-09-30** — Assumed: The general "Verify it works — in a browser" runbook stays for `/verify` and later changes; only setup's closing check drops it, because the user asked about setup.
- **2026-09-30** — Assumed: Only a Cloudflare refusal of the Zero Trust organization opens the site; a network failure, rate limit, or Cloudflare outage still stops setup, because a flaky connection must never publish a site without its login.
- **2026-09-30** — Assumed: A site already private (an Access app in the saved state or install record) never opens, even with `--open-without-login`, because a private site keeps its login.
- **2026-09-30** — Assumed: The live run on a no-card Cloudflare account is recorded unverified, because no such account is at hand; only the fake-Cloudflare tests cover it. The widen step reads Access before provisioning, so a no-card account might stop there instead; the first real no-card setup will show it. CI runs at the ship's save.
- **2026-09-30** — Assumed: Archive checkpoint for the ship, numbered 28.7.0 after merging 28.6.0 from main; the changelog kept both entries, this one on top.
