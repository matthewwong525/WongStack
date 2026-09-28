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
