---
slug: add-structured-asks
started: 2026-09-22
updated: 2026-09-22
---

# Ask in choices, and always offer the next step

## What the user asked for

Two statements, one session:

1. *"anytime we ask user for an input we should make it so that we ask them in multiple choice style with recommended choice for codex & claude."*
2. Mid-turn: bias toward continuing — *"everytime you give an output think 'What do you need from the user to continue?'"*, with the explicit instruction **not** to put that sentence literally in the payload, only its guidance.

The second is why the convention has a closing next-step section at all. It is guidance about how replies end, not a script to quote.

## Decisions the exit round settled

All four questions came back on the recommended option:

- **Home:** a new shared reference under the `explore` skill, not a wiki page and not an expanded section of `/explore`'s SKILL.md. The wiki was rejected because a skill at an ask site reads its own `references/`; keeping it inside `/explore`'s SKILL.md was rejected because a runbook citing it would inherit clarification-budget text that does not apply to a fix-or-merge fork.
- **Scope:** every user-facing ask, confirmations and offers included — so no skill has to judge which kind of ask it is making.
- **Next step:** every stop that hands control back, not only blocked ones.
- **Enforcement:** written rule only. A checker for "is this ask a real multiple choice?" has to read intent from prose; a grep for `ask the user` fires on every line that merely discusses asking.

## Constraints worth keeping

- **Form, never authorization.** The obvious misreading of "every ask is a choice" is "everything now gets a confirmation", which would add a prompt to every authorized runbook step and break `/ship`'s no-re-prompt chain. This is stated in the reference, in `.claude/rules/payload.md`, and as its own spec requirement with a scenario.
- **`/explore` keeps its budget.** The 80/20 test, small groups, one exit round, four questions stayed in `/explore`. The split is *what to ask and how many* (explore) against *what an ask looks like and which tool carries it* (the reference).
- **`.claude` is a symlink to `.agents`.** Git tracks `.agents/...`; edits through either path land in the same file. Do not try to "fix" a diff that only shows `.agents/`.

## Where the requirements went

`structured-asks` is a new capability. Three requirements moved out of `explore-clarification` into it — the choice format, the host tool order, and the Codex Default-mode project setting (`.codex/config.toml`, unchanged by this work). `repository-improvement` gained the closing next-step question on its interactive report.

## Review page

Four visuals: `anatomy` (diff), `mechanism` (flow), `sites` (tree), `next-step` (flow). The structural checker rejects two bullets sharing one visual, so the "form not authorization" and "explore keeps its budget" bullets were folded into the bullets whose visuals carry their marks rather than given visuals of their own.

A critic pass produced eleven findings; nine were fixed in one revision round.

## Open thread: a kit defect, deliberately not fixed here

At 1440px the review viewer's left change list clips long inline paths — `ol.changes` scrollWidth 355 against clientWidth 302, caused by a missing `overflow-wrap` on `.panel code` in `.claude/skills/plan/references/review-kit.html`. It was a payload release of its own, so it shipped separately — see [`fix-review-panel-wrapping`](fix-review-panel-wrapping.md), v16.5.1.
