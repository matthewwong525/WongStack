# UX principles

How to decide what a screen should *be* — who it serves, what job it accomplishes, and how the layout earns its shape — before any component gets picked. This is the judgment layer beside your stack's UI/component conventions (which own the mechanics: which component, which token, which library). Every UI-bearing change applies these principles in a `## UX` section of its design.md (see [the change loop](development/the-change-loop.md)); the section template is at the [bottom of this page](#the--ux-section-in-designmd). The screen itself is drawn on [the change's review page](#the-review-file), which every change carries, so the layout is argued from a picture rather than a paragraph.

**This page is conditional.** It applies only to changes that add or restructure a user-facing screen. A repo with no UI — a CLI, a library, a backend service — can ignore it entirely.

The one-line version: **UX leads, visuals serve.** First get the job and the flow right; then use hierarchy to make the screen express that flow. A beautiful screen that serves the wrong job is a failure; a plain screen that finishes the job in one straight line is a success.

## Part 1 — Start from the use case

Never start from a layout. Before drawing anything, answer the **UX brief**:

- **Who is here, and what job are they trying to accomplish?** Not the feature name — the actual job. Not "manage the listings page" but "copy our good content onto the stale listings without doing it one-by-one."
- **What does *done* look like?** The end state the user is trying to reach. The screen should drive toward it, not just display data near it.
- **Context of use.** Desk or floor? Phone, tablet, or desktop? Gloved hands with a scanner? Interrupted every two minutes? One app can span a writer at a desk and an operator at a station — same design system, very different screens. **When the answer is a phone, the phone layout is the design, not an afterthought:** draw it first on the review page (the kit's `phone-only` and `desktop-only` helpers let one screen carry both), walk it with the chrome's View toggle, and expect the critic to check every state at phone width. A screen that only works at 960px is not finished.
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
A link to review.html, and its screens and states
listed as #/<screen>/<state> anchors. No sketches here —
the page is the picture.

### Components
The existing components used (per your UI conventions);
anything new being created and why.
```

Worker-only or UI-less changes skip the section entirely, and draw no screen — they still get a review page, with the other kinds of visual. Prefer mirroring the closest existing screen over inventing a new pattern — name which screen in the brief.

### The review file

The picture lives beside the section, at `openspec/changes/<name>/review.html` — one page per change, filled from [the plan skill's kit](../.claude/skills/plan/references/review-kit.html), which owns the chrome, the panel, the primitives, and the routing. **The proposal's What Changes list is the navigation:** a reviewer clicks a change and the stage shows a picture of that change, so the argument and the evidence are never more than one click apart.

Four kinds of visual, and a change uses whichever fits each bullet:

| Kind | Shows |
|---|---|
| `screen` | a UI screen at low fidelity, with the empty, loading, and error states the flow names |
| `flow` | a sequence of steps, as a today lane and an after lane |
| `diff` | before-and-after text — a rule, a config value, a template, prose |
| `tree` | files added, edited, removed |

What a `screen` must hold is what the rest of this page argues for:

- **Every screen in the flow**, each with the empty, loading, and error states the flow names. A state a reviewer cannot reach is a state nobody designed.
- **One primary action visible at a time**, clickable through to the next screen, so the flow can be walked rather than read. Count per state: a header button that shows in every state plus an inline button in the empty state is two.
- **A phone layout when the brief says phone** — see [context of use](#part-1--start-from-the-use-case) above.
- **A numbered callout per layout choice** that matters, with its reasoning in the notes block beside it — the page has to stand alone for a reader who never opens design.md.
- **Low fidelity, enforced by the kit**: grey boxes, no brand, no design tokens, no product typography. It is an argument about the change, not a picture of the finished screen. Raising the fidelity invites a review of the paint job instead of the flow.
- **No network reference of any kind**, so it opens from a clone with no server and still renders years later out of the change's archive folder.

**What an author does:** write the visuals, put `data-mark` on the elements each bullet changes, and anchor each What Changes bullet with `(review.html#/<visual>[/<state>][/<mark>])`. A mark must never share a name with one of that visual's states. **What the tooling does:** `/plan` draws the page and appends those anchors; `/save` keeps the page's Why and What Changes equal to `proposal.md`; the page itself renders the panel, highlights a bullet's marks, and carries the annotate layer.

**A reviewer annotates in place.** Turn on Annotate, click anything on a visual or in the list, type what should change. Notes become numbered pins and stay in the browser, never in a repo file. **Copy notes** puts them on the clipboard as a `/continue <change>` command — paste it back and the notes are folded into the change before any task resumes.

Tasks cite what they build (`review.html#/list/empty`), so the picture and the brief are both in hand at implementation time.