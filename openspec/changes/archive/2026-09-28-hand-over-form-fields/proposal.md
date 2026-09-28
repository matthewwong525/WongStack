# Fill a handed-over form from a list of its fields

**Status:** ready-to-ship
**Branch:** rigid-racoon
**Open questions:** none

## Why

When the agent hands you its browser for a card payment, you can't finish it. Paying a City of Markham parking ticket from a phone, Matthew typed the card number but couldn't pick the expiry month or year: a dropdown's list never shows in the picture, so tapping it does nothing. Typing field by field on a phone is slow, and a password manager like 1Password can't help, because it can't see the page's fields.

## What Changes

- **Every field in one list, dropdowns included.** Under the live picture, the hand-over page now lists the page's fields, each with its own box and its label: *Card number*, *Expiry month*, *Expiry year*, *Security code*. A dropdown gets its own dropdown with the page's choices, so you pick *03* on your phone and the page shows *03*. A tick box gets a tick box. What you type goes straight into the matching field on the page as you type; you then tap the page's own *Pay* button in the picture.
  ```text
       BEFORE                  AFTER
  ┌────────────────┐     ┌────────────────┐
  │ ┌────────────┐ │     │ ┌────────────┐ │
  │ │ card page  │ │     │ │ card page  │ │
  │ │ [Month ▾]  │ │     │ │ [03 ▾]     │ │
  │ └────────────┘ │     │ └────────────┘ │
  │ tap a field,   │     │ Card number    │
  │ then type here │     │ [4111 1111…  ] │
  │ [Type here…  ] │     │ Expiry month   │
  │ ⌫  Tab  Enter  │     │ [03        ▾ ] │
  │                │     │ Expiry year    │
  │ month: stuck   │     │ [2028      ▾ ] │
  │                │     │ Security code  │
  │                │     │ [•••         ] │
  │                │     │ Other typing ▸ │
  └────────────────┘     └────────────────┘
  ```
- **Your password manager fills it in one tap.** Each box is marked with what it holds (card number, expiry, security code, name on card, email, username, password, one-time code), taken from how the page itself marks the field. When the page doesn't mark it, which is common, the box is still marked, worked out from the field's name or label: *Expires End* with a month list becomes an expiry month. So 1Password, or your phone's own autofill, offers to fill the whole list at once, and each value lands in its field on the page.
- **Private as before.** The list shows only each field's label and a dropdown's choices, never what's in a field. What you type or fill goes to the page and nowhere else: it is never read back, saved, or shown to the agent, which still sees only the page's address, or whether the box it waits on is gone.
- **You say you're ready with one tap.** Before sending the link, the agent asks whether you're ready as a multiple choice, *Ready, send the link* or *Not now*, so you tap an answer instead of typing one.
- **The old way still works.** A field the list can't reach, such as one inside a payment provider's embedded box, still works by tapping it on the picture and typing under *Other typing*. On a laptop you can still click and type on the picture itself. The list refreshes itself when the page moves on, say from the password to a code page.

Non-goals: no radio buttons in the list (a tap on the picture sets them); no fields inside embedded boxes from another site; no submitting from the list; no change to when the agent hands over or how it knows you're done.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a hand-over page lists the handed page's fields, with dropdowns and tick boxes, sends each value straight into its field, and marks each box so a password manager can fill it; the hand-over tool reads field labels and choices, never values, and the agent still reads only the address or a count.

## Impact

- `.agents/skills/verify/scripts/hand-over.mjs`: the watcher's page server gains keyed `/fields`, `/focus`, `/select`, and `/check` routes; a fixed field-scan script run through `agent-browser eval`; a pure `autofillToken` that maps a field to its `autocomplete` value.
- `.agents/skills/verify/scripts/hand-over-page.mjs` and `hand-over-page.html`: the field list (a `<form>` of labelled boxes with `autocomplete`, `inputmode`, and `type`), mirrored selects and checkboxes, a serial send queue, and the old *Type here* box moved under *Other typing*.
- `scripts/tests/hand-over.test.mjs`: autofill mapping, the scan script reads no values, the new routes need the key and call only `focus`, `fill ''`, `select`, `check`, or `uncheck`, and no typed text ever reaches an agent-browser argument.
- `wiki/development/home.md` *Hand the browser over*: the field list, password-manager fill, and *Is the link safe?*.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry. WongOS gets it at its next `/wong-sync`.

## Decision log

- **2026-09-28** — Asked where to build it → chose WongStack, with WongOS picking it up at its next sync (settled in the request).
- **2026-09-28** — Assumed: the list reads each field's label, kind, `autocomplete`, name, id, and a dropdown's choices, but never a field's value, tick state, or current choice, because the request says never to read back what the person types; boxes start empty, and an empty box leaves its page field alone.
- **2026-09-28** — Assumed: typed text travels only as key presses over the live feed, as *Type here* does today, and never as an argument to an agent-browser command, because a command's arguments show in the computer's process list; the hand-over tool only focuses and clears the field first.
- **2026-09-28** — Assumed: a dropdown choice and a tick box go through agent-browser's own `select`, `check`, and `uncheck`, because they set the field reliably with the page's own change events; the choice is a short-lived local argument, which is acceptable for a menu option, unlike typed text.
- **2026-09-28** — Assumed: a box sends as you type, with no *Send* button, because the request says straight into the web and a password manager fills several boxes at once; the page sends them one at a time.
- **2026-09-28** — Assumed: adding letters at the end sends only the new letters, and any other edit clears the page field and types the whole box again, because card fields that add spaces as you type would otherwise drift out of step.
- **2026-09-28** — Assumed: the list covers the top page only, not embedded boxes from another site, and skips radio buttons, because a browser can't read into another site's box and a tap on the picture already sets a radio button; *Other typing* keeps tap-and-type for both.
- **2026-09-28** — Assumed: the page asks for the field list every 3 seconds and redraws only when it changes, keeping what's typed in boxes whose field is still there, so a login's code page appears without a reload.
- **2026-09-28** — Assumed: the list rescans right after each dropdown pick, because Matthew's screenshot shows ekashu's expiry year disabled until a month is chosen, and a disabled field isn't listed.
- **2026-09-28** — Assumed: a password field's box is a password box, and a new-password field is told apart by *new* or *confirm* in its name or label, so a password manager offers a saved login, not a new one, on a sign-in page.
- **2026-09-28** — Assumed: no new workspace, because the other part, paying the ticket, already runs in WongOS workspace neat-crab.
- **2026-09-28** — Asked in review whether a field the page leaves unmarked still gets its type → chose yes, worked out from its name or label; the bullet now says so. The mark goes on our box only, not onto the website's field, because the password manager fills our box and the agent's browser has none of its own.
- **2026-09-28** — Assumed: no *Send again* button and no automatic resend after a reload, because Matthew ran `/ship` without picking either; the box sends one way, and an edit other than adding at the end retypes the whole box.
- **2026-09-28** — Assumed: a minor release, because the hand-over gains a new way to fill forms.
- **2026-09-28** — Assumed in the build: a postal-code box keeps the letter keyboard, not the design's number pad, because a Canadian postal code has letters; and a card's security code matches *card verification*, not a bare *verification*, so a login's *Verification code* stays a one-time code.
- **2026-09-28** — Assumed in the build: after the list changes, a box keeps its content by its kind, label, and place among fields that share both, not by `ref`, because the expiry year appearing after a month pick shifts every later `ref`, and the live check lost the security code that way.
- **2026-09-28** — Built: a real hand-over over a quick tunnel paid Matthew's City of Markham ticket: the list filled the email boxes and the terms tick on the payment page, then the ekashu card page's number, expiry dropdowns, and security code, and the site confirmed the payment.
- **2026-09-28** — Asked after the ticket test how the ready question should look → Matthew chose a multiple choice before the browser opens; the *Ask first* rule in `home.md` now names the shared ask format with *Ready, send the link / Not now*, folded into this change because it is the same hand-over.
- **2026-09-28** — Archived and checkpointed for merge by `/ship` as 26.30.0; CI passed on the branch first.
