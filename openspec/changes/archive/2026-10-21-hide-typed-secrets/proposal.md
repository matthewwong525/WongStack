# Proposal

**Status:** archived
**Branch:** improve-browser-speed
**Open questions:** none

## Why

On 2026-10-21 a saved Costco login was rejected, and the assistant's next look at the page showed the password still typed in the box, in plain words in the chat. Any password box does this, and so would a card number or a code still sitting in a box. That breaks the rule that the assistant never sees a password.

## What Changes

- **The assistant's view of a page hides secret boxes.** A password, card number, expiry, security code, PIN or one-time code box shows only that it's filled, never what's in it. Everything else on the page reads as before.
  | Box | Before | After |
  |-|-|-|
  | Password | `fake-trial-123` (whatever was typed) | `[hidden]` |
  | Card number | `4111 1111 1111 1111` | `[hidden]` |
  | Email | `jo@example.com` | `jo@example.com` |
  | Empty password box | (nothing) | (nothing) |

- **It stays hidden when the site shows it.** A password the assistant typed from your saved logins stays hidden, even after the site's *show password* eye turns it into plain text.

- **Asking for one box's contents hides it too.** The assistant's other way to read a box gives `[hidden]` for the same boxes.

**Non-goals:** pictures of the page (a password box draws dots, and a shown password needs the eye tapped); the Clef browsing trial; the private form's own steps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: adds a requirement that a page read never returns what a secret box holds.

## Impact

- `.agents/skills/browser/scripts/browse.mjs`: `snapshot`, `get value`, and `login` (marks the box it typed a password into).
- `scripts/tests/browse.test.mjs` and the pretend camofox it drives.
- `wiki/development/browsing.md`: one line under the never-reads-a-password rule.
- `CHANGELOG.md`: a `Next (patch)` entry.

## Decision log

- **2026-10-21** — Asked whether to hide only password boxes, or card and code boxes too → chose passwords, cards and codes.
- **2026-10-21** — Assumed: a filled secret box reads `[hidden]` and an empty one reads as today, because the assistant still needs to tell whether a box is filled.
- **2026-10-21** — Assumed: a box counts as secret by its kind on the page, by a name like *Password* or *Card number*, or because the login typed a password into it; any one is enough, because a site's card box inside a payment frame shows only its name.
- **2026-10-21** — Assumed: a patch release, because it fixes the existing never-sees-a-password rule and changes no command.
- **2026-10-21** — Assumed: pictures stay out of scope, because a password box draws dots and the assistant never taps a site's *show password* eye.
- **2026-10-21** — Assumed: every password box leaks, not only Costco's, because on a practice login page a made-up value typed into a real password box came back in full from the page reading, `get value e3`, and `get value '#password'`.
- **2026-10-21** — Assumed: this goes ahead beside the *Browser typing and checkbox glitches* workspace, because it may edit the same browser script for a different reason and has no plan of its own.
- **2026-10-21** — Asked whether to fix how a very long page's reading joins its pieces, since a cut through a password box could print part of it → chose to join the pieces exactly, without the repeated part.
- **2026-10-21** — Assumed: archived for publishing as 43.18.2 after merging main's 43.18.0 and 43.18.1 browser fixes, with a secret box in a payment frame still hidden under main's new per-frame refs.
