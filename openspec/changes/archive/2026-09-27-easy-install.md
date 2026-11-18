<!-- openspec-archive v1 2026-09-27-easy-install -->
<!-- file proposal.md utf8 7383 -->
# Installing WongStack is easy

**Status:** ready-to-ship
**Branch:** make-install-easier
**Open questions:** none

## Why

Installing takes more reading and clicking than it should. You paste a three-line prompt with a long link. You read the same steps twice, once in the README and again in a longer guide. You make the Cloudflare key by hand, through four menus and a field people miss. The README also points you to the Claude desktop app, when Paseo is the app WongStack is built around: it runs on your own computer, reaches your phone, and runs things on a schedule.

## What Changes

- **Paseo is where you chat, from the first step.** The README's first step gets you Claude Code (or Codex) and the free Paseo app, then has you open an empty folder in Paseo. The Claude desktop app isn't mentioned anymore. Setup checks for Paseo. If it's missing, setup says what Paseo is for and where to get it, then carries on. When setup is done, it tells you how to connect your phone.
  ```text
  1. Get Claude Code + Paseo
        │
        ▼
  2. Empty folder in Paseo,
     paste one line
        │
        ▼
  3. Answer a few questions:
     GitHub code, Cloudflare link
        │
        ▼
  Your assistant, a site online,
  and how to pair your phone
  ```
- **One short line to paste.** The prompt becomes one line you can read at a glance:
  ```text
  ┌──────────────────────────────┐
  │ Install WongStack in this    │
  │ folder from                  │
  │ github.com/matthewwong525/   │
  │ WongStack                    │
  └──────────────────────────────┘
  ```
  A line under it tells the agent where the setup steps live, so it finds them on its own.
- **The Cloudflare key is one link.** Setup gives you a link that opens Cloudflare's key form already filled in. You press Create, copy the key, and paste it into the chat. The four-menu route stays as a backup, in case the link ever fails.
  ```text
  ┌──────────────────────────────┐
  │ Cloudflare · Create token    │
  │ Name: WongStack              │
  │ User  · API Tokens · Edit  ✓ │
  │ Acct  · API Tokens · Edit  ✓ │
  │ Accounts: all accounts     ✓ │
  │        [ Continue ]          │
  └──────────────────────────────┘
  ```
- **The steps live in one place.** The README keeps the steps, short and plain. The Getting started guide stops repeating them. It keeps only what the README doesn't cover: what it costs, what you do by hand, what to do when something goes wrong, and how to remove it all.

Non-goals: installing the Paseo app, Claude Code, or Codex for you, since each is its own download with its own sign-in. Changing the wongstack-cloud landing page, which links to the README and gets the new steps for free. Changing what the key can do once it's made.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the README's prompt becomes one line naming the repo, with a line for the agent; the README owns the numbered steps, with Paseo first, and the walkthrough keeps only what the steps don't cover; setup points to Paseo when it's missing, and tells you how to pair a phone at the end.
- `cloudflare-provisioning`: the credentials page leads with a pre-filled token link, keeping the click path as its fallback; setup asks for the token with that link.

## Impact

- Changed: `README.md` (*Start in three steps*, *Where you chat*), `wiki/stack/getting-started.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/development/required-tools.md` (Paseo), `.agents/skills/wong-setup/SKILL.md`, `.agents/skills/wong-setup/references/tools.md`, `.agents/skills/wong-setup/references/cloudflare.md` (token ask, closing report), `.agents/skills/wong-setup/references/permission-groups.md` (template keys), `CHANGELOG.md`.
- Tests: a new check in `scripts/tests/provision.test.mjs` that the credentials page's link asks for exactly the two groups the user grants; `scripts/tests/downstream-contract.test.mjs` keeps passing, since the README still carries the raw setup link.
- Installs: `/wong-sync` brings the new wiki pages and setup text; nothing to do by hand.
- Downstream: wongstack-cloud's "Set it up yourself" button still links to the README.

## Decision log

- **2026-09-27** — Asked which parts should get easier → chose all four: the README's start steps, a shorter paste prompt, a one-click Cloudflare key, and merging the two guides.
- **2026-09-27** — Asked what the paste prompt should look like → chose one line naming the GitHub repo.
- **2026-09-27** — Asked whether the wongstack-cloud landing page changes to match → chose no, WongStack only, because the landing page links to the README.
- **2026-09-27** — Assumed: Paseo becomes the app the README sends you to, replacing the Claude desktop app, because the user said Paseo is part of setup and asked for "no more Claude Code container thing". The Claude desktop app's Code tab can run a chat in a cloud container, where memory, secrets, and schedules don't stay.
- **2026-09-27** — Assumed: the first step has you install Claude Code or Codex yourself, because Paseo runs the agent already on your computer and bundles none (paseo.sh docs: "install at least one provider CLI yourself"). The README links each one's own install page rather than copying its command.
- **2026-09-27** — Assumed: setup checks for Paseo but never stops without it, and never installs it, because the desktop app is a download with its own window, and a person running setup from another agent should still finish.
- **2026-09-27** — Assumed: the key link fills in the same two permissions as today, is named "WongStack", and covers all accounts, because Cloudflare's template links support this (developers.cloudflare.com, *Create API token*), and "all accounts" removes the field people miss. A person with two accounts is still asked which one to use, as today.
- **2026-09-27** — Assumed: the template link's permission keys get checked on a real Cloudflare dashboard before this ships, because Cloudflare's docs list no key for the two token groups.
- **2026-09-27** — Assumed: the README keeps the raw setup link on the agent line, because a test and the hosted setup read it from the README.
- **2026-09-27** — Assumed: a minor release that ships on its own, not waiting for the server-installer plan in chatty-cheetah, because the two touch different files.
- **2026-09-27** — Asked whether the key link's form showed both rows, all accounts, and the name WongStack on a real Cloudflare dashboard → chose yes, so the keys are `api_tokens` (user) and `account_api_tokens` (account).
- **2026-09-27** — Assumed: the closing line says you get the steps to pair your phone, not a connected phone, because pairing is a step the person takes in Paseo.
- **2026-09-27** — Distilled: no repeatable fact beyond this change's own pages (the template keys live in `permission-groups.md`, Paseo's place in `required-tools.md`).
- **2026-09-27** — Archive checkpoint: built, archived, merged with main (26.16.1, 26.17.0), and numbered 26.18.0 by /ship.

<!-- end proposal.md -->
<!-- file design.md utf8 5851 -->
# Design

## Context

The README's *Start in three steps* sends people to the Claude desktop app and has them paste a three-line prompt with the raw `wong-setup/SKILL.md` address. [`wiki/stack/getting-started.md`](../../../wiki/stack/getting-started.md) repeats those steps as five. The token is made by the click path on [`cloudflare-credentials.md`](../../../wiki/stack/cloudflare-credentials.md#create-the-token), which [`wong-setup/SKILL.md`](../../../.agents/skills/wong-setup/SKILL.md) and [`cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md) quote when they ask for it. [`required-tools.md`](../../../wiki/development/required-tools.md) calls Paseo optional; setup adds presets only when `paseo` is installed.

Two constraints shape this. Paseo runs the agent CLIs already on the computer and bundles none (paseo.sh docs). And `scripts/tests/downstream-contract.test.mjs` requires at least one raw `…/refs/heads/main/<path>` address in the README that names a tracked file, because hosted setups read it.

## Goals / Non-Goals

**Goals:**

- A newcomer reads three short steps and one line to paste.
- The token is made from one link, and a test holds that link to the two groups in [`permission-groups.md`](../../../.agents/skills/wong-setup/references/permission-groups.md#what-the-user-grants).

**Non-Goals:**

- Installing Paseo, Claude Code, or Codex from setup.
- Changing the widen, the account choice, or the failure map's token messages.

## Decisions

- **The prompt names the repo; an agent line carries the raw address.** Prompt: `Install WongStack in this folder from github.com/matthewwong525/WongStack`. Right under the box, one italic line: *For the agent: read and follow `https://raw.githubusercontent.com/matthewwong525/WongStack/refs/heads/main/.agents/skills/wong-setup/SKILL.md`.* An agent that opens the repo reads the README and finds it; setup already handles a pasted URL ([Get the latest source](../../../.agents/skills/wong-setup/SKILL.md#get-the-latest-source)). Alternative: keep the raw address in the prompt; reliable, but the long line is what we're removing. Alternative: a root `INSTALL.md`; another page to find, and it would repeat the steps.
- **Step 1 is Claude Code (or Codex) and Paseo.** The README links Claude Code's and Codex's own install pages and paseo.sh, rather than copying their install commands, which drift. *Where you chat* leads with Paseo on the computer and the phone; the Claude desktop app line goes. The "other agents" line stays, one sentence.
- **Setup checks `paseo` in [`tools.md`](../../../.agents/skills/wong-setup/references/tools.md), outside the blocking table.** A new short section after the tools: `command -v paseo`; missing → one plain sentence and the paseo.sh link, then continue. The closing report (runbook Step 5) already names the presets; it adds one line when Paseo is present: pair a phone from Paseo's **Settings → your host → Pair Device**. Alternative: install `@getpaseo/cli` with npm, as `server/setup.sh` does; a laptop wants the desktop app, which bundles the daemon, and a second daemon would clash.
- **The token link is a Cloudflare user-token template URL.** `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=<encoded>&accountId=*&zoneId=all&name=WongStack`, where `<encoded>` is the URL-encoded `[{"key":"<user API Tokens key>","type":"edit"},{"key":"<account API Tokens key>","type":"edit"}]`. The two keys are unknown from docs, so task 1.1 finds them on a real dashboard and records them in a *Key* column of *What the user grants*. `accountId=*` grants all accounts, so Account Resources can't be left unset; [the account choice](../../../.agents/skills/wong-setup/references/cloudflare.md) still asks when the token sees two. `zoneId=all` is required by the format and grants nothing, since neither group is zone-scoped. The widen keeps the `resources` block as is, so an all-accounts block survives.
- **A test decodes the link.** `provision.test.mjs` already pins the script's groups to `permission-groups.md`; it gains a test that finds the template URL on `cloudflare-credentials.md`, decodes `permissionGroupKeys`, and asserts the two keys from the table, `type: edit`, `accountId=*`, and `name=WongStack`. A key edited on one page and not the other fails.
- **The README owns the steps; getting-started keeps the rest.** Getting started drops *The five steps* and *You don't need to have built anything yet*, and links the README's steps from its first lines. It keeps *What you'll end up with*, *What it costs*, *After that*, the manual-steps list (now: install Claude Code or Codex, get Paseo, GitHub, tools, Cloudflare, the key), the login wall, *When something goes wrong*, and teardown. Anchors other pages link (`#teardown` and the like) keep their exact heading text.

## Risks / Trade-offs

- [Cloudflare drops or renames template keys, so the form opens with rows missing] → the credentials page says to check the two rows before Create, and the click path stays beside the link; the failure map still names a missing permission.
- [An agent given only the repo name never opens the README] → the prompt names the full repo address; setup's own path from a pasted URL clones it. The raw address stays on the agent line for agents that read the page.
- [Step 1 now needs Claude Code's installer, which may open a terminal] → the README says so plainly and links the vendor's page; it's the one terminal moment, before the chat exists.
- [All-accounts reach is wider than one account] → it matches what a person selecting their only account gets today, and the widen already made the token account-root; the credentials page's trade-off section covers it.

## Migration Plan

None for installs: `/wong-sync` brings the new wiki pages and setup text, with no hand step.

<!-- end design.md -->
<!-- file tasks.md utf8 2779 -->
# Tasks

## 1. The token link

- [x] 1.1 Find the template keys for `API Tokens Write` (user) and `Account API Tokens Write` (account): build the URL, open it signed in to a real Cloudflare account, and confirm the form shows exactly those two rows with Edit, all accounts, and the name `WongStack`. Add a *Key* column to *What the user grants* in `.agents/skills/wong-setup/references/permission-groups.md`.
- [x] 1.2 In `wiki/stack/cloudflare-credentials.md`, lead *Create the token* with the link: open it, check the two rows, Create, copy (shown once). Keep the click path below it as the fallback, with the Account Resources callout; keep the heading text.
- [x] 1.3 In `scripts/tests/provision.test.mjs`, decode the link from the credentials page and assert the two keys from the table, `type: edit`, `accountId=*`, `zoneId=all`, and `name=WongStack`; run it with `TMPDIR=/var/tmp`.

## 2. Setup skill

- [x] 2.1 In `.agents/skills/wong-setup/SKILL.md` (*Get the Cloudflare token*) and `references/cloudflare.md` (the token ask), give the link from the credentials page first and the click path as fallback, linking that page rather than copying the URL.
- [x] 2.2 In `references/tools.md`, add a short Paseo check after the tools: `command -v paseo`; missing → one plain sentence on what it's for with the paseo.sh link, then continue; never install it, never stop.
- [x] 2.3 In `references/cloudflare.md` Step 5, add the phone line when Paseo is present: *Settings → your host → Pair Device*.

## 3. README and wiki

- [x] 3.1 Rewrite the README's *Start in three steps*: 1 get Claude Code or Codex (their own install pages) and the Paseo app; 2 open an empty folder in Paseo and paste `Install WongStack in this folder from github.com/matthewwong525/WongStack`, with the agent line carrying the raw `wong-setup/SKILL.md` address; 3 answer a few questions, with the GitHub code and the Cloudflare link. Rewrite *Where you chat* with Paseo first and no Claude desktop app. Verify `node --test scripts/tests/downstream-contract.test.mjs` passes.
- [x] 3.2 Trim `wiki/stack/getting-started.md`: link the README's steps at the top, drop the repeated steps, and update the manual-steps list and *When something goes wrong* for the link. Keep every heading another page links to.
- [x] 3.3 In `wiki/development/required-tools.md`, say Paseo is where you chat and setup points to it, and that WongStack still never installs it on your computer.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Installing WongStack is easy` entry to `CHANGELOG.md`, with no hand step in its **Updating.** note.
- [x] 4.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`; `/save` runs the full gate in CI.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 945 -->
## MODIFIED Requirements

### Requirement: The credentials page owns the token

The `wiki/stack/` credentials page SHALL give a link that opens Cloudflare's token form pre-filled with exactly the two groups the user grants, all accounts, and the name `WongStack`. It SHALL keep the exact click path as the fallback, calling out the Account Resources field. It SHALL name the variables in `.env` as `.env.example` does, state that providing the token pre-authorizes the widen, and state plainly that a self-widening token is effectively account-root.

#### Scenario: Reading the trade-off

- **WHEN** a reader reaches the widen section
- **THEN** it states the account-root cost beside the pre-authorization and how to narrow back

#### Scenario: The link asks for only the two groups

- **WHEN** the token link on the credentials page is decoded
- **THEN** it names only the user and account API token groups, with edit access, for all accounts

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 3140 -->
## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give a one-line prompt that names the WongStack GitHub repository and asks the agent to install it in the open folder. Next to it, a line addressed to the agent SHALL give the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The README SHALL send the person to Paseo, running Claude Code or Codex on their own computer, as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL say to start in an empty folder, with a free GitHub account and a free Cloudflare account.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first

#### Scenario: The agent finds the runbook

- **WHEN** an agent is given only the one-line prompt and reads the repository's README
- **THEN** it finds the setup runbook's raw address there and follows it

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what it costs, a numbered list of every manual step (the agent install, Paseo, GitHub approval, tool installs, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

### Requirement: Setup waits for the Cloudflare token

Setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

## ADDED Requirements

### Requirement: Setup points the person to Paseo

When getting the computer ready, setup SHALL check whether Paseo is installed. When it is missing, setup SHALL say in plain words what Paseo is for (chatting from the phone, schedules, a workspace per part) and where to get it, then continue; Paseo's absence SHALL NOT stop setup, and setup SHALL NOT install Paseo. When Paseo is present, the closing report SHALL say how to connect a phone.

#### Scenario: Paseo is missing

- **WHEN** setup runs on a computer without Paseo
- **THEN** it names Paseo, what it is for, and where to get it, and finishes the install

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39254 fence=~~~ -->
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
<title>Review · 2026-09-27-easy-install</title>
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
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-easy-install">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-easy-install</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Installing takes more reading and clicking than it should. You paste a three-line prompt with a long link. You read the same steps twice, once in the README and again in a longer guide. You make the Cloudflare key by hand, through four menus and a field people miss. The README also points you to the Claude desktop app, when Paseo is the app WongStack is built around: it runs on your own computer, reaches your phone, and runs things on a schedule.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Paseo is where you chat, from the first step.</b> The README's first step gets you Claude Code (or Codex) and the free Paseo app, then has you open an empty folder in Paseo. The Claude desktop app isn't mentioned anymore. Setup checks for Paseo. If it's missing, setup says what Paseo is for and where to get it, then carries on. When setup is done, it tells you how to connect your phone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">1. Get Claude Code + Paseo</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">2. Empty folder in Paseo,</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">   paste one line</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">3. Answer a few questions:</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">   GitHub code, Cloudflare link</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">Your assistant, a site online,</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">and how to pair your phone</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>One short line to paste.</b> The prompt becomes one line you can read at a glance: A line under it tells the agent where the setup steps live, so it finds them on its own.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">│ Install WongStack in this    │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ folder from                  │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ github.com/matthewwong525/   │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ WongStack                    │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The Cloudflare key is one link.</b> Setup gives you a link that opens Cloudflare's key form already filled in. You press Create, copy the key, and paste it into the chat. The four-menu route stays as a backup, in case the link ever fails.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ Cloudflare · Create token    │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Name: WongStack              │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ User  · API Tokens · Edit  ✓ │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ Acct  · API Tokens · Edit  ✓ │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ Accounts: all accounts     ✓ │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│        [ Continue ]          │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">└──────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The steps live in one place.</b> The README keeps the steps, short and plain. The Getting started guide stops repeating them. It keeps only what the README doesn't cover: what it costs, what you do by hand, what to do when something goes wrong, and how to remove it all.</div></div></li>
</ol>
<p class="aside">Non-goals: installing the Paseo app, Claude Code, or Codex for you, since each is its own download with its own sign-in. Changing the wongstack-cloud landing page, which links to the README and gets the new steps for free. Changing what the key can do once it's made.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which parts should get easier → chose all four: the README's start steps, a shorter paste prompt, a one-click Cloudflare key, and merging the two guides.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what the paste prompt should look like → chose one line naming the GitHub repo.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether the wongstack-cloud landing page changes to match → chose no, WongStack only, because the landing page links to the README.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: Paseo becomes the app the README sends you to, replacing the Claude desktop app, because the user said Paseo is part of setup and asked for &quot;no more Claude Code container thing&quot;. The Claude desktop app's Code tab can run a chat in a cloud container, where memory, secrets, and schedules don't stay.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the first step has you install Claude Code or Codex yourself, because Paseo runs the agent already on your computer and bundles none (paseo.sh docs: &quot;install at least one provider CLI yourself&quot;). The README links each one's own install page rather than copying its command.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: setup checks for Paseo but never stops without it, and never installs it, because the desktop app is a download with its own window, and a person running setup from another agent should still finish.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the key link fills in the same two permissions as today, is named &quot;WongStack&quot;, and covers all accounts, because Cloudflare's template links support this (developers.cloudflare.com, <i>Create API token</i>), and &quot;all accounts&quot; removes the field people miss. A person with two accounts is still asked which one to use, as today.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the template link's permission keys get checked on a real Cloudflare dashboard before this ships, because Cloudflare's docs list no key for the two token groups.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the README keeps the raw setup link on the agent line, because a test and the hosted setup read it from the README.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release that ships on its own, not waiting for the server-installer plan in chatty-cheetah, because the two touch different files.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether the key link's form showed both rows, all accounts, and the name WongStack on a real Cloudflare dashboard → chose yes, so the keys are <code>api_tokens</code> (user) and <code>account_api_tokens</code> (account).</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the closing line says you get the steps to pair your phone, not a connected phone, because pairing is a step the person takes in Paseo.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact beyond this change's own pages (the template keys live in <code>permission-groups.md</code>, Paseo's place in <code>required-tools.md</code>).</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint: built, archived, merged with main (26.16.1, 26.17.0), and numbered 26.18.0 by /ship.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
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
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
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
