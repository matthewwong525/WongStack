# Move the wongstack.com landing page into this repo

**Status:** ready-to-ship

**Branch:** boring-turkey

**Open questions:** none

## Why

wongstack.com is part of a separate app that sells hosting: sign-in, plans, and rented servers. That app is going away, and wongstack.com becomes a landing page only. The page needs a home in this repo, and it must say only what is true now: WongStack is free, and you install it on your own computer.

## What Changes

- **The landing page lives in this repo, as its own small public site.** It sits apart from the starter app. Anyone can open it, with no login. It is never copied into anyone's install.
  ```text
  ┌──────────────┐  ┌──────────────┐
  │ starter app  │  │ landing page │
  └──────────────┘  └──────────────┘
   behind a login    open to anyone
   copied to every   stays in this
   install           repo only
  ```
- **The page says what WongStack is and how to install it, and nothing about paid hosting.** Gone: the plans and prices, the free trial, *Or let us host it*, *Log in*, the pricing page, and every mention of a rented server. Kept as they are: the headline, why you built it, the phone screens, the four points, the three Claymoo apps to try, the comparison table, and the list of what it is built on. The questions are reworded for a free install: no price, no cancelling, and *your own computer* where they said *your own server*.
  ```text
    BEFORE                    AFTER
  ┌──────────────────────┐  ┌──────────────────────┐
  │ WongStack            │  │ WongStack            │
  │     Pricing · Log in │  │ GitHub · +[Install]  │
  ├──────────────────────┤  ├──────────────────────┤
  │ Grok Bot but yours.  │  │ Grok Bot but yours.  │
  │ [Install for free]   │  │ [Install for free]   │
  │ Or let us host it →  │  │ +See it on GitHub →  │
  ├──────────────────────┤  ├──────────────────────┤
  │ Why I built this     │  │ Why I built this     │
  │ Built from my phone  │  │ Built from my phone  │
  │ The setup is done    │  │ The setup is done    │
  │ Things I have built  │  │ Things I have built  │
  │ How it compares      │  │ How it compares      │
  │ Free and open source │  │ Free and open source │
  │ Install it for free  │  │ Install it for free  │
  │ Or let us host it    │  │                      │
  │ Questions            │  │ Questions            │
  ├──────────────────────┤  ├──────────────────────┤
  │ Terms · Privacy      │  │ +License · Privacy   │
  │ Email                │  │ Email                │
  └──────────────────────┘  └──────────────────────┘
  ```
- **The install steps are easy to update.** The message to copy is the same one the README gives, and a check fails if the two ever differ. Everything the page says about installing sits in one place: the message, the steps, which accounts you need, and which computers it works on. When the new install route lands (your own Cloudflare account, no GitHub account, Mac and Linux first), one edit updates the page. Until then the page describes the install that works today.
- **A short privacy page replaces the terms and the long privacy policy.** The old pages are about a paid service: billing, servers, cancelling. The new page says what is true of a landing page: no sign-in, no cookies, no tracking, and the software runs in your own accounts. The terms page goes, because nothing is sold; the footer links the open-source license instead. Like the old pages, it is a draft no lawyer has reviewed.
  ```text
  ┌──────────────────────────────┐
  │ Privacy                      │
  │ Last updated: the date       │
  │                              │
  │ This site                    │
  │   no sign-in, no cookies,    │
  │   no tracking, no ads        │
  │ The software                 │
  │   runs on your computer,     │
  │   in your own accounts       │
  │ If you email us              │
  │   we keep it to answer you   │
  │ Questions: the support email │
  └──────────────────────────────┘
  ```
- **wongstack.com does not move in this change.** The new site goes live at its own address first. wongstack.com keeps showing today's app until you say *switch*. That is a separate step, asked once the new site is live. From the moment of the switch nobody can sign in at wongstack.com, so it belongs with shutting the app down.
  ```text
  a change ─▶ link to look at ─▶ publish
                                    │
                                    ▼
                          live at its own address
                                    │ later, you say "switch"
                                    ▼
                          wongstack.com shows it
  ```
- **The landing page has its own checks and its own link to look at.** A change to the landing page runs them; a change that leaves it alone skips them.
- **Old links still land somewhere.** An address the old app used, such as the pricing or sign-in page, shows the landing page, not an error.

**Non-goals:** Pointing wongstack.com at the new site (the next step, asked after this is live). Removing the old app, its accounts, or its emails (its own workspace). Changing how WongStack installs (the workspace on branch `electric-fox`). New copy or a new design beyond taking the hosting out. Visitor counting, a sign-up form, or a blog. Narrowing which of the starter app's checks run on a landing-page-only change.

## Capabilities

### New Capabilities

- `landing-site`: the public landing page kept in this repo: what it says, what it must never offer, how its install wording stays true, that it never ships to an install, how it is checked and published, and that the public domain moves only on the owner's word.

### Modified Capabilities

None.

## Impact

- New folder `site/`: a React and Vite single-page site with its own `package.json`, tests, and deploy config, ported from `wongstack-cloud`'s `app/src/` (`Landing.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `Compare.tsx`, `compare.ts`, `Rotator.tsx`, `CopyButton.tsx`, `apps.tsx`, `mockups.tsx`, `steps.tsx`, `index.css`), its `app/public/` pictures, and `brand/`. `Pricing.tsx`, `pricing.ts`, the account screens, and the Worker are not ported; `Legal.tsx` is replaced by a short privacy page.
- Cloudflare: two new static-asset Workers in this repo's account, `wongstack-site` and `wongstack-site-staging`, with no server code, database, or secret. The `wongstack.com` zone is already in that account.
- CI: a new meta-only workflow `.github/workflows/site.yml`; two new script tests in `scripts/tests/`; `.github/dependabot.yml` and the dependency-update script gain `site/`.
- Docs: a new meta-only page `wiki/maintaining/landing-page.md`, linked from its hub.
- Payload: one line. Memory's shipped area list (`.agents/skills/memory/references/areas.json`) gains a `landing-page` area, as it already holds areas for other source-only folders. That makes this a patch release with a `CHANGELOG.md` entry whose update note is *no action needed*. No file of the landing page itself ships.
- Other work: the `electric-fox` workspace changes the README's install message; the new check then makes it update `site/src/install.ts` in the same change. The switch of `wongstack.com` must be timed with the workspace that shuts the old app down.

## Decision log

- **2026-10-04** — Asked what becomes of wongstack.com → chose a landing page only, moved into this repo, with the hosting app removed and its repo kept as an archive.
- **2026-10-04** — Assumed: the landing page is its own small public site, apart from the starter app and never part of what an install receives, because the starter app sits behind a login and is copied to every install.
- **2026-10-04** — Assumed: the page has no sign-in and no pricing and never mentions a rented server or a paid plan, because the hosting app is being removed.
- **2026-10-04** — Assumed: every section that is not about hosting carries over unchanged, the comparison table and the three sample apps included, because the request was to move the page, not to rewrite it.
- **2026-10-04** — Assumed: the terms page is dropped and the privacy page is rewritten short, because the old pages describe billing, servers, and cancelling, and a page that promises what no longer exists is worse than none. The old text stays in the archived repo.
- **2026-10-04** — Assumed: the new privacy page speaks only for the site and the software. If shutting the old app down keeps any customer record, that workspace adds the line, because only it knows what is kept.
- **2026-10-04** — Assumed: the page describes the install that works on the day it is published, and uses the README's exact message, because the new install route is still being planned and a page must not promise it early.
- **2026-10-04** — Assumed: pointing wongstack.com at the new site is left out of this change and asked afterwards, because the site is only live at its own address once this change is published, and the switch also ends sign-in for the old app.
- **2026-10-04** — Assumed: the site is plain files with no server code, because a landing page needs none, and plain files cost nothing to serve however many people visit.
- **2026-10-04** — Assumed: a change to only the landing page still runs the starter app's checks as well, as a change to any other code folder does today, because narrowing that means changing a file every install receives. It is left for its own change.
- **2026-10-04** — Assumed: the landing page's link to look at shows beside the change's checks on GitHub, not as the main preview link, because the main link stays the starter app's and two links in one spot would make the pick a coin toss.
- **2026-10-04** — Assumed: the support email on the page keeps working after the old app is removed, because it is received by the domain, not by the app. The shutdown workspace must keep it; this is checked again before the switch.
- **2026-10-04** — Assumed: the install section gains one short line, *Works on Mac, Windows, and Linux. You need free GitHub and Cloudflare accounts.*, because the plan keeps the computers and accounts in one place so the page can show them, and the old page never named the computers. It is the only new sentence on the landing page outside the reworded questions.
- **2026-10-04** — Assumed: memory's list of areas gains one entry for the landing page, which makes this a small release that asks nothing of any install, because a check requires every set of written promises to be filed under an area, that list is sent to installs, and it already holds entries for other folders only this repo has. The other ways out were to drop the written promises or to loosen the check.
- **2026-10-04** — Check: `.github/workflows/site.yml` is a new set of checks for the landing page and switches none off, because the page did not exist in this repo before.
- **2026-10-04** — Check: `site/.oxlintrc.json` is a new file holding the same code-style rules as the starter app's, copied unchanged, because the landing page is held to the same rules.
- **2026-10-04** — Check: `site/package.json` is a new file whose test command runs the style rules, the type check, and the page tests. It leaves out the starter app's three extra limits (every line tested, no unused code, no repeated code), because the page is ported as it was and was never written to those limits; they are left for a later change.
- **2026-10-04** — Check: `site/vitest.config.ts` is a new file that sets no minimum for how much of the code the tests reach, for the same reason as `site/package.json`.
- **2026-10-04** — Check: `site/tsconfig.json` is a new file listing the landing page's two type-check settings files, because the page has no server part to list a third for.
- **2026-10-04** — Check: `site/tsconfig.app.json` is a new file with the same type-check strictness as the starter app's, copied unchanged.
- **2026-10-04** — Check: `site/tsconfig.node.json` is a new file with the same strictness as the starter app's; it also covers the test settings file.
- **2026-10-04** — Assumed: the page is saved for its automatic checks before the plan is filed away, because the last tasks can only be ticked from what those checks and the preview show. Built so far: the page, its tests, its checks, and its wiki page; the page tests have not run yet.
- **2026-10-04** — Assumed: the plan is filed in the archive for publishing, because every task is done: the automatic checks passed, the page's 56 tests included, and the preview was opened at phone and desktop width. The copy button was checked by catching what it copies, not by reading the real clipboard.
