# Better drawings in plans and explore

**Status:** ready-to-ship
**Branch:** explore-ascii-drawings
**Open questions:** none

## Why

A plan's drawings are almost always one column of steps joined by arrows, so they rarely show choices, branches, or a before-and-after. OpenSpec's explore mode draws richer pictures with a few simple patterns, and one of our recent plans shipped a box with a crooked edge that nothing caught.

## What Changes

- **A short guide with five drawing patterns.** Plans and explore draw from one guide, copied from OpenSpec's explore mode: a titled frame, options side by side, branches that split and join, labels under boxes, and a comparison table. Each pattern has one small example to copy. It stays short, not the long guide we removed before.
  ```text
  DRAWING PATTERNS
  ════════════════════════════
  titled frame     side by side
  split and join   labels under
  comparison table
  ```
- **Wider when a drawing needs it.** Drawings still aim for 40 columns, the width of a phone. Options side by side, a table, or a before-and-after may go up to 56. The page still warns past 60.
  ```text
       ONE COLUMN            SIDE BY SIDE
       ──────────            ────────────
        step one         ┌────────┐  ┌────────┐
           │             │ option │  │ option │
           ▼             │   A    │  │   B    │
        step two         └────────┘  └────────┘
                           simple      faster
       ◀─── 40 ───▶      ◀────────── 56 ──────────▶
  ```
- **Crooked boxes get caught.** When a box's right edge doesn't line up with its top corner, building the plan's page names the drawing and line, like the too-wide warning. It still builds the page.
  ```text
  ┌──────────────┐
  │ lined up     │
  │ one too far   │  ◀── warning: line 3
  └──────────────┘
  ```
- **Screen sketches show every state and the change.** A plan that changes a screen draws it before and after, side by side. A plan that adds a screen draws each state its steps name, such as empty, loading, or error.
  ```text
     BEFORE               AFTER
  ┌──────────────┐    ┌──────────────┐
  │ Notes        │    │ Notes     3  │
  │              │    │ • fix title  │
  │ [Copy notes] │    │ [Save]       │
  └──────────────┘    └──────────────┘
  ```
- **Explore draws while you think.** When you explore an idea, the agent draws in the chat with the same patterns: the flow as it is today, the options side by side, what each costs. It still writes no files.
  ```text
  you: "should notes sync?"
          │
    ┌─────┴──────┐
    ▼            ▼
  ┌──────┐    ┌──────┐
  │ keep │    │ sync │
  │ local│    │ them │
  └──────┘    └──────┘
   simple     needs a login
  ```

Non-goals: no change to how the page shows, zooms, or takes notes on a drawing; no plain-ASCII switch; no picture or HTML drawings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ux-wireframes`: drawings follow a shared pattern guide, may reach 56 columns for side-by-side work, and the builder warns about misaligned box edges; screen sketches show each named state and a before-and-after; `/explore` draws in chat by the same guide.

## Impact

- New `.agents/skills/plan/references/drawings.md`: the five patterns, the width rule, and the screen-sketch rule, each with one example.
- `.agents/skills/plan/SKILL.md` and `.agents/skills/explore/SKILL.md`: point to the guide; the width sentence changes.
- `.agents/skills/plan/scripts/build-review.mjs`: box-edge check; width warning text names 56.
- `openspec/config.yaml` proposal rule, `wiki/ux-principles.md` (*Context of use*, *The review file*), and the payload manifest's plan entry.
- `scripts/tests/review.test.mjs`: box-edge and warning-text coverage.
- `CHANGELOG.md` `## Next (minor)` entry.

## Decision log

- **2026-09-28** — Asked how wide a drawing may be → chose aim for 40, up to about 56 when side by side, a table, or before-and-after needs it; the builder still warns past 60.
- **2026-09-28** — Asked which characters drawings use → chose keep the line characters (┌─┐ │ ▼) and add a builder check for box edges that don't line up, rather than OpenSpec's plain `+ - |`.
- **2026-09-28** — Asked where the better drawings apply → chose plans' review pages and `/explore` in chat.
- **2026-09-28** — Assumed: OpenSpec ships no drawing library, only prose rules and four examples in its explore template (CLI 1.13.2), so we copy the patterns, not code, because there is nothing else to copy.
- **2026-09-28** — Assumed: the guide is one short file beside the plan skill, not a wiki page, because it is how an agent draws, and lighten-the-loop removed a long author guide for weight.
- **2026-09-28** — Assumed: screen sketches draw a before-and-after for a changed screen and each state the flow names for a new one, because a reviewer can't see a change or a state nobody drew.
- **2026-09-28** — Assumed: the edge check covers only the line characters, not `+`/`|` boxes, because `+` and `|` show up in plain text and would give false warnings.
- **2026-09-28** — Built inside `/ship`: the guide, the builder's box-edge check, and the docs; `/plan` also says to fix a box edge the builder flags, beside its width sentence. Run over every archived proposal, the check flags only show-browsing-in-chat's three known crooked boxes and nothing else.
- **2026-09-28** — Asked how to fit the instruction-size budget, which main had nearly used up (170 bytes left; the change added about 3,700) → chose trim to fit, keeping the check as strict: the guide keeps its drawings but loses most prose and one overlapping example, and the payload manifest drops a repeated tutorial paragraph and says its preflight, Paseo, and not-copied rules in fewer words.
- **2026-09-28** — Distilled at ship: `.github/CONTRIBUTING.md` now says the size check also fails unless instructions stay below the baseline, and that line-drawing characters count three bytes; the OpenSpec fact stays in memory, no other repeatable fact.
- **2026-09-28** — Archived at ship as 26.24.0; all tasks done and CI green on the branch.
