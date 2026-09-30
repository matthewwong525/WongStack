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
