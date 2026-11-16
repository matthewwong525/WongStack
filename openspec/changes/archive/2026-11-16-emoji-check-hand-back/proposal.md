# The Hand back button looks exactly like ✅

**Status:** ready-to-ship
**Branch:** match-handback-check-emoji
**Open questions:** none

## Why

Each line that gives you the browser says *tap ✅ at the top right*. But the button there is a dark green circle, and ✅ is a lighter green square with round corners. So the button you must find does not look like the one the line names.

## What Changes

- **The Hand back button becomes the ✅ emoji itself.** It is the same drawing the browser uses when it shows ✅ in a page: a light green square with round corners and a white check. It stays at the top right, still counts the tabs that wait on you, and is still grey when nothing waits.
  ```picture
  Before: pictures/before.png
  After: pictures/after.png
  ```

**Non-goals:** new words in the lines; a new place for the button; a different look on each computer.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: the toolbar's Hand back shows the browser's own ✅ emoji drawing, not a green circle.

## Impact

- `.agents/plugins/browser/addon/check.svg`: replaced by the ✅ glyph from the browser's emoji font, Twemoji Mozilla, with its CC-BY 4.0 credit.
- `scripts/tests/addons.test.mjs`: checks the copied icon is the ✅ drawing.
- `.agents/plugins/browser/VERSION` and `CHANGELOG.md`: a `patch` entry. The new icon shows at the browser's next start.

## Decision log

- **2026-11-15** — Assumed: the icon copies the ✅ that the agent's browser draws, from its own emoji font, Twemoji Mozilla, because it is the one drawing we may ship; Apple's ✅ may not be copied. On a phone or a Mac, the ✅ in the chat is Apple's, which has the same shape and colours, a slightly different green.
- **2026-11-15** — Assumed: the drawing ships as an SVG file, not ✅ drawn as text at each start, because a file looks the same on every computer and needs no new code.
- **2026-11-15** — Assumed: the credit for the Twemoji drawing goes in a comment inside the icon file, because it then travels with every copy of the file.
- **2026-11-16** — Assumed: the icon's `viewBox` is the glyph's own 512-unit square, `0 0 512 512`, so the y flip uses the square's top (448), not the font's ascent (477), which would leave a 29-unit gap. Checked in Camoufox: the icon and the font's ✅ render the same.
- **2026-11-16** — Archive checkpoint: built and archived inside /ship. The live check started a separate test browser from this build, so no other chat's browser stopped: the toolbar ends with 1Password, then ✅, faded while nothing waits.
