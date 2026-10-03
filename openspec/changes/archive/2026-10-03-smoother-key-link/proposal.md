# Smoother key link

**Status:** ready-to-ship
**Branch:** simplify-credential-input
**Open questions:** none

## Why

Giving the assistant a key takes too many hops today. The steps are in the chat, the key is on the service's website, and the paste box is on a separate link that you wait for and that closes 10 minutes after it is sent. The box carries a code name, a wrong paste goes unnoticed, and some keys can't be given at all. WongStack is only useful once your tools are connected, so connecting one should take a minute and one page.

## What Changes

- **Everything you need is on one page.** The link's page shows a plain name for the key, a button that opens the service's key page, and a few short steps, all above the paste box. The assistant writes the name and steps for that service when it sends the link, from the service's own help pages. Nothing about any one service is stored in WongStack. With no steps given, the page looks as it does now.
  ```text
             BEFORE                        AFTER
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │ Keys for your assistant  │  │ Stripe key               │
  │                          │  │                          │
  │ STRIPE_SECRET_KEY        │  │ 1 [ Open Stripe's keys ] │
  │ Secret key for the       │  │ 2 Tap Create restricted  │
  │ payments provider.       │  │   key                    │
  │ [..............] [Show]  │  │ 3 Tick Read charges      │
  │                          │  │ 4 Copy the key           │
  │                          │  │                          │
  │                          │  │ [..............] [Paste] │
  │                          │  │ Show · or pick a file    │
  │                          │  │                          │
  │ [ Save and continue ]    │  │ [ Save and continue ]    │
  │ Close without continuing │  │ Close without continuing │
  └──────────────────────────┘  │ Closes in 24 min         │
                                └──────────────────────────┘
  ```
- **The link comes straight away and stays open for 30 minutes.** The assistant sends the link in its first message, with no *Ready?* question. The link works for 30 minutes from then, up from 10, and the page shows the time left. If you haven't opened it and another private link is needed on the same computer, it closes early; the assistant then offers a new one.
  ```text
  BEFORE                 AFTER
  steps in the chat      link in the chat
        │                      │
  "Ready?"  you tap            │
        │                      │
  link sent              you open it
        │                when you're ready
  10 minutes,                  │
  then closed            30 minutes,
                         then closed
  ```
- **The key is tested the moment you save.** When the assistant knows a harmless request that proves a key works, the page tries it once and tells you what the service said, while you still have the service's page open. A key the service refuses is not saved unless you tap *Save anyway*. When no test is given, or the service can't be reached, the key is saved and the page says it was not tested. The page names the address it tests against.
  ```text
  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │ Stripe key     │  │ Stripe key     │  │ Stripe key     │
  │ Works          │  │ Stripe said no │  │ Saved          │
  │                │  │ [..........]   │  │ Not tested     │
  │ Back to your   │  │ [ Save again ] │  │ Back to your   │
  │ chat           │  │ Save anyway    │  │ chat           │
  └────────────────┘  └────────────────┘  └────────────────┘
       it works           wrong key         no test given
  ```
- **Paste with one tap, and long keys work.** A *Paste* button fills the box from your clipboard. A key that spans several lines, or comes as a small file such as Google's key file, is now accepted: paste it, or pick the file, which your device reads itself. The page shows the file's name and line count, never its content.
  ```text
  ┌────────────────────────────────┐
  │ Google key file                │
  │                                │
  │ google-key.json · 13 lines     │
  │ Pick another file              │
  │                                │
  │ [ Save and continue ]          │
  │ Close without continuing       │
  │ Closes in 24 min               │
  └────────────────────────────────┘
  ```
- **Tried at phone size before it is published.** The assistant walks the real link at a phone's width, through each state above, and shows you the pictures. You are not asked to test it yourself.
- **What stays the same.** A key still never passes through the chat, a log, or a published file. The assistant's browser still stays out of key pages: you make the key yourself. The password link and the live browser link keep their *Ready?* question and their clock. A key pasted into the chat is still saved, with the same reminder.

Non-goals: an outside connection service or tap-to-sign-in; a Connections page inside the app; the assistant's browser fetching keys; a list of what is connected; changing the password link or the live browser link.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: the key link is sent without a readiness question and stays open for 30 minutes, giving way early only while unopened; the page may carry a plain name, the service's key-page address, and steps per key; a key may be tested on save; a paste button, multi-line keys, and key files are accepted.
- `browser-logins`: when a new key value is to come back, the token-website link and steps go on the key link's page, not in the chat.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs`: `open --keys` takes `--guide <file>`; the key link's deadline is 30 minutes; an unopened key link gives way to a new `open`.
- `.agents/skills/hand-over/scripts/keys.mjs`: guide validation, the on-save test, multi-line values.
- `.agents/skills/hand-over/scripts/keys-page.html` and `keys-page.mjs`: the guided layout, paste, file pick, time left, test results.
- `scripts/tests/keys.test.mjs`, `keys-page.test.mjs`, `hand-over.test.mjs`: coverage for each.
- `wiki/development/secrets.md`, `wiki/stack/api-keys.md`, `wiki/development/passwords.md`: the new procedure and the person's version.
- `openspec/specs/secrets-convention/spec.md` and `openspec/specs/browser-logins/spec.md` via the deltas; `CHANGELOG.md` *Next (minor)* entry.
- No new dependency. Node's built-in `fetch` runs the test.

## Decision log

- **2026-10-03** — Asked which services to connect first → chose: anything, with no service-specific integrations stored in WongStack.
- **2026-10-03** — Asked who uses a connection once made → chose the assistant and the app. Saved keys already reach both; this change keeps that.
- **2026-10-03** — Asked who may hold sign-ins → chose an outside connection service, then dropped that route in the answers below.
- **2026-10-03** — Asked who signs up with Composio → answered: prefer an open-source service inside WongStack cloud, and don't want to pay.
- **2026-10-03** — Asked who on a team can use a connection → chose mine, with a share switch. Not built here: this change adds no sign-in service.
- **2026-10-03** — Asked which route to follow → answered: is Composio open source (only its connector is), then: keep API keys, give the steps in an easy format, and try the assistant's browser otherwise.
- **2026-10-03** — Asked where to plan the two parts → chose the page here and the service in a new workspace. No workspace was opened, because the later answers removed the service part.
- **2026-10-03** — Asked (in the person's own message) to drop that direction and improve the flow of what exists today → this change.
- **2026-10-03** — Asked which fixes go into the key link → chose all four: one page, link straight away with no rush, test the key, paste button and key files.
- **2026-10-03** — Asked what next → chose to plan it.
- **2026-10-03** — Assumed: the assistant's browser stays out of key pages, because the person chose to improve the existing flow and that rule was their decision on 2026-09-30.
- **2026-10-03** — Assumed: only the key link drops the *Ready?* question and starts its clock on open, because the live browser link shows a signed-in browser, where a short clock matters; the key page only takes input and never shows a saved key. The password link can follow later.
- **2026-10-03** — Assumed: an unopened link waits 30 minutes and gives way to any newer private link, because one link is open at a time on a computer and no question guards that slot any more.
- **2026-10-03** — Assumed: *More* adds 10 minutes up to 30 in all, because a sign-in with a code at the service can take longer than 10, and an open page should still close by itself.
- **2026-10-03** — Assumed: the assistant writes the name, link, and steps per request from the service's public help pages, because the person wants nothing per-service stored in WongStack.
- **2026-10-03** — Assumed: a refused key is held back until *Save anyway*, because the assistant's test can be wrong and a good key must never be blocked.
- **2026-10-03** — Assumed: the test sends the key only to the service's own secure address, named on the page, and learns only yes or no, because the key must reach nothing else.
- **2026-10-03** — Assumed: a test covers one key at a time; a pair such as an id and a secret saves untested, because pairing rules differ per service.
- **2026-10-03** — Assumed: a multi-line key is stored on one line in a form the app reads back with the same content, because every reader of the key files works line by line.
- **2026-10-03** — Assumed: the assistant does the phone-size walk itself, because on 2026-10-01 the person asked it to test rather than hand them a device check.
- **2026-10-03** — Assumed: a minor release, because the link gains behavior and no installed repo has to change anything.
- **2026-10-03** — Asked (as a note after review, on the link's clock) to just make it 30 minutes → the key link now has one limit, 30 minutes from when it is sent, with no *More* button. This replaces the two assumptions above about a clock that starts on open and added time; an unopened link still gives way to a newer one.
- **2026-10-03** — Assumed: the page takes the time from the assistant's computer, not the phone, because a phone with a wrong clock would show the link as closed.
- **2026-10-03** — Assumed: a chat whose unopened link gave way is told only that its own link closed, never the newer link's result, because the two chats share one slot.
- **2026-10-03** — Assumed: a picked key file has a *Remove* control, because a wrong file must be undoable without closing the page.
- **2026-10-03** — Assumed: built tasks 1.1–3.2; the key-link steps on the secrets page were kept short and the person's detail put on the API keys page, because that page is at its size limit.
- **2026-10-03** — Assumed: six failing tests in the server-project file are not from this change, because the same six fail on the published version on this computer.
- **2026-10-03** — Assumed: saved for the automatic checks with tasks 1.1–3.2 built and the main specs brought in line with this change; the phone-size walk (4.2) is still to do.
- **2026-10-03** — Assumed: an apostrophe inside a JSON key file is stored as its escape, because the phone-size walk showed such a file could not be saved, and the escape reads back as the same data.
- **2026-10-03** — Assumed: every task is done, because the walk at phone size passed after that fix. One thing it found is left alone: a link opened in the very second it is made can show Cloudflare's error page, which was already so before this change.
- **2026-10-03** — Resumed after the previous chat reached its weekly limit. Incorporated the published preview-check guidance, keeping both release entries; implementation and completed phone-size evidence are unchanged. Refreshed the handoff to show every task complete and reran the automatic checks before asking to publish.
- **2026-10-03** — Archived all 14 completed tasks and kept the already-synced capability specs. Numbered the minor release 29.14.0 from published 29.13.1; this checkpoint carries the archive and release through the automatic checks. The earlier phone-size walk remains the key-page evidence; real-key delivery is still an open thread.
