<!-- openspec-archive v1 2026-09-28-hand-over-form-fields -->
<!-- file proposal.md utf8 9778 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 10479 -->
# Design

## Context

See [proposal.md](proposal.md) for why. Today `hand-over.mjs open` spawns a detached watcher that serves the hand-over page and pipes `/stream?key=` to agent-browser's live feed; the page sends `input_mouse` and `input_keyboard` over it (agent-browser 0.38.1's `skill-data/core/references/streaming.md`). The watcher's only browser reads are `get url` and `get count`.

A native `<select>` can't be set from the picture: headless Chrome draws its open list as a separate popup widget that the screencast never captures, so a tap opens a list nobody sees. Matthew confirmed it on ekashu's card page: clicking *Expires End* shows nothing. The fix has to set dropdowns from outside the picture, and once the page lists fields for that, text boxes and password-manager fill come almost free.

## Goals / Non-Goals

**Goals:**
- Set a native dropdown from a phone.
- List the top page's fillable fields as labelled boxes that a password manager recognises.
- Keep typed text off every command line, file, and log; keep the agent's view to the result.

**Non-Goals:**
- Fields inside cross-origin iframes (Stripe-style embedded card boxes): the browser won't let a top-page script see them.
- Radio groups, file pickers, date pickers beyond a plain text box, and custom JavaScript dropdowns that aren't a `<select>`: tap them on the picture.
- Any change to `open`'s flags, the finish checks, or the 10-minute deadline.

## Decisions

### Scan the fields with one fixed `eval` script that reads no values

The watcher runs `agent-browser eval <FIELD_SCAN> --json`, where `FIELD_SCAN` is a constant in `hand-over.mjs`. It walks the top document's `input`, `select`, and `textarea` elements in DOM order and returns, per field: `kind` (`text`, `select`, `checkbox`), input `type`, `label`, the `autocomplete`, `name`, and `id` attributes, `placeholder`, `required`, and for a select its options as `{ value: getAttribute('value') ?? text, text }`. It builds a selector per field: `#id` when the id is unique (via `CSS.escape`), else a `:nth-of-type` path from `body`.

It skips fields that are hidden (no client rects), disabled, or read-only, and input types `hidden`, `submit`, `button`, `reset`, `image`, `file`, `radio`, `range`, and `color`, and caps the list at 40 fields. The label comes from the first of `labels[0]`, `aria-label`, `aria-labelledby`, `placeholder`, `name`, trimmed to 80 characters.

It never touches `.value`, `.checked`, `.selectedIndex`, `.selected`, or `.defaultValue`; a test greps the constant for them.

- *Rejected:* `agent-browser snapshot -i`, because its accessibility tree includes each textbox's value.
- *Rejected:* tagging fields with `data-` attributes, because it changes the person's page and a site's script might notice.

### The page names a field by `ref`; the watcher owns the selector

`/fields` returns each field as `{ ref, kind, type, label, autocomplete, inputmode, options }` with `ref` an index into the watcher's last scan, plus a `signature` (a SHA-256 of the list). The watcher keeps `ref → selector` in memory. `/focus`, `/select`, and `/check` accept only a `ref` from the current scan, so the hand-over page can never make the watcher run a selector it invented. A stale `ref` (the page re-rendered) answers 409; the page rescans and retries once.

### Four keyed routes on the existing page server

| Route | Body | agent-browser calls | Reply |
|---|---|---|---|
| `GET /fields` | none | `eval FIELD_SCAN` | `{ signature, fields }` |
| `POST /focus` | `{ ref }` | `fill <sel> ""`, then `focus <sel>` | `{ ok }` |
| `POST /select` | `{ ref, value }` | `select <sel> <value>` | `{ ok }` |
| `POST /check` | `{ ref, checked }` | `check <sel>` or `uncheck <sel>` | `{ ok }` |

Each route checks the key from an `x-hand-over-key` header with `keyMatches`: a header, not the query, so the key stays out of any access log in between. Bodies are JSON up to 4 KB; the route replies 403 without the key and 400 on a bad body. `select`'s value must be one of that field's scanned option values. Route calls run through one serial queue, so two quick picks can't interleave. Nothing is logged, and no reply carries a field value.

### Typed text travels only as key presses

A text box sends as the person types, by a pure `sendPlan(sent, now, focused)` in `hand-over-page.mjs`:

- **This field is focused and `now` starts with `sent`:** press only the new characters over the stream, as *Type here* does today.
- **Otherwise (a new field, a deletion, or a whole value dropped in by autofill):** `POST /focus` clears and focuses the field, then press every character of `now`.

A plain Backspace diff is avoided because card fields that insert spaces put the page field out of step with the box. A page-level queue runs one box at a time, so a password manager filling five boxes lands five fields in turn. Enter in a box presses Enter in its field. A tap or click on the picture forgets which field is focused, so the next keystroke in the list refocuses first.

- *Rejected:* `agent-browser fill <sel> <text>`, because the card number would sit in a process's arguments, visible to anything that lists processes.
- *Rejected:* setting `.value` from `eval`, for the same reason, and because it skips the key events that masked inputs rely on.

Dropdown choices and tick boxes go through `select`, `check`, and `uncheck`: they fire the page's own `input` and `change` events, and a menu option is not secret the way typed text is.

### Mark each box for autofill with a pure `autofillToken(field)`

`autofillToken` lives in `hand-over.mjs`, and `/fields` sends its result:

1. **The page field's own `autocomplete`** wins when its last word is a known token (`section-*`, `billing`, and `shipping` are dropped; `on` and `off` are ignored).
2. **Otherwise, the first rule that matches** the name, id, label, and placeholder, lowercased and joined:

   | Token | Matches |
   |---|---|
   | `cc-number` | card number, `cardnum`, `ccnum`, `pan` |
   | `cc-csc` | cvv, cvc, csc, security code, verification |
   | `cc-exp-month` | exp and month, `mm` |
   | `cc-exp-year` | exp and year, `yy` |
   | `cc-exp` | expiry, expiration, `mm/yy` |
   | `cc-name` | name on card, cardholder |
   | `one-time-code` | otp, one-time, verification code, 2fa |
   | `new-password` | password with new or confirm |
   | `current-password` | password |
   | `email` | email |
   | `username` | user, login |
   | `tel` | phone, mobile, tel |
   | `postal-code` | postal, zip |
   | `address-line1` | address, street |
   | `address-level2` | city, town |
   | `country` | country |
   | `given-name` | first name |
   | `family-name` | last name, surname |
   | `name` | full name |

3. **Otherwise the input type**: `email` → `email`, `tel` → `tel`, `password` → `current-password`.
4. **Otherwise** no token.

The box's `type` follows the token (`password` for either password token, `email`, `tel`, else `text`), and `inputmode="numeric"` goes on `cc-number`, `cc-csc`, `one-time-code`, and `postal-code`. Each box also gets `name` equal to its token and a `<label for>`, the cues 1Password and iOS autofill read.

### Refresh by polling, keep what's typed

The page fetches `/fields` on load, right after each dropdown pick or tick, and every 3 seconds while the tab is visible. The rescan after a pick matters: ekashu's expiry year stays disabled until a month is chosen, and a disabled field is left out of the list. It redraws only when `signature` changes, carrying each box's content over by `ref` and label. It stops when the link closes.

## Risks / Trade-offs

- **[A password manager won't fill a mirrored `<select>` whose values it doesn't expect, such as `3` against `03`]** → The page puts the page's option text in each option and keeps the option's value. The live check covers Chrome autofill; a real 1Password fill stays an open memory thread.
- **[iOS offers card autofill only on HTTPS]** → Quick-tunnel links are HTTPS; `--local` is for the laptop the agent runs on.
- **[A label can hold personal text, such as *Card ending 1234*]** → It goes only to the person's own hand-over page, never to the agent, a file, or a log.
- **[A React page re-renders and a selector goes stale]** → A 409 triggers a rescan and one retry; after that the box shows *Tap it on the page instead*.
- **[A dropdown value is briefly visible in the process list]** → Accepted for menu options (see the decision above); typed text never is.
- **[Scanning every 3 seconds on a heavy page]** → The scan is one `querySelectorAll` pass; the watcher skips a scan while one is still running.

## Migration Plan

This is a payload release with a `## Next (minor)` changelog entry. WongOS and other installs get it at their next `/wong-sync`, and it needs no hand step. To roll back, revert the change; the page falls back to today's *Type here*.

## UX

### Use-case brief

Who: the business owner, usually on a phone, mid-errand, handed the agent's browser for a login or a payment. The job: fill a form they can see but can't comfortably tap, then press the site's own button. Done: the page's fields hold their values and they tap *Pay* or *Sign in* on the picture. Common case: a card form or a login, 2 to 8 fields. Edge cases: an embedded card box from a payment provider, a page that moves on to a code step, custom dropdowns. A few times a week at most.

### Flow

Open the link → the picture loads, the list loads under it → tap *Card number* → the password manager offers the card → one tap fills card, month, year, and code → check the picture → tap *Pay* on the picture. Edge: a field missing from the list → open *Other typing*, tap the field on the picture, type.

### Hierarchy

The list is the primary action; the picture above it is the check and the place to press the site's button. *Other typing* and its keys fold away under the list, open by default only when the list is empty.

### Review

[review.html](review.html). The What Changes item *Every field in one list, dropdowns included* sketches the hand-over page before and after.

### Components

This mirrors today's hand-over page (`hand-over-page.html`) and keeps its styles for the picture, the status line, and the *Type here* box. New: a `<form id="fields" autocomplete="on">` of label and control rows, reusing the *Type here* box's style for inputs and selects, and a `<details>` for *Other typing*. No framework, as today.

<!-- end design.md -->
<!-- file tasks.md utf8 4401 -->
# Tasks

## 1. Hand-over tool (`hand-over.mjs`)

- [x] 1.1 Add the `FIELD_SCAN` constant by the design (top document, DOM order, skip rules, 40-field cap, label order, per-field selector) and a `scanFields()` that runs it through `agent-browser eval --json` and keeps `ref → selector` in memory; verify a test with a fake agent-browser gets the fields back and that `FIELD_SCAN` contains none of `.value`, `.checked`, `.selectedIndex`, `.selected`, `.defaultValue`.
- [x] 1.2 Add the exported pure `autofillToken(field)` and the box `type` and `inputmode` it implies, by the design's order and table; verify a table test covering each token, a page `autocomplete` winning (with `section-*`/`billing` prefixes and `off` ignored), the input-type fallback, and ekashu-style names such as `ekashu_card_number` and an expiry month and year select.
- [x] 1.3 Add the keyed `GET /fields`, `POST /focus`, `POST /select`, and `POST /check` routes to `servePage` (header key via `keyMatches`, 4 KB JSON bodies, `ref` from the current scan only, `select` values from the scanned options, one serial command queue, 409 on a stale `ref`, no logging); verify tests for 403 without the key, 400 on a bad body or unknown option, 409 on a stale ref, and the exact agent-browser calls each route records.
- [x] 1.4 Update the file's header comment to say what the watcher now reads (field labels, kinds, choices, never values) and sends (focus, clear, select, check); verify it matches the routes by reading it back.

## 2. Hand-over page (`hand-over-page.mjs`, `hand-over-page.html`)

- [x] 2.1 Render the field list as a `<form id="fields" autocomplete="on">` of `<label for>` and control rows: text boxes with the token's `autocomplete`, `name`, `type`, and `inputmode`; selects with an empty *Choose…* option then the page's options; checkboxes; verify by the live check in 4.1 that the rows match the fixture page.
- [x] 2.2 Add the exported pure `sendPlan(sent, now, focused)` and a page-level serial queue: append-only sends the new characters as key presses; anything else calls `/focus` then presses every character; Enter presses Enter; a tap or click on the picture forgets the focused field; verify unit tests for append, deletion, a whole value dropped in, and an unfocused field.
- [x] 2.3 Send a select's `change` to `/select` and a checkbox's to `/check`, then rescan at once; poll `/fields` every 3 seconds while visible, redraw only on a new `signature`, carry box contents over by `ref` and label, retry once after a 409 then show *Tap it on the page instead*, and stop when the link closes; verify in the live check that picking a month makes the year dropdown appear.
- [x] 2.4 Move the *Type here* box and its keys into a `<details>` named *Other typing*, open by default only when the list is empty, with the line *No fields found on this page. Tap one above and type here.*; verify the existing `typedKeys` and `toPage` tests still pass and the live check shows both states.

## 3. Docs and release

- [x] 3.1 Update `wiki/development/home.md` *Hand the browser over*: the field list with dropdowns, password-manager fill, *Other typing* as the fallback, and *Is the link safe?* saying the page reads field labels and choices but never what's in them, and the agent still reads only the address or a count; verify `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Add a `## Next (minor) — Fill a handed-over form from a list of its fields` entry at the top of `CHANGELOG.md` in plain words, with **Updating.** *Nothing to do by hand.*; verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.

## 4. Integration

- [x] 4.1 Live check: serve a local card-form fixture (card number, expiry month and year selects with the year disabled until a month is picked, security code, a checkbox), run `hand-over.mjs open --local`, and drive the hand-over page from a second agent-browser session emulating an iPhone: fill the boxes, pick 03 and 2028, tick the box; then `close` and confirm with agent-browser that the fixture's fields hold those values and that no recorded agent-browser call held the typed card number. Repeat the page open over a real quick tunnel.
- [x] 4.2 Run `/save` so CI runs `npm test` on the branch; verify the gate passes, and record open memory threads for a real phone hand-over and a real 1Password fill of the list.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 2212 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, and dropdown choices to list them for the person, and MAY set a field on the person's action; it SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result.

#### Scenario: A two-step code page

- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list

- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

## ADDED Requirements

### Requirement: The person can fill a handed-over form from a list of its fields

A hand-over page SHALL list the handed page's text fields, dropdowns, and tick boxes, each labelled and in page order, with a dropdown showing the page's own choices. A value the person enters in the list SHALL reach the matching field on the page, as they type or pick it. Each box SHALL carry the kind of value it holds, from the page field's own marking, name, or label, so a password manager or a phone's autofill can fill the list. The list SHALL follow the page as it changes, and a field the list can't show SHALL stay reachable by tapping it on the picture and typing.

#### Scenario: Expiry dropdowns from a phone

- **WHEN** a handed-over card page has dropdowns for expiry month and year, and the person picks 03 and 2028 in the list on a phone
- **THEN** the page's dropdowns show 03 and 2028

#### Scenario: A password manager fills the card

- **WHEN** the person's password manager fills the list's card number, expiry, and security code boxes at once
- **THEN** each value lands in its own field on the page


<!-- end specs/browser-logins/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-28

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 42308 fence=~~~ -->
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
<title>Review · 2026-09-28-hand-over-form-fields</title>
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
<body data-change="2026-09-28-hand-over-form-fields">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-28-hand-over-form-fields</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When the agent hands you its browser for a card payment, you can't finish it. Paying a City of Markham parking ticket from a phone, Matthew typed the card number but couldn't pick the expiry month or year: a dropdown's list never shows in the picture, so tapping it does nothing. Typing field by field on a phone is slow, and a password manager like 1Password can't help, because it can't see the page's fields.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every field in one list, dropdowns included.</b> Under the live picture, the hand-over page now lists the page's fields, each with its own box and its label: <i>Card number</i>, <i>Expiry month</i>, <i>Expiry year</i>, <i>Security code</i>. A dropdown gets its own dropdown with the page's choices, so you pick <i>03</i> on your phone and the page shows <i>03</i>. A tick box gets a tick box. What you type goes straight into the matching field on the page as you type; you then tap the page's own <i>Pay</i> button in the picture.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">     BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────┐     ┌────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ ┌────────────┐ │     │ ┌────────────┐ │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ │ card page  │ │     │ │ card page  │ │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ │ [Month ▾]  │ │     │ │ [03 ▾]     │ │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ └────────────┘ │     │ └────────────┘ │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ tap a field,   │     │ Card number    │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ then type here │     │ [4111 1111…  ] │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ [Type here…  ] │     │ Expiry month   │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│ ⌫  Tab  Enter  │     │ [03        ▾ ] │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│                │     │ Expiry year    │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│ month: stuck   │     │ [2028      ▾ ] │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│                │     │ Security code  │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│                │     │ [•••         ] │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">│                │     │ Other typing ▸ │</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">└────────────────┘     └────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Your password manager fills it in one tap.</b> Each box is marked with what it holds (card number, expiry, security code, name on card, email, username, password, one-time code), taken from how the page itself marks the field. When the page doesn't mark it, which is common, the box is still marked, worked out from the field's name or label: <i>Expires End</i> with a month list becomes an expiry month. So 1Password, or your phone's own autofill, offers to fill the whole list at once, and each value lands in its field on the page.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Private as before.</b> The list shows only each field's label and a dropdown's choices, never what's in a field. What you type or fill goes to the page and nowhere else: it is never read back, saved, or shown to the agent, which still sees only the page's address, or whether the box it waits on is gone.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>You say you're ready with one tap.</b> Before sending the link, the agent asks whether you're ready as a multiple choice, <i>Ready, send the link</i> or <i>Not now</i>, so you tap an answer instead of typing one.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The old way still works.</b> A field the list can't reach, such as one inside a payment provider's embedded box, still works by tapping it on the picture and typing under <i>Other typing</i>. On a laptop you can still click and type on the picture itself. The list refreshes itself when the page moves on, say from the password to a code page.</div></div></li>
</ol>
<p class="aside">Non-goals: no radio buttons in the list (a tap on the picture sets them); no fields inside embedded boxes from another site; no submitting from the list; no change to when the agent hands over or how it knows you're done.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked where to build it → chose WongStack, with WongOS picking it up at its next sync (settled in the request).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the list reads each field's label, kind, <code>autocomplete</code>, name, id, and a dropdown's choices, but never a field's value, tick state, or current choice, because the request says never to read back what the person types; boxes start empty, and an empty box leaves its page field alone.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: typed text travels only as key presses over the live feed, as <i>Type here</i> does today, and never as an argument to an agent-browser command, because a command's arguments show in the computer's process list; the hand-over tool only focuses and clears the field first.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: a dropdown choice and a tick box go through agent-browser's own <code>select</code>, <code>check</code>, and <code>uncheck</code>, because they set the field reliably with the page's own change events; the choice is a short-lived local argument, which is acceptable for a menu option, unlike typed text.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: a box sends as you type, with no <i>Send</i> button, because the request says straight into the web and a password manager fills several boxes at once; the page sends them one at a time.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: adding letters at the end sends only the new letters, and any other edit clears the page field and types the whole box again, because card fields that add spaces as you type would otherwise drift out of step.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the list covers the top page only, not embedded boxes from another site, and skips radio buttons, because a browser can't read into another site's box and a tap on the picture already sets a radio button; <i>Other typing</i> keeps tap-and-type for both.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the page asks for the field list every 3 seconds and redraws only when it changes, keeping what's typed in boxes whose field is still there, so a login's code page appears without a reload.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: the list rescans right after each dropdown pick, because Matthew's screenshot shows ekashu's expiry year disabled until a month is chosen, and a disabled field isn't listed.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: a password field's box is a password box, and a new-password field is told apart by <i>new</i> or <i>confirm</i> in its name or label, so a password manager offers a saved login, not a new one, on a sign-in page.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: no new workspace, because the other part, paying the ticket, already runs in WongOS workspace neat-crab.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked in review whether a field the page leaves unmarked still gets its type → chose yes, worked out from its name or label; the bullet now says so. The mark goes on our box only, not onto the website's field, because the password manager fills our box and the agent's browser has none of its own.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: no <i>Send again</i> button and no automatic resend after a reload, because Matthew ran <code>/ship</code> without picking either; the box sends one way, and an edit other than adding at the end retypes the whole box.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed: a minor release, because the hand-over gains a new way to fill forms.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed in the build: a postal-code box keeps the letter keyboard, not the design's number pad, because a Canadian postal code has letters; and a card's security code matches <i>card verification</i>, not a bare <i>verification</i>, so a login's <i>Verification code</i> stays a one-time code.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-28</p>Assumed in the build: after the list changes, a box keeps its content by its kind, label, and place among fields that share both, not by <code>ref</code>, because the expiry year appearing after a month pick shifts every later <code>ref</code>, and the live check lost the security code that way.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Built: a real hand-over over a quick tunnel paid Matthew's City of Markham ticket: the list filled the email boxes and the terms tick on the payment page, then the ekashu card page's number, expiry dropdowns, and security code, and the site confirmed the payment.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-28</p>Asked after the ticket test how the ready question should look → Matthew chose a multiple choice before the browser opens; the <i>Ask first</i> rule in <code>home.md</code> now names the shared ask format with <i>Ready, send the link / Not now</i>, folded into this change because it is the same hand-over.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-28</p>Archived and checkpointed for merge by <code>/ship</code> as 26.30.0; CI passed on the branch first.</li>
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
