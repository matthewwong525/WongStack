# Asking the user

Every WongStack ask, from a clarification to a yes/no confirmation, has one shape: **two or three real options, the recommended one first, a short tradeoff on each, and room for the user's own words.** [`/explore`](../SKILL.md) owns *what to ask and how many*; this page owns *how an ask looks and which tool carries it*.

## The anatomy of an ask

```
Where should the convention live?
  1. A shared reference (Recommended) — one copy, every skill links it.
  2. Inside /explore — no new file, but runbooks inherit text they do not need.
  3. A wiki page — best hub placement, one hop further from the ask site.
```

- **Two or three options**; two is normal for a confirmation.
- **The recommended one first, labelled `(Recommended)`** in the option text itself.
- **A short tradeoff on each:** what the user gets and what it costs; an option with no consequence is not a choice.
- **Keep the custom answer open** in the tool's own free-text field, never as an added Other option. Use a custom answer as given, not forced into the nearest option.
- **No filler.** Ask only what changes the result.
- **Options would be artificial?** Ask a structured free-text question, such as for a credential; never invent alternatives.

## Write at the reader's level

Write the question, each tradeoff, a blocker report, and the next-step question in words the reader can judge. Find the current person's page by `git config user.email` ([the People rules](../../../../wiki/wiki-style.md#people)) and read its `**Technical level:**` line; no page or no line means **non-technical**.

- **Non-technical:** name what the person will see, get, lose, or risk (*what happens to the accounts that exist today?*, not *how should the migration handle the schema?*), with no file path, identifier, command, or engineering term they did not use first.
- **Technical:** name the mechanism when it helps the choice.
- **Fix before you ask.** Never offer a choice needing judgment the reader lacks. Where the skill's rules allow, try the fix first, then ask about the outcome: *the sign-up button does not work on the preview: fix it first, or publish anyway?*
- **Lead a report with the outcome** (what is done, what they can open, what does not work), then any lines a skill must print.

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

Before you finish, put to the user **what they must decide for this work to continue**, in the same format.

- A finished plan: one line, *Click here to see the plan:*, with a link to its `review.html`, then build it now *(Recommended)* / change the plan first / stop here.
- A blocked task: the supported ways to clear it, below the intact blocker report.
- A report or audit: the one fix worth taking next.
- A finished task that will clearly come back: add one [routine or app offer](../../../../wiki/development/the-change-loop.md#offer-a-routine-or-an-app).

A handoff the invocation already authorized continues instead of asking: `/apply` into [`/save`](../../save/SKILL.md), [`/ship`](../../ship/SKILL.md) through its stages.

Written prose stays short and plain, in [our voice](../../../../wiki/voice.md). The skills that cite this page: [`/explore`](../SKILL.md), [`/plan`](../../plan/SKILL.md), [`/apply`](../../apply/SKILL.md), [`/save`](../../save/SKILL.md), [`/continue`](../../continue/SKILL.md), [`/ship`](../../ship/SKILL.md), [`/verify`](../../verify/SKILL.md), and [`/improve`](../../improve/SKILL.md).
