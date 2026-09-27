# Offer a routine or an app when a task will come back

**Status:** in-progress
**Branch:** explore/proactive-routine-apps
**Open questions:** none

## Why

When you ask for the same thing again and again, the assistant does it by hand every time, and never suggests saving you the trouble. Once a task clearly comes back, it should offer to make next time easier: run it for you on a schedule, or build a small tool for it. It should offer rarely, so the offer stays useful and never nags.

## What Changes

- **After a task that will come back, one extra choice.** When the assistant finishes a task, it already ends with a short multiple-choice question about what to do next. When there is a clear sign the task will come back, one of those choices becomes the offer. No extra question is added.
  ```text
  Done: here's this week's summary.

  What next?
  1. Do this every Monday at 9
     (Recommended)
  2. Stop here
  ```
- **The assistant picks the right kind of help.** Most tasks get no offer.
  ```text
  Will it come back?
    no ──▶ no offer
    yes
     │
  Needs judgment each time?
    yes ──▶ offer to run it on a
            schedule (a routine)
    no  ──▶ offer to build a small
            tool (a mini app)
  ```
  A routine suits *"sum up last week's support emails every Monday"*. A mini app suits *"work out the tip split again"*.
- **Only on a clear sign.** You said it comes back ("every week", "again"), or the assistant's memory shows you asked for the same thing before. It never offers on a hunch.
- **The offer names what you get,** such as *"do this every Monday at 9"* or *"a page that splits the tip for you"*, not the tool behind it.
- **A no is final.** When you turn an offer down, the assistant remembers it and never offers again for that task.
- **No offer when nobody can answer, or when it can't deliver.** Scheduled runs never offer. A routine is offered only where the scheduling tool is installed.
- **Saying yes starts the usual route.** A routine goes through its own confirmation before anything is scheduled. An app starts with a plan for you to review, like any new page.

Non-goals: no offers after a code change the assistant builds for you; no offer to write a wiki page, which already happens without asking; no settings to switch offers on or off.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `request-routing`: adds a requirement that a finished task with a clear recurrence signal ends with one routine-or-mini-app offer inside the next-step ask, remembered when declined.

## Impact

- `WONG-STACK` block in `AGENTS.md` (`CLAUDE.md` is its symlink): one new rule.
- `wiki/development/the-change-loop.md`: a new `### Offer a routine or an app` section owns the rule.
- `.agents/skills/explore/references/asking-the-user.md`: one bullet in *End every reply with the next step* that links the new section.
- `VERSION` 25.7.0 → 25.8.0 and a `CHANGELOG.md` entry.
- No code, script, or test changes.

## Decision log

- **2026-09-27** — Asked when the agent should offer a routine or app → chose on a clear signal: the person says it recurs, or memory shows it was asked before.
- **2026-09-27** — Asked how the offer should appear → chose as a choice in the multiple-choice question after the task is finished, which is the existing next-step ask.
- **2026-09-27** — Asked what happens after someone says no → chose never offer again for that task, saved to memory.
- **2026-09-27** — Assumed: a routine is for work that recurs and needs judgment each run, and a mini app is for fixed steps code can do, because the user drew that line and [most process improvements shouldn't use AI](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai).
- **2026-09-27** — Assumed: the offer applies to tasks the agent does by hand (plain requests and non-code verb work), not to finished code changes, because a code change is already the durable fix.
- **2026-09-27** — Assumed: the agent runs one memory search on the task's key terms only when a finished task could come back, because that search finds both a repeat and a recorded decline, and searching after every task would slow every reply.
- **2026-09-27** — Assumed: a decline is saved as a `feedback` fact through the memory write gate, naming the task and the offer, because feedback facts load in the digest and are what the search finds.
- **2026-09-27** — Assumed: a routine is offered only when `paseo` is on `PATH`, and never in an unattended run, because `/routine` needs Paseo and an unattended run has nobody to answer.
- **2026-09-27** — Assumed: accepting the offer runs `/routine` with its own confirm, or starts the change loop for a mini app ending at the plan's review, because each keeps its existing stop.
- **2026-09-27** — Assumed: the change-loop page owns the rule and `asking-the-user.md` only links it, because one topic lives on one page and that page already routes plain requests.
- **2026-09-27** — Assumed: a minor release, because it adds agent behavior to the payload.
- **2026-09-27** — Built: the rule's owner is a new *Offer a routine or an app* section in the change-loop page; the `WONG-STACK` block states it in one line, and the ask page links it from its next-step list. Released as 25.8.0. The payload link, config, and retired-name checks and strict validation passed; the host preview shows an unchanged app, since the change is prose only.
