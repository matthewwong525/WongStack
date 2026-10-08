# Put the build buttons in the bottom bar

**Status:** ready-to-ship

**Branch:** build-buttons-in-the-bar

**Open questions:** none

## Why

*Build it* and *Build and publish* sit at the foot of the plan page, under everything. On a phone that means scrolling past the whole plan to reach them, which is a lot of work for a one-tap answer.

## What Changes

- **The two build buttons move into the bottom bar, which is always in view.** On a live link the bar gets a second row with *Build it* and *Build and publish*, under the notes row. The section at the foot of the page goes away, so the buttons live in one place.
  ```text
    BEFORE (phone)           AFTER (phone)
  ┌──────────────────────┐ ┌──────────────────────┐
  │ ...the whole plan... │ │ ...the whole plan... │
  │ Ready?               │ │                      │
  │ [Build it]           │ │                      │
  │ [Build and publish]  │ │                      │
  ├──────────────────────┤ ├──────────────────────┤
  │ 2 notes [Send notes] │ │ 2 notes [Send notes] │
  │                      │ │+[Build it] [Build and│
  │                      │ │+           publish]  │
  └──────────────────────┘ └──────────────────────┘
  ```
- **One button stands out at a time.** With notes you have not sent, *Send notes* is the bold one. With none, *Build it* is. On a wide screen everything fits on one row.
- **The publish question and the page's answers show in the bar too.** Tapping *Build and publish* swaps the build row for *This goes live and can't be undone.* with *Yes, publish* and *Cancel*. After a tap the row says what happened, such as *Asked the chat to build.* or *Send or delete your notes first.*
  ```text
  ┌────────────────────────────┐
  │ 0 notes       [Send notes] │
  │ Goes live, can't be undone │
  │ [Yes, publish]    [Cancel] │
  └────────────────────────────┘
  ```
- **Nothing else changes.** A plan opened as a file, or through a closed link, shows the bar as today with no build row. The stops for unsent notes and a changed plan stay.

Non-goals: no new buttons, and no change to what a tap sends.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: the build buttons stay in view without scrolling.

## Impact

- `.agents/skills/plan/references/review-kit.html`: the bar's build row, the page's bottom padding, removal of the foot section.
- `scripts/tests/review-browser.test.mjs`; `wiki/ux-principles.md` if it names the foot.
- Payload release: `CHANGELOG.md` entry, **patch**.

## Decision log

- **2026-10-08** — Matthew, after trying the page on his phone: 'build and build and publish should be on the bottom bar as well not at the bottom of everything cause scrolling down is a lot of work'.
- **2026-10-08** — Assumed: a second row on a phone, not shorter labels on one row, because four items do not fit a phone's width and the labels match the chat's own choices.
- **2026-10-08** — Assumed: the foot section is removed, reading 'as well' as 'also within reach', because two sets of the same buttons could each be tapped. Easy to keep both if he meant that.
- **2026-10-08** — Assumed: the bold button follows unsent notes, because the page keeps one main action and a build is stopped anyway while notes are unsent.
- **2026-10-08** — Build choices beyond the plan: once a build is asked, *Send notes* is bold again so the bar always has one bold button; a note saved while the publish question is open takes the bold from *Yes, publish*; the page's bottom space is the bar's height plus a little air; the toast sits above the bar at any height.
- **2026-10-08** — Archive checkpoint: every task ticked, local checks pass, numbered 38.2.1. Matthew saw the new bar on a throwaway plan's live link before asking to publish.
