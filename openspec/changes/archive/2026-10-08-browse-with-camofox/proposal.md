# Browse your accounts with camofox

**Status:** ready-to-ship
**Branch:** camofox-browser-setup
**Open questions:** none

## Why

Some sites turn the assistant's browser away, and the fallback to Cloudflare's browser adds a second browser, a login to copy across, and a rule page, yet still fails on sites like DoorDash. Camofox is one browser that more sites let in: in a trial on 2026-10-07 it opened Uber Eats 10 times out of 10 where today's browser was stopped, ran 530 steps without a crash, and kept a real Amazon login across a restart.

## What Changes

- **BREAKING: your errands run in camofox, a browser more sites let in.** Booking, ordering, and anything else the assistant does on your accounts moves to it. Checking a preview of your own app stays on today's browser.
  ```text
              │ today's   │ camofox
              │ browser   │
  ────────────┼───────────┼──────────
  Uber Eats   │ blocked   │ loads
  Amazon      │ loads     │ loads
  DoorDash    │ blocked   │ blocked
  your errands│ before    │ +now
  preview     │ stays     │ no
  checks      │           │
  ```
- **BREAKING: Cloudflare's browser is gone.** A blocked site no longer moves to a second browser, so no login is copied between two browsers and *use the cloud browser first* stops working. A site that still refuses, like DoorDash, ends as today: the assistant stops and gives you numbered steps to finish on your own device.
  ```text
    BEFORE                   AFTER
  own browser              camofox
      │ blocked               │ blocked
      ▼                       ▼
  Cloudflare's browser     steps for you
      │ blocked
      ▼
  steps for you
  ```
- **The no-disguise rule is removed.** The guides no longer say the assistant never changes how its browser looks to a site. Camofox presents itself as an ordinary browser; that is why more sites load.
- **Still yours: puzzles, passkeys, and device checks.** The assistant does not solve a *prove you are human* puzzle, and cannot give a fingerprint or approve on your phone. It stops and gives you the steps, as today.
- **BREAKING: saved passwords move to a plain file on your computer.** The password link looks and works as today. What you save now goes into one file in your home folder that only your user can read, not into today's locked store. A small program reads the file and types the login into the site; the assistant still never sees a password, and learns only *logged in* or *not accepted*.
  ```text
  you            form        program      site
   │─ login ─────▶│
   │              │─ save ─▶ file
   │                           │
   │              assistant ──▶│ "log in"
   │                           │── types ──▶│
   │              assistant ◀──│ logged in
  ```
- **This can't be undone for logins you have today: you save them again.** Passwords in today's locked store and sites you are signed in to in today's browser do not carry over. The first time an errand meets each site, the assistant sends the password link. Nothing is deleted from the old store.
- **Card details still go through the private form, and are never kept.** The form looks the same. Its button types your card straight into the site and presses the site's button once; nothing is written to a file, and the assistant sees only how it ended.
- **The first errand asks before a large download.** Camofox needs about 1.4 GB of disk and about 700 MB of memory while it runs. The assistant asks once, installs it into your home folder, and later errands start at once.
- **Two errands can run at once.** Today a second chat or a scheduled run finds the browser busy and waits. In camofox each gets its own pages and shares your logins.
- **New installs stop giving your Cloudflare key the cloud browser's permission.** A key that already has it keeps it; nothing uses it.
- **Nothing is reported to camofox's makers.** Camofox sends anonymous failure reports by default; the assistant turns that off every time it starts it.
- **What stays the same.** The password link, the private form, and the key link look and close as today. Codes still come through the chat or your email. The assistant still shows a picture at each key moment and asks before it publishes, sends, books, pays, or deletes.

Non-goals: a live view of the browser (a later change); solving puzzles; hiring a network address to get past DoorDash; moving preview checks to camofox; encrypting the passwords file; carrying old saved logins over; the unpublished practice-errands work (pull request #233).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the purpose names camofox; logins persist in the personal browser's saved state instead of a Chrome profile; passwords live in a private local file a script reads; tasks share the browser instead of taking turns; the profile, one-at-a-time, tool-guide, cloud-browser, login-carry, no-disguise, first-browser, and cloud-session requirements are removed; a refused site ends with steps for the person; the browser reports nothing to its makers; an update leaves earlier logins untouched.
- `dependencies`: camofox joins the tools a machine may need, installed on first use with a pinned browser driver.
- `cloudflare-provisioning`: the token widen no longer grants the cloud browser's permission; a token that has it keeps it.

## Impact

- New `.agents/skills/browser/scripts/browse.mjs`: installs, starts, and drives camofox (`open`, `snapshot`, `click`, `type`, `press`, `select`, `screenshot`, `get url|count|value`, `login`, `logins`, `forget`, `save`, `close`, `status`); new `scripts/tests/browse.test.mjs` with a fake camofox server.
- `.agents/skills/browser/scripts/cloud-browser.mjs` and `scripts/tests/cloud-browser.test.mjs`: deleted. `.agents/skills/browser/SKILL.md` rewritten for `browse.mjs`.
- `.agents/skills/hand-over/scripts/hand-over.mjs`, `form.mjs`, `passwords.mjs` and their tests: the browser calls go through `browse.mjs`'s client; the live-feed typing goes; passwords save to `~/.wong-stack/logins.json`.
- `wiki/development/browsing.md`, `passwords.md`, `login-codes.md`, `required-tools.md`, `README.md`; `blocked-sites.md` deleted; `.agents/skills/wong-setup/references/tools.md`; `.agents/skills/memory/references/areas.json`; `.agents/skills/wong-sync/references/payload-files.json` and the payload manifest; `scripts/retired-names.json`; `scripts/tests/fixtures/browser-pages.json`; `scripts/tests/cli-conventions.test.mjs`.
- `.agents/skills/update-dependencies/scripts/update.mjs`: knows camofox's pinned versions.
- `.agents/skills/wong-setup/scripts/provision.mjs`, `references/permission-groups.md`, `scripts/tests/fixtures/cloudflare.mjs`: the `Browser Run Write` group leaves the widen.
- New dependency on a machine, not in the repo: `@askjo/camofox-browser` 1.18.1 with `playwright-core` pinned to 1.58.x, in `~/.wong-stack/camofox/`. `agent-browser` stays for `/verify`.
- Unpublished pull request #233 (practice errands) edits the same scripts and spec; it must be reworked onto this before it publishes.
- `CHANGELOG.md` *Next (major)* entry.

## Decision log

- **2026-10-07** — Asked to look up camofox and try it in place of agent-browser → trialled it: it runs, and it disguises the browser, which the guides forbade.
- **2026-10-07** — Asked about the no-disguise rule → answered: *let's remove the rule from our docs it's a waste of space*.
- **2026-10-07** — Asked about saved passwords → answered: *just keep it in a local file for now saved somewhere*.
- **2026-10-07** — Asked about Cloudflare's browser → answered: *no need for cloudflare browser*.
- **2026-10-07** — Asked whether camofox crashes or is unreliable → ran 530 steps over 16 minutes with no crash; two faults found and worked around (the browser driver pin, and a retry for the first click after a start).
- **2026-10-07** — Asked whether logins should be headless, with the form saving to a file the assistant reads → chose headless with the form and a file, with one change he accepted: a script reads the file and types, not the assistant.
- **2026-10-07** — Asked whether a plain passwords file is acceptable → answered: *that's fine if someone can get into the machine like it's already an L*.
- **2026-10-07** — Asked how this fits with the unpublished practice-errands change (pull request #233) → chose keep going here.
- **2026-10-07** — Asked whether the live view belongs in this change → first answered *can you solve those*; told the assistant does not solve puzzles and cannot do passkeys or device checks. Asked again → chose later, as its own change.
- **2026-10-07** — Asked whether this change also removes agent-browser → told `/verify` still needs it; he first asked to move `/verify` too, *rather have fewer dependencies then carry two*, then withdrew: *actually nevermind you're right*. Preview checks stay on agent-browser. Found while checking: camofox has no way to send the extra request headers `/verify` uses to pass a preview's login wall.
- **2026-10-07** — Assumed: card details go from the form straight into the site and are never written to a file, because a card on disk outlives its one use; said in the chat, not objected to.
- **2026-10-07** — Assumed: the assistant asks once before the 1.4 GB install and puts it in the home folder, because a download that size should not start unasked and a home-folder install needs no admin password.
- **2026-10-07** — Assumed: old saved logins are left where they are and not copied, because today's store gives out no password to copy and deleting it could not be undone.
- **2026-10-07** — Assumed: two errands may run at once, because the one-at-a-time rule came from Chrome's profile lock and camofox keeps each task's pages apart; the trial ran two chats at once.
- **2026-10-07** — Assumed: new installs stop granting the cloud browser's Cloudflare permission and existing keys keep it, because a key should not hold a permission nothing uses and narrowing a live key is a separate, riskier step.
- **2026-10-07** — Assumed: camofox's failure reporting is switched off, because it names the sites a person visits to a third party, even hashed.
- **2026-10-07** — Assumed: a site camofox can't open ends with steps for the person, with no second browser and no hired network address, because he dropped Cloudflare's browser and the trial showed DoorDash refusing both.
- **2026-10-07** — Assumed: the plan's last task, save and confirm CI, is left to publishing, because `/ship` makes the one checkpoint and its gate is CI; the end-to-end check uses a public practice login, because no real account should be used unasked.
- **2026-10-07** — Check: `scripts/tests/cloud-browser.test.mjs` is deleted with `cloud-browser.mjs`, the only code it tested; every test in it was read first, and none guards a file that stays. `scripts/tests/browse.test.mjs` tests the script that replaces it.
- **2026-10-07** — Building: the tests that faked `agent-browser` in `scripts/tests/hand-over.test.mjs`, `form.test.mjs`, and `passwords.test.mjs` now run against a fake camofox server. The tests of the live feed's key presses and of stopping a blocked password save are gone with that code: a save is now one file write. Every test and check runs once, at the end of the build, not after each task.
- **2026-10-07** — Building: the private form never retries a step and never starts the browser, where the plan's one retry would apply, because a reopened page has lost what was typed, and a second press could pay twice. `login` follows the same rule.
- **2026-10-07** — Building: camofox's server keeps no log file, because camofox logs a failed typing step's detail, which can quote a password or a card number.
- **2026-10-07** — Building: `login` prints a fourth result, `typed`, for a step with no password box (an email, then *Continue*), because such a page often keeps its address and would read as *rejected*.
- **2026-10-08** — Assumed: the end-to-end check's *still logged in after a restart* step is shown by a cookie that survived a hard kill and a restart, because the public practice login site keeps no session to check; a real Amazon login survived a restart in the trial.
- **2026-10-08** — Archive checkpoint: built, tried on a real camofox (saving through a hard kill, a practice login, two sessions at once, a framed card box, no report sent), main merged in with five files resolved by hand, numbered 38.0.0.
