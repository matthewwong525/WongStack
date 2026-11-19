<!-- openspec-archive v1 2026-10-10-tell-the-claymoo-story -->
<!-- file proposal.md utf8 47904 -->
# Short definitions and a compact conversation

**Status:** ready-to-ship

**Branch:** improve-landing-readme

**Open questions:** none

## Why

Keep each section focused. Introduce the three inputs with short definitions, then show a compact question-and-answer conversation beside the team explanation. Reduce the wide diagrams and extra labels that compete for attention.

## What Changes

- **Define the three inputs.** Remove the opening bullets and concrete examples. Put one short description directly under Processes, Data and Reasons, in that order. Keep the shared business context relationship.
  ```text
  BEFORE: role bullets + example lists
  AFTER:
  Give AI the whole picture.
  AI needs all three, together.
  Processes: how work gets done
  Data: the facts the business runs on
  Reasons: why decisions were made
          ↓ Shared business context
  ```
- **Make the team visual a conversation beside the explanation.** Keep the question and final response together, with exactly three compact rows describing what is gathered from Marketing, Finance and Operations. Place this whole visual beside the section heading and copy on desktop; stack it after the copy on a phone.
  ```text
  PHONE
  The whole team starts with context.
  Short explanation
  You: Can we run this promotion?
  Reading the campaign goal · Marketing
  Checking past pricing decisions · Finance
  Checking stock and capacity · Operations
  Example response: smaller campaign on
  stocked items, with a bundle.

  DESKTOP
  Heading + copy | Question
                 | 3 gathering rows
                 | Final response
  ```
- **Quiet the operations section.** Remove the separate foundation list. Mention in the short description that WongStack sets up the foundation so the owner can build processes into working tools; keep the existing live examples.
  ```text
  Start with operations.
  Short explanation includes setup.
  [Install for free] | Live examples
  ```
- **Tighten the data layout.** Put the heading and description together, beside a compact stack of the two existing tool/source examples. Remove the wide separated header and diagram strip.
  ```text
  BEFORE: heading | detached description
          wide two-tool diagram below
  AFTER, DESKTOP:
  Heading + description | Packing → orders/stock
                        | Report → sales/analytics
  PHONE: copy, then the two examples
  ```

**Non-goals:** publication, real assistant thinking or business data, new integrations, changing model/install/Paseo facts, replacing the accepted hero or live example behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `landing-site`: existing installation-placement delta remains. Latest adjustments change presentation only.

## Impact

- Story.tsx, index.css, affected existing presentation assertions, owning landing guide and same Next patch entry.
- Brief README alignment only if current narrative needs it; exact install prompt/practical facts stay. VERSION unchanged.
- Native definitions and conversation status rows; no runtime agent calls, new assets, dependencies or git actions.

## Decision log

- **2026-10-09** — Asked how the page should explain WongStack, through the user's correction → chose a short story from the top down, like the explanation to James.
- **2026-10-09** — Assumed: keep the previously chosen rotating Claude Code / Codex headline, because the user asked to change the explanation and flow, and did not replace their headline choice.
- **2026-10-09** — Assumed: shorten and align the README in the same change, because it was part of the original request and should tell the same story as the landing page.
- **2026-10-09** — Assumed: use the October 8 Gemini notes as evidence for the explanation's themes, not as a verbatim transcript or proof of James's exact reaction; no transcript was present in the exported document.
- **2026-10-09** — Assumed: use one founder story and a real packing example instead of another list of features, because the user says the explanation is too long and wants a story.
- **2026-10-09** — Assumed: keep all service connections described as work the assistant can help build, because setup alone does not implement Claymoo's business tools or connect a visitor's services.
- **2026-10-09** — Assumed: this stays one change in the current workspace, because the landing page and README need one coherent explanation.
- **2026-10-09** — Asked what the story should focus on, through the user's correction → chose the reader's business and why the system works: bringing data together, starting with operations, building code and infrastructure with AI, and letting knowledge and benefits build across the team. This replaces the earlier founder-story assumption and the vague familiar-AI opening.
- **2026-10-09** — Assumed: explain how an owner connects their data as work the assistant helps build, because the installed foundation does not collect every business system automatically.
- **2026-10-09** — Asked what else the explanation should cover, through the user's addition → chose equal emphasis on business records, operational procedures (code as the best form for repeatable processes), and the reasons behind them; expand shared knowledge to getting new people started and questions across departments.
- **2026-10-09** — Assumed: allow a few extra lines in the first and team sections, because the user explicitly asked to expand these two ideas while keeping the same top-down explanation.

- **2026-10-09** — Check: replaced About, five-screen PhoneTour, and POINTS assertions with the approved reading-order, three-context, and single captioned-screen checks because those presentation components were removed. Existing sample-app interactions, privacy, installation, clipboard fallback, assistant compatibility, costs, and reduced-motion guards remain. Updated existing sample-app snapshots only for their heading and captions.
- **2026-10-09** — Check: all source and existing-test edits precede local checks and host-preview acceptance; intermediate presentation assertions are reviewed in source, with final live checks retained for the parent.
- **2026-10-09** — Required doc follow-up: the landing-page owning guide pointed to illustration prompts above the removed POINTS constant. Preserve that existing provenance in the guide and describe the single screenshot below the explanation. This expands scope to `wiki/maintaining/landing-page.md` and one Next patch entry in `CHANGELOG.md`, as allowed by the design; VERSION stays unchanged. It does not change the selected public story or installation.
- **2026-10-09** — Local checks: full repository pre-check and final focused documentation/release check passed; site lint/types, 62 site tests and build, 361 app tests, strict OpenSpec, payload links and config all passed. Shellcheck was unavailable on this host. No check was loosened. These are local results; the publish gate remains pending.
- **2026-10-09** — Preview acceptance: uploaded the completed static site to staging version `7fe14454-bdf7-44b5-a811-a2e9b27b0896`, at https://tell-the-claymoo-story-wongstack-site-staging.matthewwong525.workers.dev. Browser review at 1280, 390, and 320 px observed page width equal to viewport width, the approved story order, and equal Records/Processes/Reasons treatment. Reduced motion had no rotating animation; normal motion ran `rotate-names`. A sample order moved to Packed after both items were scanned, switching profit channels updated the figures, a sample brief moved to Approved, Install reached #install, and Copy message reported Copied. Desktop and phone screenshots were shown in chat; the temporary browser was closed.
- **2026-10-09** — Copy review: the 199-word narrative and README both explain records, repeatable procedures as code, reasons, operations, infrastructure, context carried forward, new teammates, and questions across departments with chosen access. The main explanation has no founder story and describes the assistant helping build connections rather than automatically importing business data. All implementation and preview tasks are complete; publishing awaits the user's choice.

- **2026-10-09** — Asked what to improve, through the user's feedback → chose substantially less text and more visual explanation. Replace the paragraph-led layout with four connected scenes and compact sample artifacts; preserve the approved top-down story and all three kinds of knowledge.
- **2026-10-09** — Assumed: continue building under the existing /apply authorization, because this is feedback on its preview and the apply skill says further edits repeat under the same alias. Revise the same plan, add tasks, and use a fresh helper; do not require another build approval.
- **2026-10-09** — Assumed: use native HTML/CSS diagrams, because relationships, process steps, and shared context need readable labels and mobile reflow. Illustrations or icons beside the original paragraphs would not resolve the feedback.
- **2026-10-09** — Assumed: also shorten the README opening and include a compact Mermaid diagram, because the original request covers both surfaces and GitHub renders native diagrams. Prior preview evidence records the first iteration; the new layout requires fresh acceptance.

- **2026-10-09** — Check: replaced the first iteration's five-heading order and 190–230-word prose expectation with the revised four-scene order, accessible figures, equal concrete knowledge inputs, shared-context destination, two team uses, three departments, and a 100-word caption ceiling. Install, privacy, costs, clipboard fallback, motion, and sample interactions remain covered. All revision source, tests, and documentation are authored before the local pre-check.

- **2026-10-09** — Visual revision local checks: repository pre-check passed (`LOCAL_CHECKS=pass`), including 361 app tests and the payload script/link/config/spec/context checks. Site lint/types, all 62 tests in seven files, and the production build passed. Strict OpenSpec validation passed. The four diagram captions total 53 words, replacing the first iteration’s 199-word prose narrative with concrete examples and connections. Shellcheck is unavailable on this host and remains for CI. Source tasks 4.1–4.3 and local task 5.1 are complete; fresh host-preview acceptance 5.2–5.3 remains with the parent.

- **2026-10-09** — Visual preview acceptance: staging version `3be6aea7-f7b6-4448-903d-262890c71b77` replaced the first iteration under the same alias. Observed connected equal-weight records/processes/reasons artifacts, request-to-code operations with visible infrastructure, saved knowledge feeding the next task, and both onboarding and cross-department uses. Native labels and connectors remain readable on phones. At 1280, 390 and 320 px, document width equals viewport width; at 320 no story element extends beyond it. Desktop and phone screenshots were shown in chat. Reduced motion has no animations; normal motion runs rotate-names. Sample #1041 reached Packed after both scans, Faire updated profit figures, Spring kit brief reached Approved, header Install navigated to #install, and copy reported Copied. Browser closed and temporary captures removed after viewing.
- **2026-10-09** — Final visual review: explanatory captions total 53 words, down from the first iteration's 199-word narrative, with concise sample artifacts carrying the reasoning. README includes a compact diagram and shorter fallback prose. All approved concepts remain; no automatic integrations or universal access promised. All tasks complete; publishing remains pending.

- **2026-10-09** — Asked what to improve, through the user's latest feedback → chose removing the UI screens, emphasizing the business advantage, and making the story simpler and easier to digest for tired readers. The current visual direction is a good start; preserve it while removing detailed screen-shaped artifacts.
- **2026-10-09** — Assumed: remove both the app showcase and Paseo screenshot, because both are UI screens in the current page. Keep the underlying concepts as simple diagrams; no app behavior or integration changes are requested.
- **2026-10-09** — Assumed: merge retained knowledge and team advantages into one payoff scene, and move compatibility/library detail into a disclosure, because the user wants a shorter main reading path. Keep three kinds of knowledge, operations, code/infrastructure, compounding knowledge, onboarding, and cross-department questions.
- **2026-10-09** — Assumed: continue the existing /apply revision under the same alias and use a fresh helper; the user's feedback authorizes this iteration without another build question.

- **2026-10-09** — Check: removed the unused app showcase, chat screenshot helper and app interaction/snapshot tests after checking production usages; no running product behavior changes. Existing layout assertions now cover three simple scenes and a closed supporting disclosure, and the story ceiling counts all text nodes rather than captions alone. Privacy/cost/comparison checks inspect every native disclosure opened as well as the initial page; the obsolete sample-price exemption is removed. Install prompt/cost/clipboard/motion/assistant/metadata protections remain. All implementation, tests and documentation are authored before the local pre-check.

- **2026-10-09** — Check: removed `site/src/apps.test.tsx` because the user chose to remove the app showcase, and its unused implementation was deleted after usage review. Its sample packing, profit and brief interaction checks no longer exercise any rendered or surviving component. The install, costs, clipboard success/failure, privacy, assistant compatibility and motion safeguards remain.
- **2026-10-09** — Check: removed `site/src/__snapshots__/apps.test.tsx.snap` with the deleted app-showcase component and its test. Keeping snapshots of UI the user asked to remove would not verify the new landing page. Surviving presentation checks now cover the simple diagrams, direct install path and native details disclosure.

- **2026-10-09** — Asked what to do next, through the user's rejection → chose reverting to the previous four-scene visual version. The three-scene simplification is rejected. User wants visual richness and variety: pictures, possibly the phone section, side-by-side sections and larger visual moments. Less text does not mean a uniform stripped-down layout.
- **2026-10-09** — Assumed: restore the immediate previous preview, staging version3be6aea7-f7b6-4448-903d-262890c71b77, because that is the version the user called a good start before this simplification.
- **2026-10-09** — Cancelled the unfinished simpler-story verification phase and stopped its owned local check process tree when the user requested reversal. Site56 tests/build, app361 and wiki checks had passed; full pre-check never completed. Browser review of the rejected version observed no overflow, working clipboard/motion and keyboard disclosure, but does not accept a restored or future version.
- **2026-10-09** — Assumed: restore first and ask optionally whether to leave that version or try a varied layout. No answer is required for the explicitly requested restoration; another speculative layout is held while the user is uncertain.

- **2026-10-09** — Restoration source review: recovered the previous four-scene source, app modules and interaction/snapshot tests, captioned laptop screenshot, README diagram, exact metadata and owning-guide/changelog wording from the original helpers’ authored history. All source/test/doc restoration preceded checks. Tasks 8.1–8.2 are complete; the rejected simplification is reversed without another design change.
- **2026-10-09** — Restoration local checks: site lint and types, all 62 tests in seven files, production build, payload links, OpenSpec config and strict validation passed. Rebuilt `index-Mnt-R9eb.css` (19,818 bytes; SHA-256 `dd088fba748e8dc0653eb1a61d40842f3a4b52360790afe03823e7ed5e6ba0dc`) and `index-DcgiTQY5.js` (249,557 bytes; SHA-256 `46fcc5088c09ed7c9a1a2e03fa245db7a2435a19047ed35380515f5142708b26`) are byte-for-byte identical to staging version `3be6aea7-f7b6-4448-903d-262890c71b77`. These are focused restoration checks, not a new full repository pre-check; the prior full passing result remains recorded above. Shellcheck remains for CI. Refreshed host-preview acceptance is retained in task 8.3 with the parent.

- **2026-10-09** — Restoration preview acceptance: refreshed the existing alias with restored version957c9bc3-8da4-427c-be8b-7b85067d8dd6. It loads the original index-DcgiTQY5.js and exact earlier CSS; four story scenes, interactive apps and Paseo laptop image are present. Width matches viewport at1280,390,320px; restored order1041 packs after both scans, Faire updates figures, brief approval works, Install reaches#install and Copy settles to Copied. Reduced motion stops animations; normal motion runs rotate-names. Desktop/phone screenshots were shown, browser closed and temporary captures removed. No check is loosened after restoring original tests.
- **2026-10-09** — Optional next-pass choice remains unanswered. Restored the explicitly requested previous version and left it intact; varied compositions, bigger visual moments and a possible phone section remain a future direction, not another automatic rewrite.

- **2026-10-09** — Asked whether to leave the restored version or build another varied pass → chose “Restore, then try the varied layout.” Restore is complete; the user now explicitly authorizes this build with varied layouts, pictures and a phone section.
- **2026-10-09** — Assumed: preserve the restored story as the baseline and replace its repeated composition, because the user called the visual story a good start but rejected a uniform stripped-down layout.
- **2026-10-09** — Assumed: use existing approved screenshots and the knowledge illustration, because these supply pictures immediately without inventing another visual style or service. Local phone image selection and the working app demos provide interaction; no forced scrolling or new motion is needed.
- **2026-10-09** — Assumed: embed the existing app showcase beside operations and remove its duplicate static tool diagram, because one concrete example can explain the business advantage with less repetition.
- **2026-10-09** — Recovery preparation: preserved the exact restored source in /tmp/wong-story-varied-baseline-vx9dhw3a with SHA256 manifest before this iteration. Previous preview957c9bc3 remains an immutable comparison. This enables a precise reversal without altering git or losing the approved story.

- **2026-10-09** — Check: replaced the uniform four-figure, single-screen and old shade/order assertions with the approved varied story, connected equal knowledge inputs, embedded live tool, retained-knowledge illustration and captioned laptop/phone checks. Added a phone selector test that verifies both image states, selected buttons and captions. All existing demo-interaction, install, cost, privacy, clipboard, compatibility and reduced-motion guards remain. Source, test and owning-doc edits precede the required local pre-check.

- **2026-10-09** — Varied-pass local checks: required repository pre-check returned `LOCAL_CHECKS=pass`, including 361 app tests, payload script/link/config/spec/context checks, wiki, skills and no loosened check. Site lint/types, all 63 tests in seven files and production build passed; strict OpenSpec passed. Source review then repaired container-query specificity so the live demo stacks inside a narrow desktop column; the affected site tests and build passed again. Shellcheck is unavailable locally and remains for CI. Source tasks 9.1–9.3 and local task 10.1 are complete; fresh host-preview and copy acceptance 10.2–10.3 remains with the parent. README/metadata were reviewed and retained; VERSION is unchanged.

- **2026-10-09** — Final varied-pass acceptance: uploaded current build under the same landing alias, immutable version `c45e26e0-4593-43cb-beb4-f74d91e3f788`. Exact deployed build checked at 320, 390, 768 and 1280px: no page or story overflow; distinct laptop hero, knowledge split, reversed live-tool split, broad knowledge illustration and phone/team composition. Ask/Review changed by keyboard with accurate selected state and image. Packing scan/completion, profit channel selection and brief marker/approval all worked; narrow 1024px desktop demo detail correctly stacked. Install navigation reached its section, clipboard reported Copied, reduced motion stopped headline animation and normal motion retained it. No browser errors. Desktop opening, large picture chapter and phone images shown.
- **2026-10-09** — Final copy acceptance: landing and README retain the three equal knowledge types, operations first, AI building code infrastructure, retained learning, onboarding and questions across departments. Scoped an older team FAQ to shared projects and knowledge with chosen access; its exact assertion was updated and all 63 site tests, lint/types and build passed again. No automatic integration, unlimited access, founder story or invented savings claims in the main story. No check loosened. Tasks 10.2–10.3 complete; publishing awaits the owner.

- **2026-10-09** — Asked through preview feedback → user says the varied pass is much better; remove the free/open-source section and show the Paseo disclaimer only at the top, without removing the phone section or its Ask/Review captions. Implement these two targeted cuts under the same change.

- **2026-10-09** — Source review: removed the standalone Stack section, its private library lists/import and unused styles; retained shared card/grid styles for assistant compatibility and retained install account/cost data. Removed only the phone’s repeated disclaimer, leaving the laptop disclaimer, both phone images, button state, per-view descriptions and alt text. Replaced the removed Stack presentation test and adjusted heading/shade/caption assertions; privacy, install/cost, compatibility, motion and demo interactions remain covered. Owning guide and the same Next patch entry are aligned; README and VERSION are unchanged. All source, tests and documentation are authored before the required pre-check.

- **2026-10-09** — Asked through screenshot feedback → remove the “New teammate” example containing the packing/scanning question and its answer. Keep the team introduction explaining existing processes/reasons and the cross-department example. Additional source authoring precedes final checks where still possible.

- **2026-10-09** — Asked through closing-card screenshot feedback → fix the squashed “Make it yours” margins/padding. Use deliberate outer separation from FAQ and footer plus balanced responsive card padding; retain closing copy and install/GitHub actions.

- **2026-10-09** — Source review: removed only the extra onboarding sample and its unused answer style; team introduction and the three-department question remain. Updated the existing story structure assertion to retain onboarding without that block. The closing card now has responsive outer margins on both sides of its sequence and balanced internal padding, with the existing site gutters, action wrapping, copy and links unchanged. All requested cuts, tests and documentation are authored before the final repository pre-check; no CSS-value test was added.

- **2026-10-09** — Requested-cuts local checks: required repository pre-check finished with `LOCAL_CHECKS=pass`, including all 361 app tests and payload script/link/config/spec/context checks, wiki and skills. Site lint/types, all 62 surviving tests in seven files and production build passed; strict OpenSpec validation passed. Shellcheck is unavailable here and remains for CI. No affected repair or repeated check was needed. Tasks 11.3–11.4 and 12.1 are complete; refreshed preview and desktop/phone acceptance 12.2 remain with the parent.

- **2026-10-09** — Final cuts/spacing acceptance: uploaded current build to the same landing alias, immutable preview `b16815b2-e383-46c3-9291-f4903e04aacf`. Desktop1487px and phone390px screenshots show deliberate CTA separation from FAQ/footer and balanced inner padding; shown to owner. Browser confirms Stack heading/section absent, exactly one optional-Paseo disclaimer at the top, no New teammate example while intro and department question remain, and unchanged four story beats. Keyboard Review selects the matching loaded image and caption with accurate pressed state; no repeated phone disclaimer. Closing install action reaches install, copy reports Copied, no page overflow at320/390/768/1487px, no browser errors. No check loosened. All tasks complete; production publication remains pending.

- **2026-10-09** — Asked through latest feedback → remove the three pictured blocks; explain operations as building the pipeline, keep examples a stable size, visualize work capturing code/reasons/facts in owned infrastructure, replace phone with pipeline-led context gathering across departments, lead with model flexibility, and separate that section from install.
- **2026-10-09** — Assumed: keep the top laptop picture and varied large/split compositions, because the user accepted the previous varied page and explicitly removed only the team phone and pictured strips.
- **2026-10-09** — Assumed: put installation account/computer/cost facts in existing questions, because the expanded note is explicitly removed but practical details should remain findable and accurate. Update the existing landing-site placement promise accordingly.
- **2026-10-09** — Assumed: visualize knowledge captured through the work, because plans record decisions, code keeps procedures, and session capture saves facts; do not promise automatic ingestion of all external business systems.

- **2026-10-09** — Connected-story source review: operations now explains the reusable process/facts/reasons pipeline, labels the live tools as examples and reserves a fixed example display with a labeled keyboard-scrollable inner region. The broad capture diagram shows process code, reasons and learned facts inside owned infrastructure; the separate question-led visual follows the built pipeline to relevant departmental evidence without inventing an answer. The old carry strip, department strip, InstallWays note and phone presentation are removed after usage review; existing local phone/illustration assets remain available.
- **2026-10-09** — Check authoring: replaced the removed phone-selector test with single top attribution and absent-phone checks; revised picture/order/knowledge assertions for the two native diagrams and best-model heading. Added focused embedded-example scroll-region coverage. Route/platform/account/cost-consent assertions now verify canonical install.ts sentences in the setup FAQ, preserving all cost/privacy/install/clipboard/motion/assistant-limit and sample behavior guards. All source, tests and docs precede local checks. README and the owning guide are aligned, the existing single Next patch entry is revised, and VERSION is unchanged.

- **2026-10-09** — Affected-check repair: the privacy asset smoke count assumed more than ten loads with the phone and decorative brain present. Their approved removal leaves nine. Replaced that obsolete lower-bound count with an exact nine-load expectation; every loaded asset still passes the same local-origin and real-file guard, and all no-request/no-cookie/no-storage/no-outside-style checks remain intact. Site's other 62 tests passed before this count repair; only the affected privacy file and production build are rerun.

- **2026-10-09** — Connected-story local checks: required repository pre-check finished with `LOCAL_CHECKS=pass`, including 361 app tests, wiki/skills and the full payload script/link/config/spec/context checks (`PAYLOAD_CHECKS=pass`). Shellcheck is unavailable locally and remains for CI. Site lint/types passed; the initial run passed 62 of 63 tests before the obsolete asset-count repair, and the affected privacy file then passed all five tests. A final source review keyed the inner sample scroll region so switching examples resets its scroll without remounting the outer display; the affected story/sample files passed all 18 tests, lint/types and the production build passed again. Current assets are `index-19MaH2UT.css` and `index-C46MLhTc.js`. Strict OpenSpec validation passed. Source tasks 13.1–13.5 and local task14.1 are complete; refreshed preview/browser and final loosened-check acceptance remain with the parent in14.2.

- **2026-10-09** — Final pipeline-story acceptance: uploaded current build under the same landing alias, immutable version `42ff1796-7f62-4004-8d51-8217bb325455` (CSS index-19MaH2UT / JS index-C46MLhTc). Browser checked320/390/768/1280px; page width matches viewport at each size and new native diagrams have no viewport overflow. Example frame remains512px and operations section height is identical across all three tabs at each width (1432.44/1396.61/1278.58/921.97px respectively); descriptions stay within reserved headers. Packing detail/completion, profit channel values and brief marker/approval work. Keyboard PageDown scrolls the focused long brief region (406px observed), controls remain reachable, changing mode resets inner scroll to0 and keeps frame geometry. Install navigation/copy worked; setup disclosure opens with canonical accounts/platforms/routes/cost/consent. Reduced motion has no animations; normal motion rotates names. No browser errors.
- **2026-10-09** — Final copy/visual review: obsolete InstallWays block, carry-forward strip, old department strip and phone are absent; single top Paseo disclaimer remains. Broad capture boundary connects work to code, decisions and learned facts in owned infrastructure; question-led diagram uses existing pipeline and scoped departmental sources, without an invented answer or automatic external ingestion. Model-flexibility claims retain working-assistant memory limits; install has visible shaded/border separation. Desktop and phone diagrams/operations/boundary shown; README follows the same pipeline/capture/team story with exact install prompt and practical facts retained. No check loosened. All tasks complete; production publication remains pending.

- **2026-10-09** — Asked through brainstorming feedback → user prefers a simple “as you chat, it learns more” explanation without tying everything together. User chose to try the proposed chat exchange and also replace the team flowchart visual.
- **2026-10-09** — Assumed: team visual becomes a prominent question with staggered departmental context notes, because the pictured pipeline boxes repeat the same diagram detail the user wants simplified. Keep access, cross-department context and earlier operational connections clear in a short caption.

- **2026-10-09** — Conversation revision source review: replaced the infrastructure capture panel with the agreed short learning headline/body, two native example chat bubbles and a small remembered wholesale schedule. Team context is now one large question with three staggered source snippets, preserving onboarding, existing connections and chosen access without an invented answer. Unused capture/team-flowchart selectors are removed after usage review. Operations, its stable examples, top laptop attribution, model/setup boundary, cost questions and closing spacing are unchanged.
- **2026-10-09** — Check authoring: updated existing heading/order and story-presentation assertions for the conversation, remembered note, single team question and three departmental sources. Existing installation, privacy, costs, clipboard, motion, assistant limitations and all sample behaviors remain covered. README learning text/diagram, owning guide and the existing single Next patch entry are aligned; VERSION is unchanged. All source/tests/docs are complete before the required local pre-check. Tasks15.1–15.3 are source-complete; parent retains live acceptance16.2.

- **2026-10-09** — Conversation revision local checks: required repository pre-check finished with `LOCAL_CHECKS=pass`, including361 app tests, wiki/skills, no loosened checks and full payload script/link/config/spec/context checks (`PAYLOAD_CHECKS=pass`). Shellcheck is unavailable locally and remains for CI. Site lint/types, all63 tests in seven files and the production build passed; strict OpenSpec validation passed. No source repair or second test run was needed. Current build assets are `index-CFXxHCzN.css` and `index-C_Uxn-QZ.js`. Tasks15.1–15.3 and local16.1 are complete; parent retains refreshed host preview, browser/README acceptance and final loosened-check review in16.2.

- **2026-10-09** — Final conversation-visual acceptance: uploaded current build under the same landing alias, immutable version `eceeb9c1-8d7f-42c0-a86d-eff1f1935f36` (CSS index-CFXxHCzN / JS index-C_Uxn-QZ). Browser checked320/390/768/1280px: page width matches viewport, chat/context illustrations have no viewport overflow and both chat gaps remain24px without overlapping content. Native agreed headline, short owner-account sentence, illustrated shipping conversation and Remembered note are readable. Capture table and team pipeline flowchart are absent, promotion question appears exactly once, onboarding/access copy and one top Paseo disclaimer remain. Three example switches preserve512px frame and921.97px operations height at1280; install navigation and copy work. Reduced motion has no animation; normal motion rotates names, no browser errors. Desktop chat/team and phone team screens shown. README/page reviewed for the same simpler chat-memory story and accurate operations/access/model facts. No check loosened; all tasks complete, production publication remains pending.

- **2026-10-09** — Asked through latest story correction → rename Records to Data and simplify opening with concrete lists; Processes includes ad publishing guides, Reasons is one “stopped X because Y” example. Then explain each input in its own chapter: process code, data connected by building processes, reasons from saved chats and memories. Show that each input matters and repeated use adds useful context.
- **2026-10-09** — Assumed: keep the accepted laptop hero above the opening knowledge overview, because “we start with this” points at the first story section and does not ask to replace the chosen headline.
- **2026-10-09** — Assumed: retain the simple chat composition but change its schedule example to a decision and reason, because the new Reasons chapter should visibly address why. Describe saved conversations without promising raw transcripts for every installation or every detail captured.

- **2026-10-09** — Three-input revision source review: simplified the equal opening lists and one decision example, focused operations on code/guides, added a broad two-tool data-connection chapter, and reused the discount reason in chat and memory. Team copy explains more context through use and new-teammate knowledge with chosen access. README, metadata, owning guide and same Next patch entry align; VERSION unchanged. Updated existing five-scene/order/metadata assertions and concrete source relationships alongside all source and docs before verification; existing behavior, privacy, cost, motion and clipboard guards remain. Tasks17.1–17.4 are source-complete; local checks and parent live acceptance remain.

- **2026-10-09** — Three-input revision local checks: full required repository pre-check passed (`LOCAL_CHECKS=pass`, `PAYLOAD_CHECKS=pass`), including all361 app tests and payload script/link/config/spec/context checks. Separate affected-site lint/types, all63 tests in seven files and production build passed; strict OpenSpec validation passed. No check was loosened. Shellcheck is unavailable locally and remains in CI. Site artifacts are `index-BZL_88oy.css` and `index-DwgHYnU6.js`. Tasks17.1–17.4 and18.1 complete; parent upload/browser/readability acceptance18.2 remains pending.

- **2026-10-09** — Final three-input acceptance: uploaded current build under the same landing alias, immutable version `a4acda66-6056-4dfd-ba18-4517156ffffa` (CSS index-BZL_88oy / JS index-DwgHYnU6). Browser checked320/390/768/1280px: document width equals viewport and story illustrations remain within its bounds. Opening cards have equal172.58px height on desktop, use short Data/Processes lists and one stopped-discounts reason. Chapters follow Processes → Data → Reasons, followed by growing team context, onboarding and chosen access. Two tool/source connections and the same chat/remembered reason are readable; desktop/tablet/phone screenshots shown. Live packing scans unlock completion, Faire profit is$11.50 with44% margin, brief marker and approval work. Example frame stays512px, keyboard PageDown scrolls the inner region and switching resets it to0. Install navigation/copy and canonical setup disclosure work. Reduced motion has no animation; normal motion rotates names. No browser errors, no check loosened. README reviewed against current story and exact installation/practical facts. Browser closed; all tasks complete, publication remains pending.

- **2026-10-10** — Asked through latest preview feedback → show a question collecting Marketing, Finance and Operations context and formulating a result; remove the bleeding-edge phrase and repeated Supports row; explain coding-agent compatibility; try clearer opening bullets with Processes first; rename Monthly Actuals to Profit by channel; move Paseo to one short linked hero disclaimer and remove optional add-on block.
- **2026-10-10** — Assumed: use a clearly labeled fictional recommendation grounded in the three shown source notes, because the owner now explicitly wants a result. It is an illustration, not a live answer or a guarantee of the best possible answer.
- **2026-10-10** — Assumed: keep “Use the best models.” and qualify broad compatibility by the coding agent's file/command abilities, because a raw model alone cannot run the framework. Preserve the working automatic-memory distinctions.
- **2026-10-10** — Assumed: try concise role bullets beside the existing example lists, because the user is open to bullets and wants an easier-to-scan explanation. Preserve varied layouts and keep the opening short.

- **2026-10-10** — Gathered-context source review: overview roles are short bullets with Processes first; the team question gathers campaign goal, remembered margin reason and stock constraint, then gives a labeled fictional recommendation using all three. Coding-agent compatibility appears once and retains automatic/manual memory distinctions. Profit title matches its selector; the sole short hero caption links the canonical optional Paseo entry and the install add-on is removed. README, owning guide and the same Next patch entry align; VERSION unchanged.
- **2026-10-10** — Check: replaced obsolete Supports/add-on presentation expectations with absent-block and single linked optional-caption assertions. Revised the existing team relationship/source/result and processes-first overview expectations, plus the profit title and its one affected snapshot. Replaced unused add-on metadata with a canonical pictured-app entry, retaining secure-link and neutral-first-step guards. All installation, privacy, cost, clipboard, motion and sample behavior checks remain. All source, existing tests and documentation are authored before the final local checks; parent live acceptance remains in20.2.

- **2026-10-10** — Check: removing the requested repeated Supports row also removes its two logo loads. Updated the existing exact local-asset count from9 to7; every remaining load still passes the same local-origin and real-file checks. The initial site run passed the other62 tests and lint/types; only the affected privacy/asset file and build are rerun after this repair.

- **2026-10-10** — Gathered-context local checks: full required repository pre-check passed (`LOCAL_CHECKS=pass`, `PAYLOAD_CHECKS=pass`), including361 app tests, wiki/skills, no-loosened-check and payload script/link/config/spec/context checks. Site lint/types passed; initial full run passed62/63 tests before the obsolete logo-count repair, then all5 tests in the affected asset/privacy file and production build passed. Strict OpenSpec validation passed. Shellcheck is unavailable on this host and remains in CI. Current assets are `index-DM4qHG36.css` and `index-D_fN-it5.js`. Tasks19.1–19.4 and local20.1 complete; parent retains same-alias upload, browser/README acceptance and final check guard in20.2.

- **2026-10-10** — Final gathered-context acceptance: uploaded same landing alias, immutable version `223fb7ac-3a7f-4a76-87a4-ca3548110cdf` (CSS index-DM4qHG36 / JS index-D_fN-it5). Browser reviewed320/390/768/1280px: document width equals viewport, all opening/team/data/chat elements stay within bounds. Opening roles/cards follow Processes/Data/Reasons and equal desktop cards remain172.58px. Team question visibly gathers Marketing goal, Finance remembered discount reason and Operations stock; labeled example answer combines all three. Desktop opening/team and phone question/evidence/result screenshots shown. Compatibility explicitly requires a coding agent with file/command abilities and retains automatic versus manual memory lookup; Supports row and optional install block are absent. Single short hero caption links canonical Paseo URL and states optional status. Profit heading matches selector; all three desktop modes retain512px frame and921.97px operations height. Packing completion, Faire profit$11.50/margin44%, brief marker/approval and keyboard internal scrolling work; switching resets inner scroll to0. Install navigation/copy and canonical setup disclosure pass; reduced motion has no animation and normal mode rotates names. No browser errors or loosened checks. README/page reviewed; browser closed and temporary captures cleaned after display. All tasks complete; publication awaits owner's choice.

- **2026-10-10** — Asked through latest screenshots → use exactly three context-gathering rows before the team response and place the visual beside the explanation; replace overview role bullets/examples with short definitions under Processes/Data/Reasons; remove operations foundation block and mention setup in its description; tighten the overly wide data composition.
- **2026-10-10** — Assumed: “side-by-side with the thing” means the conversation beside the team heading and description, because the existing visual runs underneath the entire copy. Keep the gathering rows and answer in the same vertical conversation, with phone stacking.
- **2026-10-10** — Assumed: show concise actions and findings for each department, because “rows of thinking describing what it’s gathering” asks for understandable retrieval progress, not a new technical diagram or actual private model reasoning.

- **2026-10-10** — Check: replaced obsolete opening role-bullet and example-list assertions with three concise definitions, replaced the foundation-list expectation with setup in the operations description, and added gathering-action/three-row ordering assertions for the compact team conversation. Existing fictional findings and grounded answer, real assistant limits, install/privacy/cost/clipboard/motion guards, stable live sample interactions and accessibility remain. Source, affected tests and docs were fully authored before local verification.

- **2026-10-10** — Local repair: the existing site cost-copy guard treats “pricing” as installation-price wording. Kept that safeguard intact and changed the fictional Finance retrieval label to “Checking past discount decisions,” which names the remembered decision more precisely. Only affected site checks are rerun.

- **2026-10-10** — Compact-layout local checks: site lint/types, all63 tests and production build passed; strict OpenSpec validation passed. Required full repository run completed with PAYLOAD_CHECKS=pass, including script tests, links, config, specs, retired names and context budget. Its app stage initially had5 timing-sensitive failures in untouched access tests; the exact prescribed suite-only retry passed all361 app tests and returned LOCAL_CHECKS=pass without changing those tests/settings. Shared host load and the global checks turn delayed the run. Shellcheck is unavailable locally and remains for CI. Tasks21.1–21.3 and22.1 complete; parent preview acceptance22.2 remains. Assets: index-GCS-53_9.css and index-DY4A2oXN.js. README remains aligned and unchanged in this pass; VERSION unchanged.

- **2026-10-10** — Final compact-layout acceptance: uploaded same landing alias, immutable version `07ce1f22-8cc0-4546-8f31-382d6b149e87` (CSS index-GCS-53_9 / JS index-DY4A2oXN). Browser checked320/390/768/1280px: document width equals viewport and opening/data/chat/team elements stay within bounds. Overview has three short definitions, no role bullets or examples, equal117.78px desktop cards and Processes/Data/Reasons order. Foundation block is absent; setup/code/guides stay in operations paragraph. At1280, Data copy sits left of bounded512px figure with two vertically stacked examples; team copy sits left of544px conversation, with question, exactly three compact gathering-action/finding rows and grounded response in order. At320/390/768, both figures follow copy and result follows all three rows. Desktop team/data and phone conversation pictures shown. Packing scans/completion, Faire profit$11.50/margin44%, brief marker/approval,512px demo frames, keyboard scrolling and reset-to0 work. Install navigation/copy pass. Reduced motion has no animation; normal mode rotates names; no browser errors. Existing coding-agent limits and single short linked Paseo caption remain, no old foundation/bullet/join/support/optional blocks. Owning guide/current README reviewed for actual story and practical facts. No check loosened. Browser closed and captures cleaned after display; all tasks complete, publication pending.

- **2026-10-10** — Shipping synchronization: main added existing-host scheduling and Workers runtime checks. Resolved README as the union of intent: retain the chosen short business-context story and five concise benefit bullets, with the new schedule link/host-availability wording. Changelog retains both upstream release entries below this change. No landing UI or install facts changed.

- **2026-10-10** — Archive checkpoint requested through /ship: all implementation and host-preview tasks are complete. The exact archived change stays selected on improve-landing-readme; main is merged and release40.1.1 is numbered. Combined local checks are running before the single publish checkpoint. Session preference/verification-delay facts were spooled because this checkout has no registered session.

- **2026-10-10** — Archive checkpoint after the ship walkthrough: the exact saved landing preview passed cost-disclosure and phone-install browser scenarios, including successful copy and no sideways overflow. Added the two passed browser journeys and proved their retained observations by replay. Ten existing app checks replayed unchanged; the remaining machine-preview check exceeded the shared 120-second replay budget, so the overall walk remains UNKNOWN for that background check, without a landing contradiction. The combined local checks and required saved-source checks passed. No implementation fix or guard weakening was needed.

<!-- end proposal.md -->
<!-- file design.md utf8 5912 -->
# Definition cards and a compact side-by-side conversation

## Context

Latest owner feedback replaces the opening role bullets/example lists, the broad team source-to-answer diagram, operations foundation list and wide Data composition. Preserve the accepted five chapters and their story, hero, single linked optional Paseo caption, simplified coding-agent compatibility, Profit by channel heading, install/FAQ/CTA.

## Decisions

### Opening definitions

KnowledgeScene keeps Processes/Data/Reasons ordering and equal accents, with a single short description under each dt. Suggested descriptions: Processes “How work gets done, in code and guides.”; Data “The facts your business runs on.”; Reasons “Why decisions were made.” No role-bullet list, specific workflows/data labels or discount quote in this opening. Keep concise heading/lead and shared business context join; remove the now-inaccurate example caption or use a concise relationship caption if needed. Clean unused knowledge-roles/list selectors. Reasons chapter can keep its actual illustrative discount memory; do not remove it because the opening example is gone.

### Team split and three gathering rows

TeamScene desktop uses copy left and bounded conversation right, aligned in a deliberate split. Figure is no longer below the full-width copy. Inside conversation: question, exactly three native compact status/evidence rows, final example response, concise caption. Rows describe a gathering action and actual fictional finding: Marketing reading campaign goal/reach new customers; Finance checking past pricing decisions/broad discounts hurt margins; Operations checking stock and capacity/limited stock to ship. Use brief accessible department labels, action and finding. No repeated large department card grid or fork/join rail, giant arrows, timestamps, fake loading animations or live assistant calls. Existing grounded answer can remain with smaller typography and comfortable padding. Fictional scenario/caption is sufficient; don't make the three rows sound like a guarantee every system is preconnected. Preserve concise onboarding/access/context-growth explanation. Phones stack copy then the conversation, row text wraps freely, final result remains after all three rows. Use semantic dl/ol or grouped native text appropriate to the actions, with label and finding readable without color. These are illustrative retrieval steps, not a disclosure of actual model chain-of-thought.

### Operations description

Remove .foundation markup/styles. Mention concise setup/foundation in the main description, e.g. “WongStack sets up the foundation. Turn repeatable processes into working code, with guides for your team.” Ensure ordinary code still runs repeatable steps if the wording can stay short. No replacement four-item list. Preserve install action, reversed desktop live showcase and stable512px frame/header/internal-scroll behavior.

### Compact Data section

DataScene desktop becomes copy left (heading and paragraph together) / source illustration right. Bounded balanced columns, gap around3–3.5rem, figure width around30–32rem. Stack its two tool-to-source examples vertically rather than spreading them across the whole page. Preserve packing/orders/stock and ad-report/sales/website-analytics source content and concise made-up-connections caption. Existing native small joins may stay if they fit. Remove nested split .story-copy and wide-strip top margin/gap. Mobile at sensible breakpoint stacks copy then examples, sourcechips fit320px. Keep surrounding section padding consistent; no excessive blank horizontal field or arbitrary narrowing of the entire page.

## UX

### Use-case brief

Business owners scan occasionally, often on phones, to understand the framework with little reading. Done means identifying the three inputs, seeing a realistic retrieval-to-answer example, then installing. Mirror established palette/chat shapes/live tools and keep varied compositions.

### Flow

Hero → three short definitions → processes/code and live examples → compact data connections → saved-reason chat → team copy beside question/three gathered rows/response → coding-agent compatibility → install/FAQ/CTA.

### Hierarchy

Definitions have one description each. Operations main sentence owns setup explanation. Team question and answer frame the quieter retrieval rows. Data heading/paragraph form one unit. Install retains primary action type.

### Components

Reuse Story scenes/live YourApps, native definition dl, compact native gathering rows, existing chat/result shapes and existing source joins. Remove .foundation, obsolete knowledge roles and old department-card/fork styles after usage search. No new dependency or assets.

### Review

[review.html](review.html) sketches simplified overview, split conversation and compact Data layout. Desktop split must translate into one understandable phone reading order.

## Authoring and verification

Author affected existing structural assertions beside source, preserve behavior/privacy/cost/clipboard/motion and assistant limits. Verify overview definitions/no examples, exactly three retrieval rows before final response, source grounded answer, removed foundation and tight Data structure. Update owning guide (remove claim same decision appears in opening, describe definitions and side-by-side/compact layouts), same Next patch and README only if needed. All source/tests/docs precede one required full local repository check and affected-site lint/types/tests/build plus strict validation. Parent refreshes same alias and checks320/390/768/1280: desktop team/data genuinely side-by-side, no overflow/awkward spacing, phone order, three rows/result readability, stable demos/sample interactions, unchanged install/copy/motion/compatibility/caption. Show desktop/phone pictures. VERSION unchanged; no git or publication.

<!-- end design.md -->
<!-- file tasks.md utf8 20966 -->
# Tasks

## 1. Landing page story and examples

- [x] 1.1 Rewrite the narrative below the hero in `site/src/Landing.tsx` in the five-beat sequence from the design; source review confirms roughly 190–230 words, equal emphasis on records/processes/reasons, repeatable procedures as code, and explicit onboarding and questions across departments, with the previously selected headline and a concise hero.
- [x] 1.2 Place `YourApps` with the operations/software beats and shorten its heading/captions in `site/src/apps.tsx`; source review confirms reader-focused operational examples, no founder or first-person company claims, retained interactions, and the sample-data warning.
- [x] 1.3 Remove About and replace POINTS with the connected argument, remove the long PhoneTour from the main path, move the large screen below the explanation, and replace the closing GitHub comparison; source review confirms no founder narrative, no vague familiar-AI introduction or repeated feature pitch, one captioned Paseo image, and practical compatibility/credits still available.
- [x] 1.4 Adjust existing responsive styling and remove presentation code made unused by the cuts; source review confirms a sequential reading column on phones and desktop, existing install actions, and no new dependency or tracking.
- [x] 1.5 Update the existing site's changed copy/order assertions and affected snapshots beside the implementation; source review confirms installation, privacy, cost, accessibility, clipboard fallback, and sample-app interaction coverage are retained without blanket new prose tests.

## 2. README and shared-link text

- [x] 2.1 Rewrite the README introduction to explain the same reader-focused system, three kinds of context, onboarding, and questions across departments, and trim the founder pitch and repeated introductory material; source review confirms the exact install prompt, practical requirements, useful reference links, and incoming heading links are preserved.
- [x] 2.2 Align the HTML description and social description metadata with the shorter business explanation, and update existing metadata expectations as necessary; source review confirms the headline still matches the retained share image and no new image render is needed.

## 3. Final verification and preview

- [x] 3.1 Once all source and existing-test edits are complete, run the repository's `checks.mjs --worktree` local pre-check and strict OpenSpec validation; record actual results and repair failures under the existing plan.
- [x] 3.2 Preview the changed landing page from this host at phone and desktop widths using the apply/verify workflow; verify the story order, no sideways scroll, install navigation/copy, reduced-motion headline, usable sample apps, and shorter main reading path, then provide the preview with screenshots.
- [x] 3.3 Read the rendered copy and README together against the five argument beats; confirm equal weight for business records, processes as code, and the reasons behind them; an operations starting point; the code/infrastructure distinction; onboarding and questions across departments under existing access; no automatic data-import or finished-integration promises; no private call or founder narrative; and the agreed short length.

## 4. Visual revision from preview feedback

The completed tasks above record the first iteration. The following tasks supersede its paragraph-led layout and require fresh verification.

- [x] 4.1 Replace the prose story with the four connected scenes from design, retaining all conceptual beats and existing demos; source review confirms meaningful relationships, equal records/processes/reasons, code versus AI, retained context, onboarding and cross-department questions, and at least half the original narrative prose removed.
- [x] 4.2 Implement accessible responsive diagram layouts and author proportionate updates to existing presentation assertions alongside source; source review confirms native readable labels, no new dependencies or tracking, and preserved installation, privacy, costs, clipboard, motion, and sample-app interaction guards.
- [x] 4.3 Shorten the README opening with a compact Mermaid diagram and concise fallback explanation; update owning guide and existing Next patch entry as needed. Source review confirms install prompt and practical links preserved and VERSION unchanged.

## 5. Verify the visual revision

- [x] 5.1 After all source, tests, and docs are authored, run repository local pre-check and strict OpenSpec validation; record actual results and fix only failures attributable to the revision.
- [x] 5.2 Upload to the same host-preview alias and inspect at 320, 390, and 1280 px; verify readable diagrams and connectors, no overflow, heading order, install copy/navigation, reduced motion, and existing sample interactions. Show desktop and phone screenshots and record observed acceptance.
- [x] 5.3 Review rendered page and README together: diagrams carry the explanation with substantially less text; all approved concepts remain and no automatic-integration, fabricated-answer, universal-access or founder claims appear.

## 6. Simpler business advantage revision

Previous tasks record earlier accepted implementations; this revision supersedes their UI screens and four-scene layout.

- [x] 6.1 Remove app/chat screens and simplify story into three scenes from design; source review confirms equal facts/how/why, operations as code, preserved knowledge, faster onboarding and cross-department decisions, with at most 180 words counting all scene labels and captions.
- [x] 6.2 Place install directly after the story and supporting compatibility/credits in a native disclosure; author affected presentation assertions with source and clean genuinely unused screen code after usage review. Source review confirms retained install/cost/privacy/clipboard/motion/compatibility guards, accessible labels and disclosure, and responsive native visuals.
- [x] 6.3 Align shorter README opening and metadata; update owning guide and existing Next patch entry as needed. Source review confirms exact install prompt, practical headings/links, truthful business claims and VERSION unchanged.

## 7. Cancelled verification of the rejected version

User requested restoration before full local pre-check completed. Its partial check evidence is recorded in the Decision log; no unobserved check is claimed complete. The rejected source tasks above are historical and are reversed by the tasks below.

## 8. Restore the previous visual iteration

- [x] 8.1 Recover and restore exact previous source, docs/metadata, removed example modules, and corresponding tests from original helper history. Source review confirms four scenes, app showcase and captioned screenshot restored; no unrelated work or install facts discarded.
- [x] 8.2 Build restored site and compare known prior CSS/JS artifacts where reproducible; run site lint/types/tests and required owner-doc links/config/strict validation after source completion. Record actual results and restore any missed presentation guards without broad speculative changes.
- [x] 8.3 Refresh the same preview alias and verify desktop/phone match the previous version, no overflow, working install copy/navigation, restored app interactions and reduced motion. Show restored screens and record actual acceptance; retained varied-layout feedback is not another implemented design.

## 9. Varied visual pass chosen by the owner

- [x] 9.1 Implement the picture-led hero, knowledge split, reversed operations/live-demo split, broad knowledge picture chapter and phone/team section from design. Source review confirms distinct compositions and shorter business-focused copy with all approved concepts.
- [x] 9.2 Embed existing sample tools without duplicating their section and add accessible Ask/Review phone image selection. Author proportionate presentation/selector tests alongside source; source review confirms preserved sample behaviors, native readable knowledge labels, caption/selected-state coverage and existing privacy/install/cost/clipboard/compatibility/motion guards.
- [x] 9.3 Update active image/source guidance and existing Next patch entry; review README/metadata for alignment and edit only if needed. Source review confirms existing local assets/provenance, exact prompt/cost facts and VERSION unchanged.

## 10. Verify the varied pass

- [x] 10.1 Once source/tests/docs are authored, run required local repository pre-check and strict OpenSpec validation; record actual results and fix affected failures only.
- [x] 10.2 Upload current build under the same landing preview alias and inspect320/390/768/1280px. Verify genuine composition variety, readable art/screenshots/diagrams, no overflow, all key concepts visible, phone selection, sample interactions, install navigation/copy and reduced motion. Show desktop and phone images and record acceptance.
- [x] 10.3 Review page/README together: business benefits are easier to scan without returning to the uniform stripped-down layout; no automatic integrations, unlimited employee access, founder story or invented savings claims.

## 11. Trim supporting sections from accepted preview

- [x] 11.1 Remove the separate free/open-source Stack section and clean code/styles made unused by that cut. Remove only the repeated Paseo disclaimer from the phone figure, retaining the top disclaimer, phone selector, per-view captions and image alt text. Update affected structural tests with source; preserve privacy, install/cost, compatibility, motion and demo interaction coverage.
- [x] 11.2 Update owning guide and the existing Next patch entry to match the single disclaimer and removed section. Retain exact install facts, README narrative and VERSION.

- [x] 11.3 Remove the New teammate packing/scanning example block from TeamScene; preserve the introductory onboarding sentence and Across departments example. Adjust the affected existing story assertion alongside source.

- [x] 11.4 Correct closing CTA outer spacing, internal padding and responsive gutters so “Make it yours” sits comfortably between FAQ and footer. Preserve copy/actions and check source for conflicting band rules.

## 12. Verify the requested cuts

- [x] 12.1 After authoring source/tests/docs, run required local repository pre-check and strict validation; record results and repair affected failures only.
- [x] 12.2 Refresh the same landing preview alias and inspect desktop/phone: section absent, one Paseo disclaimer at top, phone selector/descriptions usable, New teammate example absent while onboarding intro remains, varied story intact, comfortable CTA/FAQ/footer spacing, no overflow and install accessible. Show changed screens and record acceptance.

## 13. Connect operations, retained knowledge and team context

- [x] 13.1 Update operations explanation and clearly label live tools as examples; reserve stable responsive frame/header geometry across tabs and detail states with accessible internal scrolling. Author affected existing tests alongside source; preserve all three sample behaviors.
- [x] 13.2 Replace old knowledge-carry strip with a broad native visual of building capturing code/processes, decisions/reasons and facts in owned infrastructure; update short description and readable reuse destination. Preserve truthful work capture without automatic-import or all-data claims.
- [x] 13.3 Replace team phone and old department strip with a question → built pipeline → relevant departmental evidence → gathered context visual. Retain concise onboarding/chosen-access explanation, accessible native labels and genuine composition variety. Clean unused phone presentation after usage review and update affected tests alongside source.
- [x] 13.4 Reframe WorksWith around best-model/flexibility wording while retaining actual assistant/memory limitations; add a visible boundary before installation. Remove pictured InstallWays block and move canonical route/platform/account/cost-consent detail into existing FAQ; author affected presentation assertions while retaining cost/privacy/install/clipboard guards.
- [x] 13.5 Align README opening/diagram, owning landing guide, metadata if needed and existing Next patch entry; preserve exact install prompt and practical links, VERSION unchanged. Source review confirms all latest requests and truthful capture/access/model claims.

## 14. Verify connected story

- [x] 14.1 After all source/tests/docs are complete, run required repository local pre-check and strict validation; record results and repair affected failures only.
- [x] 14.2 Refresh the same landing preview alias; inspect320/390/768/1280px and diagram reading order/overflow. Compare section/frame geometry across three examples and detail states, verify internal scrolling and sample behaviors, install copy/navigation and reduced motion. Confirm pictured blocks/team phone absent, one top disclaimer, owned capture/pipeline context clear, assistant limitations retained and models/install distinctly separated. Show desktop/phone changed screens and record page/README acceptance.

## 15. Everyday conversation visuals

- [x] 15.1 Replace infrastructure capture diagram with agreed chat-learning headline/body, two example chat bubbles and a small Remembered note; author affected presentation assertions beside source. Preserve readable native content, scoped truthful memory/ownership, distinct rich composition and phone readability without diagrams/tables/arrows.
- [x] 15.2 Replace team flowchart with a prominent question and three staggered departmental snippets; keep short onboarding/access explanation and a concise connection to operational sources, no duplicated question or fabricated answer. Update affected existing structural assertions alongside source; clean genuinely unused capture/pipeline selectors.
- [x] 15.3 Briefly align README learning explanation, owning guide and existing Next patch entry with simpler visuals; preserve operations/examples/models/install/FAQ/closing work, exact install prompt, all behavioral/privacy/cost guards and VERSION unchanged.

## 16. Verify simpler visual revision

- [x] 16.1 After all source/tests/docs are authored, run required local repository pre-check and strict validation; record actual results and repair affected failures only.
- [x] 16.2 Refresh the same landing alias and inspect320/390/768/1280px: native chat and remembered note clear, question/context snippets legible, no overflow or awkward overlaps, removed capture/team flowcharts absent, ownership/onboarding/access clear and no duplicated question. Confirm examples keep stable geometry and install/motion work. Show desktop and phone changed screens and record README/page acceptance.

## 17. Three inputs, three chapters

- [x] 17.1 Simplify KnowledgeScene to equal Data / Processes / Reasons lists/example with short intro; rename Records to Data in current visible story, remove detailed order/code/scan footers and author affected existing assertions alongside source. Keep native readable three-input relationships and concise sample status.
- [x] 17.2 Focus operations chapter on repeatable processes as code and guides for human work; remove repetitive three-input chips and retain steady live examples/interactions. Add DataScene next with brief process-built connections and concrete source labels, distinct responsive composition and no automatic integration claims. Author proportional presentation/order expectations alongside source.
- [x] 17.3 Refocus chat illustration on Reasons from saved conversations and memory, using the same stopped-discounts decision as opening and a small remembered reason. Add concise team/payoff statement about all three inputs gaining useful context through use, keeping onboarding/access, native content, truthful saved-context claims and simple varied visuals. Update affected existing expectations with source.
- [x] 17.4 Align README short diagram/introduction, owning guide, current metadata if needed and same Next patch entry. Preserve exact install message/cost/platform facts, assistant limitations, all behavior guards, accepted hero/models/install/closing layouts and VERSION unchanged.

## 18. Verify three-input story

- [x] 18.1 After source/tests/docs are authored, run required local repository pre-check and strict validation; record actual results and repair affected failures only.
- [x] 18.2 Refresh same landing alias and inspect320/390/768/1280px: simple Data/Processes/Reasons overview, Processes → Data → Reasons chapter order, clear process/source connections, remembered decision/reason and concise compounding/onboarding/access payoff. Verify no overflow/awkward overlap, stable example geometry and behaviors, install copy/navigation and reduced motion; review README/current claims, show desktop/phone changed screens and record acceptance.


## 19. Gather context, then show the answer

- [x] 19.1 Put Processes first in KnowledgeScene, add terse semantic role bullets and retain equal concrete input examples/shared context. Replace TeamScene loose snippets with person-question → Marketing/Finance/Operations evidence → clearly labeled fictional result using those sources. Keep concise onboarding/chosen-access and repeated-use context payoff; author affected existing structural expectations beside source.
- [x] 19.2 Remove duplicated Supports row, bleeding-edge phrase and stale styles; explain any coding-agent model/setup compatibility with file/command requirement and preserve actual automatic/manual memory distinctions. Rename visible Monthly Actuals to Profit by channel with affected expectations/snapshot; preserve stable frame and channel behavior.
- [x] 19.3 Remove optional Paseo install block and shorten hero caption with canonical Paseo hyperlink and optional status. Clean unused presentation source/styles while preserving exact install/cost/platform/clipboard/privacy/motion guards; replace affected existing presentation assertions alongside source.
- [x] 19.4 Briefly align README, owning landing guide and existing Next patch entry with current overview/team answer/compatibility/single disclaimer. Preserve practical install facts and VERSION. Finish all source/test/doc authoring before automatic checks.

## 20. Verify gathered-context revision

- [x] 20.1 Run required full local repository/payload pre-check, affected-site lint/types/tests/build and strict OpenSpec validation; repair only affected failures and record real results.
- [x] 20.2 Parent refreshes same alias and checks320/390/768/1280: processes-first readable overview/bullets; question gathers three department sources and produces grounded labeled example answer; truthful compatibility and memory limits; repeated Supports/optional install absent, single short linked Paseo caption. Verify no overflow/awkward joins, stable demos and sample interactions, install copy/navigation and motion; review README/page, show desktop/phone pictures and record acceptance.


## 21. Short definitions and compact layouts

- [x] 21.1 Remove overview role bullets and examples; use one short native description under Processes/Data/Reasons, retain equality/shared context and clean unused presentation. Replace broad team diagram with copy/figure desktop split and question → exactly three compact gathering-action/finding rows → final labeled example response, retaining onboarding/chosen access and grounded fictional findings. Author affected existing structural assertions with source.
- [x] 21.2 Remove operations foundation block/styles and mention setup concisely in the description while retaining repeatable-code/guides and live examples. Rework DataScene to cohesive copy beside bounded vertically stacked two-tool source visual; preserve labels/caption and readable responsive joining. Preserve stable demos/interactions and author affected existing presentation assertions alongside source.
- [x] 21.3 Align owning guide and same Next patch, briefly adjust README only if needed. Remove inaccurate opening-example linkage from documentation. Preserve exact practical/model/install/Paseo facts and VERSION; finish source/tests/docs before checks.

## 22. Verify compact revision

- [x] 22.1 Run required full local repository/payload check, affected-site lint/types/tests/build and strict validation; record results and repair only affected failures.
- [x] 22.2 Parent refreshes alias and checks320/390/768/1280: definitions without role bullets/examples, exactly three compact retrieval rows followed by grounded final response, team visual beside copy on desktop, setup in operations description/no foundation block, compact cohesive Data split with stacked examples. Check no overflow/awkward blank space/joins, correct phone order/readability, stable demo geometry/behaviors and unchanged install/copy/motion/compatibility/single caption. Review current docs/claims, show desktop/phone and record acceptance.

<!-- end tasks.md -->
<!-- file specs/landing-site/spec.md utf8 816 -->
## MODIFIED Requirements

### Requirement: The landing page says what each way to install costs

On the same page as its install steps, through the steps or their adjacent setup questions, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL say which way is free. Where the page calls the install free, a visitor SHALL be able to read on the same page which way that is.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section and its adjacent setup questions before starting
- **THEN** they can tell that keeping everything in Cloudflare alone needs Cloudflare's paid plan and what that costs, and that the way with a GitHub account is free

<!-- end specs/landing-site/spec.md -->
<!-- file .openspec.yaml utf8 58 fence=~~~ -->
~~~yaml
schema: spec-driven
skip_specs: false
created: 2026-10-09

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 100475 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its Ready section
  asks the chat to build, or to build and publish, by an action's name alone.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-10-tell-the-claymoo-story</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:var(--bar, 76px); background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
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
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; flex-wrap:wrap; align-items:center; gap:8px 10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  #ready, #ready .row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  #ready-says, #ready-confirm span { margin:0; font-size:14px; }
  #ready-says { font-weight:600; }
  @media (max-width:700px) {
    #ready, #ready .row, #ready-says, #ready-confirm span { flex:1 1 100%; }
    #ready button { flex:1; }
  }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:#fff; color:var(--ink); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-10-tell-the-claymoo-story">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-10-tell-the-claymoo-story</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. <span class="copies">Saving a note copies all your notes.</span> Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Keep each section focused. Introduce the three inputs with short definitions, then show a compact question-and-answer conversation beside the team explanation. Reduce the wide diagrams and extra labels that compete for attention.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Define the three inputs.</b> Remove the opening bullets and concrete examples. Put one short description directly under Processes, Data and Reasons, in that order. Keep the shared business context relationship.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE: role bullets + example lists</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">AFTER:</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">Give AI the whole picture.</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">AI needs all three, together.</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">Processes: how work gets done</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">Data: the facts the business runs on</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">Reasons: why decisions were made</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        ↓ Shared business context</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Make the team visual a conversation beside the explanation.</b> Keep the question and final response together, with exactly three compact rows describing what is gathered from Marketing, Finance and Operations. Place this whole visual beside the section heading and copy on desktop; stack it after the copy on a phone.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">PHONE</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">The whole team starts with context.</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">Short explanation</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">You: Can we run this promotion?</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">Reading the campaign goal · Marketing</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">Checking past pricing decisions · Finance</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">Checking stock and capacity · Operations</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">Example response: smaller campaign on</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">stocked items, with a bundle.</span>

<span class="ln" data-note="item-2-line-11" tabindex="0">DESKTOP</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">Heading + copy | Question</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">               | 3 gathering rows</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">               | Final response</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Quiet the operations section.</b> Remove the separate foundation list. Mention in the short description that WongStack sets up the foundation so the owner can build processes into working tools; keep the existing live examples.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">Start with operations.</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">Short explanation includes setup.</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">[Install for free] | Live examples</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Tighten the data layout.</b> Put the heading and description together, beside a compact stack of the two existing tool/source examples. Remove the wide separated header and diagram strip.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">BEFORE: heading | detached description</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">        wide two-tool diagram below</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">AFTER, DESKTOP:</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">Heading + description | Packing → orders/stock</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">                      | Report → sales/analytics</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">PHONE: copy, then the two examples</span></pre></div></details></li>
</ol>
<p class="aside"><b>Non-goals:</b> publication, real assistant thinking or business data, new integrations, changing model/install/Paseo facts, replacing the accepted hero or live example behavior.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked how the page should explain WongStack, through the user's correction → chose a short story from the top down, like the explanation to James.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: keep the previously chosen rotating Claude Code / Codex headline, because the user asked to change the explanation and flow, and did not replace their headline choice.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: shorten and align the README in the same change, because it was part of the original request and should tell the same story as the landing page.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: use the October 8 Gemini notes as evidence for the explanation's themes, not as a verbatim transcript or proof of James's exact reaction; no transcript was present in the exported document.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: use one founder story and a real packing example instead of another list of features, because the user says the explanation is too long and wants a story.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: keep all service connections described as work the assistant can help build, because setup alone does not implement Claymoo's business tools or connect a visitor's services.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: this stays one change in the current workspace, because the landing page and README need one coherent explanation.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked what the story should focus on, through the user's correction → chose the reader's business and why the system works: bringing data together, starting with operations, building code and infrastructure with AI, and letting knowledge and benefits build across the team. This replaces the earlier founder-story assumption and the vague familiar-AI opening.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: explain how an owner connects their data as work the assistant helps build, because the installed foundation does not collect every business system automatically.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked what else the explanation should cover, through the user's addition → chose equal emphasis on business records, operational procedures (code as the best form for repeatable processes), and the reasons behind them; expand shared knowledge to getting new people started and questions across departments.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: allow a few extra lines in the first and team sections, because the user explicitly asked to expand these two ideas while keeping the same top-down explanation.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: replaced About, five-screen PhoneTour, and POINTS assertions with the approved reading-order, three-context, and single captioned-screen checks because those presentation components were removed. Existing sample-app interactions, privacy, installation, clipboard fallback, assistant compatibility, costs, and reduced-motion guards remain. Updated existing sample-app snapshots only for their heading and captions.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: all source and existing-test edits precede local checks and host-preview acceptance; intermediate presentation assertions are reviewed in source, with final live checks retained for the parent.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Required doc follow-up: the landing-page owning guide pointed to illustration prompts above the removed POINTS constant. Preserve that existing provenance in the guide and describe the single screenshot below the explanation. This expands scope to <code>wiki/maintaining/landing-page.md</code> and one Next patch entry in <code>CHANGELOG.md</code>, as allowed by the design; VERSION stays unchanged. It does not change the selected public story or installation.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Local checks: full repository pre-check and final focused documentation/release check passed; site lint/types, 62 site tests and build, 361 app tests, strict OpenSpec, payload links and config all passed. Shellcheck was unavailable on this host. No check was loosened. These are local results; the publish gate remains pending.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Preview acceptance: uploaded the completed static site to staging version <code>7fe14454-bdf7-44b5-a811-a2e9b27b0896</code>, at https://tell-the-claymoo-story-wongstack-site-staging.matthewwong525.workers.dev. Browser review at 1280, 390, and 320 px observed page width equal to viewport width, the approved story order, and equal Records/Processes/Reasons treatment. Reduced motion had no rotating animation; normal motion ran <code>rotate-names</code>. A sample order moved to Packed after both items were scanned, switching profit channels updated the figures, a sample brief moved to Approved, Install reached #install, and Copy message reported Copied. Desktop and phone screenshots were shown in chat; the temporary browser was closed.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Copy review: the 199-word narrative and README both explain records, repeatable procedures as code, reasons, operations, infrastructure, context carried forward, new teammates, and questions across departments with chosen access. The main explanation has no founder story and describes the assistant helping build connections rather than automatically importing business data. All implementation and preview tasks are complete; publishing awaits the user's choice.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked what to improve, through the user's feedback → chose substantially less text and more visual explanation. Replace the paragraph-led layout with four connected scenes and compact sample artifacts; preserve the approved top-down story and all three kinds of knowledge.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: continue building under the existing /apply authorization, because this is feedback on its preview and the apply skill says further edits repeat under the same alias. Revise the same plan, add tasks, and use a fresh helper; do not require another build approval.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: use native HTML/CSS diagrams, because relationships, process steps, and shared context need readable labels and mobile reflow. Illustrations or icons beside the original paragraphs would not resolve the feedback.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: also shorten the README opening and include a compact Mermaid diagram, because the original request covers both surfaces and GitHub renders native diagrams. Prior preview evidence records the first iteration; the new layout requires fresh acceptance.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: replaced the first iteration's five-heading order and 190–230-word prose expectation with the revised four-scene order, accessible figures, equal concrete knowledge inputs, shared-context destination, two team uses, three departments, and a 100-word caption ceiling. Install, privacy, costs, clipboard fallback, motion, and sample interactions remain covered. All revision source, tests, and documentation are authored before the local pre-check.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Visual revision local checks: repository pre-check passed (<code>LOCAL_CHECKS=pass</code>), including 361 app tests and the payload script/link/config/spec/context checks. Site lint/types, all 62 tests in seven files, and the production build passed. Strict OpenSpec validation passed. The four diagram captions total 53 words, replacing the first iteration’s 199-word prose narrative with concrete examples and connections. Shellcheck is unavailable on this host and remains for CI. Source tasks 4.1–4.3 and local task 5.1 are complete; fresh host-preview acceptance 5.2–5.3 remains with the parent.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Visual preview acceptance: staging version <code>3be6aea7-f7b6-4448-903d-262890c71b77</code> replaced the first iteration under the same alias. Observed connected equal-weight records/processes/reasons artifacts, request-to-code operations with visible infrastructure, saved knowledge feeding the next task, and both onboarding and cross-department uses. Native labels and connectors remain readable on phones. At 1280, 390 and 320 px, document width equals viewport width; at 320 no story element extends beyond it. Desktop and phone screenshots were shown in chat. Reduced motion has no animations; normal motion runs rotate-names. Sample #1041 reached Packed after both scans, Faire updated profit figures, Spring kit brief reached Approved, header Install navigated to #install, and copy reported Copied. Browser closed and temporary captures removed after viewing.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final visual review: explanatory captions total 53 words, down from the first iteration's 199-word narrative, with concise sample artifacts carrying the reasoning. README includes a compact diagram and shorter fallback prose. All approved concepts remain; no automatic integrations or universal access promised. All tasks complete; publishing remains pending.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked what to improve, through the user's latest feedback → chose removing the UI screens, emphasizing the business advantage, and making the story simpler and easier to digest for tired readers. The current visual direction is a good start; preserve it while removing detailed screen-shaped artifacts.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: remove both the app showcase and Paseo screenshot, because both are UI screens in the current page. Keep the underlying concepts as simple diagrams; no app behavior or integration changes are requested.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: merge retained knowledge and team advantages into one payoff scene, and move compatibility/library detail into a disclosure, because the user wants a shorter main reading path. Keep three kinds of knowledge, operations, code/infrastructure, compounding knowledge, onboarding, and cross-department questions.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: continue the existing /apply revision under the same alias and use a fresh helper; the user's feedback authorizes this iteration without another build question.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: removed the unused app showcase, chat screenshot helper and app interaction/snapshot tests after checking production usages; no running product behavior changes. Existing layout assertions now cover three simple scenes and a closed supporting disclosure, and the story ceiling counts all text nodes rather than captions alone. Privacy/cost/comparison checks inspect every native disclosure opened as well as the initial page; the obsolete sample-price exemption is removed. Install prompt/cost/clipboard/motion/assistant/metadata protections remain. All implementation, tests and documentation are authored before the local pre-check.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: removed <code>site/src/apps.test.tsx</code> because the user chose to remove the app showcase, and its unused implementation was deleted after usage review. Its sample packing, profit and brief interaction checks no longer exercise any rendered or surviving component. The install, costs, clipboard success/failure, privacy, assistant compatibility and motion safeguards remain.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: removed <code>site/src/__snapshots__/apps.test.tsx.snap</code> with the deleted app-showcase component and its test. Keeping snapshots of UI the user asked to remove would not verify the new landing page. Surviving presentation checks now cover the simple diagrams, direct install path and native details disclosure.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked what to do next, through the user's rejection → chose reverting to the previous four-scene visual version. The three-scene simplification is rejected. User wants visual richness and variety: pictures, possibly the phone section, side-by-side sections and larger visual moments. Less text does not mean a uniform stripped-down layout.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: restore the immediate previous preview, staging version3be6aea7-f7b6-4448-903d-262890c71b77, because that is the version the user called a good start before this simplification.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Cancelled the unfinished simpler-story verification phase and stopped its owned local check process tree when the user requested reversal. Site56 tests/build, app361 and wiki checks had passed; full pre-check never completed. Browser review of the rejected version observed no overflow, working clipboard/motion and keyboard disclosure, but does not accept a restored or future version.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: restore first and ask optionally whether to leave that version or try a varied layout. No answer is required for the explicitly requested restoration; another speculative layout is held while the user is uncertain.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Restoration source review: recovered the previous four-scene source, app modules and interaction/snapshot tests, captioned laptop screenshot, README diagram, exact metadata and owning-guide/changelog wording from the original helpers’ authored history. All source/test/doc restoration preceded checks. Tasks 8.1–8.2 are complete; the rejected simplification is reversed without another design change.</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Restoration local checks: site lint and types, all 62 tests in seven files, production build, payload links, OpenSpec config and strict validation passed. Rebuilt <code>index-Mnt-R9eb.css</code> (19,818 bytes; SHA-256 <code>dd088fba748e8dc0653eb1a61d40842f3a4b52360790afe03823e7ed5e6ba0dc</code>) and <code>index-DcgiTQY5.js</code> (249,557 bytes; SHA-256 <code>46fcc5088c09ed7c9a1a2e03fa245db7a2435a19047ed35380515f5142708b26</code>) are byte-for-byte identical to staging version <code>3be6aea7-f7b6-4448-903d-262890c71b77</code>. These are focused restoration checks, not a new full repository pre-check; the prior full passing result remains recorded above. Shellcheck remains for CI. Refreshed host-preview acceptance is retained in task 8.3 with the parent.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Restoration preview acceptance: refreshed the existing alias with restored version957c9bc3-8da4-427c-be8b-7b85067d8dd6. It loads the original index-DcgiTQY5.js and exact earlier CSS; four story scenes, interactive apps and Paseo laptop image are present. Width matches viewport at1280,390,320px; restored order1041 packs after both scans, Faire updates figures, brief approval works, Install reaches#install and Copy settles to Copied. Reduced motion stops animations; normal motion runs rotate-names. Desktop/phone screenshots were shown, browser closed and temporary captures removed. No check is loosened after restoring original tests.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Optional next-pass choice remains unanswered. Restored the explicitly requested previous version and left it intact; varied compositions, bigger visual moments and a possible phone section remain a future direction, not another automatic rewrite.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked whether to leave the restored version or build another varied pass → chose “Restore, then try the varied layout.” Restore is complete; the user now explicitly authorizes this build with varied layouts, pictures and a phone section.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: preserve the restored story as the baseline and replace its repeated composition, because the user called the visual story a good start but rejected a uniform stripped-down layout.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: use existing approved screenshots and the knowledge illustration, because these supply pictures immediately without inventing another visual style or service. Local phone image selection and the working app demos provide interaction; no forced scrolling or new motion is needed.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: embed the existing app showcase beside operations and remove its duplicate static tool diagram, because one concrete example can explain the business advantage with less repetition.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Recovery preparation: preserved the exact restored source in /tmp/wong-story-varied-baseline-vx9dhw3a with SHA256 manifest before this iteration. Previous preview957c9bc3 remains an immutable comparison. This enables a precise reversal without altering git or losing the approved story.</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-09</p>Check: replaced the uniform four-figure, single-screen and old shade/order assertions with the approved varied story, connected equal knowledge inputs, embedded live tool, retained-knowledge illustration and captioned laptop/phone checks. Added a phone selector test that verifies both image states, selected buttons and captions. All existing demo-interaction, install, cost, privacy, clipboard, compatibility and reduced-motion guards remain. Source, test and owning-doc edits precede the required local pre-check.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Varied-pass local checks: required repository pre-check returned <code>LOCAL_CHECKS=pass</code>, including 361 app tests, payload script/link/config/spec/context checks, wiki, skills and no loosened check. Site lint/types, all 63 tests in seven files and production build passed; strict OpenSpec passed. Source review then repaired container-query specificity so the live demo stacks inside a narrow desktop column; the affected site tests and build passed again. Shellcheck is unavailable locally and remains for CI. Source tasks 9.1–9.3 and local task 10.1 are complete; fresh host-preview and copy acceptance 10.2–10.3 remains with the parent. README/metadata were reviewed and retained; VERSION is unchanged.</li>
<li class="decision card" id="decision-48" data-note="decision-48" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final varied-pass acceptance: uploaded current build under the same landing alias, immutable version <code>c45e26e0-4593-43cb-beb4-f74d91e3f788</code>. Exact deployed build checked at 320, 390, 768 and 1280px: no page or story overflow; distinct laptop hero, knowledge split, reversed live-tool split, broad knowledge illustration and phone/team composition. Ask/Review changed by keyboard with accurate selected state and image. Packing scan/completion, profit channel selection and brief marker/approval all worked; narrow 1024px desktop demo detail correctly stacked. Install navigation reached its section, clipboard reported Copied, reduced motion stopped headline animation and normal motion retained it. No browser errors. Desktop opening, large picture chapter and phone images shown.</li>
<li class="decision card" id="decision-49" data-note="decision-49" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final copy acceptance: landing and README retain the three equal knowledge types, operations first, AI building code infrastructure, retained learning, onboarding and questions across departments. Scoped an older team FAQ to shared projects and knowledge with chosen access; its exact assertion was updated and all 63 site tests, lint/types and build passed again. No automatic integration, unlimited access, founder story or invented savings claims in the main story. No check loosened. Tasks 10.2–10.3 complete; publishing awaits the owner.</li>
<li class="decision card" id="decision-50" data-note="decision-50" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through preview feedback → user says the varied pass is much better; remove the free/open-source section and show the Paseo disclaimer only at the top, without removing the phone section or its Ask/Review captions. Implement these two targeted cuts under the same change.</li>
<li class="decision card" id="decision-51" data-note="decision-51" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Source review: removed the standalone Stack section, its private library lists/import and unused styles; retained shared card/grid styles for assistant compatibility and retained install account/cost data. Removed only the phone’s repeated disclaimer, leaving the laptop disclaimer, both phone images, button state, per-view descriptions and alt text. Replaced the removed Stack presentation test and adjusted heading/shade/caption assertions; privacy, install/cost, compatibility, motion and demo interactions remain covered. Owning guide and the same Next patch entry are aligned; README and VERSION are unchanged. All source, tests and documentation are authored before the required pre-check.</li>
<li class="decision card" id="decision-52" data-note="decision-52" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through screenshot feedback → remove the “New teammate” example containing the packing/scanning question and its answer. Keep the team introduction explaining existing processes/reasons and the cross-department example. Additional source authoring precedes final checks where still possible.</li>
<li class="decision card" id="decision-53" data-note="decision-53" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through closing-card screenshot feedback → fix the squashed “Make it yours” margins/padding. Use deliberate outer separation from FAQ and footer plus balanced responsive card padding; retain closing copy and install/GitHub actions.</li>
<li class="decision card" id="decision-54" data-note="decision-54" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Source review: removed only the extra onboarding sample and its unused answer style; team introduction and the three-department question remain. Updated the existing story structure assertion to retain onboarding without that block. The closing card now has responsive outer margins on both sides of its sequence and balanced internal padding, with the existing site gutters, action wrapping, copy and links unchanged. All requested cuts, tests and documentation are authored before the final repository pre-check; no CSS-value test was added.</li>
<li class="decision card" id="decision-55" data-note="decision-55" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Requested-cuts local checks: required repository pre-check finished with <code>LOCAL_CHECKS=pass</code>, including all 361 app tests and payload script/link/config/spec/context checks, wiki and skills. Site lint/types, all 62 surviving tests in seven files and production build passed; strict OpenSpec validation passed. Shellcheck is unavailable here and remains for CI. No affected repair or repeated check was needed. Tasks 11.3–11.4 and 12.1 are complete; refreshed preview and desktop/phone acceptance 12.2 remain with the parent.</li>
<li class="decision card" id="decision-56" data-note="decision-56" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final cuts/spacing acceptance: uploaded current build to the same landing alias, immutable preview <code>b16815b2-e383-46c3-9291-f4903e04aacf</code>. Desktop1487px and phone390px screenshots show deliberate CTA separation from FAQ/footer and balanced inner padding; shown to owner. Browser confirms Stack heading/section absent, exactly one optional-Paseo disclaimer at the top, no New teammate example while intro and department question remain, and unchanged four story beats. Keyboard Review selects the matching loaded image and caption with accurate pressed state; no repeated phone disclaimer. Closing install action reaches install, copy reports Copied, no page overflow at320/390/768/1487px, no browser errors. No check loosened. All tasks complete; production publication remains pending.</li>
<li class="decision card" id="decision-57" data-note="decision-57" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through latest feedback → remove the three pictured blocks; explain operations as building the pipeline, keep examples a stable size, visualize work capturing code/reasons/facts in owned infrastructure, replace phone with pipeline-led context gathering across departments, lead with model flexibility, and separate that section from install.</li>
<li class="decision card" id="decision-58" data-note="decision-58" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: keep the top laptop picture and varied large/split compositions, because the user accepted the previous varied page and explicitly removed only the team phone and pictured strips.</li>
<li class="decision card" id="decision-59" data-note="decision-59" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: put installation account/computer/cost facts in existing questions, because the expanded note is explicitly removed but practical details should remain findable and accurate. Update the existing landing-site placement promise accordingly.</li>
<li class="decision card" id="decision-60" data-note="decision-60" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: visualize knowledge captured through the work, because plans record decisions, code keeps procedures, and session capture saves facts; do not promise automatic ingestion of all external business systems.</li>
<li class="decision card" id="decision-61" data-note="decision-61" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Connected-story source review: operations now explains the reusable process/facts/reasons pipeline, labels the live tools as examples and reserves a fixed example display with a labeled keyboard-scrollable inner region. The broad capture diagram shows process code, reasons and learned facts inside owned infrastructure; the separate question-led visual follows the built pipeline to relevant departmental evidence without inventing an answer. The old carry strip, department strip, InstallWays note and phone presentation are removed after usage review; existing local phone/illustration assets remain available.</li>
<li class="decision card" id="decision-62" data-note="decision-62" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Check authoring: replaced the removed phone-selector test with single top attribution and absent-phone checks; revised picture/order/knowledge assertions for the two native diagrams and best-model heading. Added focused embedded-example scroll-region coverage. Route/platform/account/cost-consent assertions now verify canonical install.ts sentences in the setup FAQ, preserving all cost/privacy/install/clipboard/motion/assistant-limit and sample behavior guards. All source, tests and docs precede local checks. README and the owning guide are aligned, the existing single Next patch entry is revised, and VERSION is unchanged.</li>
<li class="decision card" id="decision-63" data-note="decision-63" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Affected-check repair: the privacy asset smoke count assumed more than ten loads with the phone and decorative brain present. Their approved removal leaves nine. Replaced that obsolete lower-bound count with an exact nine-load expectation; every loaded asset still passes the same local-origin and real-file guard, and all no-request/no-cookie/no-storage/no-outside-style checks remain intact. Site's other 62 tests passed before this count repair; only the affected privacy file and production build are rerun.</li>
<li class="decision card" id="decision-64" data-note="decision-64" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Connected-story local checks: required repository pre-check finished with <code>LOCAL_CHECKS=pass</code>, including 361 app tests, wiki/skills and the full payload script/link/config/spec/context checks (<code>PAYLOAD_CHECKS=pass</code>). Shellcheck is unavailable locally and remains for CI. Site lint/types passed; the initial run passed 62 of 63 tests before the obsolete asset-count repair, and the affected privacy file then passed all five tests. A final source review keyed the inner sample scroll region so switching examples resets its scroll without remounting the outer display; the affected story/sample files passed all 18 tests, lint/types and the production build passed again. Current assets are <code>index-19MaH2UT.css</code> and <code>index-C46MLhTc.js</code>. Strict OpenSpec validation passed. Source tasks 13.1–13.5 and local task14.1 are complete; refreshed preview/browser and final loosened-check acceptance remain with the parent in14.2.</li>
<li class="decision card" id="decision-65" data-note="decision-65" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final pipeline-story acceptance: uploaded current build under the same landing alias, immutable version <code>42ff1796-7f62-4004-8d51-8217bb325455</code> (CSS index-19MaH2UT / JS index-C46MLhTc). Browser checked320/390/768/1280px; page width matches viewport at each size and new native diagrams have no viewport overflow. Example frame remains512px and operations section height is identical across all three tabs at each width (1432.44/1396.61/1278.58/921.97px respectively); descriptions stay within reserved headers. Packing detail/completion, profit channel values and brief marker/approval work. Keyboard PageDown scrolls the focused long brief region (406px observed), controls remain reachable, changing mode resets inner scroll to0 and keeps frame geometry. Install navigation/copy worked; setup disclosure opens with canonical accounts/platforms/routes/cost/consent. Reduced motion has no animations; normal motion rotates names. No browser errors.</li>
<li class="decision card" id="decision-66" data-note="decision-66" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final copy/visual review: obsolete InstallWays block, carry-forward strip, old department strip and phone are absent; single top Paseo disclaimer remains. Broad capture boundary connects work to code, decisions and learned facts in owned infrastructure; question-led diagram uses existing pipeline and scoped departmental sources, without an invented answer or automatic external ingestion. Model-flexibility claims retain working-assistant memory limits; install has visible shaded/border separation. Desktop and phone diagrams/operations/boundary shown; README follows the same pipeline/capture/team story with exact install prompt and practical facts retained. No check loosened. All tasks complete; production publication remains pending.</li>
<li class="decision card" id="decision-67" data-note="decision-67" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through brainstorming feedback → user prefers a simple “as you chat, it learns more” explanation without tying everything together. User chose to try the proposed chat exchange and also replace the team flowchart visual.</li>
<li class="decision card" id="decision-68" data-note="decision-68" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: team visual becomes a prominent question with staggered departmental context notes, because the pictured pipeline boxes repeat the same diagram detail the user wants simplified. Keep access, cross-department context and earlier operational connections clear in a short caption.</li>
<li class="decision card" id="decision-69" data-note="decision-69" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Conversation revision source review: replaced the infrastructure capture panel with the agreed short learning headline/body, two native example chat bubbles and a small remembered wholesale schedule. Team context is now one large question with three staggered source snippets, preserving onboarding, existing connections and chosen access without an invented answer. Unused capture/team-flowchart selectors are removed after usage review. Operations, its stable examples, top laptop attribution, model/setup boundary, cost questions and closing spacing are unchanged.</li>
<li class="decision card" id="decision-70" data-note="decision-70" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Check authoring: updated existing heading/order and story-presentation assertions for the conversation, remembered note, single team question and three departmental sources. Existing installation, privacy, costs, clipboard, motion, assistant limitations and all sample behaviors remain covered. README learning text/diagram, owning guide and the existing single Next patch entry are aligned; VERSION is unchanged. All source/tests/docs are complete before the required local pre-check. Tasks15.1–15.3 are source-complete; parent retains live acceptance16.2.</li>
<li class="decision card" id="decision-71" data-note="decision-71" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Conversation revision local checks: required repository pre-check finished with <code>LOCAL_CHECKS=pass</code>, including361 app tests, wiki/skills, no loosened checks and full payload script/link/config/spec/context checks (<code>PAYLOAD_CHECKS=pass</code>). Shellcheck is unavailable locally and remains for CI. Site lint/types, all63 tests in seven files and the production build passed; strict OpenSpec validation passed. No source repair or second test run was needed. Current build assets are <code>index-CFXxHCzN.css</code> and <code>index-C_Uxn-QZ.js</code>. Tasks15.1–15.3 and local16.1 are complete; parent retains refreshed host preview, browser/README acceptance and final loosened-check review in16.2.</li>
<li class="decision card" id="decision-72" data-note="decision-72" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final conversation-visual acceptance: uploaded current build under the same landing alias, immutable version <code>eceeb9c1-8d7f-42c0-a86d-eff1f1935f36</code> (CSS index-CFXxHCzN / JS index-C_Uxn-QZ). Browser checked320/390/768/1280px: page width matches viewport, chat/context illustrations have no viewport overflow and both chat gaps remain24px without overlapping content. Native agreed headline, short owner-account sentence, illustrated shipping conversation and Remembered note are readable. Capture table and team pipeline flowchart are absent, promotion question appears exactly once, onboarding/access copy and one top Paseo disclaimer remain. Three example switches preserve512px frame and921.97px operations height at1280; install navigation and copy work. Reduced motion has no animation; normal motion rotates names, no browser errors. Desktop chat/team and phone team screens shown. README/page reviewed for the same simpler chat-memory story and accurate operations/access/model facts. No check loosened; all tasks complete, production publication remains pending.</li>
<li class="decision card" id="decision-73" data-note="decision-73" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-09</p>Asked through latest story correction → rename Records to Data and simplify opening with concrete lists; Processes includes ad publishing guides, Reasons is one “stopped X because Y” example. Then explain each input in its own chapter: process code, data connected by building processes, reasons from saved chats and memories. Show that each input matters and repeated use adds useful context.</li>
<li class="decision card" id="decision-74" data-note="decision-74" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: keep the accepted laptop hero above the opening knowledge overview, because “we start with this” points at the first story section and does not ask to replace the chosen headline.</li>
<li class="decision card" id="decision-75" data-note="decision-75" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-09</p>Assumed: retain the simple chat composition but change its schedule example to a decision and reason, because the new Reasons chapter should visibly address why. Describe saved conversations without promising raw transcripts for every installation or every detail captured.</li>
<li class="decision card" id="decision-76" data-note="decision-76" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Three-input revision source review: simplified the equal opening lists and one decision example, focused operations on code/guides, added a broad two-tool data-connection chapter, and reused the discount reason in chat and memory. Team copy explains more context through use and new-teammate knowledge with chosen access. README, metadata, owning guide and same Next patch entry align; VERSION unchanged. Updated existing five-scene/order/metadata assertions and concrete source relationships alongside all source and docs before verification; existing behavior, privacy, cost, motion and clipboard guards remain. Tasks17.1–17.4 are source-complete; local checks and parent live acceptance remain.</li>
<li class="decision card" id="decision-77" data-note="decision-77" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Three-input revision local checks: full required repository pre-check passed (<code>LOCAL_CHECKS=pass</code>, <code>PAYLOAD_CHECKS=pass</code>), including all361 app tests and payload script/link/config/spec/context checks. Separate affected-site lint/types, all63 tests in seven files and production build passed; strict OpenSpec validation passed. No check was loosened. Shellcheck is unavailable locally and remains in CI. Site artifacts are <code>index-BZL_88oy.css</code> and <code>index-DwgHYnU6.js</code>. Tasks17.1–17.4 and18.1 complete; parent upload/browser/readability acceptance18.2 remains pending.</li>
<li class="decision card" id="decision-78" data-note="decision-78" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-09</p>Final three-input acceptance: uploaded current build under the same landing alias, immutable version <code>a4acda66-6056-4dfd-ba18-4517156ffffa</code> (CSS index-BZL_88oy / JS index-DwgHYnU6). Browser checked320/390/768/1280px: document width equals viewport and story illustrations remain within its bounds. Opening cards have equal172.58px height on desktop, use short Data/Processes lists and one stopped-discounts reason. Chapters follow Processes → Data → Reasons, followed by growing team context, onboarding and chosen access. Two tool/source connections and the same chat/remembered reason are readable; desktop/tablet/phone screenshots shown. Live packing scans unlock completion, Faire profit is$11.50 with44% margin, brief marker and approval work. Example frame stays512px, keyboard PageDown scrolls the inner region and switching resets it to0. Install navigation/copy and canonical setup disclosure work. Reduced motion has no animation; normal motion rotates names. No browser errors, no check loosened. README reviewed against current story and exact installation/practical facts. Browser closed; all tasks complete, publication remains pending.</li>
<li class="decision card" id="decision-79" data-note="decision-79" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-10</p>Asked through latest preview feedback → show a question collecting Marketing, Finance and Operations context and formulating a result; remove the bleeding-edge phrase and repeated Supports row; explain coding-agent compatibility; try clearer opening bullets with Processes first; rename Monthly Actuals to Profit by channel; move Paseo to one short linked hero disclaimer and remove optional add-on block.</li>
<li class="decision card" id="decision-80" data-note="decision-80" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: use a clearly labeled fictional recommendation grounded in the three shown source notes, because the owner now explicitly wants a result. It is an illustration, not a live answer or a guarantee of the best possible answer.</li>
<li class="decision card" id="decision-81" data-note="decision-81" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: keep “Use the best models.” and qualify broad compatibility by the coding agent's file/command abilities, because a raw model alone cannot run the framework. Preserve the working automatic-memory distinctions.</li>
<li class="decision card" id="decision-82" data-note="decision-82" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: try concise role bullets beside the existing example lists, because the user is open to bullets and wants an easier-to-scan explanation. Preserve varied layouts and keep the opening short.</li>
<li class="decision card" id="decision-83" data-note="decision-83" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Gathered-context source review: overview roles are short bullets with Processes first; the team question gathers campaign goal, remembered margin reason and stock constraint, then gives a labeled fictional recommendation using all three. Coding-agent compatibility appears once and retains automatic/manual memory distinctions. Profit title matches its selector; the sole short hero caption links the canonical optional Paseo entry and the install add-on is removed. README, owning guide and the same Next patch entry align; VERSION unchanged.</li>
<li class="decision card" id="decision-84" data-note="decision-84" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: replaced obsolete Supports/add-on presentation expectations with absent-block and single linked optional-caption assertions. Revised the existing team relationship/source/result and processes-first overview expectations, plus the profit title and its one affected snapshot. Replaced unused add-on metadata with a canonical pictured-app entry, retaining secure-link and neutral-first-step guards. All installation, privacy, cost, clipboard, motion and sample behavior checks remain. All source, existing tests and documentation are authored before the final local checks; parent live acceptance remains in20.2.</li>
<li class="decision card" id="decision-85" data-note="decision-85" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: removing the requested repeated Supports row also removes its two logo loads. Updated the existing exact local-asset count from9 to7; every remaining load still passes the same local-origin and real-file checks. The initial site run passed the other62 tests and lint/types; only the affected privacy/asset file and build are rerun after this repair.</li>
<li class="decision card" id="decision-86" data-note="decision-86" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Gathered-context local checks: full required repository pre-check passed (<code>LOCAL_CHECKS=pass</code>, <code>PAYLOAD_CHECKS=pass</code>), including361 app tests, wiki/skills, no-loosened-check and payload script/link/config/spec/context checks. Site lint/types passed; initial full run passed62/63 tests before the obsolete logo-count repair, then all5 tests in the affected asset/privacy file and production build passed. Strict OpenSpec validation passed. Shellcheck is unavailable on this host and remains in CI. Current assets are <code>index-DM4qHG36.css</code> and <code>index-D_fN-it5.js</code>. Tasks19.1–19.4 and local20.1 complete; parent retains same-alias upload, browser/README acceptance and final check guard in20.2.</li>
<li class="decision card" id="decision-87" data-note="decision-87" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Final gathered-context acceptance: uploaded same landing alias, immutable version <code>223fb7ac-3a7f-4a76-87a4-ca3548110cdf</code> (CSS index-DM4qHG36 / JS index-D_fN-it5). Browser reviewed320/390/768/1280px: document width equals viewport, all opening/team/data/chat elements stay within bounds. Opening roles/cards follow Processes/Data/Reasons and equal desktop cards remain172.58px. Team question visibly gathers Marketing goal, Finance remembered discount reason and Operations stock; labeled example answer combines all three. Desktop opening/team and phone question/evidence/result screenshots shown. Compatibility explicitly requires a coding agent with file/command abilities and retains automatic versus manual memory lookup; Supports row and optional install block are absent. Single short hero caption links canonical Paseo URL and states optional status. Profit heading matches selector; all three desktop modes retain512px frame and921.97px operations height. Packing completion, Faire profit$11.50/margin44%, brief marker/approval and keyboard internal scrolling work; switching resets inner scroll to0. Install navigation/copy and canonical setup disclosure pass; reduced motion has no animation and normal mode rotates names. No browser errors or loosened checks. README/page reviewed; browser closed and temporary captures cleaned after display. All tasks complete; publication awaits owner's choice.</li>
<li class="decision card" id="decision-88" data-note="decision-88" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-10</p>Asked through latest screenshots → use exactly three context-gathering rows before the team response and place the visual beside the explanation; replace overview role bullets/examples with short definitions under Processes/Data/Reasons; remove operations foundation block and mention setup in its description; tighten the overly wide data composition.</li>
<li class="decision card" id="decision-89" data-note="decision-89" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: “side-by-side with the thing” means the conversation beside the team heading and description, because the existing visual runs underneath the entire copy. Keep the gathering rows and answer in the same vertical conversation, with phone stacking.</li>
<li class="decision card" id="decision-90" data-note="decision-90" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-10</p>Assumed: show concise actions and findings for each department, because “rows of thinking describing what it’s gathering” asks for understandable retrieval progress, not a new technical diagram or actual private model reasoning.</li>
<li class="decision card" id="decision-91" data-note="decision-91" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-10-10</p>Check: replaced obsolete opening role-bullet and example-list assertions with three concise definitions, replaced the foundation-list expectation with setup in the operations description, and added gathering-action/three-row ordering assertions for the compact team conversation. Existing fictional findings and grounded answer, real assistant limits, install/privacy/cost/clipboard/motion guards, stable live sample interactions and accessibility remain. Source, affected tests and docs were fully authored before local verification.</li>
<li class="decision card" id="decision-92" data-note="decision-92" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Local repair: the existing site cost-copy guard treats “pricing” as installation-price wording. Kept that safeguard intact and changed the fictional Finance retrieval label to “Checking past discount decisions,” which names the remembered decision more precisely. Only affected site checks are rerun.</li>
<li class="decision card" id="decision-93" data-note="decision-93" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Compact-layout local checks: site lint/types, all63 tests and production build passed; strict OpenSpec validation passed. Required full repository run completed with PAYLOAD_CHECKS=pass, including script tests, links, config, specs, retired names and context budget. Its app stage initially had5 timing-sensitive failures in untouched access tests; the exact prescribed suite-only retry passed all361 app tests and returned LOCAL_CHECKS=pass without changing those tests/settings. Shared host load and the global checks turn delayed the run. Shellcheck is unavailable locally and remains for CI. Tasks21.1–21.3 and22.1 complete; parent preview acceptance22.2 remains. Assets: index-GCS-53_9.css and index-DY4A2oXN.js. README remains aligned and unchanged in this pass; VERSION unchanged.</li>
<li class="decision card" id="decision-94" data-note="decision-94" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Final compact-layout acceptance: uploaded same landing alias, immutable version <code>07ce1f22-8cc0-4546-8f31-382d6b149e87</code> (CSS index-GCS-53_9 / JS index-DY4A2oXN). Browser checked320/390/768/1280px: document width equals viewport and opening/data/chat/team elements stay within bounds. Overview has three short definitions, no role bullets or examples, equal117.78px desktop cards and Processes/Data/Reasons order. Foundation block is absent; setup/code/guides stay in operations paragraph. At1280, Data copy sits left of bounded512px figure with two vertically stacked examples; team copy sits left of544px conversation, with question, exactly three compact gathering-action/finding rows and grounded response in order. At320/390/768, both figures follow copy and result follows all three rows. Desktop team/data and phone conversation pictures shown. Packing scans/completion, Faire profit$11.50/margin44%, brief marker/approval,512px demo frames, keyboard scrolling and reset-to0 work. Install navigation/copy pass. Reduced motion has no animation; normal mode rotates names; no browser errors. Existing coding-agent limits and single short linked Paseo caption remain, no old foundation/bullet/join/support/optional blocks. Owning guide/current README reviewed for actual story and practical facts. No check loosened. Browser closed and captures cleaned after display; all tasks complete, publication pending.</li>
<li class="decision card" id="decision-95" data-note="decision-95" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Shipping synchronization: main added existing-host scheduling and Workers runtime checks. Resolved README as the union of intent: retain the chosen short business-context story and five concise benefit bullets, with the new schedule link/host-availability wording. Changelog retains both upstream release entries below this change. No landing UI or install facts changed.</li>
<li class="decision card" id="decision-96" data-note="decision-96" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Archive checkpoint requested through /ship: all implementation and host-preview tasks are complete. The exact archived change stays selected on improve-landing-readme; main is merged and release40.1.1 is numbered. Combined local checks are running before the single publish checkpoint. Session preference/verification-delay facts were spooled because this checkout has no registered session.</li>
<li class="decision card" id="decision-97" data-note="decision-97" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-10</p>Archive checkpoint after the ship walkthrough: the exact saved landing preview passed cost-disclosure and phone-install browser scenarios, including successful copy and no sideways overflow. Added the two passed browser journeys and proved their retained observations by replay. Ten existing app checks replayed unchanged; the remaining machine-preview check exceeded the shared 120-second replay budget, so the overall walk remains UNKNOWN for that background check, without a landing contradiction. The combined local checks and required saved-source checks passed. No implementation fix or guard weakening was needed.</li>
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
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button>
  <div id="ready" hidden>
    <div class="row" id="ready-choose"><button type="button" data-ready="build">Build it</button><button type="button" data-ready="publish">Build and publish</button></div>
    <div class="row" id="ready-confirm" role="group" aria-label="Build and publish? This goes live and can't be undone." hidden><span>Goes live, can't be undone.</span><button type="button" data-ready="yes">Yes, publish</button><button type="button" data-ready="cancel">Cancel</button></div>
    <p id="ready-says" role="status" hidden></p>
  </div>
</div>
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
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
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
    bar();
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
    bar();
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
      if (!note) data.notes.push({ id: id, label: open.label, text: text });
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length;
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
    fit(d); bar();
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
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id);
      return '- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  function notesText() {
    return ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'].concat(bullets(unsent())).join('\n');
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
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, sending = false;
  function setLive(key) {
    live = key;
    if (!key) $('ready').hidden = true;
    $('copy').textContent = key ? 'Send notes' : 'Copy notes';
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  function sendNotes() {
    const notes = unsent(), n = notes.length;
    if (sending || nothing('sent')) return;
    sending = true;
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      sending = false; setLive(null);
      copyNotes(function () { toast('This link has closed. Copied ' + plural(n) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    ask('send', live, { text: bullets(notes).join('\n') }).then(function (r) {
      if (r.status === 429) { sending = false; toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (!r.ok) { closed(); return; }
      r.json().then(function (answer) {
        if (!answer || answer.sent !== true) { closed(); return; }
        sending = false;
        notes.forEach(function (note) { note.sent = true; });
        persist();
        toast('Sent ' + plural(n) + ' to the chat.');
      }, closed);
    }, closed);
  }
  $('copy').addEventListener('click', function () {
    if (live) { sendNotes(); return; }
    const n = unsent().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── ready: on a reply link that offers both, the bar's second row asks the chat to build, or to build and publish ──
  // The page sends an action's name and the version of the plan it read; the link's opener fixed each message.
  let version = null, acting = false;
  function says(text) { $('ready-says').textContent = text; $('ready-says').hidden = !text; bar(); }
  function readyStep(step) {
    $('ready-choose').hidden = step !== 'choose';
    $('ready-confirm').hidden = step !== 'confirm';
    bar();
  }
  // One primary button in the bar: the notes button while a note is unsent or no build button shows, else the build one.
  // The page's bottom padding follows the bar's height, so a taller bar never covers the end of the page.
  function bar() {
    const el = $('copy').parentNode, ready = $('ready');
    const build = !ready.hidden && !unsent().length && !($('ready-choose').hidden && $('ready-confirm').hidden);
    $('copy').classList.toggle('primary', !build);
    all('[data-ready="build"], [data-ready="yes"]', function (b) { b.classList.toggle('primary', build); });
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Unsent notes would change the plan the chat is about to build: say so. True when it spoke.
  function notesFirst() {
    if (!unsent().length) return false;
    says('Send or delete your notes first.');
    return true;
  }
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || names.indexOf('build') < 0 || names.indexOf('publish') < 0 || typeof answer.version !== 'string') return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  function act(name) {
    if (acting || !live || notesFirst()) return;
    acting = true; says('');
    const closed = function () { acting = false; $('ready').hidden = true; bar(); toast('This link has closed. Choose in the chat.'); };
    ask('act', live, { action: name, version: version }).then(function (r) {
      if (r.status === 429) { acting = false; says('Wait a few seconds, then tap again.'); return; }
      r.json().then(function (answer) {
        const a = answer || {};
        const line = r.status === 200 && a.sent === true ? 'Asked the chat to build' + (name === 'publish' ? ' and publish.' : '.')
          : r.status === 409 && a.changed === true ? 'The plan changed. Reload to read it first.'
          : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
        if (!line) { closed(); return; }
        acting = false; readyStep('done'); says(line);
      }, closed);
    }, closed);
  }
  $('ready').addEventListener('click', function (e) {
    const step = e.target.getAttribute('data-ready');
    if (step === 'build' || step === 'yes') act(step === 'yes' ? 'publish' : 'build');
    else if (step === 'cancel' || (step === 'publish' && !notesFirst())) {
      says(''); readyStep(step === 'cancel' ? 'choose' : 'confirm');
      $('ready').querySelector('[data-ready="' + (step === 'cancel' ? 'publish' : 'cancel') + '"]').focus({ preventScroll: true });
    }
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) ask('alive', key).then(function (r) {
    if (!r.ok) return;
    setLive(key);
    r.json().then(offer, function () { /* no actions: notes only */ });
  }, function () { /* not live: the page copies */ });
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
