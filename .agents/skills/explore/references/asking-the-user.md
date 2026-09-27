# Asking the user

Every WongStack ask, from a clarification to a yes/no confirmation, has one shape: **two or three real options, the recommended one first, a short tradeoff on each, and room for the user's own words.** [`/explore`](../SKILL.md) owns *what to ask and how many*; this page owns *how an ask looks and which tool carries it*.

## The anatomy of an ask

```
Where should the convention live?
  1. A shared reference (Recommended) — one copy, every skill links it.
  2. Inside /explore — no new file, but runbooks inherit text they do not need.
  3. A wiki page — best hub placement, one hop further from the ask site.
```

- **Two or three options**; two is normal for a confirmation. The one exception is a fourth, *Review the plan*, by [the plan's link](#print-the-plans-link).
- **The recommended one first, labelled `(Recommended)`** in the option text itself.
- **A short tradeoff on each:** what the user gets and what it costs; an option with no consequence is not a choice.
- **Keep the custom answer open** in the tool's own free-text field, never as an added Other option. Use a custom answer as given, not forced into the nearest option.
- **No filler.** Ask only what changes the result.
- **Options would be artificial?** Ask a structured free-text question, such as for a credential; never invent alternatives.

## Write in plain words

Write every plan, question, and report in plain words, for everyone. Give more detail only when the person asks — for one reply, or from now on. A standing ask is a preference on their person page, by [the People rules](../../../../wiki/wiki-style.md#people); never guess it from one message.

- **Name what the person will see, get, lose, or risk** — *what happens to the accounts that exist today?*, not *how should the migration handle the schema?* — with no file path, identifier, command, or engineering term they did not use first.
- **Fix before you ask.** Never offer a choice needing judgment the reader lacks. Where the skill's rules allow, try the fix first, then ask about the outcome: *the sign-up button does not work on the preview: fix it first, or publish anyway?*
- **Lead a report with the outcome** — what is done, what they can open, what does not work. A failed or unverified check is part of the outcome, in plain words.
  - **The person ran the verb:** at most one link — the preview when there is one, else the pull request, called *the change on GitHub*. Leave out branch names, commit ids, the gate line (`SAVE_GATE_RESULT=…`), `merge.sh`'s `key=value` lines, and fact counts; give them exactly when the person asks.
  - **Inside another verb:** still print every line the calling verb reads, such as `/save`'s gate line inside `/ship`, `/apply`, or `/verify`.

`/explore`'s limits (the 80/20 test, small groups, one exit round, four questions) bound clarification before planning, not a runbook's fork.

## Which tool carries it

Use the first callable tool:

1. Codex **`request_user_input`**
2. Claude **`AskUserQuestion`**
3. Another host's equivalent structured question tool
4. **Numbered chat** with the same questions, options, recommendation, and custom-answer path; wait for the answer.

Follow the tool's schema, mode restrictions, and real capacity; four questions is not a universal limit. A missing named tool only moves you down the list, not into non-interactive mode.

**Only where nobody can answer**, as in an unattended run, take the recommended options, label each **assumed** rather than chosen, and continue without waiting.

**A question stays pending until the user answers it**, whatever the elapsed time or preselected option; meanwhile do only independent work.

## Confirmations, offers, and menus are asks

- **A confirmation** names what happens on each side, never a bare yes/no: `Delete both databases (Recommended once the data is saved) / Keep them and stop`.
- **An offer** names the outcome, not the product, and always includes stopping.
- **A menu** shows the detail the choice needs, such as a change's status; never resolve several candidates by guessing.

## Form, never whether to ask

This page decides how a question **looks**, never which actions **need** one. An action the invocation already authorized, such as `/ship`'s archive-and-merge chain, is taken and reported, with no added confirmation.

## End every reply with the next step

Before you finish, put to the user **what they must decide for this work to continue**, as an ask like any other: the same format, through the first callable tool in [which tool carries it](#which-tool-carries-it). Write the report, and any link, as chat text first; the tool carries only the question. A numbered list at the end of a reply is for a session with no such tool, never a habit.

- A finished plan: [the plan's link](#print-the-plans-link) in chat text, then the question: *Build it now (Recommended)* / *Review the plan* / *Stop here*. To change the plan, the person types or pastes notes.
- A blocked task: the supported ways to clear it, below the intact blocker report.
- A report or audit: the one fix worth taking next.
- A finished task that will clearly come back: add one [routine or app offer](../../../../wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- More work the person asked for, left after a publish: open it in a new workspace *(Recommended)*, by [next work](../../plan/references/new-workspace.md#next-work).

A handoff the invocation already authorized continues instead of asking: `/apply` into [`/save`](../../save/SKILL.md), [`/ship`](../../ship/SKILL.md) through its stages.

## Print the plan's link

Whenever a reply makes or changes a plan, print *Click here to see the plan:* and the link to the change's `review.html` as one line of chat text. Copy the line the page builder prints as is, never a shortened path. The line is the same whatever made the plan — [`/plan`](../../plan/SKILL.md), `/apply` planning first, `/continue`, `/ship`, `/wong-sync`, or notes pasted from the review page. Print it even when the work goes on to build; it adds no stop. Put it just above the closing question, never inside it: a tool's card may not make a link clickable.

Some hosts hide the chat text written before a question card, so the question carries the fallback. **Any closing question in a reply that made or changed a plan offers *Review the plan*.** Picking it starts nothing: the next reply ends with the link line in plain text and no question after it, and the person's next message decides — build it, notes, or stop.

Written prose stays short and plain, in [our voice](../../../../wiki/voice.md). The skills that cite this page: [`/explore`](../SKILL.md), [`/plan`](../../plan/SKILL.md), [`/apply`](../../apply/SKILL.md), [`/save`](../../save/SKILL.md), [`/continue`](../../continue/SKILL.md), [`/ship`](../../ship/SKILL.md), [`/verify`](../../verify/SKILL.md), and [`/improve`](../../improve/SKILL.md).
