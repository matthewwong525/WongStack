# Friendlier private pages

**Status:** ready-to-ship
**Branch:** better-api-key-input
**Open questions:** none

## Why

The page where you paste an API key feels like a developer tool. It opens straight into steps with no word on why the key is needed or whether it's safe, the promise that it stays private sits in small print at the bottom, a key with no guide shows a code name like `MAPS_API_KEY`, and the timer reads *Closes in 480 min*. Someone who has never handled a key stops there. The password page and the private form share the same plain look.

## What Changes

- **A calm start: what it's for, and that it's private.** Each private page opens with a small *Private link* label with a lock, its title, and one plain line saying the key or details stay off the chat. On the key page, the assistant adds one line saying what the key is for, such as *So your assistant can read your charges.* The steps become numbered circles, the button to the service is step 1, and the paste box is the last step, *Paste it here*, so the box reads as part of the steps, not a form. The test line says *We'll check it with api.stripe.com*.
  ```text
            BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Stripe key             │  │ (lock) Private link    │
  │                        │  │ Stripe key             │
  │ 1 [Open Stripe keys]   │  │ So your assistant can  │
  │   dashboard.stripe.com │  │ read your charges.     │
  │ 2 Tap Create restricted│  │ Goes straight to your  │
  │   key                  │  │ computer, never into   │
  │ 3 Tick Read charges    │  │ the chat.              │
  │ 4 Copy the key         │  │                        │
  │ [.............][Paste] │  │ (1) [Open Stripe keys] │
  │ Show  or pick a file   │  │    dashboard.stripe.com│
  │ Saving tests this key  │  │ (2) Tap Create         │
  │ once at api.stripe.com.│  │     restricted key     │
  │                        │  │ (3) Tick Read charges  │
  │ Each key goes straight │  │ (4) Copy the key       │
  │ to a private file on   │  │ (5) Paste it here      │
  │ your assistant's       │  │     [.........][Paste] │
  │ computer, never into   │  │     Show  pick a file  │
  │ the chat.              │  │     We'll check it with│
  │ [  Save and continue  ]│  │     api.stripe.com     │
  │ Close without          │  │                        │
  │ continuing             │  │ [  Save and continue  ]│
  │   Closes in 480 min    │  │        Not now         │
  └────────────────────────┘  │   Open until 1:30 PM   │
                              └────────────────────────┘
  ```
- **Clear good news, and a kind no.** A key that works gets a green tick beside its name. When every key is in, the page shows a big tick and *All set*. A key the service turns down says so in plain words, with what to do next, and keeps *Save anyway*.
  ```text
        SERVICE SAID NO                ALL SET
  ┌────────────────────────┐  ┌────────────────────────┐
  │ (5) Paste it here      │  │                        │
  │     [.........][Paste] │  │        ( tick )        │
  │  ! Stripe didn't take  │  │        All set         │
  │    this key. Copy it   │  │                        │
  │    again and paste it. │  │ Stripe key: works      │
  │    Save anyway         │  │                        │
  │                        │  │ Your assistant is      │
  │ [  Save and continue  ]│  │ carrying on. You can   │
  └────────────────────────┘  │ close this page.       │
                              └────────────────────────┘
  ```
- **Several keys, no code names.** Each key sits in its own card, a count says how many are saved, and a saved card shows its tick. A key the assistant gave no guide for shows a readable name made from its code name, such as *Maps API key*, with the code name small underneath for whoever set it up.
  ```text
            BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Keys for your assistant│  │ (lock) Private link    │
  │                        │  │ Two keys for your      │
  │ Stripe key             │  │ assistant              │
  │ 1 [Open Stripe's keys] │  │ 1 of 2 saved           │
  │ ...                    │  │ +--------------------+ │
  │ [.............][Paste] │  │ |(tick) Stripe key   | │
  │ -----------------------│  │ |  Works             | │
  │ MAPS_API_KEY           │  │ +--------------------+ │
  │ Google Maps key, from  │  │ +--------------------+ │
  │ console.cloud.google.  │  │ |Maps API key        | │
  │ com.                   │  │ |MAPS_API_KEY        | │
  │ [.............][Paste] │  │ |Google Maps key,    | │
  │                        │  │ |from console.cloud. | │
  │ [  Save and continue  ]│  │ |google.com.         | │
  └────────────────────────┘  │ |[...........][Paste]| │
                              │ +--------------------+ │
                              │ [  Save and continue  ]│
                              └────────────────────────┘
  ```
- **A gentler clock and a softer way out.** On the key page and the private form, the time reads *Open until 1:30 PM*, in your own time, and switches to minutes only in the last ten. *Close without continuing* and *Close without sending* become *Not now*; it still closes the link, and your assistant hears it.
  ```text
  time left     BEFORE              AFTER
  ──────────────┼───────────────────┼──────────────────
  8 hours       │ Closes in 480 min │ Open until 1:30 PM
  9 minutes     │ Closes in 9 min   │ Closes in 9 min
  ```
- **The password page and the private form match.** Both get the same label, colours, buttons, and spacing, with their privacy line moved to the top. The password page says *assistant*, not *agent*, like the others. Nothing they save or send changes.
  ```text
            BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Save logins for your   │  │ (lock) Private link    │
  │ agent                  │  │ Save logins for your   │
  │ +--------------------+ │  │ assistant              │
  │ | Drop your export   | │  │ Your file stays on     │
  │ | file here, or tap  | │  │ this device. Only the  │
  │ | to pick it         | │  │ logins you tick are    │
  │ +--------------------+ │  │ sent.                  │
  │ Keep bank and email    │  │ +--------------------+ │
  │ out, unless you trust  │  │ | Drop your export   | │
  │ the agent with them.   │  │ | file here, or tap  | │
  │ Your file never leaves │  │ | to pick it         | │
  │ this device: only the  │  │ +--------------------+ │
  │ logins you tick are    │  │ Keep bank and email    │
  │ sent.                  │  │ out, unless you trust  │
  │ Add a login ...        │  │ your assistant.        │
  │ [  Save and continue  ]│  │ Add a login ...        │
  │ [Close without contin.]│  │ [  Save and continue  ]│
  └────────────────────────┘  │        Not now         │
                              └────────────────────────┘
  ```
  ```text
            BEFORE                      AFTER
  ┌────────────────────────┐  ┌────────────────────────┐
  │ Pay for the order      │  │ (lock) Private link    │
  │ Card for the Uber Eats │  │ Pay for the order      │
  │ order                  │  │ Card for the Uber Eats │
  │ Card number            │  │ order                  │
  │ [....................] │  │ Your assistant never   │
  │ Expires   [MM] [YYYY]  │  │ sees what you type.    │
  │ Pay types these into   │  │ Card number            │
  │ the site and presses   │  │ [....................] │
  │ its button, once. Your │  │ Expires   [MM] [YYYY]  │
  │ assistant never sees   │  │ Pay types these into   │
  │ them.                  │  │ the site and presses   │
  │ [         Pay        ] │  │ its button, once.      │
  │ Close without sending  │  │ [         Pay        ] │
  │   Closes in 9 min      │  │        Not now         │
  └────────────────────────┘  │   Closes in 9 min      │
                              └────────────────────────┘
  ```

**Non-goals:** what a page saves, how a key is tested, how long a link stays open, and its safety all stay as they are. The live view for a robot check keeps its look.

## Capabilities

### New Capabilities

### Modified Capabilities

- `secrets-convention`: the key page carries an optional *what it's for* line, and a key with no guide shows a readable name beside its code name.
- `browser-logins`: every private input page (keys, passwords, private form) opens with a private-link label and its privacy promise, offers *Not now*, and, for a key link or a private form, shows its closing time as a clock time until the last ten minutes as its way out.

## Impact

- `.agents/skills/hand-over/scripts/`: `keys-page.html`/`.mjs`, `passwords-page.html`/`.mjs`, `form-page.html`/`.mjs`, a new shared `private-page.css`, `hand-over.mjs` (serves `/page.css`), `keys.mjs` (guide field `why`).
- Tests: `scripts/tests/keys-page.test.mjs`, `passwords-page.test.mjs`, `form-page.test.mjs`, `keys.test.mjs`, `hand-over.test.mjs`.
- Wiki: `wiki/development/secrets.md` (guide field), `wiki/stack/api-keys.md`, `wiki/development/passwords.md`, `wiki/development/browsing.md` (button names, time).
- `CHANGELOG.md`: a `minor` entry.

## Decision log

- **2026-10-18** — Assumed: *the review page with instructions to input API keys* means the private key link's page, because it is the page that carries a service's key steps and a paste box.
- **2026-10-18** — Asked how much the key page should change → chose guided steps: a calm top, numbered steps ending in the paste box, and a big tick when it works.
- **2026-10-18** — Asked whether the page should say what the key is for → chose yes, one line the assistant writes when it sends the link.
- **2026-10-18** — Asked whether the password page and the private form get the same look → chose all three private pages.
- **2026-10-18** — Assumed: the live view for a robot check keeps its look, because it shows the assistant's browser, takes no typing, and was not named.
- **2026-10-18** — Assumed: the three pages share one stylesheet, because three copies of one look drift apart.
- **2026-10-18** — Assumed: *Not now* replaces both close buttons, because it says the same in two soft words; it still closes the link.
- **2026-10-18** — Assumed: the time reads as a clock time and turns to minutes only in the last ten, because *480 min* reads as pressure and minutes only matter near the end.
- **2026-10-18** — Assumed: a key with no guide shows a readable name with its code name small beneath, because the code name alone looks technical but whoever set it up still needs it.
- **2026-10-18** — Assumed: *Save and continue* keeps its words, because the docs and the assistant's messages name it and it already says what happens.
- **2026-10-18** — Assumed: the lock is drawn in the page itself, with no picture file or font fetched, because the pages load nothing but their own server's files.
- **2026-10-18** — Assumed: a `minor` release, because the pages look and read differently and guides gain a field.
- **2026-10-18** — Built: dark colours are set in a dark-mode block, not with `light-dark()`, because iPhones before iOS 17.5 ignore `light-dark()` and would show white text on a white button.
- **2026-10-18** — Assumed: the guide example in the docs keeps the title *Stripe key*, not *Connect Stripe*, because the approved sketches and the spec example use it.
- **2026-10-18** — Assumed: with several keys, the page drops its *Saved 1 key. Complete the remaining keys.* line, because the *1 of 2 saved* count already says it and now announces itself to screen readers.
- **2026-10-18** — Assumed: the live tunnel check ran from this computer's browser at phone size before saving, closed with *Not now* and nothing saved, because it tests only this computer's scripts and needs no published copy.
- **2026-10-18** — Archived and saved for shipping as 43.4.0 on branch better-api-key-input, after local checks passed and a live key link was checked at phone size.
