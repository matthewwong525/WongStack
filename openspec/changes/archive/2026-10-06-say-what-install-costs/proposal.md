# Every front page says the same thing about what an install costs

**Status:** ready-to-ship

**Branch:** nontechnical-user-readiness

**Open questions:** none

## Why

A newcomer reads three places before installing, and they disagree about money. The landing page says it is free and needs GitHub. The README says a Mac or Linux install costs about $5 a month and needs no GitHub. The getting-started guide says both, a few lines apart. Someone on a Mac who pressed *Install for free* meets a "$5 a month, or GitHub" question halfway through setup, with no warning.

## What Changes

- **All three places say the same two ways to install, and what each costs.** The free way keeps your project in a free GitHub account and runs your apps in a free Cloudflare account, on any computer. The other way keeps everything in Cloudflare alone, on Mac or Linux, on Cloudflare's paid plan, about $5 a month. On Mac or Linux setup asks which you want before anything costs money.
  ```text
            │ Free way      │ Cloudflare alone
  ──────────┼───────────────┼──────────────────
  accounts  │ GitHub and    │ Cloudflare
            │ Cloudflare    │
  cost      │ free          │ about $5 a month
  computers │ Mac, Windows, │ Mac, Linux
            │ Linux         │
  ```
- **The landing page names Cloudflare's cost under its install steps.** The button still says *Install for free*, because the software is free and so is one way to install it. The line under the steps, and the answers to *Is WongStack free?* and *What does it cost, with AI?*, now name both ways.
  ```text
    BEFORE                  AFTER
  ┌──────────────────────┐ ┌──────────────────────┐
  │ Install it for free  │ │ Install it for free  │
  │ 1 Open 2 Paste 3 Ask │ │ 1 Open 2 Paste 3 Ask │
  │                      │ │                      │
  │ Works on Mac,        │ │ Works on Mac,        │
  │ Windows, and Linux.  │ │ Windows, and Linux.  │
  │ You need free GitHub │ │ +Free: GitHub and    │
  │ and Cloudflare       │ │ + Cloudflare.        │
  │ accounts.            │ │ +Or Cloudflare alone │
  │                      │ │ + on Mac or Linux:   │
  │                      │ │ + about $5 a month.  │
  └──────────────────────┘ └──────────────────────┘
  ```
- **The landing page's "no price" rule becomes "no WongStack price".** The page may name what another company charges for an account the install uses, and nothing else. It still offers no WongStack plan, trial, sign-in, or rented server.
- **The getting-started guide states the cost once.** Its two cost paragraphs become one section with the two ways side by side. Its list of things you do by hand marks the GitHub sign-up as the free way's step, and gains the step it left out: on Mac or Linux, turn on Cloudflare's paid plan or ask for GitHub when setup asks.
- **The README and the guide say you bring your own AI plan.** The landing page already says so; the other two did not.
- **A check fails when the three drift apart again.** It reads the cost and the computers from the landing page's one install file and fails, naming the files, when the README or the guide stops saying them.

**Non-goals:** Changing how setup works: which way it offers first, what it asks, and what it creates all stay as they are. Changing what anything costs. The landing page's headline, pictures, and comparison table. The page that owns the detail of the two ways, which already states it correctly.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-site`: the no-paid-hosting rule narrows to WongStack's own offers, so the page may name another company's charge for an account the install uses; a new requirement makes the page say what each way to install needs and costs.
- `install-onboarding`: the README says what a person needs for each way to install, their own AI plan included, in place of "a free GitHub account and a free Cloudflare account"; the walkthrough states the cost once, lists the GitHub steps as the free way's, and lists choosing the way as a hand step; the README, the walkthrough, and the landing page agree.

## Impact

- **Landing page (meta-only)**: `site/src/install.ts` gains the two ways and their cost lines; `site/src/Landing.tsx` reads them in the install note and two answers; `site/src/Site.test.tsx` allows exactly those lines; `site/src/install.test.ts`, `Landing.test.tsx`, and `App.test.tsx` follow.
- **README**: *Requirements* names the AI plan and says `gh` is for the free way. Step 3 already states both ways and stays. The fenced install message is unchanged.
- **Wiki (payload)**: `wiki/stack/getting-started.md`. `wiki/maintaining/landing-page.md` (meta-only) restates the no-hosting rule and the new guard.
- **Check**: `scripts/tests/landing-site.test.mjs` gains the agreement guard.
- **Release**: a `patch` changelog entry; nothing for an install to do by hand.
- **Overlap**: pull request #291 (`run-without-paseo`) edits the same README steps and landing page words. This change lands on top of 37.2.1; #291 takes this wording when it is next brought up to date.

## Decision log

- **2026-10-06** — Asked how this fits with the chat "Vision in the README and docs", which was publishing changes to the same three places → chose to keep going here, built on top of that change once live. It went live as 37.2.1 while this plan was being written.
- **2026-10-06** — Asked what the landing page should say about the $5 a month, given its rule against naming a price → chose to name Cloudflare's cost there and loosen the rule to "no WongStack price".
- **2026-10-06** — Assumed: the *Install for free* button and heading stay, because the software is free and one way to install it is free, and the line under the steps now says so.
- **2026-10-06** — Assumed: setup's behaviour is out of scope, because on 2026-10-04 you chose keeping the project in Cloudflare as the first offer on Mac and Linux, and this fix was asked for as wording.
- **2026-10-06** — Assumed: the README and the guide gain a line that you bring your own AI plan, because the landing page already says it and it is the largest cost a newcomer meets.
- **2026-10-06** — Assumed: the guide's cost section links the page that owns the two ways for detail and keeps only the summary, because the wiki holds each fact in one place.
- **2026-10-06** — Assumed: a small check guards the agreement, because the three places drifted apart within two days of the new way shipping and nothing noticed.
- **2026-10-06** — Assumed: this is a `patch` release, because every shipped edit is wording.
- **2026-10-06** — Asked what to do with the finished plan → chose to build it now, with a link to look at before anything goes live.
- **2026-10-06** — Assumed: every test run named inside the build steps moves to the final checking phase, because all source and tests are written before any check runs; what each must show stays the same.
- **2026-10-06** — Assumed: the site's check asks only a cost line that names a price or a paid plan to name Cloudflare, because the line saying setup asks first names neither a price nor a company; no cost line may name WongStack.
- **2026-10-06** — Assumed: the agreement check is its own file, `scripts/tests/install-cost.test.mjs`, as the design says, because a guide-only change would not run a check kept in the landing page's test file.
- **2026-10-06** — Check: `.github/workflows/payload.yml` gains an `install-cost` step that runs on wiki-only changes, because a guide-only edit skips the script suite and the cost wording could drift unseen; no check is removed or weakened.
- **2026-10-06** — Saved after the build: every source and test task is done and the local checks pass; left is the look at the landing page's own preview at phone and desktop width.
- **2026-10-06** — Asked whether to publish after seeing the preview → chose to publish. Archived for publishing: every task is done, the checks passed on the saved work, and the landing page's preview was looked at at phone and desktop width.
