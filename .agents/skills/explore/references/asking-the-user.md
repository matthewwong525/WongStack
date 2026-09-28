# Asking the user

Every WongStack ask, from a clarification to a yes/no confirmation, has one shape: **two or three real options, the recommended one first, a short tradeoff on each, and room for the user's own words.** [`/explore`](../SKILL.md) owns *what to ask and how many*; this page owns *how an ask looks and which tool carries it*.

## The anatomy of an ask

```
Where should the convention live?
  1. A shared reference (Recommended) — one copy, every skill links it.
  2. Inside /explore — no new file, but runbooks inherit text they do not need.
  3. A wiki page — best hub placement, one hop further from the ask site.
```

- **A confirmation normally has two options.** Only *Review the plan* may add a fourth ([the plan's link](#print-the-plans-link)).
- **Put `(Recommended)` in the option text itself.**
- **A tradeoff says what the user gets and what it costs**; an option with no consequence is not a choice.
- **Keep the custom answer in the tool's own free-text field**, never an added Other option, and use it as given, not forced into the nearest option.
- **Ask only what changes the result.** Where options would be artificial, as for a credential, ask a structured free-text question; never invent alternatives.

## Write in plain words

Write every plan, question, and report in plain words, for everyone. Give more detail only when the person asks, for one reply or from now on. A standing ask goes on their person page ([the People rules](../../../../wiki/wiki-style.md#people)), never guessed from one message.

- **Name what the person will see, get, lose, or risk**: *what happens to the accounts that exist today?*, not *how should the migration handle the schema?* Use no file path, identifier, command, or engineering term they did not use first.
- **Fix before you ask.** Never offer a choice that needs judgment the reader lacks. Where the skill allows, try the fix, then ask about the outcome: *the sign-up button does not work on the preview: fix it first, or publish anyway?*
- **Lead a report with the outcome**: what is done, what they can open, what does not work, failed or unverified checks included.
  - **The person ran the verb:** at most one link besides [the plan's link](#print-the-plans-link): the preview, else the pull request, called *the change on GitHub*. Leave out branch names, commit ids, the gate line (`SAVE_GATE_RESULT=…`), `merge.sh`'s `key=value` lines, and fact counts unless asked.
  - **Inside another verb:** still print every line the caller reads, such as `/save`'s gate line inside `/ship`, `/apply`, or `/verify`.

## Which tool carries it

Use the first callable tool:

1. Codex **`request_user_input`**
2. Claude **`AskUserQuestion`**
3. Another host's equivalent structured question tool
4. **Numbered chat** with the same questions, options, recommendation, and custom-answer path; wait for the answer.

Follow the tool's schema, mode limits, and real capacity; four questions is not a universal limit. A missing named tool moves you down the list, not into non-interactive mode.

**Only where nobody can answer**, as in an unattended run, take the recommended options, label each **assumed**, not chosen, and continue. Otherwise **a question stays pending until answered**, however long it waits and whatever is preselected; meanwhile do only independent work.

## Confirmations, offers, and menus are asks

- **A confirmation** names what happens on each side, never a bare yes/no: `Delete both databases (Recommended once the data is saved) / Keep them and stop`.
- **An offer** names the outcome, not the product, and always includes stopping.
- **A menu** shows the detail the choice needs, such as a change's status; never resolve several candidates by guessing.

## Form, never whether to ask

This page sets how a question **looks**, never which actions **need** one. An action or handoff the invocation already authorized goes ahead unasked: `/ship`'s archive-and-merge chain, or `/apply` into [`/save`](../../save/SKILL.md) for a task that needs the gate. [`/explore`'s limits](../SKILL.md#the-exit-round) bound clarification before planning, not a runbook's fork.

## End every reply with the next step

Before you finish, ask **what the user must decide for the work to continue**, in this format, through [the first callable tool](#which-tool-carries-it). Write the report and any link as chat text first; the tool carries only the question. Close with a numbered list only in a session with no such tool. Only the reply to *Review the plan* ends without a question.

- Finished standalone `/explore`: *Plan it (Recommended)* / *Keep thinking* / *Stop*.
- Finished plan: [the plan's link](#print-the-plans-link), then *Build it now (Recommended)* / *Review the plan* / *Stop here*. The person may paste notes.
- Blocked task: the supported ways to clear it, below the intact blocker report.
- Report or audit: the one fix worth taking next.
- Finished task that will clearly come back: one [routine or app offer](../../../../wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- Asked-for work left after a publish: open it in a new workspace *(Recommended)* ([next work](../../plan/references/new-workspace.md#next-work)).

An [authorized handoff](#form-never-whether-to-ask) continues without asking, as [`/ship`](../../ship/SKILL.md) does through its stages.

## Print the plan's link

Whenever a reply makes a plan, or changes what it says or its checklist, print *Click here to see the plan:* and the link to the change's `review.html` as one line of chat text. Copy the line the page builder prints, never a shortened path. Status, branch, Open questions, and Decision-log lines alone are record-keeping, not a change. The line is the same whatever made the plan: any verb, or review-page notes. Print it even when the work goes on to build; it adds no stop. Put it just above the closing question, never inside it: a tool's card may not make a link clickable.

The builder also prints *When you're ready, type `/apply` to build it.* Copy it under the link when the plan waits for the person: after a standalone `/plan`, a bare `/wong-sync`, review notes, or the *Review the plan* reply. Leave it out when the build goes on in the same run (`/apply` planning first, `/continue`, `/ship`) or the plan has shipped.

Some hosts hide chat text written before a question card, so **any closing question in a reply that made or changed a plan offers *Review the plan*.** Picking it starts nothing: the next reply ends with the link line and its next-step line in plain text and no question, and the person's next message decides: build, notes, or stop.

Write prose short and plain, in [our voice](../../../../wiki/voice.md).
