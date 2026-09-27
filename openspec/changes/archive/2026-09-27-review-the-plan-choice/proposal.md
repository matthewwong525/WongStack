# A "Review the plan" choice that prints the plan's link

**Status:** ready-to-ship
**Branch:** premium-stingray
**Open questions:** none

## Why

You often can't find a plan's review page. The rule says to print its link as a line of text just above the closing question, but agents keep skipping that line: on 2026-09-27, in the thinner-specs and wiki-saves sessions, the link was never printed before a question box. Paseo also sometimes hides text written just above a box. Putting the link inside the box doesn't help either, because tapping the box picks an option instead of opening the link.

## What Changes

- **The plan's closing question gets a "Review the plan" choice.** After a plan, the box offers *Build it now* (recommended), *Review the plan*, and *Stop here*. To change the plan, you still type or paste notes.
  ```text
  ┌ What next? ─────────────────┐
  │ ● Build it now (Recommended)│
  │ ○ Review the plan           │
  │ ○ Stop here                 │
  └─────────────────────────────┘
  ```
- **Picking it prints the link and waits.** The next reply ends with *Click here to see the plan:* and the link, in plain text, with no question box after it. You tap the link, look over the plan, then reply "build it" or paste your notes.
  ```text
  you: Review the plan
     │
     ▼
  Click here to see the plan:
  review.html   ◀── tap to open
     │
     ▼
  you: "build it"  or  your notes
  ```
- **Every question box after a plan change offers it.** When a save or publish report changed a plan, its closing box also has *Review the plan*, so you can open the plan from any of them.
- **No link inside the box.** The box's own text no longer ends with the plan's file path, which the unpublished update 26.0.0 adds. It showed, but you couldn't tap it.
- **The link line stays where there's no box**, for example when a build carries straight on after the plan. It also stays above the box, since Paseo shows that text some of the time.
- **The page builder prints the finished link line**, ready to copy, so an agent can't shorten or mistype the path.

**Non-goals:** opening the plan in a new tab by itself. Paseo 0.9.2 can open tabs only for web addresses, with its browser tools switched on, and the plan is a file on this machine. That's a later idea, noted in memory. Also out: changing how the review page looks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: the plan-link requirement gains the *Review the plan* choice, which prints the link and stops. The path is no longer written inside the question, and the builder's ready-made line is the one printed.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: "End every reply with the next step" (the finished-plan choices) and "Print the plan's link".
- `.agents/skills/plan/SKILL.md` Finish, and the `/save` and `/ship` report lines that 26.0.0 (PR #156) points at the link rule.
- `.agents/skills/plan/scripts/build-review.mjs` output, and `scripts/tests/review.test.mjs`.
- `AGENTS.md` WONG-STACK rule line; `wiki/development/the-change-loop.md` and `wiki/stack/mini-apps.md` mentions of *build it now?*
- `openspec/specs/asking-the-user/spec.md` (delta), `VERSION`, `CHANGELOG.md`.
- Builds on PR #156 (26.0.0), which edits the same lines; the build starts after #156 is published.

## Decision log

- **2026-09-27** — Asked whether text above a question box shows in Paseo → the first test said nothing showed above the box; the second test (the word *pineapple*) showed. So it is not reliable either way.
- **2026-09-27** — Asked how a plan's closing question should carry the link → chose a *Review the plan* option that, when picked, prints the link in the next reply; the person rejected putting the link inside the box, because tapping the box picks an option instead of opening the link.
- **2026-09-27** — Asked whether the page could open in a new tab by itself → chose to print the link for now and keep auto-opening as a later idea.
- **2026-09-27** — Asked what to do with PR #156, which puts the plan's path in the question text → chose to publish #156 as it is, then build this on top and remove that line.
- **2026-09-27** — Assumed: the root cause is that agents skip the link line, not the shortened path. Both session records show no link in the chat text before any closing box. Thinner-specs wrote its summary and link only in its reasoning, which is never shown. Memory #306 and #310 said otherwise; the save corrects them.
- **2026-09-27** — Assumed: the plan's box keeps three choices, *Build it now*, *Review the plan*, *Stop here*, and drops *Change the plan first*, because the options stay at three and notes still come in as typed or pasted text.
- **2026-09-27** — Assumed: other boxes in a reply that changed a plan, such as *Publish it?*, add *Review the plan* as a fourth choice, because the person wants the plan reachable from every reply that touches it (memory #310), and the question tools allow four.
- **2026-09-27** — Assumed: the link line still goes above the box as well, because it costs nothing and the second test showed that text there sometimes appears.
- **2026-09-27** — Assumed: the builder's second output line becomes the full link line, `Click here to see the plan: [review.html](<absolute path>)`, because no script reads that line and the agent then copies it instead of retyping the path.
- **2026-09-27** — Assumed: this ships as 26.1.0, a minor release after #156's 26.0.0, because it adds a choice and changes no command.
- **2026-09-27** — Assumed: task 4.3's save is `/ship`'s one checkpoint, because the change ships in the same run; a failing gate stops the merge.
- **2026-09-27** — Distilled: no repeatable fact. The change and branch had no live facts, and the Paseo behavior found here is written into the plan-link rule itself.
- **2026-09-27** — Archive checkpoint: built on 26.0.0 (#156); the builder prints the link line, the plan's closing question offers *Review the plan*, and the path-in-question line is gone. Ships as 26.1.0.
