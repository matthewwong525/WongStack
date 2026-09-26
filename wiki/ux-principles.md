# UX principles

How to decide what a screen should *be* — who it serves, what job it accomplishes, and how the layout earns its shape — before any component gets picked. This is the judgment layer beside your stack's UI/component conventions (which own the mechanics: which component, which token, which library). Every UI-bearing change applies these principles in a `## UX` section of its design.md (see [the change loop](development/the-change-loop.md)); the section template is at the [bottom of this page](#the--ux-section-in-designmd). The screen itself is sketched in text on [the change's review page](#the-review-file), which every change carries, so the layout is argued from a picture rather than a paragraph. When the real thing is cheap to build, build it: a [mini app](stack/mini-apps.md) preview shows the actual screen.

**This page is conditional.** It applies only to changes that add or restructure a user-facing screen. A repo with no UI — a CLI, a library, a backend service — can ignore it entirely.

The one-line version: **UX leads, visuals serve.** First get the job and the flow right; then use hierarchy to make the screen express that flow. A beautiful screen that serves the wrong job is a failure; a plain screen that finishes the job in one straight line is a success.

## Part 1 — Start from the use case

Never start from a layout. Before drawing anything, answer the **UX brief**:

- **Who is here, and what job are they trying to accomplish?** Not the feature name — the actual job. Not "manage the listings page" but "copy our good content onto the stale listings without doing it one-by-one."
- **What does *done* look like?** The end state the user is trying to reach. The screen should drive toward it, not just display data near it.
- **Context of use.** Desk or floor? Phone, tablet, or desktop? Gloved hands with a scanner? Interrupted every two minutes? One app can span a writer at a desk and an operator at a station — same design system, very different screens. **When the answer is a phone, the phone layout is the design, not an afterthought:** sketch it first, about 40 columns wide, the width of a phone. A screen that only works at 960px is not finished.
- **Common case vs edge case.** The common case gets the real estate and the straight-line flow; edge cases may cost an extra step or live in a menu. Never let a rare case complicate the frequent one.
- **Frequency assumptions, stated explicitly.** "Operators run this ~200×/day; admins open the settings ~1×/month." Write the assumption down so it can be challenged — until you have real usage data, these are judgment calls; once you do, cite event counts instead.

Then design the **flow**: the shortest path from intent to done for the common case. Smart defaults pre-filled from context, no dead-end states, no detour through a second screen the common case doesn't need. Only after the flow works do visuals enter.

## Part 2 — Principles

Distilled from [Refactoring UI](https://www.refactoringui.com/). A mature design system already solves the book's "define systems in advance" chapters — type scale, spacing scale, palette are decided; never invent values outside them. What's left is judgment:

- **Hierarchy is everything.** A screen where everything is equally loud says nothing. Decide what matters most for the job and make everything else visibly subordinate.
- **One primary action per screen.** The job's next step gets the one solid, filled button; everything else is secondary (outline) or tertiary (ghost/menu). Two primary buttons means the brief wasn't finished.
- **Emphasize by de-emphasizing.** Make the signal stand out by muting the noise — a muted color, lighter weight, smaller supporting text — rather than making the signal bigger and bolder.
- **Weight and color before size.** Hierarchy comes from font weight and semantic color far more than from font size. Reach for size last.
- **Labels are a last resort.** Format data so it explains itself: `3 boxes · 82 items` beats `Boxes: 3  Items: 82`. When a label is needed, combine it with the value or mute it — the value is the content.
- **Density is decided by the job, not by taste.** Start with generous white space and remove deliberately — except where density *is* the feature: an operator scanning a queue wants tight rows; a settings page wants air. The Part 1 brief decides which. You don't have to fill the screen — a narrow, focused column beats stretched content.
- **Unambiguous spacing.** More space *between* groups than *within* them, always — ambiguous gaps make readers guess what belongs together.
- **Design the empty state.** First-run and zero-results screens start the job (the primary action inline), never just announce absence.
- **Fewer borders.** Separate with spacing and a background shift, not boxes inside boxes. Borders are the last tool, not the first.
- **Never rely on color alone.** Pair color with an icon, label, or weight change — accessible contrast and dark-mode legibility are part of the mechanics your UI conventions own.
- **One deliberate touch per screen.** An accent border, a designed detail — polish is a spice, not a base.

## The `## UX` section in design.md

UI-bearing changes (adding or meaningfully restructuring a screen/component — not merely touching a UI file) include a `## UX` section in the change's design.md, in this shape:

```
## UX

### Use-case brief
Who, the job, what done looks like, context of use,
common vs edge case, frequency assumptions.

### Flow
Shortest path from intent to done for the common case;
where edge cases branch off.

### Hierarchy
Per screen: the one primary action; what gets de-emphasized.

### Review
A link to review.html, and the What Changes items
that sketch each screen. No sketches here —
the proposal holds them.

### Components
The existing components used (per your UI conventions);
anything new being created and why.
```

Worker-only or UI-less changes skip the section entirely and draw no screen. They still get a review page, with one text drawing of the flow, diff, or file tree that carries the change by default; other bullets stay text. Prefer mirroring the closest existing screen over inventing a new pattern — name which screen in the brief.

### The review file

The picture lives in the proposal and shows at `openspec/changes/<name>/review.html` — one page per change, built by [the plan skill's builder](../.agents/skills/plan/scripts/build-review.mjs) from `proposal.md` and [the fixed kit](../.agents/skills/plan/references/review-kit.html). The page is one scrolling document: Why, the What Changes items with their drawings, and the decisions, each labeled *asked* or *assumed*.

A drawing is a fenced `text` block inside the bullet it explains, in plain characters. One drawing carries the change by default: a flow, a before-and-after diff, a file tree, or a screen. What a screen sketch must hold is what the rest of this page argues for:

- **Every screen in the flow**, and each empty, loading, or error state the flow names, as its own small sketch. A state a reviewer can not see is a state nobody designed.
- **One primary action per state.**
- **The phone layout first when the brief says phone** — see [context of use](#part-1--start-from-the-use-case) above. Keep a sketch about 40 columns wide, top to bottom.
- **Low fidelity on purpose**: boxes and labels, no brand. It argues about the change; it is not a picture of the finished screen. Raising the fidelity invites a review of the paint job instead of the flow.

The page opens each drawing fitted to the screen; the reviewer pinches or presses + to zoom and drags to pan. **A reviewer taps an item to add a note** — there is no annotate mode, and a drag still scrolls. Unfinished text stays a draft on its target; Save makes it a note. Notes stay in the browser, never in a repo file. **Copy notes** produces a `/continue <change>` command to paste back before work resumes.

Part of [the WongStack wiki](README.md).
