# A browser hand-over that is easy to use

**Status:** ready-to-ship
**Branch:** agent-browser-mobile
**Open questions:** none

## Why

On a phone it is hard to scroll the live website and reach the typing controls below it. Give the website and the easier-to-fill fields their own space, with clear controls on both phones and computers.

## What Changes

- **On a phone, choose Page or Fill fields.** The page fills the available screen, and the fields have their own scrolling view. Switching keeps what you typed.
  ```text
  BEFORE
  Live page
  Scroll down to fields
  Scroll back up to page

  AFTER: PHONE
  Your turn                 Live
  [Page] [Fill fields]
  Page: swipe to scroll
  Tap a field: keyboard opens
  [←] [→] [↻] [↩]

  FILL FIELDS
  Email     [                 ]
  Password  [                 ]
  [Sign in]
  Other typing

  WAITING / CLOSED
  Connecting... / Link closed
  Return to chat when finished
  ```
- **On a computer, see the page and fields together.** The fields stay beside the website, with their own scroll area.
  ```text
  BEFORE: PAGE THEN FIELDS
  Page
  Fields below

  AFTER: COMPUTER
  Live page        | Fill fields
  Click and type   | Email
  Scroll normally  | Password
                  | [Sign in]
  [←] [→] [↻] [↩]
  ```
- **Swipe to scroll, tap a field to type.** Remove Up, Down, and Type. Tapping a text field on the page opens the phone keyboard; Fill fields remains available for autofill and unlisted controls.
- **Reach wider login forms.** Allow dragging left and right as well as up and down. Expand the remote viewport when a visible login form needs more width, keeping its preview readable and pannable instead of cutting off the edge. Try the result on Statlas.
- **Go back after an accidental click.** Back and Forward arrows, a Reload icon, and a Return to start icon stay at the bottom in either view. Return to start opens the exact page where this private link began, even after browsing to another website. Each icon has an accessible name and a desktop tooltip. If there is no history, Back explains that instead of silently doing nothing. On phones, the header, view tabs and navigation hide while the keyboard is open to give the page more room, and return when it closes. The selected field stays visible.

Non-goals: changing Statlas or the password-saving screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: responsive hand-over layout, separate page and fields, and reliable page scrolling.

## Impact

WongStack's hand-over page HTML and script, browser-page tests, browsing guide, and changelog. No new dependencies or changes to credential transport.

## Decision log

- **2026-09-29** — Asked to rethink desktop and mobile and let the user try Statlas login → build an unpublished trial and hand it over on Statlas.
- **2026-09-29** — Assumed: use Page and Fill fields tabs on phones and adjacent panels on computers, because the stacked layout mixes two scrolling jobs.
- **2026-09-29** — Assumed: keep the existing private link and form handling, because the requested change concerns usability.
- **2026-09-30** — Asked whether there is a way back after getting stuck on an unwanted Google page → returned the trial browser to Statlas and added persistent Back, Forward, and Reload controls.
- **2026-09-30** — Asked why Up/Down do not work and for ordinary phone swiping → checked the real stream: wheel input moves a long document, but Statlas's short login viewport has no scroll range and places content outside the visible area. Use a taller phone browser viewport with a pannable live preview, consuming preview movement before forwarding the remaining scroll to the website. Back, Forward, and Reload stay visible.
- **2026-09-30** — Check: start the completion test's observation at its first watcher address read after the initial address capture, feed and tunnel preparation. Keep every permitted-read and final viewport-restoration assertion. Takeover and element-only modes capture the starting address once during preparation and make no further address reads.
- **2026-09-30** — Asked to remove Up/Down and Type, open the keyboard by tapping fields, put navigation at the bottom, and fix clipping → simplify controls, add native text-field targets on the phone preview, and include the visible form width in viewport selection. Statlas has a 464px form in a 370px browser viewport.
- **2026-09-30** — Asked to drag wider pages left and right too → use two-axis local preview panning and forward remaining movement to the website at the gesture origin. Keep wide forms readable, with their edges reachable by sideways dragging.

- **2026-09-30** — Phone trial confirms the keyboard opens, but shows only the Statlas logo after the available preview shrinks; asked to remove navigation while typing → hide the hand-over header, view tabs and bottom navigation during the mobile keyboard, retain full-size page pixels, and pan the active field into the remaining visible stage. Restore controls and preserve input/focus/pan when the keyboard closes. Safari-owned keyboard/address bars remain browser UI.

- **2026-09-30** — Asked why Back does not work and the logo will not go home → verified the current Statlas welcome page has one browser history entry; agent-browser Back reports success without moving, and clicking its plain logo does not change the address. Add an explicit Home action to the current website root and truthful no-history feedback. Do not modify Statlas or convert decorative logos into links. Verified https://statlas.io/ is its Home page in an isolated profile.

- **2026-09-30** — Asked to remove Home, use arrow/icons in the bottom row, and return to the original link instead → replace Home with Return to start, remembering the handed-over page address once as this link opens. Preserve its path, query and fragment; never follow a client-supplied URL or recalculate from a later website. Use familiar arrow/reload icons and a distinct return-to-start icon with accessible names and tooltips. Keep the keyboard hiding and existing history behavior.

- **2026-09-30** — Invoked `/ship` → all22 tasks are checked and the change is archived for the single release checkpoint. Keep the tested icon toolbar, original-page return, two-axis swiping and keyboard space; publish as27.9.0 after the required checks.
