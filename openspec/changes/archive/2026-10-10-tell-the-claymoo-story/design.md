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
