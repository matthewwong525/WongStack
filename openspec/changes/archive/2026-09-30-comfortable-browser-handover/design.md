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
