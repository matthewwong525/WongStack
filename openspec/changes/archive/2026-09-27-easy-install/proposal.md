# Installing WongStack is easy

**Status:** planned
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
