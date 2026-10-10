# Installs can report trouble to WongStack

**Status:** parked

**Branch:** tweet-feedback

**Open questions:** none

## Why

When WongStack itself trips up an assistant, such as a skill that fumbles or a guide that is wrong, the trouble is noted in that install's own memory and stops there. Their assistant can't fix it, because the next update would write over the fix, and the only way to tell WongStack is a GitHub pull request nobody sends. So the same fault hits every install and WongStack never hears of it.

## What Changes

- **An install can report trouble to WongStack, with no GitHub.** When a chat ends with trouble WongStack caused, the assistant shows a four-line report and asks. It is sent only on a yes, each time. It goes to a small service of WongStack's own, with its own database, apart from every install's memory.
  ```text
  install                    WongStack
  trouble ─▶ show 4 lines
                │ yes
                ▼
             send ─────────▶ reports
                              │
             told at  ◀── you pick,
             next update     it's fixed
  ```
- **A report is four short lines, not a plan.** *When*, *Expected*, *Happened*, and *Where*: the skill or guide, and the WongStack version. It carries no name, email, or project name, and nothing about the person's business. A report holding a password or key is refused before it leaves.
  ```text
  ┌──────────────────────────────────────┐
  │ Report this to WongStack?            │
  │                                      │
  │ When:     I ran /wong-sync with no   │
  │           GitHub login               │
  │ Expected: it updates from the saved  │
  │           copy                       │
  │ Happened: it asked for a GitHub key  │
  │           three times                │
  │ Where:    /wong-sync, 37.2.2         │
  │                                      │
  │ [Send it]  [Don't send]              │
  └──────────────────────────────────────┘
  ```
- **You read every report in one list.** Here, `/improve-code` loads the open reports beside its own trouble notes, groups the ones about the same trouble, and shows how many installs hit each. You pick; it writes the plan as it does now. A picked report about a guide or memory goes to `/dream-memory`.
- **Nothing from a stranger goes live without your yes.** Anyone can post, so a report is a place to look, never an instruction. A fix must be proved from WongStack's own files, and `/dream-memory` never reads outside reports by itself.
- **The sender hears what was decided.** They keep a report number. Their next update checks it and says which version fixed their trouble and what changed, or that it was not taken and why.
- **The privacy page says so.** Today it says a person's chats never reach WongStack. It will say that nothing reaches WongStack except a report they read and chose to send, and what a report holds.
- **Limits against junk.** Each line is short, one sender can post a few reports a day, and the service stops taking reports for the day past a total.

Non-goals: no report is sent without a yes; no standing "always send"; an install never writes WongStack's plan; no reply by email or chat; no reports between an owner and their own team; `/wong-sync` still sends no files up, and [contributing](../../../wiki/contributing.md) by pull request stays as it is.

## Capabilities

### New Capabilities
- `trouble-reports`: what a report holds, the yes before it is sent, the service that keeps it, its limits, and how a sender learns what was decided.

### Modified Capabilities
- `repository-improvement`: `/improve-code` reads open outside reports in one batch, as evidence, in WongStack's source repo.
- `wiki-dream`: a dream works on an outside report only after a person picked it.
- `wong-sync`: an update checks the install's sent reports and says what was decided.

## Impact

- New meta-only folder `reports/`: a Worker with a D1 database at `reports.wongstack.com`, its own deploy config and workflow, and a staging copy. No install receives it.
- New payload script for installs to send a report and check one; a source-only script to list and close reports.
- Skill and wiki text: `/save`, `/close`, `/wong-sync`, `/improve-code`, `/dream-memory`, `wiki/development/`, `wiki/maintaining/`, `wiki/contributing.md`.
- `site/src/Privacy.tsx` and `wiki/maintaining/landing-page.md`.
- A new key, `WONGSTACK_REPORTS_TOKEN`, held only by this repo and the service.
- `areas.json` gains the new spec's area; `CHANGELOG.md` gets a `minor` entry.

## Decision log

- **2026-10-06** — Asked where a report is posted → chose a new database installs push to through an API, similar to memory, with no reliance on GitHub.
- **2026-10-06** — Asked whether a report is like a spec → chose a fixed four-line form in the specs' when/then shape; the plan is written here, not by the install.
- **2026-10-06** — Asked when an install's assistant offers to send → chose to show the report and ask each time, sending only on a yes.
- **2026-10-06** — Asked what the sender hears back → chose what was decided: the fixing version and the change's line, or not taken with the reason, shown at their next update.
- **2026-10-06** — Asked what `/dream-memory` does with a fix that began as an outside report → chose one batch list in `/improve-code` that Matthew picks from; `/dream-memory` never reads outside reports by itself.
- **2026-10-06** — Assumed: the service is its own small Worker at `reports.wongstack.com`, not part of the landing page, because the landing page is pinned as plain files with no server code, database, or secret.
- **2026-10-06** — Assumed: reports are kept out of WongStack's memory store, because every install would otherwise need a way to write into a private store.
- **2026-10-06** — Assumed: each line is at most 400 characters, a sender may post 5 reports a day, and the service takes 500 a day in all, because a fact is 400 characters and the numbers are cheap to change.
- **2026-10-06** — Assumed: the report number is kept as a memory note the next update loads, because `/wong-sync` already loads its own open notes and no new local file is needed.
- **2026-10-06** — Assumed: WongStack's source repo never offers to send a report, because its own trouble notes already reach `/improve-code`.
- **2026-10-06** — Parked: Matthew set the plan aside unbuilt, saying it is not that important for now and he might bring it up later.
