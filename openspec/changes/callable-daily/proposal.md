# Let another agent run /daily inside its own day

**Status:** planned
**Branch:** daily-agent-callable
**Open questions:** none

## Why

People want one morning, not two. Someone with their own personal agent wants it to run the team's `/daily` from inside the agent's own daily and fold both into one day. WongOS already does this by hand: Matt's personal daily runs Claymoo's daily first, in the same chat, then goes on to his own list.

WongStack's `/daily` breaks when called this way. It reads whichever folder the chat sits in, so a personal agent's chat makes it pick up the wrong sign-in, the wrong reminders and the wrong record of what opened today, and open agents in the wrong place. It also behaves as if it owns the chat: it ends with its own offer, starts its own watch, and waits at a sign-in. Two dailies then trip over each other.

## What Changes

- **It works from any chat.** `/daily` always reads its own home: its own sign-in, its own reminders, and its own record of what opened today. It opens each agent in its own repo, wherever it is called from.
  ```mermaid
  flowchart LR
    caller["personal agent's chat"] --> daily["/daily"]
    daily --> home["daily's own repo: sign-in, reminders, today's agents"]
  ```
- **A called `/daily` stays a guest.** When another skill runs it, it does its steps, then hands back without a closing question, an offer, or a watch of its own. Signed out, it gives the sign-in link and hands back at once, so the caller's day goes on instead of waiting.
  ```mermaid
  flowchart TD
    c1["caller starts its day"] --> d["/daily: who, reminders, steps"]
    d --> back["hands back its lines"]
    back --> c2["caller's own steps"]
    c2 --> merged["one list for the person"]
  ```
- **One fixed set of lines comes back, plus a summary for scripts.** The reply uses the same short lines every time, whoever called. A caller copies or merges them as they are. A caller that is a script, not a chat, asks one command for the same facts as data: who, the reminders due, and today's agents.
  ```text
  Due: Call Kim back about the kits (overdue)
  Started: email (little-giraffe)
  Already open: weekly report (bold-otter)
  Skipped: news — your agent covers it
  Left for today: Fridays: draft the team update
  Not read: reminders
  Watch: node ~/Team/.claude/skills/daily/…/daily.mjs watch
  ```
- **One chief of staff per chat.** A called `/daily` starts no watch. It prints a `Watch:` line instead, and the caller decides when to start it. The caller can add its own agents to that same watch, so one chief keeps both days' agents moving and no agent gets two answers.
  ```mermaid
  flowchart LR
    w["one watch"] --> a1["daily's agents"]
    w --> a2["caller's agents, handed in"]
  ```
- **A caller can name steps it already covers.** When both days include email, the caller says so, and `/daily` skips its own with `Skipped: <step> — <caller> covers it`. Email then never opens twice.
- **The guide shows a caller's few lines.** The daily page gains a short section for anyone wiring their personal agent: where the skill sits, what to ask it, and what comes back.

**Non-goals:** No command for running another repo's daily from a clean published copy: WongOS keeps its own Claymoo step. No change to how the chief judges a stop, to the steps files, or to reminders.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `daily-routine`: `/daily` reads its own repo wherever it runs; a signed-out run called by another skill hands back instead of waiting; the chief of staff starts only when the caller starts it; and a new requirement covers running `/daily` from another skill's chat, with its fixed reply lines, its summary for scripts, and steps the caller covers.

## Impact

- `.agents/skills/daily/scripts/daily.mjs`: resolve the repo from the script's own folder, not the working folder; run the launcher and memory helper from that repo; add a `day` command that prints the summary.
- `.agents/skills/daily/SKILL.md`: `D` by absolute path; the fixed reply lines; a short *When another skill runs it* section. Offsetting cuts keep the skill-text budget.
- `wiki/development/daily.md`: a *Run it from your own agent* section.
- `scripts/tests/daily.test.mjs`: tests for the folder fix and `day`.
- `CHANGELOG.md`: a `minor` entry. Installs get it on their next sync; nothing to do by hand.

## Decision log

- **2026-10-21** — Asked who keeps watching the agents when two dailies share a chat → chose one watch, started by the caller, who can add its own agents to it.
- **2026-10-21** — Asked how the caller gets the results → chose fixed reply lines plus a summary command for scripts.
- **2026-10-21** — Asked whether WongStack also ships the calling side → chose the called side only; WongOS keeps its own Claymoo step.
- **2026-10-21** — Assumed: the script finds its repo from its own location, not the chat's folder, because only that works for every caller and needs no new setting.
- **2026-10-21** — Assumed: a called `/daily` that finds the person signed out hands back the sign-in link instead of waiting, because waiting would stall the caller's whole morning; Claymoo's daily does the same.
- **2026-10-21** — Assumed: standalone and called runs share one set of reply lines, because one format is simpler to keep and the caller can merge without translating.
- **2026-10-21** — Assumed: the caller names steps it covers in plain words, with no new setting, because the agent already matches step lines by judgment.
- **2026-10-21** — Assumed: save the plan unbuilt at close, because Matthew chose to review it before building.
