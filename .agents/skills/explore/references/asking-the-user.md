# Asking the user

Every question a WongStack skill puts to the user has one shape: **two or three real options, the recommended one first, a short tradeoff on each, and the user's own words still welcome.** A clarification question, a menu, an offer, and a yes/no confirmation all use it. [`/explore`](../SKILL.md) owns *what to ask and how many*; this page owns *what an ask looks like and which tool carries it*.

## The anatomy of an ask

```
Where should the convention live?
  1. A shared reference (Recommended) — one copy, every skill links it.
  2. Inside /explore — no new file, but runbooks inherit text they do not need.
  3. A wiki page — best hub placement, one hop further from the ask site.
```

- **Two or three options.** More is a menu nobody reads. Two is normal for a confirmation.
- **The recommended one first, labelled `(Recommended)`.** The label goes in the option text, so no host tool has to support it.
- **A short tradeoff on each.** Say what the user gets and what it costs. An option with no stated consequence is not a choice.
- **Keep the custom answer open.** Use the tool's own free-text field; never add an Other option beside it. A custom answer keeps its meaning — do not force it into the nearest option.
- **No filler.** Ask what changes the result. A question whose answer changes nothing is noise.
- **Options would be artificial?** Ask a structured free-text question — a credential, a name, an address only the user knows. Do not invent alternatives to fill the format.

`/explore` adds its own limits on top: the 80/20 test, small groups, one exit round, four questions. Those bound clarification before planning; they do not govern a runbook's fork.

## Which tool carries it

Use the first one that is callable in the active session:

1. Codex **`request_user_input`**
2. Claude **`AskUserQuestion`**
3. Another host's equivalent structured question tool
4. **Numbered chat** — the same questions, options, recommendation, and custom-answer path, written out. Wait for the answer.

Follow the selected tool's schema, mode restrictions, and real capacity; four questions is not a universal limit. The absence of one named tool is not a non-interactive session — it only moves you down the list.

**Only where nobody can answer** — an unattended run, a non-interactive session — take the recommended options, label each one **assumed** rather than chosen, and continue without waiting.

**A question stays pending until the user answers it.** Elapsed time is not an answer, and neither is a preselected option. While one is open, do independent work only.

## Confirmations, offers, and menus are asks

- **A confirmation** is a two-option question that names what happens on each side — `Delete both databases (Recommended once the data is saved) / Keep them and stop`, never a bare yes/no.
- **An offer** states the outcome the user gets, not the product that delivers it, and stopping is always one of the options.
- **A menu** shows the detail that makes the choice possible: a change's status and progress, an account's name and id, a branch's last commit. Several candidates are never resolved by a guess.

## Form, never whether to ask

This page decides how a question **looks**. It never decides which actions **need** one. An action the user's invocation already authorized is taken and reported — `/save`'s runbook actions, `/ship`'s archive-and-merge chain, the token widen in the stack pack. Do not add a confirmation because confirmations are documented here.

## End every reply with the next step

Before you finish, answer one question for yourself: **what does the user have to decide for this work to continue?** Then put it to them in the same format — options, recommended first, consequence each.

- A finished plan: apply it now *(Recommended)* / revise it first / stop here.
- A blocked task: the supported ways to clear the blocker. Keep the report of the blocker intact above it.
- A report or audit: the one fix worth taking next.

The exception is a chain that continues without the user: a handoff the invocation already authorized — `/apply` into [`/save`](../../save/SKILL.md), [`/ship`](../../ship/SKILL.md) through its stages — continues instead of asking.

Written prose stays in [Simplified Technical English](../../../../wiki/voice.md). The skills that cite this page: [`/explore`](../SKILL.md), [`/plan`](../../plan/SKILL.md), [`/apply`](../../apply/SKILL.md), [`/save`](../../save/SKILL.md), [`/continue`](../../continue/SKILL.md), [`/ship`](../../ship/SKILL.md), [`/verify`](../../verify/SKILL.md), and [`/improve`](../../improve/SKILL.md).
