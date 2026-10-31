# Design

## Context

`site/` is a Vite + React one-page app served as plain files by a Cloudflare Worker with assets (`site/wrangler.site.jsonc`, `not_found_handling: single-page-application`). `App.tsx` picks `/privacy` or the landing page; every other path shows the landing page. `dist/index.html` holds only `<div id="root">`, so an agent that fetches a page with a plain request reads nothing. `Site.test.tsx` reads every page in `PAGES` for hosting words (`HOSTING`, which bans *log in*, *sign up*, *paid*, *create an account*), prices (`MONEY`), outside files, cookies, and sign-in. The site is meta-only ([landing page](../../../wiki/maintaining/landing-page.md)).

## Goals / Non-Goals

**Goals:** 8 guides that a non-technical person, or an agent with or without a browser, can follow to a working key in `.env`; static pages that read in full with no script, with one site-served script that adds Copy buttons; the same site rules on every guide page; a repeatable way to add and recheck a guide.

**Non-Goals:** guides past these 8; any WongStack wording in a guide; a site server, form, or account; changes to the WongStack private key link or `wiki/development/secrets.md`.

## Decisions

### Guides are Markdown files built to static pages

Each guide is `site/guides/<id>.md` with front matter:

```yaml
title: Connect Shopify
summary: Orders, products, customers
minutes: 10
needs: Store owner, or staff with permission to develop apps
lastChecked: 2026-11-xx
env: [SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN]
```

A Node script, `site/scripts/build-guides.mjs`, runs after `vite build` (`"build": "tsc -b && vite build && node scripts/build-guides.mjs"`). It writes:

- `dist/guides/<id>/index.html`: a full HTML page with the site's header and footer as static markup and the built CSS file linked. No script tag. Cloudflare assets serve `/guides/shopify` from it (default `auto-trailing-slash`).
- `dist/guides/<id>.md`: the source with front matter turned into a short header, picture paths made absolute (`https://wongstack.com/guides/shopify/03.webp`).
- `dist/guides/index.html` and `dist/guides.md`: the list.
- `dist/llms.txt`: the site's one-line purpose and the guide list with `.md` addresses.

The Markdown parser is `marked`, as a dev dependency: build-time only, nothing reaches the browser. Rejected: prerendering the React app (needs a headless browser in CI), and React routes for guides (agents still get an empty shell).

The *Guides* link joins `SiteHeader.tsx` as a plain `<a href="/guides">`. The static pages copy the header and footer markup from one shared template in the build script; a test renders `SiteHeader`/`SiteFooter` and compares link lists, so the two can not drift.

### One shape, checked by a test

`site/scripts/tests/guides.test.mjs` (or a Vitest file in `site/src/`) reads every guide and fails, naming the guide and the part, when one lacks: front matter fields; an *If you are an AI agent* part first; numbered steps where each has a picture with alt text; a *Save it* part that lists every `env` name; a *Check it works* part with a command; a *If it leaks* part; a link to `/guides/keep-keys-safe`. It also fails on a picture path that does not exist, any `http` image, and any word `HOSTING` or `MONEY` catches, run over the built HTML and `.md`. `Site.test.tsx` gains the guide pages in its outside-file and hosting reads.

A guide may name a tool's own plan (*Canva's Enterprise plan*) with no price; the `MONEY` pattern already allows that, since it catches only prices.

Wording that avoids the `HOSTING` words: *sign in* not *log in*; *make an account* not *sign up* / *create an account*; *the tool's own plan* not *paid*.

### The agent part, the save step, and the check

Every guide opens with the same agent part, from one shared snippet the build inserts (`site/guides/_agent.md`), so a change to it changes every guide:

1. Tell the person what you will make and ask before each thing you create.
2. The person signs in; never ask for their password.
3. If you control a browser, the person watches; stop at the screen that shows the key and let the person copy it, or copy it straight into `.env` without printing it.
4. Never show a key in the chat or a log.
5. Before you save, check `.env` is listed in `.gitignore`; add it if not.
6. Run the check, and report *works* or the error, never the key.

The save step shows the exact lines, e.g.:

```bash
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=paste-here
```

The check is one `curl` that only a working key answers, read-only, e.g. `curl -s -H "X-Shopify-Access-Token: $SHOPIFY_ADMIN_TOKEN" https://$SHOPIFY_STORE/admin/api/<version>/shop.json`. A person who can not run a command can skip it: the guide says what the tool shows when the key works, where one exists.

### What each guide makes

Facts below are from memory and get confirmed against each tool's own help pages, then on screen, during the build; the guide cites those pages.

| Guide | Path the guide takes | Saves | Watch for |
|-|-|-|-|
| Shopify | App made in Shopify's Dev Dashboard for your own store (admin custom apps stopped taking new apps in 2026: confirm), scopes chosen, installed; token from the client credentials | `SHOPIFY_STORE`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` or `SHOPIFY_ADMIN_TOKEN` | Confirm the current way; pick read scopes first |
| Shopify theme | Install Shopify's *Theme Access* app, make a password for an email; Shopify CLI uses it (`shopify theme pull/dev/push --store --password`) | `SHOPIFY_FLAG_STORE`, `SHOPIFY_CLI_THEME_TOKEN` | Work on a copy of the theme, never push straight to the live theme first |
| Klaviyo | Settings → API keys → Create private key, read-only or custom scopes | `KLAVIYO_API_KEY` | Key shows once |
| Meta ads | Business settings → make a Meta app (Business type) → System users → add, assign the ad account → Generate token with `ads_read` (and `ads_management` only if needed) | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` | Needs Business admin; system user token can be set to never expire |
| Google | Ask: *Do you use Google Workspace?* Yes → service account in Cloud Console, JSON key, domain-wide delegation by the Workspace admin with listed scopes. No → OAuth desktop client + one-time consent; the guide gives a small script that prints the refresh token into `.env` | `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_IMPERSONATE_EMAIL`, or `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | JSON key is a file: stored on one line; org policy may block key creation |
| Canva | Developer Portal → make an integration, set scopes and a return address, one-time sign-in for a refresh token; note Canva's own AI connector as the simpler choice for chat apps | `CANVA_CLIENT_ID`, `CANVA_CLIENT_SECRET`, `CANVA_REFRESH_TOKEN` | Some features need Canva's Enterprise plan: say so with no price |
| Slack | api.slack.com/apps → From a manifest → paste the guide's ready manifest → Install → copy the bot token; invite the bot to each channel | `SLACK_BOT_TOKEN` | Workspace admin may need to approve |
| Notion | notion.so/profile/integrations → New integration (internal) → copy the secret → on each page, ••• → Connections → add it | `NOTION_TOKEN` | The integration sees only pages shared with it |

The Google sign-in script and the Canva sign-in step are the only code a reader runs beyond `curl`. Each is short, printed in the guide, and writes to `.env` without printing the token.

### Pictures

Taken by the agent in Matthew's own browser profile (`browse.mjs`), at a fixed desktop width, up to the button that creates or reveals a key. The agent never presses it: Matthew presses it off-camera, or the step is shown as a drawing. A drawing is an SVG in the site's look with `••••` in place of any value. Every picture is cropped to the part that matters, given a box or arrow on the button, blurred where it shows a store name, email, or ID that is not sample data, saved as WebP under `site/public/guides/<id>/NN.webp`, and kept under 150 KB. Free test accounts are used where the tool allows one (Shopify development store, a test Slack workspace, a spare Notion workspace). Matthew reviews every picture on the preview before publish.

This stays inside `wiki/development/secrets.md`'s rule: the agent does not obtain, reveal, or copy a key. The meta-only page `wiki/maintaining/service-guides.md` records the stop point and the redaction steps.

### Wiki

New meta-only `wiki/maintaining/service-guides.md`: what a guide holds, how to add one, the picture rules, and how to recheck one (open each step, update pictures and *lastChecked*). `wiki/maintaining/landing-page.md` stops saying *two pages exist* and links it; `wiki/maintaining/README.md` lists it.

## UX

**Brief.** Who: an online store owner with no developer knowledge, or their agent. Job: get one key for one tool and save it safely. Done: the key sits in `.env` and the check says it works. Context: a laptop, with the tool open in another tab; the agent case runs in a terminal or a browser-controlling agent. Common case: Shopify, Meta, Google. Edge: no admin role, an org policy that blocks keys, a plan that lacks the feature. Frequency: once per tool, again when a key leaks or ends.

**Flow.** Guides list → guide → steps → Save it → Check it works. Three taps from the home page.

**Hierarchy.** One primary action per screen: on the list, pick a tool; on a guide, the next step. *Copy* buttons are not needed on static pages; text is selectable, and a code block is plain text for an agent.

**Components.** Mirrors the privacy page's plain text column and the landing page's header and footer; cards for the list rows; numbered headings; figures with captions; code blocks. Pictures scale to the column width, so a phone reads them too.

### Review

[review.html](review.html): *wongstack.com gets a Guides section* sketches the list beside today's site; *Each guide has the same shape* sketches a guide page.

## Risks / Trade-offs

- **Consoles change** and a picture goes stale → each guide shows *Last checked*; the wiki page owns the recheck. A later routine can recheck them (not in this change).
- **Agent-run steps go wrong** in an owner's real account → the agent part says ask first and least access; read-only scopes first.
- **Shopify's app route may have changed in 2026** → confirmed against Shopify's help pages before writing; the guide follows what works on the day.
- **Pictures may leak private data** → test accounts, blur, and Matthew's review before publish.
- **Two copies of header markup** (React and static) → a test compares their links.
