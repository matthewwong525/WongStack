# Design

## Context

See proposal.md - Why. What is true today, and where each fact is owned:

| | Free way | Cloudflare alone |
|---|---|---|
| Accounts | free GitHub, free Cloudflare | Cloudflare |
| Cost | free | Cloudflare's Workers Paid plan, about $5 a month |
| Computers | Mac, Windows, Linux | Mac, Linux |
| How a person gets it | asks for GitHub, or picks it when setup asks; always on Windows | setup's first offer on Mac or Linux |

- `wiki/stack/artifacts-route.md` owns the two ways and their cost (`#what-it-costs`), and is correct. It does not change.
- `.agents/skills/wong-setup/SKILL.md` takes the Cloudflare way on Mac or Linux unless GitHub is asked for. `artifacts-route.md#setup` step 4 looks at the plan before creating anything: a free account stops and offers the paid plan or GitHub; an account already on the plan goes on. So nothing costs money before the person is asked.
- Each person brings their own assistant plan. A scheduled assistant needs the paid plan on either way (`wiki/stack/cloud-routines.md#what-it-costs`).
- The branch must hold 37.2.1 (pull request #326) before any edit: it rewrote the README's steps, the guide's hand-done list, and the landing page's first step, and this plan's spec deltas copy its requirement text.

Where the three places stand on 37.2.1:

- `README.md` step 3 already names both ways and the cost. *Requirements* says "an assistant and a Cloudflare account", lists `gh` for everyone, and names no AI plan. *What you get* says "Your own site, online for free."
- `wiki/stack/getting-started.md` states the cost twice: a **What it costs.** paragraph near the top (true) and a `## What it costs` section (says the free tier covers the starter and a GitHub account is needed). Its first sentence says "your own GitHub and Cloudflare accounts". Its hand-done list has everyone sign up for GitHub and never mentions the paid plan.
- `site/src/install.ts` has `ACCOUNTS` (GitHub, Cloudflare) and `COMPUTERS` (Mac, Windows, Linux), which describe only the free way. `Landing.tsx` prints "Works on … You need free … accounts." and two answers that name no Cloudflare cost. `Site.test.tsx` bans `paid`, `$<digit>`, `per month`, and `monthly` on every page.

## Goals / Non-Goals

**Goals:**

- One wording of the two ways, repeated the same in three places, with one home per surface.
- The landing page's ban on WongStack selling something stays as tight as it is, apart from the allowed cost lines.
- A docs-only edit that drops the cost from the guide is caught.

**Non-Goals:**

- Any change under `.agents/skills/wong-setup/`, or to `artifacts-route.md`.
- A single source file that all three surfaces render from: the README and the wiki are plain Markdown and ship to installs, and the landing page does not.

## Decisions

### 1. `install.ts` gains the ways and the cost lines

Add to `site/src/install.ts`, keeping `ACCOUNTS`, `COMPUTERS`, `computers()`, and `freeAccounts()` as they are (the "built on" list and the tests use them):

- `PAID_COST = "about $5 a month"`: the one phrase the guard looks for elsewhere.
- `WAYS`: two entries, each with `name`, `accounts`, `computers`, `cost` (`"free"` or `PAID_COST`), and `line`, the sentence the page prints:
  - *Free: your project is kept in a free GitHub account, and your apps run in a free Cloudflare account.*
  - *Or keep everything in Cloudflare alone, on Mac or Linux: Cloudflare's paid plan, about $5 a month.*
- `ASKS_FIRST = "On Mac or Linux, setup asks which you want before anything costs money."`
- `COST_LINES`: every sentence on the site that names a cost, as an array: the paid way's `line`, `ASKS_FIRST`, and the two sentences the answers add (below). `Landing.tsx` prints these strings and no other cost wording.

Build each `line` from its `accounts`, `computers`, and `cost`, so the data and the sentence can not disagree. Alternative: free text in `Landing.tsx`. Rejected: `install.ts` is the page's one home for install facts, and the site test needs the exact strings.

### 2. What the landing page prints

- **The note under the steps** becomes: *Works on Mac, Windows, and Linux.* then the two `WAYS` lines, then `ASKS_FIRST`. Two short lines read better than one long sentence at phone width; style them as the existing `.note`.
- **Is WongStack free?** keeps its answer and adds: *On Mac or Linux you can keep everything in Cloudflare alone instead, on Cloudflare's paid plan, about $5 a month.*
- **What does it cost, with AI?** keeps its answer and adds: *Cloudflare's paid plan, about $5 a month, is needed only to keep everything in Cloudflare alone or to run jobs on a schedule.*
- The button, the `Install it for free` heading, the lede, and every other answer stay.

### 3. The site test allows exactly the cost lines

In `Site.test.tsx`, before the `HOSTING` and `MONEY` patterns read a page's words, remove each `COST_LINES` string. Then assert:

- every `COST_LINES` string appears on the landing page at least once (the allowance is used, not dead);
- every one names `Cloudflare` and none names `WongStack` (another company's charge);
- the patterns still match the old hosted-app lines the test already lists.

Alternative: loosen the patterns to permit `paid` and `$5`. Rejected: any later sentence offering a paid WongStack plan would pass.

### 4. README

- *Requirements*: say the person brings an assistant on its own plan (Claude or ChatGPT, for example), and a Cloudflare account; the free way adds a free GitHub account. Mark `gh` as the free way's tool.
- *What you get*: "Your own site, online for free." becomes "Your own site, online." The cost lives in step 3.
- Step 3 and the fenced message stay byte for byte. Step 3 must keep the phrase `about $5 a month` and the words `Mac or Linux`, which the guard reads.

### 5. Getting started

- First sentence: installed from your own computer, into accounts you own, through the README's three steps. No account named.
- Delete the **What it costs.** paragraph near the top. `## What it costs` becomes the page's one statement: a two-column table of the two ways (accounts, cost, computers), one sentence that on Mac or Linux setup offers Cloudflare alone first and asks before anything costs money, one that you bring your own assistant plan, the existing sentence about scheduled assistants (paid plan, already covered on the Cloudflare way), and the free-tools sentence, with GitHub's app named as the free way's. Link `artifacts-route.md#what-it-costs` for the detail. Keep the heading's text: the anchor is the section's address.
- The hand-done list: mark the GitHub sign-up and code approval as the free way's step; add *On Mac or Linux, choose where your project is kept when setup asks: turn on Cloudflare's paid plan (browser, needs a card), or say GitHub.* Order the list by the Mac path, and fix the sentence under it that counts the steps.
- Nothing else on the page changes; teardown stays.

### 6. The agreement guard runs on docs-only changes too

New file `scripts/tests/install-cost.test.mjs`, meta-only like `landing-site.test.mjs`. It imports `PAID_COST` and `WAYS` from `site/src/install.ts` and checks `README.md` and `wiki/stack/getting-started.md`, with whitespace collapsed:

- each contains `PAID_COST`;
- each names the paid way's computers as install.ts lists them, joined with "or" (`Mac or Linux`);
- each says `free` and `GitHub` in one sentence.

A failure names the page and `site/src/install.ts`, and says to change them together. A second test feeds the same function a page without the cost and expects the refusal, as guard 1 does for the message.

It needs its own step because `script-tests` is `when: 'code'`, and a change under `wiki/` alone is docs-only. Add `{ name: 'install-cost', when: 'docs', command: 'node --test scripts/tests/install-cost.test.mjs' }` to `STEPS` in `scripts/payload-checks.mjs` and the matching step to `.github/workflows/payload.yml` under the `docs_only == 'true'` condition, beside `private-names`. On a code change the `script-tests` glob already runs it. This keeps the rule that a check runs only for its kind of file: it reads three files and installs nothing.

Alternative: add it to `landing-site.test.mjs`. Rejected: that file runs only on code changes, so the guide could drift in a wiki-only edit, which is how it drifted this time.

### 7. Maintaining guide and release

- `wiki/maintaining/landing-page.md`: *No hosting offer* restates the rule as "no WongStack price", says the cost lines live in `COST_LINES`, and that the site test allows only those. *Change what it says about installing* gains the rule that a changed cost or computer changes the README and the guide in the same change, and names the guard.
- `CHANGELOG.md`: `## Next (patch)`. **Updating.** Nothing to do by hand.
- No retired name, no new spec, no skill text: `retired-names`, `areas.json`, and the context budget are untouched.

## Risks / Trade-offs

- [Cloudflare changes its price] → one phrase in `install.ts`, and the guard names the two pages that must follow.
- [The guard matches words, not meaning] → a page could say "about $5 a month" about something else. Accepted: the guard catches a dropped or changed figure, which is the failure seen; review catches the rest.
- [The site test's allowance hides a bad line] → it removes exact strings from one exported list, and asserts each names Cloudflare and not WongStack.
- [Pull request #291 edits the same README steps and landing page words] → this lands first; #291 takes this wording when it is next brought up to date.
- [The page still says *Install for free* while the first offer on a Mac costs money] → the line directly under the steps names both ways and says setup asks first. Changing which way setup offers first is a product decision outside this change.
