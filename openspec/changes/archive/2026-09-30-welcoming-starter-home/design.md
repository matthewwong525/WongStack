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
