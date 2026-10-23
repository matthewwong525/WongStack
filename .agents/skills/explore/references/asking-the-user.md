# Asking the user

Every WongStack ask has one shape: **two or three real options, the recommended one first, a short tradeoff on each, and room for the user's own words.** [`/explore`](../SKILL.md) owns *what to ask and how many*.

## The anatomy of an ask

```text
[ Where should the convention live? ]
( ) A shared reference (Recommended): one copy, every skill links it.
( ) Inside /explore: no new file, but runbooks inherit text they do not need.
( ) A wiki page: best hub placement, one hop further from the ask site.
[ Your own answer ]
```

- **Only [*Review the plan*](#print-the-plans-link) and [*See the preview*](#print-the-previews-link) may add a fourth option.**
- **Put `(Recommended)` in the option text itself.**
- **A tradeoff says what the user gets and what it costs**; an option with no consequence is not a choice.
- **Keep the custom answer in the tool's free-text field**, never an added Other option, and use it as given, not forced into the nearest option.
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
2. Claude **`AskUserQuestion`**; Claude Code's stop hook returns typed choices
3. Another host's equivalent structured question tool
4. **Numbered chat** with the same questions, options, recommendation, and custom-answer path; wait for the answer.

**Only where nobody can answer**, as in an unattended run, take the recommended options, label each **assumed**, not chosen, and continue. Otherwise **a question stays pending until answered**, however long it waits and whatever is preselected; meanwhile do only independent work.

## Confirmations, offers, and menus are asks

- **A confirmation** names what happens on each side, never a bare yes/no: `Delete both databases (Recommended once the data is saved) / Keep them and stop`.
- **An offer** names the outcome, not the product, and always includes stopping.
- **A menu** shows the detail the choice needs, such as a change's status; never resolve several candidates by guessing.

## Form, never whether to ask

This page sets how a question **looks**, never which actions **need** one. An action or handoff the invocation already authorized goes ahead unasked: `/ship`'s archive-and-merge chain, or `/apply` into [`/save`](../../save/SKILL.md) for a task that needs the gate. [`/explore`'s limits](../SKILL.md#the-exit-round) bound clarification before planning, not a runbook's fork.

## End every reply with the next step

**Call [the question tool](#which-tool-carries-it)** before you finish: ask **what the user must decide for the work to continue**, in this format. Write the report and each link as its own chat line first, never in the tool's question or options nor only in your reasoning; an option may name a link, never repeat it. Only a finished plan, ending on [its link and review line](#print-the-plans-link), and the replies to *Review the plan* and *See the preview* end without a question.

- Finished standalone `/explore`: *Plan it (Recommended)* / *Keep thinking* / *Stop*.
- Blocked task: the supported ways to clear it, below the intact blocker report.
- Report or audit: the one fix worth taking next.
- Finished task that will clearly come back: one [routine or app offer](../../../../wiki/development/the-change-loop.md#offer-a-routine-or-an-app).
- Asked-for work left after a publish: open it in a new workspace *(Recommended)* ([next work](../../plan/references/new-workspace.md#next-work)).
- Finished work in a Paseo worktree, a declined publish included: *Close this workspace* ([`/close`](../../close/SKILL.md)), recommended when no asked-for work waits; never at a plan's review, mid-build, or on a blocker.

## Print the plan's link

When a reply makes or changes a plan or its checklist, print *Click here to see the plan:* and the link as [one chat line](#end-every-reply-with-the-next-step) above any closing question, even when the build goes on: it adds no stop. Copy the line whole from the page builder, never shortened: [the reply link](../../../../wiki/development/reply-links.md) when one opens, else the `review.html` file; on *new link*, rerun the builder. Status, branch, Open questions, and Decision-log lines alone are record-keeping, not a change.

**A finished plan's reply asks nothing:** it ends with the link line, a blank line, and the builder's review line, which sends a live page to its build buttons and a file to the chat. Some hosts hide text above a question card, so **any other closing question in a reply that made or changed a plan offers *Review the plan*.** Picking it starts nothing and ends the same way. Leave the review line out of every other reply.

## Print the preview's link

Print a preview the same way: *Click here to see the preview:* and the full URL of the page showing the change (`/apps/<name>/`, `/settings`), the home page only when none does. Its closing question offers *See the preview*, whose reply ends with that line and no question, and starts nothing.
