# Design

## Context

`browse.mjs` prints camofox's snapshot as is. Camofox builds it with Playwright's `ariaSnapshot`, which writes a text box's current value after its ref, password boxes included: `- textbox "Password" [e3]: fake-trial-123`. `get value <ref>` reads that same text through `valueIn`; `get value <selector>` evaluates `field.value` in the page. All three returned a made-up password on a practice page (see the proposal's Decision log). [`form.mjs`](../../../.agents/skills/hand-over/scripts/form.mjs) uses `value()` only on dropdowns, to put back a pick.

## Goals / Non-Goals

**Goals:** no output of `snapshot` or `get value` carries a secret box's contents; nothing else in a reading changes.

**Non-Goals:** screenshots; camofox's own logs; secrets shown as page text rather than in a box (a recovery code printed on a settings page).

## Decisions

- **Hide in `browse.mjs`, at the one public read.** `page.snapshot()` returns redacted text, so `snapshot`, `get value <ref>` and every caller of `client()` get it; the internal settle loop keeps the raw text it only compares. Patching camofox was the alternative: it's a pinned third-party package, and a version bump would silently undo it.
- **Three tests for "secret", any one hides a box.** A box is hidden when one of these matches.
  1. **Its name in the snapshot.** The line's role is `textbox`, `searchbox` or `spinbutton`, and its accessible name matches `password|passcode|passwort|pin\b|card number|card no|cvc|cvv|csc|security code|expir|one-time|verification code|otp`. This is text-only, so it also covers a card box inside a cross-origin payment frame, where the next test can't reach.
  2. **Its kind in the page.** One `evaluate` lists the values of `input[type=password]`, `[autocomplete~=cc-number|cc-csc|cc-exp|cc-exp-month|cc-exp-year|one-time-code]` and `[data-wong-hidden]` in the top document and same-origin frames. A snapshot box line whose value equals one of those is hidden. The values stay in the script's memory and are never printed. That's the same trust `login()` already has.
  3. **The login marked it.** After `login()` types a password, it sets `data-wong-hidden` on `document.activeElement`, so a box the site's *show password* eye turns into `type=text` still matches test 2.
- **The shown form.** A filled hidden box prints `[hidden]` in place of its value: `- textbox "Password" [e3]: [hidden]`. An empty box prints as today. A dropdown's pick is never hidden: a month isn't a secret, and `form.mjs` needs it to put a choice back.
- **`get value <selector>`** runs the same secret test in its `evaluate` (type, autocomplete, the marker, and the label's name pattern) and returns `[hidden]` for a filled secret box.

## Risks / Trade-offs

- [A non-secret box named like one, such as *Promo PIN*] → it reads `[hidden]`. That's safe: the agent typed it, so it knows the value, and hiding too much leaks nothing.
- [A cross-origin frame box with an unusual name] → none of the three tests sees it. The name pattern covers the common card frames (Stripe, Braintree, Adyen: *Card number*, *Expiration date*, *Security code*). The rest is noted in the wiki line as what the rule can't promise.
- [A page whose snapshot is a single huge text] → the extra `evaluate` is one call per reading, a few milliseconds.
