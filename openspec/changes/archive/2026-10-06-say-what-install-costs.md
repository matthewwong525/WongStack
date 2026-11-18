<!-- openspec-archive v1 2026-10-06-say-what-install-costs -->
<!-- file proposal.md utf8 8458 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 9822 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 4882 -->
# Tasks

The table of what is true, and every sentence to print, are in design.md. Write every sentence in the wiki's voice (`wiki/voice.md`). Change nothing under `.agents/skills/wong-setup/` or in `wiki/stack/artifacts-route.md`.

Run no test before section 6: each *verify … passes* or *fails* in sections 2 to 4 is checked there, after every source and test file is written.

## 1. Base

- [x] 1.1 Confirm the branch holds 37.2.1 (pull request #326): `git merge-base --is-ancestor 00383322 HEAD`. If it does not, stop and bring `main` in through `/save`'s own step before editing; never edit the three pages on the older text. Verify `README.md` step 1 reads **Open your assistant.**
- [x] 1.2 Confirm both spec deltas still match `main`: each `MODIFIED` requirement's unchanged sentences equal `openspec/specs/landing-site/spec.md` and `openspec/specs/install-onboarding/spec.md`. Verify by reading the two side by side.

## 2. Landing page

- [x] 2.1 `site/src/install.ts`: add `PAID_COST`, `WAYS`, `ASKS_FIRST`, and `COST_LINES` by design.md - Decision 1, each `line` built from its entry's data. Extend `site/src/install.test.ts`: each way's `line` names its accounts and cost, the free way lists three computers and the paid way two, and `COST_LINES` holds the paid line and `ASKS_FIRST`. Verify the test passes.
- [x] 2.2 `site/src/Landing.tsx`: the note under the steps and the two answers by design.md - Decision 2, printing the strings from `install.ts`. Update the note test in `Landing.test.tsx` and the two answers in `App.test.tsx` to the new text. Verify both pass.
- [x] 2.3 `site/src/Site.test.tsx`: allow exactly `COST_LINES` by design.md - Decision 3, with the three assertions. Verify it passes, then verify it fails when a line such as "Our paid plan is $9 a month" is added to a page by hand, and remove that line.

## 3. README and getting started

- [x] 3.1 `README.md`: *Requirements* and the *What you get* bullet by design.md - Decision 4. Verify `git diff README.md` shows no change inside the fenced message or in step 3.
- [x] 3.2 `wiki/stack/getting-started.md`: the first sentence, the single `## What it costs` section with its table, and the hand-done list by design.md - Decision 5. Verify the page states the cost in one place only (`grep -c '\$5' wiki/stack/getting-started.md` counts lines in that section alone), the heading text is unchanged, and the sentence under the list counts the steps correctly.
- [x] 3.3 Search for any other page that states the accounts or the cost of an install: `git grep -n -i -E "free github|free tier|github and cloudflare accounts" -- README.md wiki SECURITY.md .github/CONTRIBUTING.md`. Fix a sentence that contradicts design.md's table by linking `wiki/stack/artifacts-route.md#what-it-costs`; leave the rest. Verify by reading each hit.

## 4. The guard

- [x] 4.1 Add `scripts/tests/install-cost.test.mjs` by design.md - Decision 6: the three checks on each page, a failure that names the page and `site/src/install.ts`, and the refusal test. Verify `node --test scripts/tests/install-cost.test.mjs` passes, and fails naming `wiki/stack/getting-started.md` when its cost figure is edited by hand; restore the page.
- [x] 4.2 Add the `install-cost` step to `STEPS` in `scripts/payload-checks.mjs` and to `.github/workflows/payload.yml` under `docs_only == 'true'`. Verify `node --test scripts/tests/payload-checks.test.mjs` passes, and that `.agents/skills/wong-sync/references/payload-files.json` does not name the new test.
- [x] 4.3 `wiki/maintaining/landing-page.md`: restate *No hosting offer* and add the same-change rule with the guard, by design.md - Decision 7. Verify it links `site/src/install.ts`, `site/src/Site.test.tsx`, and the new test.

## 5. Release

- [x] 5.1 Add `## Next (patch) — <Title>` at the top of `CHANGELOG.md`'s entries, in plain words: the README, the getting-started guide, and the landing page now say the same thing about what an install costs. **Updating.** Nothing needs doing by hand. Leave `VERSION` alone.

## 6. Verification

- [x] 6.0 Run the test checks sections 2 to 4 name: the site tests of 2.1 to 2.3 with 2.3's planted line, the guard of 4.1 with its edited figure, and `payload-checks.test.mjs` of 4.2. Restore every planted edit.
- [x] 6.1 Run `openspec validate "say-what-install-costs" --strict --no-interactive` and expect it valid.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` and repair what fails: it covers the payload links, the wiki checks, the script tests, and the new guard.
- [x] 6.3 In `site/`, run `npm test` and `npm run build`; expect both to pass.
- [x] 6.4 After `/save`, open the landing page's own preview (the `landing-preview` status on the commit) at phone width and at desktop width: the two ways and their cost sit under the install steps without sideways scrolling, and *Is WongStack free?* names both ways.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 3579 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give one copyable prompt that names the WongStack GitHub repository, asks the agent to install it, and includes the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The prompt SHALL name no target folder or folder to make first and SHALL work without a discovered setup slash command. The README SHALL send the person to an assistant that can work on their own computer as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL name no assistant or chat app as needed: one it names SHALL come after that neutral wording, as an example or as what the maintainer uses. Where a feature works only with a named assistant or chat app today, the README SHALL say so. It SHALL say what they need first: an AI plan of their own and a Cloudflare account, and, for each way to install, the other account it needs, the computers it works on, and what it costs. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an assistant of their own choosing to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent receives only the copied prompt without a discovered setup skill
- **THEN** the message itself supplies the guide's raw address to read and follow

#### Scenario: A reader uses another assistant

- **WHEN** someone who uses neither Claude Code nor Paseo reads the install steps and the list of what they need
- **THEN** no step tells them to get either, and they can tell which features need one of them today

#### Scenario: A reader wants to pay nothing

- **WHEN** someone reads the install section to learn what an install costs
- **THEN** they can tell which way to install is free, which is not and what it costs, and that their assistant's own plan is theirs to bring

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what each way to install costs, stated once on the page, a numbered list of every manual step (having an assistant that can work on the computer, choosing the way to install where setup asks, GitHub approval on the way that uses GitHub, tool installs, conditional Windows administrator approval, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL NOT list a named assistant or chat app as a step. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated. The README, the getting-started page, and the landing page SHALL name the same accounts, computers, and cost for each way to install.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser or a Windows permission prompt

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

#### Scenario: One page drops the cost

- **WHEN** a change removes the cost of a way to install from the README or the getting-started page and leaves the landing page as it was
- **THEN** the automatic checks fail and name the files that disagree

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/landing-site/spec.md utf8 1717 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page offers no paid hosting

The landing page and every page beside it SHALL NOT offer or mention a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and SHALL NOT name a server provider. The only cost a page names SHALL be what another company charges for an account the install uses, said with that company's name. An address the earlier hosted app served SHALL show the landing page, never an error page.

#### Scenario: Every page is read for hosting words

- **WHEN** the text of every page of the site is read
- **THEN** no WongStack plan, price, trial, subscription, sign-in, rented server, or server provider appears, and the only cost named is another company's charge for an account the install uses

#### Scenario: A visitor follows an old link

- **WHEN** a visitor opens an address the earlier hosted app used, such as its pricing or sign-in page
- **THEN** the landing page shows

## ADDED Requirements

### Requirement: The landing page says what each way to install costs

Beside its install steps, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL say which way is free. Where the page calls the install free, a visitor SHALL be able to read on the same page which way that is.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section before starting
- **THEN** they can tell that keeping everything in Cloudflare alone needs Cloudflare's paid plan and what that costs, and that the way with a GitHub account is free

<!-- end specs/landing-site/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 40711 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-say-what-install-costs</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-say-what-install-costs">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-say-what-install-costs</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A newcomer reads three places before installing, and they disagree about money. The landing page says it is free and needs GitHub. The README says a Mac or Linux install costs about $5 a month and needs no GitHub. The getting-started guide says both, a few lines apart. Someone on a Mac who pressed <i>Install for free</i> meets a &quot;$5 a month, or GitHub&quot; question halfway through setup, with no warning.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>All three places say the same two ways to install, and what each costs.</b> The free way keeps your project in a free GitHub account and runs your apps in a free Cloudflare account, on any computer. The other way keeps everything in Cloudflare alone, on Mac or Linux, on Cloudflare's paid plan, about $5 a month. On Mac or Linux setup asks which you want before anything costs money.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">          │ Free way      │ Cloudflare alone</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">──────────┼───────────────┼──────────────────</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">accounts  │ GitHub and    │ Cloudflare</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">          │ Cloudflare    │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">cost      │ free          │ about $5 a month</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">computers │ Mac, Windows, │ Mac, Linux</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">          │ Linux         │</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The landing page names Cloudflare's cost under its install steps.</b> The button still says <i>Install for free</i>, because the software is free and so is one way to install it. The line under the steps, and the answers to <i>Is WongStack free?</i> and <i>What does it cost, with AI?</i>, now name both ways.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">  BEFORE                  AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────┐ ┌──────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Install it for free  │ │ Install it for free  │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ 1 Open 2 Paste 3 Ask │ │ 1 Open 2 Paste 3 Ask │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│                      │ │                      │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ Works on Mac,        │ │ Works on Mac,        │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ Windows, and Linux.  │ │ Windows, and Linux.  │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│ You need free GitHub │ │ +Free: GitHub and    │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│ and Cloudflare       │ │ + Cloudflare.        │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│ accounts.            │ │ +Or Cloudflare alone │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│                      │ │ + on Mac or Linux:   │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│                      │ │ + about $5 a month.  │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">└──────────────────────┘ └──────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The landing page's &quot;no price&quot; rule becomes &quot;no WongStack price&quot;.</b> The page may name what another company charges for an account the install uses, and nothing else. It still offers no WongStack plan, trial, sign-in, or rented server.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The getting-started guide states the cost once.</b> Its two cost paragraphs become one section with the two ways side by side. Its list of things you do by hand marks the GitHub sign-up as the free way's step, and gains the step it left out: on Mac or Linux, turn on Cloudflare's paid plan or ask for GitHub when setup asks.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The README and the guide say you bring your own AI plan.</b> The landing page already says so; the other two did not.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>A check fails when the three drift apart again.</b> It reads the cost and the computers from the landing page's one install file and fails, naming the files, when the README or the guide stops saying them.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Changing how setup works: which way it offers first, what it asks, and what it creates all stay as they are. Changing what anything costs. The landing page's headline, pictures, and comparison table. The page that owns the detail of the two ways, which already states it correctly.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked how this fits with the chat &quot;Vision in the README and docs&quot;, which was publishing changes to the same three places → chose to keep going here, built on top of that change once live. It went live as 37.2.1 while this plan was being written.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what the landing page should say about the $5 a month, given its rule against naming a price → chose to name Cloudflare's cost there and loosen the rule to &quot;no WongStack price&quot;.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the <i>Install for free</i> button and heading stay, because the software is free and one way to install it is free, and the line under the steps now says so.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: setup's behaviour is out of scope, because on 2026-10-04 you chose keeping the project in Cloudflare as the first offer on Mac and Linux, and this fix was asked for as wording.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the README and the guide gain a line that you bring your own AI plan, because the landing page already says it and it is the largest cost a newcomer meets.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the guide's cost section links the page that owns the two ways for detail and keeps only the summary, because the wiki holds each fact in one place.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a small check guards the agreement, because the three places drifted apart within two days of the new way shipping and nothing noticed.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: this is a <code>patch</code> release, because every shipped edit is wording.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do with the finished plan → chose to build it now, with a link to look at before anything goes live.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: every test run named inside the build steps moves to the final checking phase, because all source and tests are written before any check runs; what each must show stays the same.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the site's check asks only a cost line that names a price or a paid plan to name Cloudflare, because the line saying setup asks first names neither a price nor a company; no cost line may name WongStack.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the agreement check is its own file, <code>scripts/tests/install-cost.test.mjs</code>, as the design says, because a guide-only change would not run a check kept in the landing page's test file.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-06</p>Check: <code>.github/workflows/payload.yml</code> gains an <code>install-cost</code> step that runs on wiki-only changes, because a guide-only edit skips the script suite and the cost wording could drift unseen; no check is removed or weakened.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Saved after the build: every source and test task is done and the local checks pass; left is the look at the landing page's own preview at phone and desktop width.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked whether to publish after seeing the preview → chose to publish. Archived for publishing: every task is done, the checks passed on the saved work, and the landing page's preview was looked at at phone and desktop width.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
