# Design

## Context

The agent's browser is Camoufox (pinned in `browse.mjs` as `CAMOUFOX`). Add-ons come only through `addons.mjs` (`browse.mjs addon <verb>`): found on addons.mozilla.org, sha256-checked, unzipped to `~/.wong-stack/camoufox/addons/<guid>/`, recorded in `addons.json` (`{ added: [...] }`), and loaded by `startArgs()` at each browser start, which also swaps in updates weekly ([password manager](../../../.agents/plugins/browser/browser/references/password-manager.md)). 1Password's slug is `1password-x-password-manager`; on this server it is added, at 8.12.41.1, and the person has signed in to it in a live view.

Today `browse.mjs` hides every `moz-extension://` frame from readings and refuses any click or typing aimed at one (`password-manager-add-on`: *The agent never uses the password manager*). The person fills from 1Password's in-page fill list in a live view.

Paths ruled out in this session, with evidence:

- *1Password for Agents* (2026-10-22) fills after the person approves on their device, but only for partner agents reviewed by 1Password; no SDK, API, or MCP route for a self-built agent ([press release](https://1password.com/press/2026/october/1password-for-agents-trust-layer-personal-ai-agents)).
- Service accounts work headless: on 2026-11-11 a scratch script with `@1password/sdk` 0.5.0 read a test vault and typed its login into a test page through `browse.mjs`'s `client`, with the password absent from `snapshot()`. The person chose not to use them: they need a key per team, new app actions, and a 4.2 MB (gzipped) WASM toolkit in the Worker. That test key is still in the primary `.env` as `OP_SERVICE_ACCOUNT_TOKEN`, undeclared; the change uses it for nothing.

## Goals / Non-Goals

**Goals:** 1Password in every agent browser by default, with removal respected; the agent signs in from the unlocked add-on only after a yes naming the login and the steps after sign-in; it reads only the offered login names and never a password; it never unlocks 1Password.

**Non-Goals:** service accounts or app changes; another password manager by default; the agent reading vault contents or settings; enforcing free-form steps in code.

## Decisions

### 1. The default add lives in `addons.mjs`, at install and at start

`addons.json` gains `defaults: { "1password-x-password-manager": "added" | "removed" | "skipped" | { failedAt } }`.

- `browse.mjs install` ends with the default add, unless a browser runs, maybe for another chat: when `defaults` has no entry for 1Password, and no added add-on is tagged `password manager`, it runs the same `addAddon(slug)` path and records `added`; with another password manager present it records `skipped`.
- `startArgs()` does the same once for a browser installed before this change, before launch, under the same rule as the weekly update: any failure (network, checksum) keeps the start going and records `failedAt`; a start a day later tries again. Its first site call gives up after 8 seconds. An older version's `declined` answer records `removed`.
- `removeAddon()` of 1Password records `removed`, so neither path adds it back. A person who later asks *add 1Password* gets it, and the entry goes back to `added`.
- The default add never stops the browser: at start it runs before launch, and an install skips it while a browser runs.

The person is not asked: the person asked for it by default, and the add has the same source and file checks as an asked one. The agent tells nothing at the add; the sign-in happens at the first sign-in turn (decision 3).

### 2. A narrow opening in the add-on guard: names, then one pick

Two verbs in `addons.mjs`, through `browse.mjs addon`:

- `addon logins` focuses the page's username box (`autocomplete` `username`/`email`, else the text box before the password box), waits up to 3 s for the password manager's in-page fill list, and reads only the entries' visible names from its frame: `BROWSE_ADDON_LOGIN=<n> | <name>` each; `BROWSE_ADDON_LOGIN=locked` when the list offers only to unlock or sign in; `BROWSE_ADDON_LOGIN=none` when no list shows or it has no entry. It keeps the frame out of the tab's refs and reads no other text from it.
- `addon pick <n>` clicks entry `n`, once, only when `addon logins` ran on the same tab and address within 2 minutes; then reads the page's password box as filled or not and prints `BROWSE_ADDON_PICKED=filled` or `BROWSE_ERROR=<reason>`. It never presses the site's submit.

The guard keeps refusing every other step aimed at a `moz-extension://` frame. The opening is in code, not the agent's choice: only these two verbs reach the frame, and only in that order. Filled password boxes already show only as filled in readings (`hideSecrets`, `browser-logins` *A page reading hides every filled secret box*).

1Password's in-page list has not been driven by a script in Camoufox. Task 1.1 checks it first. If the names can't be read or a pick doesn't fill, the build stops and returns to the person: the default add (decision 1) and the 8-hour advice can still ship alone, and the pick waits.

### 3. The order at a sign-in, in the browser skill

`.agents/skills/browser/SKILL.md` gets a short *Sign in with 1Password* rule. When a site needs a login and the browser is not signed in:

1. `addon logins`. One or more names → ask with the shared ask tool, every time: the login (a choice when several), the site, and the numbered steps after sign-in. On a yes, `addon pick <n>`, click the site's sign-in button, do only those steps; anything else asks again; outward actions keep their own yes; the end report names the steps done.
2. `locked`, `none`, no password manager, or a no → the sign-in turn as today: `addon open` first when 1Password is there, so the person signs in to or unlocks it, then fills the site and taps *Hand back*.

Code can't check that a click belongs to a named step, so the rule and the report carry it; the code enforces the order of `logins` then `pick`, one pick per ask, and that nothing else reaches the add-on. A scheduled run that reaches step 1 asks in its chat and waits.

Once signed in, the browser's session is saved as for any sign-in; later tasks reuse it with no new ask.

### 4. The advice: an 8-hour auto-lock

`ADVICE` in `addons.mjs` becomes: set the password manager to lock after 8 hours, so one unlock covers the workday; the agent never unlocks it and asks before each use. The old line (a separate vault, 5 minutes) goes: the person signs in with their own account, which holds their shared team vaults, and the yes before each use is now the guard. `wiki/development/password-manager.md` changes *Keep it safe* the same way, and its *Use it at a sign-in* gains the agent's ask and pick. `browsing.md` (158 words left) gets one clause at its sign-in step, with an equal cut.

## Risks / Trade-offs

- [1Password's in-page list can't be driven in Camoufox] → task 1.1 first; the default add and advice can ship alone.
- [An unlocked vault for 8 hours in a browser the agent drives] → the guard lets only `logins` and `pick` reach the add-on; a script the agent runs in a page could still reach page contents, as today; the ask before each use and the end report.
- [The agent strays from the named steps] → the rule, the ask-again, the outward-action yes, and the end report; code can't enforce intent.
- [A default add changes the browser's fingerprint] → as with any add-on: common on real Firefox, and the saved fingerprint doesn't change.
- [The default add fails on a dead network] → the start goes on after 8 seconds at most, and a start a day later tries again.
