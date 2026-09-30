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
