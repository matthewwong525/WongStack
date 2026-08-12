---
slug: philosophy-docs-integration
started: 2026-08-12
updated: 2026-08-12
consolidated:
---

# Stating the working principles in the docs

Session where the maintainer handed over a rough written outline of the philosophy behind their setup and asked to have it made consistent across the repo, with the README rewritten to be matter-of-fact. The change's Decision log holds why the change is shaped the way it is; this note holds the context around it — who the docs are for, and how the maintainer talks about the work.

## Who the docs are written for

The maintainer is a former tech founder now running a seven-figure e-commerce business, and wrote the outline because they wanted to share the workflow with other people doing similar work. That audience is the reason the docs stay plain: the reader is a practitioner deciding whether to copy the setup, not a buyer being sold one.

Their stated positions on tone, in their words: less preachy, no "AI native" framing, no buzzwords, matter-of-fact and concise. And explicitly: **"this is just my way of working, people can do it however they want to, adapt stuff."** That last one is the reason the philosophy page opens by saying it is one way of working rather than a doctrine — it was a stated preference, not an editorial choice.

They also rejected putting the personal framing in the repo. The outline opened with a first-person introduction ("I'm a former tech founder…", "I have no one else to talk to about this"), which reads well in a blog post but was deliberately kept out of the wiki. If that essay ever gets written, that voice belongs there, not in `wiki/`.

## The principles as the maintainer stated them

The outline listed four grouped headings, then restated five as standalone maxims. A sixth arrived mid-implementation. The raw phrasing, before it was cleaned up for the wiki:

- Building in-house isn't about saving money — it's about making processes 10x faster and higher quality.
- Most process improvements shouldn't use AI, it should just be code.
- Using AI should not require a complicated setup. Sub-points: "terminal is a shitty UI", online only / no local development, AI is smart enough to set everything up in one prompt, minimum dependencies, more future proof.
- All important context should be stored and accessible for future sessions — progressive disclosure, systems clean up after themselves, team sharing is easy, shared knowledge base is powerful, self-improvement as a bonus.
- The more access AI has the better, but higher security risk. Humans in the loop in a standardized way. **"It's not going to do something you tell it to do. It'll only misinterpret your instructions."** Then a list of gates: reading the plan, OpenSpec, Zero Trust, tests, integration.
- (added mid-session) "We build these systems to help consolidate all the data into one place and that's where our AIs get a lot of power."

The misinterpretation line was kept nearly verbatim on the page because it is the sharpest justification for the whole human-in-the-loop apparatus, and it is a better argument than anything the docs previously made for it.

## Open threads

- **"Terminal is a shitty UI" was not resolved.** It sits awkwardly in a repo whose front door is *paste this prompt into your coding agent*. The maintainer chose to state the no-local-dev / online-only point as a design principle (framing only, no tooling change) and not to steer readers toward web or desktop clients over the terminal. The underlying opinion is still unexpressed anywhere in the repo — if it matters, it needs its own decision about what the docs should actually recommend.
- **"AI is smart enough to set everything up in one prompt"** went uncaptured. It is arguably already demonstrated by the single-paste install in the README, but nothing states it as an intention.
- **The 10x claim was softened** to "ten times faster at higher quality" as an aim rather than a promise. Nobody asked for this; revisit if the maintainer wants the original punch.
- **The philosophy page now links three times into `wiki/stack/`**, which only exists in repos that took the Cloudflare pack. This is allowed (the link checker reports conditional links and passes), and the prose marks them optional, but a core page depending on an opt-in section is a pattern worth watching if it spreads.

## Process observations

The change was planned as five principles and grew to six *during* implementation, before any file had been edited. Folding it in cost nothing because the interruption arrived while reading rulebooks rather than mid-write — the plan artifacts (proposal, delta spec, design, tasks) were updated first, then implementation started from the corrected plan.

The Paseo worktree generates a random branch and directory name (`devilish-kiwi` here). The maintainer replaced it mid-session with a descriptive branch. Worth knowing: a change created early in a session inherits whatever throwaway name the worktree had, and that name is what ends up in `openspec/changes/archive/` permanently unless someone renames it. A branch name containing a slash also breaks the `openspec/changes/<branch>/` lookup, so descriptive branch names should stay flat kebab-case.
