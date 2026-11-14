# Proposal

**Status:** parked
**Branch:** sleek-bear
**Open questions:** none

## Why

The key guides on wongstack.com are live, but 16 steps still have no picture: Shopify 01-04, Shopify theme 02, Klaviyo 01-02, Meta ads 02-06 and 08, and Canva 01-03. A reader who can not see the screen gets lost at those steps. My browser could not sign in to those tools, so you take each screenshot yourself and send it in this chat.

## What Changes

- **Each screenshot you send becomes a safe, small picture in its step.** I crop it to the part the step is about and put a red box on the button to tap. I blur every name, email, store name, and account ID. Then I look at the result, so no letter of a name shows. The picture appears in its step, and its line leaves the shot list.
  ```picture
  Before: pictures/klaviyo-before.webp
  ```
  ```mermaid
  flowchart TD
    send["you send it"] --> clean["crop, blur, red box"] --> look{"I check it"}
    look -->|ok| step["in its step, off the list"]
    look -->|"key or wrong screen"| again["delete, ask again"]
  ```
- **Each guide goes live when all its pictures are in.** You send pictures in any order. When a guide is complete, I show it to you on a link to look at, and it goes live when you say so. The guides still waiting keep their missing steps hidden, as now, and carry on in a new plan with these same steps.
  | Guide | Pictures you send |
  | --- | --- |
  | Shopify | 4 (steps 1 to 4) |
  | Shopify theme | 1 (step 2) |
  | Klaviyo | 2 (steps 1 and 2) |
  | Meta ads | 6 (steps 2 to 6, and 8) |
  | Canva | 3 (steps 1 to 3) |
- **A step whose screen changed gets new words.** If your screenshot shows a button or label that is not what the step says, I change the step to match the screen and move the guide's *Last checked* date. I tell you each one.

Non-goals: no new guides and no change to how the site builds pages. I never press a button that makes or shows a key, and the screens that show a key stay drawings. You still run each guide's check with a real key; that is separate from this plan.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `landing-site` spec already requires a picture at each step and forbids keys and private data in pictures; this change fills in the pictures it names (`skip_specs: true`).

## Impact

- `site/public/guides/<id>/NN.webp`: 16 new pictures, each WebP, at most 1200 px wide and under 150 KB.
- `site/guides/shot-list.json`: one entry deleted per picture added; empty when all 16 are in.
- `site/guides/<id>.md`: step text and `lastChecked` only where a screenshot shows a changed screen.
- Meta-only: the site ships to no install, so no release entry.

## Decision log

- **2026-10-31** — Asked when the pictures go live → chose: each guide goes live when all its pictures are in.
- **2026-10-31** — Assumed: a guide still waiting when another ships moves to a new change with the same proposal and design, because a change with unfinished steps can not be published.
- **2026-10-31** — Assumed: a step whose screenshot shows other labels gets new words and a new *Last checked* date, because the wiki's recheck steps say so, and a picture that does not match its words confuses a reader.
- **2026-10-31** — Assumed: no new check for picture width, because the crop command resizes to 1200 px wide and the existing test already checks the 150 KB size and the shot list.
- **2026-10-31** — Assumed: a screenshot that shows a key or the wrong screen is deleted and asked for again, because the spec forbids a key in any picture, blurred or not.
- **2026-10-31** — Parked: the plan is saved and not built. Matthew closed the chat for lack of time and sends the screenshots later; `/continue guide-screenshots` picks it up.
