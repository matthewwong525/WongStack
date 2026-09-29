# Show a handed-over page at phone size on a phone

**Status:** ready-to-ship
**Branch:** mobile-ui-browsing-agent
**Open questions:** none

## Why

When the agent hands you its browser and you open the link on a phone, you get a tiny picture of a desktop-sized page: a 1280-wide page squeezed into a phone's width, with text too small to read and buttons too small to tap. Half the screen below it sits empty.

## What Changes

- **On a phone, the page takes your screen's size.** When the link opens in a narrow window, the agent's browser turns into a phone-sized browser for as long as you hold it. The site then shows its own phone layout, at full size: readable text, buttons you can tap, and a picture that fills the width of your screen. When the link closes, the browser goes back to its desktop size before the agent carries on.
  ```text
       BEFORE                  AFTER
  ┌────────────────┐     ┌────────────────┐
  │ ┌────────────┐ │     │ ┌────────────┐ │
  │ │ tiny desk- │ │     │ │ Your       │ │
  │ │ top page   │ │     │ │ workspace  │ │
  │ └────────────┘ │     │ │            │ │
  │ Live           │     │ │ 1. Server ✓│ │
  │ Other typing   │     │ │ 2. GitHub ✓│ │
  │ [Type here…  ] │     │ │ [Get link] │ │
  │ ⌫  Tab  Enter  │     │ └────────────┘ │
  │                │     │ Live           │
  │   (empty)      │     │ Other typing   │
  │                │     │ [Type here…  ] │
  └────────────────┘     └────────────────┘
  ```
- **How it knows you're on a phone.** It goes by how wide the link's window is, not by guessing the device. A window narrower than 800 points gets the phone size; a laptop or tablet keeps the desktop size. A laptop window dragged narrow gets the phone size too, since a desktop page squeezed into it is just as hard to read.
- **Turning the phone re-fits it.** Turn the phone sideways and the page re-fits the new width. Opening the keyboard doesn't resize the page, so it never jumps while you type.

Non-goals: no change to the page's layout, labels, or buttons around the picture; no *Done* button; no change to when the link closes or what the agent can see.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: a hand-over opened in a narrow window sizes the handed page to that window, and the page returns to 1280×720 when the link closes.

## Impact

- `.agents/skills/verify/scripts/hand-over-page.mjs`: works out the wanted page size from the window and posts it, again when the width changes.
- `.agents/skills/verify/scripts/hand-over.mjs`: a keyed `POST /viewport` route that runs `agent-browser set viewport <w> <h>` with clamped sizes, and a teardown that puts 1280×720 back.
- `scripts/tests/hand-over.test.mjs`: the route needs the key, clamps and rejects bad sizes, records the call; closing restores 1280×720; the pure size helper.
- `wiki/development/browsing.md` *Hand the browser over*: one line on the phone size.
- `openspec/specs/browser-logins/spec.md` via a delta.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-29** — Asked which improvements to include (phone-sized page, a picture that fills the screen, plainer wording, a *Done* button) → chose the phone-sized page only, and asked how it tells a phone from a desktop.
- **2026-09-29** — Assumed: it tells them apart by the window's width, under 800 CSS pixels, not by the device or its user agent, because width is what makes a desktop page unreadable, and a narrow laptop window has the same problem.
- **2026-09-29** — Assumed: the phone-size page is the window's usable width by 60% of its height, at least 400 tall, because the field list and typing box still need room below the picture.
- **2026-09-29** — Assumed: the size is set at 1× pixel density, because the page maps a tap to the picture's own pixels; a sharper 2× picture would put every tap at half the right spot unless the mapping changed too.
- **2026-09-29** — Assumed: a wide window posts 1280×720, so the last window to open the link sets the size, and a laptop opening the same link after a phone gets the desktop page back.
- **2026-09-29** — Assumed: the page re-sends its size only when the width changes, because a phone's keyboard shrinks the height and would reflow the site mid-typing.
- **2026-09-29** — Assumed: a minor release, because the hand-over looks different on a phone.
- **2026-09-29** — Asked whether opening the link rebuilds the page → answered no: a resize re-lays the site out in place with no reload, so logins and typed values stay; a site that picks its layout only on load keeps its desktop look, and no reload is forced, because it could lose a half-filled form.
- **2026-09-29** — Assumed in the build: `/viewport` answers 502 when agent-browser fails, and the narrow test uses the picture's box width, the window minus the page's padding.
- **2026-09-29** — Built: a live `--local` hand-over opened at 390×844 turned the agent's page into a 374×506 phone layout, a click at (160, 230) landed at (160, 230), and `close` put 1280×720 back.
- **2026-09-29** — Archived and checkpointed for merge by `/ship` as 27.1.0.
