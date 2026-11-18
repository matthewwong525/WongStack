<!-- openspec-archive v1 2026-09-30-comfortable-browser-handover -->
<!-- file proposal.md utf8 7609 -->
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

- **2026-09-30** — Release checks found three unused-variable warnings → mark excluded geometry bindings as unused and use the destructured pointer target in the test helper. Keep the lint rule and every assertion enabled; navigation and gesture behavior are unchanged.

- **2026-09-30** — Another release took27.9.0 after the checkpoint passed → merge the latest main, retain both changelog entries and all incoming changes, and number this browser release27.10.0. Repeat the ordinary save gate before merging; the preview walk remains NONE because these are host-side browser routes.

- **2026-09-30** — All711 script tests passed after the merge, but global lines were84.9% against the unchanged85% floor. The browser test harness ran the module as anonymous inline HTML, leaving its executed interactions unattributed. Evaluate that same module in the existing JSDOM context with its actual filename and preserved byte offsets: all35 assertions still pass, and module lines are92.71% instead of10.4%. Add real queued-field/navigation ordering and close-during-work regressions; both pass. Keep every coverage threshold, include rule and test enabled.

<!-- end proposal.md -->
<!-- file design.md utf8 15639 -->
# Design

## Context

See proposal.md. The page is plain HTML plus a browser module, served through the existing private hand-over watcher. Its canvas forwards input_mouse and input_keyboard to agent-browser. Current touch-action permits pinch zoom, and uncaptured pointer gestures can interrupt scroll input. The current document stacks a canvas, field list, and typing controls.

## Goals / Non-Goals

**Goals:** separate remote scrolling from local field-list scrolling; keep existing authentication and form transport; use the real host-served hand-over for a trial.

**Non-Goals:** no changes to upstream agent-browser, no new UI dependency, no changes to credential persistence or link lifecycle.

## Decisions

- Use a viewport-height shell with a header, mobile tabs, and a workspace. Below 800 CSS pixels, Page and Fill fields share the workspace with the inactive panel inert; desktop uses a canvas stage and a 340px sidebar. A stacked layout was rejected because it preserves the user's scrolling problem.
- Give the canvas touch-action:none and capture single pointers. Cancelled or lost pointers clear drag state. Scale wheel deltas to the rendered image dimensions, accounting for letterboxing. Do not add momentum initially: discrete CDP wheel input is sufficient and avoids queued motion after a tap.
- Fit the mobile website to the canvas width with at least 720px of browser height, bounded by the watcher's existing viewport limits. The phone canvas keeps its image aspect ratio and readable width in a stage scrollable on both axes. A swipe first pans the local preview; any remaining distance goes to the remote website as wheel input. This permits inspecting fixed-height login layouts that have no native page scroll range. Horizontal and vertical movement consume local preview range independently before forwarding remaining movement. Desktop wheels scroll the website. Keep the width-only resize guard so opening the keyboard cannot resize the remote page mid-entry. Account for window breakpoint as well as available canvas width when selecting desktop size. Switching tabs must not send a zero-size viewport. Reset preview position on remote URL navigation and explicit Back/Forward/Reload.
- Preserve all field elements when switching panels; do not rebuild them for tab changes. Remove the Type launcher; retain Other typing inside Fill fields for unsupported fields. Keep native website action handling, stale-action refusal, and close receipts.
- Keep Back, Forward, Reload, and Return to start icons below the workspace in both views, with safe-area padding. A keyed navigation route accepts only these four actions, serializes them with field operations, and never accepts a URL or arbitrary command. The client drains queued typing before navigation and never automatically repeats a failed action. Refresh the field list afterward. Restart an existing watcher before trialing the added route.

## UX

### Use-case brief

The owner is finishing a login or a code step on a phone, sometimes on a computer. Done means the target website accepts the input. Assume occasional hand-overs per day; easy recovery matters more than dense controls. Start from the existing hand-over page and its existing field controls. Common case is a login with listed fields; custom or embedded fields use Page then Other typing.

### Flow

Open the link, see the live page, tap a field to type and submit. Fill fields remains available for autofill. Use Page for unlisted actions. On desktop both panels stay visible. Connecting, reconnecting, and closure stay in the header; fields follow a code step through the existing refresh process.

### Hierarchy

The website's submit action is primary in the field view. Tabs, scrolling, and typing are secondary navigation controls. On Page the live site occupies most space; connection status and instructions are quiet.

### Review

[Review](review.html): proposal item 1 sketches phone views and connection states; item 2 sketches desktop before and after.

### Components

Existing canvas, native form controls, details typing panel, and status message. Add native tab buttons, bottom navigation and layout wrappers. Keep semantic labels, 44px touch targets, 16px or larger text inputs, reduced-motion behavior, and light/dark contrast.

## Risks / Trade-offs

- Mobile WebKit may arbitrate gestures differently → touch-action:none, pointer capture, regression coverage, and a real user phone trial.
- Native autofill may require switching to Fill fields → keep fields mounted and retain autocomplete metadata.
- Input-message assertions cannot prove scrolling → measure actual preview movement and actual remote scroll offsets through the hand-over proxy in an isolated profile, covering fixed-height layouts, a long document, and a nested scroller before reopening the user's login.

## Migration Plan

No data migration. Finish existing private links before using the changed scripts. Reverting the page and module restores the earlier UI.

## Direct typing and wider pages

- Extend field metadata with viewport geometry, a single-field hit rectangle, stable field identity, and visible form layout width. Never read values, selected state, or credentials. Geometry changes must not invalidate form-action identity or rebuild a focused input. Bound width growth by existing viewport limits, keep it stable per page, and reset it on navigation. Only a form overflowing the sampled, requested viewport can grow the remembered width; responsive sites stay at phone width, including after returning from desktop; a wider form increases the remote viewport and preview width so the person can pan to its edges.
- Wrap the canvas and a native input layer in one relative preview surface. On phones, position transparent native inputs over visible remote text fields, with password type, autocomplete, inputmode and at least 16px text. A tap focuses the native input synchronously through the trusted gesture, allowing the phone keyboard to open; asynchronous focus after a server request is insufficient on iOS. Use a modest single-input ancestor as the hit rectangle where the visible outline is larger than the actual input. Keep ordinary buttons and unsupported controls reachable through canvas clicks.
- Reuse the existing private typing queue and share local values with Fill fields. Preserve overlay nodes and focused state during metadata refresh, moving geometry without rebuilding. Refresh or suspend stale positions after remote scrolling/navigation. A swipe starting over an input follows the same two-axis gesture path, suppresses a tap, and does not open the keyboard. Native focus must not clear existing remote text until a user edit replaces it. Keep unsupported custom/iframe typing in Other typing.
- Adjust the shell to the visual viewport while the phone keyboard is open, hide mobile hand-over chrome to maximize the page, and bring the focused field into view; height-only changes never resize the remote website. Preserve mapped taps after panning and viewport changes. Verify actual local scrollLeft/scrollTop and remote offsets, direct native focus/type/password behavior, swipe-over-field behavior, and navigation through the real proxy with isolated profiles before reopening the Statlas trial.

- A trusted native tap focuses the local input without clearing or clicking the remote field. The first actual edit focuses and clears through the existing serialized transport, so a tap cannot redirect keys still queued for another field. Untouched local blanks never replace source values. Stable identities travel with edits; a fresh metadata scan validates the connected source field before mutation, and navigation or node replacement discards obsolete edits instead of migrating local values.
- Width growth consumes only metadata sampled at the viewport the client requested. Initial desktop metadata cannot enlarge a phone preview. Field geometry and hit rectangles are excluded from action revisions; a size change gets a fresh scan, and remote scrolling suspends targets until their positions refresh.

## Verification

The isolated real proxy check uses a fixed-height464px form and a scrollable page. Trusted touch opens native Email/password focus, source text is unchanged until an edit, edited text reaches the source and Fill fields, and a swipe starting on a field does not focus or click. Local horizontal movement reaches94px on a370px stage; the post-pan tap reaches the intended lower button. Remaining movement scrolls the remote document240px and nested container120px without clicks. Navigation resets both axes. Phone320/390px and desktop900/1440px layouts have no outer overflow and show the bottom navigation. Actual phone keyboard display remains for the user's Statlas trial; host Chromium establishes trusted native focus.

## Space while the phone keyboard is open

Detect an on-screen keyboard from a focused native editable control and a substantial visual viewport height reduction relative to the unfocused baseline, accounting for scale and orientation. Hide the phone header, Page/Fill fields tabs and Back/Forward/Reload navigation while it is open, with the workspace taking their space. Keep horizontal shell sizing unchanged so the remote viewport cannot resize or zoom during entry. Keep focused inputs mounted and values private; closing the keyboard restores the controls even if focus remains. Closing the link or navigating clears this mode. Desktop remains unchanged.

After the visual viewport and flex layout settle, reveal the active native input within the stage by adjusting only the minimum local scrollTop/scrollLeft required to show its rectangle with a small margin. Use the field's actual text geometry instead of an oversized ancestor outline for visibility. Reveal a selected Fields control in its own scroller, and support Other typing. Repeat across keyboard animation, visual viewport resize/scroll (including iOS offsetTop), focus changes and updated metadata; do not continuously snap back during intentional swipes. Preserve source width/height and canvas scale; height-only keyboard changes must never call the remote viewport route. Safari-owned input accessory and address bars cannot be hidden by this page.

Validate keyboard-open/close mode, active field visibility after shrink, retained two-axis pan and values, no remote resize, orientation/hardware keyboard behavior, and the rendered cramped mobile layout with isolated profiles. A real iPhone trial checks the native keyboard itself.

The isolated proxy check emulates a 390×740 phone with a 300px visual viewport and 45px/85px top offsets. Its stage is 280px high; Email and Password text remain fully visible at y301–325 within y55–335, while all hand-over chrome is hidden. The source and canvas stay 464×720 at full scale, with zero keyboard-triggered viewport requests. Trusted touch focus and typing reach the correct source field and Fill fields. Dismissal restores controls with focus, values and nonzero two-axis pan retained; nearly full-width fields do not oscillate during repeated reveal. Other typing is visible at y278–325 inside its own panel. A field below the frame remains listed but its native target is hidden, and partial targets leave preview scrollHeight at 720px. Phone widths 320/390 and desktop widths 900/1440 show no outer overflow. These are simulated keyboard checks in host Chromium; the native iPhone keyboard remains for the Statlas trial.

## Icon navigation and return to the original page

This revision supersedes Home-to-origin navigation from task7. The bottom row contains four icon-only native buttons in order: Back (left arrow), Forward (right arrow), Reload (circular arrow), Return to start (a distinct return arrow to a starting marker). Use small inline SVG strokes with currentColor, hidden from assistive technology; no image asset or new icon dependency. Buttons have clear aria-label and title names and at least44×44px touch targets. Match the established quiet toolbar styling and safe-area spacing; all four controls fit320px and hide with the rest of navigation during phone keyboard entry.

Capture the handed-over browser's initial URL once after preparing/selecting its task tab and before opening private input. Validate HTTP(S) and strip URL credentials; keep the full path, query and hash. Retain it only in the existing mode0600 short-lived private watcher state and server closure; do not expose it in HTML, public metadata, receipts, results, notifications or logs. Browserless password/key links do not perform this browser read. Do not change the existing completion/deadline/cleanup lifecycle. Unsupported or unavailable initial addresses produce a specific unavailable-start result and retain local state; no guessed fallback destination.

Replace the allowlisted home action with start. Server-side Return to start uses only the frozen original address from this link's watcher state, never a destination sent by the client or the current website origin. Navigate to that full address using the existing serialized queue after the latest edits; normal successful navigation resets field metadata and preview pan. No retries or Home fallback. Reject old home/arbitrary URL commands, unauthenticated calls and closed links. Start remains the same after normal navigation, reloads and cross-origin visits for this link. A newly opened link captures its own new initial page. Old watcher states without a start address refuse the action safely.

Retain the fixed history.length scan for Back/Forward. One entry means neither direction can move; show explicit no-history feedback naming Return to start and preserve native/mirrored input nodes, edits, focus and both preview offsets. Greater history length keeps native traversal including cross-origin history. Do not rely on Navigation API's same-origin history scope. Ordinary image-link taps remain website behavior; decorative logos remain decorative.

Verify server capture and state plumbing, preservation of path/query/hash, crossing origins without changing Start, rejection/no retry, and no-history/unavailable-start state preservation. Verify the four rendered icons, accessible names, minimum targets at320/390px and desktop900/1440px, and keyboard hiding. Use a focused isolated real proxy check that starts at a non-root fixture URL, goes to another origin, and uses Return to start to reach the exact initial URL. Helpers use explicit isolated session/profile for every browser CLI command; the parent alone owns the user's Statlas trial. Return for a fresh host-served private trial, without publishing.

### Prior verification

Task7 verified real no-history retention, same-origin and cross-origin Back/Forward, and ordinary linked-image taps after two-axis pan and viewport offsets. It used Home-to-origin before the user's latest revision. Earlier direct typing, pan and keyboard evidence above remains applicable; repeat only the changed navigation and layout behavior.

Task8 isolated real proxy verification returned from another origin to the exact `/account/login?next=%2Fteam&step=1#code` starting address. The four distinct SVG buttons have matching accessible names/tooltips and fit phone320/390px and desktop900/1440px without outer overflow. Phone targets are69/86.5×44px, desktop targets52×44px. A simulated keyboard hides and restores the complete icon row. The1440×900 screenshot uses a harmless labelled Email/Password practice account with mirrored fields and the final controls. Both isolated sessions were closed; the parent owns the private Statlas trial.

<!-- end design.md -->
<!-- file tasks.md utf8 6285 -->
# Tasks

## 1. Hand-over page

- [x] 1.1 Implement mobile Page/Fill fields tabs and desktop adjacent panels; verify panel switching preserves values and inactive panels cannot take focus.
- [x] 1.2 Implement captured touch scrolling, cancellation, scroll buttons, and stable viewport fitting; add gesture and field-switch regression tests and run the focused hand-over tests.
- [x] 1.3 Update the browsing guide and add a Next minor changelog entry; run payload-link and OpenSpec-config checks.

## 2. Integration

- [x] 2.1 Check the rendered phone and desktop layouts with an isolated browser profile, including scroll input and no outer overflow; report evidence without using the personal profile.
- [x] 2.2 Validate the change and review page; return the built hand-over for the parent's Statlas trial without changing Statlas or publishing.

## 3. Navigation recovery

- [x] 3.1 Add persistent Back, Forward, and Reload controls and a keyed, allowlisted, serialized navigation route; test queued typing, failed action without retry, unauthorized requests, and closed links.
- [x] 3.2 Update browsing guidance and the existing changelog entry; verify phone controls fit, run focused hand-over tests and payload checks, and validate the refreshed review page before the parent restarts the trial link.

## 4. Real scrolling

- [x] 4.1 Give phones a taller browser viewport and pannable preview; route swipes, Up/Down, and wheels through preview panning followed by remaining remote scroll, preserve tap mapping, and reset panning on navigation. Add focused regression coverage and run it.
- [x] 4.2 Verify actual preview scroll offsets and actual remote document/nested-container scroll offsets through the real hand-over proxy and agent-browser stream with an isolated profile, including a fixed-height page, no accidental taps, phone/desktop fit, and navigation controls. Update browsing guidance/changelog, validate payload links/config and the review page, and return for a new Statlas trial.

## 5. Direct typing and two-axis panning

- [x] 5.1 Remove Up/Down and Type launchers, move navigation below the workspace with safe-area support, and keep the shell usable while the native keyboard opens; verify phone/desktop layout and retained Other typing.
- [x] 5.2 Add privacy-preserving field geometry/stable identity and visible form width metadata, keeping movement separate from action signatures; expand the phone viewport only when necessary and implement two-axis preview panning plus remaining remote scroll. Test horizontal/vertical offsets, navigation reset, mapped taps, and bounded width selection.
- [x] 5.3 Add native text-field targets over the mobile preview so a trusted tap opens the keyboard, share local edits with Fill fields through the private typing queue, and preserve focus across metadata refresh. Test password metadata, direct typing, no value reads, stale geometry, and swipes starting on fields without accidental focus/click.
- [x] 5.4 Verify real proxy/browser touch interactions on isolated fixed-width and scrollable fixtures, including source field updates, two-axis panning, password focus, bottom navigation and phone/desktop fit. Update browsing guidance/changelog, run focused tests and payload checks, and validate the refreshed review page before returning for a new Statlas trial.

## 6. Room above the phone keyboard

- [x] 6.1 Add keyboard-aware mobile chrome hiding/restoration and visual viewport sizing without horizontal width, remote viewport or canvas scale changes. Preserve focus/values and show closure status; verify reduced viewport, focus retention after keyboard dismissal, hardware keyboard, and desktop behavior.
- [x] 6.2 Reveal the focused native preview field or Fields/Other typing input inside its local scroller as the keyboard opens, accounting for viewport offsets and layout settling without disrupting intentional swipes; verify both axes, no pan reset and correct typing target.
- [x] 6.3 Check the cramped rendered mobile keyboard layout through an isolated real proxy, verify focused field visibility and restored controls on close, run focused tests/payload checks, and update browsing guidance/changelog/review for another Statlas phone trial.

## 7. Home and history recovery

- [x] 7.1 Add authenticated allowlisted Home navigation to the server-derived HTTP(S) website root, preserving serialization and rejecting client URLs/unsupported origins; test URL derivation, key/closed-link denial and queued navigation without automatic repeats.
- [x] 7.2 Detect one-entry browser history before Back/Forward and return explicit no-history feedback while preserving fields, focus/values and preview pan. Add a compact accessible Home control that fits320px and follows keyboard hiding; test no-history preservation, ordinary success/failure and narrow layout.
- [x] 7.3 Verify the real proxy with isolated profiles for fresh-page no-history, Home, actual Back/Forward and image-link taps after two-axis pan/viewport offsets without drag clicks. Update browsing/changelog/review, run targeted tests/payload checks and strict validation; return to parent for a fresh Statlas Home trial.

## 8. Icon navigation and return to start

- [x] 8.1 Capture the prepared task tab's initial HTTP(S) address once in private watcher state, preserving path/query/hash and stripping credentials; replace Home with server-only allowlisted Return to start. Test capture/state plumbing, browserless modes, immutable destination across origins, rejected client URLs/old Home/unsupported addresses, closed/key denial and queued/no-retry navigation.
- [x] 8.2 Replace the bottom row with Back/Forward arrows, Reload and distinct Return to start SVG icons with accessible names/tooltips and44px targets; retain phone keyboard hiding. Update no-history/unavailable-start feedback and preserve input/focus/edits/pan on refusal. Run focused page and navigation tests.
- [x] 8.3 Verify rendered icons and phone320/390px/desktop900/1440px fit in isolated profiles, plus a real proxy return to an exact non-root initial URL after cross-origin browsing. Update browsing/changelog/design evidence and review, run payload/config checks and strict validation; return for parent audit and a fresh private Statlas trial without publishing.

<!-- end tasks.md -->
<!-- file specs/browser-logins/spec.md utf8 10855 -->
## ADDED Requirements

### Requirement: The person can recover from browser navigation

The hand-over SHALL offer icon controls for Back, Forward, Reload, and Return to start at the bottom in both Page and Fill fields views on phones and below the workspace on computers. On phones the controls SHALL hide while the on-screen keyboard is open and return when it closes. They SHALL act on the handed-over website, not the private link's own browser history. Navigation SHALL wait for queued field edits and SHALL never automatically retry an uncertain action. Closed links and unauthenticated requests SHALL NOT navigate the website. Every icon SHALL have an accessible name and tooltip, and a touch target of at least44 CSS pixels in both dimensions. Return to start SHALL open the initial handed-over HTTP(S) page address captured by the server once as this private link opens, keeping its path, query and fragment and removing URL credentials. Its destination SHALL remain unchanged across website navigation, including visits to other origins, and SHALL never be supplied by the client. Home-to-origin SHALL no longer be offered. The start address SHALL remain private to the short-lived watcher state and server; unavailable or unsupported start addresses SHALL report unavailability without clearing local fields or preview position. If the browser has only one history entry, Back and Forward SHALL report that no traversal is available without clearing local fields or resetting preview pan. A no-history action SHALL not be replaced with a different destination.

#### Scenario: An accidental external page
- **WHEN** the person follows an unwanted website link and taps Back
- **THEN** the handed-over browser returns to its preceding page and the field list follows that page

#### Scenario: A decorative logo and fresh browser history
- **WHEN** the person opens a page with no prior browser history and taps Back
- **THEN** the hand-over explains there is no previous page, preserves typing and pan, and offers Return to start to reach the original page without relying on its logo

#### Scenario: Returning from another website
- **WHEN** the hand-over begins on a specific page with a path, query and fragment, and the person later follows a link to another website then taps Return to start
- **THEN** the handed-over browser opens that exact original page address, rather than either website's root, and the field list and preview follow it

#### Scenario: No valid start address
- **WHEN** the starting page address is unavailable or not HTTP(S) and the person taps Return to start
- **THEN** the hand-over explains that the original page is unavailable, preserves typing and preview position, and does not navigate to a guessed page

#### Scenario: Navigation outside the private link
- **WHEN** a closed link or an unauthenticated request attempts navigation
- **THEN** the browser does not navigate

### Requirement: Page and fields have separate space

On windows narrower than 800 CSS pixels the hand-over SHALL offer Page and Fill fields views, with one visible at a time, and keep user-entered fields when switching. The Page view SHALL use the available screen height without requiring scrolling the hand-over document to reach its controls. On wider windows it SHALL show the live page and independently scrollable fields side by side. Connection and closure state SHALL remain visible in both layouts, with phone chrome temporarily hidden during keyboard entry and restored on closure.

#### Scenario: A phone login
- **WHEN** a person opens the hand-over on a phone and switches between Page and Fill fields after typing
- **THEN** the views fit the phone, the typing is preserved, and only the selected view accepts focus

#### Scenario: A desktop login
- **WHEN** a person opens the hand-over on a computer
- **THEN** the live page and fields are visible together and scrolling the fields does not move the page

### Requirement: The handed-over page scrolls dependably

A touch drag on the live page SHALL move the viewed content without scrolling the outer hand-over or turning that drag into a click. A phone preview SHALL allow panning a taller browser viewport so fixed-height pages can be viewed even when they provide no native scroll range. Scroll distance beyond the preview's available range SHALL scroll the website at the touched position. A cancelled gesture SHALL never click. Wider pages SHALL permit dragging left and right to reach both edges. Remaining horizontal and vertical scroll distance SHALL be forwarded independently at the gesture origin. Desktop wheels SHALL scroll at the pointer's page position. Navigation SHALL return the preview to its initial position.

#### Scenario: A phone swipe
- **WHEN** a person drags upward on the live page and releases outside its original position
- **THEN** the viewed content moves down through the page, additional distance scrolls the website, the outer hand-over remains still, and no click is sent

#### Scenario: A wide login form
- **WHEN** a login form extends beyond the phone width and the person drags sideways
- **THEN** the opposite edge becomes visible, a tap lands at its displayed position, and no form is submitted

#### Scenario: A swipe starting over a text field
- **WHEN** a person starts a drag on a text field and releases after moving
- **THEN** the preview scrolls without focusing or clicking that field

### Requirement: A page field opens the phone keyboard

On phones, a tap on a supported text field in the preview SHALL focus a native local input within that trusted gesture and send edits to the corresponding remote field through the existing private typing transport. Password fields SHALL remain password inputs and keep their autocomplete metadata. Local edits SHALL be shared with Fill fields. Geometry updates SHALL preserve active local inputs and SHALL NOT read remote values. Removed Up/Down and Type launchers SHALL not be needed for these interactions.

#### Scenario: Direct phone typing
- **WHEN** a person taps a supported text field in Page and types with the phone keyboard
- **THEN** the local field receives native focus, the typing reaches the correct website field, and switching to Fill fields retains it

#### Scenario: A moving field
- **WHEN** field geometry changes while the person is typing
- **THEN** the input position updates without replacing the focused input or reading the remote value

### Requirement: Phone typing keeps room for the active field

When an on-screen phone keyboard reduces the visual viewport, the hand-over SHALL hide its header, view tabs, and navigation while typing, and give the selected workspace that space. It SHALL keep the focused input mounted and pan its local scroller only as needed to show the active field in the remaining area. The remote viewport and page scale SHALL remain unchanged by height-only keyboard changes. Dismissing the keyboard SHALL restore the controls even if the input remains focused. A hardware keyboard without a reduced visual viewport SHALL not hide controls. Closure SHALL restore the status.

#### Scenario: A password field above the keyboard
- **WHEN** a person taps a password field and the on-screen keyboard shrinks the phone's visible area
- **THEN** the header, tabs and navigation disappear, the password field is visible in the local stage, focus and typing are retained, and the remote page is not resized

#### Scenario: Dismissing the keyboard without blurring
- **WHEN** the person dismisses the keyboard while the native field keeps focus
- **THEN** the original controls return without clearing typing or resetting the preview pan

#### Scenario: Typing with a physical keyboard
- **WHEN** a person focuses a field with a physical keyboard and the viewport does not shrink
- **THEN** the navigation stays available

## MODIFIED Requirements

### Requirement: The person can click and type in a handed-over browser

A hand-over link SHALL open the page the task was using, never a blank tab, and SHALL let the person click any spot on it and type into the field they chose, from a phone's on-screen keyboard or a computer's keyboard. The link SHALL show only that task's browser, not other browser sessions on the computer. When the link is open in a window narrower than 800 CSS pixels, the handed page SHALL initially take that window's width and a taller browser viewport. A visible form wider than that SHALL increase the bounded remote viewport width and permit preview panning so its edges remain reachable at readable size; sites whose layout fits SHALL retain their phone width. A wider window SHALL get 1280×720. When the link closes, however it closes, the page SHALL return to 1280×720 before the agent carries on.

#### Scenario: A card number from a phone
- **WHEN** the agent hands over a card form and the person, on a phone, taps the card box and types the number
- **THEN** the number appears in the card box on the agent's page

#### Scenario: A stray blank tab
- **WHEN** the browser has a blank tab in front of the task's page at hand-over
- **THEN** the link opens on the task's page

#### Scenario: A link opened on a phone
- **WHEN** the person opens the link on a phone 390 points wide
- **THEN** the preview fits the phone, the site's full form is reachable by panning when necessary, and a tap lands on the spot tapped
- **AND** after the link closes, the page is 1280×720 again

### Requirement: The agent keeps its hands off during a hand-over

While a hand-over link is open for input, the agent SHALL send the browser no commands, and SHALL read only the browser's address or whether an element it named is present, never the page's content, field values, or a picture of it. The hand-over tool MAY read the page's field labels, kinds, geometry, and dropdown choices, visible form layout width, navigation metadata limited to history length and the initial handed-over page address, and its form actions' labels, association, geometry, and visible/enabled state to list or position them for the person, and MAY set a field or resolve a mirrored action on the person's action. It SHALL never read a field's value, tick state, or current choice, SHALL never pass what the person types as a command argument, and SHALL give the agent nothing but the result. Private input and browser control through the link SHALL end before the originating workspace is notified to resume.

#### Scenario: A two-step code page
- **WHEN** the site shows a code page after the password
- **THEN** the agent keeps waiting, having read nothing but the address

#### Scenario: A card typed into the field list
- **WHEN** the person types a card number into the hand-over page's field list
- **THEN** the number reaches the page's card field, and appears in no command, file, log, or message the agent can read

<!-- end specs/browser-logins/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41352 fence=~~~ -->
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
<title>Review · 2026-09-30-comfortable-browser-handover</title>
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
<body data-change="2026-09-30-comfortable-browser-handover">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-comfortable-browser-handover</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">On a phone it is hard to scroll the live website and reach the typing controls below it. Give the website and the easier-to-fill fields their own space, with clear controls on both phones and computers.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>On a phone, choose Page or Fill fields.</b> The page fills the available screen, and the fields have their own scrolling view. Switching keeps what you typed.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">Live page</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">Scroll down to fields</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">Scroll back up to page</span>

<span class="ln" data-note="item-1-line-6" tabindex="0">AFTER: PHONE</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">Your turn                 Live</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">[Page] [Fill fields]</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">Page: swipe to scroll</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">Tap a field: keyboard opens</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">[←] [→] [↻] [↩]</span>

<span class="ln" data-note="item-1-line-13" tabindex="0">FILL FIELDS</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">Email     [                 ]</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">Password  [                 ]</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">[Sign in]</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">Other typing</span>

<span class="ln" data-note="item-1-line-19" tabindex="0">WAITING / CLOSED</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">Connecting... / Link closed</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">Return to chat when finished</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>On a computer, see the page and fields together.</b> The fields stay beside the website, with their own scroll area.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">BEFORE: PAGE THEN FIELDS</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">Page</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">Fields below</span>

<span class="ln" data-note="item-2-line-5" tabindex="0">AFTER: COMPUTER</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">Live page        | Fill fields</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">Click and type   | Email</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">Scroll normally  | Password</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">                | [Sign in]</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">[←] [→] [↻] [↩]</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Swipe to scroll, tap a field to type.</b> Remove Up, Down, and Type. Tapping a text field on the page opens the phone keyboard; Fill fields remains available for autofill and unlisted controls.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Reach wider login forms.</b> Allow dragging left and right as well as up and down. Expand the remote viewport when a visible login form needs more width, keeping its preview readable and pannable instead of cutting off the edge. Try the result on Statlas.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Go back after an accidental click.</b> Back and Forward arrows, a Reload icon, and a Return to start icon stay at the bottom in either view. Return to start opens the exact page where this private link began, even after browsing to another website. Each icon has an accessible name and a desktop tooltip. If there is no history, Back explains that instead of silently doing nothing. On phones, the header, view tabs and navigation hide while the keyboard is open to give the page more room, and return when it closes. The selected field stays visible.</div></div></li>
</ol>
<p class="aside">Non-goals: changing Statlas or the password-saving screen.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked to rethink desktop and mobile and let the user try Statlas login → build an unpublished trial and hand it over on Statlas.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: use Page and Fill fields tabs on phones and adjacent panels on computers, because the stacked layout mixes two scrolling jobs.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: keep the existing private link and form handling, because the requested change concerns usability.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether there is a way back after getting stuck on an unwanted Google page → returned the trial browser to Statlas and added persistent Back, Forward, and Reload controls.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked why Up/Down do not work and for ordinary phone swiping → checked the real stream: wheel input moves a long document, but Statlas's short login viewport has no scroll range and places content outside the visible area. Use a taller phone browser viewport with a pannable live preview, consuming preview movement before forwarding the remaining scroll to the website. Back, Forward, and Reload stay visible.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-30</p>Check: start the completion test's observation at its first watcher address read after the initial address capture, feed and tunnel preparation. Keep every permitted-read and final viewport-restoration assertion. Takeover and element-only modes capture the starting address once during preparation and make no further address reads.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to remove Up/Down and Type, open the keyboard by tapping fields, put navigation at the bottom, and fix clipping → simplify controls, add native text-field targets on the phone preview, and include the visible form width in viewport selection. Statlas has a 464px form in a 370px browser viewport.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to drag wider pages left and right too → use two-axis local preview panning and forward remaining movement to the website at the gesture origin. Keep wide forms readable, with their edges reachable by sideways dragging.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Phone trial confirms the keyboard opens, but shows only the Statlas logo after the available preview shrinks; asked to remove navigation while typing → hide the hand-over header, view tabs and bottom navigation during the mobile keyboard, retain full-size page pixels, and pan the active field into the remaining visible stage. Restore controls and preserve input/focus/pan when the keyboard closes. Safari-owned keyboard/address bars remain browser UI.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked why Back does not work and the logo will not go home → verified the current Statlas welcome page has one browser history entry; agent-browser Back reports success without moving, and clicking its plain logo does not change the address. Add an explicit Home action to the current website root and truthful no-history feedback. Do not modify Statlas or convert decorative logos into links. Verified https://statlas.io/ is its Home page in an isolated profile.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked to remove Home, use arrow/icons in the bottom row, and return to the original link instead → replace Home with Return to start, remembering the handed-over page address once as this link opens. Preserve its path, query and fragment; never follow a client-supplied URL or recalculate from a later website. Use familiar arrow/reload icons and a distinct return-to-start icon with accessible names and tooltips. Keep the keyboard hiding and existing history behavior.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Invoked <code>/ship</code> → all22 tasks are checked and the change is archived for the single release checkpoint. Keep the tested icon toolbar, original-page return, two-axis swiping and keyboard space; publish as27.9.0 after the required checks.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Release checks found three unused-variable warnings → mark excluded geometry bindings as unused and use the destructured pointer target in the test helper. Keep the lint rule and every assertion enabled; navigation and gesture behavior are unchanged.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>Another release took27.9.0 after the checkpoint passed → merge the latest main, retain both changelog entries and all incoming changes, and number this browser release27.10.0. Repeat the ordinary save gate before merging; the preview walk remains NONE because these are host-side browser routes.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-30</p>All711 script tests passed after the merge, but global lines were84.9% against the unchanged85% floor. The browser test harness ran the module as anonymous inline HTML, leaving its executed interactions unattributed. Evaluate that same module in the existing JSDOM context with its actual filename and preserved byte offsets: all35 assertions still pass, and module lines are92.71% instead of10.4%. Add real queued-field/navigation ordering and close-during-work regressions; both pass. Keep every coverage threshold, include rule and test enabled.</li>
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
