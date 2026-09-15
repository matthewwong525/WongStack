---
slug: add-html-wireframes
started: 2026-09-14
updated: 2026-09-14
---

# Clickable HTML wireframes instead of ASCII sketches

## What the user asked for

"Instead of having the UX in a design, I'm thinking of generating like an HTML file as a wireframe
of the UX so someone can click around and see what is being planned. It would be nice to have this
as an artifact so someone can see a mock up of something."

They asked whether it made sense and for questions back, so the session ran as `/explore` first and
put four forks to them. They answered: follow the recommendations on all of them, low fidelity,
and "see if there is anything online or libraries that help with this".

## What the user confirmed matters

- **They open the file directly and that is enough.** Asked how a reviewer would see it, they said
  "they can open it in the paseo browser hopefully can you test adding an html file for me to test
  it out", and after trying it: "oh nice this works well i can just open the file and see it".
  This killed the PR-body screenshot idea before it was planned — screenshots need public image
  hosting, and the whole point is that opening the file needs nothing.
- **Low fidelity, explicitly chosen** when offered lo-fi versus rendering the repo's real component
  library.

## Libraries reviewed and why none was taken

Searched on the user's request. Three real options, all rejected as *dependencies* while their ideas
were kept:

- [agilek/wireframer-skill](https://github.com/agilek/wireframer-skill) — MIT, and the closest prior
  art: text in, one clickable multi-screen HTML file out, Balsamiq look. Loads wired-elements,
  react-doodle-icons, and Google Fonts from CDNs.
- [wired-elements](https://wiredjs.com/) — hand-drawn web components on rough.js. Needs a CDN or a
  bundle.
- [Wireframe-CSS](https://github.com/sequentialscott/Wireframe-CSS) — one sketchy stylesheet, old
  and lightly maintained.

The disqualifier is the same for all three: a planning record that archives for years must not
depend on a host staying up, and it must render with no network. Their prompt structure is still
worth reading if the kit's fill rules ever need rewriting.

Deliberately **not** adopted: the sketchy/hand-drawn aesthetic. It is a cheap add later (a font plus
wobbly borders) and is the right fix *if* reviewers start reading grey-box wireframes as decided
layouts. Nobody has reported that yet, so it stayed out.

## Two findings that came from driving the file, not from thinking

1. **Counting primary actions per screen is the wrong unit.** The kit's own example screen failed the
   very check this change hands the critic subagent. Markup outside a state block renders in every
   state, so a header "+ New item" plus the empty state's inline "+ New item" shows two filled
   buttons at once. Rule is now "at most one visible at a time, counted per state" everywhere it
   appears. Worth remembering for any future state-switching template.
2. **A one-screen template cannot teach navigation.** The routing falls back to the first screen when
   `data-go` points nowhere, so a dangling target fails *silently*. The kit therefore ships a second,
   deliberately thin screen purely as the click target.

## A wrong turn worth not repeating

`agent-browser` reported "element is covered by `<div.chrome>`" when clicking `.btn.ghost`, which
read exactly like a sticky-header defect. A `scroll-margin-top` rule was added, and it did not help
— because there was no defect. The selector was matching the *hidden* screen's copy of `.btn.ghost`,
which has height 0 and top 0 and therefore sits under the chrome. Scope selectors to
`.screen[data-active]` when driving a multi-screen single file. The CSS was reverted.

## Open threads

- **Hosting the file so a PR link renders it** is the obvious follow-on. GitHub shows `.html` as
  source. The stack pack's per-commit preview deploy could serve it; the `WALK_MEDIA_BUCKET` route
  exists but most repos have no bucket. Deliberately deferred, not rejected.
- **The file is untested against a long flow.** The largest wireframe driven so far has two screens.
  The 100 KB estimate in design.md is arithmetic, not measurement.
- **The `improve-openspec-plans` change** was already active in this repo and is unrelated; it stayed
  untouched throughout.

## Process observation

`/ship` was invoked on a branch named `explore-html-wireframes` whose change was `add-html-wireframes`,
with all 16 tasks unimplemented. Two preconditions were missing at once: the runbook resolves the
change folder from the branch name, and there was nothing implemented to ship. The branch was renamed
to match the change and `/apply` was pulled in first. Bare `/ship` has no written pull-in — only
`/ship <intent>` does — so this relied on the "never merge as a way of stopping" hard rule instead.
A rule for bare `/ship` on a planned-but-unimplemented change may be worth stating outright.
