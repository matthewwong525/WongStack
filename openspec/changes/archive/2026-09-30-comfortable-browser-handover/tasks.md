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
