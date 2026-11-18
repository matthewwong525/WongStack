<!-- openspec-archive v1 2026-09-30-welcoming-starter-home -->
<!-- file proposal.md utf8 20107 -->
# A welcoming starter workspace

**Status:** ready-to-ship

**Branch:** app-design-finished

**Open questions:** none

## Why

The starting page looks like a technical exercise: its first instruction is to remove a tutorial box. A welcoming, polished page should help a person see that this workspace is theirs and that changing it starts with a plain request.

## What Changes

- **A workspace that feels ready to make your own.** WongStack Cloud's black-and-white theme and colored W logo give the starter a familiar identity. Clear spacing and quiet cards keep it welcoming in both light and dark modes. The welcome guide sits above the apps; the page keeps its heading and apps when the guide is removed. These sketches show a new install on a phone and an illustrative first change.
  ```text
  BEFORE · PHONE
  ┌──────────────────────────────────────┐
  │ Learn the development loop           │
  │ Your first change removes this box.  │
  │ Copy this message into your chat.    │
  │                                      │
  │ Remove the tutorial from my home     │
  │ page. Walk me through each step      │
  │ and explain what it does.            │
  │ [Copy]                               │
  │                                      │
  │ Your apps                            │
  │ Hello                                │
  │ An example of a page and its API.    │
  └──────────────────────────────────────┘

  AFTER · PHONE
  ┌──────────────────────────────────────┐
  │ [W] WongStack                        │
  │ ──────────────────────────────────── │
  │ Your workspace, shaped around you    │
  │ Your tools, in one place.            │
  │                                      │
  │ Make it yours                        │
  │ Want something different? Just ask   │
  │ in your chat. See a preview before   │
  │ anything goes live.                  │
  │                                      │
  │ Help me make this home page my own.  │
  │ Ask me what to call it, update the   │
  │ heading, and remove this welcome     │
  │ guide. Explain each step and show    │
  │ me a preview before publishing.      │
  │ [Copy your first request]            │
  │ Paste it into your chat to start.    │
  │                                      │
  │ Your apps                            │
  │ Hello                       Example  │
  │ A small example to try and change.   │
  └──────────────────────────────────────┘

  AFTER THE FIRST CHANGE
  ┌──────────────────────────────────────┐
  │ [W] WongStack                        │
  │ ──────────────────────────────────── │
  │ Claymoo                              │
  │ Your tools, in one place.            │
  │                                      │
  │ Your apps                            │
  │ Hello                       Example  │
  │ A small example to try and change.   │
  └──────────────────────────────────────┘
  ```
- **One useful first request.** Copy a message into your chat to name the workspace and remove the welcome guide, with an explanation and a preview before publishing. The button confirms a copy; if copying is unavailable, the message stays selectable by hand.
  ```text
  MESSAGE COPIED · WELCOME EXCERPT
  ┌──────────────────────────────────────┐
  │ Make it yours                        │
  │ [Same selectable message]            │
  │ [Copied]                             │
  │ Paste it into your chat to start.    │
  └──────────────────────────────────────┘

  COPY UNAVAILABLE · WELCOME EXCERPT
  ┌──────────────────────────────────────┐
  │ Make it yours                        │
  │ [Same selectable message]            │
  │ [Select the message and copy it]     │
  │ Paste it into your chat to start.    │
  └──────────────────────────────────────┘
  ```
- **Apps that feel inviting.** Each app has a clear title, description, and a generous clickable card. The supplied example is labeled as an example. When no apps exist, the page shows a useful request to try; loading and errors remain clearly explained.
  ```text
  NO APPS · APPS EXCERPT
  ┌──────────────────────────────────────┐
  │ Your apps                            │
  │ Your next tool starts with a request │
  │ Ask in your chat:                    │
  │ "Make me a tip calculator."          │
  └──────────────────────────────────────┘

  LOADING · APPS EXCERPT
  ┌──────────────────────────────────────┐
  │ Your apps                            │
  │ Loading your apps...                 │
  └──────────────────────────────────────┘

  COULD NOT LOAD · APPS EXCERPT
  ┌──────────────────────────────────────┐
  │ Your apps                            │
  │ Your apps could not load.            │
  │ Reload the page to try again.        │
  └──────────────────────────────────────┘
  ```

- **An example that feels like a finished little app.** The Hello page gets the same logo and theme, with the logo as its way home, and a compact form with the label above the field. The greeting appears below the button. The logo and workspace heading are starting defaults that can be changed by asking in chat.
  ```text
  BEFORE · PHONE · CURRENT PREVIEW
  ┌──────────────────────────────────────┐
  │ Home                                 │
  │                                      │
  │ Hello                                │
  │                                      │
  │ Your name [_______________________]  │
  │ [Say hello]                          │
  │                                      │
  └──────────────────────────────────────┘

  AFTER · PHONE
  ┌──────────────────────────────────────┐
  │ [W] WongStack                        │
  │ ──────────────────────────────────── │
  │ Example app                          │
  │ Hello                                │
  │ A small example you can make yours.  │
  │                                      │
  │ ┌──────────────────────────────────┐ │
  │ │ Your name                        │ │
  │ │ [e.g. Sam_____________________]  │ │
  │ │ [          Say hello          ]  │ │
  │ │ Your greeting will appear here.  │ │
  │ └──────────────────────────────────┘ │
  └──────────────────────────────────────┘

  GREETING · FORM EXCERPT
  ┌──────────────────────────────────────┐
  │ Your name                            │
  │ [Sam_______________________________] │
  │ [             Say hello            ] │
  │ Hello, Sam!                          │
  └──────────────────────────────────────┘

  COULD NOT GREET · FORM EXCERPT
  ┌──────────────────────────────────────┐
  │ Your name                            │
  │ [Sam_______________________________] │
  │ [             Say hello            ] │
  │ Something went wrong. Try again.     │
  └──────────────────────────────────────┘
  ```

- **The calculator belongs to the same workspace.** The existing tip calculator gets the same W header, neutral surfaces, and stacked fields as Hello. Tap the logo or WongStack name to go home; neither app needs a second Home link. Changing the bill, tip, or people still updates the result immediately.
  ```text
  BEFORE · PHONE
  ┌──────────────────────────────────────┐
  │ Home                                 │
  │ Tip calculator                       │
  │ Bill                                 │
  │ [0.00_____________________________]  │
  │ Tip                                  │
  │ [10%] [15%] [18%] [20%]              │
  │ People                               │
  │ [1________________________________]  │
  │ Enter the bill amount.               │
  └──────────────────────────────────────┘

  AFTER · PHONE
  ┌──────────────────────────────────────┐
  │ [W] WongStack                        │
  │ ──────────────────────────────────── │
  │ Tip calculator                       │
  │ Split a bill and choose a tip.       │
  │                                      │
  │ Bill                                 │
  │ [0.00_____________________________]  │
  │ Tip                                  │
  │ [10%] [15%] [18%] [20%]              │
  │ People                               │
  │ [1________________________________]  │
  │                                      │
  │ Enter the bill amount.               │
  └──────────────────────────────────────┘

  RESULT · CALCULATOR EXCERPT
  ┌──────────────────────────────────────┐
  │ Bill $100 · Tip 20% · 4 people       │
  │ $30.00 each                          │
  │ Tip $20.00 · Total $120.00           │
  └──────────────────────────────────────┘

  INVALID INPUT · RESULT EXCERPT
  ┌──────────────────────────────────────┐
  │ [Same editable fields above]         │
  │ At least one person pays.            │
  └──────────────────────────────────────┘
  ```

**Non-goals:** A chat box inside the website, an editing panel, a multi-step tour, business-specific features, marketing or account navigation, or a new app.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mini-apps`: The starter welcome offers a personal first change, the app list explains first use, and the starter and example share WongStack branding and a polished look while retaining device fonts and light/dark preferences.

## Impact

Update the home page, layout, tutorial, app list, and their styles/tests; shared stylesheet and favicon; example app layout, styles, and description; the existing source-only tip calculator layout and styles; relevant starter-page documentation and payload manifest guidance. Reuse the existing WongStack Cloud W SVG, with no new dependency, API route, or data change. This is a minor payload release; implementation updates its one changelog entry and leaves VERSION to shipping. Existing customized pages and branding are adapted only by a reviewed update; a removed tutorial remains removed.

## Decision log

- **2026-09-30** — Assumed: The consistent-mini-app refinement is ready to review, because the refreshed host build passed and both Hello and Tips fit 320px, 390px, and desktop in light/dark modes, with one brand home link and no separate Home link. Clicking the logo itself returned home from both apps. Tips retained immediate calculation, a visible 3px keyboard focus, keyboard selection of 20%, and the $30-each result for $100/four people/20%; invalid people retained the existing message and recovered after correction. Empty-bill guidance was checked separately with valid people; when people are also invalid the existing people error takes precedence. Payload/config checks and the loosened-check detector passed. Calculator script, math, and arithmetic tests are unchanged; automated execution remains for the save/CI gate. Dark phone result screenshot: /root/.agent-browser/tmp/screenshots/screenshot-1790738086096.png.

- **2026-09-30** — Asked what to do next → match the tip calculator to the revised starter and Hello design, and use the clickable logo/name as the sole way home instead of a separate right-side Home link. This refinement keeps the existing calculator logic and does not add it to the distributed payload.

- **2026-09-30** — Assumed: The refined preview is ready to review, because the hosted build succeeded and home/Hello fit 320px, 390px, and desktop in both light and dark modes with the W asset loaded. Keyboard focus and home navigation worked; the welcome confirmed copying and handled unavailable clipboard access. Hello responded “Hello, Sam!” through keyboard submission and retained Sam with its retry instruction after a browser-simulated HTTP 500. Tips still returned $30 each for $100, four people, and 20%. Text, control, and focus contrast meet their thresholds; payload/config/context and loosened-check checks passed. Automated tests are updated and remain for the save/CI gate. Preview: https://welcoming-starter-home-wongstack-staging.matthewwong525.workers.dev/. Phone screenshots: dark Hello screenshot-1790727446851.png; dark home screenshot-1790727481943.png; light Hello screenshot-1790727528909.png in the host's browser screenshot directory.
- **2026-09-30** — Asked whether to match WongStack Cloud and add its logo, with feedback that the Hello page looks unfinished → refine the existing preview with Cloud's neutral theme, its current colored W logo, and a stacked example form. The earlier green palette was an aesthetic assumption, not a product or technical constraint.
- **2026-09-30** — Assumed: Retain device-selected light and dark modes and the narrow tool layout while adopting Cloud's identity, because this is a personal workspace and its examples rather than the Cloud marketing site.
- **2026-09-30** — Assumed: Continue the already authorized build and show the revised preview before publishing, because this is feedback on that preview rather than a request to start a separate feature.

- **2026-09-29** — Asked what the starting app should make a new person feel → chose polished and easy to change, welcoming and clear that they can ask for changes.
- **2026-09-29** — Asked the next step → chose to plan a welcoming page with softer colors, polished app cards, and one copyable request to make it their own.
- **2026-09-29** — Assumed: Keep the current single-message tutorial, because the earlier memory records a preference for learning through chat rather than a multi-lesson tour.
- **2026-09-29** — Assumed: Personalize the heading and remove the guide in the first request, because a visible change gives the person a useful result while still teaching the existing workflow.
- **2026-09-29** — Assumed: Phone first, with the same narrow column on larger screens, because the current preview was reviewed at phone width and the initial flow is short.
- **2026-09-29** — Assumed: Use warm neutral surfaces and a muted teal accent, with matching dark colors and the device's font, because the app should feel polished without adding assets or dependencies.
- **2026-09-29** — Assumed: Keep the tutorial component removable and preserve the existing sync guard, because people who finished the introduction should never receive it again.
- **2026-09-29** — Asked whether to build the design → chose to build it and show a preview before publishing.
- **2026-09-29** — Assumed: Keep hosted-preview tasks pending because Cloudflare rejected the primary worktree's saved token (authentication code 10000; invalid-token code 9109). Code, behavior-test updates, documentation, and the payload release entry are written; payload checks pass. Local development browser checks cover 320px/390px/desktop, light/dark colors, native copy confirmation and missing-clipboard fallback, keyboard focus, long app labels, list states, and Hello/Tips. Empty/error list states and long labels were simulated only in the local browser. Automated tests remain for the save gate; clipboard readback was unavailable due browser read permission, while copy reported success. The uploaded preview remains unverified until the token is replaced.
- **2026-09-29** — Asked which workspace fixed the token → chose WongStack Cloud. Its saved token was verified against this app's target Cloudflare account and rotated into the primary credentials and this seeded workspace copy without exposing the value.
- **2026-09-29** — Assumed: The build is ready to review, because the host preview uploaded successfully and browser checks passed at 320px, 390px, and desktop in light/dark modes, including copy confirmation, manual fallback, keyboard focus, and both app links. Hello answered “Hello, Sam!” and a $100 bill split four ways at 20% produced $30 each. The accessibility audit reported no violations; its manual-review arrow contrast is covered by the measured accent/surface contrast (6.45:1 light, 8.04:1 dark). Automated tests remain for the save gate. Preview: https://welcoming-starter-home-wongstack-staging.matthewwong525.workers.dev/.

- **2026-09-30** — Asked what to do after the calculator/header refinement → chose to publish after the required checks. Archived the complete change for this checkpoint, incorporated the newer default-branch update without losing either release entry, and numbered this minor release 27.8.0.

- **2026-09-30** — Assumed: Add explicit spaces between app-card title, Example label, and description, because the CI accessibility-name assertions found adjacent text joined without styling. Keep the full-name assertions and all check settings unchanged; this fixes the markup rather than relaxing coverage.

- **2026-09-30** — Assumed: Update the three strict mini-app copy inventories to include Hello’s new style.css, because CI correctly copies that shipped asset. Keep exact file-list assertions so handler, source, and test exclusion remain checked.

<!-- end proposal.md -->
<!-- file design.md utf8 13730 -->
# Design

## Context

See [proposal.md](proposal.md) for motivation and [the delta](specs/mini-apps/spec.md) for the promises. The current Home renders Tutorial, an app heading, and an asynchronous AppList. Tutorial owns one message and three copy states. The shared /style.css is also used by the example and the existing tip calculator. Tutorial removal is deliberately recognized by sync through the Home import/render guard.

## Goals / Non-Goals

**Goals:** Give first use a clear hierarchy and useful first request; keep the page usable after onboarding; match WongStack Cloud's identity and make the example page equally polished without new dependencies.

**Non-Goals:** New editing or chat infrastructure, persistent onboarding flags, marketing/account navigation, custom fonts, generated illustrations, or changes to app discovery.

## Decisions

### Keep the existing parts and remove only the guide

Keep Home, Tutorial, and AppList. Home gains a permanent h1 and short supporting line before Tutorial, and the app heading becomes h2. Retain Tutorial's name and render marker so the existing sync guard keeps working. Removal still deletes its import/render line and its own component, CSS, and tests; it does not remove the workspace heading or list. A new welcome component would add a rename migration without improving this small flow.

Home's default heading is “Your workspace, shaped around you”; its supporting line is “Your tools, in one place.” Tutorial is headed “Make it yours.” Its reassurance is “Want something different? Just ask in your chat. You’ll see a preview before anything goes live.”

The one selectable prompt is: “Help me make this home page my own. Ask me what to call it, update the heading, and remove this welcome guide. Explain each step and show me a preview before publishing.”

The primary button says “Copy your first request.” Its success and failure states remain “Copied” and “Select the message and copy it.” “Paste it into your chat to start.” remains visible under it; copying starts no conversation or edit. Use the person's existing chat rather than inventing a deep link tied to one host.

### Define a small shared look in the existing stylesheet

Keep the current system font, color-scheme: light dark, and 32rem content column. Retain semantic custom properties for canvas, surface, text, muted text, accent, accent text, border, and focus, with explicit light defaults and a prefers-color-scheme dark override. Replace the green palette with neutral whites and grays in light mode and Cloud's near-black surfaces in dark mode. Primary actions are black in light mode and white in dark mode, with contrasting text. Body backgrounds, links, headings, controls, and focus styling remain in app/public/style.css. Prefer spacing and quiet surfaces to strong outlines.

Use the following small scale for new styles: spacing 0.25, 0.5, 0.75, 1, 1.5, 2rem; radii 0.5 and 0.75rem; body 1rem; heading 1.75rem; section heading 1.25rem. Confirm at least 4.5:1 normal-text contrast and 3:1 large-text and control/focus contrast before finalizing colors. Allow native forced-color rendering. Avoid animation and decorative image assets; reuse only the established W SVG.

Tutorial's surface, selectable inset prompt, and copy action are scoped in Tutorial.css. Home-only layout belongs in a new Home.css, imported from Home; it uses class selectors only. App cards stay in AppList.css. No whole-element styling outside the shared stylesheet. Add no globally filled button style: the tutorial action owns its filled treatment, and the existing mini app controls keep their own hierarchy.

### Use the established identity on the starter and example

Replace the stock Vite favicon with the current Twilight-gradient W from /root/wongstack-cloud/app/public/favicon.svg. Reuse that asset in a compact header with visible WongStack text; the decorative image has empty alt text and the brand links home. Put the React header in the common app layout, before main, so home and not-found pages agree. The static example includes equivalent semantic markup and links the same /favicon.svg. Shared header classes live with the shared stylesheet so static and React pages do not drift. Do not introduce a UI library or script for this small header.

Use the live colored mark rather than Cloud's unused silver variant. Keep the existing narrow column rather than copying the marketing site's wide layout or Pricing/Log in links. Hello and the existing tip calculator use only the brand link for home navigation; remove the extra Home link and its unused shared class. The starter identity remains ordinary editable markup and an asset, without a branding lock or new settings system.

### Finish the Hello example layout

Keep the existing form and API contract. Add the example label, short explanation, and a scoped mini-app stylesheet. Group the form in a quiet surface, with an explicitly associated label above a full-width name input, a full-width primary button with a 44px minimum target, and a stable greeting region below. Initial guidance explains where the result appears; successful and failed HTTP responses replace it through the current polite live region. Retain given-name autocomplete and keyboard submit. Keep the current greeting script unless the markup requires an adjustment; do not add unrelated behavior or dependencies.

The label, field, and button stack at 320px; the body should retain useful top spacing without oversized gaps. The user returns home by tapping the logo or WongStack name. Apply the same compact header and quiet form surface to the existing tip calculator; preserve all IDs, data-percent values, aria-pressed states, inputs, and live output that its script uses. Move its whole-element CSS overrides to scoped calculator classes and inherit the shared column and neutral tokens. Use stacked labels/fields, a keyboard-operable tip group with clear selected state, and a prominent result. Do not add a submit button: the existing calculator recomputes as inputs change. The existing calculator remains source-only and is not added to payload-files.json.

### Give the app list a useful state at every point

Preserve loadApps and its existing manifest validation and ordering. Each card is one anchor with the entire surface clickable, a visible focus outline, title, description, and subtle trailing arrow hidden from assistive technology. Mark only the known hello scaffold app with a small “Example” label; use a plain name comparison rather than a new manifest field. Replace hello/app.json's technical description with “A small example you can try and change.”

Keep a single-column list on phone and desktop. Preserve loading and reload guidance, using the same quiet layout. The empty state explains that the next tool starts with a request and gives “Make me a tip calculator” as selectable text. It adds no second copy action. Cards have at least 44px hit areas, wrap long titles and descriptions, and do not require horizontal scrolling at 320px.

### Keep release and update guidance consistent

Update wiki/stack/mini-apps.md and the scaffold paragraph of the payload manifest to describe the personal first change; keep the removed-tutorial guard intact. A new Home.css is already covered by the scaffold's directory inventory; confirm that rather than adding redundant file entries. This is a minor payload release because the introduction changes its first requested action. The changelog's Updating note tells existing installs to adapt the welcome and shared look through review, and to keep a finished guide removed.

## UX

### Use-case brief

A nontechnical owner or teammate opens a fresh install, commonly from a phone, and wants to know what belongs here and how to make it theirs. Done means they can copy one understandable request, know where to paste it, and understand that a preview precedes publishing. Returning users want to open an app quickly. Assume onboarding is used once per install and the app list is used repeatedly; these are design assumptions, not usage measurements. Phone at 390px is the first sketch, with checks at 320px and desktop widths. Mirror the existing Home/Tutorial/AppList structure.

The common case has the supplied Hello example and a working clipboard. A person can also open Hello, enter their name, and see a greeting as a small example of what can be changed. Missing clipboard access, zero apps, loading, a failed app list, and a failed greeting response are edge states. Long content and dark mode are presentation conditions for the same screens.

### Flow

Open home → read the welcome → copy the one prompt → paste into the existing chat → answer its naming question → review the agent's plan and preview → publish when chosen. The page itself only copies text. Following the first change, a named heading and the apps remain. Returning users open an app card directly. Copy failure leaves selectable text; list failure points to a reload without blocking the welcome.

Open Hello → enter a name → Say hello → read the greeting → tap the brand to return home. A failed response offers retry through the same button and retains the entered name.

Open Tips → enter the bill → choose a tip and number of people → read the share immediately → tap the brand to return home. Empty or invalid input keeps the fields editable and the existing guidance visible.

### Hierarchy

The permanent heading orients the person. The welcome surface groups reassurance, one prompt, and the sole filled action. Apps sit immediately below; their links are secondary to the onboarding action. On a home page without the guide, app links become the main actions. Loading/error/empty states occupy only the app section and introduce no competing primary button.

The small brand header establishes continuity on both screens. Hello has one primary action, Say hello; The brand is its secondary home navigation link. The calculator emphasizes its live share; bill entry starts the job and the selected tip is clearly marked. The label and result remain part of the form's visual group.

### Review

[review.html](review.html): What Changes item 1 shows before/after phone screens and the finished first change; item 2 shows copy success/failure excerpts; item 3 shows empty/loading/error app excerpts; item 4 shows Hello before/after and greeting success/failure excerpts; item 5 shows the calculator before/after, result, and invalid-input excerpts. Normal cards are in item 1. Excerpts replace only their section; the rest of the page stays as drawn.

### Components

Reuse Home, Tutorial, AppList, the existing Suspense boundary, and loadApps. Add Home.css for page-specific spacing and a small shared React header in the app layout. Static Hello and Tips use matching header markup, their existing controls/live regions, and local stylesheets. Use semantic headings, a region for the guide, a selectable blockquote, the existing polite copy status, and ordinary links. No library is needed.

## Risks / Trade-offs

- Shared palette changes existing mini app appearance → Keep element defaults modest and inspect Hello and Tips on the host preview in light and dark modes; do not restyle their behavior.
- A polished page could appear fixed → The welcome explicitly invites changes and the first prompt yields a visible personal result. Whether this builds confidence remains a hypothesis until newcomers try it.
- A phone has limited room for the prompt → Keep only one prompt, wrap it naturally, and keep decoration small.
- A removed guide could be restored by an update → Preserve Tutorial's existing name and sync guard, and retain the main-spec removed-tutorial scenario.
- Preview sketches cannot prove color contrast or fit → Check the actual host preview during implementation; automated tests cover behavior, not subjective polish.

## Migration Plan

Implementation is ordinary scaffold code and documentation, with no data migration. New installs receive the new welcome. Existing installs take reviewed adaptations according to the current payload equivalence rules; user-owned headings and finished onboarding are preserved. Keep tutorial files ignored by sync where Home no longer renders it.

CI remains the test/build gate when the work is saved. Apply uploads a host preview for review without saving automatically. Revert the shared stylesheet/favicon, app layout, home/tutorial/list files, Hello markup/styles/description, and guidance to undo the change; no data needs restoring.

## Validation

Update the existing Tutorial and Home tests for the accessible heading structure, one prompt, clipboard success/rejection/absence, list loading/empty/failure/success, the example label, and ordinary cards. Correct router.test.tsx's two outdated “Your apps” h1 assertions to the permanent home heading and retain its navigation behavior checks. Verify the header is an accessible home link and Hello has the shared/local styles, label association, and polite result. Cover any new branches rather than loosen checks. Keep the shared stylesheet link and color-scheme test and the example app's existing tests. Do not add tests of CSS declarations or snapshots that merely mirror styles.

During /apply, inspect the host preview at 320px, 390px, and desktop, in light and dark modes. Exercise copy, keyboard focus, long labels, app links, and Hello/Tips controls. The first-change prompt's expected preview-before-publish behavior is supplied by the established change loop; the website does not implement it. /save runs CI when saving is authorized; no task here requires a premature save.

<!-- end design.md -->
<!-- file tasks.md utf8 6940 -->
# Tasks

## 1. Shared appearance

- [x] 1.1 Add the small light/dark semantic palette and modest shared element/focus styling to app/public/style.css, preserving system fonts, color-scheme, the 32rem column, and mini app control behavior. Verify existing stylesheet-link/color-scheme tests remain meaningful and the host preview shows readable light/dark text, visible focus, and no horizontal overflow at 320px.
- [x] 1.2 Update the shared-look description in wiki/stack/mini-apps.md to match the new common surfaces and accent; verify it still describes the same /style.css loaded by the main and example app.

## 2. Home and welcome

- [x] 2.1 Add the permanent home heading/supporting line and Home.css, change the apps heading to h2, and restyle Tutorial with the proposed reassurance, one selectable prompt, and copy button. Keep the Tutorial component name and removal marker. Verify the home ordering and that removing only the guide leaves the heading and app list usable.
- [x] 2.2 Update Tutorial.test.tsx and relevant Home.test.tsx assertions to cover the new accessible headings, full single prompt, copy success, rejection, absent clipboard, and guidance to paste into the existing chat; retain meaningful behavior coverage with no skips or relaxed check settings.
- [x] 2.3 Update the tutorial paragraph in wiki/stack/mini-apps.md and the scaffold paragraph in .agents/skills/wong-sync/references/payload-manifest.md for the personal first change. Verify both keep the instruction to update tutorial files only while the target still renders Tutorial.

## 3. App list

- [x] 3.1 Polish AppList and its scoped stylesheet into full-surface links with clear focus, title/description hierarchy, and a small Example label only for hello. Improve empty/error guidance while retaining loading, discovery, ordering, and destinations. Verify populated, empty, loading, and failed states match the sketches.
- [x] 3.2 Update Home tests for Hello's example label, normal app cards without that label, accessible destinations, and all list states; cover any new branches without CSS snapshots. Verify a long title/description wraps at phone widths.
- [x] 3.3 Replace the technical description in mini-apps/apps/hello/app.json with the proposed plain description. Verify the title and route stay intact and the existing example app tests need no behavioral changes.

## 4. Payload release

- [x] 4.1 Add one “Next (minor)” changelog entry for the welcoming starter design, with a plain Updating note about reviewed adaptations and keeping a finished welcome removed; leave VERSION alone. Verify the scaffold directory inventory already covers Home.css.
- [x] 4.2 Run node scripts/check-payload-links.mjs and node scripts/check-openspec-config.mjs; run node scripts/measure-context.mjs --check because the payload manifest reference changed. Verify all pass and fix issues without loosening checks.

## 5. Integration and review

- [x] 5.1 Upload the host preview through /apply and inspect the home page at 320px, 390px, and desktop in light/dark modes. Verify copy status/manual fallback, keyboard focus, contrast, app links, and Hello/Tips controls; record any unverified case plainly. Keep tests/build gates for /save when saving is authorized.
- [x] 5.2 Validate the completed change with openspec validate welcoming-starter-home --strict --no-interactive, keep artifacts aligned with implementation, and regenerate review.html with the plan builder. Verify the page is current and print its link alongside the host preview for review.

## 6. Cloud identity refinement

- [x] 6.1 Replace the shared teal palette with neutral light/dark colors matching Cloud's identity, preserving semantic tokens, fonts, column, focus, and existing control behavior. Verify normal text and controls have readable contrast and Tips still works under the new palette on the host preview.
- [x] 6.2 Replace the Vite favicon with Cloud's current Twilight W SVG and add a compact WongStack home-link header to the main app layout and Hello using shared header styles. Verify accessible home navigation, decorative logo alt text, and phone fit; retain meaningful router tests and correct both outdated home h1 expectations.
- [x] 6.3 Update the shared-look guidance and existing single changelog entry for neutral colors and editable default branding. Verify customized-branding adaptation and the removed-Tutorial guard remain explicit; run payload links, OpenSpec config, and context-budget checks without changing VERSION.

## 7. Hello layout refinement

- [x] 7.1 Add the example label, explanation, compact form surface, stacked associated label/input, full-width primary action, initial result guidance, and local stylesheet to Hello. Verify existing API/script contract and keyboard submit remain intact and success/HTTP failure replace the polite result while keeping the entered name.
- [x] 7.2 Retain existing example tests and cover any meaningful new markup behavior without CSS snapshots or loosened checks. Verify accessible label association, shared/local stylesheet loading, and live result during host-browser checks; leave automated test execution to /save's CI gate.

## 8. Revised preview

- [x] 8.1 Refresh the same host-preview alias and inspect home and Hello at 320px, 390px, and desktop in light/dark modes. Verify logo, navigation, no overflow, copy/manual fallback, keyboard focus, greeting success/HTTP failure, and unchanged Tips; record evidence and any unverified case.
- [x] 8.2 Keep artifacts aligned, validate strictly, rebuild the review page, and run the loosened-check detector. Verify all pass and return the revised preview and plan links before publishing.

## 9. Consistent mini-app navigation and calculator layout

- [x] 9.1 Remove Hello's redundant Home link, delete unused site-home styles, and update the existing navigation markup assertion to verify the brand is the sole home link. Update the mini-app wiki guidance and existing changelog wording to describe brand navigation. Verify accessible logo/name navigation remains and payload/config checks pass.
- [x] 9.2 Give the existing Tips page the same favicon/header, shared column, quiet surface, stacked labeled fields, neutral selected-tip treatment, and clear result hierarchy. Replace its whole-element overrides with scoped styles. Preserve all script hooks and arithmetic tests; verify live recalculation, aria-pressed selection, empty/invalid guidance, and keyboard operation on the host preview without adding a submit action or payload entry.
- [x] 9.3 Refresh the same host preview and inspect Hello and Tips at 320px, 390px, and desktop in both color modes. Verify clicking the logo itself returns home, no separate Home link exists, controls fit, and $100 split four ways at 20% remains $30 each. Align artifacts, validate strictly, rebuild the review page, and run the loosened-check detector; automated tests remain for /save's CI gate.

<!-- end tasks.md -->
<!-- file specs/mini-apps/spec.md utf8 6606 -->
# Mini apps delta

## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its guidance with a removable welcome that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

### Requirement: Every page shares one stylesheet

The main app SHALL serve one shared stylesheet at /style.css, holding the look every page shares: the device's font, light or dark to match the device, and a narrow column. The starter app and the example mini app SHALL link it rather than copy its rules. The shared look SHALL provide coherent surfaces, text, accents, and visible keyboard focus, with readable contrast in both color modes. A page's own rules SHALL live beside it. The shared look SHALL use no UI library or CSS framework.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's landing page and then /apps/hello/
- **THEN** both pages load /style.css and show the same font and light or dark colors, with readable text and visible keyboard focus

## ADDED Requirements

### Requirement: The starter and example share an editable identity

The starter and supplied example SHALL show the WongStack mark and name in a compact header with the mark and name forming the keyboard-accessible link home, without a second Home link. They SHALL share a neutral light/dark theme consistent with WongStack Cloud. Their branding SHALL remain changeable through the ordinary workspace change process. Updates SHALL preserve an install's customized identity through review rather than silently overwrite it.

#### Scenario: Open the supplied example

- **WHEN** a person opens the starter home and follows its Hello card
- **THEN** both pages show the same WongStack identity and theme, and the example provides a clear way home

#### Scenario: A customized install updates

- **WHEN** an install with its own identity takes a reviewed starter update
- **THEN** its chosen branding is preserved or explicitly adapted in that review

### Requirement: The supplied example is usable on a phone

The supplied Hello example SHALL present a clearly labeled name field, a primary greeting action, and an announced greeting result. Its field and action SHALL fit narrow phone screens without horizontal scrolling and be operable by keyboard. An unsuccessful greeting response SHALL leave the form usable and show the existing retry instruction.

#### Scenario: Request a greeting

- **WHEN** a person enters their name and submits the form on a phone or by keyboard
- **THEN** the greeting appears beneath the action and is announced without losing the entered name

#### Scenario: A greeting response fails

- **WHEN** the greeting returns an unsuccessful response
- **THEN** the form retains the entered name and offers a retry instruction

### Requirement: The first request remains copyable

The welcome SHALL confirm when its first request is copied. If the browser cannot copy it, the page SHALL give a plain instruction to copy by hand and keep the full request selectable. Copying SHALL NOT send a chat message or edit or publish the workspace.

#### Scenario: Successful copy

- **WHEN** a person copies the first request and the browser accepts the copy
- **THEN** the clipboard contains the full request and the page confirms the copy, with guidance to paste it in the existing chat

#### Scenario: Clipboard access is unavailable

- **WHEN** clipboard access is missing or the browser rejects the copy
- **THEN** the full request remains selectable and the person receives a copy-by-hand instruction

### Requirement: The starter app list guides first use

The starter app list SHALL present each available app as a clearly focused link with its title and description, and SHALL identify the supplied example as an example. With no apps it SHALL explain how to ask for a first tool. Loading and a failed list SHALL be distinguished from an empty list, and a failure SHALL give a recovery instruction without hiding the welcome. The page SHALL remain readable and operable at phone widths and with keyboard navigation.

#### Scenario: Apps are available

- **WHEN** the app list loads available apps
- **THEN** each app has a title, description, and keyboard-accessible link, and the supplied example is visibly labeled

#### Scenario: Apps are not yet available to display

- **WHEN** the app list is empty, still loading, or fails to load
- **THEN** the person sees the matching state: a first-tool request, a loading message, or a recovery instruction
- **AND** any welcome guide remains available

### Requirement: The existing calculator matches the starter

The repository's existing tip calculator SHALL use the same editable brand header and neutral light/dark appearance as the starter and Hello, with the brand linking home. It SHALL retain immediate recalculation, accessible input labels and selected tip state, announced results, and existing empty/invalid-input guidance. Its controls and results SHALL fit narrow phone screens. This requirement SHALL NOT add the calculator to the distributed starter payload.

#### Scenario: Calculate a share

- **WHEN** a person changes the bill, selected tip, or number of people
- **THEN** the share updates immediately in the styled result area and the selected tip remains clear
- **AND** tapping the brand returns home

#### Scenario: Empty or invalid input

- **WHEN** the bill is empty or an input is invalid
- **THEN** the existing guidance appears and all fields remain editable without horizontal scrolling

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 62772 fence=~~~ -->
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
<title>Review · 2026-09-30-welcoming-starter-home</title>
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
<body data-change="2026-09-30-welcoming-starter-home">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-welcoming-starter-home</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The starting page looks like a technical exercise: its first instruction is to remove a tutorial box. A welcoming, polished page should help a person see that this workspace is theirs and that changing it starts with a plain request.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A workspace that feels ready to make your own.</b> WongStack Cloud's black-and-white theme and colored W logo give the starter a familiar identity. Clear spacing and quiet cards keep it welcoming in both light and dark modes. The welcome guide sits above the apps; the page keeps its heading and apps when the guide is removed. These sketches show a new install on a phone and an illustrative first change.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE · PHONE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ Learn the development loop           │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ Your first change removes this box.  │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ Copy this message into your chat.    │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">│ Remove the tutorial from my home     │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">│ page. Walk me through each step      │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">│ and explain what it does.            │</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">│ [Copy]                               │</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">│ Hello                                │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">│ An example of a page and its API.    │</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-17" tabindex="0">AFTER · PHONE</span>
<span class="ln" data-note="item-1-line-18" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-19" tabindex="0">│ [W] WongStack                        │</span>
<span class="ln" data-note="item-1-line-20" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-21" tabindex="0">│ Your workspace, shaped around you    │</span>
<span class="ln" data-note="item-1-line-22" tabindex="0">│ Your tools, in one place.            │</span>
<span class="ln" data-note="item-1-line-23" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-24" tabindex="0">│ Make it yours                        │</span>
<span class="ln" data-note="item-1-line-25" tabindex="0">│ Want something different? Just ask   │</span>
<span class="ln" data-note="item-1-line-26" tabindex="0">│ in your chat. See a preview before   │</span>
<span class="ln" data-note="item-1-line-27" tabindex="0">│ anything goes live.                  │</span>
<span class="ln" data-note="item-1-line-28" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-29" tabindex="0">│ Help me make this home page my own.  │</span>
<span class="ln" data-note="item-1-line-30" tabindex="0">│ Ask me what to call it, update the   │</span>
<span class="ln" data-note="item-1-line-31" tabindex="0">│ heading, and remove this welcome     │</span>
<span class="ln" data-note="item-1-line-32" tabindex="0">│ guide. Explain each step and show    │</span>
<span class="ln" data-note="item-1-line-33" tabindex="0">│ me a preview before publishing.      │</span>
<span class="ln" data-note="item-1-line-34" tabindex="0">│ [Copy your first request]            │</span>
<span class="ln" data-note="item-1-line-35" tabindex="0">│ Paste it into your chat to start.    │</span>
<span class="ln" data-note="item-1-line-36" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-37" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-1-line-38" tabindex="0">│ Hello                       Example  │</span>
<span class="ln" data-note="item-1-line-39" tabindex="0">│ A small example to try and change.   │</span>
<span class="ln" data-note="item-1-line-40" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-1-line-42" tabindex="0">AFTER THE FIRST CHANGE</span>
<span class="ln" data-note="item-1-line-43" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-1-line-44" tabindex="0">│ [W] WongStack                        │</span>
<span class="ln" data-note="item-1-line-45" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-1-line-46" tabindex="0">│ Claymoo                              │</span>
<span class="ln" data-note="item-1-line-47" tabindex="0">│ Your tools, in one place.            │</span>
<span class="ln" data-note="item-1-line-48" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-1-line-49" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-1-line-50" tabindex="0">│ Hello                       Example  │</span>
<span class="ln" data-note="item-1-line-51" tabindex="0">│ A small example to try and change.   │</span>
<span class="ln" data-note="item-1-line-52" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>One useful first request.</b> Copy a message into your chat to name the workspace and remove the welcome guide, with an explanation and a preview before publishing. The button confirms a copy; if copying is unavailable, the message stays selectable by hand.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">MESSAGE COPIED · WELCOME EXCERPT</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Make it yours                        │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ [Same selectable message]            │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ [Copied]                             │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ Paste it into your chat to start.    │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-2-line-9" tabindex="0">COPY UNAVAILABLE · WELCOME EXCERPT</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">│ Make it yours                        │</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">│ [Same selectable message]            │</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">│ [Select the message and copy it]     │</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">│ Paste it into your chat to start.    │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Apps that feel inviting.</b> Each app has a clear title, description, and a generous clickable card. The supplied example is labeled as an example. When no apps exist, the page shows a useful request to try; loading and errors remain clearly explained.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">NO APPS · APPS EXCERPT</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">│ Your next tool starts with a request │</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ Ask in your chat:                    │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ &quot;Make me a tip calculator.&quot;          │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-3-line-9" tabindex="0">LOADING · APPS EXCERPT</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">│ Loading your apps...                 │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-3-line-15" tabindex="0">COULD NOT LOAD · APPS EXCERPT</span>
<span class="ln" data-note="item-3-line-16" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-17" tabindex="0">│ Your apps                            │</span>
<span class="ln" data-note="item-3-line-18" tabindex="0">│ Your apps could not load.            │</span>
<span class="ln" data-note="item-3-line-19" tabindex="0">│ Reload the page to try again.        │</span>
<span class="ln" data-note="item-3-line-20" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>An example that feels like a finished little app.</b> The Hello page gets the same logo and theme, with the logo as its way home, and a compact form with the label above the field. The greeting appears below the button. The logo and workspace heading are starting defaults that can be changed by asking in chat.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">BEFORE · PHONE · CURRENT PREVIEW</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">│ Home                                 │</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">│ Hello                                │</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-7" tabindex="0">│ Your name [_______________________]  │</span>
<span class="ln" data-note="item-4-line-8" tabindex="0">│ [Say hello]                          │</span>
<span class="ln" data-note="item-4-line-9" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-10" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-4-line-12" tabindex="0">AFTER · PHONE</span>
<span class="ln" data-note="item-4-line-13" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-14" tabindex="0">│ [W] WongStack                        │</span>
<span class="ln" data-note="item-4-line-15" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-4-line-16" tabindex="0">│ Example app                          │</span>
<span class="ln" data-note="item-4-line-17" tabindex="0">│ Hello                                │</span>
<span class="ln" data-note="item-4-line-18" tabindex="0">│ A small example you can make yours.  │</span>
<span class="ln" data-note="item-4-line-19" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-4-line-20" tabindex="0">│ ┌──────────────────────────────────┐ │</span>
<span class="ln" data-note="item-4-line-21" tabindex="0">│ │ Your name                        │ │</span>
<span class="ln" data-note="item-4-line-22" tabindex="0">│ │ [e.g. Sam_____________________]  │ │</span>
<span class="ln" data-note="item-4-line-23" tabindex="0">│ │ [          Say hello          ]  │ │</span>
<span class="ln" data-note="item-4-line-24" tabindex="0">│ │ Your greeting will appear here.  │ │</span>
<span class="ln" data-note="item-4-line-25" tabindex="0">│ └──────────────────────────────────┘ │</span>
<span class="ln" data-note="item-4-line-26" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-4-line-28" tabindex="0">GREETING · FORM EXCERPT</span>
<span class="ln" data-note="item-4-line-29" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-30" tabindex="0">│ Your name                            │</span>
<span class="ln" data-note="item-4-line-31" tabindex="0">│ [Sam_______________________________] │</span>
<span class="ln" data-note="item-4-line-32" tabindex="0">│ [             Say hello            ] │</span>
<span class="ln" data-note="item-4-line-33" tabindex="0">│ Hello, Sam!                          │</span>
<span class="ln" data-note="item-4-line-34" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-4-line-36" tabindex="0">COULD NOT GREET · FORM EXCERPT</span>
<span class="ln" data-note="item-4-line-37" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-4-line-38" tabindex="0">│ Your name                            │</span>
<span class="ln" data-note="item-4-line-39" tabindex="0">│ [Sam_______________________________] │</span>
<span class="ln" data-note="item-4-line-40" tabindex="0">│ [             Say hello            ] │</span>
<span class="ln" data-note="item-4-line-41" tabindex="0">│ Something went wrong. Try again.     │</span>
<span class="ln" data-note="item-4-line-42" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>The calculator belongs to the same workspace.</b> The existing tip calculator gets the same W header, neutral surfaces, and stacked fields as Hello. Tap the logo or WongStack name to go home; neither app needs a second Home link. Changing the bill, tip, or people still updates the result immediately.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-5-line-1" tabindex="0">BEFORE · PHONE</span>
<span class="ln" data-note="item-5-line-2" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-3" tabindex="0">│ Home                                 │</span>
<span class="ln" data-note="item-5-line-4" tabindex="0">│ Tip calculator                       │</span>
<span class="ln" data-note="item-5-line-5" tabindex="0">│ Bill                                 │</span>
<span class="ln" data-note="item-5-line-6" tabindex="0">│ [0.00_____________________________]  │</span>
<span class="ln" data-note="item-5-line-7" tabindex="0">│ Tip                                  │</span>
<span class="ln" data-note="item-5-line-8" tabindex="0">│ [10%] [15%] [18%] [20%]              │</span>
<span class="ln" data-note="item-5-line-9" tabindex="0">│ People                               │</span>
<span class="ln" data-note="item-5-line-10" tabindex="0">│ [1________________________________]  │</span>
<span class="ln" data-note="item-5-line-11" tabindex="0">│ Enter the bill amount.               │</span>
<span class="ln" data-note="item-5-line-12" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-5-line-14" tabindex="0">AFTER · PHONE</span>
<span class="ln" data-note="item-5-line-15" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-16" tabindex="0">│ [W] WongStack                        │</span>
<span class="ln" data-note="item-5-line-17" tabindex="0">│ ──────────────────────────────────── │</span>
<span class="ln" data-note="item-5-line-18" tabindex="0">│ Tip calculator                       │</span>
<span class="ln" data-note="item-5-line-19" tabindex="0">│ Split a bill and choose a tip.       │</span>
<span class="ln" data-note="item-5-line-20" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-21" tabindex="0">│ Bill                                 │</span>
<span class="ln" data-note="item-5-line-22" tabindex="0">│ [0.00_____________________________]  │</span>
<span class="ln" data-note="item-5-line-23" tabindex="0">│ Tip                                  │</span>
<span class="ln" data-note="item-5-line-24" tabindex="0">│ [10%] [15%] [18%] [20%]              │</span>
<span class="ln" data-note="item-5-line-25" tabindex="0">│ People                               │</span>
<span class="ln" data-note="item-5-line-26" tabindex="0">│ [1________________________________]  │</span>
<span class="ln" data-note="item-5-line-27" tabindex="0">│                                      │</span>
<span class="ln" data-note="item-5-line-28" tabindex="0">│ Enter the bill amount.               │</span>
<span class="ln" data-note="item-5-line-29" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-5-line-31" tabindex="0">RESULT · CALCULATOR EXCERPT</span>
<span class="ln" data-note="item-5-line-32" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-33" tabindex="0">│ Bill $100 · Tip 20% · 4 people       │</span>
<span class="ln" data-note="item-5-line-34" tabindex="0">│ $30.00 each                          │</span>
<span class="ln" data-note="item-5-line-35" tabindex="0">│ Tip $20.00 · Total $120.00           │</span>
<span class="ln" data-note="item-5-line-36" tabindex="0">└──────────────────────────────────────┘</span>

<span class="ln" data-note="item-5-line-38" tabindex="0">INVALID INPUT · RESULT EXCERPT</span>
<span class="ln" data-note="item-5-line-39" tabindex="0">┌──────────────────────────────────────┐</span>
<span class="ln" data-note="item-5-line-40" tabindex="0">│ [Same editable fields above]         │</span>
<span class="ln" data-note="item-5-line-41" tabindex="0">│ At least one person pays.            │</span>
<span class="ln" data-note="item-5-line-42" tabindex="0">└──────────────────────────────────────┘</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> A chat box inside the website, an editing panel, a multi-step tour, business-specific features, marketing or account navigation, or a new app.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: The consistent-mini-app refinement is ready to review, because the refreshed host build passed and both Hello and Tips fit 320px, 390px, and desktop in light/dark modes, with one brand home link and no separate Home link. Clicking the logo itself returned home from both apps. Tips retained immediate calculation, a visible 3px keyboard focus, keyboard selection of 20%, and the $30-each result for $100/four people/20%; invalid people retained the existing message and recovered after correction. Empty-bill guidance was checked separately with valid people; when people are also invalid the existing people error takes precedence. Payload/config checks and the loosened-check detector passed. Calculator script, math, and arithmetic tests are unchanged; automated execution remains for the save/CI gate. Dark phone result screenshot: /root/.agent-browser/tmp/screenshots/screenshot-1790738086096.png.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked what to do next → match the tip calculator to the revised starter and Hello design, and use the clickable logo/name as the sole way home instead of a separate right-side Home link. This refinement keeps the existing calculator logic and does not add it to the distributed payload.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: The refined preview is ready to review, because the hosted build succeeded and home/Hello fit 320px, 390px, and desktop in both light and dark modes with the W asset loaded. Keyboard focus and home navigation worked; the welcome confirmed copying and handled unavailable clipboard access. Hello responded “Hello, Sam!” through keyboard submission and retained Sam with its retry instruction after a browser-simulated HTTP 500. Tips still returned $30 each for $100, four people, and 20%. Text, control, and focus contrast meet their thresholds; payload/config/context and loosened-check checks passed. Automated tests are updated and remain for the save/CI gate. Preview: https://welcoming-starter-home-wongstack-staging.matthewwong525.workers.dev/. Phone screenshots: dark Hello screenshot-1790727446851.png; dark home screenshot-1790727481943.png; light Hello screenshot-1790727528909.png in the host's browser screenshot directory.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to match WongStack Cloud and add its logo, with feedback that the Hello page looks unfinished → refine the existing preview with Cloud's neutral theme, its current colored W logo, and a stacked example form. The earlier green palette was an aesthetic assumption, not a product or technical constraint.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: Retain device-selected light and dark modes and the narrow tool layout while adopting Cloud's identity, because this is a personal workspace and its examples rather than the Cloud marketing site.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: Continue the already authorized build and show the revised preview before publishing, because this is feedback on that preview rather than a request to start a separate feature.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked what the starting app should make a new person feel → chose polished and easy to change, welcoming and clear that they can ask for changes.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked the next step → chose to plan a welcoming page with softer colors, polished app cards, and one copyable request to make it their own.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Keep the current single-message tutorial, because the earlier memory records a preference for learning through chat rather than a multi-lesson tour.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Personalize the heading and remove the guide in the first request, because a visible change gives the person a useful result while still teaching the existing workflow.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Phone first, with the same narrow column on larger screens, because the current preview was reviewed at phone width and the initial flow is short.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Use warm neutral surfaces and a muted teal accent, with matching dark colors and the device's font, because the app should feel polished without adding assets or dependencies.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Keep the tutorial component removable and preserve the existing sync guard, because people who finished the introduction should never receive it again.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked whether to build the design → chose to build it and show a preview before publishing.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: Keep hosted-preview tasks pending because Cloudflare rejected the primary worktree's saved token (authentication code 10000; invalid-token code 9109). Code, behavior-test updates, documentation, and the payload release entry are written; payload checks pass. Local development browser checks cover 320px/390px/desktop, light/dark colors, native copy confirmation and missing-clipboard fallback, keyboard focus, long app labels, list states, and Hello/Tips. Empty/error list states and long labels were simulated only in the local browser. Automated tests remain for the save gate; clipboard readback was unavailable due browser read permission, while copy reported success. The uploaded preview remains unverified until the token is replaced.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked which workspace fixed the token → chose WongStack Cloud. Its saved token was verified against this app's target Cloudflare account and rotated into the primary credentials and this seeded workspace copy without exposing the value.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: The build is ready to review, because the host preview uploaded successfully and browser checks passed at 320px, 390px, and desktop in light/dark modes, including copy confirmation, manual fallback, keyboard focus, and both app links. Hello answered “Hello, Sam!” and a $100 bill split four ways at 20% produced $30 each. The accessibility audit reported no violations; its manual-review arrow contrast is covered by the measured accent/surface contrast (6.45:1 light, 8.04:1 dark). Automated tests remain for the save gate. Preview: https://welcoming-starter-home-wongstack-staging.matthewwong525.workers.dev/.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked what to do after the calculator/header refinement → chose to publish after the required checks. Archived the complete change for this checkpoint, incorporated the newer default-branch update without losing either release entry, and numbered this minor release 27.8.0.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: Add explicit spaces between app-card title, Example label, and description, because the CI accessibility-name assertions found adjacent text joined without styling. Keep the full-name assertions and all check settings unchanged; this fixes the markup rather than relaxing coverage.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: Update the three strict mini-app copy inventories to include Hello’s new style.css, because CI correctly copies that shipped asset. Keep exact file-list assertions so handler, source, and test exclusion remain checked.</li>
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
